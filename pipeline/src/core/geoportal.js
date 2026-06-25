// Builds a "view this parcel on a map" link for a land plot. The national
// geoportal supports a PRECISE deep-link only with a full TERYT identifier
// (WWPPGG_R.OOOO.NDZ — e.g. 246101_1.0009.1922/182). Municipal announcements
// usually give only the obręb NAME + parcel number, not the TERYT region/obręb
// numbers, so a precise link can't always be built. Resolution order:
//   1. a map link the SOURCE itself provided (plot.geoportal_url) — most exact;
//   2. a per-city override (config.geoportal(plot)) — e.g. a municipal SIP;
//   3. a precise national-geoportal deep-link when a full TERYT id is present;
//   4. a geoportal-scoped search that resolves the parcel by obręb + number.
// The portal can therefore differ per city without touching this file.

const GEOPORTAL_PARCEL = 'https://mapy.geoportal.gov.pl/imap/?identifyParcel=';
// WWPPGG_R.OOOO[.AR_x].NDZ  (TERYT gmina _ type . obręb [. arkusz] . parcel)
const TERYT_ID = /^\d{6}_\d(?:\.[\w/]+){1,3}$/;

/** A geoportal-scoped parcel-SEARCH fallback link (used when the precise
 *  TERYT id is unknown). */
export function parcelSearchUrl({ nr, obreb, label } = {}) {
  const q = ['działka', nr, obreb, label].filter(Boolean).join(' ');
  if (!nr && !obreb) return null;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q + ' geoportal działki');
}

/** The national-geoportal precise deep-link for a full TERYT parcel id, or null. */
export function nationalGeoportalUrl(id) {
  return id && TERYT_ID.test(String(id)) ? GEOPORTAL_PARCEL + encodeURIComponent(id) : null;
}

/**
 * @param {object} plot  a land plot (kind 'grunt'): dzialka_nr, obreb,
 *   dzialka_id?, geoportal_url?, address_raw?, street?, city?.
 * @param {object} [cfg] the city config/adapter: { label?, geoportal?(plot) }.
 * @returns {string|null}
 */
export function geoportalUrl(plot, cfg = {}) {
  if (!plot) return null;
  // 1) Source already linked its own map/portal — trust it verbatim.
  if (plot.geoportal_url) return plot.geoportal_url;
  // 2) Per-city override (a municipal SIP / e-mapa instance).
  if (typeof cfg.geoportal === 'function') {
    const u = cfg.geoportal(plot);
    if (u) return u;
  }
  // 3) Precise national-geoportal deep-link when a full TERYT id is known.
  const precise = nationalGeoportalUrl(plot.dzialka_id);
  if (precise) return precise;
  // 4) Fallback: a geoportal-scoped search that resolves the parcel by
  //    obręb + number (the portal app has no stable free-text GET param).
  if (!plot.dzialka_nr && !plot.obreb && !plot.address_raw && !plot.street) return null;
  // Include the street/address too. For addr-only plots (no parcel number)
  // the obreb code alone is near-useless; the street is what locates them.
  const street = plot.street || plot.address_raw || null;
  const q = ['działka', plot.dzialka_nr, street, plot.obreb, cfg.label || plot.city]
    .filter(Boolean)
    .join(' ');
  return 'https://www.google.com/search?q=' + encodeURIComponent(q + ' geoportal działki');
}
