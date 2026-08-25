import { config } from "dotenv";
import { resolve } from "path";

// Standalone DB scripts (drizzle-kit, seed, reset) don't get Next.js's
// automatic .env.local loading, so load it explicitly here. `override: true`
// on .env.local means it always wins over anything already present in the
// shell — e.g. a stray DATABASE_URL left over from `vercel env pull` — so
// these scripts can't silently pick up a non-dev value.
config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env"), override: false });

if (process.env.NODE_ENV === "production") {
  throw new Error(
    "Refusing to run — NODE_ENV is production. This script is only for a local dev database.",
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local — see .env.example.",
  );
}

const host = new URL(process.env.DATABASE_URL).hostname;

// Best-effort check: catches an obviously-prod-labeled host, but the real
// production connection string is never available locally (marked Sensitive
// in Vercel), so this can't be an exact match against it. The override
// behavior above is the actual guarantee. Set DATABASE_URL_BLOCKED_HOST in
// .env.local if you want an exact-match guard against a known host.
const blockedHostSubstrings = ["prod"];
const blockedHost = process.env.DATABASE_URL_BLOCKED_HOST;

if (blockedHost && host === blockedHost) {
  throw new Error(
    `Refusing to run — DATABASE_URL host "${host}" matches DATABASE_URL_BLOCKED_HOST.`,
  );
}

if (blockedHostSubstrings.some((s) => host.toLowerCase().includes(s))) {
  throw new Error(
    `Refusing to run — DATABASE_URL host "${host}" looks like a production database.`,
  );
}
