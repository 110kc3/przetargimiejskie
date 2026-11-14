
import { todayWarsaw } from './build-properties.js';
import { geoportalUrl } from './geoportal.js';

export function splitParcels(dzialkaNr) {
  if (!dzialkaNr) return [];
  const seen = new Set();
  const out = [];
  for (const raw of String(dzialkaNr).split(/\s*[,;]\s*/)) {
    const nr = raw.trim();
    if (nr && !seen.has(nr)) { seen.add(nr); out.push({ nr }); }
  }
  return out;
}

export function landKey(r) {
  if (!r || typeof r !== 'object') return null;
  const parcel = (r.dzialka_nr ?? '').toString().trim();
  const obreb = (r.obreb ?? '').toString().trim().toLowerCase();
  if (parcel) return obreb ? `dz|${obreb}|${parcel}` : `dz|${parcel}`;
  if (r.address && r.address.key) return `addr|${r.address.key}`;
  if (r.street && r.building != null) {
    return `addr|${(r.street_norm || String(r.street).toLowerCase())}|${r.building}|`;
  }
  const raw = (r.address_raw ?? r.street ?? '').toString().trim().toLowerCase();
  return raw ? `addr|${raw}` : null;
}

export function buildLand(records, cityId, cfg = {}) {
  const TODAY = todayWarsaw();
  const plots = new Map();

  for (const r of records || []) {
    if (!r || typeof r !== 'object') continue;
    const key = landKey(r);
    if (!key) continue;
    let p = plots.get(key);
    if (!p) {
      let street = r.street ?? null;
      let building = r.building ?? null;
      if (street == null && r.address) {
        street = r.address.street ?? null;
        building = r.address.building ?? null;
      }
      p = {
        key,
        kind: 'grunt',
        city: cityId,
        dzialka_nr: r.dzialka_nr ?? null,
        obreb: r.obreb ?? null,
        street,
        building,
        address_raw: r.address_raw ?? null,
        dzialka_id: r.dzialka_id ?? null,
        geoportal_url: r.geoportal_url ?? null,
        area_m2: null, // PLOT area (not usable floor area) — kept separate from flat zł/m²
        zoning: r.zoning ?? null,
        status: r.status ?? null, // source status (e.g. Gliwice MSIP "oferta do wznowienia")
        listings: [],
      };
      plots.set(key, p);
    }
    if (p.dzialka_nr == null && r.dzialka_nr != null) p.dzialka_nr = r.dzialka_nr;
    if (p.obreb == null && r.obreb != null) p.obreb = r.obreb;
    if (p.zoning == null && r.zoning != null) p.zoning = r.zoning;
    if (p.status == null && r.status != null) p.status = r.status;
    if (p.address_raw == null && r.address_raw != null) p.address_raw = r.address_raw;
    if (p.street == null && r.street != null) p.street = r.street;
    if (p.dzialka_id == null && r.dzialka_id != null) p.dzialka_id = r.dzialka_id;
    if (p.geoportal_url == null && r.geoportal_url != null) p.geoportal_url = r.geoportal_url;

    const plotArea = r.area_m2 ?? r.land_area_m2 ?? null;
    if (plotArea != null && (p.area_m2 == null || plotArea > p.area_m2)) p.area_m2 = plotArea;

    let outcome = r.outcome ?? 'active';
    if (outcome === 'active' && r.auction_date && r.auction_date < TODAY) outcome = 'archived';
    p.listings.push({
      date: r.auction_date == null ? null : String(r.auction_date),
      round: r.round ?? null,
      starting_price_pln: r.starting_price_pln ?? null,
      outcome,
      ...(r.final_price_pln != null ? { final_price_pln: r.final_price_pln } : {}),
      ...(plotArea != null ? { area_m2: plotArea } : {}),
      ...(r.detail_url ? { detail_url: r.detail_url } : {}),
      ...(r.source_url || r.source_pdf ? { source_url: r.source_url || r.source_pdf } : {}),
      ...(r.notes?.length ? { notes: r.notes } : {}),
      ...(r.notice_only ? { notice_only: true } : {}),
      ...(r.source_unassigned_price_pln != null ? { source_unassigned_price_pln: r.source_unassigned_price_pln } : {}),
    });
  }

  for (const p of plots.values()) {
    const byDate = new Map();
    const out = [];
    for (const l of p.listings) {
      if (!l.date) { out.push(l); continue; }
      const prev = byDate.get(l.date);
      if (!prev) { byDate.set(l.date, l); out.push(l); continue; }
      const terminal = outcome => ['sold', 'unsold', 'no_winner'].includes(outcome);
      const preferResult = terminal(l.outcome) && !terminal(prev.outcome);
      for (const k of ['round', 'starting_price_pln', 'final_price_pln', 'area_m2', 'detail_url', 'source_url']) {
        if ((preferResult || prev[k] == null) && l[k] != null) prev[k] = l[k];
      }
      if (preferResult || (prev.outcome === 'active' && l.outcome && l.outcome !== 'active')) prev.outcome = l.outcome;
    }
    out.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    p.listings = out;
    let attempt = 0;
    for (const l of p.listings) {
      attempt++;
      if (l.round == null) l.round = attempt;
      else attempt = l.round;
    }
  }

  for (const p of plots.values()) {
    p.parcels = splitParcels(p.dzialka_nr);
    p.geoportal_url = geoportalUrl(p, cfg);
  }

  const arr = [...plots.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return String(lb).localeCompare(String(la));
  });
  return { plots: arr };
}

