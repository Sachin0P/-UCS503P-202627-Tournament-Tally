const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { assertOneOf, MATCH_STATUSES } = require('../utils/validators');
const { assertOwnsCompetition, getCompetitionOrThrow } = require('../utils/ownership');
const { generateKnockout, generateRoundRobin } = require('../services/fixtureService');
const { recomputeStandings } = require('../services/standingsService');
const { notifyUser } = require('../services/notificationService');
const { emitToCompetition } = require('../sockets/socket');

const matchSelect = `
  SELECT m.*, ta.name AS team_a_name, tb.name AS team_b_name, tw.name AS winner_name
  FROM matches m
  LEFT JOIN teams ta ON ta.id = m.team_a_id
  LEFT JOIN teams tb ON tb.id = m.team_b_id
  LEFT JOIN teams tw ON tw.id = m.winner_id
`;
const getMatchRow = db.prepare(`${matchSelect} WHERE m.id = ?`);
const getMatchRaw = db.prepare('SELECT * FROM matches WHERE id = ?');
const activeTeamMembers = db.prepare(`SELECT user_id FROM team_members WHERE team_id = ? AND status = 'active'`);
const registeredTeams = db.prepare(`
  SELECT t.id FROM teams t
  JOIN registrations r ON r.team_id = t.id AND r.status = 'approved'
  WHERE t.competition_id = ?
  ORDER BY r.registered_at ASC
`);
const existingMatchCount = db.prepare(`SELECT COUNT(*) AS n FROM matches WHERE competition_id = ?`);

const myMatchesStmt = db.prepare(`
  SELECT DISTINCT m.*, ta.name AS team_a_name, tb.name AS team_b_name, tw.name AS winner_name, c.name AS competition_name
  FROM matches m
  LEFT JOIN teams ta ON ta.id = m.team_a_id
  LEFT JOIN teams tb ON tb.id = m.team_b_id
  LEFT JOIN teams tw ON tw.id = m.winner_id
  JOIN competitions c ON c.id = m.competition_id
  JOIN team_members mem ON mem.status = 'active' AND mem.user_id = ?
    AND mem.team_id IN (m.team_a_id, m.team_b_id)
  ORDER BY m.scheduled_at ASC, m.id ASC
`);

const myMatches = asyncHandler(async (req, res) => {
  res.json({ matches: myMatchesStmt.all(req.user.id) });
});

const listMatches = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId || req.query.competitionId;
  if (!competitionId) throw new AppError('competitionId is required', 400);
  const clauses = ['m.competition_id = @competitionId'];
  const params = { competitionId };
  if (req.query.round) {
    clauses.push('m.round = @round');
    params.round = req.query.round;
  }
  if (req.query.status) {
    clauses.push('m.status = @status');
    params.status = req.query.status;
  }
  const rows = db.prepare(`${matchSelect} WHERE ${clauses.join(' AND ')} ORDER BY m.round_order ASC, m.id ASC`).all(params);
  res.json({ matches: rows });
});

const getMatch = asyncHandler(async (req, res) => {
  const match = getMatchRow.get(req.params.matchId || req.params.id);
  if (!match) throw new AppError('Match not found', 404);
  res.json({ match });
});

const createMatch = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId || req.body.competitionId;
  const competition = getCompetitionOrThrow(competitionId);
  assertOwnsCompetition(req.user, competition);

  const { round, teamAId, teamBId, scheduledAt, venue } = req.body;
  if (!round) throw new AppError('round is required', 400);

  const info = db.prepare(`
    INSERT INTO matches (competition_id, round, round_order, team_a_id, team_b_id, scheduled_at, venue)
    VALUES (?, ?, 0, ?, ?, ?, ?)
  `).run(competitionId, round, teamAId || null, teamBId || null, scheduledAt || null, venue || null);

  res.status(201).json({ match: getMatchRow.get(info.lastInsertRowid) });
});

