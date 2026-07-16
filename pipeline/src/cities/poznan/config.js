// Poznań (województwo wielkopolskie, miasto na prawach powiatu) — the city
// (Prezydent Miasta Poznania, Wydział Gospodarki Nieruchomościami / WGN)
// auctions municipal flats AND land via a bespoke server-rendered BIP CMS at
// bip.poznan.pl. Spike: spikes/wielkopolskie/poznan/poznan.md (VERDICT: BUILD,
// Medium effort). ZKZL (communal housing manager) does NOT run open auctions —
// it only handles bezprzetargowe tenant buyouts; out of scope.
//
// LIVE-VERIFIED 2026-07-16 (this build):
//   - Department news board (HTML + JSON API) lists current announcements;
//     each notice's board "teaser" HTML gives address/parcel/area/date/round
//     but NOT price — the starting price lives in a "pełna treść ogłoszenia"
//     PDF attachment linked from the notice's own detail page.
//   - A dedicated results category exists and is real/recurring: "Zbywanie
//     nieruchomości - wyniki przetargów" (category id 8800), confirmed via
//     ~15 historical Wayback Machine captures spanning 2020-2026 (most recent:
//     a "24.06.2026" result notice, captured by Wayback 2026-07-12). It was
//     EMPTY (0 items) at build time — items are purged from the live CMS
//     ~1-3 weeks after posting (old announcement/result URLs 404), and no PDF
//     attachment was ever archived by Wayback, so no real achieved-price
//     document was obtainable to groundtruth parseResultDoc's price/outcome
//     fields. crawlResultDocs() is wired to the real, confirmed category-8800
//     endpoint (same fetch+pdfText mechanism proven live for announcements) so
//     it picks up real result PDFs as they appear; parseResultDoc uses the
//     documented cross-city "cena ... została ustalona na kwotę ... zł" /
//     "wynikiem negatywnym" idiom (see krakow/parse.js) but is NOT yet
//     live-verified against a real Poznań result PDF — re-confirm on first
//     live catch.
//
// `source: 'html'` — crawl.js fetches PDFs directly via pdfText(); refs carry
// `.text` so refresh.js skips its own OCR/pdf-text dispatch.

export const config = {
  id: 'poznan',
  teryt: '306401_1', // miasto na prawach powiatu — confirm on first geoportal run
  label: 'Poznań',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miasta Poznania (Wydział Gospodarki Nieruchomościami)',
  host: 'bip.poznan.pl',
  source: 'html',
};
