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
// (bip.malopolska.pl/umchrzanow) is a JS SPA with article bodies available through
// the anonymous /api/articles/{id} JSON endpoint. Land announcements are TABLES
// (one row per działka: nr – ha – KW – cena – termin – wadium).
//
// Live-verified 20 October 2026: the portal stub leads to BIP article 2950984;
// /api/articles/2950984 returns its complete HTML table without a browser. The
// crawler validates both article IDs and the umchrzanow link before parsing.
// One price can cover several parcels; preserve the combined lot and area.
// Result discovery and building/flat parsing remain outside this partial audit.
//
// `source: 'html'`. Out of scope: dzierżawa/najem (separate branch); the powiat /
// Skarb Państwa streams.

export const config = {
  id: 'chrzanow',
  teryt: '120303_4', // city area, official 2026 TERC identity in spikes/master-cities.json
  label: 'Chrzanów',
  voivodeship: "malopolskie",
  authority: 'Urząd Miejski w Chrzanowie',
  host: 'chrzanow.pl',
  source: 'html',
};
