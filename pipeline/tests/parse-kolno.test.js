// Tests for Kolno adapter (pipeline/src/cities/kolno/*)
// Groundtruthed against real BIP fixtures from bip-umkolno.podlaskie.eu

import { test } from 'node:test';
import assert from 'node:assert/strict';

import adapter from '../src/cities/kolno/index.js';
import { config } from '../src/cities/kolno/config.js';
import {
  parseYearLinks,
  parseArticleLinks,
  extractAttachments,
  isResultAttachment,
  isPropertyArticle,
  roundFromText,
  auctionDateFromText,
  parsePLN,
  parseArea,
  parseAnnouncementDetail,
  parseWykazDetail,
  parseLandParcels,
  parseResultDoc,
} from '../src/cities/kolno/parse.js';

// --- Adapter contract & config tests ---

test('kolno config: matches required metadata', () => {
  assert.equal(config.id, 'kolno');
  assert.equal(config.teryt, '200601_1');
  assert.equal(config.label, 'Kolno');
  assert.equal(config.voivodeship, 'podlaskie');
  assert.equal(config.authority, 'Burmistrz Miasta Kolno');
  assert.equal(config.host, 'bip-umkolno.podlaskie.eu');
  assert.equal(config.source, 'html');
});

test('kolno adapter: exports complete contract', () => {
  assert.equal(adapter.id, 'kolno');
  assert.equal(typeof adapter.crawlActive, 'function');
  assert.equal(typeof adapter.crawlResultDocs, 'function');
  assert.equal(typeof adapter.parseResultDoc, 'function');
});

// --- Board navigation & filtering tests ---

test('parseYearLinks: extracts and filters year folders >= 2020', () => {
  const html = `
    <ul>
      <li><a href="/616c955210c658b/rok-2026/" title="Rok 2026">Rok 2026</a></li>
      <li><a href="/616c955210c658b/rok-2023/" title="Rok 2023">Rok 2023</a></li>
      <li><a href="/616c955210c658b/rok_2021/" title="Rok 2021">Rok 2021</a></li>
      <li><a href="/616c955210c658b/2018/" title="Rok 2018">Rok 2018</a></li>
      <li><a href="/616c955210c658b/rok2017/" title="Rok 2017">Rok 2017</a></li>
    </ul>
  `;
  const years = parseYearLinks(html, 'https://bip-umkolno.podlaskie.eu/616c955210c658b/', 2020);
  assert.equal(years.length, 3);
  assert.deepEqual(years.map(y => y.year), [2026, 2023, 2021]);
  assert.ok(years[0].url.startsWith('https://bip-umkolno.podlaskie.eu/'));
});

test('isPropertyArticle & parseArticleLinks: filters out municipal procurement and keeps property auctions', () => {
  const html = `
    <div>
      <a href="/616c955210c658b/rok-2026/zakup-samochodu.html" title="Zakup i dostawa samochodu osobowego">Auto</a>
      <a href="/616c955210c658b/rok-2026/odbior-odpadow.html" title="Odbiór i transport odpadów komunalnych">Odpady</a>
      <a href="/616c955210c658b/rok-2026/dostawa-agregatow.html" title="Dostawa agregatów prądotwórczych">Agregaty</a>
      <a href="/616c955210c658b/rok-2023/flat.html" title="Burmistrz Miasta Kolno ogłasza drugi ustny przetarg nieograniczony na sprzedaż na własność lokalu mieszkalnego nr 11 położonego w Kolnie przy ul. 11 listopada 6">Lokal</a>
      <a href="/616c955210c658b/rok-2026/garaze.html" title="Ogłoszenie o III przetargu ustnym nieograniczonym na sprzedaż niezabudowanych działek gruntu pod zabudowę garażową">Garaże</a>
      <a href="/4634573d2ce9367/rok-2024/wykaz.html" title="Wykaz w sprawie sprzedaży nieruchomości lokalowej">Wykaz</a>
    </div>
  `;
  assert.equal(isPropertyArticle('Odbiór odpadów komunalnych', '/odpady.html'), false);
  assert.equal(isPropertyArticle('Dostawa agregatów prądotwórczych', '/agregat.html'), false);
  assert.equal(isPropertyArticle('Sprzedaż lokalu mieszkalnego nr 11', '/flat.html'), true);
  assert.equal(isPropertyArticle('Działki pod zabudowę garażową', '/garaz.html'), true);

  const articles = parseArticleLinks(html, 'https://bip-umkolno.podlaskie.eu');
  assert.equal(articles.length, 3);
  assert.ok(articles.some(a => a.title.includes('lokalu mieszkalnego')));
  assert.ok(articles.some(a => a.title.includes('zabudowę garażową')));
  assert.ok(articles.some(a => a.title.includes('Wykaz')));
});

