import { create } from 'zustand';
import type { Room, PlayerRanking, Question } from '../types';

interface MultiplayerStore {
  room: Room | null;
  localSocketId: string | null;
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  bossHP: number;
  bossMaxHP: number;
  latestReveal: RevealData | null;
  rankings: PlayerRanking[] | null;
  bossDefeated: boolean;
  countdownValue: number | null;
  answeredThisRound: boolean;
  roomError: string | null;
  isReconnecting: boolean;
  reconnectAttempt: number;
  battleMessages: { id: number; displayName: string; heroClass: string; message: string }[];
  battleRewards: Record<string, { xp: number; cqt: number }> | null;

  setRoom: (room: Room) => void;
  setSocketId: (id: string) => void;
  updateRoom: (room: Room) => void;
  startBattle: (data: { worldId: number; players: Room['players']; bossMaxHP: number }) => void;
  setQuestion: (data: { question: Question; index: number; total: number; bossHP: number; bossMaxHP: number }) => void;
  setReveal: (data: RevealData) => void;
  updateBossHP: (hp: number) => void;
  setRankings: (rankings: PlayerRanking[], bossDefeated: boolean) => void;
  setCountdown: (value: number | null) => void;
  setAnswered: (answered: boolean) => void;
  setTimeRemaining: (time: number) => void;
  setRoomError: (error: string | null) => void;
  setReconnecting: (reconnecting: boolean, attempt: number) => void;
  addBattleMessage: (msg: { displayName: string; heroClass: string; message: string }) => void;
  setBattleRewards: (rewards: Record<string, { xp: number; cqt: number }>) => void;
  reset: () => void;
}

export interface RevealData {
  correctIndex: number;
  explanation: string;
  results: Record<string, {
    answerIndex: number;
    correct: boolean;
    wasFirst: boolean;
    firstBonus: number;
    damageDealt: number;
    damageTaken: number;
    newScore: number;
    newHP: number;
    newStreak: number;
    newMultiplier: number;
    xpGained: number;
  }>;
  bossHP: number;
  bossMaxHP: number;
}

export const useMultiplayerStore = create<MultiplayerStore>((set) => ({
  room: null,
  localSocketId: null,
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 10,
  timeRemaining: 30,
  bossHP: 200,
  bossMaxHP: 200,
  latestReveal: null,
  rankings: null,
  bossDefeated: false,
  countdownValue: null,
  answeredThisRound: false,
  roomError: null,
  isReconnecting: false,
  reconnectAttempt: 0,
  battleMessages: [],
  battleRewards: null,

  setRoom: (room) => set({ room }),
  setSocketId: (id) => set({ localSocketId: id }),
  updateRoom: (room) => set({ room }),

  startBattle: ({ players, bossMaxHP }) =>
    set((state) => ({
      bossHP: bossMaxHP,
      bossMaxHP,
      room: state.room ? { ...state.room, players, phase: 'battle' } : state.room,
      rankings: null,
      bossDefeated: false,
    })),

  setQuestion: ({ question, index, total, bossHP, bossMaxHP }) =>
    set({ currentQuestion: question, questionIndex: index, totalQuestions: total, bossHP, bossMaxHP, latestReveal: null, answeredThisRound: false, timeRemaining: question.timeLimitSec || 30 }),

  setReveal: (data) => set({ latestReveal: data, bossHP: data.bossHP }),

  updateBossHP: (hp) => set({ bossHP: hp }),

  setRankings: (rankings, bossDefeated) => set({ rankings, bossDefeated }),

  setCountdown: (value) => set({ countdownValue: value }),

  setAnswered: (answered) => set({ answeredThisRound: answered }),

  setTimeRemaining: (time) => set({ timeRemaining: time }),

  setRoomError: (error) => set({ roomError: error }),

  setReconnecting: (reconnecting, attempt) => set({ isReconnecting: reconnecting, reconnectAttempt: attempt }),

  addBattleMessage: (msg) => set((state) => ({
    battleMessages: [...state.battleMessages.slice(-49), { ...msg, id: Date.now() }],
  })),
  setBattleRewards: (rewards) => set({ battleRewards: rewards }),

  reset: () => set({
    room: null, currentQuestion: null, questionIndex: 0, totalQuestions: 10,
    timeRemaining: 30, bossHP: 200, bossMaxHP: 200, latestReveal: null,
    rankings: null, bossDefeated: false, countdownValue: null, answeredThisRound: false, roomError: null,
    battleMessages: [], battleRewards: null,
  }),
}));
