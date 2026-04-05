import Phaser from 'phaser';
import OpenWorldScene from './OpenWorldScene';
import { WORLDS } from '../../data/curriculum';
import type { Question } from '../../types';

type ThreatType = '51% ATTACK' | 'SYBIL SWARM' | 'PHISHING' | 'REPLAY' | 'APT';
type DefenseType = 'firewall' | 'pow' | 'pos' | 'multisig' | 'zk';

interface Threat {
  container: Phaser.GameObjects.Container;
  type: ThreatType;
  hp: number;
  maxHp: number;
  angle: number;   // approach angle in radians
  speed: number;
  damage: number;
  dead: boolean;
}

interface Defense {
  container: Phaser.GameObjects.Container;
  type: DefenseType;
  x: number;
  y: number;
  range: number;
  fireRate: number; // ms between shots
  lastFired: number;
  damage: number;
}

const DEFENSE_DEFS: Record<DefenseType, { label: string; color: number; cost: number; range: number; fireRate: number; damage: number; desc: string }> = {
  firewall:  { label: '🔥 FIREWALL',    color: 0xff2244, cost: 20, range: 120, fireRate: 1200, damage: 15, desc: 'Blocks phishing probes' },
  pow:       { label: '⛏ PoW BARRIER',  color: 0xffb800, cost: 30, range: 100, fireRate: 900,  damage: 20, desc: 'Slows all threats' },
  pos:       { label: '🛡 PoS VALID.',   color: 0x00d4ff, cost: 25, range: 140, fireRate: 1500, damage: 12, desc: 'High range validator' },
  multisig:  { label: '🔑 MULTISIG',    color: 0x8b5cf6, cost: 35, range: 90,  fireRate: 800,  damage: 25, desc: 'High damage, short range' },
  zk:        { label: '👁 ZK DETECT.',  color: 0x00ff88, cost: 40, range: 160, fireRate: 2000, damage: 40, desc: 'Instantly kills replays' },
};

const WAVE_CONFIGS = [
  { label: 'Wave 1: PHISHING PROBES',  threats: [{ type: 'PHISHING'   as ThreatType, count: 6, hp: 30,  speed: 40,  damage: 5  }],  unlock: 'firewall'  as DefenseType },
  { label: 'Wave 2: SYBIL SWARM',      threats: [{ type: 'SYBIL SWARM' as ThreatType, count: 12, hp: 20, speed: 70, damage: 8 }],   unlock: 'pow'       as DefenseType },
  { label: 'Wave 3: 51% STRIKE',       threats: [{ type: '51% ATTACK'  as ThreatType, count: 1,  hp: 200, speed: 25, damage: 30 }], unlock: 'pos'       as DefenseType },
  { label: 'Wave 4: REPLAY ATTACKS',   threats: [{ type: 'REPLAY'      as ThreatType, count: 8,  hp: 45,  speed: 55, damage: 12 }], unlock: 'zk'        as DefenseType },
  { label: 'Wave 5: COORDINATED APT',  threats: [
    { type: 'PHISHING'    as ThreatType, count: 4,  hp: 40,  speed: 50, damage: 8  },
    { type: 'SYBIL SWARM' as ThreatType, count: 6,  hp: 30,  speed: 65, damage: 10 },
    { type: '51% ATTACK'  as ThreatType, count: 1,  hp: 160, speed: 30, damage: 25 },
    { type: 'REPLAY'      as ThreatType, count: 4,  hp: 50,  speed: 55, damage: 12 },
  ], unlock: 'multisig' as DefenseType },
];

export default class NodeDefenderScene extends Phaser.Scene {
  private playerData: any = {};
  private worldId = 0;

  // Question system
  private questionPool: Question[] = [];
  private questionPoolIdx = 0;
  private qPhase: 'game' | 'question' | 'reveal' = 'game';
  private qOverlay!: Phaser.GameObjects.Container;
  private qText!: Phaser.GameObjects.Text;
  private qTimerText!: Phaser.GameObjects.Text;
  private qTimerBar!: Phaser.GameObjects.Rectangle;
  private qOptionBtns: Phaser.GameObjects.Container[] = [];
  private currentQ: Question | null = null;
  private qTimerEvent: Phaser.Time.TimerEvent | null = null;
  private qTimerSec = 20;

