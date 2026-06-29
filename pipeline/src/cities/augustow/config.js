// Augustów — municipal flat auctions run by Burmistrz Miasta Augustowa.
// Published on bip.um.augustow.pl (SmartSite/BIT CMS, same family as Kielce).
//
// Board URLs:
//   Active:  https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-aktualne/
//   Archive: https://bip.um.augustow.pl/przetargi/sprzedaz-dzierzawa-i-najem-nieruchomosci/ogloszenia-nieaktualne/
// Pagination: page 1 = bare board URL; page N = …/ogloszenia-aktualne.html?page=N
// Format: server-rendered HTML, no JS wall, no auth.
// Results: "Informacja o wynikach…" entries on same board; achieved price in PDF attachment.
// Mixed board: flats co-exist with land, commercial, lease entries — filter by title keyword.
//
// TERYT: provisional — confirm on first geoportal run.
// Spike: spikes/podlaskie/powiat-augustowski/augustow.md (BUILD verdict, 2026-06-29)

export const config = {
  id: 'augustow',
  // TERYT for Augustów gmina miejska (powiat augustowski, woj. podlaskie).
  // Provisional — confirm against ULDK/GUS on first geoportal run.
  teryt: '200101_1',
  label: 'Augustów',
  voivodeship: 'podlaskie',
  authority: 'Urząd Miejski w Augustowie',
  host: 'bip.um.augustow.pl',
  source: 'html',
};
