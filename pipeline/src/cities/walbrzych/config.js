// Wałbrzych (Dolnośląskie) — miasto na prawach powiatu.
// Highest-volume flat-auction city in Dolnośląskie (~60 flats/year since 2022).
//
// Single host: bip.um.walbrzych.pl (Urząd Miejski w Wałbrzychu, Pl. Magistracki 1).
// CMS: Logonet BIP v2.9.0.
//
// Streams:
//   Active listings  — GET /przetargi-nieruchomosci/{page}/25 (server-rendered HTML,
//                      no form POST needed; paginate and filter by "lokal mieszkalny"
//                      in the card's "Rodzaj nieruchomości" field).
//   Result notices   — GET /artykuly/2369/informacje-o-wynikach-przetargow →
//                      year pages → month pages → result articles → PDF attachment
//                      at /attachments/download/{id}. Born-digital PDF (PDF 1.6,
//                      ~115–120 KB, 1 page). pdftotext -layout produces a
//                      multi-column table covering all property types for one
//                      auction day. Parse.js filters rows by flat address pattern.
//
// Closest analog: Tarnowskie Góry (PDF result notices, GET pagination, text PDFs).
//
// NOTE: mosparo anti-spam token only guards the search FORM POST
// (/przetargi-nieruchomosci/szukaj). The default GET listing at
// /przetargi-nieruchomosci/{page}/25 is fully public — no token needed.
// We use the GET board and filter in-process instead.
//
// TERYT: 0265011 (confirmed from BIP footer — "TERYT Gminy: 0265011").
// This is the standard Wałbrzych grodzki TERYT. Geoportal deep-links use
// the gmina TERYT without the trailing digit-type suffix. Confirm the exact
// TERYT variant accepted by ULDK on the first live geoportal run.

export const config = {
  id: 'walbrzych',
  teryt: '0265011', // TERYT Gminy confirmed from BIP footer; confirm ULDK variant on first run
  label: 'Wałbrzych',
  voivodeship: 'dolnoslaskie',
  authority: 'Urząd Miejski w Wałbrzychu',
  host: 'bip.um.walbrzych.pl',
  source: 'html', // crawlResultDocs() returns refs with .text already attached
};
