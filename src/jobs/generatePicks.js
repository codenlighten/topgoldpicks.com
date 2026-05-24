import { getOdds } from '../lib/oddsApi.js';
import { analyzeSlate } from '../lib/openai.js';
import { getDb, todayKey } from '../lib/db.js';

export const TRACKED_SPORTS = [
  { key: 'baseball_mlb', limit: 5 },
  { key: 'basketball_nba', limit: 4 },
  { key: 'icehockey_nhl', limit: 4 },
  { key: 'americanfootball_nfl', limit: 5 },
  { key: 'soccer_epl', limit: 4 },
];

export async function generatePicksForSport(sportKey, { limit = 5, force = false } = {}) {
  const db = getDb();
  const date = todayKey();
  const existing = await db.collection('picks').findOne({ sport_key: sportKey, date });
  if (existing && !force) {
    return { sport_key: sportKey, date, status: 'skipped', count: existing.count };
  }

  const { data: games, quota } = await getOdds(sportKey);
  if (!games.length) {
    await db.collection('picks').updateOne(
      { sport_key: sportKey, date },
      {
        $set: {
          sport_key: sportKey,
          date,
          generated_at: new Date(),
          generated_by: 'cron',
          count: 0,
          picks: [],
          odds_quota: quota,
        },
      },
      { upsert: true },
    );
    return { sport_key: sportKey, date, status: 'empty', count: 0 };
  }

  const slate = games.slice(0, limit);
  const picks = await analyzeSlate(slate);

  await db.collection('picks').updateOne(
    { sport_key: sportKey, date },
    {
      $set: {
        sport_key: sportKey,
        date,
        generated_at: new Date(),
        generated_by: 'cron',
        count: picks.length,
        picks,
        odds_quota: quota,
      },
    },
    { upsert: true },
  );

  return { sport_key: sportKey, date, status: 'generated', count: picks.length };
}

export async function generateAllSports({ force = false } = {}) {
  const results = [];
  for (const sport of TRACKED_SPORTS) {
    try {
      const result = await generatePicksForSport(sport.key, { limit: sport.limit, force });
      results.push(result);
      console.log(`[generatePicks] ${sport.key}: ${result.status} (${result.count})`);
    } catch (err) {
      console.error(`[generatePicks] ${sport.key} failed:`, err.message);
      results.push({ sport_key: sport.key, status: 'error', error: err.message });
    }
  }
  return results;
}
