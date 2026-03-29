import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { HEROES } from '../../data/heroes';
import { apiFetch } from '../../lib/api';
import DuelScene from '../../game/scenes/DuelScene';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

export default function DuelPage() {
  const { user, token } = useAuthStore();
  const { unlockedAchievements, unlockAchievement } = useGameStore();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [result, setResult] = useState<{ playerWon: boolean; playerHP: number; opponentHP: number } | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    apiFetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setProfile(data.profile));
  }, [user, token]);

  const startDuel = () => {
    if (!containerRef.current) return;
    setStarted(true);

    const hero = HEROES.find(h => h.id === profile?.hero_class) || HEROES[0];
    const playerData = {
      displayName: profile?.display_name || user?.username || 'YOU',
      heroEmoji: hero.emoji,
      heroClass: hero.id,
    };

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'duel-canvas',
      width: 480,
      height: 640,
      backgroundColor: '#04060f',
      scene: [DuelScene],
      physics: { default: 'arcade', arcade: { gravity: { y: 0, x: 0 } } },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });
    gameRef.current = game;

    // Pass player data after scene is ready
    game.events.once('ready', () => {
      game.scene.start('DuelScene', playerData);
    });

    // Listen for exit event
    game.events.on('duel:exit', (data: any) => {
      setResult(data);
      if (data.playerWon) {
        unlockAchievement('first_duel');
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
            <div className="text-5xl mb-4">{result.playerWon ? '⚔' : '💀'}</div>
            <h2 className="font-orbitron font-black text-2xl mb-2" style={{ color: result.playerWon ? '#00ff88' : '#ff4444' }}>
              {result.playerWon ? 'VICTORY' : 'DEFEATED'}
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-2">
              Your HP: {result.playerHP} | Opponent HP: {result.opponentHP}
            </p>
            {result.playerWon && !unlockedAchievements.includes('first_duel') && (
              <p className="text-neon-amber font-orbitron text-xs mb-4">⚔ Achievement unlocked: First Duel!</p>
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
          <div className="max-w-sm w-full bg-dark-800 rounded-2xl p-8 text-center neon-border-amber">
            <div className="text-5xl mb-4">⚔</div>
            <h1 className="font-orbitron font-black text-2xl text-neon-amber mb-2">THE DUEL</h1>
            <p className="text-slate-400 font-mono text-sm mb-6 leading-relaxed">
              Face an AI opponent in a 1v1 quiz battle. Click an answer to fire a projectile at your opponent.
              First to 0 HP loses. Knowledge is your weapon.
            </p>
            <div className="bg-dark-900 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="font-orbitron text-xs text-slate-500 mb-2">RULES</div>
              {[
                '8 questions from all worlds',
                'Correct answer = -30 HP to opponent',
                'Wrong answer = -20 HP to you',
                'AI reacts after ~1 second',
              ].map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-neon-amber text-xs">✦</span>
                  <span className="font-mono text-xs text-slate-300">{r}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/campaign')} variant="ghost">← BACK</Button>
              <Button onClick={startDuel} variant="neon" disabled={!profile}>
                START DUEL
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center" style={{ background: '#04060f' }}>
      <div id="duel-canvas" ref={containerRef} className="w-full max-w-lg" style={{ aspectRatio: '3/4' }} />
    </div>
  );
}
