
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRssItems, crawlAll } from '../src/cities/boleslawiec/crawl.js';

import {
  parsePLN,
  parseAreaNum,
  haToM2,
  polishDateToIso,
  roundFromText,
  parseActiveItem,
  parseResultDoc,
} from '../src/cities/boleslawiec/parse.js';

test('live October residential RSS recovers both flats and uppercase auction round', () => {
  const xml = readFileSync(new URL('./fixtures/remediation/boleslawiec-flats-20261019.rss', import.meta.url), 'utf8');
  const rows = parseRssItems(xml).flatMap((item) => parseActiveItem(item.title, item.description, item.link).listings);
  assert.equal(rows.length, 2);
  const rynek = rows.find((row) => row.address_raw === 'Rynek 29-30/9');
  assert.equal(rynek.round, 3);
  assert.equal(rynek.area_m2, 48.52);
  assert.equal(rynek.starting_price_pln, 225000);
  assert.equal(rynek.auction_date, '2026-10-15');
  const mazowiecka = rows.find((row) => row.address_raw === 'Mazowieckiej 13b/5');
  assert.equal(mazowiecka.area_m2, 107.9);
  assert.equal(mazowiecka.starting_price_pln, 399000);
  assert.equal(mazowiecka.auction_date, '2026-11-05');
  assert.equal(roundFromText('lokal i przetarg na działkę'), null);
});

test('rolling RSS output cannot replace the complete retained land ledger', async () => {
  const xml = readFileSync(new URL('./fixtures/remediation/boleslawiec-flats-20261019.rss', import.meta.url), 'utf8');
  const result = await crawlAll({ fetchText: async (url) => url.includes('/sp-estate/lokale-mieszkalne?')
    ? xml : '<rss><channel></channel></rss>' });
  assert.equal(result.listings.length, 2);
  assert.equal(result.land.length, 0);
  assert.equal(result.land_complete, false, 'refresh must merge last-good plots omitted by the rolling source');
});


const WARSZAWSKA_RESULT = `MiG.6840.3.5.2024.MK

      Zgodnie z § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu
i trybu przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości ( Dz. U. z 2021 r. poz.
2213 ) - Prezydent Miasta Bolesławiec podaje

   informację o wyniku III przetargu ustnego nieograniczonego na sprzedaż
       lokalu mieszkalnego nr 10 w budynku przy ul. Warszawskiej Nr 1
                                 w Bolesławcu

Na dzień 18 czerwca 2026 r. o godz. 1100 w sali nr 412 Urzędu Miasta Bolesławiec przy
Pl. Piłsudskiego 1 (wieżowiec, IV piętro) został wyznaczony termin III przetargu ustnego
nieograniczonego na sprzedaż wolnego lokalu mieszkalnego nr 10 o pow. 97,10 m2 ,
położonego w budynku przy ul. Warszawskiej Nr 1 w Bolesławcu wraz z udziałem
wynoszącym 19/100 w częściach wspólnych budynku, jego urządzeniach oraz w prawie
własności działki gruntu Nr 154/1 o pow. 0,0295 ha ( obręb: 0008, Bolesławiec-8 ). Dla
wymienionej nieruchomości gruntowej zabudowanej Sąd Rejonowy w Bolesławcu - V
Wydział Ksiąg Wieczystych prowadzi księgę wieczystą nr JG1B/00018248/9.
Ceną wywoławczą lokalu do III przetargu była kwota 350.000,- zł (słownie: trzysta
pięćdziesiąt tysięcy złotych).
Wadium w pieniądzu w wysokości 70.000,- zł ( słownie: siedemdziesiąt tysięcy złotych)
należało wnieść do dnia 12 czerwca 2026 r. na wskazany w ogłoszeniu rachunek bankowy
Urzędu Miasta Bolesławiec.
W wyznaczonym terminie nikt nie wpłacił wadium - wobec czego III przetarg zakończył się
wynikiem negatywnym.

Bolesławiec, dnia 29 czerwca 2026 r.

MK/MK
                                                            II ZASTĘPCA
                                                        PREZYDENTA MIASTA

                                                        /-/ Robert Rzepnicki`;

