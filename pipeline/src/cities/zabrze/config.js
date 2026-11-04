// Zabrze — municipal property sales are run by the City Hall and published on
// the city BIP (bip.miastozabrze.pl) under a dedicated, deep "Lokale
// mieszkalne" sale board. See SPIKE-WAVE2.md "Zabrze".
//
// Shape: the board page is a Vue SPA; the list of auction *announcements* comes
// from a JSON API (/api/v1/document-list/549 — all items in one call). Each
// item's title carries the round + auction date ("Ogłoszenie o I/II ustnych …
// na dzień DD.MM.YYYY r."). The /doc/<id> page IS server-rendered and wraps ONE
// attachment holding the per-flat table (address / area / starting price). So
// the adapter reads the API for announcements, then fetches each /doc and
// extracts its attachment to get the flats. See crawl.js.
//
// `source: 'html'` — the adapter does its own attachment fetch + text
// extraction (it knows the per-announcement URL), so the refresh loop's
// OCR/pdf-text dispatch is bypassed; crawlResultDocs() returns refs that
// already carry `.text`. Attachments that turn out to be published result
// notices ("INFORMACJA O WYNIKU PRZETARGÓW") are routed to parseResultDoc —
// Zabrze's achieved-price stream (sold/unsold + final price per flat).
//
// NOTE (validate on first CI run): the attachment MIME could not be confirmed
// during the spike (host unreachable from the dev sandbox; file force-downloads
// in-browser). We assume a text PDF (pdftotext) — the most likely + the proven
// Katowice path. If CI shows a scanned PDF or a DOC/DOCX, switch the extractor
// in crawl.js (OCR / docx unzip) accordingly.

export const ZABRZE_OBREB_MAP = {
  'bielszowice': '0001',
  'biskupice': '0002',
  'grzybowice': '0003',
  'konczyce': '0004',
  'kończyce': '0004',
  'makoszowy': '0005',
  'mikulczyce': '0006',
  'pawlow': '0007',
  'pawłów': '0007',
  'rokitnica': '0008',
  'sosnica': '0009',
  'sośnica': '0009',
  'zaborze poludniowe': '0010',
  'zaborze południowe': '0010',
  'zaborze': '0011',
  'zabrze': '0012',
  'helenka': '0013',
  'maciejow': '0014',
  'maciejów': '0014',
};

export function zabrzeObrebCode(raw) {
  if (!raw) return null;
  const s = String(raw)
    .toLowerCase()
    .replace(/^obr[ęe]b\w*\s*/i, '')
    .replace(/\bewidencyjn\w*\b/gi, '')
    .replace(/\barkusz\w*\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return ZABRZE_OBREB_MAP[s] || null;
}

export const config = {
  id: 'zabrze',
  teryt: '247801_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  obreby: ZABRZE_OBREB_MAP,
  label: 'Zabrze',
  voivodeship: "slaskie",
  authority: 'Urząd Miejski w Zabrzu',
  host: 'bip.miastozabrze.pl',
  source: 'html',
  geoportal(plot) {
    if (!plot) return null;
    if (plot.dzialka_id) {
      return `https://mapy.geoportal.gov.pl/imap/?identifyParcel=${encodeURIComponent(plot.dzialka_id)}`;
    }
    const code = zabrzeObrebCode(plot.obreb);
    const nr = plot.dzialka_nr ? plot.dzialka_nr.trim() : null;
    if (code && nr && !nr.includes(',')) {
      const fullId = `247801_1.${code}.${nr}`;
      return `https://mapy.geoportal.gov.pl/imap/?identifyParcel=${encodeURIComponent(fullId)}`;
    }
    return null;
  },
};
