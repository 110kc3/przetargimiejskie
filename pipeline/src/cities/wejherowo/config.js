// Wejherowo (województwo pomorskie, powiat wejherowski) — the Gmina Miasta
// Wejherowa (Prezydent Miasta, Wydział Gospodarki Nieruchomościami i Urbanistyki)
// auctions municipal flats at open oral auctions (*przetarg ustny nieograniczony
// na sprzedaż lokalu mieszkalnego*).
//
// Shape: city BIP (bip.wejherowo.pl) — server-rendered HTML, annual sub-pages
// `/artykul/przetargi-YYYY-r`, DataTables JS listing (all items rendered in DOM
// server-side). Article body carries address, area, cena wywoławcza, auction date.
// Result/achieved-price: PDF attachment named "wyniki" added post-settlement.
//
// Bot-block: bip.wejherowo.pl rejects the default bot UA; all fetches must use a
// browser-like User-Agent (BROWSER_UA defined in crawl.js).
//
// Volume: ~55–60 flat auctions/year (69 entries on 2025 page, majority flats).
// See spikes/pomorskie/powiat-wejherowski/wejherowo.md.

export const config = {
  id: 'wejherowo',
  // TERYT for Gmina Miasta Wejherowo (gmina miejska, powiat wejherowski,
  // woj. pomorskie) — confirm on first geoportal run.
  teryt: '226401_1',
  label: 'Wejherowo',
  voivodeship: 'pomorskie',
  authority: 'Gmina Miasta Wejherowa',
  host: 'bip.wejherowo.pl',
  source: 'html',
};
