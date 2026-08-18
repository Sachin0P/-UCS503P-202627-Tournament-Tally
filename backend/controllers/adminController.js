const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { assertOneOf } = require('../utils/validators');
const { sanitizeUser } = require('./authController');

// ---------- Users ----------

const listUsers = asyncHandler(async (req, res) => {
  const clauses = [];
  const params = {};
  if (req.query.role) { clauses.push('role = @role'); params.role = req.query.role; }
  if (req.query.status) { clauses.push('status = @status'); params.status = req.query.status; }
  if (req.query.q) { clauses.push('(name LIKE @q OR email LIKE @q)'); params.q = `%${req.query.q}%`; }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC`).all(params);
  res.json({ users: rows.map(sanitizeUser) });
});

const setUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  assertOneOf(status, ['active', 'suspended'], 'status');
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) throw new AppError('User not found', 404);
  if (target.id === req.user.id) throw new AppError('You cannot change your own status', 400);
  db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, target.id);
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(target.id)) });
});

const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  assertOneOf(role, ['participant', 'organizer', 'admin'], 'role');
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) throw new AppError('User not found', 404);
  db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, target.id);
  res.json({ user: sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(target.id)) });
});

// ---------- Organizations ----------

const listOrganizations = asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, u.name AS created_by_name FROM organizations o JOIN users u ON u.id = o.created_by
    ORDER BY o.created_at DESC
  `).all();
  res.json({ organizations: rows });
});

const verifyOrganization = asyncHandler(async (req, res) => {
  const organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!organization) throw new AppError('Organization not found', 404);
  db.prepare('UPDATE organizations SET verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(organization.id);
  res.json({ organization: db.prepare('SELECT * FROM organizations WHERE id = ?').get(organization.id) });
});

// ---------- Competitions ----------

const listAllCompetitions = asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, o.name AS organizer_name FROM competitions c JOIN organizations o ON o.id = c.organization_id
    ORDER BY c.created_at DESC
  `).all();
  res.json({ competitions: rows });
});

const hideCompetition = asyncHandler(async (req, res) => {
  const competition = db.prepare('SELECT * FROM competitions WHERE id = ?').get(req.params.id);
  if (!competition) throw new AppError('Competition not found', 404);
  db.prepare("UPDATE competitions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(competition.id);
  res.json({ competition: db.prepare('SELECT * FROM competitions WHERE id = ?').get(competition.id) });
});

// ---------- Reports ----------

const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  assertOneOf(targetType, ['competition', 'team', 'user', 'announcement'], 'targetType');
  if (!targetId || !reason) throw new AppError('targetId and reason are required', 400);
  const info = db.prepare(`
    INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)
  `).run(req.user.id, targetType, targetId, reason);
  res.status(201).json({ report: db.prepare('SELECT * FROM reports WHERE id = ?').get(info.lastInsertRowid) });
});

const listReports = asyncHandler(async (req, res) => {
  const clauses = [];
  const params = {};
  if (req.query.status) { clauses.push('r.status = @status'); params.status = req.query.status; }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT r.*, u.name AS reporter_name FROM reports r JOIN users u ON u.id = r.reporter_id
    ${where} ORDER BY r.created_at DESC
  `).all(params);
  res.json({ reports: rows });
});

const resolveReport = asyncHandler(async (req, res) => {
  const { status } = req.body;
  assertOneOf(status, ['resolved', 'dismissed'], 'status');
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) throw new AppError('Report not found', 404);
  db.prepare('UPDATE reports SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, report.id);
  res.json({ report: db.prepare('SELECT * FROM reports WHERE id = ?').get(report.id) });
});

// ---------- Platform stats ----------

const platformStats = asyncHandler(async (req, res) => {
  const count = (sql) => db.prepare(sql).get().n;
  res.json({
    stats: {
      totalUsers: count('SELECT COUNT(*) AS n FROM users'),
      totalOrganizations: count('SELECT COUNT(*) AS n FROM organizations'),
      totalCompetitions: count('SELECT COUNT(*) AS n FROM competitions'),
      activeCompetitions: count("SELECT COUNT(*) AS n FROM competitions WHERE status IN ('published','ongoing')"),
      totalTeams: count('SELECT COUNT(*) AS n FROM teams'),
      totalRegistrations: count('SELECT COUNT(*) AS n FROM registrations'),
      openReports: count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
      competitionsByCategory: db.prepare('SELECT category, COUNT(*) AS n FROM competitions GROUP BY category').all(),
    },
  });
});

module.exports = {
  listUsers, setUserStatus, setUserRole,
  listOrganizations, verifyOrganization,
  listAllCompetitions, hideCompetition,
  createReport, listReports, resolveReport,
  platformStats,
};
