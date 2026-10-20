import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crawlAll, fetchBoardRefs, parseBoardPage, parseYearBoards, extractDocBody } from '../src/cities/zgorzelec/crawl.js';
import { buildRecordText, parseAnnouncements, parseResultDoc } from '../src/cities/zgorzelec/parse.js';
import { buildLand } from '../src/core/build-land.js';

const fixture = name => readFileSync(new URL(`./fixtures/remediation/zgorzelec-${name}.html`, import.meta.url), 'utf8');
const board = (id, body, page = 1) => `<div id="content-main"><input name='idmp' value=${id}><input name='istr' value=${page}>${body}</div>`;
const docLink = (doc, id, title) => `<a href='dokument.php?iddok=${doc}&amp;idmp=${id}&amp;r=r'>${title}</a>`;
const empty = id => board(id, 'brak dokumentów');
const blob = (name, title) => buildRecordText({ title, body: extractDocBody(fixture(name)) });

test('real year links are selected without following administrative, foreign or script URLs', () => {
  const years = parseYearBoards(fixture('announce-archive'), 2026);
  assert.deepEqual(years.map(y => [y.year, y.idmp]), [[2026, 836], [2025, 806], [2024, 741], [2023, 714], [2022, 695], [2021, 672], [2020, 642]]);
  assert.deepEqual(parseYearBoards(`<div id="content-main"><a href="https://unrelated.test/index.php?idmp=9">2026</a><a href="javascript:run()">2025</a></div>`), []);
  assert.ok(parseYearBoards(fixture('result-archive'), 2026).every(y => y.publicProbe));
});

test('real current/archive board rows support both quote styles and the public comma route', () => {
  assert.deepEqual(parseBoardPage(fixture('board836'), 836).map(r => r.iddok), ['18437', '18282', '18281']);
  const mixed = board(32, `${docLink('1', 32, 'Sale')}<a href="/dokument,iddok,2,idmp,32,r,r">Other</a><a href="https://unrelated.test/dokument.php?iddok=3&amp;idmp=32">Foreign</a>`);
  assert.deepEqual(parseBoardPage(mixed, 32).map(r => r.iddok), ['1', '2']);
});

test('a category placeholder, wrong board, unknown page or failed fetch cannot prove completeness', async () => {
  const placeholder = await fetchBoardRefs(34, { fetchText: async () => fixture('board34') });
  assert.equal(placeholder.complete, false);
  for (const html of [board(999, 'brak dokumentów'), '<html>Error</html>', board(34, '<a href="broken">New sale</a>')]) {
    assert.equal((await fetchBoardRefs(34, { fetchText: async () => html })).complete, false);
  }
  assert.equal((await fetchBoardRefs(34, { fetchText: async () => { throw Error('unavailable'); } })).complete, false);
  assert.equal((await fetchBoardRefs(34, { fetchText: async () => empty(34) })).complete, true);
});

test('pagination follows published links and rejects ignored or capped pages', async () => {
  const first = board(32, docLink('1', 32, 'Sale') + '<a href="index.php?idmp=32&amp;istr=2">Next</a>');
  const refs = await fetchBoardRefs(32, { fetchText: async url => {
    if (url.includes('istr=2')) return board(32, docLink('2', 32, 'Second'), 2);
    return first;
  } });
  assert.deepEqual(refs.map(r => r.iddok), ['1', '2']);
  assert.equal(refs.complete, true);
  assert.equal((await fetchBoardRefs(32, { maxPages: 1, fetchText: async () => first })).complete, false);
  assert.equal((await fetchBoardRefs(32, { fetchText: async () => first })).complete, false);
});

test('Banacha source table preserves two separate parcel prices and areas', () => {
  const text = blob('document18437', 'Ogłoszenie na sprzedaż nieruchomości niezabudowanych przy ul. Banacha');
  const records = parseAnnouncements(text);
  assert.deepEqual(records.map(r => [r.dzialka_nr, r.area_m2, r.starting_price_pln, r.auction_date]), [
    ['15/57', 1006, 113100, '2026-10-13'], ['15/58', 978, 112100, '2026-10-13'],
  ]);
  const plots = buildLand(records, 'zgorzelec').plots;
  assert.equal(plots.length, 2);
  assert.deepEqual(parseAnnouncements(text.replace('112.100,00', '0,00')), []);
});

