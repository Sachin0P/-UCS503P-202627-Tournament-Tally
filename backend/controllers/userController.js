const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { sanitizeUser } = require('./authController');

const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const updateProfile = db.prepare(`
  UPDATE users SET college = ?, roll_number = ?, branch = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);

const getUser = asyncHandler(async (req, res) => {
  const user = getUserById.get(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  res.json({ user: sanitizeUser(user) });
});

const updateMe = asyncHandler(async (req, res) => {
  const { college, rollNumber, branch } = req.body;
  updateProfile.run(
    college ?? req.user.college,
    rollNumber ?? req.user.roll_number,
    branch ?? req.user.branch,
    req.user.id
  );
  res.json({ user: sanitizeUser(getUserById.get(req.user.id)) });
});

module.exports = { getUser, updateMe };
