import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useCountdown } from '../../hooks/useCountdown';
import { useSocket } from '../../hooks/useSocket';
import { WORLDS } from '../../data/curriculum';
import { HEROES } from '../../data/heroes';
import ProgressBar from '../ui/ProgressBar';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useWeb3 } from '../../hooks/useWeb3';

interface DamagePopup { id: number; text: string; color: string; x: number; y: number }

export default function BattlePage() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { battle, startBattle, submitAnswer, advanceQuestion, resetBattle, completeWorld, addXP, useHint } = useGameStore();
  const socket = useSocket();
  const [heroClass, setHeroClass] = useState('validator');
  const [profile, setProfile] = useState<any>(null);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [eliminatedWrong, setEliminatedWrong] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [battlePhase, setBattlePhase] = useState<'intro' | 'fighting'>('intro');
  const [streakAnim, setStreakAnim] = useState(false);
  const { claimReward } = useWeb3();

  const wId = parseInt(worldId || '1');
  const world = WORLDS.find(w => w.id === wId);
  const hero = HEROES.find(h => h.id === heroClass) || HEROES[0];
  const popupId = { current: 0 };

  useEffect(() => {
    if (!user || !token) return;
    setBattlePhase('intro');
    fetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const hc = data.profile?.hero_class || 'validator';
        setHeroClass(hc);
        setProfile(data.profile);
        startBattle(wId, hc, 'solo');
        (useGameStore.getState().battle as any)._heroClass = hc;
      });
    return () => resetBattle();
  }, [wId]);

  const addPopup = useCallback((text: string, color: string) => {
    const id = popupId.current++;
    const x = 45 + Math.random() * 10;
    const y = 30 + Math.random() * 20;
    setDamagePopups(p => [...p, { id, text, color, x, y }]);
    setTimeout(() => setDamagePopups(p => p.filter(d => d.id !== id)), 1200);
  }, []);

  const handleAnswer = useCallback((idx: number) => {
    if (battle.phase !== 'question' || battle.selectedAnswerIndex !== null) return;
    const result = submitAnswer(idx);
    if (!result) return;

    if (result.correct) {
      addPopup(`-${result.damageDealt}`, '#00ff88');
      addPopup(`+${result.scoreGained}pts`, '#00d4ff');
    } else {
      addPopup(`-${result.damageTaken} HP`, '#ff2244');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }

    setTimeout(() => {
      if (battle.playerHP - (result.damageTaken || 0) <= 0 && !result.correct) {
        setShowDefeat(true);
        return;
      }
      if (battle.bossHP - (result.damageDealt || 0) <= 0) {
        finishWorld(result.correct);
        return;
      }
      advanceQuestion();
    }, 2500);
  }, [battle, submitAnswer, advanceQuestion]);

  const finishWorld = (perfect: boolean) => {
    if (!user || !token) return;
    completeWorld(wId, battle.score);
    addXP(battle.xpGained);
    fetch(`/api/profile/${user.id}/world-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ worldId: wId, score: battle.score, stars: battle.score > 5000 ? 3 : 2, perfect }),
    });
    if (world) {
      socket.announceBossClear(wId, world.name, world.boss.name);
    }
    setShowVictory(true);
  };

  const handleHint = () => {
    const eliminated = useHint();
    if (eliminated !== null) setEliminatedWrong(eliminated);
  };

  const handleClaim = async () => {
    if (!token) return;
    const result = await claimReward(wId, token);
    setClaimResult(result);
  };

  useEffect(() => {
    if (battle.streak > 0) {
      setStreakAnim(true);
      const t = setTimeout(() => setStreakAnim(false), 400);
      return () => clearTimeout(t);
    }
  }, [battle.streak]);

  useCountdown(battle.phase === 'question', () => useGameStore.getState().tickTimer(), 1000);

  if (!world || battle.phase === 'idle') {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center"><div className="spinner w-10 h-10 mx-auto mb-3" /><div className="font-orbitron text-neon-cyan text-sm">LOADING BATTLE...</div></div>
      </div>
    );
  }

  if (battlePhase === 'intro') {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-grid flex items-center justify-center px-4" style={{ background: `radial-gradient(ellipse at 50% 0%, ${world.color}10 0%, #04060f 60%)` }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <div className="neon-border-cyan bg-dark-800 rounded-2xl p-5 sm:p-8 text-center overflow-y-auto max-h-[90vh]">
              {/* World header */}
              <div className="mb-4">
                <div className="text-4xl sm:text-5xl mb-3">{world.emoji}</div>
                <div className="font-orbitron font-bold text-base sm:text-lg mb-0.5" style={{ color: world.color }}>
                  WORLD {world.id}: {world.name.toUpperCase()}
                </div>
                <div className="font-orbitron text-xs text-slate-400 tracking-widest">{world.topic.toUpperCase()}</div>
              </div>

              {/* Boss preview */}
              <div className="bg-dark-900 rounded-xl p-4 mb-5 border border-white/10">
                <div className="text-4xl mb-2">{world.boss.emoji}</div>
                <div className="font-orbitron text-sm font-bold mb-0.5" style={{ color: world.color }}>{world.boss.name}</div>
                <div className="font-mono text-xs text-slate-500 mb-2">{world.boss.title}</div>
                <div className="flex justify-center gap-2 text-xs font-mono text-slate-600">
                  <span>HP: {world.boss.maxHP}</span>
                  <span>·</span>
                  <span>Attack: {world.boss.attackName}</span>
                </div>
              </div>

              {/* Learning goals */}
              <div className="text-left mb-6">
                <div className="font-orbitron text-xs text-slate-500 mb-3 text-center">BEFORE YOU FIGHT, KNOW THIS:</div>
                <div className="space-y-2">
                  {world.learningGoals.map((goal, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-neon-cyan text-xs flex-shrink-0 mt-0.5">✦</span>
                      <span className="font-mono text-sm text-slate-300">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={() => setBattlePhase('fighting')} variant="neon" className="w-full text-base">
                ⚔ CHALLENGE ACCEPTED
              </Button>
            </div>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const timerPct = (battle.timeRemaining / (battle.currentQuestion?.timeLimitSec || 30)) * 100;
  const heroStats = hero;

  return (
    <PageWrapper>
      <div className={`min-h-screen bg-grid pt-14 pb-6 px-4 ${isShaking ? 'screen-shake' : ''}`} style={{ background: `radial-gradient(ellipse at 50% 0%, ${world.color}08 0%, #04060f 60%)` }}>
        <div className="max-w-2xl mx-auto">
          {/* World header */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">{world.emoji}</span>
              <span className="font-orbitron font-bold text-sm" style={{ color: world.color }}>{world.name.toUpperCase()}</span>
            </div>
            <div className="text-slate-600 text-xs font-mono">Q {battle.questionIndex + 1} / {battle.totalQuestions}</div>
          </div>

          {/* Boss display */}
          <div className="text-center mb-4 relative">
            <div className={`text-5xl sm:text-7xl boss-float mb-2`}>{world.boss.emoji}</div>
            <div className="font-orbitron font-bold text-sm mb-2" style={{ color: world.color }}>{world.boss.name}</div>
            <div className="max-w-xs mx-auto">
              <ProgressBar value={battle.bossHP} max={battle.bossMaxHP} color={world.color} height={10} showText label="BOSS HP" />
            </div>
            {/* Damage popups */}
            {damagePopups.map(p => (
              <div key={p.id} className="damage-popup absolute font-orbitron font-black text-lg pointer-events-none" style={{ color: p.color, left: `${p.x}%`, top: `${p.y}%`, textShadow: `0 0 10px ${p.color}` }}>
                {p.text}
              </div>
            ))}
          </div>

          {/* Player HUD */}
          <div className="neon-border-cyan bg-dark-800 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl">{heroStats.emoji}</div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-orbitron text-xs" style={{ color: heroStats.color }}>{heroStats.name}</span>
                  <span className="font-mono text-xs text-neon-green">{battle.score.toLocaleString()} pts</span>
                </div>
                <ProgressBar value={battle.playerHP} max={battle.maxHP} color={heroStats.color} height={8} showText />
              </div>
              {/* Streak */}
              <div className={`text-center ${streakAnim ? 'streak-tier-up' : ''}`}>
                <div className="font-orbitron font-black text-lg" style={{ color: battle.multiplier >= 3 ? '#ff6b35' : battle.multiplier >= 2 ? '#ffb800' : battle.multiplier >= 1.5 ? '#00ff88' : '#888' }}>
                  x{battle.multiplier}
                </div>
                <div className="text-xs text-slate-600 font-mono">{battle.streak} streak</div>
              </div>
            </div>
          </div>

          {/* Timer bar */}
          <div className="mb-4">
            <div className={`h-2 rounded-full overflow-hidden bg-dark-700`}>
              <motion.div
                className={`h-full rounded-full timer-bar ${timerPct < 25 ? 'urgent' : ''}`}
                style={{ width: `${timerPct}%`, background: timerPct < 25 ? '#ff2244' : timerPct < 60 ? '#ffb800' : '#00d4ff' }}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
            <div className="flex justify-between mt-0.5 font-mono text-xs text-slate-600">
              <span>{battle.currentQuestion?.concept}</span>
              <span>{battle.timeRemaining}s</span>
            </div>
          </div>

          {/* Question */}
          {battle.currentQuestion && (
            <div className="neon-border-purple bg-dark-800 rounded-xl p-6 mb-4">
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-orbitron mb-3 ${battle.currentQuestion.difficulty === 'boss' ? 'bg-neon-orange/20 text-neon-orange' : battle.currentQuestion.difficulty === 'hard' ? 'bg-neon-purple/20 text-neon-purple' : battle.currentQuestion.difficulty === 'medium' ? 'bg-neon-amber/20 text-neon-amber' : 'bg-neon-cyan/20 text-neon-cyan'}`}>
                {battle.currentQuestion.difficulty.toUpperCase()} · {battle.currentQuestion.damage} DMG
              </div>
              <p className="text-white font-medium text-base leading-relaxed mb-5">{battle.currentQuestion.text}</p>

              {/* Answer options */}
              <div className="space-y-3">
                {battle.currentQuestion.options.map((opt, i) => {
                  const isEliminated = eliminatedWrong === i;
                  const isSelected = battle.selectedAnswerIndex === i;
                  const isCorrect = battle.phase === 'reveal' && i === battle.currentQuestion!.correctIndex;
                  const isWrong = battle.phase === 'reveal' && isSelected && !isCorrect;

                  return (
                    <motion.button
                      key={i}
                      disabled={battle.phase === 'reveal' || isEliminated}
                      onClick={() => handleAnswer(i)}
                      whileHover={battle.phase === 'question' && !isEliminated ? { x: 4 } : {}}
                      className={`answer-btn w-full text-left px-4 py-3 rounded-lg transition-all font-mono text-sm
                        ${isEliminated ? 'opacity-20 cursor-not-allowed line-through' : ''}
                        ${isCorrect ? 'correct' : ''}
                        ${isWrong ? 'wrong' : ''}
                        ${battle.phase === 'question' && !isEliminated ? 'bg-dark-700 hover:bg-dark-600' : 'bg-dark-700'}
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

              {/* Hint button (Archivist) */}
              {heroClass === 'archivist' && battle.phase === 'question' && (
                <button onClick={handleHint} disabled={useGameStore.getState().hintsRemaining === 0} className="mt-3 w-full sm:w-auto text-xs font-orbitron text-neon-amber border border-neon-amber/30 px-3 py-2 rounded hover:bg-neon-amber/10 disabled:opacity-30 transition-all">
                  💡 HINT ({useGameStore.getState().hintsRemaining} left)
                </button>
              )}
            </div>
          )}

          {/* Explanation */}
          <AnimatePresence>
            {battle.phase === 'reveal' && battle.answerResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-4 mb-4 border ${battle.answerResult.correct ? 'border-neon-green/30 bg-neon-green/5' : 'border-red-500/30 bg-red-500/5'}`}
              >
                <div className={`font-orbitron text-sm font-bold mb-2 ${battle.answerResult.correct ? 'text-neon-green' : 'text-red-400'}`}>
                  {battle.answerResult.correct ? '✓ CORRECT!' : '✗ WRONG!'}
                  {battle.answerResult.correct && <span className="ml-2 text-neon-amber">+{battle.answerResult.scoreGained}pts</span>}
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{battle.answerResult.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Victory Modal */}
        <Modal open={showVictory}>
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-orbitron font-black text-2xl text-neon-green glow-green mb-2">WORLD CLEARED!</h2>
            <div className="text-slate-400 mb-4">{world.boss.name} has been defeated!</div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-dark-900 rounded-lg p-3"><div className="font-orbitron text-neon-cyan text-lg">{battle.score.toLocaleString()}</div><div className="text-slate-600 text-xs">SCORE</div></div>
              <div className="bg-dark-900 rounded-lg p-3"><div className="font-orbitron text-neon-green text-lg">{world.cqtReward}</div><div className="text-slate-600 text-xs">CQT EARNED</div></div>
              <div className="bg-dark-900 rounded-lg p-3"><div className="font-orbitron text-neon-amber text-lg">{battle.isPerfect ? '⭐⭐⭐' : '⭐⭐'}</div><div className="text-slate-600 text-xs">STARS</div></div>
            </div>
            {!claimResult ? (
              <Button onClick={handleClaim} variant="neon" className="w-full mb-3">
                💎 CLAIM {world.cqtReward} CQT TOKENS
              </Button>
            ) : (
              <div className="mb-3 px-4 py-2 rounded bg-neon-green/10 border border-neon-green/30 text-neon-green text-sm font-mono">
                ✓ {claimResult.simulated ? 'Simulated' : 'TX confirmed'}: {claimResult.txHash?.slice(0, 20)}...
              </div>
            )}
            <Button onClick={() => navigate('/world')} variant="ghost" className="w-full">← RETURN TO WORLD</Button>
          </div>
        </Modal>

        {/* Defeat Modal */}
        <Modal open={showDefeat}>
          <div className="text-center">
            <div className="text-6xl mb-4">💀</div>
            <h2 className="font-orbitron font-black text-2xl text-red-400 mb-2">DEFEATED</h2>
            <p className="text-slate-400 mb-6">Your HP hit zero. The {world.boss.name} laughs...</p>
            <div className="flex gap-3">
              <Button onClick={() => { setShowDefeat(false); startBattle(wId, heroClass, 'solo'); }} variant="primary" className="flex-1">⚡ RETRY</Button>
              <Button onClick={() => navigate('/world')} variant="ghost" className="flex-1">← RETREAT</Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageWrapper>
  );
}
