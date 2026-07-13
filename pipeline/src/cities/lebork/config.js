// Lębork (województwo pomorskie, powiat lęborski) — Gmina Miasto Lębork
// (Burmistrz Miasta Lęborka). The Urząd Miejski sells municipal flats — and, in
// a separate stream, undeveloped land — at an open `przetarg ustny nieograniczony
// na sprzedaż`. Announcements AND "Informacja o wyniku …" results are both
// published on the city BIP as plain inline-HTML article pages (verified live
// 2026-07-13). See spikes/pomorskie/powiat-leborski/lebork.md.
//
// Shape (bip.um.lebork.pl — a bespoke slug-addressed BIP CMS; closest built
// analogs: Wąbrzeźno for the multi-lokal flat parser + content-routed
// announce/result split, Zgorzelec for the html-board → article → inline-text
// flow). Server-rendered HTML, no SPA, no auth; a browser User-Agent is used
// (the `.dhtml` board 301-redirects and municipal WAFs prefer it — harmless if
// unneeded). Everything hangs off ONE board, but it is a RECURSIVE "Lista
// artykułów" tree, not a flat list:
//   BOARD   /artykul/sprzedaz-i-dzierzawa-nieruchomosci-przetargi
//             → year sub-articles ("rok 2026" = /artykul/rok-2026-2027, …)
//   YEAR    → month sub-articles ("Lipiec 2026", …) AND some direct leaves
//   MONTH   → individual announcement / result leaf articles
//   LEAF    /artykul/<slug>  → the notice text inline in <article id="content">.
// Slugs are DECORATIVE and lie (the "rok 2025" node links to a child slugged
// "grudzien-2009"); crawl.js always follows the row href, never the slug, and
// classifies by the notice BODY.
//
// Announcements are frequently MULTI-LOKAL (a "1. … 2. … 3. …" list — one flat
// record each; a single notice can mix a lokal mieszkalny and a "lokal o innym
// niż mieszkalne przeznaczeniu" = commercial unit). Land ("nieruchomości
// gruntowe niezabudowane") is published in a tabular form and partitioned into
// land.json. Results are prose "Informacja … po/o wyniku … przetargu" notices
// (flats: achieved price + nabywca, or "wynikiem negatywnym"); grunt results are
// tabular.
//
// `source: 'html'` — the adapter fetches + strips every notice itself and hands
// each result ref a ready `.text` blob (built by parse.buildRecordText), so the
// refresh loop's OCR / pdf-text dispatch is bypassed (like Zgorzelec / Wąbrzeźno).

export const config = {
  id: 'lebork',
  teryt: '220801_1', // gmina miejska Lębork (woj. pomorskie 22, powiat lęborski 08,
  //                    gmina 01, type 1 miejska) — for geoportal parcel deep-links;
  //                    high confidence, confirm on the first geoportal run.
  label: 'Lębork',
  voivodeship: 'pomorskie',
  authority: 'Gmina Miasto Lębork',
  host: 'bip.um.lebork.pl',
  source: 'html',
};
