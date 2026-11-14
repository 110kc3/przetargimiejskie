import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseWykaz,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isExchange,
  isBezprzetargowo,
  isResultDoc,
  isWykazNotice,
  hasScheduledDate,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  landAreaFromText,
  landPlotsFromText,
  obrebFromText,
  kindFromText,
  addressRawFromText,
  parsePLN,
} from '../src/cities/pisz/parse.js';
import { parseBoardPage, discoverYearBoards, extractDetail, boardDateToIso } from '../src/cities/pisz/crawl.js';


const FLAT_KLEMENTOWSKIEGO_6_4_II = {
  title: 'Ogłoszenie o drugim przetargu na sprzedaż nieruchomości (Klementowskiego 6/4)',
  podtytul: '',
  body: 'Burmistrz Pisza działając zgodnie z § 3 ust.1 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021r. poz. 2213) ogłasza drugi publiczny przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Pisz, oznaczonej j.n. Położenie nieruchomości – Pisz, ul. Klementowskiego 6/4, Numer działki – 232/8, Powierzchnia nieruchomości – 440 m2 Numer KW – OL1P/00040045/3, Opis nieruchomości: - lokal mieszkalny nr 4 o powierzchni użytkowej 91,35 m2, składający się z kuchni, czterech pokoi, przedpokoju, łazienki z wc, usytuowany na I piętrze budynku mieszkalnego wielorodzinnego nr 6, położonego w Piszu przy ul. Klementowskiego. Do lokalu mieszkalnego nr 4 należą: dwie piwnice oznaczone nr 4 o powierzchniach 20,91 m2 i 6,97 m2 oraz weranda o powierzchni 3,96 m2. Budynek składa się z 5 lokali mieszkalnych o ogólnej powierzchni budynku 579,71 m2 - udział w nieruchomości oznaczonej nr działki 232/8 o powierzchni 440 m2 wynoszący 12319/57971. Cena wywoławcza nieruchomości – 235.000,00 zł Wadium – 40.000,00 zł 1. Przetarg odbędzie się dnia 14 października 2025 r. w sali nr 64 w budynku Urzędu Miejskiego w Piszu przy ul. G. Gizewiusza 5, o godzinie 11.00 2. Pierwszy przetarg na sprzedaż nieruchomości został przeprowadzony w dniu 16 czerwca 2025 r. 3. W/w nieruchomość jest wolna od obciążeń.',
};

const FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ = {
  title: 'Wykaz nieruchomości przeznaczonej do sprzedaży (lok. ul. Klementowskiego 6/3)',
  podtytul: 'Sprzedaż lokalu mieszkalnego w drodze przetargu',
  body: 'W Y K A Z nieruchomości stanowiącej własność Gminy Pisz, przeznaczonej do sprzedaży zgodnie z przepisami ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami (Dz. U. z 2024 r. poz. 1445 z późn. zm.) 1. Położenie nieruchomości – Pisz, ul. Klementowskiego 6/3, 2. Numer działki – 232/8, 3. Numer KW – OL1P/ 00040045/3, 4. Powierzchnia nieruchomości – 440 m², 5. Opis nieruchomości: – lokal mieszkalny nr 3 o pow. użytkowej 109,83 m2, składający się z kuchni, pięciu pokoi, przedpokoju, łazienki z wc, usytuowany na I piętrze budynku mieszkalnego wielorodzinnego nr 6, położonego w Piszu przy ul. Klementowskiego. Do lokalu mieszkalnego nr 3 należą: 2 piwnice oznaczone nr 3 o powierzchniach 4,03 m2 i 4,20 m2 oraz weranda o powierzchni 4,20 m2. - udział w nieruchomości oznaczonej nr działki 232/8 o powierzchni 440 m2 wynoszący 12226/57971. 6. Cena nieruchomości (wartość rynkowa lokalu liczona wraz z udziałem w działce nr 232/8 o pow. 440 m2 wynoszącym 12226/57971- 314.000,00 zł (słownie: trzysta czternaście tysięcy 00/100) 7. Nieruchomość objęta niniejszym wykazem stanowi własność Gminy Pisz. Zgodnie z Uchwałą Nr XLIX/506/22 Rady Miejskiej w Piszu z dnia 30 września 2022 r. w sprawie sprzedaży nieruchomości położonych na terenie gminy Pisz, stanowiących własność Gminy Pisz została przeznaczona do sprzedaży. 8. Sprzedaż nieruchomości nastąpi w drodze przetargu. 9. W/w nieruchomość jest wolna od obciążeń. 16. Wykaz podaje się do publicznej wiadomości na okres 21 dni t.j. od dnia 10 stycznia 2025 r. do dnia 31 stycznia 2025 r.',
};

const FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG = {
  title: 'Ogłoszenie o wyniku przetargu - lok. Pisz, ul. Klementowskiego 6/4',
  podtytul: '',
  body: 'O G Ł O S Z E N I E Burmistrz Pisza informuje, że komisja przetargowa przeprowadziła w dniu 14 października 2025 r. o godzinie 11.00 w sali nr 64 budynku Urzędu Miejskiego w Piszu przetarg ustny nieograniczony na sprzedaż nieruchomości – lokalu mieszkalnego nr 4 przy ul. Klementowskiego 6 w Piszu wraz z udziałem w gruncie - działce nr 232/8, położonej w Piszu przy ul. Klementowskiego, dla której Sąd Rejonowy w Piszu IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą OL1P/00040045/3. 1. Cena wywoławcza nieruchomości będącej przedmiotem przetargu została ustalona na kwotę 235.000 zł. 2. Przetarg zakończył się wynikiem negatywnym ponieważ nikt nie przystąpił do przetargu.',
};

const LAND_KARWIK_69_4_ANNOUNCE = {
  title: 'Ogłoszenie o przetargu na sprzedaż nieruchomości (dz. 69/4 Karwik)',
  podtytul: '',
  body: 'Burmistrz Pisza działając zgodnie z § 3 ust.1 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021r. poz. 2213) ogłasza drugi publiczny przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Pisz, oznaczonej j.n. Położenie nieruchomości – obręb Karwik, Numer działki – 69/4, Powierzchnia nieruchomości – 665 m2 Numer KW – OL1P/00013709/8, Opis nieruchomości - nieruchomość niezabudowana, Cena wywoławcza nieruchomości – 70.000,00 zł Wadium – 11.000,00 zł 1. Przetarg odbędzie się dnia 24 czerwca 2026 r. w sali nr 64 w budynku Urzędu Miejskiego w Piszu przy ul. G. Gizewiusza 5, o godzinie 10.00 2. Pierwszy przetarg na sprzedaż nieruchomości przeprowadzono w dniu 14 stycznia 2026 r. 3. W/w nieruchomość jest wolna od obciążeń.',
};

const LAND_KARWIK_69_4_RESULT_NEG = {
  title: 'Ogłoszenie o wyniku przetargu - Karwik dz. 69/4',
  podtytul: '',
  body: 'O G Ł O S Z E N I E Burmistrz Pisza informuje, że komisja przetargowa przeprowadziła w dniu 24 czerwca 2026 r. o godzinie 10.00 w sali nr 64 budynku Urzędu Miejskiego w Piszu przetarg ustny nieograniczony na sprzedaż nieruchomości oznaczonej nr działki 69/4 położonej w obrębie Karwik, dla której Sąd Rejonowy w Piszu IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą OL1P/00013709/8 1. Cena wywoławcza nieruchomości będącej przedmiotem przetargu została ustalona na kwotę 70.000,00 zł. 2. Przetarg zakończył się wynikiem negatywnym ponieważ nikt nie przystąpił do przetargu.',
};

