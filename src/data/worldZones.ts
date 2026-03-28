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

// World map: 3200 × 4000 pixels total
// Worlds 1-7 in original positions, 8-16 added to right column + lower rows
export const ZONE_CONFIGS: ZoneConfig[] = [
  // ── Tier 1: Block Explorer (W1-W3) ─────────────────────────────────
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
  // ── Tier 2: Chain Apprentice (W4-W6) ───────────────────────────────
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
  // ── Tier 3: Protocol Builder (W7-W9) ───────────────────────────────
  {
    worldId: 7, name: 'Web3 Frontier',
    x: 800, y: 0, width: 1600, height: 800,
    spawnX: 1600, spawnY: 300,
    bossZone: { x: 2200, y: 600, radius: 80 },
    color: 0x1a0800, borderColor: 0xff6b35, npcCount: 5,
  },
  {
    worldId: 8, name: 'DApp Dominion',
    x: 0, y: 2400, width: 800, height: 800,
    spawnX: 300, spawnY: 2700,
    bossZone: { x: 600, y: 3100, radius: 80 },
    color: 0x001a18, borderColor: 0x00ffcc, npcCount: 4,
  },
  {
    worldId: 9, name: 'Factory Fortress',
    x: 800, y: 2400, width: 800, height: 800,
    spawnX: 1100, spawnY: 2700,
    bossZone: { x: 1500, y: 3100, radius: 80 },
    color: 0x1a0800, borderColor: 0xff4400, npcCount: 4,
  },
  // ── Tier 4: DApp Architect (W10-W12) ───────────────────────────────
  {
    worldId: 10, name: 'Router Ridges',
    x: 1600, y: 2400, width: 800, height: 800,
    spawnX: 1900, spawnY: 2700,
    bossZone: { x: 2300, y: 3100, radius: 80 },
    color: 0x000a1a, borderColor: 0x3366ff, npcCount: 4,
  },
  {
    worldId: 11, name: 'Proxy Peaks',
    x: 2400, y: 800, width: 800, height: 800,
    spawnX: 2700, spawnY: 1100,
    bossZone: { x: 3100, y: 1500, radius: 80 },
    color: 0x0d0020, borderColor: 0xaa44ff, npcCount: 4,
  },
  {
    worldId: 12, name: 'Abstraction Arcana',
    x: 2400, y: 1600, width: 800, height: 800,
    spawnX: 2700, spawnY: 1900,
    bossZone: { x: 3100, y: 2300, radius: 80 },
    color: 0x1a1500, borderColor: 0xffcc00, npcCount: 4,
  },
  // ── Tier 5: Network Engineer (W13-W14) ─────────────────────────────
  {
    worldId: 13, name: 'Rollup Realm',
    x: 2400, y: 2400, width: 800, height: 800,
    spawnX: 2700, spawnY: 2700,
    bossZone: { x: 3100, y: 3100, radius: 80 },
    color: 0x001520, borderColor: 0x00aaff, npcCount: 4,
  },
  {
    worldId: 14, name: 'Governance Hall',
    x: 0, y: 3200, width: 800, height: 800,
    spawnX: 300, spawnY: 3500,
    bossZone: { x: 600, y: 3900, radius: 80 },
    color: 0x1a1200, borderColor: 0xf59e0b, npcCount: 4,
  },
  // ── Tier 6: Chain Sovereign (W15-W16) ──────────────────────────────
  {
    worldId: 15, name: 'NFT Nexus Prime',
    x: 800, y: 3200, width: 800, height: 800,
    spawnX: 1100, spawnY: 3500,
    bossZone: { x: 1500, y: 3900, radius: 80 },
    color: 0x1a0018, borderColor: 0xff00aa, npcCount: 4,
  },
  {
    worldId: 16, name: 'The Summit',
    x: 1600, y: 3200, width: 1600, height: 800,
    spawnX: 2400, spawnY: 3500,
    bossZone: { x: 3000, y: 3900, radius: 100 },
    color: 0x1a1500, borderColor: 0xffd700, npcCount: 6,
  },
];

// Central Hub (no boss, just spawn + shop + leaderboard board)
export const HUB_CONFIG = {
  x: 800, y: 800, width: 1600, height: 400,
  spawnX: 1600, spawnY: 980,
  color: 0x0a0e1a, borderColor: 0xffffff,
};

export const WORLD_SPAWN = { x: 1600, y: 980 }; // default spawn (hub center)
export const WORLD_SIZE = { width: 3200, height: 4000 };

// Mini-game portals placed in the Central Hub zone
export const MINI_GAME_PORTALS = [
  { x: 960,  y: 900, radius: 40, sceneKey: 'DuelScene',    color: 0xf59e0b, label: '⚔ THE DUEL' },
  { x: 1600, y: 900, radius: 40, sceneKey: 'JumperScene',  color: 0x00d4ff, label: '🪂 THE JUMPER' },
  { x: 2240, y: 900, radius: 40, sceneKey: 'BlockRacerScene',   color: 0x00ff88, label: '🏎 BLOCK RACER' },
  { x: 1280, y: 800, radius: 40, sceneKey: 'HashPuzzleScene',   color: 0x8b5cf6, label: '🔐 HASH PUZZLE' },
  { x: 1920, y: 800, radius: 40, sceneKey: 'NodeDefenderScene', color: 0xff8800, label: '🛡 NODE DEFENDER' },
];
