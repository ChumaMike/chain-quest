import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { WORLDS } from '../../data/curriculum';
import { TIER_INFO, KARABO_BOSS_DEFEAT } from '../../data/karabo';
import { WORLD_MINI_GAME } from '../../data/worldMiniGame';
import ProgressBar from '../ui/ProgressBar';
import PageWrapper from '../ui/PageWrapper';

export default function CampaignPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { completedWorlds, currentLevel, totalXP, worldProgress } = useGameStore();
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  const [hoveredWorld, setHoveredWorld] = useState<number | null>(null);

  const xpToNext = Math.floor(100 * Math.pow(currentLevel, 1.4));
  const totalStars = Object.values(worldProgress).reduce((sum, p) => sum + (p?.stars ?? 0), 0);

  const handleEnter = (worldId: number, unlockLevel: number) => {
    if (unlockLevel > currentLevel) {
      setLockedMsg(`Requires Level ${unlockLevel} — you are Level ${currentLevel}`);
      setTimeout(() => setLockedMsg(null), 3000);
      return;
    }
    const cfg = WORLD_MINI_GAME[worldId];
    navigate(`${cfg.route}?world=${worldId}`);
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-16 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

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
          <div className="mb-10">
            <div className="flex items-center justify-between mb-2">
              <span className="font-orbitron text-xs text-slate-400">CAMPAIGN PROGRESS</span>
              <span className="font-orbitron text-xs text-neon-green">{Math.round((completedWorlds.length / 16) * 100)}%</span>
            </div>
            <ProgressBar value={completedWorlds.length} max={16} color="#00ff88" height={8} />
          </div>

          {/* Tier sections */}
          {TIER_INFO.map((tier) => {
            const tierWorlds = WORLDS.filter(w => tier.worlds.includes(w.id));
            const tierCompleted = tierWorlds.filter(w => completedWorlds.includes(w.id)).length;
            const tierUnlocked = tierWorlds.some(w => w.unlockLevel <= currentLevel);

            return (
              <div key={tier.tier} className="mb-12">
                {/* Tier banner */}
                <div
                  className="relative rounded-xl px-5 py-4 mb-5 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${tier.color}12 0%, transparent 60%)`, border: `1px solid ${tier.color}30` }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-orbitron text-xs font-bold px-2 py-0.5 rounded" style={{ background: tier.color + '25', color: tier.color }}>
                          TIER {tier.tier}
                        </span>
                        <span className="font-orbitron text-sm font-black text-white tracking-widest">{tier.name}</span>
                      </div>
                      <p className="font-mono text-xs text-slate-400 max-w-xl">{tier.arc}</p>
                    </div>
                    <div className="font-orbitron text-xs text-slate-500">
                      {tierCompleted}/{tierWorlds.length} cleared
                    </div>
                  </div>
                  {/* Glow line */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${tier.color}60, transparent)` }} />
                </div>

                {/* World cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tierWorlds.map((world, idx) => {
                    const isCompleted = completedWorlds.includes(world.id);
                    const isLocked = world.unlockLevel > currentLevel;
                    const globalIdx = WORLDS.findIndex(w => w.id === world.id);
                    const isNext = !isLocked && !isCompleted && (globalIdx === 0 || completedWorlds.includes(world.id - 1) || completedWorlds.length >= globalIdx);
                    const progress = worldProgress[world.id];
                    const stars = progress?.stars ?? 0;
                    const isHovered = hoveredWorld === world.id;

                    let borderColor = 'border-white/10';
                    let glowStyle: React.CSSProperties = {};
                    if (isCompleted) { borderColor = 'border-neon-green/40'; glowStyle = { boxShadow: '0 0 16px rgba(0,255,136,0.12)' }; }
                    else if (isNext) { borderColor = 'border-neon-cyan/40'; glowStyle = { boxShadow: '0 0 16px rgba(0,212,255,0.12)' }; }

                    return (
                      <motion.div
                        key={world.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className={`relative bg-dark-800/70 backdrop-blur-sm rounded-xl border ${borderColor} overflow-hidden transition-all ${isLocked ? 'opacity-40' : 'hover:scale-[1.02] cursor-pointer'}`}
                        style={glowStyle}
                        onClick={() => !isLocked && handleEnter(world.id, world.unlockLevel)}
                        onMouseEnter={() => setHoveredWorld(world.id)}
                        onMouseLeave={() => setHoveredWorld(null)}
                      >
                        {/* World number badge */}
                        <div
                          className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center font-orbitron text-xs font-black"
                          style={{ background: isCompleted ? '#00ff8820' : '#ffffff10', color: isCompleted ? '#00ff88' : '#888', border: `1px solid ${isCompleted ? '#00ff8840' : '#ffffff20'}` }}
                        >
                          {world.id}
                        </div>

                        {/* Status badge */}
                        {isCompleted && <div className="absolute top-3 right-3 font-orbitron text-xs text-neon-green">✓</div>}
                        {isLocked && <div className="absolute top-3 right-3 text-sm">🔒</div>}
                        {isNext && !isCompleted && (
                          <div className="absolute top-3 right-3">
                            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse inline-block" />
                          </div>
                        )}

                        <div className="px-4 pb-4 pt-12">
                          {/* World identity */}
                          <div className="text-2xl mb-1">{world.emoji}</div>
                          <div className="font-orbitron font-bold text-sm text-white leading-tight mb-0.5">{world.name}</div>
                          <div className="font-mono text-xs mb-1" style={{ color: world.color }}>{world.topic}</div>
                          {/* Mini-game type badge */}
                          {!isLocked && (() => { const cfg = WORLD_MINI_GAME[world.id]; return (
                            <div className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 mb-2">
                              <span>{cfg.emoji}</span><span>{cfg.label}</span>
                            </div>
                          ); })()}

                          {/* Boss preview */}
                          <div
                            className="rounded-lg px-3 py-2 mb-3 border transition-all"
                            style={{
                              background: isLocked ? '#ffffff05' : `${world.color}10`,
                              borderColor: isLocked ? '#ffffff15' : `${world.color}30`,
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{isLocked ? '❓' : (world.boss?.emoji ?? '👾')}</span>
                              <span className="font-orbitron text-xs font-bold" style={{ color: isLocked ? '#555' : world.color }}>
                                {isLocked ? '???' : (world.boss?.name ?? 'Unknown')}
                              </span>
                            </div>
                            <div className="font-mono text-xs text-slate-600">
                              {isLocked ? 'Unlock to reveal' : (world.boss?.title ?? '')}
                            </div>
                            {/* Boss lore on hover */}
                            <AnimatePresence>
                              {isHovered && !isLocked && world.boss?.lore && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <p className="font-mono text-xs text-slate-400 mt-2 leading-relaxed italic">
                                    "{world.boss.lore}"
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Completed: show defeat quote */}
                          {isCompleted && KARABO_BOSS_DEFEAT[world.id] && (
                            <div className="font-mono text-xs text-neon-green/70 mb-3 leading-relaxed">
                              ✦ {KARABO_BOSS_DEFEAT[world.id].split('.')[0]}.
                            </div>
                          )}

                          {/* Story continues label for next world */}
                          {isNext && !isCompleted && (
                            <div className="font-orbitron text-xs text-neon-cyan animate-pulse mb-2">
                              ▶ STORY CONTINUES...
                            </div>
                          )}

                          {/* Stars */}
                          <div className="flex gap-0.5 mb-3">
                            {[1, 2, 3].map(s => (
                              <span key={s} className={`text-sm ${s <= stars ? 'text-yellow-400' : 'text-slate-800'}`}>★</span>
                            ))}
                          </div>

                          {/* Action */}
                          {isLocked ? (
                            <div className="font-orbitron text-xs text-slate-600">LVL {world.unlockLevel} required</div>
                          ) : isCompleted ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEnter(world.id, world.unlockLevel); }}
                              className="w-full py-1.5 rounded font-orbitron text-xs border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all"
                            >
                              ↩ REMATCH
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEnter(world.id, world.unlockLevel); }}
                              className="w-full py-1.5 rounded font-orbitron text-xs font-bold transition-all"
                              style={{ background: world.color + '22', border: `1px solid ${world.color}44`, color: world.color }}
                            >
                              ⚔ FIGHT
                            </button>
                          )}
                        </div>

                        {/* Bottom accent */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: isCompleted ? '#00ff8840' : isNext ? '#00d4ff30' : 'transparent' }} />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}

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
