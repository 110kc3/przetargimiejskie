// Source-health monitor — the silent-breakage guard.
//
// The whole product dies quietly if a municipal site changes layout: the crawl
// keeps "succeeding" while producing nothing, or a city's adapter starts
// emitting junk. sanity-check.js validates the SHAPE of whatever data is
// produced; this validates that data is actually being produced and stays
// fresh. Run it on the committed data (no network) — daily in health.yml, so a
// stalled city is caught within a day instead of going unnoticed for weeks.
//
// FAIL (exit 1 → the workflow fails → GitHub emails the maintainer):
//   - a city's meta.json is missing/unparseable
//   - unique_properties === 0 for an established city (adapter broke: an
//     established city never legitimately drops to zero tracked properties)
//   - generated_at older than STALE_DAYS (default 14 — refresh is daily, so
//     a multi-day gap means the crawl genuinely stopped working)
// WARN (reported, does not fail — could be a legitimate quiet period):
//   - active_auctions === 0 (no current auctions on the board right now)
//   - active_listings === 0
//
// Tunables: STALE_DAYS, MIN_UNIQUE (env). A brand-new city with a deliberately
// tiny dataset can be exempted by adding it to EXEMPT_EMPTY below.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));
const STALE_DAYS = Number(process.env.STALE_DAYS || 14);
const MIN_UNIQUE = Number(process.env.MIN_UNIQUE || 1);

// Cities allowed to currently have 0 active auctions without even a WARN
// (none today — every covered city has had active auctions). Keep tied to a
// reason, like sanity-check.js's allowlist.
const EXEMPT_EMPTY = new Set();

// Cities pending their FIRST successful live refresh — newly-built adapters
// being validated against the live BIP (June 2026: Oświęcim REKORD relative-href
// fix, Chrzanów stub-depth fix, Kędzierzyn-Koźle crawl bound). For these, a
// missing meta.json or unique_properties=0 is a WARN, not a build-failing FAIL,
// so the established cities' health isn't blocked by a city still settling in.
// REMOVE a city from here the moment its first real refresh commits non-empty
// data (then a future drop to 0 correctly fails again).
const EXEMPT_NEW = new Set([
  'kedzierzyn-kozle', 'oswiecim', 'chrzanow',
  // July 2026 wave (added 2026-07-02): adapters repaired against live markup
  // (see CHANGELOG/commits) or sources legitimately empty; unique_properties
  // stays 0 until each city's first result documents parse. REMOVE each city
  // the moment its refresh commits unique_properties > 0.
  'wejherowo',          // adapter OK locally; CI refresh commits zeros — check refresh job log
  'lodz',               // fixed 2026-07-02 (PDF-label regex) — pending first live refresh
  'walbrzych',          // fixed 2026-07-02 (board + result-stream URLs) — pending first refresh
  'gdansk',             // announcement index legitimately empty between auction rounds
  'klodzko',            // no flat auctions / result notices on the board right now
  'gniezno',            // fixed 2026-07-02 (insecureTLS for incomplete chain) — pending first refresh
  'skarzysko-kamienna', // fixed 2026-07-02 (body moved to div.wysiwyg) — pending first refresh
  'augustow',           // crawl OK (4 active listings); city publishes no result docs yet
]);

const now = Date.now();
const fails = [];
const warns = [];

function daysSince(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (now - t) / 86_400_000;
}

const indexPath = join(DATA_DIR, 'index.json');
if (!existsSync(indexPath)) {
  console.error('FAIL: data/index.json missing — has the pipeline ever run?');
  process.exit(1);
}
const index = JSON.parse(readFileSync(indexPath, 'utf8'));

for (const c of index.cities || []) {
  const metaPath = join(DATA_DIR, c.id, 'meta.json');
  if (!existsSync(metaPath)) {
    (EXEMPT_NEW.has(c.id) ? warns : fails).push(
      `${c.id}: meta.json missing${EXEMPT_NEW.has(c.id) ? ' (new adapter, pending first live refresh)' : ''}`,
    );
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch (e) {
    fails.push(`${c.id}: meta.json unparseable (${e.message})`);
    continue;
  }

  const unique = meta.unique_properties ?? c.unique_properties ?? 0;
  const activeAuctions = meta.active_auctions ?? c.active_auctions ?? 0;
  const activeListings = meta.active_listings ?? c.active_listings ?? 0;
  const age = daysSince(meta.generated_at);

  if (unique < MIN_UNIQUE) {
    (EXEMPT_NEW.has(c.id) ? warns : fails).push(
      `${c.id}: unique_properties=${unique} (< ${MIN_UNIQUE}) — ${
        EXEMPT_NEW.has(c.id) ? 'new adapter, pending first live refresh' : 'adapter likely broke'
      }`,
    );
  }
  if (age > STALE_DAYS) {
    const ageStr = age === Infinity ? 'no/invalid generated_at' : `${age.toFixed(1)} days old`;
    fails.push(`${c.id}: data stale (${ageStr} > ${STALE_DAYS}d) — crawl stopped updating`);
  }
  if (!EXEMPT_EMPTY.has(c.id)) {
    if (activeAuctions === 0) warns.push(`${c.id}: 0 active auctions on the board`);
    if (activeListings === 0) warns.push(`${c.id}: 0 active listings`);
  }

  const status = fails.some((f) => f.startsWith(`${c.id}:`)) ? 'FAIL' : 'ok';
  console.error(
    `${status === 'ok' ? '  ok ' : 'FAIL '}${c.id.padEnd(16)} ` +
    `unique:${String(unique).padStart(4)}  active:${String(activeAuctions).padStart(3)}  ` +
    `age:${age === Infinity ? '  ?' : age.toFixed(0).padStart(3)}d`,
  );
}

if (warns.length) {
  console.error('\nWARN (not failing the run):');
  for (const w of warns) console.error(`  • ${w}`);
}

if (fails.length) {
  console.error(`\nHEALTH CHECK FAILED — ${fails.length} issue(s):`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.error(`\nHealth OK — ${(index.cities || []).length} cities, all fresh and non-empty.`);
