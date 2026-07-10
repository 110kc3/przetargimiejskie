// Nakło nad Notecią (województwo kujawsko-pomorskie, powiat nakielski) — Gmina
// Nakło nad Notecią (Burmistrz Miasta i Gminy Nakło nad Notecią) auctions
// municipal flats (mostly ul. gen. H. Dąbrowskiego + Potulicka in town, and
// several units in the village of Potulice) plus undeveloped land, on the same
// Logonet eUrząd BIP platform as Chełmno. See
// spikes/kujawsko-pomorskie/powiat-nakielski/naklo-nad-notecia.md.
//
// Shape (closest analog: Chełmno — SAME CMS VENDOR, Logonet eUrząd v2.9.0,
// identical URL scheme): server-rendered HTML with a clean per-page/per-record
// XML feed, no SPA, no auth, no bot blocks. UNLIKE Chełmno, there is no inline
// <rozstrzygniecie> element on the record XML — the achieved-price / negative
// outcome is published as a SEPARATE attachment ("Informacja o wyniku
// przetargu" / "... rokowań"), mixed .docx and .pdf, linked from the record's
// <zalaczniki>. See crawl.js for the routing + extraction.
//
// Volume (2026-07-10 live check): 96 board records; 22 "Lokal mieszkalny", 5
// "Nieruchomość zabudowana" (all observed so far are dzierżawa/najem leases,
// not sales — skipped), 69 "Nieruchomość niezabudowana" (land). A strong
// recurring flat pipeline, several currently open (Dąbrowskiego 29/15, 39/12,
// 44/6; Potulicka 26/3; Szkolna 3/27 and Działkowa 8/29 in Potulice, both
// having moved to "rokowania" after a failed III przetarg).
//
// `source: 'html'` — crawl.js extracts the board/record XML itself AND, for
// concluded records, fetches + extracts the result attachment itself
// (pdfText, falling back to docText for the .docx notices), handing each
// result ref a ready `.text` blob — so the refresh loop's OCR dispatch is
// bypassed (same pattern as Chełmno/Zabrze).

export const config = {
  id: 'naklo-nad-notecia',
  // UNVERIFIED best-effort TERYT — powiat nakielski is believed to be "0410"
  // and Nakło nad Notecią (gmina miejsko-wiejska) believed to be the 3rd gmina
  // in that powiat by registration order ("03"), "_4" = the miasto part (many
  // listings are also in the wiejski part, "_5", e.g. Potulice/Paterek — a
  // single per-city code can't disambiguate that). NOT verified against
  // eteryt.stat.gov.pl — confirm on first geoportal run before trusting this
  // for any parcel deep-link.
  teryt: '041003_4',
  label: 'Nakło nad Notecią',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Gmina Nakło nad Notecią',
  host: 'bip.gmina-naklo.pl',
  source: 'html',
};
