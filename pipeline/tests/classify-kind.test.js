import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyKind, isLandKind, LAND_KIND, normalizeKind } from '../src/core/classify-kind.js';

test('flats — lokal mieszkalny → mieszkalny', () => {
  for (const s of [
    'Pierwszy przetarg ustny na sprzedaż lokalu mieszkalnego nr 5 przy ul. Kwiatowej 3',
    'sprzedaż samodzielnego lokalu mieszkalnego',
    'przetarg na zbycie prawa własności lokalu mieszkalnego',
    'Lokal mieszkalny w budynku mieszkalnym przy ul. X 4/2', // flat in a building → still a flat
  ]) {
    assert.equal(classifyKind(s), 'mieszkalny', s);
  }
});

test('commercial — lokal użytkowy / niemieszkalny → uzytkowy', () => {
  for (const s of [
    'sprzedaż lokalu użytkowego nr 3',
    'II przetarg na lokal niemieszkalny',
    'lokalu uzytkowego (bez polskich znaków)',
  ]) {
    assert.equal(classifyKind(s), 'uzytkowy', s);
  }
});

test('garage — garaż → garaz', () => {
  assert.equal(classifyKind('sprzedaż garażu nr 12'), 'garaz');
  assert.equal(classifyKind('przetarg na garaz'), 'garaz');
});

test('land — niezabudowana / działka / grunt → grunt', () => {
  for (const s of [
    'czwarty przetarg na sprzedaż nieruchomości niezabudowanej, działka nr 1963/59',
    'sprzedaż działki nr 233/1 o pow. 514 m2',
    'nieruchomość gruntowa niezabudowana',
    'nieruchomości gruntowej przy ul. Solskiego', // bare gruntowa → land
  ]) {
    assert.equal(classifyKind(s), 'grunt', s);
  }
});

test('house — nieruchomość zabudowana / budynek mieszkalny / dom → zabudowana', () => {
  for (const s of [
    'I przetarg na sprzedaż nieruchomości zabudowanej budynkiem mieszkalnym przy ul. Chrzanowskiej 60',
    'sprzedaż nieruchomości zabudowanej',
    'budynek mieszkalny jednorodzinny',
    'sprzedaż domu przy ul. Botanicznej 5',
  ]) {
    assert.equal(classifyKind(s), 'zabudowana', s);
  }
});

test('built plot — "nieruchomość gruntowa zabudowana" is a house, not land', () => {
  assert.equal(
    classifyKind('nieruchomości gruntowej zabudowanej budynkiem mieszkalnym'),
    'zabudowana',
  );
});

test('"niezabudowana" never leaks to house (substring trap)', () => {
  assert.equal(classifyKind('nieruchomość niezabudowana'), 'grunt');
});

test('street names with "dom"/"zabudow" roots do not false-positive', () => {
  // "Domańskiego" / "Domowa" must not trip the bare-dom rule.
  assert.equal(classifyKind('sprzedaż lokalu mieszkalnego przy ul. Domańskiego 4'), 'mieszkalny');
});

test('empty / nullish → unknown', () => {
  assert.equal(classifyKind(''), 'unknown');
  assert.equal(classifyKind(null), 'unknown');
  assert.equal(classifyKind(undefined), 'unknown');
  assert.equal(classifyKind('   '), 'unknown');
});

test('helpers', () => {
  assert.equal(LAND_KIND, 'grunt');
  assert.equal(isLandKind('grunt'), true);
  assert.equal(isLandKind('zabudowana'), false);
  assert.equal(isLandKind('mieszkalny'), false);
});

test('normalizeKind — canonical kinds pass through unchanged', () => {
  for (const k of ['mieszkalny', 'zabudowana', 'uzytkowy', 'garaz', 'grunt', 'unknown']) {
    assert.equal(normalizeKind(k), k);
  }
});

test('normalizeKind — "zabudowa" alias heals to "zabudowana" (the TYP-column bug)', () => {
  assert.equal(normalizeKind('zabudowa'), 'zabudowana');
});

test('normalizeKind — empty / nullish / garbage → unknown', () => {
  assert.equal(normalizeKind(''), 'unknown');
  assert.equal(normalizeKind(null), 'unknown');
  assert.equal(normalizeKind(undefined), 'unknown');
  assert.equal(normalizeKind('kind.zabudowa'), 'unknown');
  assert.equal(normalizeKind('wat'), 'unknown');
});
