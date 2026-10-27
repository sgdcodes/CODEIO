import { UAParser } from 'ua-parser-js';
import Url from '../models/Url.js';
import Click from '../models/Click.js';

/**
 * Asynchronously record click event and increment click counter
 * Runs completely decoupled from the redirect response to ensure sub-millisecond redirect speed
 */
const recordClickAsync = async (urlId, req) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);

    const browser = parser.getBrowser().name || 'Other';
    const os = parser.getOS().name || 'Other';
    const rawDeviceType = parser.getDevice().type;
    // ua-parser-js leaves device.type undefined for desktop/laptop browsers
    const device = rawDeviceType
      ? rawDeviceType.charAt(0).toUpperCase() + rawDeviceType.slice(1)
      : 'Desktop';

    // Referrer header (handles both spelling variants)
    const rawReferrer = req.headers['referer'] || req.headers['referrer'];
    let referrer = 'Direct';

    if (rawReferrer) {
      try {
        const parsedUrl = new URL(rawReferrer);
        referrer = parsedUrl.hostname || rawReferrer;
      } catch {
        referrer = rawReferrer;
      }
    }

    // Persist click and increment counter in parallel
    await Promise.all([
      Url.findByIdAndUpdate(urlId, { $inc: { clicks: 1 } }),
      Click.create({
        urlId,
        browser,
        os,
        device,
        referrer,
        timestamp: new Date(),
      }),
    ]);
  } catch (err) {
    console.error(`[Click Tracking Error] Failed to log click for URL ${urlId}:`, err.message);
  }
};

const publicUrl = (url) => ({
  _id: url._id,
  shortCode: url.shortCode,
  originalUrl: url.originalUrl,
  expiresAt: url.expiresAt,
  clicks: url.clicks,
  createdAt: url.createdAt,
  isProtected: Boolean(url.passcode),
});

/**
 * GET /api/resolve/:shortCode
 * JSON lookup used by the React redirect page during local development.
 */
const getShortCode = (req) => req.params.shortCode || req.query.code;

export const resolveUrlJson = async (req, res, next) => {
  try {
    const shortCode = getShortCode(req);
    const url = await Url.findOne({ shortCode });

    if (!url) {
      return res.status(200).json({ found: false });
    }

    if (url.expiresAt && new Date(url.expiresAt) <= new Date()) {
      return res.status(200).json({ found: true, expired: true, url: publicUrl(url) });
    }

    const providedCode = req.query.passcode || req.headers['x-link-passcode'];
    if (url.passcode && (!providedCode || providedCode !== url.passcode)) {
      return res.status(200).json({ found: true, isProtected: true, url: publicUrl(url) });
    }

    recordClickAsync(url._id, req);

    return res.status(200).json({
      found: true,
      originalUrl: url.originalUrl,
      url: publicUrl(url),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /:shortCode
 * Find shortened URL and redirect with HTTP 302
 */
export const handleRedirect = async (req, res, next) => {
  try {
    const shortCode = getShortCode(req);

    // 1. Look up link in database
    const url = await Url.findOne({ shortCode });

    if (!url) {
      return res.status(404).json({
        success: false,
        message: 'Short link not found',
      });
    }

    // 2. Check for link expiration
    if (url.expiresAt && new Date(url.expiresAt) <= new Date()) {
      return res.status(410).json({
        success: false,
        message: 'This short link has expired and is no longer accessible',
      });
    }

    // 3. Check for Password Protection
    if (url.passcode) {
      const providedCode = req.query.passcode || req.headers['x-link-passcode'];
      if (!providedCode || providedCode !== url.passcode) {
        // Return a clean HTML passcode verification prompt so browser users can unlock it
        return res.status(401).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>Password Protected Link - LinkVault</title>
              <style>
                body {
                  margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
                  background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #311042 100%);
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  color: #F8FAFC;
                }
                .card {
                  background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(16px);
                  border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px;
                  padding: 2.2rem 2.5rem; max-width: 400px; width: 90%; text-align: center;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                }
                h2 { margin: 0 0 0.5rem 0; font-size: 1.4rem; color: #F472B6; }
                p { font-size: 0.9rem; color: #94A3B8; margin-bottom: 1.5rem; }
                input {
                  width: 100%; box-sizing: border-box; padding: 0.75rem 1rem;
                  background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.2);
                  border-radius: 8px; color: #FFF; font-size: 1rem; margin-bottom: 1rem;
                  outline: none; text-align: center; letter-spacing: 2px;
                }
                input:focus { border-color: #EC4899; }
                button {
                  width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #6366F1, #EC4899);
                  border: none; border-radius: 8px; color: #FFF; font-size: 1rem; font-weight: 600;
                  cursor: pointer; transition: opacity 0.2s;
                }
                button:hover { opacity: 0.9; }
                .err { color: #EF4444; font-size: 0.85rem; margin-top: 0.75rem; display: none; }
              </style>
            </head>
            <body>
              <div class="card">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
                <h2>Password Required</h2>
                <p>This LinkVault link is protected by its creator. Enter the passcode to proceed.</p>
                <form method="GET" action="/${shortCode}">
                  <input type="password" name="passcode" placeholder="Enter Passcode" required autofocus />
                  <button type="submit">Unlock & Open Link ➔</button>
                  ${providedCode ? '<div style="color: #EF4444; margin-top: 0.75rem; font-size: 0.85rem;">Incorrect passcode. Please try again.</div>' : ''}
                </form>
              </div>
            </body>
          </html>
        `);
      }
    }

    // 4. Asynchronously record the analytics without awaiting
    recordClickAsync(url._id, req);

    // 5. Perform temporary HTTP 302 redirect
    return res.redirect(302, url.originalUrl);
  } catch (error) {
    next(error);
  }
};
