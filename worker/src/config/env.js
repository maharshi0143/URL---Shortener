const dotenv = require('dotenv');

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/url_shortener',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  streamName: process.env.REDIS_STREAM_NAME || 'clicks',
  consumerGroup: process.env.REDIS_CONSUMER_GROUP || 'analytics-workers',
  consumerName: process.env.REDIS_CONSUMER_NAME || 'worker',
  blockMs: Math.max(toInt(process.env.REDIS_BLOCK_MS, 5000), 1),
  batchSize: Math.max(toInt(process.env.REDIS_BATCH_SIZE, 200), 1),
  claimIdleMs: Math.max(toInt(process.env.REDIS_CLAIM_IDLE_MS, 60000), 1),
  claimBatchSize: Math.max(toInt(process.env.REDIS_CLAIM_BATCH_SIZE, 100), 1)
};
