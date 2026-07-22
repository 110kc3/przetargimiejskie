// Dzierżoniów parser tests. Every fixture is the REAL `pdftotext -layout`
// output of a document fetched live 2026-07-21 from bip.um.dzierzoniow.pl's
// JSON HTTP API + its attachment PDFs (see crawl.js), embedded verbatim so the
// parser is groundtruthed against production data. Node's built-in test runner.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseNum,
  stripGivenName,
  extractFlatAddressRaw,
  isFlat,
  titleAuctionDate,
  announcementTableRow,
  announcementTermin,
  announcementRound,
  parseAnnouncement,
  splitResultItems,
  parseResultDoc,
} from '../src/cities/dzierzoniow/parse.js';

// ---- real fixtures ---------------------------------------------------------

// ANNOUNCEMENT — "Ogłoszenie nr 32/PN/2026", Krasickiego 47/17, round IV
// (3 prior rounds listed), termin 9.09.2026, cena wywoławcza 115 000 zł.
const ANN_KRASICKIEGO = ` Ogłoszenie nr 32/PN/2026

  Burmistrz Dzierżoniowa ogłasza przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego nr 17 o pow. użytkowej 31,74 m2, położonego na IV
piętrze (poddasze) budynku przy ul. I. Krasickiego 47 w Dzierżoniowie, wraz
ze sprzedażą ułamkowej części działki gruntu nr 646 o pow. 255 m2, obręb
Centrum, KW nr SW1D/00011044/2.
                                      Wartość       Cena
     Pow.     Wartość      Udział                                    Wadium
                                      udziału w     wywoławcza
Nr   lokalu   lokalu
                                      gruncie       nieruchomości
     [m2]     [zł]         [%]                                       [zł]
                                      [zł]          [zł]

17   31,74    112 879,00   3,96       2 121,00      115 000,00       11 500,00
 Termin przetargu - 9.09.2026 r., godz. 10:30

 Miejsce przetargu - sala nr 14 Urzędu Miasta Dzierżoniowa (I piętro)

  Wadium - 11 500,00 zł - należy wpłacić na konto Urzędu Miejskiego Rynek
1,   nr  konta    50 9527 0007 0046 7773 2000 0005,     Bank   Spółdzielczy
w Dzierżoniowie, do dnia 4.09.2026 r. Za datę wniesienia wadium uważa się
datę wpływu środków pieniężnych na rachunek Urzędu Miasta w Dzierżoniowie.

   Przed przetargiem należy zapoznać się ze stanem technicznym budynku
i lokalu, a także z wysokością opłat związanych z eksploatacją oraz planami
remontowymi wspólnoty mieszkaniowej.

  Lokal można oglądać po uprzednim kontakcie tel. pod numerem 74 6464607
(Dzierżoniowski Zarząd Budynków Mieszkalnych Sp. z o. o.).

  W    miejscowym      planie   zagospodarowania       przestrzennego     miasta
nieruchomość położona jest na terenie oznaczonym symbolem U 12 - teren
zabudowy     mieszkaniowo-usługowej.      Budynek     przy    ul.  I.Krasickiego
47 znajduje się w wykazie zabytków miasta Dzierżoniowa.              Poprzednie
przetargi odbyły się 26.11.2025 r., 18.02.2026 r., 20.05.2026 r.

  W 6-tygodniowym terminie wyznaczonym w wykazie nieruchomości
przeznaczonej do sprzedaży, nie wpłynęły żadne wnioski osób, którym
przysługuje pierwszeństwo w nabyciu na podstawie art. 34 ust.1 pkt 1 i pkt 2
ustawy o gospodarce nieruchomościami.

  Oferent może zapoznać się z regulaminem przetargu w Biurze Obsługi Klienta
lub na stronie internetowej Urzędu Miasta Dzierżoniowa.

  Należność za nieruchomość uzyskaną w drodze przetargu należy uiścić na
konto Urzędu Miasta nr 34 9527 0007 0046 7773 2000 0002 Bank Spółdzielczy
\fw Dzierżoniowie w ciągu 30 dni od dnia rozstrzygnięcia przetargu, przed
podpisaniem aktu notarialnego.

  Dowód wniesienia wadium oraz dokument potwierdzający możliwość
występowania oferenta w przetargu podlega przedłożeniu komisji przetargowej
przez uczestnika przetargu, przed otwarciem przetargu.

  W przypadku uchylenia się oferenta, który wygrał przetarg od zawarcia
umowy notarialnej w terminie do 30 dni od daty przetargu, wadium przepada
na rzecz Gminy Miejskiej Dzierżoniów.

  Opłaty notarialne i sądowe nabycia w/w nieruchomości ponosi w całości
kupujący.

 Dodatkowe informacje na temat przetargu można uzyskać w Wydziale
Gospodarki Nieruchomościami Urzędu Miasta w Dzierżoniowie, pokój 35, tel.
74 6450870 oraz w Biuletynie Informacji Publicznej (bip.um.dzierzoniow.pl).

  Zastrzega się możliwość   odwołania   przetargu   w przypadku   zaistnienia
uzasadnionych przyczyn.

 Dariusz Kucharski

 Burmistrz Dzierżoniowa

 Dzierżoniów, 29 czerwca 2026
\f`;
// The flat article's own TITLE (from menu 1838) — full given name, matches the
// result PDFs' spelling.
const ANN_KRASICKIEGO_TITLE =
  'Lokal mieszkalny nr 17 w budynku przy ul. Ignacego Krasickiego 47 w Dzierżoniowie.';

