// Złotów unit tests: parser + crawl helper tests.
//
// Groundtruthed against real fixtures from bip.zlotow.pl:
//   1. 2021: Lokal mieszkalny nr 6 przy ul. Wojska Polskiego 17 (29,14 m², 72 850 zł, przetarg 2025-05-08)
//   2. 2094: Wynik: Lokal mieszkalny nr 6 przy ul. Wojska Polskiego 17 (sprzedany, 73 580 zł, Patryk Imosa)
//   3. 2959: Nieruchomości zabudowane: ul. Podolska 4 (95 m², 425 000 zł) oraz ul. Wawrzyniaka 13 (77 m², 430 000 zł)
//   4. 2994: Działki budowlane (17/1, 15/6+17/3, 24/15, 24/21, 24/26) przy ul. Chojnickiej
//   5. 1249: Wynik: Lokal mieszkalny nr 3 przy ul. Mikołaja Kopernika 1 (sprzedany, 161 600 zł)
//   6. 904:  Wynik: Lokal mieszkalny nr 5 przy al. Mickiewicza 13a (sprzedany, 61 000 zł)
//   7. 906:  Wynik: Lokal mieszkalny nr 3 przy ul. ks. dr B. Domańskiego 16 (sprzedany, 40 400 zł)
//   8. 2606: Wynik negatywny (brak wpłaty wadium, dz. 97/2 i in. przy ul. Domańskiego)
//   9. 2930: Wynik pozytywny (działka nr 68/2, ENEA OPERATOR Sp. z o.o.)
//  10. 2095: Wyniki wielopozycyjne (działki 18/7, 15/6+17/3)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/cities/zlotow/config.js';
import {
  parsePLN,
  parseArea,
  cleanAddressString,
  addressFromText,
  auctionDateFromText,
  roundFromText,
  startingPriceFromText,
  finalPriceFromText,
  areaFromText,
  parcelFromText,
  obrebFromText,
  outcomeFromText,
  splitNumberedItems,
  splitResultSections,
  isAnnouncement,
  isResultNotice,
  isWykaz,
  parseListPage,
  parseDetailPage,
  parseAnnouncementDoc,
  parseResultDoc,
} from '../src/cities/zlotow/parse.js';

// ── Config tests ─────────────────────────────────────────────────────────────

test('zlotow config contract', () => {
  assert.equal(config.id, 'zlotow');
  assert.equal(config.label, 'Złotów');
  assert.equal(config.voivodeship, 'wielkopolskie');
  assert.equal(config.teryt, '3031011');
  assert.equal(config.authority, 'Burmistrz Miasta Złotów');
  assert.equal(config.host, 'bip.zlotow.pl');
  assert.equal(config.source, 'html');
});

// ── Numeric & String helpers ──────────────────────────────────────────────────

test('parsePLN handles formatted currency strings', () => {
  assert.equal(parsePLN('72.850 zł'), 72850);
  assert.equal(parsePLN('161.600 zł'), 161600);
  assert.equal(parsePLN('3.222.000 zł'), 3222000);
  assert.equal(parsePLN('425.000 zł, wadium 85.000 zł'), 425000);
  assert.equal(parsePLN('19.800 zł + 23% VAT'), 19800);
  assert.equal(parsePLN('0 zł'), null);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea handles meters, decimals, and thousand-separators', () => {
  assert.equal(parseArea('29,14'), 29.14);
  assert.equal(parseArea('25,2'), 25.2);
  assert.equal(parseArea('49,3 m2'), 49.3);
  assert.equal(parseArea('6.176'), 6176);
  assert.equal(parseArea('1.291 m2'), 1291);
  assert.equal(parseArea('95'), 95);
  assert.equal(parseArea('0'), null);
  assert.equal(parseArea(null), null);
});

