// Tests for pipeline/src/cities/gdansk/parse.js + crawl.js
//
// Fixtures groundtruthed against live bip.gdansk.pl (2026-06-27):
//
//   ANNOUNCEMENT INDEX:
//     https://bip.gdansk.pl/urzad-miejski/Ogloszenia-o-przetargach,a,1439
//     → one entry: ",a,309425" (auction 2026-07-01)
//
//   ANNOUNCEMENT ARTICLE:
//     https://bip.gdansk.pl/urzad-miejski/OGLOSZENIE-O-PRZETARGACH-NIEOGRANICZONYCH-NA-SPRZEDAZ-NIERUCHOMOSCI-GMINNYCH-NA-DZIEN-01-07-2026,a,309425
//     → PDF: https://download.cloudgdansk.pl/gdansk-pl/d/202604273600/ogloszenie-o-przetargach-nieograniczonych-planowanych-na-dzien-01-07-2026.pdf
//
//   PDF content (NOT directly fetched — CDN timed out in spike; fixture text
//   is reconstructed from:
//     1. Known properties listed on gdansk.pl/urzad-miejski/wydzial-skarbu/nieruchomosci
//        (6 live flats as of 2026-06-27, of which the following are confirmed
//         "Przetarg ustny nieograniczony"):
//          ul. Kaprów 15 m.5    — 1 200 000 PLN, 93.97 m²
//          ul. Ks. Mariana Góreckiego 8 lok. 3,4A
//          ul. Na Zaspę 34B lok. 6
//          ul. Opata Jacka Rybińskiego 6 m. 7
//          ul. Teofila Lenartowicza 3 lok. 5
//          ul. Uczniowska 37 lok. 4
//     2. Standard Gdańsk Wydział Skarbu PDF vocabulary (server-rendered BIP,
//        standard przetarg announcement boilerplate).
//   NOTE: validate and tune the parsers against the REAL PDF after 2026-07-01.
//
//   RESULT NOTICES: URL pattern UNCONFIRMED (spike gap). No fixture available.
//   parseResultDoc is a stub returning []; tests assert that only.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  auctionDateFromText,
  roundFromText,
  splitBlocks,
  parseBlock,
  parseAnnouncementPdf,
  parseResultDoc,
} from '../src/cities/gdansk/parse.js';

import {
  parseIndexLinks,
  parsePdfUrl,
} from '../src/cities/gdansk/crawl.js';

// ---------------------------------------------------------------------------
// Helper fixtures
// ---------------------------------------------------------------------------

// Reconstructed PDF text for the 2026-07-01 Gdańsk auction batch.
// Vocabulary modelled on standard Gdańsk Wydział Skarbu announcement practice.
// VALIDATE against the real PDF text from cloudgdansk.pl after 2026-07-01.
const ANN_PDF_TEXT = `
OGŁOSZENIE O PRZETARGACH NIEOGRANICZONYCH USTNYCH NA SPRZEDAŻ NIERUCHOMOŚCI
STANOWIĄCYCH WŁASNOŚĆ GMINY MIASTA GDAŃSKA ODBYWAJĄCYCH SIĘ W DNIU 01.07.2026 R.

Prezydent Miasta Gdańska ogłasza przetargi ustne nieograniczone na sprzedaż
nieruchomości lokalowych stanowiących własność Gminy Miasta Gdańska.
Przetargi odbędą się w dniu 01.07.2026 r. o godz. 10:00 w siedzibie
Urzędu Miejskiego w Gdańsku, ul. Nowe Ogrody 8/12.

1. ul. Kaprów 15 m. 5
   Lokal mieszkalny nr 5 w budynku przy ul. Kaprów 15 w Gdańsku.
   Powierzchnia użytkowa lokalu: 93,97 m²
   Udział w gruncie: 9397/1000000
   Cena wywoławcza wynosi 1 200 000,00 zł
   Wadium: 120 000,00 zł

2. ul. Ks. Mariana Góreckiego 8 lok. 3
   Lokal mieszkalny nr 3 w budynku przy ul. Ks. Mariana Góreckiego 8 w Gdańsku.
   Powierzchnia użytkowa lokalu: 45,12 m²
   Cena wywoławcza wynosi 320 000,00 zł
   Wadium: 32 000,00 zł

3. ul. Na Zaspę 34B lok. 6
   Lokal mieszkalny nr 6 w budynku przy ul. Na Zaspę 34B w Gdańsku.
   Powierzchnia użytkowa lokalu: 38,50 m²
   Cena wywoławcza wynosi 280 000,00 zł
   Wadium: 28 000,00 zł

4. ul. Opata Jacka Rybińskiego 6 m. 7
   Lokal mieszkalny nr 7 w budynku przy ul. Opata Jacka Rybińskiego 6 w Gdańsku.
   Powierzchnia użytkowa lokalu: 52,80 m²
   Cena wywoławcza wynosi 410 000,00 zł
   Wadium: 41 000,00 zł

5. ul. Teofila Lenartowicza 3 lok. 5
   Lokal mieszkalny nr 5 w budynku przy ul. Teofila Lenartowicza 3 w Gdańsku.
   Powierzchnia użytkowa lokalu: 29,30 m²
   Cena wywoławcza wynosi 195 000,00 zł
   Wadium: 19 500,00 zł

6. ul. Uczniowska 37 lok. 4
   Lokal mieszkalny nr 4 w budynku przy ul. Uczniowska 37 w Gdańsku.
   Powierzchnia użytkowa lokalu: 41,60 m²
   Cena wywoławcza wynosi 240 000,00 zł
   Wadium: 24 000,00 zł

Szczegółowe warunki przetargów określają regulaminy, które można uzyskać
w Wydziale Skarbu Urzędu Miejskiego w Gdańsku.
`.trim();

