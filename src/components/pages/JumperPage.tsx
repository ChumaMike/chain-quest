import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { HEROES } from '../../data/heroes';
import { apiFetch } from '../../lib/api';
import JumperScene from '../../game/scenes/JumperScene';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

export default function JumperPage() {
  const { user, token } = useAuthStore();
  const { unlockAchievement } = useGameStore();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [result, setResult] = useState<{ won: boolean; lives: number } | null>(null);
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
      parent: 'jumper-canvas',
      width: 400,
      height: 640,
      backgroundColor: '#04060f',
      scene: [JumperScene],
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0, x: 0 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });
    gameRef.current = game;

    game.events.once('ready', () => {
      game.scene.start('JumperScene', playerData);
    });

    game.events.on('jumper:exit', (data: any) => {
      setResult(data);
      if (data.won && data.lives === 3) {
        unlockAchievement('jumper_ace');
      }
    });
  };

  const handleExit = () => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    navigate('/campaign');
  };

  if (result) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-grid flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-dark-800 rounded-2xl p-8 text-center neon-border-cyan">
            <div className="text-5xl mb-4">{result.won ? '🏆' : '💔'}</div>
            <h2 className="font-orbitron font-black text-2xl mb-2" style={{ color: result.won ? '#f59e0b' : '#ff4444' }}>
              {result.won ? 'SUMMIT REACHED!' : 'FELL SHORT'}
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-2">Lives remaining: {result.lives}</p>
            {result.won && result.lives === 3 && (
              <p className="text-neon-amber font-orbitron text-xs mb-4">🪂 Achievement unlocked: Jumper Ace!</p>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={() => { setResult(null); setStarted(false); }} variant="ghost">
                PLAY AGAIN
              </Button>
              <Button onClick={handleExit} variant="neon">
                RETURN TO WORLD
              </Button>
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
          <div className="max-w-sm w-full bg-dark-800 rounded-2xl p-8 text-center neon-border-cyan">
            <div className="text-5xl mb-4">🪂</div>
            <h1 className="font-orbitron font-black text-2xl text-neon-cyan mb-2">THE JUMPER</h1>
            <p className="text-slate-400 font-mono text-sm mb-6 leading-relaxed">
              Climb an infinite tower of platforms. Every third platform triggers a blockchain question.
              Answer correctly for a speed boost. Wrong — lose a life. 3 lives to reach the summit.
            </p>
            <div className="bg-dark-900 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="font-orbitron text-xs text-slate-500 mb-2">CONTROLS</div>
              {[
                'SPACE / ↑ to jump',
                'Click / Tap to jump on mobile',
                'Answer questions on purple platforms',
                '20 seconds to answer each question',
              ].map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-neon-cyan text-xs">✦</span>
                  <span className="font-mono text-xs text-slate-300">{r}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/campaign')} variant="ghost">← BACK</Button>
              <Button onClick={startGame} variant="neon" disabled={!profile}>
                JUMP IN
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center" style={{ background: '#04060f' }}>
      <div id="jumper-canvas" ref={containerRef} className="w-full max-w-md" style={{ aspectRatio: '5/8' }} />
    </div>
  );
}
