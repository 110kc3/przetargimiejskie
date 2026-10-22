// Kołobrzeg parser tests.
// Real fixtures from bip.um.kolobrzeg.pl (Prezydent Miasta Kołobrzeg).
// Uses Node.js built-in test runner.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import {
  parsePLN,
  parseNum,
  parsePolishDate,
  isFlat,
  isLand,
  isSkippable,
  extractRound,
  extractAuctionDate,
  extractWadiumDeadline,
  extractAddress,
  extractArea,
  extractStartingPrice,
  extractWadium,
  parseAnnouncement,
  parseWykazItem,
  parseResultDoc,
} from '../src/cities/kolobrzeg/parse.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OCR_CACHE = join(ROOT, 'ocr-cache');
const DOC_CACHE = join(ROOT, 'doc-text-cache');

function loadCacheFile(dir, filename, fallbackContent) {
  const p = join(dir, filename);
  if (existsSync(p)) return readFileSync(p, 'utf8');
  return fallbackContent;
}

// ---- Fixtures -------------------------------------------------------------

// RESULT 1: Pomorska 4/4 (SOLD for 505 000 zł, starting 500 000 zł, buyer Pan Rafał Wojtasik)
const RES_POMORSKA_4_4 = loadCacheFile(
  OCR_CACHE,
  '124831.eefcb0bf.txt',
  `PREZYDENT MIASTA KOŁOBRZEG
GN.6840.2.3.2024.II
INFORMACJA O WYNIKU PRZETARGU NA SPRZEDAŻ NIERUCHOMOŚCI
PREZYDENT MIASTA KOŁOBRZEG
informuje, że w dniu 11 lipca 2025 r. w sali konferencyjnej Urzędu Miasta Kołobrzeg przy ul. Ratuszowej 13 przeprowadzony został I
przetarg ustny nieograniczony na sprzedaż nw. nieruchomości położonej w Kołobrzegu:
Kołobrzeg, 21 lipca 2025 r.
Kołobrzeg, ul. Pomorska 4, lokal mieszkalny nr 4;
Lokal mieszkalny nr 4 przy ul. Pomorskiej 4 o powierzchni użytkowej 93,41 m2 wraz z udziałem do 227/10000 części w działce gruntu
Cena wywoławcza: 500.000,00 zł brutto
Cena wylicytowana: 505.000,00 zł brutto
Liczba osób dopuszczonych: 1
Nabywca: Pan Rafał Wojtasik`
);

// RESULT 2: Zygmuntowskiej 3/7 (UNSOLD, 320 000 zł, brak ofert)
const RES_ZYGMUNTOWSKIEJ_3_7 = loadCacheFile(
  OCR_CACHE,
  '124076.dfa61dd1.txt',
  `Prezydent Miasta Kołobrzeg
ul. Ratuszowa 13
GN.6840.2.1.2024.II
Kołobrzeg, 8 kwietnia 2025 r.
INFORMACJA O WYNIKU USTNEGO PRZETARGU NA SPRZEDAŻ NIERUCHOMOŚCI
PREZYDENT MIASTA KOŁOBRZEG
informuje, że w dniu 31 marca 2025 r. w sali konferencyjnej Urzędu Miasta Kołobrzeg przy ul. Ratuszowej 13 przeprowadzony został
I przetarg ustny nieograniczony na sprzedaż nw. nieruchomości położonej w Kołobrzegu:
Lokal mieszkalny położony przy ul. Zygmuntowskiej 3/7 w Kołobrzegu;
Cena wywoławcza: 320.000,- zł
Nabywca: Brak ofert`
);

// RESULT 3: Unii Lubelskiej 45/7 (UNSOLD, round 4, 500 000 zł)
const RES_UNII_LUBELSKIEJ_45_7 = loadCacheFile(
  OCR_CACHE,
  '127683.8b6a0a5b.txt',
  `Prezydent Miasta Kołobrzeg
ul. Ratuszowa 13
GN.6840.2.2.2024.II
INFORMACJA O WYNIKU PRZETARGU NA SPRZEDAŻ NIERUCHOMOŚCI
PREZYDENT MIASTA KOŁOBRZEG
informuje, że w dniu 22 lipca 2026 r. o godz. 10.00 w siedzibie Urzędu Miasta Kołobrzeg przy ul. Ratuszowej 13
przeprowadzony został IV przetarg ustny nieograniczony na sprzedaż nw. nieruchomości położonej w Kołobrzegu:
Kołobrzeg, ul. Unii Lubelskiej 45; lokal mieszkalny nr 7;
Cena wywoławcza lokalu: 500.000,00 zł
Nabywca: Brak ofert`
);

