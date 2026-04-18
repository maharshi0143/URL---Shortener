const os = require('node:os');

const env = require('./config/env');
const logger = require('./lib/logger');
const { pool, close: closePostgres } = require('./db/postgres');
const { redis, close: closeRedis } = require('./db/redis');
const ClickProcessor = require('./services/clickProcessor');

const workerEnv = {
  ...env,
  consumerName: `${env.consumerName}-${os.hostname()}-${process.pid}`
};

const processor = new ClickProcessor({
  redis,
  pool,
  logger,
  env: workerEnv
});

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Worker shutdown initiated');

  processor.stop();

  await Promise.allSettled([closePostgres(), closeRedis()]);
  process.exit(0);
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Worker uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Worker unhandled rejection');
});

processor.run().catch((error) => {
  logger.fatal({ err: error }, 'Worker fatal startup error');
  process.exit(1);
});
