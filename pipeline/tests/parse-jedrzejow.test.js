// Jędrzejów parser tests.
// Fixtures are faithful captures of real BIP documents from bip.jedrzejow.eu
// (IDcom.pl platform; scanned PDF attachments OCR-processed via tesseract).
//
// Groundtruth:
//   wiadomosc 869500 (2026-02-19 result):
//     - Land 160/1 obr. 01: SOLD for 190,000 PLN (start 110,000 PLN, Andrzej Majewski)
//     - Land 160/2 obr. 01: SOLD for 115,000 PLN (start 111,000 PLN, Danuta Majewska)
//     - Land 998 obr. Gozna: SOLD for 9,100 PLN (start 9,000 PLN, Dariusz Mróz)
//     - Flat 11 Listopada 132/40: UNSOLD (start 112,000 PLN)
//     - Flat 11 Listopada 80/12: UNSOLD (start 146,000 PLN)
//     - Land 51/1 obr. 05: UNSOLD (start 72,450 PLN)
//     - Flat 11 Listopada 119/10: UNSOLD (start 145,000 PLN)
//   wiadomosc 830188 (2025-06-26 result):
//     - Flat Głowackiego 31/3: SOLD for 51,000 PLN (start 50,000 PLN, KLE-RENT Sp. z o.o.)
//     - Flat 11 Listopada 119/10: UNSOLD (start 145,000 PLN)
//     - Land 150/11, 211/3, 212/9: UNSOLD (start 257,000 PLN)
//     - Land 51/1: UNSOLD (start 72,450 PLN)
//   wiadomosc 846564 (2025-10-16 result):
//     - Land 150/11, 211/3, 212/9 obr. 11: SOLD for 371,000 PLN (start 257,000 PLN, Świadkowie Jehowy w Polsce)
//     - Land 51/1 obr. 05: UNSOLD (start 72,450 PLN)
//     - Flat 11 Listopada 119/10: UNSOLD (start 145,000 PLN)
//   wiadomosc 902794 (2026-09-03 result):
//     - Flat Mieszka I 4/12: UNSOLD (start 299,900 PLN)
//   wiadomosc 893577 (2026-07-02 result, vertical layout):
//     - Land 197 obr. 11: UNSOLD (start 682,600 PLN)
//     - Flat 11 Listopada 132/40: UNSOLD (start 112,000 PLN)
//     - Flat 11 Listopada 80/12: UNSOLD (start 146,000 PLN)
//     - Flat 11 Listopada 119/10: UNSOLD (start 145,000 PLN)
//   wiadomosc 902069 (2026-10-15 multi-round announcement):
//     - Round I: Land parcels 584, 585 (782 m², 151,600 PLN), 14/7 (570 m², 30,000 PLN), 51/1 (180 m², 77,900 PLN)
//     - Round III: Flat 11 Listopada 132/40 (21.28 m², 112,000 PLN), Flat 11 Listopada 80/12 (30.00 m², 146,000 PLN)
//     - Round V: Flat 11 Listopada 119/10 (26.60 m², 145,000 PLN)
//   wiadomosc 895633 (2026-09-03 announcement):
//     - Round I: Flat Mieszka I 4/12 (48.00 m², 299,900 PLN)
//   wiadomosc 883434 (wykaz):
//     - Flat Mieszka I 4/12 designation

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parsePLN,
  parseNum,
  parseAuctionDate,
  roundFromText,
  isResultDoc,
  isAnnouncement,
  isWykaz,
  isLease,
  parseResultDoc,
  parseAnnouncement,
  parseWykaz,
} from '../src/cities/jedrzejow/parse.js';

// ------------------------------------------------------------- Real Fixtures

