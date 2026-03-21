import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { WORLDS } from '../../data/curriculum';
import { HEROES } from '../../data/heroes';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  displayName: string;
  score: number;
  worldId: number;
  heroClass: string;
  createdAt: string;
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedWorld, setSelectedWorld] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?world=${selectedWorld}&limit=50`)
      .then(r => r.json())
      .then(data => { setEntries(data.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedWorld]);

  const world = selectedWorld > 0 ? WORLDS.find(w => w.id === selectedWorld) : null;

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-16 pb-10 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🏆</div>
            <h1 className="font-orbitron font-black text-3xl text-white mb-2">
              LEADER<span className="text-neon-cyan glow-cyan">BOARD</span>
            </h1>
            <p className="text-slate-500 text-sm">Top warriors across the Chain Quest universe</p>
          </div>

          {/* World filter tabs */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <button
              onClick={() => setSelectedWorld(0)}
              className={`px-4 py-2 rounded-lg font-orbitron text-xs transition-all border ${selectedWorld === 0 ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-dark-800 text-slate-500 hover:text-white'}`}
            >
              🌐 GLOBAL
            </button>
            {WORLDS.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWorld(w.id)}
                className={`px-3 py-2 rounded-lg font-orbitron text-xs transition-all border ${selectedWorld === w.id ? 'bg-dark-800 text-white' : 'border-white/10 bg-dark-800 text-slate-500 hover:text-white'}`}
                style={selectedWorld === w.id ? { borderColor: w.color + '80', color: w.color } : {}}
              >
                {w.emoji} W{w.id}
              </button>
            ))}
          </div>

          {/* World banner (if filtered) */}
          {world && (
            <div className="neon-border-cyan bg-dark-800 rounded-xl p-4 mb-6 flex items-center gap-4">
              <div className="text-4xl">{world.boss.emoji}</div>
              <div>
                <div className="font-orbitron font-bold text-sm" style={{ color: world.color }}>{world.name.toUpperCase()}</div>
                <div className="text-slate-500 text-xs font-mono">{world.boss.name} · Best scores in this world</div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="neon-border-purple bg-dark-800 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 px-4 py-3 border-b border-white/5 bg-dark-900">
              <div className="col-span-1 font-orbitron text-xs text-slate-600">#</div>
              <div className="col-span-5 font-orbitron text-xs text-slate-600">PLAYER</div>
              <div className="col-span-3 font-orbitron text-xs text-slate-600 text-center">HERO</div>
              <div className="col-span-3 font-orbitron text-xs text-slate-600 text-right">SCORE</div>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="spinner w-8 h-8 mx-auto mb-3" />
                <div className="text-slate-600 font-mono text-xs">LOADING...</div>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">📭</div>
                <div className="text-slate-600 font-orbitron text-xs">NO ENTRIES YET</div>
                <div className="text-slate-700 text-xs mt-1 font-mono">Be the first to complete this world!</div>
                <button onClick={() => navigate('/world')} className="mt-4 text-neon-cyan text-xs font-orbitron hover:underline">
                  → ENTER THE WORLD
                </button>
              </div>
            ) : (
              <div>
                {entries.map((entry, i) => {
                  const hero = HEROES.find(h => h.id === entry.heroClass) || HEROES[0];
                  const entryWorld = WORLDS.find(w => w.id === entry.worldId);
                  const isTop3 = i < 3;
                  const medals = ['🥇', '🥈', '🥉'];

                  return (
                    <motion.div
                      key={`${entry.userId}-${entry.worldId}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`grid grid-cols-12 px-4 py-3.5 border-b border-white/5 hover:bg-dark-700 transition-colors items-center
                        ${isTop3 ? 'bg-dark-900/50' : ''}
                      `}
                    >
                      {/* Rank */}
                      <div className="col-span-1">
                        {isTop3 ? (
                          <span className="text-xl">{medals[i]}</span>
                        ) : (
                          <span className="font-orbitron text-sm text-slate-600">#{i + 1}</span>
                        )}
                      </div>

                      {/* Player */}
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <div>
                          <div className={`font-orbitron text-sm truncate ${isTop3 ? 'text-white' : 'text-slate-300'}`}>
                            {entry.displayName || entry.username}
                          </div>
                          {selectedWorld === 0 && entryWorld && (
                            <div className="text-xs font-mono" style={{ color: entryWorld.color + 'aa' }}>
                              {entryWorld.emoji} {entryWorld.name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hero */}
                      <div className="col-span-3 flex items-center justify-center gap-1">
                        <span className="text-lg">{hero.emoji}</span>
                        <span className="font-mono text-xs text-slate-500 hidden sm:block">{hero.name}</span>
                      </div>

                      {/* Score */}
                      <div className="col-span-3 text-right">
                        <div className={`font-orbitron text-sm ${isTop3 ? 'text-neon-cyan glow-cyan' : 'text-neon-green'}`}>
                          {entry.score.toLocaleString()}
                        </div>
                        <div className="text-slate-700 text-xs font-mono">pts</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <Button onClick={() => navigate('/world')} variant="neon" size="lg">
              ⚔ ENTER THE WORLD
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