  // Game state
  private nodeHP = 100;
  private consensusPoints = 100;
  private wave = 0;
  private phase: 'build' | 'defend' | 'between' | 'results' = 'build';
  private buildTimeLeft = 20;
  private gameOver = false;
  private wavesCleared = 0;
  private waveSpawned = false; // true only after all threats for current wave have been queued

  // Geometry
  private centerX = 0;
  private centerY = 0;
  private arenaRadius = 0;

  // Objects
  private threats: Threat[] = [];
  private defenses: Defense[] = [];
  private projectiles: Phaser.GameObjects.Arc[] = [];
  private unlockedDefenses: DefenseType[] = ['firewall'];

  // HUD
  private nodeHPBar!: Phaser.GameObjects.Graphics;
  private cpText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private buildTimerText!: Phaser.GameObjects.Text;
  private defensePanel!: Phaser.GameObjects.Container;
  private selectedDefense: DefenseType = 'firewall';
  private nodeGfx!: Phaser.GameObjects.Container;
  private buildTimer = 0;

  constructor() {
    super({ key: 'NodeDefenderScene' });
  }

  init(data: any) {
    this.playerData = data?.playerData || {};
    this.worldId = data?.worldId ?? 0;
    this.qPhase = 'game';
    this.questionPoolIdx = 0;
    if (this.worldId) {
      const w = WORLDS.find(x => x.id === this.worldId);
      this.questionPool = w ? [...w.questions].sort(() => Math.random() - 0.5)
        : WORLDS.flatMap(x => x.questions).sort(() => Math.random() - 0.5);
    } else {
      this.questionPool = WORLDS.flatMap(x => x.questions).sort(() => Math.random() - 0.5);
    }
    this.nodeHP = 100;
    this.consensusPoints = 100;
    this.wave = 0;
    this.phase = 'build';
    this.buildTimeLeft = 20;
    this.gameOver = false;
    this.wavesCleared = 0;
    this.threats = [];
    this.defenses = [];
    this.projectiles = [];
    this.unlockedDefenses = ['firewall'];
    this.selectedDefense = 'firewall';
    this.buildTimer = 0;
    this.waveSpawned = false;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    this.centerX = W / 2;
    this.centerY = H / 2 + 20;
    this.arenaRadius = Math.min(W, H) * 0.36;

    this.drawBackground(W, H);
    this.drawArena();
    this.createNodeCore();
    this.createHUD(W, H);
    this.createDefensePanel(W, H);
    this.setupInput();
    this.startBuildPhase();

    // Question overlay (hidden initially)
    this.qOverlay = this.add.container(0, 0).setDepth(40).setVisible(false);
    const qBg = this.add.rectangle(W / 2, H / 2, W - 20, H * 0.65, 0x04060f, 0.97).setStrokeStyle(2, 0xff8800, 0.8);
    const qTitle = this.add.text(W / 2, H / 2 - H * 0.34, '⚡ BETWEEN WAVES — ANSWER TO EARN CP', {
      fontFamily: 'Orbitron', fontSize: '9px', color: '#ff8800',
    }).setOrigin(0.5);
    this.qText = this.add.text(W / 2, H / 2 - H * 0.24, '', {
      fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#ffffff',
      wordWrap: { width: W - 50 }, align: 'center',
    }).setOrigin(0.5, 0);
    this.qTimerText = this.add.text(W / 2, H / 2 - H * 0.30, '20', {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#ff8800',
    }).setOrigin(0.5);
    this.qTimerBar = this.add.rectangle(W / 2, H / 2 - H * 0.28, W - 40, 5, 0xff8800);
    this.qOverlay.add([qBg, qTitle, this.qText, this.qTimerText, this.qTimerBar]);
  }

