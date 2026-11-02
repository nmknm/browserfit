import { CATEGORIES, ENGINE_BY_ID, FEATURES, PILLARS, SUPPORT_CODES, SUPPORT_LABEL } from '../data/taxonomy';
import { scoresFor } from './data';
import { DEFAULT_WEIGHTS, overall, pillarScore } from './scoring';
import { securityFor } from './security';
import type { BrowserIndex, OsId } from './types';

export interface Table {
  headers: string[];
  rows: string[][];
}

const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** The comparison as a plain table: scores, key facts and every feature, one column per browser. */
export function compareTable(list: BrowserIndex[], os: OsId | null): Table {
  const headers = ['', ...list.map((b) => b.name)];
  const rows: string[][] = [];
  const add = (label: string, value: (b: BrowserIndex) => string) => rows.push([label, ...list.map(value)]);
  add('Overall score', (b) => one(overall(b, DEFAULT_WEIGHTS, os)));
  for (const p of PILLARS) add(`${p.name} score`, (b) => one(pillarScore(b, p.id, os)));
  add('Engine', (b) => ENGINE_BY_ID[b.engine]?.name ?? b.engine);
  add('Price', (b) => b.price);
  add('Open source', (b) => (b.openSource === true ? 'Yes' : b.openSource === 'partial' ? 'Partly' : 'No'));
  add('Privacy grade', (b) => b.keyFacts.privacyGrade);
  add('Security grade', (b) => securityFor(b, os).grade);
  add('Sync', (b) => b.keyFacts.sync.type);
  add('Password manager', (b) => b.keyFacts.passwordManager.level);
  add('Manifest V2', (b) => b.keyFacts.mv2.level);
  add('uBlock Origin', (b) => b.keyFacts.ublock);
  add('AI features', (b) => b.keyFacts.ai.level);
  CATEGORIES.forEach((c, i) => add(c.name, (b) => one(scoresFor(b, os)[i])));
  FEATURES.forEach((f, i) => add(f.name, (b) => SUPPORT_LABEL[SUPPORT_CODES[b.features[i]?.[0] ?? 0]]));
  return { headers, rows };
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function toMarkdown(t: Table, title?: string) {
  const line = (cells: string[]) => `| ${cells.map(cell).join(' | ')} |`;
  return [title ? `# ${title}\n` : '', line(t.headers), line(t.headers.map(() => '---')), ...t.rows.map(line)].filter((l, i) => i > 0 || l).join('\n') + '\n';
}

export function toCsv(t: Table) {
  const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return [t.headers, ...t.rows].map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}

/** Offers text as a file download. Works on a normal page; nothing leaves the device. */
export function downloadText(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const today = () => new Date().toISOString().slice(0, 10);
