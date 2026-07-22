// Golub-Dobrzyń (województwo kujawsko-pomorskie, powiat golubsko-dobrzyński) —
// DUAL-PUBLISHER municipal property auctions, both on the bip.net v7.32
// (extranet.pl) CMS — plain server-rendered HTML, no SPA, no auth, no bot block.
//
//   1. POWIAT (Starostwo Powiatowe w Golubiu-Dobrzyniu) — bip.golub-dobrzyn.com.pl
//      The Zarząd Powiatu sells powiat lokale mieszkalne (e.g. ul. PTTK 5) and
//      niezabudowane działki at `ustny przetarg nieograniczony`. Announcements
//      AND "Informacja o wyniku przetargu" results are INLINE HTML on the general
//      board 824 (Informacje i ogłoszenia). Achieved price + buyer are inline,
//      machine-readable (verified 2026-07: PTTK 5 lokal nr 3 → 81 810 zł, buyer
//      Andrzej Jankowski, 3rd round 2026-04-30). This is the PRIMARY, verified
//      feed. See spikes/kujawsko-pomorskie/powiat-golubsko-dobrzynski/golub-dobrzyn.md.
//
//   2. MIASTO (Gmina Miasto Golub-Dobrzyń / Burmistrz) — bip.golub-dobrzyn.pl
//      Sells land + flats at `przetarg ustny`; notices are born-digital PDF
//      attachments (`plik,<id>,…pdf`) on the "Sprzedaż nieruchomości" board (760)
//      + "Ogłoszenia Burmistrza" year boards. Wired best-effort (pdfText, OCR
//      fallback) — verified live: działka nr 375 obręb VIII sold 55 570 zł.
//
// Both BIPs are the SAME CMS as rawa-mazowiecka (bip.net 7.32) — the content
// sits in `id="PageContent"` after a large nav block; documents are reached via
// `redir,<id>` (302 → `<id>,<slug>`). crawl.js splits announcement vs result by
// document CONTENT (isResultDoc), never by URL/slug. Every parser reads a
// TITLE+BODY text blob (buildRecordText), so the same parsers serve inline HTML
// (powiat) and extracted PDF text (miasto). See parse.js.
//
// `source: 'html'` — crawl.js extracts every notice's text itself (inline HTML,
// or born-digital PDF via pdfText) and hands each result ref a ready `.text`
// blob, so refresh.js's OCR / pdf-text dispatch is bypassed.

export const config = {
  id: 'golub-dobrzyn',
  // Gmina miejska Golub-Dobrzyń: woj. kujawsko-pomorskie 04, powiat golubsko-
  // dobrzyński 05, gmina 01, type 1 (miejska) → '040501_1'. Best-effort; the
  // POWIAT feed also sells property elsewhere in the powiat (e.g. Kowalewo
  // Pomorskie), so a parcel deep-link may need that lot's own gmina code —
  // confirm on the first geoportal run before trusting this.
  teryt: '040501_1',
  label: 'Golub-Dobrzyń',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Starostwo Powiatowe w Golubiu-Dobrzyniu / Gmina Miasto Golub-Dobrzyń',
  host: 'bip.golub-dobrzyn.com.pl',
  source: 'html',
};
