const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { assertOwnsCompetition, getCompetitionOrThrow } = require('../utils/ownership');
const { notifyUser } = require('../services/notificationService');
const { emitToCompetition } = require('../sockets/socket');

const registrationSelect = `
  SELECT r.*, u.name AS registrant_name, u.email AS registrant_email,
    t.name AS team_name, c.name AS competition_name, c.organization_id
  FROM registrations r
  JOIN users u ON u.id = r.user_id
  JOIN competitions c ON c.id = r.competition_id
  LEFT JOIN teams t ON t.id = r.team_id
`;
const getRegistrationRow = db.prepare(`${registrationSelect} WHERE r.id = ?`);
const activeTeamMembers = db.prepare(`SELECT user_id FROM team_members WHERE team_id = ? AND status = 'active'`);
const existingRegistrationForUser = db.prepare('SELECT id FROM registrations WHERE competition_id = ? AND user_id = ?');
const teamRegistrationCount = db.prepare(
  "SELECT COUNT(*) AS n FROM registrations WHERE competition_id = ? AND team_id IS NOT NULL AND status != 'cancelled'"
);

const createRegistration = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId;
  const competition = getCompetitionOrThrow(competitionId);

  if (competition.status !== 'published' || new Date(competition.registration_deadline) < new Date()) {
    throw new AppError('Registration is closed for this competition', 400);
  }

  const { teamId } = req.body;

  if (teamId) {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team || team.competition_id !== Number(competitionId)) throw new AppError('Team not found for this competition', 404);
    if (team.captain_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Only the team captain can register this team', 403);
    }
    if (competition.max_teams) {
      const { n } = teamRegistrationCount.get(competitionId);
      if (n >= competition.max_teams) throw new AppError('This competition has reached its maximum number of teams', 400);
    }

    const members = activeTeamMembers.all(team.id);
    for (const member of members) {
      if (existingRegistrationForUser.get(competitionId, member.user_id)) {
        throw new AppError('One or more team members are already registered for this competition', 409);
      }
    }

    let info;
    try {
      info = db.prepare(`
        INSERT INTO registrations (competition_id, user_id, team_id) VALUES (?, ?, ?)
      `).run(competitionId, req.user.id, team.id);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) throw new AppError('This team is already registered', 409);
      throw err;
    }
    return res.status(201).json({ registration: getRegistrationRow.get(info.lastInsertRowid) });
  }

  if (existingRegistrationForUser.get(competitionId, req.user.id)) {
    throw new AppError('You are already registered for this competition', 409);
  }

  let info;
  try {
    info = db.prepare(`INSERT INTO registrations (competition_id, user_id) VALUES (?, ?)`).run(competitionId, req.user.id);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new AppError('You are already registered for this competition', 409);
    throw err;
  }
  res.status(201).json({ registration: getRegistrationRow.get(info.lastInsertRowid) });
});

const listRegistrations = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId;
  const competition = getCompetitionOrThrow(competitionId);
  assertOwnsCompetition(req.user, competition);

  const clauses = ['r.competition_id = @competitionId'];
  const params = { competitionId };
  if (req.query.status) {
    clauses.push('r.status = @status');
    params.status = req.query.status;
  }
  const rows = db.prepare(`${registrationSelect} WHERE ${clauses.join(' AND ')} ORDER BY r.registered_at DESC`).all(params);
  res.json({ registrations: rows });
});

const myRegistrations = asyncHandler(async (req, res) => {
  const rows = db.prepare(`${registrationSelect} WHERE r.user_id = ? ORDER BY r.registered_at DESC`).all(req.user.id);
  res.json({ registrations: rows });
});

function notifyRegistrationOutcome(registration, approved) {
  const affectedUserIds = registration.team_id
    ? activeTeamMembers.all(registration.team_id).map((m) => m.user_id)
    : [registration.user_id];

  for (const userId of affectedUserIds) {
    notifyUser(
      userId,
      approved ? 'registrationApproved' : 'registrationRejected',
      `Your registration for ${registration.competition_name} was ${approved ? 'approved' : 'rejected'}`,
      registration.competition_id
    );
  }
  emitToCompetition(registration.competition_id, approved ? 'registrationApproved' : 'registrationRejected', {
    registrationId: registration.id,
  });
}

const approveRegistration = asyncHandler(async (req, res) => {
  const registration = getRegistrationRow.get(req.params.id);
  if (!registration) throw new AppError('Registration not found', 404);
  const competition = getCompetitionOrThrow(registration.competition_id);
  assertOwnsCompetition(req.user, competition);
  if (registration.status !== 'pending') throw new AppError('This registration has already been reviewed', 400);

  db.prepare(`UPDATE registrations SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(registration.id);
  notifyRegistrationOutcome(registration, true);
  res.json({ registration: getRegistrationRow.get(registration.id) });
});

const rejectRegistration = asyncHandler(async (req, res) => {
  const registration = getRegistrationRow.get(req.params.id);
  if (!registration) throw new AppError('Registration not found', 404);
  const competition = getCompetitionOrThrow(registration.competition_id);
  assertOwnsCompetition(req.user, competition);
  if (registration.status !== 'pending') throw new AppError('This registration has already been reviewed', 400);

  db.prepare(`UPDATE registrations SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(registration.id);
  notifyRegistrationOutcome(registration, false);
  res.json({ registration: getRegistrationRow.get(registration.id) });
});

const cancelRegistration = asyncHandler(async (req, res) => {
  const registration = getRegistrationRow.get(req.params.id);
  if (!registration) throw new AppError('Registration not found', 404);
  const isRegistrant = registration.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isRegistrant && !isAdmin) throw new AppError('You cannot cancel this registration', 403);
  if (registration.status === 'cancelled') throw new AppError('This registration is already cancelled', 400);

  db.prepare(`UPDATE registrations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(registration.id);
  res.status(204).send();
});

module.exports = {
  createRegistration, listRegistrations, myRegistrations,
  approveRegistration, rejectRegistration, cancelRegistration,
};
