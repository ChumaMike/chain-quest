const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const { profileHelpers, userHelpers, getDB } = require('../db');

const SHOP_ITEMS = [
  { id: 'hp_potion', name: 'HP Potion', description: 'Restore 30 HP during battle', emoji: '🧪', cost: 5, type: 'consumable', effect: { hp: 30 }, maxStack: 10 },
  { id: 'hint_scroll', name: 'Hint Scroll', description: 'Eliminate one wrong answer', emoji: '📜', cost: 8, type: 'consumable', effect: { hint: true }, maxStack: 10 },
  { id: 'time_freeze', name: 'Time Crystal', description: 'Pause timer for 10 seconds', emoji: '💎', cost: 12, type: 'consumable', effect: { timeFreeze: 10 }, maxStack: 10 },
  { id: 'xp_boost', name: 'XP Boost', description: '2x XP for your next battle', emoji: '⚡', cost: 15, type: 'boost', effect: { xpMultiplier: 2 }, maxStack: 5 },
  { id: 'neon_glow', name: 'Neon Aura', description: 'Cosmetic: your avatar glows with neon light', emoji: '✨', cost: 25, type: 'cosmetic', effect: { glow: true }, maxStack: 1 },
  { id: 'boss_pet', name: 'Mini Boss Pet', description: 'Cosmetic: a mini boss follows you in the world', emoji: '🤖', cost: 50, type: 'cosmetic', effect: { pet: 'mini_boss' }, maxStack: 1 },
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
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check CQT balance
    const balance = user.cqt_balance || 0;
    if (balance < item.cost) {
      return res.status(400).json({ error: `Insufficient CQT. Need ${item.cost}, have ${balance}.`, code: 'INSUFFICIENT_FUNDS' });
    }

    // Check stack limit — parse current inventory
    let inventory = [];
    try { inventory = user.inventory ? JSON.parse(user.inventory) : []; } catch {}
    const existing = inventory.find(i => i.id === itemId);
    if (existing && item.maxStack && (existing.quantity || 1) >= item.maxStack) {
      return res.status(400).json({ error: `You already have the maximum (${item.maxStack}) of this item.`, code: 'MAX_STACK' });
    }

    // Deduct CQT balance
    getDB().prepare('UPDATE users SET cqt_balance = cqt_balance - ? WHERE id = ?').run(item.cost, req.user.userId);

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

    const updatedUser = userHelpers.findById(req.user.userId);
    res.json({ success: true, item, message: `${item.name} added to your inventory!`, newBalance: updatedUser?.cqt_balance || 0 });
  } catch (err) {
    console.error('[Shop] Buy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shop/consume — consume one unit of a consumable item from inventory
router.post('/consume', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || item.type !== 'consumable') return res.status(400).json({ error: 'Item not consumable' });

    const user = userHelpers.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let inventory = [];
    try { inventory = user.inventory ? JSON.parse(user.inventory) : []; } catch {}
    const idx = inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return res.status(400).json({ error: 'Item not in inventory' });

    // Decrement quantity or remove
    if ((inventory[idx].quantity || 1) <= 1) {
      inventory.splice(idx, 1);
    } else {
      inventory[idx].quantity = (inventory[idx].quantity || 1) - 1;
    }

    getDB().prepare('UPDATE users SET inventory = ? WHERE id = ?').run(JSON.stringify(inventory), req.user.userId);
    res.json({ success: true, inventory });
  } catch (err) {
    console.error('[Shop] Consume error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
