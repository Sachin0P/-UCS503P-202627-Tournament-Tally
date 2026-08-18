const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { requireFields } = require('../utils/validators');
const { assertOwnsOrganization } = require('../utils/ownership');

const listStmt = db.prepare(`
  SELECT o.*, u.name AS created_by_name,
    (SELECT COUNT(*) FROM competitions c WHERE c.organization_id = o.id) AS competitions_count
  FROM organizations o
  JOIN users u ON u.id = o.created_by
  ORDER BY o.created_at DESC
`);
const getStmt = db.prepare('SELECT * FROM organizations WHERE id = ?');
const insertStmt = db.prepare(`
  INSERT INTO organizations (name, description, logo, college, created_by)
  VALUES (@name, @description, @logo, @college, @created_by)
`);
const updateStmt = db.prepare(`
  UPDATE organizations SET name = ?, description = ?, logo = ?, college = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const promoteToOrganizer = db.prepare(
  "UPDATE users SET role = 'organizer', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'participant'"
);
const competitionCardSelect = `
  SELECT c.*, o.name AS organizer_name, o.college AS organizer_college, o.logo AS organizer_logo,
    (SELECT COUNT(*) FROM registrations r WHERE r.competition_id = c.id AND r.status = 'approved') AS registrations_count,
    (SELECT COUNT(DISTINCT t.id) FROM teams t
       JOIN registrations r ON r.team_id = t.id AND r.status = 'approved'
       WHERE t.competition_id = c.id) AS teams_count
  FROM competitions c
  JOIN organizations o ON o.id = c.organization_id
`;
const upcomingCompetitions = db.prepare(`
  ${competitionCardSelect}
  WHERE c.organization_id = ? AND c.status IN ('published', 'ongoing')
  ORDER BY c.start_date ASC
`);
const pastCompetitions = db.prepare(`
  ${competitionCardSelect}
  WHERE c.organization_id = ? AND c.status = 'completed'
  ORDER BY c.start_date DESC
`);

const listOrganizations = asyncHandler(async (req, res) => {
  res.json({ organizations: listStmt.all() });
});

const getOrganization = asyncHandler(async (req, res) => {
  const organization = getStmt.get(req.params.id);
  if (!organization) throw new AppError('Organization not found', 404);
  res.json({
    organization,
    upcomingCompetitions: upcomingCompetitions.all(organization.id),
    pastCompetitions: pastCompetitions.all(organization.id),
  });
});

const createOrganization = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name']);
  const { name, description, logo, college } = req.body;
  const info = insertStmt.run({
    name,
    description: description || null,
    logo: logo || null,
    college: college || null,
    created_by: req.user.id,
  });
  promoteToOrganizer.run(req.user.id);
  res.status(201).json({ organization: getStmt.get(info.lastInsertRowid) });
});

const updateOrganization = asyncHandler(async (req, res) => {
  const organization = getStmt.get(req.params.id);
  if (!organization) throw new AppError('Organization not found', 404);
  assertOwnsOrganization(req.user, organization);

  const { name, description, logo, college } = req.body;
  updateStmt.run(
    name ?? organization.name,
    description ?? organization.description,
    logo ?? organization.logo,
    college ?? organization.college,
    organization.id
  );
  res.json({ organization: getStmt.get(organization.id) });
});

module.exports = { listOrganizations, getOrganization, createOrganization, updateOrganization };
