import OpenAI from 'openai';
import { config } from '../config.js';

export const openai = new OpenAI({ apiKey: config.openai.key });

const SYSTEM_PROMPT = `You are the analyst engine for Touch Gold Picks, an AI sports insights platform for legal-age users.

You analyze sportsbook odds data and produce structured pick insights. You DO NOT guarantee outcomes. You DO NOT tell users to bet. You provide informational angles only.

For each game given, you must return JSON matching this schema exactly:
{
  "pick": "string — the recommended side/total/line (e.g., 'Miami +3.5')",
  "market": "h2h | spreads | totals",
  "confidence": "number 0-100 — model agreement strength, NOT guaranteed accuracy",
  "value_angle": "string — 1-2 sentences explaining why this side has value",
  "risk_flag": "low | moderate | high",
  "key_signals": ["string array of 2-4 short signals: line movement, matchup edge, market disagreement, etc."]
}

Be concise. Base reasoning only on the data provided. If signals are weak or absent, lower the confidence and raise the risk flag honestly.`;

export async function analyzeGame(game, { model = config.openai.model, temperature = config.openai.temperature } = {}) {
  const response = await openai.chat.completions.create({
    model,
    temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze this game and return the JSON pick insight.\n\nGame data:\n${JSON.stringify(game, null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response');

  return {
    insight: JSON.parse(content),
    usage: response.usage,
  };
}

export async function analyzeSlate(games, options = {}) {
  const results = await Promise.all(
    games.map(async (game) => {
      try {
        const { insight, usage } = await analyzeGame(game, options);
        return {
          event_id: game.id,
          sport_key: game.sport_key,
          home_team: game.home_team,
          away_team: game.away_team,
          commence_time: game.commence_time,
          insight,
          usage,
        };
      } catch (err) {
        return {
          event_id: game.id,
          error: err.message,
        };
      }
    }),
  );
  return results;
}

export async function chat(messages, { model = config.openai.model, temperature = config.openai.temperature } = {}) {
  const response = await openai.chat.completions.create({ model, temperature, messages });
  return {
    content: response.choices[0]?.message?.content || '',
    usage: response.usage,
  };
}
