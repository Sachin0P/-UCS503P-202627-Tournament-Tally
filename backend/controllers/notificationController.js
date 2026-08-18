const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

const listMine = asyncHandler(async (req, res) => {
  const clauses = ['user_id = @userId'];
  const params = { userId: req.user.id };
  if (req.query.unreadOnly === 'true') clauses.push('is_read = 0');

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const rows = db.prepare(`
    SELECT * FROM notifications WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT @limit
  `).all({ ...params, limit });
  const { unread } = db.prepare('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);

  res.json({ notifications: rows, unreadCount: unread });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!notification) throw new AppError('Notification not found', 404);
  if (notification.user_id !== req.user.id) throw new AppError('This notification does not belong to you', 403);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notification.id);
  res.json({ notification: db.prepare('SELECT * FROM notifications WHERE id = ?').get(notification.id) });
});

const markAllRead = asyncHandler(async (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
  res.status(204).send();
});

module.exports = { listMine, markRead, markAllRead };
