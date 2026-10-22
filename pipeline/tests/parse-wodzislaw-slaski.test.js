// Wodzisław Śląski parser unit tests.
// Fixtures are exact representations of real documents published via FINN eUrząd
// on bip.wodzislaw-slaski.pl / eurzad.finn.pl/gmwodzislawsl.
//
// Groundtruth:
//   ANN flat: os. 1 Maja 27/1 (72.49 m², 200 000 zł, round 1, date 2024-11-26)
//   ANN multi-flat: ul. PCK 16/11 (28.44 m², 95 000 zł) + os. 1 Maja 35/19 (54.12 m², 165 000 zł, date 2023-07-13)
//   ANN house: ul. Leonida Teligi 69 (zabudowana, round 4, date 2026-10-15)
//   ANN land: ul. Ofiar Oświęcimskich (4378 m², 360 000 zł, round 2, date 2026-11-26)
//   RES flat sold: ul. kard. Stefana Wyszyńskiego 26/14 (round 2, wyw. 125 000 zł, hammer 147 750 zł, buyer "Dawid Sitko", date 2023-10-12)
//   RES flat unsold: os. 1 Maja 27/1 (round 1, wyw. 215 000 zł, unsold "brak uczestników", 72.49 m², date 2024-09-19)
//   RES land sold: ul. Kwiatowa (dz. 3153/1, 1640 m², round 1, wyw. 145 000 zł, hammer 178 450 zł, buyer "PHU ,,BARTEX” Grzegorz Oślizło", date 2026-08-06)
//   RES house sold: ul. Chrobrego 229 (round 4, date 2022-06-14, sold)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isResultNotice,
  isSaleAnnouncement,
  classifyAssetKind,
  roundFromText,
  announcementDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  outcomeFromText,
  buyerFromText,
  areaFromText,
  addressFromText,
  landFieldsFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/wodzislaw-slaski/parse.js';

// ==================================================================== FIXTURES

const FIXTURE_ANN_1_MAJA = `OGŁOSZENIE O PRZETARGU

PREZYDENT MIASTA WODZISŁAWIA ŚLĄSKIEGO
działając na podstawie art. 38 ust.1 i 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce
nieruchomościami (tekst jednolity Dz.U. z 2024 r. poz. 1145 ze zm.)
ogłasza
drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 27/I/1 położonego
w Wodzisławiu Śląskim przy os. 1 Maja

1. Oznaczenie nieruchomości według księgi wieczystej oraz katastru nieruchomości
Lokal mieszkalny nr 27/I/1 znajdujący się w budynku wielomieszkaniowym nr 27 przy
os. 1 Maja w Wodzisławiu Śląskim. Działka nr 736/1, obręb Wilchwy, mapa 6, rodzaj użytków
B – tereny mieszkaniowe. Do lokalu prowadzona jest księga wieczysta nr GL1W/00057397/4.

2. Opis nieruchomości
Lokal mieszkalny nr 27/I/1 znajdujący się na drugiej kondygnacji (pierwsze piętro)
wielomieszkaniowego budynku nr 27 położonego w Wodzisławiu Śląskim przy os. 1 Maja.
Lokal składa się z czterech pokoi, kuchni z oknem, łazienki, wc i przedpokoju o powierzchni
72,49 m2. Do mieszkania przynależy loggia, do dyspozycji jest piwnica.

5. Cena wywoławcza nieruchomości brutto 200.000,00 zł
Wadium 40.000,00 zł
Minimalne postąpienie 2.000,00 zł

9. Termin i miejsce przetargu:
Przetarg odbędzie się w dniu 26 listopada 2024 r. o godz. 10.00 w siedzibie Urzędu
Miasta Wodzisławia Śląskiego przy ul. Bogumińskiej 4B, sala 206, piętro I.`;

const FIXTURE_ANN_MULTI = `OGŁOSZENIE O PRZETARGACH
Prezydent Miasta Wodzisławia Śląskiego
ogłasza

Pierwszy przetarg ustny nieograniczony na sprzedaż spółdzielczego własnościowego
prawa do lokalu mieszkalnego nr 16/11 położonego w Wodzisławiu Śląskim przy ul. PCK.

1. Oznaczenie nieruchomości:
Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 16/11 znajdującego się
w budynku wielomieszkaniowym nr 14-16-18-20 przy ul. PCK w Wodzisławiu Śląskim.
2. Opis nieruchomości:
Lokal o powierzchni użytkowej 28,44 m2.
5. Cena wywoławcza nieruchomości netto 95.000,00 zł
Wadium 19.000,00 zł

Pierwszy przetarg ustny nieograniczony na sprzedaż spółdzielczego
własnościowego prawa do lokalu mieszkalnego nr 35/19 położonego w Wodzisławiu
Śląskim przy os. 1 Maja.

1. Oznaczenie nieruchomości:
Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 35/19 znajdującego się
w budynku wielomieszkaniowym nr 35 przy os. 1 Maja w Wodzisławiu Śląskim.
2. Opis nieruchomości:
Lokal o powierzchni użytkowej 54,12 m2.
5. Cena wywoławcza nieruchomości netto 165.000,00 zł
Wadium 33.000,00 zł

9. Termin i miejsce przetargu:
Przetarg odbędzie się w dniu 13 lipca 2023 r. o godz. 10.00 w Urzędzie Miasta przy ul. Bogumińskiej 4A.`;

