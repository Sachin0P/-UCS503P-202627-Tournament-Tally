const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { assertOwnsCompetition, getCompetitionOrThrow } = require('../utils/ownership');
const { recomputeStandings } = require('../services/standingsService');
const { emitToCompetition } = require('../sockets/socket');

const standingsSelect = `
  SELECT s.*, t.name AS team_name, t.logo AS team_logo
  FROM standings s JOIN teams t ON t.id = s.team_id
  WHERE s.competition_id = ?
  ORDER BY s.rank ASC
`;

const getStandings = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId || req.query.competitionId;
  if (!competitionId) throw new AppError('competitionId is required', 400);
  getCompetitionOrThrow(competitionId);
  res.json({ standings: db.prepare(standingsSelect).all(competitionId) });
});

const recompute = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId;
  const competition = getCompetitionOrThrow(competitionId);
  assertOwnsCompetition(req.user, competition);
  recomputeStandings(competitionId);
  emitToCompetition(competitionId, 'standingsUpdated', { competitionId });
  res.json({ standings: db.prepare(standingsSelect).all(competitionId) });
});

/**
 * Academic competitions don't derive standings from matches — organizers enter
 * evaluation scores directly (e.g. hackathon judging, quiz round totals).
 */
const upsertAcademicScore = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId;
  const competition = getCompetitionOrThrow(competitionId);
  assertOwnsCompetition(req.user, competition);
  if (competition.category !== 'ACADEMIC') {
    throw new AppError('Direct score entry is only for ACADEMIC competitions; other categories derive standings from matches', 400);
  }

  const { teamId, points, statsJson } = req.body;
  if (!teamId || points === undefined) throw new AppError('teamId and points are required', 400);

  db.prepare(`
    INSERT INTO standings (competition_id, team_id, points, stats_json, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (competition_id, team_id) DO UPDATE SET
      points = excluded.points, stats_json = excluded.stats_json, updated_at = CURRENT_TIMESTAMP
  `).run(competitionId, teamId, points, statsJson ? JSON.stringify(statsJson) : null);

  // Re-rank every team in this competition by points.
  const rows = db.prepare('SELECT id, points FROM standings WHERE competition_id = ? ORDER BY points DESC').all(competitionId);
  const updateRank = db.prepare('UPDATE standings SET rank = ? WHERE id = ?');
  db.exec('BEGIN');
  try {
    rows.forEach((row, index) => updateRank.run(index + 1, row.id));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  emitToCompetition(competitionId, 'standingsUpdated', { competitionId });
  res.json({ standings: db.prepare(standingsSelect).all(competitionId) });
});

module.exports = { getStandings, recompute, upsertAcademicScore };
