import type { CategoryId } from '../lib/types';

export interface Persona {
  id: string;
  name: string;
  blurb: string;
  boost: Partial<Record<CategoryId, number>>;
}

/** Weight multipliers applied on top of default category weights. */
export const PERSONAS: Persona[] = [
  { id: 'privacy', name: 'Privacy-first', blurb: 'Blocks tracking by default and sends little data home.', boost: { privacyDefaults: 4, blocking: 3, fingerprinting: 3, telemetry: 3, businessTrust: 2, openSource: 2 } },
  { id: 'everyday', name: 'Everyday user', blurb: 'Easy, compatible, fast and synced across devices.', boost: { beginnerFriendly: 3, webCompat: 3, sync: 2, passwords: 2, pageLoad: 2, mobileApps: 2 } },
  { id: 'power', name: 'Power user', blurb: 'Deep customization, tab tools and keyboard control.', boost: { lookCustom: 3, behaviourCustom: 3, advancedSettings: 3, tabManagement: 3, productivity: 2, extensions: 2 } },
  { id: 'gamer', name: 'Gamer & streamer', blurb: 'Graphics, media and smoothness first.', boost: { graphics: 4, media: 3, smoothness: 3, jsSpeed: 2, resourceControls: 2 } },
  { id: 'student', name: 'Student', blurb: 'Free, light on battery, good for research and notes.', boost: { battery: 3, productivity: 3, translation: 2, sync: 2, memory: 2, beginnerFriendly: 2 } },
  { id: 'developer', name: 'Developer', blurb: 'Devtools, standards and fast engines.', boost: { devTools: 5, webCompat: 3, jsSpeed: 2, extensions: 2, advancedSettings: 2 } },
  { id: 'lowend', name: 'Old or low-end PC', blurb: 'Runs well on modest hardware.', boost: { lowEnd: 5, memory: 4, cpu: 3, installSize: 2, startup: 2 } },
  { id: 'mobile', name: 'Mobile-first', blurb: 'Great phone apps, sync and battery.', boost: { mobileApps: 5, sync: 3, battery: 3, blocking: 2 } },
  { id: 'minimal', name: 'Minimalist', blurb: 'Simple, clean, no bloat, no AI.', boost: { beginnerFriendly: 2, installSize: 2, memory: 2, telemetry: 2, ai: 0 } },
  { id: 'activist', name: 'Journalist / activist', blurb: 'Anonymity and resistance to surveillance.', boost: { fingerprinting: 5, privacyDefaults: 4, securityHardening: 4, telemetry: 3, openSource: 3 } },
  { id: 'secure', name: 'Security-first', blurb: 'Strong isolation, fast patching and few ways in.', boost: { securityHardening: 5, patchSpeed: 5, passwords: 2, longevity: 2, businessTrust: 2, blocking: 2 } },
  { id: 'work', name: 'Work / IT-managed', blurb: 'Updates reliably, can be managed by IT, and stays supported.', boost: { patchSpeed: 4, securityHardening: 3, longevity: 4, advancedSettings: 2, webCompat: 2, sync: 2, ai: 0.5 } },
  { id: 'ai', name: 'AI enthusiast', blurb: 'Assistants and agents built into the browser.', boost: { ai: 6, productivity: 2, jsSpeed: 1 } },
];
