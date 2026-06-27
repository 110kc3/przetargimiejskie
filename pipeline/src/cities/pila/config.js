// Piła (Wielkopolskie, powiat pilski) — municipal flat auctions run by the
// Prezydent Miasta Piły on bip.pila.pl.
//
// See spikes/wielkopolskie/powiat-pilski/pila.md for the spike write-up.
//
// Architecture: server-rendered custom-PHP BIP; no OCR; source:'html'.
//   LIST:    GET /542-aktualne-przetargi-na-nieruchomosci.html
//              → HTML table, each row a slug link (relative .html? URL)
//   ARTICLE: GET /<slug>.html  → inline summary + PDF attachments
//              "Treść ogłoszenia" PDF = announcement (full content with price)
//              After auction: "wyniki" PDF attachment added to same article
//   PDF:     GET /files/file_add/download/<id>_<name>.pdf
//
// Key distinction from Wejherowo: the inline article HTML does NOT carry the
// price or area — those live ONLY inside the attached announcement PDF.
// A multi-flat batch (e.g. 16.05.2025) embeds a table with several rows; a
// single-flat announcement (e.g. 17.07.2026) has just one row. Either way, each
// row represents one lokal and is parsed independently.
//
// Closest analogs: Tarnowskie Góry (HTML BIP + PDF attachments, same board for
// announcements + results), Wejherowo (index list → article → PDF, custom CMS).
//
// TERYT NOTE: gmina city-county Piła. GUS TERYT for Piła (gmina miejska in
// powiat pilski, Wielkopolskie): 3018011 (powiat 30180, gmina type 1).
// Confirm on the first geoportal run (ULDK unreachable from CI sandbox).

export const config = {
  id: 'pila',
  // TERYT for gmina miejska Piła — confirm on first geoportal run.
  teryt: '3018011',
  label: 'Piła',
  voivodeship: 'wielkopolskie',
  authority: 'Urząd Miasta Piły',
  host: 'bip.pila.pl',
  source: 'html',
};
