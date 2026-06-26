// Kędzierzyn-Koźle parser tests. Fixtures are condensed-but-faithful copies of
// the REAL extracted text of live attachments (verified 2026-06-26):
//   download/74494 land ANNOUNCEMENT (dz. 854/44, III przetarg, 150.000,00 zł);
//   download/78414 land RESULT negative (dz. 1756/5,9,10, XIV przetarg, 80.000,00 zł);
//   download/73247 land RESULT sold (dz. 450/7, I, wywoławcza 60.000 → osiągnięta 60.600);
//   download/74897 flat RESULT unsold (ul. Grunwaldzka 51 nr 1, I, 170.000,00 zł, brak wadium).
// Same Logonet CMS as Tarnowskie Góry; the office "ul. Piastowskiej 17" appears
// in every doc and must never be taken as the property street.

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
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/kedzierzyn-kozle/parse.js';

// ---------------------------------------------------------------- unit helpers

test('romanToInt: I, III, XIV', () => {
  assert.equal(romanToInt('I'), 1);
  assert.equal(romanToInt('III'), 3);
  assert.equal(romanToInt('XIV'), 14);
  assert.equal(romanToInt('VIII'), 8);
  assert.equal(romanToInt('bad'), null);
});

test('roundFromText: Roman ordinal qualifying "przetarg ustny", first wins', () => {
  assert.equal(roundFromText('ogłasza:\nIII przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('przeprowadzono XIV przetarg ustny nieograniczony'), 14);
  // a conjunction "i" must NOT be read as Roman 1:
  assert.equal(roundFromText('przedmiot i datę przetargu zgodnie z ogłoszeniem'), null);
});

test('parsePLN: dot AND space thousands, comma grosze', () => {
  assert.equal(parsePLN('150.000,00'), 150000);
  assert.equal(parsePLN('80.000,00'), 80000);
  assert.equal(parsePLN('60 600,00'), 60600);
  assert.equal(parsePLN('170.000,00'), 170000);
});

test('isResultNotice: result header vs announcement', () => {
  assert.equal(isResultNotice('Informacja o wyniku przetargu\nPrezydent Miasta …'), true);
  assert.equal(isResultNotice('OGŁOSZENIE\nPrezydent Miasta … ogłasza: III przetarg'), false);
});

test('date extractors anchor correctly', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w dniu 22 stycznia 2026 r. w Wydziale'),
    '2026-01-22',
  );
  // prior-round recap ("odbył się") must NOT be picked as the auction date:
  assert.equal(auctionDateFromText('W dniu 2 października 2025 r. odbył się I przetarg'), null);
  assert.equal(
    resultDateFromText('iż dnia 17 czerwca 2026 r. w Wydziale Gospodarki Nieruchomościami'),
    '2026-06-17',
  );
});

test('price extractors', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości wynosiła 80.000,00 zł (netto).'), 80000);
  assert.equal(
    achievedPriceFromText('cena osiągnięta w przetargu wyniosła 60.600,00 zł (netto).'),
    60600,
  );
});

// ---------------------------------------------------------------------- fixtures

const LAND_ANNOUNCEMENT = `str. 1/3
GNP-SM.6840.21.2024
Kędzierzyn-Koźle, 02.12.2025 r.
OGŁOSZENIE
Prezydent Miasta Kędzierzyn-Koźle działając zgodnie z § 3 ust. 1 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) o g ł a s z a:
III przetarg ustny nieograniczony
na sprzedaż nieruchomości stanowiącej własność Gminy Kędzierzyn-Koźle
Przetarg odbędzie się w dniu 22 stycznia 2026 r. w Wydziale Gospodarki Nieruchomościami i Planowania Przestrzennego Urzędu Miasta Kędzierzyn-Koźle, przy ul. Piastowskiej 17, w pokoju nr 10.
1. Przedmiotem przetargu jest niżej wymieniona nieruchomość:
Kędzierzyn-Koźle obręb Kędzierzyn ul. Niezapominajek działka nr 854/44 o powierzchni 0,1120 ha, użytek: Ls V – lasy klasy V Kw nr OP1K/00058617/0 Nieruchomość niezabudowana, nieuzbrojona Cena wywoławcza nieruchomości (bez podatku VAT) 150.000,00 zł * własność 1000
3. W dniu 2 października 2025 r. odbył się I przetarg ustny nieograniczony na sprzedaż ww. nieruchomości i zakończył się wynikiem negatywnym.
4. W dniu 26 listopada 2025 r. odbył się II przetarg ustny nieograniczony na sprzedaż ww. nieruchomości i zakończył się wynikiem negatywnym.
PREZYDENT MIASTA
Sabina Nowosielska`;

const LAND_RESULT_NEGATIVE = `Kędzierzyn-Koźle, 25.06.2026 r.
Informacja o wyniku przetargu
Prezydent Miasta Kędzierzyn-Koźle działając zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) podaje do publicznej wiadomości iż dnia 17 czerwca 2026 r. w Wydziale Gospodarki Nieruchomościami i Planowania Przestrzennego Urzędu Miasta Kędzierzyn-Koźle przy ul. Piastowskiej 17 w pokoju nr 10 przeprowadzono XIV przetarg ustny nieograniczony, wyznaczony na godz. 8:00, na sprzedaż nieruchomości gruntowej niezabudowanej, oznaczonej jako działki nr 1756/5, 1756/9 i 1756/10 o łącznej powierzchni 0,0745 ha, położonej w Kędzierzynie-Koźlu obręb Kędzierzyn przy ul. Grunwaldzkiej, księga wieczysta KW nr OP1K/00065972/8.
Cena wywoławcza nieruchomości wynosiła 80.000,00 zł (netto).
Na przetarg dotyczący wyżej opisanej nieruchomości nie odnotowano wpłat wadiów i nikt nie przystąpił do przetargu.
Przetarg zakończony został wynikiem negatywnym.`;

