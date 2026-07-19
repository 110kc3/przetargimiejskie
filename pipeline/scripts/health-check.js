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
  // augustow was MIS-CLASSIFIED here 2026-07-07 → moved to EXEMPT_NEW: it's not
  // empty, it crawls 4 flat stubs but never enriches them from their detail
  // pages, so all-null listings drop in the build. Real bug, see TODO §1.
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
// lodz, skarzysko-kamienna, bydgoszcz, gorzow-wielkopolski; and the 07-07
// crawler-bug fixes walbrzych→12, gniezno→4, wejherowo→8, confirmed committed.)
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
  // oswiecim REMOVED 2026-07-18: result-notice ingestion shipped (crawl routes
  // "Informacja o wyniku przetargu" docs → OCR → parseResultDoc) and its first
  // non-empty refresh committed 1 unique property (Dąbrowskiego 46/14, sold
  // 151 500 zł) — the city stands on its own data; a drop to 0 now correctly
  // FAILs. The ACTIVE-flat announcement parse is still live-unvalidated (no
  // flat auction on the board since build) — that residual doesn't need an
  // exemption, only a live flat to appear.
  ['chrzanow', { since: '2026-07-07', reason: 'live-verified: harvest+render OK, board has no active flats now (lease/land/non-residential); flat-parse unvalidated' }],
  // walbrzych / gniezno / wejherowo: crawler bugs fixed 2026-07-07 and REMOVED
  // from this list — their first non-empty CI refresh committed 12 / 4 / 8
  // properties (see the header note; a future drop to 0 now correctly FAILs).
  // gdansk moved to LEGIT_EMPTY (2026-07-07): empty-by-design, not a settling
  // adapter, so an expiring exemption would false-FAIL it at the ~07-23 cliff.
  // augustow FIXED + REMOVED 2026-07-09: the missing detail-page enrichment now
  // exists (parseAnnouncementDetail + crawlAll enrichment pass) — the 4 stubs
  // expand into 9 flat records → 3 unique properties committed, so no exemption
  // is needed. Adapter stands on its own data now.
  // busko-zdroj moved to LEGIT_EMPTY (2026-07-07): live-verified the adapter
  // parses correctly — the current board is a land-only auction (no flat), so
  // 0 flat records is right, not a broken parser. It's empty-between-flats, not
  // settling-in.
  // Batch-1 powiat-seat expansion (registered 2026-07-10, live-groundtruthed).
  // Only the two that first-refreshed with 0 active listings + unique=1 are
  // parked here (a settling-window drop to 0 unique would else FAIL); the other
  // 10 committed unique>=2 on first refresh and stand on their own data.
  ['olesno', { since: '2026-07-10', reason: 'live-verified: skyCMS board has no active flats now (year-board results only, 2 archived → unique 1); active-flat parse unvalidated until one appears' }],
  ['mragowo', { since: '2026-07-10', reason: 'live-verified: CNT board has active land (7 plots) but no active flats now (unique 1); active-flat parse unvalidated until one appears' }],
  // Batch 2 (registered 2026-07-10).
  ['pleszew', { since: '2026-07-10', reason: 'live-verified: WOKISS board has active land (21 plots) but the sole flat asset (Zachodnia 1) is dormant since Feb 2025 (I→II unsold, no III posted) → 0 active flats now; active-flat parse unvalidated until one appears' }],
  // Batch 3 (registered 2026-07-11).
  ['zdunska-wola', { since: '2026-07-11', reason: 'live-verified: Logonet board has active land but no active flats now, and its rolling board ages sold results out (unique 0); active-flat parse unvalidated until one appears' }],
  ['wegorzewo', { since: '2026-07-11', reason: 'first Pi refresh blocked by the host anti-abuse rate-limit (build agent made ~150 research reqs) → 0 records; adapter live-verified 2 listings/10 land during build; CI runner-IP refresh will populate' }],
  // Batch 4 (registered 2026-07-11).
  ['strzelce-krajenskie', { since: '2026-07-11', reason: 'live-verified: SystemDoBIP board has 0 active flats (cyclical) / 1 land / weak results → unique may be <1; active-flat parse via miedzyrzecz+gorzow analog, unvalidated live until a flat appears' }],
  // City-county close-out batch (registered 2026-07-18). Only lubin parks here:
  // biala-podlaska (8 unique) and siedlce (3 unique) committed real data and
  // stand on their own.
  ['lubin', { since: '2026-07-18', reason: 'live-verified: Logonet v5.7.0 announcement+result boards both empty right now (between sessions — sibling wykaz board renders fine, historical attachment PDFs still fetchable); parse groundtruthed on those PDFs, unvalidated live until a session posts' }],
  // Batch 5 (registered 2026-07-16): both live-verified locally after their
  // first CI refresh came back empty (CI job itself succeeded — this is a
  // thin-board snapshot, not an IP-block or parser bug).
  ['poznan', { since: '2026-07-16', reason: 'live-verified: WGN board has 0 active flats right now (1 land plot + 5 non-auction notices correctly skipped), category-8800 results board also currently empty (results purge ~1-3wk post-posting); active-flat + result parse unvalidated until one appears' }],
  ['elblag', { since: '2026-07-16', reason: 'live-verified: board has 0 active flats right now (5 land plots only); the one result doc fetched is a land-plot batch table (Dębowa, "Brak wpłaty wadium"), correctly excluded by the flat-only parser; active-flat parse unvalidated until one appears' }],
  // gostyn/lipsko: built 2026-07-11/12, unique=0 since their FIRST commit but
  // never added here — the daily flap (issues #66/#67 since 2026-07-12) is a
  // 5-day-old oversight, not a new break. Both spike files already documented
  // this at build time ("thin live volume... flat path ported + unit-tested,
  // not live-groundtruthed" / "the one live flat is bezprzetargowa, flat path
  // implemented-but-unverified") — re-confirmed live 2026-07-16: gostyn's board
  // holds only a 2022 land-plot result (Sikorzyna działka 107/x); lipsko's
  // sitemap yields only grunt/land announcements+results (Wola Solecka Wólka
  // działka 392/3). Neither adapter is broken; the flat path just has nothing
  // to parse yet.
  ['gostyn', { since: '2026-07-16', reason: 'live-verified: Logonet board 280 holds only a 2022 land-plot result (Sikorzyna 107/x, no lokal mieszkalny); flat path unit-tested but unvalidated live until a flat appears' }],
  ['lipsko', { since: '2026-07-16', reason: 'live-verified: sitemap yields only grunt/land announcements+results (Wola Solecka Wólka 392/3); the one known live flat is bezprzetargowa (out of scope); flat path implemented-but-unvalidated live until an open-auction flat appears' }],
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
