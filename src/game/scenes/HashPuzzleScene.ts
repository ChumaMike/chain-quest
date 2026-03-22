import Phaser from 'phaser';
import OpenWorldScene from './OpenWorldScene';

// A simple deterministic pseudo-hash that looks like a hex string
function pseudoHash(data: string, nonce: number): string {
  let h = 0x811c9dc5;
  const input = data + nonce.toString();
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  // Second pass to extend
  let h2 = h;
  for (let i = input.length - 1; i >= 0; i--) {
    h2 ^= input.charCodeAt(i);
    h2 = (h2 * 0x01000193 + 0xdeadbeef) >>> 0;
  }
  const combined = ((h >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).padStart(16, '0');
  return '0x' + combined;
}

function countLeadingZeros(hash: string): number {
  // Count leading hex zeros after '0x'
  const hex = hash.slice(2);
  let count = 0;
  for (const ch of hex) {
    if (ch === '0') count++;
    else break;
  }
  return count;
}

const BLOCK_DATA = [
  { prev: '0x00a3f1b7...', data: 'Alice → Bob: 0.5 ETH', ts: '2024-01-15 14:23:01' },
  { prev: '0x00c41d9e...', data: 'Contract Deploy #841', ts: '2024-01-15 14:28:33' },
  { prev: '0x001e88af...', data: 'Token Transfer: 100 CQT', ts: '2024-01-15 15:01:17' },
  { prev: '0x00ff3c02...', data: 'Swap 2 ETH → 4000 USDC', ts: '2024-01-15 15:44:52' },
  { prev: '0x000ab17d...', data: 'Stake 32 ETH → Validator', ts: '2024-01-15 16:12:08' },
];

export default class HashPuzzleScene extends Phaser.Scene {
  private playerData: any = {};

  // Puzzle state
  private puzzleIndex = 0;
  private nonce = 0;
  private targetZeros = 1;
  private currentHash = '';
  private isValid = false;
  private puzzlesSolved = 0;
  private timePerPuzzle = 60;
  private timeLeft = 60;
  private gameOver = false;
  private autoMining = false;
  private autoMineTimer = 0;
  private totalTimeBonus = 0;

  // UI
  private hashDisplay!: Phaser.GameObjects.Text;
  private nonceDisplay!: Phaser.GameObjects.Text;
  private validIndicator!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private hashBg!: Phaser.GameObjects.Rectangle;
  private difficultyText!: Phaser.GameObjects.Text;
  private autoMineBtn!: Phaser.GameObjects.Container;
  private autoMineLed!: Phaser.GameObjects.Arc;
  private blockChainDisplay!: Phaser.GameObjects.Container;
  private chainBlocks: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'HashPuzzleScene' });
  }

  init(data: any) {
    this.playerData = data?.playerData || {};
    this.puzzleIndex = 0;
    this.nonce = 1000;
    this.targetZeros = 1;
    this.puzzlesSolved = 0;
    this.timeLeft = 60;
    this.gameOver = false;
    this.autoMining = false;
    this.autoMineTimer = 0;
    this.totalTimeBonus = 0;
    this.chainBlocks = [];
    this.computeHash();
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.drawBackground(W, H);
    this.createBlockDisplay(W, H);
    this.createHashDisplay(W, H);
    this.createNonceControls(W, H);
    this.createHUD(W, H);
    this.createChainDisplay(W, H);
    this.loadPuzzle();
  }

  private drawBackground(W: number, H: number) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x04060f);
    this.add.text(W / 2, 24, '🔐 HASH PUZZLE', {
      fontFamily: 'Orbitron', fontSize: '16px', color: '#8b5cf6',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(W / 2, 46, 'FIND THE NONCE THAT MAKES THE HASH VALID', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#8b5cf688',
    }).setOrigin(0.5);
  }

  private createBlockDisplay(W: number, H: number) {
    const blockX = W / 2;
    const blockY = H * 0.30;
    const bW = Math.min(320, W * 0.75);
    const bH = 110;

    // Block container background
    const bg = this.add.rectangle(blockX, blockY, bW, bH, 0x0d0022, 1);
    bg.setStrokeStyle(2, 0x8b5cf6, 0.7);

    // Header
    const header = this.add.rectangle(blockX, blockY - bH / 2 + 10, bW, 20, 0x8b5cf6, 0.2);
    this.add.text(blockX, blockY - bH / 2 + 10, '▣ BLOCK', {
      fontFamily: 'Orbitron', fontSize: '9px', color: '#8b5cf6',
    }).setOrigin(0.5);

    // Store reference to block y for field positioning
    (this as any)._blockX = blockX;
    (this as any)._blockY = blockY;
    (this as any)._blockW = bW;
    (this as any)._blockH = bH;
  }

  private createHashDisplay(W: number, H: number) {
    const by = (this as any)._blockY;
    const bH = (this as any)._blockH;
    const bW = (this as any)._blockW;
    const blockX = W / 2;

    // Previous hash field
    this.add.text(blockX - bW / 2 + 8, by - 30, 'PREV HASH:', {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#555555',
    }).setOrigin(0, 0.5);

    // Data field
    this.add.text(blockX - bW / 2 + 8, by - 10, 'DATA:', {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#555555',
    }).setOrigin(0, 0.5);

    // Timestamp
    this.add.text(blockX - bW / 2 + 8, by + 10, 'TIME:', {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#555555',
    }).setOrigin(0, 0.5);

    // Nonce field
    this.add.text(blockX - bW / 2 + 8, by + 30, 'NONCE:', {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#8b5cf6',
    }).setOrigin(0, 0.5);

    this.nonceDisplay = this.add.text(blockX - bW / 2 + 55, by + 30, '1000', {
      fontFamily: 'Orbitron', fontSize: '10px', color: '#d4aaff',
    }).setOrigin(0, 0.5);

    // Hash output section
    const hashY = by + bH / 2 + 20;
    this.add.text(blockX, hashY - 12, 'HASH OUTPUT:', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#555555',
    }).setOrigin(0.5);

    this.hashBg = this.add.rectangle(blockX, hashY + 14, bW, 22, 0x0a0e1a, 1);
    this.hashBg.setStrokeStyle(1, 0x8b5cf6, 0.4);

    this.hashDisplay = this.add.text(blockX, hashY + 14, '0x...', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#ff2244',
    }).setOrigin(0.5);

    this.validIndicator = this.add.text(blockX, hashY + 34, '✗ INVALID', {
      fontFamily: 'Orbitron', fontSize: '10px', color: '#ff2244',
    }).setOrigin(0.5);

    // Difficulty requirement
    this.difficultyText = this.add.text(blockX, hashY + 52, 'TARGET: must start with 0x0', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#8b5cf6',
    }).setOrigin(0.5);
  }

  private createNonceControls(W: number, H: number) {
    const controlY = H * 0.72;

    // UP button (+1)
    this.createButton(W * 0.15, controlY - 18, '+1', '#8b5cf6', () => { this.adjustNonce(1); });
    this.createButton(W * 0.15, controlY + 18, '-1', '#8b5cf6', () => { this.adjustNonce(-1); });

    // +100 / -100
    this.createButton(W * 0.30, controlY - 18, '+100', '#8b5cf6', () => { this.adjustNonce(100); });
    this.createButton(W * 0.30, controlY + 18, '-100', '#8b5cf6', () => { this.adjustNonce(-100); });

    // +1000 / -1000
    this.createButton(W * 0.45, controlY - 18, '+1k', '#8b5cf6', () => { this.adjustNonce(1000); });
    this.createButton(W * 0.45, controlY + 18, '-1k', '#8b5cf6', () => { this.adjustNonce(-1000); });

    // Auto-mine button
    this.autoMineBtn = this.add.container(W * 0.72, controlY);
    const btnBg = this.add.rectangle(0, 0, 90, 36, 0x0d0022, 1);
    btnBg.setStrokeStyle(2, 0x8b5cf6, 0.8);
    this.autoMineLed = this.add.arc(-28, 0, 5, 0, 360, false, 0x555555, 1);
    const btnLabel = this.add.text(10, 0, 'AUTO-MINE', {
      fontFamily: 'Orbitron', fontSize: '7px', color: '#8b5cf6',
    }).setOrigin(0.5);
    const costLabel = this.add.text(10, 12, '-5s per use', {
      fontFamily: 'Share Tech Mono', fontSize: '6px', color: '#555555',
    }).setOrigin(0.5);
    this.autoMineBtn.add([btnBg, this.autoMineLed, btnLabel, costLabel]);
    btnBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleAutoMine());
    btnLabel.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleAutoMine());

    // Label
    this.add.text(W / 2, controlY - 44, 'ADJUST NONCE TO FIND VALID HASH', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#555555',
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, color: string, callback: () => void) {
    const bg = this.add.rectangle(x, y, 52, 28, 0x0d0022, 1);
    bg.setStrokeStyle(1, parseInt(color.replace('#', '0x')), 0.6);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', callback);
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Orbitron', fontSize: '9px', color,
    }).setOrigin(0.5);
    txt.setInteractive({ useHandCursor: true }).on('pointerdown', callback);
  }

  private createHUD(W: number, _H: number) {
    // Progress
    this.progressText = this.add.text(10, 68, 'Puzzle 1/5', {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#8b5cf6',
    });

    // Timer
    this.timerText = this.add.text(W - 10, 68, '60s', {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0);
  }

  private createChainDisplay(W: number, H: number) {
    this.blockChainDisplay = this.add.container(0, H - 38);
    const chainBg = this.add.rectangle(W / 2, 20, W, 40, 0x0a0e1a, 0.8);
    chainBg.setStrokeStyle(1, 0x8b5cf6, 0.2);
    this.blockChainDisplay.add(chainBg);
    this.add.text(10, H - 50, 'CHAIN:', {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#555555',
    });
  }

  private loadPuzzle() {
    if (this.puzzleIndex >= BLOCK_DATA.length) {
      this.endGame('win');
      return;
    }
    this.nonce = 1000 + this.puzzleIndex * 317;
    this.targetZeros = 1 + Math.floor(this.puzzleIndex / 2);
    this.timeLeft = this.timePerPuzzle;
    this.computeHash();
    this.updateBlockFields();
    this.difficultyText.setText(`TARGET: must start with ${'0x' + '0'.repeat(this.targetZeros)}`);
    this.progressText.setText(`Puzzle ${this.puzzleIndex + 1}/5`);

    // Show difficulty explanation at puzzle 3
    if (this.puzzleIndex === 2) {
      const W = this.cameras.main.width;
      const H = this.cameras.main.height;
      const popup = this.add.rectangle(W / 2, H / 2, W * 0.8, 80, 0x0d0022, 0.95).setDepth(20);
      popup.setStrokeStyle(2, 0x8b5cf6, 0.8);
      this.add.text(W / 2, H / 2 - 16, '⚡ DIFFICULTY INCREASED', {
        fontFamily: 'Orbitron', fontSize: '10px', color: '#8b5cf6',
      }).setOrigin(0.5).setDepth(21);
      this.add.text(W / 2, H / 2 + 4, 'The network adjusts difficulty every 2016 blocks', {
        fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(21);
      this.add.text(W / 2, H / 2 + 18, 'to maintain ~10 minute block times. More zeros = harder!', {
        fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#888888',
      }).setOrigin(0.5).setDepth(21);
      this.time.delayedCall(2500, () => {
        popup.destroy();
      });
    }
  }

  private updateBlockFields() {
    const block = BLOCK_DATA[this.puzzleIndex];
    const bW = (this as any)._blockW;
    const by = (this as any)._blockY;
    const blockX = this.cameras.main.width / 2;

    // Update or re-create block text fields
    // (destroy old ones if they exist)
    if ((this as any)._prevHashTxt) { (this as any)._prevHashTxt.destroy(); }
    if ((this as any)._dataTxt) { (this as any)._dataTxt.destroy(); }
    if ((this as any)._tsTxt) { (this as any)._tsTxt.destroy(); }

    (this as any)._prevHashTxt = this.add.text(blockX - bW / 2 + 55, by - 30, block.prev, {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#888888',
    }).setOrigin(0, 0.5);

    (this as any)._dataTxt = this.add.text(blockX - bW / 2 + 55, by - 10, block.data, {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#cccccc',
    }).setOrigin(0, 0.5);

    (this as any)._tsTxt = this.add.text(blockX - bW / 2 + 55, by + 10, block.ts, {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#888888',
    }).setOrigin(0, 0.5);
  }

  private computeHash() {
    const block = BLOCK_DATA[this.puzzleIndex] || BLOCK_DATA[0];
    const input = block.prev + block.data + block.ts;
    this.currentHash = pseudoHash(input, this.nonce);
    this.isValid = countLeadingZeros(this.currentHash) >= this.targetZeros;
  }

  private updateHashDisplay() {
    this.nonceDisplay.setText(this.nonce.toString());
    const displayHash = this.currentHash.length > 24
      ? this.currentHash.slice(0, 22) + '...'
      : this.currentHash;
    this.hashDisplay.setText(displayHash);

    if (this.isValid) {
      this.hashDisplay.setColor('#00ff88');
      this.hashBg.setStrokeStyle(2, 0x00ff88, 0.8);
      this.validIndicator.setText('✓ VALID HASH!');
      this.validIndicator.setColor('#00ff88');
    } else {
      this.hashDisplay.setColor('#ff2244');
      this.hashBg.setStrokeStyle(1, 0x8b5cf6, 0.4);
      this.validIndicator.setText('✗ INVALID — adjust nonce');
      this.validIndicator.setColor('#ff4444');
    }
  }

  private adjustNonce(delta: number) {
    this.nonce = Math.max(0, this.nonce + delta);
    this.computeHash();
    this.updateHashDisplay();
  }

  private toggleAutoMine() {
    if (this.timeLeft <= 5) return;
    this.autoMining = !this.autoMining;
    this.autoMineLed.setFillStyle(this.autoMining ? 0x00ff88 : 0x555555);
    if (this.autoMining) {
      // Deduct 5 seconds
      this.timeLeft = Math.max(1, this.timeLeft - 5);
    }
  }

  private confirmBlock() {
    this.puzzlesSolved++;
    this.totalTimeBonus += Math.floor(this.timeLeft);

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Add to chain display
    const blockNum = 447000 + this.puzzlesSolved;
    const chainX = 70 + (this.puzzlesSolved - 1) * 80;
    const chainBlock = this.add.container(chainX, H - 22);
    const cb = this.add.rectangle(0, 0, 64, 20, 0x8b5cf6, 0.3);
    cb.setStrokeStyle(1, 0x8b5cf6, 0.8);
    const ct = this.add.text(0, 0, `#${blockNum}`, {
      fontFamily: 'Share Tech Mono', fontSize: '6px', color: '#d4aaff',
    }).setOrigin(0.5);
    chainBlock.add([cb, ct]);
    this.chainBlocks.push(chainBlock);

    // Success flash
    this.cameras.main.flash(300, 0, 255, 136);

    // Big confirm text
    const confirmTxt = this.add.text(W / 2, H * 0.52, `✓ BLOCK #${blockNum} MINED!`, {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#00ff88',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({
      targets: confirmTxt,
      y: H * 0.42,
      alpha: { from: 1, to: 0 },
      duration: 1200,
      onComplete: () => confirmTxt.destroy(),
    });

    this.autoMining = false;
    this.autoMineLed.setFillStyle(0x555555);

    // Next puzzle after brief pause
    this.time.delayedCall(1000, () => {
      this.puzzleIndex++;
      if (this.puzzleIndex >= BLOCK_DATA.length) {
        this.endGame('win');
      } else {
        this.loadPuzzle();
        this.updateHashDisplay();
        this.updateBlockFields();
      }
    });
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    const dt = delta / 1000;
    this.timeLeft -= dt;
    const tDisp = Math.max(0, Math.ceil(this.timeLeft));
    this.timerText.setText(`${tDisp}s`);
    if (this.timeLeft <= 10) this.timerText.setColor('#ff2244');

    if (this.timeLeft <= 0) {
      // Puzzle failed — move on
      this.puzzleIndex++;
      this.autoMining = false;
      this.autoMineLed.setFillStyle(0x555555);
      if (this.puzzleIndex >= BLOCK_DATA.length || this.puzzlesSolved === 0) {
        this.endGame('lose');
        return;
      }
      this.loadPuzzle();
      this.updateHashDisplay();
      this.updateBlockFields();
      return;
    }

    // Auto-mine: scan nonces at speed
    if (this.autoMining) {
      this.autoMineTimer += delta;
      if (this.autoMineTimer >= 50) {
        this.autoMineTimer = 0;
        this.nonce += 7;
        this.computeHash();
        this.updateHashDisplay();
      }
    }

    // Check if hash just became valid
    if (this.isValid) {
      this.confirmBlock();
      this.isValid = false; // prevent repeated trigger
    }
  }

  private endGame(outcome: 'win' | 'lose') {
    if (this.gameOver) return;
    this.gameOver = true;

    const xpGained = Math.min(200, this.puzzlesSolved * 30 + Math.floor(this.totalTimeBonus * 0.5));
    const cqtGained = this.puzzlesSolved >= 4 ? 5 : 0;

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(10);
    const col = outcome === 'win' ? '#8b5cf6' : '#ff2244';
    const title = outcome === 'win' ? '✓ ALL BLOCKS MINED!' : '✗ MINING FAILED';

    this.add.text(W / 2, H / 2 - 70, title, {
      fontFamily: 'Orbitron', fontSize: '22px', color: col,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 - 35, `Blocks Mined: ${this.puzzlesSolved}/5`, {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 - 12, `+${xpGained} XP${cqtGained > 0 ? `  +${cqtGained} CQT` : ''}`, {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ffb800',
    }).setOrigin(0.5).setDepth(11);

    const fact = outcome === 'win'
      ? `In real Bitcoin, mining ${this.puzzlesSolved} blocks would take ~${this.puzzlesSolved * 10} minutes of real GPU work!`
      : 'Real miners search billions of nonces per second. Difficulty adjusts every 2016 blocks to maintain ~10 min block times.';

    this.add.text(W / 2, H / 2 + 18, fact, {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#666666',
      wordWrap: { width: W * 0.72 }, align: 'center',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 + 60, 'Returning to world...', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#444444',
    }).setOrigin(0.5).setDepth(11);

    this.time.delayedCall(4000, () => {
      this.scene.stop();
      this.scene.resume('OpenWorldScene');
      OpenWorldScene.events.emit('minigame:complete', { xpGained, cqtGained, scene: 'HashPuzzleScene', solved: this.puzzlesSolved });
    });
  }
}
