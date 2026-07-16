// Grudziądz (Kujawsko-Pomorskie — miasto na prawach powiatu).
// Municipal flat sales are run by Prezydent Grudziądza (Urząd Miejski w
// Grudziądzu, Wydział Geodezji i Gospodarki Nieruchomościami) and published on
// the city BIP under the "Sprzedaż nieruchomości" board.
//
// Board: https://bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci
//
// CMS note (LIVE-VERIFIED 2026-07-16, corrects the spike's "JS-paginated —
// needs browser automation" verdict): the board table (`table.lista_artykuly`)
// is wired to DataTables with `"paging": true` for the in-browser UI, but there
// is NO `"serverSide": true` / `"ajax"` option — every row (~620, back to 2008)
// is already present in the server-rendered HTML on a single plain fetch. No
// `core/render.js` / Playwright needed; see crawl.js.
//
// See SPIKE: spikes/kujawsko-pomorskie/grudziadz/grudziadz.md — VERDICT: BUILD
// (Medium effort; effort turned out to be driven by DOCX/OCR parsing, not
// pagination — the JS-pagination blocker did not materialize).

export const config = {
  id: 'grudziadz',
  // TERYT for Grudziądz grodzki (miasto na prawach powiatu, woj. kujawsko-pomorskie
  // 04, powiat 0464). Confirm on first geoportal run (see e.g. bydgoszcz/torun
  // config.js for the same caveat on neighbouring city-counties).
  teryt: '046400_1', // Grudziądz grodzki — confirm on first geoportal run
  label: 'Grudziądz',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Prezydent Grudziądza (Urząd Miejski w Grudziądzu, Wydział Geodezji i Gospodarki Nieruchomościami)',
  host: 'bip.grudziadz.pl',
  source: 'html',
};
