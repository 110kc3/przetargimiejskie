// Builds data/<city>/land.json — the SEPARATE parcel-keyed store for land
// (działki / grunty) sale auctions. Land has no street|building|apt, so it does
// NOT go through build-properties.js (which keys on address); it is collected
// here, keyed by cadastral parcel number instead. Houses (kind 'zabudowana')
// DO have addresses and stay in properties.json — only 'grunt' lands here.
//
// Introduced in HL-0 of the houses/land expansion (see SPIKE-HOUSES-LAND.md +
// TODO.md). The shape deliberately mirrors a property: one entry per unique
// parcel, with a chronological `listings[]`, so the extension/site can render
// land with the same machinery as flats (minus zł/m², which is plot-based).

/**
 * Stable per-city key for a land record. File is per-city, so the key is NOT
 * city-namespaced here — background.js namespaces at merge time, exactly like
 * properties.json. Preference: cadastral parcel (+ obręb to disambiguate the
 * same parcel number across districts), then a street address, then the raw
 * address string.
 * @param {object} r
 * @returns {string|null}
 */
import { todayWarsaw } from './build-properties.js';
import { geoportalUrl } from './geoportal.js';

export function landKey(r) {
  if (!r || typeof r !== 'object') return null;
  const parcel = (r.dzialka_nr ?? '').toString().trim();
  const obreb = (r.obreb ?? '').toString().trim().toLowerCase();
  if (parcel) return obreb ? `dz|${obreb}|${parcel}` : `dz|${parcel}`;
  if (r.address && r.address.key) return r.address.key;
  if (r.street && r.building != null) {
    return `${(r.street_norm || String(r.street).toLowerCase())}|${r.building}|`;
  }
  const raw = (r.address_raw ?? r.street ?? '').toString().trim().toLowerCase();
  return raw ? `addr|${raw}` : null;
}

/**
 * Merge parcel-shaped land records into one entry per unique parcel.
 * @param {Array<object>} records  land listings (kind 'grunt'); each may carry
 *   dzialka_nr, obreb, address/address_raw/street/building, area_m2 (PLOT area),
 *   zoning, starting_price_pln, final_price_pln, auction_date, round, outcome,
 *   detail_url, source_url.
 * @param {string} cityId
 * @returns {{ plots: Array<object> }}
 */
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
        listings: [],
      };
      plots.set(key, p);
    }
    if (p.dzialka_nr == null && r.dzialka_nr != null) p.dzialka_nr = r.dzialka_nr;
    if (p.obreb == null && r.obreb != null) p.obreb = r.obreb;
    if (p.zoning == null && r.zoning != null) p.zoning = r.zoning;
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
      ...(r.source_url ? { source_url: r.source_url } : {}),
    });
  }

  for (const p of plots.values()) {
    // One auction event per parcel per date: fold same-date rows, keeping the
    // most-resolved fields.
    const byDate = new Map();
    const out = [];
    for (const l of p.listings) {
      if (!l.date) { out.push(l); continue; }
      const prev = byDate.get(l.date);
      if (!prev) { byDate.set(l.date, l); out.push(l); continue; }
      for (const k of ['round', 'starting_price_pln', 'final_price_pln', 'area_m2', 'detail_url', 'source_url']) {
        if (prev[k] == null && l[k] != null) prev[k] = l[k];
      }
      if (prev.outcome === 'active' && l.outcome && l.outcome !== 'active') prev.outcome = l.outcome;
    }
    out.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    p.listings = out;
    // Derive the round from attempt order when the source didn't state it
    // (same convention as build-properties.js).
    let attempt = 0;
    for (const l of p.listings) {
      attempt++;
      if (l.round == null) l.round = attempt;
      else attempt = l.round;
    }
  }

  for (const p of plots.values()) {
    p.geoportal_url = geoportalUrl(p, cfg);
  }

  const arr = [...plots.values()].sort((a, b) => {
    const la = a.listings[a.listings.length - 1]?.date || '0';
    const lb = b.listings[b.listings.length - 1]?.date || '0';
    return String(lb).localeCompare(String(la));
  });
  return { plots: arr };
}
