// Słupsk — municipal property sales published on the city BIP at bip.um.slupsk.pl.
//
// The auction board is server-rendered HTML, paginated at
// /przetargi/nieruchomosci/?pix=N (0-indexed, 20 items/page, 56+ pages as of 2026-06-27).
// Each listing item is a <div class="mx-list-item"> with an <a href> to the notice page
// and a <div class="mx-lead"> carrying the auction type, date and status.
//
// Notice pages (/przetargi/<id>.html) are fully server-rendered HTML — all fields
// (address, area, cena wywoławcza, wadium, postąpienie, auction date, KW) are inline.
// Attachments on notice pages are JPG floor-plans (not the notice itself).
//
// Result notices ("wynik przetargu") are small born-digital PDFs (~30–80 KB) linked
// from the archive page at /nieruchomosci/dokumenty/846.html. The archive currently
// holds the most-recently-added PDFs; new entries accumulate over time.
//
// source:'html' — crawl.js fetches detail pages directly; the refresh loop's
// OCR/pdf-text dispatch is bypassed. crawlResultDocs() returns PDF refs with .pdf_url
// pointing to /file/<id>; the refresh loop calls parseResultDoc on the extracted text.
//
// NOTE: TERYT for Słupsk grodzki is 22-63-01-1 per the BIP footer. The TERYT code
// used below (226301_1) follows the standard 7-digit format used across this pipeline
// — confirm on first geoportal run.

export const config = {
  id: 'slupsk',
  teryt: '226301_1', // gmina TERYT — confirm on first geoportal run (see note above)
  label: 'Słupsk',
  voivodeship: 'pomorskie',
  authority: 'Urząd Miejski w Słupsku',
  host: 'bip.um.slupsk.pl',
  source: 'html',
};
