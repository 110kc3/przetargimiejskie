// Prudnik — Urząd Miejski w Prudniku (Burmistrz Prudnika) sells municipal flats
// via open oral auctions (przetarg ustny nieograniczony na sprzedaż lokali
// mieszkalnych) published on the city BIP at bip.prudnik.pl.
//
// Target board: /gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali
// CMS: Joomla server-rendered HTML BIP (template by sm32 STUDIO, LiteSpeed).
//
// Attachments: born-digital text-extractable PDFs (pdftotext).
// Each announcement page bundles:
//  - Ogłoszenie o przetargu PDF (announcement with starting price, area, date)
//  - Paired "Informacja o wynikach przetargów" PDF (achieved prices + winner / unsold)
//
// Source is 'html' because the crawler fetches and extracts PDF text directly.

export const config = {
  id: 'prudnik',
  // TERYT for gmina miejsko-wiejska Prudnik (powiat prudnicki 1610, gmina 04, type 4 = miasto w gminie miejsko-wiejskiej)
  // → 161004_4. Confirm on the first geoportal run against ULDK.
  teryt: '161004_4',
  label: 'Prudnik',
  voivodeship: 'opolskie',
  authority: 'Burmistrz Prudnika',
  host: 'bip.prudnik.pl',
  source: 'html',
};
