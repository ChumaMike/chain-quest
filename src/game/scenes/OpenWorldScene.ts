import Phaser from 'phaser';
import { ZONE_CONFIGS, HUB_CONFIG, WORLD_SIZE, MINI_GAME_PORTALS, type ZoneConfig } from '../../data/worldZones';
import { WORLDS } from '../../data/curriculum';

const WORLD_COLORS: Record<number, number> = {
  0: 0x888888,
  1: 0x00d4ff, 2: 0xffb800, 3: 0x8b5cf6, 4: 0x00ff88,
  5: 0xff0080, 6: 0x0066ff, 7: 0xff6b35, 8: 0x00ffcc,
  9: 0xff4400, 10: 0x3366ff, 11: 0xaa44ff, 12: 0xffcc00,
  13: 0x00aaff, 14: 0xf59e0b, 15: 0xff00aa, 16: 0xffd700,
};
const HERO_COLORS: Record<string, number> = {
  validator: 0x00d4ff,
  miner: 0xffb800,
  degen: 0x00ff88,
  archivist: 0x8b5cf6,
  dao_diplomat: 0xf59e0b,
};

interface RemotePlayerSprite {
  body: Phaser.GameObjects.Rectangle;
  nameTag: Phaser.GameObjects.Text;
  levelBadge: Phaser.GameObjects.Text;
  glowCircle?: Phaser.GameObjects.Arc;
  targetX: number;
  targetY: number;
}

