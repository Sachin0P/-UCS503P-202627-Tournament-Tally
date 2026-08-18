const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { requireFields, assertOneOf } = require('../utils/validators');
const { getCompetitionOrThrow } = require('../utils/ownership');
const { notifyUser } = require('../services/notificationService');
const { emitToCompetition } = require('../sockets/socket');

const teamSelect = `
  SELECT t.*, u.name AS captain_name,
    (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id AND m.status = 'active') AS member_count
  FROM teams t
  JOIN users u ON u.id = t.captain_id
`;
const getTeamRow = db.prepare(`${teamSelect} WHERE t.id = ?`);
const getTeamRaw = db.prepare('SELECT * FROM teams WHERE id = ?');
const membersStmt = db.prepare(`
  SELECT tm.*, u.name, u.email, u.profile_picture
  FROM team_members tm JOIN users u ON u.id = tm.user_id
  WHERE tm.team_id = ? AND tm.status = 'active'
  ORDER BY tm.role DESC, tm.joined_at ASC
`);
const activeMembershipForCompetition = db.prepare(`
  SELECT tm.* FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE t.competition_id = ? AND tm.user_id = ? AND tm.status = 'active'
`);

function assertCaptainOrAdmin(user, team) {
  if (user.role === 'admin') return;
  if (team.captain_id !== user.id) throw new AppError('Only the team captain can do this', 403);
}

function withMembers(team) {
  return { ...team, members: membersStmt.all(team.id) };
}

// ---------- Team CRUD ----------

const myTeamsStmt = db.prepare(`
  SELECT t.*, u.name AS captain_name, c.name AS competition_name, c.category,
    (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id AND m.status = 'active') AS member_count
  FROM teams t
  JOIN users u ON u.id = t.captain_id
  JOIN competitions c ON c.id = t.competition_id
  JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = ? AND tm.status = 'active'
  WHERE t.status = 'active'
  ORDER BY t.created_at DESC
`);

const myTeams = asyncHandler(async (req, res) => {
  res.json({ teams: myTeamsStmt.all(req.user.id) });
});

const listTeams = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId || req.query.competitionId;
  if (!competitionId) throw new AppError('competitionId is required', 400);

  const clauses = ['t.competition_id = @competitionId'];
  const params = { competitionId };
  if (req.query.lookingForMembers === 'true') clauses.push('t.looking_for_members = 1');
  if (req.query.status) {
    clauses.push('t.status = @status');
    params.status = req.query.status;
  } else {
    clauses.push("t.status = 'active'");
  }

  const rows = db.prepare(`${teamSelect} WHERE ${clauses.join(' AND ')} ORDER BY t.created_at DESC`).all(params);
  res.json({ teams: rows });
});

const getTeam = asyncHandler(async (req, res) => {
  const team = getTeamRow.get(req.params.teamId || req.params.id);
  if (!team) throw new AppError('Team not found', 404);
  res.json({ team: withMembers(team) });
});

const createTeam = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId || req.body.competitionId;
  requireFields(req.body, ['name']);
  if (!competitionId) throw new AppError('competitionId is required', 400);

  const competition = getCompetitionOrThrow(competitionId);
  if (!['published', 'ongoing'].includes(competition.status)) {
    throw new AppError('Teams can only be created for published competitions', 400);
  }
  if (activeMembershipForCompetition.get(competitionId, req.user.id)) {
    throw new AppError('You are already on a team for this competition', 409);
  }

  const { name, logo, description, maxMembers, requiredSkills, lookingForMembers, lookingForRole } = req.body;

  let info;
  try {
    info = db.prepare(`
      INSERT INTO teams (competition_id, name, logo, description, captain_id, max_members, required_skills, looking_for_members, looking_for_role)
      VALUES (@competition_id, @name, @logo, @description, @captain_id, @max_members, @required_skills, @looking_for_members, @looking_for_role)
    `).run({
      competition_id: competitionId,
      name,
      logo: logo || null,
      description: description || null,
      captain_id: req.user.id,
      max_members: maxMembers || 4,
      required_skills: requiredSkills || null,
      looking_for_members: lookingForMembers ? 1 : 0,
      looking_for_role: lookingForRole || null,
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw new AppError('A team with this name already exists in this competition', 409);
    throw err;
  }

  db.prepare(`
    INSERT INTO team_members (team_id, user_id, role, status) VALUES (?, ?, 'captain', 'active')
  `).run(info.lastInsertRowid, req.user.id);

  res.status(201).json({ team: withMembers(getTeamRow.get(info.lastInsertRowid)) });
});

