// Malbork — Pomorskie, powiat malborski (gmina miejska, seat of powiat malborski, ~38k pop.).
//
// Burmistrz Miasta Malborka (Gmina Miasto Malbork, Wydział Rozwoju i Gospodarki
// Przestrzennej, Pl. Słowiański 5) sells municipal flats (nieruchomości lokalowe)
// at "ustny przetarg nieograniczony na sprzedaż", publishing announcements and
// achieved-price results on the city BIP (bip.malbork.pl).
//
// *** PLATFORM: Madkom SIP BIP — a React SPA over a plain JSON HTTP API ***
// The BIP serves a bare `<div id="root">` CRA shell to a plain GET, but is
// backed by a plain JSON HTTP API (same platform family as Dzierżoniów):
//   GET /api/menu/<menuId>/articles?limit=N&offset=K&archived=true  -> board list
//   GET /api/articles/<articleId>                                  -> article + attachments[]
//   GET /api/files/<attachmentId>                                  -> raw file bytes (born-digital PDF)
//
// Three boards feed the streams (under menu 12 "Menu podmiotowe" › 324 "Przetargi"):
//   * ANNOUNCEMENTS: menu 48 "Nieruchomości" (under 258 "Przetargi otwarte")
//     Each flat notice carries an "Ogłoszenie..." PDF with auction date, round,
//     and table of flats (price, area, address).
//   * RESULTS (rozstrzygnięte): menu 180 "Nieruchomości" (under 17 "Przetargi rozstrzygnięte")
//     Carries "Informacja o wynikach przetargu" PDFs with concluded sales (buyer,
//     achieved price).
//   * RESULTS (nierozstrzygnięte): menu 203 "Nieruchomości" (under 212 "Przetargi nierozstrzygnięte")
//     Carries "Informacja o wynikach przetargu" PDFs for auctions with negative
//     outcome (brak uczestników / nie wyłoniono nabywcy).
//
// All result and announcement documents are born-digital text PDFs; core's pdfText()
// (pdftotext) extracts them cleanly without OCR.

export const config = {
  id: 'malbork',
  // gmina miejska Malbork: TERC/TERYT 2209011 (woj. pomorskie 22, powiat 09 malborski, gmina 01, typ 1 miejska)
  teryt: '2209011',
  label: 'Malbork',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta Malborka (Gmina Miasto Malbork)',
  host: 'bip.malbork.pl',
  // The adapter builds each result ref's `.text` itself (full pdftotext of the
  // result PDF), matching the html source convention.
  source: 'html',
};
