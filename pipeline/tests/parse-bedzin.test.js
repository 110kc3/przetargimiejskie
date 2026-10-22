// Będzin parser tests.
// Fixtures are faithful captures of REAL notice TITLE + BODY texts fetched live
// from bedzin.bip.info.pl. Each fixture feeds buildRecordText() exactly as crawl.js does.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isResultDoc,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  addressRawFromText,
  landStreetFromText,
  landPlotFromText,
  kindFromText,
  parsePLN,
  parseNum,
} from '../src/cities/bedzin/parse.js';
import { parseBoardPage, extractDocBody, extractAttachmentLinks } from '../src/cities/bedzin/crawl.js';

// ----------------------------------------------------------------- fixtures

const MALACHOWSKIEGO_16_ACTIVE = {
  title: 'Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego',
  body:
    'PREZYDENT MIASTA BĘDZINA WGM.6840.5.2021 OGŁOSZENIE O PRZETARGU NA SPRZEDAŻ LOKALU MIESZKALNEGO ' +
    'W dniu 18.11.2026 roku o godz. 10.00 w siedzibie Urzędu Miejskiego w Będzinie odbędzie się pierwszy ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego: ' +
    '1. Lokal mieszkalny nr 16 przy ulicy S. Małachowskiego 35 w Będzinie o powierzchni użytkowej 61,96 m”, ' +
    'składający się z 3 pokoi, przedpokoju, kuchni, łazienki i w.c. Do lokalu przynależy piwnica o pow. 6,14 m”. ' +
    'Ze sprzedażą lokalu mieszkalnego związany jest udział 0,03527 w prawie własności nieruchomości wspólnej obejmującej nieruchomość gruntową oraz części wspólne budynku i urządzeń. ' +
    'Lokal jest wyposażony w instalacje: wodociągową, kanalizacyjną, elektryczną, centralnego ogrzewania. Lokal posiada loggię. ' +
    'Znajduje się na parterze, I kondygnacji w budynku mieszkalnym wielorodzinnym, VI - kondygnacyjnym. ' +
    'Budynek znajduje się na działkach oznaczonych numerami geodezyjnymi 7277 i 7280 o powierzchni 507,00 m2, obręb ewidencyjny 240101_1.0001, Będzin. ' +
    'Cena wywoławcza— 236 192,00 zł a) cena lokalu wraz z pomieszczeniem przynależnym i udziałem w powierzchniach wspólnych — 231 593,00 zł b) cena udziału w gruncie —4 599,00 zł ' +
    'Wadium: 23 600,00 zł minimalne postąpienie 2 000,00 zł ' +
    'Administratorem lokalu jest Administracja Wspólnot Mieszkaniowych MZBM Sp. z o. o. ul. Zwycięstwa 10 w Będzinie',
};

const SOBIESKIEGO_1_ACTIVE = {
  title:
    'PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej, położonej w Będzinie przy ul. Jana III Sobieskiego 1, stanowiącej własność Gminy Będzin, o pow. łącznej 494 m², składającej się z działek oznaczonych numerami 768 i 767 obręb Będzin. Nieruchomość zabudowana jest obiektem dawnego Dziennego Domu Pomocy Społecznej oraz budynkiem administracyjnym',
  body:
    'PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej, położonej w Będzinie przy ul. Jana III Sobieskiego 1, stanowiącej własność Gminy Będzin, o pow. łącznej 494 m² , składającej się z działek oznaczonych numerami 768 i 767 obręb Będzin. ' +
    'Nieruchomość zabudowana jest obiektem dawnego Dziennego Domu Pomocy Społecznej oraz budynkiem administracyjnym. ' +
    'Dla w/w działek prowadzone są księgi wieczyste: KA1B/00050561/8 dla działki nr 768 KA1B/00001993/7 dla działki nr 767. ' +
    'Cena wywoławcza nieruchomości wynosi: 506.000,00 zł zw. z VAT w tym: cena gruntu 232.000,00 zł cena budynków - 274 .000,00 zł. ' +
    'Wadium uprawniające do uczestnictwa w przetargu wnoszone w pieniądzu wynosi 50.000 PLN. ' +
    'Przetarg odbędzie się w dniu 14 grudnia 2026 o godz. 10.00 w siedzibie Urzędu Miejskiego w Będzinie, ulica 11 Listopada 20, sala 101 (I piętro).',
};

