import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { ACHIEVEMENTS } from '../../data/achievements';
import { useWeb3 } from '../../hooks/useWeb3';
import { WORLDS } from '../../data/curriculum';
import { HEROES } from '../../data/heroes';
import ProgressBar from '../ui/ProgressBar';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

const SHOP_ITEMS = [
  { id: 'hp_potion', name: 'HP Potion', icon: '🧪', desc: 'Restore 30 HP in battle', cost: 5 },
  { id: 'hint_scroll', name: 'Hint Scroll', icon: '📜', desc: 'Eliminate a wrong answer', cost: 8 },
  { id: 'time_freeze', name: 'Time Freeze', icon: '⏸️', desc: 'Pause the timer for 10s', cost: 12 },
  { id: 'xp_boost', name: 'XP Boost', icon: '⚡', desc: '2x XP for one battle', cost: 15 },
  { id: 'neon_glow', name: 'Neon Glow', icon: '✨', desc: 'Cosmetic avatar glow effect', cost: 25 },
  { id: 'boss_pet', name: 'Boss Pet', icon: '👾', desc: 'Mini boss follows you in world', cost: 50 },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const { totalXP, currentLevel, completedWorlds, unlockedAchievements } = useGameStore();
  const { walletAddress, cqtBalance, connectWallet, refreshBalance, claimReward } = useWeb3();

  const [profile, setProfile] = useState<any>(null);
  const [worldProgress, setWorldProgress] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingItem, setBuyingItem] = useState<string | null>(null);
  const [buyResult, setBuyResult] = useState<{ itemId: string; success: boolean } | null>(null);

  const xpToNext = Math.floor(100 * Math.pow(currentLevel, 1.4));

  useEffect(() => {
    if (!user || !token) return;
    fetch(`/api/profile/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setProfile(data.profile);
        setWorldProgress(data.worldProgress || []);
        try {
          setInventory(data.profile?.inventory ? JSON.parse(data.profile.inventory) : []);
        } catch { setInventory([]); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, token]);

  useEffect(() => {
    if (walletAddress) refreshBalance();
  }, [walletAddress]);

  const handleBuy = async (itemId: string) => {
    if (!token || !user) return;
    setBuyingItem(itemId);
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId, userId: user.id }),
      });
      const data = await res.json();
      setBuyResult({ itemId, success: data.success });
      if (data.success) {
        setInventory(prev => [...prev, { id: itemId, quantity: 1 }]);
        refreshBalance();
      }
    } catch { setBuyResult({ itemId, success: false }); }
    finally {
      setBuyingItem(null);
      setTimeout(() => setBuyResult(null), 3000);
    }
  };

  const hero = profile ? HEROES.find(h => h.id === profile.hero_class) || HEROES[0] : HEROES[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-10 h-10 mx-auto mb-3" />
          <div className="font-orbitron text-neon-cyan text-sm">LOADING PROFILE...</div>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-16 pb-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Hero card */}
          <div className="neon-border-cyan bg-dark-800 rounded-xl p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-xl flex items-center justify-center text-5xl"
                  style={{ background: `linear-gradient(135deg, ${profile?.avatar_color_1 || '#00d4ff'}33, ${profile?.avatar_color_2 || '#8b5cf6'}22)`, border: `2px solid ${profile?.avatar_color_1 || '#00d4ff'}66` }}>
                  {hero.emoji}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-dark-900 border border-neon-amber/50 rounded-full px-2 py-0.5">
                  <span className="font-orbitron text-xs text-neon-amber">LVL {currentLevel}</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="font-orbitron font-black text-xl text-white truncate">
                    {profile?.display_name || user?.username}
                  </h1>
                  <span className="font-mono text-xs text-slate-600">@{user?.username}</span>
                </div>
                <div className="font-orbitron text-xs mb-3" style={{ color: hero.color }}>{hero.name.toUpperCase()}</div>

                {/* XP bar */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-orbitron text-xs text-neon-cyan">EXPERIENCE</span>
                    <span className="font-mono text-xs text-slate-500">{totalXP.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
                  </div>
                  <ProgressBar value={totalXP} max={xpToNext} color="#00d4ff" height={8} />
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="text-slate-600 hover:text-red-400 font-orbitron text-xs transition-colors flex-shrink-0"
              >
                LOGOUT
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="neon-border-purple bg-dark-800 rounded-xl p-5">
                <h2 className="font-orbitron text-sm text-neon-purple mb-4">BATTLE STATS</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Level', value: currentLevel, color: '#ffb800' },
                    { label: 'Worlds Cleared', value: completedWorlds.length, color: '#00ff88' },
                    { label: 'Total XP', value: totalXP.toLocaleString(), color: '#00d4ff' },
                    { label: 'Hero Class', value: hero.name, color: hero.color },
                  ].map(s => (
                    <div key={s.label} className="bg-dark-900 rounded-lg p-3">
                      <div className="font-orbitron text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-slate-600 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* World progress */}
              <div className="neon-border-green bg-dark-800 rounded-xl p-5">
                <h2 className="font-orbitron text-sm text-neon-green mb-4">WORLD PROGRESS</h2>
                <div className="space-y-2">
                  {WORLDS.map(w => {
                    const progress = worldProgress.find(wp => wp.world_id === w.id);
                    const cleared = completedWorlds.includes(w.id) || progress?.boss_defeated;
                    const stars = progress?.stars || 0;
                    return (
                      <div key={w.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <span className="text-xl flex-shrink-0">{w.boss.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-orbitron text-xs" style={{ color: cleared ? w.color : '#666' }}>{w.name}</span>
                            {cleared && <span className="text-neon-green text-xs">✓</span>}
                          </div>
                          {progress?.best_score > 0 && (
                            <div className="text-slate-600 text-xs font-mono">Best: {progress.best_score.toLocaleString()} pts</div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {stars > 0 ? (
                            <span className="text-sm">{stars >= 3 ? '⭐⭐⭐' : stars >= 2 ? '⭐⭐' : '⭐'}</span>
                          ) : (
                            <span className="text-slate-700 text-xs font-mono">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Achievements */}
              <div className="neon-border-amber bg-dark-800 rounded-xl p-5">
                <h2 className="font-orbitron text-sm text-neon-amber mb-1">ACHIEVEMENTS</h2>
                <div className="text-slate-600 text-xs font-mono mb-3">{unlockedAchievements.length}/{ACHIEVEMENTS.length} unlocked</div>
                <div className="grid grid-cols-2 gap-2">
                  {ACHIEVEMENTS.map(a => {
                    const earned = unlockedAchievements.includes(a.id);
                    return (
                      <div key={a.id} className={`rounded-lg p-2 border transition-all ${earned ? 'border-neon-amber/40 bg-neon-amber/5' : 'border-white/5 bg-dark-900 opacity-40'}`}>
                        <div className="text-xl mb-1">{a.emoji}</div>
                        <div className={`font-orbitron text-xs ${earned ? 'text-neon-amber' : 'text-slate-600'}`}>{a.name}</div>
                        <div className="text-slate-600 text-xs mt-0.5 leading-tight">{a.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Web3 wallet */}
              <div className="neon-border-amber bg-dark-800 rounded-xl p-5">
                <h2 className="font-orbitron text-sm text-neon-amber mb-4">💎 WEB3 WALLET</h2>
                {walletAddress ? (
                  <div>
                    <div className="bg-dark-900 rounded-lg p-3 mb-3">
                      <div className="font-mono text-xs text-slate-400 mb-1">CONNECTED ADDRESS</div>
                      <div className="font-mono text-xs text-neon-cyan break-all">{walletAddress}</div>
                    </div>
                    <div className="flex items-center justify-between bg-dark-900 rounded-lg p-3 mb-3">
                      <div>
                        <div className="font-orbitron text-lg text-neon-green">{cqtBalance} CQT</div>
                        <div className="text-slate-600 text-xs">Sepolia Testnet Balance</div>
                      </div>
                      <button onClick={refreshBalance} className="text-xs font-mono text-slate-600 hover:text-white border border-white/10 px-2 py-1 rounded transition-colors">
                        ↺ REFRESH
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-3">🦊</div>
                    <p className="text-slate-500 text-xs mb-4">Connect MetaMask to earn and spend CQT tokens on Sepolia</p>
                    <Button onClick={connectWallet} variant="neon" className="w-full">
                      CONNECT METAMASK
                    </Button>
                  </div>
                )}
              </div>

              {/* Inventory */}
              <div className="neon-border-cyan bg-dark-800 rounded-xl p-5">
                <h2 className="font-orbitron text-sm text-neon-cyan mb-4">INVENTORY</h2>
                {inventory.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">🎒</div>
                    <div className="text-slate-600 text-xs font-mono">Empty — visit the shop below!</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {inventory.map((item, i) => {
                      const shopItem = SHOP_ITEMS.find(s => s.id === item.id);
                      return (
                        <div key={i} className="bg-dark-900 rounded-lg p-3 text-center border border-white/10">
                          <div className="text-2xl mb-1">{shopItem?.icon || '📦'}</div>
                          <div className="font-orbitron text-xs text-white">{shopItem?.name || item.id}</div>
                          {item.quantity > 1 && <div className="text-slate-600 text-xs">×{item.quantity}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Shop */}
              <div className="neon-border-orange bg-dark-800 rounded-xl p-5">
                <h2 className="font-orbitron text-sm text-neon-orange mb-1">CQT SHOP</h2>
                {!walletAddress && (
                  <p className="text-slate-600 text-xs mb-3 font-mono">Connect wallet to spend CQT</p>
                )}
                <div className="space-y-2">
                  {SHOP_ITEMS.map(item => {
                    const owned = inventory.find(i => i.id === item.id);
                    const isBuying = buyingItem === item.id;
                    const result = buyResult?.itemId === item.id ? buyResult : null;
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-900 border border-white/5 hover:border-white/10 transition-colors">
                        <span className="text-xl flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-orbitron text-xs text-white">{item.name}</div>
                          <div className="text-slate-600 text-xs">{item.desc}</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="font-orbitron text-xs text-neon-amber mb-1">{item.cost} CQT</div>
                          {result ? (
                            <div className={`text-xs font-mono ${result.success ? 'text-neon-green' : 'text-red-400'}`}>
                              {result.success ? '✓ Bought!' : '✗ Failed'}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleBuy(item.id)}
                              disabled={!walletAddress || isBuying}
                              className="text-xs font-orbitron px-2 py-1 rounded border border-neon-amber/30 text-neon-amber hover:bg-neon-amber/10 disabled:opacity-30 transition-all"
                            >
                              {isBuying ? '...' : 'BUY'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Edit avatar CTA */}
          <div className="text-center">
            <Button onClick={() => navigate('/avatar')} variant="ghost">
              ✏ EDIT AVATAR
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
