import GlowCard from '../ui/GlowCard';

interface Props {
  goals: [string, string, string];
}

export default function LearningGoals({ goals }: Props) {
  return (
    <GlowCard color="green" hover={false}>
      <p className="font-orbitron text-xs text-neon-green uppercase tracking-widest mb-3">
        What You Need to Know
      </p>
      <div className="space-y-2">
        {goals.map((goal, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="text-neon-green text-sm shrink-0 mt-0.5">✓</span>
            <span className="text-slate-300 text-sm leading-relaxed">{goal}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
