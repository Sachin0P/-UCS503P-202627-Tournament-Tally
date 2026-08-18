const AppError = require('../utils/appError');

function requireRole(...roles) {
  return function roleCheck(req, res, next) {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}

module.exports = { requireRole };
