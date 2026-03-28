import type { WorldData } from '../../types';

interface Props {
  world: WorldData;
  isCompleted: boolean;
  stars?: number;
  currentLevel: number;
}

export default function WorldHeader({ world, isCompleted, stars = 0, currentLevel }: Props) {
  const locked = world.unlockLevel > currentLevel;

  return (
    <div className={`rounded-xl overflow-hidden bg-gradient-to-r ${world.gradient} relative`}>
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: world info */}
          <div className="flex items-start gap-4">
            <span className="text-5xl">{world.emoji}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-orbitron font-black text-xl text-white">{world.name.toUpperCase()}</h2>
                <span className="text-xs font-mono text-white/60">W{world.id}</span>
              </div>
              <p className="text-white/70 text-sm mt-0.5">{world.subtitle}</p>
              <p className="text-white/60 text-xs mt-2 max-w-lg leading-relaxed">{world.description}</p>
            </div>
          </div>

          {/* Right: status */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isCompleted ? (
              <div className="flex items-center gap-1.5 bg-neon-green/20 border border-neon-green/40 px-3 py-1.5 rounded-lg">
                <span className="text-neon-green font-orbitron text-xs">CLEARED</span>
                <span className="text-yellow-400 text-sm">
                  {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                </span>
              </div>
            ) : locked ? (
              <div className="flex items-center gap-1.5 bg-black/30 border border-white/20 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400 font-orbitron text-xs">🔒 Requires Level {world.unlockLevel}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-black/30 border border-white/20 px-3 py-1.5 rounded-lg">
                <span className="text-slate-300 font-orbitron text-xs">Available</span>
              </div>
            )}
            <span className="text-xs bg-black/30 border border-white/20 px-2 py-1 rounded font-mono text-white/70">
              💎 {world.cqtReward} CQT reward
            </span>
          </div>
        </div>

        {/* Enemy types + topic */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs bg-black/30 border border-white/15 text-white/60 px-2 py-1 rounded font-orbitron">
            {world.topic}
          </span>
          {world.enemyTypes.map(e => (
            <span key={e} className="text-xs bg-black/20 border border-white/10 text-white/50 px-2 py-1 rounded font-mono">
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
