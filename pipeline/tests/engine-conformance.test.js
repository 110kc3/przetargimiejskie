import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { cities } from '../src/cities/index.js';
import { ONBOARDING_COHORT } from '../src/cities/onboarding-cohort.js';
import { ENGINE_STATUS, isEnginePublishable } from '../src/core/engine-status.js';
import { canonicalizeEngineRecords } from '../src/core/engine-records.js';
import { findAuctionDate, parseAreaSqm } from '../src/core/engine-fields.js';
import { buildCityData } from '../src/core/build-properties.js';
import { buildLand } from '../src/core/build-land.js';
import { parseBipInfoDoc } from '../src/core/bipinfo-bip.js';
import { parseRekordSiNotice } from '../src/core/rekordsi-bip.js';
import { parseNefeniArticle } from '../src/core/nefeni-bip.js';
import { parseMadkomAnnouncement } from '../src/core/madkom-bip.js';

function fixture(name) {
  return readFileSync(new URL(`./fixtures/engines/${name}`, import.meta.url), 'utf8');
}

function bipInfo(name, id) {
  return parseBipInfoDoc(fixture(`bipinfo-ruda-slaska-${name}.html`),
    `https://rudaslaska.bip.info.pl/dokument.php?iddok=${id}&idmp=4479&r=r`, { id: 'ruda-slaska', label: 'Ruda Śląska' });
}

function rekordSi(name, id) {
  return parseRekordSiNotice(fixture(`rekordsi-dabrowa-gornicza-${name}.html`),
    `https://bip.dabrowa-gornicza.pl/15665/dokument/${id}`, { id: 'dabrowa-gornicza', label: 'Dąbrowa Górnicza' });
}

function nefeni(name, id) {
  return parseNefeniArticle(fixture(`nefeni-kowal-${name}.html`),
    `https://kowal.bip.net.pl/kategorie/166-2026/artykuly/${id}-notice`, { id: 'kowal', label: 'Kowal' });
}

function madkom(name, id) {
  const detail = JSON.parse(fixture(`madkom-aleksandrow-lodzki-${name}.json`));
  return parseMadkomAnnouncement({ id, title: detail.title, link: detail.link }, detail.content,
    { id: 'aleksandrow-lodzki', label: 'Aleksandrów Łódzki', origin: 'https://bip.aleksandrow-lodzki.pl' });
}

function publishThroughRefreshPath(rawRecords) {
  const { listings, land } = canonicalizeEngineRecords(rawRecords);
  const { properties } = buildCityData({ allRecords: [], active: listings, wykaz: [], detailAreas: new Map() });
  const { plots } = buildLand(land, 'conformance');
  return { listings, land, properties, plots };
}

test('BIP.INFO: an addressed flat auction becomes a keyed property and a wykaz is dropped', () => {
  const result = publishThroughRefreshPath([
    bipInfo('91444-auction-flat', 91444), bipInfo('91442-wykaz', 91442),
  ]);
  assert.equal(result.properties.length, 1);
  assert.equal(result.properties[0].key, 'ryszarda siekiela|23|6');
  assert.equal(result.properties[0].kind, 'mieszkalny');
  assert.equal(result.properties[0].listings[0].round, 1);
});

test('BIP.INFO: a land auction without a parcel or street is not published', () => {
  const result = publishThroughRefreshPath([bipInfo('91443-auction-land', 91443)]);
  assert.equal(result.plots.length, 0);
  assert.equal(result.properties.length, 0);
});

test('REKORD SI: a multi-lot notice is not published and its venue is never taken as a property address', () => {
  const raw = [rekordSi('206766-auction', 206766), rekordSi('206940-wykaz', 206940)];
  assert.match(raw[0].title, /^Prezydent Miasta Dąbrowy Górniczej ogłasza/);
  const result = publishThroughRefreshPath(raw);
  assert.deepEqual(result.land, []);
  assert.deepEqual(result.listings, []);
});

test('Nefeni: a notice whose details are only in a PDF attachment is not published', () => {
  const result = publishThroughRefreshPath([nefeni('1110-auction-pdf-only', 1110), nefeni('1000-non-auction', 1000)]);
  assert.deepEqual(result.listings, []);
  assert.deepEqual(result.land, []);
});

test('MADKOM: a land auction with a parcel becomes a keyed plot with unknown price and date', () => {
  const result = publishThroughRefreshPath([
    madkom('15090-auction-land-parcel', 15090), madkom('15476-auction-land', 15476),
  ]);
  assert.equal(result.plots.length, 1);
  assert.equal(result.plots[0].dzialka_nr, '43/17');
  assert.equal(result.plots[0].area_m2, null);
});

test('engine records never carry a bare string as address', () => {
  const raws = [bipInfo('91444-auction-flat', 91444), rekordSi('206766-auction', 206766), nefeni('1110-auction-pdf-only', 1110)];
  for (const raw of raws) assert.ok(raw.address === null || typeof raw.address === 'object');
});

test('the auction date is the announced date, not the publication date', () => {
  const text = 'Kowal, dnia 3 listopada 2026 r. Ogłoszenie. Przetarg odbędzie się w dniu 15 grudnia 2026 r. o godz. 10:00';
  assert.equal(findAuctionDate(text), '2026-12-15');
  assert.equal(findAuctionDate('Kowal, dnia 3 listopada 2026 r. Ogłoszenie o przetargu'), null);
});

test('areas in hectares are converted to square metres', () => {
  assert.equal(parseAreaSqm('działka o powierzchni 0,5120 ha'), 5120);
  assert.equal(parseAreaSqm('lokal o powierzchni użytkowej 48,5 m2'), 48.5);
});

test('every engine has a recorded conformance status', () => {
  const engines = new Set(cities.map((city) => city.engine).filter(Boolean));
  for (const engine of engines) assert.ok(ENGINE_STATUS[engine], `${engine} has no status`);
});

test('only cities on a priced engine, or hand-built adapters, may enter the onboarding cohort', () => {
  for (const id of ONBOARDING_COHORT) {
    const city = cities.find((candidate) => candidate.id === id);
    assert.ok(city, `${id} is not registered`);
    assert.ok(isEnginePublishable(city.engine), `${id} uses engine ${city.engine} with status ${ENGINE_STATUS[city.engine]}`);
  }
});