const PLAC_KAZIMIERZA_28_ACTIVE = {
  title:
    'PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej, położonej w Będzinie przy Placu Kazimierza Wielkiego 28, oznaczonej numerem ewid. działki 4469 obręb Będzin o pow. 495 m²',
  body:
    'PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej, położon ej w Będzinie przy Plac u Kazimierza Wielkiego 28 , oznaczon ej numerem ewid. działki 4469 obręb Będzin o pow. 495 m². ' +
    'Nieruchomość zabudowan a jest budyn kiem mieszkalny m 3 kondygnacyjny o pow. zabudowy 227 m² oraz niskimi budynkami niemieszkalnymi o łącznej pow. zabudowy 23 m². ' +
    'Dla w/w nieruchomości prowadzona jest księga wieczysta KA1B/ 00041748/7. ' +
    'Cena wywoławcza nieruchomości wynosi 424 .000,00 z ł zw. z VAT w tym: cena grunt u - 1 70.000 ,00 zł cena budynku 254.000,00 zł. ' +
    'Wadium uprawniające do uczestnictwa w przetargu wnoszone w pieniądzu wynosi 42.000 PLN. ' +
    'Przetarg odbędzie się w dniu 28 października 2026 r. o godz. 11.00 w siedzibie Urzędu Miejskiego w Będzinie, ulica 11 Listopada 20, sala 101 (I piętro).',
};

const MODRZEJOWSKA_LAND_ACTIVE = {
  title:
    'PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej, stanowiącej własność Gminy Będzin, położonej w Będzinie w rejonie ulicy Modrzejowskiej oznaczonej numerami ewidencyjnymi 7047 oraz 7050 obręb Będzin o łącznej powierzchni 378 m²',
  body:
    'PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg ustny nie ograniczony na sprzedaż nieruchomości niezabudowanej, stanowiącej własność Gminy Będzin, położone j w Będzinie w rejonie ulicy Modrzejowskiej oznaczon ej numer ami ewidencyjnym i 7047 oraz 7050 obręb B ędzin o łącznej powierzchn i 378 m ². ' +
    'Przeznaczenie nieruchomości w miejscowym planie zagospodarowania przestrzennego: tereny zabudowy mieszkaniowej wielorodzinnej oraz usługowej symbol planu K6.MW-U. ' +
    'Cena wywoławcza nieruchomości wynosi 143 000 , 00 zł netto. Do ceny nieruchomości osiągniętej w przetargu doliczony zostanie podatek VAT w stawce 23%. ' +
    'Wadium uprawniające do uczestnictwa w przetargu wnoszone w pieniądzu wynosi 14 000,00 PLN. ' +
    'Dla nieruchomości prowadzona jest księga wieczysta KA1B/00005772/0. ' +
    'Przetarg odbędzie się w dni u 19 listopada 2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Będzinie ul. 11 Listopada 20, sala nr 101, I piętro .',
};

const KOLEJOWA_44_FLAT = {
  title: 'OGŁOSZENIE O PRZETARGU NA SPRZEDAŻ LOKALU MIESZKALNEGO',
  body:
    'PREZYDENT MIASTA BĘDZINA WGM.6840.1.2022 OGŁOSZENIE O PRZETARGU NA SPRZEDAŻ LOKALU MIESZKALNEGO ' +
    'W dniu 30.03.2022 roku o godz. 10.00 w siedzibie Urzędu Miejskiego w Będzinie odbędzie się pierwszy ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego: ' +
    'Lokal mieszkalny nr 44 przy ulicy Kolejowej 26 w Będzinie o powierzchni użytkowej 33,97 m 2 , składający się z 1 pokoju, kuchni, przedpokoju, łazienki z w.c. ' +
    'Do lokalu przynależy piwnica o pow. 2,83 m 2 . ' +
    'Cena wywoławcza 86 114 ,00 zł a) cena lokalu wraz z pomieszczeniem przynależnym i udziałem w powierzchniach wspólnych 82 995,00 zł b) cena udziału w gruncie 3 119,00 zł ' +
    'Wadium: 8 650 ,00 zł minimalne postąpienie 1 000,00 zł',
};

