import Phaser from 'phaser';
import { WORLDS } from '../../data/curriculum';
import type { Question } from '../../types';

function buildQuestionPool(worldId?: number): Question[] {
  if (worldId) {
    const world = WORLDS.find(w => w.id === worldId);
    if (world) return [...world.questions].sort(() => Math.random() - 0.5);
  }
  const pool: Question[] = [];
  for (const world of WORLDS) {
    for (const q of world.questions) pool.push(q);
  }
  return pool.sort(() => Math.random() - 0.5);
}

const PLATFORM_SPACING = 140;  // px between platform centres vertically
const PLATFORM_COUNT = 40;     // total platforms
const PLATFORM_W = 120;
const GRAVITY = 900;
const JUMP_VELOCITY = -580;
const BOOST_VELOCITY = -780;
const WORLD_H = PLATFORM_COUNT * PLATFORM_SPACING + 400;
const GAME_W = 400;
const QUESTION_EVERY = 3;       // every 3rd platform triggers a question
const ANSWER_TIME = 20;

type JumperPhase = 'playing' | 'question' | 'answer_reveal' | 'ended';

export default class JumperScene extends Phaser.Scene {
  private playerData: any = {};
  private worldId = 0;

  // ─── State ───────────────────────────────────────────────────────────────
  private lives = 3;
  private platformsLanded = 0;
  private phase: JumperPhase = 'playing';
  private questions: Question[] = [];
  private currentQ: Question | null = null;
  private questionPool: Question[] = [];
  private questionPoolIdx = 0;
  private answerTimerSec = ANSWER_TIME;
  private answerTimerEvent: Phaser.Time.TimerEvent | null = null;
  private usedBoost = false;

