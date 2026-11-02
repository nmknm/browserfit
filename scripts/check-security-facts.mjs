// Every benchmark, bounty and exploited-bug entry must carry a source URL and the date we read it.
// Run: node scripts/check-security-facts.mjs   (Node 22.18+ loads the .ts file directly)
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const mod = await import(pathToFileURL(path.join(root, 'src', 'data', 'securityFacts.ts')).href);

const problems = [];
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const checkSource = (label, s) => {
  if (!s || !/^https?:\/\//.test(s.url ?? '')) problems.push(`${label}: missing or invalid source url`);
  if (!s || !s.title) problems.push(`${label}: source has no title`);
  if (!s || !isDate(s.accessed)) problems.push(`${label}: source has no valid accessed date`);
};
const seen = new Set();
const unique = (label, id) => {
  if (seen.has(label + id)) problems.push(`${label}: duplicate id ${id}`);
  seen.add(label + id);
};

for (const b of mod.BENCHMARKS) {
  unique('benchmark', b.id);
  checkSource(`benchmark ${b.id}`, b.source);
  if (b.updated && !isDate(b.updated)) problems.push(`benchmark ${b.id}: bad updated date`);
  if (!b.measures || !b.finding || !b.caveat) problems.push(`benchmark ${b.id}: missing measures, finding or caveat`);
}
for (const b of mod.BOUNTIES) {
  unique('bounty', b.id);
  checkSource(`bounty ${b.id}`, b.source);
  if (!(b.max > 0)) problems.push(`bounty ${b.id}: max must be a positive number`);
}
for (const e of mod.EXPLOITED_BUGS) {
  unique('bug', e.cve);
  checkSource(`bug ${e.cve}`, e.source);
  if (!/^CVE-\d{4}-\d{4,}$/.test(e.cve)) problems.push(`bug ${e.cve}: bad CVE id`);
  if (!isDate(e.added) || !e.added.startsWith('2026-')) problems.push(`bug ${e.cve}: added date must be a 2026 date`);
}
checkSource('KEV_SOURCE', mod.KEV_SOURCE);

if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log(`OK: ${mod.BENCHMARKS.length} benchmarks, ${mod.BOUNTIES.length} bounties, ${mod.EXPLOITED_BUGS.length} exploited bugs, all with source and access date.`);
