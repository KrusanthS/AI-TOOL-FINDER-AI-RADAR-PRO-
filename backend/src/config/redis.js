// backend/src/config/redis.js
import Redis from 'ioredis';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const DISABLE_REDIS = process.env.DISABLE_REDIS === '1' || process.env.DISABLE_REDIS === 'true' || !process.env.REDIS_URL;

export const redisOptions = {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  showFriendlyErrorStack: true,
  retryStrategy: (times) => {
    // Fail fast if Redis is not there to prevent startup crashes in Node 22
    if (times > 2) {
      return null; // Stop retrying
    }
    return Math.min(times * 100, 500);
  },
};


let redisClient;
let isConnected = false;

const createNoopRedisClient = () => {
  const noop = async () => null;
  return {
    isReady: false,
    connect: noop,
    disconnect: noop,
    quit: noop,
    on: () => undefined,
    get: noop,
    set: noop,
    del: noop,
    ttl: async () => -1,
    expire: noop,
    exists: async () => 0,
    keys: async () => [],
    mget: async () => [],
    pipeline: () => ({ exec: async () => [] }),
  };
};

try {
  if (DISABLE_REDIS) {
    redisClient = createNoopRedisClient();
    isConnected = false;
  } else {
    redisClient = new Redis(REDIS_URL, redisOptions);

    redisClient.on('connect', () => {
      logger.info('Redis Connected');
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Log but don't crash
      if (err.code !== 'ECONNREFUSED') {
        logger.error(`Redis Error: ${err.message}`);
      }
    });

    redisClient.on('end', () => {
      isConnected = false;
    });

    // Explicitly connect but handle failure
    redisClient.connect().catch(() => {
      logger.warn('Redis unavailable: caching features disabled.');
      isConnected = false;
    });
  }
} catch (e) {
  logger.error('Redis initialization failed:', e.message);
  isConnected = false;
}

// Fallback no-op client if redisClient fails to initialize or is unusable
const proxyHandler = {
  get: (target, prop) => {
    if (prop === 'isReady') return isConnected;
    if (prop in target) return target[prop];
    return async () => {
      return prop === 'keys' ? [] : null;
    };
  }
};

const safeRedisClient = redisClient ? redisClient : new Proxy({}, proxyHandler);

// Inject isReady property for manual checks
Object.defineProperty(safeRedisClient, 'isReady', {
  get: () => isConnected
});

// Factory for Bull to create clients with proper error handling
export const createBullClient = (type) => {
  if (DISABLE_REDIS) {
    return createNoopRedisClient();
  }

  const options = {
    ...redisOptions,
    maxRetriesPerRequest: null, // REQUIRED for Bull v3
    lazyConnect: false,
    enableReadyCheck: false,
    // Slightly more persistent for Bull workers
    retryStrategy: (times) => {
      if (times > 3) return null;
      return 500;
    }
  };

  const client = new Redis(REDIS_URL, options);
  
  // MUST have error handler to prevent Node 22 from crashing on unhandled rejection
  client.on('error', (err) => {
    // Silent fail for connection errors in queues
  });

  return client;
};


export default safeRedisClient;





