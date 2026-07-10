// Zgorzelec (województwo dolnośląskie, powiat zgorzelecki) — Gmina Miejska
// Zgorzelec (Burmistrz Miasta Zgorzelec, Wydział Gospodarki Nieruchomościami /
// WGN) auctions municipal flats, commercial units and land at `ustny przetarg
// nieograniczony` and publishes announcements + achieved-price results on the
// city BIP. See spikes/dolnoslaskie/powiat-zgorzelecki/zgorzelec.md.
//
// Shape (bip.info.pl hosted CMS — first adapter of this family; closest built
// server-HTML analogs: Chełmno for the html/inline-result flow, Legnica for the
// board-walk): server-rendered HTML, no SPA, no OCR, no auth, no bot block. Two
// dedicated boards under "Przetargi" (idmp=21):
//   ANNOUNCEMENTS: https://zgorzelec.bip.info.pl/index.php?idmp=32&r=r
//                    → table of "Ogłoszenie o … przetargu … na sprzedaż …" docs
//   RESULTS:       https://zgorzelec.bip.info.pl/index.php?idmp=34&r=r
//                    → table of "Informacja o wyniku przetargu …" docs
//   DOCUMENT:      https://zgorzelec.bip.info.pl/dokument.php?iddok={id}&idmp={NN}&r=r
//                    (comma-path variant: dokument,iddok,{id},idmp,{NN},r,r)
//     → the notice body lives in <div id="content-main"> as flowing HTML text.
//
// Volume: low-to-modest, mixed flats + commercial units + land; a handful of
// property auctions per year. Land (kind 'grunt') is partitioned into land.json.
//
// `source: 'html'` — the adapter fetches + parses the HTML itself and hands each
// result ref a ready `.text` blob (built by parse.buildRecordText), so the
// refresh loop's OCR / pdf-text dispatch is bypassed (exactly like Chełmno).

export const config = {
  id: 'zgorzelec',
  teryt: '022101_1', // gmina miejska Zgorzelec (powiat zgorzelecki 0221, gmina-
  //                    type 1) — for geoportal parcel deep-links; confirm on the
  //                    first geoportal run.
  label: 'Zgorzelec',
  voivodeship: 'dolnoslaskie',
  authority: 'Gmina Miejska Zgorzelec',
  host: 'zgorzelec.bip.info.pl',
  source: 'html',
};
