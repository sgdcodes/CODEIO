import { nanoid } from 'nanoid';
import validator from 'validator';
import mongoose from 'mongoose';
import Url from '../models/Url.js';
import Click from '../models/Click.js';

// Reserved keywords that cannot be used as custom aliases
const RESERVED_ALIASES = new Set(['api', 'health', 'dashboard', 'analytics', 'docs', 'favicon.ico']);

// Helper to determine active or expired status
const getUrlStatus = (expiresAt) => {
  if (!expiresAt) return 'active';
  return new Date(expiresAt) <= new Date() ? 'expired' : 'active';
};

// Helper to construct short URL
const buildShortUrl = (req, shortCode) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${shortCode}`;
};

/**
 * POST /api/urls
 * Create a shortened URL with optional custom alias and expiration
 */
export const createUrl = async (req, res, next) => {
  try {
    let { originalUrl, customAlias, expiresInDays } = req.body;

    // 1. Validate original URL
    if (!originalUrl || typeof originalUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Original URL is required',
      });
    }

    originalUrl = originalUrl.trim();

    // Ensure valid URL with http or https protocol
    if (!validator.isURL(originalUrl, { protocols: ['http', 'https'], require_protocol: true })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL. Please provide a valid URL including http:// or https://',
      });
    }

    let shortCode;

    // 2. Handle Custom Alias if provided
    if (customAlias && typeof customAlias === 'string') {
      customAlias = customAlias.trim();

      // Validate length: 3 to 20 characters
      if (customAlias.length < 3 || customAlias.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Custom alias must be between 3 and 20 characters',
        });
      }

      // Validate allowed characters: letters, numbers, hyphens, and underscores
      if (!/^[a-zA-Z0-9-_]+$/.test(customAlias)) {
        return res.status(400).json({
          success: false,
          message: 'Custom alias can only contain letters, numbers, hyphens (-), and underscores (_)',
        });
      }

      // Check against reserved keywords
      if (RESERVED_ALIASES.has(customAlias.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `The alias '${customAlias}' is reserved and cannot be used`,
        });
      }

      // Check if alias is already taken
      const existing = await Url.findOne({ shortCode: customAlias });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Custom alias is already in use. Please choose another one.',
        });
      }

      shortCode = customAlias;
    } else {
      // 3. Generate unique 7-character nanoid with collision retry
      let isUnique = false;
      let retries = 0;
      const MAX_RETRIES = 5;

      while (!isUnique && retries < MAX_RETRIES) {
        shortCode = nanoid(7);
        const existing = await Url.findOne({ shortCode });
        if (!existing && !RESERVED_ALIASES.has(shortCode.toLowerCase())) {
          isUnique = true;
        }
        retries++;
      }

      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: 'Could not generate a unique short code. Please try again.',
        });
      }
    }

    // 4. Handle Expiration
    let expiresAt = null;
    if (expiresInDays !== undefined && expiresInDays !== null && expiresInDays !== '') {
      const days = Number(expiresInDays);
      if (isNaN(days) || days <= 0) {
        return res.status(400).json({
          success: false,
          message: 'expiresInDays must be a positive number',
        });
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    // 5. Save Url to database
    const newUrl = await Url.create({
      originalUrl,
      shortCode,
      expiresAt,
    });

    const shortUrl = buildShortUrl(req, newUrl.shortCode);

    return res.status(201).json({
      success: true,
      _id: newUrl._id,
      shortCode: newUrl.shortCode,
      shortUrl,
      originalUrl: newUrl.originalUrl,
      expiresAt: newUrl.expiresAt,
      createdAt: newUrl.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/urls
 * List all shortened links, newest first, with dynamic status
 */
export const getUrls = async (req, res, next) => {
  try {
    const urls = await Url.find().sort({ createdAt: -1 });

    const formattedUrls = urls.map((url) => {
      const urlObj = url.toObject();
      return {
        ...urlObj,
        shortUrl: buildShortUrl(req, url.shortCode),
        status: getUrlStatus(url.expiresAt),
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedUrls.length,
      urls: formattedUrls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/urls/:id
 * Delete a link and its associated click analytics
 */
export const deleteUrl = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid link ID format',
      });
    }

    const deletedUrl = await Url.findByIdAndDelete(id);

    if (!deletedUrl) {
      return res.status(404).json({
        success: false,
        message: 'URL not found',
      });
    }

    // Clean up associated clicks asynchronously
    Click.deleteMany({ urlId: id }).catch((err) =>
      console.error(`[Analytics Cleanup Error] for urlId ${id}:`, err.message)
    );

    return res.status(200).json({
      success: true,
      message: 'Link deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/urls/:id/analytics
 * Retrieve detailed analytics for a shortened link:
 * - Total clicks
 * - Clicks per day for the last 7 days (including zero-count days)
 * - Top 5 browsers, devices, and referrers
 * - Metadata and active/expired status
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid link ID format',
      });
    }

    const url = await Url.findById(id);
    if (!url) {
      return res.status(404).json({
        success: false,
        message: 'URL not found',
      });
    }

    const targetUrlId = new mongoose.Types.ObjectId(id);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Run parallel aggregation pipelines for top categories and time series
    const [clicksPerDayRaw, topBrowsers, topDevices, topReferrers] = await Promise.all([
      // 1. Clicks in the last 7 days grouped by YYYY-MM-DD
      Click.aggregate([
        {
          $match: {
            urlId: targetUrlId,
            timestamp: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 2. Top 5 Browsers
      Click.aggregate([
        { $match: { urlId: targetUrlId } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ]),

      // 3. Top 5 Devices
      Click.aggregate([
        { $match: { urlId: targetUrlId } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ]),

      // 4. Top 5 Referrers
      Click.aggregate([
        { $match: { urlId: targetUrlId } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ]),
    ]);

    // Format clicksPerDay ensuring all 7 days are represented (even with 0 clicks)
    const clicksMap = new Map();
    clicksPerDayRaw.forEach((item) => {
      clicksMap.set(item._id, item.count);
    });

    const clicksPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      clicksPerDay.push({
        date: dateStr,
        clicks: clicksMap.get(dateStr) || 0,
      });
    }

    return res.status(200).json({
      success: true,
      urlId: url._id,
      shortCode: url.shortCode,
      shortUrl: buildShortUrl(req, url.shortCode),
      originalUrl: url.originalUrl,
      totalClicks: url.clicks,
      status: getUrlStatus(url.expiresAt),
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      clicksPerDay,
      topBrowsers,
      topDevices,
      topReferrers,
    });
  } catch (error) {
    next(error);
  }
};
