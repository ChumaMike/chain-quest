// Defines spawn positions and zone boundaries in the Phaser open world

export interface ZoneConfig {
  worldId: number;
  name: string;
  x: number;        // top-left pixel
  y: number;
  width: number;
  height: number;
  spawnX: number;   // player spawn point for this zone
  spawnY: number;
  bossZone: { x: number; y: number; radius: number };
  color: number;    // Phaser hex color
  borderColor: number;
  npcCount: number;
}

// World map: 3200 × 2400 pixels total
// Zones laid out as per the plan diagram
export const ZONE_CONFIGS: ZoneConfig[] = [
  {
    worldId: 1, name: 'Genesis Block',
    x: 0, y: 1600, width: 800, height: 800,
    spawnX: 300, spawnY: 1900,
    bossZone: { x: 600, y: 2200, radius: 80 },
    color: 0x001a2e, borderColor: 0x00d4ff, npcCount: 4,
  },
  {
    worldId: 2, name: 'Wallet Wastes',
    x: 800, y: 1200, width: 800, height: 800,
    spawnX: 1200, spawnY: 1600,
    bossZone: { x: 1500, y: 1900, radius: 80 },
    color: 0x1a1000, borderColor: 0xffb800, npcCount: 4,
  },
  {
    worldId: 3, name: 'Contract Citadel',
    x: 1600, y: 1200, width: 800, height: 800,
    spawnX: 1900, spawnY: 1600,
    bossZone: { x: 2300, y: 1900, radius: 80 },
    color: 0x0d0022, borderColor: 0x8b5cf6, npcCount: 4,
  },
  {
    worldId: 4, name: 'DeFi Dungeon',
    x: 0, y: 800, width: 800, height: 800,
    spawnX: 300, spawnY: 1100,
    bossZone: { x: 600, y: 1400, radius: 80 },
    color: 0x001a0d, borderColor: 0x00ff88, npcCount: 4,
  },
  {
    worldId: 5, name: 'NFT Nexus',
    x: 0, y: 0, width: 800, height: 800,
    spawnX: 300, spawnY: 300,
    bossZone: { x: 600, y: 600, radius: 80 },
    color: 0x1a0010, borderColor: 0xff0080, npcCount: 4,
  },
  {
    worldId: 6, name: 'DAO Dominion',
    x: 2400, y: 0, width: 800, height: 800,
    spawnX: 2700, spawnY: 300,
    bossZone: { x: 3100, y: 600, radius: 80 },
    color: 0x000d1a, borderColor: 0x0066ff, npcCount: 4,
  },
  {
    worldId: 7, name: 'Web3 Frontier',
    x: 800, y: 0, width: 1600, height: 800,
    spawnX: 1600, spawnY: 300,
    bossZone: { x: 2200, y: 600, radius: 80 },
    color: 0x1a0800, borderColor: 0xff6b35, npcCount: 5,
  },
];

// Central Hub (no boss, just spawn + shop + leaderboard board)
export const HUB_CONFIG = {
  x: 800, y: 800, width: 1600, height: 400,
  spawnX: 1600, spawnY: 980,
  color: 0x0a0e1a, borderColor: 0xffffff,
};

export const WORLD_SPAWN = { x: 1600, y: 980 }; // default spawn (hub center)
export const WORLD_SIZE = { width: 3200, height: 2400 };

// Mini-game portals placed in the Central Hub zone
export const MINI_GAME_PORTALS = [
  { x: 960,  y: 900, radius: 40, sceneKey: 'BlockRacerScene',   color: 0x00d4ff, label: '🏎 BLOCK RACER' },
  { x: 1600, y: 900, radius: 40, sceneKey: 'NodeDefenderScene', color: 0xff8800, label: '🛡 NODE DEFENDER' },
  { x: 2240, y: 900, radius: 40, sceneKey: 'HashPuzzleScene',   color: 0x8b5cf6, label: '🔐 HASH PUZZLE' },
];
