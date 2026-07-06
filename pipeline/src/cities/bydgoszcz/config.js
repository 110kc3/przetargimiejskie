// Bydgoszcz (Kujawsko-Pomorskie — miasto na prawach powiatu).
// Wydział Mienia i Geodezji (WMG) auctions municipal flats, land, and buildings
// on the city BIP: bip.um.bydgoszcz.pl, board artykuly/1208.
//
// CMS: Logonet 2.9.0 (same vendor as Tarnowskie Góry / Kędzierzyn-Koźle).
// Board URL: https://bip.um.bydgoszcz.pl/artykuly/1208/
// Pagination:  /artykuly/1208/{page}/{per_page}/ogloszenia-o-przetargach-na-zbycie-nieruchomosci
//
// Article attachment layout (groundtruthed live 2026-07-06):
//   Announcement article: PDF (scanned/image — pdftotext yields empty) + DOC (born-digital
//     OLE Word; catdoc extracts text cleanly) + optional rzut/floor-plan PDF.
//   Result article:  PDF + DOCX (15-20 kB, born-digital OOXML); achieved price is
//     inside the DOCX, NOT in the HTML body — this is the key structural wrinkle.
//   Word attachments are selected by the `class="files textWord"` span (the
//     extension label text is unreliable — seen empty on live result articles).
//
// `source: 'html'` — the adapter downloads and parses its own attachments (DOC via
// catdoc/doc-text.js; DOCX via unzip — both handled transparently by doc-text.js).
// crawlResultDocs() returns refs that carry `.text` so refresh.js skips the
// generic OCR/pdf-text dispatch for this city.
//
// NOTE (confirm on first geoportal run): TERYT for Bydgoszcz grodzki (miasto na
// prawach powiatu) is 046100_1.  The 4-digit powiat code for Bydgoszcz City County
// is 0461; gmina-type 1 = gmina miejska; full 7-digit TERYT = 0461000_1 or the
// standard form 046100_1.  Verify against https://eteryt.stat.gov.pl/ before
// the first geoportal deep-link run.

export const config = {
  id: 'bydgoszcz',
  teryt: '046100_1', // grodzki powiat Bydgoszcz — confirm on first geoportal run
  label: 'Bydgoszcz',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Urząd Miasta Bydgoszczy',
  host: 'bip.um.bydgoszcz.pl',
  source: 'html',
};
