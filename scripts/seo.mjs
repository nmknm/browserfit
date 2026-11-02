// Build-time SEO for the home page and the files crawlers look for.
//
// The site uses hash routing (/#/browser/chrome), and search engines ignore everything after the #,
// so only the home page can be indexed. This plugin makes that one page as strong as it can be:
// it fills the tokens in index.html (title, description, canonical, social cards, structured data,
// plain-text fallback for crawlers that do not run JavaScript) and emits sitemap.xml, robots.txt and llms.txt.
// Counts and browser names come from the generated data, so nothing here goes stale when browsers are added.
import fs from 'node:fs';
import path from 'node:path';

// The address crawlers should treat as canonical. Override with SITE_URL (in .env.local or the build environment).
export const DEFAULT_SITE_URL = 'https://browserfit.nmki.workers.dev';

const TITLE = 'Browserfit: compare web browsers on privacy and security';
const REPO_URL = 'https://github.com/nmknm/browserfit';
const OG_ALT = 'Browserfit: every web browser, explained, shown with the icons of popular browsers';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xml = esc;
// Safe to drop inside <script type="application/ld+json">: a "<" can never close the tag.
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

// Optional <meta> tags built from [attribute, key, value] rows; rows without a value are left out.
const metaTags = (rows) =>
  rows
    .filter(([, , value]) => value)
    .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${esc(value)}" />`)
    .join('\n    ');

// Hash routes that make sense to list for people and tools that follow them (llms.txt only; they are not crawlable URLs).
const SECTIONS = [
  ['/browsers', 'All browsers', 'Browse and filter every browser'],
  ['/rankings', 'Rankings', 'Rank all browsers for your operating system, or weight the categories your way'],
  ['/compare', 'Compare', 'Put browsers side by side'],
  ['/vs', 'Head to head', 'Compare two browsers directly'],
  ['/quiz', 'Quizzes', 'From "find my browser" to narrower ones and a few for fun'],
  ['/security', 'Security grades', 'Security grades and what they are based on'],
  ['/privacy', 'Privacy hub', 'What each browser collects and blocks'],
  ['/old-device', 'Old-device finder', 'Find a browser that still supports an older operating system'],
  ['/collections', 'Collections', 'Curated groups of browsers'],
  ['/engines', 'Engines', 'Browser engines and which browsers use them'],
  ['/data-health', 'Data health', 'How complete and confident the research is'],
];

function loadData(root) {
  const file = path.join(root, 'src/data/generated/index.json');
  const browsers = JSON.parse(fs.readFileSync(file, 'utf8'));
  const first = browsers[0] ?? {};
  return {
    browsers,
    categories: Object.keys(first.scores ?? {}).length,
    features: Object.keys(first.features ?? {}).length,
  };
}

