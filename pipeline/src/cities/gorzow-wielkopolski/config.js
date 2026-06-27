// Gorzów Wielkopolski — Lubuskie, miasto na prawach powiatu.
// Municipal flat sales are run exclusively by Wydział Gospodarki Nieruchomościami i Majątku
// and published on the city BIP (bip.um.gorzow.pl) in two boards:
//
//   Announcements: https://bip.um.gorzow.pl/przetargi/320/status/
//   Results:       https://bip.um.gorzow.pl/509/ (archive at /509/1/archiwum/…/)
//
// Both announcements and results are born-digital PDFs attached to HTML stub pages.
// ZGM (zgm.gorzow.pl) manages the rental pool but does NOT publish flat-sale przetargi.
//
// See spike: spikes/lubuskie/gorzow-wielkopolski/gorzow-wielkopolski.md

export const config = {
  id: 'gorzow-wielkopolski',
  // TERYT for powiat grodzki Gorzów Wielkopolski (miasto na prawach powiatu, woj. lubuskie).
  // GUS code for Gorzów Wlkp. grodzki is 0861 → gmina TERYT 086101.
  // Confirm on first geoportal run — ULDK was not reachable in-sandbox.
  teryt: '086101_1', // gmina TERYT for Gorzów Wlkp. grodzki — confirm on first geoportal run
  label: 'Gorzów Wielkopolski',
  voivodeship: 'lubuskie',
  authority: 'Urząd Miasta Gorzowa Wielkopolskiego',
  host: 'bip.um.gorzow.pl',
  source: 'html',
};
