import express from 'express';
import {
  createUrl,
  getUrls,
  deleteUrl,
  updateUrl,
  getAnalytics,
  getQrCode,
} from '../controllers/urlController.js';
import { shortenLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/urls - Create a new shortened URL (rate-limited)
router.post('/', shortenLimiter, createUrl);

// GET /api/urls - List all shortened URLs
router.get('/', getUrls);

// DELETE /api/urls/:id - Delete a specific URL
router.delete('/:id', deleteUrl);

// PATCH /api/urls/:id - Update link URL, expiry, or passcode
router.patch('/:id', updateUrl);

// GET /api/urls/:id/analytics - Get analytics report for a URL
router.get('/:id/analytics', getAnalytics);

// GET /api/urls/:id/qr - QR code for the short URL (?format=svg|png|json)
router.get('/:id/qr', getQrCode);

export default router;
