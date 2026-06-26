// Trzebinia (województwo małopolskie, powiat chrzanowski) — the Gmina (Urząd
// Miasta, Wydział Geodezji i Gospodarki Nieruchomościami) auctions municipal
// flats, buildings AND land, and publishes BOTH active "przetarg ustny
// nieograniczony na sprzedaż" announcements and achieved-price result notices
// ("Informacja Burmistrza … o wynikach przetargu") on its own city site. See
// SPIKE-NEIGHBORS.md.
//
// Shape (closest analog: Bytom / the FINN-BIP HTML cities — server-rendered, no
// OCR, no PDF for the body): the source is a Joomla "Tablica ogłoszeń → Ogłoszenia"
// board where each announcement is a full HTML article whose body carries the
// complete legal text AND a structured price table (Cena wywoławcza / Wadium /
// Termin przetargu). The standard Polish auction vocabulary means the shared
// `core/finn-bip.js` body parsers apply; the one deviation is that the cena
// wywoławcza lives in a TABLE cell (not the prose "wynosi … zł" form), so the
// adapter adds a table-tolerant price fallback. Result notices are prose and the
// achieved price reads "najwyższa cena osiągnięta w przetargu wyniosła: … zł".
//
//   BOARD:   https://trzebinia.pl/administracja-miasto-i-gmina/tablica-ogloszen/ogloszenia
//              (Joomla list, paginated via ?start=N) — a MIXED board (KOWR,
//              komunikaty, zarządzenia, sale przetargi, result notices), so items
//              are kept/dropped by TITLE keyword.
//   ARTICLE: …/ogloszenia/<id>-<slug>  (server-rendered HTML; full body + table)
//
// OUT OF SCOPE: the MZN housing company (mzn-trzebinia.pl) runs RENTALS ("na
// najem") on a different host — not ingested. The bip.malopolska.pl/umtrzebinia
// mirror is a JS SPA (empty to a plain fetcher) and redundant — trzebinia.pl
// carries the same full text.
//
// `source: 'html'` — the adapter fetches article HTML and extracts text itself.
//
// NOTE (confirm on first CI refresh): the Joomla board listing HTML structure +
// pagination depth were inferred from the article URLs (live article bodies were
// groundtruthed); confirm the index harvest on the first real run.

export const config = {
  id: 'trzebinia',
  teryt: '120304_4', // gmina miejsko-wiejska Trzebinia (powiat chrzanowski) — confirm on first geoportal run
  label: 'Trzebinia',
  voivodeship: "malopolskie",
  authority: 'Urząd Miasta w Trzebini',
  host: 'trzebinia.pl',
  source: 'html',
};
