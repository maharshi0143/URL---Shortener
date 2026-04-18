const Redis = require('ioredis');
const env = require('../config/env');
const logger = require('../lib/logger');

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false
});

redis.on('error', (error) => {
  logger.error({ err: error }, 'Worker Redis client error');
});

const close = async () => {
  try {
    await redis.quit();
  } catch (error) {
    redis.disconnect();
  }
};

module.exports = {
  redis,
  close
};
