// Zakopane (województwo małopolskie, powiat tatrzański) — Burmistrz Miasta Zakopane
// (Urząd Miasta Zakopane, Wydział Mienia i Nadzoru Właścicielskiego) auctions
// municipal flats (lokale mieszkalne), residential buildings (zabudowane
// nieruchomości gruntowe), and land plots (nieruchomości gruntowe) via "ustny
// przetarg nieograniczony", and separately publishes result notices
// ("Informacja o wyniku przetargu", "Ogłoszenie wyniku przetargu").
// See spikes/malopolskie/powiat-tatrzanski/zakopane.md.
//
// Shape: ESC S.A. / VelaBIP hosted BIP (bip.zakopane.eu), server-rendered HTML.
// Closest analog: pszczyna (exact same VelaBIP CMS platform by ESC S.A.).
// Operative notice text lives in born-digital attachments (PDF or DOC) or
// inline body, extracted via pdfText()/docText().
//
// Boards:
//   - "Inne przetargi": https://bip.zakopane.eu/lista/inne-przetargi (cat 171)
//   - "Wydział Mienia...": https://bip.zakopane.eu/lista/wydzial-mienia-i-nadzoru-wlascicielskiego-1 (cat 304)
//   - Search endpoint: https://bip.zakopane.eu/szukaj//przetarg
//
// source: 'html' — the adapter extracts inline HTML / attachment text itself.

export const config = {
  id: 'zakopane',
  teryt: '121701_1',
  label: 'Zakopane',
  voivodeship: 'malopolskie',
  authority: 'Burmistrz Miasta Zakopane',
  host: 'bip.zakopane.eu',
  source: 'html',
};
