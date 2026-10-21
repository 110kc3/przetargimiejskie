// Lubań parser tests.
// Fixtures reproduce real announcements from the Lubań spike (luban.pl/1333):
//   - ul. Zawidowska 32/6 (II przetarg, 88 000 zł, 33.34 m², auction 2026-06-09)
//   - ul. Warszawska 4/8 (III przetarg, 130 000 zł, 59.44 m², auction 2026-05-26)
//   - ul. Leśna 11/4 (III przetarg, 75 000 zł, 28.90 m², auction 2026-04-27)
//   - ul. Warszawska 3/2 (I przetarg, 104 000 zł, 35.71 m², auction 2026-11-30)
//   - Plac 3 Maja 6/4 (I przetarg, 150 000 zł, 53.30 m², auction 2026-11-20)
//   - ul. Leśna 44D/5 (II przetarg, 88 000 zł, 35.00 m², auction 2026-07-15)
//   - Land: ul. Na Skarpie (działki 41, 40/2, 120 000 zł, 718 m², auction 2026-11-23)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  htmlToText,
  parsePLN,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  extractArticleBody,
  isSaleAnnouncement,
  roundFromAnnouncement,
  extractFlatAddress,
  resolveKind,
  parseAnnouncement,
  parseLandAnnouncement,
  parseResultDoc,
} from '../src/cities/luban/parse.js';

import { harvestIndexItems } from '../src/cities/luban/crawl.js';

// ---------------------------------------------------------------------------
// Real fixtures from luban.pl
// ---------------------------------------------------------------------------

const FIXTURE_ZAWIDOWSKA_32_6 = `
<div class="description">
<p>Lubań, dnia 07 maja 2026 roku</p>
<p>GGNiR.6840.8.4.2025</p>
<p style="text-align: center;"><strong>O G Ł O S Z E N I E</strong></p>
<p style="text-align: center;"><strong>B U R M I S T R Z   M I A S T A   L U B A Ń</strong></p>
<p style="text-align: center;"><strong>o g ł a s z a</strong></p>
<p style="text-align: center;"><strong>drugi przetarg ustny nieograniczony</strong></p>
<p><strong>na sprzedaż lokalu mieszkalnego Nr 6 znajdującego się w budynku położonym w Lubaniu przy ul. Zawidowskiej 32 wraz z udziałem we współwłasności nieruchomości gruntowej </strong>(działka nr 15/2, AM 19, Obręb II o powierzchni 178 m<sup>2</sup>, JG1L/00022708/3)</p>
<ul>
<li><strong> Zawidowska 32/6 </strong></li>
</ul>
<p>Pierwszy przetarg ustny nieograniczony na sprzedaż przedmiotowej nieruchomości został przeprowadzony w dniu 27 marca 2026 roku zgodnie z ogłoszeniem z dnia 24 lutego 2026 roku i zakończył się wynikiem negatywnym z uwagi na brak osób zainteresowanych.</p>
<p>Przedmiotowy lokal mieszkalny o powierzchni użytkowej 33,34 m<sup>2</sup> położony jest na drugiej kondygnacji wielorodzinnego budynku mieszkalnego zlokalizowanego w Lubaniu przy ulicy Zawidowskiej 32 i składa się z pokoju o powierzchni 13,87 m<sup>2</sup>, pokoju z kuchnią o powierzchni 16,33 m<sup>2</sup>, przedpokoju o powierzchni 3,14 m<sup>2</sup>.</p>
<p>Cena wywoławcza nieruchomości stanowi kwota 88.000,00 zł (słownie: osiemdziesiąt osiem tysięcy złotych 00/100) , na którą składa się: Cena lokalu mieszkalnego - 86.660,00 zł, tj. 98,4773 % ceny Cena ułamkowej części gruntu - 1.340,00 zł, tj. 1,5227 % ceny Wadium 10.000,00 zł (słownie: dziesięć tysięcy złotych 00/100).</p>
<p>Przetarg odbędzie się w dniu 09 czerwca 2026 roku (wtorek) o godzinie 11:00 w budynku Urzędu Miasta Lubania, ul. 7 Dywizji 14, I piętro, sala Nr 11.</p>
<p>W tytule wpłaty wadium oprócz danych uczestnika przetargu należy dopisać: „Przetarg lokal Zawidowska 32/6”.</p>
</div>
`;