test('extractAttachments: extracts documents and skips UI images', () => {
  const html = `
    <div class="component-attachment">
      <a href="/resource/image/60/90/3/12120/0x0.png">Image</a>
      <a href="/resource/119654/PRZETARG+11+LISTOPADA+6.docx">PRZETARG 11 LISTOPADA 6.docx</a>
      <a href="/resource/120706/INFORMACJA+O+WYNIKU+III+PRZETARGU.pdf">INFORMACJA O WYNIKU III PRZETARGU.pdf</a>
    </div>
  `;
  const atts = extractAttachments(html, 'https://bip-umkolno.podlaskie.eu');
  assert.equal(atts.length, 2);
  assert.equal(atts[0].url, 'https://bip-umkolno.podlaskie.eu/resource/119654/PRZETARG+11+LISTOPADA+6.docx');
  assert.equal(atts[1].url, 'https://bip-umkolno.podlaskie.eu/resource/120706/INFORMACJA+O+WYNIKU+III+PRZETARGU.pdf');
});

test('isResultAttachment: identifies result notices vs other files', () => {
  assert.ok(isResultAttachment('INFORMACJA O WYNIKU III PRZETARGU.pdf'));
  assert.ok(isResultAttachment('Wyniki I przetargu.pdf'));
  assert.ok(isResultAttachment('Informacja o wyniku przetargu - Dąbrowskiej 2.docx'));
  assert.ok(isResultAttachment('Wynik przetargu 25.02.2025.pdf'));
  assert.ok(!isResultAttachment('PRZETARG 11 LISTOPADA 6.docx'));
  assert.ok(!isResultAttachment('Informacje z otwarcia ofert.pdf'));
  assert.ok(!isResultAttachment('SWZ.pdf'));
});

// --- Announcement parsing tests ---

test('parseAnnouncementDetail: round 2 flat auction at ul. 11 Listopada 6/11', () => {
  const title = 'Burmistrz Miasta Kolno ogłasza drugi ustny przetarg nieograniczony na sprzedaż na własność lokalu mieszkalnego nr 11 położonego w Kolnie przy ul. 11 listopada 6 z równoczesną sprzedażą ułamkowej części gruntu';
  const body = `
    BURMISTRZ MIASTA KOLNO działając zgodnie z Zarządzeniem Nr 396/23
    OGŁASZA DRUGI USTNY PRZETARG NIEOGRANICZONY
    na sprzedaż na własność lokalu mieszkalnego nr 11 położonego w Kolnie przy ul. 11 listopada 6 z równoczesną sprzedażą ułamkowej części gruntu.
    I. Oznaczenie nieruchomości:
    Nieruchomość lokalowa, położona w Kolnie przy ulicy 11 Listopada 6, obejmująca lokal mieszkalny nr 11 stanowiący odrębną nieruchomość z przydzieloną piwnicą wraz z udziałem wynoszącym 3289/98780 części we współwłasności wspólnych części budynku i w prawie własności działki gruntu nr 1252/12 o pow. 407 m2 dla której Sąd Rejonowy w Łomży Wydział Ksiąg Wieczystych prowadzi księgę wieczystą LM1L/00031310/2.
    II. Opis nieruchomości.
    Nieruchomość lokalowa nr 11 o powierzchni użytkowej 32,89 m2 składa się z 1 pokoju, kuchni, przedpokoju, łazienki z wc, położona jest na drugim piętrze budynku mieszkalnego wielorodzinnego...
    Cena wywoławcza nieruchomości : 130 000,00 zł
    Przetarg odbędzie się w dniu 03 października 2023 roku  o godz. 10 00 w Urzędzie Miasta Kolno, ul. Wojska Polskiego 20, sala nr 1.
    W przetargu mogą uczestniczyć osoby fizyczne i prawne które wpłacą wymagane wadium w gotówce w wysokości 13 000,00 zł
  `;
  const res = parseAnnouncementDetail(body, 'https://bip-umkolno.podlaskie.eu/flat2.html', title);
  assert.equal(res.kind, 'mieszkalny');
  assert.equal(res.round, 2);
  assert.equal(res.address_raw, 'ul. 11 listopada 6/11');
  assert.equal(res.address.street, '11 listopada');
  assert.equal(res.address.building, '6');
  assert.equal(res.address.apt, '11');
  assert.equal(res.area_m2, 32.89);
  assert.equal(res.starting_price_pln, 130000);
  assert.equal(res.auction_date, '2023-10-03');
});

