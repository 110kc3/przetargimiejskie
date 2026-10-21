// Kraków parser tests — MULTI-PROPERTY notices. Fixtures are condensed-but-
// faithful copies of real notices (verified 2026-06-26): news_id 245809
// (announcement) and 249643 (result), each bundling a garage (ul. Królewska 69
// G12) and a land share (działka 169/16, obręb P-30). Shared auction date
// 15.04.2026; achieved price reads "cena … została ustalona na kwotę …".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLand } from '../src/core/build-land.js';
import { buildCityData } from '../src/core/build-properties.js';
import { mergeProperties } from '../src/core/merge-history.js';
import { applyDurablePropertyHeals } from '../src/core/verified-heals.js';
import { repairLandLedger } from '../src/core/ledger-repairs.js';

import { noticeDate, splitItems, priceFromItem, achievedFromItem, parseNotice, parseResultDoc } from '../src/cities/krakow/parse.js';

const CURRENT_LAND = readFileSync(new URL('./fixtures/remediation/krakow-263185.html', import.meta.url), 'utf8');
const sourceNotice = id => readFileSync(new URL(`./fixtures/remediation/krakow-${id}.html`, import.meta.url), 'utf8');

test('published malformed identities heal durably while the original land row remains auditable', () => {
  const original = JSON.parse(readFileSync(new URL('./fixtures/remediation/krakow-retained-8703ad158.json', import.meta.url), 'utf8')).properties;
  const repaired = applyDurablePropertyHeals(structuredClone(original), 'krakow');
  assert.ok(repaired.every(p => !/cena wywolawcza/.test(p.key)));
  assert.ok(!repaired.some(p => p.key === 'grottgera|24|7'));
  const house = repaired.find(p => p.key === 'morawianskiego|25|');
  assert.equal(house.kind, 'zabudowana');
  assert.equal(house.area_m2, null);
  assert.equal(house.listings[0].final_price_pln, 221850);
  assert.ok(house.legacy_keys.some(k => k.startsWith('morawianskiego cena')));
  const commercial = repaired.find(p => p.key === 'grottgera|24|6');
  assert.ok(commercial.legacy_keys.includes('grottgera|24|7'));
  const garage = repaired.find(p => p.key === 'krolewskiej|69|garaz-12');
  assert.deepEqual(garage.listings.map(l => [l.date, l.starting_price_pln, l.final_price_pln, l.outcome]), [
    ['2025-11-04', 114000, null, 'unsold'], ['2026-04-15', 114000, 130000, 'sold'],
  ]);
  assert.deepEqual(applyDurablePropertyHeals(structuredClone(repaired), 'krakow'), repaired);
  const originalLand = JSON.parse(readFileSync(new URL('./fixtures/remediation/krakow-land-retained-8703ad158.json', import.meta.url), 'utf8')).plots;
  const land = repairLandLedger(originalLand, 'krakow');
  assert.equal(land.length, 13);
  const grouped = land.filter(p => p.key.startsWith('dz|p-86|259/'));
  assert.equal(grouped.length, 7);
  assert.equal(grouped.reduce((sum, p) => sum + p.parcels.length, 0), 11);
  assert.ok(grouped.every(p => p.listings[0].date === '2025-09-09'));
  assert.ok(!land.some(p => p.key === 'dz|k-44|17/1'));
  assert.equal(land.find(p => p.key === 'dz|k-44|17/1, 17/2').listings[0].starting_price_pln, 436000);
  assert.equal(land.find(p => p.key === 'dz|k-49|215').listings[0].final_price_pln, 385000);
  assert.deepEqual(repairLandLedger(structuredClone(land), 'krakow'), land);
});

