const GEOPORTAL_PARCEL = 'https://mapy.geoportal.gov.pl/imap/?identifyParcel=';
const TERYT_ID = /^\d{6}_\d(?:\.[\w/]+){1,3}$/;

export function parcelSearchUrl({ nr, obreb, label } = {}) {
  const q = ['działka', nr, obreb, label].filter(Boolean).join(' ');
  if (!nr && !obreb) return null;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q + ' geoportal działki');
}

export function nationalGeoportalUrl(id) {
  return id && TERYT_ID.test(String(id)) ? GEOPORTAL_PARCEL + encodeURIComponent(id) : null;
}

export function geoportalUrl(plot, cfg = {}) {
  if (!plot) return null;
  if (plot.geoportal_url) return plot.geoportal_url;
  if (typeof cfg.geoportal === 'function') {
    const u = cfg.geoportal(plot);
    if (u) return u;
  }
  const precise = nationalGeoportalUrl(plot.dzialka_id);
  if (precise) return precise;
  if (!plot.dzialka_nr && !plot.obreb && !plot.address_raw && !plot.street) return null;
  const street = plot.street || plot.address_raw || null;
  const q = ['działka', plot.dzialka_nr, street, plot.obreb, cfg.label || plot.city]
    .filter(Boolean)
    .join(' ');
  return 'https://www.google.com/search?q=' + encodeURIComponent(q + ' geoportal działki');
}
