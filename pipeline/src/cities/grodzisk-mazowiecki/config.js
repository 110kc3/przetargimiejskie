// Grodzisk Mazowiecki (województwo mazowieckie, powiat grodziski) —
// Burmistrz Grodziska Mazowieckiego (Wydział Gospodarki Nieruchomościami — WGN)
// sells municipal flats, buildings and land at public oral auctions ("ustny przetarg
// nieograniczony na sprzedaż").
//
// Sources:
// 1. Primary announcement portal: https://nieruchomosci.grodzisk.pl/
//    Dedicated WordPress portal with categories:
//    - /category/aktualne/ (current sales)
//    - /category/planowane/ (planned / wykaz)
//    - /category/archiwum-zprzedaz/ (archived sales)
//    - /category/archiwum-planowane/ (archived wykaz)
//    Provides born-digital PDFs and links to BIP attachments.
// 2. Achieved-price result notices: BIP Grodzisk Mazowiecki (bip.grodzisk.pl)
//    Logonet eUrząd platform with a clean JSON REST API:
//    - /api/menu/<wgn_year_id> -> lists auction submenus
//    - /api/menu/<auction_id>/articles -> announcement + "Informacja o wyniku" articles
//    - /api/articles/<id> -> born-digital PDF attachments (/e,pobierz,get.html?id=...)
//
// `source: 'html'`.
// Spike live-verified: 2026-06-30. VERDICT: BUILD.

export const config = {
  id: 'grodzisk-mazowiecki',
  teryt: '1405044', // gmina miejsko-wiejska Grodzisk Mazowiecki (powiat grodziski) — confirm on first geoportal run
  label: 'Grodzisk Mazowiecki',
  voivodeship: 'mazowieckie',
  authority: 'Burmistrz Grodziska Mazowieckiego (Gmina Grodzisk Mazowiecki)',
  host: 'nieruchomosci.grodzisk.pl',
  source: 'html',
};
