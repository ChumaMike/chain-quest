import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type KaraboPhase = 'idle' | 'intro' | 'hint' | 'celebrate' | 'encourage' | 'streak' | 'boss';

interface KaraboCompanionProps {
  phase: KaraboPhase;
  message?: string;
  worldId?: number;
  onDismiss?: () => void;
}

// Wing complexity grows with world tier
function getWingTier(worldId: number): 1 | 2 | 3 {
  if (worldId <= 5) return 1;
  if (worldId <= 10) return 2;
  return 3;
}

function KaraboSprite({ worldId = 1, phase }: { worldId: number; phase: KaraboPhase }) {
  const wingTier = getWingTier(worldId);
  const isExcited = phase === 'celebrate' || phase === 'streak';
  const isPulsing = phase === 'boss' || phase === 'hint';

  return (
    <svg width="64" height="72" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow halo */}
      <circle cx="32" cy="16" r="14" fill={isExcited ? '#fde68a' : '#fef3c7'} opacity="0.25" />

      {/* Body */}
      <rect x="22" y="24" width="20" height="24" rx="4" fill="#fde68a" />

      {/* Head */}
      <circle cx="32" cy="16" r="10" fill="#fef9c3" />
      {/* Eyes */}
      <circle cx="28" cy="15" r="2" fill="#78350f" />
      <circle cx="36" cy="15" r="2" fill="#78350f" />
      {/* Eye shine */}
      <circle cx="28.7" cy="14.3" r="0.7" fill="white" />
      <circle cx="36.7" cy="14.3" r="0.7" fill="white" />
      {/* Smile */}
      <path d={isExcited ? 'M28 19 Q32 23 36 19' : 'M28 19 Q32 21 36 19'} stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Halo ring */}
      <ellipse cx="32" cy="5" rx="9" ry="3" stroke="#f59e0b" strokeWidth="2" fill="none"
        opacity={isPulsing ? 0.6 : 1} />

      {/* Wings — Tier 1: simple */}
      {wingTier >= 1 && (
        <>
          {/* Left wing */}
          <path d="M22 32 L6 24 L10 36 L22 38 Z" fill="#fde68a" opacity="0.8" />
          <line x1="22" y1="32" x2="6" y2="24" stroke="#f59e0b" strokeWidth="1" opacity="0.6" />
          <line x1="22" y1="35" x2="10" y2="28" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" />
          {/* Right wing */}
          <path d="M42 32 L58 24 L54 36 L42 38 Z" fill="#fde68a" opacity="0.8" />
          <line x1="42" y1="32" x2="58" y2="24" stroke="#f59e0b" strokeWidth="1" opacity="0.6" />
          <line x1="42" y1="35" x2="54" y2="28" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" />
        </>
      )}

      {/* Wings — Tier 2: double wings */}
      {wingTier >= 2 && (
        <>
          <path d="M22 36 L2 44 L8 54 L22 46 Z" fill="#fde68a" opacity="0.6" />
          <line x1="22" y1="40" x2="2" y2="48" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" />
          <path d="M42 36 L62 44 L56 54 L42 46 Z" fill="#fde68a" opacity="0.6" />
          <line x1="42" y1="40" x2="62" y2="48" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" />
        </>
      )}

      {/* Wings — Tier 3: full span, branching transaction paths */}
      {wingTier >= 3 && (
        <>
          <path d="M20 28 L-4 16 L0 30 L20 36 Z" fill="#fde68a" opacity="0.4" />
          <path d="M44 28 L68 16 L64 30 L44 36 Z" fill="#fde68a" opacity="0.4" />
          {/* Branch paths */}
          <line x1="20" y1="30" x2="-4" y2="16" stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
          <line x1="20" y1="28" x2="2" y2="10" stroke="#f59e0b" strokeWidth="0.6" opacity="0.3" />
          <line x1="44" y1="30" x2="68" y2="16" stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
          <line x1="44" y1="28" x2="62" y2="10" stroke="#f59e0b" strokeWidth="0.6" opacity="0.3" />
          {/* Node dots on branches */}
          <circle cx="-2" cy="17" r="2" fill="#f59e0b" opacity="0.7" />
          <circle cx="66" cy="17" r="2" fill="#f59e0b" opacity="0.7" />
          <circle cx="2" cy="11" r="1.5" fill="#fde68a" opacity="0.6" />
          <circle cx="62" cy="11" r="1.5" fill="#fde68a" opacity="0.6" />
        </>
      )}

      {/* Dress/robe bottom */}
      <path d="M22 48 L18 68 L32 64 L46 68 L42 48 Z" fill="#fde68a" opacity="0.9" />

      {/* Sparkles when celebrating */}
      {isExcited && (
        <>
          <circle cx="8" cy="12" r="2" fill="#fbbf24" opacity="0.9" />
          <circle cx="56" cy="10" r="1.5" fill="#fbbf24" opacity="0.8" />
          <circle cx="14" cy="60" r="1.5" fill="#fbbf24" opacity="0.7" />
          <circle cx="50" cy="62" r="2" fill="#fbbf24" opacity="0.9" />
        </>
      )}
    </svg>
  );
}

