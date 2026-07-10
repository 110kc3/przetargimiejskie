// Chodzież (Wielkopolskie, powiat chodzieski) — Gmina Miejska Chodzież sells
// municipal lokale mieszkalne (and occasional grunt) at ustny przetarg
// nieograniczony, run by Burmistrz Miasta Chodzieży.
// See spikes/wielkopolskie/powiat-chodzieski/chodziez.md.
//
// Host: bip.chodziez.pl — a WOKISS-family BIP CMS (footer: "Projekt i
// realizacja: WOKISS"). Re-verified 2026-07-06 (and again during this build,
// 2026-07-10): the whole site is server-rendered HTML to a plain HTTP GET —
// no JS/SPA, no headless render needed. `needsRender` is intentionally
// omitted (falsy default).
//
// Board layout (year-scoped, under obrot-nieruchomościami — note the live
// hrefs use the diacritic path segment "nieruchomościami"; the ASCII
// "nieruchomosciami" form also resolves per the spike, and is what this
// adapter hardcodes for the static board URLs):
//   .../obrot-nieruchomosciami/<YYYY>/ogloszenia-o-przetargach.html  — active announcements
//   .../obrot-nieruchomosciami/<YYYY>/wyniki-przetargow.html         — results (7-day lived!)
//   .../obrot-nieruchomosciami/<YYYY>/wykazy.html                    — wykazy (currently 100%
//     "sprzedaż w drodze bezprzetargowej" / dzierżawa / użyczenie — i.e. NOT
//     auction-track designations; see parse.js isWykazSaleTitle for the filter
//     that would pick up a genuine pre-auction wykaz if one ever appears)
//
// Each announcement is a single full-HTML prose page (no PDF/OCR) — the
// legally standard Polish municipal auction-notice template. A single notice
// can announce MULTIPLE lokale (e.g. two flats in the same building sold as
// one lot with one shared cena wywoławcza) — parse.js returns one listing
// record per lokal.
//
// Results: `wyniki-przetargow.html` for 2022-2026 were all confirmed EMPTY
// live on 2026-07-10 (statutory ~7-day posting window already elapsed for the
// two 2026 Mickiewicza rounds) — consistent with the spike's finding. The
// crawlResultDocs()/parseResultDoc() plumbing is implemented against the
// standard Polish result-notice template (same vocabulary this adapter's own
// announcements use, e.g. "Cena wywoławcza … wynosi", plus the nationwide
// "cena osiągnięta" / "wynikiem negatywnym" result vocabulary seen across
// other cities) but is UNVERIFIED against a real live chodziez result page —
// none exists to fetch right now. Validate/tune on first live CI refresh that
// catches a result inside its 7-day window (weekly poll recommended).
//
// Volume: low — 3 flat lots live in 2026 (2 in one multi-lot notice + 1
// single-lot notice), consistent with the spike's ~1-4/yr estimate.

export const config = {
  id: 'chodziez',
  // TERYT gmina miejska Chodzież (powiat chodzieski, wielkopolskie).
  // Code 308101_1 — confirm on first geoportal run.
  teryt: '308101_1',
  label: 'Chodzież',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miejski w Chodzieży',
  host: 'bip.chodziez.pl',
  source: 'html',
};
