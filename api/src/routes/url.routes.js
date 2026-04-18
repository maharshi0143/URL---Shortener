const express = require('express');
const env = require('../config/env');
const asyncHandler = require('../lib/asyncHandler');
const { AppError } = require('../middleware/error.middleware');
const {
  validateShortenRequest,
  validateShortCodeParam
} = require('../middleware/validation.middleware');
const urlService = require('../services/urlService');

const router = express.Router();

router.post(
  '/shorten',
  validateShortenRequest,
  asyncHandler(async (req, res) => {
    const expiresAt = req.body.expires_at ? new Date(req.body.expires_at) : null;

    const shortCode = await urlService.createShortUrl({
      originalUrl: req.body.url,
      strategy: req.body.strategy,
      expiresAt
    });

    res.status(201).json({
      short_url: `${env.baseUrl.replace(/\/$/, '')}/${shortCode}`
    });
  })
);

router.get(
  '/analytics/:shortCode',
  validateShortCodeParam,
  asyncHandler(async (req, res) => {
    const { shortCode } = req.params;
    const exists = await urlService.shortCodeExists(shortCode);

    if (!exists) {
      throw new AppError('Short URL not found', 404);
    }

    const analytics = await urlService.getAnalytics(shortCode);
    res.json({
      total_clicks: analytics.totalClicks,
      history: analytics.history
    });
  })
);

module.exports = {
  router,
  validateShortCodeParam
};
