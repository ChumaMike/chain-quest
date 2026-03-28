import type { WorldData } from '../../types';

interface Props {
  worlds: WorldData[];
  selectedId: number;
  onSelect: (id: number) => void;
  completedWorlds: number[];
  currentLevel: number;
}

export default function WorldList({ worlds, selectedId, onSelect, completedWorlds, currentLevel }: Props) {
  return (
    <>
      {/* Desktop: vertical list */}
      <div className="hidden md:flex flex-col gap-1 sticky top-20 self-start">
        <p className="font-orbitron text-xs text-slate-600 uppercase tracking-widest px-2 pb-1">Worlds</p>
        {worlds.map(w => {
          const isSelected  = w.id === selectedId;
          const isCompleted = completedWorlds.includes(w.id);
          const isLocked    = w.unlockLevel > currentLevel;

          return (
            <button
              key={w.id}
              onClick={() => onSelect(w.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all border-l-2 ${
                isSelected
                  ? 'bg-white/5 text-white'
                  : 'border-l-transparent text-slate-400 hover:text-white hover:bg-white/3'
              } ${isLocked && !isSelected ? 'opacity-50' : ''}`}
              style={isSelected ? { borderLeftColor: w.color } : {}}
            >
              <span className="text-lg shrink-0">{w.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-orbitron text-xs truncate">{w.name}</p>
                <p className="text-slate-600 text-xs">W{w.id} · {w.topic}</p>
              </div>
              <span className="shrink-0 text-xs">
                {isCompleted ? '✅' : isLocked ? '🔒' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: horizontal emoji strip */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2 px-1">
        {worlds.map(w => {
          const isSelected  = w.id === selectedId;
          const isCompleted = completedWorlds.includes(w.id);
          const isLocked    = w.unlockLevel > currentLevel;

          return (
            <button
              key={w.id}
              onClick={() => onSelect(w.id)}
              className={`flex-none flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-dark-700 text-white'
                  : 'border-white/10 bg-dark-800 text-slate-400 hover:text-white'
              } ${isLocked && !isSelected ? 'opacity-50' : ''}`}
              style={isSelected ? { borderColor: w.color + '80' } : {}}
            >
              <span className="text-xl">{w.emoji}</span>
              <span className="text-xs font-orbitron" style={isSelected ? { color: w.color } : {}}>W{w.id}</span>
              {isCompleted && <span className="text-xs">✅</span>}
              {!isCompleted && isLocked && <span className="text-xs">🔒</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
