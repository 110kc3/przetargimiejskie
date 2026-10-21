// Malbork parser tests.
// Every fixture is real text extracted from live municipal announcement and result PDFs
// on bip.malbork.pl (see spikes/pomorskie/powiat-malborski/malbork.md).
// Node built-in test runner.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseNum,
  parsePolishDate,
  isFlat,
  isSkippable,
  extractAuctionDate,
  extractRound,
  extractWadiumDeadline,
  extractTableRows,
  extractSoldMap,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/malbork/parse.js';

// ---- Real Fixtures ---------------------------------------------------------

// ANNOUNCEMENT 1: ul. Mickiewicza 36/2 (III przetarg, 2026-08-31, 120.66 m², 518 479 zł)
const ANN_MICKIEWICZA = `                    BURMISTRZ MIASTA MALBORKA
                   82-200 Malbork, Plac Słowiański 5
                   tel. 55 629 04 12
                   e-mail: biuroburmistrza@um.malbork.pl
                   www.urzad.malbork.pl

                                                                        Malbork, 24 czerwca 2026 r.

                                    OGŁOSZENIE
                           BURMISTRZ MIASTA MALBORKA
ogłasza w dniu 31 sierpnia 2026 r. o godz. 10.00 trzeci ustny przetarg nieograniczony
na sprzedaż nieruchomości lokalowej, stanowiącej własność Miasta Malborka
      1. Opis nieruchomości
         Przedmiotem przetargu jest nieruchomość lokalowa położona w budynku
         przy ul. Mickiewicza 36/2, KW GD1M/00012971/3. Budynek, w którym znajduje się
         nieruchomość lokalowa został wybudowany w 1935 r. Jest to budynek mieszkalny
         wielorodzinny z usługami, 1-klatkowy, podpiwniczony, czterokondygnacyjny,
         murowany. Dach o konstrukcji drewnianej, kryty papą termozgrzewalną.

l.p.          adres                Pow.          Nr       pow. działki      udział             Cena
                                  lokalu       działki                    w działce       wywoławcza
                                                                                             lokalu*
                                                                                            (VAT zw)
 1     ul. Mickiewicza 36/2     120,66 m2      76/14        0.0509 ha    1042/10000         518 479 zł
 *Lokal znajduje się w budynku wpisanym do rejestru zabytków. Na podstawie art. 68 ust. 3
 ustawy o gospodarce nieruchomościami przysługuje 50% bonifikaty od ceny sprzedaży
 w/w lokalu. Bonifikaty udziela się na wniosek nabywcy.
         1. W dziale III i IV księgi wieczystej GD1M/00012971/3 nie ma wpisów obciążających.
         2. Nieruchomość nie jest przedmiotem żadnych zobowiązań.
         3. Lokal mieszkalny nr 2 (powstał z połączenia lokali 2A i 2B) usytuowany jest
            na parterze budynku, składa się z 5 pokoi, 2 kuchni, łazienki z w.c., w.c., i korytarza.

   3. Warunki nabycia nieruchomości
       a) wadium w kwocie 50 000 zł (pięćdziesiąt tysięcy złotych) płatne najpóźniej
          do 20 sierpnia 2026 r. przelewem na konto depozytowe Miasta Malborka`;

