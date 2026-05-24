import cron from 'node-cron';
import { generateAllSports } from './generatePicks.js';

const DAILY_SCHEDULE = process.env.PICKS_CRON || '0 10 * * *';
const TIMEZONE = process.env.PICKS_CRON_TZ || 'UTC';

export function startScheduler() {
  cron.schedule(DAILY_SCHEDULE, async () => {
    console.log(`[scheduler] daily picks generation starting (${new Date().toISOString()})`);
    try {
      const results = await generateAllSports({ force: true });
      const ok = results.filter((r) => r.status === 'generated' || r.status === 'empty').length;
      console.log(`[scheduler] daily picks generation done — ${ok}/${results.length} sports`);
    } catch (err) {
      console.error('[scheduler] daily picks generation failed:', err);
    }
  }, { timezone: TIMEZONE });

  console.log(`[scheduler] cron registered: "${DAILY_SCHEDULE}" (${TIMEZONE})`);

  setImmediate(async () => {
    console.log('[scheduler] startup fill: checking for missing sports…');
    try {
      const results = await generateAllSports({ force: false });
      const generated = results.filter((r) => r.status === 'generated').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      console.log(`[scheduler] startup fill done — ${generated} generated, ${skipped} already current`);
    } catch (err) {
      console.error('[scheduler] startup fill failed:', err);
    }
  });
}