const LAND_RESULT_SOLD = `Kędzierzyn-Koźle, 09.10.2025 r.
Informacja o wyniku przetargu
Prezydent Miasta Kędzierzyn-Koźle działając zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) podaje do publicznej wiadomości iż dnia 1 października 2025 r. w Wydziale Gospodarki Nieruchomościami i Planowania Przestrzennego Urzędu Miasta Kędzierzyn-Koźle przy ul. Piastowskiej 17 w pokoju nr 10 przeprowadzono I przetarg ustny nieograniczony, wyznaczony na godz. 8:00, na sprzedaż nieruchomości gruntowej niezabudowanej, oznaczonej jako działka nr 450/7 o powierzchni 0,0494 ha, położonej w Kędzierzynie-Koźlu obręb Sławięcice w rejonie ul. Roberta Kocha, księga wieczysta KW nr OP1K/00031737/2.
Do przetargu dopuszczono dwóch oferentów, którzy wpłacili wadium w wymaganym terminie.
Cena wywoławcza nieruchomości wynosiła 60.000,00 zł (netto), natomiast cena osiągnięta w przetargu wyniosła 60.600,00 zł (netto).
Nabywcą nieruchomości zostali Państwo Teresa Foltys-Błach i Łukasz Błach.`;

const FLAT_RESULT_UNSOLD = `Kędzierzyn-Koźle, 18.12.2025 r.
Informacja o wyniku przetargu
Prezydent Miasta Kędzierzyn-Koźle działając zgodnie z § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) podaje do publicznej wiadomości iż dnia 10 grudnia 2025 r. w Wydziale Gospodarki Nieruchomościami i Planowania Przestrzennego Urzędu Miasta Kędzierzyn-Koźle, przy ul. Piastowskiej 17 w pokoju nr 10 przeprowadzono I przetarg ustny nieograniczony wyznaczony na godz. 8:00 na sprzedaż lokalu mieszkalnego nr 1 w budynku położonym w Kędzierzynie-Koźlu przy ul. Grunwaldzkiej 51 składający się z jednego pokoju, przedpokoju oraz kuchni o powierzchni użytkowej 45,00 m2, położony na I piętrze, piwnicy nr P/3 o powierzchni 16,70 m2 oraz pomieszczenia przynależnego – wc o powierzchni 1,21 m2 wraz z udziałem we wspólnych częściach budynku w 1473/10000 cz. i sprzedażą części gruntu oznaczonego w ewidencji gruntów jako działka numer 1491/2 w obrębie Kędzierzyn, o pow. 0,0480 ha, księga wieczysta OP1K/00013444/9.
Cena wywoławcza lokalu wraz ze sprzedażą przynależnego gruntu wynosiła 170.000,00 zł.
Na wyżej opisaną nieruchomość nie zostało wpłacone wadium, w związku z czym do przetargu nie przystąpiła żadna osoba prawna lub fizyczna.`;

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: land — parcel, area, obręb, price, future date, round', () => {
  const rec = parseAnnouncement(LAND_ANNOUNCEMENT);
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '854/44');
  assert.equal(rec.obreb, 'Kędzierzyn');
  assert.equal(rec.area_m2, 1120); // 0,1120 ha
  assert.equal(rec.address_raw, 'ul. Niezapominajek'); // NOT the office ul. Piastowskiej
  assert.equal(rec.starting_price_pln, 150000);
  assert.equal(rec.auction_date, '2026-01-22'); // future date, not the prior-round recap
  assert.equal(rec.round, 3);
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: land negative — parcels list, round XIV, unsold', () => {
  const [rec] = parseResultDoc(LAND_RESULT_NEGATIVE, null, 'https://bip.kedzierzynkozle.pl/attachments/download/78414');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1756/5, 1756/9, 1756/10');
  assert.equal(rec.area_m2, 745); // 0,0745 ha
  assert.equal(rec.obreb, 'Kędzierzyn');
  assert.equal(rec.address_raw, 'ul. Grunwaldzkiej');
  assert.equal(rec.round, 14);
  assert.equal(rec.starting_price_pln, 80000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.auction_date, '2026-06-17');
});

test('parseResultDoc: land sold — achieved price + buyer', () => {
  const [rec] = parseResultDoc(LAND_RESULT_SOLD, null, 'x');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '450/7');
  assert.equal(rec.obreb, 'Sławięcice');
  assert.equal(rec.round, 1);
  assert.equal(rec.starting_price_pln, 60000);
  assert.equal(rec.final_price_pln, 60600);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2025-10-01');
});

test('parseResultDoc: flat unsold — address key, usable area, round, no wadium', () => {
  const [rec] = parseResultDoc(FLAT_RESULT_UNSOLD, null, 'x');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'grunwaldzkiej|51|1');
  assert.equal(rec.area_m2, 45); // usable 45,00 m2 (NOT the 16,70 cellar)
  assert.equal(rec.round, 1);
  assert.equal(rec.starting_price_pln, 170000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.auction_date, '2025-12-10');
});