const FIXTURE_WARSZAWSKA_4_8 = `
<div class="description">
<p>Lubań, dnia 24 kwietnia 2026 roku</p>
<p>GGNiR.6840.8.3.2024</p>
<p style="text-align: center;"><strong>O G Ł O S Z E N I E</strong></p>
<p style="text-align: center;"><strong>B U R M I S T R Z   M I A S T A   L U B A Ń</strong></p>
<p style="text-align: center;"><strong>o g ł a s z a</strong></p>
<p style="text-align: center;"><strong>trzeci przetarg ustny nieograniczony</strong></p>
<p><strong>na sprzedaż lokalu mieszkalnego Nr 8 znajdującego się w budynku położonym w Lubaniu przy ul. Warszawskiej 4 wraz z udziałem we współwłasności nieruchomości gruntowej </strong>(działka nr 54, AM 10, Obręb III o powierzchni 215 m<sup>2</sup>, JG1L/00035543/2)</p>
<ul>
<li><strong> Warszawska 4/8 </strong></li>
</ul>
<p>Drugi przetarg ustny nieograniczony na sprzedaż przedmiotowej nieruchomości został przeprowadzony w dniu 19 lutego 2026 roku zgodnie z ogłoszeniem z dnia 12 stycznia 2026 roku i zakończył się wynikiem negatywnym z uwagi na to, iż uczestnik zakwalifikowany do wzięcia udziału w przetargu, nie przystąpił do licytacji.</p>
<p>Przedmiotowy lokal mieszkalny o powierzchni użytkowej 59,44 m<sup>2</sup> położony jest na czwartej kondygnacji wielorodzinnego budynku mieszkalnego zlokalizowanego w Lubaniu przy ulicy Warszawskiej 4.</p>
<p>Cena wywoławcza nieruchomości stanowi kwota 130.000,00 zł (słownie: sto trzydzieści tysięcy złotych 00/100) , na którą składa się: Cena lokalu mieszkalnego - 128.680,50 zł, tj. 98,9850 % ceny Cena ułamkowej części gruntu - 1.319,50 zł, tj. 1,0150 % ceny Wadium 20.000,00 zł.</p>
<p>Przetarg odbędzie się w dniu 26 maja 2026 roku (wtorek) o godzinie 11:00 w budynku Urzędu Miasta Lubania, ul. 7 Dywizji 14, I piętro, sala Nr 11.</p>
<p>W tytule wpłaty wadium oprócz danych uczestnika przetargu należy dopisać: „Przetarg lokal Warszawska 4/8”.</p>
</div>
`;

