// backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // Increased from 100
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Increased from 10
  message: { error: 'Too many AI requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});
