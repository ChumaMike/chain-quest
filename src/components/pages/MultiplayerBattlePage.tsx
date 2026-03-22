import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import { useSocket } from '../../hooks/useSocket';
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
    room, localSocketId, currentQuestion, questionIndex, totalQuestions,
    timeRemaining, bossHP, bossMaxHP, latestReveal, rankings,
    answeredThisRound, isReconnecting, reconnectAttempt,
    battleMessages, battleRewards,
  } = useMultiplayerStore();
  const { submitAnswer: socketSubmit, sendBattleChat } = useSocket();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'question' | 'reveal' | 'end'>('question');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const popupCounterRef = useRef(0);
  const [showEnd, setShowEnd] = useState(false);
  const [isEliminated, setIsEliminated] = useState(false);

  // Correctly identify the local player using socket ID
  const myPlayer = room?.players.find(p => p.id === localSocketId);
  const world = room ? WORLDS.find(w => w.id === room.worldId) : null;

  useEffect(() => {
    if (!room || !code) navigate('/multiplayer');
  }, [room, code, navigate]);

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

  // Track if the local player gets eliminated
  useEffect(() => {
    if (myPlayer?.isEliminated && !isEliminated) {
      setIsEliminated(true);
    }
  }, [myPlayer?.isEliminated]);

  const addPopup = useCallback((text: string, color: string) => {
    const id = popupCounterRef.current++;
    setDamagePopups(p => [...p, { id, text, color }]);
    setTimeout(() => setDamagePopups(p => p.filter(d => d.id !== id)), 1500);
  }, []);

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !code) return;
    sendBattleChat(code, msg);
    setChatInput('');
  };

  const handleAnswer = (idx: number) => {
    if (phase !== 'question' || selectedIndex !== null || !currentQuestion || answeredThisRound) return;
    setSelectedIndex(idx);
    socketSubmit(code!, currentQuestion.id, idx, timeRemaining);
  };

  const timerPct = currentQuestion ? (timeRemaining / (currentQuestion.timeLimitSec || 30)) * 100 : 0;
  const answeredCount = room?.players.filter(p => p.hasAnswered).length || 0;
  const activeCount = room?.players.filter(p => !p.isEliminated).length || 0;
  const playerList = room?.players || [];

  if (!world || !room) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-10 h-10 mx-auto mb-3" />
          <div className="font-orbitron text-neon-cyan text-sm">CONNECTING TO BATTLE...</div>
          <button
            onClick={() => navigate('/multiplayer')}
            className="mt-6 text-slate-600 text-xs font-mono underline hover:text-slate-400"
          >
            ← Leave
          </button>
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

          {/* Live scoreboard */}
          <div className="neon-border-purple bg-dark-800 rounded-xl p-3 mb-4">
            <div className="font-orbitron text-xs text-neon-purple mb-2">
              LIVE SCORES — {answeredCount}/{activeCount} answered
            </div>
            <div className="flex flex-wrap gap-2">
              {[...playerList]
                .sort((a, b) => b.score - a.score)
                .map(p => {
                  const hero = HEROES.find(h => h.id === p.heroClass) || HEROES[0];
                  const isMe = p.id === localSocketId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
                        ${p.isEliminated ? 'border-red-500/20 bg-red-500/5 opacity-50' :
                          p.hasAnswered ? 'border-neon-green/40 bg-neon-green/5' :
                          'border-white/10 bg-dark-900'}
                        ${isMe ? 'ring-1 ring-neon-cyan/30' : ''}
                      `}
                    >
                      <span className={p.isEliminated ? 'grayscale' : ''}>{hero.emoji}</span>
                      <div>
                        <div
                          className={`font-orbitron text-xs ${p.isEliminated ? 'line-through text-slate-600' : ''}`}
                          style={{ color: isMe ? '#00d4ff' : p.isEliminated ? undefined : hero.color }}
                        >
                          {p.displayName.slice(0, 8)}{isMe ? ' ★' : ''}
                        </div>
                        <div className="font-mono text-xs text-slate-500">{p.score.toLocaleString()}</div>
                      </div>
                      {p.isEliminated && <span className="text-red-500 text-xs">✗</span>}
                      {!p.isEliminated && p.hasAnswered && <span className="text-neon-green text-xs">✓</span>}
                      {p.streak >= 2 && !p.isEliminated && (
                        <span className="text-neon-amber text-xs font-orbitron">{p.streak}x</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Eliminated banner for local player */}
          <AnimatePresence>
            {isEliminated && phase !== 'end' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-center"
              >
                <div className="font-orbitron text-sm text-red-400 mb-1">💀 YOU WERE ELIMINATED</div>
                <div className="font-mono text-xs text-slate-500">Spectating the rest of the battle...</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer */}
          <div className="mb-4">
            <div className="h-2 rounded-full overflow-hidden bg-dark-700">
              <motion.div
                className={`h-full rounded-full timer-bar ${timerPct < 25 ? 'urgent' : ''}`}
                style={{ width: `${timerPct}%`, background: timerPct < 25 ? '#ff2244' : timerPct < 60 ? '#ffb800' : '#00d4ff' }}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.9, ease: 'linear' }}
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
                  const isCorrect = phase === 'reveal' && i === (currentQuestion as any).correctIndex;
                  const isWrong = phase === 'reveal' && isSelected && !isCorrect;
                  const disabled = phase === 'reveal' || answeredThisRound || isEliminated;

                  return (
                    <motion.button
                      key={i}
                      disabled={disabled}
                      onClick={() => handleAnswer(i)}
                      whileHover={!disabled ? { x: 4 } : {}}
                      className={`answer-btn w-full text-left px-4 py-3 rounded-lg transition-all font-mono text-sm
                        ${isCorrect ? 'correct' : ''}
                        ${isWrong ? 'wrong' : ''}
                        ${isSelected && phase === 'question' ? 'border border-neon-cyan/50 bg-neon-cyan/10' : ''}
                        ${!disabled ? 'bg-dark-700 hover:bg-dark-600' : 'bg-dark-700'}
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

              {answeredThisRound && phase === 'question' && !isEliminated && (
                <div className="mt-3 text-center text-neon-amber font-orbitron text-xs animate-pulse">
                  ⏳ Waiting for others... ({answeredCount}/{activeCount} answered · {timeRemaining}s left)
                </div>
              )}

              {isEliminated && phase === 'question' && (
                <div className="mt-3 text-center text-slate-600 font-mono text-xs">
                  Spectating — {answeredCount}/{activeCount} answered
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
                {/* Show the local player's result */}
                {myPlayer && latestReveal.results[myPlayer.id] && (
                  <div className="mb-2 font-orbitron text-xs">
                    {latestReveal.results[myPlayer.id].correct ? (
                      <span className="text-neon-green">
                        +{latestReveal.results[myPlayer.id].damageDealt * 10 + latestReveal.results[myPlayer.id].firstBonus} pts
                        {latestReveal.results[myPlayer.id].wasFirst && ' · ⚡ FIRST!'}
                        {(latestReveal.results[myPlayer.id].newStreak || 0) >= 2 && ` · ${latestReveal.results[myPlayer.id].newStreak}x STREAK`}
                      </span>
                    ) : (
                      <span className="text-red-400">
                        -{latestReveal.results[myPlayer.id].damageTaken} HP
                      </span>
                    )}
                  </div>
                )}
                {currentQuestion?.explanation && (
                  <p className="text-slate-400 text-sm leading-relaxed">{currentQuestion.explanation}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* In-battle chat */}
          <div className="fixed bottom-4 right-4 z-30 w-64">
            {chatOpen && (
              <div className="bg-dark-900/95 backdrop-blur-sm rounded-xl border border-white/10 mb-2 overflow-hidden">
                <div className="h-32 overflow-y-auto px-3 py-2 space-y-1">
                  {battleMessages.length === 0 ? (
                    <div className="text-slate-700 text-xs font-mono text-center pt-3">No messages yet</div>
                  ) : battleMessages.map(m => (
                    <div key={m.id} className="flex gap-1.5 items-start">
                      <span className="font-orbitron text-xs flex-shrink-0 text-neon-cyan">{m.displayName.slice(0, 8)}:</span>
                      <span className="font-mono text-xs text-slate-300 break-all">{m.message}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 px-2 py-1 border-t border-white/5">
                  {['🔥','💀','⚡','🏆'].map(e => (
                    <button key={e} onClick={() => sendBattleChat(code!, e)} className="text-sm hover:scale-125 transition-transform">{e}</button>
                  ))}
                </div>
                <div className="flex gap-2 px-2 py-2 border-t border-white/5">
                  <input
                    type="text"
                    value={chatInput}
                    maxLength={80}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendChat(); e.stopPropagation(); }}
                    placeholder="Say something..."
                    className="flex-1 bg-dark-800 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white placeholder-slate-700 focus:outline-none focus:border-neon-cyan/50"
                  />
                  <button onClick={sendChat} className="px-2 py-1 rounded text-xs bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30">↵</button>
                </div>
              </div>
            )}
            <button
              onClick={() => setChatOpen(o => !o)}
              className="flex items-center gap-2 bg-dark-900/80 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 hover:border-neon-cyan/40 transition-colors text-xs font-orbitron text-slate-400"
            >
              <span>💬</span> CHAT
              {!chatOpen && battleMessages.length > 0 && <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />}
            </button>
          </div>
        </div>

        {/* Winner Podium Modal */}
        <Modal open={showEnd && !!rankings}>
          <div className="text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="font-orbitron font-black text-2xl text-neon-amber mb-6">BATTLE COMPLETE!</h2>

            {/* Podium */}
            <div className="space-y-2 mb-6">
              {rankings?.slice(0, 5).map((r, i) => {
                const hero = HEROES.find(h => h.id === r.heroClass) || HEROES[0];
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                const isMe = r.playerId === localSocketId;
                return (
                  <motion.div
                    key={r.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border ${isMe ? 'border-neon-cyan/40 bg-neon-cyan/5' : 'border-white/10 bg-dark-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{medals[i]}</span>
                      <div className="text-left">
                        <div className="font-orbitron text-sm" style={{ color: isMe ? '#00d4ff' : 'white' }}>
                          {r.displayName}{isMe ? ' (you)' : ''}
                          {r.eliminated && <span className="ml-2 text-red-500 text-xs">✗</span>}
                        </div>
                        <div className="text-slate-600 text-xs font-mono">{hero.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-orbitron text-sm text-neon-green">{r.finalScore.toLocaleString()}</div>
                      <div className="text-slate-600 text-xs font-mono">
                        {r.questionsCorrect ?? 0} correct · {r.maxStreak}x streak
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Battle rewards */}
            {battleRewards && (
              <div className="mt-4 mb-4 p-3 rounded-xl border border-neon-green/30 bg-neon-green/5">
                <div className="font-orbitron text-xs text-neon-green mb-2">YOUR REWARDS</div>
                {(() => {
                  const myReward = localSocketId ? battleRewards[localSocketId] : null;
                  if (!myReward) return null;
                  return (
                    <div className="flex gap-4 justify-center">
                      <div className="text-center">
                        <div className="font-orbitron text-lg text-neon-cyan">+{myReward.xp}</div>
                        <div className="text-slate-600 text-xs">XP</div>
                      </div>
                      <div className="text-center">
                        <div className="font-orbitron text-lg text-neon-amber">+{myReward.cqt}</div>
                        <div className="text-slate-600 text-xs">CQT</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => navigate('/multiplayer')} variant="neon" className="flex-1">⚔ REMATCH</Button>
              <Button onClick={() => navigate('/world')} variant="ghost" className="flex-1">← WORLD</Button>
            </div>
          </div>
        </Modal>
      </div>

      {/* Reconnect overlay */}
      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="neon-border-cyan bg-dark-800 rounded-2xl p-8 text-center max-w-sm mx-4">
              {reconnectAttempt >= 0 ? (
                <>
                  <div className="spinner w-10 h-10 mx-auto mb-4" />
                  <div className="font-orbitron text-neon-cyan text-sm mb-1">RECONNECTING...</div>
                  <div className="font-mono text-slate-500 text-xs">Attempt {reconnectAttempt + 1} of 3</div>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">⚠️</div>
                  <div className="font-orbitron text-red-400 text-sm mb-4">CONNECTION LOST</div>
                  <Button onClick={() => navigate('/multiplayer')} variant="ghost" className="w-full">← LEAVE BATTLE</Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