// ANNOUNCEMENT 2: ul. 17 Marca 21 (multi-flat: 21/4 and 21/6, III przetarg, 2026-06-10)
const ANN_17_MARCA_21 = `                    BURMISTRZ MIASTA MALBORKA
                   82-200 Malbork, Plac Słowiański 5
                   tel. 55 629 04 12
                   e-mail: biuroburmistrza@um.malbork.pl
                   www.urzad.malbork.pl
                                                                            Malbork, 30 marca 2026 r.

                                   OGŁOSZENIE
                          BURMISTRZ MIASTA MALBORKA
ogłasza w dniu 10 czerwca 2026 r. o godz. 10.00 trzeci ustny przetarg nieograniczony
na sprzedaż nieruchomości lokalowych, stanowiących własność Miasta Malborka
    1. Opis nieruchomości
       Przedmiotem przetargu są 2 nieruchomości lokalowe położone w budynku
       przy ul. 17 Marca 21, KW GD1M/00030493/0. Budynek, w którym znajdują się
       nieruchomości lokalowe został wybudowany pod koniec XIX wieku. Jest to budynek
       mieszkalny wielorodzinny, 1-klatkowy, podpiwniczony, czterokondygnacyjny,
       murowany.

      l.p.         adres               Pow.          Nr            pow.          udział          Cena
                                      lokalu       działki         działki     w działce     wywoławcza
                                                                                            lokalu (VAT zw)
       1     ul. 17 Marca 21/4      208,20 m2      70/56      0.0575 ha       1191/10000      909 080 zł
       2     ul. 17 Marca 21/6      223,56 m2      70/56      0.0575 ha       1160/10000       965 522 zł

    3. Warunki nabycia nieruchomości
        a) wadium w kwocie 90 000 zł (dziewięćdziesiąt tysięcy złotych) za każdy lokal płatne
           najpóźniej do 05 czerwca 2026 r. przelewem na konto depozytowe Miasta
           Malborka prowadzone w PKO BP SA Nr 60 1020 1811 0000 0402 0339 9631.`;

// ANNOUNCEMENT 3: ul. Grunwaldzka 22-23 (IV przetarg, 2026-06-10, 216.03 m², 590 000 zł)
const ANN_GRUNWALDZKA = `                    BURMISTRZ MIASTA MALBORKA
                   82-200 Malbork, Plac Słowiański 5
                   tel. 55 629 04 12
                   e-mail: biuroburmistrza@um.malbork.pl
                   www.urzad.malbork.pl
                                                                        Malbork, 31 marca 2026 r.

                                        OGŁOSZENIE
                                 BURMISTRZ MIASTA MALBORKA

ogłasza w dniu 10 czerwca 2026 r. o godz. 11.30 czwarty ustny przetarg nieograniczony
na sprzedaż nieruchomości lokalowej, stanowiącej własność Miasta Malborka
    1. Opis nieruchomości
       Przedmiotem przetargu jest nieruchomość lokalowa położona w budynku
       przy ul. Grunwaldzkiej 22-23, KW GD1M/00034736/4. Budynek został wybudowany w 1904 r.

      l.p.            adres               Pow. lokalu              Nr    pow.     udział    cena lokalu
                                                              działki   działki     w        (VAT zw)
                                                                                  działce
     1       ul. Grunwaldzka 22/1          216,03 m2          70/84     542 m2    0.1416    590 000 zł

   3. Warunki nabycia nieruchomości
       a) wadium w kwocie 60 000 zł (sześćdziesiąt tysięcy złotych) płatne najpóźniej
\f                   BURMISTRZ MIASTA MALBORKA
           do 05 czerwca 2026 r. przelewem na konto depozytowe Miasta Malborka`;

// ANNOUNCEMENT 4: ul. Poczty Gdańskiej 20/2 (split-line table row, I przetarg, 2026-11-30, 126.38 m², 542 029 zł)
const ANN_POCZTY_GDANSKIEJ = `                    BURMISTRZ MIASTA MALBORKA
                   82-200 Malbork, Plac Słowiański 5
                   tel. 55 629 04 12
                   e-mail: biuroburmistrza@um.malbork.pl
                   www.urzad.malbork.pl

                                                                      Malbork, 23 września 2026 r.
                                      OGŁOSZENIE
                             BURMISTRZ MIASTA MALBORKA
ogłasza w dniu 30 listopada 2026 r. o godz. 10.00 pierwszy ustny przetarg nieograniczony
na sprzedaż nieruchomości lokalowej, stanowiącej własność Miasta Malborka
    1. Opis nieruchomości
Przedmiotem przetargu jest nieruchomość lokalowa położona w budynku
przy ul. Poczty Gdańskiej 20, KW GD1M/00061360/5.

           adres                   Pow.          Nr          pow.     udział         Cena
                                  lokalu       działki      działki     w        wywoławcza
                                                                      działce       lokalu
                                                                                   (VAT zw)
   ul. Poczty Gdańskiej       126,38 m2 98/19          0.0178     0,261           542 029 zł
           20/2                                          ha

3. Warunki nabycia nieruchomości
       a) wadium w kwocie 55 000 zł płatne najpóźniej do 26 listopada 2026 r.`;

