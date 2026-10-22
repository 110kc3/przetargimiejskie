// Kluczbork parser tests — groundtruthed on REAL municipal documents from bip.kluczbork.eu.
//
// Key fixtures:
// 1. ANNOUNCE_2026_BATCH (GNP.6840.24.2026.JK, plik 23707):
//    - Ligota Dolna działka nr 78/8 (kind: grunt)
//    - ul. Zamkowa 15/14 (kind: mieszkalny, 139.03 m², 187 400 zł, date: 2026-09-29, round: 1)
//    - ul. Skłodowskiej-Curie 3/3 (kind: mieszkalny, 137.20 m², 235 000 zł, date: 2026-09-29, round: 1)
// 2. RESULT_2026_BATCH (GNP.6840.24.2026.JK, plik 23873):
//    - Same 3 items concluded UNSOLD (wynikiem negatywnym) on 2026-09-29
// 3. RESULT_2024_DRZYMALY (GNP.6840.34.2024.JK, plik 20707):
//    - ul. Drzymały 8/1 (kind: mieszkalny, 34.85 m², 25 000 zł -> 35 000 zł, SOLD to Meinhart Company Sp.zo.o.)
//    - Kuniów dz. 492/454 (kind: grunt, SOLD 190 650 zł -> 193 000 zł to Firma Usługowo-Handlowa „Prędkiewicz”)
//    - Kuniów dz. 441 (kind: grunt, SOLD 89 790 zł -> 91 000 zł)
//    - Kluczbork dz. 2445 & Ks. Skargi dz. 358/2 (kind: grunt, UNSOLD)
// 4. ANNOUNCE_2023_SYBIRAKOW (GNP.6840.24.2023.JK, plik 18931):
//    - ul. Sybiraków 1/6 (kind: mieszkalny, 186.67 m², 216 400 zł, date: 2023-11-30, round: 1)
//    - ul. Zamkowa 15/14 (kind: mieszkalny, 139.03 m², 184 500 zł [ocr xl], date: 2023-11-30, round: 1)
//    - Ks. Skargi dz. 358/2 (kind: grunt, 1401 m², 253 000 zł, date: 2023-11-30, round: 3)
// 5. RESULT_2023_DAMROTA (GNP.6840.13.2023.JK, plik 18647):
//    - ul. Damrota 15/1 (działka 179/1, kind: mieszkalny, 73 013 zł -> 78 500 zł, SOLD to Sabina Trocha, round: 4, date: 2023-07-28)
//    - dz. 359/2 (kind: grunt, 251 000 zł -> 253 600 zł, SOLD to Sławomir Błaszków, round: 2)
//    - dz. 358/2 (kind: grunt, 253 000 zł, UNSOLD, round: 2)
// 6. RESULT_2022_BYCZYNSKA_ZAMKOWA (GNP.6840.2.2022.JK, plik 15332):
//    - Plots 314-318 (all sold to AVIBUD / WEKA)
//    - ul. Byczyńska 25 (68 010 zł -> 80 000 zł, SOLD to Gerhard Pilarski, round: 1, date: 2022-02-16)
//    - ul. Zamkowa 15/14 (179 568 zł, UNSOLD, round: 2, date: 2022-02-16)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as parse from '../src/cities/kluczbork/parse.js';

const {
  buildRecordText,
  parseResultDoc,
  parseAnnouncement,
  isResultDoc,
  isSaleAuction,
  isLease,
  isCancellation,
  auctionDateFromText,
  roundFromText,
  startingPriceFromText,
  achievedPriceFromText,
  buyerName,
  unitAreaFromText,
  landPlotFromText,
  flatAddressRaw,
} = parse;

// --------------------------------------------------------------------- Fixtures

