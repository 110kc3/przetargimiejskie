// Sosnowiec parser tests -- fixtures from real API (June 2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAnnouncement, isFlatAuction, roundFromText, auctionDateFromText,
  areaFromText, priceFromText, htmlToText, isFlatResult, parseResultDoc,
  isLandAuction, parseLandAnnouncement,
  isCommercialAuction, isBuildingAuction, isGenericSaleAuction,
  parsePropertyAnnouncement, buildingAreaFromText, isSaleResult, saleResultKind,
} from '../src/cities/sosnowiec/parse.js';

const FLAT_TITLE =
  'Przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego nr 15 polozonego przy Alei Zwyciestwa 25';
const FLAT_CONTENT =
  '<p>PREZYDENT MIASTA SOSNOWCA og&#322;asza ustny przetarg nieograniczony na sprzeda&#380; ' +
  'lokalu mieszkalnego nr 15, po&#322;o&#380;onego przy Alei Zwyci&#281;stwa 25 w Sosnowcu. ' +
  'Budynek po&#322;o&#380;ony jest na dzia&#322;ce nr 2128 o pow. 438 m2. ' +
  'Wyposa&#380;enie: powierzchnia u&#380;ytkowa lokalu: 17,85 m&sup2;; pomieszczenia: pok&oacute;j. ' +
  'Cena wywo&#322;awcza do przetargu wynosi 77 000,00 z&#322;. ' +
  'Przetarg odb&#281;dzie si&#281; w dniu 23 stycznia 2026 r. w Urz&#281;dzie Miejskim.</p>';

test('isFlatAuction keeps flat auctions, drops land + bezprzetargowe', () => {
  assert.equal(isFlatAuction(FLAT_TITLE), true);
  assert.equal(isFlatAuction('Przetarg ustny na sprzedaz nieruchomosci niezabudowanej'), false);
  assert.equal(isFlatAuction('Wykaz lokali do sprzedazy bezprzetargowej'), false);
  assert.equal(isFlatAuction('Przetarg ustny na sprzedaz prawa wlasnosci lokalu mieszkalnego nr 59'), true);
});

test('parseAnnouncement extracts address/area/price/date/round', () => {
  const r = parseAnnouncement(FLAT_TITLE, FLAT_CONTENT);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'alei zwyciestwa|25|15');
  assert.equal(r.area_m2, 17.85);
  assert.equal(r.starting_price_pln, 77000);
  assert.equal(r.auction_date, '2026-01-23');
  assert.equal(r.round, 1);
});

test('htmlToText decodes numeric refs + &sup2;', () => {
  assert.equal(htmlToText('17,85 m&sup2;'), '17,85 m²');
  assert.equal(htmlToText('po&#322;o&#380;ony'), 'położony');
});

test('areaFromText prefers labelled flat area, rejects plot + cellar', () => {
  assert.equal(areaFromText('działka o pow. 438 m2, powierzchnia użytkowa lokalu: 40,15 m²'), 40.15);
  assert.equal(areaFromText('budynek na działce o pow. 488 m2'), null);
  assert.equal(areaFromText('komórka 4,5 m²'), null);
});

test('priceFromText handles spaced thousands + grosze', () => {
  assert.equal(priceFromText('Cena wywoławcza do przetargu wynosi 323 000,00 zł'), 323000);
});

test('auctionDateFromText: spelled month and numeric', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 23 stycznia 2026 r.'), '2026-01-23');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 06.09.2024 r.'), '2024-09-06');
});

test('roundFromText reads the oglasza...przetarg span, not history', () => {
  assert.equal(roundFromText('ogłasza ustny przetarg nieograniczony'), 1);
  assert.equal(roundFromText('ogłasza drugi ustny przetarg nieograniczony'), 2);
  assert.equal(roundFromText('ogłasza II ustny przetarg'), 2);
  assert.equal(
    roundFromText('ogłasza ustny przetarg na sprzedaż. Wcześniej trzeci przetarg zakończył się wynikiem negatywnym.'),
    1,
  );
});