const DZ_23_1_RESULT = `Zgodnie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu
przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021r. poz. 2213) podaje,-

                        informację o wyniku przetargu ustnego nieograniczonego.

Na dzień 23 czerwca 2026 roku o godz. 1000 w siedzibie Urzędu Miasta Bolesławiec, w sali nr 412 Pl.
Piłsudskiego nr 1 (IV piętro) – został wyznaczony termin I przetargu ustnego nieograniczonego
- na sprzedaż nieruchomości gruntowej niezabudowanej, stanowiącej własność Gminy Miejskiej
Bolesławiec, oznaczonej w ewidencji gruntów jako działka nr 23/1, położonej w Bolesławcu w obrębie
0001 miasta Bolesławiec – z przeznaczeniem pod zabudowę obiektów produkcyjnych, składów
i magazynów oraz zabudowę usługową.


                                                             I przetarg na działkę nr 23/1
                            Nr działki                                   23/1
     Oznaczenie
   nieruchomości     Powierzchnia działki (ha)                         0,5540
    wg katastru
                    Rodzaj użytku gruntowego          Grunty orne (RIVa-0,4264, RV-0,1276 ha),
   nieruchomości
                      wg ewidencji gruntów
                            Położenie            ul. Tadeusza Kościuszki, Obręb: 0001-Bolesławiec-01
      Oznaczenie nieruchomości wg księgi
                                                                 JG1B/00014848/7
                  wieczystej
    Liczba osób dopuszczonych do przetargu                                0
  Liczba osób niedopuszczonych do przetargu                              brak
            Cena wywoławcza brutto                                  570.000,00 zł

     Najwyższa cena osiągnięta w przetargu
                                                                          0
                    brutto
            Nabywca nieruchomości                                        brak

JP/JP
Bolesławiec, dnia 01 lipca 2026r.
                                                                        II ZASTĘPCA
                                                                     PREZYDENTA MIASTA

                                                                      /-/ Robert Rzepnicki`;

const DZ_478_RESULT = `Zgodnie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu
przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021r. poz. 2213) podaje,-

                        informację o wyniku przetargu ustnego nieograniczonego.

Na dzień 25 czerwca 2026 roku o godz. 1000 w siedzibie Urzędu Miasta Bolesławiec, w sali nr 412 Pl.
Piłsudskiego nr 1 (IV piętro) – został wyznaczony termin I przetargu ustnego nieograniczonego
- na sprzedaż nieruchomości gruntowej zabudowanej, stanowiącej własność Gminy Miejskiej Bolesławiec,
oznaczonej w ewidencji gruntów jako działka nr 478, położonej w Bolesławcu w obrębie 0008 miasta
Bolesławiec.

                                                            I przetarg na działkę nr 478
                            Nr działki                                  478
     Oznaczenie
   nieruchomości     Powierzchnia działki (ha)                        0,0703
    wg katastru
                    Rodzaj użytku gruntowego                Tereny mieszkaniowe ( B ),
   nieruchomości
                      wg ewidencji gruntów
                            Położenie             ul. Plac Piastowski, Obręb: 0008-Bolesławiec-08
      Oznaczenie nieruchomości wg księgi
                                                                JG1B/00014967/7
                  wieczystej
    Liczba osób dopuszczonych do przetargu                               0
  Liczba osób niedopuszczonych do przetargu                            brak
            Cena wywoławcza brutto                                 499.000,00 zł

     Najwyższa cena osiągnięta w przetargu
                                                                         0
                    brutto
            Nabywca nieruchomości                                      brak

JP/JP
Bolesławiec, dnia 03 lipca 2026r.
                                                                I ZASTĘPCA
                                                            PREZYDENTA MIASTA

                                                        /-/ Renata Szewczyk-Sacher`;

