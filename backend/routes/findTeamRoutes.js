const express = require('express');
const {
  findTeams, listLookingForTeamPosts, createLookingForTeamPost,
  updateLookingForTeamPost, deleteLookingForTeamPost,
} = require('../controllers/findTeamController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/teams', findTeams);
router.get('/posts', listLookingForTeamPosts);
router.post('/posts', requireAuth, createLookingForTeamPost);
router.put('/posts/:id', requireAuth, updateLookingForTeamPost);
router.delete('/posts/:id', requireAuth, deleteLookingForTeamPost);

module.exports = router;
