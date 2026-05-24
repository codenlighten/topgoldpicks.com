import { Router } from 'express';
import { listSports, getOdds, getEvents, getEventOdds, getScores } from '../lib/oddsApi.js';

const router = Router();

router.get('/sports', async (req, res, next) => {
  try {
    const { data, quota } = await listSports({ all: req.query.all === 'true' });
    res.json({ data, quota });
  } catch (err) { next(err); }
});

router.get('/:sport/events', async (req, res, next) => {
  try {
    const { data, quota } = await getEvents(req.params.sport);
    res.json({ data, quota });
  } catch (err) { next(err); }
});

router.get('/:sport/scores', async (req, res, next) => {
  try {
    const { data, quota } = await getScores(req.params.sport, {
      daysFrom: req.query.daysFrom ? parseInt(req.query.daysFrom, 10) : 1,
    });
    res.json({ data, quota });
  } catch (err) { next(err); }
});

router.get('/:sport/events/:eventId', async (req, res, next) => {
  try {
    const { sport, eventId } = req.params;
    const { data, quota } = await getEventOdds(sport, eventId, {
      regions: req.query.regions,
      markets: req.query.markets,
      oddsFormat: req.query.oddsFormat,
    });
    res.json({ data, quota });
  } catch (err) { next(err); }
});

router.get('/:sport', async (req, res, next) => {
  try {
    const { data, quota } = await getOdds(req.params.sport, {
      regions: req.query.regions,
      markets: req.query.markets,
      oddsFormat: req.query.oddsFormat,
      bookmakers: req.query.bookmakers,
    });
    res.json({ data, quota });
  } catch (err) { next(err); }
});

export default router;
