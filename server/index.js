const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('⚠️  WARNING: JWT_SECRET is not set — auth endpoints will fail until it is configured.');
}

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? true // Railway serves frontend same-origin — allow all
  : (process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
      : ['http://localhost:5173', 'http://localhost:3001']);

const { initDB } = require('./db');
const authRoutes = require('./routes/authRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const shopRoutes = require('./routes/shopRoutes');
const { initSocketHandlers } = require('./socket/socketHandlers');

const app = express();
const httpServer = http.createServer(app);

// Security headers (disable CSP/COEP to allow Phaser WebGL)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, try again in 15 minutes.' },
});

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '50kb' }));
app.use('/api', apiLimiter);

// Init database
initDB();

// REST routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/shop', shopRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Socket.IO handlers
initSocketHandlers(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n⚡ CHAIN QUEST Server running on port ${PORT}`);
  console.log(`   REST API: http://localhost:${PORT}/api`);
  console.log(`   Socket:   ws://localhost:${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('[Server] Shutting down gracefully...');
  httpServer.close(() => {
    io.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { app, io };
