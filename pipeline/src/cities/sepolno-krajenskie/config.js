// Sępólno Krajeńskie (województwo kujawsko-pomorskie, powiat sępoleński) —
// gmina miejsko-wiejska; the Burmistrz Sępólna Krajeńskiego (Urząd Miejski,
// Referat Gospodarki Komunalnej i Rolnictwa) auctions municipal property —
// including lokale mieszkalne (flats), lokale użytkowe and garaże — via
// "przetarg ustny nieograniczony". See spikes/kujawsko-pomorskie/powiat-sepolenski/sepolno-krajenskie.md
// — VERDICT: BUILD (Low effort, LIVE-verified 2026-07-08).
//
// SINGLE-SOURCE architecture, LIVE-verified 2026-07-11:
//   City BIP bip.gmina-sepolno.pl runs the extranet "BIP w JST" (gov.pl-BIP)
//   CMS — clean server-rendered HTML, NO JS gate/SPA/CAPTCHA. One board drives
//   everything:
//     Przetargi board  /657/405/przetargi.html   (paginated ?Page=N)
//   Each notice URL /<docid>/405/<slug>.html 301-redirects to /<docid>/<slug>.html
//   (core/fetch.js follows redirects). Every notice page carries a STRUCTURED
//   inline metadata block ("cct-page__name"/"cct-page__value" pairs): Rodzaj
//   przetargu / Rodzaj nieruchomości / Cena wywoławcza / Data przetargu / Rok
//   (+ optional Adres nieruchomości) — so kind + starting price + auction date
//   parse straight from HTML, no PDF needed. Deep fields (powierzchnia użytkowa)
//   and the achieved-price stream come from born-digital PDFs attached at
//   /download/attachment/<attId>/<name>.pdf:
//     * the ogłoszenie ("...ogloszenie..."/"...akt-ogloszenia..." — first
//       attachment) → powierzchnia użytkowa via core/pdf-text.js (pdfText).
//     * the "informacja o wyniku przetargu" ("...wynik...") → cena osiągnięta +
//       nabywca (sold) or "brak"/"wynikiem negatywnym" (unsold).
//   Both PDFs are born-digital → pdfText (pdftotext -layout), NEVER OCR.
//
// TLS caveat: the host ships an INCOMPLETE certificate chain (omits the
// intermediate CA, like bip.miastozabrze.pl / boleslawiec) — every fetch here
// passes `insecureTLS: true` + a browser UA (see crawl.js FETCH_OPTS and
// core/fetch.js's insecure-TLS path). We invent no new mechanism; core handles it.
//
// Scope (v1): address-keyed SALE notices only — flats (mieszkalny), commercial
// units (uzytkowy), garaże (garaz), built property (zabudowana) → listings.
// Land (działki/grunt — compound multi-parcel notices with net/brutto VAT
// prices) and lease (dzierżawa) are detected and skipped; wykaz board 402
// (pre-auction designations) is not crawled in v1 (see crawl.js). Volume is low
// (~1-3 flat auctions/yr, interleaved with land/lease).
//
// `source: 'html'` — crawlResultDocs() extracts the result-PDF text itself
// (pdfText) and attaches it as ref.text; refresh.js's parse loop reads ref.text.

export const config = {
  id: 'sepolno-krajenskie',
  // TERYT: powiat sępoleński = 0416 (solid). Gmina Sępólno Krajeńskie believed
  // to be gmina 02 within the powiat (alphabetical among Kamień Krajeński,
  // Sępólno Krajeńskie, Sośno, Więcbork); '_4' = miasto within the
  // miejsko-wiejska gmina (same convention as naklo-nad-notecia '041003_4').
  // Both the gmina digit and the rodzaj are BEST-EFFORT — confirm on first
  // geoportal run before trusting this.
  teryt: '041602_4',
  label: 'Sępólno Krajeńskie',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Urząd Miejski w Sępólnie Krajeńskim',
  host: 'bip.gmina-sepolno.pl',
  source: 'html',
};