test('house floor areas exclude parcel, cellar and neighbouring outbuilding areas', () => {
  const a = parseAnnouncements(blob('document18282', 'Ogłoszenie o sprzedaży nieruchomości zbudowanej'))[0];
  assert.equal(a.address.key, 'armii krajowej|48|');
  assert.equal(a.area_m2, 99.3);
  assert.equal(a.land_area_m2, 792);
  const b = parseAnnouncements(blob('document18281', 'Ogłoszenie o sprzedaży nieruchomości zabudowanej'))[0];
  assert.equal(b.address.key, 'reja|4|');
  assert.equal(b.area_m2, 90.7);
  assert.equal(b.land_area_m2, 636);
});

test('real year archives reach land/houses while results remain incomplete and use no admin requests', async () => {
  const urls = [];
  const output = await crawlAll({ year: 2026, fetchText: async url => {
    urls.push(url);
    assert.ok(!url.includes('/admin/'));
    const u = new URL(url);
    const id = u.searchParams.get('idmp');
    const doc = u.searchParams.get('iddok');
    if (doc === '10598') return fixture('announce-archive');
    if (doc === '11762') return fixture('result-archive');
    if (['18437', '18282', '18281'].includes(doc)) return fixture(`document${doc}`);
    if (id === '836') return fixture('board836');
    if (id === '34') return fixture('board34');
    return empty(id);
  } });
  assert.equal(output.listings.length, 2);
  assert.equal(output.land.length, 2);
  assert.equal(output.resultRefs.complete, false);
  assert.equal(output.land_complete, false);
  assert.ok(urls.some(url => url.includes('idmp=836')));
});

test('an article validity deadline cannot replace a missing auction date', async () => {
  const output = await crawlAll({ year: 2026, fetchText: async url => {
    const u = new URL(url); const id = u.searchParams.get('idmp'); const doc = u.searchParams.get('iddok');
    if (doc === '10598') return fixture('announce-archive');
    if (doc === '11762') return fixture('result-archive');
    if (doc === '18282') return fixture('document18282').replaceAll('22.09.2026', 'niepodany');
    if (['18437', '18281'].includes(doc)) return fixture(`document${doc}`);
    if (id === '836') return fixture('board836');
    return empty(id);
  } });
  assert.equal(output.listings.find(r => r.address.key === 'armii krajowej|48|').auction_date, null);
});

test('document limits still apply when the archive index fails', async () => {
  const documents = [];
  const output = await crawlAll({ maxDocuments: 1, fetchText: async url => {
    const u = new URL(url); const id = u.searchParams.get('idmp'); const doc = u.searchParams.get('iddok');
    if (['10598', '11762'].includes(doc)) throw Error('archive unavailable');
    if (doc) { documents.push(doc); return fixture(`document${doc}`); }
    if (id === '32') return board(32, ['18437', '18282', '18281'].map(n => docLink(n, 32, 'Sale')).join(''));
    return empty(id);
  } });
  assert.deepEqual(documents, ['18437']);
  assert.equal(output.land.length, 2);
  assert.equal(output.resultRefs.complete, false);
});

test('missing achieved price is not a negative result and results use canonical provenance', () => {
  const text = buildRecordText({ title: 'Informacja o wyniku przetargu', body: 'Działka Nr 1/2 o pow. 100 m2 Cena wywoławcza: 10.000,00 zł' });
  assert.deepEqual(parseResultDoc(text, null, 'https://example.test/result'), []);
  assert.deepEqual(parseResultDoc(`${text} Przetarg unieważniono.`, null, 'https://example.test/result'), []);
  const [result] = parseResultDoc(`${text} Przetarg zakończył się wynikiem negatywnym.`, '2026-10-01', 'https://example.test/result');
  assert.equal(result.outcome, 'unsold');
  assert.equal(result.source_pdf, 'https://example.test/result');
});