export default class OpenWorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private playerGlow?: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private playerSpeed = 180;
  private remotePlayers: Map<string, RemotePlayerSprite> = new Map();
  private enemyNPCs: Phaser.GameObjects.Container[] = [];
  private bossZones: Phaser.GameObjects.Arc[] = [];
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private minimap!: Phaser.GameObjects.Graphics;
  private onlineBadge!: Phaser.GameObjects.Text;
  private positionEmitTimer = 0;
  private battleTriggerCooldown = 0;
  private playerData: any = {};
  private completedWorlds: number[] = [];
  private currentZone: string = 'HUB';
  private chatBubbles: Map<string, { text: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle; ttl: number }> = new Map();
  private myBubble?: { text: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle; ttl: number };
  private studyNPCs: Array<{ container: Phaser.GameObjects.Container; worldId: number; talkCooldown: number }> = [];
  private miniGamePortalData: Array<{ x: number; y: number; radius: number; sceneKey: string }> = [];
  private jumpCooldown = 0;
  private isJumping = false;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Event bus for React communication
  public static events = new Phaser.Events.EventEmitter();

  // Virtual joystick input from React overlay (mobile)
  public static joystickInput = { vx: 0, vy: 0 };

  constructor() {
    super({ key: 'OpenWorldScene' });
  }

  init(data: any) {
    this.playerData = data || {};
    this.completedWorlds = data?.completedWorlds || [];
  }

  create() {
    // Pull playerData from registry (set by PhaserGame immediately after game construction)
    const registryData = this.game.registry.get('playerData');
    if (registryData) this.playerData = registryData;
    const registryWorlds = this.game.registry.get('completedWorlds');
    if (registryWorlds) this.completedWorlds = registryWorlds;

    this.cameras.main.setBackgroundColor('#04060f');

    // Set world bounds
    this.physics.world.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);

    this.drawWorld();
    this.createPlayer();
    this.createEnemyNPCs();
    this.createStudyNPCs();
    this.createZoneParticles();
    this.createBossZones();
    this.createMiniGamePortals();
    this.setupCamera();
    this.setupControls();
    this.setupMinimap();
    this.setupSocket();
    this.scene.launch('UIScene');

    // Animate world zone borders
    this.tweens.add({
      targets: this.worldGraphics,
      alpha: { from: 0.7, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  drawWorld() {
    this.worldGraphics = this.add.graphics();
    const g = this.worldGraphics;

    // Draw hub first (center)
    g.fillStyle(0x0e1628, 1);
    g.fillRect(HUB_CONFIG.x, HUB_CONFIG.y, HUB_CONFIG.width, HUB_CONFIG.height);
    g.lineStyle(1, 0xffffff, 0.15);
    g.strokeRect(HUB_CONFIG.x, HUB_CONFIG.y, HUB_CONFIG.width, HUB_CONFIG.height);

    // Hub label
    this.add.text(HUB_CONFIG.x + HUB_CONFIG.width / 2, HUB_CONFIG.y + 30, '⚡ SOCIAL HUB', {
      fontFamily: 'Orbitron', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.85);
    this.add.text(HUB_CONFIG.x + HUB_CONFIG.width / 2, HUB_CONFIG.y + 55, 'SHOP · LEADERBOARD · SPAWN · MINI-GAMES', {
      fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#aaaaaa',
    }).setOrigin(0.5).setAlpha(0.5);

    // Draw each zone
    for (const zone of ZONE_CONFIGS) {
      const col = WORLD_COLORS[zone.worldId] || 0x111111;
      const bgCol = Phaser.Display.Color.IntegerToColor(col);

      // Zone fill (dark tint of zone color)
      g.fillStyle(Phaser.Display.Color.GetColor(
        Math.floor(bgCol.red * 0.08),
        Math.floor(bgCol.green * 0.08),
        Math.floor(bgCol.blue * 0.08),
      ), 1);
      g.fillRect(zone.x, zone.y, zone.width, zone.height);

      // Zone border (neon)
      g.lineStyle(3, col, 0.75);
      g.strokeRect(zone.x, zone.y, zone.width, zone.height);

      // Grid lines inside zone
      g.lineStyle(1, col, 0.05);
      for (let gx = zone.x; gx < zone.x + zone.width; gx += 80) {
        g.lineBetween(gx, zone.y, gx, zone.y + zone.height);
      }
      for (let gy = zone.y; gy < zone.y + zone.height; gy += 80) {
        g.lineBetween(zone.x, gy, zone.x + zone.width, gy);
      }

      // Zone name
      const isCompleted = this.completedWorlds.includes(zone.worldId);
      this.add.text(zone.x + zone.width / 2, zone.y + 25, `W${zone.worldId}`, {
        fontFamily: 'Orbitron', fontSize: '13px',
        color: `#${col.toString(16).padStart(6, '0')}`,
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0.9);
      this.add.text(zone.x + zone.width / 2, zone.y + 45, zone.name.toUpperCase(), {
        fontFamily: 'Orbitron', fontSize: '10px',
        color: isCompleted ? '#00ff88' : '#cccccc',
      }).setOrigin(0.5);
      if (isCompleted) {
        this.add.text(zone.x + zone.width / 2, zone.y + 62, '✓ CLEARED', {
          fontFamily: 'Share Tech Mono', fontSize: '8px', color: '#00ff8888',
        }).setOrigin(0.5);
      }

      // Corner decorations
      const cornerSize = 12;
      const corners = [[zone.x, zone.y], [zone.x + zone.width - cornerSize, zone.y], [zone.x, zone.y + zone.height - cornerSize], [zone.x + zone.width - cornerSize, zone.y + zone.height - cornerSize]];
      for (const [cx, cy] of corners) {
        g.lineStyle(2, col, 0.8);
        g.strokeRect(cx, cy, cornerSize, cornerSize);
      }
    }
  }

  createPlayer() {
    const startX = this.playerData.worldX || 1600;
    const startY = this.playerData.worldY || 980;
    const heroClass = this.playerData.heroClass || 'validator';
    const color1 = this.playerData.avatarColor1 || '#00d4ff';
    const hasGlow = this.playerData.hasGlow || false;
    const col = parseInt(color1.replace('#', ''), 16);

    // Player container
    this.player = this.add.container(startX, startY);

    // Glow circle (if enabled)
    if (hasGlow) {
      this.playerGlow = this.add.arc(0, 0, 22, 0, 360, false, col, 0.15);
      this.player.add(this.playerGlow);
    }

    // Player body (16x24 pixel character)
    this.playerBody = this.add.rectangle(0, 0, 16, 24, col);
    this.playerBody.setStrokeStyle(1, 0xffffff, 0.5);
    this.player.add(this.playerBody);

    // Head
    const head = this.add.rectangle(0, -16, 12, 12, col);
    head.setStrokeStyle(1, 0xffffff, 0.3);
    this.player.add(head);

    // Name tag
    const nameTag = this.add.text(0, -32, this.playerData.displayName || 'Hero', {
      fontFamily: 'Orbitron', fontSize: '9px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.player.add(nameTag);

    // Level badge
    const levelBadge = this.add.text(0, -44, `LVL ${this.playerData.level || 1}`, {
      fontFamily: 'Orbitron', fontSize: '7px',
      color: `#${HERO_COLORS[heroClass]?.toString(16).padStart(6, '0') || '00d4ff'}`,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.player.add(levelBadge);

    // Enable physics
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(16, 24);

    // Idle pulse on glow
    if (this.playerGlow) {
      this.tweens.add({
        targets: this.playerGlow,
        scaleX: { from: 1, to: 1.3 },
        scaleY: { from: 1, to: 1.3 },
        alpha: { from: 0.15, to: 0.05 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  createEnemyNPCs() {
    for (const zone of ZONE_CONFIGS) {
      const col = WORLD_COLORS[zone.worldId] || 0xff2244;
      const worldData = WORLDS.find(w => w.id === zone.worldId);
      const enemyTypes = worldData?.enemyTypes ?? ['ENEMY', 'ENEMY', 'ENEMY', 'ENEMY'];
      for (let i = 0; i < zone.npcCount; i++) {
        const x = zone.x + 80 + Math.random() * (zone.width - 160);
        const y = zone.y + 80 + Math.random() * (zone.height - 160);
        const container = this.add.container(x, y);

        const body = this.add.rectangle(0, 0, 14, 20, 0xff2244);
        body.setStrokeStyle(2, col, 0.8);
        container.add(body);

        const conceptLabel = enemyTypes[i % enemyTypes.length];
        const label = this.add.text(0, -24, `⚔ ${conceptLabel}`, {
          fontFamily: 'Orbitron', fontSize: '7px', color: '#ff2244',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        container.add(label);

        // Eye (white dot)
        const eye = this.add.arc(0, -3, 3, 0, 360, false, 0xffffff, 0.8);
        container.add(eye);

        // Store zone info on container
        (container as any).worldId = zone.worldId;
        (container as any).isDead = false;

        // Idle float animation
        this.tweens.add({
          targets: container,
          y: `+=${8 + Math.random() * 8}`,
          duration: 1200 + Math.random() * 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 1000,
        });

        // Simple patrol movement
        this.tweens.add({
          targets: container,
          x: `+=${(Math.random() - 0.5) * 120}`,
          duration: 2000 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 2000,
        });

        this.enemyNPCs.push(container);
      }
    }
  }

  createBossZones() {
    for (const zone of ZONE_CONFIGS) {
      const col = WORLD_COLORS[zone.worldId] || 0xffffff;
      const { x, y, radius } = zone.bossZone;

      // Portal arc — collision detection reads .radius/.worldId/.zoneX/.zoneY from this
      const portal = this.add.arc(x, y, radius, 0, 360, false, col, 0.1);
      portal.setStrokeStyle(3, col, 0.8);
      this.bossZones.push(portal);
      (portal as any).worldId = zone.worldId;
      (portal as any).zoneX = x;
      (portal as any).zoneY = y;

      // Inner glow ring
      const innerRing = this.add.arc(x, y, radius * 0.6, 0, 360, false, col, 0.2);
      this.tweens.add({
        targets: innerRing,
        scaleX: { from: 0.8, to: 1.2 },
        scaleY: { from: 0.8, to: 1.2 },
        alpha: { from: 0.2, to: 0.05 },
        duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Gate structure (arch + pillars)
      const gateW = radius * 2.4;
      const gateH = 12;
      const gateTopY = y - radius - 4;
      const pillarH = 28;
      const pillarW = 10;

      const gateG = this.add.graphics();
      // Arch bar
      gateG.fillStyle(col, 0.22);
      gateG.fillRect(x - gateW / 2, gateTopY - gateH, gateW, gateH);
      gateG.lineStyle(2, col, 0.9);
      gateG.strokeRect(x - gateW / 2, gateTopY - gateH, gateW, gateH);
      // Left pillar
      gateG.fillStyle(col, 0.28);
      gateG.fillRect(x - gateW / 2 - pillarW, gateTopY - gateH - pillarH, pillarW, gateH + pillarH);
      gateG.lineStyle(1, col, 0.7);
      gateG.strokeRect(x - gateW / 2 - pillarW, gateTopY - gateH - pillarH, pillarW, gateH + pillarH);
      // Right pillar
      gateG.fillStyle(col, 0.28);
      gateG.fillRect(x + gateW / 2, gateTopY - gateH - pillarH, pillarW, gateH + pillarH);
      gateG.lineStyle(1, col, 0.7);
      gateG.strokeRect(x + gateW / 2, gateTopY - gateH - pillarH, pillarW, gateH + pillarH);
      // Pulse gate alpha
      this.tweens.add({
        targets: gateG,
        alpha: { from: 0.7, to: 1.0 },
        duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // World name label above gate
      const labelY = gateTopY - gateH - pillarH - 18;
      this.add.text(x, labelY,
        `WORLD ${zone.worldId}: ${zone.name.toUpperCase()}`,
        {
          fontFamily: 'Orbitron', fontSize: '8px',
          color: `#${col.toString(16).padStart(6, '0')}`,
          stroke: '#000000', strokeThickness: 3,
        }
      ).setOrigin(0.5);

      // Blinking "ENTER TO BATTLE" sub-label
      const tapLabel = this.add.text(x, gateTopY - gateH - pillarH - 5,
        '— ENTER TO BATTLE —',
        {
          fontFamily: 'Share Tech Mono', fontSize: '7px',
          color: '#ffffff', stroke: '#000000', strokeThickness: 2,
        }
      ).setOrigin(0.5).setAlpha(0.5);
      this.tweens.add({
        targets: tapLabel,
        alpha: { from: 0.3, to: 0.9 },
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  createMiniGamePortals() {
    for (const p of MINI_GAME_PORTALS) {
      // Outer ring
      const portal = this.add.arc(p.x, p.y, p.radius, 0, 360, false, p.color, 0.1);
      portal.setStrokeStyle(3, p.color, 0.8);

      // Pulsing inner ring
      const inner = this.add.arc(p.x, p.y, p.radius * 0.55, 0, 360, false, p.color, 0.25);
      this.tweens.add({
        targets: inner,
        scaleX: { from: 0.8, to: 1.25 },
        scaleY: { from: 0.8, to: 1.25 },
        alpha: { from: 0.25, to: 0.04 },
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: MINI_GAME_PORTALS.indexOf(p) * 400,
      });

      // Label
      this.add.text(p.x, p.y - p.radius - 14, p.label, {
        fontFamily: 'Orbitron', fontSize: '7px',
        color: `#${p.color.toString(16).padStart(6, '0')}`,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);

      // "MINI-GAME" sub-label
      this.add.text(p.x, p.y - p.radius - 4, 'MINI-GAME', {
        fontFamily: 'Share Tech Mono', fontSize: '6px', color: '#ffffff44',
      }).setOrigin(0.5);

      this.miniGamePortalData.push({ x: p.x, y: p.y, radius: p.radius, sceneKey: p.sceneKey });
    }
  }

  checkMiniGamePortals() {
    if (this.battleTriggerCooldown > 0) return;
    const px = this.player.x;
    const py = this.player.y;
    for (const portal of this.miniGamePortalData) {
      const dx = px - portal.x;
      const dy = py - portal.y;
      if (Math.sqrt(dx * dx + dy * dy) < portal.radius * 0.8) {
        this.battleTriggerCooldown = 5000;
        this.cameras.main.flash(200, 139, 92, 246);
        // Emit navigate event — React handles routing to /game/duel or /game/jumper
        OpenWorldScene.events.emit('minigame:navigate', { sceneKey: portal.sceneKey });
        return;
      }
    }
  }

  createStudyNPCs() {
    for (const zone of ZONE_CONFIGS) {
      const positions = [
        { x: zone.x + zone.width * 0.25, y: zone.y + zone.height * 0.5 },
        { x: zone.x + zone.width * 0.75, y: zone.y + zone.height * 0.5 },
      ];
      for (const pos of positions) {
        const container = this.add.container(pos.x, pos.y);

        // Body
        const body = this.add.rectangle(0, 0, 14, 20, 0x8b5cf6);
        body.setStrokeStyle(2, 0xd4aaff, 0.9);
        container.add(body);

        // Head
        const head = this.add.rectangle(0, -16, 12, 12, 0x8b5cf6);
        head.setStrokeStyle(1, 0xd4aaff, 0.6);
        container.add(head);

        // Lamp emoji label
        const icon = this.add.text(0, -32, '💡', { fontSize: '10px' }).setOrigin(0.5);
        container.add(icon);

        // PROFESSOR label
        const label = this.add.text(0, -44, 'PROFESSOR', {
          fontFamily: 'Orbitron', fontSize: '7px', color: '#d4aaff',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);
        container.add(label);

        // Idle pulse
        this.tweens.add({
          targets: container,
          scaleX: { from: 0.95, to: 1.05 },
          scaleY: { from: 0.95, to: 1.05 },
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        this.studyNPCs.push({ container, worldId: zone.worldId, talkCooldown: 0 });
      }
    }
  }

  createZoneParticles() {
    for (const zone of ZONE_CONFIGS) {
      const col = WORLD_COLORS[zone.worldId] || 0x888888;
      const count = 15 + Math.floor(Math.random() * 11); // 15–25
      for (let i = 0; i < count; i++) {
        const px = zone.x + 40 + Math.random() * (zone.width - 80);
        const py = zone.y + 40 + Math.random() * (zone.height - 80);
        const particle = this.add.arc(px, py, 2, 0, 360, false, col, 0.3);
        particle.setDepth(-1);
        this.tweens.add({
          targets: particle,
          x: `+=${(Math.random() - 0.5) * 60}`,
          y: `+=${(Math.random() - 0.5) * 60}`,
          duration: 3000 + Math.random() * 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 3000,
        });
      }
    }
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(2.5);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.cameras.main.setBackgroundColor('#04060f');
  }

  setupControls() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Scroll to zoom (desktop)
    this.input.on('wheel', (_: any, __: any, ___: any, deltaY: number) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.8, 3.5);
      cam.setZoom(newZoom);
    });

    // Pinch-to-zoom (mobile)
    let lastPinchDist = 0;
    this.input.on('pointermove', () => {
      const ptrs = this.input.manager.pointers;
      const active = ptrs.filter(p => p.isDown);
      if (active.length === 2) {
        const dx = active[0].x - active[1].x;
        const dy = active[0].y - active[1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0) {
          const delta = dist - lastPinchDist;
          const cam = this.cameras.main;
          cam.setZoom(Phaser.Math.Clamp(cam.zoom + delta * 0.005, 0.8, 3.5));
        }
        lastPinchDist = dist;
      } else {
        lastPinchDist = 0;
      }
    });

    // Spacebar jump (desktop)
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Mobile jump button from React overlay
    OpenWorldScene.events.on('mobile:jump', () => { this.doJump(); });

    // Mobile fight button
    OpenWorldScene.events.on('mobile:fight', () => {
      if (this.battleTriggerCooldown > 0) return;
      this.checkBattleTriggers();
    });
  }

  setupMinimap() {
    // Small minimap in top-right (fixed to camera)
    this.minimap = this.add.graphics().setScrollFactor(0);
    this.onlineBadge = this.add.text(
      this.cameras.main.width - 10, 10,
      '● 1 online',
      { fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#00ff88' }
    ).setOrigin(1, 0).setScrollFactor(0);
  }

  setupSocket() {
    // Listen for React-side socket events dispatched to scene
    OpenWorldScene.events.on('world:players', (players: any[]) => {
      for (const p of players) {
        if (p.id !== this.playerData.socketId) this.addRemotePlayer(p);
      }
      this.updateOnlineCount(players.length + 1);
    });
    OpenWorldScene.events.on('world:player-joined', (p: any) => {
      this.addRemotePlayer(p);
    });
    OpenWorldScene.events.on('world:player-left', ({ playerId }: any) => {
      this.removeRemotePlayer(playerId);
    });
    OpenWorldScene.events.on('world:player-moved', ({ playerId, x, y }: any) => {
      const remote = this.remotePlayers.get(playerId);
      if (remote) { remote.targetX = x; remote.targetY = y; }
    });

    OpenWorldScene.events.on('world:chat', ({ playerId, message }: any) => {
      if (playerId === this.playerData.socketId) {
        this.showMyChatBubble(message);
      } else {
        this.showRemoteChatBubble(playerId, message);
      }
    });

    OpenWorldScene.events.on('world:emote', ({ playerId, emote }: any) => {
      if (playerId === this.playerData.socketId) {
        this.showMyChatBubble(emote);
      } else {
        this.showRemoteChatBubble(playerId, emote);
      }
    });
  }

  addRemotePlayer(data: any) {
    if (this.remotePlayers.has(data.id)) return;
    const col = parseInt((data.avatarColor1 || '#8b5cf6').replace('#', ''), 16);

    const body = this.add.rectangle(data.x || 1600, data.y || 980, 14, 20, col);
    body.setStrokeStyle(1, 0xffffff, 0.3).setAlpha(0.85);

    const nameTag = this.add.text(data.x || 1600, (data.y || 980) - 28, data.displayName || '?', {
      fontFamily: 'Orbitron', fontSize: '8px', color: '#cccccc',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    const levelBadge = this.add.text(data.x || 1600, (data.y || 980) - 38, `LVL ${data.level || 1}`, {
      fontFamily: 'Share Tech Mono', fontSize: '7px', color: '#888888',
    }).setOrigin(0.5);

    let glowCircle;
    if (data.hasGlow) {
      glowCircle = this.add.arc(data.x || 1600, data.y || 980, 20, 0, 360, false, col, 0.1);
    }

    this.remotePlayers.set(data.id, { body, nameTag, levelBadge, glowCircle, targetX: data.x || 1600, targetY: data.y || 980 });
  }

  removeRemotePlayer(id: string) {
    const remote = this.remotePlayers.get(id);
    if (remote) {
      remote.body.destroy();
      remote.nameTag.destroy();
      remote.levelBadge.destroy();
      remote.glowCircle?.destroy();
      this.remotePlayers.delete(id);
    }
  }

  updateOnlineCount(count: number) {
    this.onlineBadge.setText(`● ${count} online`);
  }

  showMyChatBubble(message: string) {
    this.myBubble?.text.destroy();
    this.myBubble?.bg.destroy();
    const short = message.slice(0, 32);
    const bg = this.add.rectangle(0, -60, short.length * 6 + 14, 18, 0x000000, 0.75);
    bg.setStrokeStyle(1, 0x00d4ff, 0.8);
    const text = this.add.text(0, -60, short, { fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#00d4ff' }).setOrigin(0.5);
    this.player.add(bg);
    this.player.add(text);
    this.myBubble = { text, bg, ttl: 3000 };
  }

  showRemoteChatBubble(playerId: string, message: string) {
    const remote = this.remotePlayers.get(playerId);
    if (!remote) return;
    const existing = this.chatBubbles.get(playerId);
    existing?.text.destroy();
    existing?.bg.destroy();
    const short = message.slice(0, 32);
    const bx = remote.body.x;
    const by = remote.body.y - 48;
    const bg = this.add.rectangle(bx, by, short.length * 6 + 14, 18, 0x000000, 0.75);
    bg.setStrokeStyle(1, 0xaaaaaa, 0.6);
    const text = this.add.text(bx, by, short, { fontFamily: 'Share Tech Mono', fontSize: '9px', color: '#cccccc' }).setOrigin(0.5);
    this.chatBubbles.set(playerId, { text, bg, ttl: 3000 });
  }

  detectCurrentZone(): string {
    const px = this.player.x;
    const py = this.player.y;
    for (const zone of ZONE_CONFIGS) {
      if (px >= zone.x && px <= zone.x + zone.width && py >= zone.y && py <= zone.y + zone.height) {
        return zone.name;
      }
    }
    if (px >= HUB_CONFIG.x && px <= HUB_CONFIG.x + HUB_CONFIG.width && py >= HUB_CONFIG.y && py <= HUB_CONFIG.y + HUB_CONFIG.height) {
      return 'Central Hub';
    }
    return 'Wilderness';
  }

  doJump() {
    if (this.isJumping || this.jumpCooldown > 0) return;
    this.isJumping = true;
    this.jumpCooldown = 600;
    // Phase 1: gather (squash down)
    this.tweens.add({
      targets: this.player,
      scaleX: 0.85, scaleY: 1.3,
      duration: 80, ease: 'Quad.easeOut',
      onComplete: () => {
        // Phase 2: pop (extend up)
        this.tweens.add({
          targets: this.player,
          scaleX: 1.2, scaleY: 0.75,
          duration: 100, ease: 'Quad.easeOut',
          onComplete: () => {
            // Phase 3: land bounce
            this.tweens.add({
              targets: this.player,
              scaleX: 0.9, scaleY: 1.1,
              duration: 90, ease: 'Bounce.easeOut',
              onComplete: () => {
                // Phase 4: settle
                this.tweens.add({
                  targets: this.player,
                  scaleX: 1, scaleY: 1,
                  duration: 120, ease: 'Elastic.easeOut',
                  onComplete: () => { this.isJumping = false; },
                });
                this.cameras.main.shake(50, 0.002);
              },
            });
          },
        });
      },
    });
  }

  update(time: number, delta: number) {
    this.movePlayer(delta);
    this.interpolateRemotePlayers(delta);
    this.checkMiniGamePortals();
    this.checkBattleTriggers();
    this.checkStudyNPCProximity(delta);
    this.updateMinimap();
    this.tickChatBubbles(delta);
    this.positionEmitTimer += delta;

    if (this.positionEmitTimer > 100) {
      this.positionEmitTimer = 0;
      const px = this.player.x;
      const py = this.player.y;
      OpenWorldScene.events.emit('player:moved', { x: Math.round(px), y: Math.round(py) });

      const zone = this.detectCurrentZone();
      if (zone !== this.currentZone) {
        this.currentZone = zone;
        OpenWorldScene.events.emit('player:zone-changed', { zone });
      }
    }

    if (this.battleTriggerCooldown > 0) this.battleTriggerCooldown -= delta;
    if (this.jumpCooldown > 0) this.jumpCooldown -= delta;
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.doJump();
  }

  tickChatBubbles(delta: number) {
    if (this.myBubble) {
      this.myBubble.ttl -= delta;
      if (this.myBubble.ttl <= 0) {
        this.myBubble.text.destroy();
        this.myBubble.bg.destroy();
        this.myBubble = undefined;
      } else {
        const alpha = Math.min(1, this.myBubble.ttl / 500);
        this.myBubble.text.setAlpha(alpha);
        this.myBubble.bg.setAlpha(alpha * 0.75);
      }
    }
    for (const [id, bubble] of this.chatBubbles) {
      bubble.ttl -= delta;
      if (bubble.ttl <= 0) {
        bubble.text.destroy();
        bubble.bg.destroy();
        this.chatBubbles.delete(id);
      } else {
        const remote = this.remotePlayers.get(id);
        if (remote) {
          bubble.bg.x = remote.body.x;
          bubble.bg.y = remote.body.y - 48;
          bubble.text.x = remote.body.x;
          bubble.text.y = remote.body.y - 48;
        }
        const alpha = Math.min(1, bubble.ttl / 500);
        bubble.text.setAlpha(alpha);
        bubble.bg.setAlpha(alpha * 0.75);
      }
    }
  }

  checkStudyNPCProximity(delta: number) {
    const px = this.player.x;
    const py = this.player.y;
    for (const npc of this.studyNPCs) {
      if (npc.talkCooldown > 0) {
        npc.talkCooldown -= delta;
        continue;
      }
      const dx = px - npc.container.x;
      const dy = py - npc.container.y;
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        npc.talkCooldown = 5000;
        OpenWorldScene.events.emit('npc:talk', { worldId: npc.worldId });
      }
    }
  }

  movePlayer(delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = this.playerSpeed;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    // Fall back to virtual joystick if no keyboard input
    if (vx === 0 && vy === 0) {
      vx = OpenWorldScene.joystickInput.vx * speed;
      vy = OpenWorldScene.joystickInput.vy * speed;
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    body.setVelocity(vx, vy);

    // Tilt player body when moving
    if (this.playerBody) {
      this.playerBody.setRotation(vx !== 0 ? (vx > 0 ? 0.08 : -0.08) : 0);
    }
  }

  interpolateRemotePlayers(delta: number) {
    const lerpSpeed = 8 * (delta / 1000);
    for (const [, remote] of this.remotePlayers) {
      remote.body.x += (remote.targetX - remote.body.x) * lerpSpeed;
      remote.body.y += (remote.targetY - remote.body.y) * lerpSpeed;
      remote.nameTag.x = remote.body.x;
      remote.nameTag.y = remote.body.y - 28;
      remote.levelBadge.x = remote.body.x;
      remote.levelBadge.y = remote.body.y - 38;
      if (remote.glowCircle) {
        remote.glowCircle.x = remote.body.x;
        remote.glowCircle.y = remote.body.y;
      }
    }
  }

  checkBattleTriggers() {
    if (this.battleTriggerCooldown > 0) return;
    const px = this.player.x;
    const py = this.player.y;

    // Check enemy NPC collisions (within 20px)
    for (const npc of this.enemyNPCs) {
      if ((npc as any).isDead) continue;
      const dx = px - npc.x;
      const dy = py - npc.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        const worldId = (npc as any).worldId || 1;
        this.triggerBattle(worldId, false, npc);
        return;
      }
    }

    // Check boss zone collisions
    for (const zone of this.bossZones) {
      const dx = px - (zone as any).zoneX;
      const dy = py - (zone as any).zoneY;
      if (Math.sqrt(dx * dx + dy * dy) < zone.radius * 0.8) {
        const worldId = (zone as any).worldId || 1;
        this.triggerBattle(worldId, true, null);
        return;
      }
    }
  }

  triggerBattle(worldId: number, isBoss: boolean, npc: Phaser.GameObjects.Container | null) {
    this.battleTriggerCooldown = 3000;

    // Flash screen
    this.cameras.main.flash(300, 0, 212, 255);

    setTimeout(() => {
      if (npc) {
        (npc as any).isDead = true;
        this.tweens.add({
          targets: npc,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          duration: 400,
          onComplete: () => npc.destroy(),
        });
      }
      OpenWorldScene.events.emit('battle:trigger', { worldId, isBoss });
    }, 300);
  }

  updateMinimap() {
    if (!this.minimap) return;
    const camWidth = this.cameras.main.width;
    const isMob = camWidth < 768;
    const mapW = isMob ? 80 : 120, mapH = isMob ? 60 : 90;
    const mapX = camWidth - mapW - 10;
    const mapY = 40;
    const scaleX = mapW / WORLD_SIZE.width;
    const scaleY = mapH / WORLD_SIZE.height;

    this.minimap.clear();
    this.minimap.fillStyle(0x0a0e1a, 0.8);
    this.minimap.fillRect(mapX, mapY, mapW, mapH);
    this.minimap.lineStyle(1, 0x00d4ff, 0.4);
    this.minimap.strokeRect(mapX, mapY, mapW, mapH);

    // Draw zones
    for (const zone of ZONE_CONFIGS) {
      const col = WORLD_COLORS[zone.worldId] || 0x333333;
      this.minimap.fillStyle(col, 0.2);
      this.minimap.fillRect(mapX + zone.x * scaleX, mapY + zone.y * scaleY, zone.width * scaleX, zone.height * scaleY);
    }

    // Draw player
    this.minimap.fillStyle(0xffffff, 1);
    this.minimap.fillCircle(mapX + this.player.x * scaleX, mapY + this.player.y * scaleY, 2);

    // Draw remote players
    this.minimap.fillStyle(0x00ff88, 0.8);
    for (const [, remote] of this.remotePlayers) {
      this.minimap.fillCircle(mapX + remote.body.x * scaleX, mapY + remote.body.y * scaleY, 1.5);
    }
  }

  refreshCompletedWorlds(completed: number[]) {
    this.completedWorlds = completed;
  }
}
