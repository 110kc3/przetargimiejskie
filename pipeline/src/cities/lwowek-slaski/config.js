// Lwówek Śląski (województwo dolnośląskie, powiat lwówecki) — Gmina i Miasto
// Lwówek Śląski (Burmistrz Gminy i Miasta Lwówek Śląski) sells municipal
// property — mostly undeveloped land parcels (działki niezabudowane) plus the
// occasional flat / commercial unit / built property — at
// `<ROMAN> przetarg ustny nieograniczony na sprzedaż` and publishes both the
// announcements and the achieved-price result notices on its municipal BIP at
// `bip.lwowekslaski.pl`. See spikes/dolnoslaskie/powiat-lwowecki/lwowek-slaski.md.
//
// SOURCE SHAPE (verified live 2026-07-11, correcting the DESK spike):
//   The BIP is an **IDcom.pl bip-v1 platform** (`<meta name="author"
//   content="IDcom.pl">`), plain SERVER-RENDERED HTML — NOT a JS SPA, so no
//   render.js. Same CMS family as the tczew/gniezno/gizycko adapters.
//   Board 3 == "Przetargi": list `/wiadomosci/3/lista/<PAGE>`, detail
//   `/wiadomosci/3/wiadomosc/<ID>/<slug>`. The default bot UA is NOT gated
//   (HTTP 200 on board, detail and the idcom-jst CDN) and the TLS chain is
//   complete (no insecureTLS needed) — verified live.
//
//   The DESK spike claimed the notices are "inline HTML text". They are NOT:
//   each announcement and each land result carries its full text in a
//   **born-digital PDF attachment** on the idcom-jst CDN
//   (`bip-v1-files.idcom-jst.pl/sites/3103/wiadomosci/<ID>/files/*.anonymised.pdf`,
//   ~3–4k chars via `pdftotext -layout`, no OCR). A minority of older FLAT
//   result notices ("Informacja o wyniku przetargu_na sprzedaż lokalu
//   mieszkalnego …") are TITLE-ONLY (empty `<div class="wiadomosc">`, no
//   attachment) — only the title's address/round survive; no price/outcome.
//
// `source: 'html'` (matching the zlotoryja/wolow convention): the adapter
// builds each record's `.text` blob itself in crawl.js — it fetches the PDF
// via core/pdf-text.js `pdfText()` and joins the article TITLE + PDF body via
// buildRecordText() — so refresh.js hands the pre-built `.text` straight to
// parseResultDoc (it does NOT re-dispatch OCR/pdf-text for html-source cities).

export const config = {
  id: 'lwowek-slaski',
  teryt: '021204_3', // gmina miejsko-wiejska Lwówek Śląski (woj 02, powiat lwówecki 12, gmina 04, rodzaj 3=whole gmina) — best-effort; confirm on first geoportal run
  label: 'Lwówek Śląski',
  voivodeship: 'dolnoslaskie',
  authority: 'Gmina i Miasto Lwówek Śląski',
  host: 'bip.lwowekslaski.pl',
  source: 'html',
};
