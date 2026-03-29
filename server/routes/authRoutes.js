const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword, signToken, authMiddleware } = require('../auth');
const { userHelpers, profileHelpers } = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Username must be 3–20 characters' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores' });

    const existing = userHelpers.findByUsername(username);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await hashPassword(password);
    const userId = userHelpers.create(username, passwordHash);
    const token = signToken({ userId, username });

    res.status(201).json({ token, user: { id: userId, username } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = userHelpers.findByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = signToken({ userId: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — verify token
router.get('/me', authMiddleware, (req, res) => {
  const user = userHelpers.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user.id, username: user.username, wallet_address: user.wallet_address } });
});

// PATCH /api/auth/wallet — link wallet address + drip Sepolia ETH on first link
router.patch('/wallet', authMiddleware, (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    const { sendEth } = require('../wallet');
    const existing = userHelpers.findById(req.user.userId);
    const isNewWallet = !existing?.wallet_address;
    userHelpers.updateWallet(req.user.userId, walletAddress);
    // Fire-and-forget: drip 0.005 Sepolia ETH so the player can pay gas fees
    if (isNewWallet) {
      sendEth(walletAddress, 0.005).catch(() => {});
    }
    res.json({ success: true, walletAddress, ethDripped: isNewWallet });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
