// Katowice — municipal property sales are run by the City Hall (Urząd Miasta),
// not KZGM, and published on the city BIP. See SPIKE-WAVE1.md.
//
// Announcements (active/upcoming auctions, with round) come from BIP document
// HTML; results (sold-price history) come from result-PDF attachments — text
// PDFs, hence `source: 'pdf-text'` (pdftotext, no OCR).

export const config = {
  id: 'katowice',
  teryt: '246901_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Katowice',
  voivodeship: "slaskie",
  authority: 'Urząd Miasta Katowice',
  host: 'bip.katowice.eu',
  source: 'pdf-text',
};
