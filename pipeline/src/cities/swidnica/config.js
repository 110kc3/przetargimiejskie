// Świdnica (Dolnośląskie, powiat świdnicki) — Gmina Miasto Świdnica. Prezydent
// Miasta Świdnicy (Wydział Mienia Komunalnego / MZN) auctions municipal flats
// and commercial units directly on the city BIP (bip.swidnica.nv.pl), a
// custom NV CMS with a React/SPA shell (raw HTML ships an empty
// `<div id="root"></div>` — confirmed live 2026-07-19). See
// spikes/dolnoslaskie/powiat-swidnicki/swidnica.md.
//
// CRITICAL FINDING (supersedes the spike's headless-render assumption): the
// SPA shell fetches its data from a PLAIN JSON API that needs no JS
// execution — the same nv.pl platform + endpoint shapes discovered live for
// bip.sopot.pl (2026-07-18). Confirmed by fetching the API directly with
// plain `core/fetch.js#getText` (browser UA, no browser):
//   board:    GET /api/menu/11962/articles?limit=N&offset=M&archived={0,1}
//             ("Sprzedaż i dzierżawa nieruchomości" board, menu id 11962.
//             archived=0 is the small "current" list, archived=1 a DISTINCT
//             older list — both crawled, deduped by id, same shape as Sopot.)
//   article:  GET /api/articles/{id}  → { content: <html>, attachments: [...] }
// Because a working JSON-API path exists, core/render.js (Playwright) is NOT
// used here — `needsRender` is intentionally left UNSET; this adapter makes
// zero headless-browser calls.
//
// UNLIKE Sopot, the article's `content` HTML field carries the FULL prose
// inline — no attachment fetch is needed at all. Świdnica's workflow reuses
// the SAME article for the whole lifecycle of one auction round: it is first
// published as the announcement (title "I/II przetarg ustny nieograniczony
// ... na sprzedaż ..." or "Pierwszy/Kolejny przetarg ..."), and once the
// round concludes the city PREPENDS a "Świdnica, dnia DD-MM-YYYY r.
// INFORMACJA ... podaje do publicznej wiadomości informację o wyniku ..."
// block to the SAME content field, followed by the original (unedited)
// announcement text — the title never changes to say "wynik". So an
// article's role (still-pending announcement vs. already-concluded result)
// can only be told apart by scanning its BODY TEXT (see parse.js#isResultText),
// never its title. Confirmed live: as of 2026-07-19 EVERY flat/commercial
// item currently on the board (7 current + 1 archived = 8 total) has ALREADY
// mutated into a result — the board's retention window is short, so a
// snapshot on any given day mostly shows recently-concluded rounds, not
// pending ones. The historical volume claimed by the spike (adradar's 12
// archive pages) reflects an EXTERNAL republisher's own persistent archive,
// not the live BIP's — the city's own board purges old entries; this
// adapter's history will accumulate forward from build date via
// merge-history.js as CI re-runs, not backfill from the BIP itself.
//
// SOLD vs UNSOLD is read from the wynik block's own template: "Najwyższa cena
// osiągnięta w przetargu: <kwota> zł. Osoba ustalona jako nabywca
// nieruchomości: <name>." — for a negative round the city leaves the
// kwota/name blank with placeholder punctuation ("…._____... zł." /
// "…._____... .") instead of deleting the sentence, so
// achievedPriceFromText/buyerFromText gate on "does the captured group
// contain a real digit/letter", not on presence of the sentence itself. The
// generic phrase "zakończeniu przetargu wynikiem negatywnym" is NOT usable
// as a positive/negative signal on its own — it's part of the STANDARD
// wadium-refund boilerplate present in every article (pending or concluded)
// describing what happens in that hypothetical case.
//
// Scope: flats (lokal mieszkalny) and commercial units (lokal użytkowy) —
// address-keyed, matching the spike's BUILD verdict. Land ("nieruchomości
// gruntowej", incl. "ograniczony" auctions letting an adjacent owner improve
// their plot) and dzierżawa/wykaz (lease / pre-announcement) notices are OUT
// OF SCOPE for this build (seen live: id 131390 land, id 131198 archived
// wykaz-dzierżawa) — both are filtered by kind/title, matching Sopot's
// land-out-of-scope precedent. A follow-up can add `land[]` the way krakow
// does.
//
// Volume: THIN per snapshot (a handful of concluded rounds visible at a
// time) but the board publishes fresh P-NN/ROMAN/YY rounds continuously
// (P-58/VIII/26 seen live 2026-07-19) — expect steady, if not spike-level,
// accumulation across refresh runs.

export const config = {
  id: 'swidnica',
  // Gmina miejska Świdnica, powiat świdnicki (dolnośląskie). Alphabetical
  // TERYT convention for dolnośląskie powiaty (cross-checked against this
  // repo's own trzebnica=0220 / wolow(wołowski)=0222 / zlotoryja=0226
  // entries, all matching the standard GUS alphabetical ordering) places
  // powiat świdnicki at 0219 — NOT independently verified against the GUS
  // TERYT registry from this sandbox; confirm on first geoportal run.
  teryt: '021901_1',
  label: 'Świdnica',
  voivodeship: 'dolnoslaskie',
  authority: 'Prezydent Miasta Świdnicy (Wydział Mienia Komunalnego / MZN)',
  host: 'bip.swidnica.nv.pl',
  source: 'html',
};
