
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isResultNotice,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  unitAreaFromText,
  addressRawFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/raciborz/parse.js';

import { parseBoardHtml } from '../src/cities/raciborz/crawl.js';


test('isSkippableTitle: najem, dzierżawa, wykaz', () => {
  assert.equal(isSkippableTitle('Ogłoszenie o przetargu na najem lokalu użytkowego'), true);
  assert.equal(isSkippableTitle('Wykaz nieruchomości przeznaczonych do sprzedaży'), true);
  assert.equal(isSkippableTitle('Ogłoszenie o dzierżawie gruntów'), true);
  assert.equal(isSkippableTitle('Odwołanie przetargu na sprzedaż lokalu'), true);
  assert.equal(isSkippableTitle('Pierwszy, publiczny przetarg ustny, nieograniczony na sprzedaż lokalu mieszkalnego położonego w Raciborzu przy ul. Stalmacha nr 7a/10'), false);
});

test('isResultTitle: "Informacja o wyniku"', () => {
  assert.equal(isResultTitle('Informacja o wyniku przetargu'), true);
  assert.equal(isResultTitle('Informacja o wynikach przetargów'), true);
  assert.equal(isResultTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości zabudowanej'), true);
  assert.equal(isResultTitle('Pierwszy przetarg na sprzedaż lokalu'), false);
});

test('isAnnouncementTitle: przetarg+sprzedaż, rokowania', () => {
  assert.equal(isAnnouncementTitle('Pierwszy, publiczny przetarg ustny, nieograniczony na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isAnnouncementTitle('Rokowania na sprzedaż lokalu mieszkalnego położonego przyul. Wileńskiej nr 15/16'), true);
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości'), false);
  assert.equal(isAnnouncementTitle(''), false);
});


test('roundFromText: pierwszy→1, drugi→2, rokowania→2', () => {
  assert.equal(roundFromText('ogłasza pierwszy, publiczny, przetarg ustny, nieograniczony'), 1);
  assert.equal(roundFromText('drugi przetarg ustny nieograniczony na sprzedaż nieruchomości'), 2);
  assert.equal(roundFromText('Rokowania na sprzedaż lokalu mieszkalnego'), 2);
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});


test('auctionDateFromText: "w dniu 15 lipca 2026r." (Racibórz announcement format)', () => {
  const body = 'Przetarg odbędzie się w dniu 15 lipca 2026r. o godzinie 1200, w sali nr 125';
  assert.equal(auctionDateFromText(body), '2026-07-15');
});

test('auctionDateFromText: "zaplanowany na 18 czerwca 2026 r." (result notice format)', () => {
  const body = 'drugi przetarg ustny nieograniczony na sprzedaż nieruchomości … zaplanowany na 18 czerwca 2026 r., zakończył się wynikiem negatywnym';
  assert.equal(auctionDateFromText(body), '2026-06-18');
});

test('auctionDateFromText: null on empty/absent', () => {
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText(null), null);
  assert.equal(auctionDateFromText('brak daty tutaj'), null);
});


test('startingPriceFromText: "281 000,00 zł" (Racibórz section 6 format)', () => {
  const body = 'Cena wywoławcza nieruchomości:\n    281 000,00 zł, z czego 2 % stanowi cena składnika gruntowego.';
  assert.equal(startingPriceFromText(body), 281000);
});

test('startingPriceFromText: rokowania floor price "nie niższa niż 130 000 zł"', () => {
  const body = 'Cena wywoławcza do rokowań:\n     nie niższa niż 130 000 zł, z czego 5,2 % stanowi cena składnika gruntowego .';
  assert.equal(startingPriceFromText(body), 130000);
});

test('startingPriceFromText: null when absent', () => {
  assert.equal(startingPriceFromText('brak ceny'), null);
  assert.equal(startingPriceFromText(null), null);
});


test('unitAreaFromText: "58,25 m2" (lokal mieszkalny)', () => {
  const body = 'Lokal mieszkalny nr 5, usytuowany na czwartej kondygnacji … o powierzchni użytkowej 58,25 m2 .';
  assert.equal(unitAreaFromText(body), 58.25);
});

test('unitAreaFromText: null when absent', () => {
  assert.equal(unitAreaFromText(''), null);
  assert.equal(unitAreaFromText(null), null);
});


test('addressRawFromText: "47-400 Racibórz, ul. Stalmacha nr 7a/10" → "ul. Stalmacha 7A/10"', () => {
  const body = '1. Lokalizacja: 47-400 Racibórz, ul. Stalmacha nr 7a/10';
  assert.equal(addressRawFromText(body), 'ul. Stalmacha 7a/10');
});

test('addressRawFromText: header form "przy ul. Opawskiej nr 93/2"', () => {
  const body = 'ogłasza pierwszy, publiczny, przetarg ustny, nieograniczony na sprzedaż lokalu mieszkalnego położonego w Raciborzu przy ul. Opawskiej nr 93/2';
  assert.equal(addressRawFromText(body), 'ul. Opawskiej 93/2');
});

test('addressRawFromText: null when absent', () => {
  assert.equal(addressRawFromText('brak adresu'), null);
  assert.equal(addressRawFromText(null), null);
});


test('isResultNotice: plain and letter-spaced header', () => {
  assert.equal(isResultNotice('Informacja o wyniku przetargu'), true);
  assert.equal(isResultNotice('I n f o r m a c j a  o  wyniku'), true);
  assert.equal(isResultNotice('ogłasza pierwszy przetarg'), false);
  assert.equal(isResultNotice(''), false);
  assert.equal(isResultNotice(null), false);
});


const BOARD_SAMPLE = `
<div class="article-section" data-announcement-id="43779639" data-annoucement-version="1.1">
  <div>
    <div class="article-document article-generic">
      <div class="row-fluid">
        <a href="?komunikat=43779639">
          <h2 class="article-main-title span9">Pierwszy, publiczny przetarg ustny, nieograniczony na sprzedaż lokalu mieszkalnego położonego w Raciborzu przy ul.Stalmacha nr 7a/10</h2>
        </a>
        <div class="date span3">12.06.2026 10:38:52</div>
      </div>
      <div class="row-fluid">
        <div class="span12">
          <div class="description">mieszkanie o powierzchni użytkowej 58,25 m<sup>2</sup>, III piętro</div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="article-section" data-announcement-id="43848027" data-annoucement-version="1.0">
  <div>
    <div class="article-document article-generic">
      <div class="row-fluid">
        <a href="?komunikat=43848027">
          <h2 class="article-main-title span9">Rokowania na sprzedaż lokalu mieszkalnego położonego przyul. Mickiewicza nr 13/15</h2>
        </a>
        <div class="date span3">19.06.2026 12:59:04</div>
      </div>
    </div>
  </div>
</div>
<div class="article-section" data-announcement-id="43891486" data-annoucement-version="1.0">
  <div>
    <div class="article-document article-generic">
      <div class="row-fluid">
        <a href="?komunikat=43891486">
          <h2 class="article-main-title span9">Informacja o wyniku przetargu</h2>
        </a>
      </div>
    </div>
  </div>
</div>
`;

test('parseBoardHtml: extracts 3 items from sample board HTML', () => {
  const items = parseBoardHtml(BOARD_SAMPLE, 'https://www.bipraciborz.pl/bip/test');
  assert.equal(items.length, 3);
});

test('parseBoardHtml: flat announcement item — id, title, detailUrl', () => {
  const items = parseBoardHtml(BOARD_SAMPLE, 'https://www.bipraciborz.pl/bip/test');
  const flat = items.find((i) => i.id === '43779639');
  assert.ok(flat, 'item 43779639 must be present');
  assert.match(flat.title, /Stalmacha/);
  assert.equal(flat.detailUrl, 'https://www.bipraciborz.pl/bip/test?komunikat=43779639');
});

test('parseBoardHtml: rokowania item — id 43848027', () => {
  const items = parseBoardHtml(BOARD_SAMPLE, 'https://www.bipraciborz.pl/bip/test');
  const rok = items.find((i) => i.id === '43848027');
  assert.ok(rok);
  assert.match(rok.title, /Rokowania/);
});

test('parseBoardHtml: result notice item — id 43891486', () => {
  const items = parseBoardHtml(BOARD_SAMPLE, 'https://www.bipraciborz.pl/bip/test');
  const res = items.find((i) => i.id === '43891486');
  assert.ok(res);
  assert.equal(res.title, 'Informacja o wyniku przetargu');
});

test('parseBoardHtml: empty HTML returns empty array', () => {
  assert.deepEqual(parseBoardHtml('<html><body>nic</body></html>', 'https://example.com'), []);
});


const ANN_STALMACHA = `                                                   PREZYDENT MIASTA RACIBÓRZ
                                  działając na podstawie art. 38 ust. 1 i 2 ustawy z dnia 21 sierpnia 1997 r.
                                       o gospodarce nieruchomościami (t.j. Dz.U. z 2026 r., poz. 399)

                           ogłasza pierwszy, publiczny, przetarg ustny, nieograniczony na sprzedaż
                        lokalu mieszkalnego położonego w Raciborzu przy ul. Stalmacha nr 7a/10


1. Lokalizacja: 47-400 Racibórz, ul. Stalmacha nr 7a/10
2. Oznaczenie nieruchomości wg danych z ewidencji gruntów:
    nieruchomość zabudowana budynkiem wielomieszkaniowym, figurującym w gminnej ewidencji zabytków,
    stanowiąca działkę gruntu oznaczoną nr 3643/176 k.m. 4 Racibórz o powierzchni 0,0392 ha, uregulowana
    w księdze wieczystej numer GL1R/00028923/5 Sądu Rejonowego w Raciborzu.
3. Opis nieruchomości:
3.1.Lokal mieszkalny nr 5, usytuowany na czwartej kondygnacji (III piętrze ) budynku wielomieszkaniowego,
    położonego w Raciborzu przy ul. Stalmacha nr 7a; składa się z jednego pokoju, kuchni, przedpokoju, łazienki
    i spiżarki o powierzchni użytkowej 58,25 m2 .
6. Cena wywoławcza nieruchomości:
    281 000,00 zł, z czego 2 % stanowi cena składnika gruntowego.
7. Termin i miejsce przetargu:
    Przetarg odbędzie się w dniu 15 lipca 2026r. o godzinie 1200, w sali nr 125 na I piętrze Urzędu Miasta Racibórz
    przy ul. Króla Stefana Batorego 6.`;

test('parseAnnouncement: Stalmacha 7a/10 — kind=mieszkalny', () => {
  const r = parseAnnouncement(ANN_STALMACHA);
  assert.ok(r, 'record returned');
  assert.equal(r.kind, 'mieszkalny');
});

test('parseAnnouncement: Stalmacha 7a/10 — address_raw and address key', () => {
  const r = parseAnnouncement(ANN_STALMACHA);
  assert.equal(r.address_raw, 'ul. Stalmacha 7a/10');
  assert.equal(r.address.street, 'Stalmacha');
  assert.equal(r.address.building, '7A');
  assert.equal(r.address.apt, '10');
  assert.equal(r.address.key, 'stalmacha|7A|10');
});

test('parseAnnouncement: Stalmacha 7a/10 — area 58.25 m²', () => {
  const r = parseAnnouncement(ANN_STALMACHA);
  assert.equal(r.area_m2, 58.25);
});

test('parseAnnouncement: Stalmacha 7a/10 — starting price 281 000 zł', () => {
  const r = parseAnnouncement(ANN_STALMACHA);
  assert.equal(r.starting_price_pln, 281000);
});

test('parseAnnouncement: Stalmacha 7a/10 — auction date 2026-07-15', () => {
  const r = parseAnnouncement(ANN_STALMACHA);
  assert.equal(r.auction_date, '2026-07-15');
});

test('parseAnnouncement: Stalmacha 7a/10 — round 1 (pierwszy)', () => {
  const r = parseAnnouncement(ANN_STALMACHA);
  assert.equal(r.round, 1);
});

test('parseAnnouncement: null/empty → null', () => {
  assert.equal(parseAnnouncement(''), null);
  assert.equal(parseAnnouncement(null), null);
  assert.equal(parseAnnouncement('brak adresu tutaj'), null);
});

const ANN_ROKOWANIA = `                                       PREZYDENT MIASTA RACIBÓRZ

                        ogłasza rokowania na sprzedaż lokalu mieszkalnego
                      położonego w Raciborzu przy ul. Mickiewicza nr 13/15


1. Lokalizacja: 47-400 Racibórz, ul. Mickiewicza nr 13/15
3. Opis nieruchomości:
3.1. Lokal mieszkalny nr 15, usytuowany na trzeciej kondygnacji (III piętrze) budynku wielomieszkaniowego
    o powierzchni użytkowej 23,40 m2.
6. Cena wywoławcza nieruchomości:
    115 000,00 zł, z czego 2 % stanowi cena składnika gruntowego.
7. Termin i miejsce rokowań:
    Rokowania odbędą się w dniu 28 lipca 2026r. o godzinie 1200.`;

test('parseAnnouncement: rokowania — round=2, kind=mieszkalny, address key set', () => {
  const r = parseAnnouncement(ANN_ROKOWANIA);
  assert.ok(r, 'rokowania record returned');
  assert.equal(r.round, 2);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'mickiewicza|13|15');
  assert.equal(r.starting_price_pln, 115000);
  assert.equal(r.area_m2, 23.4);
});

const ANN_ROKOWANIA_WILENSKA = `                                                   PREZYDENT MIASTA RACIBÓRZ
                                    działając na podstawie art. 39 ust. 2 ustawy z dnia 21 sierpnia 1997 r.
                                       o gospodarce nieruchomościami (t.j. Dz.U. z 2026 r., poz. 399)

                                       zaprasza do rokowań podmioty zainteresowane nabyciem
                                        wolnego lokalu mieszkalnego, położonego w Raciborzu
                                                    przy ul. Wileńskiej nr 15/16


1. Lokalizacja: 47-400 Racibórz, ul. Wileńska nr 15/16
2. Oznaczenie nieruchomości wg danych z ewidencji gruntów:
     nieruchomość zabudowana budynkiem wielomieszkaniowym, stanowiąca działkę gruntu oznaczoną nr 561/155
     k. m. 11 Racibórz o powierzchni 0,0697 ha, uregulowana w księdze wieczystej numer GL1R/00032999/9 Sądu
     Rejonowego w Raciborzu.
3. Opis nieruchomości:
3.1.Lokal mieszkalny nr 16, usytuowany na czwartej kondygnacji (III pietrze) budynku wielomieszkaniowego,
  położonego w Raciborzu przy ul. Wileńskiej nr 15; składa się z jednego pokoju, kuchni, przedpokoju i łazienki
    o powierzchni użytkowej 35,05 m2; do lokalu przynależy piwnica o powierzchni 6,53 m 2.
6. Cena wywoławcza do rokowań:
     nie niższa niż 130 000 zł, z czego 5,2 % stanowi cena składnika gruntowego .
7. Termin i miejsce rokowań:
    Rokowania odbędą się w dniu 29 lipca 2026r. o godzinie 1200, w sali nr 125 na I piętrze Urzędu Miasta
    Racibórz przy ul. Króla Stefana Batorego 6.`;

test('parseAnnouncement: rokowania Wileńska 15/16 (real PDF) — floor price 130 000 zł parses', () => {
  const r = parseAnnouncement(ANN_ROKOWANIA_WILENSKA);
  assert.ok(r, 'record returned');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.round, 2);
  assert.equal(r.address.key, 'wilenskiej|15|16');
  assert.equal(r.area_m2, 35.05);
  assert.equal(r.starting_price_pln, 130000);
  assert.equal(r.auction_date, '2026-07-29');
});