test('parseAnnouncementDetail: round 1 flat auction at ul. 11 Listopada 12/41', () => {
  const title = 'Przetarg na sprzedaż mieszkania';
  const body = `
    BURMISTRZ MISTA KOLNO działając zgodnie z Zarządzeniem Nr 241 /21
    OGŁASZA PIERWSZY USTNY PRZETARG NIEOGRANICZONY
    na sprzedaż na własność lokalu mieszkalnego nr 41 położonego w Kolnie przy ul. 11 listopada 12 z równoczesną sprzedażą ułamkowej części gruntu.
    I. Oznaczenie nieruchomości:
    Nieruchomość lokalowa, położona w Kolnie przy ulicy11 listopada 12, obejmująca lokal mieszkalny nr 41 stanowiący odrębną nieruchomość z przynależną piwnicą wraz z udziałem wynoszącym 3790/224000 części we współwłasności...
    II. Opis nieruchomości.
    Nieruchomość lokalowa nr 41 o powierzchni użytkowej 37,90 m2 składa się z 2 pokoi, kuchni, przedpokoju, łazienki z wc...
    Cena wywoławcza nieruchomości : 105 000,00 zł
    Przetarg odbędzie się w dniu 20 grudnia 2021 roku  o godz. 10 00 w Urzędzie Miasta Kolno
  `;
  const res = parseAnnouncementDetail(body, 'https://bip-umkolno.podlaskie.eu/flat1.html', title);
  assert.equal(res.kind, 'mieszkalny');
  assert.equal(res.round, 1);
  assert.equal(res.address_raw, 'ul. 11 listopada 12/41');
  assert.equal(res.address.street, '11 listopada');
  assert.equal(res.address.building, '12');
  assert.equal(res.address.apt, '41');
  assert.equal(res.area_m2, 37.90);
  assert.equal(res.starting_price_pln, 105000);
  assert.equal(res.auction_date, '2021-12-20');
});

test('parseLandParcels: garage parcels at ul. Wojska Polskiego', () => {
  const text = `
    BURMISTRZ MIASTA KOLNO zgodnie z Zarządzeniem Nr 95/25 OGŁASZA TRZECI USTNY PRZETARG NIEOGRANICZONY
    na sprzedaż na własność niezabudowanych działek gruntu położonych na terenie miasta Kolno przy ul. Wojska Polskiego pod zabudowę garażową :
    1. działka nr 1369/191 o pow. 18 m2, KW LM1L/00035652//9, cena wywoławcza 6000 zł, wadium, 400 zł,
    2. działka nr 1369/192 o pow. 18 m2, KW LM1L/00035652/9, cena wywoławcza 6000 zł, wadium, 400 zł,
    3. działka nr 1369/243 o pow. 29 m2, KW LM1L/00035652/9, cena wywoławcza 11000 zł, wadium 600 zł
  `;
  const parcels = parseLandParcels(text, 'https://bip-umkolno.podlaskie.eu/garaze.html', 'Garaże', 3, '2026-09-09');
  assert.equal(parcels.length, 3);
  assert.equal(parcels[0].dzialka_nr, '1369/191');
  assert.equal(parcels[0].area_m2, 18);
  assert.equal(parcels[0].starting_price_pln, 6000);
  assert.equal(parcels[0].kind, 'grunt');
  assert.equal(parcels[0].round, 3);
  assert.equal(parcels[2].dzialka_nr, '1369/243');
  assert.equal(parcels[2].area_m2, 29);
  assert.equal(parcels[2].starting_price_pln, 11000);
});

