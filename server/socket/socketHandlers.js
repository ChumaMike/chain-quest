const worldManager = require('./worldManager');
const roomManager = require('./roomManager');
const GameSession = require('./gameSession');
const { verifyToken } = require('../auth');

const activeSessions = new Map(); // roomCode → GameSession

// Valid world IDs (1–16)
const VALID_WORLD_IDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

// Sanitize display names: trim, max 20 chars, strip HTML chars
function sanitizeName(name) {
  return String(name || '').trim().slice(0, 20).replace(/[<>&"']/g, '');
}

function initSocketHandlers(io) {
  // Validate JWT token on connection (optional — guests can browse world)
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = verifyToken(token);
        socket.data.userId = decoded?.userId || null;
        socket.data.isAuthenticated = !!decoded;
      } catch (err) {
        // Malformed token — treat as unauthenticated guest, don't crash
        socket.data.isAuthenticated = false;
        socket.data.userId = null;
      }
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
      // Sanitize display name before storing
      if (playerData && typeof playerData === 'object') {
        playerData.displayName = sanitizeName(playerData.displayName);
      }
      worldManager.addPlayer(socket.id, playerData);
      socket.join('open-world');

      // Send existing players to new player
      socket.emit('world:players', { players: worldManager.getAllPlayers() });

      // Announce new player to everyone else
      socket.to('open-world').emit('world:player-joined', { player: worldManager.getPlayer(socket.id) });

      console.log(`[World] Player joined: ${playerData?.displayName} (${worldManager.getPlayerCount()} online)`);
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
      const trimmed = String(message || '').trim().slice(0, 120).replace(/[<>]/g, '');
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
      // Validate worldId
      const wid = parseInt(worldId, 10);
      if (!VALID_WORLD_IDS.includes(wid)) {
        socket.emit('room:error', { message: 'Invalid world selected.' });
        return;
      }
      const cleanName = sanitizeName(displayName);
      if (!cleanName) {
        socket.emit('room:error', { message: 'Display name is required.' });
        return;
      }
      socket.data.displayName = cleanName;
      socket.data.heroClass = heroClass;
      const room = roomManager.createRoom(socket.id, wid, cleanName, heroClass);
      socket.join(room.code);
      socket.emit('room:created', { code: room.code, room });
      console.log(`[Room] Created: ${room.code} by ${cleanName}`);
    });

    socket.on('room:join', ({ code, displayName, heroClass }) => {
      // Validate code format
      if (typeof code !== 'string' || code.length !== 6) {
        socket.emit('room:error', { message: 'Invalid room code format.' });
        return;
      }
      const cleanName = sanitizeName(displayName);
      if (!cleanName) {
        socket.emit('room:error', { message: 'Display name is required.' });
        return;
      }
      socket.data.displayName = cleanName;
      socket.data.heroClass = heroClass;
      const result = roomManager.joinRoom(code.toUpperCase(), socket.id, cleanName, heroClass);
      if (result.error) {
        socket.emit('room:error', { message: result.error, code: result.code });
        return;
      }
      socket.join(result.room.code);
      socket.emit('room:joined', { room: result.room });
      socket.to(result.room.code).emit('room:updated', { room: result.room });
      console.log(`[Room] ${cleanName} joined ${result.room.code}`);
    });

    socket.on('room:leave', () => {
      const result = roomManager.leaveRoom(socket.id);
      if (result) {
        socket.leave(result.code);
        if (!result.deleted) {
          io.to(result.code).emit('room:updated', { room: result.room });
          io.to(result.code).emit('room:player-left', { playerId: socket.id });
        }
        // Clean up session if room deleted
        const session = activeSessions.get(result.code);
        if (session && result.deleted) {
          session.destroy();
          activeSessions.delete(result.code);
        }
      }
    });

    socket.on('lobby:ready', ({ code, ready }) => {
      if (typeof code !== 'string') return;
      const room = roomManager.setPlayerReady(code, socket.id, ready);
      if (room) io.to(code).emit('room:updated', { room });
    });

    socket.on('battle:start', ({ code }) => {
      if (typeof code !== 'string') return;
      const room = roomManager.getRoom(code);
      if (!room || room.hostId !== socket.id) return;

      // Require at least 2 players, all ready
      if (room.players.length < 2) {
        socket.emit('room:error', { message: 'Need at least 2 players to start.' });
        return;
      }
      const notReady = room.players.filter(p => !p.isReady);
      if (notReady.length > 0) {
        socket.emit('room:error', { message: `Waiting for ${notReady.length} player(s) to ready up.` });
        return;
      }

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
      if (typeof code !== 'string') return;
      const session = activeSessions.get(code);
      if (!session) {
        socket.emit('room:error', { message: 'Battle session not found.' });
        return;
      }
      session.receiveAnswer(socket.id, questionId, answerIndex);
    });

    socket.on('battle:chat', ({ code, message }) => {
      if (typeof code !== 'string') return;
      const session = activeSessions.get(code);
      if (!session) return;
      session.receiveChat(socket.id, message);
    });

    socket.on('battle:rejoin', ({ code }) => {
      if (typeof code !== 'string' || code.length !== 6) return;
      const room = roomManager.getRoom(code);
      const session = activeSessions.get(code);
      if (!room || !session) return;
      // Match by userId (authenticated) or displayName+heroClass as fallback
      const userId = socket.data.userId;
      let player = userId
        ? room.players.find(p => p.userId === userId)
        : room.players.find(p => p.displayName === socket.data.displayName && p.heroClass === socket.data.heroClass);
      if (!player) return;
      // Update player's socket ID to new connection
      player.id = socket.id;
      socket.join(code);
      // Send full state snapshot with complete question data
      const currentQ = session.questions[session.currentQuestionIndex];
      const elapsed = session.questionStartTime ? Math.floor((Date.now() - session.questionStartTime) / 1000) : 0;
      const totalSec = currentQ ? (currentQ.timeLimitSec || 30) : 30;
      socket.emit('battle:state-sync', {
        phase: session.phase,
        bossHP: session.sharedBossHP,
        bossMaxHP: session.sharedBossMaxHP,
        players: room.players,
        questionIndex: session.currentQuestionIndex,
        totalQuestions: session.questions.length,
        timeRemaining: Math.max(0, totalSec - elapsed),
        currentQuestion: session.phase === 'question' && currentQ ? {
          id: currentQ.id,
          text: currentQ.text,
          options: currentQ.options,
          difficulty: currentQ.difficulty,
          timeLimitSec: totalSec,
          concept: currentQ.concept || '',
          damage: currentQ.damage || 25,
        } : null,
      });
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
      if (result) {
        if (!result.deleted) {
          // Room still has players — notify them
          io.to(result.code).emit('room:updated', { room: result.room });
          io.to(result.code).emit('room:player-left', { playerId: socket.id });

          // If battle is active, forfeit the disconnected player's answer so game doesn't hang
          const session = activeSessions.get(result.code);
          if (session) {
            session.forfeitAnswer(socket.id);
          }
        } else {
          // Room was deleted (last player left) — clean up session
          const session = activeSessions.get(result.code);
          if (session) {
            session.destroy();
            activeSessions.delete(result.code);
          }
        }
      }
    });
  });

  console.log('✅ Socket.IO handlers initialized');
}

module.exports = { initSocketHandlers };
