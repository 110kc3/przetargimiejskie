// Międzyrzecz — Lubuskie, powiat międzyrzecki.
// Municipal flat sales are run by Wydział Gospodarki Mieniem (UM Międzyrzecz)
// and published on the city BIP (bip.miedzyrzecz.pl), the Wrota Lubuskie eBIP
// platform — the SAME CMS + engine as gorzow-wielkopolski (this adapter's
// template), but here the /przetargi/ board is the results engine too: the
// list table itself carries "Cena wywoławcza" + "Wynik" (Pozytywny/Negatywny)
// columns, not just announcement links.
//
//   Announcements (ogłoszone): https://bip.miedzyrzecz.pl/przetargi/0/status/0/
//   Resolved (rozstrzygnięte): https://bip.miedzyrzecz.pl/przetargi/0/status/1/
//   Invalidated (unieważnione): https://bip.miedzyrzecz.pl/przetargi/0/status/2/  (not crawled)
//
// "0" is the announcer/podmiot segment for Urząd Miejski (Gorzów uses "320" on
// the same engine). MTBS (Międzyrzeckie TBS) runs a secondary flat-sale board
// on the same CMS at bip.mtbs.miedzyrzecz.pl/przetargi/29/ — confirmed live but
// NOT crawled by this adapter (kept out of scope; see crawl.js header). ZGL
// (bip.zgl.miedzyrzecz.pl) publishes dzierżawa/najem only — out of scope.
//
// See spike: spikes/lubuskie/powiat-miedzyrzecki/miedzyrzecz.md

export const config = {
  id: 'miedzyrzecz',
  // Gmina miejsko-wiejska Międzyrzecz, powiat międzyrzecki, woj. lubuskie.
  // Best-recollection TERYT (woj 08 + powiat międzyrzecki + seat gmina) — NOT
  // verified against the GUS registry from this sandbox (same caveat as
  // gorzow-wielkopolski's config.js). Confirm on first geoportal run.
  teryt: '0810011_2', // gmina TERYT for Międzyrzecz — confirm on first geoportal run
  label: 'Międzyrzecz',
  voivodeship: 'lubuskie',
  authority: 'Urząd Miejski w Międzyrzeczu',
  host: 'bip.miedzyrzecz.pl',
  source: 'html',
};
