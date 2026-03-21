// Server-authoritative battle state machine for multiplayer rooms

const WORLDS_DATA = require('../../src/data/curriculumServer');

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
    this.phase = 'countdown'; // countdown | question | reveal | boss_attack | ended
    this.answerMap = new Map(); // socketId → { answerIndex, timestamp }
    this.timerHandle = null;
    this.questionStartTime = 0;
    this.sharedBossHP = this.getBossHP();
    this.sharedBossMaxHP = this.sharedBossHP;
  }

  loadQuestions() {
    const world = WORLDS_DATA.find(w => w.id === this.worldId);
    if (!world) return [];
    // Shuffle questions
    return [...world.questions].sort(() => Math.random() - 0.5);
  }

  getBossHP() {
    const bossHPs = [0, 200, 250, 300, 350, 400, 450, 500];
    return bossHPs[this.worldId] || 300;
  }

  start() {
    this.room.phase = 'countdown';
    // 3-2-1 countdown
    let count = 3;
    const countInterval = setInterval(() => {
      this.io.to(this.code).emit('battle:countdown', { count });
      count--;
      if (count < 0) {
        clearInterval(countInterval);
        this.sendNextQuestion();
      }
    }, 1000);
  }

  sendNextQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.endGame();
      return;
    }

    this.room.phase = 'question';
    this.phase = 'question';
    this.answerMap.clear();

    // Reset hasAnswered for all players
    for (const player of this.room.players) {
      player.hasAnswered = false;
    }

    const q = this.questions[this.currentQuestionIndex];
    this.questionStartTime = Date.now();

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

    // Auto-resolve when timer expires
    const timeLimit = (q.timeLimitSec || 30) * 1000;
    this.timerHandle = setTimeout(() => this.resolveQuestion(), timeLimit);
  }

  receiveAnswer(socketId, questionId, answerIndex) {
    const q = this.questions[this.currentQuestionIndex];
    if (!q || q.id !== questionId) return;
    if (this.answerMap.has(socketId)) return; // already answered
    if (this.phase !== 'question') return;

    const player = this.room.players.find(p => p.id === socketId);
    if (!player || player.isEliminated) return;

    this.answerMap.set(socketId, {
      answerIndex,
      timestamp: Date.now(),
    });

    player.hasAnswered = true;

    // Notify others that someone answered (no content leaked)
    this.io.to(this.code).emit('battle:player-answered', { playerId: socketId });

    // Check if all active players answered
    const activePlayers = this.room.players.filter(p => !p.isEliminated);
    const allAnswered = activePlayers.every(p => this.answerMap.has(p.id));
    if (allAnswered) {
      clearTimeout(this.timerHandle);
      this.resolveQuestion();
    }
  }

  resolveQuestion() {
    if (this.phase !== 'question') return;
    this.phase = 'reveal';
    this.room.phase = 'reveal';

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

      if (!answer) {
        // Didn't answer — take damage
        const dmgTaken = Math.round(baseDamage * 0.5 * (1 - heroStats.defense));
        player.currentHP = Math.max(0, player.currentHP - dmgTaken);
        results[player.id] = { answerIndex: -1, correct: false, wasFirst: false, firstBonus: 0, damageDealt: 0, damageTaken: dmgTaken, newScore: player.score, newHP: player.currentHP, newStreak: 0, xpGained: 0 };
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
        setTimeout(() => {
          this.io.to(this.code).emit('battle:eliminated', { playerId: player.id, finalScore: player.score });
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
    setTimeout(() => {
      const activePlayers = this.room.players.filter(p => !p.isEliminated);
      if (activePlayers.length === 0 || this.currentQuestionIndex >= this.questions.length) {
        this.endGame();
      } else {
        this.sendNextQuestion();
      }
    }, 4000);
  }

  endGame() {
    this.phase = 'ended';
    this.room.phase = 'ended';

    const rankings = this.room.players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        playerId: p.id,
        displayName: p.displayName,
        heroClass: p.heroClass,
        finalScore: p.score,
        questionsCorrect: 0,
        maxStreak: p.streak,
        eliminated: p.isEliminated,
      }));

    const bossDefeated = this.sharedBossHP <= 0;

    this.io.to(this.code).emit('battle:end', {
      rankings,
      bossDefeated,
      worldId: this.worldId,
    });
  }

  destroy() {
    clearTimeout(this.timerHandle);
  }
}

module.exports = GameSession;
