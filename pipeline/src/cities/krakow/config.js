// Kraków (województwo małopolskie, miasto na prawach powiatu) — the city
// (Prezydent Miasta Krakowa, Wydział Skarbu Miasta) auctions municipal flats,
// commercial units, garages AND land, and publishes BOTH active announcements AND
// achieved-price result notices on its bespoke BIP (bip.krakow.pl, ACK Cyfronet).
// Marquee neighbouring-voivodeship target. See SPIKE-NEIGHBORS.md.
//
// Each board article (?news_id=N) is a MULTI-PROPERTY notice: a numbered list of
// properties, each with its own cena wywoławcza, address/parcel, area and (in
// results) achieved price ("cena … została ustalona na kwotę …") + buyer or
// "wynikiem negatywnym". The auction date is shared across the notice's items.
// ZBK (zbk-krakow.pl) runs only RENTALS — out of scope.
//
//   BOARDS:  ?dok_id=30626 announcements (archive 102895); ?dok_id=30630 results
//            (archive 102899); RSS /feeds/rss/komunikatynowe/{30626,30630}.
//   ARTICLE: ?news_id=N (server-rendered HTML prose).
//
// `source: 'html'`. NOTE (confirm on first CI refresh): the board ?news_id harvest
// + pagination were inferred; the multi-property body parser is groundtruthed
// against real notices (news_id 245809 announcement, 249643 result).

export const config = {
  id: 'krakow',
  teryt: '126101_1',
  label: 'Kraków',
  authority: 'Urząd Miasta Krakowa (Wydział Skarbu Miasta)',
  host: 'bip.krakow.pl',
  source: 'html',
};