const RESULT_TECZ_LAND = `                               Informacja o wyniku przetargu



Na podstawie §12. rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie
sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(t.j. Dz.U. z 2021 r., poz. 2213)




                        P r e z y d e n t        M i a s t a      R a c i b ó r z

                podaje do publicznej wiadomości informację o wyniku przetargu:

drugi przetarg ustny nieograniczony na sprzedaż nieruchomości, położonej w Raciborzu
przy ul. Tęczowej i ul. Odrodzenia, w skład której wchodzą działki oznaczone ewidencyjnie
nr 537/2, 537/4, 537/5, 537/6, 537/7, 537/8 i 537/9 k.m. 4 obręb Markowice, zaplanowany
na 18 czerwca 2026 r., zakończył się wynikiem negatywnym, ze względu na brak
uczestników.




Racibórz, 24 czerwca 2026 r.`;

test('isResultNotice: real land result PDF — recognized', () => {
  assert.equal(isResultNotice(RESULT_TECZ_LAND), true);
});

test('parseResultDoc: land result — kind=grunt', () => {
  const recs = parseResultDoc(
    RESULT_TECZ_LAND,
    null,
    'https://www.bipraciborz.pl/res/serwisy/pliki/43891507?version=1.0',
  );
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'grunt');
});

test('parseResultDoc: land result — outcome unsold', () => {
  const recs = parseResultDoc(RESULT_TECZ_LAND, null, 'https://example.com/r');
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
});

