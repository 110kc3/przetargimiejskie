// Olkusz (województwo małopolskie, powiat olkuski) — the Gmina (Burmistrz Miasta
// i Gminy, Wydział Geodezji i Gospodarki Mieniem) auctions municipal land, flats
// and share-in-building/townhouse, and publishes active "przetarg ustny
// nieograniczony na sprzedaż" announcements on its own WordPress site. See
// SPIKE-NEIGHBORS.md.
//
// Shape (closest analog: the FINN-BIP HTML cities, but on plain WordPress): each
// announcement is a dated post at /index.php/YYYY/MM/DD/<slug>/ whose body is the
// full inline HTML legal text (no PDF, no OCR). The post TITLE is just the date
// ("7 lutego 2025"), so the asset/sale gate + kind are read from the BODY ("…
// ogłasza V przetarg ustny … na sprzedaż nieruchomości niezabudowanej …").
//
//   ARCHIVE: /index.php/author/adminolkusz/page/N/ (+ /author/beata-sobon/) —
//            paginated list of post links.
//   POST:    /index.php/YYYY/MM/DD/<slug>/
//
// OFFER-SIDE ONLY: announcements carry cena wywoławcza per round; a published
// "informacja o wyniku przetargu" with the achieved price was NOT found for gmina
// Olkusz sales in the spike, so this adapter has no result stream (crawlResultDocs
// / parseResultDoc are stubs). Revisit if the BIP (bip.malopolska.pl/umigolkusz)
// is confirmed to publish achieved prices.
//
// `source: 'html'`. Out of scope: dzierżawa/najem wykazy (title-filtered);
// platformazakupowa.pl/pn/olkusz is procurement; the bip.malopolska.pl mirror is
// a JS SPA (redundant).
//
// NOTE (confirm on first CI refresh): the WordPress author-archive harvest +
// pagination were inferred from the live post URLs; the body parser is
// groundtruthed against a real post (dz. 638/25, V przetarg, 627 400 zł).

export const config = {
  id: 'olkusz',
  teryt: '121006_4', // gmina miejsko-wiejska Olkusz (powiat olkuski) — confirm on first geoportal run
  label: 'Olkusz',
  authority: 'Urząd Miasta i Gminy w Olkuszu',
  host: 'umig.olkusz.pl',
  source: 'html',
};