const RESULT_TITLE =
  'Wyniki ustnego przetargu nieograniczonego na sprzedaz lokalu mieszkalnego w Sosnowcu przy Alei Zwyciestwa 25/15';
const RESULT_BODY =
  'OGLOSZENIE informuje, ze w dniu 23.01.2026 r. odbyl sie ustny przetarg ' +
  'nieograniczony na sprzedaz lokalu mieszkalnego o numerze 15 ' +
  'przy Alei Zwyciestwa 25 w Sosnowcu, o pow. uzytkowej 17,85 m2. ' +
  'Budynek polozony jest na dzialce o numerze 2128, obreb 0011, o pow. 438 m². ' +
  'Cena wywolawcza do przetargu wynosila: 77 000,00 zl ' +
  'W toku przetargu osiagnieto najwyzsza cene w wysokosci: 92 000,00 zl ' +
  'Osoba ustalona jako nabywca zostal Pan X';

test('isFlatResult keeps flat-sale results, drops land/dzierzawa/announcements', () => {
  assert.equal(isFlatResult(RESULT_TITLE), true);
  assert.equal(isFlatResult('Wyniki przetargu na przekazanie w dzierzawe nieruchomosci zabudowanej'), false);
  assert.equal(isFlatResult('Wyniki ustnego przetargu na sprzedaz nieruchomosci przy ul. J. Watta'), false);
  assert.equal(isFlatResult('Ogloszenie o przetargu na sprzedaz lokalu mieszkalnego'), false);
});

test('parseResultDoc: full sold record from a real-shaped notice', () => {
  const recs = parseResultDoc(`${RESULT_TITLE}\n${RESULT_BODY}`, '2026-02-02', 'u/a,562340');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.auction_date, '2026-01-23');
  assert.equal(r.address.building, '25');
  assert.equal(r.address.apt, '15');
  assert.equal(r.starting_price_pln, 77000);
  assert.equal(r.final_price_pln, 92000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.area_m2, 17.85);
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: negative wording => unsold, no achieved price', () => {
  const r = parseResultDoc(
    `${RESULT_TITLE}\nw dniu 23.01.2026 r. odbyl sie ustny przetarg na sprzedaz lokalu mieszkalnego o numerze 15 przy Alei Zwyciestwa 25. Cena wywolawcza do przetargu wynosila: 77 000,00 zl. Przetarg zakonczyl sie wynikiem negatywnym.`,
    null, 'u',
  )[0];
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 77000);
});

// ============== LAND tests ================================================

const LAND_TITLE_SINGLE =
  'Przetarg ustny nieograniczony na sprzedaz nieruchomosci niezabudowanej dzialka nr 2420 obreb 0010 Sosnowiec przy ul. Bohaterow Getta';
const LAND_CONTENT_SINGLE =
  '<p>PREZYDENT MIASTA SOSNOWCA og&#322;asza ustny przetarg nieograniczony ' +
  'na sprzeda&#380; nieruchomo&#347;ci po&#322;o&#380;onej w Sosnowcu, przy ul. Bohatr&#243;w Getta, ' +
  'oznaczonej geodezyjnie jako dzia&#322;ka nr 2420 obr&#281;b 0010 Sosnowiec, ' +
  'o powierzchni 1.457 m<sup>2</sup>, zapisanej w ksi&#281;dze wieczystej.</p>' +
  '<p>1. Cena wywo&#322;awcza do przetargu wynosi: 506.000,00 z&#322;</p>' +
  '<p>3. Przetarg odb&#281;dzie si&#281; w dniu <strong>06.09.2024 r.</strong></p>';

const LAND_TITLE_MERGED =
  'Przetarg ustny nieograniczony na sprzedaz nieruchomosci niezabudowanej polozonej w Sosnowcu, przy Alei Wolnosci.';