const BARLICKIEGO_14_FLAT = {
  title: 'OGŁOSZENIE O PRZETARGU NA SPRZEDAŻ LOKALU MIESZKALNEGO',
  body:
    'PREZYDENT MIASTA BĘDZINA WGM.6840.3.2022 OGŁOSZENIE O PRZETARGU NA SPRZEDAŻ LOKALU MIESZKALNEGO ' +
    'W dniu 24.05.2022 roku o godz. 10.00 w siedzibie Urzędu Miejskiego w Będzinie odbędzie się pierwszy ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego: ' +
    'Lokal mieszkalny nr 14 przy ulicy N. Barlickiego 63 w Będzinie o powierzchni użytkowej 19,50 m 2 , składający się z kuchni, przedpokoju, łazienki z w.c. ' +
    'Do lokalu przynależy piwnica o pow. 2,61 m 2 . ' +
    'Cena wywoławcza 41 184 ,00 zł a) cena lokalu 34 585,00 zł b) cena udziału w gruncie 6 599,00 zł ' +
    'Wadium: 4 150 ,00 zł',
};

const PROSTA_1863_RESULT_SOLD = {
  title: 'Informacja o wyniku przetargu na sprzedaż nieruchomości stanowiącej własność Gminy Będzin',
  body:
    'Informacja o wyniku przetargu na sprzedaż nieruchomości stanowiącej własność Gminy Będzin ' +
    'Na podstawie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 roku w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości ' +
    'informuję, że w dniu 17 września 2026 roku o godzinie 9:00 przeprowadzony został I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej, ' +
    'położonej w Będzinie przy ulicy Prostej oznaczonej numerem ewidencyjnym działki 1863 o powierzchni 2854 m2 obręb Będzin. ' +
    'Dla w/w nieruchomości prowadzona jest księga wieczysta KA1B/00066909/5, w której jako właściciel wpisana jest Gmina Będzin. ' +
    'Na przetarg zostały wpłacone 1 wadium w wysokości i terminie wymaganym przez organizatora przetargu. ' +
    '• Cena wywoławcza nieruchomości wynosiła — 272 000,00 zł netto ' +
    '• Cena nieruchomości osiągnięta w przetargu wynosi — 274 800,00 zł netto ' +
    'Do ceny nieruchomości osiągniętej w przetargu doliczony zostanie podatek VAT w stawce 23%. ' +
    'Nabywcy nieruchomości ustaleni w przetargu: Pan Jerzy Małkowski i Pani Mariola Małkowska w udziale 53/100 cz.',
};

const ODKRYWKOWA_2613_RESULT_SOLD = {
  title: 'Informacja o wyniku przetargu na sprzedaż nieruchomości stanowiącej własność Gminy Będzin przy ulicy Odkrywkowej',
  body:
    'Informacja o wyniku przetargu na sprzedaż nieruchomości stanowiącej własność Gminy Będzin ' +
    'informuję, że w dniu 12.08.2026 r. przeprowadzony został I przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Będzin, ' +
    'położonej w Będzinie przy ul. Odkrywkowej, oznaczonej numerem ewidencyjnym działki 2613/1 obręb Łagisza o pow. 1731 m2. ' +
    'Do przetargu dopuszczonych zostało 2 uczestników, którzy wpłacili wadium. ' +
    '• Cena wywoławcza nieruchomości wynosiła — 160.000,00 zł ' +
    '• Cena nieruchomości osiągnięta w przetargu wynosi — 190.000,00 zł netto plus podatek VAT w stawce 23% ' +
    'Nabywca nieruchomości ustalony w przetargu: Robert Sołtysek',
};

const CIESZKOWSKIEGO_RESULT_SOLD = {
  title: 'Wyniku przetargu ul.Cieszkowskiego',
  body:
    'Informacja o wyniku przetargu na sprzedaż nieruchomości stanowiącej własność Gminy Będzin ' +
    'w dniu 14 października 2025 r. przeprowadzony został I przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Będzin, ' +
    'położonej w Będzinie przy ul. Cieszkowskiego o pow. łącznej 4686 m2, oznaczonej numerami ewidencyjnymi działek: 8411, 8412, 8415, 8416, 8440, 8441, 8444 , 8445 obręb Będzin. ' +
    'Wpłacone zostało 1 wadium uprawniające do uczestnictwa w przetargu. ' +
    '• Cena wywoławcza nieruchomości wynosiła - 720.000,00 zł netto ' +
    '• Cena nieruchomości osiągnięta w przetargu wynosi — 727.200,00 zł netto ' +
    'Nabywca nieruchomości ustalony w przetargu: COLORS OF DESIGN SP. Z O.O. z siedzibą w Będzinie',
};