const FIXTURE_LESNA_11_4 = `
<div class="description">
<p>Lubań, dnia 26 marca 2026 roku</p>
<p>GGNiR.6840.8.5.2024</p>
<p style="text-align: center;"><strong>O G Ł O S Z E N I E</strong></p>
<p style="text-align: center;"><strong>B U R M I S T R Z   M I A S T A   L U B A Ń</strong></p>
<p style="text-align: center;"><strong>o g ł a s z a</strong></p>
<p style="text-align: center;"><strong>trzeci przetarg ustny nieograniczony</strong></p>
<p><strong>na sprzedaż lokalu mieszkalnego Nr 4 znajdującego się w budynku położonym w Lubaniu przy ul. Leśnej 11 wraz z udziałem we współwłasności nieruchomości gruntowej </strong>(działka nr 27, AM 15, Obręb V o powierzchni 105 m<sup>2</sup>, JG1L/00016302/2)</p>
<p>Leśna 11/4</p>
<p>Pierwszy przetarg ustny nieograniczony na sprzedaż przedmiotowej nieruchomości został przeprowadzony w dniu 24 października 2025 roku ... i zakończył się wynikiem negatywnym.</p>
<p>Drugi przetarg ustny nieograniczony ... w dniu 25 lutego 2026 roku ... zakończył się wynikiem negatywnym.</p>
<p>Przedmiotowy lokal mieszkalny o powierzchni użytkowej 28,90 m<sup>2</sup> położony jest na drugiej kondygnacji wielorodzinnego budynku mieszkalnego zlokalizowanego w Lubaniu przy ulicy Leśnej 11.</p>
<p>Cena wywoławcza nieruchomości stanowi kwota 75.000,00 zł (słownie: siedemdziesiąt pięć tysięcy złotych 00/100).</p>
<p>Przetarg odbędzie się w dniu 27 kwietnia 2026 roku (poniedziałek) o godzinie 11:00 w budynku Urzędu Miasta Lubania, ul. 7 Dywizji 14, I piętro, sala Nr 11.</p>
<p>W tytule wpłaty wadium oprócz danych uczestnika przetargu należy dopisać: „Przetarg lokal Leśna 11/4”.</p>
</div>
`;

const FIXTURE_WARSZAWSKA_3_2 = `
<div class="description">
<p>Lubań, dnia 14 października 2026 roku</p>
<p>GGNiR.6840.8.8.2026</p>
<p style="text-align: center;"><strong>O G Ł O S Z E N I E</strong></p>
<p style="text-align: center;"><strong>B U R M I S T R Z   M I A S T A   L U B A Ń</strong></p>
<p style="text-align: center;"><strong>o g ł a s z a</strong></p>
<p style="text-align: center;"><strong>pierwszy przetarg ustny nieograniczony</strong></p>
<p><strong>na sprzedaż lokalu mieszkalnego Nr 2 znajdującego się w budynku położonym w Lubaniu przy ul. Warszawskiej 3 wraz z udziałem we współwłasności nieruchomości gruntowej </strong></p>
<ul>
<li><strong> Warszawska 3/2 </strong></li>
</ul>
<p>Przedmiotowy lokal mieszkalny o powierzchni użytkowej 35,71 m<sup>2</sup> położony jest na drugiej kondygnacji wielorodzinnego budynku mieszkalnego zlokalizowanego w Lubaniu przy ulicy Warszawskiej 3.</p>
<p>Cena wywoławcza nieruchomości stanowi kwota 104.000,00 zł (słownie: sto cztery tysiące złotych 00/100).</p>
<p>Przetarg odbędzie się w dniu 30 listopada 2026 roku (poniedziałek) o godzinie 11:00 w budynku Urzędu Miasta Lubania, ul. 7 Dywizji 14, I piętro, sala Nr 11.</p>
<p>W tytule wpłaty wadium oprócz danych uczestnika przetargu należy dopisać: „Przetarg lokal Warszawska 3/2”.</p>
</div>
`;

const FIXTURE_PLAC_3_MAJA = `
<div class="description">
<p>Lubań, dnia 06 października 2026 roku</p>
<p>GGNiR.6840.8.9.2026</p>
<p style="text-align: center;"><strong>O G Ł O S Z E N I E</strong></p>
<p style="text-align: center;"><strong>B U R M I S T R Z   M I A S T A   L U B A Ń</strong></p>
<p style="text-align: center;"><strong>o g ł a s z a</strong></p>
<p style="text-align: center;"><strong>pierwszy przetarg ustny nieograniczony</strong></p>
<p><strong>na sprzedaż lokalu mieszkalnego Nr 4 znajdującego się w budynku położonym w Lubaniu przy Placu 3 Maja 6</strong></p>
<ul>
<li><strong> Plac 3 Maja 6/4 </strong></li>
</ul>
<p>Przedmiotowy lokal mieszkalny o powierzchni użytkowej 53,30 m<sup>2</sup> położony jest na trzeciej kondygnacji wielorodzinnego budynku mieszkalnego zlokalizowanego w Lubaniu przy Placu 3 Maja 6.</p>
<p>Cena wywoławcza nieruchomości stanowi kwota 150.000,00 zł (słownie: sto pięćdziesiąt tysięcy złotych 00/100).</p>
<p>Przetarg odbędzie się w dniu 20 listopada 2026 roku (piątek) o godzinie 11:00 w budynku Urzędu Miasta Lubania.</p>
<p>W tytule wpłaty wadium oprócz danych uczestnika przetargu należy dopisać: „Przetarg lokal Plac 3 Maja 6/4”.</p>
</div>
`;

