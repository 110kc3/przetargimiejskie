// Siedlce (województwo mazowieckie, miasto na prawach powiatu) — Prezydent
// Miasta Siedlce, via Wydział Geodezji i Gospodarki Nieruchomościami, runs
// "ustny przetarg nieograniczony (licytacja)" auctions selling individual
// municipal flats (lokale mieszkalne) and the occasional built/commercial
// property, published as plain HTML news articles on siedlce.pl. STBS
// (Siedleckie Towarzystwo Budownictwa Społecznego) manages the komunalny stock
// but does NOT publish these sale auctions itself. See
// spikes/mazowieckie/siedlce/siedlce.md.
//
// Shape (closest analog: bochnia — small city, announcements with no separate
// online results stream, standard Polish auction vocabulary so
// core/finn-bip.js body helpers apply almost unmodified). siedlce.pl has no
// dedicated przetarg/nieruchomości index, so the crawler drives the site's own
// full-text search instead of paginating the general news archive (~500 pages
// deep at the time of writing) — see crawl.js.
//
//   SEARCH: https://siedlce.pl/wyniki-wyszukiwania?search=<phrase>
//   POST:   https://siedlce.pl/aktualnosci/<YYYY>/<MM>-<YYYY>/<slug>
//             (server-rendered HTML, full body inline, no auth/JS gate)
//
// OUT OF SCOPE: bip.siedlce.pl — session-gated (blank body on a direct fetch,
// confirmed live 2026-07-18); the auction regulation text points there as the
// "authoritative" board, but it isn't headlessly scrapable (PHP session
// cookie required). Achieved-price results are posted ONLY on a physical
// noticeboard for 7 days (§12 of the auction regulation) — no online result
// stream exists; parseResultDoc is a no-op stub, same contract as the plain
// FINN-BIP cities.
//
// `source: 'html'` — the adapter fetches article HTML and extracts text itself.
//
// NOTE (confirm on first CI refresh): the search-driven harvest was inferred
// from live pages 2026-07-18; the body parsers are groundtruthed against 3
// REAL live article bodies (fetched + verified same day): flat announcement I
// przetarg (Jana III Sobieskiego 5/58, 260 000 zł); flat announcement II
// przetarg (Józefa Piłsudskiego 96/16, 340 000 zł); built-property/office
// announcement III przetarg (Świętojańska 4, zabudowana, 3 900 000 zł).

export const config = {
  id: 'siedlce',
  teryt: '146501_1', // miasto na prawach powiatu Siedlce (powiat 1465) — confirm on first geoportal run
  label: 'Siedlce',
  voivodeship: 'mazowieckie',
  authority: 'Prezydent Miasta Siedlce',
  host: 'siedlce.pl',
  source: 'html',
};
