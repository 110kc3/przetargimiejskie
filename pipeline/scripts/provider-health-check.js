// Read-only sanity/freshness gate for data/providers. Kept separate from the
// city health checker so a provider can never be mistaken for a municipality.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../../data/providers/', import.meta.url));
const STALE_DAYS = Number(process.env.PROVIDER_STALE_DAYS ?? process.env.STALE_DAYS ?? 3);
const EGRESS_STALE_MAX_DAYS = Number(process.env.EGRESS_STALE_MAX_DAYS || 21);
const expected = ['amw', 'pkp'];
const validOutcomes = new Set(['active', 'sold', 'unsold', 'no_winner', 'archived', 'cancelled']);
const failures = [];
const warnings = [];

// Suppress ONLY staleness for a feed that cannot currently refresh from
// GitHub-hosted Azure. Missing files, empty data, count drift, bad identities
// and every other contract violation still fail. This expires with the city
// exemptions; remove it as soon as restricted Polish egress is deployed.
const EGRESS_STALE = new Map([
  ['pkp', { since: '2026-08-25', reason: 'www.pkp.pl drops GitHub-hosted Azure connections' }],
]);
const parsedNow = Date.parse(process.env.PROVIDER_HEALTH_NOW || '');
const now = Number.isNaN(parsedNow) ? Date.now() : parsedNow;

function daysSince(iso) {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Infinity : (now - parsed) / 86_400_000;
}

function egressStaleExemption(id) {
  const exemption = EGRESS_STALE.get(id);
  if (!exemption) return { active: false, expired: false };
  const age = daysSince(exemption.since);
  return {
    active: age <= EGRESS_STALE_MAX_DAYS,
    expired: age > EGRESS_STALE_MAX_DAYS,
    age,
    ...exemption,
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const indexPath = join(DATA_DIR, 'index.json');
if (!existsSync(indexPath)) failures.push('provider index is missing');
else {
  const index = await readJson(indexPath);
  const indexed = new Set((index.providers || []).map((provider) => provider.id));
  for (const id of expected) {
    if (!indexed.has(id)) failures.push(`${id}: missing from provider index`);
    const metaPath = join(DATA_DIR, id, 'meta.json');
    const listingsPath = join(DATA_DIR, id, 'listings.json');
    if (!existsSync(metaPath) || !existsSync(listingsPath)) {
      failures.push(`${id}: meta/listings file missing`);
      continue;
    }
    const [meta, doc] = await Promise.all([readJson(metaPath), readJson(listingsPath)]);
    const listings = doc.listings || [];
    if (listings.length === 0) failures.push(`${id}: empty listings`);
    if (meta.total_listings !== listings.length) failures.push(`${id}: meta count ${meta.total_listings} != ${listings.length}`);
    if (meta.fresh_rows < meta.minimum_fresh_rows) failures.push(`${id}: fresh row count ${meta.fresh_rows} is below minimum ${meta.minimum_fresh_rows}`);
    if (!meta.generated_at || Number.isNaN(Date.parse(meta.generated_at))) failures.push(`${id}: invalid generated_at`);
    else {
      const ageDays = daysSince(meta.generated_at);
      if (ageDays > STALE_DAYS) {
        const exemption = egressStaleExemption(id);
        if (exemption.active) {
          const remaining = Math.max(0, EGRESS_STALE_MAX_DAYS - exemption.age).toFixed(0);
          warnings.push(
            `${id}: stale (${ageDays.toFixed(1)} days), temporarily preserved for known egress failure ` +
            `(${exemption.reason}); exemption expires in ${remaining}d`,
          );
        } else if (exemption.expired) {
          failures.push(
            `${id}: egress staleness exemption from ${exemption.since} expired ` +
            `(${exemption.age.toFixed(0)}d > ${EGRESS_STALE_MAX_DAYS}d)`,
          );
        } else {
          failures.push(`${id}: stale (${ageDays.toFixed(1)} days)`);
        }
      }
    }
    const keys = listings.map((row) => row.event_key);
    if (keys.some((key) => !key)) failures.push(`${id}: row without event_key`);
    if (new Set(keys).size !== keys.length) failures.push(`${id}: duplicate event_key`);
    if (listings.some((row) => row.seller_id !== id)) failures.push(`${id}: wrong seller_id`);
    if (listings.some((row) => !row.city || !row.address_raw || !row.auction_date)) failures.push(`${id}: row missing city/address/date`);
    if (listings.some((row) => !validOutcomes.has(row.outcome))) failures.push(`${id}: invalid outcome`);
    if (listings.some((row) => row.area_m2 === 0 || row.land_area_m2 === 0)) failures.push(`${id}: zero area (must be null when unknown)`);
    const active = listings.filter((row) => row.outcome === 'active').length;
    if (meta.active_auctions !== active || meta.historical_auctions !== listings.length - active) failures.push(`${id}: active/historical meta counts disagree with rows`);
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`OK ${expected.length} provider feeds are within the configured health policy and internally consistent`);
}
