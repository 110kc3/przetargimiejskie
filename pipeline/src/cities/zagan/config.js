// Żagań — Lubuskie, powiat żagański, gmina miejska (town). NOT to be confused
// with the rural Gmina Wiejska Żagań (bip.gminazagan.pl) or the powiat
// żagański starostwo (bip.powiatzaganski.pl) — this adapter targets ONLY the
// town Urząd Miasta Żagań's own BIP.
//
// Municipal property sales (land-heavy, flats periodic) run via Wydział
// Rozwoju, Gospodarki Komunalnej i Nieruchomości and are published on
// bip.zagan.pl — SystemDoBIP.pl / E-LINE SYSTEMY INTERNETOWE hosted CMS, the
// SAME engine as gorzow-wielkopolski and miedzyrzecz (both lubuskie).
//
// View-source confirmed (2026-07-11) the board is the miedzyrzecz SUB-SHAPE
// of this CMS family (one table doubles as both announcement + results
// engine, "Cena wywoławcza" + "Wynik" columns inline on every row) — NOT
// gorzow's sub-shape (separate announcement PDFs + a wholly separate /509/
// results archive). See crawl.js header for the full live-verification.
//
//   Board: https://bip.zagan.pl/przetargi/344/status/{0,1,2}/
//     0 = ogłoszone (active), 1 = rozstrzygnięte (resolved), 2 = unieważnione
//     (cancelled — not crawled, matching gorzow/miedzyrzecz convention)
//
// See spike: spikes/lubuskie/powiat-zaganski/zagan.md

export const config = {
  id: 'zagan',
  // Gmina miejska Żagań, powiat żagański, woj. lubuskie. Best-recollection
  // TERYT (woj 08 lubuskie + powiat żagański [11] + gmina Żagań miasto [01],
  // rodzaj 1 = gmina miejska) — NOT verified against the GUS registry from
  // this sandbox (same caveat gorzow-wielkopolski/miedzyrzecz's own config.js
  // carry). LOW-MEDIUM confidence — confirm on first geoportal run.
  teryt: '081101_1', // gmina TERYT for Żagań miasto — confirm on first geoportal run
  label: 'Żagań',
  voivodeship: 'lubuskie',
  authority: 'Urząd Miasta Żagań',
  host: 'bip.zagan.pl',
  source: 'html',
};
