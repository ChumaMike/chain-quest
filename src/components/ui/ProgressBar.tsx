import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  bgColor?: string;
  height?: number;
  showText?: boolean;
  label?: string;
  animate?: boolean;
}

export default function ProgressBar({ value, max, color = '#00d4ff', bgColor = 'rgba(255,255,255,0.05)', height = 8, showText, label, animate = true }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const isCritical = pct < 25;

  return (
    <div className="w-full">
      {(label || showText) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-xs font-orbitron text-slate-400">{label}</span>}
          {showText && <span className="text-xs font-mono" style={{ color }}>{value}/{max}</span>}
        </div>
      )}
      <div className="relative rounded-full overflow-hidden" style={{ height, background: bgColor }}>
        <motion.div
          className={`h-full rounded-full ${isCritical ? 'hp-bar critical' : 'hp-bar'}`}
          style={{ background: isCritical ? '#ff2244' : color }}
          initial={animate ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ width: '30%', animation: 'shimmer 2s infinite' }} />
      </div>
    </div>
  );
}
