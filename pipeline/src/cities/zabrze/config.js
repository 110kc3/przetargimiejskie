// Zabrze — municipal property sales are run by the City Hall and published on
// the city BIP (bip.miastozabrze.pl) under a dedicated, deep "Lokale
// mieszkalne" sale board. See SPIKE-WAVE2.md "Zabrze".
//
// Shape: a paginated, server-rendered list of auction *announcements*
// ("Ogłoszenie o I/II ustnych nieograniczonych przetargach … na dzień
// DD.MM.YYYY r."). Each announcement is a thin /doc/<id> page wrapping ONE
// attachment that holds the per-flat table (address / area / starting price).
// So the adapter crawls the list (round + auction date from each title) and
// extracts every announcement's attachment to get the flats.
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