const updateTeam = asyncHandler(async (req, res) => {
  const team = getTeamRaw.get(req.params.teamId || req.params.id);
  if (!team) throw new AppError('Team not found', 404);
  assertCaptainOrAdmin(req.user, team);

  const fieldMap = {
    name: 'name', logo: 'logo', description: 'description', maxMembers: 'max_members',
    requiredSkills: 'required_skills', lookingForRole: 'looking_for_role',
  };
  const updates = [];
  const params = { id: team.id };
  for (const [bodyKey, column] of Object.entries(fieldMap)) {
    if (req.body[bodyKey] !== undefined) {
      updates.push(`${column} = @${column}`);
      params[column] = req.body[bodyKey];
    }
  }
  if (req.body.lookingForMembers !== undefined) {
    updates.push('looking_for_members = @looking_for_members');
    params.looking_for_members = req.body.lookingForMembers ? 1 : 0;
  }
  if (!updates.length) throw new AppError('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');

  db.prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json({ team: withMembers(getTeamRow.get(team.id)) });
});

const deleteTeam = asyncHandler(async (req, res) => {
  const team = getTeamRaw.get(req.params.teamId || req.params.id);
  if (!team) throw new AppError('Team not found', 404);
  assertCaptainOrAdmin(req.user, team);
  db.prepare('DELETE FROM teams WHERE id = ?').run(team.id);
  res.status(204).send();
});

// ---------- Members ----------