const FIXTURE_ANN_LAND = `OGŁOSZENIE O PRZETARGU
PREZYDENT MIASTA WODZISŁAWIA ŚLĄSKIEGO
ogłasza
drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej
stanowiącej własność Gminy Miasta Wodzisławia Śląskiego, położonej w Wodzisławiu
Śląskim przy ul. Ofiar Oświęcimskich, o łącznej powierzchni 4378 m².

1. Oznaczenie nieruchomości według księgi wieczystej i danych z ewidencji gruntów
i budynków jako działki:
nr 3389/141 o pow. 478 m², nr 3388/141 o pow. 1566 m², nr 3387/141 o pow. 1115 m², nr 3386/141 o pow. 1219 m²,
arkusz mapy 3, obręb Wodzisław.

5. Cena wywoławcza nieruchomości netto 360.000,00 zł
Wadium 72.000,00 zł

9. Termin i miejsce przetargu:
Przetarg odbędzie się w dniu 26 listopada 2026 r. w siedzibie Urzędu Miasta przy ul. Bogumińskiej 4B.`;

const FIXTURE_ANN_HOUSE = `OGŁOSZENIE O PRZETARGU
PREZYDENT MIASTA WODZISŁAWIA ŚLĄSKIEGO
ogłasza
czwarty przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej zabudowanej
stanowiącej własność Gminy Miasta Wodzisławia Śląskiego, położonej w Wodzisławiu
Śląskim przy ul. Leonida Teligi 69

1. Oznaczenie nieruchomości według księgi wieczystej i danych z ewidencji gruntów:
działka nr 1079/35 o powierzchni 2849 m², arkusz mapy 4, obręb Wilchwy, (użytek
gruntowy B - tereny mieszkaniowe 834 m²).
2. Opis nieruchomości:
Nieruchomość zabudowana jest budynkiem mieszkalnym wolnostojącym o powierzchni użytkowej 115,20 m2.

5. Cena wywoławcza nieruchomości netto 230.000,00 zł

9. Termin i miejsce przetargu:
Przetarg odbędzie się w dniu 15 października 2026 r. przy ul. Bogumińskiej 4B.`;

const FIXTURE_RES_SOLD_FLAT = `Wodzisław Śląski, dnia 20 października 2023 r.
Informacja o wyniku przetargu

Na podstawie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r.
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (tekst jednolity Dz. U. z 2021 r. poz. 2213) Prezydent Miasta Wodzisławia
Śląskiego informuje, że dnia 12 października 2023 r. w Urzędzie Miasta Wodzisławia
Śląskiego przy ul. Bogumińskiej 4B, sala 206 został przeprowadzony przez komisję
przetargową drugi przetarg ustny nieograniczony na sprzedaż
spółdzielczego własnościowego prawa do lokalu mieszkalnego położonego w Wodzisławiu
Śląskim przy ul. kard. Stefana Wyszyńskiego 26/19, zakończony wynikiem pozytywnym.

1. Oznaczenie nieruchomości według katastru nieruchomości i księgi wieczystej:
Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 26/14 znajdującego się
w budynku wielomieszkaniowym nr 22-24-26-28 przy ul. kard. Stefana Wyszyńskiego
w Wodzisławiu Śląskim. Działka nr 830/138, obręb Wodzisław.

2. Liczba osób dopuszczonych do uczestnictwa w przetargu: 2
3. Cena wywoławcza nieruchomości netto: 125.000,00 zł
  Najwyższa cena osiągnięta w przetargu netto: 147.750,00 zł
4. Nabywca nieruchomości: Dawid Sitko.`;

