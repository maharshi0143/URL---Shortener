const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');

const env = require('./config/env');
const logger = require('./lib/logger');
const asyncHandler = require('./lib/asyncHandler');
const { checkHealth: checkPgHealth } = require('./db/postgres');
const { checkHealth: checkRedisHealth } = require('./db/redis');
const { router: apiRouter, validateShortCodeParam } = require('./routes/url.routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const cacheService = require('./services/cacheService');
const streamService = require('./services/streamService');
const urlService = require('./services/urlService');

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origin not allowed by CORS');
    error.statusCode = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health'
    }
  })
);

const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

app.get(
  '/health',
  asyncHandler(async (req, res) => {
    await Promise.all([checkPgHealth(), checkRedisHealth()]);

    res.status(200).json({
      status: 'ok'
    });
  })
);

app.use('/api', apiLimiter, apiRouter);

app.get(
  '/:shortCode',
  validateShortCodeParam,
  asyncHandler(async (req, res) => {
    const { shortCode } = req.params;

    const cachedUrl = await cacheService.getOriginalUrl(shortCode);
    if (cachedUrl) {
      res.setHeader('X-Cache-Status', 'HIT');
      streamService.publishClickEvent({
        shortCode,
        userAgent: req.get('user-agent') || 'unknown'
      }).catch((error) => {
        logger.warn({ err: error, shortCode }, 'Failed to publish click event after cache hit');
      });

      return res.redirect(302, cachedUrl);
    }

    const mapping = await urlService.findActiveUrl(shortCode);
    if (!mapping) {
      return res.status(404).json({
        error: 'Short URL not found'
      });
    }

    await cacheService.setOriginalUrl(shortCode, mapping.original_url, mapping.expires_at);
    res.setHeader('X-Cache-Status', 'MISS');

    streamService.publishClickEvent({
      shortCode,
      userAgent: req.get('user-agent') || 'unknown'
    }).catch((error) => {
      logger.warn({ err: error, shortCode }, 'Failed to publish click event after cache miss');
    });

    return res.redirect(302, mapping.original_url);
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
