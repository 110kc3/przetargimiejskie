import test from 'node:test';
import assert from 'node:assert/strict';
import trzcinskoZdroj from '../src/cities/trzcinsko-zdroj/index.js';

test('Trzcińsko-Zdrój adapter initializes with valid configuration', () => {
  assert.equal(trzcinskoZdroj.id, 'trzcinsko-zdroj');
  assert.equal(trzcinskoZdroj.teryt, '3206084');
  assert.equal(trzcinskoZdroj.label, 'Trzcińsko-Zdrój');
  assert.equal(trzcinskoZdroj.voivodeship, 'zachodniopomorskie');
  assert.equal(typeof trzcinskoZdroj.crawlActive, 'function');
  assert.equal(typeof trzcinskoZdroj.crawlResults, 'function');
});