// RESULT day 2025-11-26 — 3 flats (Kopernika 27/2 SOLD, Krasickiego 47/17
// UNSOLD, Mostowa 8/5 UNSOLD) + 1 land plot (skipped).
const RES_2025_11_26 = `                                                                 Dzierżoniów, 4 grudnia 2025


                       Informacja o rozstrzygnięciu przetargów

              Informujemy, że w dniu 26.11.2025 r. w siedzibie Urzędu Miasta Dzierżoniowa,
Rynek 1, odbyły się ustne przetargi na sprzedaż niżej wymienionych nieruchomości:

   1. Lokalu mieszkalnego nr 2 o pow. 55,73 m2, położonego na parterze budynku przy ul.
      Mikołaja Kopernika 27 w Dzierżoniowie, wraz ze sprzedażą udziału w działce gruntu
      oznaczonej nr 688/2 o pow. 1146 m2, obręb Centrum, kw SW1D/00018435/9. Cena
      wywoławcza nieruchomości 149 000,00 zł, w tym wartość udziału w działce gruntu
      29 930,00 zł. Dopuszczono do uczestnictwa w przetargu 1 oferenta. Uzyskana cena ze
      sprzedaży nieruchomości netto: 149 480,00 zł, w tym wartość udziału w działce gruntu:
      30 225,00 zł, nabywca Irena Gierczak i Piotr Gierczak (po 1/2).
   2. Lokalu mieszkalnego nr 17 o pow. 31,74 m2, położonego na IV piętrze (poddaszu)
      budynku przy ul. Ignacego Krasickiego 47 w Dzierżoniowie, wraz ze sprzedażą udziału
      w działce gruntu oznaczonej nr 646 o pow. 255 m2, obręb Centrum, kw
      SW1D/00011044/2. Cena wywoławcza nieruchomości 125 000,00 zł, w tym wartość
      udziału w działce gruntu 2 121,00 zł. Przetarg zakończył się wynikiem negatywnym
      z uwagi na brak oferentów.
   3. Lokalu mieszkalnego nr 5 o pow. 30,83 m2, położonego na II piętrze (poddaszu)
      budynku przy ul. Mostowej 8 w Dzierżoniowie, wraz ze sprzedażą udziału w działce
      gruntu oznaczonej nr 614/6 o pow. 159 m2, obręb Centrum, kw SW1D/00015750/2.
      Cena wywoławcza nieruchomości 62 000,00 zł, w tym wartość udziału w działce gruntu
      3 386,00 zł. Przetarg zakończył się wynikiem negatywnym z uwagi na brak oferentów.
   4. Działki nr 1395 obręb Dolny o powierzchni 2004 m², kw SW1D/00016234/6,
      nieruchomości niezabudowanej, położonej przy ul. Dolnośląskiej/Sowiogórskiej. Cena
      wywoławcza 250 000,00 zł (netto). Przetarg zakończył się wynikiem negatywnym
      z uwagi na brak oferentów.
\f`;