const LAND_PISZ2_450_RESULT_SOLD = {
  title: 'Ogłoszenie o wyniku przetargu - Pisz, ul. Matejki',
  podtytul: '',
  body: 'O G Ł O S Z E N I E Burmistrz Pisza informuje, że komisja przetargowa przeprowadziła w dniu 23 lipca 2025 r. o godzinie 10.00 w sali nr 64 budynku Urzędu Miejskiego w Piszu przetarg ustny ograniczony na sprzedaż nieruchomości położonej w obrębie Pisz 2, oznaczonej numerami działek 450/34 i 450/38 o łącznej powierzchni 62 m2, objętej księgą wieczystą OL1P/00013024/2. 1. Cena wywoławcza nieruchomości będącej przedmiotem przetargu została ustalona na kwotę 12.700,00 zł netto. 2. W przetargu wzięły udział 2 podmioty, które po wpłaceniu wadium w wysokości 2.500,00 zł zostały dopuszczone do przetargu. 3. Po trzecim wywołaniu najwyższej zaoferowanej ceny w wysokości 100.000,00 zł netto przetarg zamknięto i ogłoszono zwycięzcę przetargu – Arkadiusza Kulikowskiego 4. Arkadiusz Kulikowski został ustalony jako nabywca w/w nieruchomości.',
};

const LAND_DZ1886_24_RESTRICTED_ANNOUNCE = {
  title: 'Ogłoszenie',
  podtytul: 'na sprzedaż nieruchomości w drodze przetargu ograniczonego, położonej w obrębie Pisz 1, (dz. nr 1886/24)',
  body: 'Burmistrz Pisza działając zgodnie z § 3 ust.1 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) ogłasza pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Pisz, oznaczonej j.n. Położenie nieruchomości – obręb Pisz 1, Numer działki – 1886/24 Powierzchnia działki – 42 m2, Numer KW – OL1P/00022912/0, Opis nieruchomości - nieruchomość niezabudowana, Cena wywoławcza nieruchomości – 19.500,00 zł + 23% podatku VAT. Wadium – 3.000 zł 1. Przetarg odbędzie się dnia 27 maja 2026 r. w sali nr 64 w budynku Urzędu Miejskiego w Piszu przy ul. G. Gizewiusza 5, o godz. 10.00. 2. Przetarg na sprzedaż nieruchomości przeprowadzony będzie w formie przetargu ograniczonego do współwłaścicieli nieruchomości położonej w obrębie Pisz 1, oznaczonej numerem działki 1886/8 przyległa do nieruchomości oznaczonej numerem 1886/24, stanowiącej przedmiot przetargu, Działka będąca przedmiotem sprzedaży nie może być zagospodarowana jako odrębna nieruchomość. 3. W/w nieruchomość jest wolna od obciążeń.',
};

const BEZPRZETARGOWO_LIPOWA = {
  title: 'Wykaz nieruchomości przeznaczonych do sprzedaży (lokal - ul. Lipowa)',
  podtytul: '',
  body: 'W Y K A Z nieruchomości stanowiącej własność Gminy Pisz, przeznaczonej do sprzedaży zgodnie z przepisami ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami (Dz. U. z 2026 r. poz. 399) 1. Położenie nieruchomości – Pisz, ul. Lipowa 9/26 2. Numer działki – 474, 3. Numer KW – OL1P/ 00011168/9, 4. Powierzchnia nieruchomości – 522 m², 5. Opis nieruchomości: – lokal mieszkalny nr 26 o pow. użytkowej 46,99 m2, składający się z kuchni, trzech pokoi, przedpokoju, i łazienki, usytuowany na parterze budynku mieszkalnego wielorodzinnego nr 9, położonego w Piszu przy ul. Lipowej. Lokal mieszkalny jest przedmiotem sprzedaży na rzecz najemcy posiadającego umowę najmu w/w lokalu na czas nieokreślony, - udział w działce nr 474 o powierzchni 522 m2 wynoszący 4699/194200. 6. Cena nieruchomości (wartość rynkowa lokalu liczona wraz z udziałem w działce nr 474 o pow. 522 m2 wynoszącym 4699/194200 - 480.000,00 zł (słownie: czterysta osiemdziesiąt tysięcy 00/100) Cena sprzedaży nieruchomości po udzieleniu bonifikaty 95% wynosi 24.000,00 zł (słownie: dwadzieścia cztery tysiące 00/100) 7. Nieruchomość objęta niniejszym wykazem stanowi własność Gminy Pisz. lokal mieszkalny został przeznaczony do sprzedaży na rzecz najemcy. 8. W/w nieruchomość jest wolna od obciążeń.',
};