// ANNOUNCEMENT 1: Strzelecka 3/3 (V przetarg, 119.36 m², 750 000 zł, 2026-12-02)
const ANN_STRZELECKA_3_3 = loadCacheFile(
  DOC_CACHE,
  '127872.d3883682.txt',
  `OGŁOSZENIE O PRZETARGU
PREZYDENT MIASTA KOŁOBRZEG zaprasza do udziału w V przetargu ustnym nieograniczonym na zbycie nieruchomości
Kołobrzeg, ul. Strzelecka 3 lokal mieszkalny nr 3;
Lokal mieszkalny nr 3 o powierzchni użytkowej 119,36 m2 wraz z udziałem do 2629/10000 części w działce gruntu
Cena wywoławcza: 750.000,00 zł
Wadium: 75.000,00 zł
Przetarg odbędzie się w dniu  2 grudnia 2026 r. o godzinie 10.00`
);

// ANNOUNCEMENT 2: Spacerowa 39/6 (I przetarg, 29.2 m², 500 000 zł, 2026-11-18)
const ANN_SPACEROWA_39_6 = loadCacheFile(
  DOC_CACHE,
  '127816.ebe939fe.txt',
  `OGŁOSZENIE O PRZETARGU
PREZYDENT MIASTA KOŁOBRZEG zaprasza do udziału w I przetargu ustnym nieograniczonym na zbycie nieruchomości
Kołobrzeg, ul. Spacerowa 39 lokal mieszkalny nr 6;
Lokal mieszkalny nr 6 o powierzchni użytkowej 29,2 m2 wraz z udziałem
Cena wywoławcza: 500.000,00 zł
Wadium: 50.000,00 zł
Przetarg odbędzie się w dniu  18 listopada 2026 r. o godzinie 10.00`
);

// ANNOUNCEMENT 3: Perłowa 815/18 (Land plot, 127893.9908e1f3.txt)
const ANN_PERLOWA_LAND = loadCacheFile(
  DOC_CACHE,
  '127893.9908e1f3.txt',
  `OGŁOSZENIE O PRZETARGU
Prezydent Miasta Kołobrzeg zaprasza do przetargu na sprzedaż działki nr 815/18 położonej w obrębie 9 przy ul. Perłowej w Kołobrzegu`
);

// WYKAZ: Spacerowa 39/6 (Pre-auction designation, 127409.892dab2b.txt)
const WYKAZ_SPACEROWA = loadCacheFile(
  DOC_CACHE,
  '127409.892dab2b.txt',
  `WYKAZ
GN.6840.2.1.2026.II
Prezydent Miasta Kołobrzeg podaje do publicznej wiadomości wykaz nieruchomości:
sprzedaż lokalu mieszkalnego nr 6 położonego w budynku przy ul. Spacerowej 39 w Kołobrzegu`
);

// ---- Tests ----------------------------------------------------------------

test('utility functions: parsePLN, parseNum, parsePolishDate', () => {
  assert.equal(parsePLN('750.000,00 zł'), 750000);
  assert.equal(parsePLN('500.000,00'), 500000);
  assert.equal(parsePLN('320.000,-'), 320000);
  assert.equal(parsePLN('75 000 zł'), 75000);
  assert.equal(parsePLN(null), null);

  assert.equal(parseNum('119,36'), 119.36);
  assert.equal(parseNum('29.2'), 29.2);
  assert.equal(parseNum('93,41'), 93.41);
  assert.equal(parseNum(null), null);

  assert.equal(parsePolishDate('2 grudnia 2026 r.'), '2026-12-02');
  assert.equal(parsePolishDate('18 listopada 2026 r.'), '2026-11-18');
  assert.equal(parsePolishDate('11 lipca 2025 r.'), '2025-07-11');
  assert.equal(parsePolishDate('31.03.2025'), '2025-03-31');
  assert.equal(parsePolishDate(''), null);
});

