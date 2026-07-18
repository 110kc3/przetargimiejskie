// Sopot (województwo pomorskie, miasto na prawach powiatu) — the Prezydent
// Miasta Sopotu (Wydział Gospodarki Nieruchomościami) auctions municipal flats,
// commercial units and garages directly on the city BIP (bip.sopot.pl), a
// custom NV CMS with a React/SPA shell (the raw HTML ships an empty
// `<div id="root"></div>` — confirmed live 2026-07-18). See
// spikes/pomorskie/sopot/sopot.md.
//
// CRITICAL FINDING (supersedes the spike's SPA-rendering assumption): the SPA
// shell fetches its data from a PLAIN JSON API that needs no JS execution.
// Confirmed by capturing the live page's network requests with Playwright,
// then re-fetching the SAME endpoints with plain `core/fetch.js#getText` (no
// browser) and getting identical data back:
//   board:    GET /api/menu/107/articles?limit=N&offset=M&archived={0,1}
//             ("Przetargi" board, menu id 107. archived=0 ≈ 116 "current"
//             items; archived=1 is a DISTINCT ≈282-item older archive, NOT a
//             superset of archived=0 — both must be crawled.)
//   article:  GET /api/articles/{id}  → { content: <html>, attachments: [...] }
//   download: GET /e,pobierz,get.html?id={attachmentId}  (plain bytes, no auth)
// Because a working JSON-API path exists, core/render.js (Playwright) is NOT
// used here — see its own header comment recommending exactly this lighter
// path when a source's JSON API can be found. `needsRender` is intentionally
// left UNSET; this adapter makes zero headless-browser calls.
//
// Content shape: an article's `content` HTML field is a near-empty <h1> shell
// for most modern announcements/results — the real prose (cena wywoławcza,
// area, auction date, wynik) lives in a downloadable attachment: legacy .doc
// (OLE2 magic, confirmed) for the announcement, and — once concluded — a
// second "Informacja o wyniku ..." .doc attached to the SAME article (the
// title gains a "(ZAKOŃCZONY)" prefix). Older articles (pre-~2020) instead
// publish a SEPARATE "Informacja dotycząca rozstrzygnięcia ..." article with
// the result INLINE in `content` (no attachment). Both shapes are handled —
// see parse.js / crawl.js.
//
// Scope: flats (lokal mieszkalny), commercial units (lokal użytkowy /
// niemieszkalny) and garages — all address-keyed, matching the spike's BUILD
// verdict. Land (nieruchomość gruntowa) sales are NUMEROUS on this board
// (143 title matches since 2010, mostly the same handful of parcels re-listed
// across failed rounds) but are OUT OF SCOPE for this build to keep the
// live-fetch count polite (a prior build agent got a different host
// rate-limited at ~150 requests) — a follow-up can add `land[]` the way
// krakow does.
//
// Volume: LOW (per spike, ~1–3 flat auctions/yr) — thin data is expected.

export const config = {
  id: 'sopot',
  // Miasto na prawach powiatu Sopot, woj. pomorskie. Powiat 2264 sits between
  // Gdańsk (2261, see gdansk/config.js) and Słupsk (2263, see
  // slupsk/config.js) in the GUS powiat sequence for pomorskie. NOT verified
  // against the GUS TERYT registry from this sandbox — confirm on first
  // geoportal run.
  teryt: '226401_1',
  label: 'Sopot',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Sopotu (Wydział Gospodarki Nieruchomościami)',
  host: 'bip.sopot.pl',
  source: 'html',
};
