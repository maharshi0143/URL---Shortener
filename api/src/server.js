const http = require('node:http');

const app = require('./app');
const env = require('./config/env');
const logger = require('./lib/logger');
const { close: closePostgres } = require('./db/postgres');
const { close: closeRedis } = require('./db/redis');

const server = http.createServer(app);

server.listen(env.port, () => {
  logger.info({ port: env.port }, 'API service listening');
});

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Starting graceful shutdown');

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, 'Error while closing HTTP server');
    }

    await Promise.allSettled([closePostgres(), closeRedis()]);

    process.exit(error ? 1 : 0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
