// Nysa — Burmistrz Nysy auctions municipal flats (ustny przetarg nieograniczony
// na sprzedaż lokali mieszkalnych) directly via the city BIP at bip.nysa.pl.
// Result notices including achieved prices are published on the SAME BIP article
// as a separate PDF attachment. No SPA, no auth wall, no OCR needed.
// See spikes/opolskie/powiat-nyski/nysa.md for full live-verification notes.
//
// Pattern: Sputnik Software BIP (same engine as several other Polish BIPs).
//   LIST:    GET /?c=280  (active) and /?c=318 (archive)
//              → server-rendered HTML with <li><a href="?a={id}" class="blue">…
//   ARTICLE: GET /?a={id}
//              → HTML body with attachment table; PDF attachments via
//                ?p=document&action=show&id={docId}&bar_id={artId}
//   PDF:     born-digital text PDF (pdftotext -layout), no OCR.
//
// Each BIP article holds one flat. Attachments include:
//   - announcement PDF  (ogłoszenie …)
//   - optional .doc version to skip
//   - optional zip (photos) to skip
//   - result PDF  (Informacja o wyniku przetargu) — the achieved-price stream
//
// `source: 'html'` — the adapter does its own PDF fetch + text extraction, so
// the refresh loop's OCR/pdf-text dispatch is bypassed; crawlResultDocs()
// returns refs that already carry `.text`.

export const config = {
  id: 'nysa',
  // TERYT for gmina miejska Nysa (powiat nyski 1606, gmina 01, type 1 = miejska)
  // → 160601_1. Confirm on the first geoportal run against ULDK.
  teryt: '160601_1',
  label: 'Nysa',
  voivodeship: 'opolskie',
  authority: 'Urząd Miejski w Nysie',
  host: 'bip.nysa.pl',
  source: 'html',
};
