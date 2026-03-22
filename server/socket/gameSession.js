// Server-authoritative battle state machine for multiplayer rooms

const WORLDS_DATA = require('../../src/data/curriculumServer');

let _db = null;
function getDB() {
  if (!_db) {
    try { _db = require('../db').getDB(); } catch {}
  }
  return _db;
}

const HERO_STATS = {
  validator: { hp: 110, attack: 1.0, defense: 0.25 },
  miner: { hp: 80, attack: 1.5, defense: 0.10 },
  degen: { hp: 90, attack: 1.2, defense: 0.15 },
  archivist: { hp: 100, attack: 1.0, defense: 0.20 },
};

class GameSession {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.code = room.code;
    this.worldId = room.worldId;
    this.questions = this.loadQuestions();
    this.currentQuestionIndex = 0;
    this.phase = 'countdown'; // countdown | question | reveal | ended
    this.answerMap = new Map(); // socketId → { answerIndex, timestamp }
    this.timerHandle = null;      // auto-resolve timeout
    this.revealTimerHandle = null; // advance-to-next-question timeout
    this.timerInterval = null;    // per-second tick interval
    this.questionStartTime = 0;
    this.sharedBossHP = this.getBossHP();
    this.sharedBossMaxHP = this.sharedBossHP;
    this.destroyed = false;
    this.chatRateLimit = new Map(); // socketId → lastChatTime
  }

  loadQuestions() {
    const world = WORLDS_DATA.find(w => w.id === this.worldId);
    if (!world) return [];
    // Fisher-Yates shuffle
    const arr = world.questions.map(q => ({ ...q })); // shallow clone each question
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getBossHP() {
    const bossHPs = [0, 200, 250, 300, 350, 400, 450, 500];
    return bossHPs[this.worldId] || 300;
  }

  start() {
    if (this.destroyed) return;
    this.room.phase = 'countdown';
    // 3-2-1 countdown
    let count = 3;
    const countInterval = setInterval(() => {
      if (this.destroyed) { clearInterval(countInterval); return; }
      this.io.to(this.code).emit('battle:countdown', { count });
      count--;
      if (count < 0) {
        clearInterval(countInterval);
        this.sendNextQuestion();
      }
    }, 1000);
  }

  sendNextQuestion() {
    if (this.destroyed) return;
    if (this.currentQuestionIndex >= this.questions.length) {
      this.endGame();
      return;
    }

    this.room.phase = 'question';
    this.phase = 'question';
    this.answerMap.clear();

    // Reset hasAnswered for all non-eliminated players
    for (const player of this.room.players) {
      player.hasAnswered = false;
    }

    const q = this.questions[this.currentQuestionIndex];
    this.questionStartTime = Date.now();
    const timeLimit = (q.timeLimitSec || 30) * 1000;

    // Send question WITHOUT correct answer
    this.io.to(this.code).emit('battle:question', {
      question: {
        id: q.id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
        worldId: q.worldId,
        timeLimitSec: q.timeLimitSec || 30,
      },
      index: this.currentQuestionIndex,
      total: this.questions.length,
      bossHP: this.sharedBossHP,
      bossMaxHP: this.sharedBossMaxHP,
    });

    // Per-second timer tick so clients display smooth countdown
    let ticksLeft = Math.ceil(timeLimit / 1000);
    this.timerInterval = setInterval(() => {
      if (this.destroyed || this.phase !== 'question') {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        return;
      }
      ticksLeft--;
      this.io.to(this.code).emit('battle:timer', { remaining: Math.max(0, ticksLeft) });
      if (ticksLeft <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }, 1000);

    // Auto-resolve when timer expires
    this.timerHandle = setTimeout(() => {
      if (!this.destroyed) this.resolveQuestion();
    }, timeLimit);
  }

  receiveAnswer(socketId, questionId, answerIndex) {
    if (this.destroyed || this.phase !== 'question') return;

    const q = this.questions[this.currentQuestionIndex];
    if (!q || q.id !== questionId) return;
    if (this.answerMap.has(socketId)) return; // already answered

    // Validate answer index is in range
    if (typeof answerIndex !== 'number' || answerIndex < 0 || answerIndex >= q.options.length) return;

    // Validate player belongs to this session
    const player = this.room.players.find(p => p.id === socketId);
    if (!player || player.isEliminated) return;

    this.answerMap.set(socketId, {
      answerIndex,
      timestamp: Date.now(),
    });

    player.hasAnswered = true;

    // Notify others that someone answered (no content leaked)
    this.io.to(this.code).emit('battle:player-answered', { playerId: socketId });

    // Check if all active (non-eliminated) players have answered
    const activePlayers = this.room.players.filter(p => !p.isEliminated);
    const allAnswered = activePlayers.every(p => this.answerMap.has(p.id));
    if (allAnswered) {
      clearTimeout(this.timerHandle);
      clearInterval(this.timerInterval);
      this.timerHandle = null;
      this.timerInterval = null;
      this.resolveQuestion();
    }
  }

  // Called on disconnect to auto-forfeit a player's answer so the game doesn't hang
  forfeitAnswer(socketId) {
    if (this.destroyed || this.phase !== 'question') return;
    const player = this.room.players.find(p => p.id === socketId);
    if (!player || player.isEliminated || this.answerMap.has(socketId)) return;

    // Record as unanswered (answerIndex -1 = no answer = damage taken)
    this.answerMap.set(socketId, { answerIndex: -1, timestamp: Date.now() });
    player.hasAnswered = true;

    // Check if all active players have now answered (including the forfeited one)
    const activePlayers = this.room.players.filter(p => !p.isEliminated);
    const allAnswered = activePlayers.every(p => this.answerMap.has(p.id));
    if (allAnswered) {
      clearTimeout(this.timerHandle);
      clearInterval(this.timerInterval);
      this.timerHandle = null;
      this.timerInterval = null;
      this.resolveQuestion();
    }
  }

  resolveQuestion() {
    if (this.destroyed || this.phase !== 'question') return;
    this.phase = 'reveal';
    this.room.phase = 'reveal';

    // Clear any pending timer/interval
    clearTimeout(this.timerHandle);
    clearInterval(this.timerInterval);
    this.timerHandle = null;
    this.timerInterval = null;

    const q = this.questions[this.currentQuestionIndex];
    const results = {};
    let firstCorrectTime = Infinity;
    let firstCorrectId = null;

    // Find first correct answer (by timestamp)
    for (const [socketId, answer] of this.answerMap) {
      if (answer.answerIndex === q.correctIndex && answer.timestamp < firstCorrectTime) {
        firstCorrectTime = answer.timestamp;
        firstCorrectId = socketId;
      }
    }

    // Calculate results per player
    for (const player of this.room.players) {
      if (player.isEliminated) continue;
      const answer = this.answerMap.get(player.id);
      const heroStats = HERO_STATS[player.heroClass] || HERO_STATS.validator;
      const baseDamage = { easy: 20, medium: 30, hard: 40, boss: 50 }[q.difficulty] || 25;

      if (!answer || answer.answerIndex === -1) {
        // Didn't answer — take damage
        const dmgTaken = Math.round(baseDamage * 0.5 * (1 - heroStats.defense));
        player.currentHP = Math.max(0, player.currentHP - dmgTaken);
        results[player.id] = { answerIndex: -1, correct: false, wasFirst: false, firstBonus: 0, damageDealt: 0, damageTaken: dmgTaken, newScore: player.score, newHP: player.currentHP, newStreak: 0, newMultiplier: 1, xpGained: 0 };
        player.streak = 0;
        player.multiplier = 1;
      } else if (answer.answerIndex === q.correctIndex) {
        // Correct!
        const isFirst = player.id === firstCorrectId;
        const firstBonus = isFirst ? 50 : 0;
        const streakMult = player.multiplier;
        const dmgDealt = Math.round(baseDamage * heroStats.attack * streakMult);
        const scoreGain = dmgDealt * 10 + firstBonus;

        this.sharedBossHP = Math.max(0, this.sharedBossHP - dmgDealt);
        player.score += scoreGain;
        player.streak++;
        player.questionsCorrect = (player.questionsCorrect || 0) + 1;
        player.multiplier = player.streak >= 4 ? 3 : player.streak >= 3 ? 2 : player.streak >= 2 ? 1.5 : 1;

        const xp = Math.round(baseDamage * streakMult * ({ easy: 1, medium: 1.5, hard: 2, boss: 2 }[q.difficulty] || 1));

        results[player.id] = { answerIndex: answer.answerIndex, correct: true, wasFirst: isFirst, firstBonus, damageDealt: dmgDealt, damageTaken: 0, newScore: player.score, newHP: player.currentHP, newStreak: player.streak, newMultiplier: player.multiplier, xpGained: xp };
      } else {
        // Wrong
        const dmgTaken = Math.round(baseDamage * 0.5 * (1 - heroStats.defense));
        player.currentHP = Math.max(0, player.currentHP - dmgTaken);
        player.streak = 0;
        player.multiplier = 1;
        results[player.id] = { answerIndex: answer.answerIndex, correct: false, wasFirst: false, firstBonus: 0, damageDealt: 0, damageTaken: dmgTaken, newScore: player.score, newHP: player.currentHP, newStreak: 0, newMultiplier: 1, xpGained: 0 };
      }

      // Check elimination
      if (player.currentHP <= 0 && !player.isEliminated) {
        player.isEliminated = true;
        const eliminatedId = player.id;
        const finalScore = player.score;
        setTimeout(() => {
          if (!this.destroyed) {
            this.io.to(this.code).emit('battle:eliminated', { playerId: eliminatedId, finalScore });
          }
        }, 1500);
      }
    }

    this.io.to(this.code).emit('battle:reveal', {
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      results,
      bossHP: this.sharedBossHP,
      bossMaxHP: this.sharedBossMaxHP,
    });

    this.currentQuestionIndex++;

    // Advance after 4 seconds (time to read explanation)
    this.revealTimerHandle = setTimeout(() => {
      if (this.destroyed) return;
      const activePlayers = this.room.players.filter(p => !p.isEliminated);
      if (activePlayers.length === 0 || this.currentQuestionIndex >= this.questions.length) {
        this.endGame();
      } else {
        this.sendNextQuestion();
      }
    }, 4000);
  }

  endGame() {
    if (this.destroyed) return;
    this.phase = 'ended';
    this.room.phase = 'ended';

    const rankings = [...this.room.players]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        playerId: p.id,
        displayName: p.displayName,
        heroClass: p.heroClass,
        finalScore: p.score,
        questionsCorrect: p.questionsCorrect || 0,
        maxStreak: p.streak,
        eliminated: p.isEliminated,
      }));

    const bossDefeated = this.sharedBossHP <= 0;

    // Award XP and CQT rewards
    const CQT_REWARDS = [50, 30, 20, 10, 10, 10, 10, 10];
    const rewards = {};
    const db = getDB();
    rankings.forEach((r, i) => {
      const xpGained = Math.round(r.finalScore / 10);
      const cqtGained = CQT_REWARDS[i] || 10;
      rewards[r.playerId] = { xpGained, cqtGained, rank: r.rank };
      // Persist to DB if user is authenticated
      if (db) {
        try {
          const player = this.room.players.find(p => p.id === r.playerId);
          if (player && player.userId) {
            db.prepare('UPDATE users SET xp = xp + ?, cqt_balance = cqt_balance + ? WHERE id = ?')
              .run(xpGained, cqtGained, player.userId);
          }
        } catch (e) { /* non-critical */ }
      }
    });

    this.io.to(this.code).emit('battle:end', {
      rankings,
      bossDefeated,
      worldId: this.worldId,
      rewards,
    });
  }

  receiveChat(socketId, message) {
    if (this.destroyed) return;
    const player = this.room.players.find(p => p.id === socketId);
    if (!player) return;
    // Rate limit: 1 message per 2 seconds
    const now = Date.now();
    const last = this.chatRateLimit.get(socketId) || 0;
    if (now - last < 2000) return;
    this.chatRateLimit.set(socketId, now);
    const trimmed = String(message || '').trim().slice(0, 80).replace(/[<>]/g, '');
    if (!trimmed) return;
    this.io.to(this.code).emit('battle:chat', {
      playerId: socketId,
      displayName: player.displayName,
      heroClass: player.heroClass,
      message: trimmed,
      ts: Date.now(),
    });
  }

  destroy() {
    if (this.destroyed) return; // guard against double-destroy
    this.destroyed = true;
    clearTimeout(this.timerHandle);
    clearTimeout(this.revealTimerHandle);
    clearInterval(this.timerInterval);
    this.timerHandle = null;
    this.revealTimerHandle = null;
    this.timerInterval = null;
  }
}

module.exports = GameSession;
