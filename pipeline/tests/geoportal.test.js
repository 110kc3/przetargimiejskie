import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geoportalUrl } from '../src/core/geoportal.js';

test('prefers a source-provided map link verbatim', () => {
  assert.equal(geoportalUrl({ geoportal_url: 'https://bb.e-mapa.net/?dz=1' }), 'https://bb.e-mapa.net/?dz=1');
});

test('per-city override wins over the default', () => {
  const u = geoportalUrl({ dzialka_nr: '1/2', obreb: 'A' }, { geoportal: (p) => 'https://sip.example/' + p.dzialka_nr });
  assert.equal(u, 'https://sip.example/1/2');
});

test('precise national-geoportal deep link from a full TERYT id', () => {
  const u = geoportalUrl({ dzialka_id: '246101_1.0009.1922/182' });
  assert.ok(u.startsWith('https://mapy.geoportal.gov.pl/imap/?identifyParcel='), u);
  assert.ok(decodeURIComponent(u).includes('246101_1.0009.1922/182'));
});

test('fallback search includes parcel + obręb + city', () => {
  const u = geoportalUrl({ dzialka_nr: '1922/182', obreb: 'Lipnik' }, { label: 'Bielsko-Biała' });
  assert.ok(u.startsWith('https://www.google.com/search?q='), u);
  const dec = decodeURIComponent(u);
  assert.ok(dec.includes('1922/182') && dec.includes('Lipnik') && dec.includes('Bielsko-Biała'));
});

test('fallback search includes the street for addr-only plots (no parcel number)', () => {
  // Regression: an addr-only plot used to collapse to the obreb code + city,
  // dropping the street it has. The street must survive into the query.
  const u = geoportalUrl(
    { street: 'Orła Białego', address_raw: 'ul. Orła Białego', obreb: '0005 Krasowy' },
    { label: 'Mysłowice' },
  );
  assert.ok(u.startsWith('https://www.google.com/search?q='), u);
  const dec = decodeURIComponent(u);
  assert.ok(dec.includes('Orła Białego'), 'street present: ' + dec);
  assert.ok(dec.includes('Mysłowice'), 'city present: ' + dec);
});

test('null when there is nothing to locate', () => {
  assert.equal(geoportalUrl({}), null);
  assert.equal(geoportalUrl(null), null);
});

import { nationalGeoportalUrl } from '../src/core/geoportal.js';

test('nationalGeoportalUrl: identifyParcel link for a full TERYT id, null otherwise', () => {
  assert.ok(nationalGeoportalUrl('246101_1.0032.290/96').startsWith('https://mapy.geoportal.gov.pl/imap/?identifyParcel='));
  assert.ok(nationalGeoportalUrl('247801_1.0012.AR_14.6089/50')); // identifier with an arkusz (AR_)
  assert.equal(nationalGeoportalUrl('Lipnik 290/96'), null);      // not a TERYT id
  assert.equal(nationalGeoportalUrl(null), null);
});

test('geoportalUrl: a resolved dzialka_id yields the precise national link', () => {
  const u = geoportalUrl({ dzialka_nr: '290/96', obreb: 'Lipnik', dzialka_id: '246101_1.0032.290/96' }, { label: 'Bielsko' });
  assert.ok(u.includes('identifyParcel='), u);
});
