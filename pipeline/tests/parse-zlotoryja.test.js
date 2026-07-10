// Złotoryja parser tests. Fixtures are real captured title+content strings
// fetched live from bip.zlotoryja.pl's `/api/fo/articles/<slug>` endpoint
// (verified 2026-07-10 — see crawl.js for why THIS host, not the dead legacy
// zlotoryja.bip.info.pl the spike profiled). Each fixture feeds
// parse.buildRecordText() exactly as crawl.js does, so the parsers are
// groundtruthed against production data.
//
//   Górniczej        — LAND active, round I RESTRICTED ("ograniczony do
//                       właścicieli nieruchomości sąsiednich" — drops the
//                       "nieograniczony" clause the round regex otherwise
//                       expects)
//   Piastowej        — LAND active, round II, carries a PRIOR-ROUND-history
//                       trap ("Terminy poprzednich przetargów: 05.03.2026
//                       r. – I przetarg.") the round/date parser must avoid
//   Piłsudskiego 26  — FLAT announcement (round I) + its own FLAT result,
//                       UNSOLD ("nikt nie przystąpił do przetargu")
//   Garbarskiej 14   — FLAT result, UNSOLD
//   działka 173/43   — LAND result, SOLD (netto pricing, no grosze)
//   działka 545/13   — LAND-WITH-GARAGE result, SOLD (VAT sub-component
//                       pricing breakdown; exercises the kindFromText
//                       land-with-garage override so it parcel-keys instead
//                       of misrouting through classify-kind's GARAGE_RE)
//   działka 41/8     — DZIERŻAWA (lease) result → excluded (gate fixture)
//   two synthetic-but-verbatim-titled noise fixtures (job-posting result,
//   works-contract result) from the SAME "Ogłoszenia" board the real result
//   stream is filtered from, confirming the noise-exclusion gates hold

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
  kindFromText,
  parsePLN,
} from '../src/cities/zlotoryja/parse.js';

// --------------------------------------------------------------- real fixtures

const GORNICZA_ACTIVE = {
  title:
    'Burmistrz Miasta Złotoryja\nogłasza I przetarg ustny\nna sprzedaż nieruchomości gruntowej niezabudowanej\nprzy ul. Górniczej w Złotoryi\nograniczony do właścicieli nieruchomości sąsiednich',
  body:
    'Złotoryja, dnia 18 czerwca 2026 r. WAG.6840.1.20.2024 BURMISTRZ MIASTA ZŁOTORYJA OGŁASZA I PRZETARG USTNY NA SPRZEDAŻ NIERUCHOMOŚCI GRUNTOWEJ NIEZABUDOWANEJ PRZY UL. GÓRNICZEJ W ZŁOTORYI OGRANICZONY DO WŁAŚCICIELI NIERUCHOMOŚCI SĄSIEDNICH Dane o nieruchomości: Położenie i opis nieruchomości: nieruchomość gruntowa niezabudowana oznaczona geodezyjnie jako działka nr 207/5 o powierzchni 0,0164 ha , położona w obrębie 0002 miasta Złotoryja przy ul. Górniczej. Działka ma kształt zbliżony do kwadratu. Uzbrojenie: Sieci: wodna, kanalizacyjna, gazowa, telekomunikacyjna mają swój przebieg w drodze – ul. Nad Zalewem i ul. Górniczej w odległości ok 15 m. Forma zbycia: Sprzedaż na własność. Cena wywoławcza nieruchomości: 24 698 zł netto. Podatek VAT doliczony zostanie do ceny ustalonej w przetargu. Wadium: 2 470 zł Warunkiem udziału w przetargu jest wpłata wadium w nieprzekraczalnym terminie do dnia 24 lipca 2026 r. przelewem na konto Urzędu Miejskiego w Złotoryi. Minimalna wysokość postąpienia: 247 zł Termin i miejsce przetargu: 31 lipca 2026 r. godz. 9:00, Urząd Miejski w Złotoryi, pl. Orląt Lwowskich 1 (sala nr 11 – I piętro) Termin do złożenia wniosku o nabycie nieruchomości przez osoby fizyczne i prawne upłynął dnia 12.02.2026 r.',
};