const FIXTURE_ANNOUNCE_2026 = `BURMISTRZ MIASTA KLUCZBORKA
województwo opolskie Kluczbork, dnia 27 sierpnia 2026 r.
Nr GNP.6840.24.2026.JK
OGŁOSZENIE
o przetargu ustnym nieograniczonym na sprzedaż nieruchomości
Burmistrz Miasta Kluczborka podaje do publicznej wiadomości, że ogłasza przetarg ustny
nieograniczony na sprzedaż nieruchomości wchodzących w skład gminnego zasobu nieruchomości:

I przetarg ustny nieograniczony

l. Lieota Dolna -działka nr 78/8 o pow. 0,3126 ha, KW OPlU/00041192/l(wolna od obciążeń)
Cena wywoławcza nieruchomości brutto: 389 612,34 zł.
wadium: 38 970,00 zt.

2. Miasto Kluczbork, ul. Zamkowa 15 - działka nr 196/3 o pow. 0,0574 ha w udziale 742/10000,
lokal mieszkalny nr 14 o pow. 139,03 m2, złożony z 3 pokoi, kuchni, spiżarki, korytarza, łazienki z WC.
Cena wywoławcza - 187 400,00 zł. brutto
wadium - 18 740,00 zł.

3. IVIiasto Kluczbork, ul. Skłodowskiej-Curie 3 - działka nr 251/18 o pow. 0,0670 ha w udziale 1448/10000,
lokal mieszkalny nr 3 o pow. 137,20 m2, złożony z 6 pokoi, kuchni, przedpokoju, łazienki z WC.
Cena wywoławcza nieruchomości brutto - 235.000,00 zł
wadium - 23 500,00 zł.

Przetarg odbędzie się w dniu 29 września 2026 r. o godz. 10 w siedzibie Urzędu Miejskiego w Kluczborku, sala nr 138.
W przetargu mogą wziąć udział osoby fizyczne i prawne, jeżeli wniosą wadium do 23.09.2026 r.`;

const FIXTURE_RESULT_2026 = `BURMISTRZ MIASTA KLUCZBORKA
województwo opolskie Kluczbork, dnia 7 października 2026 r.
Nr GNP.6840.24.2026.JK
Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004r.
Burmistrz Miasta Kluczborka podaje do publicznej wiadomości:

Informację o wyniku przetargu na sprzedaż nieruchomości stanowiących własność
Gminy Kluczbork, który odbył się w dniu 29.09.2026r. w siedzibie Urzędu Miejskiego

I przetarg ustny nieograniczony

l. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Ligota Dolna -działka nr 78/8 o pow. 0.3126 ha, KW OP1U/00041192/1
Wadium, ilość wpłat - 0
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza 389 612,34 zt.
- najwyższa cena osiągnięta w przetargu - nie dotyczy
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- przetarg zakończony wynikiem negatywnym, nikt nie przystąpił do przetargu

2. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork, ul. Zamkowa 15. działka nr 196/3 o pow. 0,0574 ha w udziale 742/10000, lokal mieszkalny nr 14
Wadium, ilość wpłat - 0
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza 187 400,00 zł.
- najwyższa cena osiągnięta w przetargu - nie dotyczy
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- przetarg zakończony wynikiem negatywnym, nikt nie przystąpił do przetargu

3. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork, ul. Skłodowskiej-Curie 3 - działka nr 251/18 o pow. 0,0670 ha w udziale 1448/10000, lokal mieszkalny nr 3
Wadium, ilość wpłat - 0
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza 235.000,00 zł.
- najwyższa cena osiągnięta w przetargu - nie dotyczy
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- przetarg zakończony wynikiem negatywnym, nikt nie przystąpił do przetargu`;