// RESULT 1: ul. 17 Marca 21 (2026-03-27: 4 flats, 2 sold with buyer and price, 2 unsold)
const RES_17_MARCA_21 = `                            INFORMACJA O WYNIKACH PRZETARGU

przeprowadzonego w dniu 27 marca 2026 r. na          sprzedaż    nieruchomości lokalowej
stanowiących własność Miasta Malborka

1. Przetarg przeprowadzono w siedzibie Urzędu Miasta Malborka, Pl. Słowiański 5.
2. Przetargiem objęto nieruchomości lokalowe przy ul. 17 Marca 21:

l.p.         adres             Pow.        Nr        pow.         udział     Cena wywoławcza
                              lokalu     działki    działki     w działce     lokalu (VAT zw)
 1     ul. 17 Marca 21/4     208,20 m2   70/56     0.0575 ha    1191/10000         909 080 zł
 2     ul. 17 Marca 21/6     223,56 m2   70/56     0.0575 ha    1160/10000         965 522 zł
 3     ul. 17 Marca 21/7     205,26 m2   70/56     0.0575 ha    1271/10000         896 243 zł
 4     ul. 17 Marca 21/9     204,25 m2   70/56     0.0575 ha    1114/10000         882 125 zł

3. Do przetargu przystąpił jeden uczestnik.
4. W wyniku przetargu wyłoniono nabywcę nieruchomości – Rafał Krotowski
   - lokal 17 Marca 21/7 za cenę 905 210 zł
   - lokal 17 Marca 21/9 – za cenę 890 950 zł

Na czynności związane z przeprowadzeniem przetargu przysługuje skarga, którą należy złożyć
w terminie 7 dni od daty przetargu do Burmistrza Miasta Malborka.`;

// RESULT 2: ul. Mickiewicza 36/2 (2026-08-31: negative outcome, 0 participants)
const RES_MICKIEWICZA = `                     INFORMACJA O WYNIKACH PRZETARGU

przeprowadzonego w dniu 31 sierpnia 2026 r. na sprzedaż nieruchomości lokalowej,
stanowiącej własność Miasta Malborka

1. Przetarg przeprowadzono w siedzibie Urzędu Miasta Malborka, Pl. Słowiański 5.
2. Przetargiem objęto nieruchomość lokalową w budynku przy ul. Mickiewicza 36/2 w
   Malborku

 l.p.       adres         Pow. lokalu Udział w     Nr działki    cena wywoławcza lokalu
                                                                       (VAT zw.)
                                        działce
 1.     ul. Mickiewicza    120,66m² 1042/10000        76/14              518 479 zł
             36/2

3. Do przetargu nie przystąpił żaden uczestnik.
4. W wyniku przetargu nie wyłoniono nabywcy nieruchomości`;

// RESULT 3: ul. 17 Marca 22/3 (2026-02-23: sold, achieved bid price 353 800 zł)
const RES_17_MARCA_22_3 = `                      INFORMACJA O WYNIKACH PRZETARGU

przeprowadzonego w dniu 23.02.2026 r. na            sprzedaż nieruchomości lokalowej,
stanowiącej własność Miasta Malborka

1. Przetarg przeprowadzono w siedzibie Urzędu Miasta Malborka, Pl. Słowiański 5.
2. Przetargiem objęto nieruchomość lokalową w budynku przy ul. 17 Marca 22 w Malborku

 l.p.        adres          Pow. lokalu Udział w   Nr działki    cena wywoławcza lokalu
                                                                       (VAT zw.)
                                         działce
 1.     ul. 17 Marca 22/3    113,78m²   105/1000      70/52              350 294 zł

3. Do przetargu przystąpił jeden uczestnik.
4. W wyniku przetargu wyłoniono nabywcę dla nieruchomości lokalowej przy ul. 17 Marca
   22/3 – Arkadiusz Kisiel wylicytował lokal za cenę 353 800 zł po udzieleniu bonifikaty w
   kwocie 70% na wniosek zainteresowanego, cena sprzedaży wynosi 106 140 zł.`;

