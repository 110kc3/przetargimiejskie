// Chełmno parser tests. Fixtures are condensed-but-faithful copies of the REAL
// XML-record field values fetched live from bip.chelmno.pl (verified
// 2026-07-05). Each fixture feeds parse.buildRecordText() exactly as crawl.js
// does, so the parsers are groundtruthed against production data.
//
//   record 10338  ul. Toruńska 8/7   — SOLD, round VIII (Roman), 29 290 zł
//   record 11290  ul. Wodna 34/9     — UNSOLD (negatywny), round I
//   record 8824   Powstańców Wlkp 2/7 — SOLD, round IV, no-grosze "170.000 zł"
//   record 8316   Hallera 6/3        — DZIERŻAWA lease → skipped
//   record 11740  dz. 185/22 …       — LAND (niezabudowana) → land stream
//
// The tresc fixtures deliberately KEEP the prior-round history sentence
// ("Pierwszy przetarg odbył się …") — the round/date trap the parser must avoid.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  hasResolution,
  isLease,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  parsePLN,
} from '../src/cities/chelmno/parse.js';
import { parseBoardPage } from '../src/cities/chelmno/crawl.js';

// --------------------------------------------------------------- real fixtures

const TORUNSKA_SOLD = {
  adres: 'Chełmno, ul.Toruńska 8/7',
  rodzaj: 'Lokal mieszkalny',
  cena: '29.000 zł ',
  data: '06                .08                .2024  godz. 08:30',
  rozstrzygniecie:
    '<![CDATA[<p>Nabywcą nieruchomości został Pan Grzegorz Gołębiewski za cenę 29.290,00 zł. </p>]]>',
  przetargNa:
    'Sprzedaż prawa własności lokalu mieszkalnego nr 7, położonego przy ul. Toruńskiej 8 wraz z udziałem w nieruchomości wspólnej i w prawie własności gruntu.',
  tresc:
    '<![CDATA[<p>Burmistrz Miasta Chełmna ogłasza <strong>VIII przetarg ustny nieograniczony</strong> ' +
    'polegający na sprzedaży prawa własności lokalu mieszkalnego <strong>nr 7</strong> o pow. 27,67 m2 ' +
    '(w skład którego wchodzi 1 pokój z aneksem kuchennym o pow. 13,75 m2). Lokal położony w Chełmnie przy ' +
    '<strong>ul. Toruńskiej 8</strong>. <strong>Cena wywoławcza wynosi 29.000,00 zł</strong> ' +
    '(słownie: dwadzieścia dziewięć tysięcy złotych 00/100). Przetarg odbędzie się w dniu ' +
    '<strong>6 sierpnia 2024 roku o godz. 8.30</strong> w sali nr 102 Urzędu Miasta. ' +
    'Pierwszy przetarg odbył się 9 marca 2023 roku. Zakończył się wynikiem negatywnym. ' +
    'Siódmy przetarg odbył się 20 czerwca 2024 roku. Zakończył się wynikiem negatywnym.</p>]]>',
};

const WODNA_UNSOLD = {
  adres: 'ul. Wodna 34 w Chełmnie',
  rodzaj: 'Lokal mieszkalny',
  cena: '70.000 zł ',
  data: '08                .01                .2026  godz. 09:00',
  rozstrzygniecie:
    '<![CDATA[<p style="text-align: justify;">Nikt nie przystąpił do przetargu. Przetarg zakończył się wynikiem negatywnym. </p>]]>',
  przetargNa:
    'Sprzedaż prawa własności lokalu mieszkalnego nr 9, położonego przy ul. Wodnej 34 w Chełmnie.',
  tresc:
    '<![CDATA[<p style="text-align: justify;">Burmistrz Miasta Chełmna ogłasza <strong>I przetarg ustny nieograniczony</strong> ' +
    'polegający na sprzedaży prawa własności lokalu mieszkalnego <strong>nr 9</strong> o pow. 25,89 m2 ' +
    '(1 pokój o pow. 19,93 m2, kuchnia o pow. 5,11 m2). Lokal usytuowany na poddaszu budynku przy ' +
    '<strong>ul. Wodnej 34</strong>. <strong>Cena wywoławcza wynosi 70.000,00 zł</strong>. ' +
    'Przetarg odbędzie się w dniu <strong>8 stycznia 2026 roku o godz. 9.00</strong> w sali nr 102.</p>]]>',
};

