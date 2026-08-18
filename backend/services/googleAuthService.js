const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/appError');

const client = new OAuth2Client(env.googleClientId);

const findByGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ?');
const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser = db.prepare(`
  INSERT INTO users (google_id, name, email, profile_picture, role, college)
  VALUES (@google_id, @name, @email, @profile_picture, @role, NULL)
`);
const touchUser = db.prepare(`
  UPDATE users SET name = ?, profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);
const promoteToAdmin = db.prepare(
  "UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
);

/**
 * Verifies a raw Google ID token server-side. Never trust an email/sub sent
 * directly by the client — only what verifyIdToken() returns from Google.
 */
async function verifyGoogleIdToken(idToken) {
  if (!idToken) throw new AppError('Google ID token is required', 400);

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: env.googleClientId });
  } catch {
    throw new AppError('Invalid Google ID token', 401);
  }

  const payload = ticket.getPayload();
  if (!payload) throw new AppError('Invalid Google ID token', 401);
  if (!payload.email_verified) throw new AppError('Google email is not verified', 403);

  const domain = payload.email.split('@')[1]?.toLowerCase();
  if (domain !== env.allowedEmailDomain) {
    throw new AppError(`Only @${env.allowedEmailDomain} accounts may sign in`, 403);
  }

  return payload;
}

/**
 * ADMIN_EMAILS (.env) is a one-way bootstrap list: any matching email is
 * promoted to admin on login, whether that's their first login ever or a
 * later one (e.g. the email was added to the list after they'd already
 * signed up). It never demotes — removing an email from the list later
 * does not strip admin rights already granted.
 */
function upsertUserFromGoogle(payload) {
  const email = payload.email.toLowerCase();
  const isBootstrapAdmin = env.adminEmails.includes(email);
  const existing = findByGoogleId.get(payload.sub) || findByEmail.get(payload.email);

  if (existing) {
    touchUser.run(payload.name, payload.picture || null, existing.id);
    if (isBootstrapAdmin && existing.role !== 'admin') {
      promoteToAdmin.run(existing.id);
    }
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }

  const info = insertUser.run({
    google_id: payload.sub,
    name: payload.name,
    email: payload.email,
    profile_picture: payload.picture || null,
    role: isBootstrapAdmin ? 'admin' : 'participant',
  });
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

function issueAppToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

module.exports = { verifyGoogleIdToken, upsertUserFromGoogle, issueAppToken };
