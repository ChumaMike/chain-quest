const worldManager = require('./worldManager');
const roomManager = require('./roomManager');
const GameSession = require('./gameSession');
const { verifyToken } = require('../auth');

const activeSessions = new Map(); // roomCode → GameSession

function initSocketHandlers(io) {
  // Validate JWT token on connection (optional — guests can browse world)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = verifyToken(token);
      socket.data.userId = decoded?.userId || null;
      socket.data.isAuthenticated = !!decoded;
    } else {
      socket.data.isAuthenticated = false;
      socket.data.userId = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── OPEN WORLD ────────────────────────────────────────────
    socket.on('world:join', (playerData) => {
      worldManager.addPlayer(socket.id, playerData);
      socket.join('open-world');

      // Send existing players to new player
      socket.emit('world:players', { players: worldManager.getAllPlayers() });

      // Announce new player to everyone else
      socket.to('open-world').emit('world:player-joined', { player: worldManager.getPlayer(socket.id) });

      console.log(`[World] Player joined: ${playerData.displayName} (${worldManager.getPlayerCount()} online)`);
    });

    socket.on('world:move', ({ x, y, direction, isMoving }) => {
      // Rate limit: max 20 moves/sec
      const now = Date.now();
      if (socket._lastMove && now - socket._lastMove < 50) return;
      socket._lastMove = now;
      worldManager.updatePosition(socket.id, x, y, direction, isMoving);
      socket.to('open-world').emit('world:player-moved', {
        playerId: socket.id,
        x, y, direction, isMoving,
      });
    });

    socket.on('world:leave', () => {
      worldManager.removePlayer(socket.id);
      socket.leave('open-world');
      io.to('open-world').emit('world:player-left', { playerId: socket.id });
    });

    socket.on('world:chat', ({ message }) => {
      const player = worldManager.getPlayer(socket.id);
      if (!player) return;
      // Rate limit: 1 message per second
      const now = Date.now();
      if (socket._lastChat && now - socket._lastChat < 1000) return;
      socket._lastChat = now;
      const trimmed = String(message || '').trim().slice(0, 120);
      if (!trimmed) return;
      io.to('open-world').emit('world:chat', {
        playerId: socket.id,
        displayName: player.displayName,
        heroClass: player.heroClass,
        message: trimmed,
        timestamp: Date.now(),
      });
    });

    socket.on('world:emote', ({ emote }) => {
      const player = worldManager.getPlayer(socket.id);
      if (!player) return;
      const allowed = ['👋', '🔥', '💀', '😎', '⚡', '🏆'];
      if (!allowed.includes(emote)) return;
      io.to('open-world').emit('world:emote', {
        playerId: socket.id,
        displayName: player.displayName,
        emote,
      });
    });

    socket.on('world:boss-clear', ({ worldName, bossName }) => {
      const player = worldManager.getPlayer(socket.id);
      if (!player) return;
      io.to('open-world').emit('world:boss-clear', {
        displayName: player.displayName,
        worldName: String(worldName || '').slice(0, 60),
        bossName: String(bossName || '').slice(0, 60),
      });
    });

    // ─── BATTLE ROOMS ──────────────────────────────────────────
    socket.on('room:create', ({ displayName, heroClass, worldId }) => {
      const room = roomManager.createRoom(socket.id, worldId, displayName, heroClass);
      socket.join(room.code);
      socket.emit('room:created', { code: room.code, room });
      console.log(`[Room] Created: ${room.code} by ${displayName}`);
    });

    socket.on('room:join', ({ code, displayName, heroClass }) => {
      const result = roomManager.joinRoom(code, socket.id, displayName, heroClass);
      if (result.error) {
        socket.emit('room:error', { message: result.error, code: result.code });
        return;
      }
      socket.join(result.room.code);
      socket.emit('room:joined', { room: result.room });
      socket.to(result.room.code).emit('room:updated', { room: result.room });
      console.log(`[Room] ${displayName} joined ${result.room.code}`);
    });

    socket.on('room:leave', () => {
      const result = roomManager.leaveRoom(socket.id);
      if (result) {
        socket.leave(result.code);
        if (!result.deleted) {
          io.to(result.code).emit('room:updated', { room: result.room });
          io.to(result.code).emit('room:player-left', { playerId: socket.id });
        }
        // Clean up session
        const session = activeSessions.get(result.code);
        if (session && result.deleted) {
          session.destroy();
          activeSessions.delete(result.code);
        }
      }
    });

    socket.on('lobby:ready', ({ code, ready }) => {
      const room = roomManager.setPlayerReady(code, socket.id, ready);
      if (room) io.to(code).emit('room:updated', { room });
    });

    socket.on('battle:start', ({ code }) => {
      const room = roomManager.getRoom(code);
      if (!room || room.hostId !== socket.id) return;
      if (room.players.length < 1) return;

      roomManager.updateRoom(code, { phase: 'battle' });

      const session = new GameSession(room, io);
      activeSessions.set(code, session);

      io.to(code).emit('battle:start', {
        worldId: room.worldId,
        players: room.players,
        bossMaxHP: session.sharedBossMaxHP,
      });

      session.start();
      console.log(`[Battle] Started in room ${code}`);
    });

    socket.on('battle:answer', ({ code, questionId, answerIndex }) => {
      const session = activeSessions.get(code);
      if (session) session.receiveAnswer(socket.id, questionId, answerIndex);
    });

    // ─── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Remove from open world
      const wasInWorld = worldManager.getPlayer(socket.id);
      if (wasInWorld) {
        worldManager.removePlayer(socket.id);
        io.to('open-world').emit('world:player-left', { playerId: socket.id });
      }

      // Remove from battle room
      const result = roomManager.leaveRoom(socket.id);
      if (result && !result.deleted) {
        io.to(result.code).emit('room:updated', { room: result.room });
        io.to(result.code).emit('room:player-left', { playerId: socket.id });
      }
    });
  });

  console.log('✅ Socket.IO handlers initialized');
}

module.exports = { initSocketHandlers };