test('classification: isFlat, isLand, isSkippable', () => {
  assert.equal(isFlat('sprzedaż lokalu mieszkalnego nr 3 przy ul. Strzeleckiej'), true);
  assert.equal(isFlat('zbycie nieruchomości lokalowej w Kołobrzegu'), true);
  assert.equal(isFlat('przetarg na sprzedaż działki niezabudowanej'), false);

  assert.equal(isLand('sprzedaż niezabudowanej działki nr 815/18'), true);
  assert.equal(isLand('sprzedaż lokalu mieszkalnego nr 7'), false);

  assert.equal(isSkippable('oddanie w dzierżawę lokalizacji pod stacje ładowania'), true);
  assert.equal(isSkippable('najem lokalu użytkowego'), true);
  assert.equal(isSkippable('sprzedaż kwiatów i zniczy przy cmentarzu'), true);
  assert.equal(isSkippable('I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'), false);
});

test('round and date extraction', () => {
  assert.equal(extractRound('V przetarg ustny nieograniczony na zbycie lokalu'), 5);
  assert.equal(extractRound('I przetarg ustny nieograniczony'), 1);
  assert.equal(extractRound('IV przetarg ustny nieograniczony'), 4);
  assert.equal(extractRound('rozstrzygnięcie 2 przetargu'), 2);

  assert.equal(
    extractAuctionDate('Przetarg odbędzie się w dniu  2 grudnia 2026 r. w sali'),
    '2026-12-02',
  );
  assert.equal(
    extractAuctionDate('przeprowadzony został w dniu 11 lipca 2025 r. I przetarg'),
    '2025-07-11',
  );
  assert.equal(extractAuctionDate('', '2026-01-01'), '2026-01-01');
});

test('address extraction from title, attachment header, and body text', () => {
  const addr1 = extractAddress(
    '[ATTACHMENT: GN.6840.2.1.2025 rozstrzygnięcie 1 przetargu - lokal mieszkalny ul. Strzelecka 3/3, Kołobrzeg]',
  );
  assert.ok(addr1);
  assert.equal(addr1.key, 'strzelecka|3|3');
  assert.equal(addr1.building, '3');
  assert.equal(addr1.apt, '3');

  const addr2 = extractAddress(
    '',
    'V przetarg ustny nieograniczony na zbycie lokalu mieszkalnego nr 3 przy ul. Strzeleckiej 3 w Kołobrzegu',
  );
  assert.ok(addr2);
  assert.equal(addr2.key, 'strzeleckiej|3|3');

  const addr3 = extractAddress(
    'Lokal mieszkalny położony przy ul. Zygmuntowskiej 3/7 w Kołobrzegu',
  );
  assert.ok(addr3);
  assert.equal(addr3.key, 'zygmuntowskiej|3|7');
});

test('parseResultDoc: successful auction sold at ul. Pomorska 4/4', () => {
  const blob = `[ATTACHMENT: GN.6840.2.3.2024 rozstrzygnięcie 1 przetargu – lokal mieszkalny ul. Pomorska 4/4 w Kołobrzegu]\n\n${RES_POMORSKA_4_4}`;
  const results = parseResultDoc(blob, null, 'https://bip.um.kolobrzeg.pl/api/files/124831');
  assert.equal(results.length, 1);

  const r = results[0];
  assert.equal(r.address.key, 'pomorska|4|4');
  assert.equal(r.auction_date, '2025-07-11');
  assert.equal(r.round, 1);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.starting_price_pln, 500000);
  assert.equal(r.final_price_pln, 505000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.buyer, 'Pan Rafał Wojtasik');
  assert.equal(r.source_pdf, 'https://bip.um.kolobrzeg.pl/api/files/124831');
});

test('parseResultDoc: negative outcome (brak ofert) at ul. Zygmuntowskiej 3/7', () => {
  const blob = `[ATTACHMENT: GN.6840.2.1.2024 rozstrzygnięcie 1 przetargu - lokal mieszkalny położony w Kołobrzegu przy ul. Zygmuntowskiej 3/7]\n\n${RES_ZYGMUNTOWSKIEJ_3_7}`;
  const results = parseResultDoc(blob, null, 'https://bip.um.kolobrzeg.pl/api/files/124076');
  assert.equal(results.length, 1);

  const r = results[0];
  assert.equal(r.address.key, 'zygmuntowskiej|3|7');
  assert.equal(r.auction_date, '2025-03-31');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 320000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak ofert');
  assert.equal(r.buyer, null);
});

