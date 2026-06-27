// Olsztyn — municipal property sales conducted by Prezydent Olsztyna via
// Wydział Geodezji i Gospodarki Nieruchomościami (WGN). See spike:
//   spikes/warminsko-mazurskie/olsztyn/olsztyn.md
//
// Source: bip.olsztyn.eu — a Warmińsko-Mazurskie Centrum Nowych Technologii
// platform (server-rendered HTML, no SPA, no auth, no bot-blocking).
// Two categories on the BIP carry the auction data:
//   - kategoria/187: active auction announcements (ogłoszenia o przetargach)
//   - kategoria/188: result notices (informacja o wynikach przetargów)
//
// Flat sales ("lokale mieszkalne") and land ("nieruchomości gruntowe") are
// mixed in both categories. We filter by title keyword "lokal mieszkaln" to
// stay in scope for the residential-flat stream. Achieved prices appear inline
// in plain HTML prose — no PDF dependency for the core numbers.
//
// Volume: ~30–50 flat auctions per year (~monthly sessions of 3–6 flats).
// Price range observed (2026): 250 000 – 808 000 zł opening; achieved prices
// typically 0.5–2% above, with occasional outliers (+81% seen once).

export const config = {
  id: 'olsztyn',
  // TERYT for Olsztyn (grodzki, miasto na prawach powiatu):
  // powiat code 2862, gmina urbana 286201_1 — confirm on first geoportal run.
  teryt: '286201_1',
  label: 'Olsztyn',
  voivodeship: 'warminsko-mazurskie',
  authority: 'Urząd Miasta Olsztyna',
  host: 'bip.olsztyn.eu',
  source: 'html',
};
