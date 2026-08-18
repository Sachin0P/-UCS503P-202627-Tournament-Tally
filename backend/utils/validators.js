const AppError = require('./appError');

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 400);
  }
}

function isOneOf(value, allowed) {
  return allowed.includes(value);
}

function assertOneOf(value, allowed, fieldName) {
  if (!isOneOf(value, allowed)) {
    throw new AppError(`Invalid ${fieldName}. Must be one of: ${allowed.join(', ')}`, 400);
  }
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toPositiveIntOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
}

function isValidDateString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

const CATEGORIES = ['SPORTS', 'ACADEMIC', 'ESPORTS'];
const COMPETITION_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
const COMPETITION_FORMATS = [
  'knockout', 'round_robin', 'league', 'group_knockout',
  'single_elimination', 'double_elimination', 'staged',
];
const MATCH_STATUSES = ['scheduled', 'live', 'completed', 'cancelled', 'postponed'];
const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const REQUEST_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled'];

module.exports = {
  requireFields,
  isOneOf,
  assertOneOf,
  isValidEmail,
  toPositiveIntOrNull,
  isValidDateString,
  CATEGORIES,
  COMPETITION_STATUSES,
  COMPETITION_FORMATS,
  MATCH_STATUSES,
  REGISTRATION_STATUSES,
  REQUEST_STATUSES,
};
