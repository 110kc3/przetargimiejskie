// Węgrów (województwo mazowieckie, powiat węgrowski) — Gmina Miejska Węgrów
// (Burmistrz Miasta Węgrowa) auctions municipal flats, built property (houses)
// and land at przetarg ustny (nieograniczony i ograniczony), and separately
// disposes of flats to sitting tenants bezprzetargowo (out of scope). See
// spikes/mazowieckie/powiat-wegrowski/wegrow.md.
//
// CMS: Logonet eUrząd 2.9.0 (same vendor as tarnowskie-gory / naklo-nad-notecia
// / chelmno), but a DIFFERENT live shape from both named analogs:
//   - tarnowskie-gory's `/api/menu/<id>/articles` JSON endpoint 404s here.
//   - naklo/chelmno's dedicated `/przetargi-nieruchomosci/xml/...` structured
//     real-estate-tender module returns HTTP 200 but `<ilosc-rekordow>0</...>`
//     — Węgrów's Logonet install does not use that submodule at all.
//   - The property board ("Ogłoszenia sprzedaży", category 345) is a GENERIC
//     Logonet article board instead, with its own board-level XML feed at
//     `/artykuly/xml/345/<page>/1` (found via the board HTML's own `<a
//     class="xml">` link — not documented in the spike). There is NO per-record
//     XML for a generic article (unlike the dedicated module) — every article's
//     real content lives in a PDF attachment, fetched via the article's HTML
//     detail page. See crawl.js for the full shape + a real bug found live
//     (the spike's "inline HTML text, no PDF gate" claim is WRONG for this
//     board — every substantive article's body is PDF-only).
//
// `source: 'html'` — crawl.js does its own attachment discovery + text
// extraction (pdfText, falling back to ocrPdf — every ogłoszenie/wynik PDF
// sampled live is a 300dpi scan, no embedded text layer), so the refresh
// loop's OCR/pdf-text dispatch is bypassed; crawlResultDocs() returns refs
// that already carry `.text`.

export const config = {
  id: 'wegrow',
  // "Kod teryt: 1433011" is stated VERBATIM in the BIP's own footer contact
  // block (source-declared, not inferred) -> woj 14 (mazowieckie), powiat 33
  // (węgrowski), gmina 01, gmina-type 1 (miejska). HIGH confidence given the
  // direct source attribution, but still unverified against eteryt.stat.gov.pl
  // — confirm on the first geoportal run before trusting it for a parcel
  // deep-link.
  teryt: '143301_1',
  label: 'Węgrów',
  voivodeship: 'mazowieckie',
  authority: 'Urząd Miejski w Węgrowie',
  host: 'bip.wegrow.com.pl',
  source: 'html',
};