  // ─── Phaser Objects ──────────────────────────────────────────────────────
  private playerBody!: Phaser.Physics.Arcade.Body;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private platformObjects: Phaser.GameObjects.Rectangle[] = [];
  private platformQuestionMarkers: Map<Phaser.GameObjects.Rectangle, boolean> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // HUD
  private livesText!: Phaser.GameObjects.Text;
  private heightText!: Phaser.GameObjects.Text;
  private qOverlay!: Phaser.GameObjects.Container;
  private qText!: Phaser.GameObjects.Text;
  private qTimerText!: Phaser.GameObjects.Text;
  private qTimerBar!: Phaser.GameObjects.Rectangle;
  private optionBtns: Phaser.GameObjects.Container[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private playerGfx!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'JumperScene' });
  }

  init(data: any) {
    this.playerData = data || {};
    this.worldId = data?.worldId ?? 0;
  }

  create() {
    const W = GAME_W;

    // World bounds
    this.physics.world.setBounds(0, 0, W, WORLD_H);
    this.cameras.main.setBounds(0, 0, W, WORLD_H);

    // Background
    this.add.rectangle(W / 2, WORLD_H / 2, W, WORLD_H, 0x04060f).setDepth(-1);

    // Platforms
    this.platforms = this.physics.add.staticGroup();
    this.buildPlatforms(W);

    // Player
    this.playerGfx = this.add.container(W / 2, WORLD_H - 100);
    const pbody = this.add.rectangle(0, 0, 28, 36, 0x00d4ff, 0.85).setStrokeStyle(2, 0x00aaff);
    const emoji = this.add.text(0, 0, this.playerData.heroEmoji || '⚔', { fontSize: '16px' }).setOrigin(0.5);
    this.playerGfx.add([pbody, emoji]);
    this.physics.add.existing(this.playerGfx);
    this.playerBody = (this.playerGfx.body as Phaser.Physics.Arcade.Body);
    this.playerBody.setGravityY(GRAVITY);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setSize(28, 36);

    // Collider
    this.physics.add.collider(this.playerGfx, this.platforms, (_player, platform) => {
      const p = platform as Phaser.GameObjects.Rectangle;
      if (this.platformObjects.includes(p)) {
        this.onPlatformLand(p);
      }
    });

    // Camera follows player upward
    this.cameras.main.startFollow(this.playerGfx, true, 0, 0.08);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => this.tryJump());

    // HUD (fixed to camera)
    this.livesText = this.add.text(10, 10, '❤ 3', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff6b6b',
    }).setScrollFactor(0).setDepth(20);

    this.heightText = this.add.text(10, 28, 'Height: 0%', {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa',
    }).setScrollFactor(0).setDepth(20);

    this.statusText = this.add.text(W / 2, 50, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#f59e0b',
      stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);

    // Question overlay (initially invisible)
    this.qOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(25).setVisible(false);
    const overlayBg = this.add.rectangle(W / 2, 200, W - 20, 340, 0x04060f, 0.95)
      .setStrokeStyle(1, 0xf59e0b);
    this.qText = this.add.text(W / 2, 60, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      wordWrap: { width: W - 40 }, align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0);
    this.qTimerText = this.add.text(W / 2, 40, '20', {
      fontFamily: 'monospace', fontSize: '22px', color: '#f59e0b',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0);
    this.qTimerBar = this.add.rectangle(W / 2, 52, W - 40, 6, 0xf59e0b).setScrollFactor(0);
    this.qOverlay.add([overlayBg, this.qText, this.qTimerText, this.qTimerBar]);

    // Question pool (filtered to current world)
    this.questionPool = buildQuestionPool(this.worldId);

    // Auto-scroll camera slightly upward
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: this.autoScrollUpdate,
      callbackScope: this,
    });
  }

  private buildPlatforms(W: number) {
    // Ground platform
    const ground = this.add.rectangle(W / 2, WORLD_H - 40, W, 20, 0x223344);
    this.physics.add.existing(ground, true);
    this.platformObjects.push(ground);
    this.platforms.add(ground);

    // Procedural platforms
    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const y = WORLD_H - 120 - i * PLATFORM_SPACING;
      const x = Phaser.Math.Between(PLATFORM_W / 2 + 10, W - PLATFORM_W / 2 - 10);
      const isQuestion = (i + 1) % QUESTION_EVERY === 0;
      const color = isQuestion ? 0x6633ff : 0x224455;
      const p = this.add.rectangle(x, y, PLATFORM_W, 14, color).setStrokeStyle(1, isQuestion ? 0xaa88ff : 0x336677);
      this.physics.add.existing(p, true);
      this.platformObjects.push(p);
      this.platforms.add(p);
      if (isQuestion) {
        this.platformQuestionMarkers.set(p, false);
        // Question marker label
        this.add.text(x, y - 12, '?', {
          fontFamily: 'monospace', fontSize: '12px', color: '#aa88ff',
        }).setOrigin(0.5);
      }
    }

    // Top "goal" platform (golden)
    const topY = WORLD_H - 120 - (PLATFORM_COUNT + 1) * PLATFORM_SPACING;
    const goal = this.add.rectangle(W / 2, topY, W, 20, 0xf59e0b).setStrokeStyle(2, 0xfde68a);
    this.physics.add.existing(goal, true);
    this.platformObjects.push(goal);
    this.platforms.add(goal);
    this.add.text(W / 2, topY - 20, '🏆 SUMMIT', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f59e0b',
    }).setOrigin(0.5);
  }

  private onPlatformLand(platform: Phaser.GameObjects.Rectangle) {
    if (this.phase !== 'playing') return;
    // Check if this is the goal platform
    const goalY = WORLD_H - 120 - (PLATFORM_COUNT + 1) * PLATFORM_SPACING;
    if (Math.abs(platform.y - goalY) < 5) {
      this.endGame(true);
      return;
    }
    // Check if question platform not yet triggered
    if (this.platformQuestionMarkers.has(platform) && !this.platformQuestionMarkers.get(platform)) {
      this.platformQuestionMarkers.set(platform, true);
      this.platformsLanded++;
      this.triggerQuestion();
    }
  }

  private triggerQuestion() {
    if (this.questionPoolIdx >= this.questionPool.length) {
      this.questionPoolIdx = 0;
      this.questionPool = buildQuestionPool(this.worldId);
    }
    this.currentQ = this.questionPool[this.questionPoolIdx++];
    this.phase = 'question';
    this.playerBody.setVelocityY(0);
    this.playerBody.setGravityY(0);

    // Show overlay
    this.qText.setText(this.currentQ.text);
    this.qTimerText.setText('20').setColor('#f59e0b');
    this.qTimerBar.setScale(1, 1);
    this.qOverlay.setVisible(true);

    // Build option buttons
    this.optionBtns.forEach(b => b.destroy());
    this.optionBtns = [];
    const W = GAME_W;
    const startY = 120;
    this.currentQ.options.forEach((opt, i) => {
      const by = startY + i * 46;
      const bg = this.add.rectangle(W / 2, by, W - 30, 38, 0x0d1117)
        .setStrokeStyle(1, 0x333355).setScrollFactor(0).setDepth(26).setInteractive({ cursor: 'pointer' });
      const txt = this.add.text(W / 2, by, `${i + 1}. ${opt}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#cccccc',
        wordWrap: { width: W - 50 }, align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(27);
      bg.on('pointerover', () => bg.setFillStyle(0x1a2a3a));
      bg.on('pointerout', () => bg.setFillStyle(0x0d1117));
      bg.on('pointerdown', () => this.submitAnswer(i));
      const btn = this.add.container(0, 0, [bg, txt]).setScrollFactor(0).setDepth(26);
      this.optionBtns.push(btn);
    });

    this.answerTimerSec = ANSWER_TIME;
    if (this.answerTimerEvent) this.answerTimerEvent.destroy();
    this.answerTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: ANSWER_TIME - 1,
      callback: () => {
        this.answerTimerSec--;
        this.qTimerText.setText(`${this.answerTimerSec}`);
        const pct = this.answerTimerSec / ANSWER_TIME;
        this.qTimerBar.setScale(pct, 1);
        if (this.answerTimerSec <= 5) this.qTimerText.setColor('#ff4444');
        if (this.answerTimerSec <= 0) {
          this.submitAnswer(-1);
        }
      },
    });
  }

  private submitAnswer(idx: number) {
    if (this.phase !== 'question' || !this.currentQ) return;
    if (this.answerTimerEvent) this.answerTimerEvent.destroy();
    this.phase = 'answer_reveal';

    const correct = idx === this.currentQ.correctIndex;
    this.optionBtns.forEach((btn, i) => {
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      if (i === this.currentQ!.correctIndex) bg.setFillStyle(0x003320);
      else if (i === idx) bg.setFillStyle(0x330010);
    });

    const msgText = correct ? '✓ CORRECT! BOUNCE PAD!' : '✗ WRONG! -1 LIFE';
    this.statusText.setText(msgText).setVisible(true);

    this.time.delayedCall(1200, () => {
      this.optionBtns.forEach(b => b.destroy());
      this.optionBtns = [];
      this.qOverlay.setVisible(false);
      this.statusText.setVisible(false);
      this.phase = 'playing';
      this.playerBody.setGravityY(GRAVITY);

      if (correct) {
        this.usedBoost = false;
        this.playerBody.setVelocityY(BOOST_VELOCITY);
      } else {
        this.lives--;
        this.livesText.setText(`❤ ${this.lives}`);
        if (this.lives <= 0) {
          this.endGame(false);
        }
      }
    });
  }

  private tryJump() {
    if (this.phase !== 'playing') return;
    if (this.playerBody.blocked.down) {
      this.playerBody.setVelocityY(JUMP_VELOCITY);
    }
  }

  private autoScrollUpdate() {
    if (this.phase === 'question' || this.phase === 'answer_reveal' || this.phase === 'ended') return;
    // Update height display
    const totalH = PLATFORM_COUNT * PLATFORM_SPACING;
    const playerRelY = WORLD_H - this.playerGfx.y;
    const pct = Math.min(100, Math.round((playerRelY / totalH) * 100));
    this.heightText.setText(`Height: ${pct}%`);
  }

  update() {
    if (this.phase !== 'playing') return;
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.tryJump();
    }
    // Auto-bounce on platform landing (basic)
    if (this.playerBody.blocked.down && !Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      // Auto-jump for casual feel — only if not already moving up
      if (this.playerBody.velocity.y >= 0) {
        this.playerBody.setVelocityY(JUMP_VELOCITY);
      }
    }
  }

  private endGame(won: boolean) {
    this.phase = 'ended';
    if (this.answerTimerEvent) this.answerTimerEvent.destroy();
    this.optionBtns.forEach(b => b.destroy());
    this.qOverlay.setVisible(false);
    this.playerBody.setGravityY(0);
    this.playerBody.setVelocityY(0);

    const W = GAME_W;
    const camY = this.cameras.main.scrollY + 100;

    const resultText = won ? '🏆 SUMMIT REACHED!' : '💀 LIVES LOST';
    const resultColor = won ? '#f59e0b' : '#ff4444';

    this.add.text(W / 2, camY + 20, resultText, {
      fontFamily: 'monospace', fontSize: '24px', color: resultColor,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);

    if (won && this.lives === 3) {
      window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: 'jumper_ace' }));
    }

    const exitBg = this.add.rectangle(W / 2, camY + 70, 160, 40, 0x1a2a3a)
      .setStrokeStyle(2, 0x00d4ff).setScrollFactor(0).setDepth(30).setInteractive({ cursor: 'pointer' });
    this.add.text(W / 2, camY + 70, '← RETURN', {
      fontFamily: 'monospace', fontSize: '13px', color: '#00d4ff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31);
    exitBg.on('pointerdown', () => {
      const score = this.platformsLanded * 300 + this.lives * 500;
      this.game.events.emit('jumper:exit', { won, lives: this.lives, worldId: this.worldId, score, xpGained: Math.round(score / 10) });
    });
  }
}
