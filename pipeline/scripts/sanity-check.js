// Data sanity gate — validates published data/<city>/properties.json against
// the bug classes found in the June 2026 reviews, so a parser regression can
// never silently publish garbage again. Run by CI after each city's refresh
// (a failing city blocks ONLY that city's data commit; the merge keeps its
// last-good data live).
//
//   node scripts/sanity-check.js           # all cities
//   node scripts/sanity-check.js katowice  # one city (CI matrix form)
//
// ERROR (exit 1) classes — each one is a real bug we shipped once:
//   price-glue      starting/final price > 50M zł ("180 000 221 400" glued)
//                   or a non-null price under 1 000 zł (column fragment)
//   cellar-area     area_m2 < 8 m² (a piwnica/komórka picked as the flat)
//   plot-area       area_m2 > 300 m² on a mieszkalny/unknown property
//                   (plot/building total in the flat-area field → use
//                   land_area_m2)
//   insane-m2       mieszkalny with start/area outside 300–40 000 zł/m²
//   junk-street     street containing ;/:, digits (except leading "3 Maja"
//                   style), or table vocabulary (ustny/przetarg/działk/urząd)
//   zombie-dupe     two keys differing only by a genitive/nominative street
//                   suffix with the same building+apt (merge-history zombie)
//
// Known, documented exceptions live in ALLOWLIST (key-exact, per city).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

// key → reason. Keep this SHORT — every entry must reference a TODO item.
const ALLOWLIST = {
  // RESOLVED in committed data: heal-properties.js now folds this bled key
  // (2025-02-24 / 450 000 → 517 500 zł sale) into powstanczej|5|8 (area 86,38).
  // This entry stays ONLY as a re-derivation guard: heal runs manually, not in
  // refresh.yml, so if the 2025 BIP yearly-summary crawl still re-emits the
  // bleed, mergeProperties re-adds the junk key between refresh and the next
  // manual heal. Drop this once a Katowice CI run confirms the source no longer
  // emits it, or once the VERIFIED_JUNK folds run inside refresh. See TODO.md.
  'katowice|oddzialow mlodziezy i ustny|86|': 'junk-street',
};

const MAX_PLN = 50_000_000;
const MIN_PLN = 1_000;
const MIN_FLAT_M2 = 8;
const MAX_FLAT_M2 = 300;
const M2_RANGE = [300, 40_000];

const SUFFIX_SUBS = [['skiej', 'ska'], ['ckiej', 'cka'], ['dzkiej', 'dzka'], ['iej', 'a'], ['ej', 'a']];

const errors = [];
const warns = [];
function err(city, key, cls, msg) {
  if (ALLOWLIST[`${city}|${key}`] === cls) return;
  errors.push({ city, text: `${city}: [${cls}] ${key} — ${msg}` });
}

// Tiering: only Śląskie cities are "public" (shown on the main site) and BLOCK CI
// on a sanity error. Every other voivodeship is TEST-TIER — visible only under
// /archiwum-all while its parser is still being validated — so its errors are
// reported as non-blocking WARNs. Voivodeship comes from the committed
// data/index.json; an unknown (brand-new) city is treated as test-tier. The
// hardcoded Śląskie set is a fallback so the public tier is never left unchecked
// if index.json is briefly missing.
const SLASKIE_FALLBACK = new Set(['gliwice', 'katowice', 'bytom', 'zabrze', 'sosnowiec', 'rybnik', 'bielsko', 'myslowice', 'swietochlowice', 'tarnowskie-gory']);
let WOJ_BY_CITY = {};
try {
  WOJ_BY_CITY = Object.fromEntries(
    (JSON.parse(readFileSync(join(DATA_DIR, 'index.json'), 'utf8')).cities || []).map((c) => [c.id, c.voivodeship]),
  );
} catch { /* index.json missing — fall back to the hardcoded Śląskie set */ }
const isPublicTier = (city) =>
  Object.keys(WOJ_BY_CITY).length ? WOJ_BY_CITY[city] === 'slaskie' : SLASKIE_FALLBACK.has(city);

