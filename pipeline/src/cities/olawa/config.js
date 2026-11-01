// Oława — Dolnośląskie, powiat oławski (gmina miejska, ~33k pop.).
//
// Burmistrz Miasta Oława (Urząd Miejski w Oławie, Pl. Zamkowy 15) sells municipal
// flats and land at open oral auctions (przetarg ustny nieograniczony).
//
// Publication is on the MADKOM eBIP portal (bip.um.olawa.pl):
//   Board menu: /api/menu/258/articles (Zbywanie nieruchomości)
//   Articles: /api/articles/{id}
//   Attachments: /e,pobierz,get.html?id={id} (born-digital text PDFs, pdftotext)

export const config = {
  id: 'olawa',
  teryt: '0215011',
  label: 'Oława',
  voivodeship: 'dolnoslaskie',
  authority: 'Burmistrz Miasta Oława',
  host: 'bip.um.olawa.pl',
  source: 'html',
};