test('cleanAddressString normalizes prefixes and apartment designations', () => {
  assert.equal(cleanAddressString('w Złotowie przy ul. Wojska Polskiego 17/6'), 'ul. Wojska Polskiego 17/6');
  assert.equal(cleanAddressString('Złotów, ul. Podolska Nr 4'), 'ul. Podolska 4');
  assert.equal(cleanAddressString('ul. ks.dr Bol. Domańskiego 16/3'), 'ul. ks.dr Bol. Domańskiego 16/3');
  assert.equal(cleanAddressString(null), null);
});

// ── Address extraction ───────────────────────────────────────────────────────

test('addressFromText extracts flats and street addresses', () => {
  const addr1 = addressFromText(
    'Burmistrz Miasta Złotowa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 6 przy ul. Wojska Polskiego 17 w Złotowie o powierzchni użytkowej 29,14 m2',
  );
  assert.ok(addr1);
  assert.equal(addr1.street, 'Wojska Polskiego');
  assert.equal(addr1.building, '17');
  assert.equal(addr1.apt, '6');
  assert.equal(addr1.key, 'wojska polskiego|17|6');

  const addr2 = addressFromText(
    '- lokal mieszkalny Nr 3 o powierzchni użytkowej 49,3 m2 przy ul.Mikołaja Kopernika Nr 1 w Złotowie',
  );
  assert.ok(addr2);
  assert.equal(addr2.street, 'Mikołaja Kopernika');
  assert.equal(addr2.building, '1');
  assert.equal(addr2.apt, '3');

  const addr3 = addressFromText(
    '1. ul. Podolska Nr 4; oznaczonej jako zabudowana działka nr 179 o powierzchni 188 m2',
  );
  assert.ok(addr3);
  assert.equal(addr3.street, 'Podolska');
  assert.equal(addr3.building, '4');
  assert.equal(addr3.apt, null);

  const addr4 = addressFromText(
    '2. ul. Wawrzyniaka Nr 13; oznaczonej jako cześciowo zabudowane działki nr nr 123/2',
  );
  assert.ok(addr4);
  assert.equal(addr4.street, 'Wawrzyniaka');
  assert.equal(addr4.building, '13');
  assert.equal(addr4.apt, null);

  const addr5 = addressFromText(
    '- lokal mieszkalny Nr 5 o powierzchni użytkowej 25,2 m2 przy al. Adama Mickiewicza Nr 13a w Złotowie',
    'sprzedaż w przetargu pustostanu lokalu mieszkalnego nr 5 przy al. Mickiewicza nr 13a',
  );
  assert.ok(addr5);
  assert.equal(addr5.street, 'Adama Mickiewicza');
  assert.equal(addr5.building, '13A');
  assert.equal(addr5.apt, '5');

  const addr6 = addressFromText(
    '- lokal mieszkalny Nr 3 o powierzchni użytkowej 28,93 m2 przy ul. ks. dr Bolesława Domańskiego Nr 16 w Złotowie',
    'sprzedaż lokalu mieszkalnego nr 3 przy ul. ks.dr Bol. Domańskiego 16',
  );
  assert.ok(addr6);
  assert.equal(addr6.street, 'ks. dr Bolesława Domańskiego');
  assert.equal(addr6.building, '16');
  assert.equal(addr6.apt, '3');

  assert.equal(addressFromText('brak adresu'), null);
});

// ── Dates, Rounds, Area, Prices ──────────────────────────────────────────────

test('auctionDateFromText parses spelled-out Polish months and dotted dates', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w dniu 8 maja 2025 roku o godz. 11:00 w Sali Sesyjnej'),
    '2025-05-08',
  );
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w dniu 29 października 2026 r. o godz. 9:00'),
    '2026-10-29',
  );
  assert.equal(
    auctionDateFromText('przeprowadzonego w Urzędzie Miejskim w Złotowie w dniu 15 marca 2024 r.'),
    '2024-03-15',
  );
  assert.equal(
    auctionDateFromText('zaplanowanego w Urzędzie Miejskim w Złotowie na dzień 4 września 2026 r.'),
    '2026-09-04',
  );
  assert.equal(
    auctionDateFromText('zaplanowanego w Urzędzie Miejskim w Złotowie na dzień 17 marca 2026 r.'),
    '2026-03-17',
  );
  assert.equal(
    auctionDateFromText('Informacja o wyniku przetargu z dnia 2.07.2026 r.'),
    '2026-07-02',
  );
  assert.equal(auctionDateFromText(''), null);
});