function checkCity(city) {
  const path = join(DATA_DIR, city, 'properties.json');
  if (!existsSync(path)) return;
  const props = JSON.parse(readFileSync(path, 'utf8')).properties || [];

  const keys = new Set(props.map((p) => p.key));
  let missingArea = 0;

  for (const p of props) {
    // junk-street
    const digitsOk = /^\d+\s/.test(p.street); // "3 Maja", "11 Listopada"
    if (/[;:]/.test(p.street) || (!digitsOk && /\d/.test(p.street)) ||
        /\b(ustny|przetarg\w*|urz[ąa]d)\b|\bdzia[łl](?:ce|ka|ki)\b|na\s+dzia[łl]/i.test(p.street)) {
      err(city, p.key, 'junk-street', `street '${p.street}'`);
    }
    // zombie-dupe (report once, from the genitive side)
    for (const [gen, nom] of SUFFIX_SUBS) {
      if (!p.street_norm.endsWith(gen)) continue;
      const altKey = `${p.street_norm.slice(0, -gen.length)}${nom}|${p.building}|${p.apt ?? ''}`;
      if (keys.has(altKey)) err(city, p.key, 'zombie-dupe', `duplicates ${altKey}`);
      break;
    }
    // areas (property + listings)
    const areas = [p.area_m2, ...p.listings.map((l) => l.area_m2)].filter((a) => a != null);
    for (const a of new Set(areas)) {
      if (a < MIN_FLAT_M2) err(city, p.key, 'cellar-area', `area ${a} m²`);
      if (a > MAX_FLAT_M2 && (p.kind === 'mieszkalny' || p.kind === 'unknown')) {
        err(city, p.key, 'plot-area', `area ${a} m² on kind '${p.kind}'`);
      }
    }
    let hasArea = areas.length > 0;
    for (const l of p.listings) {
      for (const v of [l.starting_price_pln, l.final_price_pln]) {
        if (v == null) continue;
        if (v > MAX_PLN) err(city, p.key, 'price-glue', `price ${v}`);
        if (v < MIN_PLN) err(city, p.key, 'price-glue', `price ${v} (< ${MIN_PLN})`);
      }
      const area = l.area_m2 ?? p.area_m2;
      if (p.kind === 'mieszkalny' && area && l.starting_price_pln) {
        const m2 = l.starting_price_pln / area;
        if (m2 < M2_RANGE[0] || m2 > M2_RANGE[1]) {
          err(city, p.key, 'insane-m2', `${Math.round(m2)} zł/m² (${l.starting_price_pln} / ${area})`);
        }
      }
    }
    if (p.kind === 'mieszkalny' && !hasArea) missingArea++;
  }
  if (missingArea) warns.push(`${city}: ${missingArea} mieszkalny properties without any area (info)`);
}

const arg = process.argv[2];
const cities = arg
  ? [arg]
  : readdirSync(DATA_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const c of cities) checkCity(c);

const blocking = errors.filter((e) => isPublicTier(e.city));
const testTier = errors.filter((e) => !isPublicTier(e.city));

for (const w of warns) console.error('WARN  ' + w);
for (const e of testTier) console.error('WARN  [test-tier · /archiwum-all, non-blocking] ' + e.text);
for (const e of blocking) console.error('ERROR ' + e.text);
console.error(blocking.length
  ? `sanity-check: ${blocking.length} blocking error(s)` +
      (testTier.length ? ` (+${testTier.length} test-tier, non-blocking)` : '') +
      ` across ${cities.length} city file(s).`
  : `sanity-check: OK (${cities.length} city file(s)` +
      (testTier.length ? `; ${testTier.length} test-tier warning(s) ignored` : ' clean') + `).`);
process.exit(blocking.length ? 1 : 0);
