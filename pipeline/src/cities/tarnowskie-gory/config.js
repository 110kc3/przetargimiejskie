// Tarnowskie Góry — the Gmina (Urząd Miejski) auctions municipal flats, built
// properties (buildings/houses) AND land, and publishes BOTH active sale
// announcements and achieved-sold-price result notices on its city BIP
// (bip.tarnowskiegory.pl). See SPIKE-TARNOWSKIE-GORY.md.
//
// Shape (closest analog: Zabrze, but cleaner — no OCR, no TLS workaround):
// the board pages are a React SPA, but a clean JSON API makes a browser
// unnecessary. Each announcement carries ONE text PDF holding all the detail
// (address / parcel / area / starting price / auction date / round). Result
// notices ("INFORMACJA o wyniku przetargu") are published INLINE on the same
// boards (no separate WYNIKI board) — Tarnowskie Góry's achieved-price stream.
//
//   LIST:    GET /api/menu/<id>/articles?limit=&offset=&archived=true
//              → { total, articles:[{ id, link (slug), aliasFields[{alias:'title'}],
//                  columnFields[{value: publish date}] }] }
//   ARTICLE: GET /api/articles/<id>  → { title, content, attachments:[{ id,
//              name, extension:'pdf', link:'e,pobierz,get.html?id=<attId>' }] }
//   FILE:    /e,pobierz,get.html?id=<attId>   (the per-announcement text PDF)
//
// Boards (menu node 3472 "Nieruchomości, w tym przetargi"):
//   5217 — przetargi na nieruchomości zabudowane (budynki + lokale) + result notices
//   5216 — przetargi na nieruchomości niezabudowane (land) + result notices
// (5989 wykazy + 5218/5990 dzierżawa/najem are out of scope — rentals/sale-lists.)
//
// `source: 'html'` — the adapter does its own attachment fetch + text
// extraction (it knows each article's attachment URL via the API), so the
// refresh loop's OCR/pdf-text dispatch is bypassed; crawlResultDocs() returns
// refs that already carry `.text` (exactly like Zabrze). The PDFs are text
// (pdftotext -layout), not scanned — verified against live data in the spike.
//
// NOTE: the JSON API is an undocumented vendor (eUrząd/Logonet) endpoint. The
// canonical per-article page is the API's own `link` (a,<id>,<slug>.html) — that
// is what crawl.js stores as detail_url. (The guessed /Article/id,<N>.html is NOT
// a real SPA route — it returns the 200 shell but the client router 404s — so it
// must never be used as a link.) The human board pages hang off menu node 3472.

export const config = {
  id: 'tarnowskie-gory',
  teryt: '247701_1', // gmina miejska Tarnowskie Góry TERYT (powiat tarnogórski 2477,
  //                    gmina-type 1) — for geoportal parcel deep-links. Fits the
  //                    series (Świętochłowice 2476 → Zabrze 2478); ULDK was
  //                    unreachable in-sandbox, so confirm on the first refresh.
  label: 'Tarnowskie Góry',
  authority: 'Urząd Miejski w Tarnowskich Górach',
  host: 'bip.tarnowskiegory.pl',
  source: 'html',
};
