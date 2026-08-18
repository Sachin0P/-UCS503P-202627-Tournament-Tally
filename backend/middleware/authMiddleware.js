const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError('Authentication required', 401);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired session', 401);
  }

  const user = getUserById.get(payload.sub);
  if (!user) throw new AppError('User not found', 401);
  if (user.status === 'suspended') throw new AppError('Account suspended', 403);

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = getUserById.get(payload.sub);
    if (user && user.status !== 'suspended') req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

module.exports = { requireAuth, optionalAuth };
