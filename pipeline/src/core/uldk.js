const ULDK_BY_NAME = 'https://uldk.gugik.gov.pl/?request=GetParcelByIdOrNr';
const ULDK_BY_ID = 'https://uldk.gugik.gov.pl/?request=GetParcelById';

export function pickTerytId(responseText, terytGmina) {
  const lines = String(responseText || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const ids = lines.slice(1).filter((l) => /^\d{6}_\d\./.test(l));
  if (!ids.length) return null;
  if (terytGmina) return ids.find((id) => id.startsWith(`${terytGmina}.`)) || null;
  return ids.length === 1 ? ids[0] : null;
}

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

export async function resolveTerytId({ obreb, parcel, terytGmina, obreby } = {}, opts = {}) {
  if (!obreb || !parcel) return null;

  if (terytGmina) {
    let code = null;
    const m = String(obreb).match(/^\s*(\d{1,4})(?:\s|$)/);
    if (m) {
      code = m[1].padStart(4, '0');
    } else {
      const map = obreby || opts.obreby;
      if (map) {
        const clean = String(obreb)
          .toLowerCase()
          .replace(/^obr[ęe]b\w*\s*/i, '')
          .replace(/\bewidencyjn\w*\b/gi, '')
          .replace(/\barkusz\w*\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        code = map[clean] || map[obreb] || null;
      }
    }
    if (code) {
      const fullId = `${terytGmina}.${code}.${parcel}`;
      const txt = await uldkGet(`${ULDK_BY_ID}&id=${encodeURIComponent(fullId)}&result=id`, opts);
      const id = pickTerytId(txt, terytGmina);
      if (id) return id;
    }
  }

  const name = String(obreb).replace(/^\s*\d+\s+/, '').trim();
  if (!name) return null;
  const txt = await uldkGet(`${ULDK_BY_NAME}&id=${encodeURIComponent(`${name} ${parcel}`)}&result=id`, opts);
  return pickTerytId(txt, terytGmina);
}