const POWSTANCOW_SOLD = {
  adres: 'Chełmno ul. Powstańców Wielkopolskich 2 / 7',
  rodzaj: 'Lokal mieszkalny',
  cena: '140.000,00 zł',
  data: '01                .06                .2022  godz. 09:00',
  rozstrzygniecie:
    '<![CDATA[<p>Nabywcą nieruchomości lokalowej został Pan Wojciech Dajewski za cenę     170.000 zł. </p>]]>',
  przetargNa:
    'Sprzedaż prawa własności lokalu mieszkalnego nr 7, położonego przy ul. Powstańców Wielkopolskich 2 z pomieszczeniami przynależnymi oraz udziałem w części wspólnej nieruchomości',
  tresc:
    '<![CDATA[<p>Burmistrz Miasta Chełmna ogłasza <strong>IV przetarg ustny nieograniczony</strong> ' +
    'polegający na sprzedaży prawa własności lokalu mieszkalnego <strong>nr 7</strong> o pow. 55,10 m2 ' +
    'przy <strong>ul. Powstańców Wielkopolskich 2</strong>. ' +
    '<strong>Cena wywoławcza wynosi 140.000,00 zł</strong>. Przetarg odbędzie się w dniu ' +
    '1 czerwca 2022 roku o godz. 9.00.</p>]]>',
};

const HALLERA_LEASE = {
  adres: '86-200 Chełmno, ul. Gen. J. Hallera 6/3',
  rodzaj: 'Lokal użytkowy',
  cena: 'brutto  800,00 zł miesięcznie',
  data: '09                .09                .2021  godz. 09:30',
  rozstrzygniecie: '<![CDATA[<p>Przetarg rozstrzygnięty wynikiem negatywnym - brak ofert</p>]]>',
  przetargNa:
    'III PRZETARG USTNY NIEOGRANICZONY polegający na oddaniu w dzierżawę na okres do 10 lat lokal użytkowy nr 3 o łącznej powierzchni użytkowej 27,67 m2',
  tresc:
    '<![CDATA[<p>Burmistrz Miasta Chełmna ogłasza III PRZETARG USTNY NIEOGRANICZONY polegający na oddaniu ' +
    'w dzierżawę na okres do 10 lat lokal użytkowy nr 3. Cena wywoławcza za dzierżawę wynosi brutto 800,00 zł miesięcznie.</p>]]>',
};

const LAND_ACTIVE = {
  adres: 'dz. 185/22 - ul. Przemysłowa; dz. 372 - przy drodze krajowej nr 91 i ul. Szosa Grudziądzka',
  rodzaj: 'Nieruchomość niezabudowana',
  cena: '1 000 000,00 zł brutto; 1 500 000,00 zł brutto',
  data: '10                .09                .2026  godz. 08:00',
  rozstrzygniecie: '',
  przetargNa: 'I przetargi ustne nieograniczone na sprzedaż nieruchomości gminnych',
  tresc:
    '<![CDATA[<p>Burmistrz Miasta Chełmna ogłasza I przetargi ustne nieograniczone na sprzedaż ' +
    'nieruchomości gruntowych niezabudowanych, oznaczonych jako działka nr 185/22 o pow. 0,1500 ha ' +
    'oraz działka nr 372.</p>]]>',
};

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, spaced-thousands, grosze tail', () => {
  assert.equal(parsePLN('29.000,00'), 29000);
  assert.equal(parsePLN('70.000'), 70000);
  assert.equal(parsePLN('170.000'), 170000);
  assert.equal(parsePLN('1 000 000,00'), 1000000);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: Roman "ogłasza VIII przetarg" beats history "Pierwszy przetarg"', () => {
  assert.equal(roundFromText(buildRecordText(TORUNSKA_SOLD)), 8);
  assert.equal(roundFromText(buildRecordText(WODNA_UNSOLD)), 1);
  assert.equal(roundFromText(buildRecordText(POWSTANCOW_SOLD)), 4);
  assert.equal(roundFromText(buildRecordText(LAND_ACTIVE)), 1);
});

test('auctionDateFromText: prefers the structured data-przetargu field', () => {
  assert.equal(auctionDateFromText(buildRecordText(TORUNSKA_SOLD)), '2024-08-06');
  assert.equal(auctionDateFromText(buildRecordText(WODNA_UNSOLD)), '2026-01-08');
});

