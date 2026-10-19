// Reviewed cross-ledger repairs. Source evidence and the original records are
// retained in ledger-repairs-data.js; generated_at is never advanced here.
import { LEDGER_REPAIRS } from './ledger-repairs-data.js';
import { mergePartialLand } from './build-land.js';

function removeReviewedRows(rows, rules, store) {
  return rows.flatMap((entry) => {
    const matching = rules.filter((r) => r.from_store === store && r.from_key === entry.key);
    if (!matching.length) return [entry];
    const listings = entry.listings.filter((l) => !matching.some((r) =>
      r.original.date === l.date && (r.original.detail_url || r.original.source_pdf || r.original.source_url || null)
        === (l.detail_url || l.source_pdf || l.source_url || null)));
    return listings.length ? [{ ...entry, listings }] : [];
  });
}

export function repairPropertyLedger(properties, city) {
  const rules = LEDGER_REPAIRS.filter((r) => r.city === city);
  const retained = removeReviewedRows(properties, rules, 'properties');
  const targets = rules.flatMap((r) => r.properties || []).map((p) => structuredClone(p));
  // The durable property healer folds identical keys and histories afterwards.
  for (const target of targets) {
    const current = retained.find((p) => p.key === target.key);
    if (!current) { retained.push(target); continue; }
    for (const row of target.listings) {
      if (!current.listings.some((l) => l.date === row.date
          && (l.source_pdf || l.detail_url) === (row.source_pdf || row.detail_url))) current.listings.push(row);
    }
  }
  return retained;
}

export function repairLandLedger(plots, city) {
  const rules = LEDGER_REPAIRS.filter((r) => r.city === city);
  const retained = removeReviewedRows(plots, rules, 'land');
  const targets = rules.flatMap((r) => r.plots || []).map((p) => structuredClone(p));
  for (const target of targets) {
    const current = retained.find((p) => p.key === target.key);
    if (!current) { retained.push(target); continue; }
    for (const row of target.listings) {
      if (!current.listings.some((l) => l.date === row.date
          && (l.detail_url || l.source_url || null) === (row.detail_url || row.source_url || null))) current.listings.push(row);
    }
  }
  return mergePartialLand([], retained);
}

export function isMigratedPropertyListing(city, key, listing) {
  return LEDGER_REPAIRS.some((r) => r.city === city && r.from_store === 'properties'
    && r.from_key === key && r.original.date === (listing.auction_date ?? null)
    && (r.original.detail_url || r.original.source_pdf || null) === (listing.detail_url || listing.source_pdf || null));
}
