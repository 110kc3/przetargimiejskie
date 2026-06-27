// Białystok — municipal property sales run by Prezydent Białegostoku via
// Departament Spraw Komunalnych (DSK), published on the city BIP.
//
// CMS: SmartSite by BIT Sp. z o.o. (cms-sapp1.um.bialystok.pl).
// Source board: https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci
//
// 2 011 total entries across all categories (flats, plots, commercial, school
// buildings, kiosk stands, etc.). Flat sales run ~1–2 per month. Achieved
// price ("Cena nabycia") is present inline on the detail HTML page for
// Rozstrzygnięty auctions — no PDF or OCR needed.
//
// TERYT for Białystok (grodzki, miasto na prawach powiatu):
//   powiat code 2061, gmina urbana — value below is a best-estimate from
//   standard TERYT table; CONFIRM on first geoportal run.

export const config = {
  id: 'bialystok',
  teryt: '206101_1', // gmina TERYT — confirm on first geoportal run
  label: 'Białystok',
  voivodeship: 'podlaskie',
  authority: 'Urząd Miejski w Białymstoku',
  host: 'bip.bialystok.pl',
  source: 'html',
};