const removeMember = asyncHandler(async (req, res) => {
  const team = getTeamRaw.get(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  assertCaptainOrAdmin(req.user, team);
  const userId = Number(req.params.userId);
  if (userId === team.captain_id) throw new AppError('Transfer captaincy before removing the captain', 400);

  const result = db.prepare(`UPDATE team_members SET status = 'removed' WHERE team_id = ? AND user_id = ? AND status = 'active'`)
    .run(team.id, userId);
  if (result.changes === 0) throw new AppError('Member not found on this team', 404);
  res.json({ team: withMembers(getTeamRow.get(team.id)) });
});

const leaveTeam = asyncHandler(async (req, res) => {
  const team = getTeamRaw.get(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  if (team.captain_id === req.user.id) {
    throw new AppError('Transfer captaincy before leaving the team', 400);
  }
  const result = db.prepare(`UPDATE team_members SET status = 'left' WHERE team_id = ? AND user_id = ? AND status = 'active'`)
    .run(team.id, req.user.id);
  if (result.changes === 0) throw new AppError('You are not an active member of this team', 404);
  res.status(204).send();
});

const transferCaptain = asyncHandler(async (req, res) => {
  const team = getTeamRaw.get(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  assertCaptainOrAdmin(req.user, team);
  const { userId } = req.body;
  requireFields(req.body, ['userId']);

  const membership = db.prepare(`SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND status = 'active'`)
    .get(team.id, userId);
  if (!membership) throw new AppError('Target user is not an active member of this team', 400);

  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE team_members SET role = 'member' WHERE team_id = ? AND user_id = ?`).run(team.id, team.captain_id);
    db.prepare(`UPDATE team_members SET role = 'captain' WHERE team_id = ? AND user_id = ?`).run(team.id, userId);
    db.prepare(`UPDATE teams SET captain_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(userId, team.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ team: withMembers(getTeamRow.get(team.id)) });
});

// ---------- Join requests ----------

const requestToJoin = asyncHandler(async (req, res) => {
  const team = getTeamRaw.get(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  if (!team.looking_for_members) throw new AppError('This team is not looking for members', 400);
  if (team.member_count >= team.max_members) throw new AppError('This team is full', 400);
  if (activeMembershipForCompetition.get(team.competition_id, req.user.id)) {
    throw new AppError('You are already on a team for this competition', 409);
  }

  const existing = db.prepare(`SELECT * FROM team_join_requests WHERE team_id = ? AND user_id = ? AND status = 'pending'`)
    .get(team.id, req.user.id);
  if (existing) throw new AppError('You already have a pending request for this team', 409);

  const info = db.prepare(`INSERT INTO team_join_requests (team_id, user_id, message) VALUES (?, ?, ?)`)
    .run(team.id, req.user.id, req.body.message || null);

  notifyUser(team.captain_id, 'teamJoinRequest', `${req.user.name} requested to join ${team.name}`, info.lastInsertRowid);
  emitToCompetition(team.competition_id, 'teamJoinRequest', { teamId: team.id, requestId: info.lastInsertRowid });

  res.status(201).json({ request: db.prepare('SELECT * FROM team_join_requests WHERE id = ?').get(info.lastInsertRowid) });
});

const listJoinRequests = asyncHandler(async (req, res) => {
  const team = getTeamRaw.get(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  assertCaptainOrAdmin(req.user, team);
  const rows = db.prepare(`
    SELECT jr.*, u.name, u.email, u.profile_picture FROM team_join_requests jr
    JOIN users u ON u.id = jr.user_id
    WHERE jr.team_id = ? ORDER BY jr.created_at DESC
  `).all(team.id);
  res.json({ requests: rows });
});

const respondJoinRequest = asyncHandler(async (req, res) => {
  const request = db.prepare('SELECT * FROM team_join_requests WHERE id = ?').get(req.params.requestId);
  if (!request) throw new AppError('Request not found', 404);
  const team = getTeamRaw.get(request.team_id);
  assertCaptainOrAdmin(req.user, team);
  if (request.status !== 'pending') throw new AppError('This request has already been resolved', 400);

  const { action } = req.body;
  assertOneOf(action, ['accept', 'reject'], 'action');

  if (action === 'accept') {
    const currentTeam = getTeamRow.get(team.id);
    if (currentTeam.member_count >= currentTeam.max_members) throw new AppError('This team is full', 400);
    db.prepare(`INSERT OR IGNORE INTO team_members (team_id, user_id, role, status) VALUES (?, ?, 'member', 'active')`)
      .run(team.id, request.user_id);
  }

  db.prepare(`UPDATE team_join_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(action === 'accept' ? 'accepted' : 'rejected', request.id);

  notifyUser(
    request.user_id,
    action === 'accept' ? 'teamJoinRequest' : 'teamJoinRequest',
    action === 'accept' ? `Your request to join ${team.name} was accepted` : `Your request to join ${team.name} was rejected`,
    team.id
  );

  res.json({ request: db.prepare('SELECT * FROM team_join_requests WHERE id = ?').get(request.id) });
});

const cancelJoinRequest = asyncHandler(async (req, res) => {
  const request = db.prepare('SELECT * FROM team_join_requests WHERE id = ?').get(req.params.requestId);
  if (!request) throw new AppError('Request not found', 404);
  if (request.user_id !== req.user.id) throw new AppError('You can only cancel your own request', 403);
  if (request.status !== 'pending') throw new AppError('This request has already been resolved', 400);
  db.prepare(`UPDATE team_join_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(request.id);
  res.status(204).send();
});

// ---------- Invitations ----------

const inviteMember = asyncHandler(async (req, res) => {
  const team = getTeamRow.get(req.params.teamId);
  if (!team) throw new AppError('Team not found', 404);
  assertCaptainOrAdmin(req.user, team);
  requireFields(req.body, ['userId']);
  const { userId } = req.body;

  if (team.member_count >= team.max_members) throw new AppError('This team is full', 400);
  if (activeMembershipForCompetition.get(team.competition_id, userId)) {
    throw new AppError('That user is already on a team for this competition', 409);
  }
  const existing = db.prepare(`SELECT * FROM team_invitations WHERE team_id = ? AND user_id = ? AND status = 'pending'`)
    .get(team.id, userId);
  if (existing) throw new AppError('An invitation is already pending for this user', 409);

  const info = db.prepare(`INSERT INTO team_invitations (team_id, user_id, invited_by) VALUES (?, ?, ?)`)
    .run(team.id, userId, req.user.id);

  notifyUser(userId, 'teamInvitation', `You have been invited to join ${team.name}`, info.lastInsertRowid);

  res.status(201).json({ invitation: db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(info.lastInsertRowid) });
});

const listMyInvitations = asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT ti.*, t.name AS team_name, t.competition_id FROM team_invitations ti
    JOIN teams t ON t.id = ti.team_id
    WHERE ti.user_id = ? AND ti.status = 'pending'
    ORDER BY ti.created_at DESC
  `).all(req.user.id);
  res.json({ invitations: rows });
});

const respondInvitation = asyncHandler(async (req, res) => {
  const invitation = db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(req.params.invitationId);
  if (!invitation) throw new AppError('Invitation not found', 404);
  if (invitation.user_id !== req.user.id) throw new AppError('This invitation is not yours', 403);
  if (invitation.status !== 'pending') throw new AppError('This invitation has already been resolved', 400);

  const { action } = req.body;
  assertOneOf(action, ['accept', 'reject'], 'action');
  const team = getTeamRow.get(invitation.team_id);

  if (action === 'accept') {
    if (team.member_count >= team.max_members) throw new AppError('This team is full', 400);
    if (activeMembershipForCompetition.get(team.competition_id, req.user.id)) {
      throw new AppError('You are already on a team for this competition', 409);
    }
    db.prepare(`INSERT OR IGNORE INTO team_members (team_id, user_id, role, status) VALUES (?, ?, 'member', 'active')`)
      .run(team.id, req.user.id);
  }

  db.prepare(`UPDATE team_invitations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(action === 'accept' ? 'accepted' : 'rejected', invitation.id);

  notifyUser(
    team.captain_id,
    'teamInvitation',
    action === 'accept' ? `${req.user.name} accepted your invitation to ${team.name}` : `${req.user.name} declined your invitation to ${team.name}`,
    team.id
  );

  res.json({ invitation: db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(invitation.id) });
});

const cancelInvitation = asyncHandler(async (req, res) => {
  const invitation = db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(req.params.invitationId);
  if (!invitation) throw new AppError('Invitation not found', 404);
  const team = getTeamRaw.get(invitation.team_id);
  assertCaptainOrAdmin(req.user, team);
  db.prepare(`UPDATE team_invitations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(invitation.id);
  res.status(204).send();
});

module.exports = {
  myTeams,
  listTeams, getTeam, createTeam, updateTeam, deleteTeam,
  removeMember, leaveTeam, transferCaptain,
  requestToJoin, listJoinRequests, respondJoinRequest, cancelJoinRequest,
  inviteMember, listMyInvitations, respondInvitation, cancelInvitation,
};
