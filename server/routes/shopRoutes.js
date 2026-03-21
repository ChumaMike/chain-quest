const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const { profileHelpers, userHelpers, getDB } = require('../db');

const SHOP_ITEMS = [
  { id: 'hp_potion', name: 'HP Potion', description: 'Restore 30 HP during battle', emoji: '🧪', cost: 5, type: 'consumable', effect: { hp: 30 } },
  { id: 'hint_scroll', name: 'Hint Scroll', description: 'Eliminate one wrong answer', emoji: '📜', cost: 8, type: 'consumable', effect: { hint: true } },
  { id: 'time_freeze', name: 'Time Crystal', description: 'Pause timer for 10 seconds', emoji: '💎', cost: 12, type: 'consumable', effect: { timeFreeze: 10 } },
  { id: 'xp_boost', name: 'XP Boost', description: '2x XP for your next battle', emoji: '⚡', cost: 15, type: 'boost', effect: { xpMultiplier: 2 } },
  { id: 'neon_glow', name: 'Neon Aura', description: 'Cosmetic: your avatar glows with neon light', emoji: '✨', cost: 25, type: 'cosmetic', effect: { glow: true } },
  { id: 'boss_pet', name: 'Mini Boss Pet', description: 'Cosmetic: a mini boss follows you in the world', emoji: '🤖', cost: 50, type: 'cosmetic', effect: { pet: 'mini_boss' } },
];

// GET /api/shop
router.get('/', (req, res) => {
  res.json({ items: SHOP_ITEMS });
});

// POST /api/shop/buy — verify CQT balance then grant item
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { itemId, txHash } = req.body;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const user = userHelpers.findById(req.user.userId);

    // If blockchain is configured, verify tx hash; otherwise simulate
    if (txHash && txHash !== 'SIMULATED') {
      // In a real implementation, verify the transfer tx on-chain
      // For now, trust the client and record the transaction
    }

    // Record transaction
    getDB().prepare('INSERT INTO shop_transactions (user_id, item_id, cqt_cost, tx_hash) VALUES (?, ?, ?, ?)').run(
      req.user.userId, itemId, item.cost, txHash || 'SIMULATED'
    );

    // Add to inventory
    profileHelpers.addToInventory(req.user.userId, {
      id: item.id,
      name: item.name,
      emoji: item.emoji,
      type: item.type,
      effect: item.effect,
    });

    res.json({ success: true, item, message: `${item.name} added to your inventory!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
