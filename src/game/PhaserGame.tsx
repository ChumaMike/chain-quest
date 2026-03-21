import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from './config';
import OpenWorldScene from './scenes/OpenWorldScene';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface PhaserGameProps {
  playerData: {
    displayName: string;
    heroClass: string;
    avatarColor1: string;
    avatarColor2: string;
    avatarStyle: number;
    level: number;
    worldX: number;
    worldY: number;
    hasGlow: boolean;
    socketId?: string;
  };
  completedWorlds: number[];
  onBattleTrigger: (worldId: number, isBoss: boolean) => void;
  onZoneChanged?: (zone: string) => void;
  onNpcTalk?: (worldId: number) => void;
}

export default function PhaserGame({ playerData, completedWorlds, onBattleTrigger, onZoneChanged, onNpcTalk }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const socket = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createPhaserConfig('phaser-game');
    const game = new Phaser.Game({
      ...config,
      scene: config.scene,
    });
    gameRef.current = game;

    // Registry is available immediately after game construction — scenes read it in create()
    game.registry.set('playerData', { ...playerData, socketId: socket.socket.id });
    game.registry.set('completedWorlds', completedWorlds);

    // Listen for battle triggers from Phaser
    OpenWorldScene.events.on('battle:trigger', ({ worldId, isBoss }: { worldId: number; isBoss: boolean }) => {
      onBattleTrigger(worldId, isBoss);
    });

    // Listen for player movement and emit to socket
    OpenWorldScene.events.on('player:moved', ({ x, y }: { x: number; y: number }) => {
      socket.moveInWorld(x, y, 'down', true);
    });

    // Zone detection
    OpenWorldScene.events.on('player:zone-changed', ({ zone }: { zone: string }) => {
      onZoneChanged?.(zone);
    });

    // Study NPC talk
    OpenWorldScene.events.on('npc:talk', ({ worldId }: { worldId: number }) => {
      onNpcTalk?.(worldId);
    });

    // Socket world events → Phaser
    socket.joinWorld({
      userId: undefined,
      displayName: playerData.displayName,
      heroClass: playerData.heroClass,
      avatarStyle: playerData.avatarStyle,
      avatarColor1: playerData.avatarColor1,
      avatarColor2: playerData.avatarColor2,
      level: playerData.level,
      x: playerData.worldX,
      y: playerData.worldY,
      hasGlow: playerData.hasGlow,
    });

    socket.socket.on('world:players', (data: any) => {
      OpenWorldScene.events.emit('world:players', data.players);
    });
    socket.socket.on('world:player-joined', (data: any) => {
      OpenWorldScene.events.emit('world:player-joined', data.player);
    });
    socket.socket.on('world:player-left', (data: any) => {
      OpenWorldScene.events.emit('world:player-left', data);
    });
    socket.socket.on('world:player-moved', (data: any) => {
      OpenWorldScene.events.emit('world:player-moved', data);
    });
    socket.socket.on('world:chat', (data: any) => {
      OpenWorldScene.events.emit('world:chat', data);
    });
    socket.socket.on('world:emote', (data: any) => {
      OpenWorldScene.events.emit('world:emote', data);
    });

    return () => {
      socket.leaveWorld();
      OpenWorldScene.events.removeAllListeners();
      socket.socket.off('world:players');
      socket.socket.off('world:player-joined');
      socket.socket.off('world:player-left');
      socket.socket.off('world:player-moved');
      socket.socket.off('world:chat');
      socket.socket.off('world:emote');
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Update completed worlds in scene and registry when they change
  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('completedWorlds', completedWorlds);
    const scene = gameRef.current.scene.getScene('OpenWorldScene') as OpenWorldScene;
    if (scene) scene.refreshCompletedWorlds(completedWorlds);
  }, [completedWorlds]);

  return (
    <div
      id="phaser-game"
      ref={containerRef}
      className="w-full h-full"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
}