const phaseColors: Record<KaraboPhase, string> = {
  idle: 'border-amber-500/40 bg-amber-950/60',
  intro: 'border-amber-400/70 bg-amber-950/80',
  hint: 'border-cyan-400/70 bg-cyan-950/80',
  celebrate: 'border-green-400/70 bg-green-950/80',
  encourage: 'border-violet-400/70 bg-violet-950/80',
  streak: 'border-orange-400/70 bg-orange-950/80',
  boss: 'border-red-400/70 bg-red-950/80',
};

const phaseLabel: Record<KaraboPhase, string> = {
  idle: '',
  intro: 'KARABO',
  hint: 'KARABO HINT',
  celebrate: 'KARABO',
  encourage: 'KARABO',
  streak: 'KARABO',
  boss: 'KARABO',
};

export function KaraboCompanion({ phase, message, worldId = 1, onDismiss }: KaraboCompanionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (phase !== 'idle' && message) {
      setVisible(true);
      if (phase === 'celebrate' || phase === 'streak') {
        const t = setTimeout(() => setVisible(false), 3500);
        return () => clearTimeout(t);
      }
      if (phase === 'encourage') {
        const t = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(t);
      }
    } else {
      setVisible(false);
    }
  }, [phase, message]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Dialogue bubble */}
      <AnimatePresence>
        {visible && message && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`max-w-xs rounded-xl border p-3 shadow-lg backdrop-blur-sm pointer-events-auto ${phaseColors[phase]}`}
          >
            {phaseLabel[phase] && (
              <p className="text-xs font-bold text-amber-400 tracking-widest mb-1 font-orbitron">
                {phaseLabel[phase]}
              </p>
            )}
            <p className="text-sm text-white/90 leading-snug">{message}</p>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="mt-2 text-xs text-white/50 hover:text-white/80 transition-colors pointer-events-auto"
              >
                [dismiss]
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Karabo sprite */}
      <motion.div
        animate={{
          y: [0, -6, 0],
          filter: phase === 'boss'
            ? ['drop-shadow(0 0 6px #f59e0b)', 'drop-shadow(0 0 14px #ef4444)', 'drop-shadow(0 0 6px #f59e0b)']
            : ['drop-shadow(0 0 4px #f59e0b)', 'drop-shadow(0 0 10px #fde68a)', 'drop-shadow(0 0 4px #f59e0b)'],
        }}
        transition={{
          y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
          filter: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="cursor-pointer pointer-events-auto"
        onClick={() => setVisible(v => !v)}
        title="Karabo — click to toggle message"
      >
        <KaraboSprite worldId={worldId} phase={phase} />
      </motion.div>
    </div>
  );
}

// Convenience hook for battle integration
import { useRef } from 'react';

export function useKarabo(worldId: number) {
  const [phase, setPhase] = useState<KaraboPhase>('idle');
  const [message, setMessage] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (newPhase: KaraboPhase, msg: string, duration?: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase(newPhase);
    setMessage(msg);
    if (duration) {
      timerRef.current = setTimeout(() => {
        setPhase('idle');
        setMessage('');
      }, duration);
    }
  };

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('idle');
    setMessage('');
  };

  return { phase, message, show, dismiss, worldId };
}