const FIXTURE_LESNA_44D_5 = `
<div class="description">
<p>Lubań, dnia 10 czerwca 2026 roku</p>
<p>GGNiR.6840.8.2.2025</p>
<p style="text-align: center;"><strong>O G Ł O S Z E N I E</strong></p>
<p style="text-align: center;"><strong>B U R M I S T R Z   M I A S T A   L U B A Ń</strong></p>
<p style="text-align: center;"><strong>o g ł a s z a</strong></p>
<p style="text-align: center;"><strong>drugi przetarg ustny nieograniczony</strong></p>
<p><strong>na sprzedaż lokalu mieszkalnego Nr 5 znajdującego się w budynku położonym w Lubaniu przy ul. Leśnej 44D wraz z udziałem we współwłasności nieruchomości gruntowej </strong></p>
<ul>
<li><strong> Leśna 44D/5 </strong></li>
</ul>
<p>Przedmiotowy lokal mieszkalny o powierzchni użytkowej 35,00 m<sup>2</sup> położony jest na poddaszu budynku przy ul. Leśnej 44D.</p>
<p>Cena wywoławcza nieruchomości stanowi kwota 88.000,00 zł (słownie: osiemdziesiąt osiem tysięcy złotych 00/100).</p>
<p>Przetarg odbędzie się w dniu 15 lipca 2026 roku (środa) o godzinie 11:00 w budynku Urzędu Miasta Lubania.</p>
<p>W tytule wpłaty wadium oprócz danych uczestnika przetargu należy dopisać: „Przetarg lokal Leśna 44D/5”.</p>
</div>
`;

const FIXTURE_LAND_NA_SKARPIE = `
<div class="description">
<p>Lubań, dnia 07 października 2026 roku</p>
<p>GGNiR.6840.2.19.2022</p>
<p style="text-align: center;"><strong>O G Ł O S Z E N I E</strong></p>
<p style="text-align: center;"><strong>BURMISTRZ MIASTA LUBAŃ</strong></p>
<p style="text-align: center;"><strong>ogłasza pierwszy przetarg ustny nieograniczony</strong></p>
<p>na zbycie nieruchomości gruntowej, przeznaczonej pod zabudowę mieszkaniową wielorodzinną lub usługową, położonej w Lubaniu przy ulicy Na Skarpie, w skład której wchodzą dwie działki oznaczone geodezyjnie jako działka nr 41, AM 19, Obręb II o powierzchni 718 m<sup>2</sup> i nr 40/2, AM 19, Obręb II o powierzchni 329 m<sup>2</sup>.</p>
<p>Cena wywoławcza sprzedaży nieruchomości jako całości wynosi: 120.000,00 zł (słownie: sto dwadzieścia tysięcy złotych 00/100).</p>
<p>Przetarg odbędzie się w dniu 23 listopada 2026 roku (poniedziałek) o godzinie 11:00 w budynku Urzędu Miasta Lubania, ul. 7 Dywizji 14.</p>
<p>W tytule wpłaty wadium należy dopisać: „Przetarg działki Na Skarpie”.</p>
</div>
`;

