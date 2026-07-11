// Zduńska Wola (województwo łódzkie, powiat zduńskowolski) — Gmina Miasto
// Zduńska Wola (Prezydent Miasta Zduńska Wola) auctions municipal flats and
// land at przetarg ustny/pisemny nieograniczony and rokowania, publishing both
// the announcement and the achieved-price resolution on ONE BIP record. See
// spikes/lodzkie/powiat-zdunskowolski/zdunska-wola.md.
//
// Shape (closest analog: Chełmno / Nakło nad Notecią — SAME Logonet eUrząd
// CMS + clean per-page/per-record XML feed, with an INLINE <rozstrzygniecie>
// resolution exactly like Chełmno; broader Logonet-family adapter shape also
// mirrors pipeline/src/cities/tarnowskie-gory/). Server-rendered HTML/XML, no
// SPA, no OCR, no auth, no bot blocks (verified live 2026-07-11).
//
//   BOARD XML:   https://bip.zdunskawola.pl/przetargi-nieruchomosci/xml/{page}/1
//   RECORD XML:  https://bip.zdunskawola.pl/przetarg-nieruchomosci/xml/{id}/1
//   HUMAN PAGE:  https://bip.zdunskawola.pl/przetarg-nieruchomosci/{id}/{slug}
//
// DISAMBIGUATION: this is the TOWN (Miasto Zduńska Wola, gmina miejska,
// bip.zdunskawola.pl) — NOT the separate rural Gmina Zduńska Wola
// (zdunskawola.bip.net.pl, a different JST + different BIP vendor entirely).
//
// Volume is small (board XML shows page count 1 / ~2 current records as of
// 2026-07-11) — old records appear to age OUT of both the board XML and the
// human page entirely once well concluded (verified: 404 on records confirmed
// live via the Wayback Machine only 8 months earlier), unlike Chełmno/Nakło's
// multi-year rolling archives. So this adapter only ever sees a recent window
// — that's the real shape of the source, not a crawl bug.
//
// TBS "ZŁOTNICKI" sp. z o.o. (rental/najem auctions) is a SEPARATE legal
// entity (100%-city-owned, but its own KRS/NIP) with its OWN site + BIP
// (tbs-zlotnicki.pl / bip.tbs-zlotnicki.akcessnet.net, a different CMS
// vendor) — confirmed live, so it structurally never appears in this crawl.
// Bonifikata tenant sales ("sprzedaż na rzecz najemców ... w trybie
// bezprzetargowym") are published as separate "wykaz" articles under
// bip.zdunskawola.pl/artykul/406/... — a different URL namespace than the
// /przetargi-nieruchomosci/ auction board this adapter crawls — so those are
// also structurally excluded. parse.js still carries a defensive isSkippable
// guard (see its header) in case either ever surfaces inline on the board.
//
// `source: 'html'` — crawl.js extracts the board/record XML itself and hands
// each result ref a ready `.text` blob (built by parse.buildRecordText), so
// the refresh loop's OCR / pdf-text dispatch is bypassed (same as Chełmno).

export const config = {
  id: 'zdunska-wola',
  // Gmina miejska Zduńska Wola (Miasto Zduńska Wola) — powiat zduńskowolski
  // 1019, gmina 01, gmina-type 1. HIGH confidence: cross-checked live
  // 2026-07-11 against 3 independent JST directories (wykaz.rky.pl/g1019011,
  // zpp.pl/gmina/1019011, e-mapa.net ".../lodzkie-10/zdunskowolski-19/
  // zdunska-wola-01-1") — NOT just pattern-derived like the usual "confirm on
  // first geoportal run" case, but still worth a final ULDK parcel check.
  teryt: '101901_1',
  label: 'Zduńska Wola',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Zduńska Wola',
  host: 'bip.zdunskawola.pl',
  source: 'html',
};
