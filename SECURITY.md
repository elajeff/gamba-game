# Security notes

- Never commit Cloudflare secrets, `.dev.vars`, session tokens, test keys, local backups or dependency folders.
- The anonymous session token is kept in browser local storage to recover a game after refresh or browser restart. Anyone who obtains it can access that session; clear site data on shared devices.
- The API uses an exact-origin CORS allowlist, signed bearer tokens, bounded JSON bodies, idempotency keys, server-side validation and non-cacheable responses. CORS is not authentication and does not stop direct scripts.
- There is no rate limiting. Anyone can create sessions in bulk, and enough traffic can use up the shared Cloudflare free-tier quota.
- A failed API request must never trigger local balance changes or locally generated outcomes. If the backend is unavailable, gameplay pauses until authoritative state can be reconciled.
- For a security concern, contact the repository owner privately; never post tokens or secrets in a public issue.
