// Bytom — municipal property sales are run by the City Hall (Urząd Miasta,
// Wydział Obrotu Nieruchomościami) and published as a single, clean catalog on
// the city's spatial-information portal i-BIIP. See SPIKE-WAVE2.md.
//
// Unlike Gliwice (scanned result PDFs → OCR) and Katowice (text result PDFs →
// pdftotext), Bytom's catalog is *server-rendered HTML* that already carries
// every field we need per auction — address, type, round, date, starting
// price, area — so there is no OCR/PDF step at all. `source: 'html'` means the
// refresh loop never calls ocrPdf/pdfText; crawlResultDocs() returns [] (Bytom
// has no machine-readable sold-price results stream yet — see the adapter
// header in crawl.js for the follow-up).

export const config = {
  id: 'bytom',
  label: 'Bytom',
  authority: 'Urząd Miasta Bytom',
  host: 'i-biip.um.bytom.pl',
  source: 'html',
};