const FIXTURE_LAND_ZAWIDOWSKA = `
<div class="description">
<p>Lubań, dnia 03 kwietnia 2026 roku</p>
<p>GGNiR.6840.2.5.2025</p>
<p style="text-align: center;"><strong>OGŁOSZENIE</strong></p>
<p>BURMISTRZ MIASTA LUBAŃ ogłasza czwarty przetarg ustny nieograniczony na zbycie nieruchomości gruntowej niezabudowanej, przeznaczonej pod zabudowę mieszkaniową wielorodzinną wolnostojącą, położonej w Lubaniu przy ulicy Zawidowskiej, oznaczonej geodezyjnie jako działka nr 1/31, Obręb II, AM 12 o powierzchni 1 115 m<sup>2</sup>.</p>
<p>Cena wywoławcza sprzedaży nieruchomości wynosi: 170.000,00 zł (słownie: sto siedemdziesiąt tysięcy złotych 00/100).</p>
<p>Przetarg odbędzie się w dniu 04 maja 2026 roku o godzinie 11:00 w Urzędzie Miasta Lubań.</p>
</div>
`;

const FIXTURE_INDEX_SNIPPET = `
<div class="item-cell item-article">
  <a href="/artykul/127000/burmistrz-miasta-luban-oglasza-pierwszy-przetarg-ustny-nieograniczony" title="Warszawska 3/2"><div class="photo"></div></a>
  <div class="content">
    <div class="date"><span>14-10-2026</span></div>
    <h3><a href="/artykul/127000/burmistrz-miasta-luban-oglasza-pierwszy-przetarg-ustny-nieograniczony">Burmistrz Miasta Lubań ogłasza pierwszy przetarg ustny nieograniczony</a></h3>
    <p>Na podstawie art. 37 ust.1...</p>
  </div>
</div>
<div class="item-cell item-article">
  <a href="/artykul/126953/do-sprzedania-dzialki-pod-budowe" title="Działki Na Skarpie"><div class="photo"></div></a>
  <div class="content">
    <div class="date"><span>07-10-2026</span></div>
    <h3><a href="/artykul/126953/do-sprzedania-dzialki-pod-budowe">Do sprzedania działki pod budowę</a></h3>
    <p>Na zbycie nieruchomości gruntowej...</p>
  </div>
</div>
<div class="item-cell item-article">
  <a href="/artykul/127012/nieruchomosci-przeznaczone-do-sprzedazy-w-trybie-bezprzetargowym"><div class="photo"></div></a>
  <div class="content">
    <div class="date"><span>16-10-2026</span></div>
    <h3><a href="/artykul/127012/nieruchomosci-przeznaczone-do-sprzedazy-w-trybie-bezprzetargowym">Nieruchomości bezprzetargowe</a></h3>
  </div>
</div>
`;

// ---------------------------------------------------------------------------
// Tests: Flat announcements from the spike
// ---------------------------------------------------------------------------

test('parseAnnouncement: ul. Zawidowska 32/6 (II przetarg)', () => {
  const url = 'https://luban.pl/artykul/126171/przetarg-na-mieszkanie-przy-ul-zawidowskiej';
  const rec = parseAnnouncement('Przetarg na mieszkanie przy ul. Zawidowskiej', FIXTURE_ZAWIDOWSKA_32_6, url, '2026-05-07');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.round, 2);
  assert.equal(rec.area_m2, 33.34);
  assert.equal(rec.starting_price_pln, 88000);
  assert.equal(rec.auction_date, '2026-06-09');
  assert.equal(rec.published_date, '2026-05-07');
  assert.equal(rec.address_raw, 'ul. Zawidowska 32/6');
  assert.equal(rec.address.key, 'zawidowska|32|6');
  assert.equal(rec.address.street, 'Zawidowska');
  assert.equal(rec.address.building, '32');
  assert.equal(rec.address.apt, '6');
  assert.equal(rec.detail_url, url);
});

