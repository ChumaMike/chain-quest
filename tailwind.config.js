/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        dark: {
          900: '#04060f',
          800: '#070c1a',
          700: '#0a1020',
          600: '#0e1628',
        },
        neon: {
          cyan: '#00d4ff',
          blue: '#0066ff',
          purple: '#8b5cf6',
          green: '#00ff88',
          pink: '#ff0080',
          orange: '#ff6b35',
          amber: '#ffb800',
          red: '#ff2244',
        },
        world: {
          1: '#00d4ff',   // Genesis - cyan
          2: '#ffb800',   // Wallet - amber
          3: '#8b5cf6',   // Contracts - purple
          4: '#00ff88',   // DeFi - green
          5: '#ff0080',   // NFT - pink
          6: '#0066ff',   // DAO - blue
          7: '#ff6b35',   // Web3 - orange
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 20px #00d4ff, 0 0 40px #00d4ff33',
        'neon-purple': '0 0 20px #8b5cf6, 0 0 40px #8b5cf633',
        'neon-green': '0 0 20px #00ff88, 0 0 40px #00ff8833',
        'neon-pink': '0 0 20px #ff0080, 0 0 40px #ff008033',
        'neon-orange': '0 0 20px #ff6b35, 0 0 40px #ff6b3533',
        'neon-amber': '0 0 20px #ffb800, 0 0 40px #ffb80033',
        'neon-blue': '0 0 20px #0066ff, 0 0 40px #0066ff33',
        'inner-dark': 'inset 0 2px 20px rgba(0,0,0,0.5)',
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'grid-move': 'gridMove 20s linear infinite',
        'scan': 'scan 4s linear infinite',
        'shake': 'shake 0.5s ease-in-out',
        'streak-burst': 'streakBurst 0.4s ease-out',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gridMove: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(60px)' },
        },
        scan: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        streakBurst: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