/** Generates a full fixture set (round robin or knockout) for a competition's approved teams. */
const generateFixtures = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId;
  const competition = getCompetitionOrThrow(competitionId);
  assertOwnsCompetition(req.user, competition);

  const { n: matchCount } = existingMatchCount.get(competitionId);
  if (matchCount > 0 && req.body.regenerate !== true) {
    throw new AppError('Fixtures already exist for this competition. Pass regenerate:true to replace them.', 409);
  }
  if (matchCount > 0) {
    const inProgress = db.prepare(`SELECT COUNT(*) AS n FROM matches WHERE competition_id = ? AND status IN ('live','completed')`).get(competitionId);
    if (inProgress.n > 0) throw new AppError('Cannot regenerate fixtures once matches are live or completed', 400);
    db.prepare('DELETE FROM matches WHERE competition_id = ?').run(competitionId);
  }

  const teamIds = registeredTeams.all(competitionId).map((t) => t.id);
  if (teamIds.length < 2) throw new AppError('At least 2 approved teams are required to generate fixtures', 400);

  const isKnockout = ['knockout', 'single_elimination', 'group_knockout', 'double_elimination'].includes(competition.format);
  const { rounds } = isKnockout ? generateKnockout(teamIds) : generateRoundRobin(teamIds);

  db.exec('BEGIN');
  try {
    const insertMatch = db.prepare(`
      INSERT INTO matches (competition_id, round, round_order, team_a_id, team_b_id, status, winner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertedIds = rounds.map((roundMatches) => roundMatches.map((m) => {
      const info = insertMatch.run(
        competitionId, m.round, m.round_order, m.team_a_id, m.team_b_id, m.status, m.winner_id
      );
      return info.lastInsertRowid;
    }));

    if (isKnockout) {
      rounds.forEach((roundMatches, r) => {
        roundMatches.forEach((m, i) => {
          if (m._nextRoundIndex !== undefined) {
            const nextId = insertedIds[m._nextRoundIndex][m._nextMatchIndex];
            db.prepare('UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE id = ?')
              .run(nextId, m._nextSlot, insertedIds[r][i]);
          }
        });
      });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  recomputeStandings(competitionId);
  const matches = db.prepare(`${matchSelect} WHERE m.competition_id = ? ORDER BY m.round_order ASC, m.id ASC`).all(competitionId);
  emitToCompetition(competitionId, 'standingsUpdated', { competitionId });
  res.status(201).json({ matches });
});

function computeWinner(match, scoreA, scoreB, providedWinnerId) {
  if (providedWinnerId !== undefined) return providedWinnerId;
  if (scoreA === null || scoreB === null || scoreA === undefined || scoreB === undefined) return match.winner_id;
  if (scoreA > scoreB) return match.team_a_id;
  if (scoreB > scoreA) return match.team_b_id;
  return null; // draw
}

const updateMatch = asyncHandler(async (req, res) => {
  const match = getMatchRaw.get(req.params.matchId || req.params.id);
  if (!match) throw new AppError('Match not found', 404);
  const competition = getCompetitionOrThrow(match.competition_id);
  assertOwnsCompetition(req.user, competition);

  const { scoreA, scoreB, status, winnerId, scheduledAt, venue } = req.body;
  if (status) assertOneOf(status, MATCH_STATUSES, 'status');

  const nextScoreA = scoreA !== undefined ? scoreA : match.score_a;
  const nextScoreB = scoreB !== undefined ? scoreB : match.score_b;
  const nextStatus = status || match.status;
  const nextWinner = nextStatus === 'completed'
    ? computeWinner(match, nextScoreA, nextScoreB, winnerId)
    : (winnerId !== undefined ? winnerId : match.winner_id);

  db.prepare(`
    UPDATE matches SET score_a = ?, score_b = ?, status = ?, winner_id = ?, scheduled_at = ?, venue = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    nextScoreA, nextScoreB, nextStatus, nextWinner,
    scheduledAt !== undefined ? scheduledAt : match.scheduled_at,
    venue !== undefined ? venue : match.venue,
    match.id
  );

  // Propagate the winner into the next bracket match, if any.
  if (nextStatus === 'completed' && nextWinner && match.next_match_id) {
    const column = match.next_match_slot === 'A' ? 'team_a_id' : 'team_b_id';
    db.prepare(`UPDATE matches SET ${column} = ? WHERE id = ?`).run(nextWinner, match.next_match_id);
  }

  const updated = getMatchRow.get(match.id);

  if (nextStatus === 'completed') {
    recomputeStandings(match.competition_id);
    emitToCompetition(match.competition_id, 'standingsUpdated', { competitionId: match.competition_id });
  }
  if (status && status !== match.status) {
    emitToCompetition(match.competition_id, 'matchStatusUpdated', updated);
  }
  if (scoreA !== undefined || scoreB !== undefined) {
    emitToCompetition(match.competition_id, 'scoreUpdated', updated);
  }

  for (const teamId of [match.team_a_id, match.team_b_id]) {
    if (!teamId) continue;
    for (const member of activeTeamMembers.all(teamId)) {
      notifyUser(member.user_id, 'matchUpdated', `${updated.team_a_name || 'TBD'} vs ${updated.team_b_name || 'TBD'} was updated`, match.id);
    }
  }

  res.json({ match: updated });
});

const deleteMatch = asyncHandler(async (req, res) => {
  const match = getMatchRaw.get(req.params.matchId || req.params.id);
  if (!match) throw new AppError('Match not found', 404);
  const competition = getCompetitionOrThrow(match.competition_id);
  assertOwnsCompetition(req.user, competition);
  db.prepare('DELETE FROM matches WHERE id = ?').run(match.id);
  res.status(204).send();
});

module.exports = { myMatches, listMatches, getMatch, createMatch, generateFixtures, updateMatch, deleteMatch };
