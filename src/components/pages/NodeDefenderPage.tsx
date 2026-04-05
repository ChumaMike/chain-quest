import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { HEROES } from '../../data/heroes';
import { WORLDS } from '../../data/curriculum';
import { KARABO_BOSS_DEFEAT } from '../../data/karabo';
import { apiFetch } from '../../lib/api';
import NodeDefenderScene from '../../game/scenes/NodeDefenderScene';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

export default function NodeDefenderPage() {
  const { user, token } = useAuthStore();
  const { completeWorld, addXP } = useGameStore();
  const navigate = useNavigate();
  const location = useLocation();
  const worldId = parseInt(new URLSearchParams(location.search).get('world') ?? '0');
  const world = WORLDS.find(w => w.id === worldId);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [result, setResult] = useState<{ won: boolean; score: number; wavesCleared: number; xpGained: number } | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    apiFetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setProfile(data.profile));
  }, [user, token]);

  const startGame = () => {
    if (!containerRef.current) return;
    setStarted(true);

    const hero = HEROES.find(h => h.id === profile?.hero_class) || HEROES[0];
    const playerData = {
      displayName: profile?.display_name || user?.username || 'PLAYER',
      heroEmoji: hero.emoji,
      heroClass: hero.id,
    };

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'defender-canvas',
      width: 480,
      height: 640,
      backgroundColor: '#04060f',
      scene: [NodeDefenderScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
    gameRef.current = game;

    game.events.once('ready', () => {
      game.scene.start('NodeDefenderScene', { playerData, worldId });
    });

    game.events.on('defender:exit', (data: any) => {
      setResult(data);
      if (data.won) {
        completeWorld(worldId || data.worldId, data.score ?? 3000);
        addXP(data.xpGained ?? 100);
      }
    });
  };

  const handleExit = () => {
    if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }
    navigate('/campaign');
  };

  if (result) {
    const defeatQuote = worldId ? KARABO_BOSS_DEFEAT[worldId] : null;
    return (
      <PageWrapper>
        <div className="min-h-screen bg-grid flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-dark-800 rounded-2xl p-8 text-center neon-border-cyan">
            <div className="text-5xl mb-4">{result.won ? '🛡' : '💀'}</div>
            <h2 className="font-orbitron font-black text-2xl mb-2" style={{ color: result.won ? '#00ff88' : '#ff4444' }}>
              {result.won ? 'NODE SECURED!' : 'NODE COMPROMISED'}
            </h2>
            {world && <p className="text-slate-500 font-orbitron text-xs mb-2">{world.emoji} {world.name}</p>}
            <p className="text-slate-400 font-mono text-sm mb-1">Waves cleared: {result.wavesCleared}/5</p>
            <p className="text-neon-amber font-orbitron text-xs mb-3">+{result.xpGained} XP</p>
            {result.won && defeatQuote && (
              <div className="bg-dark-900/80 rounded-xl px-4 py-3 mb-3 border border-neon-cyan/20 text-left">
                <div className="text-xs font-orbitron text-neon-cyan mb-1">KARABO</div>
                <p className="font-mono text-xs text-slate-300 leading-relaxed italic">"{defeatQuote.split('.')[0]}."</p>
              </div>
            )}
            <div className="flex gap-3 justify-center mt-4">
              <Button onClick={() => { setResult(null); setStarted(false); }} variant="ghost">PLAY AGAIN</Button>
              <Button onClick={handleExit} variant="neon">RETURN TO CAMPAIGN</Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!started) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-grid flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-dark-800 rounded-2xl p-8 text-center" style={{ border: '1px solid #ff880060' }}>
            <div className="text-5xl mb-4">🛡</div>
            <h1 className="font-orbitron font-black text-2xl mb-2" style={{ color: '#ff8800' }}>NODE DEFENDER</h1>
            {world && <p className="text-slate-500 font-mono text-xs mb-3">{world.emoji} {world.name} — {world.topic}</p>}
            <p className="text-slate-400 font-mono text-sm mb-6 leading-relaxed">
              Place defenses to protect the node core from waves of threats.
              Between each wave, answer a question to earn bonus consensus points!
            </p>
            <div className="bg-dark-900 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="font-orbitron text-xs text-slate-500 mb-2">HOW TO PLAY</div>
              {['Tap inside the arena to place defenses', 'Survive all 5 waves of threats', 'Answer questions between waves', 'Correct = +30 CP · Wrong = extra enemies'].map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs" style={{ color: '#ff8800' }}>✦</span>
                  <span className="font-mono text-xs text-slate-300">{r}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/campaign')} variant="ghost">← BACK</Button>
              <Button onClick={startGame} variant="neon" disabled={!profile}>DEFEND!</Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center" style={{ background: '#04060f' }}>
      <div id="defender-canvas" ref={containerRef} className="w-full max-w-lg" style={{ aspectRatio: '3/4' }} />
    </div>
  );
}
