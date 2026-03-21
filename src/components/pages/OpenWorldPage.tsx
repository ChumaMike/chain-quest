import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useSocket } from '../../hooks/useSocket';
import PhaserGame from '../../game/PhaserGame';
import ProgressBar from '../ui/ProgressBar';
import { WORLDS } from '../../data/curriculum';

interface ChatMsg { id: number; displayName: string; heroClass: string; message: string; self?: boolean }
const EMOTES = ['👋', '🔥', '💀', '😎', '⚡', '🏆'];

export default function OpenWorldPage() {
  const { user, token } = useAuthStore();
  const { completedWorlds, currentLevel, totalXP } = useGameStore();
  const navigate = useNavigate();
  const socket = useSocket();
  const [profile, setProfile] = useState<any>(null);
  const [battlePrompt, setBattlePrompt] = useState<{ worldId: number; isBoss: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [currentZone, setCurrentZone] = useState('Central Hub');
  const [zoneCard, setZoneCard] = useState<{ zone: string; worldId: number } | null>(null);
  const [npcTip, setNpcTip] = useState<string | null>(null);
  const [bossClearToast, setBossClearToast] = useState<string | null>(null);
  const chatMsgId = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const seenZones = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !token) return;
    fetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setProfile(data.profile); setLoading(false); })
      .catch(() => { setLoading(false); setLoadError(true); });
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

  const handleZoneChanged = useCallback((zone: string) => {
    setCurrentZone(zone);
    const world = WORLDS.find(w => w.name === zone);
    if (world && !seenZones.current.has(zone)) {
      seenZones.current.add(zone);
      setZoneCard({ zone, worldId: world.id });
      setTimeout(() => setZoneCard(null), 5000);
    }
  }, []);

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

  if (loadError) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="font-orbitron text-red-400 text-sm mb-4">Failed to load world data</div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded font-orbitron text-xs font-bold"
            style={{ background: '#00d4ff', color: '#04060f' }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

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
    worldX: profile.world_x || 1600,
    worldY: profile.world_y || 980,
    hasGlow: (Array.isArray(profile.inventory) ? profile.inventory : JSON.parse(profile.inventory || '[]')).some((i: any) => i.id === 'neon_glow'),
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ paddingTop: '56px' }}>
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

      {/* HUD overlay */}
      <div className="absolute top-16 left-4 z-10 space-y-2">
        {/* HP bar */}
        <div className="neon-border-green bg-dark-900/80 rounded-lg px-3 py-2 w-48 backdrop-blur-sm">
          <div className="flex justify-between mb-1">
            <span className="font-orbitron text-xs text-neon-green">HP</span>
            <span className="font-mono text-xs text-neon-green">{profile.level ? profile.level * 20 + 80 : 100}</span>
          </div>
          <ProgressBar value={profile.level ? profile.level * 20 + 80 : 100} max={profile.level ? profile.level * 20 + 80 : 100} color="#00ff88" height={6} />
        </div>

        {/* XP bar */}
        <div className="neon-border-cyan bg-dark-900/80 rounded-lg px-3 py-2 w-48 backdrop-blur-sm">
          <div className="flex justify-between mb-1">
            <span className="font-orbitron text-xs text-neon-cyan">LVL {currentLevel}</span>
            <span className="font-mono text-xs text-slate-500">{totalXP}/{xpToNext}</span>
          </div>
          <ProgressBar value={totalXP} max={xpToNext} color="#00d4ff" height={6} />
        </div>

        {/* Completed worlds */}
        <div className="neon-border-purple bg-dark-900/80 rounded-lg px-3 py-2 w-48 backdrop-blur-sm">
          <div className="font-orbitron text-xs text-neon-purple mb-1">WORLDS CLEARED</div>
          <div className="flex gap-1 flex-wrap">
            {[1,2,3,4,5,6,7].map(w => (
              <span key={w} className={`text-xs font-mono ${completedWorlds.includes(w) ? 'text-neon-green' : 'text-slate-700'}`}>
                {completedWorlds.includes(w) ? '✓' : '·'}{w}
              </span>
            ))}
          </div>
        </div>

        {/* Current zone */}
        <div className="bg-dark-900/70 rounded-lg px-3 py-1.5 w-48 backdrop-blur-sm border border-white/10">
          <div className="font-orbitron text-xs text-slate-500">LOCATION</div>
          <div className="font-orbitron text-xs text-white truncate">{currentZone}</div>
        </div>
      </div>

      {/* Chat overlay — bottom left */}
      <div className="absolute bottom-14 left-4 z-20 w-72">
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
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              className="absolute top-20 right-4 z-20 w-72"
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

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10 text-slate-700 text-xs font-mono">
        WASD / ARROWS · Scroll to zoom
      </div>
    </div>
  );
}