test('roundFromText detects Roman numerals and Polish words', () => {
  assert.equal(roundFromText('ogłasza drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('ogłasza III przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('II przetarg ustny'), 2);
  assert.equal(roundFromText('ogłoszenie o przetargu'), 1);
});

test('startingPriceFromText extracts base auction prices', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza — 72.850 zł Wadium — 14.570 zł'), 72850);
  assert.equal(startingPriceFromText('Cena wywoławcza 425.000 zł, wadium 85.000 zł'), 425000);
  assert.equal(startingPriceFromText('cena wywoławcza nieruchomości — 3.222.000 zł'), 3222000);
  assert.equal(startingPriceFromText('brak ceny'), null);
});

test('finalPriceFromText extracts winning bids or returns null when unsold', () => {
  assert.equal(
    finalPriceFromText('- cena uzyskana w wyniku licytacji — 73.580 zł\n- nabywcą ustalono - Pan Patryk Imosa'),
    73580,
  );
  assert.equal(
    finalPriceFromText('- cena uzyskana w wyniku licytacji — 19.800 zł + 23% VAT\n- nabywcą ustalono - ENEA'),
    19800,
  );
  assert.equal(
    finalPriceFromText('- cena uzyskana w wyniku licytacji — O zł\n- nabywcą ustalono - nie ustalono nabywcy'),
    null,
  );
  assert.equal(
    finalPriceFromText('- cena uzyskana w wyniku licytacji - Osoba, która wpłaciła wadium odstąpiła od licytacji'),
    null,
  );
});

test('areaFromText extracts usable flat/building area and plot area', () => {
  assert.equal(
    areaFromText('lokal mieszkalny Nr 6 o powierzchni użytkowej 29,14 m2 przy ul. Wojska Polskiego 17'),
    29.14,
  );
  assert.equal(
    areaFromText('Budynek o powierzchni użytkowej około 95 m2, wybudowany został w drugiej połowie XIX wieku'),
    95,
  );
  assert.equal(
    areaFromText('działka nr 97/2 o powierzchni 6.176 m2 w rejonie ulicy Domańskiego'),
    6176,
  );
  assert.equal(
    areaFromText('działka nr 68/2 o powierzchni 42 m2 w rejonie ulicy Ogrodowej'),
    42,
  );
});

test('outcomeFromText classifies sold vs unsold', () => {
  assert.deepEqual(
    outcomeFromText('- cena uzyskana w wyniku licytacji — 73.580 zł\n- nabywcą ustalono - Pan Patryk Imosa'),
    { outcome: 'sold', unsold_reason: null },
  );
  assert.deepEqual(
    outcomeFromText('- cena uzyskana w wyniku licytacji — O zł\n- nabywcą ustalono - nie ustalono nabywcy'),
    { outcome: 'unsold', unsold_reason: 'no_buyer' },
  );
  assert.deepEqual(
    outcomeFromText('liczba osób dopuszczonych do przetargu — brak wpłaty wadium'),
    { outcome: 'unsold', unsold_reason: 'no_buyer' },
  );
  assert.deepEqual(
    outcomeFromText('Osoba, która wpłaciła wadium odstąpiła od licytacji'),
    { outcome: 'unsold', unsold_reason: 'no_buyer' },
  );
});

// ── Document splitting ───────────────────────────────────────────────────────

