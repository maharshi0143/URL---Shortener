const dotenv = require('dotenv');

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max, fallback) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
};

const parseCsv = (value, fallback) => {
  const source = value || fallback || '';
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const hashCodeLength = clamp(toInt(process.env.HASH_CODE_LENGTH, 8), 4, 16, 8);

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.API_PORT, 3000),
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/url_shortener',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisCacheTtlSeconds: Math.max(toInt(process.env.REDIS_CACHE_TTL_SECONDS, 86400), 1),
  redisStreamName: process.env.REDIS_STREAM_NAME || 'clicks',
  redisStreamMaxLen: Math.max(toInt(process.env.REDIS_STREAM_MAXLEN, 1000000), 1000),
  snowflakeNodeId: clamp(toInt(process.env.SNOWFLAKE_NODE_ID, 1), 0, 1023, 1),
  snowflakeEpoch: BigInt(toInt(process.env.SNOWFLAKE_EPOCH, 1704067200000)),
  hashSalt: process.env.HASH_SALT || 'change-this-salt',
  hashCodeLength,
  corsOrigins: parseCsv(
    process.env.CORS_ORIGIN,
    'http://localhost:5173,http://127.0.0.1:5173'
  ),
  maxShortCodeRetries: clamp(toInt(process.env.MAX_SHORT_CODE_RETRIES, 8), 1, 50, 8),
  rateLimitWindowMs: Math.max(toInt(process.env.RATE_LIMIT_WINDOW_MS, 60000), 1000),
  rateLimitMax: Math.max(toInt(process.env.RATE_LIMIT_MAX, 300), 1)
};