const LAND_CONTENT_MERGED =
  '<p>PREZYDENT MIASTA SOSNOWCA og&#322;asza ustny przetarg nieograniczony ' +
  'na sprzeda&#380; nieruchomo&#347;ci niezabudowanej ' +
  'po&#322;o&#380;onej w Sosnowcu, przy Alei Wolno&#347;ci, oznaczonej geodezyjnie jako ' +
  'dzia&#322;ki o numerach 2225/10, 2226/6, 2227/6, 2225/23, 2226/18, 2227/18, ' +
  'obr&#281;b 03 Zag&oacute;rze, o powierzchni &#322;&#261;cznej 1308 m<sup>2</sup>.</p>' +
  '<p>1. Cena wywo&#322;awcza do przetargu wynosi &ndash; 516 000,00 z&#322;</p>' +
  '<p>3. Przetarg odb&#281;dzie si&#281; w dniu <strong>10 lipca 2026 r.</strong></p>';

const LAND_TITLE_MULTI =
  'Przetargi ustne nieograniczone na sprzedaz nieruchomosci niezabudowanych przy ul. J. Watta w Sosnowcu.';
const LAND_CONTENT_MULTI =
  '<p>PREZYDENT MIASTA SOSNOWCA og&#322;asza ustne przetargi nieograniczone ' +
  'na sprzeda&#380; nast&#281;puj&#261;cych nieruchomo&#347;ci niezabudowanych.</p>' +
  '<p><strong>I.</strong> Nieruchomo&#347;&#263; oznaczona geodezyjne jako dzia&#322;ka nr <strong>856/14</strong>, ' +
  'obr&#281;b 0012 Sosnowiec, o powierzchni 14419 m2.</p>' +
  '<p><strong>II. </strong>Nieruchomo&#347;&#263; oznaczona geodezyjne jako dzia&#322;ka nr <strong>856/13</strong>, ' +
  'obr&#281;b 0012 Sosnowiec, o powierzchni 9061 m2.</p>' +
  '<p>- za nieruchomo&#347;&#263; oznaczon&#261; geodezyjnie jako dzia&#322;ka nr 856/14 &ndash; <strong>2.218.000,00 z&#322;</strong></p>' +
  '<p>- za nieruchomo&#347;&#263; oznaczon&#261; geodezyjnie jako dzia&#322;ka nr 856/13 wraz z udzia&#322;em dzia&#322;ki 856/11 &ndash; <strong>1.436.000,00 z&#322;</strong></p>' +
  '<p><strong>I. </strong>Przetarg na sprzeda&#380;nieruchomo&#347;ci oznaczonej geodezyjnie jako dzia&#322;ka nr 856/14 &ndash; <strong>6.02.2026 r., godz. 9.30</strong></p>' +
  '<p><strong>II. </strong>Przetarg na sprzeda&#380;nieruchomo&#347;ci oznaczonej geodezyjnie jako dzia&#322;ka nr 856/13 wraz z udzia&#322;em dzia&#322;ki nr 856/11 - <strong>9.02.2026 r., godz. 9.30</strong></p>';

test('isLandAuction keeps land, drops flats + dzierzawa + odwolanie + lista', () => {
  assert.equal(isLandAuction(LAND_TITLE_SINGLE), true);
  assert.equal(isLandAuction(LAND_TITLE_MERGED), true);
  assert.equal(isLandAuction(LAND_TITLE_MULTI), true);
  assert.equal(isLandAuction(FLAT_TITLE), false);
  assert.equal(isLandAuction('Pisemny przetarg nieograniczony na oddanie w dzierzawe nieruchomosci zabudowanej'), false);
  assert.equal(isLandAuction('Odwolanie ustnego przetargu nieograniczonego na sprzedaz nieruchomosci niezabudowanej'), false);
  assert.equal(isLandAuction('Lista osob zakwalifikowanych do przetargu na sprzedaz dzialki nr 779/2'), false);
  assert.equal(isLandAuction('Wyniki ustnego przetargu na sprzedaz nieruchomosci niezabudowanej'), false);
});

