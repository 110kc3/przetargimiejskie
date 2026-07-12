// Żnin — gmina miejsko-wiejska, województwo kujawsko-pomorskie, powiat żniński.
//
// Burmistrz Żnina (Urząd Miejski w Żninie) sells municipal property — flats,
// commercial units, built properties and (mostly) land — via "przetarg ustny
// nieograniczony na sprzedaż" (plus a few "ustny ograniczony do właścicieli
// sąsiednich" and one "pisemny nieograniczony", all SALES). Everything is
// published on a dedicated board "Obrót nieruchomościami" on the city BIP
// `bip.gminaznin.pl`, a bespoke server-rendered "System Rada"/eSesja CMS
// (Bootstrap + DataTables). Each auction is its own article at
// `/nieruchomosc/<slug>` carrying a clean LABELLED field block inline in the
// server HTML (cena wywoławcza / wadium / powierzchnia / obręb / numer działki /
// KW / tryb) plus a SCANNED ogłoszenie PDF. See parse.js for the full source map.
//
// CAVEAT — browser UA REQUIRED. The default bot UA gets HTTP 403 on both the
// board and the notice pages; crawl.js passes a Chrome UA to core/fetch.js (same
// pattern as bytom/wejherowo). No render.js — the board's `/nieruchomosc/` rows
// are REAL server anchors (34 live), not JS-rendered, so `source: 'html'`.
//
// LOW FLAT VOLUME. The board is land/commercial-dominated: ~20 land parcels,
// ~6 commercial units, ~4 built properties, and exactly 1 lokal mieszkalny at
// spike/build time (Jadowniki Rycerskie 27/4). Flats recur but are rare; the
// steady value here is the land stream (clean parcel + obręb → land.json).
//
// AUCTION DATES need OCR. The inline HTML omits the auction date; it lives only
// in the scanned ogłoszenie PDF, extracted best-effort via pdfText→ocrPdf in
// crawl.js (a 403/broken PDF just leaves auction_date null — the listing ships).
//
// See spikes/kujawsko-pomorskie/powiat-zninski/znin.md (VERDICT: BUILD).
// Closest analog: nowa-sol (WordPress/custom-HTML gmina board → per-notice HTML;
// nowa-sol's own board→detail→structured-HTML shape is the nearest match — see
// the build report; brzeg's two-host BIP-result model does not apply here).

export const config = {
  id: 'znin',
  // gmina miejsko-wiejska Żnin (powiat żniński, kujawsko-pomorskie): raw TERYT
  // 0419063 (whole-gmina, rodzaj 3) per the national TERYT registry (wykaz.rky.pl
  // /p0419) → WWPPGG_R form 041906_3. Confirm on first geoportal run.
  teryt: '041906_3',
  label: 'Żnin',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Urząd Miejski w Żninie (Burmistrz Żnina)',
  host: 'bip.gminaznin.pl',
  source: 'html',
};
