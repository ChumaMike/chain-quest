import type { SkillTier } from '../types';

export const SKILL_TIERS: SkillTier[] = [
  { tier: 1, title: 'Block Explorer',   worldRange: [1,  3],  color: '#00d4ff' },
  { tier: 2, title: 'Chain Apprentice', worldRange: [4,  6],  color: '#ffb800' },
  { tier: 3, title: 'Protocol Builder', worldRange: [7,  9],  color: '#00ff88' },
  { tier: 4, title: 'DApp Architect',   worldRange: [10, 12], color: '#8b5cf6' },
  { tier: 5, title: 'Network Engineer', worldRange: [13, 14], color: '#f59e0b' },
  { tier: 6, title: 'Chain Sovereign',  worldRange: [15, 16], color: '#ff6b6b' },
];

export function getSkillTier(completedWorldCount: number): SkillTier {
  for (const tier of [...SKILL_TIERS].reverse()) {
    if (completedWorldCount >= tier.worldRange[0]) return tier;
  }
  return SKILL_TIERS[0];
}

export function getTierProgress(completedWorldIds: number[]): {
  current: SkillTier;
  worldsInTier: number;
  totalInTier: number;
} {
  const count = completedWorldIds.length;
  const current = getSkillTier(count);
  const [start, end] = current.worldRange;
  const worldsInTier = completedWorldIds.filter(id => id >= start && id <= end).length;
  return { current, worldsInTier, totalInTier: end - start + 1 };
}