// RESULT 4: ul. 17 Marca 22 (2026-01-15: 2 flats in table, 22/2 sold for 350 970 zł, 22/3 unsold)
const RES_17_MARCA_22_MULTI = `                     INFORMACJA O WYNIKACH PRZETARGU

przeprowadzonego w dniu 15.01.2026 r. na           sprzedaż nieruchomości lokalowych,
stanowiącej własność Miasta Malborka

1. Przetarg przeprowadzono w siedzibie Urzędu Miasta Malborka, Pl. Słowiański 5.
2. Przetargiem objęto nieruchomości lokalowe w budynku przy ul. 17 Marca 21 w Malborku

 l.p.        adres          Pow. lokalu Udział w   Nr działki    cena wywoławcza lokalu
                                                                       (VAT zw.)
                                         działce
 1.     ul. 17 Marca 22/2    112,87m²   100/1000      70/52              347 493 zł
 2.     ul. 17 Marca 22/3    113,78m²   105/1000      70/52              350 294 zł

3. Do przetargu przystąpił jeden uczestnik.
4. W wyniku przetargu wyłoniono nabywcę dla nieruchomości lokalowej przy ul. 17 Marca
   22/2 – Arkadiusz Kisiel wylicytował lokal za cenę 350 970zł po udzieleniu bonifikaty w
   kwocie 70% na wniosek zainteresowanego, cena sprzedaży wynosi 105 291 zł.`;

// RESULT 5: ul. Wiosenna 31/2 (2026-09-28: negative outcome, 0 participants)
const RES_WIOSENNA = `                     INFORMACJA O WYNIKACH PRZETARGU

przeprowadzonego w dniu 28 września 2026 r. na sprzedaż nieruchomości lokalowej,
stanowiącej własność Miasta Malborka

1. Przetarg przeprowadzono w siedzibie Urzędu Miasta Malborka, Pl. Słowiański 5.
2. Przetargiem objęto nieruchomość lokalową położoną w budynku przy ul. Wiosennej 31
   w Malborku

 l.p.        adres        Pow. Nr działki      pow.       udział w    cena wywoławcza
                         lokalu    obr.6      działki      działce          lokalu
                                                                          ( VAT zw.)
 1.     ul. Wiosenna 31/2 64m²     19/4      0.0147 ha     0.6874         242 863 zł

3. Do przetargu nie przystąpił żaden uczestnik.
4. W wyniku przetargu nie wyłoniono nabywcy nieruchomości:`;

// ---- Tests -----------------------------------------------------------------

test('utility functions: parsePLN, parseNum, parsePolishDate', () => {
  assert.equal(parsePLN('909 080 zł'), 909080);
  assert.equal(parsePLN('518 479,00 zł'), 518479);
  assert.equal(parsePLN('350 970zł'), 350970);
  assert.equal(parsePLN(null), null);

  assert.equal(parseNum('120,66'), 120.66);
  assert.equal(parseNum('64'), 64);
  assert.equal(parseNum('208.20'), 208.2);

  assert.equal(parsePolishDate('31 sierpnia 2026 r.'), '2026-08-31');
  assert.equal(parsePolishDate('27 marca 2026 r.'), '2026-03-27');
  assert.equal(parsePolishDate('23.02.2026 r.'), '2026-02-23');
  assert.equal(parsePolishDate('15.01.2026'), '2026-01-15');
});

test('classification: isFlat and isSkippable', () => {
  assert.equal(isFlat('sprzedaż nieruchomości lokalowej'), true);
  assert.equal(isFlat('sprzedaż lokalu mieszkalnego nr 2'), true);
  assert.equal(isFlat('przetarg na dzierżawę gruntów rolnych'), false);

  assert.equal(isSkippable('przetarg na dzierżawę nieruchomości rolnej'), true);
  assert.equal(isSkippable('sprzedaż kwiatów i zniczy przy Cmentarzu Komunalnym'), true);
  assert.equal(isSkippable('ogłoszenie o przetargu na sprzedaż nieruchomości lokalowej'), false);
});

