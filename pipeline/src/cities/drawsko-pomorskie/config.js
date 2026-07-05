// Drawsko Pomorskie (Zachodniopomorskie, powiat drawski) — municipal flat sales
// run by Urząd Miejski w Drawsku Pomorskim (Burmistrz Drawska Pomorskiego).
//
// Single-host model (see spikes/zachodniopomorskie/powiat-drawski/drawsko-pomorskie.md):
//   drawsko.pl/aktualnosci-2/33-nieruchomosci/ — custom CMS (2ClickPortal),
//   paginated news-article board (/strona-N/, ~12 items/page, ~33 pages).
//   Every announcement AND result notice is a server-rendered HTML article;
//   the full body is also embedded verbatim in the page's JSON-LD
//   NewsArticle.articleBody (HTML-entity-encoded) — the cleanest text source.
//
//   Announcements: "<I/II/III> przetarg ustny nieograniczony … lokal mieszkalny"
//     → prose table (Adres / Oznaczenie / Pow. / KW / Opis / Cena wywoławcza)
//       + a prose block with the auction date and wadium.
//   Results:       "Informacja o wyniku przetargu … lokalu mieszkalnego"
//     → numbered paragraphs incl. "Cena wywoławcza" and
//       "Najwyższa cena osiągnięta w przetargu" (achieved price) + Nabywca.
//
// 403 NOTE: the board serves 403 to the default bot User-Agent. A browser UA
// (OR a Referer header) defeats it — verified live 2026-07-05. core/fetch.js
// getText's `userAgent` option sends a full browser header set, so we reuse it
// with BROWSER_UA and need no custom Referer path (see crawl.js).
//
// `source: 'html'` — the adapter carries decoded article text on each result
// ref (refresh.js reads ref.text directly; no OCR/PDF).
// Volume: ~3–6 flat auctions/yr; some re-listed to II/III przetarg.

export const config = {
  id: 'drawsko-pomorskie',
  // TERYT for gmina miejsko-wiejska Drawsko Pomorskie (powiat drawski 3202,
  // zachodniopomorskie). Code 320203_3 — confirm on first geoportal run.
  teryt: '320203_3',
  label: 'Drawsko Pomorskie',
  voivodeship: 'zachodniopomorskie',
  authority: 'Urząd Miejski w Drawsku Pomorskim',
  host: 'drawsko.pl',
  source: 'html',
};
