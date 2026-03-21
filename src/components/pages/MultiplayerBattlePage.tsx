import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { useSocket } from '../../hooks/useSocket';
import { useCountdown } from '../../hooks/useCountdown';
import { WORLDS } from '../../data/curriculum';
import { HEROES } from '../../data/heroes';
import ProgressBar from '../ui/ProgressBar';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface DamagePopup { id: number; text: string; color: string }

export default function MultiplayerBattlePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room, currentQuestion, questionIndex, totalQuestions,
    timeRemaining, bossHP, bossMaxHP, latestReveal, rankings,
    answeredThisRound,
  } = useMultiplayerStore();
  const { submitAnswer: socketSubmit } = useSocket();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'question' | 'reveal' | 'end'>('question');
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [popupCounter, setPopupCounter] = useState(0);
  const [showEnd, setShowEnd] = useState(false);

  const myPlayer = room?.players.find(p => p.isHost === false || true); // we find ourselves by checking below
  const world = room ? WORLDS.find(w => w.id === room.worldId) : null;

  useEffect(() => {
    if (!room || !code) { navigate('/multiplayer'); }
  }, []);

  useEffect(() => {
    if (currentQuestion) {
      setSelectedIndex(null);
      setPhase('question');
    }
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (latestReveal) {
      setPhase('reveal');
      const totalDmg = Object.values(latestReveal.results).reduce((sum, r) => sum + (r.damageDealt || 0), 0);
      if (totalDmg > 0) addPopup(`-${totalDmg} DMG`, '#00ff88');
    }
  }, [latestReveal]);

  useEffect(() => {
    if (rankings && rankings.length > 0) {
      setPhase('end');
      setShowEnd(true);
    }
  }, [rankings]);

  const addPopup = useCallback((text: string, color: string) => {
    const id = popupCounter;
    setPopupCounter(c => c + 1);
    setDamagePopups(p => [...p, { id, text, color }]);
    setTimeout(() => setDamagePopups(p => p.filter(d => d.id !== id)), 1500);
  }, [popupCounter]);

  const handleAnswer = (idx: number) => {
    if (phase !== 'question' || selectedIndex !== null || !currentQuestion || answeredThisRound) return;
    setSelectedIndex(idx);
    socketSubmit(code!, currentQuestion.id, idx, timeRemaining);
  };

  const timerPct = currentQuestion ? (timeRemaining / (currentQuestion.timeLimitSec || 30)) * 100 : 0;

  // Derive who has answered from room players
  const answeredCount = room?.players.filter(p => p.hasAnswered).length || 0;

  // Derive per-player scores from room players
  const playerList = room?.players || [];

  useCountdown(phase === 'question' && !!currentQuestion, () => {}, 1000);

  if (!world || !room) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-10 h-10 mx-auto mb-3" />
          <div className="font-orbitron text-neon-cyan text-sm">CONNECTING TO BATTLE...</div>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-14 pb-6 px-4" style={{ background: `radial-gradient(ellipse at 50% 0%, ${world.color}08 0%, #04060f 60%)` }}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">{world.emoji}</span>
              <span className="font-orbitron font-bold text-sm" style={{ color: world.color }}>{world.name.toUpperCase()}</span>
              <span className="font-mono text-xs text-slate-600 ml-2">ROOM: {code}</span>
            </div>
            <div className="text-slate-600 text-xs font-mono">Q {questionIndex + 1} / {totalQuestions}</div>
          </div>

          {/* Boss + shared HP */}
          <div className="text-center mb-4 relative">
            <div className="text-7xl boss-float mb-2">{world.boss.emoji}</div>
            <div className="font-orbitron font-bold text-sm mb-2" style={{ color: world.color }}>{world.boss.name}</div>
            <div className="max-w-xs mx-auto">
              <ProgressBar value={bossHP} max={bossMaxHP || world.boss.maxHP} color={world.color} height={10} showText label="SHARED BOSS HP" />
            </div>
            {/* Damage popups */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none">
              <AnimatePresence>
                {damagePopups.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -60 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2 }}
                    className="absolute font-orbitron font-black text-lg whitespace-nowrap"
                    style={{ color: p.color, textShadow: `0 0 10px ${p.color}` }}
                  >
                    {p.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Live scoreboard mini */}
          <div className="neon-border-purple bg-dark-800 rounded-xl p-3 mb-4">
            <div className="font-orbitron text-xs text-neon-purple mb-2">LIVE SCORES — {answeredCount}/{room.players.length} answered</div>
            <div className="flex flex-wrap gap-2">
              {[...playerList]
                .sort((a, b) => b.score - a.score)
                .map(p => {
                  const hero = HEROES.find(h => h.id === p.heroClass) || HEROES[0];
                  return (
                    <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${p.hasAnswered ? 'border-neon-green/40 bg-neon-green/5' : 'border-white/10 bg-dark-900'}`}>
                      <span>{hero.emoji}</span>
                      <div>
                        <div className="font-orbitron text-xs" style={{ color: hero.color }}>{p.displayName.slice(0, 8)}</div>
                        <div className="font-mono text-xs text-slate-500">{p.score.toLocaleString()}</div>
                      </div>
                      {p.hasAnswered && <span className="text-neon-green text-xs">✓</span>}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Timer */}
          <div className="mb-4">
            <div className="h-2 rounded-full overflow-hidden bg-dark-700">
              <motion.div
                className={`h-full rounded-full timer-bar ${timerPct < 25 ? 'urgent' : ''}`}
                style={{ width: `${timerPct}%`, background: timerPct < 25 ? '#ff2244' : timerPct < 60 ? '#ffb800' : '#00d4ff' }}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
            <div className="flex justify-between mt-0.5 font-mono text-xs text-slate-600">
              <span>{currentQuestion?.concept}</span>
              <span>{timeRemaining}s</span>
            </div>
          </div>

          {/* Question */}
          {currentQuestion && (
            <div className="neon-border-purple bg-dark-800 rounded-xl p-6 mb-4">
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-orbitron mb-3 ${currentQuestion.difficulty === 'boss' ? 'bg-neon-orange/20 text-neon-orange' : currentQuestion.difficulty === 'hard' ? 'bg-neon-purple/20 text-neon-purple' : currentQuestion.difficulty === 'medium' ? 'bg-neon-amber/20 text-neon-amber' : 'bg-neon-cyan/20 text-neon-cyan'}`}>
                {currentQuestion.difficulty.toUpperCase()} · {currentQuestion.damage} DMG · SHARED
              </div>
              <p className="text-white font-medium text-base leading-relaxed mb-5">{currentQuestion.text}</p>

              <div className="space-y-3">
                {currentQuestion.options.map((opt, i) => {
                  const isSelected = selectedIndex === i;
                  const isCorrect = phase === 'reveal' && i === currentQuestion.correctIndex;
                  const isWrong = phase === 'reveal' && isSelected && !isCorrect;

                  return (
                    <motion.button
                      key={i}
                      disabled={phase === 'reveal' || answeredThisRound}
                      onClick={() => handleAnswer(i)}
                      whileHover={phase === 'question' && !answeredThisRound ? { x: 4 } : {}}
                      className={`answer-btn w-full text-left px-4 py-3 rounded-lg transition-all font-mono text-sm
                        ${isCorrect ? 'correct' : ''}
                        ${isWrong ? 'wrong' : ''}
                        ${isSelected && phase === 'question' ? 'border border-neon-cyan/50 bg-neon-cyan/10' : ''}
                        ${phase === 'question' && !answeredThisRound ? 'bg-dark-700 hover:bg-dark-600' : 'bg-dark-700'}
                        ${answeredThisRound && !isSelected && phase === 'question' ? 'opacity-50' : ''}
                      `}
                    >
                      <span className="font-orbitron mr-2" style={{ color: isCorrect ? '#00ff88' : isWrong ? '#ff2244' : '#666' }}>
                        [{String.fromCharCode(65 + i)}]
                      </span>
                      {opt}
                    </motion.button>
                  );
                })}
              </div>

              {answeredThisRound && phase === 'question' && (
                <div className="mt-3 text-center text-neon-amber font-orbitron text-xs animate-pulse">
                  ⏳ Waiting for others... ({answeredCount}/{room.players.length})
                </div>
              )}
            </div>
          )}

          {/* Reveal panel */}
          <AnimatePresence>
            {phase === 'reveal' && latestReveal && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 mb-4 border border-neon-green/30 bg-neon-green/5"
              >
                <div className="font-orbitron text-sm font-bold mb-1 text-neon-green">
                  ✓ CORRECT ANSWER REVEALED
                </div>
                {currentQuestion?.explanation && (
                  <p className="text-slate-400 text-sm leading-relaxed">{currentQuestion.explanation}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Winner Podium Modal */}
        <Modal open={showEnd}>
          <div className="text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="font-orbitron font-black text-2xl text-neon-amber mb-6">BATTLE COMPLETE!</h2>

            {/* Podium */}
            <div className="space-y-2 mb-6">
              {rankings?.slice(0, 5).map((r, i) => {
                const hero = HEROES.find(h => h.id === r.heroClass) || HEROES[0];
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                return (
                  <motion.div
                    key={r.displayName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/10 bg-dark-900"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{medals[i]}</span>
                      <div className="text-left">
                        <div className="font-orbitron text-sm text-white">{r.displayName}</div>
                        <div className="text-slate-600 text-xs font-mono">{hero.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-orbitron text-sm text-neon-green">{r.finalScore.toLocaleString()}</div>
                      <div className="text-slate-600 text-xs font-mono">{r.maxStreak} max streak</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate('/multiplayer')} variant="neon" className="flex-1">⚔ REMATCH</Button>
              <Button onClick={() => navigate('/world')} variant="ghost" className="flex-1">← WORLD</Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageWrapper>
  );
}