const RESULT_869500 = {
  title: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych z dnia 19.02.2026 roku',
  body: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych,
przeprowadzonego w dniu 19 lutego 2026 r. w Urzędzie Miejskim w Jędrzejowie
| Oznaczenie | Liczba osób Liczba osób |
nieruchomości Księga wieczysta dopuszczonych niedopuszczonych Cena Cena najwyższa
w ewidencji gruntów do udziału w do udziału wywoławcza Nabywca nieruchomości
| przetargu w przetargu
| Obręb 01 miasta KI1J/00083575/1 2 0 110.000,00 zł 190.000,00 zł Andrzej Majewski
Jędrzejowa działka
| Nr 160/1 |
Obręb 01 miasta KI11/00083575/1 2 0 111.000,00 zł 115.000,00 zł Danuta Majewska
Jędrzejowa działka
Nr 160/2 =-|
Obręb Gozna działka KI1J/00054625/5 l 0 9.000,00 zł 9.100,00 zł Dariusz Mróz
Nr 998 i |
| Lokal mieszkałny Nr 40 0 0 112.000,00 zł - Przetarg zakończony
ul. 11 Listopada 132 wynikiem negatywnym
z uwagi na brak wniesionego
wadium:
Lokal mieszkalny Nr 12 0 0 146.000,00 zł - Przetarg zakończony
ul. 11 Listopada 80 wynikiem negatywnym
z uwagi na brak wniesionego
o 8 wadium
| Obręb 05 miasta KI1J/00078364/1 0 0 72.450,00 zł - Przetarg zakończony
Jędrzejowa działka Nr 51/1 wynikiem negatywnym
z uwagi na brak wniesionego
wadium
Lokal mieszkalny nr 10 ul. KI1J/0030181/6 0 0 145.000,00 zł - Przetarg zakończony
11 Listopada 119 | wynikiem negatywnym
z uwagi na brak wniesionego
| | wądium

Informację o wyniku przetargu wywiesza się na tablicy ogłoszeń Urzędu Miejskiego w Jędrzejowie w terminie
od dnia 02.03.2026 roku do dnia 09.03.2026 roku.
`,
};

const RESULT_830188 = {
  title: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych przeprowadzonego w dniu 26.06.2025 r',
  body: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych,
przeprowadzonego w dniu 26.06.2025 r. w Urzędzie Miejskim w Jędrzejowie.
Oznaczenie Liczba osób Liczba osób
nieruchomości Księga dopuszczonych | niedopuszczonych Cena Cena
w ewidencji gruntów wieczysta do udziału w do udziału wywoławcza najwyższa | Nabywca nieruchomości
przetargu w przetargu
Obręb 11 miasta KIJ/00082799/0 | 0 257.000,00 zł - Przetarg zakończony
Jędrzejowa działki wynikiem negatywnym
NrNr 150/11, 211/3, z uwagi na to, że oferent
| 2129. ; nie stawił się na przetargu.
| Obręb 05 miasta KI1J/00078364/1 0 0 72.450,00 zł - Przetarg zakończony
| Jędrzejowa działka Nr wynikiem negatywnym
| 51/1. ma z uwagi na brak wadium. |
Lokal mieszkalny Nr 10 | KI1J/00030181/6 | 0 145.000,00 zł - Przetarg zakończony — |
ul. 11 Listopada 119 wynikiem negatywnym
| 5 z uwagi na brak postąpień. |
Lokal mieszkalny Nr 3 KI1J/00049086/6 1 0 50.000,00 zł | 51.000,00zł | KLE-RENT Sp.zo.o. 20. |
ul. Głowackiego 31 -
Informację 0 wyniku przetargu wywiesza się na tablicy ogłoszeń Urzędu Miejskiego w Jędrzejowie w terminie
od dnia 07.07.2025 r. do dnia 14.07.2025 r.
`,
};

