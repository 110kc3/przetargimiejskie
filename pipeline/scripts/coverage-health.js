export function daysSince(value, now = Date.now()) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? Infinity : (now - time) / 86_400_000;
}

export function validateLandDocument(city, document) {
  const failures = [];
  if (!document || document.schema_version !== 1 || document.city !== city || !Array.isArray(document.plots)) {
    return [`${city}: land.json has an invalid schema or city identity`];
  }
  const keys = new Set();
  for (const plot of document.plots) {
    if (!plot || typeof plot.key !== 'string' || !/^(?:dz|addr)\|/.test(plot.key)) {
      failures.push(`${city}: land plot has an invalid key`); continue;
    }
    if (keys.has(plot.key)) failures.push(`${city}: duplicate land key ${plot.key}`);
    keys.add(plot.key);
    if (plot.city !== city) failures.push(`${city}: land plot ${plot.key} has city ${plot.city}`);
    if (!Array.isArray(plot.listings) || plot.listings.length === 0) {
      failures.push(`${city}: land plot ${plot.key} has no listing history`);
    }
  }
  return failures;
}

export function evaluateCoverageHealth({
  city, meta, indexEntry = {}, landDocument = null, now = Date.now(), staleDays = 14, minUnique = 1,
}) {
  const failures = [];
  const warnings = [];
  const unique = meta?.unique_properties ?? indexEntry.unique_properties ?? 0;
  const landPlots = meta?.land_plots ?? indexEntry.land_plots ?? 0;
  const lastSuccess = meta?.last_successful_source_check_at || meta?.generated_at;
  const age = daysSince(lastSuccess, now);

  if (landPlots > 0) {
    for (const message of validateLandDocument(city, landDocument)) {
      failures.push({ classification: 'land-data', message });
    }
    if ((landDocument?.plots?.length ?? -1) !== landPlots) {
      failures.push({ classification: 'land-data', message: `${city}: land_plots=${landPlots} does not match land.json` });
    }
  }
  if (unique < minUnique && landPlots === 0 && meta?.valid_empty !== true) {
    failures.push({ classification: 'empty-data', message: `unique_properties=${unique} and land_plots=0 without valid_empty proof` });
  }
  let degradedStream = false;
  for (const [stream, state] of Object.entries(meta?.source_checks || {})) {
    if (state?.status === 'degraded') {
      degradedStream = true;
      failures.push({ classification: 'source-degraded', message: `${stream} source is degraded; last-good data is being preserved` });
    }
  }
  if (indexEntry.last_refresh_status === 'failed' && !degradedStream) {
    failures.push({
      classification: 'refresh-failed',
      message: `latest refresh attempt failed at ${indexEntry.last_source_attempt_at || 'an unknown time'}; last-good data is being preserved`,
    });
  }
  if (age > staleDays) {
    failures.push({
      classification: 'stale-data',
      message: `last successful source check is ${age === Infinity ? 'unknown' : `${age.toFixed(1)} days old`} (> ${staleDays}d)`,
    });
  }
  if ((meta?.active_auctions ?? indexEntry.active_auctions ?? 0) === 0) warnings.push('0 active auctions');
  if ((meta?.active_listings ?? indexEntry.active_listings ?? 0) === 0) warnings.push('0 active listings');
  return { failures, warnings, unique, landPlots, age };
}
