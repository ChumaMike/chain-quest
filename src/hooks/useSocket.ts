import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMultiplayerStore } from '../store/multiplayerStore';
import type { Question } from '../types';
import { WS_URL } from '../lib/api';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const store = useMultiplayerStore();
  const listenersAttached = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) socket.connect();
    store.setSocketId(socket.id || '');

    if (listenersAttached.current) return;
    listenersAttached.current = true;

    socket.on('connect', () => {
      store.setSocketId(socket.id || '');
      // Rejoin active battle room on reconnect
      const { room } = useMultiplayerStore.getState();
      if (room?.code && room.phase === 'battle') {
        socket.emit('battle:rejoin', { code: room.code });
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      useMultiplayerStore.getState().setReconnecting(true, 0);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('reconnect_attempt', (attempt: number) => {
      useMultiplayerStore.getState().setReconnecting(true, attempt);
    });

    socket.on('reconnect', () => {
      useMultiplayerStore.getState().setReconnecting(false, 0);
    });

    socket.on('reconnect_failed', () => {
      useMultiplayerStore.getState().setReconnecting(false, -1); // -1 = failed
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socket.on('room:created', ({ room }) => {
      store.setRoom(room);
      store.setRoomError(null);
    });

    socket.on('room:joined', ({ room }) => {
      store.setRoom(room);
      store.setRoomError(null);
    });

    socket.on('room:updated', ({ room }) => {
      store.updateRoom(room);
    });

    socket.on('room:error', ({ message }: { message: string }) => {
      console.warn('[Socket] Room error:', message);
      store.setRoomError(message);
    });

    socket.on('battle:countdown', ({ count }: { count: number }) => {
      store.setCountdown(count);
    });

    socket.on('battle:start', ({ worldId, players, bossMaxHP }: { worldId: number; players: any[]; bossMaxHP: number }) => {
      store.startBattle({ worldId: worldId || store.room?.worldId || 1, players, bossMaxHP });
      store.setCountdown(null);
    });

    socket.on('battle:question', (data: {
      question: Question;
      index: number;
      total: number;
      bossHP: number;
      bossMaxHP: number;
    }) => {
      store.setQuestion(data);
    });

    socket.on('battle:timer', ({ remaining }: { remaining: number }) => {
      store.setTimeRemaining(remaining);
    });

    socket.on('battle:player-answered', ({ playerId }: { playerId: string }) => {
      const { room } = store;
      if (!room) return;
      const updated = {
        ...room,
        players: room.players.map(p => p.id === playerId ? { ...p, hasAnswered: true } : p),
      };
      store.updateRoom(updated);
    });

    socket.on('battle:reveal', (data: any) => {
      store.setReveal(data);
      const { room } = store;
      if (!room) return;
      const updated = {
        ...room,
        players: room.players.map(p => {
          const result = data.results[p.id];
          if (!result) return p;
          return { ...p, score: result.newScore, currentHP: result.newHP, streak: result.newStreak };
        }),
      };
      store.updateRoom(updated);
    });

    socket.on('battle:boss-hit', ({ bossHP }: { totalDamage: number; bossHP: number }) => {
      store.updateBossHP(bossHP);
    });

    socket.on('battle:eliminated', ({ playerId }: { playerId: string }) => {
      const { room } = store;
      if (!room) return;
      store.updateRoom({
        ...room,
        players: room.players.map(p => p.id === playerId ? { ...p, isEliminated: true } : p),
      });
    });

    socket.on('battle:end', ({ rankings, bossDefeated, rewards }: { rankings: any[]; bossDefeated: boolean; rewards?: Record<string, { xpGained: number; cqtGained: number; rank: number }> }) => {
      store.setRankings(rankings, bossDefeated);
      // Normalize reward field names (server uses xpGained/cqtGained, client expects xp/cqt)
      if (rewards) {
        const normalized: Record<string, { xp: number; cqt: number }> = {};
        for (const [id, r] of Object.entries(rewards)) {
          normalized[id] = { xp: r.xpGained, cqt: r.cqtGained };
        }
        useMultiplayerStore.getState().setBattleRewards(normalized);
      }
    });

    socket.on('battle:chat', (data: { displayName: string; heroClass: string; message: string }) => {
      useMultiplayerStore.getState().addBattleMessage(data);
    });

    socket.on('battle:rewards', (rewards: Record<string, { xp: number; cqt: number }>) => {
      useMultiplayerStore.getState().setBattleRewards(rewards);
    });

    socket.on('battle:state-sync', (data: any) => {
      const store = useMultiplayerStore.getState();
      store.setReconnecting(false, 0);
      if (data.currentQuestion) store.setQuestion({ question: data.currentQuestion, index: data.questionIndex, total: data.totalQuestions || 10, bossHP: data.bossHP, bossMaxHP: data.bossMaxHP });
      if (data.timeRemaining !== undefined) store.setTimeRemaining(data.timeRemaining);
    });

    return () => {
      // Don't disconnect on component unmount — socket is singleton
    };
  }, []);

  const socket = getSocket();

  return {
    socket,
    createRoom: (displayName: string, heroClass: string, worldId: number) => {
      socket.emit('room:create', { displayName, heroClass, worldId });
    },
    joinRoom: (code: string, displayName: string, heroClass: string) => {
      socket.emit('room:join', { code, displayName, heroClass });
    },
    leaveRoom: () => {
      socket.emit('room:leave');
      useMultiplayerStore.getState().reset();
    },
    setReady: (code: string, ready: boolean) => {
      socket.emit('lobby:ready', { code, ready });
    },
    startGame: (code: string) => {
      socket.emit('battle:start', { code });
    },
    submitAnswer: (code: string, questionId: string, answerIndex: number, timeRemaining: number) => {
      socket.emit('battle:answer', { code, questionId, answerIndex, timeRemaining });
      useMultiplayerStore.getState().setAnswered(true);
    },
    sendBattleChat: (code: string, message: string) => {
      socket.emit('battle:chat', { code, message });
    },
    joinWorld: (playerData: any) => {
      socket.emit('world:join', playerData);
    },
    moveInWorld: (x: number, y: number, direction: string, isMoving: boolean) => {
      socket.emit('world:move', { x, y, direction, isMoving });
    },
    leaveWorld: () => {
      socket.emit('world:leave');
    },
    sendWorldChat: (message: string) => {
      socket.emit('world:chat', { message });
    },
    sendEmote: (emote: string) => {
      socket.emit('world:emote', { emote });
    },
    announceBossClear: (worldId: number, worldName: string, bossName: string) => {
      socket.emit('world:boss-clear', { worldId, worldName, bossName });
    },
  };
}
