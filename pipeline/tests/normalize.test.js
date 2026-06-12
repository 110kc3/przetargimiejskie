// parseAddress tests, incl. the June 2026 fix: trailing "m. N" (mieszkanie N)
// is the APARTMENT number — it used to be stripped as noise, collapsing
// distinct flats into one bare-building key.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseAddress } from '../src/core/normalize.js';

test('trailing "m. N" is captured as the apartment, not stripped', () => {
  assert.equal(parseAddress('ul. Zwycięstwa 34 m. 9').key, 'zwyciestwa|34|9');
  assert.equal(parseAddress('ul. Zwycięstwa 34 m. 7').key, 'zwyciestwa|34|7');
  assert.equal(parseAddress('Pszczyńska 7A m 14').key, 'pszczynska|7A|14');
  // letter-suffixed flat
  assert.equal(parseAddress('Brzozowa 41 m. 2a').key, 'brzozowa|41|2A');
  // and it matches the equivalent slash spelling
  assert.equal(parseAddress('ul. Zwycięstwa 34 m. 9').key, parseAddress('Zwycięstwa 34/9').key);
});

test('"wraz z …" tail is still stripped', () => {
  assert.equal(
    parseAddress('Zwycięstwa 34 m. 9 wraz z piwnicą').key,
    'zwyciestwa|34|9',
  );
  assert.equal(parseAddress('Kurpiowska 16 wraz z udziałem w gruncie').key, 'kurpiowska|16|');
});

test('existing forms unchanged: garage, roman apt, bare building', () => {
  assert.equal(parseAddress('Kozielska 13 garaż nr 3').key, 'kozielska|13|garaz-3');
  assert.equal(parseAddress('Barlickiego 12/I').key, 'barlickiego|12|I');
  assert.equal(parseAddress('Kurpiowska 16').key, 'kurpiowska|16|');
});

// Display-only genitive → nominative (June 2026): single-word adjectival
// endings flip; person-name genitives, multi-word and hyphenated names don't.
import { nominativeStreetDisplay } from '../src/core/normalize.js';

test('nominativeStreetDisplay flips adjectival single-word genitives only', () => {
  assert.equal(nominativeStreetDisplay('Sportowej'), 'Sportowa');
  assert.equal(nominativeStreetDisplay('Kalinowej'), 'Kalinowa');
  assert.equal(nominativeStreetDisplay('Średniej'), 'Średnia');
  assert.equal(nominativeStreetDisplay('Hutniczej'), 'Hutnicza');
  assert.equal(nominativeStreetDisplay('Cmentarnej'), 'Cmentarna');
  assert.equal(nominativeStreetDisplay('Nowej'), 'Nowa');
  // ambiguous with surnames — left for evidence-based passes
  assert.equal(nominativeStreetDisplay('Skłodowskiej'), 'Skłodowskiej');
  assert.equal(nominativeStreetDisplay('Częstochowskiej'), 'Częstochowskiej');
  // multi-word / hyphenated stay (patron full names, "Królewskiej Tamy")
  assert.equal(nominativeStreetDisplay('Królewskiej Tamy'), 'Królewskiej Tamy');
  assert.equal(nominativeStreetDisplay('Skłodowskiej-Curie'), 'Skłodowskiej-Curie');
});
