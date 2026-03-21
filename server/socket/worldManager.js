// Manages real-time player positions in the open world

const worldPlayers = new Map(); // socketId → playerData

function addPlayer(socketId, playerData) {
  worldPlayers.set(socketId, {
    id: socketId,
    userId: playerData.userId,
    displayName: playerData.displayName || 'Unknown',
    heroClass: playerData.heroClass || 'validator',
    avatarStyle: playerData.avatarStyle || 0,
    avatarColor1: playerData.avatarColor1 || '#00d4ff',
    avatarColor2: playerData.avatarColor2 || '#8b5cf6',
    level: playerData.level || 1,
    x: playerData.x || 500,
    y: playerData.y || 500,
    direction: 'down',
    isMoving: false,
    hasGlow: playerData.hasGlow || false,
  });
}

function removePlayer(socketId) {
  worldPlayers.delete(socketId);
}

function updatePosition(socketId, x, y, direction, isMoving) {
  const player = worldPlayers.get(socketId);
  if (player) {
    player.x = x;
    player.y = y;
    player.direction = direction;
    player.isMoving = isMoving;
  }
}

function getAllPlayers() {
  return Array.from(worldPlayers.values());
}

function getPlayer(socketId) {
  return worldPlayers.get(socketId);
}

function getPlayerCount() {
  return worldPlayers.size;
}

module.exports = { addPlayer, removePlayer, updatePosition, getAllPlayers, getPlayer, getPlayerCount };
