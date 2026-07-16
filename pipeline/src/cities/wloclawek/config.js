// Włocławek (woj. kujawsko-pomorskie, miasto na prawach powiatu) — Gmina Miasto
// Włocławek runs genuine "przetarg ustny nieograniczony" auctions for municipal
// property (lokale mieszkalne, built-property shares, commercial units, garages,
// land) via the city BIP. See
// spikes/kujawsko-pomorskie/wloclawek/wloclawek.md — VERDICT: BUILD (Medium
// effort, LIVE-verified 2026-06-27).
//
// CMS, LIVE-verified 2026-07-16: bip.um.wlocl.pl (the spike's host) 302-redirects
// to the canonical host bip.wloclawek.eu, which runs the SAME extranet
// "BIP w JST" (gov.pl-BIP) CMS already built for Sępólno Krajeńskie
// (bip.gmina-sepolno.pl, see ../sepolno-krajenskie/) — identical
// <h1 class="pageHeader">, the structured inline "cct-page__name"/
// "cct-page__value" metadata block, and /download/attachment/<id>/<name>
// attachment links. This is NOT the CMS behind Toruń/Bydgoszcz (a different
// city-BIP stack) — the spike's "regional KP platform" phrase refers to this
// shared vendor, confirmed here by direct comparison, not to those two cities.
//
//   Board  /2730/ogloszenia-o-przetargach-nieruchomosci.html  (paginated ?Page=N)
//   Each notice /<docid>/726/<slug>.html carries the metadata block (Typ
//   przetargu / Rodzaj nieruchomości / Rok publikacji / Status Realizacji /
//   Data przetargu / Godzina przetargu / Adres nieruchomości / Cena wywoławcza)
//   AND the body prose (area_m2, prior-round self-reports) inline — NO PDF is
//   needed for LISTINGS (unlike Sępólno, which needs a PDF for area_m2; here the
//   flat's own "o powierzchni NN,NN m²" sentence is right in the notice body).
//
//   Achieved-price stream: a concluded notice attaches an "informacja o wyniku
//   przetargu" / "informacja o rozstrzygniętym przetargu" document. LIVE
//   fixtures (2026-07-16), both real, both SOLD:
//     - Kilińskiego 12A/1 (lokal mieszkalny, III przetarg): BOTH a born-digital
//       PDF (wynik-przetarg-kilinskiego.pdf, pdftotext succeeds cleanly) AND a
//       "dokument dostępny cyfrowo" DOCX twin — crawl.js prefers the DOCX.
//     - Jagiellońska 2/4 (udział 271/350 w zabudowanej budynkiem mieszkalnym
//       nieruchomości, III przetarg): ONLY a **scanned** PDF (no text layer —
//       pdftotext returns a single \f byte, the documented scanned-PDF
//       form-feed-junk gotcha) — crawl.js falls back to core/ocr-pdf.js.
//   crawl.js therefore: prefer .docx (docText) > pdfText > ocrPdf-on-near-empty,
//   never trusting a near-empty/\f-only pdfText output as real text.
//
//   KNOWN LIMITATION (v1): unresolved rounds ("Status Realizacji:
//   Nieroztrzygnięte") carry NO result attachment on this board — the negative
//   outcome is only self-reported in the NEXT round's prose ("...i zakończył się
//   wynikiem negatywnym"). Checked live across 5 Nieroztrzygnięte entries
//   (Kilińskiego II round, Jagiellońska II round, 3 land entries) — none had a
//   result attachment. crawlResultDocs() therefore only yields SOLD records for
//   this city; parseResultDoc()'s unsold branch is defensive-by-construction
//   (same shape as the confirmed sibling Sępólno Krajeńskie template) but NOT
//   live-verified against a real Włocławek negative-result document — flag for
//   follow-up if one surfaces.
//
// Volume matches the spike: exactly one flat (Kilińskiego 12A/1 — I round
// 2023-06-12 negative, II round 2023-11-13 negative, III round 2024-04-24 SOLD)
// plus a handful of other address-keyed sales (e.g. Jagiellońska 2/4 udział)
// across 81 board entries — thin, dominated by land/lease. Genuinely BUILD, not
// zero/fake: the przetarg stream is real and concluded with a real buyer.
//
// Scope (v1, mirrors sepolno-krajenskie): address-keyed SALE kinds only
// (mieszkalny/zabudowana/uzytkowy/garaz). Land (grunt) and lease
// (najem/dzierżawa) are detected and skipped. Notices explicitly naming "Skarbu
// Państwa" (State Treasury, not the gmina) as owner are also skipped — this
// board mixes both gmina and Skarb Państwa auctions under one category.
//
// `source: 'html'` — crawlResultDocs() extracts the result-doc text itself
// (docText/pdfText/ocrPdf) and attaches it as ref.text; refresh.js's parse loop
// reads ref.text directly.

export const config = {
  id: 'wloclawek',
  // TERYT: Włocławek grodzki (miasto na prawach powiatu), woj. kujawsko-pomorskie
  // 04. Best-effort by GUS TERC ordering among the voivodeship's city-counties
  // (Bydgoszcz 0461, Grudziądz 0462, Toruń 0463, Włocławek 0464) — same
  // disclaimer style as bydgoszcz/torun's config.js: confirm on first geoportal
  // run before trusting this.
  teryt: '046401_1',
  label: 'Włocławek',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Gmina Miasto Włocławek',
  host: 'bip.wloclawek.eu',
  source: 'html',
};
