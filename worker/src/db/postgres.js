const { Pool } = require('pg');
const env = require('../config/env');
const logger = require('../lib/logger');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected PostgreSQL pool error in worker');
});

const close = async () => {
  await pool.end();
};

module.exports = {
  pool,
  close
};
