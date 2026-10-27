import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import app from '../src/app.js';
import Url from '../src/models/Url.js';

let mongoServer;

beforeAll(async () => {
  // supertest binds a new random port per request, so pin the host used in short URLs
  process.env.BASE_URL = 'https://lnk.test';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Url.deleteMany({});
});

describe('LinkVault API Unit & Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/urls', () => {
    it('should shorten a valid URL and return shortUrl', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://github.com/nodejs/node' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.shortCode).toHaveLength(4);
      expect(res.body.originalUrl).toBe('https://github.com/nodejs/node');
    });

    it('should support custom aliases', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://developer.mozilla.org', customAlias: 'mdn-docs' });

      expect(res.status).toBe(201);
      expect(res.body.shortCode).toBe('mdn-docs');
    });

    it('should reject invalid URLs without http/https', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'invalid-url-string' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should support creating a password-protected link', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({
          originalUrl: 'https://secret-vault.org',
          passcode: 'vault123',
        });

      expect(res.status).toBe(201);
      expect(res.body.isProtected).toBe(true);
    });
  });

  describe('PATCH /api/urls/:id (Edit & Update)', () => {
    it('should update destination URL and extend expiry', async () => {
      // 1. Create link
      const createRes = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://initial-site.com' });

      const linkId = createRes.body._id;

      // 2. Update destination URL & expiry
      const updateRes = await request(app)
        .patch(`/api/urls/${linkId}`)
        .send({
          originalUrl: 'https://updated-site.com',
          expiresInDays: 14,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.url.originalUrl).toBe('https://updated-site.com');
      expect(updateRes.body.url.expiresAt).not.toBeNull();
    });
  });

  describe('QR codes', () => {
    const decodePng = (buffer) => {
      const png = PNG.sync.read(buffer);
      return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
    };

    it('should return a QR data URL when a link is created', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://example.com/qr', customAlias: 'qr-create' });

      expect(res.status).toBe(201);
      expect(res.body.qrCode).toMatch(/^data:image\/svg\+xml;base64,/);
      const svg = Buffer.from(res.body.qrCode.split(',')[1], 'base64').toString();
      expect(svg).toContain('<svg');
    });

    it('should encode the short URL in the PNG', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://example.com/scan-me', customAlias: 'scan-me' });

      const res = await request(app)
        .get(`/api/urls/${createRes.body._id}/qr?format=png`)
        .buffer(true)
        .parse((response, cb) => {
          const chunks = [];
          response.on('data', (c) => chunks.push(c));
          response.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/image\/png/);
      expect(decodePng(res.body)).toBe(createRes.body.shortUrl);
    });

    it('should serve SVG by default and JSON on request', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://example.com/formats' });
      const id = createRes.body._id;

      const svgRes = await request(app).get(`/api/urls/${id}/qr`);
      expect(svgRes.status).toBe(200);
      expect(svgRes.headers['content-type']).toMatch(/image\/svg\+xml/);

      const jsonRes = await request(app).get(`/api/urls/${id}/qr?format=json`);
      expect(jsonRes.status).toBe(200);
      expect(jsonRes.body.shortUrl).toBe(createRes.body.shortUrl);
      expect(jsonRes.body.qrCode).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('should reject bad ids, unknown links and unknown formats', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://example.com/errors' });

      expect((await request(app).get('/api/urls/not-an-id/qr')).status).toBe(400);
      expect((await request(app).get(`/api/urls/${new mongoose.Types.ObjectId()}/qr`)).status).toBe(404);
      expect((await request(app).get(`/api/urls/${createRes.body._id}/qr?format=gif`)).status).toBe(400);
    });
  });

  describe('GET /:shortCode (Redirection & Protection)', () => {
    it('should redirect with HTTP 302 for open links', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://example.com' });

      const res = await request(app).get(`/${createRes.body.shortCode}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://example.com');

      const goRes = await request(app).get(`/api/go/${createRes.body.shortCode}`);
      expect(goRes.status).toBe(302);
      expect(goRes.headers.location).toBe('https://example.com');
    });

    it('should resolve a short code as JSON', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://example.com/json-resolve' });

      const res = await request(app).get(`/api/resolve/${createRes.body.shortCode}`);
      expect(res.status).toBe(200);
      expect(res.body.found).toBe(true);
      expect(res.body.originalUrl).toBe('https://example.com/json-resolve');
    });

    it('should require passcode for password-protected links', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({
          originalUrl: 'https://example.com/protected',
          passcode: 'safe999',
        });

      // Request without passcode -> prompt password (401)
      const unauthRes = await request(app).get(`/${createRes.body.shortCode}`);
      expect(unauthRes.status).toBe(401);

      // Request with correct passcode -> 302 redirect
      const authRes = await request(app).get(`/${createRes.body.shortCode}?passcode=safe999`);
      expect(authRes.status).toBe(302);
      expect(authRes.headers.location).toBe('https://example.com/protected');
    });
  });
});