const RESIDENTIAL_RESULT_UNSOLD = {
  title: 'Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego',
  body:
    'Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego stanowiącego własność Gminy Będzin ' +
    'w dniu 15 maja 2025 r. przeprowadzony został I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 ' +
    'przy ul. Kołłątaja 10 w Będzinie o powierzchni użytkowej 45,00 m2. ' +
    'Cena wywoławcza wynosiła 150 000,00 zł. ' +
    'Przetarg zakończył się wynikiem negatywnym z uwagi na fakt, iż nikt nie przystąpił do przetargu.',
};

const CANCEL_KROSNIENSKA = {
  title:
    'PREZYDENT MIASTA BĘDZINA ODWOŁUJE OGŁOSZONY I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej o łącznej powierzchni 1529 m2, składającej się z działek oznaczonych numerami ewidencyjnymi 5664/8 i 6733/8 obręb Grodziec, położonej w Będzinie w rejonie ulicy Krośnieńskiej',
  body:
    'PREZYDENT MIASTA BĘDZINA ODWOŁUJE OGŁOSZONY I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej...',
};

const LEASE_KSAWERA = {
  title:
    'Ogłoszenie o przetargu ustnym ograniczonym do mieszkańców Osiedla Ksawera na stawkę czynszu za dzierżawę części nieruchomości',
  body:
    'Prezydent Miasta Będzina ogłasza przetarg ustny ograniczony na stawkę czynszu za dzierżawę gruntu...',
};

// ----------------------------------------------------------------- tests

test('parsePLN: parses dot, spaced, and grosze variations in Będzin notices', () => {
  assert.equal(parsePLN('506.000,00'), 506000);
  assert.equal(parsePLN('424 .000,00'), 424000);
  assert.equal(parsePLN('143 000 , 00'), 143000);
  assert.equal(parsePLN('86 114 ,00'), 86114);
  assert.equal(parsePLN('236 192,00'), 236192);
  assert.equal(parsePLN('274 800,00'), 274800);
  assert.equal(parsePLN('190.000,00'), 190000);
  assert.equal(parsePLN('727.200,00'), 727200);
  assert.equal(parsePLN('brak'), null);
});

test('parseNum: handles decimal and integer areas', () => {
  assert.equal(parseNum('61,96'), 61.96);
  assert.equal(parseNum('33,97'), 33.97);
  assert.equal(parseNum('19,50'), 19.5);
  assert.equal(parseNum('494'), 494);
  assert.equal(parseNum(null), null);
});

test('roundFromText: extracts Roman numerals and word numerals', () => {
  assert.equal(roundFromText(buildRecordText(SOBIESKIEGO_1_ACTIVE)), 1);
  assert.equal(roundFromText(buildRecordText(PLAC_KAZIMIERZA_28_ACTIVE)), 1);
  assert.equal(roundFromText(buildRecordText(MODRZEJOWSKA_LAND_ACTIVE)), 1);
  assert.equal(roundFromText(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), 1);
  assert.equal(roundFromText(buildRecordText(KOLEJOWA_44_FLAT)), 1);
  assert.equal(roundFromText(buildRecordText(PROSTA_1863_RESULT_SOLD)), 1);
});

test('auctionDateFromText: extracts dates across word-months and dotted formats', () => {
  assert.equal(auctionDateFromText(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), '2026-11-18');
  assert.equal(auctionDateFromText(buildRecordText(SOBIESKIEGO_1_ACTIVE)), '2026-12-14');
  assert.equal(auctionDateFromText(buildRecordText(PLAC_KAZIMIERZA_28_ACTIVE)), '2026-10-28');
  assert.equal(auctionDateFromText(buildRecordText(MODRZEJOWSKA_LAND_ACTIVE)), '2026-11-19');
  assert.equal(auctionDateFromText(buildRecordText(KOLEJOWA_44_FLAT)), '2022-03-30');
  assert.equal(auctionDateFromText(buildRecordText(BARLICKIEGO_14_FLAT)), '2022-05-24');
  assert.equal(auctionDateFromText(buildRecordText(PROSTA_1863_RESULT_SOLD)), '2026-09-17');
  assert.equal(auctionDateFromText(buildRecordText(ODKRYWKOWA_2613_RESULT_SOLD)), '2026-08-12');
  assert.equal(auctionDateFromText(buildRecordText(CIESZKOWSKIEGO_RESULT_SOLD)), '2025-10-14');
});

