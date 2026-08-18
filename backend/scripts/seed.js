/**
 * Dev-only helper: inserts sample users directly into SQLite and mints valid
 * app JWTs for them, so the full app can be exercised without a real Google
 * account restricted to ALLOWED_EMAIL_DOMAIN. Never used by the login flow
 * itself — that always goes through real Google ID token verification.
 */
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');

const users = [
  { google_id: 'seed-admin', name: 'Admin User', email: `admin@${env.allowedEmailDomain}`, role: 'admin' },
  { google_id: 'seed-organizer', name: 'Olivia Organizer', email: `organizer@${env.allowedEmailDomain}`, role: 'organizer' },
  { google_id: 'seed-participant-1', name: 'Priya Participant', email: `priya@${env.allowedEmailDomain}`, role: 'participant' },
  { google_id: 'seed-participant-2', name: 'Raj Participant', email: `raj@${env.allowedEmailDomain}`, role: 'participant' },
];

const upsert = db.prepare(`
  INSERT INTO users (google_id, name, email, role, college)
  VALUES (@google_id, @name, @email, @role, 'Thapar Institute')
  ON CONFLICT (google_id) DO UPDATE SET name = excluded.name, role = excluded.role
`);
const getByGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ?');

for (const u of users) {
  upsert.run(u);
  const row = getByGoogleId.get(u.google_id);
  const token = jwt.sign({ sub: row.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  console.log(`${u.role.padEnd(10)} ${u.email.padEnd(35)} id=${row.id}  token=${token}`);
}
