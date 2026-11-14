import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isResultNotice,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/chelm/parse.js';


test('isSkippableTitle: wykaz, najem, odwołanie, zamiar wszczęcia, sprostowanie', () => {
  assert.equal(isSkippableTitle('WYKAZ NIERUCHOMOŚCI PRZEZNACZONYCH DO SPRZEDAŻY'), true);
  assert.equal(isSkippableTitle('Wykaz nieruchomości przeznaczonych do zbycia w drodze przetargu'), true);
  assert.equal(isSkippableTitle('Ogłoszenia od 2013r. lokal najem'), true);
  assert.equal(isSkippableTitle('Informacja o odwołaniu przetargu.'), true);
  assert.equal(isSkippableTitle('Ogłoszenie o zamiarze wszczęcia postępowania administracyjnego'), true);
  assert.equal(isSkippableTitle('Sprostowanie ogłoszenia o przetargu'), true);
  assert.equal(isSkippableTitle('Prezydent Miasta Chełm ogłasza III ustny nieograniczony przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego'), false);
  assert.equal(isSkippableTitle('Prezydent Miasta Chełm ogłasza przetarg na sprzedaż nieruchomości niezabudowanej'), false);
});

test('isResultTitle: informacja o wyniku/odwołaniu', () => {
  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isResultTitle('Informacja o odwołaniu przetargu.'), true);
  assert.equal(isResultTitle('Prezydent Miasta Chełm ogłasza III ustny przetarg na sprzedaż lokalu'), false);
});

test('isAnnouncementTitle: przetarg + sprzedaż / nieruchomość', () => {
  assert.equal(isAnnouncementTitle('Prezydent Miasta Chełm ogłasza III ustny nieograniczony przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego'), true);
  assert.equal(isAnnouncementTitle('Prezydent Miasta Chełm ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej'), true);
  assert.equal(isAnnouncementTitle('WYKAZ NIERUCHOMOŚCI PRZEZNACZONYCH DO SPRZEDAŻY'), false);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu'), false);
});


test('isResultNotice: detects result body from both result PDF fixtures', () => {
  assert.equal(
    isResultNotice('INFORMACJA Stosownie do § 12 Rozporządzenia … odbył się przetarg ustny nieograniczony … wadium w wymaganej wysokości wpłaciło 11 osób … w przetargu osiągnięto cenę 64.030,00 zł'),
    true,
  );
  assert.equal(
    isResultNotice('INFORMACJA O WYNIKU przetargu ustnego nieograniczonego na sprzedaż nieruchomości'),
    true,
  );
  assert.equal(
    isResultNotice('OGŁOSZENIE O PRZETARGU Prezydent Miasta Chełm ogłasza III ustny nieograniczony przetarg'),
    false,
  );
});


test('roundFromText: word ordinal + Roman numeral prefix', () => {
  assert.equal(roundFromText('III ustny nieograniczony przetarg na sprzedaż'), 3);
  assert.equal(roundFromText('I ustny przetarg nieograniczony'), 1);
  assert.equal(roundFromText('drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('ogłasza trzeci przetarg'), 3);
  assert.equal(roundFromText('bez numeru rundy'), null);
});


test('auctionDateFromText: Polish long-form date from announcement', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w Urzędzie Miasta Chełm przy ul. Lubelskiej 65 w Sali Konferencyjnej nr 1 w dniu 20 lipca 2026r. o godz. 11'),
    '2026-07-20',
  );
  assert.equal(auctionDateFromText('dnia 2 września 2019 r. o godzinie 10:00'), '2019-09-02');
  assert.equal(auctionDateFromText('odbędzie się 15 marca 2025 roku'), '2025-03-15');
  assert.equal(auctionDateFromText('brak daty w tekście'), null);
});


test('resultDateFromText: numeric and long-form date from result notice', () => {
  assert.equal(resultDateFromText('w dniu 21.06.2021 roku w Urzędzie Miasta Chełm przy ul. Lubelskiej 65 odbył się przetarg'), '2021-06-21');
  assert.equal(resultDateFromText('w dniu 14 września 2020 roku w Urzędzie'), '2020-09-14');
  assert.equal(resultDateFromText('brak pasującej frazy'), null);
});


test('startingPriceFromText: Chełm dot-thousands format', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza spółdzielczego własnościowego prawa do lokalu wynosi 278.350,00zł'), 278350);
  assert.equal(startingPriceFromText('cena wywoławcza (brutto) nieruchomości wynosiła 33.300,00zł,'), 33300);
  assert.equal(startingPriceFromText('cena wywoławcza wynosi 159 000,00 zł'), 159000);
  assert.equal(startingPriceFromText('brak ceny'), null);
});

test('achievedPriceFromText: "osiągnięto cenę" form from result notice', () => {
  assert.equal(achievedPriceFromText('w przetargu osiągnięto cenę 64.030,00 zł,'), 64030);
  assert.equal(achievedPriceFromText('Cena osiągnięta w przetargu: 100.000,00 zł'), 100000);
  assert.equal(achievedPriceFromText('brak ceny osiągniętej'), null);
});


