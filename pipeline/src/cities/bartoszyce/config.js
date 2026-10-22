// Bartoszyce — Warmińsko-Mazurskie, gmina miejska, powiat bartoszycki.
// Municipal property sales (flats + land) run through Burmistrz Miasta Bartoszyce
// and are published on the city BIP (bip.bartoszyce.pl), running the
// SYSTEMDOBIP.PL / E-LINE SYSTEMY INTERNETOWE platform (similar engine to sulecin,
// wschowa, gorzow-wielkopolski, etc.).
//
// Primary auction board: https://bip.bartoszyce.pl/160/Ogloszenia_o_przetargach/
// Archive board:        https://bip.bartoszyce.pl/160/1/archiwum/Ogloszenia_o_przetargach/
// Wykaz board:          https://bip.bartoszyce.pl/158/Zbycie_w_trybie_przetargu/
//
// Both active auction announcements and concluded result documents
// ("informacja o wyniku przetargu") are published as entry articles on board 160
// with PDF attachments.
//
// See spike: spikes/warminsko-mazurskie/powiat-bartoszycki/bartoszyce.md

export const config = {
  id: 'bartoszyce',
  // Gmina miejska Bartoszyce, powiat bartoszycki, woj. warmińsko-mazurskie (28).
  // TERYT 280101_1 (miasto). Confirm on first geoportal run.
  teryt: '280101_1',
  label: 'Bartoszyce',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Burmistrz Miasta Bartoszyce',
  host: 'bip.bartoszyce.pl',
  source: 'html',
};
