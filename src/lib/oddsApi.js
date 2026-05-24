import { config } from '../config.js';

const { key, baseUrl, defaultRegion, defaultMarkets, defaultOddsFormat } = config.oddsApi;

async function request(path, params = {}) {
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set('apiKey', key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }

  const res = await fetch(url);
  const remaining = res.headers.get('x-requests-remaining');
  const used = res.headers.get('x-requests-used');

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return { data, quota: { remaining, used } };
}

export function listSports({ all = false } = {}) {
  return request('/sports', { all });
}

export function getOdds(sport, {
  regions = defaultRegion,
  markets = defaultMarkets,
  oddsFormat = defaultOddsFormat,
  dateFormat = 'iso',
  bookmakers,
  eventIds,
} = {}) {
  return request(`/sports/${sport}/odds`, {
    regions,
    markets,
    oddsFormat,
    dateFormat,
    bookmakers,
    eventIds,
  });
}

export function getEvents(sport, { dateFormat = 'iso' } = {}) {
  return request(`/sports/${sport}/events`, { dateFormat });
}

export function getEventOdds(sport, eventId, {
  regions = defaultRegion,
  markets = defaultMarkets,
  oddsFormat = defaultOddsFormat,
  dateFormat = 'iso',
} = {}) {
  return request(`/sports/${sport}/events/${eventId}/odds`, {
    regions,
    markets,
    oddsFormat,
    dateFormat,
  });
}

export function getScores(sport, { daysFrom = 1, dateFormat = 'iso' } = {}) {
  return request(`/sports/${sport}/scores`, { daysFrom, dateFormat });
}
