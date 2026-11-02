# Browserfit

Detailed, sourced profiles of 125 web browsers across Windows, macOS, Linux, Android, iOS and ChromeOS. It also has tools to compare, rank and choose a browser.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (hash routing, works from any folder)
npm run preview
```

## What is in it

- **Profiles and rankings** for every browser, per operating system, with sources and confidence.
- **Quizzes:** 22 built in (find your browser, narrow it down, test your knowledge), a builder for your own at `/quiz/build`, and result links that open the same result anywhere.
- **Tools:** compare, head to head, feature finder, extension checker, switch planner, an old-device finder (`/old-device`), a version check and "what sites can read" on `/you`, a printable shortlist brief, and compare export to Markdown or CSV.
- **Pages:** collections (`/collections`), browser privacy (`/privacy`), browser security, data health (`/data-health`).
- **Settings** (`/settings`, the gear in the topbar): theme, platform, and everything saved on the device can be exported, restored or cleared. Nothing is sent anywhere.

## Data

- `research/raw/*.json` holds one researched fact sheet per browser (October 2026): sources, 40 scores, 68 features and per-OS details.
- `npm run data` rebuilds `src/data/generated/` from those files. It validates ids, clamps scores and normalises names. It also turns each platform's free-text `minOs` into a comparable `minOsFloor` (see `scripts/minos.mjs`); entries the research hedges on ("unverified", a third-party listing) are marked unconfirmed.
- `research/SCHEMA.md` describes the research schema and the scoring calibration.
- Security: `npm run data` derives a `security` block for every browser from its profile and `research/engines.json` (latest stable Chromium and Firefox). Researched facts go in `research/security/<id>.json` and override the derived ones; browsers without one show as Estimated. Never write security data into `research/raw/`.
- `node scripts/check-security-facts.mjs` checks that every benchmark, bounty and exploited-bug entry in `src/data/securityFacts.ts` has a source URL and access date.

## Deploy (Cloudflare Pages)

The site is fully static (hash routing), so no server or rewrite rules are needed. In the Cloudflare dashboard go to Workers & Pages, then Create, Pages, Connect to Git, and pick this repository:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION=22`

`src/data/generated/` is committed, so the build does not need to run `npm run data`. After changing anything in `research/`, run `npm run data` and commit the result. Every push to `main` redeploys, and other branches get preview URLs.
