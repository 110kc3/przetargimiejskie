// Nidzica — Warmińsko-Mazurskie, gmina miejsko-wiejska, powiat nidzicki.
// Municipal property sales (flats + land) run through Burmistrz Nidzicy (symbol GMKR —
// Gospodarka Mieniem Komunalnym i Rolnictwo) and are published on the town BIP
// bip.nidzica.pl, running the SystemDoBIP CMS (E-LINE Systemy Internetowe).
//
// Surfaces:
//   - Structured tender module: https://bip.nidzica.pl/przetargi/257/status/
//       * Ogłoszone (current/active):     .../przetargi/257/status/0/
//       * Rozstrzygnięte (concluded):     .../przetargi/257/status/1/
//       * Unieważnione (void/cancelled):  .../przetargi/257/status/2/
//   - Dated article board:      https://bip.nidzica.pl/258/Ogloszenia_o_przetargach/
//       * Archive:              https://bip.nidzica.pl/258/1/archiwum/Ogloszenia_o_przetargach/
//   - Wykaz / notices board:    https://bip.nidzica.pl/259/Informacje_i_komunikaty/
//
// See spike: spikes/warminsko-mazurskie/powiat-nidzicki/nidzica.md

export const config = {
  id: 'nidzica',
  // Gmina miejsko-wiejska Nidzica, powiat nidzicki, woj. warmińsko-mazurskie (28).
  // TERYT 281104_4 (miasto) / 281104_3 (obszar wiejski) - 281104_4. Confirm on first geoportal run.
  teryt: '281104_4',
  label: 'Nidzica',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Burmistrz Nidzicy',
  host: 'bip.nidzica.pl',
  source: 'html',
};