const RESULT_846564 = {
  title: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych przeprowadzonego w dniu 16.10.2025 roku',
  body: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych,
przeprowadzonego w dniu 16 października 2025 r. w Urzędzie Miejskim w Jędrzejowie
Oznaczenie | Liczba osób Liczba osób | |
nieruchomości Księga dopuszczonych | niedopuszczonych | Cena Cena
w ewidencji gruntów wieczysta | do udziału w do udziału wywoławcza najwyższa Nabywca nieruchomości
przetargu w przetargu
| Obręb 11 miasta KI1J/00052183/0 2 0 257.000,00 zł | 371.000,00 zł Swiadkowie Jehowy
Jędrzejowa działki KI1J/00082799/0 w Polsce
NrNr 150/11, 211/3,
212/9 | | |__
Obręb 05 miasta KI1J/00078364/1 | 0 0 72.450,00 zł - Przetarg zakończony
Jędrzejowa działka wynikiem negatywnym
Nr 51/1 z uwagi na brak wniesionego wadium
Lokal mieszkalny nr 10 KI1J/0030181/6 | 0 0 145.000,00 zł - Przetarg zakończony
ul. 11 Listopada 119 | wynikiem negatywnym
z uwagi na brak wniesionego wadium _

Informację o wyniku przetargu wywiesza się na tablicy ogłoszeń Urzędu Miejskiego w Jędrzejowie w terminie
od dnia 27.10.2025 roku do dnia 03.11.2025 roku.
`,
};

const RESULT_902794 = {
  title: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych przeprowadzonego w dniu 03.09.2026 roku',
  body: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości,
przeprowadzonego w dniu 3 września 2026 r. w Urzędzie Miejskim w Jędrzejowie
Oznaczenie Liczba osób Liczba osób
nieruchomości Księga wieczysta dopuszczonych niedopuszczonych Cena Cena najwyższa
w ewidencji gruntów do udziału w do udziału wywoławcza Nabywca nieruchomości
przetargu w przetargu
Lokal mieszkalny Nr 12 KI1J/00065944/7 0 0 299.900,00 zł - Przetarg zakończony
ul. Mieszka I 4 wynikiem negatywnym
z uwagi na brak oferentów.
Informację o wyniku przetargu wywiesza się mna tablicy ogłoszeń Urzędu Miejskiego w Jędrzejowie w terminie
od dnia 11.09.2026 roku do dnia 18.09.2026 roku.
`,
};

