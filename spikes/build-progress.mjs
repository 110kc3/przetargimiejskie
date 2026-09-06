// Regenerates SPIKE-PROGRESS.md from master-cities.json + backlog.json.
//
//   node spikes/build-progress.mjs        (from repo root, or anywhere)
//
// SPIKE-PROGRESS.md is a pure VIEW over the two JSON ledgers — it went stale
// once (July 2026: roll-up said 46 built / 64 build while the JSON and the
// actual registry said 53 / 57), so it is now generated, never hand-edited.
// Update master-cities.json (the source of truth), then run this.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = (p) => fileURLToPath(new URL(p, import.meta.url));
const master = JSON.parse(readFileSync(HERE('./master-cities.json'), 'utf8'));
const backlog = JSON.parse(readFileSync(HERE('./backlog.json'), 'utf8'));
const cities = master.cities;

const pl = new Intl.Collator('pl');
const byLabel = (a, b) => pl.compare(a.label, b.label);

const STATUS = {
  built:    { badge: '✅ BUILT',    order: 0 },
  build:    { badge: '🟢 BUILD',    order: 1 },
  verify:   { badge: '🟡 VERIFY',   order: 2 },
  'no-build': { badge: '🔴 NO-BUILD', order: 3 },
  dropped:  { badge: '❌ Dropped',  order: 4 },
  deferred: { badge: '⏸️ Deferred', order: 5 },
  unresearched: { badge: '⚪ UNRESEARCHED', order: 6 },
};

// Voivodeship slugs → display names (diacritics matter in the headings).
const WOJ = {
  dolnoslaskie: 'Dolnośląskie', 'kujawsko-pomorskie': 'Kujawsko-Pomorskie',
  lubelskie: 'Lubelskie', lubuskie: 'Lubuskie', lodzkie: 'Łódzkie',
  malopolskie: 'Małopolskie', mazowieckie: 'Mazowieckie', opolskie: 'Opolskie',
  podkarpackie: 'Podkarpackie', podlaskie: 'Podlaskie', pomorskie: 'Pomorskie',
  slaskie: 'Śląskie', swietokrzyskie: 'Świętokrzyskie',
  'warminsko-mazurskie': 'Warmińsko-Mazurskie', wielkopolskie: 'Wielkopolskie',
  zachodniopomorskie: 'Zachodniopomorskie',
};

const count = (status) => cities.filter((c) => c.status === status).length;
const list = (status) => cities.filter((c) => c.status === status).sort(byLabel);
const today = master.generated_at || new Date().toISOString().slice(0, 10);

const district = (c) =>
  c.type === 'city-county'
    ? `${c.label} (m.n.p.p.)`
    : (c.powiat_label || `powiat ${c.official?.powiat_name || '—'}`);

const lifecycleCounts = (field) => {
  const counts = new Map();
  for (const city of cities) {
    const value = city.lifecycle?.[field] || 'unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
};

const lines = [];
lines.push('# SPIKE-PROGRESS — all-Poland city spike + build ledger');
lines.push('');
lines.push(`> **GENERATED FILE — do not hand-edit.** Regenerate with \`node spikes/build-progress.mjs\` after updating [master-cities.json](./master-cities.json) (the source of truth).`);
lines.push('>');
lines.push(`> Updated ${today} from the official GUS TERYT snapshot effective ${master.source?.effective_date || '—'}. Queue: [backlog.json](./backlog.json) (${backlog.by_status?.pending || 0} pending / ${backlog.by_status?.done || 0} done of ${backlog.total} powiat rows; ${backlog.distinct_city_count || '—'} distinct seat cities). Inventory differences: [inventory/DISCREPANCIES.md](./inventory/DISCREPANCIES.md). Build guide: [../pipeline/ADAPTER-GUIDE.md](../pipeline/ADAPTER-GUIDE.md).`);
lines.push('');
lines.push(`## Official inventory roll-up (${cities.length} cities)`);
lines.push('');
lines.push('| Status | Count |');
lines.push('|---|---|');
for (const [status, s] of Object.entries(STATUS)) {
  lines.push(`| ${s.badge} | ${count(status)} |`);
}
lines.push('');
lines.push(`**Convention:** official identity is \`official.simc\`; product/pipeline aliases never replace it. A surveyed city has a per-city evidence path. New official cities remain \`unresearched\` until direct source evidence exists.`);
lines.push('');

lines.push('## Lifecycle coverage');
lines.push('');
lines.push('| Dimension | State | Count |');
lines.push('|---|---|---:|');
for (const field of ['research', 'implementation', 'runtime']) {
  for (const [state, total] of lifecycleCounts(field)) lines.push(`| ${field} | ${state} | ${total} |`);
}
lines.push('');

lines.push(`## Built adapters (${count('built')})`);
lines.push('');
lines.push(list('built').map((c) => c.label).join(', ') + '.');
lines.push('');

const effortRank = { Low: 0, Medium: 1, High: 2 };
const queue = list('build').sort((a, b) =>
  (effortRank[a.spike?.effort] ?? 9) - (effortRank[b.spike?.effort] ?? 9) || pl.compare(a.label, b.label));
lines.push(`## BUILD-ready queue (${count('build')}, by effort)`);
lines.push('');
lines.push(queue.map((c) => `${c.label} (${c.spike?.effort || '?'})`).join(', ') + '.');
lines.push('');

if (count('verify')) {
  lines.push(`## VERIFY (live re-check before building) (${count('verify')})`);
  lines.push('');
  lines.push(list('verify').map((c) => c.label).join(', ') + '.');
  lines.push('');
}

lines.push(`## Unresearched official cities (${count('unresearched')})`);
lines.push('');
lines.push('These are inventory entries, not claims of monitoring or source absence. Research is queued only through an accepted batch.');
lines.push('');

lines.push('## Ledger by voivodeship');
lines.push('');
const wojSlugs = [...new Set(cities.map((c) => c.voivodeship))]
  .sort((a, b) => pl.compare(WOJ[a] || a, WOJ[b] || b));
for (const woj of wojSlugs) {
  const rows = cities.filter((c) => c.voivodeship === woj).sort(byLabel);
  lines.push(`### ${WOJ[woj] || woj} (${rows.length})`);
  lines.push('');
  lines.push('| City | SIMC | District | Historic verdict | Research | Implementation | Runtime | Review due |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const c of rows) {
    const badge = STATUS[c.status]?.badge || c.status;
    lines.push(`| ${c.label} | ${c.official?.simc || '—'} | ${district(c)} | ${badge} | ${c.lifecycle?.research || '—'} | ${c.lifecycle?.implementation || '—'} | ${c.lifecycle?.runtime || '—'} | ${c.review?.review_due || '—'} |`);
  }
  lines.push('');
}

lines.push('---');
lines.push('');
lines.push('*Generated by spikes/build-progress.mjs — doc/data only, no version bump.*');
lines.push('');

writeFileSync(HERE('./SPIKE-PROGRESS.md'), lines.join('\n'));
console.error(`SPIKE-PROGRESS.md regenerated: ${cities.length} cities — ` +
  Object.keys(STATUS).map((s) => `${s}:${count(s)}`).join(' '));
