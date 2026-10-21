// Otwock (Mazowieckie, powiat otwocki) — Gmina Miejska Otwock.
//
// Authority: Prezydent Miasta Otwocka (Wydział Gospodarki Nieruchomościami).
// Regular oral auctions for municipal flats (I/II/III/IV ustny przetarg nieograniczony
// na sprzedaż lokalu mieszkalnego).
//
// Host: bip.otwock.pl (INTERmedi@ CMS-BIP 3.0 platform).
// Announcements: menu 1018 (?bip=2&cid=1018)
// Results: menu 1039 (?bip=2&cid=1039)
// Document layer: Attached scanned PDFs (full-page image @200 dpi), OCR required via ocrPdf.
// See spikes/mazowieckie/powiat-otwocki/otwock.md.

export const config = {
  id: 'otwock',
  // TERYT for Gmina Miejska Otwock (TERC: 1417021, SIMC: 0921237).
  // Confirm on first geoportal run.
  teryt: '141702_1',
  label: 'Otwock',
  voivodeship: 'mazowieckie',
  authority: 'Prezydent Miasta Otwocka',
  host: 'bip.otwock.pl',
  source: 'html',
};
