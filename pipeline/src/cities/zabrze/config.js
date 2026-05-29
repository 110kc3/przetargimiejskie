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
// extraction inside crawlActive (it knows the per-announcement URL), so the
// refresh loop's OCR/pdf-text dispatch is bypassed and crawlResultDocs() is [].
//
// NOTE (validate on first CI run): the attachment MIME could not be confirmed
// during the spike (host unreachable from the dev sandbox; file force-downloads
// in-browser). We assume a text PDF (pdftotext) — the most likely + the proven
// Katowice path. If CI shows a scanned PDF or a DOC/DOCX, switch the extractor
// in crawl.js (OCR / docx unzip) accordingly.

export const config = {
  id: 'zabrze',
  label: 'Zabrze',
  authority: 'Urząd Miejski w Zabrzu',
  host: 'bip.miastozabrze.pl',
  source: 'html',
};