// RESULT day 2025-11-19 — 4 flats (Nowowiejska 6/7 SOLD, Nowowiejska 164/2
// UNSOLD, Pocztowa 11a/1 SOLD, Spacerowa 15/2 UNSOLD).
const RES_2025_11_19 = `                                                               Dzierżoniów, 27 listopada 2025


                       Informacja o rozstrzygnięciu przetargów

              Informujemy, że w dniu 19.11.2025 r. w siedzibie Urzędu Miasta Dzierżoniowa,
Rynek 1, odbyły się ustne przetargi na sprzedaż niżej wymienionych nieruchomości:

   1. Lokalu mieszkalnego nr 7 o pow. użytkowej 20,37 m2, położonego na II piętrze (poddaszu)
      budynku przy ul. Nowowiejskiej 6 w Dzierżoniowie, wraz ze sprzedażą ułamkowej części
      działki gruntu nr 318/27 o pow. 119 m2, obręb Centrum, kw SW1D/00018597/2. Cena
      wywoławcza nieruchomości netto 79 000,00 zł, w tym wartość udziału w działce gruntu
      2 666,00 zł. Dopuszczono do uczestnictwa w przetargu 1 oferenta. Uzyskana cena ze
      sprzedaży nieruchomości netto: 79 790,00 zł, w tym wartość udziału w działce gruntu:
      2 689,00 zł, nabywca Krzysztof Kowalewski.
   2. Lokalu mieszkalnego nr 2 o pow. użytkowej 32,70 m2, położonego na parterze budynku
      przy ul. Nowowiejskiej 164 w Dzierżoniowie, wraz ze sprzedażą ułamkowej części działki
      gruntu nr 531/13 o pow. 831 m2, obręb Dolny, kw SW1D/00047689/6. Cena wywoławcza
      nieruchomości netto 59 000,00 zł, w tym wartość udziału w działce gruntu 21 576,00 zł.
      Przetarg zakończył się wynikiem negatywnym z uwagi na brak oferentów.
   3. Lokalu mieszkalnego nr 1 o pow. 47,01 m2, położonego na parterze budynku przy ul.
      Pocztowej 11a w Dzierżoniowie, wraz ze sprzedażą udziału w działce gruntu oznaczonej nr
      352/32 o pow. 87 m2, obręb Centrum, kw SW1D/00029738/3. Cena wywoławcza
      nieruchomości 89 000,00 zł, w tym wartość udziału w działce gruntu 4 532,00 zł.
      Dopuszczono do uczestnictwa w przetargu 1 oferenta. Uzyskana cena ze sprzedaży
      nieruchomości netto: 89 890,00 zł, w tym wartość udziału w działce gruntu: 4 575,00 zł,
      nabywca Mariola Bilska.
   4. Lokalu mieszkalnego nr 2 o pow. 37,86 m2, położonego na parterze budynku przy ul.
      Spacerowej 15 w Dzierżoniowie, wraz ze sprzedażą udziału w działce gruntu oznaczonej nr
      260/30 o pow. 176 m2, obręb Centrum, kw SW1D/00018585/5. Cena wywoławcza
      nieruchomości 115 000,00 zł, w tym wartość udziału w działce gruntu 9 306,00 zł. Przetarg
      zakończył się wynikiem negatywnym z uwagi na brak oferentów.
\f`;