const PIASTOWA_ACTIVE = {
  title:
    'Burmistrz Miasta Złotoryja ogłasza\nII nieograniczony przetarg ustny na sprzedaż nieruchomości gruntowej niezabudowanej\nprzy ul. Piastowej w Złotoryi',
  body:
    'WAG.6840.1.16.2020 Złotoryja, dnia 18 czerwca 2026 r. BURMISTRZ MIASTA ZŁOTORYJA OGŁASZA II NIEOGRANICZONY PRZETARG USTNY NA SPRZEDAŻ NIERUCHOMOŚCI GRUNTOWEJ NIEZABUDOWANEJ PRZY UL. PIASTOWEJ W ZŁOTORYI Dane o nieruchomości: Położenie i opis nieruchomości: nieruchomość gruntowa niezabudowana oznaczona geodezyjnie jako działka nr 156/9 o powierzchni 0,0755 ha położona w obrębie 0001 miasta Złotoryja przy ul. Piastowej. Nieruchomość znajduje się w północnej części miasta i stanowi część niewielkiego osiedla mieszkaniowego. Forma zbycia: Sprzedaż na własność. Cena wywoławcza nieruchomości: 82 869 zł netto . Podatek VAT doliczony zostanie do ceny ustalonej w przetargu. Wadium: 8 300 zł Termin i miejsce przetargu: 30 lipca 2026 r. godz. 10:00, Urząd Miejski w Złotoryi, pl. Orląt Lwowskich 1 (sala nr 11 – I piętro) Termin do złożenia wniosku o nabycie nieruchomości upłynął dnia 12.09.2025 r. Terminy poprzednich przetargów: 05.03.2026 r. – I przetarg. Uczestnicy przetargu zobowiązani są przedstawić Komisji Przetargowej przed rozpoczęciem czynności przetargowych dowód tożsamości.',
};

const PILSUDSKIEGO_ANNOUNCE = {
  title:
    'Burmistrz Miasta Złotoryja ogłasza I nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego wraz z udziałem w częściach wspólnych budynku i prawie własności gruntu przy ul. Marszałka Józefa Piłsudskiego 26',
  body:
    'BURMISTRZ MIASTA ZŁOTORYJA OGŁASZA I NIEOGRANICZONY PRZETARG USTNY NA SPRZEDAŻ LOKALU MIESZKALNEGO WRAZ Z UDZIAŁEM W CZĘŚCIACH WSPÓLNYCH BUDYNKU I PRAWIE WŁASNOŚCI GRUNTU Opis nieruchomości: Lokal mieszkalny nr 1 o powierzchni użytkowej 89,90 m 2 położony na parterze (I kondygnacja nadziemna) i pierwszym piętrze (II kondygnacja nadziemna) w budynku przy ul. Marszałka Józefa Piłsudskiego 26 w Złotoryi. Lokal składa się z następujących pomieszczeń: przedpokój o pow. 4,70 m2, kuchnia o pow. 18,85 m2. Udział w nieruchomości wspólnej wynosi 81/100. Działka nr: 106/8 o powierzchni 0,0098 ha położona w obrębie 0003 miasta Złotoryja. Forma zbycia: Sprzedaż lokalu i gruntu na własność. Cena wywoławcza nieruchomości: 254 237 zł brutto w tym: cena lokalu – 241 817 zł cena udziału w gruncie – 12 420 zł Wadium: 25 424 zł Minimalna wysokość postąpienia: 2 543 zł Termin i miejsce przetargu: 7 maja 2026 r. godz. 10:00, Urząd Miejski w Złotoryi, pl. Orląt Lwowskich 1 (sala nr 11 – I piętro) Termin do złożenia wniosku upłynął dnia 28.08.2025 r.',
};

const PILSUDSKIEGO_RESULT = {
  title:
    'Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego nr 1 rzy ul. Marszałka Józefa Piłsudskiego 26 w Złotoryi',
  body:
    'INFORMACJA O WYNIKU PRZETARGU I nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego nr 1 wraz z udziałem w częściach wspólnych budynku i prawie własności gruntu o powierzchni użytkowej 89,90 m 2, położonego na parterze i pierwszym piętrze (I i II kondygnacja nadziemna) w budynku przy ul. Marszałka Józefa Piłsudskiego 26 w Złotoryi, dla którego Sąd Rejonowy w Złotoryi prowadzi księgę wieczystą KW nr LE1Z/00015387/1, wyznaczony na dzień 7 maja 2026 r. o godz. 10:00 nie odbył się z uwagi na to, iż nikt nie przystąpił do przetargu. Właścicielem opisanej nieruchomości jest Gmina Miejska Złotoryja. Cena wywoławcza przedmiotowej nieruchomości wyniosła 254 237 zł brutto. BURMISTRZ MIASTA ZŁOTORYJA Paweł Kulig',
};

