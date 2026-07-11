// Gostyń — the Gmina (Urząd Miejski w Gostyniu, Burmistrz Gostynia) sells
// municipal property at ustny przetarg nieograniczony and publishes BOTH the
// sale announcements AND the achieved-price result notices on its BIP
// (biuletyn.gostyn.pl). See spikes/wielkopolskie/powiat-gostynski/gostyn.md.
//
// CMS: Logonet eUrząd v2.9.0 — same vendor family as Tarnowskie Góry / Gniezno,
// but a DIFFERENT (older) URL scheme than Tarnowskie Góry's JSON API:
//
//   BOARD (list): /artykuly/<board>/<slug>        (human) — plural "artykuly"
//   BOARD (xml):  /artykuly/xml/<board>/<page>/1  → clean <artykul>{url,tytul,
//                   data,skrot} feed with <ilosc-stron>/<ilosc-rekordow>
//   ARTICLE:      /artykul/<board>/<id>/<slug>    (singular "artykul")
//   FILE:         /attachments/download/<attId>   (per-attachment download)
//
// Property board: 280 "Oferty miasta" (primary). 232 "Tablica ogłoszeń" is a
// rolling notice board where a sale is occasionally cross-posted — crawled as a
// secondary board, filtered to property-sale titles.
//
// SESSION GATE (spike caveat): the spike warned of a "Problem z wyświetleniem
// zasobu" session-cookie soft gate on article pages. VERIFIED FALSE at build
// time — core/fetch.js getText/getBytes retrieve real content for every LIVE
// article (via the XML feed's canonical URLs) with the default bot UA, no
// cookies. That error page only appears for a REMOVED / wrong-board article id
// (e.g. a bare /artykul/232/14731 with no live article behind it); the crawler
// never hits those because it only follows URLs the XML feed emits.
//
// ATTACHMENT TYPES (not the born-digital-PDF the spike assumed): announcement
// terms arrive as a born-digital .docx (→ core/doc-text.js), and the "wynik"
// result notice as a SCANNED .pdf (→ core/ocr-pdf.js — pdftotext returns
// nothing). crawl.js routes by the attachment's type label with a magic-byte
// fallback (docx→docText, born-digital pdf→pdfText, scanned pdf→ocrPdf).
//
// source:'html' — the adapter does its own attachment fetch + text extraction
// (like Tarnowskie Góry): crawlResultDocs() returns refs that already carry
// `.text`, so the refresh loop's OCR/pdf-text dispatch is bypassed.

export const config = {
  id: 'gostyn',
  // TERYT for Gmina Gostyń (gmina miejsko-wiejska, powiat gostyński) — WOJ 30
  // wielkopolskie, POW 04 gostyński, rodzaj 3 (miejsko-wiejska; Sikorzyn and the
  // other sale localities are villages in this gmina). Best-effort — the GMI
  // digit is UNCONFIRMED (02 or 03, depending on the registry's ordering);
  // CONFIRM ON FIRST GEOPORTAL RUN (ULDK was not reached in-sandbox). Currently
  // cosmetic: the adapter emits dzialka_nr + locality but no full TERYT parcel
  // id, so geoportal.js uses its search fallback (this code is not yet used).
  teryt: '300403_3',
  label: 'Gostyń',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miejski w Gostyniu',
  host: 'biuletyn.gostyn.pl',
  source: 'html',
};
