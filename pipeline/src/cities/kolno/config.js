// Kolno — municipal property auction adapter.
// Host: bip-umkolno.podlaskie.eu (SmartSite by BIT Sp. z o.o. / Podlaskie regional platform).
//
// Boards:
//   Announcement board: https://bip-umkolno.podlaskie.eu/616c955210c658b/ ("Przetargi i zamówienia publiczne")
//   Property designation board: https://bip-umkolno.podlaskie.eu/4634573d2ce9367/ ("Obrót nieruchomości i dzierżawy")
//
// Document layer:
//   Server-rendered HTML with attached Word (.docx / .doc via core/doc-text.js)
//   and PDF documents (born-digital via core/pdf-text.js, scanned with core/ocr-pdf.js fallback).
//
// Spike: spikes/podlaskie/powiat-kolnenski/kolno.md (BUILD verdict)

export const config = {
  id: 'kolno',
  // TERYT for Kolno gmina miejska (powiat kolneński, woj. podlaskie).
  // Confirm against ULDK/GUS on first geoportal run.
  teryt: '200601_1',
  label: 'Kolno',
  voivodeship: 'podlaskie',
  authority: 'Burmistrz Miasta Kolno',
  host: 'bip-umkolno.podlaskie.eu',
  source: 'html',
};