// ---------------------------------------------------------------------------
// auctionDateFromText
// ---------------------------------------------------------------------------

describe('auctionDateFromText', () => {
  it('extracts date from "ODBYWAJĄCYCH SIĘ W DNIU DD.MM.YYYY R." (uppercase)', () => {
    const text = 'ODBYWAJĄCYCH SIĘ W DNIU 01.07.2026 R.';
    assert.equal(auctionDateFromText(text), '2026-07-01');
  });
  it('extracts date from "Przetargi odbędą się w dniu DD.MM.YYYY r." (sentence-case)', () => {
    const text = 'Przetargi odbędą się w dniu 01.07.2026 r. o godz. 10:00';
    assert.equal(auctionDateFromText(text), '2026-07-01');
  });
  it('extracts date from "w dniu DD.MM.YYYY" fallback', () => {
    const text = 'w dniu 15.03.2026 w siedzibie';
    assert.equal(auctionDateFromText(text), '2026-03-15');
  });
  it('extracts date from spelled-month form', () => {
    const text = 'Przetargi odbędą się w dniu 5 marca 2026 r.';
    assert.equal(auctionDateFromText(text), '2026-03-05');
  });
  it('returns null for text with no date', () => {
    assert.equal(auctionDateFromText('brak daty'), null);
    assert.equal(auctionDateFromText(''), null);
    assert.equal(auctionDateFromText(null), null);
  });
  it('extracts date from the full announcement fixture', () => {
    assert.equal(auctionDateFromText(ANN_PDF_TEXT), '2026-07-01');
  });
});

// ---------------------------------------------------------------------------
// roundFromText
// ---------------------------------------------------------------------------

describe('roundFromText', () => {
  it('defaults to 1 for a standard announcement without ordinal', () => {
    assert.equal(roundFromText(ANN_PDF_TEXT), 1);
  });
  it('returns 2 for "II PRZETARG USTNY"', () => {
    assert.equal(roundFromText('II PRZETARG USTNY NIEOGRANICZONY'), 2);
  });
  it('returns 2 for "drugi przetarg"', () => {
    assert.equal(roundFromText('ogłasza drugi przetarg'), 2);
  });
  it('returns 3 for "trzeci przetarg"', () => {
    assert.equal(roundFromText('trzeci przetarg ustny'), 3);
  });
  it('returns 1 for null/empty', () => {
    assert.equal(roundFromText(null), 1);
    assert.equal(roundFromText(''), 1);
  });
});

// ---------------------------------------------------------------------------
// splitBlocks
// ---------------------------------------------------------------------------

describe('splitBlocks', () => {
  it('finds 6 blocks in the fixture', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    assert.equal(blocks.length, 6);
  });
  it('first block contains Kaprów 15', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    assert.match(blocks[0], /Kaprów\s+15/i);
  });
  it('last block contains Uczniowska 37', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    assert.match(blocks[5], /Uczniowska\s+37/i);
  });
  it('returns [] for empty text', () => {
    assert.deepEqual(splitBlocks(''), []);
    assert.deepEqual(splitBlocks(null), []);
  });
  it('returns [block] for single-property text (no number prefix)', () => {
    const text = 'ul. Kaprów 15 m. 5\nPowierzchnia: 93,97 m²\nCena wywoławcza wynosi 1 200 000,00 zł';
    const blocks = splitBlocks(text);
    assert.equal(blocks.length, 1);
  });
});

// ---------------------------------------------------------------------------
// parseBlock
// ---------------------------------------------------------------------------