test('startingPriceFromText: extracts starting price across announcements and results', () => {
  assert.equal(startingPriceFromText(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), 236192);
  assert.equal(startingPriceFromText(buildRecordText(SOBIESKIEGO_1_ACTIVE)), 506000);
  assert.equal(startingPriceFromText(buildRecordText(PLAC_KAZIMIERZA_28_ACTIVE)), 424000);
  assert.equal(startingPriceFromText(buildRecordText(MODRZEJOWSKA_LAND_ACTIVE)), 143000);
  assert.equal(startingPriceFromText(buildRecordText(KOLEJOWA_44_FLAT)), 86114);
  assert.equal(startingPriceFromText(buildRecordText(BARLICKIEGO_14_FLAT)), 41184);
  assert.equal(startingPriceFromText(buildRecordText(PROSTA_1863_RESULT_SOLD)), 272000);
  assert.equal(startingPriceFromText(buildRecordText(ODKRYWKOWA_2613_RESULT_SOLD)), 160000);
  assert.equal(startingPriceFromText(buildRecordText(CIESZKOWSKIEGO_RESULT_SOLD)), 720000);
});

test('achievedPriceFromText: extracts hammer prices and returns null for active/unsold', () => {
  assert.equal(achievedPriceFromText(buildRecordText(PROSTA_1863_RESULT_SOLD)), 274800);
  assert.equal(achievedPriceFromText(buildRecordText(ODKRYWKOWA_2613_RESULT_SOLD)), 190000);
  assert.equal(achievedPriceFromText(buildRecordText(CIESZKOWSKIEGO_RESULT_SOLD)), 727200);
  assert.equal(achievedPriceFromText(buildRecordText(RESIDENTIAL_RESULT_UNSOLD)), null);
  assert.equal(achievedPriceFromText(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), null);
});

test('kindFromText: classifies mieszkalny, zabudowana, grunt', () => {
  assert.equal(kindFromText(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(KOLEJOWA_44_FLAT)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(BARLICKIEGO_14_FLAT)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(SOBIESKIEGO_1_ACTIVE)), 'zabudowana');
  assert.equal(kindFromText(buildRecordText(PLAC_KAZIMIERZA_28_ACTIVE)), 'zabudowana');
  assert.equal(kindFromText(buildRecordText(MODRZEJOWSKA_LAND_ACTIVE)), 'grunt');
  assert.equal(kindFromText(buildRecordText(PROSTA_1863_RESULT_SOLD)), 'grunt');
});

test('addressRawFromText: extracts property addresses and ignores office address', () => {
  assert.equal(addressRawFromText(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), 'S. Małachowskiego 35/16');
  assert.equal(addressRawFromText(buildRecordText(SOBIESKIEGO_1_ACTIVE)), 'Jana III Sobieskiego 1');
  assert.equal(addressRawFromText(buildRecordText(PLAC_KAZIMIERZA_28_ACTIVE)), 'Plac Kazimierza Wielkiego 28');
  assert.equal(addressRawFromText(buildRecordText(KOLEJOWA_44_FLAT)), 'Kolejowej 26/44');
  assert.equal(addressRawFromText(buildRecordText(BARLICKIEGO_14_FLAT)), 'N. Barlickiego 63/14');
});

test('landStreetFromText and landPlotFromText: extracts parcels and street for land notices', () => {
  assert.equal(landStreetFromText(buildRecordText(MODRZEJOWSKA_LAND_ACTIVE)), 'Modrzejowskiej');
  const plotModrzejowska = landPlotFromText(buildRecordText(MODRZEJOWSKA_LAND_ACTIVE));
  assert.ok(plotModrzejowska.dzialka_nr.includes('7047'), `dzialka_nr=${plotModrzejowska.dzialka_nr}`);
  assert.equal(plotModrzejowska.area_m2, 378);

  const plotProsta = landPlotFromText(buildRecordText(PROSTA_1863_RESULT_SOLD));
  assert.equal(plotProsta.dzialka_nr, '1863');
  assert.equal(plotProsta.area_m2, 2854);

  const plotOdkrywkowa = landPlotFromText(buildRecordText(ODKRYWKOWA_2613_RESULT_SOLD));
  assert.equal(plotOdkrywkowa.dzialka_nr, '2613/1');
  assert.equal(plotOdkrywkowa.area_m2, 1731);
});

