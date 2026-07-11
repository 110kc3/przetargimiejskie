// Jarocin — gmina miejsko-wiejska, województwo wielkopolskie, powiat jarociński.
//
// Burmistrz Jarocina (Urząd Miejski w Jarocinie, Al. Niepodległości 10) sells
// municipal property — mostly LAND (działki), with the occasional flat
// (nieruchomość lokalowa) — via "ustny przetarg [nie]ograniczony na sprzedaż".
// The machine-readable surface is the WOKISS BIP `bip2.wokiss.pl/jarocin`
// (mirror `www.wokiss.pl/jarocin`): a year-indexed HTML menu whose notices are
// born-digital text PDFs (pdftotext, no OCR). Both announcements ("Ogłoszenie
// ... przetargu ...") and results ("Informacja o wyniku przetargu") live on
// the same board — the adapter extracts the attachments itself, hence
// `source: 'html'` (NOT the OCR-dispatch 'pdf' path). Server-rendered HTML +
// text PDFs — no JS rendering needed, so no `needsRender`.
//
// Closest analog cloned: `brzeg` (WordPress/custom-HTML board → per-notice
// pages → born-digital result PDFs via core/pdf-text.js `pdfText` →
// parseResultDoc). No existing adapter used the WOKISS CMS
// (`grep -rl wokiss src/cities` = empty at build time), so brzeg — the nearest
// text-PDF + HTML-index family member — was the base; the round/date helpers
// were adapted for Jarocin's Polish-ordinal-WORD rounds and word-month dates.
//
// TERYT: ULDK-CONFIRMED at the gmina level (not a bare guess): two independent
// rural parcels resolve to identifiers under `300602_5.*` (obszar wiejski) and
// a land-announcement PDF embeds `300602_5.00015.AR_2.415/3` verbatim — so
// woj 30 (wielkopolskie), powiat 06 (jarociński), gmina 02 (Jarocin). The
// whole miejsko-wiejska gmina aggregate is rodzaj `_3` → `300602_3` (town part
// = `300602_4`, rural = `300602_5`). Confirm on first geoportal run.

export const config = {
  id: 'jarocin',
  teryt: '300602_3', // gmina miejsko-wiejska Jarocin — ULDK-confirmed 300602_*; confirm on first geoportal run
  label: 'Jarocin',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miejski w Jarocinie (Burmistrz Jarocina)',
  host: 'bip2.wokiss.pl',
  source: 'html',
};
