// Człuchów — Pomorskie, powiat człuchowski (gmina miejska, ~13k pop.).
//
// Burmistrz Miasta Człuchowa (Urząd Miejski w Człuchowie, ul. Wojska Polskiego 1)
// sells municipal flats and land at open oral auctions (przetarg ustny nieograniczony).
//
// Publication is on the city BIP (bip.czluchow.pl):
//   Hub: /artykul/przetargi-nieruchomosci
//   Year subfolders: /artykul/2026-2029, /artykul/2025-2027, /artykul/2024-2
//   Article payloads: scanned/digital PDFs under /pliki/czluchow/zalaczniki/...
//   Fallback: pdfText with ocrPdf fallback for scanned copier PDFs.

export const config = {
  id: 'czluchow',
  teryt: '2203011',
  label: 'Człuchów',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta Człuchowa',
  host: 'bip.czluchow.pl',
  source: 'html',
};
