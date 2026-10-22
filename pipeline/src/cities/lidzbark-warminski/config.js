// Lidzbark Warmiński (województwo warmińsko-mazurskie, powiat lidzbarski) —
// Gmina Miejska Lidzbark Warmiński (Burmistrz Lidzbarka Warmińskiego) auctions
// municipal property (flats: lokale mieszkalne, and land: nieruchomości gruntowe)
// via ustny przetarg nieograniczony on its BIP (bip.lidzbarkw.pl).
// Both active sale announcements and concluded result notices ("Informacja o
// wyniku przetargu" with achieved prices) are published on the SYSTEMDOBIP.PL /
// E-LINE board at /przetargi/10054/status/{0,1}/.
//
// Boards:
//   Announcements (ogłoszone):     https://bip.lidzbarkw.pl/przetargi/10054/status/0/
//   Resolved (rozstrzygnięte):     https://bip.lidzbarkw.pl/przetargi/10054/status/1/
//
// See spike: spikes/warminsko-mazurskie/powiat-lidzbarski/lidzbark-warminski.md

export const config = {
  id: 'lidzbark-warminski',
  // Gmina miejska Lidzbark Warmiński, powiat lidzbarski, woj. warmińsko-mazurskie (28).
  // TERYT 280901_1 (miasto). Confirm on first geoportal run.
  teryt: '280901_1',
  label: 'Lidzbark Warmiński',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Burmistrz Lidzbarka Warmińskiego',
  host: 'bip.lidzbarkw.pl',
  source: 'html',
};
