import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listingId,
  buildModel,
  renderMarkdown,
  renderHtml,
  formatPLN,
  formatArea,
  formatDate,
  plNoun,
} from '../scripts/newsletter-digest.js';

const NOW = new Date('2026-07-03T00:00:00Z');

const city = (id, label, properties) => ({ id, label, properties });
const prop = (key, street, building, apt, kind, listings) => ({
  key,
  street,
  street_norm: street.toLowerCase(),
  building,
  apt,
  kind,
  listings,
});

test('listingId: prefers source_pdf, then detail_url, then a stable composite', () => {
  const p = prop('pokoju|10|5', 'Pokoju', '10', '5', 'mieszkalny', []);
  assert.equal(listingId('tg', p, { source_pdf: 'PDF', detail_url: 'D', round: 2, date: '2026-04-14' }), 'PDF');
  assert.equal(listingId('tg', p, { detail_url: 'D', round: 2, date: '2026-04-14' }), 'D');
  assert.equal(listingId('tg', p, { round: 2, date: '2026-04-14' }), 'tg|pokoju|10|5|r2|2026-04-14');
});

test('formatters: pl-PL spacing, comma decimals, DD.MM.YYYY, null-safe', () => {
  assert.equal(formatPLN(159000), '159 000');
  assert.equal(formatPLN(1234567), '1 234 567');
  assert.equal(formatPLN(null), null);
  assert.equal(formatArea(37.7), '37,7');
  assert.equal(formatArea(96.89), '96,89');
  assert.equal(formatArea(128.4), '128,4');
  assert.equal(formatDate('2026-04-14'), '14.04.2026');
  assert.equal(formatDate(null), null);
});

test('plNoun: Polish 1 / 2-4 / 5+ forms with the 12-14 teens exception', () => {
  const f = (n) => plNoun(n, 'ogłoszenie', 'ogłoszenia', 'ogłoszeń');
  assert.equal(f(1), 'ogłoszenie');
  assert.equal(f(2), 'ogłoszenia');
  assert.equal(f(4), 'ogłoszenia');
  assert.equal(f(5), 'ogłoszeń');
  assert.equal(f(12), 'ogłoszeń'); // teens → many
  assert.equal(f(22), 'ogłoszenia'); // 22 → few
  assert.equal(f(25), 'ogłoszeń');
});

test('buildModel: first run seeds the baseline silently and reports nothing', () => {
  const cities = [
    city('tg', 'Tarnowskie Góry', [
      prop('a|1|', 'A', '1', null, 'mieszkalny', [
        { round: 1, date: '2026-08-01', outcome: 'active', source_pdf: 'P1', starting_price_pln: 100000, area_m2: 50 },
      ]),
    ]),
  ];
  const m = buildModel({ cities, seen: new Set(), now: NOW });
  assert.equal(m.seededBaseline, true);
  assert.equal(m.totalNew, 0);
  assert.deepEqual(m.sections, []);
  assert.deepEqual(m.nextSeen, ['P1']); // every current id recorded so next run is clean
});

test('buildModel: reports only unseen OPEN listings; concluded is tracked but hidden; zł/m² computed', () => {
  const cities = [
    city('tg', 'Tarnowskie Góry', [
      prop('a|1|', 'A', '1', null, 'mieszkalny', [
        { round: 2, date: '2026-08-01', outcome: 'active', source_pdf: 'NEW_OPEN', starting_price_pln: 168300, area_m2: 37.06 },
      ]),
      prop('b|2|', 'B', '2', null, 'zabudowana', [
        { round: 1, date: '2026-05-01', outcome: 'sold', source_pdf: 'NEW_SOLD', final_price_pln: 200000 },
      ]),
      prop('c|3|', 'C', '3', null, 'mieszkalny', [
        { round: 1, date: '2026-09-01', outcome: 'active', source_pdf: 'ALREADY_SEEN', starting_price_pln: 90000, area_m2: 30 },
      ]),
    ]),
  ];
  const m = buildModel({ cities, seen: new Set(['ALREADY_SEEN']), now: NOW });
  assert.equal(m.seededBaseline, false);
  assert.equal(m.totalNew, 1, 'only the new OPEN listing is rendered');
  assert.equal(m.sections.length, 1);
  const it = m.sections[0].items[0];
  assert.equal(it.id, 'NEW_OPEN');
  assert.equal(it.priceFmt, '168 300');
  assert.equal(it.areaFmt, '37,06');
  assert.equal(it.zlM2Fmt, formatPLN(Math.round(168300 / 37.06)));
  // seen is monotonic: prior seen ∪ all current ids (including the hidden sold one)
  assert.deepEqual(m.nextSeen, ['ALREADY_SEEN', 'NEW_OPEN', 'NEW_SOLD'].sort());
});

