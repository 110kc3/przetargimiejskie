// Brzesko (województwo małopolskie, powiat brzeski) —
// Gmina Brzesko (Urząd Miejski w Brzesku, Wydział Geodezji i Zarządzania Mieniem).
// Sells municipal property — including residential premises (lokale mieszkalne) and land (działki) —
// via public oral auctions ("publiczny nieograniczony przetarg ustny").
// See spikes/malopolskie/powiat-brzeski/brzesko.md — VERDICT: BUILD.
//
// PLATFORM:
//   WebImpuls CMS on www.brzesko.pl. Clean server-rendered HTML.
//   Announcement board:
//     https://www.brzesko.pl/blog/5,ogloszenia-nieruchomosci
//   Pagination:
//     https://www.brzesko.pl/blog/5,ogloszenia-nieruchomosci/strona/{page}
//   Notice detail:
//     https://www.brzesko.pl/wpis/{id},{slug}

export const config = {
  id: 'brzesko',
  teryt: '1202024', // Miasto Brzesko (1202024) / Gmina Brzesko (1202023)
  label: 'Brzesko',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Brzeska',
  host: 'www.brzesko.pl',
  source: 'html',
};
