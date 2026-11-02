// Derives the structured security facts for one browser from its research file,
// then overlays the researched override research/security/<id>.json when it exists.
// Used by build-data.mjs. Unknown stays "unknown": the app never penalises what we could not verify.

export const ENUMS = {
  sandbox: ['strong', 'basic', 'none', 'unknown'],
  siteIsolation: ['full', 'partial', 'none', 'unknown'],
  patchLag: ['upstream', 'days', 'weeks', 'months', 'own', 'stalled', 'unknown'],
  autoUpdate: ['background', 'store', 'os', 'manual', 'unknown'],
  httpsFirst: ['default', 'optional', 'no', 'unknown'],
  safeBrowsing: ['google', 'apple', 'microsoft', 'own', 'other', 'none', 'unknown'],
  extVetting: ['reviewed', 'open', 'sideload', 'none'],
  bugBounty: ['own', 'upstream', 'none', 'unknown'],
};
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const OS = ['windows', 'macos', 'linux', 'android', 'ios', 'chromeos'];

const OWN_ENGINES = new Set(['goanna', 'libweb', 'servo', 'netsurf', 'text']);
const LEGACY_ENGINES = new Set(['trident-legacy', 'edgehtml-legacy']);
const ENGINE_OWNERS = new Set(['chrome', 'chromium', 'firefox', 'safari']);
const PUBLIC_BOUNTY_ENGINES = new Set(['blink', 'gecko', 'webkit']);

const text = (v) => (typeof v === 'string' ? v : '');

function deriveSandbox(r) {
  const s = text(r.spec?.sandbox).toLowerCase();
  if (!s || /unverified|unknown|not documented|not stated|not published|unclear/.test(s)) return 'unknown';
  if (/^none\b|no sandbox|no process sandbox|plain process|single[- ]process|not sandboxed|unsandboxed/.test(s)) return 'none';
  if (/in progress|partial|limited|experimental|not yet/.test(s)) return 'basic';
  if (/sandbox|appcontainer|seatbelt|seccomp/.test(s)) return 'strong';
  return 'unknown';
}

function deriveIsolation(r) {
  const s = text(r.spec?.sandbox).toLowerCase();
  if (/no site isolation|without site isolation|lacks site isolation|no process isolation|single[- ]process|plain process|^none\b/.test(s)) {
    return /android|mobile|ios|ipad|xp|vista|legacy/.test(s) ? 'partial' : 'none';
  }
  if (/site isolation|fission|process-per-site|per-site|site-per-process/.test(s)) {
    return /partial|limited|in progress|desktop only|not on android/.test(s) ? 'partial' : 'full';
  }
  if (r.engine === 'goanna' || r.engine === 'netsurf' || r.engine === 'text') return 'none';
  return 'unknown';
}

function deriveLag(r, engines) {
  const up = text(r.version?.upstream);
  if (r.status === 'discontinued' || LEGACY_ENGINES.has(r.engine)) return { lag: 'stalled', note: 'No longer maintained' };
  if (ENGINE_OWNERS.has(r.id)) return { lag: 'upstream', note: 'Ships the engine’s own security fixes first' };
  if (OWN_ENGINES.has(r.engine)) return { lag: 'own', note: 'Maintains its own engine' };
  if (/backport/i.test(up)) return { lag: 'days', note: `Backports upstream security fixes (${up})` };
  const gapLag = (gap) => (gap <= 1 ? 'days' : gap <= 4 ? 'weeks' : 'months');
  const cr = up.match(/(?:chromium|chrome)\s*(\d{2,3})/i);
  if (cr && engines?.chromium?.major) {
    const n = Number(cr[1]);
    const gap = Math.max(0, engines.chromium.major - n);
    return { lag: gapLag(gap), note: `Chromium ${n} vs latest ${engines.chromium.major}` };
  }
  const ff = up.match(/firefox(\s+esr)?\s*(\d{2,3})/i);
  if (ff && engines?.firefox?.major) {
    const n = Number(ff[2]);
    if (ff[1]) {
      const ok = (engines.firefox.supportedEsr ?? []).includes(n);
      return { lag: ok ? 'days' : 'months', note: `Firefox ESR ${n}${ok ? ' (a supported ESR line)' : ' (not a supported ESR line)'}` };
    }
    const gap = Math.max(0, engines.firefox.major - n);
    return { lag: gapLag(gap), note: `Firefox ${n} vs latest ${engines.firefox.major}` };
  }
  return { lag: 'unknown' };
}

