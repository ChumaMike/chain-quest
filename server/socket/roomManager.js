const { v4: uuidv4 } = require('uuid');

const rooms = new Map(); // roomCode → Room

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateCode() : code;
}

function createRoom(hostSocketId, worldId, displayName, heroClass) {
  const code = generateCode();
  const room = {
    code,
    hostId: hostSocketId,
    worldId: worldId || 1,
    phase: 'lobby', // lobby | countdown | battle | ended
    players: [{
      id: hostSocketId,
      displayName: displayName || 'Host',
      heroClass: heroClass || 'validator',
      isReady: false,
      isHost: true,
      isEliminated: false,
      currentHP: 110,
      maxHP: 110,
      score: 0,
      streak: 0,
      multiplier: 1,
      hasAnswered: false,
    }],
    maxPlayers: 8,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function joinRoom(code, socketId, displayName, heroClass) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Room not found', code: 'NOT_FOUND' };
  if (room.phase !== 'lobby') return { error: 'Game already started', code: 'ALREADY_STARTED' };
  if (room.players.length >= room.maxPlayers) return { error: 'Room is full', code: 'FULL' };
  if (room.players.find(p => p.id === socketId)) return { error: 'Already in room', code: 'DUPLICATE' };

  const HP_BY_CLASS = { validator: 110, miner: 80, degen: 90, archivist: 100 };
  const hp = HP_BY_CLASS[heroClass] || 100;

  room.players.push({
    id: socketId,
    displayName: displayName || 'Player',
    heroClass: heroClass || 'validator',
    isReady: false,
    isHost: false,
    isEliminated: false,
    currentHP: hp,
    maxHP: hp,
    score: 0,
    streak: 0,
    multiplier: 1,
    hasAnswered: false,
  });
  return { room };
}

function leaveRoom(socketId) {
  for (const [code, room] of rooms) {
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        rooms.delete(code);
        return { deleted: true, code };
      }
      // Transfer host if needed
      if (room.hostId === socketId) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }
      return { room, code };
    }
  }
  return null;
}

function getRoom(code) {
  if (!code) return undefined;
  return rooms.get(typeof code === 'string' ? code.toUpperCase() : code);
}

function getRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.find(p => p.id === socketId)) return room;
  }
  return null;
}

function setPlayerReady(code, socketId, ready) {
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.find(p => p.id === socketId);
  if (player) player.isReady = ready;
  return room;
}

function updateRoom(code, updates) {
  const room = rooms.get(code);
  if (room) Object.assign(room, updates);
  return room;
}

function getActiveRoomCount() { return rooms.size; }

module.exports = { createRoom, joinRoom, leaveRoom, getRoom, getRoomBySocketId, setPlayerReady, updateRoom, getActiveRoomCount };
