const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const {
  requireFields, assertOneOf, CATEGORIES, COMPETITION_STATUSES, COMPETITION_FORMATS,
} = require('../utils/validators');
const { assertOwnsCompetition, getCompetitionOrThrow } = require('../utils/ownership');

const getOrganization = db.prepare('SELECT * FROM organizations WHERE id = ?');

const baseSelect = `
  SELECT c.*, o.name AS organizer_name, o.college AS organizer_college, o.logo AS organizer_logo,
    (SELECT COUNT(*) FROM registrations r WHERE r.competition_id = c.id AND r.status = 'approved') AS registrations_count,
    (SELECT COUNT(DISTINCT t.id) FROM teams t
       JOIN registrations r ON r.team_id = t.id AND r.status = 'approved'
       WHERE t.competition_id = c.id) AS teams_count
  FROM competitions c
  JOIN organizations o ON o.id = c.organization_id
`;

function buildListQuery(query, currentUser) {
  const clauses = [];
  const params = {};

  if (query.category) {
    assertOneOf(query.category, CATEGORIES, 'category');
    clauses.push('c.category = @category');
    params.category = query.category;
  }
  if (query.type) {
    clauses.push('c.type LIKE @type');
    params.type = `%${query.type}%`;
  }
  if (query.college) {
    clauses.push('o.college LIKE @college');
    params.college = `%${query.college}%`;
  }
  if (query.organizationId) {
    clauses.push('c.organization_id = @organizationId');
    params.organizationId = Number(query.organizationId);
  }
  if (query.mode) {
    clauses.push('c.mode = @mode');
    params.mode = query.mode;
  }
  if (query.dateFrom) {
    clauses.push('c.start_date >= @dateFrom');
    params.dateFrom = query.dateFrom;
  }
  if (query.dateTo) {
    clauses.push('c.start_date <= @dateTo');
    params.dateTo = query.dateTo;
  }
  if (query.q) {
    clauses.push('c.name LIKE @q');
    params.q = `%${query.q}%`;
  }
  if (query.free === 'true') clauses.push('c.registration_fee = 0');
  if (query.free === 'false') clauses.push('c.registration_fee > 0');
  if (query.registrationOpen === 'true') {
    clauses.push("c.status = 'published' AND c.registration_deadline >= datetime('now')");
  }
  if (query.closingSoonDays) {
    clauses.push(`c.status = 'published' AND c.registration_deadline BETWEEN datetime('now') AND datetime('now', '+${Number(query.closingSoonDays)} days')`);
  }

  // Visibility: the public only sees published/ongoing/completed competitions.
  // Owners see their own drafts too; admins see everything.
  if (query.status) {
    assertOneOf(query.status, COMPETITION_STATUSES, 'status');
    clauses.push('c.status = @status');
    params.status = query.status;
  } else if (!currentUser || currentUser.role !== 'admin') {
    if (query.mine === 'true' && currentUser) {
      clauses.push('(c.status != @draft OR o.created_by = @userId)');
      params.draft = 'draft';
      params.userId = currentUser.id;
    } else {
      clauses.push("c.status != 'draft'");
    }
  }

  if (query.mine === 'true' && currentUser) {
    clauses.push('o.created_by = @ownerId');
    params.ownerId = currentUser.id;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  let orderBy = 'ORDER BY c.start_date ASC';
  if (query.sort === 'recent') orderBy = 'ORDER BY c.created_at DESC';
  if (query.sort === 'closingSoon') orderBy = 'ORDER BY c.registration_deadline ASC';
  if (query.sort === 'popular') orderBy = 'ORDER BY registrations_count DESC';

  const limit = Math.min(Number(query.limit) || 50, 100);
  const offset = Number(query.offset) || 0;

  return { where, params, orderBy, limit, offset };
}

const listCompetitions = asyncHandler(async (req, res) => {
  const { where, params, orderBy, limit, offset } = buildListQuery(req.query, req.user);
  const sql = `${baseSelect} ${where} ${orderBy} LIMIT @limit OFFSET @offset`;
  const rows = db.prepare(sql).all({ ...params, limit, offset });
  res.json({ competitions: rows });
});

const getCompetition = asyncHandler(async (req, res) => {
  const row = db.prepare(`${baseSelect} WHERE c.id = ?`).get(req.params.id);
  if (!row) throw new AppError('Competition not found', 404);
  if (row.status === 'draft') {
    const isOwner = req.user && (req.user.role === 'admin' || row.created_by === req.user.id);
    if (!isOwner) throw new AppError('Competition not found', 404);
  }
  res.json({ competition: row });
});

const createCompetition = asyncHandler(async (req, res) => {
  requireFields(req.body, [
    'organizationId', 'name', 'category', 'startDate', 'endDate', 'registrationDeadline',
  ]);
  const {
    organizationId, name, description, category, type, banner,
    startDate, endDate, registrationDeadline, venue, mode,
    maxParticipants, maxTeams, registrationFee, rules, format, stagesJson,
  } = req.body;

  assertOneOf(category, CATEGORIES, 'category');
  if (format) assertOneOf(format, COMPETITION_FORMATS, 'format');

  const organization = getOrganization.get(organizationId);
  if (!organization) throw new AppError('Organization not found', 404);
  if (req.user.role !== 'admin' && organization.created_by !== req.user.id) {
    throw new AppError('You do not own this organization', 403);
  }

  const info = db.prepare(`
    INSERT INTO competitions (
      organization_id, name, description, category, type, banner,
      start_date, end_date, registration_deadline, venue, mode,
      max_participants, max_teams, registration_fee, rules, format, stages_json,
      status, created_by
    ) VALUES (
      @organization_id, @name, @description, @category, @type, @banner,
      @start_date, @end_date, @registration_deadline, @venue, @mode,
      @max_participants, @max_teams, @registration_fee, @rules, @format, @stages_json,
      @status, @created_by
    )
  `).run({
    organization_id: organizationId,
    name,
    description: description || null,
    category,
    type: type || null,
    banner: banner || null,
    start_date: startDate,
    end_date: endDate,
    registration_deadline: registrationDeadline,
    venue: venue || null,
    mode: mode === 'online' ? 'online' : 'offline',
    max_participants: maxParticipants || null,
    max_teams: maxTeams || null,
    registration_fee: registrationFee || 0,
    rules: rules || null,
    format: format || (category === 'ACADEMIC' ? 'staged' : 'knockout'),
    stages_json: stagesJson ? JSON.stringify(stagesJson) : null,
    status: req.body.status === 'published' ? 'published' : 'draft',
    created_by: req.user.id,
  });

  res.status(201).json({ competition: db.prepare(`${baseSelect} WHERE c.id = ?`).get(info.lastInsertRowid) });
});

const updateCompetition = asyncHandler(async (req, res) => {
  const competition = getCompetitionOrThrow(req.params.id);
  assertOwnsCompetition(req.user, competition);

  const fieldMap = {
    name: 'name', description: 'description', category: 'category', type: 'type', banner: 'banner',
    startDate: 'start_date', endDate: 'end_date', registrationDeadline: 'registration_deadline',
    venue: 'venue', mode: 'mode', maxParticipants: 'max_participants', maxTeams: 'max_teams',
    registrationFee: 'registration_fee', rules: 'rules', format: 'format',
  };

  const updates = [];
  const params = { id: competition.id };
  for (const [bodyKey, column] of Object.entries(fieldMap)) {
    if (req.body[bodyKey] !== undefined) {
      updates.push(`${column} = @${column}`);
      params[column] = req.body[bodyKey];
    }
  }
  if (req.body.stagesJson !== undefined) {
    updates.push('stages_json = @stages_json');
    params.stages_json = req.body.stagesJson ? JSON.stringify(req.body.stagesJson) : null;
  }
  if (!updates.length) throw new AppError('No fields to update', 400);

  updates.push("updated_at = CURRENT_TIMESTAMP");
  db.prepare(`UPDATE competitions SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json({ competition: db.prepare(`${baseSelect} WHERE c.id = ?`).get(competition.id) });
});

const updateCompetitionStatus = asyncHandler(async (req, res) => {
  const competition = getCompetitionOrThrow(req.params.id);
  assertOwnsCompetition(req.user, competition);
  const { status } = req.body;
  assertOneOf(status, COMPETITION_STATUSES, 'status');

  db.prepare('UPDATE competitions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, competition.id);
  res.json({ competition: db.prepare(`${baseSelect} WHERE c.id = ?`).get(competition.id) });
});

const deleteCompetition = asyncHandler(async (req, res) => {
  const competition = getCompetitionOrThrow(req.params.id);
  assertOwnsCompetition(req.user, competition);
  db.prepare('DELETE FROM competitions WHERE id = ?').run(competition.id);
  res.status(204).send();
});

module.exports = {
  listCompetitions, getCompetition, createCompetition, updateCompetition,
  updateCompetitionStatus, deleteCompetition,
};
