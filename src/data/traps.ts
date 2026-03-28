import type { TrapDef } from '../types';

export const TRAPS: TrapDef[] = [
  {
    id: 'gas_spike',
    name: 'Gas Spike',
    emoji: '⛽',
    deployCost: 3, // consecutive correct answers to charge it
    effect: '2× movement cost for 2 turns in the open world',
    description: 'Floods the mempool with spam transactions, forcing your opponent to pay double gas for 2 turns. Knowledge of gas optimisation can counter it.',
    counterConcept: 'Gas Optimization',
  },
];

export const TRAP_MAP = Object.fromEntries(TRAPS.map(t => [t.id, t]));