// --- Wykaz parsing tests ---

test('parseWykazDetail: wykaz for 11 Listopada 6/17 (2026)', () => {
  const text = `
    BURMISTRZ MIASTA KOLNO Działając na podstawie art. 35, ust.1 ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami
    podaje do publicznej wiadomości, że w siedzibie Urzędu Miasta Kolno przy ul. Wojska Polskiego 20 został wywieszony na okres 21 dni od 19.08.2026 r. wykaz w sprawie sprzedaży, w trybie bezprzetargowym na rzecz najemcy, nieruchomości lokalowej w skład której wchodzi:
    - samodzielny lokal mieszkalny nr 17 w budynku przy ul. 11 Listopada 6 o pow. użytkowej 32,63 m 2 z udziałem wynoszącym 3263/98780 części we współwłasności budynku
  `;
  const res = parseWykazDetail(text, 'https://bip-umkolno.podlaskie.eu/wykaz2026.html', 'Wykaz 2026');
  assert.equal(res.length, 1);
  assert.equal(res[0].kind, 'mieszkalny');
  assert.equal(res[0].address_raw, 'ul. 11 Listopada 6/17');
  assert.equal(res[0].address.street, '11 Listopada');
  assert.equal(res[0].address.building, '6');
  assert.equal(res[0].address.apt, '17');
  assert.equal(res[0].area_m2, 32.63);
  assert.equal(res[0].date, '2026-08-19');
});

test('parseWykazDetail: wykaz for 11 Listopada 12/37 (2024)', () => {
  const text = `
    podaje do publicznej wiadomości, że w siedzibie Urzędu Miasta Kolno został wywieszony na okres 21 dni od 03.09.2024 r. wykaz w sprawie sprzedaży:
    samodzielny lokal mieszkalny nr 37 w budynku przy ul. 11 Listopada 12 o pow. użytkowej 47,29 m 2 z udziałem wynoszącym 4729/224000 części
  `;
  const res = parseWykazDetail(text, 'https://bip-umkolno.podlaskie.eu/wykaz2024.html', 'Wykaz 2024');
  assert.equal(res.length, 1);
  assert.equal(res[0].address_raw, 'ul. 11 Listopada 12/37');
  assert.equal(res[0].area_m2, 47.29);
  assert.equal(res[0].date, '2024-09-03');
});

// --- Result notices parsing tests (parseResultDoc) ---

test('parseResultDoc: sold residential property (ul. Marii Dąbrowskiej 2)', () => {
  const text = `
    Kolno, dn. 27.04.2023r.
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 27.04.2023 r. w Urzędzie Miasta Kolno przy ul. Wojska Polskiego 20 odbył się przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej budynkiem mieszkalnym położonej na terenie miasta Kolno przy ul. Marii Dąbrowskiej 2 składającej się z działek nr 1855/4 o pow. 134 m 2 oraz 1856/7 o pow. 88 m2 (łączna pow. 222 m2) – KW nr LM1L/00025729/7.
    Cena wywoławcza nieruchomości 56 000,00 zł.
    Do przetargu dopuszczono jedno małżeństwo osób fizycznych.
    Nabywcami nieruchomości zostali Marlena i Patryk Marcinowscy; oboje zamieszkali 18-500 Kolno, za wylicytowaną cenę 56 560,00 zł.
  `;
  const recs = parseResultDoc(text, null, 'https://bip-umkolno.podlaskie.eu/resource/119556/Dabrowskiej2.docx');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.auction_date, '2023-04-27');
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address_raw, 'ul. Marii Dąbrowskiej 2');
  assert.equal(r.address.street, 'Marii Dąbrowskiej');
  assert.equal(r.address.building, '2');
  assert.equal(r.starting_price_pln, 56000);
  assert.equal(r.final_price_pln, 56560);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 134);
});

