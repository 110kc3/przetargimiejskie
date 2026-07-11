// Kwidzyn — gmina miejska, województwo pomorskie, powiat kwidzyński.
//
// Burmistrz Miasta Kwidzyna sells municipal property — mostly LAND (działki) and
// residential FLATS (lokale mieszkalne) — via "ustny przetarg [nie]ograniczony
// na sprzedaż". The machine-readable surface is the BIP `bip.kwidzyn.pl`, a
// Madkom "nowoczesny BIP" React SPA served on an nv.pl domain. The board that
// matters is `Gospodarka Nieruchomościami` (menu id 13536) with a child menu per
// year (2026=16626, 2025=16265, 2024=15878, …); each notice is an ARTICLE whose
// real content is one or more attached PDFs. Announcements ("Ogłoszenie …
// przetarg … na sprzedaż …") and their results ("Informacja o wyniku przetargu")
// commonly live on the SAME article (the result is added as a second attachment
// once the auction concludes). The adapter extracts these attachments itself,
// hence `source: 'html'` (NOT the OCR-dispatch 'pdf' path).
//
// SOURCE IS A SPA — but we do NOT render it. The React app is backed by a clean
// JSON API (`https://bip.kwidzyn.pl/api/…`): `/api/menu/{id}` (menu tree with the
// requested branch's children populated), `/api/menu/{id}/articles` (a menu's
// article list), `/api/articles/{id}` (one article + its attachments[]), and
// attachment bytes at `/e,pobierz,get.html?id={attId}`. crawl.js drives that API
// directly, so `needsRender` stays FALSE (no Playwright, no core/render.js) even
// though the raw HTML body is empty without JS — see crawl.js.
//
// PDFs ARE SCANNED (verified live 2026-07-11): the Burmistrz's notices are signed
// paper scans (pdffonts empty; image-only CCITT/JPEG). core/pdf-text.js `pdfText`
// returns 1–2 bytes of \f junk, so crawl.js OCRs them with core/ocr-pdf.js
// `ocrPdf` (tesseract -l pol). Result: born-digital text would be handled for
// free if it ever appears (see crawl.js extractNoticeText), but the confirmed
// path is OCR. OCR is the wall-clock bottleneck → the crawl is bounded hard
// (YEARS_BACK + per-run OCR cap); the committed ocr-cache means CI re-runs are
// free and the backlog backfills incrementally.
//
// ANALOG. The CMS is the eUrząd/Logonet JSON-API family (ADAPTER-GUIDE "Logonet
// eUrząd" row) — the SAME `/api/menu/{id}/articles` + `/api/articles/{id}` +
// `/e,pobierz,get.html?id=` API already handled by `tarnowskie-gory`,
// `sosnowiec`, `wegrow` and `kedzierzyn-kozle` (a plain `grep nv.pl` misses them
// because each runs on its own city domain, not an nv.pl one). crawl.js mirrors
// that family's idioms (aliasFields[title] + columnFields[date] from the list,
// one memoised pass feeding both streams, source:'html' ⇒ result refs carry
// `.text`, PDF body — not the title — decides announcement-vs-result). Kwidzyn's
// own divergences, all deliberate: discovery walks the YEAR sub-menus under one
// board (13536) instead of fixed board ids; extraction is OCR because the PDFs
// are SCANS (the family's others are born-digital text PDFs); a single article
// co-locates BOTH the announcement and its result PDF (the others put results on
// separate articles), so every attachment is processed, not just the first; and
// NO `archived=` flag is sent (verified: the flag REDUCES/zeroes Kwidzyn's
// year-list totals, the opposite of tarnowskie-gory). The field PARSER is cloned
// from `jarocin` (the nearest OCR-tolerant Polish-notice extractor) and re-tuned
// to Kwidzyn's OCR reality — see parse.js.
//
// TERYT: gmina miejska Kwidzyn — woj 22 (pomorskie), powiat 05 (kwidzyński),
// gmina 01, rodzaj 1 (gmina miejska) → 220501_1. Best-effort (TERC table);
// confirm on first geoportal run. Corroborating live evidence: land KW numbers
// are `GD11/…` (Sąd Rejonowy w Kwidzynie) and parcels sit in `obręb 0005 Miasta
// Kwidzyna`.

export const config = {
  id: 'kwidzyn',
  teryt: '220501_1', // gmina miejska Kwidzyn — best-effort TERC; confirm on first geoportal run
  label: 'Kwidzyn',
  voivodeship: 'pomorskie',
  authority: 'Urząd Miejski w Kwidzynie (Burmistrz Miasta Kwidzyna)',
  host: 'bip.kwidzyn.pl',
  source: 'html',
};