test('unitAreaFromText: extracts usable floor area of flats', () => {
  assert.equal(unitAreaFromText(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), 61.96);
  assert.equal(unitAreaFromText(buildRecordText(KOLEJOWA_44_FLAT)), 33.97);
  assert.equal(unitAreaFromText(buildRecordText(BARLICKIEGO_14_FLAT)), 19.5);
});

test('gates: distinguishes sale auctions, leases, cancellations, and results', () => {
  assert.equal(isSaleAuction(buildRecordText(MALACHOWSKIEGO_16_ACTIVE)), true);
  assert.equal(isSaleAuction(buildRecordText(SOBIESKIEGO_1_ACTIVE)), true);
  assert.equal(isSaleAuction(buildRecordText(LEASE_KSAWERA)), false);
  assert.equal(isLease(buildRecordText(LEASE_KSAWERA)), true);
  assert.equal(isSaleAuction(buildRecordText(CANCEL_KROSNIENSKA)), false);

  assert.equal(isResultDoc(buildRecordText(PROSTA_1863_RESULT_SOLD)), true);
  assert.equal(isResultDoc(buildRecordText(ODKRYWKOWA_2613_RESULT_SOLD)), true);
  assert.equal(isResultDoc(buildRecordText(RESIDENTIAL_RESULT_UNSOLD)), true);
  assert.equal(isResultDoc(buildRecordText(SOBIESKIEGO_1_ACTIVE)), false);

  assert.equal(isNegativeOutcome(buildRecordText(RESIDENTIAL_RESULT_UNSOLD)), true);
  assert.equal(isNegativeOutcome(buildRecordText(PROSTA_1863_RESULT_SOLD)), false);
});

// -------------------------------------------------------- full record parsing

test('parseAnnouncement: active flat Małachowskiego 35/16', () => {
  const rec = parseAnnouncement(buildRecordText(MALACHOWSKIEGO_16_ACTIVE));
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.street, 'S. Małachowskiego');
  assert.equal(rec.address.building, '35');
  assert.equal(rec.address.apt, '16');
  assert.equal(rec.area_m2, 61.96);
  assert.equal(rec.starting_price_pln, 236192);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-11-18');
});

test('parseAnnouncement: active building Sobieskiego 1', () => {
  const rec = parseAnnouncement(buildRecordText(SOBIESKIEGO_1_ACTIVE));
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.street, 'Jana III Sobieskiego');
  assert.equal(rec.address.building, '1');
  assert.equal(rec.area_m2, 494);
  assert.equal(rec.starting_price_pln, 506000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-12-14');
});

test('parseAnnouncement: active building Plac Kazimierza Wielkiego 28', () => {
  const rec = parseAnnouncement(buildRecordText(PLAC_KAZIMIERZA_28_ACTIVE));
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.street, 'Plac Kazimierza Wielkiego');
  assert.equal(rec.address.building, '28');
  assert.equal(rec.area_m2, 495);
  assert.equal(rec.starting_price_pln, 424000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-10-28');
});

test('parseAnnouncement: active land Modrzejowska plots 7047, 7050', () => {
  const rec = parseAnnouncement(buildRecordText(MODRZEJOWSKA_LAND_ACTIVE));
  assert.equal(rec.kind, 'grunt');
  assert.ok(rec.dzialka_nr.includes('7047'));
  assert.equal(rec.area_m2, 378);
  assert.equal(rec.starting_price_pln, 143000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-11-19');
});

test('parseAnnouncement: active flat Kolejowa 26/44', () => {
  const rec = parseAnnouncement(buildRecordText(KOLEJOWA_44_FLAT));
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.street, 'Kolejowej');
  assert.equal(rec.address.building, '26');
  assert.equal(rec.address.apt, '44');
  assert.equal(rec.area_m2, 33.97);
  assert.equal(rec.starting_price_pln, 86114);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2022-03-30');
});

