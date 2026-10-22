// Szczytno (województwo warmińsko-mazurskie, powiat szczycieński, gmina miejska).
//
// The Burmistrz Miasta Szczytno (Wydział Gospodarki Przestrzennej i Ochrony Środowiska,
// znak sprawy: GPO.6840.*) auctions municipal flats, houses and land parcels via
// "ustny przetarg nieograniczony". See spikes/warminsko-mazurskie/powiat-szczycienski/szczytno.md
// — VERDICT: BUILD (Medium effort).
//
// The BIP is a vendor server-rendered CMS (Bootstrap + DataTables) at bip.um.szczytno.pl:
//   - Announcements:  /artykul/ogloszenia-o-przetargach
//   - Wykaz:          /artykul/wykaz-nieruchomosci-2
//   - Results:        /artykul/informacja-o-wynikach-przetargow
//
// Results are published as inline HTML notices on the dedicated results board.
// Announcements carry summary notice titles and full details in attached .doc/.pdf files.
//
// NOTE: The host 403s requests without a browser User-Agent header; requests must pass
// a browser-like User-Agent.

export const config = {
  id: 'szczytno',
  // TERYT 281701_1: gmina miejska Szczytno (powiat szczycieński 2817, woj. warmińsko-mazurskie 28).
  teryt: '281701_1',
  label: 'Szczytno',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Burmistrz Miasta Szczytno',
  host: 'bip.um.szczytno.pl',
  source: 'html',
};