const ANN_WOLYNSKA = `                           OGŁOSZENIE O PRZETARGU

    Prezydent Miasta Chełm ogłasza III ustny nieograniczony przetarg
      na sprzedaż spółdzielczego własnościowego prawa do lokalu
                 mieszkalnego, położonego w Chełmie
                      przy ul. Wołyńskiej 65 A / 5.

   1. Do sprzedaży w trybie przetargu nieograniczonego przeznaczone jest spółdzielcze
       własnościowe prawo do lokalu mieszkalnego położonego w Chełmie przy ul.
       Wołyńskiej 65 A / 5.
   8. Lokal mieszkalny nr 5 położony jest na II piętrze, składa się z dwóch pokoi, kuchni, łazienki,
       wc i przedpokoju o powierzchni użytkowej 51,50m2. Lokal posiada balkon.
   12. Cena wywoławcza spółdzielczego własnościowego prawa do lokalu wynosi 278.350,00zł
       (słownie: dwieście siedemdziesiąt osiem tysięcy trzysta pięćdziesiąt złotych).
   14. Przetarg odbędzie się w Urzędzie Miasta Chełm przy ul. Lubelskiej 65 w Sali
       Konferencyjnej nr 1 w dniu 20 lipca 2026r. o godz. 1100.`;

test('parseAnnouncement: Wołyńska 65A/5 flat — address/area/price/date/round/kind', () => {
  const r = parseAnnouncement(ANN_WOLYNSKA);
  assert.ok(r, 'a record is returned');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Wołyńskiej 65A/5');
  assert.equal(r.address.key, 'wolynskiej|65A|5');
  assert.equal(r.area_m2, 51.5);
  assert.equal(r.starting_price_pln, 278350);
  assert.equal(r.auction_date, '2026-07-20');
  assert.equal(r.round, 3);
});

test('parseAnnouncement: returns null for non-address text', () => {
  assert.equal(parseAnnouncement('Na podstawie art. 35 ustawy przeznaczam do zbycia lokal.'), null);
  assert.equal(parseAnnouncement(''), null);
  assert.equal(parseAnnouncement(null), null);
});


const RESULT_STEPHENSONA = `MIASTO CHEŁM
ul. Lubelska 65
22-100 CHEŁM

DAGI-N-I.7125.1.15.2021

                                     INFORMACJA

       Stosownie do § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004r.
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (Dz. U. z 2014r., poz. 1490 z późn. zm.) podaję do publicznej wiadomości,
że w dniu 21.06.2021 roku w Urzędzie Miasta Chełm przy ul. Lubelskiej 65 odbył się
przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2A, stanowiącego
własność   Miasta      Chełm,   położonego   w     budynku   wielorodzinnym   w   Chełmie
przy ul. G. Stephensona 4, stanowiącego własność Miasta Chełm.
      cena wywoławcza (brutto) nieruchomości wynosiła 33.300,00zł,
      postąpienie minimalne określono na kwotę 340,00zł,
      w podanym w ogłoszeniu terminie, tj. do dnia 16.06.2021r., wadium w wymaganej
       wysokości wpłaciło 11 osób,
      do przetargu dopuszczono 9 uczestników,
      w przetargu osiągnięto cenę 64.030,00 zł,
      przetarg wygrała Pani Marta Artel.

Chełm, dnia 29.06.2021r.`;

test('parseResultDoc: Stephensona 4/2A — sold, prices, date, address', () => {
  const results = parseResultDoc(
    RESULT_STEPHENSONA,
    null,
    'https://umchelm.bip.lubelskie.pl/upload/pliki/INFORMACJA_O_WYNIKACH_PRZETARGU.pdf',
  );
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 33300);
  assert.equal(r.final_price_pln, 64030);
  assert.equal(r.auction_date, '2021-06-21');
  assert.equal(r.address_raw, 'ul. G. Stephensona 4/2A');
  assert.equal(r.address.key, 'g stephensona|4|2A');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.source_pdf, 'https://umchelm.bip.lubelskie.pl/upload/pliki/INFORMACJA_O_WYNIKACH_PRZETARGU.pdf');
});

test('parseResultDoc: non-result body returns []', () => {
  assert.deepEqual(parseResultDoc('OGŁOSZENIE O PRZETARGU przy ul. Wołyńskiej 65A/5.', null, 'http://x'), []);
  assert.deepEqual(parseResultDoc('', null, 'http://x'), []);
});

test('parseResultDoc: uses fallbackDate when result date absent', () => {
  const textNoDate = RESULT_STEPHENSONA.replace(/w dniu 21\.06\.2021 roku/g, '');
  const results = parseResultDoc(
    textNoDate,
    '2021-06-29',
    'https://umchelm.bip.lubelskie.pl/upload/pliki/INFORMACJA_O_WYNIKACH_PRZETARGU.pdf',
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].auction_date, '2021-06-29');
});
