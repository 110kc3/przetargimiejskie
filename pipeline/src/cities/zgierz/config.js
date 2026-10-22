// Zgierz (Łódzkie, powiat zgierski) — Gmina Miasto Zgierz (Prezydent Miasta Zgierza).
//
// Platform: Nefeni Sp. z o.o. BIP2 (Next.js server-rendered HTML CMS on zgierz.bip.net.pl).
// REST API / docrepo at zgierz-api.bip.net.pl/api/attachments/<id>.
//
// Boards:
//   - Flats & premises: /kategorie/121-sprzedaz-lokali-
//   - Land parcels:     /kategorie/120-sprzedaz-gruntow
//
// Active stream:
//   Multi-flat and single-flat oral auctions (ustny przetarg nieograniczony) with
//   digital text PDF notices (e.g. Dubois 29, 31, pl. Kilińskiego 7, 3 Maja 34,
//   ks. Sz. Rembowskiego 6, K. Baczyńskiego 1, Długa 75, 1 Maja 73).
//   Secondary publisher MPGM Sp. z o.o. also publishes on the city BIP (e.g. Koszarowa 9).
//
// Achieved-price / results stream:
//   Individual "Informacja o wyniku przetargu" PDFs attached to resolved articles
//   in both categories, carrying starting price, final hammer price (sold) or
//   negative outcome (unsold, brak wpłat wadium), buyers, area, and round.

export const config = {
  id: 'zgierz',
  // TERYT for Gmina Miasto Zgierz (SIMC: 0959263, TERC: 1020031).
  teryt: '102003_1',
  label: 'Zgierz',
  voivodeship: 'lodzkie',
  authority: 'Prezydent Miasta Zgierza',
  host: 'zgierz.bip.net.pl',
  source: 'html',
};