const GARBARSKA_RESULT = {
  title: 'Informacja o wyniku przetargu - lokalu mieszkalnego nr 2, ul. Garbarskiej 14 w Złotoryi',
  body:
    'INFORMACJA O WYNIKU PRZETARGU I nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego nr 2 wraz z udziałem w częściach wspólnych budynku i prawie własności gruntu o powierzchni użytkowej 65,63 m 2, położonego na parterze (I kondygnacja nadziemna) w budynku przy ul. Garbarskiej 14 w Złotoryi, dla którego Sąd Rejonowy w Złotoryi prowadzi księgę wieczystą KW nr LE1Z/00024890/6, wyznaczony na dzień 7 maja 2026 r. o godz. 9:30 nie odbył się z uwagi na to, iż nikt nie przystąpił do przetargu. Właścicielem opisanej nieruchomości jest Gmina Miejska Złotoryja. Cena wywoławcza przedmiotowej nieruchomości wyniosła 217 695 zł brutto. BURMISTRZ MIASTA ZŁOTORYJA Paweł Kulig',
};

const DZIALKA_173_43_RESULT = {
  title:
    'Informacja o wyniku przetargu na sprzedaż nieruchomości gruntowej niezabudowanej oznaczonej geodezyjnie jako działka nr 173/43 o powierzchni 0,0885 ha, położonej w obrębie 0002 miasta Złotoryja',
  body:
    'INFORMACJA O WYNIKU PRZETARGU W dniu 14 stycznia 2026 r. o godzinie 10:00 w Urzędzie Miejskim w Złotoryi odbył się I nieograniczony przetarg ustny na sprzedaż nieruchomości gruntowej niezabudowanej oznaczonej geodezyjnie, jako działka nr 173/43 o powierzchni 0,0885 ha, położonej w obrębie 0002 miasta Złotoryja w okolicy ul. Diamentowej dla której Sąd Rejonowy w Złotoryi prowadzi księgę wieczystą nr LE1Z/00013488/5. Do uczestnictwa w przetargu dopuszczono 2 kupujących. Cena wywoławcza przedmiotowej nieruchomości wyniosła 196 665 zł netto, a najwyższa cena osiągnięta w przetargu to 198 635 zł netto. Nabywcą nieruchomości został Pan Artur Misaczek, zam. ul. Nad Zalewem 14B/6, 59-500 Złotoryja. BURMISTRZ MIASTA ZŁOTORYJA Paweł Kulig',
};

const GARAZ_545_13_RESULT = {
  title:
    'Informacja o wyniku przetargu nieruchomości gruntowej zabudowanej garażem nr 36 o pow. zabudowy 18 m oznaczonej geodezyjnie jako działka nr 545/13 o powierzchni 0,0028 ha wraz z udziałem 1/48 w działce nr 545/2 stanowiącej drogę wewnętrzną',
  body:
    'INFORMACJA O WYNIKU PRZETARGU W dniu 16 grudnia 2025 r. o godz. 9:00 w Urzędzie Miejskim w Złotoryi odbył się II nieograniczony przetarg ustny na sprzedaż nieruchomości gruntowej zabudowanej garażem nr 36 o pow. zabudowy 18 m², oznaczonej geodezyjnie jako działka nr 545/13 o powierzchni 0,0028 ha wraz z udziałem 1/48 w działce nr 545/2 stanowiącej drogę wewnętrzną, położonej w obrębie 0008 miasta Złotoryja przy ul. Zimowej , dla której Sąd Rejonowy w Złotoryi prowadzi księgę wieczystą KW nr LE1Z/00035259/1. Właścicielem opisanej nieruchomości jest Gmina Miejska Złotoryja. Do uczestnictwa w przetargu dopuszczono jednego kupującego. Cena wywoławcza przedmiotowej nieruchomości wyniosła 72 717,60 zł brutto (słownie: siedemdziesiąt dwa tysiące siedemset siedemnaście złotych 60/100), w tym cena działki nr 545/13 zabudowanej garażem - 71 955 brutto zł (58 500 zł netto plus 23% VAT tj. 13 455 zł) i cena udziału w działce nr 545/2 stanowiącej drogę wewnętrzną – 762,60 zł brutto (620 zł netto plus 23% VAT tj. 142,60 zł). Najwyższa cena nieruchomości osiągnięta w przetargu wyniosła 73 447,60 zł brutto (słownie: siedemdziesiąt trzy tysiące czterysta czterdzieści siedem złotych 60/100), w tym cena działki nr 545/13 zabudowanej garażem – 72 676,40 zł (59 086,50 zł netto plus 23% VAT tj. 13 589,90 zł) i cena udziału w działce nr 545/2 stanowiącej drogę wewnętrzną – 771,20 zł brutto (626,99 zł netto plus 23% VAT tj. 144,21 zł). Nabywcą nieruchomości zostali Państwo Mariusz i Beata Turchan. BURMISTRZ MIASTA ZŁOTORYJA Paweł Kulig',
};

