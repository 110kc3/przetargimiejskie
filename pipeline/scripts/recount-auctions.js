
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

function countCity(cityId) {
  const p = join(DATA_DIR, cityId, 'properties.json');
  if (!existsSync(p)) return { active: 0, archived: 0 };
  const props = JSON.parse(readFileSync(p, 'utf8')).properties || [];
  let active = 0;
  let archived = 0;
  for (const prop of props) {
    for (const l of prop.listings) {
      if (l.outcome === 'active') active++;
      else if (l.outcome === 'archived' || l.outcome === 'sold' || l.outcome === 'unsold' || l.outcome === 'no_winner') archived++;
    }
  }
  return { active, archived, unique: props.length };
}

const idxPath = join(DATA_DIR, 'index.json');
const idx = JSON.parse(readFileSync(idxPath, 'utf8'));

let totalActive = 0;
let totalArchived = 0;
for (const c of idx.cities) {
  const { active, archived, unique } = countCity(c.id);
  c.active_auctions = active;
  c.archived_auctions = archived;
  c.unique_properties = unique;
  totalActive += active;
  totalArchived += archived;

  const metaPath = join(DATA_DIR, c.id, 'meta.json');
  if (existsSync(metaPath)) {
    const m = JSON.parse(readFileSync(metaPath, 'utf8'));
    m.active_auctions = active;
    m.archived_auctions = archived;
    m.unique_properties = unique;
    writeFileSync(metaPath, JSON.stringify(m, null, 2) + '\n');
  }
  console.error(`${c.label.padEnd(16)} aktualne: ${String(active).padStart(3)}  w archiwum: ${String(archived).padStart(4)}`);
}

writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n');
console.error('-----');
console.error(`TOTAL            aktualne: ${String(totalActive).padStart(3)}  w archiwum: ${String(totalArchived).padStart(4)}`);
console.error(`Wrote ${idxPath} and per-city meta.json.`);