const FIXTURE_RESULT_2024 = `Kluczbork, dnia 28 października 2024r.
Nr GNP.6840.34.2024.JK
Na podstawie § 12 Rozporządzenia Rady Ministrów Burmistrz Miasta Kluczborka podaje do publicznej wiadomości:
Informację o wyniku przetargu na sprzedaż nieruchomości stanowiących własność Gminy Kluczbork,
który odbył się w dniu 18.10.2024r. w siedzibie Urzędu Miejskiego w Kluczborku

I przetarg ustny nieograniczony

1. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork, ul. Drzymały 8/1 – działka nr 135/4 o pow. 0,0259 ha w udziale 689/10000, KW OP1U/00031180/1, lokal mieszkalny nr 1 o pow. 34,85 m2, KW OP1U/00062423/3
Wadium, ilość wpłat – 3
Liczba osób dopuszczonych do przetargu – 3
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 25 000,00 zł.
- najwyższa cena osiągnięta w przetargu – 35 000,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- Meinhart Company Sp.zo.o.

2. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kuniów, ul. Kwiatowa, działka nr 492/454 o pow. 0,1859ha KW OP1U/00016043/8
Wadium, ilość wpłat – 2
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 190 650,00 zł.
- najwyższa cena osiągnięta w przetargu – 193 000,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- Firma Usługowo-Handlowa „Prędkiewicz”

3. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kuniów, ul. Kwiatowa, działka nr 441 o pow. 0,1046ha
Wadium, ilość wpłat – 2
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 89 790,00 zł.
- najwyższa cena osiągnięta w przetargu – 91 000,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- Firma Usługowo-Handlowa „Prędkiewicz”

4. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork, ul. Bora Komorowskiego, działka nr 2445 o pow. 0,0400ha
Wadium, ilość wpłat – 0
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 93 922,80 zł.
- najwyższa cena osiągnięta w przetargu – nie dotyczy
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- przetarg zakończony wynikiem negatywnym

5. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork, ul. Ks. Skargi, działka nr 358/2 o pow. 0,1401ha
Wadium, ilość wpłat – 0
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 316 074,33 zł.
- najwyższa cena osiągnięta w przetargu – nie dotyczy
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- przetarg zakończony wynikiem negatywnym`;

const FIXTURE_ANNOUNCE_2023 = `BURMISTRZ MIASTA KLUCZBORKA
województwo opolskie Kluczbork, dnia 26 października 2023r.
Nr GNP.6840.24.2023.JK
OGŁOSZENIE o przetargu ustnym nieograniczonym na sprzedaż nieruchomości

I przetarg ustny nieograniczony

l. Miasto Kluczbork, ul. Sybiraków l ark. m. 6 działka nr 31/22 o pow. 0,0483 ha w udziale 1645/10000, KW OP1U/00056007/6 (wolna od obciążeń).
Lokal mieszkalny nr 6 o pow. 186,67 m2, złożony z 5 pokoi, przedpokoju, kuchni, łazienki, WC i 2 spiżarni.
Cena wywoławcza nieruchomości brutto: 216.400,00 zł.
wadium: 21.640,00 zł.

2. Miasto Kluczbork, ul. Zamkowa 15 ark. m. 6 działka nr 196/3 o pow. 0,0574 ha w udziale 742/10000, KW OP1U/00059626/2,
lokal mieszkalny nr 14 o pow. 139,03 m2, złożony z 3 pokoi, kuchni, spiżarki, korytarza, łazienki x WC.
Cena wywoławcza nieruchomości - 184.500,00 xl
wadium -18.450,00 zł.

III przetarg ustny nieograniczony

l. Kluczbork, ul. Ks. Skargi, działka nr 358/2 ark.m. 4 o pow. (),1401ha KW OP1U/00058054/4
Cena wywoławcza nieruchomości brutto: 253.000,00 zł.
wadium: 25.300,00 zł.
Na w/w nieruchomość odbyły się przetargi:
- I przetarg w dniu 14.06.2023 r.
- II przetarg w dniu 28.07.2023r.

Przetarg odbędzie się w dniu 30 listopada 2()23r. o godz. 10 w siedzibie Urzędu Miejskiego w Kluczborku`;

