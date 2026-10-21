// Ożarów Mazowiecki (Mazowieckie, powiat warszawski zachodni) — Urząd Miasta
// i Gminy Ożarów Mazowiecki (Burmistrz Ożarowa Mazowieckiego).
// Sells municipal property, including post-SHR Płochocin worker flats
// (przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych) and land.
// See spikes/mazowieckie/powiat-warszawski-zachodni/ozarow-mazowiecki.md.
//
// Sources:
// - Serwis Gminy (WordPress): https://ozarow-mazowiecki.pl/nieruchomosci-przeznaczone-do-zbycia/
//   Category archive: https://ozarow-mazowiecki.pl/category/nieruchomosci-przeznaczone-do-zbycia/
//   Posts at https://ozarow-mazowiecki.pl/YYYY/MM/DD/<slug>/
//   Attachments: born-digital PDFs ("Zarządzenie...", "Załącznik nr 1 - Ogłoszenie o przetargu...")
//   Core numeric fields (starting price, wadium deadline, auction date) live in
//   the attached born-digital PDF and are extracted via pdfText (pdftotext).
//
// Offer-side only: no achieved-price result stream confirmed on WordPress or BIP.
// crawlResultDocs() returns [] and parseResultDoc is a stub.

export const config = {
  id: 'ozarow-mazowiecki',
  teryt: '1432064', // gmina miejsko-wiejska Ożarów Mazowiecki — confirm on first geoportal run
  label: 'Ożarów Mazowiecki',
  voivodeship: 'mazowieckie',
  authority: 'Burmistrz Ożarowa Mazowieckiego (Gmina Ożarów Mazowiecki)',
  host: 'ozarow-mazowiecki.pl',
  source: 'html',
};
