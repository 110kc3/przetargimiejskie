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
// Tunables: STALE_DAYS, MIN_UNIQUE, EXEMPT_MAX_DAYS, LEGIT_EMPTY_RECHECK_DAYS
// (env). A brand-new city still settling in goes in EXEMPT_NEW (fast expiry); a
// source that is empty BY DESIGN goes in LEGIT_EMPTY (slow-recheck expiry,
// unique=0 → WARN not FAIL); a city with deliberately 0 active auctions goes in
// EXEMPT_EMPTY — all below.
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

// How long a LEGIT_EMPTY entry is trusted before it must be re-confirmed. Much
// slower than EXEMPT_NEW's 21-day settling cliff (these sources are stable, not
// settling), but NOT infinite — see the blind-spot note below.
const LEGIT_EMPTY_RECHECK_DAYS = Number(process.env.LEGIT_EMPTY_RECHECK_DAYS || 45);

// Cities whose source is LEGITIMATELY empty of tracked (concluded) properties —
// not broken, just nothing to track. unique_properties=0 is downgraded to a
// WARN instead of an empty-data FAIL.
//
// WHY it still expires (do not make this non-expiring): a genuinely-empty
// source is indistinguishable from a silently-broken parser — both yield 0
// records on an HTTP 200 — and for a city that has never held data, refresh.js
// writes a FRESH meta (new generated_at, no stale flag) on an empty crawl, so
// NEITHER the stale-data FAIL nor the meta.stale WARN would ever catch a break.
// A permanent exemption is therefore a permanent monitoring blind spot. Each
// entry carries a `since`; past LEGIT_EMPTY_RECHECK_DAYS the exemption escalates
// to a FAIL asking a human to reconfirm the source is still empty-by-design and
// bump `since` (the "renew on a schedule" option from TODO). Keep SHORT and
// reason-tagged; only add sources verified empty-by-design.
const LEGIT_EMPTY = new Map([
  ['gdansk', { since: '2026-07-07', reason: 'announcement index empty between auction rounds' }],
  ['augustow', { since: '2026-07-07', reason: 'publishes active listings but no result/concluded docs yet' }],
  // Sells ~1 flat/year; the current board (GNWR.6840.1.2026) is land-only
  // (3 działki, no lokal mieszkalny), so the flat-only adapter correctly parses
  // 0. Verified live 2026-07-07 — adapter works, source has no flats now.
  ['busko-zdroj', { since: '2026-07-07', reason: 'sells ~1 flat/year; board currently land-only (verified live 2026-07-07)' }],
]);

// Cities pending their FIRST successful live refresh — newly-built adapters
// being validated against the live BIP (June 2026: Oświęcim REKORD
// relative-href fix, Chrzanów stub-depth fix). For these, a missing meta.json
// or unique_properties=0 is a WARN, not a build-failing FAIL, so the
// established cities' health isn't blocked by a city still settling in.
// REMOVE a city from here the moment its first real refresh commits non-empty
// data (then a future drop to 0 correctly fails again). Every entry carries
// its `since` date: past EXEMPT_MAX_DAYS the exemption ESCALATES to a FAIL
// (class exempt-expired) so a forgotten entry can't mask real breakage forever.
// (Removed 2026-07-07 after their first non-empty CI refresh: kedzierzyn-kozle,
// lodz, skarzysko-kamienna, bydgoszcz, gorzow-wielkopolski.)
const EXEMPT_NEW = new Map([
  // Both live-verified 2026-07-07 (since RESET, backed by that investigation —
  // not a forgotten park): the adapters are NOT broken. unique=0 because the
  // current boards carry NO active residential-flat auction — only land
  // (działka/niezabudowana), leases, non-residential premises, cancellations,
  // and result notices. Infra works: oswiecim's scanned PDFs OCR cleanly
  // (tesseract 5.3+pol), chrzanow's harvest+CI Chromium render both run. They
  // stay in EXEMPT_NEW (not LEGIT_EMPTY) because the end-to-end active-FLAT
  // parse is UNVALIDATED — no live flat exists on either board to test it
  // against yet. See TODO §1.
  ['oswiecim', { since: '2026-07-07', reason: 'live-verified: OCR works, board has no active flats now (land/results only); flat-parse unvalidated' }],
  ['chrzanow', { since: '2026-07-07', reason: 'live-verified: harvest+render OK, board has no active flats now (lease/land/non-residential); flat-parse unvalidated' }],
  // July 2026 wave: adapters repaired against live markup (see CHANGELOG) or
  // sources legitimately empty; unique_properties stays 0 until each city's
  // first result documents parse.
  // FIXED 2026-07-07 (real crawler bugs, live-verified — data lands on the next
  // CI refresh; entries kept only until committed data is non-empty, then remove):
  ['wejherowo', { since: '2026-07-07', reason: 'FIXED 07-07: list-page regex now handles unclosed grid anchors — verified 8 active flats locally' }],
  ['walbrzych', { since: '2026-07-07', reason: 'FIXED 07-07: board cards now attach parsed .address — verified 12 properties locally' }],
  // gdansk + augustow moved to LEGIT_EMPTY (2026-07-07): their sources are
  // empty-by-design, not settling-in adapters, so an expiring exemption was the
  // wrong tool (would false-FAIL them at the ~07-23 cliff).
  ['gniezno', { since: '2026-07-07', reason: 'FIXED 07-07: attach .address from the PDF/title (was hardcoded null) — verified 4 properties locally' }],
  // busko-zdroj moved to LEGIT_EMPTY (2026-07-07): live-verified the adapter
  // parses correctly — the current board is a land-only auction (no flat), so
  // 0 flat records is right, not a broken parser. It's empty-between-flats, not
  // settling-in.
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
    const le = LEGIT_EMPTY.get(c.id);
    const leAge = le ? daysSince(le.since) : Infinity;
    if (ex.active) {
      warns.push(`${c.id}: unique_properties=${unique} (< ${MIN_UNIQUE}) — new adapter, pending first live refresh`);
    } else if (le && leAge <= LEGIT_EMPTY_RECHECK_DAYS) {
      const soon = leAge > LEGIT_EMPTY_RECHECK_DAYS * 0.8 ? ` — recheck due in ${(LEGIT_EMPTY_RECHECK_DAYS - leAge).toFixed(0)}d` : '';
      warns.push(`${c.id}: unique_properties=${unique} — source legitimately empty (${le.reason})${soon}`);
    } else if (le) {
      fail(c.id, 'legit-empty-recheck',
        `LEGIT_EMPTY since ${le.since} (${leAge.toFixed(0)}d > ${LEGIT_EMPTY_RECHECK_DAYS}d) — reconfirm the ` +
        `source is still empty-by-design (${le.reason}) and bump its \`since\`, or remove it if it now has data`, meta);
    } else {
      fail(c.id, 'empty-data', `unique_properties=${unique} (< ${MIN_UNIQUE}) — adapter likely broke`, meta);
    }
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
