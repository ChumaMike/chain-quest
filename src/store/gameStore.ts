import { create } from 'zustand';
import type { BattleState, BattlePhase, Question, AnswerResult, StreakMultiplier } from '../types';
import { HEROES } from '../data/heroes';
import { WORLDS } from '../data/curriculum';
import { TERRAIN_MAP } from '../data/terrains';
import { ACHIEVEMENTS } from '../data/achievements';
import { apiFetch } from '../lib/api';

interface GameStore {
  battle: BattleState;
  worldProgress: Record<number, { bestScore: number; stars: number; bossDefeated: boolean; cqtClaimed: boolean }>;
  completedWorlds: number[];
  currentLevel: number;
  totalXP: number;
  hintsRemaining: number;
  xpBoostActive: boolean;
  unlockedAchievements: string[];
  totalHintsUsed: number;

  startBattle: (worldId: number, heroClassId: string, mode?: 'solo' | 'multiplayer') => void;
  submitAnswer: (answerIndex: number) => AnswerResult | null;
  advanceQuestion: () => void;
  useItem: (itemId: string) => void;
  consumeItem: (itemId: string, token: string) => void;
  useHint: () => number | null;
  endBattle: (outcome: 'victory' | 'defeat') => void;
  resetBattle: () => void;
  setPhase: (phase: BattlePhase) => void;
  tickTimer: () => void;
  completeWorld: (worldId: number, score: number) => void;
  claimCQT: (worldId: number) => void;
  addXP: (amount: number) => void;
  setXPBoost: (active: boolean) => void;
  unlockAchievement: (id: string) => void;
  checkAchievements: () => void;
}

const defaultBattle: BattleState = {
  worldId: 1,
  mode: 'solo',
  phase: 'idle',
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 10,
  playerHP: 100,
  maxHP: 100,
  bossHP: 200,
  bossMaxHP: 200,
  streak: 0,
  multiplier: 1,
  score: 0,
  timeRemaining: 30,
  selectedAnswerIndex: null,
  answerResult: null,
  xpGained: 0,
  cqtReward: 0,
  isPerfect: true,
  terrainBonusActive: false,
  terrainName: '',
  trapStack: [],
  trapReady: false,
};

function getStreakMultiplier(streak: number, heroClass: string): StreakMultiplier {
  const isDegen = heroClass === 'degen';
  if (isDegen) {
    if (streak >= 3) return 3;
    if (streak >= 2) return 2;
    if (streak >= 1) return 1.5;
    return 1;
  }
  if (streak >= 4) return 3;
  if (streak >= 3) return 2;
  if (streak >= 2) return 1.5;
  return 1;
}

