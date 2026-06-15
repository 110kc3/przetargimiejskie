// Gliwice — ZGM (Zakład Gospodarki Mieszkaniowej).
// Result documents are scanned-image PDFs, so they go through the OCR pipeline
// (source: 'pdf'). See ../../core/ocr-pdf.js.

export const config = {
  id: 'gliwice',
  teryt: '246601_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Gliwice',
  authority: 'ZGM',
  host: 'zgm-gliwice.pl',
  source: 'pdf',
};
