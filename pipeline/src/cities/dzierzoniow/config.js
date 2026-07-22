// Dzierżoniów — Dolnośląskie, powiat dzierżoniowski (gmina miejska; the city is
// the powiat seat, ~32k pop.).
//
// Burmistrz Dzierżoniowa (Gmina Miejska Dzierżoniów, Wydział Gospodarki
// Nieruchomościami / Wydział Spraw Lokalowych, Rynek 1) sells municipal flats
// (lokale mieszkalne) at "ustny przetarg nieograniczony na sprzedaż",
// publishing announcements and achieved-price results on the city BIP
// (bip.um.dzierzoniow.pl).
//
// *** PLATFORM: Madkom SIP BIP — a React SPA over a plain JSON HTTP API ***
// The BIP renders a bare `<div id="root">` CRA shell to a plain GET (so the
// spike flagged it "SPA, needs a browser"), BUT — like glogow's bip.info.pl —
// it is backed by a plain JSON HTTP API that serves the article list and
// article bodies WITHOUT any browser. No Playwright / render.js needed:
//   GET /api/menu/<menuId>/articles?limit=&offset=&archived=  -> board list
//   GET /api/articles/<articleId>                             -> article + attachments[]
//   GET /api/files/<attachmentId>                             -> raw file bytes
// See crawl.js's header for the full reverse-engineered shape and the two
// boards used (1838 "Lokale mieszkalne" for announcements, 63 "Wyniki
// przetargów" for results). TLS chain is COMPLETE here (no insecureTLS, unlike
// glogow); the plain bot UA is served (a browser UA is passed anyway as the
// safe municipal-WAF default).
//
// Result documents are small (~27 KB) born-digital text PDFs (a numbered list
// of every property auctioned that day — flats, land and commercial mixed);
// core's pdfText() (pdftotext) extracts them cleanly — NO OCR. The adapter
// filters to lokale mieszkalne (this repo is a flat-auction scraper); land /
// commercial rows on the same PDFs are out of scope and skipped.
//
// See SPIKE: spikes/dolnoslaskie/powiat-dzierzoniowski/dzierzoniow.md —
// VERDICT: BUILD (Medium effort). The spike assumed Playwright for the SPA;
// this adapter uses the JSON API instead, so `needsRender` is NOT set.

export const config = {
  id: 'dzierzoniow',
  // gmina miejska Dzierżoniów: powiat dzierżoniowski TERYT 0202, gmina-type 1
  // (miejska) -> 020201_1. Confirm on first geoportal run.
  teryt: '020201_1',
  label: 'Dzierżoniów',
  voivodeship: 'dolnoslaskie',
  authority: 'Burmistrz Dzierżoniowa (Gmina Miejska Dzierżoniów)',
  host: 'bip.um.dzierzoniow.pl',
  // The adapter builds each result ref's `.text` itself (full pdftotext of the
  // day's rozstrzygnięcie PDF), so refresh.js's OCR/pdf-text dispatch is
  // bypassed — matches glogow/zgorzelec's 'html' convention.
  source: 'html',
};