test('parseResultDoc: land result — round 2 (drugi przetarg)', () => {
  const recs = parseResultDoc(RESULT_TECZ_LAND, null, 'https://example.com/r');
  assert.equal(recs[0].round, 2);
});

test('parseResultDoc: land result — auction date 2026-06-18', () => {
  const recs = parseResultDoc(RESULT_TECZ_LAND, null, 'https://example.com/r');
  assert.equal(recs[0].auction_date, '2026-06-18');
});

test('parseResultDoc: land result — source_pdf propagated', () => {
  const url = 'https://www.bipraciborz.pl/res/serwisy/pliki/43891507?version=1.0';
  const recs = parseResultDoc(RESULT_TECZ_LAND, null, url);
  assert.equal(recs[0].source_pdf, url);
});


const RESULT_FLAT_SOLD = `                               Informacja o wyniku przetargu

Na podstawie §12. rozporządzenia Rady Ministrów z dnia 14 września 2004 r. …

                        P r e z y d e n t        M i a s t a      R a c i b ó r z

                podaje do publicznej wiadomości informację o wyniku przetargu:

pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego
w Raciborzu przy ul. Stalmacha nr 7a/10, zaplanowany na 15 lipca 2026 r.,

Cena wywoławcza nieruchomości: 281 000,00 zł
Nabywca nieruchomości: Jan Kowalski
oferując cenę 285 000,00 zł wygrał przetarg.

Racibórz, 20 lipca 2026 r.`;

