// Szczecinek (Gmina Miasto Szczecinek — Urząd Miasta, Wydział Gospodarki
// Nieruchomościami; województwo zachodniopomorskie, powiat szczecinecki) sells
// municipal flats, built property and land via `przetarg ustny nieograniczony`,
// published on the TOWN's city BIP bip.szczecinek.pl — NOT the rural Gmina
// Szczecinek (bip.gminaszczecinek.pl, a separate JST, out of scope). See
// spikes/zachodniopomorskie/powiat-szczecinecki/szczecinek.md.
//
// Shape (closest analog: tarnowskie-gory / kedzierzyn-kozle / skarzysko-kamienna
// — SAME Logonet eUrząd hosted-BIP CMS, footer "Wersja systemu 2.9.0"), but
// server-rendered straight off the boards: no JSON API is exposed here (the
// `/api/menu/<id>/articles` route TG uses 404s on this host — same gap
// kedzierzyn-kozle's own notes flag for that CMS install), and no XML
// page-count feed like skarzysko. Verified live 2026-07-10/11:
//
//   LIST (paginated 10/page): /artykuly/<catId>/<page>/<perPage>/<slug>
//     (page 1 is also reachable without /<page>/<perPage>/ at all)
//     zbycie root board 336 -> YEAR sub-boards, discovered live from 336's own
//       page (645=2026, 595=2025, 547=2024, ... a new one appears every Jan) ->
//       announcements + wykazy; land-dominated (~2-3 flats/yr).
//     results board 338 (own separate pagination; 7 pages/~65 items as of the
//       build) -> "Informacja o wyniku przetargu" notices — NOT interleaved
//       with the zbycie boards, must be crawled separately.
//   ARTICLE: /artykul/<catId>/<docId>/<slug> — server HTML; body text sits in
//     <section class="wysiwyg">…</section>; an optional "Załączniki" section
//     links /attachments/download/<fileId> (a born-digital PDF).
//
// LOAD-BEARING QUIRKS (see parse.js/crawl.js headers for the regex-level
// detail; this is the "don't re-discover these" summary):
//  - Announcement bodies already carry every field inline (address / area /
//    cena wywoławcza / wadium / date) — parsed straight from the HTML, no PDF
//    fetch needed for the active/wykaz stream.
//  - Result notices (board 338) are NOT uniform. A solo lokal-mieszkalny
//    result is consistently a BARE STUB: just the "informację o wyniku
//    przetargu z dnia D.M.R na sprzedaż …" sentence, no PDF, no price
//    anywhere on the page (repeat-fetched byte-identical for every flat
//    result sampled). Land/mixed-batch results DO carry a PDF with a
//    per-parcel table that can bundle several parcels from one przetarg
//    session in a single PDF (up to 7 rows seen) — parseResultDoc splits
//    these into one record per row.
//  - Round is a ROMAN NUMERAL prefixing the CURRENT attempt ("III przetarg
//    ustny nieograniczony …"); word ordinals ("Pierwszy przetarg odbył się
//    …") only narrate PRIOR rounds in past tense elsewhere in the same body.
//  - Amounts are dot-thousands/comma-grosze ("130.000,00 zł"), but the
//    results-table PDF renders the grosze separator as "." instead of "," on
//    some rows (font/kerning artifact, e.g. "120.000.00" meaning
//    120 000,00 zł) — parsePLN treats the LAST 2-digit group as grosze
//    whether it's comma- or dot-separated.
//  - obręb is a bare number here ("w obrębie 09" / "obr. 13"), not a name.
//
// TERYT 321501_1 (gmina miejska Szczecinek, powiat szczecinecki) — CONFIRMED
// (not a placeholder) via three independent live ULDK GetParcelById lookups
// against real parcels seen in this crawl (321501_1.0013.14/7,
// 321501_1.0008.168/2, 321501_1.0007.466/2 all resolve); ULDK's own
// `result=teryt,voivodeship,county,commune` echoes "zachodniopomorskie|powiat
// szczecinecki|Szczecinek (miasto)" for the same id.
//
// `source: 'html'` — crawlResultDocs() refs always carry `.text` (the HTML
// body for stub results, or the attachment PDF's extracted text when one
// exists); refresh.js's OCR/pdf-text dispatch is bypassed.

export const config = {
  id: 'szczecinek',
  teryt: '321501_1', // gmina miejska Szczecinek — confirmed live via ULDK (see above).
  label: 'Szczecinek',
  voivodeship: 'zachodniopomorskie',
  authority: 'Urząd Miasta Szczecinek',
  host: 'bip.szczecinek.pl',
  source: 'html',
};
