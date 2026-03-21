const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../chainquest.db');
let db;

function initDB() {
  // Ensure the directory exists (important when DB_PATH points to a volume like /data/)
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      wallet_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT,
      hero_class TEXT DEFAULT 'validator',
      avatar_style INTEGER DEFAULT 0,
      avatar_color_1 TEXT DEFAULT '#00d4ff',
      avatar_color_2 TEXT DEFAULT '#8b5cf6',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      current_world INTEGER DEFAULT 1,
      completed_worlds TEXT DEFAULT '[]',
      inventory TEXT DEFAULT '[]',
      badges TEXT DEFAULT '[]',
      world_x REAL DEFAULT 500,
      world_y REAL DEFAULT 500,
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS world_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      world_id INTEGER NOT NULL,
      best_score INTEGER DEFAULT 0,
      stars INTEGER DEFAULT 0,
      boss_defeated INTEGER DEFAULT 0,
      cqt_claimed INTEGER DEFAULT 0,
      cqt_reward INTEGER DEFAULT 0,
      completed_at DATETIME,
      UNIQUE(user_id, world_id)
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      display_name TEXT,
      score INTEGER NOT NULL,
      world_id INTEGER NOT NULL,
      hero_class TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      cqt_cost INTEGER NOT NULL,
      tx_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Database initialized');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

// User helpers
const userHelpers = {
  create: (username, passwordHash) => {
    const db = getDB();
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    const userId = result.lastInsertRowid;
    db.prepare(`INSERT INTO player_profiles (user_id, display_name) VALUES (?, ?)`).run(userId, username);
    return userId;
  },
  findByUsername: (username) => getDB().prepare('SELECT * FROM users WHERE username = ?').get(username),
  findById: (id) => getDB().prepare('SELECT * FROM users WHERE id = ?').get(id),
  updateWallet: (userId, address) => getDB().prepare('UPDATE users SET wallet_address = ? WHERE id = ?').run(address, userId),
};

// Profile helpers
const profileHelpers = {
  findByUserId: (userId) => getDB().prepare('SELECT * FROM player_profiles WHERE user_id = ?').get(userId),
  update: (userId, data) => {
    const db = getDB();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), userId];
    db.prepare(`UPDATE player_profiles SET ${fields} WHERE user_id = ?`).run(...values);
  },
  addXP: (userId, xpAmount) => {
    const db = getDB();
    const profile = db.prepare('SELECT xp, level FROM player_profiles WHERE user_id = ?').get(userId);
    if (!profile) return;
    let newXP = profile.xp + xpAmount;
    let newLevel = profile.level;
    const xpToNext = Math.floor(100 * Math.pow(newLevel, 1.4));
    if (newXP >= xpToNext) { newXP -= xpToNext; newLevel++; }
    db.prepare('UPDATE player_profiles SET xp = ?, level = ? WHERE user_id = ?').run(newXP, newLevel, userId);
    return { newXP, newLevel, leveledUp: newLevel > profile.level };
  },
  addToInventory: (userId, item) => {
    const db = getDB();
    const profile = db.prepare('SELECT inventory FROM player_profiles WHERE user_id = ?').get(userId);
    const inventory = JSON.parse(profile.inventory || '[]');
    const existing = inventory.find(i => i.id === item.id);
    if (existing) { existing.quantity = (existing.quantity || 1) + 1; }
    else { inventory.push({ ...item, quantity: 1 }); }
    db.prepare('UPDATE player_profiles SET inventory = ? WHERE user_id = ?').run(JSON.stringify(inventory), userId);
  },
};

// World progress helpers
const worldHelpers = {
  get: (userId, worldId) => getDB().prepare('SELECT * FROM world_progress WHERE user_id = ? AND world_id = ?').get(userId, worldId),
  getAll: (userId) => getDB().prepare('SELECT * FROM world_progress WHERE user_id = ?').all(userId),
  upsert: (userId, worldId, data) => {
    const db = getDB();
    const existing = db.prepare('SELECT * FROM world_progress WHERE user_id = ? AND world_id = ?').get(userId, worldId);
    if (existing) {
      const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE world_progress SET ${fields} WHERE user_id = ? AND world_id = ?`).run(...Object.values(data), userId, worldId);
    } else {
      db.prepare('INSERT INTO world_progress (user_id, world_id, best_score, stars, boss_defeated, cqt_reward) VALUES (?, ?, ?, ?, ?, ?)').run(
        userId, worldId, data.best_score || 0, data.stars || 0, data.boss_defeated || 0, data.cqt_reward || 0
      );
    }
  },
  markClaimed: (userId, worldId) => {
    getDB().prepare('UPDATE world_progress SET cqt_claimed = 1 WHERE user_id = ? AND world_id = ?').run(userId, worldId);
  },
};

// Leaderboard helpers
const leaderboardHelpers = {
  submit: (userId, username, displayName, score, worldId, heroClass) => {
    getDB().prepare('INSERT INTO leaderboard (user_id, username, display_name, score, world_id, hero_class) VALUES (?, ?, ?, ?, ?, ?)').run(userId, username, displayName, score, worldId, heroClass);
  },
  getGlobal: (limit = 50) => getDB().prepare(`
    SELECT username, display_name, MAX(score) as score, hero_class, world_id
    FROM leaderboard GROUP BY user_id ORDER BY score DESC LIMIT ?
  `).all(limit),
  getByWorld: (worldId, limit = 50) => getDB().prepare(`
    SELECT username, display_name, MAX(score) as score, hero_class
    FROM leaderboard WHERE world_id = ? GROUP BY user_id ORDER BY score DESC LIMIT ?
  `).all(worldId, limit),
};

module.exports = { initDB, getDB, userHelpers, profileHelpers, worldHelpers, leaderboardHelpers };