test('parseResultDoc: multi-parcel garage plots (2026 result notice)', () => {
  const text = `
    Kolno, dnia 10.09.2026 r.
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 09.09.2026 r. w Urzędzie Miasta Kolno przy ul. Wojska Polskiego 20 odbył się nieograniczony przetarg ustny na sprzedaż na własność niezabudowanych działek gruntu położonych na terenie miasta Kolno przy ul. Wojska Polskiego pod zabudowę garażami tj.:
    1. działka nr 1369/191 o pow. 18 m2, cena wywoławcza 6000 zł, wadium, 400 zł,
    2. działka nr 1369/192 o pow. 18 m2, cena wywoławcza 6000 zł, wadium, 400 zł,
    3. działka nr 1369/193 o pow. 18 m2, cena wywoławcza 6000 zł, wadium 400 zł,
    4. działka nr 1369/194 o pow. 18 m2, cena wywoławcza 6000 zł, wadium 400 zł,
    do którego została dopuszczona 1 osoba.
    Nabywcą działki nr 1369/193, nr 1369/194 został Pan Adam Szyperek za cenę 6060,00 zł netto dla każdej z wymienionych działek.
    W przypadku działek nr 1369/191, nr 1369/192 przetarg zakończył się wynikiem negatywnym z powodu braku zainteresowanych.
  `;
  const recs = parseResultDoc(text, null, 'https://bip-umkolno.podlaskie.eu/res2026.pdf');
  assert.equal(recs.length, 4);

  const sold193 = recs.find(r => r.dzialka_nr === '1369/193');
  assert.ok(sold193);
  assert.equal(sold193.kind, 'grunt');
  assert.equal(sold193.outcome, 'sold');
  assert.equal(sold193.starting_price_pln, 6000);
  assert.equal(sold193.final_price_pln, 6060);
  assert.equal(sold193.auction_date, '2026-09-09');

  const unsold191 = recs.find(r => r.dzialka_nr === '1369/191');
  assert.ok(unsold191);
  assert.equal(unsold191.outcome, 'unsold');
  assert.equal(unsold191.final_price_pln, null);
  assert.equal(unsold191.starting_price_pln, 6000);
});

test('parseResultDoc: negative outcome result notice (ul. Św. Floriana)', () => {
  const text = `
    Kolno, dnia 26.02.2025 r.
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 25.02.2025 r. w Urzędzie Miasta Kolno przy ul. Wojska Polskiego 20 odbył się I nieograniczony przetarg ustny na sprzedaż na własność niezabudowanej działki gruntu nr 1421/6 o pow. 222 m2 położonej na terenie miasta Kolno przy ul. Św. Floriana z przeznaczeniem pod zabudowę mieszkaniową.
    Cena wywoławcza nieruchomości: 45 000 zł.
    Przetarg odbył się z wynikiem negatywnym z powodu braku zainteresowanych.
  `;
  const recs = parseResultDoc(text, null, 'https://bip-umkolno.podlaskie.eu/floriana.pdf');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
  assert.equal(recs[0].starting_price_pln, 45000);
  assert.equal(recs[0].dzialka_nr, '1421/6');
  assert.equal(recs[0].kind, 'grunt');
  assert.equal(recs[0].auction_date, '2025-02-25');
  assert.equal(recs[0].round, 1);
});

test('parseResultDoc: returns empty array for non-result text', () => {
  assert.deepEqual(parseResultDoc('Zwykły artykuł informacyjny bez wyników przetargu', null, 'url'), []);
  assert.deepEqual(parseResultDoc('', null, 'url'), []);
  assert.deepEqual(parseResultDoc(null, null, 'url'), []);
});
