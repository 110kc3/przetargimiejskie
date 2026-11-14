
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { dedupeListingsByDate } from '../src/core/build-properties.js';
import {
  applyVerifiedRenames,
  applyDurablePropertyHeals,
  buildGlobalStreetDisplay,
  stripOcrStreetNoise,
} from '../src/core/verified-heals.js';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

const MAX_FLAT_M2 = 300;

const POLISH_LOWER = (s) =>
  s.toLowerCase()
    .replace(/[ąàá]/g, 'a').replace(/[ćč]/g, 'c').replace(/[ęè]/g, 'e')
    .replace(/[ł]/g, 'l').replace(/[ńñ]/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śš]/g, 's').replace(/[żź]/g, 'z');
const streetNorm = (street) =>
  POLISH_LOWER(street).replace(/[^\w]+/g, ' ').trim().replace(/\s+/g, ' ');

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

  const byKey = new Map(props.map((p) => [p.key, p]));
  for (const p of [...byKey.values()]) {
    const cleanedStreet = stripOcrStreetNoise(p.street);
    if (cleanedStreet === p.street) continue;
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

  applyVerifiedRenames(props, cityId);

  for (const p2 of props) {
    if (p2.area_m2 == null || p2.area_m2 <= MAX_FLAT_M2) continue;
    if (p2.kind !== 'mieszkalny' && p2.kind !== 'unknown') continue;
    const a = p2.area_m2;
    p2.land_area_m2 = a;
    p2.area_m2 = null;
    for (const l of p2.listings) if (l.area_m2 === a) { l.land_area_m2 = a; l.area_m2 = null; }
    console.error(`${cityId}: ${p2.key} area ${a} m² → land_area_m2 (whole-property sale)`);
  }

  //     both normal and preserve-on-empty refresh paths.
  props = applyDurablePropertyHeals(props, cityId, globalByNorm);

  if (JSON.stringify(props) !== before) {
    file.properties = props;
    writeFileSync(path, JSON.stringify(file, null, 2) + '\n');
    console.error(`${cityId}: wrote ${path}`);
    touchedCities++;
  }
}
console.error(touchedCities ? `Healed ${touchedCities} city file(s). Now run recount-auctions.js.` : 'Nothing to heal.');
