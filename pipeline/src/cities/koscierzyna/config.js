// Kościerzyna (Pomorskie, powiat kościerski) — Gmina Miejska Kościerzyna.
//
// Authority: Burmistrz Miasta Kościerzyna (Gmina Miejska Kościerzyna).
// Regular oral auctions for municipal flats (I/II/III ustny przetarg nieograniczony
// na sprzedaż lokalu mieszkalnego).
//
// Host: bip.koscierzyna.gda.pl (INTERmedi@ CMS-BIP platform).
// Announcements and results: per-year categories under "Ogłoszenia o przetargach i aukcjach" (cid=206).
// e.g. 2026: cid=557, 2025: cid=501, 2024: cid=454, 2023: cid=437, 2022: cid=424, 2021: cid=360, 2020: cid=209, 2019: cid=208.
//
// Document layer:
//   Announcements: born-digital text PDFs (pdfText).
//   Results: attached to the same announcement article after the auction ("Wyniki przetargu" PDF),
//   some born-digital text PDFs, some scanned PDFs (ocrPdf fallback).
//
// See spikes/pomorskie/powiat-koscierski/koscierzyna.md.

export const config = {
  id: 'koscierzyna',
  // TERYT for Gmina Miejska Kościerzyna (TERC: 2206011, SIMC: 0934553).
  // Confirm on first geoportal run.
  teryt: '220601_1',
  label: 'Kościerzyna',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta Kościerzyna (Gmina Miejska Kościerzyna)',
  host: 'bip.koscierzyna.gda.pl',
  source: 'html',
};