test('splitNumberedItems splits multi-property announcement into items', () => {
  const text = `OGŁOSZENIE O PRZETARGU USTNYM NIEOGRANICZONYM
Burmistrz Miasta Złotowa ogłasza przetarg:
1. ul. Podolska Nr 4; oznaczonej jako zabudowana działka nr 179 o powierzchni 188 m2
Cena wywoławcza 425.000 zł, wadium 85.000 zł
2. ul. Wawrzyniaka Nr 13; oznaczonej jako cześciowo zabudowane działki nr nr 123/2
Cena wywoławcza 430.000 zł, wadium 86.000 zł
Przetarg odbędzie się w dniu 29 października 2026 r.`;

  const items = splitNumberedItems(text);
  assert.equal(items.length, 2);
  assert.ok(items[0].includes('Podolska Nr 4'));
  assert.ok(items[1].includes('Wawrzyniaka Nr 13'));
});

test('splitResultSections splits multi-parcel result notice into items with preamble', () => {
  const text = `INFORMACJA
Burmistrz Miasta Złotowa podaje do publicznej wiadomości wyniki przetargów z dnia 9 maja 2025 r.:
- działka nr 18/7 o powierzchni 736 m2
- cena wywoławcza nieruchomości — 103.040 zł
- cena uzyskana w wyniku licytacji — 104.070 zł + 23% VAT
- nabywcą ustalono - RKZ INVEST
- działka nr 15/6 i nr 17/3 o łącznej powierzchni 938 m2
- cena wywoławcza nieruchomości — 131.320 zł
- cena uzyskana w wyniku licytacji - Osoba, która wpłaciła wadium odstąpiła od licytacji`;

  const sections = splitResultSections(text);
  assert.equal(sections.length, 2);
  assert.ok(sections[0].includes('9 maja 2025'));
  assert.ok(sections[0].includes('działka nr 18/7'));
  assert.ok(sections[1].includes('9 maja 2025'));
  assert.ok(sections[1].includes('działka nr 15/6 i nr 17/3'));
});

// ── Classification & Filters ─────────────────────────────────────────────────

test('category classifiers filter announcements, results and wykazy', () => {
  assert.equal(
    isAnnouncement('Ogłoszenie o przetargu ustnym nieograniczonym lokalu mieszkalnego nr 6'),
    true,
  );
  assert.equal(
    isAnnouncement('Ogłoszenie o przetargu na dzierżawę nieruchomości rolnej'),
    false,
  );
  assert.equal(
    isAnnouncement('Informacja o wyniku przetargu ustnego nieograniczonego z dnia 8.05.2025 r.'),
    false,
  );

  assert.equal(
    isResultNotice('Informacja o wyniku przetargu z dnia 2.07.2026 r.'),
    true,
  );
  assert.equal(
    isResultNotice('Wynik przetargu przeprowadzonego w dniu 28 lutego 2023 r.'),
    true,
  );
  assert.equal(
    isResultNotice('Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż nieruchomości'),
    false,
  );

  assert.equal(
    isWykaz('Wykaz nieruchomości przeznaczonych do obrotu nr 12.2026'),
    true,
  );
  assert.equal(
    isWykaz('Ogłoszenie o przetargu na sprzedaż nieruchomości'),
    false,
  );
});

// ── Full announcement doc parsing ────────────────────────────────────────────