const RESULT_893577 = {
  title: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych przeprowadzonego w dniu 02.07.2026 roku',
  body: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości komunalnych,
przeprowadzonego w dniu 2 lipca 2026 r. w Urzędzie Miejskim w Jędrzejowie

Oznaczenie nieruchomości | wewidencji gruntów
Liczba osób dopuszczonych do udziału w przetargu
Księga wieczysta
Udział v2 w prawie własności działki Nr 197 obręb 11 miasta Jędrzejowa
KI1J/00018330/6 1
Lokal mieszkalny Nr 40 ul. 11 Listopada 132
Liczba osób niedopuszczonych do udziału w przetargu
Cena wywoławcza
Cena najwyższa Nabywca nieruchomości
0
Lokal mieszkałny Nr 12 ul. 11 Listopada 80
| Lokal mieszkalny nr 10 | ul. 11 Listopada 119
Informację 0 wyniku przetargu
682.600,00 zł
112.000,00 zł -
- Przetarg zakończony wynikiem negatywnym z uwagi na brak postąpień.
- Przetarg zakończony wynikiem negatywnym z uwagi na brak wniesionego wadium
146.000,00 zł
- Przetarg zakończony wynikiem negatywnym z uwagi na brak wniesionego wadium
145.000,00 zł
- Przetarg zakończony wynikiem negatywnym z uwagi na brak wniesionego wadium
wywiesza się na tablicy ogłoszeń
od dnia 13.07.2026 roku do dnia 20.07.2026 roku.
`,
};

const ANN_902069 = {
  title: 'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż nieruchomości komunalnych',
  body: `
OGŁOSZENIE
Burmistrz Miasta Jędrzejowa ogłasza przetarg ustny nieograniczony na sprzedaż następujących
nieruchomości, stanowiących własność Gminy Jędrzejów:

I przetarg
1. Nieruchomość komunalna oznaczona w rejestrach ewidencji gruntów obrębu 06 miasta
Jędrzejowa jako działki NrNr 584, 585 o powierzchni 0,0782 ha, dla których
tytuł własności stanowi księga wieczysta Nr KI1I/00083600/6.
Cena wywoławcza: 151.600.00 zł
Wadium: 30.320,00 zł

2. Nieruchomość komunalna oznaczona w rejestrach ewidencji gruntów obrębu 11 miasta
Jędrzejowa jako działka Nr 14/7 o powierzchni 0,0570 ha, dla której prowadzona
jest księga wieczysta Nr KI1J/00033427/4.
Cena wywoławcza: 30.000.00 zł
Wadium: 6.000,00 zł

3. Nieruchomość komunalna oznaczona w rejestrach ewidencji gruntów obrębu 05 miasta
Jędrzejowa jako działka Nr 51/1 o powierzchni 0,0180 ha.
Cena wywoławcza: 77.900.00 zł netto
Wadium: 15.580,00 zł

III przetarg
1. Lokal mieszkalny nr 40 ul. 11 Listopada 132 wraz z udziałem w wysokości
2128/147108 w części wspólnej budynku oraz udziałem 2128/147108 w prawie własności działki Nr 279 obręb 04 miasta Jędrzejowa.
Powierzchnia użytkowa lokalu wynosi 21,28 m”. Nabywca będzie miał możliwość korzystania z piwnicy o powierzchni 3,60 m”.
Cena wywoławcza: 112.000.00 zł
Wadium: 22.400,00 zł

2. Lokal mieszkalny nr 12 ul. 11 Listopada 80 wraz z udziałem w wysokości 3000/40200
w części wspólnej budynku oraz udziałem 3000/40200 w prawie własności działki Nr 334 obręb 04 miasta Jędrzejowa.
Powierzchnia użytkowa lokalu wynosi 30,00 m”. Nabywca będzie miał możliwość korzystania z piwnicy o powierzchni 5,67 m”.
Cena wywoławcza: 146.000.00 zł.
Wadium: 29.200,00 zł

V przetarg
1. Lokal mieszkalny nr 10 ul. 11 Listopada 119 wraz z udziałem w wysokości
2660/160400 w części wspólnej budynku oraz udział 2660/160400 w prawie własności działki Nr 4 obręb 04 miasta Jędrzejowa.
Powierzchnia użytkowa lokalu wynosi 26,60 m”. Nabywca będzie miał możliwość korzystania z piwnicy o powierzchni 3,20 m”.
Cena wywoławcza: 145.000.00 zł.
Wadium: 29.000,00 zł

Przetarg odbędzie się 15 października 2026 r. o godz. 9% w siedzibie Urzędu Miejskiego w Jędrzejowie przy ul. 11 Listopada 33a.
`,
};

const ANN_895633 = {
  title: 'Ogłoszenie o przetargu ustnym nieogranicznym na sprzedaż nieruchomości komunalnej',
  body: `
OGŁOSZENIE
Burmistrz Miasta Jędrzejowa ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości:
I przetarg
Lokal mieszkalny nr 12 ul. Mieszka I 4 wraz z udziałem w wysokości 4800/304500
w części wspólnej budynku oraz udziałem 4800/304500 w prawie własności działki Nr 177/15 obręb 04 miasta Jędrzejowa.
Powierzchnia użytkowa lokalu wynosi 48,00 m. Nabywca będzie miał możliwość korzystania z piwnicy.
Cena wywoławcza: 299.900.00 zł.
Wadium: 59.980,00 zł
Przetarg odbędzie się 3 września 2026 r. o godz. 9” w siedzibie Urzędu Miejskiego w Jędrzejowie.
`,
};

const WYKAZ_883434 = {
  title: 'Wykaz nieruchomości przeznaczonych do sprzedaży w trybie przetargowym - lokal mieszkalny nr 12 ul. Mieszka I 4',
  body: `
WYKAZ nieruchomości przeznaczonych do sprzedaży w trybie przetargowym
Załącznik do Zarządzenia nr 15/2026 Burmistrza Miasta Jędrzejowa z dnia 18.05.2026 r.
Udział 4/6 w prawie własności lokalu mieszkalnego Nr 12 ul. Mieszka I 4 wraz z udziałem w nieruchomości wspólnej.
Cena nieruchomości: 299.900,00 zł.
Wykaz wywiesza się na tablicy ogłoszeń Urzędu Miejskiego w Jędrzejowie.
`,
};

// ------------------------------------------------------------- Tests

test('jedrzejow: helpers - parsePLN', () => {
  assert.equal(parsePLN('112.000.00 zł'), 112000);
  assert.equal(parsePLN('146.000.00 zł.'), 146000);
  assert.equal(parsePLN('145.000,00 zł'), 145000);
  assert.equal(parsePLN('50 000,00 zł'), 50000);
  assert.equal(parsePLN('51.000,00zł'), 51000);
  assert.equal(parsePLN('9.100,00 zł'), 9100);
  assert.equal(parsePLN('72.450,00 zł'), 72450);
  assert.equal(parsePLN(''), null);
});

test('jedrzejow: helpers - parseNum', () => {
  assert.equal(parseNum('21,28'), 21.28);
  assert.equal(parseNum('48,00'), 48.0);
  assert.equal(parseNum('0,0782'), 0.0782);
  assert.equal(parseNum(null), null);
});

test('jedrzejow: helpers - roundFromText', () => {
  assert.equal(roundFromText('I przetarg'), 1);
  assert.equal(roundFromText('II przetarg ustny'), 2);
  assert.equal(roundFromText('III przetarg'), 3);
  assert.equal(roundFromText('IV przetarg'), 4);
  assert.equal(roundFromText('V przetarg'), 5);
  assert.equal(roundFromText('ogłoszenie bez numeru'), null);
});

test('jedrzejow: helpers - parseAuctionDate', () => {
  assert.equal(parseAuctionDate('przeprowadzonego w dniu 19 lutego 2026 r.'), '2026-02-19');
  assert.equal(parseAuctionDate('przeprowadzonego w dniu 26.06.2025 r.'), '2025-06-26');
  assert.equal(parseAuctionDate('Przetarg odbędzie się 15 października 2026 r.'), '2026-10-15');
  assert.equal(parseAuctionDate('Przetarg odbędzie się 26 czerwca', '2025-05-10'), '2025-06-26');
});

test('jedrzejow: gates route result vs announcement vs lease vs wykaz', () => {
  const resultBlob = buildRecordText(RESULT_869500);
  assert.equal(isResultDoc(resultBlob), true);
  assert.equal(isAnnouncement(resultBlob), false);

  const annBlob = buildRecordText(ANN_902069);
  assert.equal(isResultDoc(annBlob), false);
  assert.equal(isAnnouncement(annBlob), true);

  const wykazBlob = buildRecordText(WYKAZ_883434);
  assert.equal(isWykaz(wykazBlob), true);

  const leaseBlob = buildRecordText({
    title: 'Przetarg na wynajem stanowisk handlowych przy cmentarzach',
    body: 'wynajem stanowisk handlowych',
  });
  assert.equal(isLease(leaseBlob), true);
});

test('jedrzejow: parseResultDoc - 869500 (multi-item mixed sold & unsold)', () => {
  const blob = buildRecordText(RESULT_869500);
  const recs = parseResultDoc(blob, '2026-02-19', 'https://bip.jedrzejow.eu/wiadomosc/869500');

  assert.equal(recs.length, 7);

  // Sold land parcels
  const soldLand = recs.filter((r) => r.kind === 'grunt' && r.outcome === 'sold');
  assert.equal(soldLand.length, 3);
  assert.deepEqual(
    soldLand.map((r) => ({ dzialka: r.dzialka_nr, start: r.starting_price_pln, final: r.final_price_pln })),
    [
      { dzialka: '160/1', start: 110000, final: 190000 },
      { dzialka: '160/2', start: 111000, final: 115000 },
      { dzialka: '998 i', start: 9000, final: 9100 },
    ],
  );

  // Unsold flats
  const flats = recs.filter((r) => r.kind === 'mieszkalny');
  assert.equal(flats.length, 3);
  assert.deepEqual(
    flats.map((r) => ({ key: r.address.key, outcome: r.outcome, start: r.starting_price_pln, final: r.final_price_pln })),
    [
      { key: '11 listopada|132|40', outcome: 'unsold', start: 112000, final: null },
      { key: '11 listopada|80|12', outcome: 'unsold', start: 146000, final: null },
      { key: '11 listopada|119|10', outcome: 'unsold', start: 145000, final: null },
    ],
  );

  // Unsold land
  const unsoldLand = recs.filter((r) => r.kind === 'grunt' && r.outcome === 'unsold');
  assert.equal(unsoldLand.length, 1);
  assert.equal(unsoldLand[0].dzialka_nr, '51/1');
  assert.equal(unsoldLand[0].starting_price_pln, 72450);
});

test('jedrzejow: parseResultDoc - 830188 (sold flat with hammer price)', () => {
  const blob = buildRecordText(RESULT_830188);
  const recs = parseResultDoc(blob, '2025-06-26', 'https://bip.jedrzejow.eu/wiadomosc/830188');

  assert.equal(recs.length, 4);

  const soldFlat = recs.find((r) => r.kind === 'mieszkalny' && r.outcome === 'sold');
  assert.ok(soldFlat, 'sold flat should be found');
  assert.equal(soldFlat.address.key, 'glowackiego|31|3');
  assert.equal(soldFlat.starting_price_pln, 50000);
  assert.equal(soldFlat.final_price_pln, 51000);
  assert.equal(soldFlat.auction_date, '2025-06-26');

  const unsoldFlat = recs.find((r) => r.kind === 'mieszkalny' && r.outcome === 'unsold');
  assert.ok(unsoldFlat);
  assert.equal(unsoldFlat.address.key, '11 listopada|119|10');
  assert.equal(unsoldFlat.starting_price_pln, 145000);
  assert.equal(unsoldFlat.final_price_pln, null);
});

test('jedrzejow: parseResultDoc - 846564 (sold land to institutional buyer)', () => {
  const blob = buildRecordText(RESULT_846564);
  const recs = parseResultDoc(blob, '2025-10-16', 'https://bip.jedrzejow.eu/wiadomosc/846564');

  assert.equal(recs.length, 3);
  const soldLand = recs.find((r) => r.kind === 'grunt' && r.outcome === 'sold');
  assert.ok(soldLand);
  assert.equal(soldLand.starting_price_pln, 257000);
  assert.equal(soldLand.final_price_pln, 371000);
  assert.equal(soldLand.auction_date, '2025-10-16');

  const flat = recs.find((r) => r.kind === 'mieszkalny');
  assert.ok(flat);
  assert.equal(flat.address.key, '11 listopada|119|10');
  assert.equal(flat.outcome, 'unsold');
});

test('jedrzejow: parseResultDoc - 902794 (single flat notice)', () => {
  const blob = buildRecordText(RESULT_902794);
  const recs = parseResultDoc(blob, '2026-09-03', 'https://bip.jedrzejow.eu/wiadomosc/902794');

  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'mieszkalny');
  assert.equal(recs[0].address.key, 'mieszka i|4|12');
  assert.equal(recs[0].starting_price_pln, 299900);
  assert.equal(recs[0].final_price_pln, null);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].auction_date, '2026-09-03');
});

test('jedrzejow: parseResultDoc - 893577 (vertical column OCR layout)', () => {
  const blob = buildRecordText(RESULT_893577);
  const recs = parseResultDoc(blob, '2026-07-02', 'https://bip.jedrzejow.eu/wiadomosc/893577');

  assert.equal(recs.length, 4);

  const flats = recs.filter((r) => r.kind === 'mieszkalny');
  assert.equal(flats.length, 3);
  assert.deepEqual(
    flats.map((f) => ({ key: f.address.key, start: f.starting_price_pln, outcome: f.outcome })),
    [
      { key: '11 listopada|132|40', start: 112000, outcome: 'unsold' },
      { key: '11 listopada|80|12', start: 146000, outcome: 'unsold' },
      { key: '11 listopada|119|10', start: 145000, outcome: 'unsold' },
    ],
  );

  const land = recs.find((r) => r.kind === 'grunt');
  assert.ok(land);
  assert.equal(land.dzialka_nr, '197');
  assert.equal(land.obreb, '11');
  assert.equal(land.starting_price_pln, 682600);
});

test('jedrzejow: parseAnnouncement - 902069 (multi-round announcement with flats and land)', () => {
  const blob = buildRecordText(ANN_902069);
  const items = parseAnnouncement(blob, '2026-10-15', 'https://bip.jedrzejow.eu/wiadomosc/902069');

  assert.equal(items.length, 6);

  const flats = items.filter((i) => i.kind === 'mieszkalny');
  assert.equal(flats.length, 3);
  assert.deepEqual(
    flats.map((f) => ({ key: f.address.key, round: f.round, area: f.area_m2, price: f.starting_price_pln, date: f.auction_date })),
    [
      { key: '11 listopada|132|40', round: 3, area: 21.28, price: 112000, date: '2026-10-15' },
      { key: '11 listopada|80|12', round: 3, area: 30, price: 146000, date: '2026-10-15' },
      { key: '11 listopada|119|10', round: 5, area: 26.6, price: 145000, date: '2026-10-15' },
    ],
  );

  const land = items.filter((i) => i.kind === 'grunt');
  assert.equal(land.length, 3);
  assert.deepEqual(
    land.map((l) => ({ dzialka: l.dzialka_nr, obreb: l.obreb, round: l.round, area: l.area_m2, price: l.starting_price_pln })),
    [
      { dzialka: '584, 585', obreb: '06', round: 1, area: 782, price: 151600 },
      { dzialka: '14/7', obreb: '11', round: 1, area: 570, price: 30000 },
      { dzialka: '51/1', obreb: '05', round: 1, area: 180, price: 77900 },
    ],
  );
});

test('jedrzejow: parseAnnouncement - 895633 (single flat announcement)', () => {
  const blob = buildRecordText(ANN_895633);
  const items = parseAnnouncement(blob, '2026-09-03', 'https://bip.jedrzejow.eu/wiadomosc/895633');

  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'mieszkalny');
  assert.equal(items[0].address.key, 'mieszka i|4|12');
  assert.equal(items[0].round, 1);
  assert.equal(items[0].area_m2, 48);
  assert.equal(items[0].starting_price_pln, 299900);
  assert.equal(items[0].auction_date, '2026-09-03');
});

test('jedrzejow: parseWykaz - 883434 (pre-auction designation for flat)', () => {
  const blob = buildRecordText(WYKAZ_883434);
  const items = parseWykaz(blob, '2026-05-18', 'https://bip.jedrzejow.eu/wiadomosc/883434');

  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'mieszkalny');
  assert.equal(items[0].address.key, 'mieszka i|4|12');
  assert.equal(items[0].published_date, '2026-05-18');
});
