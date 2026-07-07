import express from 'express';
import cors from 'cors';
import { bot } from './bot';
import { env } from './config/env';
import { testConnection } from './db';
import { startAlertWorker, stopAlertWorker } from './workers/alertWorker';
import chatRouter from './api/chat';

const app = express();

// ────────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ────────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*', // Configure this in production to specific domains
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ────────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ────────────────────────────────────────────────────────────────────────────────
app.use('/api', chatRouter);

// ────────────────────────────────────────────────────────────────────────────────
// ROOT HEALTH CHECK
// ────────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    service: 'IHSG Analytics Bot',
    status: 'running',
    version: '2.0.0',
    endpoints: {
      chat: 'POST /api/chat',
      health: 'GET /api/health',
    },
  });
});

async function main() {
  // Test database connection (graceful degradation if fails)
  const result = await testConnection();
  if (result.success) {
    console.log('[System] Database connected and ready.');
  } else {
    console.warn('[System] Database connection failed - watchlist features may be unavailable:', result.error);
    console.warn('[System] Bot will continue running with limited functionality.');
  }

  // Start alert worker (runs in background, checks every 5 minutes during trading hours)
  if (result.success) {
    startAlertWorker();
    console.log('[System] Alert worker started (checks every 5 minutes during trading hours)');
  } else {
    console.warn('[System] Alert worker not started due to database connection failure');
  }

  if (env.NODE_ENV === 'production') {
    const path = `/webhook/${bot.secretPathComponent()}`;
    app.use(bot.webhookCallback(path));

    app.listen(env.PORT, () => {
      console.log(`Server aktif pada port ${env.PORT}`);
    });
  } else {
    await bot.launch();
    console.log('Sistem aktif dalam mode Polling');
  }
}

main().catch((err) => {
  console.error('Gagal menjalankan aplikasi:', err);
  process.exit(1);
});

process.once('SIGINT', () => {
  stopAlertWorker();
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  stopAlertWorker();
  bot.stop('SIGTERM');
});