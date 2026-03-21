import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import PageWrapper from '../ui/PageWrapper';
import Button from '../ui/Button';

const WORLDS = [
  { id: 1, name: 'Genesis Block', icon: '⛓️', color: '#00d4ff', concept: 'Blockchain Basics' },
  { id: 2, name: 'Wallet Wastes', icon: '🔑', color: '#ffb800', concept: 'Wallets & Keys' },
  { id: 3, name: 'Contract Citadel', icon: '📝', color: '#8b5cf6', concept: 'Smart Contracts' },
  { id: 4, name: 'DeFi Dungeon', icon: '💰', color: '#00ff88', concept: 'Decentralized Finance' },
  { id: 5, name: 'NFT Nexus', icon: '🎨', color: '#ff0080', concept: 'Non-Fungible Tokens' },
  { id: 6, name: 'DAO Dominion', icon: '🏛️', color: '#0066ff', concept: 'Governance & DAOs' },
  { id: 7, name: 'Web3 Frontier', icon: '🌐', color: '#ff6b35', concept: 'Layer 2 & ZK Proofs' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid relative overflow-hidden">
        {/* Scanline */}
        <div className="scanline absolute inset-0 pointer-events-none" />

        {/* Hero */}
        <section className="relative pt-24 pb-16 px-4 text-center">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)' }} />
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 mb-6">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="font-mono text-xs text-neon-green tracking-widest">LIVE ON SEPOLIA TESTNET</span>
            </div>

            <h1 className="font-orbitron font-black text-5xl md:text-7xl mb-4 tracking-tight">
              <span className="text-white">CHAIN</span>
              <span className="text-neon-cyan glow-cyan"> QUEST</span>
            </h1>
            <p className="font-orbitron text-lg md:text-xl text-slate-300 mb-2 tracking-wider">
              THE DECENTRALIZED CHRONICLES
            </p>
            <p className="text-slate-500 text-base max-w-xl mx-auto mb-10">
              Master blockchain through an epic RPG. Battle enemies, learn concepts, earn real{' '}
              <span className="text-neon-green font-mono">CQT tokens</span> on Sepolia, and compete with players worldwide.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="neon"
                onClick={() => navigate(token ? '/world' : '/auth')}
                className="w-full sm:w-auto"
              >
                ⚡ {token ? 'ENTER THE WORLD' : 'START YOUR JOURNEY'}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate('/leaderboard')}
                className="w-full sm:w-auto"
              >
                🏆 LEADERBOARD
              </Button>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-16 flex flex-wrap justify-center gap-8 text-center"
          >
            {[
              { value: '7', label: 'WORLDS' },
              { value: '70', label: 'QUESTIONS' },
              { value: '4', label: 'HERO CLASSES' },
              { value: '8', label: 'PLAYERS/ROOM' },
              { value: 'CQT', label: 'SEPOLIA TOKEN' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="font-orbitron font-black text-2xl text-neon-cyan glow-cyan">{value}</div>
                <div className="font-mono text-xs text-slate-500 tracking-widest">{label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* World Grid */}
        <section className="py-16 px-4 max-w-6xl mx-auto">
          <h2 className="font-orbitron text-center text-2xl font-bold text-white mb-2">THE 7 WORLDS</h2>
          <p className="text-center text-slate-500 text-sm mb-10">Each world unlocks deeper blockchain knowledge</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {WORLDS.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-lg p-3 text-center border border-white/5 bg-dark-800 hover:scale-105 transition-transform cursor-default"
                style={{ borderColor: w.color + '33', boxShadow: `0 0 20px ${w.color}11` }}
              >
                <div className="text-2xl mb-1">{w.icon}</div>
                <div className="font-orbitron text-xs font-bold mb-0.5" style={{ color: w.color }}>{w.name}</div>
                <div className="text-slate-600 text-xs">{w.concept}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🗺️', title: 'PIXEL OPEN WORLD', desc: 'Explore a 2D cyberpunk world with other players. Walk through blockchain zones, find enemies, enter boss portals.', color: 'cyan' },
              { icon: '⚔️', title: 'BATTLE TO LEARN', desc: 'Answer blockchain MCQs to deal damage. Streak multipliers, boss battles, and 70 questions across 7 worlds.', color: 'purple' },
              { icon: '💎', title: 'REAL TOKEN REWARDS', desc: 'Defeat bosses to earn CQT tokens on the Sepolia testnet. Spend them in-game shop on items and cosmetics.', color: 'green' },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className={`neon-border-${color} bg-dark-800 rounded-xl p-6`}>
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className={`font-orbitron font-bold text-sm mb-2 glow-${color}`} style={{ color: color === 'cyan' ? '#00d4ff' : color === 'purple' ? '#8b5cf6' : '#00ff88' }}>{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center">
          <h2 className="font-orbitron text-3xl font-black text-white mb-4">
            READY TO <span className="text-neon-cyan glow-cyan">DECENTRALIZE</span>?
          </h2>
          <p className="text-slate-400 mb-8">Join the fight against the Centralized Empire.</p>
          <Button size="lg" variant="neon" onClick={() => navigate(token ? '/world' : '/auth')}>
            ⚡ BEGIN NOW — IT'S FREE
          </Button>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 text-center text-slate-600 text-xs font-mono">
          CHAIN QUEST © 2026 · Built on ABC Blockchain Curriculum · Powered by Sepolia Testnet
        </footer>
      </div>
    </PageWrapper>
  );
}