const FIXTURE_RESULT_2023 = `Kluczbork, dnia 7 sierpnia 2023r.
Nr GNP.6840.13.2023.JK
Informację o wyniku przetargu na sprzedaż nieruchomości stanowiących własność Gminy Kluczbork,
który odbył się w dniu 28.07.2023r. w siedzibie Urzędu Miejskiego w Kluczborku

I przetarg ustny nieograniczony

l. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork - ark.m. 6 działka nr 231/9 o pow. 0,0026ha, zabudowana budynkiem niemieszkalnym KW OP1U/00096017/1
Wadium, ilość wpłat - 1
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 25.800,00 zł.
- najwyższa cena osiągnięta w przetargu - 26.100,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- Sławomir Zawadzki

II przetarg ustny nieograniczony

2. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork - ark.m. 4 działka nr 358/2 o pow. 0,1401ha, KW OP1U/00058054/4
Wadium, ilość wpłat - 0
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 253.000,00 zł.
- najwyższa cena osiągnięta w przetargu - nie dotyczy
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- przetarg zakończony wynikiem negatywnym

3. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork - ark.m. 4 działka nr 359/2 o pow. 0,1390ha, KW OP1U/00058054/4
Wadium, ilość wpłat - 1
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 251.000,00 zł.
- najwyższa cena osiągnięta w przetargu - 253.600,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- Sławomir Błaszków

IV przetarg ustny nieograniczony

4. Oznaczenie nieruchomości będącej przedmiotem przetargu wg katastru nieruchomości i księgi wieczystej:
- Kluczbork - ark.m. 6 działka nr 179/1 o pow. 0,0222, w udziale 1008/10000ha, lokal mieszkalny nr l , KW OP1U/00061267/4
Wadium, ilość wpłat - 2
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 73.013,00 zł.
- najwyższa cena osiągnięta w przetargu - 78.500,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- Sabina Trocha`;

const FIXTURE_RESULT_2022 = `Kluczbork, dnia 24 lutego 2022r.
Nr GNP.6840.2.2022.JK
Informację o wyniku przetargu na sprzedaż nieruchomości stanowiących własność Gminy Kluczbork,
który odbył się w dniu 16.02.2022r. w siedzibie Urzędu Miejskiego w Kluczborku

I przetarg ustny nieograniczony

1. Oznaczenie nieruchomości będącej przedmiotem przetargu:
- Kluczbork – ark.m. 4 działka nr 314 o pow. 0,0828ha , KW OP1U/00058054/4
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 109.920,18 zł.
- najwyższa cena osiągnięta w przetargu – 260.000,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- AVIBUD Sp.zo.o.

6. Oznaczenie nieruchomości będącej przedmiotem przetargu:
- Kluczbork, u. Byczyńska 25. ark. m. 5 działka nr 179/4 o pow. 0,0244 ha w udziale 556/10000, KW OP1U/00028825/1
Wadium, ilość wpłat – 2
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 68.010,00zł.
- najwyższa cena osiągnięta w przetargu – 80.000,00 zł.
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- Gerhard Pilarski

II przetarg ustny nieograniczony

1. Oznaczenie nieruchomości będącej przedmiotem przetargu:
- Kluczbork, ul. Zamkowa 15 – ark. m. 6 działka nr 196/3 o pow. 0,0574 ha w udziale 742/10000, KW OP1U/00059626/2, lokal mieszkalny nr 14 o pow. 139,03 m 2
Wadium, ilość wpłat – brak
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
- cena wywoławcza: 179.568,00 zł
- najwyższa cena osiągnięta w przetargu – nie dotyczy
Imię, nazwisko albo firma osoby ustalonej jako nabywca nieruchomości:
- przetarg zakończony wynikiem negatywnym`;

const FIXTURE_LEASE = `GNP.6845.8.2023.JK - ogłoszenie przetargu pisemnego nieograniczonego na dzierżawę lokalu użytkowego wraz z wyposażeniem z przeznaczeniem na prowadzenie kawiarni kinowej z ofertą gastronomiczną przy ul. Gen. Pułaskiego 5 w Kluczborku`;

