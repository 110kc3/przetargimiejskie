import test from 'node:test';
import assert from 'node:assert/strict';
import bystrzycaKlodzka from '../src/cities/bystrzyca-klodzka/index.js';

test('Bystrzyca Kłodzka adapter initializes with valid configuration', () => {
  assert.equal(bystrzycaKlodzka.id, 'bystrzyca-klodzka');
  assert.equal(bystrzycaKlodzka.teryt, '0208064');
  assert.equal(bystrzycaKlodzka.label, 'Bystrzyca Kłodzka');
  assert.equal(bystrzycaKlodzka.voivodeship, 'dolnoslaskie');
  assert.equal(typeof bystrzycaKlodzka.crawlActive, 'function');
  assert.equal(typeof bystrzycaKlodzka.crawlResults, 'function');
});