  private drawBackground(W: number, H: number) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x04060f);
    this.add.text(W / 2, 25, '🛡 NODE DEFENDER', {
      fontFamily: 'Orbitron', fontSize: '16px', color: '#ff8800',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.text(W / 2, 47, 'PLACE DEFENSES · PROTECT THE NODE · SURVIVE ALL WAVES', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#ff880066',
    }).setOrigin(0.5);
  }

  private drawArena() {
    const g = this.add.graphics();
    // Outer boundary
    g.lineStyle(2, 0xff8800, 0.25);
    g.strokeCircle(this.centerX, this.centerY, this.arenaRadius);
    // Mid ring
    g.lineStyle(1, 0xff8800, 0.08);
    g.strokeCircle(this.centerX, this.centerY, this.arenaRadius * 0.6);
    // Grid dot overlay
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x = this.centerX + Math.cos(a) * this.arenaRadius;
      const y = this.centerY + Math.sin(a) * this.arenaRadius;
      g.fillStyle(0xff8800, 0.15);
      g.fillCircle(x, y, 3);
    }
  }

  private createNodeCore() {
    this.nodeGfx = this.add.container(this.centerX, this.centerY);
    const outerRing = this.add.arc(0, 0, 28, 0, 360, false, 0xff8800, 0.15);
    outerRing.setStrokeStyle(2, 0xff8800, 0.6);
    const innerCore = this.add.arc(0, 0, 18, 0, 360, false, 0xffb800, 0.8);
    const label = this.add.text(0, 0, '⛓', { fontSize: '16px' }).setOrigin(0.5);
    const nodeLabel = this.add.text(0, 36, 'NODE CORE', {
      fontFamily: 'Orbitron', fontSize: '7px', color: '#ff8800',
    }).setOrigin(0.5);
    this.nodeGfx.add([outerRing, innerCore, label, nodeLabel]);

    this.tweens.add({
      targets: outerRing,
      scaleX: { from: 0.9, to: 1.2 },
      scaleY: { from: 0.9, to: 1.2 },
      alpha: { from: 0.15, to: 0.05 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  private createHUD(W: number, H: number) {
    // Node HP bar (top center)
    this.add.text(W / 2 - 80, 68, 'NODE HP', {
      fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#ff8800',
    }).setOrigin(0, 0.5);
    this.nodeHPBar = this.add.graphics();
    this.updateNodeHPBar();

    // CP display
    this.cpText = this.add.text(W - 10, 68, `CP: ${this.consensusPoints}`, {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#00d4ff',
    }).setOrigin(1, 0.5);

    // Wave text
    this.waveText = this.add.text(10, 68, 'Wave 1/5', {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#ff8800',
    }).setOrigin(0, 0.5);

    // Phase text
    this.phaseText = this.add.text(W / 2, H - 90, 'BUILD PHASE — Place defenses', {
      fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#ffb800',
    }).setOrigin(0.5);

    // Build timer
    this.buildTimerText = this.add.text(W / 2, H - 75, '20s to build', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#888888',
    }).setOrigin(0.5);
  }

  private updateNodeHPBar() {
    const W = this.cameras.main.width;
    this.nodeHPBar.clear();
    const barX = W / 2 - 60;
    const barY = 60;
    const barW = 120;
    const barH = 8;
    this.nodeHPBar.fillStyle(0x1a0800, 1);
    this.nodeHPBar.fillRect(barX, barY, barW, barH);
    const pct = Math.max(0, this.nodeHP / 100);
    const col = pct > 0.5 ? 0x00ff88 : pct > 0.25 ? 0xffb800 : 0xff2244;
    this.nodeHPBar.fillStyle(col, 1);
    this.nodeHPBar.fillRect(barX, barY, barW * pct, barH);
    this.nodeHPBar.lineStyle(1, 0xff8800, 0.4);
    this.nodeHPBar.strokeRect(barX, barY, barW, barH);
  }

  private createDefensePanel(W: number, H: number) {
    this.defensePanel = this.add.container(0, H - 58);
    this.refreshDefensePanel(W);
  }

  private refreshDefensePanel(W: number) {
    this.defensePanel.removeAll(true);
    const panelW = W;
    const bg = this.add.rectangle(panelW / 2, 28, panelW, 56, 0x0a0e1a, 0.9);
    bg.setStrokeStyle(1, 0xff8800, 0.2);
    this.defensePanel.add(bg);

    const count = this.unlockedDefenses.length;
    const btnW = Math.min(120, (panelW - 20) / count);
    const startX = (panelW - btnW * count) / 2 + btnW / 2;

    this.unlockedDefenses.forEach((dtype, i) => {
      const def = DEFENSE_DEFS[dtype];
      const bx = startX + i * btnW;
      const selected = dtype === this.selectedDefense;
      const btnBg = this.add.rectangle(bx, 28, btnW - 4, 46, selected ? 0x1a1000 : 0x0d0d0d, 1);
      btnBg.setStrokeStyle(selected ? 2 : 1, selected ? def.color : 0x333333, selected ? 1 : 0.5);
      const btnLabel = this.add.text(bx, 16, def.label, {
        fontFamily: 'Share Tech Mono', fontSize: '7px', color: `#${def.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
      const costLabel = this.add.text(bx, 28, `${def.cost} CP`, {
        fontFamily: 'Share Tech Mono', fontSize: '8px', color: this.consensusPoints >= def.cost ? '#00ff88' : '#ff4444',
      }).setOrigin(0.5);
      const descLabel = this.add.text(bx, 40, def.desc, {
        fontFamily: 'Share Tech Mono', fontSize: '6px', color: '#555555',
      }).setOrigin(0.5);
      [btnBg, btnLabel, costLabel, descLabel].forEach(obj => {
        obj.setInteractive({ useHandCursor: true });
        obj.on('pointerdown', () => {
          this.selectedDefense = dtype;
          this.refreshDefensePanel(this.cameras.main.width);
        });
      });
      this.defensePanel.add([btnBg, btnLabel, costLabel, descLabel]);
    });
  }

  private setupInput() {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.phase !== 'build' || this.gameOver) return;
      const dx = ptr.x - this.centerX;
      const dy = ptr.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Only place within arena, not too close to center
      if (dist < this.arenaRadius && dist > 40) {
        this.placeDefense(ptr.x, ptr.y);
      }
    });
  }

  private placeDefense(x: number, y: number) {
    const def = DEFENSE_DEFS[this.selectedDefense];
    if (this.consensusPoints < def.cost) return;
    this.consensusPoints -= def.cost;
    this.cpText.setText(`CP: ${this.consensusPoints}`);
    this.refreshDefensePanel(this.cameras.main.width);

    const container = this.add.container(x, y);
    const base = this.add.arc(0, 0, 14, 0, 360, false, def.color, 0.25);
    base.setStrokeStyle(2, def.color, 0.7);
    const icon = this.add.text(0, 0, ['🔥', '⛏', '🛡', '🔑', '👁'][['firewall', 'pow', 'pos', 'multisig', 'zk'].indexOf(this.selectedDefense)], {
      fontSize: '10px',
    }).setOrigin(0.5);
    const rangeIndicator = this.add.arc(0, 0, def.range, 0, 360, false, def.color, 0.04);
    rangeIndicator.setStrokeStyle(1, def.color, 0.15);
    container.add([rangeIndicator, base, icon]);

    this.defenses.push({
      container,
      type: this.selectedDefense,
      x, y,
      range: def.range,
      fireRate: def.fireRate,
      lastFired: 0,
      damage: def.damage,
    });
  }

  private startBuildPhase() {
    this.phase = 'build';
    this.waveSpawned = false;
    this.buildTimeLeft = 20;
    this.buildTimer = 0;
    const waveConfig = WAVE_CONFIGS[this.wave];
    this.waveText.setText(`Wave ${this.wave + 1}/5`);
    this.phaseText.setText(`BUILD — ${waveConfig.label}`);
    this.buildTimerText.setVisible(true);

    // Unlock new defense for this wave
    if (waveConfig.unlock && !this.unlockedDefenses.includes(waveConfig.unlock)) {
      this.unlockedDefenses.push(waveConfig.unlock);
      this.refreshDefensePanel(this.cameras.main.width);
      const W = this.cameras.main.width;
      const H = this.cameras.main.height;
      const notif = this.add.text(W / 2, H / 2, `🔓 ${DEFENSE_DEFS[waveConfig.unlock].label} UNLOCKED!`, {
        fontFamily: 'Orbitron', fontSize: '14px', color: '#00ff88',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: notif, y: H / 2 - 50, alpha: { from: 1, to: 0 }, duration: 2000, onComplete: () => notif.destroy() });
    }
  }

  private startWave() {
    this.phase = 'defend';
    this.waveSpawned = false;
    this.buildTimerText.setVisible(false);
    this.phaseText.setText(`WAVE ${this.wave + 1} — DEFEND THE NODE!`);
    this.phaseText.setColor('#ff2244');

    const config = WAVE_CONFIGS[this.wave];
    let totalSpawns = 0;
    for (const threatDef of config.threats) {
      for (let i = 0; i < threatDef.count; i++) {
        totalSpawns++;
        this.time.delayedCall(i * (1200 / (threatDef.count || 1)), () => {
          if (!this.gameOver) this.spawnThreat(threatDef.type, threatDef.hp, threatDef.speed, threatDef.damage);
        });
      }
    }
    // Mark wave as fully spawned after the last staggered spawn delay
    const lastDelay = (totalSpawns - 1) * (1200 / (config.threats[0]?.count || 1)) + 200;
    this.time.delayedCall(lastDelay, () => { this.waveSpawned = true; });
  }

  private spawnThreat(type: ThreatType, hp: number, speed: number, damage: number) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = this.arenaRadius + 20;
    const x = this.centerX + Math.cos(angle) * spawnDist;
    const y = this.centerY + Math.sin(angle) * spawnDist;

    const container = this.add.container(x, y);
    const colors: Record<ThreatType, number> = {
      '51% ATTACK': 0xff0000,
      'SYBIL SWARM': 0xff4400,
      'PHISHING': 0xff8800,
      'REPLAY': 0xcc00ff,
      'APT': 0xff0044,
    };
    const col = colors[type];
    const size = type === '51% ATTACK' ? 20 : 10;
    const body = this.add.rectangle(0, 0, size * 2, size * 1.4, col);
    body.setStrokeStyle(1, 0xffffff, 0.3);
    const label = this.add.text(0, -size - 4, type, {
      fontFamily: 'Share Tech Mono', fontSize: '6px', color: `#${col.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    container.add([body, label]);

    // Approach angle (toward center)
    const toCenter = Math.atan2(this.centerY - y, this.centerX - x);
    this.threats.push({ container, type, hp, maxHp: hp, angle: toCenter, speed, damage, dead: false });
  }

  private fireDef(def: Defense, threat: Threat) {
    const projectile = this.add.arc(def.x, def.y, 4, 0, 360, false, DEFENSE_DEFS[def.type].color, 0.9);
    this.projectiles.push(projectile);
    const tx = threat.container.x;
    const ty = threat.container.y;
    this.tweens.add({
      targets: projectile,
      x: tx, y: ty,
      duration: 250,
      onComplete: () => {
        projectile.destroy();
        const idx = this.projectiles.indexOf(projectile);
        if (idx >= 0) this.projectiles.splice(idx, 1);
        if (!threat.dead) {
          let dmg = def.damage;
          // ZK Detector instantly kills replays
          if (def.type === 'zk' && threat.type === 'REPLAY') dmg = 9999;
          // Firewall bonus vs phishing
          if (def.type === 'firewall' && threat.type === 'PHISHING') dmg *= 2;
          threat.hp -= dmg;
          if (threat.hp <= 0) {
            threat.dead = true;
            this.tweens.add({
              targets: threat.container,
              alpha: 0, scaleX: 0, scaleY: 0,
              duration: 200,
              onComplete: () => threat.container.destroy(),
            });
          }
        }
      },
    });
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    const dt = delta / 1000;

    if (this.phase === 'build') {
      this.buildTimer += dt;
      const tLeft = Math.max(0, 20 - this.buildTimer);
      this.buildTimerText.setText(`${Math.ceil(tLeft)}s to build`);
      if (this.buildTimer >= 20) this.startWave();
      return;
    }

    if (this.phase !== 'defend') return;

    const now = this.time.now;

    // Move threats toward center
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const t = this.threats[i];
      if (t.dead) { this.threats.splice(i, 1); continue; }
      t.container.x += Math.cos(t.angle) * t.speed * dt;
      t.container.y += Math.sin(t.angle) * t.speed * dt;

      // Reached the node?
      const dx = t.container.x - this.centerX;
      const dy = t.container.y - this.centerY;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        t.dead = true;
        this.nodeHP = Math.max(0, this.nodeHP - t.damage);
        this.updateNodeHPBar();
        this.cameras.main.shake(200, 0.006);
        t.container.destroy();
        this.threats.splice(i, 1);
        if (this.nodeHP <= 0) { this.endDefeat(); return; }
      }
    }

    // Defenses fire at nearest threat
    for (const def of this.defenses) {
      if (now - def.lastFired < def.fireRate) continue;
      let nearest: Threat | null = null;
      let nearestDist = def.range;
      for (const t of this.threats) {
        if (t.dead) continue;
        const dx = t.container.x - def.x;
        const dy = t.container.y - def.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist) { nearestDist = d; nearest = t; }
      }
      if (nearest) {
        def.lastFired = now;
        this.fireDef(def, nearest);
      }
    }

    // Check wave complete — only after all spawns have been queued
    if (this.waveSpawned && this.threats.length === 0) {
      this.wavesCleared = this.wave + 1;
      if (this.wave >= WAVE_CONFIGS.length - 1) {
        this.endVictory();
      } else {
        this.wave++;
        this.phase = 'between';
        this.consensusPoints = Math.min(200, this.consensusPoints + 50);
        this.cpText.setText(`CP: ${this.consensusPoints}`);
        this.phaseText.setText(`Wave ${this.wave} cleared! +50 CP`);
        this.phaseText.setColor('#00ff88');
        this.refreshDefensePanel(this.cameras.main.width);
        // Trigger question between waves, then start build phase
        this.time.delayedCall(800, () => {
          if (!this.gameOver) this.triggerWaveQuestion();
        });
      }
    }
  }

  private triggerWaveQuestion() {
    if (this.questionPool.length === 0) { this.startBuildPhase(); return; }
    if (this.questionPoolIdx >= this.questionPool.length) {
      this.questionPoolIdx = 0;
      this.questionPool = this.questionPool.sort(() => Math.random() - 0.5);
    }
    this.currentQ = this.questionPool[this.questionPoolIdx++];
    this.qPhase = 'question';
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.qText.setText(this.currentQ.text);
    this.qTimerText.setText('20').setColor('#ff8800');
    this.qTimerBar.setScale(1, 1);
    this.qOverlay.setVisible(true);

    this.qOptionBtns.forEach(b => b.destroy());
    this.qOptionBtns = [];
    this.currentQ.options.forEach((opt, i) => {
      const by = H / 2 - H * 0.04 + i * 44;
      const bg = this.add.rectangle(W / 2, by, W - 30, 38, 0x0d0d0d).setStrokeStyle(1, 0xff8800, 0.5).setDepth(41).setInteractive({ cursor: 'pointer' });
      const txt = this.add.text(W / 2, by, `${String.fromCharCode(65 + i)}. ${opt}`, {
        fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#cccccc',
        wordWrap: { width: W - 50 }, align: 'center',
      }).setOrigin(0.5).setDepth(42);
      bg.on('pointerover', () => bg.setFillStyle(0x1a1200));
      bg.on('pointerout', () => bg.setFillStyle(0x0d0d0d));
      bg.on('pointerdown', () => this.submitWaveAnswer(i));
      this.qOptionBtns.push(this.add.container(0, 0, [bg, txt]).setDepth(41));
    });

    this.qTimerSec = 20;
    if (this.qTimerEvent) this.qTimerEvent.destroy();
    this.qTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 19,
      callback: () => {
        this.qTimerSec--;
        this.qTimerText.setText(`${this.qTimerSec}`);
        this.qTimerBar.setScale(this.qTimerSec / 20, 1);
        if (this.qTimerSec <= 5) this.qTimerText.setColor('#ff2244');
        if (this.qTimerSec <= 0) this.submitWaveAnswer(-1);
      },
    });
  }

  private submitWaveAnswer(idx: number) {
    if (this.qPhase !== 'question' || !this.currentQ) return;
    if (this.qTimerEvent) this.qTimerEvent.destroy();
    this.qPhase = 'reveal';
    const correct = idx === this.currentQ.correctIndex;

    this.qOptionBtns.forEach((btn, i) => {
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      if (i === this.currentQ!.correctIndex) bg.setFillStyle(0x003320);
      else if (i === idx) bg.setFillStyle(0x330010);
    });

    this.time.delayedCall(1200, () => {
      this.qOptionBtns.forEach(b => b.destroy());
      this.qOptionBtns = [];
      this.qOverlay.setVisible(false);
      this.qPhase = 'game';
      if (correct) {
        this.consensusPoints = Math.min(200, this.consensusPoints + 30);
        this.cpText.setText(`CP: ${this.consensusPoints}`);
        this.refreshDefensePanel(this.cameras.main.width);
        // HP repair
        this.nodeHP = Math.min(100, this.nodeHP + 10);
        this.updateNodeHPBar();
      } else {
        // Next wave spawns one extra threat (handled via flag, startBuildPhase reads it)
        this.consensusPoints = Math.max(0, this.consensusPoints - 15);
        this.cpText.setText(`CP: ${this.consensusPoints}`);
        this.refreshDefensePanel(this.cameras.main.width);
      }
      if (!this.gameOver) this.startBuildPhase();
    });
  }

  private endDefeat() {
    this.gameOver = true;
    const xpGained = this.wavesCleared * 40;
    this.showEndScreen('lose', xpGained, 0);
  }

  private endVictory() {
    this.gameOver = true;
    const xpGained = Math.min(250, this.wavesCleared * 40 + Math.floor((this.nodeHP / 100) * 50));
    const cqtGained = this.wavesCleared >= 4 ? 5 : 0;
    this.showEndScreen('win', xpGained, cqtGained);
  }

  private showEndScreen(outcome: 'win' | 'lose', xpGained: number, cqtGained: number) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(10);
    const col = outcome === 'win' ? '#00ff88' : '#ff2244';
    const title = outcome === 'win' ? '✓ NODE SECURED!' : '✗ NODE COMPROMISED';

    this.add.text(W / 2, H / 2 - 70, title, {
      fontFamily: 'Orbitron', fontSize: '22px', color: col,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 - 35, `Waves Cleared: ${this.wavesCleared}/5`, {
      fontFamily: 'Share Tech Mono', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 - 12, `Node HP Remaining: ${this.nodeHP}%`, {
      fontFamily: 'Share Tech Mono', fontSize: '11px', color: '#ff8800',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 + 15, `+${xpGained} XP${cqtGained > 0 ? `  +${cqtGained} CQT` : ''}`, {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ffb800',
    }).setOrigin(0.5).setDepth(11);

    const tips: Record<ThreatType, string> = {
      'PHISHING': 'Phishing attacks try to steal keys — firewalls filter them before they reach nodes.',
      'SYBIL SWARM': 'Sybil attacks flood the network with fake identities — Proof-of-Work makes this expensive.',
      '51% ATTACK': 'A 51% attack controls majority hash power — distributed mining prevents this.',
      'REPLAY': 'Replay attacks resubmit old transactions — ZK-proofs verify uniqueness without revealing data.',
      'APT': 'Advanced persistent threats combine all vectors — layered security is the only defense.',
    };
    const tipKey: ThreatType = outcome === 'lose' ? '51% ATTACK' : 'APT';
    this.add.text(W / 2, H / 2 + 48, tips[tipKey], {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#666666',
      wordWrap: { width: W * 0.72 }, align: 'center',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(W / 2, H / 2 + 85, 'Returning to world...', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#444444',
    }).setOrigin(0.5).setDepth(11);

    this.time.delayedCall(4000, () => {
      if (this.scene.isActive('OpenWorldScene')) {
        this.scene.stop();
        this.scene.resume('OpenWorldScene');
        OpenWorldScene.events.emit('minigame:complete', { xpGained, cqtGained, scene: 'NodeDefenderScene', wavesCleared: this.wavesCleared });
      } else {
        const score = this.wavesCleared * 600 + Math.floor(this.nodeHP * 20);
        this.game.events.emit('defender:exit', { won: outcome === 'win', score, wavesCleared: this.wavesCleared, xpGained, worldId: this.worldId });
      }
    });
  }
}