test('startingPriceFromText / achievedPriceFromText', () => {
  assert.equal(startingPriceFromText(buildRecordText(TORUNSKA_SOLD)), 29000);
  assert.equal(achievedPriceFromText(buildRecordText(TORUNSKA_SOLD)), 29290);
  assert.equal(achievedPriceFromText(buildRecordText(POWSTANCOW_SOLD)), 170000);
  // Unsold: buyer not named ⇒ no achieved price
  assert.equal(achievedPriceFromText(buildRecordText(WODNA_UNSOLD)), null);
});

test('unitAreaFromText: usable area, not the room breakdown', () => {
  assert.equal(unitAreaFromText(buildRecordText(TORUNSKA_SOLD)), 27.67);
  assert.equal(unitAreaFromText(buildRecordText(WODNA_UNSOLD)), 25.89);
});

test('gates: hasResolution, isLease, isNegativeOutcome', () => {
  assert.equal(hasResolution(buildRecordText(TORUNSKA_SOLD)), true);
  assert.equal(hasResolution(buildRecordText(LAND_ACTIVE)), false);
  assert.equal(isLease(buildRecordText(HALLERA_LEASE)), true);
  assert.equal(isLease(buildRecordText(TORUNSKA_SOLD)), false);
  assert.equal(isNegativeOutcome(buildRecordText(WODNA_UNSOLD)), true);
  assert.equal(isNegativeOutcome(buildRecordText(TORUNSKA_SOLD)), false);
});

// ------------------------------------------------------------- result records

test('parseResultDoc: Toruńska 8/7 SOLD (round VIII)', () => {
  const [r] = parseResultDoc(buildRecordText(TORUNSKA_SOLD), '2024-08-06', 'https://bip.chelmno.pl/przetarg-nieruchomosci/10338/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'torunska|8|7');
  assert.equal(r.address.street, 'Toruńska');
  assert.equal(r.address.building, '8');
  assert.equal(r.address.apt, '7');
  assert.equal(r.area_m2, 27.67);
  assert.equal(r.starting_price_pln, 29000);
  assert.equal(r.final_price_pln, 29290);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 8);
  assert.equal(r.auction_date, '2024-08-06');
});

test('parseResultDoc: Wodna 34/9 UNSOLD (round I)', () => {
  const [r] = parseResultDoc(buildRecordText(WODNA_UNSOLD), '2026-01-08', 'https://bip.chelmno.pl/x');
  assert.equal(r.address.key, 'wodna|34|9');
  assert.equal(r.area_m2, 25.89);
  assert.equal(r.starting_price_pln, 70000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-01-08');
});

test('parseResultDoc: Powstańców Wlkp 2/7 SOLD (spaced-slash addr, no-grosze price)', () => {
  const [r] = parseResultDoc(buildRecordText(POWSTANCOW_SOLD), '2022-06-01', 'https://bip.chelmno.pl/x');
  assert.equal(r.address.key, 'powstancow wielkopolskich|2|7');
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.final_price_pln, 170000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 4);
});

test('parseResultDoc: returns [] for a pending (empty-resolution) record', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(LAND_ACTIVE), null, 'x'), []);
});

// ----------------------------------------------------------- active + land

test('parseAnnouncement: pending flat (empty resolution) → active listing', () => {
  const pending = { ...WODNA_UNSOLD, rozstrzygniecie: '' };
  const rec = parseAnnouncement(buildRecordText(pending));
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'wodna|34|9');
  assert.equal(rec.area_m2, 25.89);
  assert.equal(rec.starting_price_pln, 70000);
  assert.equal(rec.auction_date, '2026-01-08');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: land (niezabudowana) → kind grunt with parcels', () => {
  const rec = parseAnnouncement(buildRecordText(LAND_ACTIVE));
  assert.equal(rec.kind, 'grunt');
  assert.ok(rec.dzialka_nr.includes('185/22'), `dzialka_nr=${rec.dzialka_nr}`);
  assert.equal(rec.starting_price_pln, 1000000);
  assert.equal(rec.round, 1);
});

// ----------------------------------------------------------- board XML

test('parseBoardPage: extracts record ids + urls from board XML', () => {
  const xml = `
    <artykul><url>https://bip.chelmno.pl/przetarg-nieruchomosci/11290/ul-wodna-34-w-chelmnie</url></artykul>
    <artykul><url>https://bip.chelmno.pl/przetarg-nieruchomosci/10338/chelmno-ul-torunska-8-7</url></artykul>
    <artykul><url>https://bip.chelmno.pl/przetarg-nieruchomosci/11290/dup</url></artykul>`;
  const refs = parseBoardPage(xml);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].id, '11290');
  assert.equal(refs[1].id, '10338');
});