test('parseAnnouncementDoc extracts multi-property residential announcement', () => {
  const text = `OGŁOSZENIE O PRZETARGU USTNYM NIEOGRANICZONYM
Burmistrz Miasta Złotowa ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości położonych w obr.0087 miasta Złotów:
1. ul. Podolska Nr 4; oznaczonej jako zabudowana działka nr 179 o powierzchni 188 m2. Budynek o powierzchni użytkowej około 95 m2. Cena wywoławcza 425.000 zł, wadium 85.000 zł.
2. ul. Wawrzyniaka Nr 13; oznaczonej jako działka nr 123/2 o powierzchni 335 m2. Budynek o powierzchni użytkowej około 77 m2. Cena wywoławcza 430.000 zł, wadium 86.000 zł.
Przetarg odbędzie się w dniu 29 października 2026 r. o godz. 9:00.`;

  const { listings, land } = parseAnnouncementDoc(
    text,
    'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż nieruchomości zabudowanych',
    '2026-09-22',
    'https://bip.zlotow.pl/kategorie/267-2026/artykuly/2959',
    'https://bip-api.zlotow.pl/api/attachments/8193',
  );

  assert.equal(land.length, 0);
  assert.equal(listings.length, 2);

  assert.equal(listings[0].kind, 'zabudowana');
  assert.equal(listings[0].address.street, 'Podolska');
  assert.equal(listings[0].address.building, '4');
  assert.equal(listings[0].starting_price_pln, 425000);
  assert.equal(listings[0].area_m2, 95);
  assert.equal(listings[0].auction_date, '2026-10-29');

  assert.equal(listings[1].kind, 'zabudowana');
  assert.equal(listings[1].address.street, 'Wawrzyniaka');
  assert.equal(listings[1].address.building, '13');
  assert.equal(listings[1].starting_price_pln, 430000);
  assert.equal(listings[1].area_m2, 77);
  assert.equal(listings[1].auction_date, '2026-10-29');
});

test('parseAnnouncementDoc extracts single residential flat notice', () => {
  const text = `Burmistrz Miasta Złotowa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 6 przy ul. Wojska Polskiego 17 w Złotowie o powierzchni użytkowej 29,14 m2.
Cena wywoławcza — 72.850 zł Wadium — 14.570 zł
Przetarg odbędzie się w dniu 8 maja 2025 roku o godz. 11:00.`;

  const { listings, land } = parseAnnouncementDoc(
    text,
    'Ogłoszenie o przetargu lokalu mieszkalnego nr 6 przy ul. Wojska Polskiego 17',
    '2025-04-03',
    'https://bip.zlotow.pl/kategorie/243-2025/artykuly/2021',
    'https://bip-api.zlotow.pl/api/attachments/5781',
  );

  assert.equal(land.length, 0);
  assert.equal(listings.length, 1);
  assert.equal(listings[0].kind, 'mieszkalny');
  assert.equal(listings[0].address.street, 'Wojska Polskiego');
  assert.equal(listings[0].address.building, '17');
  assert.equal(listings[0].address.apt, '6');
  assert.equal(listings[0].starting_price_pln, 72850);
  assert.equal(listings[0].area_m2, 29.14);
  assert.equal(listings[0].auction_date, '2025-05-08');
  assert.equal(listings[0].round, 1);
});

// ── Full result doc parsing ──────────────────────────────────────────────────

test('parseResultDoc extracts sold flat result (fixture 2094)', () => {
  const text = `INFORMACJA
Burmistrz Miasta Złotowa podaje do publicznej wiadomości wynik przetargu ustnego nieograniczonego przeprowadzonego w Urzędzie Miejskim w Złotowie w dniu 8 maja 2025 r.
- lokal mieszkalny Nr 6 o powierzchni użytkowej 29,14 m2 przy ul. Wojska Polskiego Nr 17 w Złotowie, wraz z udziałem w budynku i w gruncie, oznaczonym jako działka 243/2 o powierzchni 251 m2
- liczba osób zainteresowanych nabyciem — 3,
- cena wywoławcza nieruchomości — 72.850 zł
- cena uzyskana w wyniku licytacji — 73.580 zł
- nabywcą ustalono - Pan Patryk Imosa
Złotów, dnia 8 maja 2025 r.`;

  const results = parseResultDoc(text, null, 'https://bip-api.zlotow.pl/api/attachments/5975');
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, 'mieszkalny');
  assert.equal(results[0].outcome, 'sold');
  assert.equal(results[0].unsold_reason, null);
  assert.equal(results[0].auction_date, '2025-05-08');
  assert.equal(results[0].starting_price_pln, 72850);
  assert.equal(results[0].final_price_pln, 73580);
  assert.equal(results[0].area_m2, 29.14);
  assert.equal(results[0].address.street, 'Wojska Polskiego');
  assert.equal(results[0].address.building, '17');
  assert.equal(results[0].address.apt, '6');
  assert.equal(results[0].address.key, 'wojska polskiego|17|6');
});