test('parseLandAnnouncement: single plot -- clean parcel, obreb, area, price, date', () => {
  const recs = parseLandAnnouncement(LAND_TITLE_SINGLE, LAND_CONTENT_SINGLE, 'https://bip/art/561518');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '2420');
  assert.equal(r.obreb, '0010 Sosnowiec');
  assert.equal(r.area_m2, 1457);
  assert.equal(r.starting_price_pln, 506000);
  assert.equal(r.auction_date, '2024-09-06');
  assert.equal(r.detail_url, 'https://bip/art/561518');
});

test('parseLandAnnouncement: multi-merged -- first parcel as key, spelled-month date', () => {
  const recs = parseLandAnnouncement(LAND_TITLE_MERGED, LAND_CONTENT_MERGED, 'https://bip/art/563249');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.dzialka_nr, '2225/10');
  assert.equal(r.obreb, '03 Zagórze');
  assert.equal(r.area_m2, 1308);
  assert.equal(r.starting_price_pln, 516000);
  assert.equal(r.auction_date, '2026-07-10');
  assert.ok(r.address_raw.includes('2225/10'));
  assert.ok(r.address_raw.includes('2227/6'));
});

test('parseLandAnnouncement: multi-separate -- one record per plot, own price+date', () => {
  const recs = parseLandAnnouncement(LAND_TITLE_MULTI, LAND_CONTENT_MULTI, 'https://bip/art/561651');
  assert.equal(recs.length, 2);
  const [p1, p2] = recs;
  assert.equal(p1.dzialka_nr, '856/14');
  assert.equal(p1.obreb, '0012 Sosnowiec');
  assert.equal(p1.area_m2, 14419);
  assert.equal(p1.starting_price_pln, 2218000);
  assert.equal(p1.auction_date, '2026-02-06');
  assert.equal(p2.dzialka_nr, '856/13');
  assert.equal(p2.obreb, '0012 Sosnowiec');
  assert.equal(p2.area_m2, 9061);
  assert.equal(p2.starting_price_pln, 1436000);
  assert.equal(p2.auction_date, '2026-02-09');
});

// ============== BUILT / COMMERCIAL / CO-OP coverage =======================
// Real titles/bodies from the live API (June 2026). Built-up properties
// ("nieruchomość zabudowana", e.g. 563715 Targowej 12 & 562961 Szczecińskiej 11),
// commercial units ("lokal użytkowy", e.g. 557464) and co-op flats
// ("…prawa do lokalu mieszkalnego…", e.g. 563075) used to be dropped.

// 563715 — Targowej 12: kamienica, parcel+area only in the body, no building area.
const BUILDING_TITLE =
  'Przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej położonej w Sosnowcu, przy ul. Targowej 12. ';
const BUILDING_CONTENT =
  '<h1>Przetarg ustny nieograniczony na sprzeda&#380; nieruchomo&#347;ci zabudowanej.</h1>' +
  '<p>PREZYDENT MIASTA SOSNOWCA og&#322;asza ustny przetarg nieograniczony ' +
  'na sprzeda&#380; nieruchomo&#347;ci zabudowanej, stanowi&#261;cej w&#322;asno&#347;&#263; Gminy Sosnowiec, ' +
  'po&#322;o&#380;onej w Sosnowcu przy ul. Targowej 12 oznaczonej geodezyjnie jako ' +
  'dzia&#322;ka nr 2802, obr&#281;b 11 Sosnowiec, o powierzchni 1385 m<sup>2</sup>, ujawniona w ksi&#281;dze wieczystej. ' +
  'Na ww. dzia&#322;ce posadowiony jest budynek naro&#380;nej kamienicy z oficyn&#261;.</p>' +
  '<p><strong>1.</strong> Cena wywo&#322;awcza do przetargu wynosi: <strong>8 867 000,00 z&#322;</strong>.</p>' +
  '<p><strong>3.</strong> Przetarg odb&#281;dzie si&#281; w dniu <strong>21.08.2026 r.</strong>, o godz. 9.30.</p>';

