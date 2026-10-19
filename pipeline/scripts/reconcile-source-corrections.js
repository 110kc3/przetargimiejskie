// Apply reviewed historical corrections without a crawl or a freshness advance.
// Default is read-only; use --write after inspecting the source-backed rules.
import { readFileSync, statSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { repairLandLedger, isMigratedPropertyListing } from '../src/core/ledger-repairs.js';
import { mergeProviderListings, providerCounts } from '../src/providers/common.js';
import { LEDGER_REPAIRS } from '../src/core/ledger-repairs-data.js';
import { SOURCE_CORRECTIONS } from '../src/core/source-corrections-data.js';
import { applyDurablePropertyHeals } from '../src/core/verified-heals.js';

const root = fileURLToPath(new URL('../../data/', import.meta.url));
const write = process.argv.includes('--write');
const selected = new Set((process.env.CITY || '').split(',').filter(Boolean));
const cities = selected.size ? [...selected] : [...new Set([...SOURCE_CORRECTIONS, ...LEDGER_REPAIRS].map((rule) => rule.city))];
for (const city of cities) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city)) throw new Error('invalid city');

function update(path, transform) {
  const before = readFileSync(path);
  const stat = statSync(path);
  const document = JSON.parse(before);
  const generatedAt = document.generated_at;
  const after = transform(document);
  if (after.generated_at !== generatedAt) throw new Error(`freshness advance denied: ${path}`);
  const bytes = JSON.stringify(after, null, 2) + '\n';
  if (bytes === before.toString()) return;
  console.error(`${write ? 'Correcting' : 'Would correct'} ${path}`);
  if (!write) return;
  const temp = `${path}.correction-${process.pid}.tmp`;
  writeFileSync(temp, bytes, { mode: stat.mode });
  if (readFileSync(temp, 'utf8') !== bytes || statSync(path).mtimeMs !== stat.mtimeMs
      || !readFileSync(path).equals(before)) {
    unlinkSync(temp);
    throw new Error(`concurrent or incomplete write: ${path}`);
  }
  renameSync(temp, path);
}

for (const city of cities) {
  let propertyCount;
  let assets=[];
  let activeAuctions;
  let archivedAuctions;
  let activeListings;
  update(join(root, city, 'properties.json'), (document) => {
    document.properties = applyDurablePropertyHeals(document.properties, city);
    propertyCount = document.properties.length;
    const names={mieszkalny:'residential',zabudowana:'building',grunt:'land',uzytkowy:'commercial',garaz:'garage',unknown:'unknown'};
    assets=[...new Set(document.properties.map(p=>names[p.kind]||p.kind||'unknown'))];
    const history = document.properties.flatMap((property) => property.listings);
    activeAuctions = history.filter((row) => row.outcome === 'active').length;
    archivedAuctions = history.filter((row) => ['sold', 'unsold', 'archived', 'no_winner'].includes(row.outcome)).length;
    return document;
  });
  update(join(root, city, 'active.json'), (document) => {
    const retained = [];
    for (const record of document.listings || []) {
      if (!record.address) { retained.push(record); continue; }
      const oldKey = record.address.key;
      if (isMigratedPropertyListing(city, oldKey, record)) continue;
      const [repaired] = applyDurablePropertyHeals([{ ...record.address, kind: record.kind,
        area_m2: record.area_m2, listings: [{ ...record, date: record.auction_date,
          outcome: 'active' }] }], city);
      if (!repaired) continue;
      const row = repaired.listings[0];
      for (const field of ['area_m2', 'starting_price_pln']) {
        if (row[field] !== record[field]) record[field] = row[field] ?? null;
      }
      if (repaired.key !== oldKey) {
        record.source_address_raw ??= record.address_raw;
        record.address = Object.fromEntries(['street', 'street_norm', 'building', 'apt', 'key']
          .map((field) => [field, repaired[field]]));
        record.address.warning = null;
        record.address_raw = `${repaired.street} ${repaired.building}${repaired.apt ? '/' + repaired.apt : ''}`;
      }
      retained.push(record);
    }
    document.listings = retained;
    activeListings = retained.length;
    return document;
  });
  let landCount = 0;
  update(join(root, city, 'land.json'), document => {
    document.plots = repairLandLedger(document.plots, city);
    landCount = document.plots.length;
    return document;
  });
  if (write) update(join(root, city, 'meta.json'), (document) => {
    document.monitored_assets=[...new Set([...assets,...(landCount?['land']:[])])].sort();
    document.land_plots = landCount;
    document.unique_properties = propertyCount;
    document.active_auctions = activeAuctions;
    document.archived_auctions = archivedAuctions;
    document.active_listings = activeListings;
    return document;
  });
}

// Seller migrations retain the provider's source timestamp and do not run its crawler.
for (const id of new Set(LEDGER_REPAIRS.filter(r=>cities.includes(r.city)&&r.provider).map(r=>r.provider.id))) {
  const rules=LEDGER_REPAIRS.filter(r=>cities.includes(r.city)&&r.provider?.id===id);
  let counts;
  update(join(root,'providers',id,'listings.json'),document=>{
    document.listings=mergeProviderListings(rules.flatMap(r=>r.provider.listings),document.listings);
    counts=providerCounts(document.listings);return document;
  });
  if(write)update(join(root,'providers',id,'meta.json'),document=>({...document,...counts}));
  const unresolved=rules.flatMap(r=>r.provider.unresolved || []);
  if(unresolved.length){
    const path=join(root,'providers',id,'unresolved.json');
    if(!existsSync(path)&&write){
      const document={schema_version:1,provider:id,records:[]};
      const bytes=JSON.stringify(document,null,2)+'\n';const temp=path+'.tmp';
      writeFileSync(temp,bytes);if(readFileSync(temp,'utf8')!==bytes)throw Error('incomplete unresolved ledger');renameSync(temp,path);
    }
    if(existsSync(path))update(path,document=>{
      const byKey=new Map((document.records||[]).map(row=>[row.event_key,row]));
      for(const row of unresolved)if(!byKey.has(row.event_key))byKey.set(row.event_key,row);
      document.records=[...byKey.values()];return document;
    });
  }
}