const FIXTURE_CANCEL = `Informacja Burmistrza Miasta Kluczborka o odwołaniu I i II przetargu nr GNP.6840.46.2025.JK z dnia 30 grudnia 2025r. w części dot. lokali mieszkalnych zaplanowanym na dzień 30.01.2026r.`;

const FIXTURE_QUALIFIED_BIDDERS = `Lista osób zakwalifikowanych do uczestnictwa w I ustnym przetargu ustnym ograniczonym wyznaczonym na dzień 14.08.2025r. w Urzędzie Miejskim w Kluczborku`;

// --------------------------------------------------------------------- Tests

test('2026 Batch Announcement (plik 23707): extracts flats Zamkowa 15/14, Curie-Skłodowskiej 3/3, land 78/8', () => {
  const recs = parseAnnouncement(FIXTURE_ANNOUNCE_2026, {
    source_url: 'https://www.bip.kluczbork.eu/plik,23707,test.pdf',
    detail_url: 'https://www.bip.kluczbork.eu/redir,452?tresc=27651',
  });

  assert.equal(recs.length, 3);

  // Item 1: Land plot 78/8
  const plot = recs.find((r) => r.kind === 'grunt');
  assert.ok(plot, 'expected land plot');
  assert.equal(plot.dzialka_nr, '78/8');
  assert.equal(plot.area_m2, 3126);
  assert.equal(plot.starting_price_pln, 389612);
  assert.equal(plot.auction_date, '2026-09-29');
  assert.equal(plot.round, 1);

  // Item 2: Zamkowa 15/14
  const zamkowa = recs.find((r) => r.address?.key === 'zamkowa|15|14');
  assert.ok(zamkowa, 'expected Zamkowa 15/14');
  assert.equal(zamkowa.kind, 'mieszkalny');
  assert.equal(zamkowa.address_raw, 'ul. Zamkowa 15/14');
  assert.equal(zamkowa.address.street, 'Zamkowa');
  assert.equal(zamkowa.address.building, '15');
  assert.equal(zamkowa.address.apt, '14');
  assert.equal(zamkowa.area_m2, 139.03);
  assert.equal(zamkowa.starting_price_pln, 187400);
  assert.equal(zamkowa.auction_date, '2026-09-29');
  assert.equal(zamkowa.round, 1);

  // Item 3: Curie-Skłodowskiej 3/3
  const curie = recs.find((r) => r.address?.key === 'sklodowskiej curie|3|3');
  assert.ok(curie, 'expected Skłodowskiej-Curie 3/3');
  assert.equal(curie.kind, 'mieszkalny');
  assert.equal(curie.address_raw, 'ul. Skłodowskiej-Curie 3/3');
  assert.equal(curie.address.building, '3');
  assert.equal(curie.address.apt, '3');
  assert.equal(curie.area_m2, 137.2);
  assert.equal(curie.starting_price_pln, 235000);
  assert.equal(curie.auction_date, '2026-09-29');
  assert.equal(curie.round, 1);
});

test('2026 Batch Result (plik 23873): all 3 lots concluded unsold (wynikiem negatywnym)', () => {
  const recs = parseResultDoc(FIXTURE_RESULT_2026, null, 'https://www.bip.kluczbork.eu/plik,23873,test.pdf');
  assert.equal(recs.length, 3);

  for (const r of recs) {
    assert.equal(r.outcome, 'unsold');
    assert.equal(r.final_price_pln, null);
    assert.equal(r.unsold_reason, 'no_bids');
    assert.equal(r.auction_date, '2026-09-29');
    assert.equal(r.round, 1);
  }

  const zamkowa = recs.find((r) => r.address?.key === 'zamkowa|15|14');
  assert.ok(zamkowa);
  assert.equal(zamkowa.starting_price_pln, 187400);

  const curie = recs.find((r) => r.address?.key === 'sklodowskiej curie|3|3');
  assert.ok(curie);
  assert.equal(curie.starting_price_pln, 235000);

  const plot = recs.find((r) => r.kind === 'grunt');
  assert.ok(plot);
  assert.equal(plot.dzialka_nr, '78/8');
  assert.equal(plot.starting_price_pln, 389612);
});

