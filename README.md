# TradeDesk

Indian equity (NSE/BSE) trading and investing journal. Single user. Three modules:
Dashboard, Journal, Trade Log.

See `CLAUDE.md` for the project rules that govern how this codebase is built.

## Development 

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in real values — see that file for what's required
(Neon `DATABASE_URL`, Auth.js secret and Google OAuth credentials, an email allowlist, a Vercel
Blob token, and a cron bearer secret).

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier
- `npm test` — Vitest
- `npm run db:generate` / `npm run db:push` — Drizzle Kit

## Deploy

Deployed on Vercel, connected to this repo's `main` branch.
