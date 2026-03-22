import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useWeb3 } from '../../hooks/useWeb3';
import { toggleMute, isMuted, initAudio } from '../../game/audio/SoundManager';

const NAV_LINKS = [
  { path: '/world', label: 'World', icon: '🌐' },
  { path: '/multiplayer', label: 'Multiplayer', icon: '⚔️' },
  { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { isConnected, walletAddress, cqtBalance, connectWallet } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(isMuted());

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-800/95 border-b border-neon-cyan/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/world" className="flex items-center gap-2 group" onClick={() => setMenuOpen(false)}>
            <span className="text-neon-cyan text-xl">⚡</span>
            <span className="font-orbitron font-bold text-sm text-neon-cyan tracking-widest group-hover:glow-cyan transition-all">
              CHAIN QUEST
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ path, label, icon }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-1.5 rounded font-orbitron text-xs tracking-wider transition-all ${
                  isActive(path)
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-1">{icon}</span>{label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Wallet — desktop only */}
            {isConnected ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-neon-green/10 border border-neon-green/20">
                <span className="text-neon-green text-xs font-mono">
                  💎 {parseFloat(cqtBalance).toFixed(1)} CQT
                </span>
                <span className="text-slate-500 text-xs">|</span>
                <span className="text-slate-400 text-xs font-mono">
                  {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded border border-neon-purple/30 text-neon-purple text-xs font-orbitron hover:bg-neon-purple/10 transition-all"
              >
                🦊 Connect
              </button>
            )}

            {/* Mute toggle */}
            <button
              onClick={() => { initAudio(); setMuted(toggleMute()); }}
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all text-sm"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔊'}
            </button>

            {/* Username — desktop only */}
            <span className="hidden md:block text-slate-400 text-xs font-mono">{user?.username}</span>

            {/* Logout — desktop only */}
            <button
              onClick={handleLogout}
              className="hidden md:block px-2 py-1 rounded text-slate-500 text-xs hover:text-red-400 hover:bg-red-400/10 transition-all font-orbitron"
            >
              EXIT
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
              aria-label="Menu"
            >
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                className="block w-5 h-0.5 bg-neon-cyan origin-center transition-all"
              />
              <motion.span
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="block w-5 h-0.5 bg-neon-cyan"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                className="block w-5 h-0.5 bg-neon-cyan origin-center transition-all"
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-14 left-0 right-0 z-40 bg-dark-800/98 border-b border-neon-cyan/10 backdrop-blur-sm md:hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(({ path, label, icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-orbitron text-sm transition-all ${
                    isActive(path)
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                  {isActive(path) && <span className="ml-auto text-neon-cyan text-xs">●</span>}
                </Link>
              ))}

              <div className="border-t border-white/5 mt-2 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs font-mono">{user?.username}</span>
                  {isConnected && (
                    <span className="text-neon-green text-xs font-mono">
                      💎 {parseFloat(cqtBalance).toFixed(1)} CQT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { initAudio(); setMuted(toggleMute()); }}
                    className="flex items-center justify-center w-8 h-8 rounded border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all text-sm"
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? '🔇' : '🔊'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded text-xs font-orbitron text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-all"
                  >
                    EXIT
                  </button>
                </div>
              </div>

              {!isConnected && (
                <button
                  onClick={() => { connectWallet(); setMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-neon-purple/30 text-neon-purple text-sm font-orbitron hover:bg-neon-purple/10 transition-all"
                >
                  🦊 Connect Wallet
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
