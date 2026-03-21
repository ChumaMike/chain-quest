import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWeb3 } from '../../hooks/useWeb3';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { isConnected, walletAddress, cqtBalance, connectWallet } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-800 border-b border-neon-cyan/10 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/world" className="flex items-center gap-2 group">
          <span className="text-neon-cyan text-xl">⚡</span>
          <span className="font-orbitron font-bold text-sm text-neon-cyan tracking-widest group-hover:glow-cyan transition-all">
            CHAIN QUEST
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { path: '/world', label: 'World', icon: '🌐' },
            { path: '/multiplayer', label: 'Multiplayer', icon: '⚔️' },
            { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
            { path: '/profile', label: 'Profile', icon: '👤' },
          ].map(({ path, label, icon }) => (
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
        <div className="flex items-center gap-3">
          {/* Wallet */}
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

          {/* User */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-mono hidden sm:block">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="px-2 py-1 rounded text-slate-500 text-xs hover:text-red-400 hover:bg-red-400/10 transition-all font-orbitron"
            >
              EXIT
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
