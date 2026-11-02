import { CATEGORY_INDEX, FEATURE_INDEX } from './taxonomy';
import type { BrowserIndex, CategoryId } from '../lib/types';

export interface Collection {
  id: string;
  name: string;
  blurb: string;
  /** one line on how browsers get in, shown on the collection page */
  rule: string;
  test: (b: BrowserIndex) => boolean;
  /** rank by this category instead of the overall score */
  sort?: CategoryId;
}

const has = (b: BrowserIndex, fid: string) => [1, 2, 3].includes(b.features[FEATURE_INDEX[fid]]?.[0] ?? 0);
const cat = (b: BrowserIndex, id: CategoryId) => b.scores[CATEGORY_INDEX[id]] ?? 0;

/** Lists defined by rules over the profiles. Nothing here is hand-picked, so a data update updates the lists. */
export const COLLECTIONS: Collection[] = [
  {
    id: 'not-chromium',
    name: 'Not built on Chromium',
    blurb: 'Browsers with Firefox’s, Apple’s or their own engine, for a web that isn’t only Google’s.',
    rule: 'Every browser whose engine is not Blink.',
    test: (b) => b.engine !== 'blink',
  },
  {
    id: 'keep-ublock',
    name: 'Still run the full uBlock Origin',
    blurb: 'Chrome ended Manifest V2 support. These browsers still run the full ad blocker.',
    rule: 'Browsers where the full uBlock Origin works, not only the Lite version.',
    test: (b) => b.keyFacts.ublock === 'full',
    sort: 'blocking',
  },
  {
    id: 'old-pcs',
    name: 'Old and low-end PCs',
    blurb: 'Browsers that stay quick on little memory and a slow processor.',
    rule: 'A score of 7 or more for old and low-end PCs.',
    test: (b) => cat(b, 'lowEnd') >= 7,
    sort: 'lowEnd',
  },
  {
    id: 'arc-alternatives',
    name: 'Arc alternatives',
    blurb: 'Arc ends on December 22, 2026. These have both vertical tabs and workspaces.',
    rule: 'Browsers with vertical tabs and workspaces, leaving out Arc itself.',
    test: (b) => b.id !== 'arc' && has(b, 'verticalTabs') && has(b, 'workspaces'),
    sort: 'tabManagement',
  },
  {
    id: 'vertical-tabs',
    name: 'Vertical tabs',
    blurb: 'Tabs in a side list, built in.',
    rule: 'Browsers that list vertical tabs as a feature.',
    test: (b) => has(b, 'verticalTabs'),
    sort: 'tabManagement',
  },
  {
    id: 'developers',
    name: 'For developers',
    blurb: 'Strong devtools, standards support and fast engines.',
    rule: 'A score of 9.5 or more for developer tools.',
    test: (b) => cat(b, 'devTools') >= 9.5,
    sort: 'devTools',
  },
  {
    id: 'open-source',
    name: 'Open source',
    blurb: 'Browsers whose code anyone can read, build and check.',
    rule: 'Browsers marked fully open source.',
    test: (b) => b.openSource === true,
  },
  {
    id: 'ai-off-switch',
    name: 'AI you can turn off',
    blurb: 'Browsers with built-in AI that give you one switch to disable it all.',
    rule: 'Browsers with AI features and an AI off switch.',
    test: (b) => b.keyFacts.ai.level !== 'none' && b.keyFacts.ai.killSwitch,
  },
  {
    id: 'private-by-default',
    name: 'Strongest privacy grades',
    blurb: 'Browsers that protect you without setup, with little data sent home.',
    rule: 'A privacy grade of A or B.',
    test: (b) => b.keyFacts.privacyGrade === 'A' || b.keyFacts.privacyGrade === 'B',
    sort: 'privacyDefaults',
  },
  {
    id: 'encrypted-sync',
    name: 'Encrypted sync',
    blurb: 'Sync that only you can read, or that you host yourself.',
    rule: 'Browsers with end-to-end encrypted or self-hostable sync.',
    test: (b) => b.keyFacts.sync.type === 'e2ee' || b.keyFacts.sync.type === 'self-hostable',
    sort: 'sync',
  },
];

export const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c])) as Record<string, Collection>;
