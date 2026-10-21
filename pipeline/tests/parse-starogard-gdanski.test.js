// Starogard Gdański parser unit tests.
// Tests groundtruthed against real municipal documents from Starogard Gdański:
// 1. Municipal Wykaz board (starogard.pl/informacje-o-nieruchomosciach.html):
//    - Zarządzenie Nr 450/11/2020: ul. Chojnicka 45 (94.98 m², udział 77/128)
//    - Zarządzenie Nr 375/09/2020: ul. Osiedlowa 5B/3 (33.45 m², udział 3/4)
//    - Zarządzenie Nr 74/03/2021:  ul. Skarszewska 2C/14 (49.02 m²) & ul. Piłsudskiego 10/8 (49.08 m²)
//    - Zarządzenie Nr 494/11/2024: ul. Wybickiego 6/5 (58.06 m²)
//    - Filtering: bezprzetargowo (ul. Chojnicka 28/2, ul. ks. Ściegiennego 3A/18) and dzierżawa
// 2. Official BIP Oral Auction Announcements (bip.starogard.pl):
//    - Kopernika 32C/2 (PDF 66179): I przetarg, 29.05 m², 120 000 zł, auction 2026-07-22
//    - Traugutta garage (PDF 66873): I przetarg, 15.65 m², 50 000 zł, KW GD1A/00024974/9
// 3. Official BIP Result Notices (bip.starogard.pl):
//    - ul. Chabrowa (PDF 67283): sold parcels (70/98 & 70/99)
//    - ul. Skarszewska (PDF 67437): unsold parcels (3/37 to 3/43, brak uczestnictwa)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/cities/starogard-gdanski/config.js';
import {
  polishDateToISO,
  roundFromStarogardText,
  kwFromText,
  parseWykazBoard,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/starogard-gdanski/parse.js';

// ---------------------------------------------------------------------------
// 0. Config verification
// ---------------------------------------------------------------------------

test('config: exports required metadata matching official assignment', () => {
  assert.equal(config.id, 'starogard-gdanski');
  assert.equal(config.teryt, '2213031');
  assert.equal(config.label, 'Starogard Gdański');
  assert.equal(config.voivodeship, 'pomorskie');
  assert.equal(config.authority, 'Prezydent Miasta Starogard Gdański');
  assert.equal(config.host, 'starogard.pl');
  assert.equal(config.source, 'html');
});

// ---------------------------------------------------------------------------
// 1. Helper utilities
// ---------------------------------------------------------------------------

test('polishDateToISO: parses Polish spelled and numeric dates', () => {
  assert.equal(polishDateToISO('16 listopada 2020 r.'), '2020-11-16');
  assert.equal(polishDateToISO('2 marca 2021 r.'), '2021-03-02');
  assert.equal(polishDateToISO('22 lipca 2026 r.'), '2026-07-22');
  assert.equal(polishDateToISO('15.04.2026'), '2026-04-15');
});

test('roundFromStarogardText: detects ordinals and roman numerals', () => {
  assert.equal(roundFromStarogardText('I PRZETARG USTNY NIEOGRANICZONY'), 1);
  assert.equal(roundFromStarogardText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromStarogardText('III przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromStarogardText('IV przetarg ustny nieograniczony'), 4);
  assert.equal(roundFromStarogardText('V przetarg ustny'), 5);
  assert.equal(roundFromStarogardText('INFORMUJE O WYNIKU PIERWSZEGO PRZETARGU'), 1);
  assert.equal(roundFromStarogardText('INFORMUJE O WYNIKU DRUGIEGO PRZETARGU'), 2);
  assert.equal(roundFromStarogardText('INFORMUJE O WYNIKU TRZECIEGO PRZETARGU'), 3);
});

test('kwFromText: extracts structured and standard KW patterns', () => {
  assert.equal(kwFromText('w księdze wieczystej nr GD1A/00034382/5 wpisano'), 'GD1A/00034382/5');
  assert.equal(kwFromText('działka nr 379... obręb 17 - KW 11710, zbycie'), '11710');
  assert.equal(kwFromText('KW lokalu 48478, przynależny'), '48478');
});

// ---------------------------------------------------------------------------
// 2. Municipal Wykaz board (starogard.pl/informacje-o-nieruchomosciach.html)
// ---------------------------------------------------------------------------

const WYKAZ_FIXTURE_CHOJNICKA = `
<div class="site wysiwyg -clearafter">
<p>Prezydent Miasta Starogard Gdański informuje, że 16 listopada 2020 r. wydane zostało:
Zarządzenie Nr 450/11/2020 w sprawie ogłoszenia wykazu nieruchomości przeznaczonej do zbycia w drodze przetargu,
obejmujące 1 pozycję: 1) ul. Chojnicka 45 - lokal mieszkalny na I piętrze o pow. użytk. 94,98 m² - KW 12385,
działka nr 379 o pow. 437 m² w przynależnym udziale 77/128, obręb 17 - KW 11710,
zbycie w drodze przetargu ustnego nieograniczonego.
Dnia 23 listopada 2020 r. wydane zostało: Zarządzenie Nr 455/11/2020 w sprawie ogłoszenia wykazu nieruchomości przeznaczonych do zbycia...</p>
</div>
`;

test('parseWykazBoard: extracts ul. Chojnicka 45 with correct area and share', () => {
  const records = parseWykazBoard(WYKAZ_FIXTURE_CHOJNICKA);
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Chojnicka 45');
  assert.equal(r.address.key, 'chojnicka|45|');
  assert.equal(r.address.street, 'Chojnicka');
  assert.equal(r.address.building, '45');
  assert.equal(r.area_m2, 94.98);
  assert.equal(r.wykaz_no, '450/11/2020');
  assert.equal(r.published_date, '2020-11-16');
  assert.equal(r.share, '77/128');
  assert.equal(r.kw, '12385');
  assert.equal(r.dzialka_nr, '379');
  assert.equal(r.obreb, '17');
});

const WYKAZ_FIXTURE_OSIEDLOWA = `
<div class="site wysiwyg -clearafter">
<p>Prezydent Miasta Starogard Gdański informuje, że 15 i 16 września 2020 r. wydane zostały:
Zarządzenie Nr 374/09/2020 w sprawie ogłoszenia wykazu nieruchomości przeznaczonej do oddania w dzierżawę obejmujące 1 pozycję:
os. 800-lecia - część działki nr 154/365 o pow. ~2,2 m², obręb 23, KW 50982, pod pojemniki do segregacji odpadów;
Zarządzenie Nr 375/09/2020 w sprawie ogłoszenia wykazu nieruchomości przeznaczonej do zbycia w drodze przetargu obejmujące 1 pozycję:
ul. Osiedlowa 5B/3 - lokal mieszkalny o pow.użytk. 33,45 m² w udziale 3/4 części, na parterze, KW lokalu 48478,
przynależny udział 0,0284 w działce nr 364/1 o pow. 416 m², obręb 13, KW 29522;
Zarządzenie Nr 376/09/2020 w sprawie przeznaczenia do sprzedaży nieruchomości gruntowej dotychczasowym użytkownikom wieczystym...</p>
</div>
`;

test('parseWykazBoard: extracts ul. Osiedlowa 5B/3 and filters out dzierżawa', () => {
  const records = parseWykazBoard(WYKAZ_FIXTURE_OSIEDLOWA);
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Osiedlowa 5B/3');
  assert.equal(r.address.key, 'osiedlowa|5B|3');
  assert.equal(r.address.street, 'Osiedlowa');
  assert.equal(r.address.building, '5B');
  assert.equal(r.address.apt, '3');
  assert.equal(r.area_m2, 33.45);
  assert.equal(r.wykaz_no, '375/09/2020');
  assert.equal(r.published_date, '2020-09-16');
  assert.equal(r.share, '3/4');
  assert.equal(r.kw, '48478');
  assert.equal(r.dzialka_nr, '364/1');
  assert.equal(r.obreb, '13');
});

const WYKAZ_FIXTURE_MULTI = `
<div class="site wysiwyg -clearafter">
<p>Prezydent Miasta Starogard Gdański informuje, że 2 marca 2021 r. wydane zostało
Zarządzenie Nr 74/03/2021 w sprawie ogłoszenia wykazu nieruchomości przeznaczonych do zbycia w drodze przetargu , obejmujące 2 pozycje:
1) ul. Skarszewska 2C/14 - lokal mieszkalny o pow. użytk. 49,02 m², udział przynależny 0,0909 w działce nr 390/8 o pow. 210 m², obręb 13, KW 33526,
2) ul. Piłsudskiego 10/8 - lokal mieszkalny o pow. użytk. 49,08 m², udział przynależny 0,0480 w działkach nr: 19/1 i 20/9 o łącznej pow. 424 m², obręb 17, KW 31643.
Zarządzenia podlegają podaniu do publicznej wiadomości przez wywieszenie na tablicy ogłoszeń Urzędu Miasta na okres 21 dni...</p>
</div>
`;

test('parseWykazBoard: extracts multiple positions (Skarszewska 2C/14 and Piłsudskiego 10/8)', () => {
  const records = parseWykazBoard(WYKAZ_FIXTURE_MULTI);
  assert.equal(records.length, 2);

  const [skarszewska, pilsudski] = records;

  assert.equal(skarszewska.kind, 'mieszkalny');
  assert.equal(skarszewska.address_raw, 'ul. Skarszewska 2C/14');
  assert.equal(skarszewska.address.key, 'skarszewska|2C|14');
  assert.equal(skarszewska.area_m2, 49.02);
  assert.equal(skarszewska.wykaz_no, '74/03/2021');
  assert.equal(skarszewska.published_date, '2021-03-02');
  assert.equal(skarszewska.kw, '33526');
  assert.equal(skarszewska.dzialka_nr, '390/8');
  assert.equal(skarszewska.obreb, '13');

  assert.equal(pilsudski.kind, 'mieszkalny');
  assert.equal(pilsudski.address_raw, 'ul. Piłsudskiego 10/8');
  assert.equal(pilsudski.address.key, 'pilsudskiego|10|8');
  assert.equal(pilsudski.area_m2, 49.08);
  assert.equal(pilsudski.wykaz_no, '74/03/2021');
  assert.equal(pilsudski.published_date, '2021-03-02');
  assert.equal(pilsudski.kw, '31643');
  assert.equal(pilsudski.dzialka_nr, '19/1, 20/9');
  assert.equal(pilsudski.obreb, '17');
});

const WYKAZ_FIXTURE_WYBICKIEGO = `
<div class="site wysiwyg -clearafter">
<p>Prezydent Miasta Starogard Gdański informuje, że 26 listopada 2024 r. wydane zostały:
1) Zarządzenie Nr 494/11/2024 w sprawie ogłoszenia wykazu nieruchomości przeznaczonej do zbycia w drodze przetargu, obejmujące 1 pozycję:
ul. Wybickiego 6/5 - lokal mieszkalny o pow. użytk. 58,06 m 2na II piętrze, działki nr: 404/1, 406/1 o łącznej pow. 337 m2 , obręb 13, KW 33369/1,
udział przynależny 0,1329 części w gruncie...</p>
</div>
`;

test('parseWykazBoard: extracts 2024 auction wykaz ul. Wybickiego 6/5', () => {
  const records = parseWykazBoard(WYKAZ_FIXTURE_WYBICKIEGO);
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Wybickiego 6/5');
  assert.equal(r.address.key, 'wybickiego|6|5');
  assert.equal(r.area_m2, 58.06);
  assert.equal(r.wykaz_no, '494/11/2024');
  assert.equal(r.published_date, '2024-11-26');
  assert.equal(r.kw, '33369/1');
});

const WYKAZ_FIXTURE_BEZPRZETARG = `
<div class="site wysiwyg -clearafter">
<p>Zarządzenie Nr 30/01/2020 w sprawie ogłoszenia wykazu lokalu mieszkalnego przeznaczonego do sprzedaży w drodze bezprzetargowej,
obejmujące 1 pozycję: 1) ul. Chojnicka 28/2 - działka nr 107/1 o pow. 897 m², obręb 17, KW 60073,
udział przynależny 0,3543 części, zbycie bezprzetargowe na rzecz najemcy lokalu.</p>
<p>Zarządzenie Nr 144/04/2025 w sprawie ogłoszenia wykazu lokali mieszkalnych przeznaczonych do sprzedaży w drodze bezprzetargowej
obejmujące 1 pozycję: ul. ks. Piotra Ściegiennego 3A/18 - działka nr 43/14 pow. 268 m2, obręb 18, KW 30020, zbycie na rzecz najemcy.</p>
</div>
`;

test('parseWykazBoard: rejects non-auction (bezprzetargowe na rzecz najemcy) sales', () => {
  const records = parseWykazBoard(WYKAZ_FIXTURE_BEZPRZETARG);
  assert.equal(records.length, 0);
});

// ---------------------------------------------------------------------------
// 3. Official BIP Oral Auction Announcements (PDF text)
// ---------------------------------------------------------------------------

const ANNOUNCEMENT_PDF_KOPERNIKA = `
Na podstawie art. 38 ust. 1 i 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U.
z 2026 r. poz. 399) oraz § 6 ust. 1 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r.
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U.
z 2021 r. poz. 2213)
                            Prezydent Miasta Starogard Gdański ogłasza
                     I PRZETARG USTNY NIEOGRANICZONY
na sprzedaż lokalu mieszkalnego nr 2 położonego w Starogardzie Gdańskim przy ulicy
Mikołaja Kopernika 32C, zlokalizowanego na parterze budynku, znajdującego się na działce
oznaczonej w ewidencji nieruchomości nr 154/331, obręb 23, o powierzchni 1 265 m2, dla której
w Sądzie Rejonowym w Starogardzie Gdańskim prowadzona jest księga wieczysta
GD1A/00034382/5:

    Powierzchnia                Udział w gruncie         Cena                            Postąpienie
                        Ilość                                            Wadium
  użytkowa lokalu                i w częściach         wywoławcza                        minimalne
                        pokoi                                             w zł
   i piwnicy w m2                  wspólnych              w zł                              w zł
           1               2             3                   4                5               6

    29,05 + 5,92           1         0,0195            120 000,00        12 000,00        1 200,00

Mieszkanie będzie można oglądać: 3 lipca 2026 r. w godz. 1300-1330.

Przetarg odbędzie się dnia 22 lipca 2026 r. (środa) w sali nr 101 Urzędu Miasta Starogard Gdański
ul. Gdańska 6 o godz. 1200. Wadium w pieniądzu należy wnieść najpóźniej do 16 lipca 2026 r.
`;

test('parseAnnouncement: parses Kopernika 32C/2 oral flat auction announcement', () => {
  const parsed = parseAnnouncement(ANNOUNCEMENT_PDF_KOPERNIKA, {
    title: 'I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego - ul. Mikołaja Kopernika 32C/2',
    detail_url: 'https://bip.starogard.pl/a,27442.html',
    source_url: 'https://bip.starogard.pl/api/files/66179',
  });

  assert.ok(parsed);
  assert.equal(parsed.kind, 'mieszkalny');
  assert.equal(parsed.round, 1);
  assert.equal(parsed.address_raw, 'ul. Mikołaja Kopernika 32C/2');
  assert.equal(parsed.address.key, 'mikolaja kopernika|32C|2');
  assert.equal(parsed.area_m2, 29.05);
  assert.equal(parsed.starting_price_pln, 120000);
  assert.equal(parsed.auction_date, '2026-07-22');
  assert.equal(parsed.wadium_deadline, '2026-07-16');
  assert.equal(parsed.viewing_date, '2026-07-03');
  assert.equal(parsed.kw, 'GD1A/00034382/5');
  assert.equal(parsed.dzialka_nr, '154/331');
  assert.equal(parsed.obreb, '23');
});

const ANNOUNCEMENT_PDF_TRAUGUTTA_GARAGE = `
                    Prezydent Miasta Starogard Gdański ogłasza
                    I PRZETARG USTNY NIEOGRANICZONY
na sprzedaż nieruchomości zabudowanej garażem murowanym o powierzchni użytkowej
garażu 15,65 m2 położonej w Starogardzie Gdańskim przy ulicy Romualda Traugutta –
działka nr 4/163 w obrębie 12 o powierzchni 20 m2 (księga wieczysta nr GD1A/00024974/9)
cena wywoławcza (zwolniony z podatku VAT) – 50 000,00 zł
wadium w wysokości 5 000,00 zł
`;

test('parseAnnouncement: parses garage auction at ul. Romualda Traugutta', () => {
  const parsed = parseAnnouncement(ANNOUNCEMENT_PDF_TRAUGUTTA_GARAGE, {
    title: 'I przetarg ustny nieograniczony na sprzedaż garażu murowanego przy ul. Romualda Traugutta',
  });

  assert.ok(parsed);
  assert.equal(parsed.kind, 'garaz');
  assert.equal(parsed.round, 1);
  assert.equal(parsed.address_raw, 'ul. Romualda Traugutta');
  assert.equal(parsed.area_m2, 15.65);
  assert.equal(parsed.starting_price_pln, 50000);
  assert.equal(parsed.kw, 'GD1A/00024974/9');
  assert.equal(parsed.dzialka_nr, '4/163');
  assert.equal(parsed.obreb, '12');
});

// ---------------------------------------------------------------------------
// 4. Official BIP Result Notices (PDF text)
// ---------------------------------------------------------------------------

const RESULT_PDF_CHABROWA = `
Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu
przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213)

                                  Prezydent Miasta Starogard Gdański
            INFORMUJE O WYNIKU PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO
      przeprowadzonego w dniu 16 września 2026 r. w Urzędzie Miasta Starogard Gdański, ul. Gdańska 6

          na sprzedaż działek niezabudownych położonych w Starogardzie Gdańskim przy ul. Chabrowej,
                            KW GD1A/00030436/1, obr. 28, według wykazu w tabelce:

                         Pow.        Liczba osób                     Najwyższa cena     Imię i nazwisko osoby
             Nr                                          Cena
Lp.                     działki    dopuszczonych /                    osiągnięta w     ustalonej jako nabywca
           działki                                    wywoławcza
                         w m2     niedopuszczonych                      przetargu          nieruchomości

 1            2            3             4                 5                6                     7

 1.         70/98        850            1/0            85 000,00      85 850,00           Łukasz Wroński

 2.         70/99        818            1/0            70 000,00      70 700,00           Łukasz Wroński


Informacja podlega wywieszeniu w Urzędzie Miasta Starogard Gdański...
`;

test('parseResultDoc: parses concluded sold auction protocol (ul. Chabrowa)', () => {
  const records = parseResultDoc(RESULT_PDF_CHABROWA, null, 'https://bip.starogard.pl/api/files/67283');
  assert.equal(records.length, 2);

  const [r1, r2] = records;

  assert.equal(r1.auction_date, '2026-09-16');
  assert.equal(r1.round, 1);
  assert.equal(r1.kind, 'grunt');
  assert.equal(r1.dzialka_nr, '70/98');
  assert.equal(r1.obreb, '28');
  assert.equal(r1.area_m2, 850);
  assert.equal(r1.starting_price_pln, 85000);
  assert.equal(r1.final_price_pln, 85850);
  assert.equal(r1.outcome, 'sold');
  assert.equal(r1.unsold_reason, null);
  assert.equal(r1.kw, 'GD1A/00030436/1');
  assert.equal(r1.address_raw, 'ul. Chabrowa');

  assert.equal(r2.auction_date, '2026-09-16');
  assert.equal(r2.round, 1);
  assert.equal(r2.kind, 'grunt');
  assert.equal(r2.dzialka_nr, '70/99');
  assert.equal(r2.obreb, '28');
  assert.equal(r2.area_m2, 818);
  assert.equal(r2.starting_price_pln, 70000);
  assert.equal(r2.final_price_pln, 70700);
  assert.equal(r2.outcome, 'sold');
  assert.equal(r2.unsold_reason, null);
  assert.equal(r2.kw, 'GD1A/00030436/1');
  assert.equal(r2.address_raw, 'ul. Chabrowa');
});

const RESULT_PDF_SKARSZEWSKA_UNSOLD = `
                                       Prezydent Miasta Starogard Gdański
              INFORMUJE O WYNIKU PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO
     przeprowadzonego w dniu 30 września 2026 r. w Urzędzie Miasta Starogard Gdański, ul. Gdańska 6
na sprzedaż działek niezabudowanych położonych w Starogardzie Gdańskim, KW GD1A/00030239/0, obr. 1, według
wykazu w tabelce :
                                                                     Najwyższa cena
                                           Cena                                                 Imię i nazwisko
                                                       Liczba osób    osiągnięta w
      Nr    Pow. w                     wywoławcza w                                             osoby ustalonej
Lp.                      Położenie                   dopuszczonych / przetargu w zł
    działki   m2                        zł (zawiera                                              jako nabywca
                                                    niedopuszczonych   (w tym 23%
                                         23% VAT)                                               nieruchomości
                                                                          VAT)
 1      2         3           4              5                  6                   7                   8
                              ul.
1.     3/37      7 236                  1 065 000,00         ———                 ———            brak uczestnictwa
                         Skarszewska

                              ul.
2.     3/38      7 200                  1 060 000,00         ———                 ———            brak uczestnictwa
                         Skarszewska
`;

test('parseResultDoc: parses negative / unsold auction protocol (brak uczestnictwa)', () => {
  const records = parseResultDoc(RESULT_PDF_SKARSZEWSKA_UNSOLD, null, 'https://bip.starogard.pl/api/files/67437');
  assert.equal(records.length, 2);

  const [r1, r2] = records;

  assert.equal(r1.auction_date, '2026-09-30');
  assert.equal(r1.round, 1);
  assert.equal(r1.kind, 'grunt');
  assert.equal(r1.dzialka_nr, '3/37');
  assert.equal(r1.area_m2, 7236);
  assert.equal(r1.starting_price_pln, 1065000);
  assert.equal(r1.final_price_pln, null);
  assert.equal(r1.outcome, 'unsold');
  assert.equal(r1.unsold_reason, 'no_bidders');
  assert.equal(r1.kw, 'GD1A/00030239/0');
  assert.equal(r1.obreb, '1');

  assert.equal(r2.dzialka_nr, '3/38');
  assert.equal(r2.area_m2, 7200);
  assert.equal(r2.starting_price_pln, 1060000);
  assert.equal(r2.final_price_pln, null);
  assert.equal(r2.outcome, 'unsold');
  assert.equal(r2.unsold_reason, 'no_bidders');
});