const LEASE_RESULT = {
  title:
    'Informacja o wyniku przetargu na dzierżawę części nieruchomości gruntowej niezabudowanej, oznaczonej geodezyjnie jako działka nr 41/8, położonej w obrębie 0002 miasta Złotoryja przy ul. 3 Maja',
  body:
    'INFORMACJA O WYNIKU PRZETARGU W dniu 01.07.2026 r. o godz. 10:30 w Urzędzie Miejskim w Złotoryi odbył się I nieograniczony przetarg ustny na dzierżawę części nieruchomości gruntowej niezabudowanej, oznaczonej geodezyjnie jako działka nr 41/8, położonej w obrębie 0002 miasta Złotoryja przy ul. 3 Maja. Właścicielem opisanej nieruchomości jest Gmina Miejska Złotoryja. Do uczestnictwa w przetargu dopuszczono 2 osoby. Cena wywoławcza przedmiotowej nieruchomości wyniosła 48,84 zł netto (słownie: czterdzieści osiem złotych 84/100). Najwyższa cena nieruchomości osiągnięta w przetargu wyniosła 2.100,00 zł netto (słownie: dwa tysiące sto złotych 00/100). Dzierżawcą nieruchomości został Pan Przemysław Niedźwiecki zam. 59-500 Złotoryja, ul. Hoża 9a/14. BURMISTRZ MIASTA ZŁOTORYJA Paweł Kulig',
};

// Non-property noise, real titles from the SAME "Ogłoszenia" board the
// "wyniku"-filtered result stream is pulled from (see crawl.js) — confirms
// the gates exclude job-posting / unrelated-works-contract results.
const JOB_POSTING_NOISE = {
  title:
    'Informacja o wyniku naboru na wolne stanowisko urzędnicze Referenta ds. rachuby w Wydziale Budżetu i Finansów',
  body:
    'Informujemy, że w wyniku zakończenia procedury naboru na ww. stanowisko została wybrana Pani X. Uzasadnienie wyboru dokonanego przez komisję rekrutacyjną.',
};

const WORKS_CONTRACT_NOISE = {
  title:
    'Ogłoszenie o wyniku przetargu nieograniczonego na "Przebudowę miejsc składowania odpadów komunalnych zlokalizowanych przy ul. Wojska Polskiego, Krótkiej i Szklarskiej w Złotoryi"',
  body:
    'Burmistrz Miasta Złotoryja informuje, że w wyniku przetargu nieograniczonego na Przebudowę miejsc składowania odpadów komunalnych wybrano ofertę firmy XYZ za cenę 500 000 zł.',
};

// ------------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands, dot-thousands, grosze tail', () => {
  assert.equal(parsePLN('24 698'), 24698);
  assert.equal(parsePLN('73 447,60'), 73447);
  assert.equal(parsePLN('2.100,00'), 2100);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: optional "nieograniczony" (restricted round beats prior-round trap)', () => {
  assert.equal(roundFromText(buildRecordText(GORNICZA_ACTIVE)), 1); // "I PRZETARG USTNY" — no "nieograniczony"
  assert.equal(roundFromText(buildRecordText(PIASTOWA_ACTIVE)), 2); // beats "Terminy poprzednich przetargów: ... I przetarg."
  assert.equal(roundFromText(buildRecordText(PILSUDSKIEGO_ANNOUNCE)), 1);
  assert.equal(roundFromText(buildRecordText(GARAZ_545_13_RESULT)), 2);
});

