// Kędzierzyn-Koźle (województwo opolskie) — the Gmina (Urząd Miasta, Wydział
// Gospodarki Nieruchomościami i Planowania Przestrzennego) auctions municipal
// flats, commercial units AND land, and publishes the full pipeline — wykaz →
// ogłoszenie → wynik — on its own BIP (bip.kedzierzynkozle.pl). First Opolskie
// city in the project. See SPIKE-NEIGHBORS.md.
//
// Shape (closest analog: Tarnowskie Góry — SAME CMS VENDOR, Logonet eUrząd
// "Wersja systemu 2.9.0"): the BIP is server-rendered HTML (no SPA, no OCR for
// the born-digital PDFs, no TLS workaround). Each auction's announcement and
// result are self-contained TEXT PDFs (one property per PDF) hung off board-127
// article pages; the durable crawl anchor is the board-85 year-indexed MASTER
// TABLES, whose rows link every Ogłoszenie + Wynik + Wykaz article.
//
//   MASTER TABLES (board/menu 85, "Gospodarowanie … obrót nieruchomościami"):
//     /artykul/85/<id>/sprzedaz-lokali-mieszkalnych-i-uzytkowych-w-trybie-przetargowym-rok-YYYY
//     /artykul/85/<id>/sprzedaz-nieruchomosci-gruntowych-w-trybie-przetargowym-rok-YYYY
//       → an HTML table: l.p. | adres | Wykaz | Ogłoszenie | Termin wadium |
//         Termin przetargu | Informacja o wyniku — each cell a link to a
//         board-127 article.
//   ARTICLES (board/menu 127, "Sprzedaż, dzierżawa, obciążanie …"):
//     /artykul/127/<id>/<slug>   slug "ogloszeni…"=announcement, "wynik"=result,
//       "wykaz"=pre-announcement (skipped). Each carries a "Załączniki" list of
//       /attachments/download/<fileId> PDFs.
//   FILE:  /attachments/download/<fileId>
//
// LOAD-BEARING PDF NUANCE: every notice is posted as TWO attachments — a
// born-digital TEXT PDF ("…pdf") and a SCANNED twin ("… skan.pdf" / "…- skan.pdf").
// The text PDF extracts perfectly with `pdftotext`; the scan is OCR-garbled. The
// crawler MUST drop attachments whose filename contains "skan" and parse the
// sibling text PDF (verified live 2026-06-26: download/78414 text = clean,
// download/73247 scan = garbled).
//
// OUT OF SCOPE: board-127 also carries `dzierżawa` (lease) items — filtered out
// by slug/title. The powiat/starostwo (bip.powiat.kedzierzyn-kozle.pl) sells its
// own property — different owner, not ingested (we stay on the gmina BIP).
//
// `source: 'html'` — the adapter fetches the article HTML, selects the non-skan
// PDF, and extracts its text itself (so the refresh loop's OCR/pdf-text dispatch
// is bypassed; crawlResultDocs() returns refs that already carry `.text`, like
// Tarnowskie Góry / Zabrze).
//
// NOTE (confirm on first CI refresh): the Logonet `/api/menu/<id>/articles` JSON
// API (the route Tarnowskie Góry uses) was not confirmable from the in-sandbox
// fetcher, so this adapter drives enumeration from the server-rendered master
// tables instead — fully sufficient and history-complete. TERYT 160301_1 is from
// the BIP footer.

export const config = {
  id: 'kedzierzyn-kozle',
  teryt: '160301_1', // gmina miejska Kędzierzyn-Koźle (powiat kędzierzyńsko-kozielski)
  label: 'Kędzierzyn-Koźle',
  authority: 'Urząd Miasta Kędzierzyn-Koźle',
  host: 'bip.kedzierzynkozle.pl',
  source: 'html',
};
