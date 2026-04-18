const Redis = require('ioredis');
const env = require('../config/env');
const logger = require('../lib/logger');

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
});

redis.on('error', (error) => {
  logger.error({ err: error }, 'Redis client error');
});

const checkHealth = async () => {
  const pong = await redis.ping();
  if (pong !== 'PONG') {
    throw new Error('Redis ping failed');
  }
};

const close = async () => {
  try {
    await redis.quit();
  } catch (error) {
    redis.disconnect();
  }
};

module.exports = {
  redis,
  checkHealth,
  close
};