test('buildModel --include-concluded also renders new concluded results', () => {
  const cities = [
    city('tg', 'Tarnowskie Góry', [
      prop('b|2|', 'B', '2', null, 'zabudowana', [
        { round: 1, date: '2026-05-01', outcome: 'sold', source_pdf: 'NEW_SOLD', final_price_pln: 200000 },
      ]),
    ]),
  ];
  const m = buildModel({ cities, seen: new Set(['x']), now: NOW, includeConcluded: true });
  assert.equal(m.totalNew, 1);
  assert.equal(m.sections[0].items[0].id, 'NEW_SOLD');
});

test('buildModel: idempotent — re-running with the updated seen yields no new items', () => {
  const cities = [
    city('tg', 'Tarnowskie Góry', [
      prop('a|1|', 'A', '1', null, 'mieszkalny', [
        { round: 2, date: '2026-08-01', outcome: 'active', source_pdf: 'NEW_OPEN', starting_price_pln: 168300, area_m2: 37.06 },
      ]),
    ]),
  ];
  const first = buildModel({ cities, seen: new Set(['seed']), now: NOW });
  assert.equal(first.totalNew, 1);
  const second = buildModel({ cities, seen: new Set(first.nextSeen), now: NOW });
  assert.equal(second.totalNew, 0);
  assert.deepEqual(second.sections, []);
});

test('renderMarkdown: baseline, empty, and populated digests', () => {
  const baseline = buildModel({
    cities: [city('tg', 'Tarnowskie Góry', [prop('a|1|', 'A', '1', null, 'mieszkalny', [{ round: 1, date: '2026-08-01', outcome: 'active', source_pdf: 'P', starting_price_pln: 100000, area_m2: 50 }])])],
    seen: new Set(),
    now: NOW,
  });
  assert.match(renderMarkdown(baseline), /punkt odniesienia/);

  const empty = buildModel({ cities: [], seen: new Set(['x']), now: NOW });
  assert.match(renderMarkdown(empty), /Brak nowych ogłoszeń/);

  const cities = [
    city('tg', 'Tarnowskie Góry', [
      prop('a|1|', 'A', '1', '5', 'mieszkalny', [
        { round: 2, date: '2026-08-01', outcome: 'active', detail_url: 'https://x/y', starting_price_pln: 159000, area_m2: 37.7 },
      ]),
    ]),
  ];
  const md = renderMarkdown(buildModel({ cities, seen: new Set(['s']), now: NOW }));
  assert.match(md, /## Tarnowskie Góry \(1\)/);
  assert.match(md, /ul\. A 1\/5/);
  assert.match(md, /159 000 zł/);
  assert.match(md, /37,7 m²/);
  assert.match(md, /4 218 zł\/m²/);
  assert.match(md, /przetarg 01\.08\.2026/);
  assert.match(md, /\(runda 2\)/);
  assert.match(md, /\[ul\. A 1\/5\]\(https:\/\/x\/y\)/); // linked address
});

test('renderHtml: escapes text/urls and links the address', () => {
  const cities = [
    city('tg', 'Tarnowskie Góry', [
      prop('a|1|', 'A & B', '1', null, 'mieszkalny', [
        { round: 1, date: '2026-08-01', outcome: 'active', detail_url: 'https://x/y?a=1&b=2', starting_price_pln: 100000, area_m2: 50 },
      ]),
    ]),
  ];
  const html = renderHtml(buildModel({ cities, seen: new Set(['s']), now: NOW }));
  assert.match(html, /<!doctype html>/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /href="https:\/\/x\/y\?a=1&amp;b=2"/);
  assert.match(html, /<h2>Tarnowskie Góry \(1\)<\/h2>/);
});
