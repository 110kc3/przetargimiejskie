// Rawa Mazowiecka (województwo łódzkie, powiat rawski) — Gmina Miasto Rawa
// Mazowiecka (Burmistrz Miasta Rawa Mazowiecka, Wydział Gospodarki Terenami)
// auctions municipal flats and land at `ustny przetarg nieograniczony`/
// `ograniczony` and publishes announcements + achieved-price results on the
// city BIP. See spikes/lodzkie/powiat-rawski/rawa-mazowiecka.md.
//
// DISAMBIGUATION (see spike §1): target is the TOWN — `bip.rawamazowiecka.pl`.
// NOT the rural Gmina Rawa Mazowiecka (`bip.rawam.ug.gov.pl`), NOT the
// Starostwo Powiatowe (`bip.powiatrawski.pl`), NOT Rawskie TBS
// (`bip.rawskie-tbs.akcessnet.net`).
//
// Shape: bip.net 7.32 (Extranet-hosted) server-rendered HTML — no SPA, no
// auth, no bot block (plain `fetch` works; TLS is fine, no insecureTLS
// needed). Closest analog for the overall board-walk + inline-result
// architecture: zgorzelec (two dedicated board families, source:'html',
// crawl.js hands parse.js a pre-built `.text` blob). UNLIKE zgorzelec, rawa's
// boards are YEAR-PARTITIONED and re-created every January (a fresh numeric
// content-id per year, e.g. "3648,przetargi-2025"), so crawl.js DISCOVERS the
// current board ids from the "Przetargi"/"Wyniki przetargów" menu on every run
// instead of hardcoding them (see crawl.js header). Notice bodies are
// FLOWING HTML (Word-export markup) inline in the page — no OCR needed; a few
// notices also attach a duplicate born-digital PDF, which live-checking
// (2026-07-10) showed carries byte-identical prose to the HTML body, so it is
// not fetched separately.
//
// REAL DATA QUIRK (see parse.js header for the full writeup): the flat
// notices (e.g. the Reymonta lokale) never state a street NUMBER in the body
// text — only the bare street name ("ul. Reymonta"). The number is only
// recoverable from the attachment's file name ("... lokale Reymonta 11.pdf").
// parse.js's buildingNumberFor() falls back to that when the body has none.

export const config = {
  id: 'rawa-mazowiecka',
  // Confirmed 2026-07-10 via wykaz.rky.pl/g1013011.html (TERYT-code-keyed
  // lookup): Gmina Miasto Rawa Mazowiecka (gmina miejska) = 1013011 → powiat
  // rawski 1013, gmina seq. 01, gmina-type 1 (miejska). Cross-checked against
  // the separate rural Gmina Rawa Mazowiecka (gmina wiejska) = 1013042, which
  // matches the spike's disambiguation (different JST, different BIP host).
  // Still HIGH-not-certain (not eteryt.stat.gov.pl itself) — confirm on first
  // geoportal run before trusting for a parcel deep-link.
  teryt: '101301_1',
  label: 'Rawa Mazowiecka',
  voivodeship: 'lodzkie',
  authority: 'Gmina Miasto Rawa Mazowiecka',
  host: 'bip.rawamazowiecka.pl',
  source: 'html',
};