const LEASE_WYKAZ_1886_25 = {
  title: 'Wykaz nieruchomości przeznaczonej do wydzierżawienia (Pisz 1, cz. dz. nr 1886/25)',
  podtytul: '',
  body: 'nieruchomości stanowiącej własność Gminy Pisz, przeznaczonej do wydzierżawienia zgodnie z przepisami ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami (Dz.U. z 2026 r. poz. 399) Położenie nieruchomości – Pisz 1, ul. Wołodyjowskiego, Numer działki – cz. 1886/25, Powierzchnia nieruchomości – 120 m², Opis nieruchomości – teren przeznaczony do użytkowana na poprawę warunków zagospodarowania dz. nr 1459/74, Roczna wysokość czynszu – 86,00 zł + 23% VAT. 1. Nieruchomość objęta niniejszym wykazem przeznaczona jest ... do wydzierżawienia w drodze bezprzetargowej na okres do 2 lat.',
};

const CAR_SALE_VI = {
  title: 'Ogłoszenie o VI przetargu publicznym',
  podtytul: 'na sprzedaż samochodu osobowego marki Skoda model Superb, nr rej. NPI 11111, będącego własnością Urzędu Miejskiego w Piszu.',
  body: '',
};

const b = (f) => buildRecordText(f);


test('parsePLN: dot-thousands+grosze, space-thousands (no grosze)', () => {
  assert.equal(parsePLN('235.000,00'), 235000);
  assert.equal(parsePLN('70.000,00'), 70000);
  assert.equal(parsePLN('12.700,00'), 12700);
  assert.equal(parsePLN('330 000'), 330000);
  assert.equal(parsePLN('brak'), null);
});

test('doc-type gates: isSaleAuction requires przetarg + sprzedaż + nieruchomo (excludes the car notice)', () => {
  assert.equal(isSaleAuction(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), true);
  assert.equal(isSaleAuction(b(LAND_KARWIK_69_4_ANNOUNCE)), true);
  assert.equal(isSaleAuction(b(LAND_DZ1886_24_RESTRICTED_ANNOUNCE)), true);
  assert.equal(isSaleAuction(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), true);
  assert.equal(isSaleAuction(b(CAR_SALE_VI)), false);
});

test('hasScheduledDate: true for announcements, false for results/wykaz', () => {
  assert.equal(hasScheduledDate(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), true);
  assert.equal(hasScheduledDate(b(LAND_KARWIK_69_4_ANNOUNCE)), true);
  assert.equal(hasScheduledDate(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), false);
  assert.equal(hasScheduledDate(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), false);
});

test('isResultDoc: past-tense "komisja przetargowa przeprowadziła w dniu", not the title', () => {
  assert.equal(isResultDoc(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), true);
  assert.equal(isResultDoc(b(LAND_KARWIK_69_4_RESULT_NEG)), true);
  assert.equal(isResultDoc(b(LAND_PISZ2_450_RESULT_SOLD)), true);
  assert.equal(isResultDoc(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), false);
});

test('isWykazNotice: genuine pre-auction wykaz, title-anchored', () => {
  assert.equal(isWykazNotice(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), true);
  assert.equal(isWykazNotice(b(BEZPRZETARGOWO_LIPOWA)), true);
  assert.equal(isWykazNotice(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), false);
});

