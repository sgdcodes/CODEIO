import rateLimit from 'express-rate-limit';

// Rate limiter for short link generation: 30 requests per 15 minutes window
export const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 link creation requests per window
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many links created from this IP. Please try again after 15 minutes.',
  },
});