test('parseAnnouncement: ul. Warszawska 4/8 (III przetarg)', () => {
  const url = 'https://luban.pl/artykul/126039/burmistrz-miasta-luban-oglasza-trzeci-przetarg-ustny-nieograniczony';
  const rec = parseAnnouncement('Burmistrz Miasta Lubań ogłasza trzeci przetarg ustny nieograniczony', FIXTURE_WARSZAWSKA_4_8, url, '2026-04-24');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.round, 3);
  assert.equal(rec.area_m2, 59.44);
  assert.equal(rec.starting_price_pln, 130000);
  assert.equal(rec.auction_date, '2026-05-26');
  assert.equal(rec.address_raw, 'ul. Warszawska 4/8');
  assert.equal(rec.address.key, 'warszawska|4|8');
  assert.equal(rec.address.street, 'Warszawska');
  assert.equal(rec.address.building, '4');
  assert.equal(rec.address.apt, '8');
});

test('parseAnnouncement: ul. Leśna 11/4 (III przetarg)', () => {
  const url = 'https://luban.pl/artykul/125910/sprzedaz-mieszkania-ul-lesna-11';
  const rec = parseAnnouncement('Sprzedaż mieszkania ul. Leśna 11', FIXTURE_LESNA_11_4, url, '2026-03-26');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.round, 3);
  assert.equal(rec.area_m2, 28.90);
  assert.equal(rec.starting_price_pln, 75000);
  assert.equal(rec.auction_date, '2026-04-27');
  assert.equal(rec.address_raw, 'ul. Leśna 11/4');
  assert.equal(rec.address.key, 'lesna|11|4');
  assert.equal(rec.address.street, 'Leśna');
  assert.equal(rec.address.building, '11');
  assert.equal(rec.address.apt, '4');
});

test('parseAnnouncement: ul. Warszawska 3/2 (I przetarg)', () => {
  const url = 'https://luban.pl/artykul/127000/burmistrz-miasta-luban-oglasza-pierwszy-przetarg-ustny-nieograniczony';
  const rec = parseAnnouncement('Burmistrz Miasta Lubań ogłasza pierwszy przetarg ustny nieograniczony', FIXTURE_WARSZAWSKA_3_2, url, '2026-10-14');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.round, 1);
  assert.equal(rec.area_m2, 35.71);
  assert.equal(rec.starting_price_pln, 104000);
  assert.equal(rec.auction_date, '2026-11-30');
  assert.equal(rec.address_raw, 'ul. Warszawska 3/2');
  assert.equal(rec.address.key, 'warszawska|3|2');
});

test('parseAnnouncement: Plac 3 Maja 6/4 (I przetarg, plac address)', () => {
  const url = 'https://luban.pl/artykul/126943/do-sprzedania-mieszkanie-przy-placu-3-maja';
  const rec = parseAnnouncement('Do sprzedania mieszkanie przy Placu 3 Maja', FIXTURE_PLAC_3_MAJA, url, '2026-10-06');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.round, 1);
  assert.equal(rec.area_m2, 53.30);
  assert.equal(rec.starting_price_pln, 150000);
  assert.equal(rec.auction_date, '2026-11-20');
  assert.equal(rec.address_raw, 'Plac 3 Maja 6/4');
  assert.equal(rec.address.key, 'plac 3 maja|6|4');
  assert.equal(rec.address.street, 'Plac 3 Maja');
  assert.equal(rec.address.building, '6');
  assert.equal(rec.address.apt, '4');
});

test('parseAnnouncement: ul. Leśna 44D/5 (II przetarg)', () => {
  const url = 'https://luban.pl/artykul/126396/przetarg-lokal-lesna-44d5';
  const rec = parseAnnouncement('Przetarg lokal Leśna 44D/5', FIXTURE_LESNA_44D_5, url, '2026-06-10');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.round, 2);
  assert.equal(rec.area_m2, 35.00);
  assert.equal(rec.starting_price_pln, 88000);
  assert.equal(rec.auction_date, '2026-07-15');
  assert.equal(rec.address_raw, 'ul. Leśna 44D/5');
  assert.equal(rec.address.key, 'lesna|44D|5');
});

// ---------------------------------------------------------------------------
// Tests: Land announcements
// ---------------------------------------------------------------------------

