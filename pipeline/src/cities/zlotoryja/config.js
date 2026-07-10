// Złotoryja (województwo dolnośląskie, powiat złotoryjski) — Gmina Miejska
// Złotoryja (Burmistrz Miasta Złotoryja) auctions municipal flats and land at
// `<ROMAN> (nieograniczony) przetarg ustny` and publishes announcements +
// achieved-price results on `bip.zlotoryja.pl`. See
// spikes/dolnoslaskie/powiat-zlotoryjski/zlotoryja.md — READ crawl.js's header
// FIRST: the spike's host (zlotoryja.bip.info.pl, a server-HTML bip.info.pl
// BIP) is now DEAD (verified 2026-07-10: every board/document path 404s at
// the nginx level); the city's real, live BIP has migrated to a different
// platform at bip.zlotoryja.pl, which this adapter targets instead.
//
// Shape: a modern Angular front-end (no server HTML at all — a bare
// `<app-root>` shell) backed by a JSON:API-shaped REST API at `/api/fo/...`.
// `source: 'html'` is kept (matching the chelmno/zgorzelec convention) because
// this adapter builds each result ref's `.text` itself from the API's
// `title` + `content` (HTML) fields, bypassing the refresh loop's OCR/
// pdf-text dispatch.

export const config = {
  id: 'zlotoryja',
  teryt: '022602_1', // gmina miejska Złotoryja (powiat złotoryjski 0226, gmina-type 1) — confirm on first geoportal run
  label: 'Złotoryja',
  voivodeship: 'dolnoslaskie',
  authority: 'Gmina Miejska Złotoryja',
  host: 'bip.zlotoryja.pl',
  source: 'html',
};