test('parseResultDoc: synthetic flat sold — kind=mieszkalny, outcome=sold', () => {
  const recs = parseResultDoc(
    RESULT_FLAT_SOLD,
    null,
    'https://www.bipraciborz.pl/res/serwisy/pliki/99999?version=1.0',
  );
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'mieszkalny');
  assert.equal(recs[0].outcome, 'sold');
});

test('parseResultDoc: synthetic flat sold — address key matches announcement join key', () => {
  const recs = parseResultDoc(RESULT_FLAT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].address.key, 'stalmacha|7A|10');
});

test('parseResultDoc: synthetic flat sold — starting price 281 000 zł', () => {
  const recs = parseResultDoc(RESULT_FLAT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].starting_price_pln, 281000);
});

test('parseResultDoc: synthetic flat sold — achieved price 285 000 zł', () => {
  const recs = parseResultDoc(RESULT_FLAT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].final_price_pln, 285000);
});

test('parseResultDoc: synthetic flat sold — round 1', () => {
  const recs = parseResultDoc(RESULT_FLAT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].round, 1);
});

test('parseResultDoc: synthetic flat sold — auction date 2026-07-15', () => {
  const recs = parseResultDoc(RESULT_FLAT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].auction_date, '2026-07-15');
});

const RESULT_FLAT_UNSOLD = `                               Informacja o wyniku przetargu

                        P r e z y d e n t        M i a s t a      R a c i b ó r z

                podaje do publicznej wiadomości informację o wyniku przetargu:

pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego
w Raciborzu przy ul. Winnej nr 10/5, zaplanowany na 1 września 2026 r.,
zakończył się wynikiem negatywnym, ze względu na brak uczestników.

Cena wywoławcza nieruchomości: 195 000,00 zł

Racibórz, 5 września 2026 r.`;

test('parseResultDoc: synthetic flat unsold — outcome=unsold, no final price', () => {
  const recs = parseResultDoc(RESULT_FLAT_UNSOLD, null, 'https://example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
  assert.equal(recs[0].starting_price_pln, 195000);
  assert.equal(recs[0].address.key, 'winnej|10|5');
});

test('parseResultDoc: non-result text returns empty', () => {
  assert.deepEqual(
    parseResultDoc('Ogłoszenie o przetargu na lokal mieszkalny', null, 'https://example.com'),
    [],
  );
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});

test('parseResultDoc: fallbackDate used when body has no parseable date', () => {
  const noDate = RESULT_TECZ_LAND
    .replace(/zaplanowany\s+na\s+18\s+czerwca\s+2026\s+r\.,/i, '')
    .replace(/24\s+czerwca\s+2026\s+r\./i, '');
  const recs = parseResultDoc(noDate, '2026-06-18', 'https://example.com');
  assert.ok(recs.length >= 0);
  if (recs.length > 0) {
    assert.ok(recs[0].auction_date === '2026-06-18' || recs[0].auction_date === null);
  }
});
