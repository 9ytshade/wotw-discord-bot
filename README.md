# WOTW Discord Bot

A TypeScript Discord bot for silent Word of the Week games. It tracks all participants, guesses, winners, timestamps, and final stats in Supabase Postgres so active game data survives Render restarts and redeploys.

## Features

- `/startwotw answer:<word> maxwinners:<number>` admin command
- `/endwotw` admin command
- Silent WOTW channel monitoring during active games
- Case-insensitive answer matching
- Persistent Supabase Postgres tables for games, participants, winners, and guesses
- Automatic game end when the winner limit is reached
- Final leaderboard with winners, total participants, total guesses, and full participant list
- Per-user cooldown, defaulting to 3 seconds
- `/health` endpoint for Render web service checks

## Local Setup

Prerequisite: Node.js 24 or newer.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Discord and Supabase values:

   ```env
   DISCORD_TOKEN=
   CLIENT_ID=
   GUILD_ID=
   WOTW_CHANNEL_ID=
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   GUESS_COOLDOWN_SECONDS=3
   PORT=3000
   ```

3. Enable **Message Content Intent** in the Discord Developer Portal for the bot.

4. Invite the bot with these scopes and permissions:

   - Scopes: `bot`, `applications.commands`
   - Bot permissions: View Channels, Send Messages, Read Message History

5. Build and start:

   ```bash
   npm run build
   npm start
   ```

Slash commands are registered to the configured `GUILD_ID` when the bot starts.

## Supabase Setup

1. Create a new Supabase project.
2. Go to **Project Settings** -> **Database**.
3. Copy a Postgres connection string.
4. Use the direct/session connection string if possible for the bot.
5. Replace `[PASSWORD]` with your database password.
6. Set that full value as `DATABASE_URL`.

The bot creates its own tables on startup:

- `games`
- `participants`
- `winners`
- `guesses`

RLS is enabled on these tables as defense in depth. The bot connects server-side through Postgres, not through public browser/API keys.

## Render Free Deployment

This repo includes `render.yaml`, so you can deploy it as a Render web service.

1. Push this project to GitHub.
2. In Render, create a **New Web Service** from the repo.
3. Use these settings:

   ```txt
   Runtime: Node
   Plan: Free
   Build Command: npm ci && npm run build
   Start Command: npm start
   Health Check Path: /health
   ```

4. Add environment variables in Render:

   ```env
   NODE_VERSION=24.14.1
   DISCORD_TOKEN=
   CLIENT_ID=
   GUILD_ID=
   WOTW_CHANNEL_ID=
   DATABASE_URL=
   GUESS_COOLDOWN_SECONDS=3
   ```

5. Deploy.

6. Open Render logs. A successful launch should show:

   ```txt
   Health server listening on port ...
   Logged in as WOTW_Bot#.... Registered 2 guild commands.
   ```

Render Free services may sleep when inactive. The `/health` endpoint exists so an uptime monitor can ping the service periodically.

## Gameplay

Start a game:

```txt
/startwotw answer:NEXURA
```

Optionally set a different winner limit:

```txt
/startwotw answer:NEXURA maxwinners:10
```

After the game starts, the bot does not reply to guesses, react, announce correct answers, or expose rankings. It only posts when the game ends.

End manually:

```txt
/endwotw
```

The game also ends automatically when the configured winner count is reached.

## Useful Local Commands

```bash
npm run build
npm start
npm run dev
```

PM2 scripts remain available for running the bot on a VPS or local always-on machine:

```bash
npm run pm2:start
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
```
