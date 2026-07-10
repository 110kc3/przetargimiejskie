// Lubliniec (województwo śląskie, powiat lubliniecki) — Gmina Lubliniec (Urząd
// Miejski w Lublińcu, Wydział Nieruchomości i Zagospodarowania Przestrzennego —
// no separate ZGM/ZBM; the UM runs sales directly) auctions municipal flats,
// commercial units, garages and land at `przetarg ustny (licytacja)
// nieograniczony` and publishes announcements + achieved-price results on the
// city BIP. See spikes/slaskie/powiat-lubliniecki/lubliniec.md.
//
// Shape (bip.info.pl hosted CMS — SAME family + platform as Zgorzelec, the
// adapter this one was cloned from; Lubliniec, unlike Złotoryja, has NOT
// migrated off bip.info.pl — live-verified 2026-07-10): server-rendered HTML,
// no SPA, no OCR, no auth, no bot block. Two dedicated boards:
//   ANNOUNCEMENTS ("Ogłoszenia o przetargach"): https://lubliniec.bip.info.pl/index.php?idmp=93&r=r
//                    → table of "<ROMAN> przetarg ustny (licytacja) nieograniczony
//                      … na sprzedaż …" docs
//   RESULTS ("Wyniki przetargów"):              https://lubliniec.bip.info.pl/index.php?idmp=94&r=r
//                    → table of "Informacja pozytywna/negatywna … / INFORMACJA
//                      dotycząca wyniku …" docs
//   DOCUMENT:        https://lubliniec.bip.info.pl/dokument.php?iddok={id}&idmp={NN}&r=r
//                    (302-redirects to the comma-path canonical: dokument,iddok,{id},idmp,{NN},r,r —
//                     `getText`'s redirect:'follow' handles this transparently)
//     → the notice body lives in <div id="content-main"> as flowing HTML text.
//
// Volume: land-heavy (nieruchomości gruntowe dominate) with a modest-but-
// recurring flat/commercial sub-stream (a handful of distinct units/year,
// several cycling through II/III/IV rounds — e.g. Mickiewicza 9/6, Paderewskiego
// 12/16, Oświęcimska 19/12). Land (kind 'grunt') is partitioned into land.json;
// see crawl.js's header for the board's live-verified archive depth (2008-
// present) and the crawl bound this adapter applies.
//
// `source: 'html'` — the adapter fetches + parses the HTML itself and hands each
// result ref a ready `.text` blob (built by parse.buildRecordText), so the
// refresh loop's OCR / pdf-text dispatch is bypassed (matches Zgorzelec/Chełmno).

export const config = {
  id: 'lubliniec',
  teryt: '240901_1', // gmina miejska Lubliniec (powiat lubliniecki 2409, gmina-
  //                    type 1) — for geoportal parcel deep-links; confirm on the
  //                    first geoportal run.
  label: 'Lubliniec',
  voivodeship: 'slaskie',
  authority: 'Gmina Lubliniec',
  host: 'lubliniec.bip.info.pl',
  source: 'html',
};
