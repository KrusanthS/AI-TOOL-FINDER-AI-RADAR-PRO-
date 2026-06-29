// backend/src/app.js
import './env.js';
import path, { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'mongo-sanitize';
import morgan from 'morgan';

import connectDB from './config/db.js';
import initializeFirebase from './config/firebase.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { scheduleDiscovery } from './jobs/toolDiscovery.js';
import { scheduleTrendingDecay } from './jobs/trendingJob.js';
import { startupValidation as validateGeminiKeys } from './utils/geminiRotator.js';

// Prevent process crashes from unhandled errors
const _seenUnhandled = new Set();
process.on('unhandledRejection', (reason, promise) => {
  try {
    const key = String(reason && reason.message) || String(reason);
    if (!_seenUnhandled.has(key)) {
      _seenUnhandled.add(key);
      logger.warn(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
      // expire after a short window to allow re-reporting new occurrences
      setTimeout(() => _seenUnhandled.delete(key), 60 * 1000);
    }
  } catch (e) {
    logger.warn('Unhandled Rejection (unknown)');
  }
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
});

// Routes
import toolsRoutes from './routes/tools.js';
import aiRoutes from './routes/ai.js';
import aiToolSearchRoutes from './routes/aiToolSearch.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import trendingRoutes from './routes/trending.js';
import bookmarkRoutes from './routes/bookmarks.js';
import githubReposRoutes from './routes/githubRepos.js';
import consultantRoutes from './routes/consultant.js';

// Initialize core services
connectDB();
initializeFirebase();

const enableBackgroundJobs = process.env.ENABLE_BACKGROUND_JOBS === '1' || process.env.ENABLE_BACKGROUND_JOBS === 'true';
const validateGeminiOnStartup = process.env.VALIDATE_GEMINI_ON_STARTUP === '1' || process.env.VALIDATE_GEMINI_ON_STARTUP === 'true';

if (enableBackgroundJobs) {
  scheduleDiscovery();
  scheduleTrendingDecay();
} else {
  logger.info('Background jobs disabled by env. Skipping discovery and trending schedulers.');
}

if (validateGeminiOnStartup) {
  validateGeminiKeys();
} else {
  logger.info('Gemini startup validation disabled by env.');
}

const app = express();

// Trust proxy if behind a reverse proxy (Heroku, Nginx, etc.)
app.set('trust proxy', 1);

// Security Middleware

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
const apiConnectOrigins = new Set(["'self'", 'http://localhost:3001', 'http://127.0.0.1:3001']);

const deployedApiUrl = process.env.VITE_API_URL || process.env.API_URL;
if (deployedApiUrl) {
  try {
    const resolvedApiUrl = new URL(deployedApiUrl, 'http://localhost');
    if (resolvedApiUrl.origin !== 'http://localhost') {
      apiConnectOrigins.add(resolvedApiUrl.origin);
    }
  } catch {
    // Ignore invalid values and keep the default CSP list.
  }
}

if (process.env.CSP_CONNECT_ORIGINS) {
  process.env.CSP_CONNECT_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach((origin) => apiConnectOrigins.add(origin));
}

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        connectSrc: Array.from(apiConnectOrigins),
      },
    },
  })
);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  next();
});

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate Limiting (General)
app.use('/api', generalLimiter);

// API Routes
app.use('/api/tools', toolsRoutes);
app.use('/api/github-repos', githubReposRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-tool-search', aiToolSearchRoutes);
app.use('/api/consultant', consultantRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Health check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Serve frontend static files in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');

app.use(express.static(frontendBuildPath));

// Catch-all route to serve Index.html for Single Page App router
app.get(/(.*)/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // Let API routes return 404/errors instead of index.html
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;