test('THE classification challenge: isLease / isBezprzetargowo / isExchange skip gates', () => {
  assert.equal(isLease(b(LEASE_WYKAZ_1886_25)), true);
  assert.equal(isLease(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), false);
  assert.equal(isLease(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), false);
  assert.equal(isBezprzetargowo(b(BEZPRZETARGOWO_LIPOWA)), true);
  assert.equal(isBezprzetargowo(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), false);
  assert.equal(isBezprzetargowo(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), false);
  assert.equal(isBezprzetargowo(b(LAND_KARWIK_69_4_ANNOUNCE)), false);
  assert.equal(isExchange(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), false);
});

test('roundFromText: word ordinal anchored on "ogłasza <word>", prior-round history ignored', () => {
  assert.equal(roundFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), 2);
  assert.equal(roundFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), 2);
  assert.equal(roundFromText(b(LAND_DZ1886_24_RESTRICTED_ANNOUNCE)), 1);
  assert.equal(roundFromText(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), null);
  assert.equal(roundFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), null);
});

test('auctionDateFromText: future "odbędzie się dnia" / result "przeprowadziła w dniu"', () => {
  assert.equal(auctionDateFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), '2025-10-14');
  assert.equal(auctionDateFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), '2026-06-24');
  assert.equal(auctionDateFromText(b(LAND_DZ1886_24_RESTRICTED_ANNOUNCE)), '2026-05-27');
  assert.equal(auctionDateFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), '2025-10-14');
  assert.equal(auctionDateFromText(b(LAND_KARWIK_69_4_RESULT_NEG)), '2026-06-24');
  assert.equal(auctionDateFromText(b(LAND_PISZ2_450_RESULT_SOLD)), '2025-07-23');
});

test('startingPriceFromText: short dash form (announcement/wykaz) and long "ustalona na kwotę" form (result)', () => {
  assert.equal(startingPriceFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), 235000);
  assert.equal(startingPriceFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), 70000);
  assert.equal(startingPriceFromText(b(LAND_DZ1886_24_RESTRICTED_ANNOUNCE)), 19500);
  assert.equal(startingPriceFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), 235000);
  assert.equal(startingPriceFromText(b(LAND_PISZ2_450_RESULT_SOLD)), 12700);
});

test('achievedPriceFromText: only when a buyer is named, and skips an earlier WADIUM-amount decoy', () => {
  assert.equal(achievedPriceFromText(b(LAND_PISZ2_450_RESULT_SOLD)), 100000);
  assert.equal(achievedPriceFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), null);
  assert.equal(achievedPriceFromText(b(LAND_KARWIK_69_4_RESULT_NEG)), null);
});

test('isNegativeOutcome', () => {
  assert.equal(isNegativeOutcome(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), true);
  assert.equal(isNegativeOutcome(b(LAND_KARWIK_69_4_RESULT_NEG)), true);
  assert.equal(isNegativeOutcome(b(LAND_PISZ2_450_RESULT_SOLD)), false);
});

test('unitAreaFromText: FLAT usable area, not the whole-building-plot "Powierzchnia nieruchomości" decoy', () => {
  assert.equal(unitAreaFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), 91.35);
  assert.equal(unitAreaFromText(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), 109.83);
  assert.equal(unitAreaFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), null);
});

test('landAreaFromText: LAND plot area only (never called for flats in parseAnnouncement/parseResultDoc)', () => {
  assert.equal(landAreaFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), 665);
  assert.equal(landAreaFromText(b(LAND_DZ1886_24_RESTRICTED_ANNOUNCE)), 42);
});

test('obrebFromText: cadastral district name (announcement dash form + result "w obrębie" form)', () => {
  assert.equal(obrebFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), 'Karwik');
  assert.equal(obrebFromText(b(LAND_KARWIK_69_4_RESULT_NEG)), 'Karwik');
  assert.equal(obrebFromText(b(LAND_PISZ2_450_RESULT_SOLD)), 'Pisz 2');
});

