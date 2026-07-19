// Biała Podlaska — municipal residential/commercial stock is managed by ZGL
// Biała Podlaska Sp. z o.o. (Zakład Gospodarki Lokalowej), a city-owned
// company, NOT the city BIP. ZGL runs open "przetarg ustny (aukcja) w trybie
// Kodeksu cywilnego" auctions (civil-code rules, since it's a sp. z o.o.) on
// flats/commercial units/parcels where no sitting tenant bought — published
// directly on zglbp.pl. See spikes/lubelskie/biala-podlaska/biala-podlaska.md
// (live-verified 2026-06-27) and crawl.js for the full source-shape write-up.
//
// `source: 'html'` — the whole announcement (meta box + prose) is inline
// server-rendered HTML; no PDF/DOC attachment was observed on any
// sprzedaz_nieruchomosci row in the crawled window, so this adapter never
// calls pdfText/ocrPdf/docText. crawlResultDocs() returns [] (no
// achieved-price stream exists on-site) — announcement-only.

export const config = {
  id: 'biala-podlaska',
  // Lubelskie voivodeship (06) city-powiat; alphabetical city-powiat
  // numbering in this voivodeship (Biała Podlaska, Chełm, Lublin, Zamość ->
  // 61-64) gives 0661011 — NOT independently verified via ULDK. Provisional —
  // confirm on first geoportal run.
  teryt: '066101_1',
  label: 'Biała Podlaska',
  voivodeship: 'lubelskie',
  authority: 'ZGL Biała Podlaska Sp. z o.o.',
  host: 'zglbp.pl',
  source: 'html',
};
