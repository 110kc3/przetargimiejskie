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
//   cellar-area     residential/unknown area_m2 < 8 m² (a piwnica/komórka
//                   picked as the flat; tiny commercial rooms are legitimate)
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
import { validateLandDocument } from './coverage-health.js';
import { validationPolicy } from './validation-policy.js';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

// key → reason. Keep this SHORT — every entry must reference a TODO item.
// (Removed 2026-07-07, P2-D close-out: `katowice|oddzialow mlodziezy i ustny|86|`
// no longer needs an allowlist. The VERIFIED_JUNK fold now runs INSIDE refresh —
// applyVerifiedJunk() in src/core/verified-heals.js, called at
// refresh.js:281/296 BEFORE the data commit and this gate — folding that bled
// key into `powstanczej|5|8`, so it can never reach the committed
// properties.json. Confirmed absent from data. If the 2025 BIP yearly summary
// ever re-emits the bleed, the in-refresh fold catches it in the same run.)
const ALLOWLIST = {
  // GENUINE outlier, NOT a parse bug (verified 2026-07-04 against source PDF
  // id 95676): a derelict basement (suterena) flat the city listed at a nominal
  // "Cena wywoławcza : 2000,- zł" for 28,34 m² (71 zł/m²) because it is "w złym
  // stanie technicznym … nie nadaje się do zamieszkania". The TG price+area
  // extraction fix now correctly reads both, so insane-m2's 300 zł/m² floor
  // trips on real data. See TODO.md (Tarnowskie Góry price+area).
  'tarnowskie-gory|sienkiewicza|45|1A': 'insane-m2',
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

function checkCity(city) {
  const path = join(DATA_DIR, city, 'properties.json');
  const props = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8')).properties || []
    : [];

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
      if (a < MIN_FLAT_M2 && (p.kind === 'mieszkalny' || p.kind === 'unknown')) {
        err(city, p.key, 'cellar-area', `area ${a} m²`);
      }
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

  const metaPath = join(DATA_DIR, city, 'meta.json');
  let meta = null;
  if (existsSync(metaPath)) meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const landPath = join(DATA_DIR, city, 'land.json');
  if ((meta?.land_plots || 0) > 0 || existsSync(landPath)) {
    if (!existsSync(landPath)) {
      err(city, 'land.json', 'land-data', `land_plots=${meta.land_plots} but land.json is missing`);
    } else {
      const land = JSON.parse(readFileSync(landPath, 'utf8'));
      for (const message of validateLandDocument(city, land)) {
        err(city, 'land.json', 'land-data', message);
      }
      if (meta && (land.plots?.length ?? -1) !== (meta.land_plots || 0)) {
        err(city, 'land.json', 'land-data',
          `land_plots=${meta.land_plots || 0} does not match land.json (${land.plots?.length ?? 0})`);
      }
    }
  }
}

const arg = process.argv[2];
const cities = arg
  ? [arg]
  : readdirSync(DATA_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const c of cities) checkCity(c);

const blocking = errors.filter((e) => validationPolicy(e.city).status === 'enforced');
const quarantined = errors.filter((e) => validationPolicy(e.city).status === 'quarantined');

for (const w of warns) console.error('WARN  ' + w);
for (const e of quarantined) console.error('WARN  [validation-quarantine, non-blocking] ' + e.text);
for (const e of blocking) console.error('ERROR ' + e.text);
console.error(blocking.length
  ? `sanity-check: ${blocking.length} blocking error(s)` +
      (quarantined.length ? ` (+${quarantined.length} quarantined, non-blocking)` : '') +
      ` across ${cities.length} city file(s).`
  : `sanity-check: OK (${cities.length} city file(s)` +
      (quarantined.length ? `; ${quarantined.length} quarantined warning(s)` : ' clean') + `).`);
process.exit(blocking.length ? 1 : 0);
