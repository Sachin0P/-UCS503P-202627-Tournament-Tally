const express = require('express');
const teamController = require('../controllers/teamController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// Literal paths registered before the `/:teamId` param route so they aren't swallowed by it.
router.get('/mine', requireAuth, teamController.myTeams);
router.get('/invitations/mine', requireAuth, teamController.listMyInvitations);
router.put('/invitations/:invitationId', requireAuth, teamController.respondInvitation);
router.delete('/invitations/:invitationId', requireAuth, teamController.cancelInvitation);

router.get('/', teamController.listTeams);
router.post('/', requireAuth, teamController.createTeam);
router.get('/:teamId', teamController.getTeam);
router.put('/:teamId', requireAuth, teamController.updateTeam);
router.delete('/:teamId', requireAuth, teamController.deleteTeam);

router.post('/:teamId/leave', requireAuth, teamController.leaveTeam);
router.post('/:teamId/transfer-captain', requireAuth, teamController.transferCaptain);
router.delete('/:teamId/members/:userId', requireAuth, teamController.removeMember);

router.post('/:teamId/join-request', requireAuth, teamController.requestToJoin);
router.get('/:teamId/join-requests', requireAuth, teamController.listJoinRequests);
router.put('/:teamId/join-requests/:requestId', requireAuth, teamController.respondJoinRequest);
router.delete('/:teamId/join-requests/:requestId', requireAuth, teamController.cancelJoinRequest);

router.post('/:teamId/invite', requireAuth, teamController.inviteMember);

module.exports = router;
