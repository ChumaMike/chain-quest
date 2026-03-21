import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { useSocket } from '../../hooks/useSocket';
import { WORLDS } from '../../data/curriculum';
import { HEROES } from '../../data/heroes';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

export default function MultiplayerLobbyPage() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { room } = useMultiplayerStore();
  const socket = useSocket();
  const { createRoom, joinRoom, leaveRoom, setReady, startGame } = socket;

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [selectedWorld, setSelectedWorld] = useState(1);
  const [heroClass, setHeroClass] = useState('validator');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!user || !token) return;
    fetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setHeroClass(data.profile?.hero_class || 'validator');
        setDisplayName(data.profile?.display_name || user.username);
      });
  }, [user, token]);

  useEffect(() => {
    if (room) {
      setLoading(false);
      setLocalError('');
    }
  }, [room]);

  useEffect(() => {
    const handler = ({ message }: { message: string }) => {
      setLoading(false);
      setLocalError(message);
    };
    socket.socket.on('room:error', handler);
    return () => { socket.socket.off('room:error', handler); };
  }, []);

  const handleCreate = () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setLocalError('');
    createRoom(displayName.trim(), heroClass, selectedWorld);
  };

  const handleJoin = () => {
    if (!joinCode.trim() || !displayName.trim()) return;
    setLoading(true);
    setLocalError('');
    joinRoom(joinCode.trim().toUpperCase(), displayName.trim(), heroClass);
  };

  const handleLeave = () => {
    leaveRoom();
    setMode('menu');
  };

  const handleStartGame = () => {
    if (!room) return;
    startGame(room.code);
    navigate(`/multiplayer/room/${room.code}`);
  };

  const myPlayer = room?.players.find(p => p.displayName === displayName);
  const isHost = myPlayer?.isHost;
  const allReady = room?.players.every(p => p.isReady) && (room?.players.length || 0) >= 2;

  if (room) {
    const world = WORLDS.find(w => w.id === room.worldId);
    return (
      <PageWrapper>
        <div className="min-h-screen bg-grid pt-16 pb-10 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="font-orbitron font-black text-2xl text-white mb-1">MULTIPLAYER LOBBY</h1>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-slate-500 text-sm font-mono">ROOM CODE:</span>
                <span className="font-orbitron text-2xl text-neon-cyan glow-cyan tracking-widest">{room.code}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(room.code)}
                  className="text-xs font-mono text-slate-600 border border-white/10 px-2 py-1 rounded hover:text-white transition-colors"
                >
                  COPY
                </button>
              </div>
            </div>

            {/* World info */}
            {world && (
              <div className="neon-border-cyan bg-dark-800 rounded-xl p-4 mb-6 flex items-center gap-4">
                <div className="text-4xl">{world.boss.emoji}</div>
                <div>
                  <div className="font-orbitron text-sm font-bold" style={{ color: world.color }}>{world.name.toUpperCase()}</div>
                  <div className="text-slate-500 text-xs font-mono">{world.boss.name} · {world.questions.length} Questions</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-orbitron text-xs text-neon-amber">{world.cqtReward} CQT</div>
                  <div className="text-slate-600 text-xs">REWARD</div>
                </div>
              </div>
            )}

            {/* Players grid */}
            <div className="neon-border-purple bg-dark-800 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-orbitron text-sm text-neon-purple">PLAYERS ({room.players.length}/8)</h2>
                <div className="flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < room.players.length ? 'bg-neon-green' : 'bg-dark-700'}`} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {room.players.map((p, i) => {
                  const hero = HEROES.find(h => h.id === p.heroClass) || HEROES[0];
                  const isMe = p.displayName === displayName;
                  return (
                    <motion.div
                      key={p.id || i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${isMe ? 'border-neon-cyan/40 bg-neon-cyan/5' : 'border-white/10 bg-dark-900'}`}
                    >
                      <div className="text-2xl">{hero.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-orbitron text-xs truncate" style={{ color: isMe ? '#00d4ff' : '#e2e8f0' }}>
                          {p.displayName} {isMe && '(you)'}
                        </div>
                        <div className="text-slate-600 text-xs font-mono">{hero.name}</div>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isReady ? 'bg-neon-green' : 'bg-slate-700'}`} />
                    </motion.div>
                  );
                })}

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 2 - room.players.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-3 rounded-lg border border-white/5 border-dashed">
                    <div className="text-slate-700 text-xs font-mono text-center">Waiting...</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {myPlayer && !myPlayer.isReady && (
                <Button onClick={() => setReady(room!.code, true)} variant="neon" className="w-full">
                  ✓ READY UP
                </Button>
              )}
              {myPlayer?.isReady && !isHost && (
                <div className="text-center text-neon-green font-orbitron text-sm">
                  ✓ YOU'RE READY — Waiting for host to start...
                </div>
              )}
              {isHost && (
                <Button
                  onClick={handleStartGame}
                  disabled={!allReady}
                  variant="primary"
                  className="w-full"
                >
                  {allReady ? '⚡ START BATTLE' : `Waiting for all players to ready (${room.players.filter(p => p.isReady).length}/${room.players.length})`}
                </Button>
              )}
              <Button onClick={handleLeave} variant="ghost" className="w-full">← LEAVE LOBBY</Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-16 pb-10 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-orbitron font-black text-3xl text-white mb-2">
              MULTI<span className="text-neon-purple glow-purple">PLAYER</span>
            </h1>
            <p className="text-slate-500 text-sm">Battle together, learn together</p>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="neon-border-cyan bg-dark-800 rounded-xl p-6">
                  <div className="text-4xl mb-3">⚔️</div>
                  <h2 className="font-orbitron font-bold text-sm text-neon-cyan mb-1">CREATE ROOM</h2>
                  <p className="text-slate-500 text-xs mb-4">Host a battle for up to 8 players. Choose the world and share your code.</p>
                  <Button onClick={() => setMode('create')} variant="neon" className="w-full">
                    + CREATE ROOM
                  </Button>
                </div>

                <div className="neon-border-purple bg-dark-800 rounded-xl p-6">
                  <div className="text-4xl mb-3">🎮</div>
                  <h2 className="font-orbitron font-bold text-sm text-neon-purple mb-1">JOIN ROOM</h2>
                  <p className="text-slate-500 text-xs mb-4">Enter a 6-character room code to join an existing battle.</p>
                  <Button onClick={() => setMode('join')} variant="secondary" className="w-full">
                    ENTER CODE →
                  </Button>
                </div>

                <div className="neon-border-green bg-dark-800 rounded-xl p-4 text-center">
                  <div className="text-slate-400 text-xs font-mono">
                    📡 All players see the same questions simultaneously<br />
                    🏆 Share boss HP — teamwork wins faster<br />
                    ⚡ First correct answer = bonus points
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="neon-border-cyan bg-dark-800 rounded-xl p-6 space-y-5"
              >
                <h2 className="font-orbitron text-sm text-neon-cyan">CREATE BATTLE ROOM</h2>

                <div>
                  <label className="font-orbitron text-xs text-slate-400 mb-2 block">DISPLAY NAME</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={16}
                    className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan/50"
                    placeholder="Your in-game name"
                  />
                </div>

                <div>
                  <label className="font-orbitron text-xs text-slate-400 mb-2 block">SELECT WORLD</label>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {WORLDS.map(w => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWorld(w.id)}
                        className={`text-left p-3 rounded-lg border transition-all ${selectedWorld === w.id ? 'border-neon-cyan/50 bg-neon-cyan/10' : 'border-white/10 bg-dark-900 hover:border-white/20'}`}
                      >
                        <div className="text-lg mb-0.5">{w.boss.emoji}</div>
                        <div className="font-orbitron text-xs font-bold" style={{ color: w.color }}>{w.name}</div>
                        <div className="text-slate-600 text-xs">{w.cqtReward} CQT</div>
                      </button>
                    ))}
                  </div>
                </div>

                {localError && (
                  <div className="px-4 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono">
                    ⚠ {localError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={() => { setMode('menu'); setLocalError(''); }} variant="ghost" className="flex-1">← BACK</Button>
                  <Button onClick={handleCreate} loading={loading} variant="neon" className="flex-1" disabled={!displayName.trim()}>
                    CREATE →
                  </Button>
                </div>
              </motion.div>
            )}

            {mode === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="neon-border-purple bg-dark-800 rounded-xl p-6 space-y-5"
              >
                <h2 className="font-orbitron text-sm text-neon-purple">JOIN BATTLE ROOM</h2>

                <div>
                  <label className="font-orbitron text-xs text-slate-400 mb-2 block">DISPLAY NAME</label>
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={16}
                    className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan/50"
                    placeholder="Your in-game name"
                  />
                </div>

                <div>
                  <label className="font-orbitron text-xs text-slate-400 mb-2 block">ROOM CODE</label>
                  <input
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-neon-cyan font-orbitron text-2xl tracking-widest text-center focus:outline-none focus:border-neon-cyan/50 uppercase"
                    placeholder="XXXXXX"
                    maxLength={6}
                  />
                </div>

                {localError && (
                  <div className="px-4 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono">
                    ⚠ {localError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={() => { setMode('menu'); setLocalError(''); }} variant="ghost" className="flex-1">← BACK</Button>
                  <Button
                    onClick={handleJoin}
                    loading={loading}
                    variant="secondary"
                    className="flex-1"
                    disabled={joinCode.length !== 6 || !displayName.trim()}
                  >
                    JOIN →
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
