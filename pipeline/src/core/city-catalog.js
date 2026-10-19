// Compact discovery metadata; no auction histories are embedded in this file.
export const OVERLAY_CITIES = new Set(['gliwice','katowice','bytom','rybnik','myslowice','swietochlowice','bielsko']);
export function buildCityCatalog(manifest, index, { now = new Date(), landByCity = {} } = {}) {
  const enabled = new Map(index.cities.map(c => [c.id,c]));
  const today = now.toISOString().slice(0,10);
  const cities = manifest.cities.map(c => {
    const runtime = enabled.get(c.pipeline_id);
    const checked = runtime?.last_successful_source_check_at || null;
    const stale = !checked || !Number.isFinite(Date.parse(checked)) || now - new Date(checked) > 3*864e5;
    const degraded = runtime?.coverage_status === 'degraded' || runtime?.last_refresh_status === 'failed' || stale;
    const plots = landByCity[c.pipeline_id]?.plots;
    const landActive = plots ? plots.flatMap(p=>p.listings || []).filter(l=>l.outcome==='active'&&(!l.date||l.date>=today)).length : null;
    let status = c.lifecycle?.research === 'unresearched' ? 'unresearched' : 'not_monitored';
    if (runtime) status = degraded ? 'unavailable' : runtime.coverage_status === 'valid_empty' && landActive === 0 ? 'empty'
      : runtime.coverage_status === 'unknown' ? 'unknown' : 'monitored';
    const knownCounts=runtime && runtime.coverage_status!=='unknown';
    return {
      id:c.id, simc:c.official.simc, label:c.label, voivodeship:c.voivodeship,
      powiat:c.official.powiat_name, pipeline_id:runtime ? runtime.id : null,
      status, assets:runtime?.monitored_assets || [],
      last_success_at:checked, last_attempt_at:runtime?.last_source_attempt_at || null,
      properties:knownCounts ? runtime.unique_properties : null,
      archived_auctions:knownCounts ? runtime.archived_auctions : null,
      active_auctions:knownCounts ? runtime.active_auctions : null,
      land_plots:knownCounts ? runtime.land_plots : null, land_active:knownCounts ? landActive : null,
      searchable:Boolean(runtime),
      seo_indexable:Boolean(runtime && (runtime.public ?? ((runtime.active_auctions||0)+(runtime.archived_auctions||0)>=10))),
      overlay:OVERLAY_CITIES.has(runtime?.id), host:runtime?.host || null,
    };
  });
  const present = new Set(cities.map(c=>c.pipeline_id).filter(Boolean));
  for (const id of enabled.keys()) if (!present.has(id)) throw new Error(`enabled city missing from official catalogue: ${id}`);
  return {schema_version:1,inventory_date:manifest.source?.effective_date || manifest.cities[0]?.official.effective_date,
    source_index_generated_at:index.generated_at,cities};
}
