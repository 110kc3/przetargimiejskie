// Cieszyn (Śląskie, powiat cieszyński) — Gmina Miejska Cieszyn.
//
// Urząd Miejski w Cieszynie (Wydział Gospodarki Nieruchomościami) publishes
// flat sale announcements AND result notices (wynik) on the city BIP at
// bip.um.cieszyn.pl. CMS: Logonet 2.9.0 — same family as Bytom, Zabrze,
// Tarnowskie Góry. See spikes/slaskie/powiat-cieszynski/cieszyn.md.
//
// Shape:
//   INDEX:  /przetargi-nieruchomosci/{page}/15 — paginated HTML; one
//           <table class="table table-borderless"> per property with fields:
//           Adres / Przetarg na / Typ / Rodzaj nieruchomości / Cena wywoławcza /
//           Data przetargu. Address cell carries the detail-page URL.
//           Filter: Rodzaj nieruchomości = "lokal mieszkalny" for flats.
//   DETAIL: /przetarg-nieruchomosci/{id}/{slug} — same table + wysiwyg body
//           containing announcement text with area, auction date, round.
//           A .addon-bip-result section links to the wynik article when published.
//   WYNIK:  /artykul/21/{id}/{slug} — separate article with achieved price.
//           Expires ~30 days post-auction (Polish statute); must poll proactively.
//
// source:'html' — crawlResultDocs() returns refs already carrying .text
// (the wynik article body), so refresh.js bypasses OCR/pdfText dispatch.

export const config = {
  id: 'cieszyn',
  teryt: '2403011', // gmina miejska Cieszyn (powiat cieszyński 2403, type 1)
  //                   confirm on first geoportal run
  label: 'Cieszyn',
  voivodeship: 'slaskie',
  authority: 'Urząd Miejski w Cieszynie',
  host: 'bip.um.cieszyn.pl',
  source: 'html',
};
