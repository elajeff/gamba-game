# Security notes

The game keeps your session token in your browser's local storage, so a refresh or restart picks the game back up. Anyone who has the token can use that session, so clear site data on a shared device.

There is no rate limiting. Anyone can create sessions in bulk, and enough traffic could use up the Cloudflare free-tier quota.

If you find a security problem, contact the repository owner privately and don't post tokens or secrets in a public issue.
