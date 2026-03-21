const express = require('express');
const router = express.Router();
const { profileHelpers, worldHelpers, userHelpers } = require('../db');
const { authMiddleware } = require('../auth');
const { getBalance } = require('../wallet');

// GET /api/profile/:userId
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const profile = profileHelpers.findByUserId(userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const worldProgress = worldHelpers.getAll(userId);
    const user = userHelpers.findById(userId);

    let cqtBalance = '0';
    if (user && user.wallet_address) {
      cqtBalance = await getBalance(user.wallet_address);
    }

    res.json({
      profile: {
        ...profile,
        completed_worlds: JSON.parse(profile.completed_worlds || '[]'),
        inventory: JSON.parse(profile.inventory || '[]'),
        badges: JSON.parse(profile.badges || '[]'),
      },
      worldProgress,
      cqtBalance,
      walletAddress: user?.wallet_address || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/profile/:userId — update avatar, display name, position
router.patch('/:userId', authMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const allowed = ['display_name', 'hero_class', 'avatar_style', 'avatar_color_1', 'avatar_color_2', 'world_x', 'world_y'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    profileHelpers.update(userId, updates);
    const updated = profileHelpers.findByUserId(userId);
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/:userId/world-complete — record boss defeat + trigger CQT reward
router.post('/:userId/world-complete', authMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const { worldId, score, stars, perfect } = req.body;
    const CQT_REWARDS = [0, 10, 20, 30, 40, 50, 75, 100];
    const cqtReward = (CQT_REWARDS[worldId] || 0) + (perfect ? 10 : 0);

    worldHelpers.upsert(userId, worldId, {
      best_score: score,
      stars: stars || 1,
      boss_defeated: 1,
      cqt_reward: cqtReward,
      completed_at: new Date().toISOString(),
    });

    // Update completed worlds list
    const profile = profileHelpers.findByUserId(userId);
    const completed = JSON.parse(profile.completed_worlds || '[]');
    if (!completed.includes(worldId)) {
      completed.push(worldId);
      profileHelpers.update(userId, {
        completed_worlds: JSON.stringify(completed),
        current_world: Math.max(profile.current_world, worldId + 1),
      });
    }

    profileHelpers.addXP(userId, score * 10);

    res.json({ success: true, cqtReward, message: `World ${worldId} complete! Earned ${cqtReward} CQT` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/:userId/claim-reward — mint CQT tokens after boss defeat
router.post('/:userId/claim-reward', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const { worldId } = req.body;
    const progress = worldHelpers.get(userId, worldId);
    if (!progress || !progress.boss_defeated) return res.status(400).json({ error: 'Boss not defeated yet' });
    if (progress.cqt_claimed) return res.status(400).json({ error: 'Reward already claimed' });

    const user = userHelpers.findById(userId);
    if (!user || !user.wallet_address) return res.status(400).json({ error: 'No wallet address linked. Connect MetaMask first.' });

    const { mintTokens } = require('../wallet');
    const result = await mintTokens(user.wallet_address, progress.cqt_reward);

    if (result.success) {
      worldHelpers.markClaimed(userId, worldId);
      res.json({ success: true, txHash: result.txHash, amount: progress.cqt_reward, simulated: result.simulated });
    } else {
      res.status(500).json({ error: 'Token minting failed: ' + result.error });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