test('separate HTML result lots cannot exchange identities, prices or outcomes', () => {
  const rows = parseResultDoc(sourceNotice('236926'), null, 'https://www.bip.krakow.pl/?news_id=236926');
  assert.deepEqual(rows.map(r => [r.address?.key || r.dzialka_nr, r.kind, r.starting_price_pln, r.final_price_pln, r.outcome]), [
    ['morawianskiego|25|', 'zabudowana', 145000, 221850, 'sold'],
    ['215', 'grunt', 120000, 385000, 'sold'],
    ['krolewskiej|69|garaz-12', 'garaz', 114000, null, 'unsold'],
    ['169/16', 'grunt', 53000, null, 'unsold'],
  ]);
  assert.ok(rows.every(r => r.auction_date === '2025-11-04'));
  const modern = parseResultDoc(sourceNotice('261755'), null, 'https://www.bip.krakow.pl/?news_id=261755');
  assert.deepEqual(modern.map(r => [r.address?.key || r.dzialka_nr, r.final_price_pln]), [
    ['grottgera|24|6', 190000], ['sportowym|1|7', 174000], ['169/16', null],
  ]);
});

test('source reparse repairs the retained November garage result while preserving its later sale', () => {
  const allRecords = parseResultDoc(sourceNotice('236926'), null, 'https://www.bip.krakow.pl/?news_id=236926').filter(r => r.address);
  const fresh = buildCityData({ allRecords, active: [], wykaz: [], detailAreas: new Map() }).properties;
  const garage = structuredClone(fresh.find(p => p.key === 'krolewskiej|69|garaz-12'));
  garage.listings[0] = { ...garage.listings[0], starting_price_pln: 145000, final_price_pln: 221850, outcome: 'sold' };
  garage.listings.push({ ...garage.listings[0], date: '2026-04-15', round: 2,
    starting_price_pln: 114000, final_price_pln: 130000,
    source_pdf: 'https://www.bip.krakow.pl/?news_id=249643' });
  const merged = mergeProperties([garage], fresh).properties;
  const retained = merged.find(p => p.key === garage.key).listings;
  assert.deepEqual(retained.map(l => [l.date, l.starting_price_pln, l.final_price_pln, l.outcome]), [
    ['2025-11-04', 114000, null, 'unsold'], ['2026-04-15', 114000, 130000, 'sold'],
  ]);
  assert.equal(merged.find(p => p.key === 'morawianskiego|25|').listings[0].final_price_pln, 221850);
});

test('split formatting words, reverse building numbers and numbered paragraphs preserve actual subjects', () => {
  const rows = parseResultDoc(sourceNotice('165659'), null, 'source');
  assert.equal(rows.find(r => r.address?.key === 'miodowej|22|12').starting_price_pln, 850000);
  assert.equal(rows.find(r => r.address?.key === 'soltyka|9|').final_price_pln, 3000000);
  const flat = parseResultDoc(sourceNotice('221941'), null, 'source');
  assert.equal(flat[0].address.key, 'felicjanek|15|5');
  assert.equal(flat[0].area_m2, 16.82);
  const mixed = parseResultDoc(sourceNotice('172574'), null, 'source');
  assert.deepEqual(mixed.map(r => r.address?.key || r.dzialka_nr), [
    'piastow|15|64', '494/6, 498/4', 'lipowskiego|29|', 'wegierskiej|10|22', 'wegierskiej|10|14',
  ]);
  assert.equal(mixed[1].area_m2, 591);
});

test('multi-price prose keeps all seven parcel lots without constructing a street from their prices', () => {
  const rows = parseNotice(sourceNotice('227539'));
  assert.deepEqual(rows.map(r => [r.dzialka_nr, r.area_m2, r.starting_price_pln]), [
    ['259/152, 259/369', 369, 238000], ['259/184, 259/370', 365, 235000],
    ['259/198, 259/367', 330, 215000], ['259/209', 341, 220000],
    ['259/213, 259/371', 420, 280000], ['259/219', 408, 270000], ['259/242', 324, 210000],
  ]);
  assert.ok(rows.every(r => r.kind === 'grunt' && !r.address && r.auction_date === '2025-09-09'));
  assert.deepEqual(parseNotice(sourceNotice('227539').replace('259/152 i nr 259/369', '259/152 i nr 999/1')), []);
});

