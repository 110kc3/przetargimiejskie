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

test('attachmentUrlFromDoc finds the attachment link (absolute or relative)', () => {
  // Real /doc HTML uses an ABSOLUTE url:
  const abs = '<a href="https://bip.miastozabrze.pl/attachment/43642" title="Pobierz załącznik"></a>';
  assert.equal(attachmentUrlFromDoc(abs), 'https://bip.miastozabrze.pl/attachment/43642');
  // tolerate a relative form too:
  assert.equal(
    attachmentUrlFromDoc('<a href="/attachment/96404"></a>'),
    'https://bip.miastozabrze.pl/attachment/96404',
  );
  assert.equal(attachmentUrlFromDoc('<p>nothing</p>'), null);
});

// Real attachment text (from a downloaded Zabrze ogłoszenie, doc/5969 era):
// numbered per-flat blocks; each block has a *plot* `pow.:` (działka) before the
// *flat* `pow.:` (opis lokalu); boilerplate carries office addresses to exclude.
const ANN_TEXT = `Prezydent Miasta Zabrze ogłasza II ustne przetargi nieograniczone na sprzedaż niżej wymienionych lokali mieszkalnych
1. adres: ul. Ks. Bolesława Domańskiego 4/6
działka: nr 4129/50 pow.: 1.377 m2 księga wieczysta nr
GL1Z/00019567/1
opis lokalu: położenie:    pow.: 26,74 m2 pomieszczenia: pokój, kuchnia, wc
I piętro
Cena                  w tym:   92,99% stanowi cena lokalu     7,01% stanowi cena udziału w prawie własności gruntu
wywoławcza:
37.000,00 zł
Wysokość wadium: 1.900,00 zł
2. adres: ul. Krakowska 82/4
działka: nr 958/1 pow.: 407 m2 księga wieczysta nr
opis lokalu: położenie:    pow.: 42,34 m2 pomieszczenia: 2 pokoje, kuchnia, przedpokój
I piętro
Cena                  w tym:   93,42% stanowi cena lokalu     6,58% stanowi cena udziału w prawie własności gruntu
wywoławcza:
53.000,00 zł
Przetargi odbędą się w dniu 1.03.2022 roku w sali 207 Urzędu Miejskiego w Zabrzu przy ul. Powstańców Śląskich 5-7
Wadium należy wnosić w kasie Urzędu Miejskiego w Zabrzu przy ul. Wolności 286`;

test('parseAnnouncementText: per-flat address, FLAT area (not plot), price; office addresses excluded', () => {
  const flats = parseAnnouncementText(ANN_TEXT);
  assert.equal(flats.length, 2, 'two flats; office addresses in boilerplate excluded');
  const d = flats.find((f) => f.address.key === 'ks boleslawa domanskiego|4|6');
  assert.ok(d, 'Domańskiego flat keyed');
  assert.equal(d.area_m2, 26.74, 'flat area, not the 1377 m² plot');
  assert.equal(d.starting_price_pln, 37000);
  assert.equal(d.kind, 'mieszkalny');
  const k = flats.find((f) => f.address.key === 'krakowska|82|4');
  assert.equal(k.area_m2, 42.34);
  assert.equal(k.starting_price_pln, 53000);
  // no office address leaked through
  assert.ok(!flats.some((f) => /powsta|wolnosci/.test(f.address.street_norm)));
});

// The other real Zabrze layout (doc 96404): the `pdftotext -layout` table wraps
// so the FLAT area is detached from its "pow." label, the plot renders as
// "953 m     2", the cellar header "pomieszczenia przynależne" lands just before
// the flat's area, the flat area itself can be wide-spaced ("49,11 m  2"), and
// the price label is followed by an inline "w tym: …%" cell.
const ANN_WRAPPED = `Prezydent Miasta Zabrze ogłasza II ustne przetargi nieograniczone na sprzedaż lokali mieszkalnych
1.                                   adres: ul. Gen. Władysława Andersa 35/4
działka:   nr 740/1, 739/1,       pow.:      arkusz mapy: 2           prawo:        udział:
           737/1, 741/1, 744/1 953 m     2   obręb: 0007, Rokitnica   własność      41/1000
opis     położenie:     pow.:       pomieszczenia: 2 pokoje,          pomieszczenia przynależne
lokalu: II piętro       52,00 m2 kuchnia, łazienka z wc,              do lokalu:
                                                                      piwnica o pow. 6,12 m2
Cena             w       95,32% stanowi cena         4,68% stanowi cena udziału
wywoławcza:      tym: lokalu
120.000,00 zł
Wysokość wadium: 12.000,00 zł
2.                                     adres: ul. Ireny Kosmowskiej 40/9
działka:   nr 3816/65         pow.:           arkusz mapy: 3             prawo:        udział:
                              504 m 2         obręb: 0007, Rokitnica     własność      84/1000
opis     położenie:     pow.:       pomieszczenia: 2 pokoje,             pomieszczenia przynależne
lokalu: III piętro      49,11 m  2  kuchnia, łazienka z wc,              do lokalu:
                                    przedpokój                           piwnica o pow. 10,60 m2
Cena wywoławcza: w tym:             94,74% stanowi cena       5,26% stanowi cena udziału
110.000,00 zł
Wysokość wadium: 11.000,00 zł`;

test('parseAnnouncementText: wrapped layout — flat area (not plot/cellar) + inline "w tym" price', () => {
  const flats = parseAnnouncementText(ANN_WRAPPED);
  const a = flats.find((f) => f.address.key === 'gen wladyslawa andersa|35|4');
  assert.ok(a, 'Andersa keyed');
  assert.equal(a.area_m2, 52, 'flat 52 m², not plot 953 or cellar 6.12');
  assert.equal(a.starting_price_pln, 120000);
  const k = flats.find((f) => f.address.key === 'ireny kosmowskiej|40|9');
  assert.equal(k.area_m2, 49.11, 'wide-spaced "49,11 m  2", not cellar 10.60');
  assert.equal(k.starting_price_pln, 110000, 'price after the inline "w tym:" cell');
});

test('parseAnnouncementText: empty text → no flats', () => {
  assert.deepEqual(parseAnnouncementText(''), []);
});
