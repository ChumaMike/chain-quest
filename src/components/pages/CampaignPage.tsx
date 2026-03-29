import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { WORLDS } from '../../data/curriculum';
import ProgressBar from '../ui/ProgressBar';
import PageWrapper from '../ui/PageWrapper';

export default function CampaignPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { completedWorlds, currentLevel, totalXP, worldProgress } = useGameStore();
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  const xpToNext = Math.floor(100 * Math.pow(currentLevel, 1.4));
  const totalStars = Object.values(worldProgress).reduce((sum, p) => sum + (p?.stars ?? 0), 0);

  const handleEnter = (worldId: number, unlockLevel: number) => {
    if (unlockLevel > currentLevel) {
      setLockedMsg(`Requires Level ${unlockLevel} — you are Level ${currentLevel}`);
      setTimeout(() => setLockedMsg(null), 3000);
      return;
    }
    navigate(`/battle/${worldId}`);
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-16 pb-12 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="font-orbitron font-black text-2xl text-white">
                CAMPAIGN <span className="text-neon-cyan glow-cyan">MAP</span>
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Welcome back, <span className="text-slate-300">{user?.username}</span> — conquer all 16 worlds to master Web3.
              </p>
            </div>
            <button
              onClick={() => navigate('/multiplayer')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-orbitron text-xs font-bold border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 transition-all self-start sm:self-auto"
            >
              ⚔ PLAY WITH FRIENDS
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="neon-border-cyan bg-dark-800/60 rounded-lg px-4 py-3 backdrop-blur-sm">
              <div className="font-orbitron text-xs text-slate-500 mb-1">LEVEL</div>
              <div className="font-orbitron text-xl text-neon-cyan font-black">{currentLevel}</div>
            </div>
            <div className="neon-border-green bg-dark-800/60 rounded-lg px-4 py-3 backdrop-blur-sm">
              <div className="font-orbitron text-xs text-slate-500 mb-1">WORLDS</div>
              <div className="font-orbitron text-xl text-neon-green font-black">{completedWorlds.length}<span className="text-slate-600 text-sm">/16</span></div>
            </div>
            <div className="neon-border-purple bg-dark-800/60 rounded-lg px-4 py-3 backdrop-blur-sm">
              <div className="font-orbitron text-xs text-slate-500 mb-1">TOTAL XP</div>
              <div className="font-orbitron text-xl text-neon-purple font-black">{totalXP.toLocaleString()}</div>
            </div>
            <div className="bg-dark-800/60 border border-yellow-500/20 rounded-lg px-4 py-3 backdrop-blur-sm">
              <div className="font-orbitron text-xs text-slate-500 mb-1">STARS</div>
              <div className="font-orbitron text-xl text-yellow-400 font-black">{totalStars}<span className="text-slate-600 text-sm">/{16 * 3}</span></div>
            </div>
          </div>

          {/* XP progress */}
          <div className="neon-border-cyan bg-dark-800/60 rounded-lg px-4 py-3 backdrop-blur-sm mb-8">
            <div className="flex justify-between mb-2">
              <span className="font-orbitron text-xs text-neon-cyan">XP TO LEVEL {currentLevel + 1}</span>
              <span className="font-mono text-xs text-slate-500">{totalXP} / {xpToNext}</span>
            </div>
            <ProgressBar value={totalXP} max={xpToNext} color="#00d4ff" height={6} />
          </div>

          {/* Campaign progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-orbitron text-xs text-slate-400">CAMPAIGN PROGRESS</span>
              <span className="font-orbitron text-xs text-neon-green">{Math.round((completedWorlds.length / 16) * 100)}%</span>
            </div>
            <ProgressBar value={completedWorlds.length} max={16} color="#00ff88" height={8} />
          </div>

          {/* World grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {WORLDS.map((world, idx) => {
              const isCompleted = completedWorlds.includes(world.id);
              const isLocked = world.unlockLevel > currentLevel;
              const isNext = !isLocked && !isCompleted && (idx === 0 || completedWorlds.includes(world.id - 1) || completedWorlds.length >= idx);
              const progress = worldProgress[world.id];
              const stars = progress?.stars ?? 0;

              let borderColor = 'border-white/10';
              let glowStyle = {};
              if (isCompleted) { borderColor = 'border-neon-green/40'; glowStyle = { boxShadow: '0 0 12px rgba(0,255,136,0.1)' }; }
              else if (isNext) { borderColor = 'border-neon-cyan/40'; glowStyle = { boxShadow: '0 0 12px rgba(0,212,255,0.1)' }; }
              else if (!isLocked) { borderColor = 'border-white/15'; }

              return (
                <motion.div
                  key={world.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`relative bg-dark-800/70 backdrop-blur-sm rounded-xl border ${borderColor} overflow-hidden transition-all ${isLocked ? 'opacity-40' : 'hover:scale-[1.02] hover:border-opacity-80 cursor-pointer'}`}
                  style={glowStyle}
                  onClick={() => !isLocked && handleEnter(world.id, world.unlockLevel)}
                >
                  {/* World number badge */}
                  <div className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center font-orbitron text-xs font-black"
                    style={{ background: isCompleted ? '#00ff8820' : '#ffffff10', color: isCompleted ? '#00ff88' : '#888', border: `1px solid ${isCompleted ? '#00ff8840' : '#ffffff20'}` }}>
                    {world.id}
                  </div>

                  {/* Completion badge */}
                  {isCompleted && (
                    <div className="absolute top-3 right-3 font-orbitron text-xs text-neon-green">✓</div>
                  )}
                  {isLocked && (
                    <div className="absolute top-3 right-3 text-sm">🔒</div>
                  )}
                  {isNext && !isCompleted && (
                    <div className="absolute top-3 right-3">
                      <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse inline-block" />
                    </div>
                  )}

                  <div className="px-4 pb-4 pt-12">
                    {/* Emoji + name */}
                    <div className="text-2xl mb-1">{world.emoji}</div>
                    <div className="font-orbitron font-bold text-sm text-white leading-tight mb-0.5">{world.name}</div>
                    <div className="font-mono text-xs mb-3" style={{ color: world.color }}>{world.topic}</div>

                    {/* Stars */}
                    <div className="flex gap-0.5 mb-3">
                      {[1, 2, 3].map(s => (
                        <span key={s} className={`text-sm ${s <= stars ? 'text-yellow-400' : 'text-slate-800'}`}>★</span>
                      ))}
                    </div>

                    {/* Status / action */}
                    {isLocked ? (
                      <div className="font-orbitron text-xs text-slate-600">
                        LVL {world.unlockLevel} required
                      </div>
                    ) : isCompleted ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/battle/${world.id}`); }}
                        className="w-full py-1.5 rounded font-orbitron text-xs border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all"
                      >
                        REPLAY
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEnter(world.id, world.unlockLevel); }}
                        className="w-full py-1.5 rounded font-orbitron text-xs font-bold transition-all"
                        style={{ background: world.color + '22', border: `1px solid ${world.color}44`, color: world.color }}
                      >
                        ▶ ENTER
                      </button>
                    )}
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: isCompleted ? '#00ff8840' : isNext ? '#00d4ff30' : 'transparent' }} />
                </motion.div>
              );
            })}
          </div>

          {/* Locked notification */}
          <AnimatePresence>
            {lockedMsg && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
              >
                <div className="bg-dark-900/95 backdrop-blur-sm rounded-xl border border-red-500/40 px-6 py-3 text-center">
                  <div className="text-xl mb-1">🔒</div>
                  <div className="font-orbitron text-xs text-red-400">{lockedMsg}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </PageWrapper>
  );
}
