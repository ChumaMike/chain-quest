import { create } from 'zustand';
import type { BattleState, BattlePhase, Question, AnswerResult, StreakMultiplier } from '../types';
import { HEROES } from '../data/heroes';
import { WORLDS } from '../data/curriculum';

interface GameStore {
  battle: BattleState;
  worldProgress: Record<number, { bestScore: number; stars: number; bossDefeated: boolean; cqtClaimed: boolean }>;
  completedWorlds: number[];
  currentLevel: number;
  totalXP: number;
  hintsRemaining: number;
  xpBoostActive: boolean;

  startBattle: (worldId: number, heroClassId: string, mode?: 'solo' | 'multiplayer') => void;
  submitAnswer: (answerIndex: number) => AnswerResult | null;
  advanceQuestion: () => void;
  useItem: (itemId: string) => void;
  useHint: () => number | null;
  endBattle: (outcome: 'victory' | 'defeat') => void;
  resetBattle: () => void;
  setPhase: (phase: BattlePhase) => void;
  tickTimer: () => void;
  completeWorld: (worldId: number, score: number) => void;
  claimCQT: (worldId: number) => void;
  addXP: (amount: number) => void;
  setXPBoost: (active: boolean) => void;
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

  startBattle: (worldId, heroClassId, mode = 'solo') => {
    const world = WORLDS.find(w => w.id === worldId);
    if (!world) return;
    const hero = HEROES.find(h => h.id === heroClassId);
    if (!hero) return;

    const questions = [...world.questions].sort(() => Math.random() - 0.5);
    const hintsForClass = heroClassId === 'archivist' ? 2 : 0;

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
        timeRemaining: questions[0]?.timeLimitSec || 30,
        selectedAnswerIndex: null,
        answerResult: null,
        xpGained: 0,
        cqtReward: world.cqtReward,
        isPerfect: true,
        // Store shuffled questions for advancing
        ...({ _questions: questions } as any),
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
      damageDealt = Math.round(q.damage * attackMult * mult * hardBonus);
      newBossHP = Math.max(0, battle.bossHP - damageDealt);
      newStreak = battle.streak + 1;
      const speedBonus = Math.floor((battle.timeRemaining / (q.timeLimitSec)) * 50);
      newScore = battle.score + damageDealt * 10 + speedBonus;
      const xpMult = xpBoostActive ? 2 : 1;
      const diffFactor = q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 1.5 : 2;
      xpGained = Math.round(q.damage * mult * diffFactor * xpMult);
    } else {
      const defenseMult = HEROES.find(h => h.id === heroClass)?.defenseReduction || 0.2;
      damageTaken = Math.round(q.damage * 0.5 * (1 - defenseMult));

      // Validator passive: if shield active, negate damage once
      const shieldActive = (battle as any)._shieldActive;
      if (heroClass === 'validator' && shieldActive && battle.streak >= 3) {
        damageTaken = 0;
        (battle as any)._shieldActive = false;
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

  useHint: () => {
    const { battle, hintsRemaining } = get();
    if (hintsRemaining <= 0 || !battle.currentQuestion) return null;
    const q = battle.currentQuestion;
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== q.correctIndex && i !== battle.selectedAnswerIndex);
    const toEliminate = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
    set({ hintsRemaining: hintsRemaining - 1 });
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
}));