describe('parseBlock', () => {
  it('parses Kaprów 15 m. 5 — kind mieszkalny, area 93.97, price 1 200 000', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    const rec = parseBlock(blocks[0]);
    assert.ok(rec, 'record must be non-null');
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.address.street, 'Kaprów');
    assert.equal(rec.address.building, '15');
    assert.equal(rec.address.apt, '5');
    assert.equal(rec.area_m2, 93.97);
    assert.equal(rec.starting_price_pln, 1200000);
  });

  it('parses Góreckiego 8 lok. 3 — area 45.12, price 320 000', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    const rec = parseBlock(blocks[1]);
    assert.ok(rec);
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.address.building, '8');
    assert.equal(rec.address.apt, '3');
    assert.equal(rec.area_m2, 45.12);
    assert.equal(rec.starting_price_pln, 320000);
  });

  it('parses Na Zaspę 34B lok. 6 — area 38.50, price 280 000', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    const rec = parseBlock(blocks[2]);
    assert.ok(rec);
    assert.equal(rec.address.building, '34B');
    assert.equal(rec.address.apt, '6');
    assert.equal(rec.area_m2, 38.5);
    assert.equal(rec.starting_price_pln, 280000);
  });

  it('parses Rybińskiego 6 m. 7 — area 52.80, price 410 000', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    const rec = parseBlock(blocks[3]);
    assert.ok(rec);
    assert.equal(rec.address.apt, '7');
    assert.equal(rec.area_m2, 52.8);
    assert.equal(rec.starting_price_pln, 410000);
  });

  it('parses Lenartowicza 3 lok. 5 — area 29.30, price 195 000', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    const rec = parseBlock(blocks[4]);
    assert.ok(rec);
    assert.equal(rec.address.apt, '5');
    assert.equal(rec.area_m2, 29.3);
    assert.equal(rec.starting_price_pln, 195000);
  });

  it('parses Uczniowska 37 lok. 4 — area 41.60, price 240 000', () => {
    const blocks = splitBlocks(ANN_PDF_TEXT);
    const rec = parseBlock(blocks[5]);
    assert.ok(rec);
    assert.equal(rec.address.building, '37');
    assert.equal(rec.address.apt, '4');
    assert.equal(rec.area_m2, 41.6);
    assert.equal(rec.starting_price_pln, 240000);
  });

  it('returns null for block with no recognisable address', () => {
    const rec = parseBlock('brak adresu\nCena wywoławcza wynosi 100 000 zł');
    assert.equal(rec, null);
  });
});

// ---------------------------------------------------------------------------
// parseAnnouncementPdf — integration
// ---------------------------------------------------------------------------

describe('parseAnnouncementPdf', () => {
  it('returns 6 records from the fixture', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, {
      detail_url: 'https://bip.gdansk.pl/urzad-miejski/OGLOSZENIE-...,a,309425',
      source_url: 'https://download.cloudgdansk.pl/gdansk-pl/d/202604273600/ogloszenie-o-przetargach-nieograniczonych-planowanych-na-dzien-01-07-2026.pdf',
    });
    assert.equal(recs.length, 6);
  });

  it('all records have auction_date 2026-07-01', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, {});
    for (const r of recs) assert.equal(r.auction_date, '2026-07-01');
  });

  it('all records have round 1 (no ordinal in title)', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, {});
    for (const r of recs) assert.equal(r.round, 1);
  });

  it('all records are kind mieszkalny', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, {});
    for (const r of recs) assert.equal(r.kind, 'mieszkalny');
  });

  it('detail_url is propagated to all records', () => {
    const URL = 'https://bip.gdansk.pl/urzad-miejski/OGLOSZENIE-...,a,309425';
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, { detail_url: URL });
    for (const r of recs) assert.equal(r.detail_url, URL);
  });

  it('deduplicates records with the same address key', () => {
    // Duplicate the first block — dedup should keep only one
    const textWithDup = ANN_PDF_TEXT + '\n\n7. ul. Kaprów 15 m. 5\nLokal mieszkalny\nCena wywoławcza wynosi 1 200 000,00 zł\n';
    const recs = parseAnnouncementPdf(textWithDup, {});
    const kaprowRecs = recs.filter((r) => r.address?.street === 'Kaprów');
    assert.equal(kaprowRecs.length, 1);
  });

  it('returns [] for empty text', () => {
    assert.deepEqual(parseAnnouncementPdf('', {}), []);
    assert.deepEqual(parseAnnouncementPdf(null, {}), []);
  });

  it('Kaprów 15/5 record has correct address fields', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, {});
    const r = recs.find((x) => x.address?.street === 'Kaprów');
    assert.ok(r);
    assert.equal(r.address.building, '15');
    assert.equal(r.address.apt, '5');
    assert.equal(r.starting_price_pln, 1200000);
    assert.equal(r.area_m2, 93.97);
  });

  it('Na Zaspę 34B/6 — building has letter suffix', () => {
    const recs = parseAnnouncementPdf(ANN_PDF_TEXT, {});
    const r = recs.find((x) => /Zasp/i.test(x.address?.street));
    assert.ok(r);
    assert.equal(r.address.building, '34B');
    assert.equal(r.address.apt, '6');
  });
});

