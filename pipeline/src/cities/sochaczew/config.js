// Sochaczew — Mazowieckie, powiat sochaczewski (gmina miejska, ~35k pop.).
//
// Burmistrz Miasta Sochaczewa (Urząd Miejski w Sochaczewie, ul. 1 Maja 16)
// sells municipal flats and land at open oral auctions (przetarg ustny nieograniczony).
//
// Publication is on the 2ClickPortal BIP (bip.sochaczew.pl):
//   Feed: /aktualnosci/
//   Article attachments: PDFs under /files/image/Mienie/... (pdfText + ocrPdf fallback).

export const config = {
  id: 'sochaczew',
  teryt: '1428011',
  label: 'Sochaczew',
  voivodeship: 'mazowieckie',
  authority: 'Burmistrz Miasta Sochaczewa',
  host: 'bip.sochaczew.pl',
  source: 'html',
};
