const { Client } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/url_shortener';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

  try {
    await client.connect();
    await client.query('SELECT 1');

    await redis.connect();
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  } finally {
    await Promise.allSettled([client.end(), redis.quit()]);
  }
};

run();
