// Choszczno (województwo zachodniopomorskie, powiat choszczeński) — Gmina
// Choszczno (Burmistrz Choszczna) auctions municipal flats, houses and land at
// "przetarg ustny nieograniczony" via a custom BIP CMS. See
// spikes/zachodniopomorskie/powiat-choszczenski/choszczno.md (re-verified LIVE
// 2026-07-06 — the original desk "empty body" was an unfollowed 301, not a
// block; core/fetch.js's getText already follows redirects, so no workaround
// is needed here).
//
// Shape (closest live analog: chełmno's blob-parser architecture, adapted from
// chełmno's clean XML feed to a year-tree HTML walk + PDF-attachment
// extraction — see crawl.js/parse.js headers for the full rationale):
//
//   YEAR TREE:  /artykul/ogloszenia  →  /artykul/ogloszenia-<YYYY>-r  (2003-2026)
//                 →  a row titled "Przetargi" (arbitrary target slug, e.g.
//                    /artykul/przetargi-2008 for 2026 — resolved from the year
//                    page's own table every run, never hardcoded)
//                 →  one row per announcement: <tr><td><a href="/artykul/…">
//                    TITLE</td><td>YYYY-MM-DD hh:mm:ss</td> — note the missing
//                    closing </a> (confirmed live), so the title is parsed up
//                    to </td>, not </a>.
//   ARTICLE:    /artykul/<slug> — server-rendered HTML with an <h1> title and
//                 an attachment table. Body text is NOT inline HTML (unlike
//                 chełmno) — it lives in PDF attachments (scanned, but with an
//                 OCR text layer pdftotext already extracts, degraded diacritics
//                 e.g. "tiybu"/"Pizetarg" for "trybu"/"Przetarg").
//   ATTACHMENTS: routed by FILENAME prefix (confirmed live on 3 real cases):
//                 "ogloszenie-…pdf" = the announcement (always present) —
//                 structured field table (Miejscowość / Typ nieruchomości /
//                 Cena wywoławcza / Opis nieruchomości) + prose auction date.
//                 "informacja-…pdf" = the result, added days/weeks after the
//                 auction is HELD — present for both sold AND unsold/negative
//                 outcomes (round IV of Rycerska 2/4 failed and still got an
//                 "informacja-o-wyniku-iv-przetargu-ustnego.pdf"). A case
//                 (article) with only the ogłoszenie attachment is still
//                 pending; one with both is concluded.
//
// Real fixtures groundtruthing the parser (verified live 2026-07-10):
//   ul. Rycerska 2/4    — round V SOLD 2026-03-06, 230 000 → 236 900 zł
//   ul. Rycerska 2/4    — round IV UNSOLD 2025-05-12 (niestawiennictwo oferenta)
//   ul. Fabryczna 5     — round I SOLD 2026-03-13, 177 000 → 178 770 zł (a HOUSE
//                         — "Budynek mieszkalny wraz z dwoma budynkami
//                         gospodarczymi" — kind 'zabudowana', not a flat)
//
// Scope note: the year board mixes flats/houses with land and dzierżawa/najem
// leases (leases skipped outright). crawl.js filters on the board row's title
// BEFORE fetching the article: only titles carrying a ul./al./pl./os. street
// token are fetched; a title with no street token at all (e.g. "… - obr. Stary
// Klukom", "… - działka nr 216 obr. 3 m. Choszczno") is skipped, uncrawled.
// This is a real but PARTIAL land filter, not a full one — confirmed live
// 2026-07-10: some land parcels ARE announced with a street token in the title
// too (a plot fronting a named street, e.g. "… ul. Ogrodowa działka 121/1"),
// so those DO get fetched, and kindFromText correctly still routes them to
// land.json (classifyKind reads the OGŁOSZENIE's prose, not the title). What
// this DOESN'T give is full-fidelity land field extraction: the OGŁOSZENIE PDF
// template varies across years/kinds (at least 3 generations observed live —
// a "1.Miejscowość/Typ nieruchomości" field table for 2025-2026 flats/houses,
// free-form prose for 2023 land, a numbered multi-parcel list for some
// multi-plot 2023 land batches) and parse.js's dzialka_nr/price/date
// extraction only reliably covers the field-table style plus one free-prose
// fallback. A land record can legitimately come through with some fields null
// (never garbage — see parse.js's parcelFromText header for the specific live
// false-positive it guards against). Land coverage past that is intentionally
// out of scope here — the task's focus (and this file's fixtures) is the
// flat/house + achieved-price stream, which the current template serves in
// full.
//
// `source: 'html'` — the adapter extracts the PDF attachments itself and hands
// each result ref a ready `.text` blob (buildRecordText), so refresh.js's own
// OCR/pdf-text dispatch is bypassed (same convention as chełmno/drawsko-pomorskie).
//
// Volume: ~1 distinct flat every 1-2 years (Rycerska 2/4 alone generated 5
// announcement rounds over 18 months); land/dzierżawa dominates the raw row
// count (9-20 rows/year recently). Cheap to run.

export const config = {
  id: 'choszczno',
  // TERYT for gmina miejsko-wiejska Choszczno (powiat choszczeński 3202,
  // zachodniopomorskie 32) — confirm on the first geoportal run.
  teryt: '320202_3',
  label: 'Choszczno',
  voivodeship: 'zachodniopomorskie',
  authority: 'Gmina Choszczno',
  host: 'bip.choszczno.pl',
  source: 'html',
};
