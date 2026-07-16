// Kalisz (województwo wielkopolskie, miasto na prawach powiatu) — the city
// (Prezydent Miasta Kalisza, Wydział Gospodarowania Mieniem / WGM) auctions
// municipal flats, buildings and land via a classic PHP-templated BIP board
// (no JS, no JSON API) at bip.kalisz.pl. Spike: spikes/wielkopolskie/kalisz/
// kalisz.md (VERDICT: BUILD, Medium effort). MZBM (communal housing manager,
// bip.mzbm.kalisz.pl) does NOT run open sale auctions — it only handles
// RENTAL (najem) auctions; out of scope.
//
// LIVE-VERIFIED 2026-07-16 (this build):
//   - Single board "Sprzedaż, dzierżawa nieruchomości" (r_ogl=SN) lists ~14-18
//     current entries: sale announcements, "wynik" (achieved-price) result
//     notices, land/building sales AND lease (dzierżawa) wykaz notices — all
//     mixed, no separate sub-board, exactly as the spike found.
//   - Every entry links a born-digital PDF (pdftotext extracts full text, no
//     OCR needed) — confirmed on 3 real fixtures: a flat announcement
//     (Górnośląska 42/11A, restricted II przetarg), a flat announcement
//     (Kazimierza Pułaskiego 14/2, the spike's own cited fixture, still live),
//     and a result notice with an achieved price (Garncarska 9A, sold above
//     asking: 350 000 -> 353 500 zł). The achieved-price stream is genuinely
//     the SAME feed as announcements, as the spike predicted — no second
//     source, no join needed.
//   - IMPORTANT live finding NOT in the spike: the board's title/teaser text
//     can be STALE/MISMATCHED to its own linked PDF. One live entry (2026-07-16)
//     is titled as a flat-sale result notice but its linked PDF is actually an
//     unrelated dzierżawa (lease) wykaz — the PDF's own legal-basis reference
//     number matches a DIFFERENT entry's lease-wykaz ref list, so this is a
//     genuine city CMS data-entry slip, not a scraping bug. Per
//     ADAPTER-GUIDE.md §5.3, this adapter classifies and extracts every field
//     from the fetched PDF TEXT only — the board title is used solely for a
//     human-readable log label, never to decide record type or content. See
//     crawl.js header for the full note.
//   - Land/building "grunt" items are classified (classifyKind) but NOT
//     parsed by this build (parcel-keyed, often multi-plot, hectares not m²)
//     — a deliberate scope decision to keep this build to the spike's
//     load-bearing criterion (residential flat auctions + achieved price).
//     crawlActive() always returns land: []. See parse.js header.
//
// `source: 'html'` — crawl.js fetches PDFs directly via pdfText(); refs carry
// `.text` so refresh.js skips its own OCR/pdf-text dispatch.

export const config = {
  id: 'kalisz',
  teryt: '306101_1', // miasto na prawach powiatu — confirm on first geoportal run
  label: 'Kalisz',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miasta Kalisza (Wydział Gospodarowania Mieniem, WGM)',
  host: 'bip.kalisz.pl',
  source: 'html',
};
