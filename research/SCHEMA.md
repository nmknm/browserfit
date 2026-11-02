# Browser research schema (for research agents)

Today is **2026-10-29**. Research every browser with live web sources: official site, release notes or changelog, GitHub releases, app store, Google Play, F-Droid listings, privacy policy and Wikipedia; then reputable news (The Register, gHacks, AlternativeTo news, PiunikaWeb, 9to5Linux, Neowin, TechCrunch, Android Police). Vendor-published "best browser" roundups (Tabbit, Sigma, SupaSidebar, Quetta blog) are biased: never the only source for a claim.

**Never invent** benchmark numbers, user counts, ratings or reviews. If a fact can't be verified, mark it in `unverified` and lower `confidence`.

Write **one JSON file per browser** to `research/raw/<id>.json` (UTF-8, valid JSON, no comments). Use the exact field names below.

```jsonc
{
  "id": "brave",                       // kebab-case, stable
  "name": "Brave",
  "aliases": ["Brave Browser"],
  "group": "privacy",                  // mainstream | privacy | power | ai | forks | minimal | android | regional | mobile
  "developer": "Brave Software, Inc.",
  "hq": "United States",               // jurisdiction / HQ country
  "businessModel": "Opt-in privacy ads (BAT), Brave Search ads, VPN and Leo Premium subscriptions",
  "engine": "blink",                   // blink | gecko | webkit | libweb | goanna | servo | netsurf | dillo | text | multi | trident-legacy | edgehtml-legacy
  "basedOn": "Chromium",               // upstream project, or "Independent"
  "license": "MPL-2.0",
  "openSource": true,                  // true | false | "partial"
  "price": "free",                     // free | freemium | paid
  "paidNote": "Leo Premium $14.99/mo, Brave VPN $9.99/mo",   // optional
  "releaseYear": 2016,
  "status": "active",                  // active | beta | alpha | early-access | maintenance | sunsetting | discontinued
  "statusNote": "",                    // e.g. "Shuts down Dec 22, 2026"
  "version": { "current": "1.85.x", "date": "2026-10-xx", "upstream": "Chromium 156" },
  "channels": ["Release", "Beta", "Nightly"],
  "updateCadence": "Every ~4 weeks, tracks Chromium",
  "website": "https://brave.com",
  "tags": ["privacy", "ad-blocking", "crypto"],
  "pitch": "Chromium with aggressive built-in blocking and opt-in extras.",   // ≤ 90 chars
  "summary": "≤ 240 chars plain-language summary.",
  "bestFor": ["People who want blocking with zero setup", "Chrome users who want privacy", "..."],
  "notFor": ["People who dislike crypto/AI extras", "..."],
  "pros": [{ "title": "Short title", "detail": "One sentence." }],      // 4–6
  "cons": [{ "title": "Short title", "detail": "One sentence." }],      // 3–5
  "signatureFeatures": ["Shields", "Brave Search", "Leo AI"],           // 3–5
  "faq": [{ "q": "Question?", "a": "≤ 2 sentences." }],                 // 3
  "timeline": [{ "date": "2016-01", "event": "First release" }],        // 3–6, newest events included
  "switching": { "imports": ["bookmarks", "passwords", "history", "extensions"], "note": "Imports from Chrome, Firefox, Edge, Safari." },
  "alternatives": ["firefox", "librewolf", "vivaldi"],                  // ids

  "keyFacts": {
    "engineByOs": { "ios": "webkit" },                                   // only where it differs from engine
    "sync": { "type": "e2ee", "items": ["bookmarks","passwords","history","tabs","extensions","settings"], "crossOs": true, "note": "Sync chain, no account" },
            // type: none | local-only | account | e2ee | self-hostable
    "passwordManager": { "level": "full", "passkeys": true, "breachCheck": false, "note": "" },   // level: none | basic | full
    "mv2": { "level": "partial", "note": "Self-hosts uBO, AdGuard, uMatrix, NoScript as MV2", "date": "2026" },
            // full | partial | temporary | mv3-only | none | no-extensions
    "ublock": "full",                                                    // full | lite | builtin-equivalent | none
    "mobileExtensions": { "android": "none", "ios": "none" },           // none | own-store | chrome-web-store | firefox-addons | crx-sideload | n/a
    "ai": { "level": "opt-in", "killSwitch": true, "paid": "partial", "note": "Leo" },   // level: none | opt-in | on-by-default | agentic
    "privacy": { "defaults": "Blocks trackers, ads, fingerprinting by default", "telemetry": "Opt-out P3A, privacy-preserving", "jurisdiction": "US" }
  },
  "spec": {
    "defaultSearch": "Brave Search",
    "telemetry": "P3A anonymous, opt-out",
    "drm": "Widevine (opt-in prompt)",
    "codecs": "H.264, VP9, AV1, HEVC (hw)",
    "sandbox": "Chromium sandbox + site isolation",
    "patchLag": "Ships Chromium security fixes within days",
    "languages": "~100"
  },
  "platforms": {
    // include every OS where it exists or existed; status per OS
    "windows":  { "status": "active", "minOs": "Windows 10", "arch": ["x64","arm64"], "stores": ["official-installer","winget","microsoft-store"], "notes": ["..."], "highlights": ["..."], "scoreDelta": {} },
    "macos":    { ... },
    "linux":    { ..., "stores": ["deb","rpm","flathub","snap","aur"] },
    "android":  { ..., "stores": ["google-play","github"], "notes": ["No extensions yet; work started Oct 2026"] },
    "ios":      { ..., "stores": ["app-store"], "notes": ["WebKit engine (Apple rule)"] },
    "chromeos": { ... }
    // stores vocabulary: google-play | f-droid | izzy | github | accrescent | preinstalled | app-store | mac-app-store | microsoft-store | winget | homebrew | flathub | snap | aur | deb | rpm | official-installer | portable | apk
    // scoreDelta: per-category adjustment for that OS, e.g. {"extensions": -6, "jsSpeed": -1}, only when the OS version differs meaningfully
  },

  "features": { "<featureId>": ["yes", 8, "optional short note"] },   // ALL feature ids below; support: yes | partial | no | extension | paid ; rating 0–10 = quality of that feature (0 if no)
  "scores":   { "<categoryId>": [9, "why (≤ 90 chars, grounded in a fact)", "documented"] },   // ALL 40 ids; evidence: measured-public | documented | editorial

  "sources": [{ "url": "https://…", "title": "…", "accessed": "2026-10-29" }],   // 3–8 real URLs you actually used
  "unverified": ["claims you could not confirm"],
  "confidence": "high",               // high | medium | low
  "lastVerified": "2026-10-29"
}
```

