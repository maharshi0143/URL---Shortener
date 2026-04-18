const { Pool } = require('pg');
const env = require('../config/env');
const logger = require('../lib/logger');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected PostgreSQL pool error');
});

const query = (text, params) => pool.query(text, params);

const checkHealth = async () => {
  await pool.query('SELECT 1');
};

const close = async () => {
  await pool.end();
};

module.exports = {
  pool,
  query,
  checkHealth,
  close
};
