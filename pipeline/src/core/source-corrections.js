// Historical parser repairs, guarded by source URL, date and the observed old
// value. A source reparse never rewrites an unrelated auction or newer value.
import { SOURCE_CORRECTIONS } from './source-corrections-data.js';

export function applySourceCorrections(properties, cityId) {
  const rules = SOURCE_CORRECTIONS.filter((rule) => rule.city === cityId);
  if (!rules.length) return properties;
  const result = new Map();
  function add(property, listing) {
    let target = result.get(property.key);
    if (!target) {
      target = { ...property, listings: [] };
      result.set(property.key, target);
    }
    target.listings.push(listing);
    if (property.legacy_keys) {
      target.legacy_keys = [...new Set([...(target.legacy_keys || []), ...property.legacy_keys])];
    }
  }
  for (const property of properties) {
    let repairedArea = false;
    for (const listing of property.listings) {
      const source = listing.source_pdf || listing.detail_url || listing.source_url;
      const rule = rules.find((candidate) => candidate.key === property.key
        && candidate.url === source && candidate.date === listing.date);
      if (!rule) { add(property, listing); continue; }
      const hasOriginalError = Boolean(rule.identity || rule.exclude || rule.replacements) || Object.entries(rule.changes).some(([field, change]) =>
        ['starting_price_pln', 'final_price_pln', 'area_m2'].includes(field)
        && (listing[field] ?? null) === change.from);
      if (!hasOriginalError) { add(property, listing); continue; }
      if (rule.exclude) continue;
      if (rule.replacements) {
        for (const replacement of rule.replacements) {
          const repaired = { ...listing };
          for (const [field, change] of Object.entries(replacement.changes)) {
            if ((repaired[field] ?? null) === change.from) repaired[field] = change.to;
          }
          const { warning: _warning, ...identity } = replacement.identity;
          add({ ...property, ...identity, area_m2: repaired.area_m2,
            legacy_keys: [...new Set([...(property.legacy_keys || []), property.key])] }, repaired);
        }
        continue;
      }
      for (const [field, change] of Object.entries(rule.changes)) {
        if ((listing[field] ?? null) !== change.from) continue;
        listing[field] = change.to;
        if (field === 'area_m2' && property.area_m2 === change.from) repairedArea = true;
      }
      if (rule.identity) {
        const { warning: _warning, ...identity } = rule.identity;
        add({ ...property, ...identity,
          legacy_keys: [...new Set([...(property.legacy_keys || []), property.key])],
        }, listing);
      } else add(property, listing);
    }
    if (repairedArea && result.has(property.key)) {
      const target = result.get(property.key);
      target.area_m2 = [...target.listings].reverse().find((row) => row.area_m2 != null)?.area_m2 ?? null;
    }
  }
  return [...result.values()];
}
