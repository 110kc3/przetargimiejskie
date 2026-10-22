// Grodzisk Wielkopolski — Wielkopolskie, powiat grodziski (gmina miejsko-wiejska,
// seat of the powiat, ~15k pop.).
//
// Burmistrz Grodziska Wielkopolskiego (Urząd Miejski w Grodzisku Wielkopolskim,
// Stary Rynek 1) auctions municipal properties (lokale mieszkalne and land plots)
// via ustny przetarg nieograniczony on BIP (bip.grodzisk.wlkp.pl).
//
// *** PLATFORM: nv.pl / Symfony REST backend (Madkom SIP / Logonet family) ***
// While the BIP frontend is rendered via JavaScript client-side, the backend
// exposes a clean, unauthenticated REST API that returns structured JSON:
//   Board endpoint:   GET /api/menu/512/articles?limit=100&offset=0[&archived=1]
//   Article endpoint: GET /api/articles/{id}
//
// Both announcements and result notices (Informacja o wyniku przetargu) are
// published in the same Przetargi section (menu 512). The article JSON contains
// full inline HTML tables in `content` with all property details:
//   - address (ul. Kolejowa 9/2, ul. 27 Stycznia 8/2, os. Wojska Polskiego 24/24A, Kąkolewo)
//   - area (powierzchnia użytkowa in m²)
//   - cena wywoławcza (starting price in PLN)
//   - wadium
//   - auction date & time
//   - round (I, II przetarg ustny nieograniczony)
//   - achieved price & buyer (cena wylicytowana, imię i nazwisko nabywcy) or outcome
//
// No headless browser / Playwright is required because the JSON API is queried
// directly with standard HTTP fetch.

export const config = {
  id: 'grodzisk-wielkopolski',
  // TERYT 3005024: miasto Grodzisk Wielkopolski (gmina 3005023, miasto code 4).
  teryt: '3005024',
  label: 'Grodzisk Wielkopolski',
  voivodeship: 'wielkopolskie',
  authority: 'Burmistrz Grodziska Wielkopolskiego',
  host: 'bip.grodzisk.wlkp.pl',
  // Inline HTML notices with structured tables:
  source: 'html',
};