test('auctionDateFromText: announcement label beats wadium/prior-round dates', () => {
  assert.equal(auctionDateFromText(buildRecordText(GORNICZA_ACTIVE)), '2026-07-31');
  assert.equal(auctionDateFromText(buildRecordText(PIASTOWA_ACTIVE)), '2026-07-30'); // not 2026-03-05
  assert.equal(auctionDateFromText(buildRecordText(PILSUDSKIEGO_ANNOUNCE)), '2026-05-07');
});

test('auctionDateFromText: result dates — "nie odbył się" cannot win the SOLD anchor', () => {
  assert.equal(auctionDateFromText(buildRecordText(PILSUDSKIEGO_RESULT)), '2026-05-07'); // unsold
  assert.equal(auctionDateFromText(buildRecordText(DZIALKA_173_43_RESULT)), '2026-01-14'); // sold
  assert.equal(auctionDateFromText(buildRecordText(LEASE_RESULT)), '2026-07-01'); // numeric dotted date
});

test('startingPriceFromText: label variants, total not sub-component', () => {
  assert.equal(startingPriceFromText(buildRecordText(GORNICZA_ACTIVE)), 24698);
  assert.equal(startingPriceFromText(buildRecordText(PILSUDSKIEGO_ANNOUNCE)), 254237); // not 241817 (cena lokalu)
  assert.equal(startingPriceFromText(buildRecordText(DZIALKA_173_43_RESULT)), 196665);
  assert.equal(startingPriceFromText(buildRecordText(GARAZ_545_13_RESULT)), 72717); // grosze-bearing
});

test('achievedPriceFromText: only when a buyer (Nabywcą) is named', () => {
  assert.equal(achievedPriceFromText(buildRecordText(PILSUDSKIEGO_RESULT)), null); // unsold
  assert.equal(achievedPriceFromText(buildRecordText(GARBARSKA_RESULT)), null); // unsold
  assert.equal(achievedPriceFromText(buildRecordText(DZIALKA_173_43_RESULT)), 198635);
  assert.equal(achievedPriceFromText(buildRecordText(GARAZ_545_13_RESULT)), 73447); // total, not the VAT sub-component
  assert.equal(achievedPriceFromText(buildRecordText(LEASE_RESULT)), null); // "Dzierżawcą", not "Nabywcą"
});

test('unitAreaFromText: usable area, short gap (announcement) and long gap (result)', () => {
  assert.equal(unitAreaFromText(buildRecordText(PILSUDSKIEGO_ANNOUNCE)), 89.9);
  assert.equal(unitAreaFromText(buildRecordText(PILSUDSKIEGO_RESULT)), 89.9);
  assert.equal(unitAreaFromText(buildRecordText(GARBARSKA_RESULT)), 65.63);
});

test('kindFromText: land-with-garage override beats classify-kind\'s garaz', () => {
  assert.equal(kindFromText(buildRecordText(GORNICZA_ACTIVE)), 'grunt');
  assert.equal(kindFromText(buildRecordText(PILSUDSKIEGO_ANNOUNCE)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(DZIALKA_173_43_RESULT)), 'grunt');
  assert.equal(kindFromText(buildRecordText(GARAZ_545_13_RESULT)), 'grunt'); // NOT 'garaz'
});

test('gates: isSaleAuction, isLease, isResultDoc, isNegativeOutcome', () => {
  assert.equal(isSaleAuction(buildRecordText(GORNICZA_ACTIVE)), true);
  assert.equal(isSaleAuction(buildRecordText(LEASE_RESULT)), false); // no "sprzedaż"
  assert.equal(isLease(buildRecordText(LEASE_RESULT)), true);
  assert.equal(isLease(buildRecordText(GORNICZA_ACTIVE)), false);
  assert.equal(isResultDoc(buildRecordText(PILSUDSKIEGO_RESULT)), true);
  assert.equal(isResultDoc(buildRecordText(GORNICZA_ACTIVE)), false); // an announcement, not a result
  assert.equal(isNegativeOutcome(buildRecordText(PILSUDSKIEGO_RESULT)), true);
  assert.equal(isNegativeOutcome(buildRecordText(DZIALKA_173_43_RESULT)), false); // sold
});

