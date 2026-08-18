const db = require('../config/db');
const AppError = require('./appError');

const getOrganization = db.prepare('SELECT * FROM organizations WHERE id = ?');
const getCompetition = db.prepare('SELECT * FROM competitions WHERE id = ?');

function assertOwnsOrganization(user, organization) {
  if (user.role === 'admin') return;
  if (organization.created_by !== user.id) {
    throw new AppError('You do not own this organization', 403);
  }
}

function getCompetitionOrThrow(competitionId) {
  const competition = getCompetition.get(competitionId);
  if (!competition) throw new AppError('Competition not found', 404);
  return competition;
}

/** Organizer must own the organization behind the competition; admins bypass. */
function assertOwnsCompetition(user, competition) {
  if (user.role === 'admin') return;
  const organization = getOrganization.get(competition.organization_id);
  if (!organization || organization.created_by !== user.id) {
    throw new AppError('You do not have permission to manage this competition', 403);
  }
}

module.exports = { assertOwnsOrganization, assertOwnsCompetition, getCompetitionOrThrow };
