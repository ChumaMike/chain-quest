import Phaser from 'phaser';
import { WORLDS } from '../../data/curriculum';
import type { Question } from '../../types';

// Flatten all questions from all worlds for the duel pool
function buildQuestionPool(): Question[] {
  const pool: Question[] = [];
  for (const world of WORLDS) {
    for (const q of world.questions) {
      if (q.difficulty === 'easy' || q.difficulty === 'medium') {
        pool.push(q);
      }
    }
  }
  return pool.sort(() => Math.random() - 0.5);
}

const AI_REACTION_MS = 900; // ms before AI answers
const AI_CORRECT_RATE = 0.65; // 65% chance AI answers correctly
const MAX_HP = 150;
const DAMAGE_PER_CORRECT = 30;
const DAMAGE_WRONG = 20;
const TOTAL_QUESTIONS = 8;

type DuelPhase = 'countdown' | 'question' | 'reveal' | 'ended';

export default class DuelScene extends Phaser.Scene {
  private playerData: any = {};

  // ─── State ───────────────────────────────────────────────────────────────
  private playerHP = MAX_HP;
  private opponentHP = MAX_HP;
  private questionIndex = 0;
  private questions: Question[] = [];
  private currentQ: Question | null = null;
  private phase: DuelPhase = 'countdown';
  private playerBuzzed = false;
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  private timeRemaining = 25;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private achievements: string[] = [];

