// Ząbkowice Śląskie (woj. dolnośląskie, powiat ząbkowicki) — the Gmina (Urząd
// Miejski, Wydział Geodezji i Gospodarki Nieruchomościami, GN) sells municipal
// property — lokale mieszkalne, lokale użytkowe, garaże AND a heavy tail of
// undeveloped land — via `przetarg ustny nieograniczony`, publishing everything
// on the city BIP (bip.zabkowiceslaskie.pl). See spikes/dolnoslaskie/
// powiat-zabkowicki/zabkowice-slaskie.md.
//
// CMS: **Logonet eUrząd** — but Ząbkowice uses Logonet's dedicated real-estate
// module (structured, status-filterable board), NOT the generic `/artykul/<board>/
// <id>` articles the Tarnowskie Góry / Kędzierzyn-Koźle analogs enumerate. So the
// crawler drives the estate search endpoint (…/przetargi-nieruchomosci/szukaj?
// status=…) and reads each notice's inline "Szczegóły" HTML table (see crawl.js).
//
// `source: 'html'` — announcements are pure server HTML (no PDF). Result notices
// ("INFORMACJA O WYNIKU PRZETARGU") are **scanned** PDFs (Producer "KONICA MINOLTA
// bizhub 554e" — no text layer; the spike's "born-digital" note is WRONG, verified
// live 2026-07-11), so crawl.js OCRs them itself (core/ocr-pdf.js, tesseract -l
// pol) and crawlResultDocs() returns refs that already carry `.text` — exactly
// like the oświęcim / świętochłowice / węgrów OCR-in-adapter cities. This is NOT
// the legacy `source:'pdf'` OCR-dispatch path; the adapter owns its OCR.
//
// No SPA/render, no auth/CAPTCHA, no TLS workaround, no bot-UA gating (the polite
// bot UA fetches fine). needsRender is intentionally absent (server HTML).

export const config = {
  id: 'zabkowice-slaskie',
  // gmina miejsko-wiejska Ząbkowice Śląskie: woj. dolnośląskie 02, powiat
  // ząbkowicki 23, gmina 05, rodzaj 3 (whole miejsko-wiejska gmina). Derived from
  // GUS TERC ordering, anchored on the two repo TERYTs that match GUS exactly
  // (Bolesławiec 0201, Kłodzko 0207); best-effort — confirm on first geoportal run.
  teryt: '022305_3',
  label: 'Ząbkowice Śląskie',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miejski w Ząbkowicach Śląskich',
  host: 'bip.zabkowiceslaskie.pl',
  source: 'html',
};
