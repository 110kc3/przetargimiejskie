// Jelenia Góra parser tests. Fixtures are condensed-but-faithful copies of the
// REAL `pdftotext -layout` output of live attachments (verified 2026-07-18):
//   download/51538  flat ANNOUNCEMENT single-lot (82/2026, ul. Długa 14/2,
//     IV przetarg, 195.000,00 zł, future date 03.09.2026);
//   download/51354  flat ANNOUNCEMENT multi-lot, 3 flats (69/2026, Juszczaka
//     4/6, Jana Sobieskiego 21/6, Łabska 6/3, CZWARTE/4th round);
//   download/51539  land ANNOUNCEMENT single-lot (83/2026, ul. Gabrieli
//     Zapolskiej, dz. 116/4, III przetarg, 490.000,00 zł);
//   download/51528  RESULT sold (62/2026, lokal użytkowy nr U1, ul. 1 Maja
//     46 of, V przetarg, wywoławcza 36.050 -> osiągnięta 36.420 zł);
//   download/51496  RESULT unsold (48/2026, dz. 116/4, drugi przetarg,
//     wywoławcza 490.000 zł, wynikiem negatywnym).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  romanToInt,
  roundFromText,
  parsePLN,
  isResultNotice,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  negativeOutcomeStated,
  obrebFromText,
  plotFromText,
  landStreetFromText,
  unitAreaFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/jelenia-gora/parse.js';

// ---------------------------------------------------------------- unit helpers

test('romanToInt: III, IV, V', () => {
  assert.equal(romanToInt('III'), 3);
  assert.equal(romanToInt('IV'), 4);
  assert.equal(romanToInt('V'), 5);
  assert.equal(romanToInt('bad'), null);
});

test('roundFromText: Roman numeral header, first valid token wins over a preceding non-ordinal word', () => {
  assert.equal(
    roundFromText('PREZYDENT MIASTA JELENIEJ GÓRY OGŁASZA\nIV PRZETARG USTNY NIEOGRANICZONY'),
    4,
  );
  assert.equal(
    roundFromText('OGŁASZA PRZETARG USTNY NIEOGRANICZONY\n\nIII PRZETARG USTNY NIEOGRANICZONY'),
    3,
  );
});

