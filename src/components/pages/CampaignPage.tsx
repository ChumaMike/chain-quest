import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { WORLDS } from '../../data/curriculum';
import { ZONE_CONFIGS } from '../../data/worldZones';
import ProgressBar from '../ui/ProgressBar';
import PageWrapper from '../ui/PageWrapper';

export default function CampaignPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { completedWorlds, currentLevel, totalXP, worldProgress } = useGameStore();
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  const xpToNext = Math.floor(100 * Math.pow(currentLevel, 1.4));
  const totalStars = Object.values(worldProgress).reduce((sum, p) => sum + (p?.stars ?? 0), 0);

  const WORLD_MAP_SIZE = { width: 3200, height: 4000 };
  const worldNodes = WORLDS.map(world => {
    const zone = ZONE_CONFIGS.find(z => z.worldId === world.id);
    const x = zone ? ((zone.x + zone.width / 2) / WORLD_MAP_SIZE.width) * 100 : 50;
    const y = zone ? ((zone.y + zone.height / 2) / WORLD_MAP_SIZE.height) * 100 : 50;
    return { ...world, x, y };
  });
  const worldEdges = worldNodes
    .sort((a, b) => a.id - b.id)
    .slice(0, -1)
    .map((node, idx, arr) => ({
      from: node,
      to: arr[idx + 1],
    }));

  const handleEnter = (worldId: number, unlockLevel: number) => {
    if (unlockLevel > currentLevel) {
      setLockedMsg(`Requires Level ${unlockLevel} — you are Level ${currentLevel}`);
      setTimeout(() => setLockedMsg(null), 3000);
      return;
    }
    const zone = ZONE_CONFIGS.find(z => z.worldId === worldId);
    navigate('/world', { state: { zoneSpawn: { x: zone?.spawnX ?? 1600, y: zone?.spawnY ?? 980 } } });
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

          {/* Web-style campaign map */}
          <div className="campaign-web-map relative overflow-hidden rounded-3xl border border-neon-cyan/20 bg-dark-800/40 p-4 mb-8">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {worldEdges.map((edge, idx) => {
                const isFromComplete = completedWorlds.includes(edge.from.id);
                const isToComplete = completedWorlds.includes(edge.to.id);
                return (
                  <line
                    key={`line-${idx}`}
                    x1={edge.from.x}
                    y1={edge.from.y}
                    x2={edge.to.x}
                    y2={edge.to.y}
                    stroke={isFromComplete && isToComplete ? '#00ff88' : '#00d4ff'}
                    strokeWidth="0.35"
                    strokeLinecap="round"
                    className="web-connection"
                  />
                );
              })}
            </svg>

            {worldNodes.map(world => {
              const isCompleted = completedWorlds.includes(world.id);
              const isLocked = world.unlockLevel > currentLevel;
              const isNext = !isLocked && !isCompleted && (world.id === 1 || completedWorlds.includes(world.id - 1));
              const progress = worldProgress[world.id];
              const stars = progress?.stars ?? 0;

              const nodeState = isCompleted ? 'completed' : isNext ? 'next' : isLocked ? 'locked' : 'unlocked';

              return (
                <button
                  key={`node-${world.id}`}
                  onClick={() => !isLocked && handleEnter(world.id, world.unlockLevel)}
                  className={`world-node absolute -translate-x-1/2 -translate-y-1/2 ${nodeState}`}
                  style={{ top: `${world.y}%`, left: `${world.x}%` }}
                >
                  <div className="node-ring" />
                  <div className="node-core" style={{ backgroundColor: world.color }}>
                    <span className="text-lg">{world.emoji}</span>
                  </div>
                  <div className="node-label">
                    <div className="font-orbitron text-[10px] leading-none">{world.name}</div>
                    <div className="font-mono text-[10px]">{world.topic}</div>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1, 2, 3].map(s => (
                        <span key={s} className={`text-[9px] ${s <= stars ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  {isLocked && <div className="node-lock">🔒</div>}
                </button>
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
