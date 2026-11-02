# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript (user's choice). It ships as a static site (HashRouter, `dist/`), with Motion for animation, lucide-react for icons, and self-hosted fonts. Charts are custom SVG, with no chart library.

## Users

Everyone choosing or re-evaluating a web browser, at mixed skill levels:
- casual users who want a confident recommendation in a minute
- enthusiasts and power users who want deep specs (engine, MV2 support, sync encryption, advanced settings)
- privacy-minded users

Most visit on desktop or mobile; tablets, touch laptops and unusual monitors must stay comfortable. Visitors arrive with a question ("which browser for me?", "is X better than Y?", "does Z still run uBlock Origin?") and leave with an answer they understand.

## Product Purpose

An interactive comparison app covering 125 browsers across Windows, macOS, Linux, Android, iOS/iPadOS and ChromeOS. It offers:
- 0–10 ratings in 40 categories (7 pillars) and about 70 rated features
- per-OS detail
- several ranking lenses and comparison modes
- adaptive quizzes: 22 built in, a builder for your own, shareable result links, and a "tune this result" panel that re-ranks as you change how much each answer counts
- ready-made collections, an old-device finder, a privacy hub, a data-health page, a printable shortlist brief and a backup page for everything saved on the device
- a separate Security score and grade (A–F) from seven layers of protection, a cited benchmarks and exploited-bug page, and a Security check-up quiz. It never changes the 40 categories or the overall score.

Success means the visitor finds the right browser for their devices and can see why: every score has a reason and a source.

## Positioning

Per-OS truth and explained scores. The same browser is rated per platform (for example Firefox on iOS uses WebKit and has no extensions). Every score carries an evidence type (measured-public, documented or editorial) plus sources and a last-verified date. The quiz engine shows its reasoning: the answer trace, the dealbreakers, and the smallest change that would flip the result.

## Operating Context

- Visitors switch browsers rarely but research intensely. They compare 2–6 candidates, check dealbreakers (sync, password manager, MV2/uBlock Origin, Google Play availability, engine) and share results by link.
- Data was researched in October 2026 with live web sources. Browser facts change quickly (shutdowns, MV2 removal, AI rollouts), so freshness and confidence are shown to the visitor.

## Capabilities and Constraints

- Static site with no backend: state lives in the URL and in localStorage.
- Scores are editorial assessments informed by public sources. They are not lab benchmarks run by this site.
- The only measured numbers are the visitor's own in-browser micro-benchmarks, labelled "your device, right now".
- Browser marks are typographic monograms, not trademark logos.

## Brand Commitments

- **A normal, modern website, not a themed one** (the user's explicit choice, Oct 2026). The visual direction is the category standard executed at full craft. No metaphor worlds, no game framing, no costume.
- **Craft references:** RTINGS.com (score bars, test results, side-by-side compare tables), Linear and Vercel (crisp neutral UI, sharp type, subtle motion, good dark mode), Apple and Raycast (spacious, polished, smooth animation, large clear headings).
- **Mostly elements, some text:** information is carried by score bars, chips, tables, charts and cards. Prose is kept short and supporting.

## Evidence on Hand

- Web research from October 2026 (sources stored per browser in `src/data/browsers/*`).
- None of the following exist, and none may be fabricated: user counts, testimonials, reviews, market-share figures beyond cited sources, or benchmark numbers without a source.

## Product Principles

1. Every score has a reason you can read and a source you can check.
2. Show, don't lecture: charts, chips and interactive comparisons instead of paragraphs.
3. Be honest about uncertainty: confidence badges, "unverified" notes and last-verified dates.
4. Per-OS truth: a browser is judged on the platform the visitor actually uses.
5. Respect the visitor's time: one action to first value; depth available but never forced.

## Accessibility & Inclusion

WCAG 2.2 AA:
- keyboard-complete, with a button alternative for every drag
- reduced motion honoured
- usable at 320px and 200% zoom
- colour never the only signal (every badge carries an icon and a text label)
