import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  oddsApi: {
    key: required('ODDS_API_KEY'),
    baseUrl: 'https://api.the-odds-api.com/v4',
    defaultRegion: process.env.ODDS_DEFAULT_REGION || 'us',
    defaultMarkets: process.env.ODDS_DEFAULT_MARKETS || 'h2h,spreads,totals',
    defaultOddsFormat: process.env.ODDS_DEFAULT_FORMAT || 'american',
  },

  openai: {
    key: required('OPENAI_API_KEY'),
    model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE || '0.7'),
  },

  mongodbUri: process.env.MONGODB_URI,

  adminApiKey: process.env.ADMIN_API_KEY || '',
};