test('noise exclusion: job-posting and works-contract "wyniku" results are dropped', () => {
  assert.equal(isResultDoc(buildRecordText(JOB_POSTING_NOISE)), false);
  assert.equal(isSaleAuction(buildRecordText(WORKS_CONTRACT_NOISE)), false);
  assert.deepEqual(parseResultDoc(buildRecordText(JOB_POSTING_NOISE), null, 'x'), []);
  assert.deepEqual(parseResultDoc(buildRecordText(WORKS_CONTRACT_NOISE), null, 'x'), []);
  assert.deepEqual(parseResultDoc(buildRecordText(LEASE_RESULT), null, 'x'), []);
});

// ------------------------------------------------------------- result records

test('parseResultDoc: Piłsudskiego 26/1 UNSOLD (round I)', () => {
  const [r] = parseResultDoc(buildRecordText(PILSUDSKIEGO_RESULT), '2026-05-07', 'https://bip.zlotoryja.pl/ogloszenia-5/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'marszalka jozefa pilsudskiego|26|1');
  assert.equal(r.address.street, 'Marszałka Józefa Piłsudskiego');
  assert.equal(r.address.building, '26');
  assert.equal(r.address.apt, '1');
  assert.equal(r.area_m2, 89.9);
  assert.equal(r.starting_price_pln, 254237);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-05-07');
});

test('parseResultDoc: Garbarskiej 14/2 UNSOLD', () => {
  const [r] = parseResultDoc(buildRecordText(GARBARSKA_RESULT), '2026-05-07', 'https://bip.zlotoryja.pl/x');
  assert.equal(r.address.key, 'garbarskiej|14|2');
  assert.equal(r.area_m2, 65.63);
  assert.equal(r.starting_price_pln, 217695);
  assert.equal(r.outcome, 'unsold');
});

test('parseResultDoc: działka 173/43 SOLD (netto, no grosze)', () => {
  const [r] = parseResultDoc(buildRecordText(DZIALKA_173_43_RESULT), '2026-01-14', 'https://bip.zlotoryja.pl/y');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '173/43');
  assert.equal(r.area_m2, 885); // 0,0885 ha -> m2
  assert.equal(r.starting_price_pln, 196665);
  assert.equal(r.final_price_pln, 198635);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
});

test('parseResultDoc: działka 545/13 (land-with-garage) SOLD, VAT-split pricing', () => {
  const [r] = parseResultDoc(buildRecordText(GARAZ_545_13_RESULT), '2025-12-16', 'https://bip.zlotoryja.pl/z');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '545/13');
  assert.equal(r.area_m2, 28); // 0,0028 ha -> m2
  assert.equal(r.starting_price_pln, 72717);
  assert.equal(r.final_price_pln, 73447); // total, not the 72 676,40 sub-component
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 2);
});

test('parseResultDoc: returns [] for an active (non-result) announcement', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(GORNICZA_ACTIVE), null, 'x'), []);
});

// ----------------------------------------------------------- active + land

test('parseAnnouncement: flat (Piłsudskiego 26/1, round I)', () => {
  const rec = parseAnnouncement(buildRecordText(PILSUDSKIEGO_ANNOUNCE));
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'marszalka jozefa pilsudskiego|26|1');
  assert.equal(rec.area_m2, 89.9);
  assert.equal(rec.starting_price_pln, 254237);
  assert.equal(rec.auction_date, '2026-05-07');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: land (Górniczej, restricted round I) -> kind grunt with parcel', () => {
  const rec = parseAnnouncement(buildRecordText(GORNICZA_ACTIVE));
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '207/5');
  assert.equal(rec.area_m2, 164); // 0,0164 ha -> m2
  assert.equal(rec.address_raw, 'Górniczej');
  assert.equal(rec.starting_price_pln, 24698);
  assert.equal(rec.auction_date, '2026-07-31');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: land (Piastowej, round II) survives the prior-round trap', () => {
  const rec = parseAnnouncement(buildRecordText(PIASTOWA_ACTIVE));
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '156/9');
  assert.equal(rec.area_m2, 755); // 0,0755 ha -> m2
  assert.equal(rec.starting_price_pln, 82869);
  assert.equal(rec.auction_date, '2026-07-30');
  assert.equal(rec.round, 2);
});
