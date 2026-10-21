// Mogilno (Kujawsko-pomorskie, powiat mogileński) — Gmina Mogilno (Burmistrz Mogilna).
//
// Platform: Nefeni Sp. z o.o. server-rendered Next.js HTML CMS on bip.mogilno.pl.
// Boards:
//   - Sales & designations: /kategorie/98-zbycie-nieruchomosci
//   - Property auction results: /kategorie/101-informacja-o-wynikach-przetargow
//   - Public procurement / other results: /kategorie/265-rozstrzygniete
// Attachments: stored on bip-api.mogilno.pl/api/attachments/<id> (primarily scanned PDFs requiring OCR).
//
// Volume: low flat auction volume, skews toward land, mill/industrial and tenant sales,
// but runs open oral auctions for residential premises (e.g. Wyrobki 7, Wasielewko 18/3).
// See spikes/kujawsko-pomorskie/powiat-mogilenski/mogilno.md.

export const config = {
  id: 'mogilno',
  // TERYT for Gmina Mogilno (SIMC: 0929428, TERC: 0409034).
  // Confirm on first geoportal run.
  teryt: '0409034',
  label: 'Mogilno',
  voivodeship: 'kujawsko-pomorskie',
  authority: 'Burmistrz Mogilna (Gmina Mogilno)',
  host: 'bip.mogilno.pl',
  source: 'html',
};