const FIXTURE_RES_UNSOLD_FLAT = `Wodzisław Śląski, dnia 20.09.2024 r.
Informacja o wyniku przetargu

Prezydent Miasta Wodzisławia Śląskiego informuje że w dniu 19 września 2024 r. w Urzędzie Miasta
został przeprowadzony pierwszy przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego nr 1, stanowiącego własność Gminy Miasta Wodzisławia Śląskiego
położonego w Wodzisławiu Śląskim przy os. 1 Maja 27, o powierzchni użytkowej 72,49 m²,
zakończony wynikiem negatywnym.

1. Oznaczenie nieruchomości:
Lokal mieszkalny nr 1, położony przy os. 1 Maja 27, o powierzchni użytkowej 72,49 m².
2. Liczba osób dopuszczonych do uczestnictwa w przetargu: 0
3. Cena wywoławcza nieruchomości brutto: 215.000,00 zł
4. Nabywca nieruchomości: brak`;

const FIXTURE_RES_SOLD_LAND = `Wodzisław Śląski, dnia 13.08.2026 r.
INFORMACJA O WYNIKU PRZETARGU

Prezydent Miasta Wodzisławia Śląskiego informuje, że w dniu 6 sierpnia 2026 r.
w Urzędzie Miasta został przeprowadzony pierwszy przetarg ustny nieograniczony
na sprzedaż nieruchomości gruntowej niezabudowanej, położonej w Wodzisławiu Śląskim
przy ul. Kwiatowej, zakończony wynikiem pozytywnym.

1. Oznaczenie według danych z ewidencji gruntów:
działka nr 3153/1, o powierzchni 1640 m², obręb Wilchwy.
2. Liczba osób dopuszczonych: 3
3. Cena wywoławcza nieruchomości netto 145.000,00 zł
  Najwyższa cena osiągnięta w przetargu netto 178.450,00 zł
4. Nabywca nieruchomości: PHU ,,BARTEX” Grzegorz Oślizło.`;

const FIXTURE_RES_SOLD_HOUSE = `Wodzisław Śląski, dnia 20.06.2022 r.
Informacja o wyniku przetargu

Prezydent Miasta Wodzisławia Śląskiego informuje że w dniu 14 czerwca 2022 r.
w Urzędzie Miasta Wodzisławia Śląskiego został przeprowadzony
czwarty przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej zabudowanej
stanowiącej własność Gminy Miasta Wodzisławia Śląskiego położonej w Wodzisławiu Śląskim
przy ul. Chrobrego 229, zakończony wynikiem pozytywnym.

1. Oznaczenie: nieruchomość gruntowa zabudowana, ul. Chrobrego 229, o powierzchni 1268 m².
2. Liczba osób dopuszczonych: 1
3. Cena wywoławcza netto 310.000,00 zł
  Najwyższa cena osiągnięta w przetargu netto: 313.100,00 zł
4. Nabywca nieruchomości: Jan Kowalski.`;

// ======================================================================= TESTS

test('isResultNotice correctly classifies result notices vs announcements', () => {
  assert.equal(isResultNotice(FIXTURE_RES_SOLD_FLAT), true);
  assert.equal(isResultNotice(FIXTURE_RES_UNSOLD_FLAT), true);
  assert.equal(isResultNotice(FIXTURE_RES_SOLD_LAND), true);
  assert.equal(isResultNotice(FIXTURE_ANN_1_MAJA), false);
  assert.equal(isResultNotice(FIXTURE_ANN_MULTI), false);
  assert.equal(isResultNotice('Ogłoszenie o przetargu na najem lokalu'), false);
});