test('current share sale retains both parcels, total area and explicit share prices', () => {
  const rows = parseNotice(CURRENT_LAND, { url: 'https://www.bip.krakow.pl/?news_id=263185' });
  assert.deepEqual(rows.map(r => [r.dzialka_nr, r.area_m2, r.starting_price_pln, r.round]), [
    ['17/1, 17/2', 546, 436000, 1], ['169/16', 216, 42400, 4],
  ]);
  assert.ok(rows.every(r => r.auction_date === '2026-11-05'));
  assert.ok(rows[0].notes.some(note => note.includes('1/2')));
  assert.ok(rows[1].notes.some(note => note.includes('2/6')));
  const { plots } = buildLand(rows, 'krakow');
  assert.equal(plots.length, 2);
  assert.equal(plots.find(p => p.dzialka_nr === '17/1, 17/2').parcels.length, 2);
});

test('inconsistent multi-parcel totals cannot become a single-parcel sale', () => {
  const rows = parseNotice(CURRENT_LAND.replace('łączna powierzchnia 0,0546 ha', 'łączna powierzchnia 0,0547 ha'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].dzialka_nr, '169/16');
});

test('missing achieved price is not proof of an unsuccessful auction', () => {
  const row = '1. nieruchomości gruntowej, działka nr 123/4 o powierzchni 0,0123 ha w obrębie P-30. Cena wywoławcza wynosiła 12 000,00 zł.';
  assert.deepEqual(parseResultDoc(`Informacja o wyniku przetargu z dnia 5 listopada 2026 r. ${row}`, null, 'source'), []);
});

const RESULT = `Informacja o wynikach przetargów z dnia 15 kwietnia 2026 r.
W dniu 15 kwietnia 2026 r. w siedzibie Urzędu Miasta Krakowa Rynek Podgórski 1, przeprowadzone zostały przetargi ustne nieograniczone na sprzedaż nieruchomości stanowiących własność Gminy Miejskiej Kraków
1. lokalu o przeznaczeniu innym niż mieszkalne (garażu) oznaczonego Nr G12 o powierzchni użytkowej 17,00 m2, położonego w budynku przy ul. Królewskiej Nr 69 wraz z udziałem wynoszącym 5/1000 części w nieruchomości wspólnej oraz nieruchomość gruntowa oznaczona jako działka nr 383/13 o powierzchni 0,0879 ha, położona w obrębie K-3, jednostka ewidencyjna Krowodrza. Cena wywoławcza wynosiła 114 000,00 zł. W wyniku przeprowadzonego przetargu cena nieruchomości została ustalona na kwotę 130 000,00 zł. Nabywcą garażu ustalona została Pani Zuzanna Markiewicz, gdyż zaoferowała najwyższą cenę.
2. udziału przysługującego Gminie Miejskiej Kraków wynoszącego 2/6 części w nieruchomości gruntowej, oznaczonej nr działki 169/16 o powierzchni 0,0216 ha, położonej w obrębie P-30, jednostka ewidencyjna Podgórze, w rejonie ul. Łagiewnickiej. Cena wywoławcza udziału wynosiła 47 700,00 zł brutto. Przetarg zakończył się wynikiem negatywnym, gdyż w wyznaczonym terminie nikt nie wpłacił wadium i nie przystąpił do przetargu.`;

const ANNOUNCEMENT = `OGŁOSZENIE O PRZETARGACH Prezydent Miasta Krakowa ogłasza przetargi ustne nieograniczone na sprzedaż nieruchomości stanowiących własność Gminy Miejskiej Kraków
1. drugi przetarg na sprzedaż lokalu o przeznaczeniu innym niż mieszkalne (garażu) oznaczonego Nr G12 o powierzchni użytkowej 17,00 m2, położonego w budynku przy ul. Królewskiej Nr 69 wraz z udziałem wynoszącym 5/1000 części w nieruchomości wspólnej oraz nieruchomość gruntowa oznaczona jako działka nr 383/13 o powierzchni 0,0879 ha, położona w obrębie K-3, jednostka ewidencyjna Krowodrza. Cena wywoławcza wynosi: 114 000,00 zł Wadium: 11 400,00 zł Pierwszy przetarg na sprzedaż nieruchomości został przeprowadzony w dniu 4 listopada 2025 r.
2. drugi przetarg na sprzedaż przysługującego Gminie Miejskiej Kraków udziału wynoszącego 2/6 części w nieruchomości gruntowej, oznaczonej numerem działki 169/16 o powierzchni 0,0216 ha, położonej w obrębie P-30, jednostka ewidencyjna Podgórze położonej w Krakowie przy ul. Łagiewnickiej. Cena wywoławcza nieruchomości wynosi: 47 700,00 zł brutto, w tym 23% podatku VAT Wadium: 4 800,00 zł Pierwszy przetarg na sprzedaż nieruchomości został przeprowadzony w dniu 4 listopada 2025 r.
Przetargi na sprzedaż nieruchomości odbędą się w dniu 15 kwietnia 2026 r. w budynku Urzędu Miasta Krakowa w Rynku Podgórskim 1. poz. 1 godz. 9:00 poz. 2 godz. 10:00`;

