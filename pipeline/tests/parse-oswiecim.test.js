// Oświęcim parser test — MULTI-PROPERTY. Fixture is a condensed-but-faithful copy
// of the REAL notice (verified 2026-06-26): 3 lokale Mały Rynek 9/4–9/6, II
// przetarg, cena 120.792 / 78.304 / 71.056 zł, przetarg 08.11.2011. Each item's
// usable area is taken (not the cellar "piwnica").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noticeDate, splitItems, addressFromItem, parseAnnouncement } from '../src/cities/oswiecim/parse.js';

const BODY = `PREZYDENT MIASTA OŚWIĘCIM ogłasza II przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych oznaczonych nr 9/4, 9/5, 9/6 w budynku Mały Rynek 9 w Oświęcimiu.
Budynek oznaczony Mały Rynek 9 znajduje się na działce nr 2482/1 o pow. 264 m2 obręb Oświęcim. Lokale mieszkalne stanowią własność Gminy Miasto Oświęcim.
1. lokal mieszkalny Mały Rynek 9/4, położony na II piętrze budynku, składa się z 2 pokoi, kuchni, łazienki, o łącznej powierzchni użytkowej 61,19 m2. Do mieszkania przynależy piwnica o pow. 19,98 m2 Cena wywoławcza nieruchomości Mały Rynek 9/4 wynosi 120.792,00zł w tym: cena lokalu 116.860,00zł
2. lokal mieszkalny Mały Rynek 9/5, położony na II piętrze budynku, składa się z 1 pokoju, kuchni, łazienki, o łącznej powierzchni użytkowej 40,28 m2. Do mieszkania przynależy piwnica o pow. 24,65 m2 Cena wywoławcza nieruchomości Mały Rynek 9/5 wynosi 78.304,00 zł
3. lokal mieszkalny Mały Rynek 9/6, położony na II piętrze budynku, składa się z 1 pokoju, kuchni, łazienki, o łącznej powierzchni użytkowej 36,55 m2. Do mieszkania przynależy piwnica o pow. 13,49 m2 Cena wywoławcza nieruchomości Mały Rynek 9/6 wynosi 71.056,00zł
Pierwsze przetargi na sprzedaż w/w lokali przeprowadzone w dniu 1 września 2011r. zakończyły się wynikiem negatywnym.
II przetargi na sprzedaż lokali mieszkalnych odbędą się w siedzibie Urzędu Miasta Oświęcim, ul. Zaborska 2, sala nr 15: 1. na lokal 9/4 – 8 listopada 2011r. o godz. 9.00 2. na lokal 9/5 – 8 listopada 2011r. 3. na lokal 9/6 – 8 listopada 2011r.`;

test('helpers', () => {
  assert.equal(noticeDate(BODY), '2011-11-08');
  assert.equal(splitItems(BODY).length, 3);
  assert.deepEqual(addressFromItem('lokal mieszkalny Mały Rynek 9/4, położony'), { address_raw: 'Mały Rynek 9/4', address: addressFromItem('lokal mieszkalny Mały Rynek 9/4, położony').address });
});

test('parseAnnouncement: 3 lokale — keys, usable areas, prices, shared round + date', () => {
  const recs = parseAnnouncement('Przetarg na sprzedaż lokali', BODY, 'https://oswiecim.pl/przetarg-na-sprzedaz-lokali-mieszkalnych-8/713/');
  assert.equal(recs.length, 3);
  assert.equal(recs[0].kind, 'mieszkalny');
  assert.equal(recs[0].address.key, 'maly rynek|9|4');
  assert.equal(recs[0].area_m2, 61.19); // usable, not the 19,98 cellar
  assert.equal(recs[0].starting_price_pln, 120792);
  assert.equal(recs[0].round, 2);
  assert.equal(recs[0].auction_date, '2011-11-08');
  assert.equal(recs[1].address.key, 'maly rynek|9|5');
  assert.equal(recs[1].starting_price_pln, 78304);
  assert.equal(recs[2].address.key, 'maly rynek|9|6');
  assert.equal(recs[2].starting_price_pln, 71056);
});

// --- Result notices (parseResultDoc) ----------------------------------------
// Fixture: verbatim OCR text (tesseract 5.3+pol) of attachment 52547 on
// dokument 52545 — "Informacja o wyniku przetargu - ul. Dąbrowskiego 46/14",
// fetched + OCR'd live 2026-07-18. Note the OCR quirks this parser must
// survive: "m”" for m², spaced thousands, and Oświęcim's "Cena uzyskana"
// (not "cena osiągnięta") template wording.
import { parseResultDoc } from '../src/cities/oswiecim/parse.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RESULT_OCR = readFileSync(
  fileURLToPath(new URL('../ocr-cache/file_id_52547.2644b598.txt', import.meta.url)),
  'utf8',
);
const RESULT_URL = 'https://bip.oswiecim.um.gov.pl/api/download/file?id=52547';

test('parseResultDoc: real Dąbrowskiego 46/14 notice → sold record with achieved price', () => {
  const recs = parseResultDoc(RESULT_OCR, null, RESULT_URL);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.building, '46');
  assert.equal(r.address.apt, '14');
  assert.equal(r.area_m2, 32.4);
  assert.equal(r.round, 3);
  assert.equal(r.starting_price_pln, 150000);
  assert.equal(r.final_price_pln, 151500);
  assert.equal(r.auction_date, '2025-11-26');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, RESULT_URL);
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: negative-result variant → unsold record, no price', () => {
  const neg = RESULT_OCR
    .replace(/Cena uzyskana[\s\S]*?00\/100\)/, '')
    .replace(/Przetarg zakończył się wynikiem pozytywnym[\s\S]*?Anna Prusak\./, 'Przetarg zakończył się wynikiem negatywnym.');
  const r = parseResultDoc(neg, null, RESULT_URL)[0];
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.unsold_reason, 'wynik negatywny');
});

test('parseResultDoc: non-flat and non-result texts → []', () => {
  assert.deepEqual(parseResultDoc('Informacja o wyniku przetargu na dzierżawę działki nr 5', null, RESULT_URL), []);
  assert.deepEqual(parseResultDoc('Prezydent ogłasza przetarg na sprzedaż lokalu mieszkalnego', null, RESULT_URL), []);
  assert.deepEqual(parseResultDoc('', null, RESULT_URL), []);
});
