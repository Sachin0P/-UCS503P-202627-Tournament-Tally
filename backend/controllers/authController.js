const asyncHandler = require('../utils/asyncHandler');
const { verifyGoogleIdToken, upsertUserFromGoogle, issueAppToken } = require('../services/googleAuthService');

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profilePicture: user.profile_picture,
    role: user.role,
    college: user.college,
    status: user.status,
    createdAt: user.created_at,
  };
}

const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const payload = await verifyGoogleIdToken(idToken);
  const user = upsertUserFromGoogle(payload);
  const token = issueAppToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

module.exports = { googleLogin, me, sanitizeUser };
