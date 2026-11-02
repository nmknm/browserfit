# Browserfit design system

The look is the **category standard at full craft**, chosen by the user: a normal, modern website held to the bar of RTINGS (data clarity), Linear and Vercel (crisp neutral UI) and Apple and Raycast (polish). No themed world. Information is carried by elements such as score bars, chips, tables and charts; prose stays short.

Source of truth: `src/styles/tokens.css` (primitives → semantic roles). Components reference semantic roles only.

## Colour
- **Neutrals:** a cool, low-chroma OKLCH ramp `--n-0 … --n-1000`.
  - Light: `--bg` white, `--surface-2` n-50, `--border` n-200, `--text` n-950.
  - Dark is its own palette (`--bg` n-1000, surfaces n-950…n-850), not an inversion.
- **Accent:** a single blue.
  - Light `--accent` oklch(0.53 0.21 260); dark oklch(0.55 0.2 259). White text passes 4.5:1 in both.
  - Used for primary actions, selection and focus only.
- **Score scale:** five steps, and the number is always printed beside the swatch.
  - poor < 4, fair 4–5.9, good 6–7.4, great 7.5–8.9, excellent ≥ 9
  - tokens `--score-poor…--score-excellent`
- **Status:** `--positive`, `--warning` and `--negative`, each with a `-soft` background. Reserved for state; never used for series.
- **Engines:** identity hues `--eng-blink`, `-gecko`, `-webkit`, `-libweb`, `-goanna`, `-servo`. Always shown with a text label.
- **Data viz:** the validated categorical order `--series-1…6` (blue, orange, aqua, yellow, magenta, green), with dark steps defined, plus a sequential blue `--seq-0…6` for heatmaps. Overlaid radars are capped at 3 series; above that they become small multiples.
- **Theme switching:** `data-theme` plus `prefers-color-scheme`. Light is the default; "System" is opt-in and stored as `bs-theme=system`. Transitions are suppressed for one frame during the switch.

## Type
- **Family:** Geist Variable (self-hosted via @fontsource), with a system fallback.
- **Scale (fixed rem):** 12, 13, 14 (UI default), 16 (body/inputs), 18, 20, 24, 30, 40, 56 (home display only).
- **Headings:** weight 600, tracking −0.015 to −0.035em, `text-wrap: balance`. Body uses `pretty`.
- **Numbers:** tabular figures on every score, rank and count (`.tnum`).

## Space, radius, elevation
- **Spacing:** 4px base (`--s-1…--s-24`). The page gutter is `clamp(1rem, 3.2vw, 2rem)`. Content max is 80rem; data views go to 96rem.
- **Radii:** 4, 6, 8 (controls), 12 (panels), 16 (sheets and large cards), plus full pills for chips.
- **Panels:** separated by a 1px border at rest. Shadows only on things that float (menus, sheets, tooltips, palette), plus a soft hover shadow on linked panels.

## Components
- **Panel:** `.panel`, with `.panel-head` and `.panel-body` for sections.
- **Buttons:** `.btn` in primary, ghost, small, large and icon variants. Press scales to 0.96 over 150ms; touch targets are 44px or more.
- **Chips and badges:** chips are toggles using `aria-pressed`; badges carry status.
- **Facts strip:** the key-facts row shown on every card, row and header. It covers engine, privacy grade, sync, password manager, MV2 level and AI, each with an icon and a text label.
- **Browser identity:** `BrowserMark` is a typographic monogram in the browser's identity hue, not a logo.
- **Scores:** `ScoreNum`, `ScoreBar` and `ScoreRing`.
- **Security (`src/styles/security.css`):** reuses panel, chip, badge and the grade tones; adds no hues.
  - **Grade chip and badge:** `GradeChip` and `SecurityGrade`, letter always printed.
  - **Heat chips:** compact chips in the leaderboard, driven by `--heat-0…6`. Light follows the sequential blue; dark flips the anchor (low = dim, high = bright). Text flips at step 5; every pair is measured at 4.5:1 or more. The number is always printed.
  - **Grade bar and stat tiles:** buttons that filter the table. Selection is an accent outline plus a check icon, never a blue fill, so it cannot be confused with heat.
  - **Layer rows:** native `<details>` inside one panel, separated by hairlines. Each shows its inputs with an evidence badge; opacity-only fade.
  - **Verified / Estimated:** facts without a `research/security/<id>.json` override are labelled Estimated.
  - **Timeline:** swimlane dots in one hue (`--series-1`) with a table twin that is the only view under 48rem.
- **Quiz questions** (`components/quiz/QuestionView.tsx`): beyond cards, chips, sliders, ranking and the trade-off pad, a `triage` row (native radios styled as a segmented control: Must have, Nice to have, Don't mind; on phones the three share the row and drop the tick), a `number` question (preset chips, stepper, typed field at 16px), a `browser` question (picker plus "what bugs you" chips) and an `order` question (the ranking list, with right and wrong marks once checked). Options that add a hard requirement show "Leaves N browsers" as part of their description.
- **Result tools** (`components/quiz/ResultTools.tsx`): the Tune panel (Ignore / Normal / Must per answer, plus narrowing chips), "Why isn't a browser higher?" and the insights panel (closest personas as one-hue bars, and the browser in use compared with the winner). Selection uses the accent outline plus a tick, as in Security.
- **Toasts** carry an optional action (Undo, Reload). A toast with an action stays until it is used or dismissed.
- **Print** (`styles/print.css`): redefines the colour tokens to the light palette, hides the bars, tray and footer, opens every disclosure and appends the address after external links.
- **Controls:**
  - `Segmented`: a sliding pill, spring with zero bounce
  - `Tabs`: APG keyboard, sliding underline
  - `Sheet`: native `<dialog>`; a bottom sheet on phones and a side sheet elsewhere
  - `CommandPalette`: Ctrl+K or `/`, no animation by design
- **Charts:** hand-written SVG (radar, scatter with Pareto frontier, bump, parallel coordinates, heatmap matrix, lineage tree). Each has hover and focus readouts and a text or table alternative.

## Motion
- **Easing:** `--ease-out` cubic-bezier(0.23,1,0.32,1); `--ease-in-out` (0.77,0,0.175,1).
- **Durations:** UI 150–250ms; routes use a 180ms CSS fade, so content stays visible if animation never runs.
- **Signature moves:**
  - FLIP re-ranking (home top list, rankings, custom ranking, quiz live top 5)
  - radar morph between OS views
  - the quiz result reveal (the one delight moment)
- `MotionConfig reducedMotion="user"`; CSS motion is gated by `prefers-reduced-motion`.

## Layout and responsiveness
- **Desktop:** mega-menu top bar. **Tablet:** a compact bar with icon-only search. **Phone** (under 48rem): a bottom tab bar plus a "More" sheet.
- **Filters:** a sidebar on desktop and a bottom sheet with an "N results" button on phones.
- **Wide tables:** sit in `position: relative; contain: inline-size` scrollers with a sticky first column. This avoids a Chrome mobile layout-viewport bug.
- **Verified:** 390 / 768 / 1366 / 1440 in light and dark, with no horizontal overflow.

## Writing
Sentence case. Buttons start with a verb. Empty states say what happened and offer one next step. Scores show their evidence type: measured (public), documented, or editorial.
