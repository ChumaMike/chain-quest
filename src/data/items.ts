import type { ShopItem } from '../types';

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hp_potion',
    name: 'HP Potion',
    description: 'Restore 30 HP instantly during battle. Press [1] to use.',
    emoji: '🧪',
    cost: 5,
    type: 'consumable',
    effect: { hp: 30 },
  },
  {
    id: 'hint_scroll',
    name: 'Hint Scroll',
    description: 'Eliminate one wrong answer during a question. Press [2] to use.',
    emoji: '📜',
    cost: 8,
    type: 'consumable',
    effect: { hint: true },
  },
  {
    id: 'time_freeze',
    name: 'Time Crystal',
    description: 'Pause the question timer for 10 seconds. Press [3] to use.',
    emoji: '💎',
    cost: 12,
    type: 'consumable',
    effect: { timeFreeze: 10 },
  },
  {
    id: 'xp_boost',
    name: 'XP Boost',
    description: '2x XP for your next entire battle.',
    emoji: '⚡',
    cost: 15,
    type: 'boost',
    effect: { xpMultiplier: 2 },
  },
  {
    id: 'neon_glow',
    name: 'Neon Aura',
    description: 'Cosmetic: your avatar radiates a neon glow visible to all players in the open world.',
    emoji: '✨',
    cost: 25,
    type: 'cosmetic',
    effect: { glow: true },
  },
  {
    id: 'boss_pet',
    name: 'Mini Boss Pet',
    description: 'Cosmetic: a tiny version of a defeated boss follows you around the open world.',
    emoji: '🤖',
    cost: 50,
    type: 'cosmetic',
    effect: { pet: 'mini_boss' },
  },
];

export const ITEM_MAP = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));
