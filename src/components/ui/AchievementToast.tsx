import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACHIEVEMENTS } from '../../data/achievements';
import { playSound } from '../../game/audio/SoundManager';

interface ToastItem { id: number; achievementId: string }

export default function AchievementToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let nextId = 0;

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      const toastId = nextId++;
      setToasts(prev => [...prev.slice(-2), { id: toastId, achievementId: id }]);
      playSound('achievement');
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 3500);
    };
    window.addEventListener('achievement:unlocked', handler);
    return () => window.removeEventListener('achievement:unlocked', handler);
  }, []);

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const a = ACHIEVEMENTS.find(ac => ac.id === t.achievementId);
          if (!a) return null;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="flex items-center gap-3 bg-dark-800/95 border border-neon-amber/50 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg"
              style={{ boxShadow: '0 0 16px #ffb80033' }}
            >
              <div className="text-3xl">{a.emoji}</div>
              <div>
                <div className="font-orbitron text-xs text-neon-amber font-bold">ACHIEVEMENT UNLOCKED</div>
                <div className="font-orbitron text-sm text-white">{a.name}</div>
                <div className="font-mono text-xs text-slate-400">{a.description}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
