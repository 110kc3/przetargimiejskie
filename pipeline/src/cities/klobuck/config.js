// Kłobuck (województwo śląskie, powiat kłobucki) — Gmina Kłobuck (Burmistrz
// Kłobucka) sells municipal flats + developed/undeveloped land at open oral
// auction ("przetarg ustny nieograniczony na sprzedaż"), with I→IV repeat rounds
// and occasional "rokowania" after a failed auction. See
// spikes/slaskie/powiat-klobucki/klobuck.md.
//
// SOURCE — the main town CMS `gminaklobuck.pl` (a bespoke server-rendered PHP
// portal). Announcements AND "Informacja o wyniku …" results are plain inline
// HTML detail pages at `/ogloszenie/<slug>-<id>`, discovered off the paginated
// `/ogloszenia?page=N` board. No PDF, no OCR, no SPA. A browser User-Agent is
// used (harmless if unneeded); the default bot UA also returns the full body.
// NOT the `bip.gminaklobuck.pl` IntraCOM mirror — that host serves a BROKEN TLS
// cert (hostname mismatch), so the town portal is the source of record.
//
// ⚠️ Śląskie = PUBLIC-TIER: a crawl error/timeout fails CI for everyone, so
// crawl.js is bounded (MAX_PAGES/MAX_DETAILS/MAX_FETCHES) and never throws.
//
// `source: 'html'` — the adapter fetches + strips every notice itself and hands
// each result ref a ready `.text` blob, so the refresh loop's OCR / pdf-text
// dispatch is bypassed (like wolow / kolbuszowa).

export const config = {
  id: 'klobuck',
  teryt: '240405_3', // gmina miejsko-wiejska Kłobuck (woj. śląskie 24, powiat
  //                    kłobucki 04, gmina 05, type 3 miejsko-wiejska) — best-effort,
  //                    confirm on the first geoportal/ULDK run.
  label: 'Kłobuck',
  voivodeship: 'slaskie',
  authority: 'Gmina Kłobuck',
  host: 'gminaklobuck.pl',
  source: 'html',
};
