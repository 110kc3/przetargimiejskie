// Kraków parser tests — MULTI-PROPERTY notices. Fixtures are condensed-but-
// faithful copies of real notices (verified 2026-06-26): news_id 245809
// (announcement) and 249643 (result), each bundling a garage (ul. Królewska 69
// G12) and a land share (działka 169/16, obręb P-30). Shared auction date
// 15.04.2026; achieved price reads "cena … została ustalona na kwotę …".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { noticeDate, splitItems, priceFromItem, achievedFromItem, parseNotice, parseResultDoc } from '../src/cities/krakow/parse.js';

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
