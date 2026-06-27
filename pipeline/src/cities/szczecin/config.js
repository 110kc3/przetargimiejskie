// Szczecin — Zachodniopomorskie, miasto na prawach powiatu.
// Municipal flat auctions run by Wydział Mieszkalnictwa i Regulacji Stanów
// Prawnych Nieruchomości (WMiRSPN), pl. Armii Krajowej 1, pok. 306.
// Published on the ICOR Application Server BIP at bip.um.szczecin.pl under
// the "zbycie przetargowe → ogłoszenia" section (chapter_131207).
//
// Source format: born-digital server-rendered HTML. The listing index
// (chapter_131207.asp) renders its announcement list client-side via JS, BUT
// the same board exposes a full RSS feed (rss/131207/rss_131207.xml) that
// contains every announcement + result notice with its soid URL. Each
// soid detail page (chapter_131207.asp?soid=<GUID>) is fully server-rendered
// HTML — no JS required. This adapter uses the RSS feed as the index and
// fetches detail pages directly.
//
// `source: 'html'` — the adapter fetches + parses HTML directly; the
// refresh loop's OCR/pdfText dispatch is bypassed.
//
// Volume: 1 033 items in the RSS feed as of 2026-06-27, confirmed from
// live fetch. Flat auctions (przetarg ustny nieograniczony) ~ 15–30/year.
// Result notices (Informacja o wyniku) appear on the SAME board — both
// announcement and result streams live in chapter_131207.
//
// TERYT: 326101_1 — Szczecin grodzki (miasto na prawach powiatu).
// NOTE: confirm this code on the first geoportal run via uldk.gugik.gov.pl.
//
// STBS stream (miastooferuje.szczecin.eu) is a FUTURE second source —
// not implemented here. Focus is on the primary city-BIP flat stream.

export const config = {
  id: 'szczecin',
  teryt: '326101_1', // Szczecin grodzki — confirm on first geoportal run
  label: 'Szczecin',
  voivodeship: 'zachodniopomorskie',
  authority: 'Urząd Miasta Szczecin',
  host: 'bip.um.szczecin.pl',
  source: 'html',
};