test('parseAnnouncement: land — ul. Na Skarpie (działki 41, 40/2)', () => {
  const url = 'https://luban.pl/artykul/126953/do-sprzedania-dzialki-pod-budowe';
  const rec = parseAnnouncement('Do sprzedania działki pod budowę', FIXTURE_LAND_NA_SKARPIE, url, '2026-10-07');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.round, 1);
  assert.equal(rec.dzialka_nr, '41, 40/2');
  assert.equal(rec.obreb, 'II');
  assert.equal(rec.street, 'Na Skarpie');
  assert.equal(rec.address_raw, 'ul. Na Skarpie');
  assert.equal(rec.area_m2, 718);
  assert.equal(rec.starting_price_pln, 120000);
  assert.equal(rec.auction_date, '2026-11-23');
});

test('parseAnnouncement: land — ul. Zawidowska (działka 1/31, IV przetarg)', () => {
  const url = 'https://luban.pl/artykul/125958/burmistrz-miasta-luban-oglasza-czwarty-przetarg-ustny-nieograniczony';
  const rec = parseAnnouncement('Burmistrz Miasta Lubań ogłasza czwarty przetarg ustny nieograniczony', FIXTURE_LAND_ZAWIDOWSKA, url, '2026-04-03');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.round, 4);
  assert.equal(rec.dzialka_nr, '1/31');
  assert.equal(rec.obreb, 'II');
  assert.equal(rec.street, 'Zawidowskiej');
  assert.equal(rec.address_raw, 'ul. Zawidowskiej');
  assert.equal(rec.area_m2, 1115);
  assert.equal(rec.starting_price_pln, 170000);
  assert.equal(rec.auction_date, '2026-05-04');
});

// ---------------------------------------------------------------------------
// Tests: Exclusions
// ---------------------------------------------------------------------------

test('isSaleAnnouncement: filters non-auction posts correctly', () => {
  assert.equal(isSaleAnnouncement('Komunikat o wykazie nieruchomości', 'Zgodnie z art. 35 podano do wiadomości wykaz'), false);
  assert.equal(isSaleAnnouncement('Nieruchomości do oddania w najem lub dzierżawę', 'ogłasza przetarg na najem'), false);
  assert.equal(isSaleAnnouncement('Nieruchomości przeznaczone do sprzedaży w trybie bezprzetargowym', 'sprzedaż bezprzetargowa'), false);
  assert.equal(isSaleAnnouncement('Rezerwacja miejsca handlowego', 'rezerwacja stanowiska'), false);
  assert.equal(isSaleAnnouncement('Burmistrz ogłasza przetarg na sprzedaż lokalu', 'ogłasza pierwszy przetarg ustny na sprzedaż'), true);
});

test('parseAnnouncement: returns null for out-of-scope non-sale documents', () => {
  const wykazHtml = '<div class="description"><p>KOMUNIKAT Burmistrza Miasta Lubań Zgodnie z art. 35 podano do publicznej wiadomości wykaz nieruchomości.</p></div>';
  assert.equal(parseAnnouncement('Komunikat Burmistrza Miasta Lubań', wykazHtml, 'https://luban.pl/artykul/127024/x'), null);

  const bezprzHtml = '<div class="description"><p>Nieruchomości przeznaczone do sprzedaży w trybie bezprzetargowym na rzecz najemców.</p></div>';
  assert.equal(parseAnnouncement('Nieruchomości bezprzetargowe', bezprzHtml, 'https://luban.pl/artykul/127012/x'), null);
});

// ---------------------------------------------------------------------------
// Tests: Unit helpers
// ---------------------------------------------------------------------------

