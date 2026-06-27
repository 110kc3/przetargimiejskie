// Gdańsk (województwo pomorskie, miasto na prawach powiatu) — Wydział Skarbu
// Urzędu Miejskiego (Referat Obrotu Nieruchomościami) auctions municipal flats
// as open oral auctions (*przetarg ustny nieograniczony na sprzedaż lokali
// mieszkalnych*) and publishes batch announcements on bip.gdansk.pl.
//
// Architecture (confirmed live 2026-06-27):
//   ANNOUNCEMENT INDEX:  bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439
//     → server-rendered HTML, one `<a>` link per auction batch (slug pattern:
//       /urzad-miejski/OGLOSZENIE-...,a,<numeric-id>)
//   ANNOUNCEMENT DETAIL: each linked article is server-rendered HTML with one
//     PDF attachment on the cloudgdansk.pl CDN:
//       https://download.cloudgdansk.pl/gdansk-pl/d/<id>/<filename>.pdf
//     The PDF is born-digital and bundles all properties in that auction batch.
//   RESULT NOTICES: by law (Art. 38 ust. 4 ugn) must appear on the BIP within
//     30 days, but the exact BIP section/URL is unconfirmed as of the spike
//     (not found on the "Inne",a,1587 page nor via web search). The result URL
//     pattern is marked as the one open gap — validate on first CI run.
//     Strategy: crawlResultDocs() returns [] until the result-notice section is
//     found and confirmed; the achieved-price stream will be wired up then.
//
// `source: 'html'` — the adapter fetches the PDF itself (born-digital, text
// content available from pdfText) so refresh.js OCR dispatch is bypassed.
//
// TERYT: Gdańsk grodzki (TERYT code 226101_1 — confirm against geoportal ULDK
// on first run; the BIP footer says Kod Gminy 2261011 which maps to 226101_1).

export const config = {
  id: 'gdansk',
  teryt: '226101_1', // NOTE: confirm on first geoportal run (BIP Kod Gminy: 2261011)
  label: 'Gdańsk',
  voivodeship: 'pomorskie',
  authority: 'Urząd Miejski w Gdańsku (Wydział Skarbu)',
  host: 'bip.gdansk.pl',
  source: 'html',
};
