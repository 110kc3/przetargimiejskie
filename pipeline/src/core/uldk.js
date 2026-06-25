// Resolve a parcel's full TERYT identifier (WWPPGG_R.OOOO[.AR_x].NR_DZ) from its
// obręb (number and/or name) + parcel number via the public ULDK service
// (uldk.gugik.gov.pl), so the national geoportal "identifyParcel" deep-link can
// be built. Obręb names are NOT nationally unique, so the caller passes the
// city's gmina TERYT prefix (e.g. '246101_1') to disambiguate. Used by
// scripts/enrich-land-geoportal.js (cached).

const ULDK_BY_NAME = 'https://uldk.gugik.gov.pl/?request=GetParcelByIdOrNr';
const ULDK_BY_ID = 'https://uldk.gugik.gov.pl/?request=GetParcelById';

/** Parse a ULDK `result=id` response, picking the id in the expected gmina. */
export function pickTerytId(responseText, terytGmina) {
  const lines = String(responseText || '').split('\n').map((s) => s.trim()).filter(Boolean);
  // Line 0 is a status/count; the remaining lines are full identifiers.
  const ids = lines.slice(1).filter((l) => /^\d{6}_\d\./.test(l));
  if (!ids.length) return null;
  if (terytGmina) return ids.find((id) => id.startsWith(`${terytGmina}.`)) || null;
  return ids.length === 1 ? ids[0] : null;
}

/** Fetch a ULDK URL, returning the trimmed body or null (defensive: any network
 *  / HTTP error degrades to null so the caller falls back, never throws). */
async function uldkGet(url, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), opts.timeoutMs ?? 8000);
    const r = await fetchImpl(url, { signal: ac.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return (await r.text()).trim();
  } catch {
    return null;
  }
}

/**
 * @param {{obreb:string, parcel:string, terytGmina?:string}} q
 * @param {{timeoutMs?:number, fetchImpl?:Function}} [opts]
 * @returns {Promise<string|null>} full TERYT parcel id, or null
 */
export async function resolveTerytId({ obreb, parcel, terytGmina } = {}, opts = {}) {
  if (!obreb || !parcel) return null;

  // Strategy 1 — construct + verify. When the obręb carries its NUMBER
  // (e.g. "0012 Sosnowiec", "11 Zagórze", "03") and we know the gmina TERYT,
  // build the full identifier WWPPGG_R.OOOO.NR (obręb code zero-padded to 4) and
  // confirm it exists via GetParcelById. This bypasses unreliable obręb NAMES —
  // some sources use the CITY name as a placeholder ("0012 Sosnowiec"), which a
  // name search can never match. ULDK validates existence, so a wrong code just
  // yields null (never a false link), and we then fall through to the name search.
  if (terytGmina) {
    const m = String(obreb).match(/^\s*(\d{1,4})(?:\s|$)/);
    if (m) {
      const code = m[1].padStart(4, '0');
      const fullId = `${terytGmina}.${code}.${parcel}`;
      const txt = await uldkGet(`${ULDK_BY_ID}&id=${encodeURIComponent(fullId)}&result=id`, opts);
      const id = pickTerytId(txt, terytGmina);
      if (id) return id;
    }
  }

  // Strategy 2 — search by obręb NAME (strip a leading numeric token). Covers
  // plots that have only a name, or where the constructed id didn't resolve
  // (e.g. arkusz-mapped obręby whose id needs an AR_ segment we don't have).
  const name = String(obreb).replace(/^\s*\d+\s+/, '').trim();
  if (!name) return null;
  const txt = await uldkGet(`${ULDK_BY_NAME}&id=${encodeURIComponent(`${name} ${parcel}`)}&result=id`, opts);
  return pickTerytId(txt, terytGmina);
}
