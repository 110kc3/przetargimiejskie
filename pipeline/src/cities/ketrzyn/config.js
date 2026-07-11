// Kętrzyn — gmina miejska (miasto), województwo warmińsko-mazurskie, powiat
// kętrzyński. Municipal property is sold by the Burmistrz Miasta Kętrzyna
// (Gmina Miejska Kętrzyn, Wydział Gospodarki Nieruchomościami i Planowania
// Przestrzennego) via "przetarg ustny nieograniczony na sprzedaż" — flats
// (lokale mieszkalne), commercial units (lokale niemieszkalne) and land
// (działki gruntu). Achieved prices are published as "Informacja o wyniku
// przetargu" documents.
//
// SOURCE — the CITY BIP `bip.miastoketrzyn.pl`. The site was REDESIGNED since
// the spike (spike 2026-06-30 recorded an eSesja board at
// `/przetargi/10006/status/`; that now 404s and lives only on the legacy
// archive host `archiwum.bip.miastoketrzyn.pl`). The live board is a modern
// gov.pl-style card list at `/nieruchomosci/przetargi?page=N` (server-rendered
// HTML, confirmed live 2026-07-11 — no JS/SPA, bot UA NOT gated). Each card
// links a detail page carrying the announcement + result as BORN-DIGITAL text
// PDFs (`pdftotext -layout`, no OCR needed) at
// `/przetargi/<slug>/<file>.pdf`; some "Informacja o wyniku" notices are
// published as a standalone card with the result text inline in HTML instead.
//
// SCOPE — the MIASTO host `bip.miastoketrzyn.pl` ONLY. The rural gmina wiejska
// Kętrzyn (`bip.gminaketrzyn.pl`) is a SEPARATE JST and is OUT OF SCOPE (not
// crawled here). NOTE: the miasto BIP occasionally lists plots physically in
// gmina-wiejska villages (e.g. Nowa Różanka); those are ingested because they
// are published on the in-scope miasto host — kind/scope is decided by the
// document body, not by locality.
//
// 429 rate-limiting was observed during the spike; core/fetch.js's built-in
// 1 req/s throttle + exponential-backoff retry (on 429/5xx) handles it — this
// adapter never touches core/ and keeps the crawl politely bounded (page cap +
// wall-clock budget + known-URL skipping).
//
// Closest in-repo analog: `bialystok` (paginated gov.pl card index + status,
// source:'html' with pre-extracted `.text`) fused with `gorzow-wielkopolski`
// (born-digital result PDFs → pdfText → parseResultDoc) and `wolow`
// (multi-kind: flats/commercial address-keyed + land parcel-keyed, memoized
// discoverAll). See spikes/warminsko-mazurskie/powiat-ketrzynski/ketrzyn.md.
//
// TERYT — gmina miejska Kętrzyn: woj. 28 (warmińsko-mazurskie), powiat 08
// (kętrzyński), gmina 01, rodzaj 1 (gmina miejska) → 280801 → `280801_1` in
// this repo's WWPPGG_R convention (the surrounding gmina wiejska is 280802_2,
// a different JST). Best-effort from the standard TERYT table — CONFIRM on the
// first geoportal/ULDK run before trusting it for deep-links.

export const config = {
  id: 'ketrzyn',
  teryt: '280801_1', // gmina miejska Kętrzyn (powiat kętrzyński) — confirm on first geoportal run
  label: 'Kętrzyn',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Urząd Miasta Kętrzyn (Burmistrz Miasta Kętrzyna)',
  host: 'bip.miastoketrzyn.pl',
  source: 'html',
};
