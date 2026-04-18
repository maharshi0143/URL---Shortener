const env = require('../config/env');
const { redis } = require('../db/redis');

const getOriginalUrl = async (shortCode) => {
  return redis.get(shortCode);
};

const computeTtlSeconds = (expiresAt) => {
  const defaultTtl = env.redisCacheTtlSeconds;
  if (!expiresAt) {
    return defaultTtl;
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  const remaining = Math.floor((expiresAtMs - Date.now()) / 1000);
  if (remaining <= 0) {
    return 0;
  }

  return Math.min(defaultTtl, remaining);
};

const setOriginalUrl = async (shortCode, originalUrl, expiresAt) => {
  const ttl = computeTtlSeconds(expiresAt);
  if (ttl <= 0) {
    return;
  }

  await redis.set(shortCode, originalUrl, 'EX', ttl);
};

module.exports = {
  getOriginalUrl,
  setOriginalUrl
};
