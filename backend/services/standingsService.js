const db = require('../config/db');

const registeredTeamIds = db.prepare(`
  SELECT DISTINCT t.id FROM teams t
  JOIN registrations r ON r.team_id = t.id AND r.status = 'approved'
  WHERE t.competition_id = ?
`);
const completedMatches = db.prepare(`
  SELECT * FROM matches
  WHERE competition_id = ? AND status = 'completed' AND team_a_id IS NOT NULL AND team_b_id IS NOT NULL
`);
const upsertStanding = db.prepare(`
  INSERT INTO standings (competition_id, team_id, played, won, lost, draw, points, score_difference, rank, updated_at)
  VALUES (@competition_id, @team_id, @played, @won, @lost, @draw, @points, @score_difference, @rank, CURRENT_TIMESTAMP)
  ON CONFLICT (competition_id, team_id) DO UPDATE SET
    played = excluded.played, won = excluded.won, lost = excluded.lost, draw = excluded.draw,
    points = excluded.points, score_difference = excluded.score_difference, rank = excluded.rank,
    updated_at = CURRENT_TIMESTAMP
`);

const POINTS_WIN = 3;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;

/** Derives standings for a competition purely from completed match results. Never hand-edited by participants. */
function recomputeStandings(competitionId) {
  const teamIds = registeredTeamIds.all(competitionId).map((r) => r.id);
  const stats = new Map(teamIds.map((id) => [id, {
    team_id: id, played: 0, won: 0, lost: 0, draw: 0, points: 0, score_difference: 0,
  }]));

  for (const match of completedMatches.all(competitionId)) {
    if (!stats.has(match.team_a_id)) stats.set(match.team_a_id, { team_id: match.team_a_id, played: 0, won: 0, lost: 0, draw: 0, points: 0, score_difference: 0 });
    if (!stats.has(match.team_b_id)) stats.set(match.team_b_id, { team_id: match.team_b_id, played: 0, won: 0, lost: 0, draw: 0, points: 0, score_difference: 0 });

    const a = stats.get(match.team_a_id);
    const b = stats.get(match.team_b_id);
    const scoreA = match.score_a ?? 0;
    const scoreB = match.score_b ?? 0;

    a.played += 1;
    b.played += 1;
    a.score_difference += scoreA - scoreB;
    b.score_difference += scoreB - scoreA;

    if (match.winner_id === match.team_a_id) {
      a.won += 1; a.points += POINTS_WIN;
      b.lost += 1; b.points += POINTS_LOSS;
    } else if (match.winner_id === match.team_b_id) {
      b.won += 1; b.points += POINTS_WIN;
      a.lost += 1; a.points += POINTS_LOSS;
    } else {
      a.draw += 1; a.points += POINTS_DRAW;
      b.draw += 1; b.points += POINTS_DRAW;
    }
  }

  const ranked = [...stats.values()].sort((x, y) => (
    y.points - x.points || y.score_difference - x.score_difference || y.won - x.won
  ));

  db.exec('BEGIN');
  try {
    ranked.forEach((row, index) => {
      upsertStanding.run({ competition_id: competitionId, rank: index + 1, ...row });
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return db.prepare('SELECT * FROM standings WHERE competition_id = ? ORDER BY rank ASC').all(competitionId);
}

module.exports = { recomputeStandings };