test('isSaleAnnouncement correctly filters open sales and drops non-auctions', () => {
  assert.equal(isSaleAnnouncement('Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isSaleAnnouncement('ogłoszenie o drugim przetargu ustnym nieograniczonym na sprzedaż nieruchomości gruntowej'), true);
  assert.equal(isSaleAnnouncement('Ogłoszenie o przetargu na najem lokalu użytkowego'), false);
  assert.equal(isSaleAnnouncement('Wykaz nieruchomości przeznaczonych do sprzedaży w drodze bezprzetargowej na rzecz najemców'), false);
  assert.equal(isSaleAnnouncement('Informacja o wyniku przetargu na sprzedaż nieruchomości'), false);
  assert.equal(isSaleAnnouncement('Ogłoszenie o odwołaniu przetargu na sprzedaż'), false);
});

test('classifyAssetKind correctly distinguishes flats, land, houses, and commercial', () => {
  assert.equal(classifyAssetKind('sprzedaż lokalu mieszkalnego nr 27'), 'mieszkalny');
  assert.equal(classifyAssetKind('sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego'), 'mieszkalny');
  assert.equal(classifyAssetKind('sprzedaż nieruchomości gruntowej niezabudowanej'), 'grunt');
  assert.equal(classifyAssetKind('sprzedaż nieruchomości gruntowej zabudowanej'), 'zabudowana');
  assert.equal(classifyAssetKind('sprzedaż lokalu użytkowego'), 'uzytkowy');
  assert.equal(classifyAssetKind('sprzedaż garażu'), 'garaz');
});

test('roundFromText detects ordinals and Roman numerals', () => {
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('ogłasza drugi przetarg ustny'), 2);
  assert.equal(roundFromText('ogłasza trzeci przetarg ustny'), 3);
  assert.equal(roundFromText('ogłasza czwarty przetarg ustny'), 4);
  assert.equal(roundFromText('I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('IV przetarg ustny nieograniczony'), 4);
});

test('price extraction handles netto, brutto, spaces, and commas', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości brutto 200.000,00 zł'), 200000);
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości netto: 125.000,00 zł'), 125000);
  assert.equal(startingPriceFromText('Cena wywoławcza 95 000 zł'), 95000);
  assert.equal(achievedPriceFromText('Najwyższa cena osiągnięta w przetargu netto: 147.750,00 zł'), 147750);
  assert.equal(achievedPriceFromText('Najwyższa cena osiągnięta w przetargu netto 178.450,00 zł'), 178450);
});

test('outcomeFromText and buyerFromText parse results accurately', () => {
  const sold = outcomeFromText(FIXTURE_RES_SOLD_FLAT);
  assert.equal(sold.outcome, 'sold');
  assert.equal(sold.unsold_reason, null);
  assert.equal(buyerFromText(FIXTURE_RES_SOLD_FLAT), 'Dawid Sitko');

  const unsold = outcomeFromText(FIXTURE_RES_UNSOLD_FLAT);
  assert.equal(unsold.outcome, 'unsold');
  assert.equal(unsold.unsold_reason, 'brak uczestników');

  assert.equal(buyerFromText(FIXTURE_RES_SOLD_LAND), 'PHU ,,BARTEX” Grzegorz Oślizło');
});

test('addressFromText handles complex estate and numbered street formats', () => {
  // os. 1 Maja with staircase: 27/I/1 -> 27/1
  const a1 = addressFromText('', FIXTURE_ANN_1_MAJA);
  assert.equal(a1.address_raw, 'os. 1 Maja 27/1');
  assert.equal(a1.address.key, '1 maja|27|1');

  // Numbered street: 26 Marca 29/15
  const a2 = addressFromText('sprzedaż lokalu przy ul. 26 Marca 29/15', '');
  assert.equal(a2.address_raw, 'ul. 26 Marca 29/15');
  assert.equal(a2.address.street, '26 Marca');
  assert.equal(a2.address.building, '29');
  assert.equal(a2.address.apt, '15');

  // House: ul. Leonida Teligi 69
  const a3 = addressFromText('', FIXTURE_ANN_HOUSE);
  assert.equal(a3.address_raw, 'ul. Leonida Teligi 69');
  assert.equal(a3.address.building, '69');
  assert.equal(a3.address.apt, null);

  // Venue guard: town hall address (ul. Bogumińska 4B) must not match as property address
  const aVenue = addressFromText('Ogłoszenie w Urzędzie Miasta', 'Przetarg odbędzie się w siedzibie Urzędu Miasta przy ul. Bogumińskiej 4B.');
  assert.equal(aVenue, null);
});

test('parseAnnouncement parses single flat auction correctly', () => {
  const recs = parseAnnouncement(
    'Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego położonego przy os. 1 Maja 27/1/1',
    FIXTURE_ANN_1_MAJA,
    'https://eurzad.finn.pl/rejestr/986209',
  );
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'mieszkalny');
  assert.equal(recs[0].address_raw, 'os. 1 Maja 27/1');
  assert.equal(recs[0].starting_price_pln, 200000);
  assert.equal(recs[0].area_m2, 72.49);
  assert.equal(recs[0].auction_date, '2024-11-26');
  assert.equal(recs[0].round, 2);
});

test('parseAnnouncement splits multi-lot flat announcement into distinct records', () => {
  const recs = parseAnnouncement(
    'Ogłoszenie o przetargach na sprzedaż praw do lokali przy ul. PCK 16/11 oraz os. 1 Maja 35/19',
    FIXTURE_ANN_MULTI,
    'https://eurzad.finn.pl/rejestr/896447',
  );
  assert.equal(recs.length, 2);

  const pck = recs.find((r) => r.address_raw === 'ul. PCK 16/11');
  assert.ok(pck);
  assert.equal(pck.kind, 'mieszkalny');
  assert.equal(pck.starting_price_pln, 95000);
  assert.equal(pck.area_m2, 28.44);
  assert.equal(pck.auction_date, '2023-07-13');

  const maja = recs.find((r) => r.address_raw === 'os. 1 Maja 35/19');
  assert.ok(maja);
  assert.equal(maja.kind, 'mieszkalny');
  assert.equal(maja.starting_price_pln, 165000);
  assert.equal(maja.area_m2, 54.12);
  assert.equal(maja.auction_date, '2023-07-13');
});

test('parseAnnouncement parses land announcement with cadastral parcels and area', () => {
  const recs = parseAnnouncement(
    'ogłoszenie o drugim przetargu ustnym nieograniczonym na sprzedaż nieruchomości gruntowej niezabudowanej, położonej w Wodzisławiu Śląskim przy ul. Ofiar Oświęcimskich',
    FIXTURE_ANN_LAND,
    'https://eurzad.finn.pl/rejestr/1126864',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address_raw, 'ul. Ofiar Oświęcimskich');
  assert.equal(r.obreb, 'Wodzisław');
  assert.equal(r.dzialka_nr, '3389/141, 3388/141, 3387/141, 3386/141');
  assert.equal(r.area_m2, 4378);
  assert.equal(r.starting_price_pln, 360000);
  assert.equal(r.auction_date, '2026-11-26');
  assert.equal(r.round, 2);
});

test('parseAnnouncement parses house (zabudowana) correctly', () => {
  const recs = parseAnnouncement(
    'ogłoszenie o czwartym przetargu ustnym nieograniczonym na sprzedaż nieruchomości gruntowej zabudowanej, położonej w Wodzisławiu Śląskim przy ul. Leonida Teligi 69',
    FIXTURE_ANN_HOUSE,
    'https://eurzad.finn.pl/rejestr/1123413',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address_raw, 'ul. Leonida Teligi 69');
  assert.equal(r.address.building, '69');
  assert.equal(r.starting_price_pln, 230000);
  assert.equal(r.area_m2, 115.20);
  assert.equal(r.round, 4);
  assert.equal(r.auction_date, '2026-10-15');
});

test('parseResultDoc parses sold flat result with hammer price and buyer', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_SOLD_FLAT,
    null,
    'https://eurzad.finn.pl/server/pobierz_rejestry_zalacznik/979477',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. kard. Stefana Wyszyńskiego 26/14');
  assert.equal(r.address.key, 'kard stefana wyszynskiego|26|14');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2023-10-12');
  assert.equal(r.starting_price_pln, 125000);
  assert.equal(r.final_price_pln, 147750);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.buyer, 'Dawid Sitko');
});

