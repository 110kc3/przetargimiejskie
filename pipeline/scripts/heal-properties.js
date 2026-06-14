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
//   …i ustny|86|     — yearly-summary column bleed; "86" is the bled area
//                      (86,38 m²), the street fragment "Oddziałów Młodzieży
//                      [Powstańczej] I ustny" merged from the title. Its
//                      2025-02-24 / 450 000 → 517 500 zł sale matches exactly
//                      one surviving property — powstanczej|5|8 (area 86,38),
//                      which the per-auction wykaz source captured cleanly
//                      ("Powstańcza" is the short spelling of "Oddziałów
//                      Młodzieży Powstańczej"; the |5|10 pair shows the same
//                      two spellings of one street). The earlier "matches no
//                      survivor" note predated that clean capture.
const VERIFIED_JUNK = {
  katowice: [
    ['gornej 4 6 i|8|', 'gorna|4|'],
    ['oddzialow mlodziezy ii ustny|66|', 'oddzialow mlodziezy powstanczej|5|10'],
    ['oddzialow mlodziezy i ustny|86|', 'powstanczej|5|8'],
  ],
};

// city → [old key, replacement fields] — junk keys from since-fixed parser
// bugs whose TRUE identity was verified against the cached source document.
//   gliwice mastalerza — garage on a bare parcel ("zabudowanej garażem … przy
//     ul. Mastalerza na działce nr 233/1"); re-keyed with the rejon-garage
//     convention the fixed parser now emits.
//   bytom strażacka — joint lot ("ul. Strażacka 3 i ul. Podgórna 6/1", one
//     price); keyed on the first address, the 1 749 m² total is the whole
//     property, not a unit → land_area_m2.
const VERIFIED_RENAMES = {
  katowice: [
    // Page-break artifact in the 2023 yearly PDF: footer "Strona 1" + header
    // "Przetargi" + row number "26." glued into address "Przetargi 26". The
    // row itself (line "Wita Stwosza 1/11  144,07  lokal mieszkalny
    // 430 000,00 zł  490 200,00 zł", 20.03.2023) identifies the real flat.
    ['przetargi|26|', {
      key: 'wita stwosza|1|11', street: 'Wita Stwosza', street_norm: 'wita stwosza',
      building: '1', apt: '11', area_m2: 144.07,
    }],
  ],
  gliwice: [
    ['mastalerza na dzialce nr|233|1', {
      key: 'mastalerza|0|garaz-233', street: 'Mastalerza', street_norm: 'mastalerza',
      building: '0', apt: 'garaz-233', kind: 'garaz',
    }],
  ],
  bytom: [
    ['strazacka 3 i ul podgorna|6|1', {
      key: 'strazacka|3|', street: 'Strażacka', street_norm: 'strazacka',
      building: '3', apt: null, moveAreaToLand: true,
    }],
  ],
};

// Whole-property sales healed in place: a "mieszkalny"/"unknown" property
// whose area exceeds any real flat (300 m²) is carrying a plot/building
// total (Katowice "Chodnikowa 33E" 1 920 m², "Górna 4" 1 049 m²) — move it
// to land_area_m2 so the archive stops computing zł/m² from a plot.
const MAX_FLAT_M2 = 300;

const POLISH_LOWER = (s) =>
  s.toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');
const streetNorm = (street) =>
  POLISH_LOWER(street).replace(/[^\w]+/g, ' ').trim().replace(/\s+/g, ' ');

// Cross-city display evidence for the ambiguous -skiej/-ckiej/-dzkiej
// endings: if ANY city's dataset has the nominative twin street, the name is
// adjectival (city/place adjective), not a female-patron surname — safe to
// flip the display ("Raciborskiej" → "Raciborska" because Raciborska exists
// elsewhere). Surnames ("Skłodowskiej") never have a nominative twin street.
const GLOBAL_TWIN_SUBS = [['skiej', 'ska'], ['ckiej', 'cka'], ['dzkiej', 'dzka']];
const globalByNorm = new Map();
for (const cityId of readdirSync(DATA_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name)) {
  const path = join(DATA_DIR, cityId, 'properties.json');
  if (!existsSync(path)) continue;
  try {
    for (const p of JSON.parse(readFileSync(path, 'utf8')).properties || []) {
      if (!globalByNorm.has(p.street_norm)) globalByNorm.set(p.street_norm, p.street);
    }
  } catch { /* unreadable city — skip evidence from it */ }
}
function crossCityDisplay(props, cityId) {
  for (const p of props) {
    if (/[\s-]/.test(p.street)) continue;
    for (const [gen, nom] of GLOBAL_TWIN_SUBS) {
      if (!p.street_norm.endsWith(gen)) continue;
      const twinNorm = p.street_norm.slice(0, -gen.length) + nom;
      const twin = globalByNorm.get(twinNorm);
      if (twin && !/[\s-]/.test(twin) && p.street.toLowerCase().endsWith(gen)) {
        const next = p.street.slice(0, -gen.length) + nom;
        if (next !== p.street) {
          console.error(`${cityId}: display ${p.street} → ${next} (cross-city twin)`);
          p.street = next;
        }
      }
      break;
    }
  }
}

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
  for (const [oldKey, repl] of VERIFIED_RENAMES[cityId] || []) {
    const p2 = props.find((x) => x.key === oldKey);
    if (!p2) continue;
    const { moveAreaToLand, ...fields } = repl;
    Object.assign(p2, fields);
    if (fields.area_m2 != null) {
      for (const l of p2.listings) if (l.area_m2 == null) l.area_m2 = fields.area_m2;
    }
    if (moveAreaToLand && p2.area_m2 != null) {
      const a = p2.area_m2;
      p2.land_area_m2 = a;
      p2.area_m2 = null;
      for (const l of p2.listings) if (l.area_m2 === a) { l.land_area_m2 = a; l.area_m2 = null; }
    }
    console.error(`${cityId}: re-keyed ${oldKey} → ${p2.key}`);
  }

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

  // (2) fold genitive/nominative zombie duplicates + dedupe per date
  //     (also runs the display-street pass).
  props = healStreetVariants(props);
  crossCityDisplay(props, cityId);

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
