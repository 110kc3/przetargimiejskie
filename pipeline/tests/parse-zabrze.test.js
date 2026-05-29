// Zabrze parser tests. The live BIP can't be reached from CI sandboxes, so we
// exercise the pure parsers against fixtures: the list-item markup observed in
// a browser, and a synthetic announcement body in the standard Polish
// ogłoszenie vocabulary. (The real attachment parser is validated/tuned on the
// first GitHub Actions run — see cities/zabrze/config.js.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDocumentList, attachmentUrlFromDoc } from '../src/cities/zabrze/crawl.js';
import {
  roundFromTitle,
  auctionDateFromTitle,
  parseAnnouncementText,
} from '../src/cities/zabrze/parse.js';

test('roundFromTitle: Roman after "o", and bare = 1', () => {
  assert.equal(roundFromTitle('Ogłoszenie o II ustnych nieograniczonych przetargach na sprzedaż lokali mieszkalnych na dzień 18.06.2026 r.'), 2);
  assert.equal(roundFromTitle('Ogłoszenie o I ustnym nieograniczonym przetargu na sprzedaż lokalu mieszkalnego na dzień 26.03.2026 r.'), 1);
  assert.equal(roundFromTitle('Ogłoszenie o III ustnych nieograniczonych przetargach …'), 3);
});

test('auctionDateFromTitle → ISO', () => {
  assert.equal(auctionDateFromTitle('… na dzień 9.04.2026 r.'), '2026-04-09');
  assert.equal(auctionDateFromTitle('… na dzień 18.06.2026 r.'), '2026-06-18');
  assert.equal(auctionDateFromTitle('… bez daty'), null);
});

// Shape returned by /api/v1/document-list/549 (observed in a browser).
const LIST_JSON = {
  data: [
    {
      doc_id: 25227,
      dscrpt: 'Ogłoszenie o II ustnych nieograniczonych przetargach na sprzedaż lokali mieszkalnych zaplanowane na dzień 18.06.2026 r.',
      pubdat: '2026-04-17 09:02:49+02',
    },
    {
      doc_id: 25001,
      dscrpt: 'Ogłoszenie o I ustnym nieograniczonym przetargu na sprzedaż lokalu mieszkalnego na dzień 26.03.2026 r.',
      pubdat: '2026-02-13 09:17:00+01',
    },
    // a non-auction notice that should be filtered out
    { doc_id: 99999, dscrpt: 'Informacja porządkowa', pubdat: '2026-01-01 00:00:00+01' },
  ],
};

test('parseDocumentList maps API items → doc URL, title, round, dates; filters non-auctions', () => {
  const items = parseDocumentList(LIST_JSON);
  assert.equal(items.length, 2, 'the non-auction notice is dropped');
  const a = items[0];
  assert.equal(a.doc_url, 'https://bip.miastozabrze.pl/doc/25227');
  assert.equal(a.round, 2);
  assert.equal(a.auction_date, '2026-06-18');
  assert.equal(a.published_date, '2026-04-17');
  assert.equal(items[1].round, 1);
  assert.equal(items[1].auction_date, '2026-03-26');
});

test('parseDocumentList: missing/empty data → []', () => {
  assert.deepEqual(parseDocumentList({}), []);
  assert.deepEqual(parseDocumentList({ data: [] }), []);
});

test('attachmentUrlFromDoc finds the /attachment/ link', () => {
  const html = '<a href="/attachment/96404" title="Pobierz załącznik"></a>';
  assert.equal(attachmentUrlFromDoc(html), 'https://bip.miastozabrze.pl/attachment/96404');
  assert.equal(attachmentUrlFromDoc('<p>nothing</p>'), null);
});

// Synthetic attachment text in the standard ogłoszenie vocabulary (table rows
// linearised by `pdftotext -layout`, plus a prose variant).
const ANN_TEXT = `
Prezydent Miasta Zabrze ogłasza II ustny nieograniczony przetarg na sprzedaż lokali mieszkalnych.
Lp. 1  lokal mieszkalny przy ul. Wolności 285/3  o powierzchni użytkowej 47,80 m2  cena wywoławcza 95.000,00 zł  wadium 9.500 zł
Lp. 2  lokal mieszkalny położony przy ul. 3 Maja 12/4 o powierzchni 33,15 m2 cena wywoławcza 72 000,00 zł
Lp. 3  lokal niemieszkalny przy ul. Wolności 285/5 o pow. 18,20 m2 cena wywoławcza 25.000 zł
`;

test('parseAnnouncementText pulls address / area / price per flat', () => {
  const flats = parseAnnouncementText(ANN_TEXT);
  const byKey = Object.fromEntries(flats.map((f) => [f.address.key, f]));
  assert.ok(byKey['wolnosci|285|3'], 'first flat keyed');
  assert.equal(byKey['wolnosci|285|3'].area_m2, 47.8);
  assert.equal(byKey['wolnosci|285|3'].starting_price_pln, 95000);
  assert.equal(byKey['wolnosci|285|3'].kind, 'mieszkalny');
  assert.equal(byKey['3 maja|12|4'].area_m2, 33.15);
  assert.equal(byKey['3 maja|12|4'].starting_price_pln, 72000);
  assert.equal(byKey['wolnosci|285|5'].kind, 'uzytkowy');
});

test('parseAnnouncementText: empty text → no flats', () => {
  assert.deepEqual(parseAnnouncementText(''), []);
});
