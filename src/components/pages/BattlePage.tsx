import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useCountdown } from '../../hooks/useCountdown';
import { useSocket } from '../../hooks/useSocket';
import { WORLDS } from '../../data/curriculum';
import { HEROES } from '../../data/heroes';
import { KARABO_INTRO, KARABO_WIN, KARABO_LOSE, KARABO_BOSS_NEAR, KARABO_BOSS_DEFEAT, KARABO_WORLD_COMPLETE } from '../../data/karabo';
import { KaraboCompanion, useKarabo } from '../ui/KaraboCompanion';
import ProgressBar from '../ui/ProgressBar';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useWeb3 } from '../../hooks/useWeb3';
import { playSound, initAudio } from '../../game/audio/SoundManager';
import { apiFetch } from '../../lib/api';

interface DamagePopup { id: number; text: string; color: string; x: number; y: number }

function getStreakMultiplierDisplay(streak: number, heroClass: string): number {
  const isDegen = heroClass === 'degen';
  if (isDegen) {
    if (streak >= 3) return 3;
    if (streak >= 2) return 2;
    if (streak >= 1) return 1.5;
    return 1;
  }
  if (streak >= 4) return 3;
  if (streak >= 3) return 2;
  if (streak >= 2) return 1.5;
  return 1;
}

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
  const [introStage, setIntroStage] = useState<0 | 1 | 2>(0);
  const [streakAnim, setStreakAnim] = useState(false);
  const { claimReward } = useWeb3();

  const [passiveToast, setPassiveToast] = useState<string | null>(null);
  const [bossEnraged, setBossEnraged] = useState(false);
  const [battleInventory, setBattleInventory] = useState<{ id: string; qty: number }[]>([]);
  const prevStreakRef = useRef(0);

  const wId = parseInt(worldId || '1');
  const world = WORLDS.find(w => w.id === wId);
  const hero = HEROES.find(h => h.id === heroClass) || HEROES[0];
  const popupId = { current: 0 };
  const karabo = useKarabo(wId);
  const wrongConsecRef = useRef(0);

  useEffect(() => {
    if (!user || !token) return;
    setBattlePhase('intro');
    setIntroStage(0);
    apiFetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const hc = data.profile?.hero_class || 'validator';
        setHeroClass(hc);
        setProfile(data.profile);
        try {
          const inv = data.profile?.inventory ? JSON.parse(data.profile.inventory) : [];
          const hasXPBoost = inv.some((i: any) => i.id === 'xp_boost' && i.quantity > 0);
          const hintScrolls = inv.filter((i: any) => i.id === 'hint_scroll').reduce((s: number, i: any) => s + (i.quantity || 1), 0);
          useGameStore.getState().setXPBoost(hasXPBoost);
          if (hintScrolls > 0 && hc !== 'archivist') {
            useGameStore.setState({ hintsRemaining: hintScrolls });
          }
        } catch {}
        startBattle(wId, hc, 'solo');
        try {
          const inv = data.profile?.inventory ? JSON.parse(data.profile.inventory) : [];
          const items = ['hp_potion', 'time_freeze'].map(id => ({
            id,
            qty: inv.filter((i: any) => i.id === id).reduce((s: number, i: any) => s + (i.quantity || 1), 0),
          })).filter(i => i.qty > 0);
          setBattleInventory(items);
        } catch {}
        (useGameStore.getState().battle as any)._heroClass = hc;
      })
      .catch(() => {
        // If profile fetch fails (e.g. auth issue), start battle with defaults
        startBattle(wId, heroClass, 'solo');
      });
    return () => resetBattle();
  }, [wId]);

  // Auto-advance intro stages only AFTER the battle has loaded (phase !== 'idle')
  // This prevents the cinematic from skipping during the loading spinner
  useEffect(() => {
    if (battlePhase !== 'intro' || battle.phase === 'idle') return;
    if (introStage === 0) {
      const t = setTimeout(() => setIntroStage(1), 2500);
      return () => clearTimeout(t);
    }
    if (introStage === 1) {
      const t = setTimeout(() => setIntroStage(2), 3500);
      return () => clearTimeout(t);
    }
  }, [battlePhase, introStage, battle.phase]);

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
      wrongConsecRef.current = 0;
      playSound('correct');
      addPopup(`-${result.damageDealt}`, '#00ff88');
      addPopup(`+${result.scoreGained}pts`, '#00d4ff');
      // Karabo celebrate on correct
      if (Math.random() < 0.3) {
        karabo.show('celebrate', KARABO_WIN[Math.floor(Math.random() * KARABO_WIN.length)], 3000);
      }
      // Speed demon achievement
      const q = battle.currentQuestion;
      if (q && battle.timeRemaining >= (q.timeLimitSec - 3)) {
        useGameStore.getState().unlockAchievement('speed_demon');
      }
      // Passive toasts
      const curHeroClass = (useGameStore.getState().battle as any)._heroClass || heroClass;
      const newStreak = battle.streak + 1;
      const prevMult = battle.multiplier;
      const newMult = newStreak >= 4 ? 3 : newStreak >= 3 ? 2 : newStreak >= 2 ? 1.5 : 1;
      if (newMult > prevMult) {
        playSound('streakUp');
        setPassiveToast(`🔥 STREAK ×${newMult}!`);
        setTimeout(() => setPassiveToast(null), 1500);
      }
      if (curHeroClass === 'miner' && (q?.difficulty === 'hard' || q?.difficulty === 'boss')) {
        playSound('hardFork');
        setPassiveToast('⛏ HARD FORK: 2× DAMAGE!');
        setTimeout(() => setPassiveToast(null), 1800);
      }
    } else {
      wrongConsecRef.current += 1;
      playSound('wrong');
      addPopup(`-${result.damageTaken} HP`, '#ff2244');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      // Karabo hint after 2 consecutive wrong answers
      if (wrongConsecRef.current >= 2 && battle.currentQuestion) {
        const concept = battle.currentQuestion.concept;
        karabo.show('hint', `Still stuck on "${concept}"? Try thinking about the core definition first.`, 6000);
      } else {
        karabo.show('encourage', KARABO_LOSE[Math.floor(Math.random() * KARABO_LOSE.length)], 3500);
      }
      // Validator shield passive toast
      const curHeroClass = (useGameStore.getState().battle as any)._heroClass || heroClass;
      if (curHeroClass === 'validator' && result.damageTaken === 0) {
        playSound('shieldBlock');
        setPassiveToast('🛡 SHIELD ABSORBED THE HIT!');
        setTimeout(() => setPassiveToast(null), 1800);
      }
      // DAO Diplomat governance vote toast
      if (curHeroClass === 'dao_diplomat' && result.damageTaken === 0) {
        setPassiveToast('🗳 GOVERNANCE VOTE: DAMAGE NEGATED!');
        setTimeout(() => setPassiveToast(null), 1800);
      }
    }

    // Boss enrage at 50%
    const newBossHP = battle.bossHP - (result.damageDealt || 0);
    if (!bossEnraged && newBossHP <= battle.bossMaxHP * 0.5 && newBossHP > 0) {
      setBossEnraged(true);
      playSound('bossEnrage');
      setPassiveToast(`⚠ ${world?.boss.name} IS ENRAGED!`);
      setTimeout(() => setPassiveToast(null), 2500);
      karabo.show('boss', KARABO_BOSS_NEAR, 4000);
    }

    setTimeout(() => {
      const current = useGameStore.getState().battle;
      if (current.playerHP <= 0) {
        setShowDefeat(true);
        return;
      }
      if (current.bossHP <= 0) {
        finishWorld(result.correct);
        return;
      }
      advanceQuestion();
    }, 2500);
  }, [battle, submitAnswer, advanceQuestion, bossEnraged, world, heroClass]);

  const finishWorld = (perfect: boolean) => {
    if (!user || !token) return;
    completeWorld(wId, battle.score);
    addXP(battle.xpGained);
    apiFetch(`/api/profile/${user.id}/world-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ worldId: wId, score: battle.score, stars: battle.score > 5000 ? 3 : 2, perfect }),
    });
    if (world) {
      socket.announceBossClear(wId, world.name, world.boss.name);
    }
    setShowVictory(true);
    playSound('bossDefeat');
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

  useEffect(() => {
    if (battle.phase === 'question' && battle.timeRemaining === 5) {
      playSound('timerUrgent');
    }
  }, [battle.timeRemaining, battle.phase]);

  if (!world || battle.phase === 'idle') {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center"><div className="spinner w-10 h-10 mx-auto mb-3" /><div className="font-orbitron text-neon-cyan text-sm">LOADING BATTLE...</div></div>
      </div>
    );
  }

  if (battlePhase === 'intro') {
    // Stage 0 — Boss Arrival
    if (introStage === 0) {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: `radial-gradient(ellipse at 50% 30%, ${world.color}18 0%, #04060f 65%)` }}
        >
          <motion.div
            key="stage0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center px-6 max-w-sm"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-8xl mb-6"
            >
              {world.boss.emoji}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="font-orbitron font-black text-2xl sm:text-3xl text-white mb-2 tracking-widest">
                {world.boss.name.toUpperCase()}
              </div>
              <div className="h-0.5 w-24 mx-auto mb-3" style={{ background: world.color }} />
              <div className="font-mono text-sm tracking-widest uppercase" style={{ color: world.color }}>
                {world.boss.title}
              </div>
            </motion.div>
          </motion.div>
        </div>
      );
    }

    // Stage 1 — Boss Lore
    if (introStage === 1) {
      return (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: `radial-gradient(ellipse at 50% 30%, ${world.color}12 0%, #04060f 65%)` }}
        >
          <motion.div
            key="stage1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center px-6 max-w-md"
          >
            <div className="text-4xl mb-5 opacity-60">{world.boss.emoji}</div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="font-mono text-base text-slate-300 leading-relaxed mb-6 italic"
            >
              "{world.boss.lore}"
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <KaraboCompanion
                phase="intro"
                worldId={wId}
                message={KARABO_INTRO[wId]}
                onDismiss={karabo.dismiss}
              />
            </motion.div>
          </motion.div>
        </div>
      );
    }

    // Stage 2 — Battle Brief (manual dismiss)
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
              <div className="bg-dark-900 rounded-xl p-4 mb-5 border" style={{ borderColor: world.color + '30' }}>
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

              <Button onClick={() => { initAudio(); setBattlePhase('fighting'); }} variant="neon" className="w-full text-base">
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
        {/* Karabo companion */}
        <KaraboCompanion phase={karabo.phase} message={karabo.message} worldId={wId} onDismiss={karabo.dismiss} />

        <div className="max-w-2xl mx-auto">
          {/* World header */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">{world.emoji}</span>
              <span className="font-orbitron font-bold text-sm" style={{ color: world.color }}>{world.name.toUpperCase()}</span>
              {/* Terrain bonus badge */}
              {battle.terrainBonusActive && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-amber-400/40 bg-amber-950/60 text-amber-400">
                  ⚔ {battle.terrainName} · +15% DMG
                </span>
              )}
            </div>
            <div className="text-slate-600 text-xs font-mono">Q {battle.questionIndex + 1} / {battle.totalQuestions}</div>
          </div>

          {/* Boss display */}
          <div className="text-center mb-4 relative">
            <div className={`text-5xl sm:text-7xl boss-float mb-2 ${bossEnraged ? 'boss-enrage' : ''}`}>{world.boss.emoji}</div>
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

          {/* Passive ability toast */}
          <AnimatePresence>
            {passiveToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-3 px-4 py-2 rounded-lg border border-neon-amber/50 bg-neon-amber/10 text-center"
              >
                <span className="font-orbitron text-sm text-neon-amber">{passiveToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

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

              {/* Hint button */}
              {battle.phase === 'question' && useGameStore.getState().hintsRemaining > 0 && (
                <button onClick={handleHint} disabled={useGameStore.getState().hintsRemaining === 0} className="mt-3 w-full sm:w-auto text-xs font-orbitron text-neon-amber border border-neon-amber/30 px-3 py-2 rounded hover:bg-neon-amber/10 disabled:opacity-30 transition-all">
                  💡 HINT ({useGameStore.getState().hintsRemaining} left)
                </button>
              )}

              {/* Item hotbar */}
              {battleInventory.length > 0 && battle.phase === 'question' && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {battleInventory.map(item => {
                    const defs: Record<string, { icon: string; label: string }> = {
                      hp_potion: { icon: '🧪', label: 'HP +30' },
                      time_freeze: { icon: '💎', label: '+10s' },
                    };
                    const def = defs[item.id];
                    if (!def || item.qty <= 0) return null;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          useGameStore.getState().useItem(item.id);
                          playSound('itemUse');
                          setBattleInventory(prev => prev.map(i => i.id === item.id ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0));
                          if (token && user) {
                            apiFetch('/api/shop/consume', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ itemId: item.id }),
                            }).catch(() => {});
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neon-green/30 bg-neon-green/5 hover:bg-neon-green/10 transition-all font-orbitron text-xs text-neon-green"
                      >
                        <span>{def.icon}</span>
                        <span>{def.label}</span>
                        <span className="ml-1 text-slate-500">×{item.qty}</span>
                      </button>
                    );
                  })}
                </div>
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
            <div className="font-mono text-xs text-slate-500 mb-4">{world.description}</div>
            {/* Karabo defeat narrative */}
            <div className="bg-dark-900/80 rounded-xl px-4 py-3 mb-5 border border-neon-cyan/20 text-left">
              <div className="font-orbitron text-xs text-neon-cyan mb-1.5">KARABO</div>
              <p className="font-mono text-sm text-slate-300 leading-relaxed italic">
                "{KARABO_BOSS_DEFEAT[wId] ?? KARABO_WORLD_COMPLETE}"
              </p>
            </div>
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
            <Button onClick={() => navigate('/campaign')} variant="ghost" className="w-full">← RETURN TO CAMPAIGN</Button>
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
              <Button onClick={() => navigate('/campaign')} variant="ghost" className="flex-1">← RETREAT</Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageWrapper>
  );
}