test('parseResultDoc: negative outcome round IV at ul. Unii Lubelskiej 45/7', () => {
  const blob = `[ATTACHMENT: Informacja o wyniku 4 przetargu ustnego nieograniczonego dot. sprzedaży lokalu mieszkalnego nr 7, położnego przy ul. Unii Lubelskiej 45 w Kołobrzegu]\n\n${RES_UNII_LUBELSKIEJ_45_7}`;
  const results = parseResultDoc(blob, null, 'https://bip.um.kolobrzeg.pl/api/files/127683');
  assert.equal(results.length, 1);

  const r = results[0];
  assert.equal(r.address.key, 'unii lubelskiej|45|7');
  assert.equal(r.auction_date, '2026-07-22');
  assert.equal(r.round, 4);
  assert.equal(r.starting_price_pln, 500000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak ofert');
});

test('parseAnnouncement: round V active flat at ul. Strzelecka 3/3', () => {
  const listings = parseAnnouncement(ANN_STRZELECKA_3_3, {
    title: 'V przetarg ustny nieograniczony na zbycie lokalu mieszkalnego nr 3 przy ul. Strzeleckiej 3 w Kołobrzegu',
    publishDate: '2026-09-09',
    detail_url: 'https://bip.um.kolobrzeg.pl/a,64928.html',
    source_url: 'https://bip.um.kolobrzeg.pl/api/files/127872',
  });
  assert.equal(listings.length, 1);

  const l = listings[0];
  assert.equal(l.address.key, 'strzeleckiej|3|3');
  assert.equal(l.kind, 'mieszkalny');
  assert.equal(l.area_m2, 119.36);
  assert.equal(l.starting_price_pln, 750000);
  assert.equal(l.wadium_pln, 75000);
  assert.equal(l.round, 5);
  assert.equal(l.auction_date, '2026-12-02');
  assert.equal(l.wadium_deadline, '2026-11-26');
});

test('parseAnnouncement: round I active flat at ul. Spacerowa 39/6', () => {
  const listings = parseAnnouncement(ANN_SPACEROWA_39_6, {
    title: 'I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego przy ul. Spacerowej 39/6 w Kołobrzegu',
    publishDate: '2026-08-27',
    detail_url: 'https://bip.um.kolobrzeg.pl/a,64915.html',
    source_url: 'https://bip.um.kolobrzeg.pl/api/files/127816',
  });
  assert.equal(listings.length, 1);

  const l = listings[0];
  assert.equal(l.address.key, 'spacerowej|39|6');
  assert.equal(l.kind, 'mieszkalny');
  assert.equal(l.area_m2, 29.2);
  assert.equal(l.starting_price_pln, 500000);
  assert.equal(l.wadium_pln, 50000);
  assert.equal(l.round, 1);
  assert.equal(l.auction_date, '2026-11-18');
  assert.equal(l.wadium_deadline, '2026-11-12');
});

test('parseAnnouncement: land plot correctly classified as grunt', () => {
  const listings = parseAnnouncement(ANN_PERLOWA_LAND, {
    title: 'II przetarg ustny ograniczony na zbycie niezabudowanej działki nr 815/18 obręb 9, położonej przy ul. Perłowej w Kołobrzegu',
    publishDate: '2026-09-15',
    detail_url: 'https://bip.um.kolobrzeg.pl/a,64935.html',
    source_url: 'https://bip.um.kolobrzeg.pl/api/files/127893',
  });
  assert.equal(listings.length, 1);
  assert.equal(listings[0].kind, 'grunt');
});

test('parseWykazItem: pre-auction designation for ul. Spacerowa 39/6', () => {
  const items = parseWykazItem(WYKAZ_SPACEROWA, {
    title: '10.07.2026 r. - ul. Spacerowa',
    publishDate: '2026-06-18',
    detail_url: 'https://bip.um.kolobrzeg.pl/a,64800.html',
    source_url: 'https://bip.um.kolobrzeg.pl/api/files/127409',
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].address.key, 'spacerowej|39|6');
  assert.equal(items[0].published_date, '2026-06-18');
  assert.equal(items[0].wykaz_no, 'GN.6840.2.1.2026.II');
});

test('edge cases: non-result document and empty strings return []', () => {
  assert.deepEqual(parseResultDoc('', null, 'https://example.com/test.pdf'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com/test.pdf'), []);
  assert.deepEqual(
    parseResultDoc('Sprawozdanie finansowe za rok 2025', '2025-01-01', 'https://example.com/test.pdf'),
    [],
  );
  assert.deepEqual(parseAnnouncement('', {}), []);
  assert.deepEqual(parseWykazItem('', {}), []);
});
