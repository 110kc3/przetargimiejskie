// Sztum — municipal property auctions (przetarg ustny nieograniczony) and
// rokowania run by Burmistrz Miasta i Gminy Sztum (Referat Inwestycji i Mienia).
// Published on city BIP `bip.sztum.pl` (single mixed board `1186.html`).
// See spikes/pomorskie/powiat-sztumski/sztum.md.
//
// Source: server-rendered HTML board with born-digital text PDFs (pdfText).
// Both oral auctions (I/II przetarg) and post-failed-auction negotiations
// (rokowania) are conducted for municipal flats (e.g. Nowowiejskiego 18/1A,
// Jagiełły 6/6, Żeromskiego 24A/3). Achieved-price stream is present and cleanly
// parseable from result notices ("Informacja o wyniku...").
//
// TLS note: host serves an incomplete intermediate certificate chain
// (Certum DV TLS G2 R39 CA); crawler handles this transparently via intermediate CA.

export const config = {
  id: 'sztum',
  teryt: '2216054', // Gmina Sztum (TERC 2216054, SIMC 0932991)
  label: 'Sztum',
  voivodeship: 'pomorskie',
  authority: 'Burmistrz Miasta i Gminy Sztum',
  host: 'bip.sztum.pl',
  source: 'html',
};
