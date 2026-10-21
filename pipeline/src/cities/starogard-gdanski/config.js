// Starogard Gdański (województwo pomorskie, powiat starogardzki) —
// Gmina Miejska Starogard Gdański (Prezydent Miasta Starogard Gdański,
// Wydział Gospodarki Gruntami, Geodezji i Rolnictwa) auctions municipal flats,
// commercial properties, garages, and plots via przetarg ustny nieograniczony.
//
// Sources:
// 1. Primary municipal property board (wykaz & mirror):
//    https://starogard.pl/informacje-o-nieruchomosciach.html
//    (formerly referenced as https://starogard.pl/obwieszczenia)
//    Publishes mayoral orders (Zarządzenia Prezydenta Miasta) specifying
//    properties designated for disposal (wykaz nieruchomości przeznaczonych do zbycia).
// 2. Official city BIP (bip.starogard.pl — Madkom SIP platform):
//    - Announcements: /api/menu/32/articles (active & archived oral auction announcements)
//    - Results (achieved prices): /api/menu/447/articles (concluded result notices)
//    - Born-digital PDF attachments: /api/files/<attId>
//
// Spike: spikes/pomorskie/powiat-starogardzki/starogard-gdanski.md

export const config = {
  id: 'starogard-gdanski',
  teryt: '2213031', // Gmina Miejska Starogard Gdański (TERC 2213031, SIMC 0934837) — confirm on first geoportal run
  label: 'Starogard Gdański',
  voivodeship: 'pomorskie',
  authority: 'Prezydent Miasta Starogard Gdański',
  host: 'starogard.pl',
  source: 'html',
};
