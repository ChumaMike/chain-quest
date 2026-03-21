import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: 'bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 hover:shadow-neon-cyan',
  secondary: 'bg-neon-purple/10 border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/20 hover:shadow-neon-purple',
  danger: 'bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20',
  ghost: 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5',
  neon: 'bg-neon-cyan text-dark-900 hover:shadow-neon-cyan font-bold',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base',
};

export default function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`
        font-orbitron tracking-wider rounded transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...(props as any)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="spinner w-4 h-4" />
          Loading...
        </span>
      ) : children}
    </motion.button>
  );
}
