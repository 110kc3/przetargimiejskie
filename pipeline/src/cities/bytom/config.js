// Bytom — municipal property sales are run by the City Hall (Urząd Miasta,
// Wydział Obrotu Nieruchomościami). See SPIKE-WAVE2.md.
//
// v2 sources (both server-rendered HTML — no OCR/PDF, so `source: 'html'` and
// the refresh loop never calls ocrPdf/pdfText):
//   - PRIMARY: the city BIP sales list www.bytom.pl/bip/zbycie-nieruchomosci-bytom
//     — paginated announcements with per-property page URLs (…/idn:N) and the
//     relisting round; the spine for links + round + coverage.
//   - ENRICH: the i-BIIP catalog (i-biip.um.bytom.pl) for starting price + area
//     + auction date, joined by address.
// crawlResultDocs() returns [] — Bytom publishes no achieved sale prices, so
// there is no sold-price history; every listing is `outcome: 'active'`.

export const config = {
  id: 'bytom',
  teryt: '246301_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Bytom',
  voivodeship: "slaskie",
  authority: 'Urząd Miasta Bytom',
  // v2: primary crawl is the city BIP sales list (www.bytom.pl/bip); the
  // i-BIIP catalog is a price/area enrichment. See crawl.js + SPIKE-WAVE2.md.
  host: 'www.bytom.pl',
  source: 'html',
};
