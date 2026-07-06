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
// Tunables: STALE_DAYS, MIN_UNIQUE, EXEMPT_MAX_DAYS (env). A brand-new city
// with a deliberately tiny dataset can be exempted by adding it to
// EXEMPT_EMPTY below.
//
// When HEALTH_JSON_OUT=<path> is set (health.yml sets it), every FAIL is also
// written as [{city, classification, message, meta}] so issue-sync.js can turn
// it into per-city GitHub issues. Classifications: meta-missing, empty-data,
// stale-data, exempt-expired.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));
const STALE_DAYS = Number(process.env.STALE_DAYS || 14);
const MIN_UNIQUE = Number(process.env.MIN_UNIQUE || 1);
// How long a city may sit in EXEMPT_NEW before its exemption itself FAILs the
// check. The list is manual and has already drifted once (cities parked for
// weeks) — an expired entry means the adapter never produced data and everyone
// forgot, which is exactly the silent breakage this script exists to catch.
const EXEMPT_MAX_DAYS = Number(process.env.EXEMPT_MAX_DAYS || 21);

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
// data (then a future drop to 0 correctly fails again). Every entry carries
// its `since` date: past EXEMPT_MAX_DAYS the exemption ESCALATES to a FAIL
// (class exempt-expired) so a forgotten entry can't mask real breakage forever.
const EXEMPT_NEW = new Map([
  ['kedzierzyn-kozle', { since: '2026-06-27', reason: 'crawl bounded 27 June — pending first full refresh' }],
  ['oswiecim', { since: '2026-06-27', reason: 'REKORD relative-href fix — pending first live refresh' }],
  ['chrzanow', { since: '2026-06-27', reason: 'stub→BIP harvest fix — pending first live refresh' }],
  // July 2026 wave: adapters repaired against live markup (see CHANGELOG) or
  // sources legitimately empty; unique_properties stays 0 until each city's
  // first result documents parse.
  ['wejherowo', { since: '2026-07-02', reason: 'adapter OK locally; CI refresh commits zeros — check refresh job log' }],
  ['lodz', { since: '2026-07-02', reason: 'PDF-label regex fix — pending first live refresh' }],
  ['walbrzych', { since: '2026-07-02', reason: 'board + result-stream URL fix — pending first refresh' }],
  ['gdansk', { since: '2026-07-02', reason: 'announcement index legitimately empty between auction rounds' }],
  ['gniezno', { since: '2026-07-02', reason: 'insecureTLS for incomplete chain — pending first refresh' }],
  ['skarzysko-kamienna', { since: '2026-07-02', reason: 'body moved to div.wysiwyg — pending first refresh' }],
  ['augustow', { since: '2026-07-02', reason: 'crawl OK (4 active listings); city publishes no result docs yet' }],
  // Rebuilt 2026-07-06 after the June mount-corruption (parsers live-groundtruthed,
  // 18+33 tests green) — pending their first CI refresh.
  ['bydgoszcz', { since: '2026-07-06', reason: 'clean rebuild registered 2026-07-06 — pending first live refresh (live smoke: 3 active flats)' }],
  ['gorzow-wielkopolski', { since: '2026-07-06', reason: 'clean rebuild registered 2026-07-06 — pending first live refresh (live smoke: 25 active)' }],
]);

const now = Date.now();
const fails = []; // { city, classification, message, meta? }
const warns = [];

function daysSince(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (now - t) / 86_400_000;
}

// message deliberately does NOT embed the city — issue-sync composes titles
// as `[city-broken] <city>: <message>`; the console print re-adds the prefix.
function fail(city, classification, message, meta = null) {
  fails.push({ city, classification, message, meta });
}

// EXEMPT_NEW with expiry: fresh entries downgrade a FAIL to a WARN; entries
// older than EXEMPT_MAX_DAYS stop protecting and instead FAIL on their own.
function exemption(cityId) {
  const e = EXEMPT_NEW.get(cityId);
  if (!e) return { active: false, expired: false };
  const age = daysSince(e.since);
  return { active: age <= EXEMPT_MAX_DAYS, expired: age > EXEMPT_MAX_DAYS, age, ...e };
}

