const logger = require('../lib/logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Resource not found'
  });
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    logger.error({ err: error }, 'Unhandled API error');
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : error.message
  });
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