test('roundFromText: plural word-ordinal header (multi-lot) and lower-case word-ordinal in result prose', () => {
  assert.equal(roundFromText('CZWARTE PRZETARGI USTNE NIEOGRANICZONE'), 4);
  assert.equal(roundFromText('odbył się drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('odbył się V przetarg ustny nieograniczony'), 5);
});

test('parsePLN: dot thousands, comma grosze', () => {
  assert.equal(parsePLN('195.000,00'), 195000);
  assert.equal(parsePLN('68.000,00'), 68000);
  assert.equal(parsePLN('36.420,00'), 36420);
  assert.equal(parsePLN('490.000,00'), 490000);
});

test('isResultNotice: result header vs announcement', () => {
  assert.equal(isResultNotice('INFORMACJA O WYNIKU PRZETARGU\nNa podstawie …'), true);
  assert.equal(isResultNotice('OGŁOSZENIE NR 82/2026\nPREZYDENT MIASTA …'), false);
});

test('auctionDateFromText: future auction date, "w dniu" and bare "dnia" forms', () => {
  assert.equal(
    auctionDateFromText('który odbędzie się w dniu 03 września 2026 roku o godz. 1000'),
    '2026-09-03',
  );
  assert.equal(
    auctionDateFromText('które odbędą się w dniu 13 sierpnia 2026 roku o godz. 1000'),
    '2026-08-13',
  );
  assert.equal(
    auctionDateFromText('odbędzie się dnia 7 października 2026 roku o godz. 1000'),
    '2026-10-07',
  );
});

test('resultDateFromText: "informuję, że" clause, not the announcement-date citation', () => {
  assert.equal(
    resultDateFromText('informuję, że w dniu 7 lipca 2026 roku w siedzibie … zgodnie z ogłoszeniem nr 62/2026 z dnia 22 maja 2026 r.'),
    '2026-07-07',
  );
  assert.equal(
    resultDateFromText('informuję, że dnia 2 lipca 2026 roku o godz. 1000 … zgodnie z ogłoszeniem nr 48/2026 z dnia 21 kwietnia 2026 r.'),
    '2026-07-02',
  );
});

test('price extractors', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości: 195.000,00 zł, w tym:'), 195000);
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości netto: 490.000,00 zł'), 490000);
  assert.equal(startingPriceFromText('Cena wywoławcza: 36.050,00 zł'), 36050);
  assert.equal(
    achievedPriceFromText('Najwyższa cena osiągnięta w przetargu: 36.420,00 zł'),
    36420,
  );
  assert.equal(achievedPriceFromText('Przetarg zakończony został wynikiem negatywnym.'), null);
});

test('negativeOutcomeStated', () => {
  assert.equal(negativeOutcomeStated('Przetarg zakończony został wynikiem negatywnym.'), true);
  assert.equal(negativeOutcomeStated('OSOBA USTALONA JAKO NABYWCA NIERUCHOMOŚCI: brak.'), true);
  assert.equal(negativeOutcomeStated('OSOBA USTALONA JAKO NABYWCA NIERUCHOMOŚCI:\n\nTomasz Jefimik'), false);
});

test('land field helpers', () => {
  const plot = plotFromText('stanowiąca niezabudowaną działkę gruntu numer 116/4 o powierzchni 0,2095 ha, obręb 0013');
  assert.equal(plot.dzialka_nr, '116/4');
  assert.equal(plot.area_m2, 2095);
  assert.equal(
    landStreetFromText('Nieruchomość położona przy ul. Gabrieli Zapolskiej stanowiąca niezabudowaną działkę'),
    'Gabrieli Zapolskiej',
  );
  assert.equal(
    obrebFromText('o powierzchni 0,2095 ha, obręb 0013, Sobieszów II, dla której Sąd Rejonowy …'),
    '0013, Sobieszów II',
  );
});

test('unitAreaFromText: "ogólnej powierzchni" anchor, not a użytkowej sub-area or cellar', () => {
  assert.equal(
    unitAreaFromText('Lokal mieszkalny nr 6 o ogólnej powierzchni wynoszącej 37,42 m2 składający się z pokoju z aneksem kuchennym i pomieszczenia gospodarczego o łącznej powierzchni użytkowej wynoszącej 31,94 m2 oraz pomieszczenia przynależnego: piwnicy o powierzchni wynoszącej 5,48 m2.'),
    37.42,
  );
});

// ---------------------------------------------------------------------- fixtures

const FLAT_ANNOUNCEMENT_SINGLE = `
                            OGŁOSZENIE NR 82/2026
                PREZYDENT MIASTA JELENIEJ GÓRY OGŁASZA
                  IV PRZETARG USTNY NIEOGRANICZONY
                na sprzedaż lokalu położonego w Jeleniej Górze wraz
             ze sprzedażą związanego z tym lokalem udziału w gruncie,
            który odbędzie się w dniu 03 września 2026 roku o godz. 1000
                       w siedzibie Urzędu Miasta Jelenia Góra
                      przy ul. Sudeckiej nr 29 – I piętro, sala nr 13.

Plac Niepodległości 5; Długa 14; Bankowa 36 of
Lokal mieszkalny nr 2 w budynku Długa 14 o ogólnej powierzchni wynoszącej 39,60 m2 składający się
z pokoju i kuchni. WC na klatce schodowej w częściach wspólnych. Lokal położony jest na I piętrze
budynku (II kondygnacja nadziemna).

Cena wywoławcza nieruchomości: 195.000,00 zł, w tym:
cena lokalu mieszkalnego: 180.531,00 zł
cena udziału w gruncie: 14.469,00 zł

WADIUM: 19.500,00 zł

Poprzednie przetargi ustne nieograniczone na sprzedaż ww. nieruchomości przeprowadzone zostały w dniach:
I- 26.02.2026 r.; II - 30.04.2026 r.; III – 02.07.2026 r.

Jelenia Góra, dnia 14 lipca 2026 roku
                                                                                   PREZYDENT MIASTA
`;

const FLAT_ANNOUNCEMENT_MULTI = `
                            OGŁOSZENIE NR 69/2026
                PREZYDENT MIASTA JELENIEJ GÓRY OGŁASZA
               CZWARTE PRZETARGI USTNE NIEOGRANICZONE
         na sprzedaż lokali mieszkalnych położonych w Jeleniej Górze wraz
            ze sprzedażą związanych z tymi lokalami udziałów w gruncie,
             które odbędą się w dniu 13 sierpnia 2026 roku o godz. 1000
                      w siedzibie Urzędu Miasta Jelenia Góra
                     przy ul. Sudeckiej nr 29 – I piętro, sala nr 13.

1) ul. Juszczaka 4
Lokal mieszkalny nr 6 o ogólnej powierzchni wynoszącej 41,20 m2, składający się z 2 pokoi i kuchni.

Cena wywoławcza nieruchomości: 68.000,00 zł, w tym:
cena lokalu mieszkalnego: 57.120,00 zł
cena udziału w gruncie: 10.880,00 zł

WADIUM: 6.800,00 zł

2) ul. Jana Sobieskiego 21
Lokal mieszkalny nr 6 o ogólnej powierzchni wynoszącej 37,42 m2 składający się z pokoju z aneksem
kuchennym i pomieszczenia gospodarczego o łącznej powierzchni użytkowej wynoszącej 31,94 m2
oraz pomieszczenia przynależnego: piwnicy o powierzchni wynoszącej 5,48 m2.

Cena wywoławcza nieruchomości: 70.000,00 zł, w tym:
cena lokalu mieszkalnego: 64.890,00 zł
cena udziału w gruncie: 5.110,00 zł

WADIUM: 7.000,00 zł

3) ul. Łabska 6
Lokal mieszkalny nr 3 o ogólnej powierzchni wynoszącej 48,50 m2, składający się z pokoju, kuchni
i wc o łącznej powierzchni użytkowej 37,10 m2.

Cena wywoławcza nieruchomości: 67.950,00 zł, w tym:
cena lokalu mieszkalnego: 52.321,50 zł
cena udziału w gruncie: 15.628,50 zł

WADIUM: 6.900,00 zł

Poprzednie przetargi ustne nieograniczone na sprzedaż lokali opisanych Ad.1-Ad.3 przeprowadzone zostały
w następujących terminach: I - 30.01.2026 r.; II – 01.04.2026 r., III – 10.06.2026 r.

Jelenia Góra, dnia 17 czerwca 2026 roku
`;

const LAND_ANNOUNCEMENT = `
                                OGŁOSZENIE NR 83/2026
                        PREZYDENT MIASTA JELENIEJ GÓRY
                 OGŁASZA PRZETARG USTNY NIEOGRANICZONY
            na sprzedaż nieruchomości gruntowej niezabudowanej położonej
w Jeleniej Górze, który odbędzie się dnia 7 października 2026 roku o godz. 1000
  w siedzibie Urzędu Miasta Jelenia Góra przy ul. Sudeckiej nr 29 – I piętro, sala nr 13.

                                           III PRZETARG USTNY NIEOGRANICZONY

Nieruchomość położona przy ul. Gabrieli Zapolskiej stanowiąca niezabudowaną działkę gruntu numer
116/4 o powierzchni 0,2095 ha, obręb 0013, Sobieszów II, dla której Sąd Rejonowy w Jeleniej Górze
VI Wydział Ksiąg Wieczystych prowadzi księgę wieczystą numer JG1J/00077712/2.

       Cena wywoławcza nieruchomości netto: 490.000,00 zł
       Wadium: 49.000,00 zł
`;

const RESULT_SOLD_COMMERCIAL = `
                            INFORMACJA O WYNIKU PRZETARGU

Na podstawie §12 rozporządzenia Rady Ministrów z dnia 14 września 2004 roku w sprawie
sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(Dz. U. z 2021 r. poz. 2213) informuję, że w dniu 7 lipca 2026 roku w siedzibie Urzędu Miasta Jelenia
Góra przy ul. Sudeckiej 29 o godz. 10:00 – zgodnie z ogłoszeniem Prezydenta Miasta Jeleniej Góry
nr 62/2026 z dnia 22 maja 2026 r. - odbył się V przetarg ustny nieograniczony na sprzedaż lokalu
położonego w Jeleniej Górze wraz ze sprzedażą udziału w gruncie związanego z tym lokalem.

                               PRZEDMIOTEM PRZETARGU BYŁ:

Lokal użytkowy nr U1 w budynku przy ul. 1 Maja 46 of o ogólnej powierzchni wynoszącej
33,81 m2, składający się z sali i w.c.

                              DO UCZESTNICTWA W PRZETARGU:
                         dopuszczono: 1 osobę; niedopuszczonych: 0 osób.

       CENA WYWOŁAWCZA NIERUCHOMOŚCI LOKALOWEJ ORAZ NAJWYŻSZA CENA
                         OSIĄGNIĘTA W PRZETARGU:
                                   Cena wywoławcza: 36.050,00 zł
                       Najwyższa cena osiągnięta w przetargu: 36.420,00 zł

                    OSOBA USTALONA JAKO NABYWCA NIERUCHOMOŚCI:

                                           Tomasz Jefimik
`;

const RESULT_UNSOLD_LAND = `
                                     INFORMACJA O WYNIKU PRZETARGU

Na podstawie §12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu
przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213)
informuję, że dnia 2 lipca 2026 roku o godz. 1000 w siedzibie Urzędu Miasta Jelenia Góra przy
ul. Sudeckiej nr 29 – zgodnie z ogłoszeniem nr 48/2026 Prezydenta Miasta Jeleniej Góry z dnia
21 kwietnia 2026 r., które podane zostało do publicznej wiadomości – odbył się drugi przetarg ustny
nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej, stanowiącej własność Gminy
Jelenia Góra.

                       PRZEDMIOTEM PRZETARGU BYŁA SPRZEDAŻ NIERUCHOMOŚCI
                                          POŁOŻONEJ :

w Jeleniej Górze przy ul. Gabrieli Zapolskiej oznaczonej geodezyjnie jako działka gruntu numer 116/4
o powierzchni 0,2095 ha, obręb 0013, Sobieszów II, dla której Sąd Rejonowy w Jeleniej Górze VI Wydział
Ksiąg Wieczystych prowadzi księgę wieczystą nr JG1J/00077712/2.

                                           DO UCZESTNICTWA W PRZETARGU:
                                              - dopuszczonych zostało – 0 osób,
                                                 - niedopuszczonych – 0 osób

           CENA WYWOŁAWCZA NIERUCHOMOŚCI NIEZABUDOWANEJ ORAZ NAJWYŻSZA
                           CENA OSIĄGNIĘTA W PRZETARGU:

Cena wywoławcza nieruchomości netto: 490.000,00 zł
Przetarg zakończony został wynikiem negatywnym.

OSOBA USTALONA JAKO NABYWCA NIERUCHOMOŚCI: brak.
`;

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: single-lot flat — address key, area, price, round, future date', () => {
  const [rec] = parseAnnouncement(FLAT_ANNOUNCEMENT_SINGLE);
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'dluga|14|2'); // NOT the header's Plac Niepodległości / Bankowa refs
  assert.equal(rec.area_m2, 39.6);
  assert.equal(rec.starting_price_pln, 195000);
  assert.equal(rec.round, 4);
  assert.equal(rec.auction_date, '2026-09-03');
});

