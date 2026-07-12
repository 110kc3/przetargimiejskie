// Kamienna Góra — gmina miejska (miasto), województwo dolnośląskie, powiat
// kamiennogórski.
//
// Burmistrz Miasta Kamienna Góra sells municipal flats (lokale mieszkalne) via
// "ustny przetarg nieograniczony na zbycie". Single host: bip.kamiennagora.pl
// (Urząd Miasta Kamienna Góra, Pl. Grunwaldzki 1). The BIP is a slug-based
// article/registry CMS: it lists notices per calendar year on
// `/<YEAR>.html` index pages, but carries the ACTUAL notice text ONLY as
// born-digital PDF attachments (`files/file_add/download/<id>_<name>.pdf`),
// NOT inline HTML. So both streams below are pdftotext-of-attachment, and the
// year-index pages are used purely for slug discovery.
//
// CAVEAT — UA FILTER (spike-flagged, confirmed live 2026-07-11 from this Pi's
// Polish IP): the bot UA gets an EMPTY body (199 bytes); a browser UA returns
// the real ~108 KB HTML. EVERY fetch (getText for the index/detail pages,
// pdfText for the attachments) MUST pass BROWSER_UA — see crawl.js. Same
// pattern as bytom / wejherowo / walbrzych. We do NOT modify core/.
//
// Streams:
//   Active listings — /<YEAR>.html year-index → flat-sale announcement pages →
//     each page's "...ogłoszenie" PDF ("Burmistrz ... ogłasza N przetarg ...";
//     cena wywoławcza / powierzchnia / auction date / round). crawlActive keeps
//     only genuinely upcoming ones (auction_date >= today).
//   Result notices — the SAME announcement pages ALSO carry, after the
//     auction, an "INFORMACJA O WYNIKU ... PRZETARGU" PDF: achieved price +
//     "wynikiem pozytywnym" (sold) or "wynikiem negatywnym" / "nie wyłoniono
//     nabywcy" (unsold). This is a REAL achieved-price stream — both outcomes
//     confirmed live (Mostowa 6/10 → 39 400 zł sold; Kościuszki 20/8 negatywny).
//
// Closest analog: walbrzych (born-digital result PDFs via pdfText, browser-UA
// gate, year/board discovery) crossed with wolow (slug-based per-notice
// discovery + classifyKind on the BODY, never the URL slug). Chosen over a pure
// walbrzych clone because Kamienna Góra publishes one PDF per notice (narrative,
// single-column) rather than walbrzych's one multi-column table PDF per auction
// day — so the field extraction is prose-regex (wolow-style), not column-slice.
//
// SCOPE: bip.kamiennagora.pl is the Urząd MIASTA — every notice is the city
// gmina miejska's own ("Gmina Miejska Kamienna Góra" / "miasta Kamienna Góra").
// The separate rural Gmina Kamienna Góra has its own BIP and is out of scope;
// nothing here needs filtering for it.
//
// TERYT: gmina miejska Kamienna Góra = 020701_1 (woj 02 dolnośląskie / powiat 07
// kamiennogórski / gmina 01 / rodzaj 1 = gmina miejska), in this repo's WWPPGG_R
// convention (same "_1 gmina miejska" shape as other miejskie entries).
// CONFIRMED against GUS TERYT (wykaz.rky.pl/g0207011.html) and e-mapa
// (dolnoslaskie-02/kamiennogorski-07/kamienna-gora-01-1); the rural Gmina
// Kamienna Góra is 0207022 (out of scope). NB the powiat digit is 07, NOT 08
// (08 is powiat kłodzki — cf. this repo's klodzko config, which is mis-coded).
// Still confirm the exact ULDK variant on the first geoportal run.

export const config = {
  id: 'kamienna-gora',
  teryt: '020701_1', // gmina miejska Kamienna Góra (powiat kamiennogórski 0207) — confirm ULDK variant on first geoportal run
  label: 'Kamienna Góra',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miasta Kamienna Góra (Burmistrz Miasta Kamienna Góra)',
  host: 'bip.kamiennagora.pl',
  source: 'html', // crawlResultDocs() returns refs with .text already attached
};
