import { motion } from 'framer-motion';

interface GlowCardProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const COLOR_CLASSES: Record<string, string> = {
  cyan: 'neon-border-cyan',
  purple: 'neon-border-purple',
  green: 'neon-border-green',
  pink: 'neon-border-pink',
  orange: 'neon-border-orange',
  amber: 'neon-border-amber',
};

export default function GlowCard({ children, color = 'cyan', className = '', onClick, hover = true }: GlowCardProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      onClick={onClick}
      className={`
        bg-dark-800 rounded-lg p-4
        ${COLOR_CLASSES[color] || COLOR_CLASSES.cyan}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