test('roundFromAnnouncement: parses Polish ordinals and spaced letters', () => {
  assert.equal(roundFromAnnouncement('Burmistrz Miasta Lubań ogłasza pierwszy przetarg', ''), 1);
  assert.equal(roundFromAnnouncement('Burmistrz Miasta Lubań ogłasza drugi przetarg', ''), 2);
  assert.equal(roundFromAnnouncement('Burmistrz Miasta Lubań ogłasza trzeci przetarg', ''), 3);
  assert.equal(roundFromAnnouncement('Burmistrz Miasta Lubań ogłasza czwarty przetarg', ''), 4);
  assert.equal(roundFromAnnouncement('II przetarg - ul. Piramowicza 6', ''), 2);
  // Spaced "o g ł a s z a" in body
  assert.equal(roundFromAnnouncement('Przetarg na mieszkanie', 'BURMISTRZ o g ł a s z a drugi przetarg ustny'), 2);
  assert.equal(roundFromAnnouncement('Do sprzedania mieszkanie', 'B U R M I S T R Z o g ł a s z a trzeci przetarg ustny'), 3);
  assert.equal(roundFromAnnouncement('Ogłoszenie', 'ogłasza pierwszy przetarg ustny nieograniczony'), 1);
});

test('extractFlatAddress: extracts address from wadium and bullet formats', () => {
  const fromWadium = extractFlatAddress('', 'W tytule wpłaty wadium dopisać: „Przetarg lokal Warszawska 3/2”.');
  assert.equal(fromWadium.address_raw, 'ul. Warszawska 3/2');
  assert.equal(fromWadium.address.key, 'warszawska|3|2');

  const fromBullet = extractFlatAddress('<ul><li><strong> Bankowa 3/3 </strong></li></ul>', '');
  assert.equal(fromBullet.address_raw, 'ul. Bankowa 3/3');
  assert.equal(fromBullet.address.key, 'bankowa|3|3');

  const fromPlac = extractFlatAddress('', 'W tytule wpłaty wadium dopisać: „Przetarg lokal Plac 3 Maja 6/4”.');
  assert.equal(fromPlac.address_raw, 'Plac 3 Maja 6/4');
  assert.equal(fromPlac.address.key, 'plac 3 maja|6|4');
});

test('priceFromText and parsePLN: handles dot and space thousands', () => {
  assert.equal(priceFromText('Cena wywoławcza nieruchomości stanowi kwota 104.000,00 zł'), 104000);
  assert.equal(priceFromText('Cena wywoławcza nieruchomości stanowi kwota 88.000,00 zł'), 88000);
  assert.equal(priceFromText('Cena wywoławcza sprzedaży wynosi: 120 000,00 zł'), 120000);
  assert.equal(parsePLN('150.000,00 zł'), 150000);
  assert.equal(parsePLN('75 000 zł'), 75000);
});

test('areaFromText: extracts m2 and m^2 areas', () => {
  assert.equal(areaFromText('powierzchni użytkowej 35,71 m 2'), 35.71);
  assert.equal(areaFromText('powierzchni użytkowej 59,44 m2'), 59.44);
  assert.equal(areaFromText('powierzchni użytkowej 28,90 m²'), 28.90);
});

test('auctionDateFromText: extracts ISO dates from Polish spelled months', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 30 listopada 2026 roku o godzinie 11:00'), '2026-11-30');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 09 czerwca 2026 roku (wtorek)'), '2026-06-09');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 26 maja 2026 roku'), '2026-05-26');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 27 kwietnia 2026 roku'), '2026-04-27');
});

test('harvestIndexItems: parses list item cards from hub page', () => {
  const items = harvestIndexItems(FIXTURE_INDEX_SNIPPET);
  assert.equal(items.length, 3);
  assert.equal(items[0].href, '/artykul/127000/burmistrz-miasta-luban-oglasza-pierwszy-przetarg-ustny-nieograniczony');
  assert.equal(items[0].published_date, '2026-10-14');
  assert.equal(items[0].title, 'Burmistrz Miasta Lubań ogłasza pierwszy przetarg ustny nieograniczony');
  assert.equal(items[1].href, '/artykul/126953/do-sprzedania-dzialki-pod-budowe');
  assert.equal(items[1].published_date, '2026-10-07');
});

test('parseResultDoc: returns empty array for announcement-only city', () => {
  assert.deepEqual(parseResultDoc('any text', '2026-01-01', 'http://example.com'), []);
  assert.deepEqual(parseResultDoc('', null, ''), []);
});