## Category ids (40), with a 0–10 scale. Score relative to the whole field of ~100 browsers.
| pillar | id | meaning |
|---|---|---|
| speed | jsSpeed | JavaScript engine speed (Speedometer/JetStream-class) |
| speed | pageLoad | page loading & rendering speed |
| speed | networkSpeed | network & download speed (HTTP/3, parallelism, preloading) |
| speed | startup | cold start time |
| speed | smoothness | scrolling/animation smoothness |
| speed | graphics | WebGL/WebGPU/gaming graphics |
| efficiency | memory | RAM efficiency (10 = very light) |
| efficiency | cpu | CPU efficiency |
| efficiency | battery | battery life on laptops/phones |
| efficiency | resourceControls | tab sleeping, RAM/CPU limiters, energy saver |
| efficiency | lowEnd | runs well on old/low-end hardware |
| efficiency | installSize | small download/disk footprint (10 = tiny) |
| privacy | privacyDefaults | privacy out of the box |
| privacy | blocking | tracker & ad blocking capability |
| privacy | fingerprinting | fingerprinting resistance |
| privacy | securityHardening | sandbox, site isolation, exploit mitigations |
| privacy | patchSpeed | how fast security fixes ship (upstream lag) |
| privacy | telemetry | low telemetry & transparent data collection (10 = none/transparent) |
| customization | lookCustom | themes, layouts, toolbar/UI customization |
| customization | behaviourCustom | shortcuts, gestures, per-site settings |
| customization | advancedSettings | depth of advanced settings (flags, about:config, policies) |
| customization | tabManagement | vertical tabs, groups, workspaces, split view |
| customization | searchFreedom | freedom to change default search & engines |
| features | downloads | download manager quality |
| features | productivity | notes, reader, PiP, screenshots, sidebar, command bar |
| features | media | codecs, DRM (Netflix etc.), PiP quality |
| features | translation | built-in translation (quality, privacy) |
| features | extras | built-in extras (VPN, mail, RSS, wallet…) — quality not quantity |
| ecosystem | extensions | extension ecosystem & power (MV2 matters) |
| ecosystem | sync | sync quality & cross-device |
| ecosystem | passwords | password manager quality |
| ecosystem | mobileApps | quality/availability of mobile versions |
| ecosystem | webCompat | site compatibility |
| ecosystem | devTools | developer tools |
| ecosystem | accessibility | screen reader, zoom, a11y features |
| values | openSource | openness & independence |
| values | businessTrust | trustworthiness of business model & company |
| values | longevity | update reliability & likely longevity |
| values | ai | AI features capability (neutral: users may want none) |
| values | beginnerFriendly | ease of use for beginners |