test('parseResultDoc: Prosta 1863 SOLD land', () => {
  const [r] = parseResultDoc(
    buildRecordText(PROSTA_1863_RESULT_SOLD),
    null,
    'https://bedzin.bip.info.pl/dokument.php?iddok=22198&idmp=484&r=r',
  );
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1863');
  assert.equal(r.area_m2, 2854);
  assert.equal(r.starting_price_pln, 272000);
  assert.equal(r.final_price_pln, 274800);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-09-17');
});

test('parseResultDoc: Odkrywkowa 2613/1 SOLD land', () => {
  const [r] = parseResultDoc(
    buildRecordText(ODKRYWKOWA_2613_RESULT_SOLD),
    null,
    'https://bedzin.bip.info.pl/dokument.php?iddok=22082&idmp=484&r=r',
  );
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '2613/1');
  assert.equal(r.area_m2, 1731);
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.final_price_pln, 190000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-08-12');
});

test('parseResultDoc: residential flat UNSOLD', () => {
  const [r] = parseResultDoc(
    buildRecordText(RESIDENTIAL_RESULT_UNSOLD),
    null,
    'https://bedzin.bip.info.pl/dokument.php?iddok=99999&idmp=484&r=r',
  );
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Kołłątaja');
  assert.equal(r.address.building, '10');
  assert.equal(r.address.apt, '5');
  assert.equal(r.starting_price_pln, 150000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-05-15');
});

test('parseResultDoc: returns empty array for cancellations and announcements', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(CANCEL_KROSNIENSKA), null, 'x'), []);
  assert.deepEqual(parseResultDoc(buildRecordText(SOBIESKIEGO_1_ACTIVE), null, 'x'), []);
});

// ------------------------------------------------------------- board HTML parsing

test('parseBoardPage: extracts iddok, url, and title from BIP table markup', () => {
  const html = `
    <div id="content-main" class="textformatter col-sm-7" role="main">
    <table><tbody>
    <tr class="odd">
        <td>25.09.2026 10:15</td>
        <td><a class="hilited" href='dokument.php?iddok=22281&amp;idmp=943&amp;r=r'>PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg na Sobieskiego 1</a></td>
    </tr>
    <tr class="even">
        <td>15.09.2026 12:00</td>
        <td><a class="hilited" href="dokument.php?iddok=22246&amp;idmp=943&amp;r=r">PREZYDENT MIASTA BĘDZINA OGŁASZA I przetarg na Modrzejowskiej</a></td>
    </tr>
    <tr class="odd">
        <td>25.09.2026 10:15</td>
        <td><a class="hilited" href='dokument.php?iddok=22281&amp;idmp=943&amp;r=r'>duplicate row</a></td>
    </tr>
    </tbody></table>
    </div>
    <div id="colRight">sidebar chrome</div>`;
  const refs = parseBoardPage(html, 943);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].iddok, '22281');
  assert.equal(refs[0].url, 'https://bedzin.bip.info.pl/dokument.php?iddok=22281&idmp=943&r=r');
  assert.ok(refs[0].title.includes('Sobieskiego 1'));
  assert.equal(refs[1].iddok, '22246');
});

test('extractDocBody and extractAttachmentLinks: extracts body and attachment links', () => {
  const html = `
    <div id="content-main">
    <div class="doc-meta"><a href="#" class="print">wersja do wydruku</a></div>
    <div class="doc-body-main"><p>Informacja o wyniku przetargu</p><p>Pełna treść dostępna w załączniku</p></div>
    <p class="doc-back"><a href="#">Powrót</a></p>
    <div class="doc-attachments">
      <h3>Załączniki</h3>
      <ul><li><a href='plik.php?id=618412&amp;wer=1'>Informacja o wyniku przetargu dz 1863.pdf</a></li></ul>
    </div>
    </div>
    <div id="colRight"></div>`;
  const body = extractDocBody(html);
  assert.ok(body.includes('Informacja o wyniku przetargu'));
  assert.ok(!body.includes('Powrót'));
  const atts = extractAttachmentLinks(html);
  assert.equal(atts.length, 1);
  assert.equal(atts[0].url, 'https://bedzin.bip.info.pl/plik.php?id=618412&wer=1');
  assert.ok(atts[0].name.includes('dz 1863.pdf'));
});
