// Chojnice (województwo pomorskie, powiat chojnicki) — Gmina Miejska Chojnice
// conducts and publishes municipal property auctions (lokale mieszkalne, lokale
// użytkowe, nieruchomości zabudowane and działki niezabudowane) on its city hall
// WordPress portal miastochojnice.pl.
//
// Channels:
//   Announcements: https://miastochojnice.pl/kat/przetargi-na-nieruchomosci-miejskie/
//   Results:       https://miastochojnice.pl/kat/przetargi-na-nieruchomosci-miejskie-wyniki/
//
// Format:
//   WordPress posts with attached born-digital text PDFs (and occasional .docx)
//   containing the full auction notice / result protocol with address, area,
//   cena wywoławcza, wadium, termin, and achieved price (cena osiągnięta).

export const config = {
  id: 'chojnice',
  teryt: '220201_1', // gmina miejska Chojnice (powiat chojnicki, TERC 2202011, SIMC 0928854) — confirm on first geoportal run
  label: 'Chojnice',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta Chojnice (Gmina Miejska Chojnice)',
  host: 'miastochojnice.pl',
  source: 'html',
};
