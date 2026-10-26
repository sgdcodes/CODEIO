import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import Url from '../src/models/Url.js';

let mongoServer;

beforeAll(async () => {
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

  describe('GET /:shortCode (Redirection & Protection)', () => {
    it('should redirect with HTTP 302 for open links', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({ originalUrl: 'https://example.com' });

      const res = await request(app).get(`/${createRes.body.shortCode}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://example.com');
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