## Feature ids (68)
privacy: trackingProtection, fingerprintProtection, httpsOnly, doh, torWindows, builtinVpn, cookieIsolation, queryStripping, telemetryOptOut, privateHardening
blocking: adBlocker, cosmeticFiltering, customFilterLists, youtubeAds, cookieBanners
tabs: verticalTabs, tabGroups, tabStacks, workspaces, splitView, tabSleeping, tabSearch, pinnedTabs, tabTiling
productivity: readerMode, notes, webPanels, pip, screenshots, commandBar, mouseGestures, keyboardShortcuts, readLater, mailCalendarRss
extensions: chromeWebStore, firefoxAddons, mv2Support, uboFull, mobileExtensions, userscripts
sync: syncBookmarks, syncPasswords, syncTabs, e2eeSync, profiles, passwordManager, passkeys, importData
media: widevine, netflix4k, hevc, av1, hwDecode
ai: aiAssistant, aiSummarizer, agenticBrowsing, localAi, aiKillSwitch
extras: translation, cryptoWallet, pwaInstall, enterprisePolicies, kioskMode, panicButton, downloadManager, customThemes, customSearchEngines, devtools

Feature format: `"verticalTabs": ["yes", 8, "Native since v147"]`. For `aiKillSwitch`, "yes" means a single switch exists. For a browser with no AI at all, set `aiKillSwitch` to `["yes", 10, "No AI features"]`.