function deriveAutoUpdate(r, os) {
  const p = r.platforms?.[os];
  if (!p) return undefined;
  const stores = p.stores ?? [];
  const cadence = text(r.updateCadence).toLowerCase();
  const manual = /no auto[- ]?updat|manual(ly)? updat|no updater|update manually|manual install/.test(cadence);
  const auto = /auto[- ]?updat|updates automatically|background updat/.test(cadence);
  const storeManaged = ['google-play', 'app-store', 'mac-app-store', 'microsoft-store'];
  if (os === 'android' || os === 'ios') {
    if (stores.some((s) => storeManaged.includes(s))) return 'store';
    if (stores.includes('f-droid') || stores.includes('izzy') || stores.includes('accrescent')) return 'store';
    if (stores.includes('preinstalled')) return 'os';
    return stores.length ? 'manual' : 'unknown';
  }
  if (stores.includes('official-installer') || stores.includes('portable') || stores.includes('github')) {
    if (manual) return 'manual';
    if (auto) return 'background';
    if (stores.includes('preinstalled')) return 'os';
    if (stores.some((s) => storeManaged.includes(s))) return 'store';
    return 'unknown';
  }
  if (stores.some((s) => storeManaged.includes(s))) return 'store';
  if (stores.some((s) => ['deb', 'rpm', 'flathub', 'snap', 'aur', 'homebrew', 'winget', 'preinstalled'].includes(s))) return 'os';
  return 'unknown';
}

function deriveHttps(r) {
  const f = r.features?.httpsOnly;
  if (!Array.isArray(f)) return 'unknown';
  const [sup, , note] = f;
  if (sup === 'no') return 'no';
  if (sup === 'yes' || sup === 'partial' || sup === 'extension') {
    return sup === 'yes' && /default|automatic|always|upgrade/i.test(text(note)) ? 'default' : 'optional';
  }
  return 'unknown';
}

function deriveExtVetting(r) {
  const sup = (id) => r.features?.[id]?.[0];
  if (r.keyFacts?.mv2?.level === 'no-extensions') return 'none';
  if (['yes', 'partial'].includes(sup('chromeWebStore')) || ['yes', 'partial'].includes(sup('firefoxAddons'))) return 'reviewed';
  if (r.keyFacts?.mobileExtensions?.android === 'own-store' || r.keyFacts?.mobileExtensions?.ios === 'own-store') return 'reviewed';
  if (['yes', 'partial'].includes(sup('mv2Support')) || ['yes', 'partial', 'extension'].includes(sup('userscripts'))) return 'sideload';
  return 'none';
}

function deriveBounty(r) {
  if (ENGINE_OWNERS.has(r.id)) return 'own';
  if (PUBLIC_BOUNTY_ENGINES.has(r.engine)) return 'upstream';
  return 'unknown';
}

const pick = (v, list, fallback, warn, label) => {
  if (v === undefined) return fallback;
  if (list.includes(v)) return v;
  warn.push(`${label}: invalid value ${JSON.stringify(v)}`);
  return fallback;
};

/**
 * @returns {{ facts: object, detail: object, warnings: string[] }}
 */