// RESULT day 2025-05-14 — item 1 is a lokal UŻYTKOWY (must be skipped) + 5
// flats. Exercises: the "nieruchomości : " space-colon sold phrasing
// (Ząbkowicka 60a/3), the "M. Kopernika" / "J. Kilińskiego" abbreviated given
// names (must key to the same surname as the full-name docs), and the "łączna
// powierzchnia lokalu 31,09 m2" combined-area rule (Garncarska 11/5).
const RES_2025_05_14 = `                                                                   Dzierżoniów, 22 maja 2025


                       Informacja o rozstrzygnięciu przetargów

             Informujemy, że w dniu 14.05.2025 r. w siedzibie Urzędu Miasta Dzierżoniowa,
Rynek 1 odbyły się ustne przetargi na sprzedaż niżej wymienionych nieruchomości:

   1. Lokalu użytkowego nr 5 o pow. użytkowej 1882,00 m2, położonego na II piętrze
      budynku przy ul. Świdnickiej 38 w Dzierżoniowie, wraz ze sprzedażą ułamkowej części
      działki gruntu nr 55/2 o pow. 2830 m2, obręb Centrum, kw 26673/8. Dodatkowo
      sprzedaży podlegały udziały procentowe w sąsiednich 9 działkach. Cena wywoławcza
      nieruchomości netto 1 850 000,00 zł. Przetarg zakończył się wynikiem negatywnym
      z uwagi na brak oferentów.
   2. Lokalu mieszkalnego nr 3 o pow. użytkowej 24,72 m2, położonego na parterze
      budynku przy ul. Ząbkowickiej 60a w Dzierżoniowie, wraz ze sprzedażą ułamkowej
      części działki gruntu nr 19/6 o pow. 1291 m2, obręb Przedmieście, KW nr
      SW1D/00019961/2. Cena wywoławcza nieruchomości netto 69 000,00 zł, w tym
      wartość udziału w działce gruntu 16 305,00 zł. Dopuszczono do uczestniczenia w
      przetargu 1 oferenta. Uzyskana cena ze sprzedaży nieruchomości : 69 690,00 zł, w tym
      wartość udziału w działce gruntu: 16 468,00 zł, nabywca Iga Pociecha.
   3. Lokalu mieszkalnego nr 2 o pow. użytkowej 55,73 m2, położonego na parterze
      budynku przy ul. M. Kopernika 27 w Dzierżoniowie, wraz ze sprzedażą ułamkowej
      części działki gruntu nr 688/2 o pow. 1146 m2, obręb Centrum, KW nr
      SW1D/00018435/9. Cena wywoławcza nieruchomości 179 000,00 zł, w tym wartość
      udziału w działce gruntu 29 930,00 zł. Przetarg zakończył się wynikiem negatywnym z
      uwagi na brak oferentów.
   4. Lokalu mieszkalnego nr 5 o pow. użytkowej 30,83 m2, położonego na II piętrze
      (poddasze) budynku przy ul. Mostowej 8 w Dzierżoniowie, wraz ze sprzedażą
      ułamkowej części działki gruntu nr 614/6 o pow. 159 m2, obręb Centrum, KW nr
      SW1D/00015750/2. Cena wywoławcza nieruchomości 85 000,00 zł, w tym wartość
      udziału w działce gruntu 3 386,00 zł. Przetarg zakończył się wynikiem negatywnym z
      uwagi na brak oferentów.
   5. Lokalu mieszkalnego nr 3a o pow. użytkowej 16,87 m2, położonego na I piętrze
      budynku przy ul. J. Kilińskiego 8 w Dzierżoniowie, wraz ze sprzedażą ułamkowej części
      działki gruntu nr 636/15 o pow. 368 m2 oraz części działki nr 636/49 o pow. 54 m2 ,
      obręb Centrum, KW nr SW1D/00028255/6. Cena wywoławcza nieruchomości netto
      55 000,00 zł, w tym wartość udziału w działce gruntu 2 128,00 zł. Przetarg zakończył się
      wynikiem negatywnym z uwagi na brak oferentów.
   6. Lokalu mieszkalnego nr 5 o pow. użytkowej 24,23 m2 wraz z pomieszczeniem
      gospodarczym przynależnym do lokalu o pow. 6,86 m2, łączna powierzchnia lokalu
      31,09 m2, położonego na II piętrze (poddasze) budynku przy ul. Garncarskiej 11
      w Dzierżoniowie, wraz ze sprzedażą ułamkowej części działki gruntu nr
      159/1 o pow.205 m2, obręb Centrum, KW SW1D/00018360/1. Cena wywoławcza
       nieruchomości netto 69 000,00 zł, w tym wartość udziału w działce gruntu 4 303,00 zł.
       Przetarg zakończył się wynikiem negatywnym z uwagi na brak oferentów.
\f`;

// ---- primitives ------------------------------------------------------------

test('parsePLN strips spaced thousands + grosze tail', () => {
  assert.equal(parsePLN('149 480,00'), 149480);
  assert.equal(parsePLN('115 000,00'), 115000);
  assert.equal(parsePLN('62 000,00'), 62000);
  assert.equal(parsePLN(null), null);
});

test('parseNum handles comma decimal + spaces', () => {
  assert.equal(parseNum('31,74'), 31.74);
  assert.equal(parseNum('1 146'), 1146);
});

test('stripGivenName folds initials and curated full given names', () => {
  assert.equal(stripGivenName('M. Kopernika'), 'Kopernika');
  assert.equal(stripGivenName('Mikołaja Kopernika'), 'Kopernika');
  assert.equal(stripGivenName('J. Kilińskiego'), 'Kilińskiego');
  assert.equal(stripGivenName('Ignacego Krasickiego'), 'Krasickiego');
  assert.equal(stripGivenName('Mostowej'), 'Mostowej'); // single word untouched
});

test('titleAuctionDate parses the Polish-month result title', () => {
  assert.equal(titleAuctionDate('Wyniki przetargów z dnia 26 listopada 2025'), '2025-11-26');
  assert.equal(titleAuctionDate('Wynik przetargu z dnia 17 grudnia 2025'), '2025-12-17');
  assert.equal(titleAuctionDate('brak daty'), null);
});

test('extractFlatAddressRaw normalises across name-spelling variants', () => {
  assert.equal(
    extractFlatAddressRaw('Lokalu mieszkalnego nr 2 o pow. 55,73 m2, położonego przy ul. Mikołaja Kopernika 27 w Dzierżoniowie'),
    'Kopernika 27/2',
  );
  assert.equal(
    extractFlatAddressRaw('Lokalu mieszkalnego nr 3a o pow. 16,87 m2, budynku przy ul. J. Kilińskiego 8 w Dzierżoniowie'),
    'Kilińskiego 8/3a',
  );
});

