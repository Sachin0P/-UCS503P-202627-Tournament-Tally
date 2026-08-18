const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { requireFields } = require('../utils/validators');
const { assertOwnsCompetition, getCompetitionOrThrow } = require('../utils/ownership');
const { notifyUser } = require('../services/notificationService');
const { emitToCompetition } = require('../sockets/socket');

const announcementSelect = `
  SELECT a.*, u.name AS created_by_name FROM announcements a JOIN users u ON u.id = a.created_by
  WHERE a.competition_id = ? ORDER BY a.created_at DESC
`;

const affectedParticipants = db.prepare(`
  SELECT DISTINCT user_id FROM (
    SELECT r.user_id AS user_id FROM registrations r WHERE r.competition_id = ? AND r.status = 'approved' AND r.team_id IS NULL
    UNION
    SELECT tm.user_id AS user_id FROM registrations r
      JOIN team_members tm ON tm.team_id = r.team_id AND tm.status = 'active'
      WHERE r.competition_id = ? AND r.status = 'approved' AND r.team_id IS NOT NULL
  )
`);

const listAnnouncements = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId || req.query.competitionId;
  if (!competitionId) throw new AppError('competitionId is required', 400);
  getCompetitionOrThrow(competitionId);
  res.json({ announcements: db.prepare(announcementSelect).all(competitionId) });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const competitionId = req.params.competitionId;
  const competition = getCompetitionOrThrow(competitionId);
  assertOwnsCompetition(req.user, competition);
  requireFields(req.body, ['title', 'message']);

  const info = db.prepare(`
    INSERT INTO announcements (competition_id, title, message, created_by) VALUES (?, ?, ?, ?)
  `).run(competitionId, req.body.title, req.body.message, req.user.id);

  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid);

  emitToCompetition(competitionId, 'announcementCreated', announcement);
  for (const { user_id: userId } of affectedParticipants.all(competitionId, competitionId)) {
    notifyUser(userId, 'announcement', `${competition.name}: ${req.body.title}`, announcement.id);
  }

  res.status(201).json({ announcement });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!announcement) throw new AppError('Announcement not found', 404);
  const competition = getCompetitionOrThrow(announcement.competition_id);
  assertOwnsCompetition(req.user, competition);
  db.prepare('DELETE FROM announcements WHERE id = ?').run(announcement.id);
  res.status(204).send();
});

module.exports = { listAnnouncements, createAnnouncement, deleteAnnouncement };
