// Sucha Beskidzka (województwo małopolskie, powiat suski) — Gmina Miejska Sucha
// Beskidzka (Urząd Miasta, Burmistrz; Referat Gospodarki Nieruchomościami) sells
// municipal property — including lokale mieszkalne — via "przetarg ustny
// nieograniczony na sprzedaż". See spikes/malopolskie/powiat-suski/sucha-beskidzka.md
// (VERDICT: BUILD, Low–Medium effort).
//
// SOURCE — two hosts, only one is scrapeable server-side:
//   1. ANNOUNCEMENTS (primary stream, built here): the CITY WEBSITE
//      `sucha-beskidzka.pl`, which runs the **Interaktywna Polska** CMS. A clean
//      server-rendered HTML board at `/pl/879/0/przetargi-na-nieruchomosci.html`
//      lists every notice as an anchor whose VISIBLE TEXT carries the full title
//      ("BURMISTRZ MIASTA SUCHA BESKIDZKA ogłasza [drugi/trzeci] przetarg ustny
//      nieograniczony na sprzedaż lokalu mieszkalnego nr 9 … os. Beskidzkie …");
//      each notice body is a **born-digital text PDF** under
//      `/mfiles/879/28/0/z/*.pdf`, parsed with core/pdf-text.js `pdfText`
//      (pdftotext -layout — no OCR needed; confirmed born-digital live).
//   2. ACHIEVED PRICES (OUT OF SCOPE — SPA gap): the formal BIP
//      `bip.malopolska.pl/umsuchabeskidzka` is a **JS-SPA** (WebFetch returns
//      only the nav shell) and is where "informacja o wyniku przetargu" (cena
//      osiągnięta / nabywca) is posted. Per ADAPTER-GUIDE §3 that would need
//      core/render.js (Playwright) like `chrzanow`; the spike rates it a
//      low-value optional stream, so this adapter does NOT wire it and does NOT
//      set needsRender. The achieved-price gap is instead covered by
//      round-supersession inference (crawlResultDocs — see crawl.js / parse.js
//      headers): a round K+1 announcement for the same subject proves round K
//      went unsold. So every result here is `outcome: 'unsold'`,
//      `final_price_pln: null` (a documented, deliberate residual, not a bug).
//
// `source: 'html'` — the adapter fetches each notice PDF itself during the crawl
// and forwards the extracted text on the result refs (`ref.text`), so refresh.js
// uses that text directly (html sources are not re-fetched/OCR'd).
//
// Closest analog: **bochnia** (custom-HTML board → collect notice links by title
// → route flats→listings / land→land via ONE memoised crawl serving both
// crawlActive + crawlResultDocs, reusing the core/finn-bip.js text helpers). Two
// deliberate divergences from bochnia: (a) notice bodies are PDFs (`pdfText`)
// not inline HTML (`htmlToText`); (b) there is no server-HTML "informacja o
// wyniku" surface (results are SPA-only), so crawlResultDocs uses the **wolow**
// round-supersession inference instead of parsing real result documents.
//
// NOTE (teryt): 1215021 (gmina miejska Sucha Beskidzka, powiat suski) → repo
// WWPPGG_R form 121502_1 (woj 12 małopolskie, powiat 15 suski, gmina 02, rodzaj
// 1 = miejska). Sourced from wykaz.rky.pl (g1215021) + e-mapa.net
// (sucha-beskidzka-02-1). CONFIRM on first geoportal/ULDK run.

export const config = {
  id: 'sucha-beskidzka',
  teryt: '121502_1', // gmina miejska Sucha Beskidzka (powiat suski) — confirm on first geoportal run
  label: 'Sucha Beskidzka',
  voivodeship: 'malopolskie',
  authority: 'Urząd Miasta Sucha Beskidzka',
  host: 'sucha-beskidzka.pl',
  source: 'html',
};