test('landPlotsFromText: multi-parcel "i"-joined list, and the restricted-tender neighboring-parcel decoy', () => {
  assert.deepEqual(landPlotsFromText(b(LAND_PISZ2_450_RESULT_SOLD)), ['450/34', '450/38']);
  assert.deepEqual(landPlotsFromText(b(LAND_DZ1886_24_RESTRICTED_ANNOUNCE)), ['1886/24']);
  assert.deepEqual(landPlotsFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), ['69/4']);
});

test('kindFromText: LAND_FALLBACK_RE gap-patch for the genitive plural "działek"', () => {
  assert.equal(kindFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), 'mieszkalny');
  assert.equal(kindFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), 'grunt');
  assert.equal(kindFromText(b(LAND_PISZ2_450_RESULT_SOLD)), 'grunt');
});

test('addressRawFromText: announcement/wykaz structured field vs. result-doc "przy ul. ... w Piszu" + unit-no', () => {
  assert.equal(addressRawFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_II)), 'Klementowskiego 6/4');
  assert.equal(addressRawFromText(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ)), 'Klementowskiego 6/3');
  assert.equal(addressRawFromText(b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG)), 'Klementowskiego 6/4');
  assert.equal(addressRawFromText(b(LAND_KARWIK_69_4_ANNOUNCE)), null);
});


test('parseAnnouncement: PENDING flat sale (real fixture, Klementowskiego 6/4, round II) -> active listing', () => {
  const r = parseAnnouncement(b(FLAT_KLEMENTOWSKIEGO_6_4_II));
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Klementowskiego 6/4');
  assert.equal(r.address.key, 'klementowskiego|6|4');
  assert.equal(r.address.building, '6');
  assert.equal(r.address.apt, '4');
  assert.equal(r.area_m2, 91.35);
  assert.equal(r.starting_price_pln, 235000);
  assert.equal(r.auction_date, '2025-10-14');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: LAND Karwik dz. 69/4 -> parcel-keyed grunt record with obreb', () => {
  const r = parseAnnouncement(b(LAND_KARWIK_69_4_ANNOUNCE));
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '69/4');
  assert.equal(r.obreb, 'Karwik');
  assert.equal(r.area_m2, 665);
  assert.equal(r.address_raw, 'obręb Karwik');
  assert.equal(r.starting_price_pln, 70000);
  assert.equal(r.auction_date, '2026-06-24');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: the car-sale notice never produces a record (no address, kind unknown)', () => {
  assert.equal(parseAnnouncement(b(CAR_SALE_VI)), null);
});


test('parseWykaz: GENUINE pre-auction flat wykaz (Klementowskiego 6/3) -> address-keyed wykaz record', () => {
  const w = parseWykaz(b(FLAT_KLEMENTOWSKIEGO_6_3_WYKAZ), '2025-01-10');
  assert.equal(w.kind, 'mieszkalny');
  assert.equal(w.address_raw, 'Klementowskiego 6/3');
  assert.equal(w.address.key, 'klementowskiego|6|3');
  assert.equal(w.published_date, '2025-01-10');
});

test('BEZPRZETARGOWO wykaz (Lipowa 9/26) never reaches an active/wykaz record — the gate SKIPS it', () => {
  assert.equal(isBezprzetargowo(b(BEZPRZETARGOWO_LIPOWA)), true);
});

test('LEASE wykaz (Pisz 1, cz. dz. nr 1886/25) never reaches an active/wykaz record — the gate SKIPS it', () => {
  assert.equal(isLease(b(LEASE_WYKAZ_1886_25)), true);
});


test('parseResultDoc: FLAT Klementowskiego 6/4 UNSOLD (wynikiem negatywnym)', () => {
  const [r] = parseResultDoc(
    b(FLAT_KLEMENTOWSKIEGO_6_4_RESULT_NEG),
    null,
    'https://bip.pisz.hi.pl/index.php?wiad=29789',
  );
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'klementowskiego|6|4');
  assert.equal(r.starting_price_pln, 235000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.auction_date, '2025-10-14');
});