  // ─── Game Objects ────────────────────────────────────────────────────────
  private playerHPBar!: Phaser.GameObjects.Rectangle;
  private opponentHPBar!: Phaser.GameObjects.Rectangle;
  private playerHPTrack!: Phaser.GameObjects.Rectangle;
  private opponentHPTrack!: Phaser.GameObjects.Rectangle;
  private playerLabel!: Phaser.GameObjects.Text;
  private opponentLabel!: Phaser.GameObjects.Text;
  private questionText!: Phaser.GameObjects.Text;
  private optionButtons: Phaser.GameObjects.Container[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private qCounterText!: Phaser.GameObjects.Text;
  private playerSprite!: Phaser.GameObjects.Container;
  private opponentSprite!: Phaser.GameObjects.Container;
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'DuelScene' });
  }

  init(data: any) {
    this.playerData = data || {};
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x04060f);
    // Arena divider
    this.add.rectangle(W / 2, H / 2, 2, H * 0.6, 0x333355, 0.6);
    // Title
    this.add.text(W / 2, 28, 'THE DUEL', {
      fontFamily: 'monospace', fontSize: '18px', color: '#f59e0b',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    // ─── Player side (left) ────────────────────────────────────────────────
    const heroEmoji = this.playerData.heroEmoji || '⚔';
    this.playerSprite = this.createCharSprite(W * 0.22, H * 0.38, 0x00d4ff, heroEmoji);
    this.playerLabel = this.add.text(W * 0.22, H * 0.55, this.playerData.displayName || 'YOU', {
      fontFamily: 'monospace', fontSize: '11px', color: '#00d4ff',
    }).setOrigin(0.5);

    // Player HP bar
    this.playerHPTrack = this.add.rectangle(W * 0.22, H * 0.59, 120, 12, 0x1a1a2e).setOrigin(0.5);
    this.add.rectangle(W * 0.22, H * 0.59, 120, 12, 0x333344).setOrigin(0.5);
    this.playerHPBar = this.add.rectangle(W * 0.22 - 60, H * 0.59, 120, 10, 0x00ff88).setOrigin(0);

    // ─── Opponent side (right) ─────────────────────────────────────────────
    this.opponentSprite = this.createCharSprite(W * 0.78, H * 0.38, 0xff6b6b, '🤖');
    this.opponentLabel = this.add.text(W * 0.78, H * 0.55, 'AI OPPONENT', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ff6b6b',
    }).setOrigin(0.5);

    this.add.rectangle(W * 0.78, H * 0.59, 120, 12, 0x333344).setOrigin(0.5);
    this.opponentHPBar = this.add.rectangle(W * 0.78 - 60, H * 0.59, 120, 10, 0xff6b6b).setOrigin(0);

    // ─── Question area ─────────────────────────────────────────────────────
    this.questionText = this.add.text(W / 2, H * 0.67, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff',
      wordWrap: { width: W - 60 }, align: 'center',
    }).setOrigin(0.5, 0);

    // Timer
    this.timerText = this.add.text(W / 2, H * 0.63, '25', {
      fontFamily: 'monospace', fontSize: '24px', color: '#f59e0b',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.qCounterText = this.add.text(W / 2, 52, '1 / 8', {
      fontFamily: 'monospace', fontSize: '12px', color: '#666688',
    }).setOrigin(0.5);

    this.statusText = this.add.text(W / 2, H * 0.63, 'GET READY...', {
      fontFamily: 'monospace', fontSize: '20px', color: '#f59e0b',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Flash overlay for damage
    this.flashOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0xff0000, 0)
      .setDepth(10);

    // Keyboard input
    this.input.keyboard?.on('keydown', this.handleBuzzIn, this);

    // Touch/click buzz-in area
    this.input.on('pointerdown', this.handleBuzzIn, this);

    // Build question pool
    this.questions = buildQuestionPool().slice(0, TOTAL_QUESTIONS);

    // Start countdown
    this.startCountdown();
  }

  private createCharSprite(x: number, y: number, color: number, emoji: string): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const body = this.add.rectangle(0, 0, 48, 64, color, 0.15).setStrokeStyle(2, color);
    const emojiText = this.add.text(0, 0, emoji, { fontSize: '28px' }).setOrigin(0.5);
    c.add([body, emojiText]);
    return c;
  }

  private startCountdown() {
    this.phase = 'countdown';
    let count = 3;
    this.statusText.setText(`${count}`).setVisible(true);
    this.questionText.setVisible(false);
    this.timerText.setVisible(false);

    const tick = this.time.addEvent({
      delay: 800,
      repeat: 3,
      callback: () => {
        count--;
        if (count <= 0) {
          tick.destroy();
          this.statusText.setVisible(false);
          this.nextQuestion();
        } else {
          this.statusText.setText(`${count}`);
        }
      },
    });
  }

  private nextQuestion() {
    if (this.questionIndex >= this.questions.length) {
      this.endDuel();
      return;
    }
    this.currentQ = this.questions[this.questionIndex];
    this.phase = 'question';
    this.playerBuzzed = false;
    this.timeRemaining = 25;

    this.statusText.setVisible(false);
    this.questionText.setText(this.currentQ.text).setVisible(true);
    this.timerText.setText('25').setVisible(true);
    this.qCounterText.setText(`${this.questionIndex + 1} / ${TOTAL_QUESTIONS}`);

    // Clear old buttons
    this.optionButtons.forEach(b => b.destroy());
    this.optionButtons = [];

    // Render answer buttons
    const W = this.scale.width;
    const startY = this.scale.height * 0.76;
    this.currentQ.options.forEach((opt, i) => {
      const bx = W / 2;
      const by = startY + i * 42;
      const bg = this.add.rectangle(0, 0, W - 40, 34, 0x0d1117).setStrokeStyle(1, 0x333355);
      const txt = this.add.text(0, 0, `${i + 1}. ${opt}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
        wordWrap: { width: W - 60 }, align: 'center',
      }).setOrigin(0.5);
      const btn = this.add.container(bx, by, [bg, txt]);
      btn.setSize(W - 40, 34).setInteractive({ cursor: 'pointer' });
      btn.on('pointerover', () => bg.setFillStyle(0x1a2a3a));
      btn.on('pointerout', () => bg.setFillStyle(0x0d1117));
      btn.on('pointerdown', () => this.answerQuestion(i));
      this.optionButtons.push(btn);
    });

    // Timer countdown
    if (this.timerEvent) this.timerEvent.destroy();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 24,
      callback: () => {
        this.timeRemaining--;
        this.timerText.setText(`${this.timeRemaining}`);
        if (this.timeRemaining <= 5) this.timerText.setColor('#ff4444');
        if (this.timeRemaining <= 0) {
          // Time out — nobody answers
          this.revealAnswer(-1, false);
        }
      },
    });

    // AI reaction timer
    const aiDelay = AI_REACTION_MS + Math.random() * 600;
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.aiTimer = setTimeout(() => {
      if (this.phase !== 'question') return;
      const aiCorrect = Math.random() < AI_CORRECT_RATE;
      const aiAnswer = aiCorrect ? this.currentQ!.correctIndex : (this.currentQ!.correctIndex + 1) % 4;
      this.resolveAI(aiAnswer, aiCorrect);
    }, aiDelay);
  }

  private handleBuzzIn = () => {
    // Buzz-in not used here (click on option button directly)
  };

  private answerQuestion(idx: number) {
    if (this.phase !== 'question' || !this.currentQ) return;
    if (this.aiTimer) clearTimeout(this.aiTimer);
    if (this.timerEvent) this.timerEvent.destroy();

    const correct = idx === this.currentQ.correctIndex;
    this.revealAnswer(idx, correct, 'player');
  }

  private resolveAI(idx: number, correct: boolean) {
    if (this.phase !== 'question') return;
    if (this.timerEvent) this.timerEvent.destroy();
    this.revealAnswer(idx, correct, 'ai');
  }

  private revealAnswer(idx: number, correct: boolean, who: 'player' | 'ai' | null = null) {
    if (!this.currentQ) return;
    this.phase = 'reveal';

    const W = this.scale.width;

    // Highlight correct/wrong options
    this.optionButtons.forEach((btn, i) => {
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      if (i === this.currentQ!.correctIndex) bg.setFillStyle(0x003320);
      else if (i === idx) bg.setFillStyle(0x330010);
    });

    // Apply damage
    if (who === 'player') {
      if (correct) {
        this.opponentHP = Math.max(0, this.opponentHP - DAMAGE_PER_CORRECT);
        this.flashCharacter(this.opponentSprite, 0xff0000);
        this.showFloatingText(W * 0.78, this.scale.height * 0.3, `-${DAMAGE_PER_CORRECT} HP`, '#ff6b6b');
      } else {
        this.playerHP = Math.max(0, this.playerHP - DAMAGE_WRONG);
        this.flashOverlay.setFillStyle(0xff0000, 0.3);
        this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: 400 });
        this.showFloatingText(W * 0.22, this.scale.height * 0.3, `-${DAMAGE_WRONG} HP`, '#ff2244');
      }
    } else if (who === 'ai') {
      if (correct) {
        this.playerHP = Math.max(0, this.playerHP - DAMAGE_PER_CORRECT);
        this.flashOverlay.setFillStyle(0xff0000, 0.3);
        this.tweens.add({ targets: this.flashOverlay, alpha: 0, duration: 400 });
        this.showFloatingText(W * 0.22, this.scale.height * 0.3, `-${DAMAGE_PER_CORRECT} HP`, '#ff2244');
      } else {
        // AI wrong — nobody takes damage but show result
        this.showFloatingText(W * 0.78, this.scale.height * 0.3, 'WRONG', '#888888');
      }
    }

    // Update HP bars
    this.updateHPBars();

    // Status message
    let msg = '';
    if (who === 'player') msg = correct ? '✓ CORRECT! YOU HIT!' : '✗ WRONG! YOU TAKE DAMAGE';
    else if (who === 'ai') msg = correct ? 'AI ANSWERED CORRECTLY' : 'AI WRONG — NO DAMAGE';
    else msg = "TIME'S UP";

    this.statusText.setText(msg).setVisible(true);

    this.questionIndex++;

    this.time.delayedCall(2200, () => {
      this.statusText.setVisible(false);
      if (this.playerHP <= 0 || this.opponentHP <= 0) {
        this.endDuel();
      } else {
        this.nextQuestion();
      }
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '20px', color,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0, duration: 1000,
      onComplete: () => t.destroy(),
    });
  }

  private flashCharacter(container: Phaser.GameObjects.Container, color: number) {
    const bg = container.list[0] as Phaser.GameObjects.Rectangle;
    bg.setFillStyle(color, 0.6);
    this.time.delayedCall(300, () => bg.setFillStyle(0, 0.15));
  }

  private updateHPBars() {
    const pPct = Math.max(0, this.playerHP / MAX_HP);
    const oPct = Math.max(0, this.opponentHP / MAX_HP);
    this.playerHPBar.setScale(pPct, 1);
    this.opponentHPBar.setScale(oPct, 1);
    this.playerLabel.setText(`${this.playerData.displayName || 'YOU'} — ${this.playerHP}/${MAX_HP}`);
    this.opponentLabel.setText(`AI — ${this.opponentHP}/${MAX_HP}`);
  }

  private endDuel() {
    this.phase = 'ended';
    if (this.timerEvent) this.timerEvent.destroy();
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.optionButtons.forEach(b => b.destroy());
    this.optionButtons = [];
    this.questionText.setVisible(false);
    this.timerText.setVisible(false);

    const playerWon = this.opponentHP <= 0 || (this.playerHP > this.opponentHP && this.questionIndex >= TOTAL_QUESTIONS);
    const W = this.scale.width;
    const H = this.scale.height;

    const resultText = playerWon ? '⚔ VICTORY!' : '💀 DEFEATED';
    const resultColor = playerWon ? '#00ff88' : '#ff4444';

    this.add.text(W / 2, H * 0.38, resultText, {
      fontFamily: 'monospace', fontSize: '32px', color: resultColor,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.5, `Final Score: ${MAX_HP - this.opponentHP} damage dealt`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5);

    if (playerWon) {
      // Unlock first_duel achievement
      window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: 'first_duel' }));
    }

    // Exit button
    const exitBg = this.add.rectangle(W / 2, H * 0.62, 160, 44, 0x1a2a3a).setStrokeStyle(2, 0x00d4ff).setInteractive({ cursor: 'pointer' });
    const exitTxt = this.add.text(W / 2, H * 0.62, '← RETURN', {
      fontFamily: 'monospace', fontSize: '14px', color: '#00d4ff',
    }).setOrigin(0.5);
    exitBg.on('pointerover', () => exitBg.setFillStyle(0x003344));
    exitBg.on('pointerdown', () => {
      this.game.events.emit('duel:exit', { playerWon, playerHP: this.playerHP, opponentHP: this.opponentHP });
    });
  }

  shutdown() {
    if (this.aiTimer) clearTimeout(this.aiTimer);
  }
}
