const env = require('../config/env');
const { query } = require('../db/postgres');
const hashStrategy = require('../id/hashStrategy');
const { SnowflakeGenerator } = require('../id/snowflakeStrategy');

const snowflakeGenerator = new SnowflakeGenerator(env.snowflakeNodeId, env.snowflakeEpoch);

const isUniqueViolation = (error) => error && error.code === '23505';

const generateCode = (strategy, originalUrl, attempt) => {
  if (strategy === 'snowflake') {
    return snowflakeGenerator.nextCode();
  }

  return hashStrategy.generate({
    originalUrl,
    attempt,
    salt: env.hashSalt,
    length: env.hashCodeLength
  });
};

const insertUrl = async ({ shortCode, originalUrl, strategy, expiresAt }) => {
  const result = await query(
    `
      INSERT INTO urls (short_code, original_url, strategy, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING short_code
    `,
    [shortCode, originalUrl, strategy, expiresAt]
  );

  return result.rows[0].short_code;
};

const createShortUrl = async ({ originalUrl, strategy, expiresAt }) => {
  const maxAttempts = strategy === 'snowflake'
    ? Math.max(env.maxShortCodeRetries, 2)
    : env.maxShortCodeRetries;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const shortCode = generateCode(strategy, originalUrl, attempt).slice(0, 16);

    try {
      return await insertUrl({
        shortCode,
        originalUrl,
        strategy,
        expiresAt
      });
    } catch (error) {
      if (isUniqueViolation(error) && attempt < maxAttempts) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Failed to generate a unique short code');
};

const findActiveUrl = async (shortCode) => {
  const result = await query(
    `
      SELECT short_code, original_url, expires_at
      FROM urls
      WHERE short_code = $1
      AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `,
    [shortCode]
  );

  return result.rows[0] || null;
};

const shortCodeExists = async (shortCode) => {
  const result = await query(
    `
      SELECT 1
      FROM urls
      WHERE short_code = $1
      LIMIT 1
    `,
    [shortCode]
  );

  return result.rowCount > 0;
};

const getAnalytics = async (shortCode) => {
  const result = await query(
    `
      SELECT hour, click_count
      FROM analytics_hourly
      WHERE short_code = $1
      ORDER BY hour ASC
    `,
    [shortCode]
  );

  const history = result.rows.map((row) => ({
    hour: new Date(row.hour).toISOString(),
    clicks: Number(row.click_count)
  }));

  const totalClicks = history.reduce((total, item) => total + item.clicks, 0);

  return {
    totalClicks,
    history
  };
};

module.exports = {
  createShortUrl,
  findActiveUrl,
  shortCodeExists,
  getAnalytics
};