test('2024 Drzymały 8/1 Result (plik 20707): flat SOLD 25 000 zł -> 35 000 zł to Meinhart Company Sp.zo.o.', () => {
  const recs = parseResultDoc(FIXTURE_RESULT_2024, null, 'https://www.bip.kluczbork.eu/plik,20707,test.pdf');
  assert.equal(recs.length, 5);

  const flat = recs.find((r) => r.kind === 'mieszkalny');
  assert.ok(flat, 'expected flat Drzymały 8/1');
  assert.equal(flat.address_raw, 'ul. Drzymały 8/1');
  assert.equal(flat.address.street, 'Drzymały');
  assert.equal(flat.address.building, '8');
  assert.equal(flat.address.apt, '1');
  assert.equal(flat.address.key, 'drzymaly|8|1');
  assert.equal(flat.area_m2, 34.85);
  assert.equal(flat.starting_price_pln, 25000);
  assert.equal(flat.final_price_pln, 35000);
  assert.equal(flat.outcome, 'sold');
  assert.equal(flat.buyer, 'Meinhart Company Sp.zo.o.');
  assert.equal(flat.auction_date, '2024-10-18');
  assert.equal(flat.round, 1);

  // Also check land plots in the same result doc
  const soldLand1 = recs.find((r) => r.dzialka_nr === '492/454');
  assert.ok(soldLand1);
  assert.equal(soldLand1.outcome, 'sold');
  assert.equal(soldLand1.starting_price_pln, 190650);
  assert.equal(soldLand1.final_price_pln, 193000);
  assert.equal(soldLand1.buyer, 'Firma Usługowo-Handlowa „Prędkiewicz”');

  const unsoldLand = recs.find((r) => r.dzialka_nr === '2445');
  assert.ok(unsoldLand);
  assert.equal(unsoldLand.outcome, 'unsold');
  assert.equal(unsoldLand.final_price_pln, null);
});

test('2023 Sybiraków 1/6 Announcement (plik 18931): Sybiraków 1/6, Zamkowa 15/14, Ks. Skargi dz. 358/2', () => {
  const recs = parseAnnouncement(FIXTURE_ANNOUNCE_2023, {
    source_url: 'https://www.bip.kluczbork.eu/plik,18931,test.pdf',
  });
  assert.equal(recs.length, 3);

  // Flat 1: Sybiraków 1/6
  const sybirakow = recs.find((r) => r.address?.key === 'sybirakow|1|6');
  assert.ok(sybirakow, 'expected Sybiraków 1/6');
  assert.equal(sybirakow.address_raw, 'ul. Sybiraków 1/6');
  assert.equal(sybirakow.area_m2, 186.67);
  assert.equal(sybirakow.starting_price_pln, 216400);
  assert.equal(sybirakow.auction_date, '2023-11-30');
  assert.equal(sybirakow.round, 1);

  // Flat 2: Zamkowa 15/14 (with 'xl' OCR currency)
  const zamkowa = recs.find((r) => r.address?.key === 'zamkowa|15|14');
  assert.ok(zamkowa, 'expected Zamkowa 15/14');
  assert.equal(zamkowa.area_m2, 139.03);
  assert.equal(zamkowa.starting_price_pln, 184500);
  assert.equal(zamkowa.auction_date, '2023-11-30');
  assert.equal(zamkowa.round, 1);

  // Land: Ks. Skargi 358/2 round III
  const land = recs.find((r) => r.dzialka_nr === '358/2');
  assert.ok(land, 'expected Ks. Skargi parcel 358/2');
  assert.equal(land.starting_price_pln, 253000);
  assert.equal(land.round, 3);
  assert.equal(land.auction_date, '2023-11-30');
});