const indexPath = join(DATA_DIR, 'index.json');
if (!existsSync(indexPath)) {
  console.error('FAIL: data/index.json missing — has the pipeline ever run?');
  process.exit(1);
}
const index = JSON.parse(readFileSync(indexPath, 'utf8'));

for (const c of index.cities || []) {
  const ex = exemption(c.id);
  // The exemption itself has expired — the adapter never produced data within
  // EXEMPT_MAX_DAYS, or the entry was simply forgotten. Either way it must be
  // looked at; a permanent exemption is indistinguishable from silent breakage.
  if (ex.expired) {
    fail(c.id, 'exempt-expired',
      `in EXEMPT_NEW since ${ex.since} (${ex.age.toFixed(0)}d > ${EXEMPT_MAX_DAYS}d) — ` +
      `remove the entry or fix the adapter (reason was: ${ex.reason})`);
  } else if (ex.active && ex.age > EXEMPT_MAX_DAYS * 0.75) {
    warns.push(`${c.id}: EXEMPT_NEW entry expiring (${ex.age.toFixed(0)}d of ${EXEMPT_MAX_DAYS}d) — ${ex.reason}`);
  }

  const metaPath = join(DATA_DIR, c.id, 'meta.json');
  if (!existsSync(metaPath)) {
    if (ex.active) warns.push(`${c.id}: meta.json missing (new adapter, pending first live refresh)`);
    else fail(c.id, 'meta-missing', 'meta.json missing');
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch (e) {
    fail(c.id, 'meta-missing', `meta.json unparseable (${e.message})`);
    continue;
  }

  const unique = meta.unique_properties ?? c.unique_properties ?? 0;
  const activeAuctions = meta.active_auctions ?? c.active_auctions ?? 0;
  const activeListings = meta.active_listings ?? c.active_listings ?? 0;
  const age = daysSince(meta.generated_at);

  if (unique < MIN_UNIQUE) {
    if (ex.active) warns.push(`${c.id}: unique_properties=${unique} (< ${MIN_UNIQUE}) — new adapter, pending first live refresh`);
    else fail(c.id, 'empty-data', `unique_properties=${unique} (< ${MIN_UNIQUE}) — adapter likely broke`, meta);
  }
  if (age > STALE_DAYS) {
    const ageStr = age === Infinity ? 'no/invalid generated_at' : `${age.toFixed(1)} days old`;
    fail(c.id, 'stale-data', `data stale (${ageStr} > ${STALE_DAYS}d) — crawl stopped updating`, meta);
  }
  // refresh.js marks meta stale:true when a crawl came back empty/threw and
  // last-good data was preserved. The preserve path can refresh generated_at
  // (when it ages out listings), so the STALE_DAYS rule alone can miss a city
  // stuck on preserved data — surface the flag explicitly.
  if (meta.stale === true && !ex.active) {
    warns.push(`${c.id}: serving PRESERVED last-good data (meta.stale) — crawl is failing; check the refresh log / open triage issue`);
  }
  if (!EXEMPT_EMPTY.has(c.id)) {
    if (activeAuctions === 0) warns.push(`${c.id}: 0 active auctions on the board`);
    if (activeListings === 0) warns.push(`${c.id}: 0 active listings`);
  }

  const status = fails.some((f) => f.city === c.id) ? 'FAIL' : 'ok';
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

// Structured FAIL list for issue-sync.js (health.yml sets HEALTH_JSON_OUT).
// Written even when empty so the sync step can also CLOSE recovered issues.
if (process.env.HEALTH_JSON_OUT) {
  writeFileSync(process.env.HEALTH_JSON_OUT, JSON.stringify(fails, null, 2) + '\n');
}

if (fails.length) {
  console.error(`\nHEALTH CHECK FAILED — ${fails.length} issue(s):`);
  for (const f of fails) console.error(`  ✗ ${f.city}: ${f.message}`);
  process.exit(1);
}

console.error(`\nHealth OK — ${(index.cities || []).length} cities, all fresh and non-empty.`);