export function deriveSecurity(r, engines, override) {
  const warnings = [];
  const lag = deriveLag(r, engines);
  const autoUpdate = {};
  for (const os of OS) {
    const v = deriveAutoUpdate(r, os);
    if (v) autoUpdate[os] = v;
  }
  const facts = {
    sandbox: deriveSandbox(r),
    siteIsolation: deriveIsolation(r),
    patchLag: lag.lag,
    ...(lag.note ? { lagNote: lag.note } : {}),
    autoUpdate,
    httpsFirst: deriveHttps(r),
    safeBrowsing: 'unknown',
    extVetting: deriveExtVetting(r),
    bugBounty: deriveBounty(r),
    researched: false,
  };
  const detail = { summary: '', incidents: [], sources: [] };
  if (!override) return { facts, detail, warnings };

  const w = (m) => warnings.push(`${r.id}: security override ${m}`);
  const o = override;
  facts.researched = true;
  facts.sandbox = pick(o.sandbox, ENUMS.sandbox, facts.sandbox, warnings, `${r.id}: sandbox`);
  facts.siteIsolation = pick(o.siteIsolation, ENUMS.siteIsolation, facts.siteIsolation, warnings, `${r.id}: siteIsolation`);
  if (o.patchLag !== undefined) {
    facts.patchLag = pick(o.patchLag, ENUMS.patchLag, facts.patchLag, warnings, `${r.id}: patchLag`);
    if (typeof o.lagNote === 'string') facts.lagNote = o.lagNote;
    else delete facts.lagNote;
  }
  if (o.autoUpdate !== undefined) {
    if (typeof o.autoUpdate === 'string') {
      const v = pick(o.autoUpdate, ENUMS.autoUpdate, 'unknown', warnings, `${r.id}: autoUpdate`);
      for (const os of Object.keys(facts.autoUpdate)) facts.autoUpdate[os] = v;
    } else if (o.autoUpdate && typeof o.autoUpdate === 'object') {
      for (const [os, v] of Object.entries(o.autoUpdate)) {
        if (!OS.includes(os)) w(`unknown OS ${os}`);
        else if (!ENUMS.autoUpdate.includes(v)) w(`invalid autoUpdate ${os}=${v}`);
        else facts.autoUpdate[os] = v;
      }
    }
  }
  facts.httpsFirst = pick(o.httpsFirst, ENUMS.httpsFirst, facts.httpsFirst, warnings, `${r.id}: httpsFirst`);
  facts.safeBrowsing = pick(o.safeBrowsing, ENUMS.safeBrowsing, facts.safeBrowsing, warnings, `${r.id}: safeBrowsing`);
  facts.extVetting = pick(o.extVetting, ENUMS.extVetting, facts.extVetting, warnings, `${r.id}: extVetting`);
  facts.bugBounty = pick(o.bugBounty, ENUMS.bugBounty, facts.bugBounty, warnings, `${r.id}: bugBounty`);
  if (o.hardenedMode === null || typeof o.hardenedMode === 'string') facts.hardenedMode = o.hardenedMode;
  if (typeof o.disclosure === 'boolean') facts.disclosure = o.disclosure;
  if (typeof o.advisoryUrl === 'string' && /^https?:\/\//.test(o.advisoryUrl)) facts.advisoryUrl = o.advisoryUrl;

  detail.summary = text(o.summary).slice(0, 200);
  detail.incidents = (Array.isArray(o.incidents) ? o.incidents : [])
    .filter((i) => {
      const ok = i && text(i.title) && /^https?:\/\//.test(text(i.url));
      if (!ok) w('incident without title or url skipped');
      return ok;
    })
    .map((i) => ({
      date: text(i.date),
      title: text(i.title),
      severity: SEVERITIES.includes(i.severity) ? i.severity : 'medium',
      detail: text(i.detail),
      url: text(i.url),
    }));
  detail.sources = (Array.isArray(o.sources) ? o.sources : []).filter((s) => s && /^https?:\/\//.test(text(s.url)));
  return { facts, detail, warnings };
}