## Calibration anchors (desktop, general view) — keep scores consistent with these
| cat | Chrome | Firefox | Safari | Brave | Vivaldi | Tor Browser | Lynx |
|---|---|---|---|---|---|---|---|
| jsSpeed | 9.5 | 8 | 9.5 | 9.3 | 9 | 6 | 0 |
| pageLoad | 9 | 8 | 9 | 9.3 | 8.5 | 4 | 3 |
| networkSpeed | 9 | 8.5 | 8.5 | 9 | 8.5 | 2 | 4 |
| startup | 8 | 7.5 | 9 | 8 | 7 | 5 | 10 |
| smoothness | 9 | 8.5 | 9.5 | 9 | 8 | 6 | 5 |
| graphics | 9.5 | 8 | 8.5 | 9 | 9 | 3 | 0 |
| memory | 5 | 6.5 | 8.5 | 6 | 5 | 6 | 10 |
| cpu | 6.5 | 7 | 9 | 7 | 6 | 6 | 10 |
| battery | 6.5 | 7 | 9.5 | 7.5 | 6 | 5 | 10 |
| resourceControls | 8 | 6 | 6 | 8 | 7.5 | 2 | 3 |
| lowEnd | 6 | 6.5 | 7 | 6.5 | 5 | 4 | 10 |
| installSize | 5 | 6 | 9 | 5 | 4.5 | 5 | 10 |
| privacyDefaults | 4 | 7 | 7 | 9 | 7.5 | 10 | 8 |
| blocking | 3 | 7 | 6 | 9.5 | 8.5 | 8 | 5 |
| fingerprinting | 2 | 6 | 7.5 | 8.5 | 5 | 10 | 8 |
| securityHardening | 9.5 | 8 | 8.5 | 9.5 | 9 | 8.5 | 5 |
| patchSpeed | 10 | 9 | 7 | 9 | 8 | 8 | 5 |
| telemetry | 3 | 6.5 | 7 | 7.5 | 8 | 10 | 10 |
| lookCustom | 5 | 7.5 | 3 | 5.5 | 10 | 2 | 2 |
| behaviourCustom | 5 | 7.5 | 4 | 6 | 10 | 3 | 5 |
| advancedSettings | 7 | 10 | 4 | 7.5 | 9 | 7 | 6 |
| tabManagement | 7.5 | 7.5 | 6 | 8 | 10 | 3 | 1 |
| searchFreedom | 7 | 9 | 5 | 8 | 10 | 8 | 7 |
| downloads | 6 | 7 | 6 | 6 | 7 | 5 | 3 |
| productivity | 7 | 7 | 7 | 6.5 | 10 | 2 | 1 |
| media | 10 | 8.5 | 9.5 | 9 | 7.5 | 3 | 0 |
| translation | 9 | 7.5 | 7.5 | 7 | 7 | 0 | 0 |
| extras | 5 | 5 | 5 | 7.5 | 9.5 | 4 | 0 |
| extensions | 7 | 9.5 | 4 | 9 | 8.5 | 3 | 0 |
| sync | 9.5 | 8.5 | 7 | 7 | 8.5 | 0 | 0 |
| passwords | 8.5 | 7.5 | 9 | 6 | 7 | 0 | 0 |
| mobileApps | 9 | 8.5 | 7 | 8.5 | 8 | 6 | 0 |
| webCompat | 10 | 8.5 | 8.5 | 9.5 | 9 | 6 | 2 |
| devTools | 10 | 9.5 | 7.5 | 9.5 | 9 | 5 | 0 |
| accessibility | 9 | 9 | 9 | 8.5 | 8 | 6 | 7 |
| openSource | 3 | 10 | 3 | 8 | 6 | 10 | 10 |
| businessTrust | 4 | 8 | 7 | 6.5 | 9 | 10 | 9 |
| longevity | 10 | 9 | 10 | 9 | 9 | 9 | 8 |
| ai | 9.5 | 7 | 5 | 6.5 | 0 | 0 | 0 |
| beginnerFriendly | 10 | 8 | 9 | 8 | 6 | 6 | 1 |

Use half points at most (e.g. 7.5). Mobile-only browsers: score their mobile reality in the general view. Discontinued browsers: score as of their last release, and set `longevity` 0–1.


## Security overrides (optional): research/security/<id>.json

The build derives a security block for every browser. A file here overrides only the fields it contains; omit anything you could not verify. Never invent a value, and never put security data in research/raw.

Fields (exact strings): sandbox strong|basic|none|unknown; siteIsolation full|partial|none|unknown; patchLag upstream|days|weeks|months|own|stalled|unknown (with lagNote); autoUpdate one value for every OS or an object per OS (background|store|os|manual|unknown); httpsFirst default|optional|no|unknown; safeBrowsing google|apple|microsoft|own|other|none|unknown; hardenedMode a name or null when none exists; extVetting reviewed|open|sideload|none; bugBounty own|upstream|none|unknown; disclosure true|false; advisoryUrl; summary (one sentence, 160 characters at most); incidents [{date, title, severity critical|high|medium|low, detail, url}] (url required, only incidents a published page confirms); sources [{url, title, accessed}].
