// Chrzanów (województwo małopolskie, powiat chrzanowski) — the Gmina (Burmistrz
// Miasta, Wydział Gospodarki Nieruchomościami) auctions municipal land, flats and
// buildings, and publishes active "przetarg ustny nieograniczony na sprzedaż"
// announcements + a dedicated "Wyniki przetargów" (achieved-price) board. See
// SPIKE-NEIGHBORS.md.
//
// Shape: TWO surfaces. The city portal www.chrzanow.pl is server-rendered (the
// reliable index/enumeration layer): boards under /zbycie-nieruchomosci/ —
// .../ogloszenia-o-przetargach/nieruchomosci-niezabudowane (land),
// .../nieruchomosci-niezabudowane-i-lokale (buildings+flats), .../wyniki-przetargow
// (results) — each item linking a BIP article. The BIP itself
// (bip.malopolska.pl/umchrzanow) is a JS SPA whose article bodies + text PDFs are
// NOT fetchable by a plain getText. Land announcements are MULTI-PROPERTY TABLES
// (one row per działka: nr – ha – KW – cena – termin – wadium).
//
// NEEDS-LIVE-VERIFY (the spike's gate): the body-source path. The body parser is
// groundtruthed against the real announcement text; the CRAWLER must resolve each
// announcement's body via the BIP render (render.js / BIP article JSON) or its
// text-PDF attachment — confirm on the first run (the chrzanow.pl portal stubs +
// the otoprzetargi/przetargi-komunikaty mirrors carry the same full text).
//
// `source: 'html'`. Out of scope: dzierżawa/najem (separate branch); the powiat /
// Skarb Państwa streams.

export const config = {
  id: 'chrzanow',
  teryt: '120301_4', // gmina miejsko-wiejska Chrzanów (powiat chrzanowski) — confirm on first geoportal run
  label: 'Chrzanów',
  voivodeship: "malopolskie",
  authority: 'Urząd Miejski w Chrzanowie',
  host: 'chrzanow.pl',
  source: 'html',
  // This adapter resolves SPA BIP article bodies via core/render.js (headless
  // Chromium). The CI refresh matrix reads this flag to install Playwright ONLY
  // for cities that need it — set it on any future render.js-using adapter, or
  // its refresh job will fail on a missing browser.
  needsRender: true,
};