const SRC = (id) => `https://www.um.boleslawiec.bip-gov.pl/public/getFile?id=${id}`;


test('result: prose lokal (Warszawska 1/10) — round III, negatywny', () => {
  const r = parseResultDoc(WARSZAWSKA_RESULT, null, SRC(251418));
  assert.equal(r.length, 1);
  const x = r[0];
  assert.equal(x.kind, 'mieszkalny');
  assert.equal(x.address_raw, 'Warszawskiej 1/10');
  assert.equal(x.address.key, 'warszawskiej|1|10');
  assert.equal(x.address.building, '1');
  assert.equal(x.address.apt, '10');
  assert.equal(x.round, 3);
  assert.equal(x.auction_date, '2026-06-18');
  assert.equal(x.starting_price_pln, 350000);
  assert.equal(x.final_price_pln, null);
  assert.equal(x.outcome, 'unsold');
  assert.equal(x.unsold_reason, 'brak wpłaty wadium');
  assert.equal(x.area_m2, 97.1);
  assert.deepEqual(x.notes, []);
  assert.equal(x.source_pdf, SRC(251418));
});


test('result: plot niezabudowana (dz 23/1) — round I, 0 uczestników', () => {
  const r = parseResultDoc(DZ_23_1_RESULT, null, SRC(251548));
  assert.equal(r.length, 1);
  const x = r[0];
  assert.equal(x.kind, 'grunt');
  assert.equal(x.dzialka_nr, '23/1');
  assert.equal(x.obreb, '0001');
  assert.equal(x.area_m2, 5540);
  assert.equal(x.address_raw, 'ul. Tadeusza Kościuszki');
  assert.equal(x.auction_date, '2026-06-23');
  assert.equal(x.round, 1);
  assert.equal(x.starting_price_pln, 570000);
  assert.equal(x.final_price_pln, null);
  assert.equal(x.outcome, 'unsold');
  assert.equal(x.unsold_reason, 'brak uczestników');
});

test('result: plot zabudowana (dz 478) — round I, 0 uczestników', () => {
  const r = parseResultDoc(DZ_478_RESULT, null, SRC(251620));
  assert.equal(r.length, 1);
  const x = r[0];
  assert.equal(x.kind, 'grunt');
  assert.equal(x.dzialka_nr, '478');
  assert.equal(x.obreb, '0008');
  assert.equal(x.area_m2, 703);
  assert.equal(x.address_raw, 'ul. Plac Piastowski');
  assert.equal(x.auction_date, '2026-06-25');
  assert.equal(x.round, 1);
  assert.equal(x.starting_price_pln, 499000);
  assert.equal(x.outcome, 'unsold');
  assert.equal(x.unsold_reason, 'brak uczestników');
});


test('result: non-result text returns no records', () => {
  assert.deepEqual(parseResultDoc('Zwykły tekst bez wyniku przetargu.', null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
});


test('parsePLN: spaced/dotted thousands + trailing ",-"', () => {
  assert.equal(parsePLN('350.000,-'), 350000);
  assert.equal(parsePLN('570.000,00'), 570000);
});

test('parseAreaNum: comma decimal', () => {
  assert.equal(parseAreaNum('97,10'), 97.1);
});

test('haToM2: hectares → m² (rounded), null-safe', () => {
  assert.equal(haToM2(0.5540), 5540);
  assert.equal(haToM2(0.0703), 703);
  assert.equal(haToM2(null), null);
});

test('roundFromText: roman I/III', () => {
  assert.equal(roundFromText('termin III przetargu ustnego'), 3);
  assert.equal(roundFromText('I przetarg na działkę'), 1);
});

test('polishDateToIso: "18 czerwca 2026 r." → ISO', () => {
  assert.equal(polishDateToIso('18 czerwca 2026 r.'), '2026-06-18');
});