test('parseResultDoc parses unsold flat result', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_UNSOLD_FLAT,
    null,
    'https://eurzad.finn.pl/server/pobierz_rejestry_zalacznik/1057121',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'os. 1 Maja 27/1');
  assert.equal(r.address.key, '1 maja|27|1');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2024-09-19');
  assert.equal(r.starting_price_pln, 215000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak uczestników');
  assert.equal(r.area_m2, 72.49);
});

test('parseResultDoc parses sold land result with parcels and buyer', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_SOLD_LAND,
    null,
    'https://eurzad.finn.pl/server/pobierz_rejestry_zalacznik/1234869',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '3153/1');
  assert.equal(r.obreb, 'Wilchwy');
  assert.equal(r.area_m2, 1640);
  assert.equal(r.address_raw, 'ul. Kwiatowej');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-08-06');
  assert.equal(r.starting_price_pln, 145000);
  assert.equal(r.final_price_pln, 178450);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.buyer, 'PHU ,,BARTEX” Grzegorz Oślizło');
});

test('parseResultDoc parses sold house result', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_SOLD_HOUSE,
    null,
    'https://eurzad.finn.pl/server/pobierz_rejestry_zalacznik/870479',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address_raw, 'ul. Chrobrego 229');
  assert.equal(r.address.building, '229');
  assert.equal(r.round, 4);
  assert.equal(r.auction_date, '2022-06-14');
  assert.equal(r.starting_price_pln, 310000);
  assert.equal(r.final_price_pln, 313100);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.buyer, 'Jan Kowalski');
});

test('parseResultDoc filters out rental results', () => {
  const rentalNotice = 'Informacja o wyniku przetargu na najem lokalu użytkowego... stawka czynszu...';
  const recs = parseResultDoc(rentalNotice, null, 'https://example.com/doc.pdf');
  assert.deepEqual(recs, []);
});
