// Pułtusk (Mazowieckie, powiat pułtuski) — municipal flat + land sales run
// directly by Burmistrz Miasta Pułtusk, Wydział Gospodarki Gruntami i
// Architektury (Rynek 41, pokój nr 37, tel. 23 306 72 37). No ZGM/TBS layer
// for THIS stream (TBS Pułtusk Sp. z o.o. runs its own separate przetargi on
// tbs-pultusk.bip.org.pl — out of scope, see spike).
//
// Source: pultusk.pl — WordPress (Gutenberg blocks), server-rendered, no
// auth, no SPA. Read via the WP REST API (pultusk.pl/wp-json/wp/v2/posts),
// which returns clean JSON and — confirmed live 2026-07-10 — the LIST/search
// endpoint already embeds the full `content.rendered` (byte-identical to
// fetching the single-post endpoint), so no per-post detail fetch is needed
// at all: one search request per term is the whole crawl. See crawl.js.
//
// Notices sit in the general aktualności feed (no dedicated przetargi/
// nieruchomości category) mixing flat-sale, land-sale, wykaz (pre-auction
// designation, no date yet), lease/najem, and unrelated city news — filtered
// in parse.js by classifyKind + explicit lease/wykaz title guards.
//
// PDF mirrors (wp-content/uploads/.../UMPultusk__*.pdf or descriptively-named
// "ogloszenie-o-*-przetargu*.pdf") are attached to every priced notice. The
// spike assumed these were born-digital text PDFs — VERIFIED WRONG during
// build (2026-07-10): every mirror fetched (`pdftotext`/`pdffonts`) has ZERO
// embedded fonts/text layer, i.e. they are SCANNED (image-only) despite their
// clean auto-generated filenames. Since the inline HTML already carries every
// field (and is more reliable — a real Gutenberg `<table>`, not OCR), this
// adapter parses inline HTML exclusively and only keeps the PDF URL for
// provenance (`detail_pdf`) — no pdfText/ocrPdf call is wired in. Revisit
// with core/ocr-pdf.js if a future notice ever drops the inline HTML table.
//
// No achieved-price ("informacja o wyniku przetargu") stream: searched live
// 2026-07-10, 0 relevant hits (the 3 "wynik" hits found are unrelated city
// communications) — matches the spike's finding. crawlResultDocs() is a stub.

export const config = {
  id: 'pultusk',
  // TERYT gmina miejsko-wiejska Pułtusk (powiat pułtuski, mazowieckie).
  // Powiat pułtuski = 1424 (NOT 1421 as the naive alphabetical-sequence guess
  // would suggest) — cross-checked live 2026-07-10 against GUS BDL
  // (bdl.stat.gov.pl/bdl/dane/teryt/jednostka/2049), which lists "Pułtusk"
  // as unit code 1424043, rodzaj (3) = gmina miejsko-wiejska (whole unit).
  // Confidence: MEDIUM — verified via a live GUS BDL lookup during this
  // build (not from an offline TERYT dump); still confirm on first
  // geoportal run per the adapter guide.
  teryt: '142404_3',
  label: 'Pułtusk',
  voivodeship: 'mazowieckie',
  authority: 'Burmistrz Miasta Pułtusk, Wydział Gospodarki Gruntami i Architektury',
  host: 'pultusk.pl',
  source: 'html',
};
