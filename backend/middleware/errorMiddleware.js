const AppError = require('../utils/appError');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  if (statusCode === 500) {
    console.error(err);
  }
  res.status(statusCode).json({
    error: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

module.exports = { notFoundHandler, errorHandler };