test('parseResultDoc: LAND Karwik dz. 69/4 UNSOLD, obreb-keyed', () => {
  const [r] = parseResultDoc(
    b(LAND_KARWIK_69_4_RESULT_NEG),
    null,
    'https://bip.pisz.hi.pl/index.php?wiad=31101',
  );
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '69/4');
  assert.equal(r.obreb, 'Karwik');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2026-06-24');
});

test('parseResultDoc: LAND Pisz 2 dz. 450/34+450/38 SOLD via restricted tender (12 700 -> 100 000 zł)', () => {
  const [r] = parseResultDoc(
    b(LAND_PISZ2_450_RESULT_SOLD),
    null,
    'https://bip.pisz.hi.pl/index.php?wiad=29371',
  );
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '450/34, 450/38');
  assert.equal(r.obreb, 'Pisz 2');
  assert.equal(r.starting_price_pln, 12700);
  assert.equal(r.final_price_pln, 100000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2025-07-23');
});

test('parseResultDoc: returns [] for a pending announcement (not yet a result)', () => {
  assert.deepEqual(parseResultDoc(b(FLAT_KLEMENTOWSKIEGO_6_4_II), null, 'x'), []);
});


test('parseBoardPage: extracts id/title/podtytul/date from a real <article class="zajawka"> row', () => {
  const html = `
<article id="zajawka-31101" class="zajawka">

	<h2 class="zajawka__tytul">Ogłoszenie o wyniku przetargu - Karwik dz. 69/4</h2>

	<div class="zajawka__data">
		czwartek, 25 cze 2026 10:53
	</div>


	<div class="zajawka__podtytul">

	</div>

	<a href="index.php?wiad=31101" class="zajawka__wiecej" aria-hidden="true"><span class="sr-only">Czytaj całość</span></a>

</article>`;
  const [row] = parseBoardPage(html);
  assert.equal(row.id, '31101');
  assert.equal(row.title, 'Ogłoszenie o wyniku przetargu - Karwik dz. 69/4');
  assert.equal(row.podtytul, '');
  assert.equal(row.url, 'https://bip.pisz.hi.pl/index.php?wiad=31101');
  assert.equal(boardDateToIso(row.dateRaw), '2026-06-25');
});

test('discoverYearBoards: real sidebar "Rok NNNN" archive links, newest first', () => {
  const html = `
<nav class="list-group sidebar-menu">
					            <a href="index.php?k=1398" class="list-group-item">Rok 2025</a>
	            	            <a href="index.php?k=1372" class="list-group-item">Rok 2024</a>
	            	            <a href="index.php?k=1371" class="list-group-item">Rok 2023</a>
	            	            <a href="index.php?k=1367" class="list-group-item">Rok 2015 - 2019</a>

				</nav>`;
  const boards = discoverYearBoards(html);
  assert.deepEqual(boards.map((x) => x.k), ['1398', '1372', '1371', '1367']);
  assert.equal(boards[0].year, 2025);
  assert.equal(boards.sort((a, c) => c.year - a.year)[0].k, '1398');
});

test('extractDetail: pulls TITLE/PODTYTUL/BODY out of a real detail-page fragment', () => {
  const html = `
<article id="wiadomosci-30743" class="wiadomosc wiadomosc-opublikowany">
	<h2 class="wiadomosc-tytul">Ogłoszenie</h2>
	<div class="podtytul">
	na sprzedaż nieruchomości w drodze przetargu ograniczonego, położonej w obrębie Pisz 1, (dz. nr 1886/24)
	</div>
	<div class="tresc">
	<p>Burmistrz Pisza ogłasza pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości.</p>
	</div>
</article>`;
  const d = extractDetail(html);
  assert.equal(d.title, 'Ogłoszenie');
  assert.equal(d.podtytul, 'na sprzedaż nieruchomości w drodze przetargu ograniczonego, położonej w obrębie Pisz 1, (dz. nr 1886/24)');
  assert.equal(d.body, 'Burmistrz Pisza ogłasza pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości.');
});
