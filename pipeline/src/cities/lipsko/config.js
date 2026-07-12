// Lipsko — gmina miejsko-wiejska, województwo mazowieckie, powiat lipski.
//
// Burmistrz Miasta i Gminy Lipsko sells municipal property — predominantly land
// (nieruchomość gruntowa niezabudowana / działki), plus occasional flats — via
// "przetarg ustny nieograniczony/ograniczony na sprzedaż". The machine-readable
// surface is the unit's **samorzad.gov.pl** portal (the national govpl/Liferay
// BIP template), host `samorzad.gov.pl`, unit path
// `/web/miasto-i-gmina-lipsko`.
//
// SOURCE SHAPE (confirmed live 2026-07-12 from this Pi's Polish IP — the spike's
// DESK read was partly wrong, see crawl.js/parse.js headers):
//   * DISCOVERY: the unit SITE MAP `/web/miasto-i-gmina-lipsko/mapa-strony?
//     show-bip=true` is SERVER-RENDERED (~1.27 MB, ~1400 article links with
//     anchor text) — this is the walkable index, NOT the `/przetargi` page
//     (which is a PUBLIC-PROCUREMENT hub: zamówienia publiczne, out of scope).
//   * ARTICLE PAGES are server-rendered too (NOT a JS SPA — needsRender:false),
//     but the field-bearing content arrives one of TWO ways:
//       (a) INLINE prose inside `<div class="editor-content">` (older notices,
//           ~2024) — parsed directly from HTML; OR
//       (b) a SCANNED-image PDF attachment at `/attachment/<uuid>` (most 2025+
//           notices) — pdftotext yields nothing (no font layer, one full-page
//           JPEG per A4 page), so the adapter OCRs it via core/ocr-pdf.js.
//     The same inline-vs-PDF split affects BOTH announcements and results.
//   * `source: 'html'` (NOT 'pdf'): the adapter fetches + OCRs attachments
//     ITSELF inside crawl.js and hands parseResultDoc the extracted text —
//     the legacy 'pdf' OCR-dispatch path in refresh.js is not used.
//
// The achieved-price stream is REAL and confirmed (unlike the wolow analog's
// unsold-only inference): "Informacja o wyniku przetargu" notices state
// "cena wywoławcza … cena osiągnięta …" + nabywca (confirmed live: dz. 392/3
// Wólka 56 600 → 57 170 zł; dz. 1332/1 Lipsko 4 200 → 4 250 zł).
//
// Closest analog: NO existing samorzad.gov.pl/Liferay adapter existed
// (grep -rl "samorzad.gov.pl\|liferay" src/cities → none), so this is cloned
// from the two nearest inline-HTML-fields adapters (ADAPTER-GUIDE §3
// custom-HTML family, classify-on-BODY): `wolow` (single-host sitemap
// discovery + inline-prose field extraction + parcel/address subject split)
// and `brzeg` (the real "Informacja o wyniku" achieved-price parser:
// cena osiągnięta → sold, wynik negatywny → unsold). OCR routing
// (pdfText → fall back to ocrPdf on empty) per ADAPTER-GUIDE §5.2.
//
// Secondary host `lipsko2.bip.gmina.pl` (id=365) and `lipsko.eu` also carry
// notices but are NOT used — the samorzad.gov.pl portal is authoritative and
// carries the achieved-price stream.

export const config = {
  id: 'lipsko',
  // TERYT for gmina miejsko-wiejska Lipsko (powiat lipski, mazowieckie).
  // Derived from TERC: 1409034 (Lipsko-miasto) / 1409035 (Lipsko-obszar
  // wiejski) → whole-gmina aggregate rodzaj 3 = 1409033 → WWPPGG_R "140903_3"
  // (woj 14 mazowieckie, powiat 09 lipski, gmina 03, rodzaj 3 whole-gmina —
  // same "_3 whole-gmina" convention wolow/trzebnica use). Best-effort from a
  // wykaz.rky.pl / TERC lookup, NOT a direct eteryt.stat.gov.pl query —
  // CONFIRM on first geoportal/ULDK run before trusting it for deep-links.
  teryt: '140903_3',
  label: 'Lipsko',
  voivodeship: 'mazowieckie',
  authority: 'Urząd Miasta i Gminy Lipsko (Burmistrz Miasta i Gminy Lipsko)',
  host: 'samorzad.gov.pl',
  source: 'html',
};
