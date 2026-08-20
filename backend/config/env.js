const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  frontendUrl: required('FRONTEND_URL', 'http://localhost:4200'),
  // path.resolve (not path.join) so an absolute DB_PATH (e.g. a mounted volume
  // in production) is used as-is instead of being appended to __dirname.
  dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || './data/arenasuite.db'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  allowedEmailDomain: (process.env.ALLOWED_EMAIL_DOMAIN || 'thapar.edu').toLowerCase(),
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === 'production',
};