test('2023 Damrota 15/1 Result (plik 18647): round 4 SOLD to Sabina Trocha for 78 500 zł', () => {
  const recs = parseResultDoc(FIXTURE_RESULT_2023, null, 'https://www.bip.kluczbork.eu/plik,18647,test.pdf');
  assert.equal(recs.length, 4);

  const damrota = recs.find((r) => r.address?.key === 'damrota|15|1');
  assert.ok(damrota, 'expected Damrota 15/1 mapped from parcel 179/1');
  assert.equal(damrota.kind, 'mieszkalny');
  assert.equal(damrota.address_raw, 'ul. Damrota 15/1');
  assert.equal(damrota.starting_price_pln, 73013);
  assert.equal(damrota.final_price_pln, 78500);
  assert.equal(damrota.outcome, 'sold');
  assert.equal(damrota.buyer, 'Sabina Trocha');
  assert.equal(damrota.round, 4);
  assert.equal(damrota.auction_date, '2023-07-28');

  // Commercial / building
  const built = recs.find((r) => r.kind === 'uzytkowy' || r.kind === 'zabudowana');
  assert.ok(built);
  assert.equal(built.starting_price_pln, 25800);
  assert.equal(built.final_price_pln, 26100);
  assert.equal(built.outcome, 'sold');
  assert.equal(built.buyer, 'Sławomir Zawadzki');
  assert.equal(built.round, 1);
});

test('2022 Byczyńska 25 & Zamkowa 15/14 Result (plik 15332)', () => {
  const recs = parseResultDoc(FIXTURE_RESULT_2022, null, 'https://www.bip.kluczbork.eu/plik,15332,test.pdf');
  assert.equal(recs.length, 3);

  // Zamkowa 15/14 round II unsold
  const zamkowa = recs.find((r) => r.address?.key === 'zamkowa|15|14');
  assert.ok(zamkowa);
  assert.equal(zamkowa.outcome, 'unsold');
  assert.equal(zamkowa.starting_price_pln, 179568);
  assert.equal(zamkowa.round, 2);
  assert.equal(zamkowa.auction_date, '2022-02-16');

  // Byczyńska 25 sold to Gerhard Pilarski
  const byczynska = recs.find((r) => r.address?.street === 'Byczyńska');
  assert.ok(byczynska);
  assert.equal(byczynska.outcome, 'sold');
  assert.equal(byczynska.starting_price_pln, 68010);
  assert.equal(byczynska.final_price_pln, 80000);
  assert.equal(byczynska.buyer, 'Gerhard Pilarski');
  assert.equal(byczynska.round, 1);
  assert.equal(byczynska.auction_date, '2022-02-16');
});

test('Filter guards: isLease, isCancellation, isResultDoc, error handling', () => {
  assert.equal(isLease(FIXTURE_LEASE), true);
  assert.equal(isSaleAuction(FIXTURE_LEASE), false);
  assert.equal(isCancellation(FIXTURE_CANCEL), true);
  assert.equal(isResultDoc(FIXTURE_QUALIFIED_BIDDERS), false);

  // Announcements filter out lease and cancellations
  assert.deepEqual(parseAnnouncement(FIXTURE_LEASE), []);
  assert.deepEqual(parseAnnouncement(FIXTURE_CANCEL), []);

  // Results filter out lease and procedural notices
  assert.deepEqual(parseResultDoc(FIXTURE_LEASE), []);
  assert.deepEqual(parseResultDoc(FIXTURE_QUALIFIED_BIDDERS), []);

  // Empty or invalid input
  assert.deepEqual(parseAnnouncement(''), []);
  assert.deepEqual(parseResultDoc(''), []);
  assert.deepEqual(parseAnnouncement(null), []);
  assert.deepEqual(parseResultDoc(null), []);
});
