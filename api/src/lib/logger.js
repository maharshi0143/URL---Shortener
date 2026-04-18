const pino = require('pino');
const env = require('../config/env');

const logger = pino({
  level: env.logLevel,
  base: {
    service: 'api'
  },
  redact: {
    paths: ['req.headers.authorization'],
    remove: true
  }
});

module.exports = logger;
