// Kolbuszowa — gmina miejsko-wiejska, województwo podkarpackie, powiat
// kolbuszowski.
//
// Burmistrz Kolbuszowej sells municipal property — mostly building/land plots,
// and (~1 per year, irregularly) residential flats — via "publiczny przetarg
// ustny nieograniczony na sprzedaż". The authoritative surface is the town BIP
// `bip.kolbuszowa.pl`, which runs **Pro3W CMS** (server-rendered HTML;
// `<meta name="generator" content="Pro3W CMS system v2015">`). No auth, no bot
// gating (bot UA and browser UA return byte-identical pages), no JS rendering.
//
// STRUCTURE (see crawl.js for the full discovery trail):
//   - Board `/63-przetargi.html` groups tenders under three parent categories:
//     "Zamówienia Publiczne" (procurement — SKIP), "Pozostałe przetargi" (cars
//     etc. — SKIP) and **"Sprzedaż nieruchomości"** (property sales — the target).
//   - Each parent has one per-year child category `/63-przetargi/<ID>-YYYY-r.html`,
//     paginated `?strona=N` (0-indexed; requesting past the last page CLAMPS to
//     the last page). The per-year category IDs are NOT derivable — the crawler
//     DISCOVERS the "Sprzedaż nieruchomości" year-categories dynamically from the
//     board index's nav tree (parent-then-years order), so new years/IDs are
//     picked up automatically.
//   - Each announcement is a detail page whose fields (address, area, cena
//     wywoławcza, auction date, round) are rendered as INLINE HTML prose inside
//     `<div class="art-body clearfix"> … <div id="akapitBody">` (recent notices;
//     older ones ship the text only as a PDF attachment — not needed for active
//     listings, which are always recent/future-dated).
//
// RESULTS ("Informacja o wyniku przetargu" / "Wynik przetargu") are SCANNED PDF
// attachments on each flat's own detail page — parsed via core/ocr-pdf.js
// (tesseract -l pol @300dpi; the embedded text layer is garbled, fresh OCR is
// clean). `source: 'html'` (per ADAPTER-GUIDE §2: the adapter extracts its own
// attachments; 'pdf' is only the legacy OCR-dispatch path) — crawlResultDocs
// does the OCR itself and hands parseResultDoc the text via `ref.text`.
//
// SCOPE: this is a FLAT-focused adapter. crawlActive emits BOTH flats
// (address-keyed) and active land plots (kind 'grunt' → land.json, inline HTML,
// no OCR). crawlResultDocs OCRs achieved-price results for FLATS ONLY — the
// ~180 land plots each carry their own scanned result PDF and OCRing all of them
// every run is infeasible on this project's Pi runner; land achieved-prices are
// a documented out-of-scope residual, not a bug. See spikes/podkarpackie/
// powiat-kolbuszowski/kolbuszowa.md (VERDICT: BUILD, Low effort). Closest
// analog: `wolow` (inline-HTML fields parsed from the page body, classify-on-
// body, multi-round auctions) + `brzeg` (scanned "Informacja o wyniku" result
// PDFs) — this build borrows the field grammar from the former and the
// result-PDF handling from the latter.
//
// NOTE: teryt is a best-effort estimate from the standard TERYT convention
// (podkarpackie 18, powiat kolbuszowski 07, gmina Kolbuszowa 03 miejsko-wiejska,
// rodzaj 3 = whole-gmina aggregate) → `180703_3` in this repo's WWPPGG_R form
// (same "_3 whole-gmina" convention as wolow/trzebnica). CONFIRM on first
// geoportal/ULDK run before trusting it for deep-links.

export const config = {
  id: 'kolbuszowa',
  teryt: '180703_3', // gmina miejsko-wiejska Kolbuszowa (powiat kolbuszowski) — confirm on first geoportal run
  label: 'Kolbuszowa',
  voivodeship: 'podkarpackie',
  authority: 'Urząd Miejski w Kolbuszowej (Burmistrz Kolbuszowej)',
  host: 'bip.kolbuszowa.pl',
  source: 'html',
};