test('parseAnnouncement: multi-lot batch — one record per flat, shared round + date', () => {
  const recs = parseAnnouncement(FLAT_ANNOUNCEMENT_MULTI);
  assert.equal(recs.length, 3);

  assert.equal(recs[0].address.key, 'juszczaka|4|6');
  assert.equal(recs[0].area_m2, 41.2);
  assert.equal(recs[0].starting_price_pln, 68000);

  assert.equal(recs[1].address.key, 'jana sobieskiego|21|6');
  assert.equal(recs[1].area_m2, 37.42); // NOT the 31,94 użytkowej sub-area or 5,48 cellar
  assert.equal(recs[1].starting_price_pln, 70000);

  assert.equal(recs[2].address.key, 'labska|6|3');
  assert.equal(recs[2].area_m2, 48.5);
  assert.equal(recs[2].starting_price_pln, 67950);

  for (const rec of recs) {
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.round, 4);
    assert.equal(rec.auction_date, '2026-08-13');
  }
});

test('parseAnnouncement: land — parcel, area, obręb, price, future date, round', () => {
  const [rec] = parseAnnouncement(LAND_ANNOUNCEMENT);
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '116/4');
  assert.equal(rec.obreb, '0013, Sobieszów II');
  assert.equal(rec.area_m2, 2095); // 0,2095 ha
  assert.equal(rec.address_raw, 'ul. Gabrieli Zapolskiej');
  assert.equal(rec.starting_price_pln, 490000);
  assert.equal(rec.auction_date, '2026-10-07');
  assert.equal(rec.round, 3);
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: sold commercial unit — "U1" unit rewritten digit-first, achieved price', () => {
  const [rec] = parseResultDoc(RESULT_SOLD_COMMERCIAL, null, 'https://bip.jeleniagora.pl/attachments/download/51528');
  assert.ok(rec);
  assert.equal(rec.kind, 'uzytkowy');
  assert.equal(rec.address.key, '1 maja|46|1U'); // "of" (oficyna) stripped, "U1" -> "1U"
  assert.equal(rec.area_m2, 33.81);
  assert.equal(rec.round, 5);
  assert.equal(rec.starting_price_pln, 36050);
  assert.equal(rec.final_price_pln, 36420);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2026-07-07');
});

test('parseResultDoc: unsold land — parcel key, round, no achieved price, explicit negative outcome', () => {
  const [rec] = parseResultDoc(RESULT_UNSOLD_LAND, null, 'https://bip.jeleniagora.pl/attachments/download/51496');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '116/4');
  assert.equal(rec.area_m2, 2095);
  assert.equal(rec.round, 2);
  assert.equal(rec.starting_price_pln, 490000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.auction_date, '2026-07-02');
});
