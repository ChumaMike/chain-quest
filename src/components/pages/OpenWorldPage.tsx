import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSocket } from '../../hooks/useSocket';
import PhaserGame from '../../game/PhaserGame';
import ProgressBar from '../ui/ProgressBar';
import { WORLDS } from '../../data/curriculum';
import OpenWorldScene from '../../game/scenes/OpenWorldScene';
import { KARABO_INTRO, KARABO_BOSS_NEAR } from '../../data/karabo';
import { KaraboCompanion, useKarabo } from '../ui/KaraboCompanion';
import { apiFetch } from '../../lib/api';
import { isMobile } from '../../utils/device';

interface ChatMsg { id: number; displayName: string; heroClass: string; message: string; self?: boolean }
const EMOTES = ['👋', '🔥', '💀', '😎', '⚡', '🏆'];
const IS_MOBILE = isMobile();

export default function OpenWorldPage() {
  const { user, token } = useAuthStore();
  const { completedWorlds, currentLevel, totalXP } = useGameStore();
  const { controlMode } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const zoneSpawn = (location.state as any)?.zoneSpawn as { x: number; y: number } | undefined;
  const socket = useSocket();
  const [profile, setProfile] = useState<any>(null);
  const [battlePrompt, setBattlePrompt] = useState<{ worldId: number; isBoss: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [currentZone, setCurrentZone] = useState('Central Hub');
  const [zoneCard, setZoneCard] = useState<{ zone: string; worldId: number } | null>(null);
  const [npcTip, setNpcTip] = useState<string | null>(null);
  const [bossClearToast, setBossClearToast] = useState<string | null>(null);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chatMsgId = useRef(0);
  const karabo = useKarabo(1);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const seenZones = useRef<Set<string>>(new Set());
  const joystickZoneRef = useRef<HTMLDivElement>(null);
  const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
  const tiltActiveRef = useRef(true);

  useEffect(() => {
    if (!user || !token) return;
    apiFetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setProfile(data.profile || {}); setLoading(false); })
      .catch(() => { setProfile({}); setLoading(false); });
  }, [user, token]);

  useEffect(() => {
    const handler = (data: any) => {
      setChatMessages(prev => {
        const next = [...prev, { id: chatMsgId.current++, displayName: data.displayName, heroClass: data.heroClass, message: data.message }];
        return next.slice(-50);
      });
    };
    socket.socket.on('world:chat', handler);
    socket.socket.on('world:emote', handler);
    return () => {
      socket.socket.off('world:chat', handler);
      socket.socket.off('world:emote', handler);
    };
  }, []);

  // Boss-clear broadcast toast
  useEffect(() => {
    const handler = (data: any) => {
      setBossClearToast(`🏆 ${data.displayName} just defeated ${data.bossName} in ${data.worldName}!`);
      setTimeout(() => setBossClearToast(null), 4000);
    };
    socket.socket.on('world:boss-clear', handler);
    return () => { socket.socket.off('world:boss-clear', handler); };
  }, []);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  // Tilt-to-move via DeviceOrientation API
  useEffect(() => {
    if (!IS_MOBILE || controlMode !== 'tilt') return;
    const TILT_DEAD = 4;
    const TILT_MAX = 30;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const toAxis = (deg: number) => {
      const d = Math.abs(deg) < TILT_DEAD ? 0 : deg;
      return clamp(d / TILT_MAX, -1, 1);
    };
    const handleTilt = (e: DeviceOrientationEvent) => {
      if (!tiltActiveRef.current) return;
      const gamma = e.gamma ?? 0;  // left/right tilt
      const beta  = e.beta  ?? 0;  // forward/back tilt
      OpenWorldScene.joystickInput = { vx: toAxis(gamma), vy: toAxis(beta - 10) };
    };
    const handleTap = () => {
      OpenWorldScene.joystickInput = { vx: 0, vy: 0 };
      tiltActiveRef.current = false;
      setTimeout(() => { tiltActiveRef.current = true; }, 600);
    };
    window.addEventListener('deviceorientation', handleTilt);
    window.addEventListener('touchstart', handleTap, { passive: true });
    return () => {
      window.removeEventListener('deviceorientation', handleTilt);
      window.removeEventListener('touchstart', handleTap);
      OpenWorldScene.joystickInput = { vx: 0, vy: 0 };
    };
  }, [controlMode]);

  const handleZoneChanged = useCallback((zone: string) => {
    setCurrentZone(zone);
    const world = WORLDS.find(w => w.name === zone);
    if (world && !seenZones.current.has(zone)) {
      seenZones.current.add(zone);
      setZoneCard({ zone, worldId: world.id });
      setTimeout(() => setZoneCard(null), 5000);
      // Karabo intro for this world
      const introMsg = KARABO_INTRO[world.id];
      if (introMsg) karabo.show('intro', introMsg, 6000);
    }
  }, [karabo]);

  const handleNpcTalk = useCallback((worldId: number) => {
    const world = WORLDS.find(w => w.id === worldId);
    if (!world) return;
    const goals = world.learningGoals;
    const tip = goals[Math.floor(Math.random() * goals.length)];
    setNpcTip(tip);
    setTimeout(() => setNpcTip(null), 4000);
  }, []);

  const sendChat = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg) return;
    socket.sendWorldChat(msg);
    setChatInput('');
  }, [chatInput, socket]);

  const sendEmote = useCallback((emote: string) => {
    socket.sendEmote(emote);
  }, [socket]);

  const handleBattleTrigger = useCallback((worldId: number, isBoss: boolean) => {
    setBattlePrompt({ worldId, isBoss });
    setTimeout(() => setBattlePrompt(null), 5000);
  }, []);

  const enterBattle = () => {
    if (battlePrompt) navigate(`/battle/${battlePrompt.worldId}`);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <div className="font-orbitron text-neon-cyan text-sm">LOADING WORLD...</div>
        </div>
      </div>
    );
  }

  const xpToNext = Math.floor(100 * Math.pow(currentLevel, 1.4));
  const playerData = {
    displayName: profile.display_name || user?.username || 'Hero',
    heroClass: profile.hero_class || 'validator',
    avatarColor1: profile.avatar_color_1 || '#00d4ff',
    avatarColor2: profile.avatar_color_2 || '#8b5cf6',
    avatarStyle: profile.avatar_style || 0,
    level: currentLevel,
    worldX: zoneSpawn?.x ?? (profile.world_x || 1600),
    worldY: zoneSpawn?.y ?? (profile.world_y || 980),
    hasGlow: (Array.isArray(profile.inventory) ? profile.inventory : JSON.parse(profile.inventory || '[]')).some((i: any) => i.id === 'neon_glow'),
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ paddingTop: '56px' }}>
      {/* Karabo companion */}
      <KaraboCompanion phase={karabo.phase} message={karabo.message} worldId={karabo.worldId} onDismiss={karabo.dismiss} />

      {/* Phaser canvas */}
      <div className="absolute inset-0" style={{ top: '56px' }}>
        <PhaserGame
          playerData={playerData}
          completedWorlds={completedWorlds}
          onBattleTrigger={handleBattleTrigger}
          onZoneChanged={handleZoneChanged}
          onNpcTalk={handleNpcTalk}
        />
      </div>

      {/* Campaign map shortcut */}
      <button
        onClick={() => navigate('/campaign')}
        className="absolute top-2 left-2 sm:left-4 z-20 flex items-center gap-1 px-2 py-1 rounded font-orbitron text-xs border border-neon-cyan/30 bg-dark-900/70 text-neon-cyan/70 hover:text-neon-cyan hover:border-neon-cyan/60 backdrop-blur-sm"
      >
        ← MAP
      </button>

      {/* HUD overlay */}
      <div className={`absolute top-16 left-2 sm:left-4 z-10 space-y-1.5 sm:space-y-2 game-hud ${IS_MOBILE ? 'w-36' : 'w-48'}`}>
        {/* HP bar */}
        <div className="neon-border-green bg-dark-900/80 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 backdrop-blur-sm">
          <div className="flex justify-between mb-1">
            <span className="font-orbitron text-xs text-neon-green">HP</span>
            <span className="font-mono text-xs text-neon-green">{profile.level ? profile.level * 20 + 80 : 100}</span>
          </div>
          <ProgressBar value={profile.level ? profile.level * 20 + 80 : 100} max={profile.level ? profile.level * 20 + 80 : 100} color="#00ff88" height={IS_MOBILE ? 4 : 6} />
        </div>

        {/* XP bar */}
        <div className="neon-border-cyan bg-dark-900/80 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 backdrop-blur-sm">
          <div className="flex justify-between mb-1">
            <span className="font-orbitron text-xs text-neon-cyan">LVL {currentLevel}</span>
            <span className="font-mono text-xs text-slate-500">{totalXP}/{xpToNext}</span>
          </div>
          <ProgressBar value={totalXP} max={xpToNext} color="#00d4ff" height={IS_MOBILE ? 4 : 6} />
        </div>

        {/* Completed worlds — all 16 */}
        <div className="neon-border-purple bg-dark-900/80 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 backdrop-blur-sm">
          <div className="font-orbitron text-xs text-neon-purple mb-1">
            WORLDS {completedWorlds.length}/16
          </div>
          <div className="flex gap-0.5 flex-wrap">
            {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
              <span
                key={w}
                title={`World ${w}`}
                className={`text-xs font-mono leading-none ${completedWorlds.includes(w) ? 'text-neon-green' : 'text-slate-700'}`}
              >
                {completedWorlds.includes(w) ? '■' : '□'}
              </span>
            ))}
          </div>
        </div>

        {/* Current zone */}
        <div className="bg-dark-900/70 rounded-lg px-2 sm:px-3 py-1.5 backdrop-blur-sm border border-white/10">
          <div className="font-orbitron text-xs text-slate-500">ZONE</div>
          <div className="font-orbitron text-xs text-white truncate">{currentZone}</div>
        </div>
      </div>

      {/* Chat overlay — bottom left */}
      <div className={`absolute z-20 ${IS_MOBILE ? 'bottom-36 left-2 right-2' : 'bottom-14 left-4 w-72'}`}>
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-dark-900/90 backdrop-blur-sm rounded-xl border border-white/10 mb-2 overflow-hidden"
            >
              {/* Message list */}
              <div className="h-40 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
                {chatMessages.length === 0 ? (
                  <div className="text-slate-700 text-xs font-mono text-center pt-4">No messages yet — say hi!</div>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className="flex gap-1.5 items-start">
                      <span className="font-orbitron text-xs flex-shrink-0" style={{ color: '#00d4ff' }}>{msg.displayName.slice(0, 10)}:</span>
                      <span className="font-mono text-xs text-slate-300 break-all">{msg.message}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Emotes */}
              <div className="flex gap-1 px-3 py-1 border-t border-white/5">
                {EMOTES.map(e => (
                  <button key={e} onClick={() => sendEmote(e)} className="text-sm hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2 px-3 py-2 border-t border-white/5">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  maxLength={120}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChat(); e.stopPropagation(); }}
                  placeholder="Say something..."
                  className="flex-1 bg-dark-800 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white placeholder-slate-700 focus:outline-none focus:border-neon-cyan/50"
                />
                <button
                  onClick={sendChat}
                  className="px-2 py-1 rounded font-orbitron text-xs bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/30"
                >
                  ↵
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat toggle button + unread indicator */}
        <button
          onClick={() => { setChatOpen(o => !o); setTimeout(() => chatInputRef.current?.focus(), 50); }}
          className="flex items-center gap-2 bg-dark-900/80 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 hover:border-neon-cyan/40 transition-colors"
        >
          <span className="text-sm">💬</span>
          <span className="font-orbitron text-xs text-slate-400">CHAT</span>
          {!chatOpen && chatMessages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
          )}
        </button>
      </div>

      {/* Battle trigger prompt — enhanced */}
      <AnimatePresence>
        {battlePrompt && (() => {
          const world = WORLDS.find(w => w.id === battlePrompt.worldId);
          const accentColor = battlePrompt.isBoss ? '#ff6b35' : '#00d4ff';
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20"
            >
              <div className={`neon-border-${battlePrompt.isBoss ? 'orange' : 'cyan'} bg-dark-900/95 rounded-xl px-8 py-5 text-center backdrop-blur-sm min-w-64`}>
                <div className="text-3xl mb-2">{battlePrompt.isBoss ? '⚠️' : '⚔️'}</div>
                <div className="font-orbitron font-bold text-sm mb-0.5" style={{ color: accentColor }}>
                  {battlePrompt.isBoss ? 'BOSS ENCOUNTER!' : 'ENEMY ENCOUNTER!'}
                </div>
                {world && (
                  <>
                    <div className="font-orbitron text-xs text-slate-300 mb-0.5">{world.topic.toUpperCase()}</div>
                    {battlePrompt.isBoss && (
                      <div className="text-xs text-slate-500 mb-1">
                        {world.boss.name} · {world.boss.attackName}
                      </div>
                    )}
                    <div className="text-slate-600 text-xs mb-3 italic">Study up before you fight!</div>
                  </>
                )}
                {!world && <div className="text-slate-400 text-xs mb-3">World {battlePrompt.worldId}</div>}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={enterBattle}
                    className="px-5 py-2 rounded font-orbitron text-xs font-bold hover:opacity-90"
                    style={{ background: accentColor, color: '#04060f' }}
                  >
                    ⚔ BATTLE!
                  </button>
                  <button
                    onClick={() => setBattlePrompt(null)}
                    className="px-5 py-2 rounded font-orbitron text-xs border border-white/20 text-slate-400 hover:text-white"
                  >
                    FLEE
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Zone entry topic card — slides in from right */}
      <AnimatePresence>
        {zoneCard && (() => {
          const world = WORLDS.find(w => w.id === zoneCard.worldId);
          if (!world) return null;
          return (
            <motion.div
              key={zoneCard.zone}
              initial={IS_MOBILE ? { opacity: 0, y: 80 } : { opacity: 0, x: 80 }}
              animate={IS_MOBILE ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
              exit={IS_MOBILE ? { opacity: 0, y: 80 } : { opacity: 0, x: 80 }}
              className={IS_MOBILE ? 'absolute bottom-36 left-2 right-2 z-20' : 'absolute top-20 right-4 z-20 w-72'}
            >
              <div className="bg-dark-900/95 backdrop-blur-sm rounded-xl border border-white/15 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-orbitron text-xs text-slate-500 mb-0.5">ENTERING ZONE</div>
                    <div className="font-orbitron font-bold text-sm text-white">{world.emoji} {zoneCard.zone}</div>
                    <div className="font-orbitron text-xs mt-0.5" style={{ color: world.color }}>
                      {world.topic}
                    </div>
                  </div>
                  <button
                    onClick={() => setZoneCard(null)}
                    className="text-slate-600 hover:text-white text-xs ml-2 flex-shrink-0"
                  >✕</button>
                </div>
                <div className="border-t border-white/10 pt-2 space-y-1">
                  {world.learningGoals.map((goal, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-neon-cyan text-xs flex-shrink-0 mt-0.5">✦</span>
                      <span className="font-mono text-xs text-slate-300">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Study NPC tooltip */}
      <AnimatePresence>
        {npcTip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20 max-w-sm"
          >
            <div className="bg-dark-900/95 backdrop-blur-sm rounded-xl border border-purple-500/40 px-5 py-3 text-center">
              <div className="text-xl mb-1">💡</div>
              <div className="font-orbitron text-xs text-purple-300 mb-1">PROFESSOR SAYS:</div>
              <div className="font-mono text-xs text-slate-300">{npcTip}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boss-clear broadcast toast */}
      <AnimatePresence>
        {bossClearToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="bg-dark-900/95 backdrop-blur-sm rounded-xl border border-yellow-500/40 px-6 py-3 text-center">
              <div className="font-orbitron text-xs text-yellow-400">{bossClearToast}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked world notification */}
      <AnimatePresence>
        {lockedMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="bg-dark-900/95 backdrop-blur-sm rounded-xl border border-red-500/40 px-6 py-3 text-center">
              <div className="text-2xl mb-1">🔒</div>
              <div className="font-orbitron text-xs text-red-400">{lockedMsg}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls hint — desktop only */}
      {!IS_MOBILE && (
        <div className="absolute bottom-4 right-4 z-10 text-slate-700 text-xs font-mono">
          WASD / ARROWS · SPACE to jump · Scroll to zoom
        </div>
      )}

      {/* Settings modal — mobile controls */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-800 border border-neon-cyan/20 rounded-xl p-6 w-72 mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-orbitron text-sm text-neon-cyan mb-4">⚙ CONTROLS</h3>
              {(['joystick', 'tilt'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { useSettingsStore.getState().setControlMode(mode); setSettingsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 border font-orbitron text-xs transition-all ${
                    controlMode === mode
                      ? 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan'
                      : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {mode === 'joystick' ? '🕹 Analog Stick' : '📱 Tilt to Move'}
                  {controlMode === mode && <span className="ml-auto text-neon-cyan">●</span>}
                </button>
              ))}
              {controlMode === 'tilt' && (
                <p className="text-slate-500 text-xs mt-2 font-mono leading-relaxed">
                  Tilt device to move. Touch screen to pause movement briefly.
                </p>
              )}
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-full mt-3 py-2 rounded text-slate-500 text-xs hover:text-slate-300 font-orbitron"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile controls ─────────────────────────────────── */}
      {IS_MOBILE && (
        <>
          {/* Settings gear — top right */}
          <button
            className="absolute top-16 right-4 z-30 w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white/50 hover:text-white active:bg-white/10"
            onClick={() => setSettingsOpen(true)}
            aria-label="Controls settings"
          >
            ⚙
          </button>

          {/* Analog joystick — bottom left (joystick mode) */}
          {controlMode === 'joystick' && (
            <div
              ref={joystickZoneRef}
              className="joystick-zone absolute z-30 pb-safe"
              style={{ left: 16, bottom: 16 + (window.innerHeight < 700 ? 0 : 8) }}
              onPointerDown={(e) => {
                const rect = joystickZoneRef.current!.getBoundingClientRect();
                joystickOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                joystickZoneRef.current!.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!joystickOrigin.current) return;
                const dx = e.clientX - joystickOrigin.current.x;
                const dy = e.clientY - joystickOrigin.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 40;
                const norm = dist > maxDist ? maxDist / dist : 1;
                const cx = dx * norm;
                const cy = dy * norm;
                setThumbPos({ x: cx, y: cy });
                OpenWorldScene.joystickInput = { vx: cx / maxDist, vy: cy / maxDist };
              }}
              onPointerUp={() => {
                joystickOrigin.current = null;
                setThumbPos({ x: 0, y: 0 });
                OpenWorldScene.joystickInput = { vx: 0, vy: 0 };
              }}
              onPointerCancel={() => {
                joystickOrigin.current = null;
                setThumbPos({ x: 0, y: 0 });
                OpenWorldScene.joystickInput = { vx: 0, vy: 0 };
              }}
            >
              <div className="relative w-24 h-24 rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                {/* Moving thumb */}
                <div
                  className="absolute w-10 h-10 rounded-full bg-neon-cyan/50 border-2 border-neon-cyan/80 shadow-lg pointer-events-none"
                  style={{
                    transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)`,
                    transition: thumbPos.x === 0 && thumbPos.y === 0 ? 'transform 0.15s ease' : 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Tilt mode indicator — bottom left */}
          {controlMode === 'tilt' && (
            <div className="absolute z-30 left-4 pb-safe" style={{ bottom: 16 }}>
              <div className="w-24 h-24 rounded-full border-2 border-neon-orange/30 bg-black/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-neon-orange/60 text-xs font-mono text-center leading-tight">TILT<br/>MODE</span>
              </div>
            </div>
          )}

          {/* FIGHT button — bottom right */}
          <button
            className="joystick-zone absolute z-30 right-4 pb-safe flex items-center justify-center w-20 h-20 rounded-full font-orbitron text-xs font-black border-2 border-neon-orange/60 bg-neon-orange/20 active:bg-neon-orange/40 backdrop-blur-sm text-neon-orange"
            style={{ bottom: 16 }}
            onPointerDown={() => {
              OpenWorldScene.events.emit('mobile:fight');
            }}
          >
            ⚔<br />FIGHT
          </button>

          {/* JUMP button — bottom right, left of FIGHT */}
          <button
            className="joystick-zone absolute z-30 flex items-center justify-center w-16 h-16 rounded-full font-orbitron text-xs font-black border-2 border-neon-cyan/60 bg-neon-cyan/15 active:bg-neon-cyan/35 backdrop-blur-sm text-neon-cyan"
            style={{ bottom: 24, right: 100 }}
            onPointerDown={() => { OpenWorldScene.events.emit('mobile:jump'); }}
          >
            ↑<br />JUMP
          </button>
        </>
      )}
    </div>
  );
}
