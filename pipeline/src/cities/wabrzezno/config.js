// Wąbrzeźno (województwo kujawsko-pomorskie, powiat wąbrzeski) — Gmina Miasto
// Wąbrzeźno (Burmistrz Wąbrzeźna). The Urząd Miasta sells municipal lokale
// mieszkalne — and land — DIRECTLY at `nieograniczony przetarg ustny na
// sprzedaż prawa własności` (open oral public auction, not tenant-only; no ZGM /
// TBS intermediary). Announcements + "Informacja o wynikach" results are both
// published on the city BIP. See spikes/kujawsko-pomorskie/powiat-wabrzeski/
// wabrzezno.md.
//
// Shape (rbip.mojregion.info — the regional Kujawsko-Pomorskie BIP CMS; FIRST
// adapter of this family in the repo; closest built server-HTML analog: Zgorzelec
// for the html-board → article → inline-text flow + the two-pass announce/result
// split). Server-rendered HTML, no SPA, no auth, no bot block. Everything hangs
// off ONE "Przetargi" board (id 330):
//   BOARD (XML feed, complete in one request — no pagination):
//     https://mst-wabrzezno.rbip.mojregion.info/xml/330/przetargi.html
//       → <strona numer><naglowek>TITLE</naglowek><link>NOTICE_URL</link> refs
//   NOTICE (per article):
//     https://mst-wabrzezno.rbip.mojregion.info/<id>/<slug>.html   (human)
//     https://mst-wabrzezno.rbip.mojregion.info/xml/<id>/<slug>.html (clean XML)
//       → <tresc> CDATA carries EITHER the full ogłoszenie inline (recent flat
//         auctions) OR a thin "PDF …/DOCX …" stub whose real text is a born-
//         digital PDF / DOCX in <zalaczniki>. crawl.js routes: inline → parse
//         directly; stub → pdfText / docText the attachment. (The CMS is
//         ID-addressed — the slug is cosmetic — but we always use the feed's URL.)
//
// Announcements are frequently MULTI-LOKAL (one notice lists several flats in a
// "1) … 2) …" / "do lokalu … nr N" list — one property record each). Results are
// "Informacja o wynikach/dotycząca …" notices (mostly PDF), typically negative
// land outcomes (brak ofert). Land (kind 'grunt') is partitioned into land.json.
// Leases (dzierżawa/najem), rokowania and works tenders share the board and are
// skipped.
//
// `source: 'html'` — the adapter fetches + extracts every notice itself (inline
// HTML, PDF or DOCX) and hands each result ref a ready `.text` blob (built by
// parse.buildRecordText), so the refresh loop's OCR / pdf-text dispatch is
// bypassed (exactly like Zgorzelec / Chełmno).

export const config = {
  id: 'wabrzezno',
  teryt: '041701_1', // gmina miejska Wąbrzeźno (woj. kujawsko-pomorskie 04, powiat
  //                    wąbrzeski 17, gmina 01, type 1) — for geoportal parcel
  //                    deep-links; best-effort, confirm on the first geoportal run.
  label: 'Wąbrzeźno',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Gmina Miasto Wąbrzeźno',
  host: 'mst-wabrzezno.rbip.mojregion.info',
  source: 'html',
};
