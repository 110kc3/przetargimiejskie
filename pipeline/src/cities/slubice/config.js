// Słubice (Lubuskie, powiat słubicki) — Gmina Słubice.
//
// Authority: Burmistrz Słubic (Gmina Słubice).
// Oral auctions for municipal flats (przetarg ustny nieograniczony
// na sprzedaż lokalu mieszkalnego).
//
// Host: bip.slubice.pl (Bespoke Next.js SSR BIP platform backed by bip-api / bip-docrepo-api).
// Announcements & Results board: category 193 "Sprzedaż mienia - przetargi"
// (https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi).
// Document layer: Attached scanned copier PDFs (Develop ineo+ 451i), OCR required via ocrPdf.
// See spikes/lubuskie/powiat-slubicki/slubice.md.

export const config = {
  id: 'slubice',
  // TERYT for Gmina Słubice (TERC: 0805054, SIMC: 0935736).
  // Confirm on first geoportal run.
  teryt: '080505_4',
  label: 'Słubice',
  voivodeship: 'lubuskie',
  authority: 'Burmistrz Słubic (Gmina Słubice)',
  host: 'bip.slubice.pl',
  source: 'html',
};
