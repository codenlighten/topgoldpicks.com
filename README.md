# topgoldpicks.com

AI-enhanced sports pick insights platform. Pulls live odds, runs them through GPT-4o-mini, and serves daily pick insights with confidence + value-angle analysis.

> Informational platform for users of legal age. Not betting advice. No outcome guarantees.

## Stack

- **Backend:** Node.js + Express (ESM)
- **AI:** OpenAI `gpt-4o-mini`, JSON-mode structured output
- **Odds:** [The Odds API](https://the-odds-api.com)
- **Storage:** MongoDB Atlas (`picks` collection, daily slates)
- **Scheduling:** `node-cron` daily at 10:00 UTC
- **Frontend:** Static HTML/CSS/JS (no framework) served from `/public`

## Layout

```
public/index.html            # landing page + live Gold Board
server.js                    # Express entry
src/
  config.js                  # env loading + validation
  lib/
    db.js                    # MongoDB client + picks collection
    oddsApi.js               # The Odds API helper
    openai.js                # GPT-4o-mini analysis
  jobs/
    generatePicks.js         # one-sport / all-sports generation
    scheduler.js             # cron + startup fill
  middleware/
    auth.js                  # X-Admin-Key gate
  routes/
    odds.js                  # /api/odds/*
    picks.js                 # /api/picks/* (DB-first)
```

## Getting started

```bash
cp .env.example .env         # fill in keys
npm install
npm run dev                  # auto-reload
# or
npm start
```

Server boots on `http://localhost:3000`. On boot it connects to Mongo, registers the daily cron, and runs a startup fill for any sport missing today's slate.

## API

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/health` | — | Health check |
| `GET /api/odds/sports` | — | List of sports |
| `GET /api/odds/:sport` | — | Live odds for a sport |
| `GET /api/odds/:sport/events` | — | Upcoming events |
| `GET /api/odds/:sport/events/:eventId` | — | Odds for one event |
| `GET /api/odds/:sport/scores?daysFrom=3` | — | Recent scores |
| `GET /api/picks/:sport` | — | Today's pre-generated picks (from DB) |
| `GET /api/picks/:sport?fresh=true` | **admin** | Force regenerate (burns OpenAI tokens) |
| `GET /api/picks/:sport/events/:eventId` | **admin** | Live AI insight for one game |

Admin endpoints require `X-Admin-Key: $ADMIN_API_KEY` header (or `?adminKey=…` query).

## Pre-generation

To avoid hitting OpenAI on every page load, picks are generated once per day and cached in MongoDB:

- **Daily cron** at `0 10 * * *` UTC regenerates every sport in `TRACKED_SPORTS`.
- **Startup fill** runs on each server start, generating only sports missing today's row.
- **Lazy fill** also runs if a route is hit for a sport that wasn't pre-generated.

Configure schedule via `PICKS_CRON` / `PICKS_CRON_TZ` env vars. Edit `TRACKED_SPORTS` in `src/jobs/generatePicks.js` to add or remove sports.

## Rate limiting

- `/api/odds/*` and `/api/picks/*` — 60 req/min/IP
- `/api/picks/:sport/events/:eventId` — 10 req/min/IP (live OpenAI calls)

## Compliance

This is an informational platform. The system prompt forbids outcome guarantees and frames confidence as model agreement, not predictive accuracy. Always show responsible-gaming notices and 21+ disclaimers to end users.
