const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const db = require('../config/db');
const env = require('../config/env');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.frontendUrl, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(payload.sub);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired session'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on('joinCompetition', (competitionId) => {
      if (competitionId) socket.join(`competition:${competitionId}`);
    });

    socket.on('leaveCompetition', (competitionId) => {
      if (competitionId) socket.leave(`competition:${competitionId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized yet');
  return io;
}

function emitToCompetition(competitionId, event, payload) {
  getIO().to(`competition:${competitionId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  getIO().to(`user:${userId}`).emit(event, payload);
}

module.exports = { initSocket, getIO, emitToCompetition, emitToUser };