// 562961 — Szczecińskiej 11: budynek mieszkalno-użytkowy with a stated building area.
const BUILDING2_TITLE =
  'Przetarg ustny nieograniczony  na sprzedaż nieruchomości zabudowanej położonej w Sosnowcu przy ul. Szczecińskiej 11';
const BUILDING2_CONTENT =
  '<p>na sprzeda&#380; nieruchomo&#347;ci zabudowanej, stanowi&#261;cej w&#322;asno&#347;&#263; Gminy Sosnowiec, ' +
  'po&#322;o&#380;onej w Sosnowcu przy ul. Szczeci&#324;skiej 11, oznaczonej geodezyjnie jako ' +
  'dzia&#322;ka nr 7212/1, obr&#281;b 0009 Sosnowiec, o powierzchni 2717 m<sup>2</sup>.</p>' +
  '<p>Na wskazanej dzia&#322;ce znajduje si&#281; budynek mieszkalno-u&#380;ytkowy, dwukondygnacyjny, ' +
  'o powierzchni u&#380;ytkowej 709,58 m&sup2;.</p>' +
  '<p><strong>1.</strong> Cena wywo&#322;awcza do przetargu wynosi 2 505 000,00 z&#322;.</p>' +
  '<p>Przetarg odb&#281;dzie si&#281; w dniu <strong>19 czerwca 2026 r.</strong> w siedzibie Urz&#281;du.</p>';

// 557464 — lokal użytkowy on Skłodowskiej-Curie (building number only in the body).
const COMMERCIAL_TITLE =
  'Przetarg ustny nieograniczony na sprzedaż lokalu użytkowego położnego w Sosnowcu przy ul. M. Skłodowskiej-Curie';
const COMMERCIAL_CONTENT =
  '<p>na sprzeda&#380; przys&#322;uguj&#261;cego Gminie Sosnowiec prawa w&#322;asno&#347;ci lokalu u&#380;ytkowego ' +
  'po&#322;o&#380;onego w Sosnowcu w budynku wielorodzinnym przy ul. M. Sk&#322;odowskiej-Curie 14, ' +
  'o powierzchni u&#380;ytkowej 27,26 m2, na nieruchomo&#347;ci oznaczonej geodezyjnie jako dzia&#322;ka nr 5499, obr&#281;b 0009 Sosnowiec.</p>' +
  '<p><strong>1.</strong> Cena wywo&#322;awcza do przetargu wynosi: <strong>68.150,00 z&#322;</strong>.</p>' +
  '<p><strong>3.</strong> Przetarg odb&#281;dzie si&#281; w dniu <strong>25.10.2024 r.</strong> o godz. 9.30.</p>';

// 563075 — co-op flat on Kaliskiej 14a/2.
const COOP_TITLE =
  'Przetarg ustny nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego położnego w Sosnowcu przy ul. Kaliskiej 14a/2';
const COOP_CONTENT =
  '<p>na sprzeda&#380; przys&#322;uguj&#261;cego Gminie Sosnowiec sp&oacute;&#322;dzielczego w&#322;asno&#347;ciowego ' +
  'prawa do lokalu mieszkalnego nr 2 po&#322;o&#380;onego w Sosnowcu w budynku wielorodzinnym przy ul. Kaliskiej 14a, ' +
  'o powierzchni u&#380;ytkowej 48,25 m2.</p>' +
  '<p><strong>1.</strong> Cena wywo&#322;awcza do przetargu wynosi: <strong>241.250,00 z&#322;</strong>.</p>' +
  '<p><strong>3.</strong> Przetarg odb&#281;dzie si&#281; w dniu <strong>12.06.2026 r.</strong> o godz. 10.00.</p>';

const COOP_TRUNC_TITLE = // title cut before "mieszkalnego" — body must confirm
  'Przetarg ustny nieograniczony na sprzedaż własnościowego prawa do lokalu poł. przy';

