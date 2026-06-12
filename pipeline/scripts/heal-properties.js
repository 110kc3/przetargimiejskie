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
//      logic refresh.js now runs post-merge).
//   3. Known junk keys from since-fixed parser bugs, FOLDED into the named
//      surviving property ONLY after verifying every listing they hold has a
//      same-date listing (and a matching starting price, when both are
//      present) on the survivor — otherwise the fold is refused. Folding +
//      per-date dedupe lets a result-backed junk row upgrade the survivor
//      (e.g. an announcement-only 'archived' row gains the sold outcome and
//      achieved price) instead of being thrown away.
//
// Run from anywhere:   node pipeline/scripts/heal-properties.js
// Then:                node pipeline/scripts/recount-auctions.js
//
// (Update unique_properties via recount or the next full refresh.)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { healStreetVariants, dedupeListingsByDate } from '../src/core/build-properties.js';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

// city → [junk key, surviving key] — fold junk into survivor only if every
// dated listing of the junk property has a same-date listing on the survivor
// (with a matching starting price when both carry one).
//   gornej 4 6 i|8|  — old capture-to-end-of-title bug; its one archived row
//                      is byte-identical to gorna|4|'s.
//   …ii ustny|66|    — yearly-summary column bleed; same date AND same
//                      250 000 zł start as powstanczej|5|10's archived row,
//                      so the fold also contributes the achieved price.
// (…i ustny|86| is NOT here: its 2025-02-24 sale matches no surviving
// property — a different flat on the same street whose real building/apt the
// junk row destroyed. Left in place pending a manual source lookup.)
const VERIFIED_JUNK = {
  katowice: [
    ['gornej 4 6 i|8|', 'gorna|4|'],
    ['oddzialow mlodziezy ii ustny|66|', 'oddzialow mlodziezy powstanczej|5|10'],
  ],
};

const POLISH_LOWER = (s) =>
  s.toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');
const streetNorm = (street) =>
  POLISH_LOWER(street).replace(/[^\w]+/g, ' ').trim().replace(/\s+/g, ' ');

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

  // (2) fold genitive/nominative zombie duplicates + dedupe per date.
  props = healStreetVariants(props);

  // (3) verified junk keys from since-fixed parser bugs.
  for (const [junkKey, survivorKey] of VERIFIED_JUNK[cityId] || []) {
    const junk = props.find((p) => p.key === junkKey);
    const survivor = props.find((p) => p.key === survivorKey);
    if (!junk) continue;
    if (!survivor) {
      console.error(`${cityId}: REFUSING to fold ${junkKey} — survivor ${survivorKey} not found.`);
      continue;
    }
    const allCovered = junk.listings.every((jl) =>
      jl.date && survivor.listings.some((sl) =>
        sl.date === jl.date &&
        (jl.starting_price_pln == null || sl.starting_price_pln == null ||
          jl.starting_price_pln === sl.starting_price_pln)),
    );
    if (!allCovered) {
      console.error(`${cityId}: REFUSING to fold ${junkKey} — it holds listings absent from ${survivorKey}.`);
      continue;
    }
    survivor.listings.push(...junk.listings);
    dedupeListingsByDate(survivor);
    survivor.listings.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    props = props.filter((p) => p !== junk);
    console.error(`${cityId}: folded junk property ${junkKey} into ${survivorKey}.`);
  }

  if (JSON.stringify(props) !== before) {
    file.properties = props;
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
    console.error(`${cityId}: wrote ${path}`);
    touchedCities++;
  }
}
console.error(touchedCities ? `Healed ${touchedCities} city file(s). Now run recount-auctions.js.` : 'Nothing to heal.');
