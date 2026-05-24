import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './src/config.js';
import { connectDb, closeDb } from './src/lib/db.js';
import { startScheduler } from './src/jobs/scheduler.js';
import oddsRoutes from './src/routes/odds.js';
import picksRoutes from './src/routes/picks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv, time: new Date().toISOString() });
});

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited', detail: 'too many requests, slow down' },
});

const expensiveLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'rate_limited', detail: 'expensive endpoint — slow down' },
});

app.use('/api/odds', apiLimiter, oddsRoutes);
app.use('/api/picks/:sport/events/:eventId', expensiveLimiter);
app.use('/api/picks', apiLimiter, picksRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'internal_error' });
});

async function start() {
  await connectDb();
  startScheduler();
  app.listen(config.port, () => {
    console.log(`Top Gold Picks server listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down…');
  await closeDb();
  process.exit(0);
});
