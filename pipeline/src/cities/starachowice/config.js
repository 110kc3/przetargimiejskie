// Starachowice (województwo świętokrzyskie, powiat starachowicki)
// Urząd Miejski w Starachowicach (Referat Geodezji i Zarządzania Nieruchomościami)
// conducts and publishes municipal property auctions (lokale mieszkalne, lokale
// użytkowe, nieruchomości zabudowane and działki niezabudowane) directly on its
// city portal starachowice.eu.
//
// Primary board:
//   https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi
//
// Document attachments (Zarządzenia PM, Informacje o wyniku):
//   Hosted on bip.um.starachowice.pl (/bip/54_umstarachowice/fckeditor/file/...)
//   Direct born-digital PDF links extractable with pdfText().

export const config = {
  id: 'starachowice',
  teryt: '261101_1', // gmina miejska Starachowice (powiat starachowicki, TERC 2611011, SIMC 0947930) — confirm on first geoportal run
  label: 'Starachowice',
  voivodeship: 'swietokrzyskie',
  authority: 'Prezydent Miasta Starachowice',
  host: 'starachowice.eu',
  source: 'html',
};
