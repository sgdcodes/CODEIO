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

/**
 * GET /:shortCode
 * Find shortened URL and redirect with HTTP 302
 */
export const handleRedirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

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

    // 3. Asynchronously record the analytics without awaiting
    recordClickAsync(url._id, req);

    // 4. Perform temporary HTTP 302 redirect
    return res.redirect(302, url.originalUrl);
  } catch (error) {
    next(error);
  }
};
