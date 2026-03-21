import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      setAuth(data.user, data.token);
      navigate('/avatar');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md neon-border-cyan bg-dark-800 rounded-xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚡</div>
            <h1 className="font-orbitron font-black text-2xl text-neon-cyan glow-cyan mb-1">CHAIN QUEST</h1>
            <p className="text-slate-500 text-sm">Enter the decentralized realm</p>
          </div>

          {/* Tab toggle */}
          <div className="flex mb-6 rounded-lg overflow-hidden border border-white/10">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 font-orbitron text-xs tracking-widest transition-all ${
                  mode === m ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-slate-500 hover:text-white'
                }`}
              >
                {m === 'login' ? '🔓 LOGIN' : '⚡ REGISTER'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-orbitron text-xs text-slate-400 mb-1 block">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="SatoshiHero"
                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 font-mono text-sm transition-colors"
                maxLength={20}
              />
            </div>
            <div>
              <label className="font-orbitron text-xs text-slate-400 mb-1 block">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-neon-cyan/50 font-mono text-sm transition-colors"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono"
              >
                ⚠ {error}
              </motion.div>
            )}

            <Button type="submit" variant="neon" size="lg" loading={loading} className="w-full mt-2">
              {mode === 'login' ? '🔓 ENTER THE CHAIN' : '⚡ CREATE ACCOUNT'}
            </Button>
          </form>

          {mode === 'register' && (
            <p className="text-center text-slate-600 text-xs mt-4">
              Username: 3–20 chars, letters/numbers/underscore only
            </p>
          )}

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/')} className="text-slate-600 text-xs hover:text-slate-400 font-orbitron">
              ← BACK TO HOME
            </button>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
