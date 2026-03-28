import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { HEROES } from '../../data/heroes';
import { apiFetch } from '../../lib/api';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

const COLORS = [
  { name: 'Cyan', value: '#00d4ff' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#00ff88' },
  { name: 'Pink', value: '#ff0080' },
  { name: 'Amber', value: '#ffb800' },
  { name: 'Orange', value: '#ff6b35' },
  { name: 'White', value: '#e2e8f0' },
  { name: 'Red', value: '#ff2244' },
];

export default function AvatarCreatorPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [selectedHero, setSelectedHero] = useState(0);
  const [color1, setColor1] = useState('#00d4ff');
  const [color2, setColor2] = useState('#8b5cf6');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const hero = HEROES[selectedHero];

  const handleSave = async () => {
    if (!displayName.trim() || !user) return;
    setSaving(true);
    try {
      await apiFetch(`/api/profile/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: displayName.trim(),
          hero_class: hero.id,
          avatar_style: selectedHero,
          avatar_color_1: color1,
          avatar_color_2: color2,
        }),
      });
      navigate('/world');
    } catch {
      setSaving(false);
      setSaveError('Failed to save avatar. Please try again.');
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-16 pb-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-orbitron font-black text-3xl text-white mb-2">
              CREATE YOUR <span className="text-neon-cyan glow-cyan">AVATAR</span>
            </h1>
            <p className="text-slate-500">Choose your hero class and customize your look</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Avatar preview */}
            <div className="neon-border-cyan bg-dark-800 rounded-xl p-6">
              <h2 className="font-orbitron text-sm text-neon-cyan mb-4">PREVIEW</h2>

              {/* Avatar display */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Glow ring */}
                  <div className="absolute inset-0 rounded-full opacity-30 scale-150" style={{ background: `radial-gradient(circle, ${color1} 0%, transparent 70%)` }} />
                  {/* Body */}
                  <div className="relative w-24 h-36 rounded-sm flex flex-col items-center justify-start gap-1 pt-2" style={{ background: `linear-gradient(135deg, ${color1}33, ${color2}22)`, border: `2px solid ${color1}66` }}>
                    {/* Head */}
                    <div className="w-10 h-10 rounded-sm" style={{ background: color1, opacity: 0.9 }} />
                    {/* Body */}
                    <div className="w-14 h-16 rounded-sm" style={{ background: `linear-gradient(180deg, ${color1}bb, ${color2}88)` }} />
                    {/* Hero emoji */}
                    <div className="absolute -top-6 text-2xl">{hero.emoji}</div>
                  </div>
                  {/* Name tag */}
                  <div className="text-center mt-2 font-orbitron text-xs" style={{ color: color1 }}>
                    {displayName || 'YOUR NAME'}
                  </div>
                  <div className="text-center font-mono text-xs text-slate-500">LVL 1</div>
                </div>
              </div>

              {/* Display name input */}
              <div>
                <label className="font-orbitron text-xs text-slate-400 mb-1 block">DISPLAY NAME</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={16}
                  className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon-cyan/50"
                  placeholder="How others see you in the world"
                />
              </div>
            </div>

            {/* Right: Customization */}
            <div className="space-y-6">
              {/* Hero class */}
              <div className="neon-border-purple bg-dark-800 rounded-xl p-6">
                <h2 className="font-orbitron text-sm text-neon-purple mb-4">HERO CLASS</h2>
                <div className="grid grid-cols-2 gap-3">
                  {HEROES.map((h, i) => (
                    <motion.button
                      key={h.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedHero(i)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedHero === i
                          ? 'border-neon-cyan/50 bg-neon-cyan/10'
                          : 'border-white/10 bg-dark-900 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xl mb-1">{h.emoji}</div>
                      <div className="font-orbitron text-xs font-bold" style={{ color: h.color }}>{h.name}</div>
                      <div className="text-slate-500 text-xs mt-1">HP:{h.baseHP} ATK:x{h.attackMultiplier}</div>
                      <div className="text-slate-600 text-xs mt-1 leading-tight">{h.passiveAbility}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="neon-border-green bg-dark-800 rounded-xl p-6">
                <h2 className="font-orbitron text-sm text-neon-green mb-4">COLORS</h2>
                <div className="mb-3">
                  <label className="font-orbitron text-xs text-slate-400 mb-2 block">PRIMARY COLOR</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setColor1(c.value)}
                        className={`w-8 h-8 rounded-full transition-all ${color1 === c.value ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                        style={{ background: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-orbitron text-xs text-slate-400 mb-2 block">SECONDARY COLOR</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setColor2(c.value)}
                        className={`w-8 h-8 rounded-full transition-all ${color2 === c.value ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                        style={{ background: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Hero stats info */}
              <div className="neon-border-amber bg-dark-800 rounded-xl p-4">
                <div className="font-orbitron text-xs text-neon-amber mb-2">PASSIVE: {hero.passiveAbility}</div>
                <p className="text-slate-400 text-xs">{hero.passiveDescription}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="font-orbitron text-sm text-neon-green">{hero.baseHP}</div>
                    <div className="text-slate-600 text-xs">HP</div>
                  </div>
                  <div>
                    <div className="font-orbitron text-sm text-neon-orange">x{hero.attackMultiplier}</div>
                    <div className="text-slate-600 text-xs">ATTACK</div>
                  </div>
                  <div>
                    <div className="font-orbitron text-sm text-neon-cyan">{hero.defenseReduction * 100}%</div>
                    <div className="text-slate-600 text-xs">DEFENSE</div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} loading={saving} variant="neon" size="lg" className="w-full" disabled={!displayName.trim()}>
                ⚡ ENTER THE WORLD
              </Button>
              {saveError && <p className="text-red-400 text-xs font-mono text-center mt-2">{saveError}</p>}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