export function mergePartialLand(previousPlots, currentPlots) {
  const plots = new Map();

  const clonePlot = (plot) => ({
    ...plot,
    listings: Array.isArray(plot.listings) ? plot.listings.map((listing) => ({ ...listing })) : [],
    parcels: Array.isArray(plot.parcels) ? plot.parcels.map((parcel) => ({ ...parcel })) : [],
  });

  for (const plot of previousPlots || []) {
    if (plot?.key) plots.set(plot.key, clonePlot(plot));
  }

  for (const incoming of currentPlots || []) {
    if (!incoming?.key) continue;
    const previous = plots.get(incoming.key);
    if (!previous) {
      plots.set(incoming.key, clonePlot(incoming));
      continue;
    }

    for (const [key, value] of Object.entries(incoming)) {
      if (key !== 'listings' && value != null) previous[key] = value;
    }

    const dated = new Map();
    for (const listing of previous.listings) {
      if (listing.date) dated.set(String(listing.date), listing);
    }
    for (const listing of incoming.listings || []) {
      const existing = listing.date ? dated.get(String(listing.date)) : null;
      if (!existing) {
        const copy = { ...listing };
        previous.listings.push(copy);
        if (copy.date) dated.set(String(copy.date), copy);
        continue;
      }

      const resolvedOutcome = existing.outcome && existing.outcome !== 'active' ? existing.outcome : null;
      for (const [key, value] of Object.entries(listing)) {
        if (value != null) existing[key] = value;
      }
      if (resolvedOutcome && ['active', 'archived'].includes(listing.outcome)) existing.outcome = resolvedOutcome;
    }
    previous.listings.sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
  }

  return [...plots.values()].sort((a, b) => {
    const latest = (plot) => plot.listings?.[plot.listings.length - 1]?.date || '0';
    return String(latest(b)).localeCompare(String(latest(a)));
  });
}

export function reconcileLandHistory(previous, current, {
  mergeHistory = true, complete = true, verifiedEmpty = false, today = null,
} = {}) {
  const preserveEmpty = current.length === 0 && previous.length > 0;
  const plots = (mergeHistory || !complete || preserveEmpty)
    ? mergePartialLand(previous, current)
    : mergePartialLand([], current);
  let aged = false;
  for (const plot of plots) {
    for (const listing of plot.listings || []) {
      if (listing.outcome === 'active'
          && ((verifiedEmpty && current.length === 0)
            || (today && listing.date && listing.date < today))) {
        listing.outcome = 'archived';
        aged = true;
      }
    }
  }
  return { plots, preserveFile: preserveEmpty && !aged };
}