// Group display names live in src/data/taxonomy.ts, which a plain Node script can't import, so read them from the source.
function readGroupLabels(root) {
  const src = fs.readFileSync(path.join(root, 'src/data/taxonomy.ts'), 'utf8');
  const block = src.match(/export const GROUP_LABEL[^=]*=\s*\{([^}]*)\}/)?.[1];
  if (!block) throw new Error('[seo] could not find GROUP_LABEL in src/data/taxonomy.ts');
  return Object.fromEntries([...block.matchAll(/(\w+):\s*(['"])(.*?)\2/g)].map((m) => [m[1], m[3]]));
}

function describe({ browsers }) {
  return `Sourced profiles of ${browsers.length} web browsers for Windows, macOS, Linux, Android, iOS and ChromeOS. Compare privacy and security, rank them and take a quiz.`;
}

function groupBrowsers(browsers, groupLabel) {
  const order = Object.keys(groupLabel);
  const groups = new Map(order.map((id) => [id, []]));
  for (const b of browsers) {
    if (!groups.has(b.group)) groups.set(b.group, []);
    groups.get(b.group).push(b);
  }
  return [...groups].filter(([, list]) => list.length).map(([id, list]) => [groupLabel[id] ?? id, list]);
}

function structuredData(site, data, description) {
  const root = `${site}/`;
  const { browsers, categories, features } = data;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${root}#website`,
        url: root,
        name: 'Browserfit',
        description,
        inLanguage: 'en',
        publisher: { '@id': `${root}#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${root}#organization`,
        name: 'Browserfit',
        url: root,
        logo: { '@type': 'ImageObject', url: `${site}/icon-512.png`, width: 512, height: 512 },
        sameAs: [REPO_URL],
      },
      {
        '@type': 'WebApplication',
        '@id': `${root}#app`,
        name: 'Browserfit',
        url: root,
        description,
        image: `${site}/og.png`,
        inLanguage: 'en',
        applicationCategory: 'ReferenceApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'Sourced profiles of every browser',
          'Rankings for your operating system',
          'Side-by-side and head-to-head comparison',
          'Quizzes to find the browser that fits you',
          'Privacy and security grades',
          'Old-device finder',
        ],
        publisher: { '@id': `${root}#organization` },
      },
      {
        '@type': 'WebPage',
        '@id': `${root}#webpage`,
        url: root,
        name: TITLE,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${root}#website` },
        about: { '@type': 'Thing', name: 'Web browsers' },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${site}/og.png`, width: 1200, height: 630 },
      },
      {
        '@type': 'Dataset',
        '@id': `${root}#dataset`,
        name: 'Browserfit web browser research data',
        description: `Researched fact sheets for ${browsers.length} web browsers: sources, ${categories} scored categories, ${features} features and per-operating-system support details, with a confidence level on each profile.`,
        url: root,
        sameAs: `${REPO_URL}/tree/main/research`,
        license: 'https://opensource.org/license/mit',
        isAccessibleForFree: true,
        inLanguage: 'en',
        creator: { '@id': `${root}#organization` },
        keywords: ['web browsers', 'browser comparison', 'browser privacy', 'browser security', 'browser rankings'],
      },
    ],
  };
}

// Real text for crawlers and tools that do not run JavaScript (the app itself renders into an empty #root).
function fallbackContent(data, groupLabel, description) {
  const { browsers } = data;
  const sections = groupBrowsers(browsers, groupLabel)
    .map(
      ([label, list]) =>
        `<h3>${esc(label)}</h3><ul>${list.map((b) => `<li><strong>${esc(b.name)}</strong>: ${esc(b.pitch)}</li>`).join('')}</ul>`,
    )
    .join('');
  return `<noscript><main style="max-width:44rem;margin:0 auto;padding:2rem 1rem;font:16px/1.6 system-ui,sans-serif;color:#111">
<h1>Browserfit: every web browser, explained</h1>
<p>${esc(description)}</p>
<p>Browserfit needs JavaScript for its rankings, comparison tools and quizzes. Turn JavaScript on to use it. The browsers it covers are listed below.</p>
<h2>What you can do</h2>
<ul>
<li>Read a detailed, sourced profile of any browser: what it is built on, which platforms and operating system versions it supports, how it handles privacy and security.</li>
<li>Rank every browser for your operating system, or weight the categories you care about.</li>
<li>Compare browsers side by side or head to head.</li>
<li>Take a quiz to find the browser that fits you.</li>
<li>Check an older device, or see what websites can read about your own browser.</li>
</ul>
<h2>Browsers covered (${browsers.length})</h2>
${sections}
</main></noscript>`;
}

function llmsTxt(site, data, groupLabel, description) {
  const { browsers, categories, features } = data;
  const link = (route, text) => `[${text}](${site}/#${route})`;
  const lines = [
    '# Browserfit',
    '',
    `> ${description}`,
    '',
    `Browserfit is a free website of detailed, sourced browser profiles, with tools to compare them and find the one that fits you. Each profile lists what the browser is built on, which platforms and operating system versions it supports, how it handles privacy and security, and where each claim comes from. Scores (${categories} categories, ${features} features per browser) are editorial assessments grounded in cited public sources, each with a confidence level. The research data is MIT licensed: ${REPO_URL}/tree/main/research`,
    '',
    'The site is a single-page app with hash URLs (for example `/#/browser/firefox`), so the links below only open in a browser that runs JavaScript.',
    '',
    '## Sections',
    '',
    ...SECTIONS.map(([route, label, text]) => `- ${link(route, label)}: ${text}`),
    '',
    '## Browser profiles',
    '',
  ];
  for (const [label, list] of groupBrowsers(browsers, groupLabel)) {
    lines.push(`### ${label}`, '');
    for (const b of list) lines.push(`- ${link(`/browser/${b.id}`, b.name)}: ${b.pitch}`);
    lines.push('');
  }
  return lines.join('\n');
}

// The page is rendered by JavaScript, so first paint waits on a chain: entry script, then the Home chunk (requested
// once the app starts), then that chunk's own imports. Vite only preloads the entry's dependencies, so list the rest
// up front, along with the font the text is set in. Faster first paint helps Core Web Vitals, which search ranking uses.
function preloadCriticalAssets() {
  return {
    name: 'browserfit-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return;
        const tags = [];
        const link = (attrs) => tags.push({ tag: 'link', attrs, injectTo: 'head' });

        const font = Object.keys(bundle).find((f) => /geist-latin-wght-normal-[^/]*\.woff2$/.test(f));
        if (font) link({ rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: true, href: `./${font}` });

        const home = Object.values(bundle).find((c) => c.type === 'chunk' && c.facadeModuleId?.replace(/\\/g, '/').endsWith('/src/routes/Home.tsx'));
        if (home) {
          const already = new Set([...html.matchAll(/(?:href|src)="\.\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]));
          const queue = [home.fileName];
          const seen = new Set();
          while (queue.length) {
            const file = queue.shift();
            if (seen.has(file)) continue;
            seen.add(file);
            const chunk = bundle[file];
            if (chunk?.type !== 'chunk') continue;
            if (!already.has(file)) link({ rel: 'modulepreload', crossorigin: true, href: `./${file}` });
            queue.push(...chunk.imports);
          }
        }
        return tags;
      },
    },
  };
}

/**
 * @param {{
 *   root?: string,
 *   siteUrl?: string,
 *   verification?: { google?: string, bing?: string },
 *   social?: { twitterSite?: string, facebookAppId?: string, fediverseCreator?: string },
 * }} [options]
 *   `verification` holds the site-ownership codes from Google Search Console and Bing Webmaster Tools, so the
 *   sitemap can be submitted there. `social` holds the accounts that link previews credit: the X handle, a Facebook
 *   app id, and a Mastodon-style @user@instance. All are optional and only add a tag when set; they are public once
 *   published, but stay out of the repo.
 */
export function seo({ root = process.cwd(), siteUrl, verification = {}, social = {} } = {}) {
  const site = (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const groupLabel = readGroupLabels(root);
  const verificationTags = metaTags([
    ['name', 'google-site-verification', verification.google],
    ['name', 'msvalidate.01', verification.bing],
  ]);
  const twitterSite = social.twitterSite && `@${social.twitterSite.replace(/^@/, '')}`;
  const socialTags = metaTags([
    ['name', 'twitter:site', twitterSite],
    ['property', 'fb:app_id', social.facebookAppId],
    ['name', 'fediverse:creator', social.fediverseCreator],
  ]);

  const tags = {
    name: 'browserfit-seo',

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const data = loadData(root);
        const description = describe(data);
        if (TITLE.length > 60) console.warn(`[seo] title is ${TITLE.length} characters; search results cut it off near 60`);
        if (description.length > 160) console.warn(`[seo] description is ${description.length} characters; search results cut it off near 160`);

        const vars = {
          SITE_URL: site,
          TITLE: esc(TITLE),
          DESCRIPTION: esc(description),
          OG_ALT: esc(OG_ALT),
          VERIFICATION: verificationTags,
          SOCIAL: socialTags,
          BROWSER_COUNT: String(data.browsers.length),
          CATEGORY_COUNT: String(data.categories),
          JSONLD: jsonForScript(structuredData(site, data, description)),
          FALLBACK: fallbackContent(data, groupLabel, description),
        };
        return html.replace(/__([A-Z_]+)__/g, (token, key) => {
          if (!(key in vars)) throw new Error(`[seo] index.html has an unknown token ${token}`);
          return vars[key];
        });
      },
    },

    generateBundle() {
      const data = loadData(root);
      const description = describe(data);
      const lastmod = new Date().toISOString().slice(0, 10);
      const emit = (fileName, source) => this.emitFile({ type: 'asset', fileName, source });

      emit(
        'sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${xml(site)}/</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n</urlset>\n`,
      );
      emit('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
      emit('llms.txt', llmsTxt(site, data, groupLabel, description));
    },
  };

  return [tags, preloadCriticalAssets()];
}
