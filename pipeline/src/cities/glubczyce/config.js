// Głubczyce (województwo opolskie, powiat głubczycki) — the Gmina (Burmistrz
// Głubczyc / Urząd Miejski w Głubczycach) sells municipal flats, houses,
// commercial units and land by oral unlimited auction ("ustny przetarg
// nieograniczony") and publishes the full stream on its own BIP
// (bip.glubczyce.pl). Second Opolskie city after Kędzierzyn-Koźle.
//
// Shape (closest STRUCTURAL analog: Kędzierzyn-Koźle — same board→attachment→
// extract-text→route-by-body flow, though the CMS differs: Głubczyce runs
// eSoteka/FINN, K-K runs Logonet). Verified live 2026-07-11 from this Pi:
//   BOARD /144/  "Ogłoszenia … o przetargach …"  → the ANNOUNCEMENT documents.
//   BOARD /145/  "Informacje o wynikach przetargów …" → the RESULT documents.
//   Each document is an attachment at either
//     /download/attachment/<id>/<slug>.<ext>   (older, the majority) or
//     /download//<id>/<slug>.<ext>             (newer land notices).
//   The attachment's numeric <id> increases with recency; both boards list every
//   historical document on one server-rendered page (no pagination, no SPA), so
//   the crawler harvests the links, sorts by id desc, and processes the newest.
//
// LOAD-BEARING FORMAT NUANCE: the PRIMARY document format is legacy Word `.doc`
// (extracted with catdoc via core/doc-text.js — catdoc is on the CI runner, see
// refresh.yml, and is used the same way by Bytom); newer LAND notices are
// born-digital `.pdf` (core/pdf-text.js). The spike's "text-PDF" note was only
// half-right — the flat stream is `.doc`. crawl.js routes by extension.
//   A second nuance: catdoc renders embedded OLE objects as short binary-garbage
// runs that occasionally land on a RESULT's "cena wywoławcza" number, so a
// result's STARTING price is best-effort (the ACHIEVED price is reliable), and
// RESULT flat docs omit the street entirely — it is recovered from the
// attachment filename slug (see parse.js addressFromFilename).
//
// `source: 'html'` — the adapter fetches each attachment and extracts its text
// itself (docText/pdfText), so the refresh loop's OCR/pdf-text dispatch is
// bypassed and crawlResultDocs() returns refs that already carry `.text` (like
// Kędzierzyn-Koźle / Tarnowskie Góry). The default bot UA is NOT gated here
// (board + downloads answer 200), so no browser-UA override is needed.

export const config = {
  id: 'glubczyce',
  // gmina miejsko-wiejska Głubczyce, powiat głubczycki (1602), woj. opolskie (16).
  // Best-effort — CONFIRM on the first geoportal/ULDK run (land records only).
  teryt: '160203_3',
  label: 'Głubczyce',
  voivodeship: 'opolskie',
  authority: 'Urząd Miejski w Głubczycach',
  host: 'bip.glubczyce.pl',
  source: 'html',
};
