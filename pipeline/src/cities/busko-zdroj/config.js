// Busko-Zdrój (Świętokrzyskie, powiat buski) — municipal property sales run by
// Burmistrz Miasta i Gminy Busko-Zdrój, Wydział Gospodarki Nieruchomościami
// i Rolnictwa (znak sprawy GNWR.6840.*).
//
// Single-host model (see spikes/swietokrzyskie/powiat-buski/busko-zdroj.md):
//   umig.busko.pl/ogloszenia — Joomla BIP portal, server-rendered, no auth,
//     no JS. Auction announcements are published as individual HTML articles
//     at /ogloszenia/{numeric-id}-{slug}.html. The full auction text (address,
//     powierzchnia użytkowa, cena wywoławcza, termin przetargu, wadium) is
//     inline in the article body as <p>/<strong>/<li> tags — clean diacritics.
//   dl.umig.busko.pl/bip/ogloszenia/… — text PDFs (source ogłoszenie + result
//     "Informacja o wynikach przetargu"). Both linked FROM the article page:
//       "Dokument źródłowy do pobrania [pdf]"    → announcement PDF
//       "Informacja o wynikach przetargu [pdf]"  → result PDF (achieved price)
//     The result link is added in-place once the auction concludes.
//
// The /ogloszenia feed is a large mixed stream (~5300 items: obwieszczenia o
// warunkach zabudowy / środowisku, przetargi, etc.), 10 items/page paginated
// at /ogloszenia.html?start=N. Property-sale auctions are a tiny fraction, so
// the crawler paginates a BOUNDED window of the most-recent pages and filters
// by the standard auction title ("przetarg ustny nieograniczony na sprzedaż
// nieruchomości komunalnych"). Active auctions and just-concluded ones (result
// PDF added ~2 weeks after the auction date) both sit near the top of the feed,
// so a modest page cap catches them; known-urls incremental skip + committed
// caches accumulate history across CI runs.
//
// A single announcement can list SEVERAL properties (flat + commercial + land);
// the parser keeps only lokal-mieszkalny records (classifyKind === 'mieszkalny').
//
// `source: 'html'` — announcement is HTML, results are born-digital text PDFs
// (pdftotext, no OCR). NOTE: pdftotext drops Polish diacritics on this host's
// result PDFs (ś/ż/ó vanish), so result-notice street_norm can differ from the
// HTML listing's (e.g. "kociuszki" vs "kosciuszki") — building+apt still match.
//
// Volume: ~1 lokal mieszkalny/year, in mixed batches. Spike LIVE-VERIFIED
// 2026-06-30; adapter groundtruthed against the Aug-2025 Kościuszki 7/6 batch.

export const config = {
  id: 'busko-zdroj',
  // TERYT gmina miejsko-wiejska Busko-Zdrój (powiat buski, świętokrzyskie).
  // Code 260101_3 — confirm on first geoportal run.
  teryt: '260101_3',
  label: 'Busko-Zdrój',
  voivodeship: 'swietokrzyskie',
  authority: 'Miasto i Gmina Busko-Zdrój',
  host: 'umig.busko.pl',
  source: 'html',
};
