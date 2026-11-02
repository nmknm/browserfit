<p align="center">
  <img src="public/favicon.svg" alt="Browserfit logo" width="96" height="96">
</p>

# Browserfit

Detailed, sourced profiles of 125 web browsers across Windows, macOS, Linux, Android, iOS and ChromeOS, plus tools to compare them and find the one that fits you.

Every profile lists what the browser is built on, which platforms and operating system versions it supports, how it handles privacy and security, and where each claim comes from. Scores are editorial assessments grounded in cited public sources, last reviewed October 2026.

## What you can do

- **Browse and rank:** read a profile for any browser, or rank all of them for your operating system, with sources and a confidence level on each.
- **Take a quiz:** 22 quizzes, from "find my browser" to narrower ones and a few for fun. You can build your own, and share a result as a link.
- **Compare:** put browsers side by side or head to head, then export the comparison to Markdown or CSV.
- **Check your own setup:** an old-device finder, a version check, and a view of what websites can read about your browser.
- **Look closer:** privacy and security grades, curated collections, a printable summary of the browsers you have saved, and a data-health page showing how complete and confident the research is.

Your choices, quiz answers and saved browsers stay in your browser, and you can export, restore or clear them in Settings. The hosted site uses Cloudflare Web Analytics for basic, cookie-free page-view counts; it has no accounts and no ad trackers.

## Run it locally

You need Node.js 22 or newer.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview
```

The site is fully static and uses hash routing, so `dist/` works on any static host.

## Where the data comes from

Each browser has a researched fact sheet in `research/raw/`: sources, 40 scores, 68 features and per-OS details. `npm run data` turns those into the files in `src/data/generated/` that the site reads, checking ids and score ranges along the way. The field format and scoring guide are in `research/SCHEMA.md`.

Security grades are derived from each profile and the latest stable Chromium and Firefox versions in `research/engines.json`. Researched facts in `research/security/<id>.json` override the derived ones, and browsers without one are labelled Estimated. `node scripts/check-security-facts.mjs` verifies that every benchmark, bounty and exploited-bug entry has a source URL and access date.

## Corrections and additions

Found something out of date or wrong? Please [open an issue](https://github.com/nmknm/browserfit/issues) with a link to a source. Browsers and features change often, so corrections are welcome.

## Built with

React, TypeScript, Vite, React Router and Motion.

## License

[MIT](LICENSE). The research data in `research/` is released under the same license; please keep the attribution if you reuse it.

More projects at [Nmk's Lab](https://nmkslab.web.app/).