test('parseAnnouncement: single flat at ul. Mickiewicza 36/2', () => {
  const listings = parseAnnouncement(
    ANN_MICKIEWICZA,
    'https://bip.malbork.pl/a,30396.html',
    'https://bip.malbork.pl/api/files/42535',
  );
  assert.equal(listings.length, 1);
  const l = listings[0];
  assert.equal(l.address.key, 'mickiewicza|36|2');
  assert.equal(l.address.street, 'Mickiewicza');
  assert.equal(l.address.building, '36');
  assert.equal(l.address.apt, '2');
  assert.equal(l.area_m2, 120.66);
  assert.equal(l.starting_price_pln, 518479);
  assert.equal(l.round, 3);
  assert.equal(l.auction_date, '2026-08-31');
  assert.equal(l.wadium_deadline, '2026-08-20');
  assert.equal(l.kind, 'mieszkalny');
});

test('parseAnnouncement: multi-flat session at ul. 17 Marca 21', () => {
  const listings = parseAnnouncement(
    ANN_17_MARCA_21,
    'https://bip.malbork.pl/a,30139.html',
    'https://bip.malbork.pl/api/files/42137',
  );
  assert.equal(listings.length, 2);

  const flat1 = listings.find((l) => l.address.apt === '4');
  assert.ok(flat1);
  assert.equal(flat1.address.key, '17 marca|21|4');
  assert.equal(flat1.area_m2, 208.2);
  assert.equal(flat1.starting_price_pln, 909080);
  assert.equal(flat1.round, 3);
  assert.equal(flat1.auction_date, '2026-06-10');
  assert.equal(flat1.wadium_deadline, '2026-06-05');

  const flat2 = listings.find((l) => l.address.apt === '6');
  assert.ok(flat2);
  assert.equal(flat2.address.key, '17 marca|21|6');
  assert.equal(flat2.area_m2, 223.56);
  assert.equal(flat2.starting_price_pln, 965522);
  assert.equal(flat2.round, 3);
  assert.equal(flat2.auction_date, '2026-06-10');
});

test('parseAnnouncement: round IV at ul. Grunwaldzka 22-23', () => {
  const listings = parseAnnouncement(
    ANN_GRUNWALDZKA,
    'https://bip.malbork.pl/a,30147.html',
    'https://bip.malbork.pl/api/files/42148',
  );
  assert.equal(listings.length, 1);
  const l = listings[0];
  assert.equal(l.address.key, 'grunwaldzka|22|1');
  assert.equal(l.area_m2, 216.03);
  assert.equal(l.starting_price_pln, 590000);
  assert.equal(l.round, 4);
  assert.equal(l.auction_date, '2026-06-10');
  assert.equal(l.wadium_deadline, '2026-06-05');
});

test('parseAnnouncement: split-line layout at ul. Poczty Gdańskiej 20/2', () => {
  const listings = parseAnnouncement(
    ANN_POCZTY_GDANSKIEJ,
    'https://bip.malbork.pl/a,30642.html',
    'https://bip.malbork.pl/api/files/42977',
  );
  assert.equal(listings.length, 1);
  const l = listings[0];
  assert.equal(l.address.key, 'poczty gdanskiej|20|2');
  assert.equal(l.area_m2, 126.38);
  assert.equal(l.starting_price_pln, 542029);
  assert.equal(l.round, 1);
  assert.equal(l.auction_date, '2026-11-30');
  assert.equal(l.wadium_deadline, '2026-11-26');
});

