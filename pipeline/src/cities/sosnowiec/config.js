// Sosnowiec — municipal property sales are run by the City Hall (Prezydent
// Miasta Sosnowca) and published on the city BIP (bip.um.sosnowiec.pl) under
// "Przetargi". See SPIKE-WAVE2.md "Sosnowiec".
//
// Shape: the BIP is a React SPA backed by a JSON API. The adapter reads the
// article list (`/api/menu/6339/articles`, current + archived) and each flat
// auction's article (`/api/articles/<id>`) whose `content` HTML carries the full
// announcement inline — so flats need no PDF/OCR. We keep only open
// `przetarg ustny … na sprzedaż lokalu mieszkalnego` auctions; the city's land/
// działka auctions and bezprzetargowe tenant flat sales are skipped.
//
// `source: 'html'` — the adapter does its own JSON fetch + text extraction, so
// the refresh loop's OCR/pdf-text dispatch is bypassed; crawlResultDocs()
// returns refs that already carry `.text`. The achieved-price stream comes
// from the sibling "Wyniki przetargów" board (menu 7043) — flat-sale result
// notices parsed by parse.js parseResultDoc (sold/unsold + final price).

export const config = {
  id: 'sosnowiec',
  teryt: '247501_1', // gmina TERYT (verified via ULDK) for precise geoportal deep-links
  label: 'Sosnowiec',
  voivodeship: "slaskie",
  authority: 'Urząd Miejski w Sosnowcu',
  host: 'bip.um.sosnowiec.pl',
  source: 'html',
};
