// Pajęczno (Łódzkie, powiat pajęczański) — municipal flat sales run directly by
// Urząd Miejski w Pajęcznie (Referat Nadzoru Komunalnego, Gospodarowania
// Nieruchomościami Gminy, Ochrony Środowiska i Rolnictwa; no separate ZGM/TBS).
//
// See spikes/lodzkie/powiat-pajeczanski/pajeczno.md for the full spike.
//
// Single-host model — Sulimo city-portal CMS (server-rendered HTML, no auth,
// no JS-SPA; assets on cdn02.sulimo.pl):
//   BOARD:   pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/
//            (paginated ?p=N) — carries flat + land przetarg announcements,
//            wykaz pre-announcements, and (occasionally) "Informacja o wyniku
//            przetargu" result notices, all mixed on one board.
//   DETAIL:  .../n,{ID},{slug}.html — full announcement text is INLINE HTML
//            (no OCR needed); a scanned PDF is attached as a supplementary
//            copy. Result notices are the exception: the one confirmed live
//            example (n,354725, 2022) has an EMPTY inline body — its text is
//            ONLY in the attached scanned PDF, so crawlResultDocs() OCRs that
//            attachment when the inline body is empty.
//
// A secondary source — e-bip.pl (ABC PRO, ASP.NET server-HTML) — carries a
// dedicated "Sprzedaż lokali mieszkalnych wraz z udziałem w gruncie" category
// (0 current / 6 archived) that mirrors the same Sulimo announcements rather
// than adding new data (verified live 2026-07-10: its 6 archived entries are
// the same 3 live flat announcements + 2 wykaz notices + 1 bezprzetargowa
// notice already reachable from the Sulimo board). Not crawled separately —
// would be pure duplication for no incremental coverage.
//
// `source: 'html'` — the primary announcement text is server-rendered HTML;
// OCR (core/ocr-pdf.js) is used opportunistically only for result-notice PDFs
// that have no inline text (confirmed necessary for the one 2022 example).
//
// Volume: small but recurring — 3 concurrent open flat auctions + a matching
// wykaz + 6 land parcel (Niwiska Dolne) auctions live as of the 2026-07-08
// spike / 2026-07-10 build. Whole board (both pages) spans back to 2021.

export const config = {
  id: 'pajeczno',
  // TERYT for gmina miejsko-wiejska Pajęczno (powiat pajęczański 1009, woj.
  // łódzkie 10) — the combined miasto+gmina unit the Burmistrz/Urząd Miejski
  // governs, per GUS TERYT (powiat pajęczański = 1009; gmina Pajęczno = gmina
  // nr 04 within it, rodzaj 3 = miejsko-wiejska → 1009043). Confirm on first
  // geoportal run.
  teryt: '100904_3',
  label: 'Pajęczno',
  voivodeship: 'lodzkie',
  authority: 'Urząd Miejski w Pajęcznie',
  host: 'pajeczno.pl',
  source: 'html',
};
