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
