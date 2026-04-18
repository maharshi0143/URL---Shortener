const env = require('../config/env');
const { redis } = require('../db/redis');

const publishClickEvent = async ({ shortCode, userAgent }) => {
  await redis.xadd(
    env.redisStreamName,
    'MAXLEN',
    '~',
    String(env.redisStreamMaxLen),
    '*',
    'short_code',
    shortCode,
    'timestamp',
    new Date().toISOString(),
    'user_agent',
    userAgent || 'unknown'
  );
};

module.exports = {
  publishClickEvent
};