export const useGameStore = create<GameStore>((set, get) => ({
  battle: defaultBattle,
  worldProgress: {},
  completedWorlds: [],
  currentLevel: 1,
  totalXP: 0,
  hintsRemaining: 0,
  xpBoostActive: false,
  unlockedAchievements: [],
  totalHintsUsed: 0,

  startBattle: (worldId, heroClassId, mode = 'solo') => {
    const world = WORLDS.find(w => w.id === worldId);
    if (!world) return;
    const hero = HEROES.find(h => h.id === heroClassId);
    if (!hero) return;

    const questions = [...world.questions].sort(() => Math.random() - 0.5);
    const hintsForClass = heroClassId === 'archivist' ? 2 : 0;

    // Terrain bonus: hero class matches the world's favoured terrain class
    const terrain = world.terrain ? TERRAIN_MAP[world.terrain] : null;
    const terrainBonusActive = terrain ? terrain.favouredClass === heroClassId : false;
    const terrainName = terrain?.name || '';

    set({
      hintsRemaining: hintsForClass,
      battle: {
        ...defaultBattle,
        worldId,
        mode,
        phase: 'question',
        currentQuestion: questions[0],
        questionIndex: 0,
        totalQuestions: questions.length,
        playerHP: hero.baseHP,
        maxHP: hero.baseHP,
        bossHP: world.boss.maxHP,
        bossMaxHP: world.boss.maxHP,
        streak: 0,
        multiplier: 1,
        score: 0,
        timeRemaining: (questions[0]?.timeLimitSec || 30) + (terrainBonusActive && terrain ? terrain.timerBonus : 0),
        selectedAnswerIndex: null,
        answerResult: null,
        xpGained: 0,
        cqtReward: world.cqtReward,
        isPerfect: true,
        terrainBonusActive,
        terrainName,
        trapStack: [],
        trapReady: false,
        // Store hero class + shuffled questions for advancing
        ...({ _questions: questions, _heroClass: heroClassId, _shieldActive: heroClassId === 'validator', _govVoteUsed: false } as any),
      },
    });
  },

  submitAnswer: (answerIndex) => {
    const { battle, xpBoostActive } = get();
    if (battle.phase !== 'question' || !battle.currentQuestion) return null;

    const q = battle.currentQuestion;
    const hero = HEROES.find(h => h.id === (battle as any)._heroClass) || HEROES[0];
    const heroClass = (battle as any)._heroClass || 'validator';
    const correct = answerIndex === q.correctIndex;

    let newHP = battle.playerHP;
    let newBossHP = battle.bossHP;
    let newStreak = battle.streak;
    let newScore = battle.score;
    let damageDealt = 0;
    let damageTaken = 0;
    let xpGained = 0;
    let newIsPerfect = battle.isPerfect;

    if (correct) {
      const mult = battle.multiplier;
      const attackMult = HEROES.find(h => h.id === heroClass)?.attackMultiplier || 1.0;
      const hardBonus = (q.difficulty === 'hard' || q.difficulty === 'boss') && heroClass === 'miner' ? 2 : 1;
      const terrainDmgMult = battle.terrainBonusActive ? 1.15 : 1;
      const terrainXpMult = battle.terrainBonusActive ? 1.25 : 1;
      damageDealt = Math.round(q.damage * attackMult * mult * hardBonus * terrainDmgMult);
      newBossHP = Math.max(0, battle.bossHP - damageDealt);
      newStreak = battle.streak + 1;
      const speedBonus = Math.floor((battle.timeRemaining / (q.timeLimitSec)) * 50);
      newScore = battle.score + damageDealt * 10 + speedBonus;
      const xpMult = xpBoostActive ? 2 : 1;
      const diffFactor = q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 1.5 : 2;
      xpGained = Math.round(q.damage * mult * diffFactor * xpMult * terrainXpMult);
    } else {
      const defenseMult = HEROES.find(h => h.id === heroClass)?.defenseReduction || 0.2;
      damageTaken = Math.round(q.damage * 0.5 * (1 - defenseMult));

      // Validator passive: if shield active, negate damage once
      const shieldActive = (battle as any)._shieldActive;
      if (heroClass === 'validator' && shieldActive && battle.streak >= 3) {
        damageTaken = 0;
        (battle as any)._shieldActive = false;
      }
      // DAO Diplomat passive: Governance Vote — negate damage once per battle (flag _govVoteUsed)
      else if (heroClass === 'dao_diplomat' && !(battle as any)._govVoteUsed) {
        damageTaken = 0;
        (battle as any)._govVoteUsed = true;
      } else {
        newHP = Math.max(0, battle.playerHP - damageTaken);
      }
      newStreak = 0;
      newIsPerfect = false;
    }

    // Validator: activate shield when streak hits 3
    if (heroClass === 'validator' && newStreak === 3) {
      (battle as any)._shieldActive = true;
    }

    // Trap: increment consecutive correct counter; ready at 3
    if (correct) {
      const prevConsec = (battle as any)._consecCorrect || 0;
      const newConsec = prevConsec + 1;
      (battle as any)._consecCorrect = newConsec;
      if (newConsec >= 3 && !battle.trapReady) {
        set((state) => ({ battle: { ...state.battle, trapReady: true } }));
      }
    } else {
      (battle as any)._consecCorrect = 0;
    }

    const newMultiplier = getStreakMultiplier(newStreak, heroClass);

    const result: AnswerResult = {
      correct,
      correctIndex: q.correctIndex,
      damageDealt,
      damageTaken,
      xpGained,
      scoreGained: damageDealt * 10,
      explanation: q.explanation,
    };

    set((state) => ({
      battle: {
        ...state.battle,
        phase: 'reveal',
        selectedAnswerIndex: answerIndex,
        answerResult: result,
        playerHP: newHP,
        bossHP: newBossHP,
        streak: newStreak,
        multiplier: newMultiplier,
        score: newScore,
        xpGained: state.battle.xpGained + xpGained,
        isPerfect: newIsPerfect,
      },
    }));

    if (correct) {
      get().checkAchievements();
    }

    return result;
  },

  advanceQuestion: () => {
    const { battle } = get();
    const questions = (battle as any)._questions as Question[];
    if (!questions) return;

    const nextIndex = battle.questionIndex + 1;

    if (nextIndex >= questions.length || battle.playerHP <= 0 || battle.bossHP <= 0) {
      const outcome = battle.playerHP <= 0 && battle.bossHP > 0 ? 'defeat' : 'victory';
      get().endBattle(outcome);
      return;
    }

    const nextQ = questions[nextIndex];
    set((state) => ({
      battle: {
        ...state.battle,
        phase: 'question',
        currentQuestion: nextQ,
        questionIndex: nextIndex,
        selectedAnswerIndex: null,
        answerResult: null,
        timeRemaining: nextQ.timeLimitSec,
      },
    }));
  },

  useItem: (itemId) => {
    const { battle } = get();
    if (itemId === 'hp_potion') {
      set((state) => ({
        battle: { ...state.battle, playerHP: Math.min(state.battle.maxHP, state.battle.playerHP + 30) },
      }));
    } else if (itemId === 'time_freeze') {
      set((state) => ({
        battle: { ...state.battle, timeRemaining: state.battle.timeRemaining + 10 },
      }));
    }
  },

  consumeItem: (itemId, token) => {
    const { battle } = get();
    if (battle.phase !== 'question') return;
    // Apply effect immediately
    if (itemId === 'hp_potion') {
      set((state) => ({
        battle: { ...state.battle, playerHP: Math.min(state.battle.maxHP, state.battle.playerHP + 30) },
      }));
    } else if (itemId === 'time_freeze') {
      set((state) => ({
        battle: { ...state.battle, timeRemaining: state.battle.timeRemaining + 10 },
      }));
    } else if (itemId === 'hint_scroll') {
      get().useHint();
    }
    // Persist consumption to server (fire and forget)
    apiFetch('/api/shop/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itemId }),
    }).catch(() => {});
  },

  useHint: () => {
    const { battle, hintsRemaining, totalHintsUsed } = get();
    if (hintsRemaining <= 0 || !battle.currentQuestion) return null;
    const q = battle.currentQuestion;
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== q.correctIndex && i !== battle.selectedAnswerIndex);
    const toEliminate = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
    const newTotalHintsUsed = totalHintsUsed + 1;
    set({ hintsRemaining: hintsRemaining - 1, totalHintsUsed: newTotalHintsUsed });
    if (newTotalHintsUsed >= 10) {
      get().unlockAchievement('archivist_wisdom');
    }
    return toEliminate;
  },

  endBattle: (outcome) => {
    set((state) => ({
      battle: { ...state.battle, phase: outcome === 'victory' ? 'victory' : 'defeat' },
    }));
  },

  resetBattle: () => set({ battle: defaultBattle }),

  setPhase: (phase) => set((state) => ({ battle: { ...state.battle, phase } })),

  tickTimer: () => {
    const { battle } = get();
    if (battle.phase !== 'question') return;
    const newTime = battle.timeRemaining - 1;
    if (newTime <= 0) {
      // Auto-submit as wrong answer
      get().submitAnswer(-1);
    } else {
      set((state) => ({ battle: { ...state.battle, timeRemaining: newTime } }));
    }
  },

  completeWorld: (worldId, score) => {
    const { worldProgress, completedWorlds } = get();
    const existing = worldProgress[worldId];
    const newProgress = {
      bestScore: Math.max(score, existing?.bestScore || 0),
      stars: score > 5000 ? 3 : score > 2500 ? 2 : 1,
      bossDefeated: true,
      cqtClaimed: existing?.cqtClaimed || false,
    };
    const newCompleted = completedWorlds.includes(worldId)
      ? completedWorlds
      : [...completedWorlds, worldId];

    set({ worldProgress: { ...worldProgress, [worldId]: newProgress }, completedWorlds: newCompleted });
    get().checkAchievements();
  },

  claimCQT: (worldId) => {
    const { worldProgress } = get();
    if (worldProgress[worldId]) {
      set({ worldProgress: { ...worldProgress, [worldId]: { ...worldProgress[worldId], cqtClaimed: true } } });
    }
  },

  addXP: (amount) => {
    set((state) => {
      let newXP = state.totalXP + amount;
      let newLevel = state.currentLevel;
      const xpToNext = Math.floor(100 * Math.pow(newLevel, 1.4));
      if (newXP >= xpToNext) { newXP -= xpToNext; newLevel++; }
      return { totalXP: newXP, currentLevel: newLevel };
    });
  },

  setXPBoost: (active) => set({ xpBoostActive: active }),

  unlockAchievement: (id) => {
    const { unlockedAchievements } = get();
    if (unlockedAchievements.includes(id)) return;
    // Verify the ID is a known achievement before storing it
    const known = ACHIEVEMENTS.find(a => a.id === id);
    if (!known) return;
    set({ unlockedAchievements: [...unlockedAchievements, id] });
    window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: id }));
  },

  checkAchievements: () => {
    const { completedWorlds, battle, unlockAchievement } = get();

    // Tier 1 — Exploration
    if (completedWorlds.length >= 1) unlockAchievement('first_blood');
    if (completedWorlds.includes(1)) unlockAchievement('blockchain_basics');
    if (completedWorlds.includes(3)) unlockAchievement('defi_pioneer');

    // World completion milestones
    if (completedWorlds.length >= 7) unlockAchievement('world_champion');
    if (completedWorlds.length >= 16) unlockAchievement('chain_sovereign');
    if (completedWorlds.includes(15)) unlockAchievement('first_to_mint');

    // Skill tier achievements
    if (completedWorlds.length >= 9) unlockAchievement('protocol_builder');
    if (completedWorlds.length >= 12) unlockAchievement('dapp_architect');

    // Streak
    if (battle.streak >= 5) unlockAchievement('hot_streak');

    // Perfect run (no wrong answers, no hints)
    if (battle.phase === 'victory' && battle.isPerfect && get().hintsRemaining === (((battle as any)._heroClass === 'archivist') ? 2 : 0)) {
      unlockAchievement('auditor');
    }
  },
}));