const GENERIC_SALE_TITLE = // class word only in the body
  'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż nieruchomości przy ul. Bohaterów Getta';

test('classifiers route built / commercial / land / flat without overlap', () => {
  // building: zabudowana, no lokal
  assert.equal(isBuildingAuction(BUILDING_TITLE), true);
  assert.equal(isBuildingAuction(BUILDING2_TITLE), true);
  assert.equal(isFlatAuction(BUILDING_TITLE), false);
  assert.equal(isCommercialAuction(BUILDING_TITLE), false);
  assert.equal(isLandAuction(BUILDING_TITLE), false); // (?<!nie)zabudowan must not leak to land
  // niezabudowana stays land, never building
  assert.equal(isBuildingAuction('Przetarg ustny na sprzedaz nieruchomosci niezabudowanej dzialka nr 7'), false);
  assert.equal(isLandAuction('Przetarg ustny na sprzedaz nieruchomosci niezabudowanej dzialka nr 7'), true);
  // commercial
  assert.equal(isCommercialAuction(COMMERCIAL_TITLE), true);
  assert.equal(isFlatAuction(COMMERCIAL_TITLE), false);
  assert.equal(isBuildingAuction(COMMERCIAL_TITLE), false);
  assert.equal(isLandAuction(COMMERCIAL_TITLE), false);
  // lease / withdrawal / result never classify as a sale
  assert.equal(isBuildingAuction('Pisemny przetarg nieograniczony na oddanie w dzierzawe nieruchomosci zabudowanej'), false);
  assert.equal(isCommercialAuction('Wyniki przetargu na sprzedaz lokalu uzytkowego'), false);
});

test('co-op flat: full title direct, truncated title needs body confirmation', () => {
  assert.equal(isFlatAuction(COOP_TITLE), true); // full title already carries "lokalu mieszkalnego"
  assert.equal(isFlatAuction(COOP_TRUNC_TITLE), false); // title alone is not enough
  assert.equal(isFlatAuction(COOP_TRUNC_TITLE, 'na sprzedaż prawa do lokalu mieszkalnego nr 5'), true);
  // a truncated *commercial* prawo-title must NOT be mistaken for a flat
  assert.equal(isFlatAuction('Przetarg na sprzedaz prawa do lokalu uzytkowego', 'lokal uzytkowy'), false);
});

test('generic "na sprzedaż nieruchomości" title routes via the body', () => {
  assert.equal(isGenericSaleAuction(GENERIC_SALE_TITLE), true);
  assert.equal(isBuildingAuction(GENERIC_SALE_TITLE), false);
  assert.equal(isCommercialAuction(GENERIC_SALE_TITLE), false);
  // with a działka in the body it becomes land
  assert.equal(isLandAuction(GENERIC_SALE_TITLE, 'oznaczonej jako działka nr 2420 obręb 0010'), true);
  // without a parcel hint in the body it does not masquerade as land
  assert.equal(isLandAuction(GENERIC_SALE_TITLE, 'budynek kamienicy'), false);
});

test('buildingAreaFromText reads whole-building usable area (no 300 m² cap)', () => {
  assert.equal(buildingAreaFromText('o powierzchni użytkowej 709,58 m²'), 709.58);
  assert.equal(buildingAreaFromText('budynek narożnej kamienicy'), null);
});

test('parsePropertyAnnouncement: built property (Targowej 12) → kind zabudowana', () => {
  const r = parsePropertyAnnouncement(BUILDING_TITLE, BUILDING_CONTENT, 'zabudowana');
  assert.ok(r);
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.building, '12');
  assert.equal(r.address.apt, null);
  assert.equal(r.starting_price_pln, 8867000);
  assert.equal(r.auction_date, '2026-08-21');
  assert.equal(r.area_m2, null); // no building usable area stated; plot area is carried separately
  assert.equal(r.dzialka_nr, '2802');
  assert.equal(r.obreb, '11 Sosnowiec');
  assert.equal(r.plot_area_m2, 1385);
});

