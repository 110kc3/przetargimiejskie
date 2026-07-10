// Pisz (województwo warmińsko-mazurskie, powiat piski) — Gmina Pisz (Burmistrz
// Pisza, via Urząd Miejski w Piszu) auctions municipal flats and land at
// `publiczny przetarg ustny nieograniczony/ograniczony na sprzedaż` and
// publishes announcements + inline achieved-price results on the city BIP.
// See spikes/warminsko-mazurskie/powiat-piski/pisz.md.
//
// Shape (hi.pl / PUBLIKATOR-style hosted BIP — first adapter of this family;
// closest built server-HTML analog: Zgorzelec for the html/inline-result flow):
// plain server-rendered HTML, no SPA, no auth, no OCR, no bot block (verified
// TLS chain OK — no insecureTLS needed). Everything lives under ONE query-string
// article scheme:
//   BOARD (current year, rolling):
//     https://bip.pisz.hi.pl/index.php?k=84            ("Ogłoszenia")
//   BOARD (prior-year archive, sidebar-discovered "Rok NNNN" links):
//     https://bip.pisz.hi.pl/index.php?k=1398           (e.g. "Rok 2025")
//   ARTICLE: https://bip.pisz.hi.pl/index.php?wiad={id}
//     → <h2 class="wiadomosc-tytul">, <div class="podtytul">, <div class="tresc">
//       (flowing HTML text — the notice body; no attachment/PDF observed).
//
// The board is dominated by lease/loan-for-use wykazy ("do wydzierżawienia" /
// "do oddania w użyczenie" — skipped) and a genuine-vs-bezprzetargowo split
// within the SALE wykaz stream itself: many "Wykaz nieruchomości przeznaczonych
// do sprzedaży (lokal ...)" notices are actually 95%-bonifikata sales TO THE
// SITTING TENANT ("na rzecz najemcy") or to a perpetual-usufruct holder ("na
// rzecz użytkownika wieczystego") — never a public auction — and the TITLE
// alone does not reliably say so (see parse.js isBezprzetargowo). Getting this
// right is the main challenge on this board; see parse.js header for the
// groundtruthed fixtures that pin the distinction.
//
// `source: 'html'` — the adapter fetches + parses the HTML itself and hands
// each result ref a ready `.text` blob (buildRecordText), bypassing the
// refresh loop's OCR/pdf-text dispatch — exactly like Zgorzelec/Chełmno.

export const config = {
  id: 'pisz',
  // TERYT derived 2026-07-10 from GUS gmina codes 2816033 (Pisz, whole
  // miejsko-wiejska gmina) / 2816035 (obszar wiejski) — woj 28, powiat piski
  // 16, gmina-seq 03 — mapped to this repo's <powiat><gmina-seq>_<type>
  // convention using the Nakło nad Notecią precedent (another miejsko-wiejska
  // seat, type _4 = miasto w gminie miejsko-wiejskiej). MEDIUM confidence
  // (cross-checked via web search, not eteryt.stat.gov.pl directly) — confirm
  // on the first geoportal parcel-deep-link run.
  teryt: '281603_4',
  label: 'Pisz',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Gmina Pisz',
  host: 'bip.pisz.hi.pl',
  source: 'html',
};
