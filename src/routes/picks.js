import { Router } from 'express';
import { getOdds } from '../lib/oddsApi.js';
import { analyzeGame } from '../lib/openai.js';
import { getDb, todayKey } from '../lib/db.js';
import { generatePicksForSport } from '../jobs/generatePicks.js';
import { requireAdmin } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

router.get('/:sport', async (req, res, next) => {
  try {
    const sportKey = req.params.sport;
    const date = todayKey();
    const db = getDb();

    if (req.query.fresh === 'true') {
      const provided = req.header('x-admin-key') || req.query.adminKey;
      if (!config.adminApiKey || provided !== config.adminApiKey) {
        return res.status(401).json({ error: 'unauthorized', detail: 'fresh=true requires admin key' });
      }
      await generatePicksForSport(sportKey, {
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 5,
        force: true,
      });
    }

    let doc = await db.collection('picks').findOne({ sport_key: sportKey, date });

    if (!doc) {
      await generatePicksForSport(sportKey, {
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 5,
      });
      doc = await db.collection('picks').findOne({ sport_key: sportKey, date });
    }

    if (!doc) return res.status(404).json({ error: 'no_slate_available' });

    res.json({
      sport: doc.sport_key,
      date: doc.date,
      generated_at: doc.generated_at,
      generated_by: doc.generated_by,
      count: doc.count,
      odds_quota: doc.odds_quota,
      picks: doc.picks,
      source: 'db',
    });
  } catch (err) { next(err); }
});

router.get('/:sport/events/:eventId', requireAdmin, async (req, res, next) => {
  try {
    const { sport, eventId } = req.params;
    const { data: games } = await getOdds(sport, {
      regions: req.query.regions,
      markets: req.query.markets,
      eventIds: eventId,
    });

    const game = games.find((g) => g.id === eventId);
    if (!game) return res.status(404).json({ error: 'event_not_found' });

    const { insight, usage } = await analyzeGame(game);
    res.json({
      event_id: eventId,
      home_team: game.home_team,
      away_team: game.away_team,
      commence_time: game.commence_time,
      insight,
      usage,
    });
  } catch (err) { next(err); }
});

export default router;
