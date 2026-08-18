const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { requireFields, assertOneOf, CATEGORIES } = require('../utils/validators');
const { getCompetitionOrThrow } = require('../utils/ownership');

// ---------- Find a Team: browse teams that are looking for members ----------

const findTeams = asyncHandler(async (req, res) => {
  const clauses = ["t.status = 'active'", 't.looking_for_members = 1'];
  const params = {};

  if (req.query.competitionId) {
    clauses.push('t.competition_id = @competitionId');
    params.competitionId = req.query.competitionId;
  }
  if (req.query.category) {
    assertOneOf(req.query.category, CATEGORIES, 'category');
    clauses.push('c.category = @category');
    params.category = req.query.category;
  }
  if (req.query.role) {
    clauses.push('t.looking_for_role LIKE @role');
    params.role = `%${req.query.role}%`;
  }
  if (req.query.skill) {
    clauses.push('t.required_skills LIKE @skill');
    params.skill = `%${req.query.skill}%`;
  }

  const rows = db.prepare(`
    SELECT t.*, c.name AS competition_name, c.category,
      (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id AND m.status = 'active') AS member_count
    FROM teams t
    JOIN competitions c ON c.id = t.competition_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY t.created_at DESC
  `).all(params);

  res.json({ teams: rows });
});

// ---------- Looking for a Team: public "I need a team" posts ----------

const postSelect = `
  SELECT p.*, u.name AS user_name, u.profile_picture, c.name AS competition_name, c.category
  FROM looking_for_team_posts p
  JOIN users u ON u.id = p.user_id
  JOIN competitions c ON c.id = p.competition_id
`;

const listLookingForTeamPosts = asyncHandler(async (req, res) => {
  const clauses = ["p.status = 'open'"];
  const params = {};

  if (req.query.competitionId) {
    clauses.push('p.competition_id = @competitionId');
    params.competitionId = req.query.competitionId;
  }
  if (req.query.category) {
    assertOneOf(req.query.category, CATEGORIES, 'category');
    clauses.push('c.category = @category');
    params.category = req.query.category;
  }
  if (req.query.role) {
    clauses.push('p.role LIKE @role');
    params.role = `%${req.query.role}%`;
  }

  const rows = db.prepare(`${postSelect} WHERE ${clauses.join(' AND ')} ORDER BY p.created_at DESC`).all(params);
  res.json({ posts: rows });
});

const createLookingForTeamPost = asyncHandler(async (req, res) => {
  requireFields(req.body, ['competitionId', 'role']);
  const { competitionId, role, skills, experience, description } = req.body;
  getCompetitionOrThrow(competitionId);

  let info;
  try {
    info = db.prepare(`
      INSERT INTO looking_for_team_posts (competition_id, user_id, role, skills, experience, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(competitionId, req.user.id, role, skills || null, experience || null, description || null);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new AppError('You already have an open "looking for a team" post for this competition', 409);
    }
    throw err;
  }

  res.status(201).json({ post: db.prepare(`${postSelect} WHERE p.id = ?`).get(info.lastInsertRowid) });
});

function getOwnPostOrThrow(id, user) {
  const post = db.prepare('SELECT * FROM looking_for_team_posts WHERE id = ?').get(id);
  if (!post) throw new AppError('Post not found', 404);
  if (post.user_id !== user.id && user.role !== 'admin') throw new AppError('You do not own this post', 403);
  return post;
}

const updateLookingForTeamPost = asyncHandler(async (req, res) => {
  const post = getOwnPostOrThrow(req.params.id, req.user);
  const { role, skills, experience, description, status } = req.body;
  if (status) assertOneOf(status, ['open', 'closed'], 'status');

  db.prepare(`
    UPDATE looking_for_team_posts
    SET role = ?, skills = ?, experience = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    role ?? post.role,
    skills ?? post.skills,
    experience ?? post.experience,
    description ?? post.description,
    status ?? post.status,
    post.id
  );

  res.json({ post: db.prepare(`${postSelect} WHERE p.id = ?`).get(post.id) });
});

const deleteLookingForTeamPost = asyncHandler(async (req, res) => {
  const post = getOwnPostOrThrow(req.params.id, req.user);
  db.prepare('DELETE FROM looking_for_team_posts WHERE id = ?').run(post.id);
  res.status(204).send();
});

module.exports = {
  findTeams, listLookingForTeamPosts, createLookingForTeamPost,
  updateLookingForTeamPost, deleteLookingForTeamPost,
};
