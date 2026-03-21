// ─── Hero Classes ─────────────────────────────────────────────────────────────
export type HeroClassId = 'validator' | 'miner' | 'degen' | 'archivist';

export interface HeroClass {
  id: HeroClassId;
  name: string;
  description: string;
  lore: string;
  emoji: string;
  baseHP: number;
  attackMultiplier: number;
  defenseReduction: number;
  passiveAbility: string;
  passiveDescription: string;
  color: string;
  gradient: string;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export interface AvatarConfig {
  style: number;        // 0–3
  color1: string;       // primary color hex
  color2: string;       // secondary color hex
  hasGlow?: boolean;
  hasPet?: boolean;
}

// ─── Questions ────────────────────────────────────────────────────────────────
export type Difficulty = 'easy' | 'medium' | 'hard' | 'boss';

export interface Question {
  id: string;
  worldId: number;
  difficulty: Difficulty;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  damage: number;
  timeLimitSec: number;
  concept: string;
}

// ─── Worlds ───────────────────────────────────────────────────────────────────
export interface WorldData {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  concept: string;
  topic: string;
  learningGoals: [string, string, string];
  enemyTypes: [string, string, string, string];
  color: string;
  gradient: string;
  emoji: string;
  boss: BossData;
  questions: Question[];
  cqtReward: number;
  unlockLevel: number;
}

export interface BossData {
  name: string;
  title: string;
  lore: string;
  emoji: string;
  maxHP: number;
  attackName: string;
  color: string;
}

// ─── Player ───────────────────────────────────────────────────────────────────
export interface Player {
  id: number;
  username: string;
  displayName: string;
  heroClass: HeroClassId;
  avatar: AvatarConfig;
  level: number;
  xp: number;
  currentHP: number;
  maxHP: number;
  worldX: number;
  worldY: number;
  completedWorlds: number[];
  inventory: InventoryItem[];
  badges: Badge[];
}

export interface InventoryItem {
  id: string;
  name: string;
  emoji: string;
  type: 'consumable' | 'boost' | 'cosmetic';
  effect: Record<string, unknown>;
  quantity: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earnedAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  cost: number;
  type: 'consumable' | 'boost' | 'cosmetic';
  effect: Record<string, unknown>;
}

// ─── Battle State ─────────────────────────────────────────────────────────────
export type BattlePhase = 'idle' | 'question' | 'reveal' | 'victory' | 'defeat';
export type StreakMultiplier = 1 | 1.5 | 2 | 3;

export interface BattleState {
  worldId: number;
  mode: 'solo' | 'multiplayer';
  phase: BattlePhase;
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  playerHP: number;
  maxHP: number;
  bossHP: number;
  bossMaxHP: number;
  streak: number;
  multiplier: StreakMultiplier;
  score: number;
  timeRemaining: number;
  selectedAnswerIndex: number | null;
  answerResult: AnswerResult | null;
  xpGained: number;
  cqtReward: number;
  isPerfect: boolean;
}

export interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  damageDealt: number;
  damageTaken: number;
  xpGained: number;
  scoreGained: number;
  explanation: string;
  wasFirst?: boolean;
  firstBonus?: number;
}

// ─── Multiplayer ──────────────────────────────────────────────────────────────
export interface RoomPlayer {
  id: string;
  displayName: string;
  heroClass: HeroClassId;
  isReady: boolean;
  isHost: boolean;
  isEliminated: boolean;
  currentHP: number;
  maxHP: number;
  score: number;
  streak: number;
  multiplier: number;
  hasAnswered: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  worldId: number;
  phase: 'lobby' | 'countdown' | 'battle' | 'reveal' | 'ended';
  players: RoomPlayer[];
  maxPlayers: number;
}

export interface PlayerRanking {
  rank: number;
  playerId: string;
  displayName: string;
  heroClass: HeroClassId;
  finalScore: number;
  maxStreak: number;
  eliminated: boolean;
}

// ─── Open World ───────────────────────────────────────────────────────────────
export interface WorldPlayerData {
  id: string;
  userId?: number;
  displayName: string;
  heroClass: HeroClassId;
  avatarStyle: number;
  avatarColor1: string;
  avatarColor2: string;
  level: number;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  hasGlow: boolean;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  username: string;
  display_name: string;
  score: number;
  hero_class: HeroClassId;
  world_id?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  username: string;
  walletAddress?: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export type GameScreen =
  | 'landing'
  | 'auth'
  | 'avatar-creator'
  | 'open-world'
  | 'battle'
  | 'multiplayer-lobby'
  | 'multiplayer-battle'
  | 'leaderboard'
  | 'profile';