test('parseResultDoc extracts sold flat result (fixture 1249)', () => {
  const text = `INFORMACJA
Burmistrz Miasta Złotowa podaje do publicznej wiadomości wynik przetargu ustnego nieograniczonego przeprowadzonego w Urzędzie Miejskim w Złotowie w dniu 15 marca 2024 r.
- lokal mieszkalny Nr 3 o powierzchni użytkowej 49,3 m2 przy ul.Mikołaja Kopernika Nr 1 w Złotowie, wraz z udziałem w budynku i gruncie
- cena wywoławcza nieruchomości — 160.000 zł
- cena uzyskana w wyniku licytacji — 161.600 zł
- nabywcą ustalono - Pan Patryk Imosa
Złotów, dnia 18 marca 2024 r.`;

  const results = parseResultDoc(text, null, 'https://bip-api.zlotow.pl/api/attachments/4144');
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, 'mieszkalny');
  assert.equal(results[0].outcome, 'sold');
  assert.equal(results[0].auction_date, '2024-03-15');
  assert.equal(results[0].starting_price_pln, 160000);
  assert.equal(results[0].final_price_pln, 161600);
  assert.equal(results[0].area_m2, 49.3);
  assert.equal(results[0].address.street, 'Mikołaja Kopernika');
  assert.equal(results[0].address.building, '1');
  assert.equal(results[0].address.apt, '3');
});

test('parseResultDoc extracts unsold land result (fixture 2606)', () => {
  const text = `INFORMACJA
Burmistrz Miasta Złotowa podaje do publicznej wiadomości wyniki przetargu ustnego nieograniczonego zaplanowanego w Urzędzie Miejskim w Złotowie na dzień 17 marca 2026 r. dotyczącego sprzedaży nieruchomości pod zabudowę mieszkaniową wielorodzinną:
- działka nr 97/2, nr 98/4, nr 137/83, nr 140/2 o powierzchni 6.176 m2 w rejonie ulicy ks. dr Bolesława Domańskiego,
- liczba osób dopuszczonych do przetargu — brak wpłaty wadium
- cena wywoławcza nieruchomości — 3.222.000 zł,
- cena uzyskana w wyniku licytacji — O zł
- nabywcą ustalono - nie ustalono nabywcy
Złotów, dnia 17 marca 2026 r.`;

  const results = parseResultDoc(text, null, 'https://bip-api.zlotow.pl/api/attachments/7282');
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, 'grunt');
  assert.equal(results[0].outcome, 'unsold');
  assert.equal(results[0].unsold_reason, 'no_buyer');
  assert.equal(results[0].auction_date, '2026-03-17');
  assert.equal(results[0].starting_price_pln, 3222000);
  assert.equal(results[0].final_price_pln, null);
  assert.equal(results[0].area_m2, 6176);
  assert.equal(results[0].dzialka_nr, '97/2, 98/4, 137/83, 140/2');
});

