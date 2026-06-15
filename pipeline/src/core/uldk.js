// Resolve a parcel's full TERYT identifier (WWPPGG_R.OOOO[.AR_x].NR_DZ) from its
// obręb NAME + parcel number via the public ULDK service (uldk.gugik.gov.pl), so
// the national geoportal "identifyParcel" deep-link can be built. Obręb names are
// NOT nationally unique, so the caller passes the city's gmina TERYT prefix
// (e.g. '246101_1') to disambiguate — if no result falls in that gmina we return
// null rather than guess. Used by scripts/enrich-land-geoportal.js (cached).

const ULDK = 'https://uldk.gugik.gov.pl/?request=GetParcelByIdOrNr';

/** Parse a ULDK `result=id` response, picking the id in the expected gmina. */
export function pickTerytId(responseText, terytGmina) {
  const lines = String(responseText || '').split('\n').map((s) => s.trim()).filter(Boolean);
  // Line 0 is a status/count; the remaining lines are full identifiers.
  const ids = lines.slice(1).filter((l) => /^\d{6}_\d\./.test(l));
  if (!ids.length) return null;
  if (terytGmina) return ids.find((id) => id.startsWith(`${terytGmina}.`)) || null;
  return ids.length === 1 ? ids[0] : null;
}

/**
 * @param {{obreb:string, parcel:string, terytGmina?:string}} q
 * @param {{timeoutMs?:number, fetchImpl?:Function}} [opts]
 * @returns {Promise<string|null>} full TERYT parcel id, or null
 */
export async function resolveTerytId({ obreb, parcel, terytGmina } = {}, opts = {}) {
  if (!obreb || !parcel) return null;
  // Some sources prefix the obręb with its number ("0001 Brzezinka", "03
  // Zagórze") — ULDK wants the NAME, so strip a leading numeric token.
  const name = String(obreb).replace(/^\s*\d+\s+/, '').trim();
  if (!name) return null;
  const url = `${ULDK}&id=${encodeURIComponent(`${name} ${parcel}`)}&result=id`;
  const fetchImpl = opts.fetchImpl || fetch;
  let txt;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), opts.timeoutMs ?? 8000);
    const r = await fetchImpl(url, { signal: ac.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    txt = (await r.text()).trim();
  } catch {
    return null;
  }
  return pickTerytId(txt, terytGmina);
}