test('helpers', () => {
  assert.equal(noticeDate(RESULT, { isResult: true }), '2026-04-15');
  assert.equal(noticeDate(ANNOUNCEMENT), '2026-04-15');
  assert.equal(splitItems(RESULT).length, 2);
  assert.equal(priceFromItem('Cena wywoławcza wynosiła 114 000,00 zł'), 114000);
  assert.equal(achievedFromItem('cena nieruchomości została ustalona na kwotę 130 000,00 zł'), 130000);
});

test('parseResultDoc: 2 properties — garage SOLD + land share NEGATIVE', () => {
  const recs = parseResultDoc(RESULT, null, 'https://www.bip.krakow.pl/?news_id=249643');
  assert.equal(recs.length, 2);
  const garage = recs[0];
  assert.equal(garage.kind, 'garaz');
  assert.equal(garage.address.key, 'krolewskiej|69|garaz-12');
  assert.equal(garage.area_m2, 17);
  assert.equal(garage.starting_price_pln, 114000);
  assert.equal(garage.final_price_pln, 130000);
  assert.equal(garage.outcome, 'sold');
  assert.equal(garage.auction_date, '2026-04-15');
  const land = recs[1];
  assert.equal(land.kind, 'grunt');
  assert.equal(land.dzialka_nr, '169/16');
  assert.equal(land.obreb, 'P-30');
  assert.equal(land.area_m2, 216); // 0,0216 ha
  assert.equal(land.starting_price_pln, 47700);
  assert.equal(land.outcome, 'unsold');
});

test('parseNotice: announcement — 2 active items, round 2, shared date', () => {
  const recs = parseNotice(ANNOUNCEMENT, { isResult: false, url: 'x' });
  assert.equal(recs.length, 2);
  assert.equal(recs[0].kind, 'garaz');
  assert.equal(recs[0].address.key, 'krolewskiej|69|garaz-12');
  assert.equal(recs[0].round, 2);
  assert.equal(recs[0].starting_price_pln, 114000);
  assert.equal(recs[0].auction_date, '2026-04-15');
  assert.equal(recs[1].kind, 'grunt');
  assert.equal(recs[1].dzialka_nr, '169/16');
  assert.equal(recs[1].round, 2);
  assert.equal(recs[1].starting_price_pln, 47700);
});

test('HTML ordered-list lots retain separate commercial, flat and land identities', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('./fixtures/remediation/krakow-257668.html', import.meta.url), 'utf8');
  const rows = parseNotice(html);
  assert.deepEqual(rows.map(r => [r.address?.key || r.dzialka_nr, r.kind, r.starting_price_pln]), [
    ['grottgera|24|6', 'uzytkowy', 120000], ['sportowym|1|7', 'mieszkalny', 132000],
    ['169/16', 'grunt', 45050],
  ]);
  assert.ok(rows.every(r => r.auction_date === '2026-09-02'));
});

test('inline formatting unwraps without splitting words or retaining nested wrapper remnants', () => {
  const date = noticeDate('odbędą się przetargi w dniu <span>15</span> <strong>kwietnia</strong> 2026 r.');
  assert.equal(date, '2026-04-15');
});