test('parseResultDoc: multi-flat session at ul. 17 Marca 21 (2 sold, 2 unsold)', () => {
  const results = parseResultDoc(
    RES_17_MARCA_21,
    null,
    'https://bip.malbork.pl/api/files/42083',
  );
  assert.equal(results.length, 4);

  const f7 = results.find((r) => r.address.apt === '7');
  assert.ok(f7);
  assert.equal(f7.address.key, '17 marca|21|7');
  assert.equal(f7.outcome, 'sold');
  assert.equal(f7.starting_price_pln, 896243);
  assert.equal(f7.final_price_pln, 905210);
  assert.equal(f7.unsold_reason, null);
  assert.equal(f7.auction_date, '2026-03-27');

  const f9 = results.find((r) => r.address.apt === '9');
  assert.ok(f9);
  assert.equal(f9.address.key, '17 marca|21|9');
  assert.equal(f9.outcome, 'sold');
  assert.equal(f9.starting_price_pln, 882125);
  assert.equal(f9.final_price_pln, 890950);
  assert.equal(f9.unsold_reason, null);

  const f4 = results.find((r) => r.address.apt === '4');
  assert.ok(f4);
  assert.equal(f4.address.key, '17 marca|21|4');
  assert.equal(f4.outcome, 'unsold');
  assert.equal(f4.starting_price_pln, 909080);
  assert.equal(f4.final_price_pln, null);
  assert.equal(f4.unsold_reason, 'no_bids');

  const f6 = results.find((r) => r.address.apt === '6');
  assert.ok(f6);
  assert.equal(f6.address.key, '17 marca|21|6');
  assert.equal(f6.outcome, 'unsold');
  assert.equal(f6.starting_price_pln, 965522);
  assert.equal(f6.final_price_pln, null);
  assert.equal(f6.unsold_reason, 'no_bids');
});

test('parseResultDoc: negative outcome at ul. Mickiewicza 36/2', () => {
  const results = parseResultDoc(
    RES_MICKIEWICZA,
    null,
    'https://bip.malbork.pl/api/files/42792',
  );
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.address.key, 'mickiewicza|36|2');
  assert.equal(r.area_m2, 120.66);
  assert.equal(r.starting_price_pln, 518479);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_participants');
  assert.equal(r.auction_date, '2026-08-31');
});

test('parseResultDoc: single flat sold at ul. 17 Marca 22/3', () => {
  const results = parseResultDoc(
    RES_17_MARCA_22_3,
    null,
    'https://bip.malbork.pl/api/files/41924',
  );
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.address.key, '17 marca|22|3');
  assert.equal(r.area_m2, 113.78);
  assert.equal(r.starting_price_pln, 350294);
  assert.equal(r.final_price_pln, 353800);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-02-23');
});

test('parseResultDoc: 2-flat batch at ul. 17 Marca 22 (1 sold, 1 unsold)', () => {
  const results = parseResultDoc(
    RES_17_MARCA_22_MULTI,
    null,
    'https://bip.malbork.pl/api/files/41685',
  );
  assert.equal(results.length, 2);

  const flat2 = results.find((r) => r.address.apt === '2');
  assert.ok(flat2);
  assert.equal(flat2.address.key, '17 marca|22|2');
  assert.equal(flat2.outcome, 'sold');
  assert.equal(flat2.starting_price_pln, 347493);
  assert.equal(flat2.final_price_pln, 350970);
  assert.equal(flat2.unsold_reason, null);
  assert.equal(flat2.auction_date, '2026-01-15');

  const flat3 = results.find((r) => r.address.apt === '3');
  assert.ok(flat3);
  assert.equal(flat3.address.key, '17 marca|22|3');
  assert.equal(flat3.outcome, 'unsold');
  assert.equal(flat3.starting_price_pln, 350294);
  assert.equal(flat3.final_price_pln, null);
  assert.equal(flat3.unsold_reason, 'no_bids');
});

test('parseResultDoc: negative outcome at ul. Wiosenna 31/2', () => {
  const results = parseResultDoc(
    RES_WIOSENNA,
    null,
    'https://bip.malbork.pl/api/files/42983',
  );
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.address.key, 'wiosenna|31|2');
  assert.equal(r.area_m2, 64);
  assert.equal(r.starting_price_pln, 242863);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_participants');
  assert.equal(r.auction_date, '2026-09-28');
});

test('parseResultDoc: skips land or commercial notices', () => {
  const landText = `INFORMACJA O WYNIKACH PRZETARGU
przeprowadzonego w dniu 25.08.2026 r. na dzierżawę gruntów rolnych
działka nr 14/2 obr. 2 o powierzchni 1.5 ha`;
  const results = parseResultDoc(landText, '2026-08-25', 'https://bip.malbork.pl/test.pdf');
  assert.equal(results.length, 0);
});
