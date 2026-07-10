// Pleszew (Wielkopolskie, powiat pleszewski) — Miasto i Gmina Pleszew (Urząd
// Miasta i Gminy w Pleszewie, Wydział Gospodarki Nieruchomościami i
// Planowania Przestrzennego) sells municipal property — including lokale
// mieszkalne — via przetarg ustny nieograniczony/ograniczony na sprzedaż, run
// by the Burmistrz Miasta i Gminy Pleszew. See
// spikes/wielkopolskie/powiat-pleszewski/pleszew.md.
//
// Host: bip.pleszew.pl — WOKISS-hosted BIP CMS (same family as chodziez,
// jarocin, kalisz, ostrow-wielkopolski). Re-verified live 2026-07-10: every
// board fetched was full server-rendered HTML on a plain GET — no JS/SPA, no
// headless render needed. `needsRender` intentionally omitted (falsy
// default).
//
// Board layout: ONE consolidated year-scoped page per year (2012-2026, plus
// a pre-2012 archive), UNLIKE chodziez's separate ogloszenia/wyniki/wykazy
// boards:
//   .../bip/ogloszenia-20131/ogloszenia-dot.-nieruchomosci/ogloszenia-<YYYY>.html
// mixes SALE announcements, SALE results ("Informacja o wyniku przetargu"),
// wykazy (pre-auction designations — mostly dzierżawa/najem/użyczenie/
// bezprzetargowo noise), and misc notices (qualified-bidder lists, schedule-
// setting notices) as inline <h2>+<p> entries on ONE page. Per-year URL
// SLUGS are irregular (2025 is "ogloszenia,-decyzje-2025.html" with a comma;
// 2013/2014/2016/2017 carry a trailing "1") — crawl.js discovers the correct
// URL per year from the live nav list on the hub page rather than
// hardcoding a template.
//
// Each entry's inline HTML prose is a short teaser WITHOUT price/date/wadium
// — those numbers live ONLY in the linked born-digital PDF
// (zasoby/files/{nieruchomosci,ogloszenia}/<YYYY>/*.pdf — the subfolder
// varies by year, another reason hrefs are resolved exactly as given, never
// reconstructed from a template). crawl.js uses the teaser text to
// classify+route (sale-announcement / sale-wykaz / lease-or-other — skip)
// and only fetches the PDF (pdfText, cached) for entries worth keeping.
//
// A REAL correctness trap found + fixed while building this adapter: the
// board is an ARCHIVE, so a concluded (already-resulted) announcement stays
// visible forever with its original "ogłasza ... przetarg ... na sprzedaż"
// teaser intact. Naively treating every sale-shaped teaser as a pending
// listing would resurrect long-concluded (often unsold/recycled) auctions as
// "active" on every run. crawl.js gates on whether the SAME entry also
// carries a "Informacja o wyniku przetargu"-labeled link: if so, the
// announcement is concluded (handled via crawlResultDocs/parseResultDoc
// instead) and excluded from crawlActive()'s listings/land. See parse.js's
// header for two more real bugs (Polish accusative-case diacritic suffixes)
// caught by testing field extractors against real fetched fixtures before
// writing the test file.
//
// Volume: LOW — confirmed live 2026-07-10. The only currently-open sale in
// the 2025-2026 crawl window is a land auction (Nowa Wieś, IV przetarg,
// posted 2026-07-09, auction 2026-08-18 — the SAME 3 parcels recycled
// through I->II->III->IV since mid-2025). The flagship flat asset (ul.
// Zachodnia 1, lokale nr 1 + nr 2, 1/2 udział each) cycled through I (Oct
// 2024) and II (Jan 2025) przetarg, BOTH unsold (no bidders/no wadium paid)
// — dormant since Feb 2025, consistent with the spike's "thin but
// recurring" call; no flat is currently open. Achieved-price stream
// confirmed live with BOTH real sold and unsold examples (see
// parse-pleszew.test.js) — e.g. a Kalisz flat (nieruchomość lokalowa nr 4,
// ul. Młynarska 13 — a Pleszew-owned unit physically in neighbouring Kalisz)
// sold for 227 000 zł against a 232 500 zł starting price.

export const config = {
  id: 'pleszew',
  // Gmina miejsko-wiejska Pleszew (powiat pleszewski 302000, wielkopolskie).
  // Whole-gmina TERYT cross-checked live 2026-07-10 via GUS BDL
  // (bdl.stat.gov.pl/bdl/dane/teryt/jednostka/3510) and wykaz.rky.pl:
  // 3020063 gmina / 3020064 miasto / 3020065 obszar wiejski. Using the "_4"
  // (miasto) rodzaj digit to match this codebase's convention for other
  // "Miasto i Gmina" mixed adapters (olkusz, chrzanow, olesno,
  // naklo-nad-notecia all use their own "_4" code) — MEDIUM-HIGH confidence
  // (web-cross-checked against two independent sources, not yet
  // ULDK-verified) — confirm on first geoportal run.
  teryt: '302006_4',
  label: 'Pleszew',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miasta i Gminy w Pleszewie',
  host: 'bip.pleszew.pl',
  source: 'html',
};
