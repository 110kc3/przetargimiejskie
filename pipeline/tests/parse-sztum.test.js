// Sztum parser unit tests.
// Tests groundtruthed against real municipal auction documents fetched from bip.sztum.pl:
//   - ul. Nowowiejskiego 18/1A (I+II przetarg ustny, rokowania, wykaz)
//   - ul. Jagiełły 6/6 (I przetarg ustny, result)
//   - ul. Żeromskiego 24A/3 Sztumskie Pole (I przetarg ustny, result)
//   - Działka 279/237 Sztum (land sold result)
//   - Działki 239/1... Sztumskie Pole (land announcement)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import {
  parsePLN,
  parseArea,
  parsePolishDate,
  roundFromText,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isWykazTitle,
  addressRawFromText,
  plotFromText,
  kwFromText,
  unitAreaFromText,
  startingPriceFromText,
  achievedPriceFromResult,
  auctionDateFromAnnouncement,
  auctionDateFromResult,
  parseAnnouncement,
  parseResultDoc,
  parseWykaz,
} from '../src/cities/sztum/parse.js';

import { parseBoard } from '../src/cities/sztum/crawl.js';

const FIXTURES_PATH = fileURLToPath(new URL('../test-fixtures/sztum/fixtures.json', import.meta.url));
const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'));

// ----------------------------------------------------------------- title routing

test('isSkippableTitle: auxiliary files, noise, and pure rentals are filtered out', () => {
  assert.equal(isSkippableTitle('zgłoszenie udziału w rokowaniach'), true);
  assert.equal(isSkippableTitle('oświadczenie osoby'), true);
  assert.equal(isSkippableTitle('rodo'), true);
  assert.equal(isSkippableTitle('formularz konsultacyjny'), true);
  assert.equal(isSkippableTitle('Załącznik 2 - Oświadczenie osoby przystępującej do rokowań'), true);
  assert.equal(isSkippableTitle('Państwowe Gospodarstwo Wodne Wody Polskie zawiadamia...'), true);
  assert.equal(isSkippableTitle('Konsultacje projektu Lokalnego Planu Deinstytucjonalizacji...'), true);
  assert.equal(isSkippableTitle('wykaz nieruchomości przeznaczonych do dzierżawy na czas określony do 3 lat w drodze bezprzetargowej'), true);

  // Real announcements are NOT skippable
  assert.equal(isSkippableTitle('Ogłoszenie o czwartych rokowaniach na sprzedaż lokalu mieszkalnego - ul. Nowowiejskiego 18/1A w Sztumie.'), false);
  assert.equal(isSkippableTitle('Burmistrz Miasta i Gminy Sztum ogłasza pierwszy nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego - ul. Jagiełły 6/6 w Sztumie.'), false);
});

test('isResultTitle: correctly identifies result notices', () => {
  assert.equal(isResultTitle('Informacja o wyniku trzecich rokowań na sprzedaż lokalu mieszkalnego - ul. Nowowiejskiego 18/1A w Sztumie.'), true);
  assert.equal(isResultTitle('Burmistrz Miasta i Gminy Sztum podaje do publicznej wiadomości informację o wyniku pierwszego ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego - ul. Jagiełły 6/6 w Sztumie'), true);
  assert.equal(isResultTitle('Burmistrz Miasta i Gminy Sztum podaje do publicznej wiadomości informację o wynikach I przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego ul. Żeromskiego 24A/3 w Sztumskim Polu.'), true);
  assert.equal(isResultTitle('Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - ul. Nowowiejskiego 18/1A.'), false);
});

test('isAnnouncementTitle: identifies sales auctions and rokowania', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o czwartych rokowaniach na sprzedaż lokalu mieszkalnego - ul. Nowowiejskiego 18/1A w Sztumie.'), true);
  assert.equal(isAnnouncementTitle('Burmistrz Miasta i Gminy Sztum ogłasza pierwszy nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego - ul. Jagiełły 6/6 w Sztumie.'), true);
  assert.equal(isAnnouncementTitle('Burmistrz Miasta i Gminy Sztum ogłasza pierwszy ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego - ul. Żeromskiego 24A/3 Sztumskie Pole'), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie o czwartym przetargu ustnym nieograniczonym na sprzedaż działek budowlanych nr 239/1... obr. Sztumskie Pole.'), true);
  // Results and auxiliary are rejected
  assert.equal(isAnnouncementTitle('Informacja o wyniku drugiego przetargu'), false);
  assert.equal(isAnnouncementTitle('zgłoszenie udziału w rokowaniach'), false);
});

