// Opole (województwo opolskie, miasto na prawach powiatu) — the city (Prezydent
// Miasta Opola, Wydział Gospodarki Nieruchomościami) auctions municipal flats,
// commercial/zabytek buildings AND land, and publishes active "przetarg ustny
// nieograniczony na sprzedaż" announcements on its own BIP (bip.um.opole.pl).
// See SPIKE-NEIGHBORS.md.
//
// Shape: CMS is SISCO — the board LIST pages are JS-rendered (SPA shell to a
// plain fetcher), but every individual ARTICLE page is SERVER-RENDERED clean HTML
// (full prose body, no PDF/OCR; the announcement text is inline, attachments
// empty). URL scheme: /przetargi,9_<year>-<month>_<id>.
//
//   BOARD:   /przetargi,9   (year /przetargi,9_2026 → month /przetargi,9_2026-1)
//   ARTICLE: /przetargi,9_<year>-<month>_<id>  (server-rendered HTML)
//
// ANNOUNCEMENT-SIDE ONLY: no published "informacja o wyniku przetargu" with an
// achieved price was found on the web BIP (the spike found only the "Cena
// osiągnięta … może zostać obniżona o 30%" monument-discount BOILERPLATE, which
// must NOT be read as a result). So this adapter has no result stream
// (crawlResultDocs / parseResultDoc are stubs). MZLK runs rentals — out of scope.
//
// `source: 'html'`. NOTE (confirm on first CI refresh): the board list is
// SPA-rendered, so the ?id harvest walks the year→month index pages (or relies on
// the SISCO AJAX endpoint / id-probing) — this enumeration is INFERRED and must be
// confirmed on the first run; the article body parser is groundtruthed (news 390
// flat Rynek 3, 624 000 zł, 28.01.2026).

export const config = {
  id: 'opole',
  teryt: '166101_1', // miasto Opole
  label: 'Opole',
  voivodeship: "opolskie",
  authority: 'Urząd Miasta Opola (Wydział Gospodarki Nieruchomościami)',
  host: 'bip.um.opole.pl',
  source: 'html',
};
