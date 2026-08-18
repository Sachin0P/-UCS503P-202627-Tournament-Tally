const db = require('../config/db');
const { emitToUser } = require('../sockets/socket');

const insertNotification = db.prepare(`
  INSERT INTO notifications (user_id, type, message, reference_id)
  VALUES (?, ?, ?, ?)
`);
const getNotification = db.prepare('SELECT * FROM notifications WHERE id = ?');

function notifyUser(userId, type, message, referenceId = null) {
  const info = insertNotification.run(userId, type, message, referenceId);
  const notification = getNotification.get(info.lastInsertRowid);
  try {
    emitToUser(userId, 'notification', notification);
  } catch {
    // Socket.IO not initialized (e.g. scripts/tests) — notification is still persisted.
  }
  return notification;
}

module.exports = { notifyUser };
