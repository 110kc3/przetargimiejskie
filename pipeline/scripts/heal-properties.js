// One-off offline healer for already-published data/<city>/properties.json,
// WITHOUT crawling. Fixes the June 2026 bug-review findings that parser fixes
// alone can't heal, because merge-history re-seeds every previously-committed
// key (zombie keys):
//
//   1. OCR street noise — a stray ";x"/":x" fragment inside a street
//      ("Jagiellońskiej;j") is stripped and the property is re-keyed; if the
//      cleaned key already exists, the two are folded together.
//   2. Street case-variant duplicates — "sportowej|6|2" vs "sportowa|6|2"
//      holding the SAME auction; folded via healStreetVariants (the same
//      logic refresh.js runs post-merge).
//   3. Verified re-keys, cross-city display flips, and verified junk folds —
//      now defined in core/verified-heals.js and applied both HERE and inside
//      refresh.js post-merge, so a fresh crawl that re-emits a healed-away key
//      is re-healed on every CI run, not only when this script is run by hand.
//
// Run from anywhere:   node pipeline/scripts/heal-properties.js
// Then:                node pipeline/scripts/recount-auctions.js
//
// (Update unique_properties via recount or the next full refresh.)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { healStreetVariants, dedupeListingsByDate } from '../src/core/build-properties.js';
import {
  applyVerifiedRenames,
  applyVerifiedJunk,
  crossCityDisplay,
  buildGlobalStreetDisplay,
} from '../src/core/verified-heals.js';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

// Whole-property sales healed in place: a "mieszkalny"/"unknown" property whose
// area exceeds any real flat (300 m²) is carrying a plot/building total
// (Katowice "Chodnikowa 33E" 1 920 m², "Górna 4" 1 049 m²) — move it to
// land_area_m2 so the archive stops computing zł/m² from a plot. (refresh.js
// gets the same via build-properties' healPlotAreas inside healStreetVariants.)
const MAX_FLAT_M2 = 300;

const POLISH_LOWER = (s) =>
  s.toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');
const streetNorm = (street) =>
  POLISH_LOWER(street).replace(/[^\w]+/g, ' ').trim().replace(/\s+/g, ' ');

// Cross-city display evidence (street_norm → display street), built once from
// the committed corpus. See core/verified-heals.js crossCityDisplay.
const globalByNorm = buildGlobalStreetDisplay(DATA_DIR);

let touchedCities = 0;
for (const cityId of readdirSync(DATA_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)) {
  const path = join(DATA_DIR, cityId, 'properties.json');
  if (!existsSync(path)) continue;
  const file = JSON.parse(readFileSync(path, 'utf8'));
  let props = file.properties || [];
  const before = JSON.stringify(props);

  // (1) strip ;/: OCR noise from streets, re-key, fold onto an existing twin.
  const byKey = new Map(props.map((p) => [p.key, p]));
  for (const p of [...byKey.values()]) {
    if (!/[;:]/.test(p.street)) continue;
    const cleanedStreet = p.street.replace(/[;:]\S*/g, '').replace(/\s+/g, ' ').trim();
    const norm = streetNorm(cleanedStreet);
    const newKey = `${norm}|${p.building}|${p.apt ?? ''}`;
    console.error(`${cityId}: street noise '${p.street}' → '${cleanedStreet}' (${p.key} → ${newKey})`);
    byKey.delete(p.key);
    const twin = byKey.get(newKey);
    if (twin) {
      twin.listings.push(...p.listings);
      dedupeListingsByDate(twin);
      if (twin.area_m2 == null && p.area_m2 != null) twin.area_m2 = p.area_m2;
    } else {
      p.street = cleanedStreet;
      p.street_norm = norm;
      p.key = newKey;
      byKey.set(newKey, p);
    }
  }
  props = [...byKey.values()];

  // (1b) verified re-keys from since-fixed parser bugs.
  applyVerifiedRenames(props, cityId);

  // (1c) plot totals masquerading as flat areas → land_area_m2.
  for (const p2 of props) {
    if (p2.area_m2 == null || p2.area_m2 <= MAX_FLAT_M2) continue;
    if (p2.kind !== 'mieszkalny' && p2.kind !== 'unknown') continue;
    const a = p2.area_m2;
    p2.land_area_m2 = a;
    p2.area_m2 = null;
    for (const l of p2.listings) if (l.area_m2 === a) { l.land_area_m2 = a; l.area_m2 = null; }
    console.error(`${cityId}: ${p2.key} area ${a} m² → land_area_m2 (whole-property sale)`);
  }

  // (2) fold genitive/nominative zombie duplicates + dedupe per date, then the
  //     cross-city display pass.
  props = healStreetVariants(props);
  crossCityDisplay(props, cityId, globalByNorm);

  // (3) verified junk keys from since-fixed parser bugs.
  props = applyVerifiedJunk(props, cityId);

  if (JSON.stringify(props) !== before) {
    file.properties = props;
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
    console.error(`${cityId}: wrote ${path}`);
    touchedCities++;
  }
}
console.error(touchedCities ? `Healed ${touchedCities} city file(s). Now run recount-auctions.js.` : 'Nothing to heal.');