test('isWykazTitle: identifies sale wykazy', () => {
  assert.equal(isWykazTitle('Burmistrz Miasta i Gminy Sztum podaje do publicznej wiadomości wykaz nieruchomości przeznaczonej do sprzedaży w drodze przetargu nieograniczonego - lokal mieszkalny ul. Nowowiejskiego 18/1A w Sztumie.'), true);
  assert.equal(isWykazTitle('Burmistrz Miasta i Gminy Sztum podaje do publicznej wiadomości wykaz nieruchomości przeznaczonych do sprzedaży - lokal mieszkalny ul. Jagiełły 6/6 w Sztumie.'), true);
  assert.equal(isWykazTitle('Ogłoszenie o przetargu'), false);
});

// ------------------------------------------------------------- parsing helpers

test('roundFromText: parses word ordinals, roman numerals, rokowania and typos', () => {
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('ogłasza drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('informacja o wyniku trzeciego przetargu'), 3);
  assert.equal(roundFromText('ogłoszenie o czwartym przetargu ustnym nieograniczonym'), 4);
  assert.equal(roundFromText('ogłoszenie o piątych rokowaniach'), 5);
  assert.equal(roundFromText('informacja o wyniku szóstych rokowań'), 6);
  assert.equal(roundFromText('informacja o wynikach I przetargu ustnego nieograniczonego'), 1);
  assert.equal(roundFromText('informacja o wyniku pierszewgo przetargu ustnego'), 1); // handles typo in official doc
  assert.equal(roundFromText('brak ordynału'), null);
});

test('parsePolishDate: formats dates into YYYY-MM-DD', () => {
  assert.equal(parsePolishDate('29 maja 2026 r.'), '2026-05-29');
  assert.equal(parsePolishDate('23 grudnia 2025 r.'), '2025-12-23');
  assert.equal(parsePolishDate('22 września 2025 r.'), '2025-09-22');
  assert.equal(parsePolishDate('24 listopada 2026 r.'), '2026-11-24');
  assert.equal(parsePolishDate('26 października 2026'), '2026-10-26');
  assert.equal(parsePolishDate('18.08.2026'), '2026-08-18');
});

test('addressRawFromText: extracts clean street, building and apartment', () => {
  assert.equal(addressRawFromText('LOKAL MIESZKALNY UL. NOWOWIEJSKIEGO 18/1A W SZTUMIE'), 'ul. Nowowiejskiego 18/1A');
  assert.equal(addressRawFromText('Przedmiotem przetargu był lokal mieszkalny nr 1A położony w Sztumie przy ul. Nowowiejskiego 18'), 'ul. Nowowiejskiego 18/1A');
  assert.equal(addressRawFromText('o wyniku trzecich rokowań na sprzedaż lokalu mieszkalnego nr 1A położony w budynku nr 18 przy ul. Nowowiejskiego w Sztumie'), 'ul. Nowowiejskiego 18/1A');
  assert.equal(addressRawFromText('LOKAL MIESZKALNY UL. JAGIEŁŁY 6/6 W SZTUMIE'), 'ul. Jagiełły 6/6');
  assert.equal(addressRawFromText('Przedmiotem przetargu był lokal mieszkalny nr 6 położony w Sztumie przy ul. Jagiełły 6'), 'ul. Jagiełły 6/6');
  assert.equal(addressRawFromText('LOKAL MIESZKALNY UL. ŻEROMSKIEGO 24A/3 W SZTUMSKIM POLU'), 'ul. Żeromskiego 24A/3');
  assert.equal(addressRawFromText('Przedmiotem przetargu był lokal mieszkalny nr 3 położony w Sztumskim Polu przy ul. Żeromskiego 24A'), 'ul. Żeromskiego 24A/3');
  assert.equal(addressRawFromText('sprzedaż udziału w lokalu mieszkalnym - ul. Skłodowskiej 17D/7 w Kościerzynie'), 'ul. Skłodowskiej 17D/7');
});

test('plotFromText: extracts parcel numbers, area in m2, and obręb', () => {
  const p1 = plotFromText('sprzedaży działki nr 279/237 obr. 2 miasta Sztum o pow. 0,1044 ha');
  assert.equal(p1.dzialka_nr, '279/237');
  assert.equal(p1.area_m2, 1044);
  assert.ok(p1.obreb.includes('2'));

  const p2 = plotFromText('sprzedaży działki nr 214/15 obr. Koniecwałd o pow. 0,7719 ha');
  assert.equal(p2.dzialka_nr, '214/15');
  assert.equal(p2.area_m2, 7719);
  assert.equal(p2.obreb, 'Koniecwałd');

  const p3 = plotFromText('sprzedaż działek budowlanych nr 239/1, 239/2, 239/3 obr. Sztumskie Pole');
  assert.equal(p3.dzialka_nr, '239/1, 239/2, 239/3');
  assert.equal(p3.obreb, 'Sztumskie Pole');
});

// ------------------------------------------------- groundtruthed document tests

test('Nowowiejskiego 18/1A: II przetarg announcement (file 19304)', () => {
  const rec = parseAnnouncement(fixtures['19304'], {
    detail_url: 'https://bip.sztum.pl/1186.html?file=19304',
    title: 'Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - ul. Nowowiejskiego 18/1A.',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Nowowiejskiego 18/1A');
  assert.equal(rec.address.key, 'nowowiejskiego|18|1A');
  assert.equal(rec.address.street, 'Nowowiejskiego');
  assert.equal(rec.address.building, '18');
  assert.equal(rec.address.apt, '1A');
  assert.equal(rec.area_m2, 67.39);
  assert.equal(rec.starting_price_pln, 271000);
  assert.equal(rec.round, 2);
  assert.equal(rec.auction_date, '2026-05-29');
});

test('Nowowiejskiego 18/1A: II przetarg result (file 19550)', () => {
  const recs = parseResultDoc(fixtures['19550'], null, 'https://bip.sztum.pl/1186.html?file=19550');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Nowowiejskiego 18/1A');
  assert.equal(r.address.key, 'nowowiejskiego|18|1A');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-05-29');
  assert.equal(r.starting_price_pln, 271000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
});

test('Nowowiejskiego 18/1A: IV rokowania announcement (file 19975)', () => {
  const rec = parseAnnouncement(fixtures['19975'], {
    detail_url: 'https://bip.sztum.pl/1186.html?file=19975',
    title: 'Ogłoszenie o czwartych rokowaniach na sprzedaż lokalu mieszkalnego - ul. Nowowiejskiego 18/1A w Sztumie.',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'nowowiejskiego|18|1A');
  assert.equal(rec.area_m2, 67.39);
  assert.equal(rec.starting_price_pln, 199000);
  assert.equal(rec.round, 4);
  assert.equal(rec.auction_date, '2026-11-24');
  assert.deepEqual(rec.notes, ['procedure: rokowania']);
});

test('Nowowiejskiego 18/1A: III rokowania result (file 19970)', () => {
  const recs = parseResultDoc(fixtures['19970'], null, 'https://bip.sztum.pl/1186.html?file=19970');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'nowowiejskiego|18|1A');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-10-13');
  assert.equal(r.starting_price_pln, 220000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.deepEqual(r.notes, ['procedure: rokowania']);
});

test('Nowowiejskiego 18/1A: wykaz designation (file 18910)', () => {
  const rec = parseWykaz(fixtures['18910'], {
    detail_url: 'https://bip.sztum.pl/1186.html?file=18910',
    title: 'Burmistrz Miasta i Gminy Sztum podaje do publicznej wiadomości wykaz nieruchomości...',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'nowowiejskiego|18|1A');
  assert.equal(rec.area_m2, 67.39);
  assert.equal(rec.estimated_price_pln, 271000);
});

test('Jagiełły 6/6: I przetarg announcement (file 18802)', () => {
  const rec = parseAnnouncement(fixtures['18802'], {
    detail_url: 'https://bip.sztum.pl/1186.html?file=18802',
    title: 'Burmistrz Miasta i Gminy Sztum ogłasza pierwszy nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego - ul. Jagiełły 6/6 w Sztumie.',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Jagiełły 6/6');
  assert.equal(rec.address.key, 'jagielly|6|6');
  assert.equal(rec.area_m2, 46.32);
  assert.equal(rec.starting_price_pln, 144500);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2025-12-23');
});

test('Jagiełły 6/6: I przetarg result (file 18898)', () => {
  const recs = parseResultDoc(fixtures['18898'], null, 'https://bip.sztum.pl/1186.html?file=18898');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'jagielly|6|6');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-12-23');
  assert.equal(r.starting_price_pln, 144500);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
});

test('Żeromskiego 24A/3: I przetarg announcement (file 18590)', () => {
  const rec = parseAnnouncement(fixtures['18590'], {
    detail_url: 'https://bip.sztum.pl/1186.html?file=18590',
    title: 'Burmistrz Miasta i Gminy Sztum ogłasza pierwszy ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego - ul. Żeromskiego 24A/3 Sztumskie Pole',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Żeromskiego 24A/3');
  assert.equal(rec.address.key, 'zeromskiego|24A|3');
  assert.equal(rec.area_m2, 61.18);
  assert.equal(rec.starting_price_pln, 153603);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2025-09-22');
});

test('Żeromskiego 24A/3: I przetarg result (file 18676)', () => {
  const recs = parseResultDoc(fixtures['18676'], null, 'https://bip.sztum.pl/1186.html?file=18676');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'zeromskiego|24A|3');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-09-22');
  assert.equal(r.starting_price_pln, 153603);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
});

test('Land sold result: działka 279/237 obr. 2 Sztum (file 19836)', () => {
  const recs = parseResultDoc(fixtures['19836'], null, 'https://bip.sztum.pl/1186.html?file=19836');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '279/237');
  assert.equal(r.area_m2, 1044);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-08-18');
  assert.equal(r.starting_price_pln, 140220);
  assert.equal(r.final_price_pln, 141622);
  assert.equal(r.outcome, 'sold');
});

test('Land announcement: multiple parcels obr. Sztumskie Pole (file 19891)', () => {
  const rec = parseAnnouncement(fixtures['19891'], {
    detail_url: 'https://bip.sztum.pl/1186.html?file=19891',
    title: 'Ogłoszenie o czwartym przetargu ustnym nieograniczonym na sprzedaż działek budowlanych...',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.round, 4);
  assert.equal(rec.auction_date, '2026-10-26');
});

test('parseBoard: parses board HTML snippet correctly', () => {
  const sampleHtml = `
    <p><strong>21.10.2026</strong> -&nbsp;<html><span class="bipFileDetails">
    <a class="bipLink" href="1186.html?file=19975" id="showFileDetailsAsIcon" title="plik PDF do pobrania - ogłoszenie">Ogłoszenie o czwartych rokowaniach na sprzedaż lokalu mieszkalnego &ndash; ul. Nowowiejskiego 18/1A w Sztumie.</a>
    <span class="fileDetailsPopupDiv"><span class="fileDetailsPopup">Data dodania: 2026-10-21 15:15:38</span></span>
    </span></html></p>
    <ul>
      <li><a class="bipLink" href="1186.html?file=19976">zgłoszenie udziału w rokowaniach</a></li>
    </ul>
    <p><strong>21.10.2026</strong> -&nbsp;<html><span class="bipFileDetails">
    <a class="bipLink" href="1186.html?file=19970" id="showFileDetailsAsIcon" title="plik PDF do pobrania - informacja">Informacja o wyniku trzecich rokowań na sprzedaż lokalu mieszkalnego &ndash; ul. Nowowiejskiego 18/1A w Sztumie.</a>
    <span class="fileDetailsPopupDiv"><span class="fileDetailsPopup">Data dodania: 2026-10-21 14:10:00</span></span>
    </span></html></p>
  `;
  const items = parseBoard(sampleHtml);
  assert.equal(items.length, 2);
  assert.equal(items[0].fileId, '19975');
  assert.equal(items[0].type, 'announcement');
  assert.equal(items[0].published_date, '2026-10-21');
  assert.equal(items[1].fileId, '19970');
  assert.equal(items[1].type, 'result');
  assert.equal(items[1].published_date, '2026-10-21');
});