test('parsePropertyAnnouncement: built property (Szczecińskiej 11) → building usable area', () => {
  const r = parsePropertyAnnouncement(BUILDING2_TITLE, BUILDING2_CONTENT, 'zabudowana');
  assert.ok(r);
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.building, '11');
  assert.equal(r.area_m2, 709.58); // whole-building area, above the flat cap
  assert.equal(r.starting_price_pln, 2505000);
  assert.equal(r.auction_date, '2026-06-19');
  assert.equal(r.dzialka_nr, '7212/1');
  assert.equal(r.plot_area_m2, 2717);
});

test('parsePropertyAnnouncement: commercial unit → kind uzytkowy, clean address from body', () => {
  const r = parsePropertyAnnouncement(COMMERCIAL_TITLE, COMMERCIAL_CONTENT, 'uzytkowy');
  assert.ok(r);
  assert.equal(r.kind, 'uzytkowy');
  // building number lives only in the body; address must not glue the title tail on
  assert.equal(r.address_raw, 'M. Skłodowskiej-Curie 14');
  assert.equal(r.address.building, '14');
  assert.equal(r.area_m2, 27.26); // flat-sized usable area
  assert.equal(r.starting_price_pln, 68150);
  assert.equal(r.auction_date, '2024-10-25');
});

test('parseAnnouncement still keys a co-op flat as mieszkalny', () => {
  const r = parseAnnouncement(COOP_TITLE, COOP_CONTENT);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.building, '14A'); // parseAddress upper-cases the building suffix
  assert.equal(r.address.apt, '2');
  assert.equal(r.area_m2, 48.25);
  assert.equal(r.starting_price_pln, 241250);
  assert.equal(r.auction_date, '2026-06-12');
});

test('result classifier keeps flat + commercial + built results and stamps the kind', () => {
  assert.equal(saleResultKind('Wyniki ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego przy Alei Zwyciestwa 25/15'), 'mieszkalny');
  assert.equal(saleResultKind('Wyniki przetargu na sprzedaż lokalu użytkowego przy ul. Skłodowskiej-Curie 14'), 'uzytkowy');
  assert.equal(saleResultKind('Wyniki przetargu na sprzedaż nieruchomości zabudowanej przy ul. Targowej 12'), 'zabudowana');
  assert.equal(saleResultKind('Wyniki przetargu na sprzedaż nieruchomości niezabudowanej'), null); // land result: not kept
  assert.equal(saleResultKind('Wyniki przetargu na przekazanie w dzierzawe nieruchomosci zabudowanej'), null);
  assert.equal(isSaleResult('Ogloszenie o przetargu na sprzedaz lokalu mieszkalnego'), false); // not a "Wyniki" notice
  assert.equal(isFlatResult('Wyniki ustnego przetargu na sprzedaz lokalu mieszkalnego'), true); // legacy export unchanged
});

test('parseResultDoc: built-property result → sold record, kind zabudowana, building area', () => {
  const title = 'Wyniki ustnego przetargu nieograniczonego na sprzedaż nieruchomości zabudowanej przy ul. Szczecińskiej 11';
  const body =
    'OGŁOSZENIE informuje, że w dniu 19.06.2026 r. odbył się ustny przetarg nieograniczony na sprzedaż ' +
    'nieruchomości zabudowanej przy ul. Szczecińskiej 11 w Sosnowcu o powierzchni użytkowej 709,58 m². ' +
    'Cena wywoławcza do przetargu wynosiła: 2 505 000,00 zł ' +
    'W toku przetargu osiągnięto najwyższą cenę w wysokości: 2 600 000,00 zł ' +
    'Osoba ustalona jako nabywca został Pan X';
  const r = parseResultDoc(`${title}\n${body}`, '2026-06-25', 'u/a,562961')[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.building, '11');
  assert.equal(r.auction_date, '2026-06-19');
  assert.equal(r.starting_price_pln, 2505000);
  assert.equal(r.final_price_pln, 2600000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.area_m2, 709.58);
});
