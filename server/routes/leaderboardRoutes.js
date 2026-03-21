const express = require('express');
const router = express.Router();
const { leaderboardHelpers } = require('../db');
const { authMiddleware } = require('../auth');

// GET /api/leaderboard?world=0&limit=50
router.get('/', (req, res) => {
  try {
    const world = parseInt(req.query.world) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const entries = world === 0
      ? leaderboardHelpers.getGlobal(limit)
      : leaderboardHelpers.getByWorld(world, limit);
    res.json({ entries, world, count: entries.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leaderboard/submit
router.post('/submit', authMiddleware, (req, res) => {
  try {
    const { score, worldId, heroClass, displayName } = req.body;
    if (!score || !worldId) return res.status(400).json({ error: 'score and worldId required' });

    leaderboardHelpers.submit(req.user.userId, req.user.username, displayName || req.user.username, score, worldId, heroClass);

    const allEntries = leaderboardHelpers.getGlobal(1000);
    const rank = allEntries.findIndex(e => e.username === req.user.username) + 1;

    res.json({ success: true, rank });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