test('parseResultDoc extracts multi-parcel land results (fixture 2095)', () => {
  const text = `INFORMACJA
Burmistrz Miasta Złotowa podaje do publicznej wiadomości wyniki przetargów ustnych nieograniczonych, zaplanowanych w Urzędzie Miejskim w Złotowie na dzień 9 maja 2025 r. dotyczących sprzedaży nieruchomości przeznaczonych pod zabudowę mieszkaniową jednorodzinną:
- działka nr 18/7 o powierzchni 736 m2 w rejonie ulicy Wł. Brzezińskiego
- cena wywoławcza nieruchomości — 103.040 zł,
- cena uzyskana w wyniku licytacji — 104.070 zł + 23% VAT
- nabywcą ustalono - RKZ INVEST Marek Ziarnek
- działka nr 15/6 i nr 17/3 o łącznej powierzchni 938 m2 w rejonie ulicy WŁ Brzezińskiego
- cena wywoławcza nieruchomości — 131.320 zł,
- cena uzyskana w wyniku licytacji - Osoba, która wpłaciła wadium odstąpiła od licytacji`;

  const results = parseResultDoc(text, null, 'https://bip-api.zlotow.pl/api/attachments/5976');
  assert.equal(results.length, 2);

  assert.equal(results[0].kind, 'grunt');
  assert.equal(results[0].outcome, 'sold');
  assert.equal(results[0].dzialka_nr, '18/7');
  assert.equal(results[0].starting_price_pln, 103040);
  assert.equal(results[0].final_price_pln, 104070);
  assert.equal(results[0].area_m2, 736);

  assert.equal(results[1].kind, 'grunt');
  assert.equal(results[1].outcome, 'unsold');
  assert.equal(results[1].unsold_reason, 'no_buyer');
  assert.equal(results[1].dzialka_nr, '15/6 i 17/3');
  assert.equal(results[1].starting_price_pln, 131320);
  assert.equal(results[1].final_price_pln, null);
  assert.equal(results[1].area_m2, 938);
});

// ── List & Detail HTML parsers ────────────────────────────────────────────────

test('parseListPage extracts articles and dates from Nefeni category HTML', () => {
  const html = `
    <ul>
      <li>
        <a title="Ogłoszenie o przetargu ustnym nieograniczonym" href="/kategorie/267-2026/artykuly/2994-ogloszenie-o-przetargu?lang=PL">Link</a>
        <div>(Opublikowano: 2026-10-19)</div>
      </li>
      <li>
        <a title="Informacja o wyniku przetargu" href="/kategorie/267-2026/artykuly/2930-wynik?lang=PL">Link</a>
        <div>(Opublikowano: 2026-09-04)</div>
      </li>
      <li>
        <a href="/kategorie/153-podstawowe-informacje/artykuly/776-podstawowe-informacje?lang=PL">Podstawowe</a>
      </li>
    </ul>
  `;

  const entries = parseListPage(html, 'https://bip.zlotow.pl');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, '2994');
  assert.equal(entries[0].title, 'Ogłoszenie o przetargu ustnym nieograniczonym');
  assert.equal(entries[0].published_date, '2026-10-19');
  assert.equal(entries[0].url, 'https://bip.zlotow.pl/kategorie/267-2026/artykuly/2994-ogloszenie-o-przetargu?lang=PL');
  assert.equal(entries[1].id, '2930');
});

test('parseDetailPage extracts title, date and attachment links', () => {
  const html = `
    <div>
      <h3 class="text-primary text-lg mb-[10px] leading-[18px] tracking-[1px] font-medium">Ogłoszenie o przetargu ustnym nieograniczonym</h3>
      <div class="text-accent50 text-xs mr-[20px] mb-[20px] leading-[12px] tracking-[0.25px] inline-block">2026-10-19 15:54</div>
      <ul>
        <li>
          <a href="https://bip-api.zlotow.pl/api/attachments/8260" title="ogł.o przetargu 5xMj.pdf">Pobierz</a>
        </li>
        <li>
          <a href="/api/attachments/8261" title="mapy.pdf">Pobierz</a>
        </li>
      </ul>
    </div>
  `;

  const detail = parseDetailPage(html, 'https://bip.zlotow.pl/kategorie/267-2026/artykuly/2994');
  assert.equal(detail.title, 'Ogłoszenie o przetargu ustnym nieograniczonym');
  assert.equal(detail.publishedDate, '2026-10-19');
  assert.equal(detail.attachments.length, 2);
  assert.equal(detail.attachments[0].url, 'https://bip-api.zlotow.pl/api/attachments/8260');
  assert.equal(detail.attachments[0].name, 'ogł.o przetargu 5xMj.pdf');
  assert.equal(detail.attachments[1].url, 'https://bip-api.zlotow.pl/api/attachments/8261');
});
