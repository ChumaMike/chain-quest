import GlowCard from '../ui/GlowCard';
import type { BossData } from '../../types';

interface Props {
  boss: BossData;
}

export default function BossCard({ boss }: Props) {
  return (
    <GlowCard color="pink" hover={false}>
      <div className="flex items-start gap-4">
        <span className="text-4xl shrink-0">{boss.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-orbitron font-bold text-neon-pink text-lg">{boss.name}</span>
            <span className="text-slate-400 text-sm italic">"{boss.title}"</span>
          </div>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">{boss.lore}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-neon-pink/10 border border-neon-pink/20 text-neon-pink px-2 py-1 rounded font-mono">
              💀 {boss.maxHP} HP
            </span>
            <span className="text-xs bg-dark-700 border border-white/10 text-slate-400 px-2 py-1 rounded font-mono">
              ⚔️ {boss.attackName}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs font-orbitron text-slate-600 mt-3 uppercase tracking-widest">
        Final Boss — defeat to clear this world
      </p>
    </GlowCard>
  );
}