// ---------------------------------------------------------------------------
// parseResultDoc — stub
// ---------------------------------------------------------------------------

describe('parseResultDoc (stub)', () => {
  it('returns [] for any input (result URL not yet confirmed)', () => {
    assert.deepEqual(parseResultDoc('some text', null, 'https://example.com'), []);
    assert.deepEqual(parseResultDoc('INFORMACJA O WYNIKACH PRZETARGÓW', '2026-07-01', 'https://bip.gdansk.pl'), []);
    assert.deepEqual(parseResultDoc('', null, null), []);
  });
});

// ---------------------------------------------------------------------------
// crawl.js: parseIndexLinks
// ---------------------------------------------------------------------------

describe('parseIndexLinks', () => {
  it('finds the 2026-07-01 article link from live index HTML', () => {
    const html = `
      <li>
        <a href="/urzad-miejski/OGLOSZENIE-O-PRZETARGACH-NIEOGRANICZONYCH-NA-SPRZEDAZ-NIERUCHOMOSCI-GMINNYCH-NA-DZIEN-01-07-2026,a,309425">
          OGŁOSZENIE O PRZETARGACH NIEOGRANICZONYCH NA SPRZEDAŻ NIERUCHOMOŚCI GMINNYCH NA DZIEŃ 01.07.2026
        </a>
      </li>
    `;
    const links = parseIndexLinks(html);
    assert.equal(links.length, 1);
    assert.ok(links[0].includes(',a,309425'));
    assert.ok(links[0].startsWith('https://bip.gdansk.pl'));
  });

  it('resolves relative hrefs to absolute URLs', () => {
    const html = `<a href="/urzad-miejski/OGLOSZENIE-O-PRZETARGACH,a,12345">link</a>`;
    const links = parseIndexLinks(html);
    assert.equal(links.length, 1);
    assert.equal(links[0], 'https://bip.gdansk.pl/urzad-miejski/OGLOSZENIE-O-PRZETARGACH,a,12345');
  });

  it('deduplicates repeated href', () => {
    const html = `
      <a href="/urzad-miejski/OGLOSZENIE-O-PRZETARGACH,a,12345">link1</a>
      <a href="/urzad-miejski/OGLOSZENIE-O-PRZETARGACH,a,12345">link2</a>
    `;
    const links = parseIndexLinks(html);
    assert.equal(links.length, 1);
  });

  it('ignores non-announcement links', () => {
    const html = `
      <a href="/urzad-miejski/Inne,a,1587">Inne</a>
      <a href="/urzad-miejski/OGLOSZENIE-O-PRZETARGACH,a,12345">Ogłoszenie</a>
      <a href="/prawo-lokalne/Akty-Prawne,a,1190">Akty</a>
    `;
    const links = parseIndexLinks(html);
    assert.equal(links.length, 1);
  });

  it('returns [] when no announcement links present', () => {
    const links = parseIndexLinks('<p>brak ogłoszeń</p>');
    assert.deepEqual(links, []);
  });
});

// ---------------------------------------------------------------------------
// crawl.js: parsePdfUrl
// ---------------------------------------------------------------------------

describe('parsePdfUrl', () => {
  it('extracts the cloudgdansk CDN PDF URL from article HTML', () => {
    const html = `
      <p>
        <a href="https://download.cloudgdansk.pl/gdansk-pl/d/202604273600/ogloszenie-o-przetargach-nieograniczonych-planowanych-na-dzien-01-07-2026.pdf">
          OGŁOSZENIE O PRZETARGACH NIEOGRANICZONYCH PLANOWANYCH NA DZIEŃ 01.07.2026 (137.59 KB, pdf)
        </a>
      </p>
    `;
    const url = parsePdfUrl(html);
    assert.equal(
      url,
      'https://download.cloudgdansk.pl/gdansk-pl/d/202604273600/ogloszenie-o-przetargach-nieograniczonych-planowanych-na-dzien-01-07-2026.pdf',
    );
  });

  it('returns null when no PDF link present', () => {
    const url = parsePdfUrl('<p>brak załącznika</p>');
    assert.equal(url, null);
  });

  it('returns null for empty/null input', () => {
    assert.equal(parsePdfUrl(''), null);
    assert.equal(parsePdfUrl(null), null);
  });
});
