# Backend

Cloudflare Worker API with one SQLite-backed Durable Object per anonymous game session. The Durable Object serializes wallet changes, stores round/seed records and uses alarms to settle rounds without a connected browser.

## Local development

Requirements: Node.js 22+. From this directory, run:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd test
npm.cmd run dev
```

If npm 11 reports blocked scripts for `esbuild` or `workerd`, review and approve those Wrangler dependencies with `npm.cmd install-scripts approve esbuild workerd`, then rerun `npm.cmd ci`.

The Worker listens on `http://localhost:8788`; serve the frontend separately from the repository root at `http://localhost:5500`.

Before using `npm.cmd run dev`, create a local `.dev.vars` file with fresh development-only secrets. The file is ignored by Git:

```powershell
$sessionSecret = (node -p "require('crypto').randomBytes(32).toString('hex')").Trim()
$seedKey = (node -p "require('crypto').randomBytes(32).toString('base64')").Trim()
@"
SESSION_SECRET="$sessionSecret"
SEED_ENCRYPTION_KEY="$seedKey"
"@ | Set-Content -Encoding ascii .dev.vars
```

## Secrets

Set secrets with Wrangler, not in `wrangler.toml`, frontend files or Git:

- `SESSION_SECRET`: a private random value used to sign session tokens.
- `SEED_ENCRYPTION_KEY`: Base64 encoding of 32 cryptographically random bytes, used to encrypt server seeds at rest.

To generate an encryption key and upload it:

```powershell
$key = (node -p "require('crypto').randomBytes(32).toString('base64')").Trim()
$key | .\node_modules\.bin\wrangler.cmd secret put SEED_ENCRYPTION_KEY
```

Generate `SESSION_SECRET` separately. Keep a backup of both; if `SEED_ENCRYPTION_KEY` is lost or replaced, stored unrevealed seeds can't be read.

## Deploy

1. Set `ALLOWED_ORIGINS` in `wrangler.toml` to comma-separated exact origins, for example `"http://localhost:5500,https://USERNAME.github.io"`. Origins include scheme and hostname only, not the repository path.
2. Authenticate and configure secrets if needed:

   ```powershell
   npx.cmd wrangler login
   npx.cmd wrangler secret put SESSION_SECRET
   npx.cmd wrangler secret put SEED_ENCRYPTION_KEY
   ```

3. From this folder, run `npm.cmd test`, then:

   ```powershell
   npm.cmd run deploy
   ```

## Endpoints

Everything except `/health` and `POST /api/session` needs the token `POST /api/session` returns, sent as an `Authorization: Bearer <token>` header (the events WebSocket sends it as a `gamba-auth.` subprotocol instead). Endpoints marked "key" also need an `Idempotency-Key` header.

| Method and path | What it does |
| --- | --- |
| `GET /health` | Health check. |
| `POST /api/session` | Creates a session and returns its ID, token, state and first seed commitment. |
| `GET /api/state` | Returns the balance, loans, active round, recent history, commitment and profile. |
| `POST /api/client-seed` | Sets the client seed (8 to 128 printable ASCII characters, no spaces). Not allowed during a round. |
| `POST /api/round/start` | Starts a round with a whole-number stake. Key. |
| `POST /api/round/release-intent` | Sends a release for the round started with the key in `startKey`. Settles the round if it exists, otherwise queues the release. Key. |
| `POST /api/round/cashout` | Cashes out the round in `roundId`, capped by the server's own multiplier. Key. |
| `GET /api/round/status?id=` | Returns a round's status and settles it first if it is due. |
| `GET /api/round/events` | WebSocket that pushes round settlements. |
| `POST /api/loan` | Takes a loan of 444, 888 or 1500 gold at a balance of zero. Key. |
| `POST /api/game/reset` | Starts a new game, reveals the old seed and commits a new one. Key. |
| `POST /api/game/end` | Ends the game at the zero-balance loan decision. Key. |
| `GET /api/fairness` | Returns this session's seeds and rounds, up to 100 of each per call (`limit`, `seedOffset`, `roundOffset`). |