// ---- announcement ----------------------------------------------------------

test('announcement table row: area + cena wywoławcza + wadium', () => {
  assert.deepEqual(announcementTableRow(ANN_KRASICKIEGO), {
    area_m2: 31.74, starting_price_pln: 115000, wadium: 11500,
  });
});

test('announcement termin + round', () => {
  assert.equal(announcementTermin(ANN_KRASICKIEGO), '2026-09-09');
  assert.equal(announcementRound(ANN_KRASICKIEGO), 4); // 3 prior rounds + 1
});

test('parseAnnouncement builds a full active-listing record', () => {
  const r = parseAnnouncement(ANN_KRASICKIEGO, ANN_KRASICKIEGO_TITLE, 'https://bip.um.dzierzoniow.pl/a,29322,x.html');
  assert.equal(r.address.key, 'krasickiego|47|17');
  assert.equal(r.area_m2, 31.74);
  assert.equal(r.starting_price_pln, 115000);
  assert.equal(r.auction_date, '2026-09-09');
  assert.equal(r.round, 4);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.detail_url, 'https://bip.um.dzierzoniow.pl/a,29322,x.html');
});

// ---- results ---------------------------------------------------------------

test('result 2025-11-26: 3 flats parsed, land skipped', () => {
  const recs = parseResultDoc(RES_2025_11_26, '2025-11-26', 'PDF');
  assert.equal(recs.length, 3);
  const by = Object.fromEntries(recs.map((r) => [r.address.key, r]));

  const kop = by['kopernika|27|2'];
  assert.equal(kop.outcome, 'sold');
  assert.equal(kop.starting_price_pln, 149000);
  assert.equal(kop.final_price_pln, 149480);
  assert.equal(kop.area_m2, 55.73);
  assert.equal(kop.auction_date, '2025-11-26');

  assert.equal(by['krasickiego|47|17'].outcome, 'unsold');
  assert.equal(by['krasickiego|47|17'].starting_price_pln, 125000);
  assert.equal(by['krasickiego|47|17'].final_price_pln, null);

  assert.equal(by['mostowej|8|5'].outcome, 'unsold');
});

test('result 2025-11-19: two sold, two unsold', () => {
  const recs = parseResultDoc(RES_2025_11_19, '2025-11-19', 'PDF');
  assert.equal(recs.length, 4);
  const by = Object.fromEntries(recs.map((r) => [r.address.key, r]));
  assert.equal(by['nowowiejskiej|6|7'].outcome, 'sold');
  assert.equal(by['nowowiejskiej|6|7'].final_price_pln, 79790);
  assert.equal(by['pocztowej|11A|1'].outcome, 'sold');
  assert.equal(by['pocztowej|11A|1'].final_price_pln, 89890);
  assert.equal(by['nowowiejskiej|164|2'].outcome, 'unsold');
  assert.equal(by['spacerowej|15|2'].outcome, 'unsold');
});

test('result 2025-05-14: lokal użytkowy skipped, 5 flats + edge cases', () => {
  assert.equal(splitResultItems(RES_2025_05_14).length, 6); // 6 numbered items total
  const recs = parseResultDoc(RES_2025_05_14, '2025-05-14', 'PDF');
  assert.equal(recs.length, 5); // item 1 (użytkowy) dropped
  const by = Object.fromEntries(recs.map((r) => [r.address.key, r]));

  // space-colon sold phrasing "Uzyskana cena ze sprzedaży nieruchomości : …"
  const zab = by['zabkowickiej|60A|3'];
  assert.equal(zab.outcome, 'sold');
  assert.equal(zab.final_price_pln, 69690);

  // "M. Kopernika" keys to the same surname as the full-name docs
  assert.ok(by['kopernika|27|2']);
  assert.equal(by['kopernika|27|2'].outcome, 'unsold');

  // "łączna powierzchnia lokalu 31,09 m2" wins over the room area 24,23
  assert.equal(by['garncarskiej|11|5'].area_m2, 31.09);

  // no lokal użytkowy leaked in
  assert.ok(!recs.some((r) => /świdnick/i.test(r.address_raw)));
});

test('isFlat gate distinguishes flats from land/commercial', () => {
  assert.equal(isFlat('Lokalu mieszkalnego nr 2 o pow. 55,73 m2'), true);
  assert.equal(isFlat('Działki nr 1395 obręb Dolny'), false);
  assert.equal(isFlat('Lokalu użytkowego nr 5 o pow. użytkowej 1882,00 m2'), false);
});
