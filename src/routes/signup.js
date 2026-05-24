import { Router } from 'express';
import { getDb } from '../lib/db.js';
import { sendWelcomeEmail } from '../lib/mailer.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_PLANS = new Set(['free', 'gold', 'pro']);
const ALLOWED_SOURCES = new Set(['plans', 'cta', 'hero', 'nav', 'board']);

router.post('/', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const plan = ALLOWED_PLANS.has(req.body?.plan) ? req.body.plan : 'free';
    const source = ALLOWED_SOURCES.has(req.body?.source) ? req.body.source : 'plans';

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'invalid_email' });
    }

    const db = getDb();
    const now = new Date();
    const result = await db.collection('signups').updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          status: 'pending',
          createdAt: now,
          welcomeSent: false,
        },
        $set: {
          plan,
          source,
          updatedAt: now,
          ip: req.ip,
          userAgent: req.get('user-agent') || '',
        },
      },
      { upsert: true },
    );

    const isNew = result.upsertedCount === 1;

    if (isNew) {
      sendWelcomeEmail({ to: email, plan })
        .then(async (info) => {
          if (info && info.skipped) {
            console.log(`[signup] welcome skipped (${info.reason}) for ${email}`);
            return;
          }
          await db.collection('signups').updateOne(
            { email },
            { $set: { welcomeSent: true, welcomeSentAt: new Date() } },
          );
          console.log(`[signup] welcome sent to ${email}`);
        })
        .catch((err) => {
          console.error(`[signup] welcome failed for ${email}:`, err.message);
        });
    }

    res.json({ ok: true, plan, source, returning: !isNew });
  } catch (err) { next(err); }
});

export default router;
