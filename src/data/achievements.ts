export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Win your first solo battle',
    emoji: '⚔️',
  },
  {
    id: 'blockchain_basics',
    name: 'Blockchain Basics',
    description: 'Complete World 1: Genesis Block',
    emoji: '⛓️',
  },
  {
    id: 'defi_pioneer',
    name: 'DeFi Pioneer',
    description: 'Complete World 3: DeFi Dungeon',
    emoji: '🏦',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Answer a question in under 3 seconds',
    emoji: '⚡',
  },
  {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: 'Get 5 correct answers in a row',
    emoji: '🔥',
  },
  {
    id: 'archivist_wisdom',
    name: "Archivist's Wisdom",
    description: 'Use 10 hints across your battles',
    emoji: '💡',
  },
  {
    id: 'block_racer_pro',
    name: 'Block Racer Pro',
    description: 'Score 800+ points in Block Racer',
    emoji: '🏎️',
  },
  {
    id: 'hash_master',
    name: 'Hash Master',
    description: 'Solve all 5 puzzles in Hash Puzzle',
    emoji: '#️⃣',
  },
  {
    id: 'node_defender',
    name: 'Node Defender',
    description: 'Survive all 5 waves in Node Defender',
    emoji: '🛡️',
  },
  {
    id: 'world_champion',
    name: 'World Champion',
    description: 'Complete all 7 worlds',
    emoji: '🏆',
  },
  // ─── GDD Achievements ────────────────────────────────────────────────────────
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'Defeat a boss without any wrong answers or hints used',
    emoji: '🔍',
  },
  {
    id: 'protocol_builder',
    name: 'Protocol Builder',
    description: 'Reach Skill Tier 3 — complete Worlds 1–9',
    emoji: '🔧',
  },
  {
    id: 'dapp_architect',
    name: 'DApp Architect',
    description: 'Reach Skill Tier 4 — complete Worlds 1–12',
    emoji: '🏗️',
  },
  {
    id: 'chain_sovereign',
    name: 'Chain Sovereign',
    description: 'Complete all 16 worlds — you are the blockchain',
    emoji: '👑',
  },
  {
    id: 'speed_runner',
    name: 'Speed Runner',
    description: 'Complete any world without using all question time',
    emoji: '💨',
  },
  {
    id: 'first_to_mint',
    name: 'First to Mint',
    description: 'Complete The NFT Nexus (World 15)',
    emoji: '🎨',
  },
  {
    id: 'first_duel',
    name: 'First Duel',
    description: 'Win your first Duel mini-game',
    emoji: '⚔️',
  },
  {
    id: 'jumper_ace',
    name: 'Jumper Ace',
    description: 'Reach the top of The Jumper without losing a life',
    emoji: '🪂',
  },
];
