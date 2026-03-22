import Phaser from 'phaser';
import OpenWorldScene from './OpenWorldScene';

interface Obstacle {
  gfx: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  x: number;
  speed: number;
  lane: number;
  type: 'INVALID TX' | 'FORK EVENT' | 'DOUBLE SPEND';
}

interface Collectible {
  gfx: Phaser.GameObjects.Arc | Phaser.GameObjects.Triangle;
  label: Phaser.GameObjects.Text;
  x: number;
  speed: number;
  lane: number;
  type: 'VALID BLOCK' | 'GAS FEE';
  value: number;
}

export default class BlockRacerScene extends Phaser.Scene {
  private playerData: any = {};

  // Game state
  private score = 0;
  private lives = 3;
  private blocksCollected = 0;
  private timeRemaining = 90;
  private speed = 200;
  private gameOver = false;
  private cqtEarned = false;

  // Lane positions (y-coordinates)
  private readonly LANES = [220, 320, 420];
  private currentLane = 1;

  // Game objects
  private ship!: Phaser.GameObjects.Container;
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];

  // HUD elements
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private blocksText!: Phaser.GameObjects.Text;

  // Timers
  private spawnTimer = 0;
  private speedTimer = 0;
  private gameTimer = 0;

  // Input
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private wKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private upPressed = false;
  private downPressed = false;
  private laneTransitioning = false;

  constructor() {
    super({ key: 'BlockRacerScene' });
  }

  init(data: any) {
    this.playerData = data?.playerData || {};
    this.score = 0;
    this.lives = 3;
    this.blocksCollected = 0;
    this.timeRemaining = 90;
    this.speed = 200;
    this.gameOver = false;
    this.cqtEarned = false;
    this.currentLane = 1;
    this.obstacles = [];
    this.collectibles = [];
    this.spawnTimer = 0;
    this.speedTimer = 0;
    this.gameTimer = 0;
    this.upPressed = false;
    this.downPressed = false;
    this.laneTransitioning = false;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.drawBackground(W, H);
    this.drawLanes(W, H);
    this.createShip(W, H);
    this.createHUD(W, H);
    this.setupInput(W, H);

    // Countdown before start
    const countdown = this.add.text(W / 2, H / 2, 'GET READY', {
      fontFamily: 'Orbitron', fontSize: '32px', color: '#00d4ff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.time.delayedCall(1200, () => {
      countdown.destroy();
    });
  }

  private drawBackground(W: number, H: number) {
    // Dark background
    this.add.rectangle(W / 2, H / 2, W, H, 0x04060f);

    // Title
    this.add.text(W / 2, 30, '⛓ BLOCK RACER', {
      fontFamily: 'Orbitron', fontSize: '16px', color: '#00d4ff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(W / 2, 52, 'COLLECT VALID BLOCKS · AVOID INVALID TRANSACTIONS', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#00d4ff88',
    }).setOrigin(0.5);

    // Scrolling grid lines (background)
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, 0x00d4ff, 0.06);
    for (let x = 0; x < W; x += 60) gridGfx.lineBetween(x, 70, x, H - 60);
    for (let y = 70; y < H - 60; y += 40) gridGfx.lineBetween(0, y, W, y);
  }

  private drawLanes(W: number, H: number) {
    const g = this.add.graphics();
    for (let i = 0; i < this.LANES.length; i++) {
      const ly = this.LANES[i];
      // Lane background band
      g.fillStyle(0x00d4ff, 0.03);
      g.fillRect(0, ly - 30, W, 60);
      // Lane divider (dashed-style — just draw short segments)
      g.lineStyle(1, 0x00d4ff, 0.15);
      if (i < this.LANES.length - 1) {
        for (let x = 0; x < W; x += 30) {
          g.lineBetween(x, ly + 30, x + 15, ly + 30);
        }
      }
    }

    // Lane labels on left
    for (let i = 0; i < this.LANES.length; i++) {
      this.add.text(10, this.LANES[i], ['FAST LANE', 'MAIN LANE', 'SLOW LANE'][i], {
        fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#00d4ff44',
      }).setOrigin(0, 0.5);
    }
  }

  private createShip(W: number, _H: number) {
    this.ship = this.add.container(120, this.LANES[this.currentLane]);

    // Ship body (cyan arrow-ship shape)
    const body = this.add.rectangle(0, 0, 32, 18, 0x00d4ff);
    body.setStrokeStyle(1, 0xffffff, 0.5);
    const nose = this.add.triangle(20, 0, 0, -9, 0, 9, 16, 0, 0x00d4ff);
    const cockpit = this.add.rectangle(-2, 0, 10, 8, 0x001a2e);
    cockpit.setStrokeStyle(1, 0x00d4ff, 0.5);

    // Engine glow
    const glow = this.add.arc(-16, 0, 8, 0, 360, false, 0x00d4ff, 0.3);
    this.tweens.add({
      targets: glow,
      scaleX: { from: 0.8, to: 1.4 },
      scaleY: { from: 0.8, to: 1.4 },
      alpha: { from: 0.3, to: 0.05 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // TX label
    const label = this.add.text(0, -18, '📦 YOUR TX', {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#00d4ff',
    }).setOrigin(0.5);

    this.ship.add([glow, body, nose, cockpit, label]);
  }

  private createHUD(W: number, H: number) {
    // Score
    this.scoreText = this.add.text(10, H - 50, 'SCORE: 0', {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#00d4ff',
      stroke: '#000000', strokeThickness: 2,
    });

    // Blocks
    this.blocksText = this.add.text(10, H - 35, 'BLOCKS: 0/10', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#ffb800',
    });

    // Lives
    this.livesText = this.add.text(W - 10, H - 50, '❤ ❤ ❤', {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#ff2244',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0);

    // Timer
    this.timerText = this.add.text(W / 2, H - 45, '90s', {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0);

    // Legend at top right
    const legendX = W - 10;
    this.add.text(legendX, 70, '🟦 VALID BLOCK +100', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#00d4ff',
    }).setOrigin(1, 0);
    this.add.text(legendX, 84, '🔶 GAS FEE +25', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#ffb800',
    }).setOrigin(1, 0);
    this.add.text(legendX, 98, '🔴 INVALID TX = -1 LIFE', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#ff2244',
    }).setOrigin(1, 0);
  }

  private setupInput(W: number, H: number) {
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    // Mobile: tap top or bottom half to switch lanes
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.gameOver || this.laneTransitioning) return;
      if (ptr.y < H / 2) {
        this.switchLane(-1);
      } else {
        this.switchLane(1);
      }
    });
  }

  private switchLane(dir: -1 | 1) {
    if (this.laneTransitioning) return;
    const newLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
    if (newLane === this.currentLane) return;
    this.currentLane = newLane;
    this.laneTransitioning = true;
    this.tweens.add({
      targets: this.ship,
      y: this.LANES[this.currentLane],
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => { this.laneTransitioning = false; },
    });
  }

  private spawnObstacle() {
    const W = this.cameras.main.width;
    const lane = Math.floor(Math.random() * 3);
    const types: Obstacle['type'][] = ['INVALID TX', 'FORK EVENT', 'DOUBLE SPEND'];
    const type = types[Math.floor(Math.random() * types.length)];

    const gfx = this.add.rectangle(W + 30, this.LANES[lane], 44, 26, 0xff2244);
    gfx.setStrokeStyle(2, 0xff6666, 0.8);

    const label = this.add.text(W + 30, this.LANES[lane], type, {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#ff2244',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.obstacles.push({ gfx, label, x: W + 30, speed: this.speed, lane, type });
  }

  private spawnCollectible() {
    const W = this.cameras.main.width;
    const lane = Math.floor(Math.random() * 3);
    const isBlock = Math.random() > 0.35;
    const type: Collectible['type'] = isBlock ? 'VALID BLOCK' : 'GAS FEE';
    const value = isBlock ? 100 : 25;

    let gfx: Phaser.GameObjects.Arc | Phaser.GameObjects.Triangle;
    if (isBlock) {
      gfx = this.add.arc(W + 30, this.LANES[lane], 16, 0, 360, false, 0x00d4ff, 0.9);
      gfx.setStrokeStyle(2, 0xffffff, 0.5);
    } else {
      gfx = this.add.triangle(W + 30, this.LANES[lane], 0, 14, -12, -8, 12, -8, 0xffb800, 0.9);
    }

    const label = this.add.text(W + 30, this.LANES[lane] - 22, type, {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: isBlock ? '#00d4ff' : '#ffb800',
    }).setOrigin(0.5);

    this.collectibles.push({ gfx, label, x: W + 30, speed: this.speed * 0.8, lane, type, value });
  }

  private showFloatingText(x: number, y: number, msg: string, color: string) {
    const txt = this.add.text(x, y, msg, {
      fontFamily: 'Orbitron', fontSize: '12px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 900,
      onComplete: () => txt.destroy(),
    });
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    // Keyboard input
    const upNow = this.upKey.isDown || this.wKey.isDown;
    const downNow = this.downKey.isDown || this.sKey.isDown;
    if (upNow && !this.upPressed) { this.switchLane(-1); this.upPressed = true; }
    if (!upNow) this.upPressed = false;
    if (downNow && !this.downPressed) { this.switchLane(1); this.downPressed = true; }
    if (!downNow) this.downPressed = false;

    const dt = delta / 1000;
    this.gameTimer += dt;
    this.spawnTimer += dt;
    this.speedTimer += dt;

    // Game clock
    this.timeRemaining -= dt;
    const timeLeft = Math.max(0, Math.ceil(this.timeRemaining));
    this.timerText.setText(`${timeLeft}s`);
    if (this.timeRemaining <= 10) this.timerText.setColor('#ff2244');

    // Speed up every 10 seconds
    if (this.speedTimer >= 10) {
      this.speedTimer = 0;
      this.speed = Math.min(500, this.speed + 30);
    }

    // Spawn logic
    const spawnInterval = Math.max(0.6, 1.8 - (this.gameTimer * 0.012));
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      if (Math.random() > 0.4) this.spawnObstacle();
      else this.spawnCollectible();
    }

    // Move obstacles
    const W = this.cameras.main.width;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= obs.speed * dt;
      obs.gfx.x = obs.x;
      obs.label.x = obs.x;

      // Collision with ship
      if (obs.lane === this.currentLane && !this.laneTransitioning) {
        const dx = Math.abs(obs.x - this.ship.x);
        if (dx < 36) {
          this.lives--;
          this.updateLivesDisplay();
          this.cameras.main.flash(200, 255, 34, 68);
          this.showFloatingText(this.ship.x, this.ship.y - 30, '✗ ' + obs.type, '#ff2244');
          obs.gfx.destroy();
          obs.label.destroy();
          this.obstacles.splice(i, 1);
          if (this.lives <= 0) { this.triggerGameOver(); return; }
          continue;
        }
      }

      // Off screen
      if (obs.x < -60) {
        obs.gfx.destroy();
        obs.label.destroy();
        this.obstacles.splice(i, 1);
      }
    }

    // Move collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= col.speed * dt;
      col.gfx.x = col.x;
      col.label.x = col.x;

      // Collision with ship
      if (col.lane === this.currentLane && !this.laneTransitioning) {
        const dx = Math.abs(col.x - this.ship.x);
        if (dx < 36) {
          this.score += col.value;
          if (col.type === 'VALID BLOCK') {
            this.blocksCollected++;
            this.showFloatingText(this.ship.x, this.ship.y - 30, `+${col.value} ✓ BLOCK #${400000 + this.blocksCollected}`, '#00d4ff');
          } else {
            this.showFloatingText(this.ship.x, this.ship.y - 30, `+${col.value} GAS`, '#ffb800');
          }
          this.updateHUD();
          col.gfx.destroy();
          col.label.destroy();
          this.collectibles.splice(i, 1);
          continue;
        }
      }

      if (col.x < -60) {
        col.gfx.destroy();
        col.label.destroy();
        this.collectibles.splice(i, 1);
      }
    }

    // Win condition: 10 blocks OR time runs out
    if (this.blocksCollected >= 10 || this.timeRemaining <= 0) {
      this.triggerVictory();
    }
  }

  private updateLivesDisplay() {
    const hearts = ['', '❤', '❤ ❤', '❤ ❤ ❤'];
    this.livesText.setText(hearts[Math.max(0, this.lives)] || '');
  }

  private updateHUD() {
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.blocksText.setText(`BLOCKS: ${this.blocksCollected}/10`);
  }

  private triggerVictory() {
    this.gameOver = true;
    const xpGained = Math.min(200, this.blocksCollected * 15 + Math.floor(Math.max(0, this.timeRemaining) * 0.5));
    const cqtGained = !this.cqtEarned && this.blocksCollected >= 8 ? 5 : 0;
    this.showEndScreen('win', xpGained, cqtGained);
  }

  private triggerGameOver() {
    this.gameOver = true;
    const xpGained = Math.floor(this.score / 20);
    this.showEndScreen('lose', xpGained, 0);
  }

  private showEndScreen(outcome: 'win' | 'lose', xpGained: number, cqtGained: number) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Dim overlay
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7);
    overlay.setDepth(10);

    const color = outcome === 'win' ? '#00d4ff' : '#ff2244';
    const title = outcome === 'win' ? '✓ BLOCKS CONFIRMED!' : '✗ TX FAILED';

    this.add.text(W / 2, H / 2 - 60, title, {
      fontFamily: 'Orbitron', fontSize: '24px', color,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 - 20, `Blocks Collected: ${this.blocksCollected}`, {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 + 10, `Score: ${this.score}`, {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 + 35, `+${xpGained} XP${cqtGained > 0 ? `  +${cqtGained} CQT` : ''}`, {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ffb800',
    }).setOrigin(0.5).setDepth(11);

    const tip = outcome === 'win'
      ? 'Each valid block you collected propagated through the network — just like real transactions!'
      : 'Invalid transactions and forks can stall your tx. Consensus protects the chain!';

    this.add.text(W / 2, H / 2 + 65, tip, {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#888888',
      wordWrap: { width: W * 0.7 }, align: 'center',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 + 100, 'Returning to world...', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#444444',
    }).setOrigin(0.5).setDepth(11);

    this.time.delayedCall(3500, () => {
      this.scene.stop();
      this.scene.resume('OpenWorldScene');
      OpenWorldScene.events.emit('minigame:complete', { xpGained, cqtGained, scene: 'BlockRacerScene', score: this.score });
    });
  }
}
