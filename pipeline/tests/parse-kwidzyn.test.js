// Kwidzyn parser tests. Fixtures are condensed-but-faithful copies of the REAL
// tesseract OCR text of live scanned notice PDFs fetched from bip.kwidzyn.pl
// (verified 2026-07-11 from this Pi's Polish residential IP; the exact OCR is
// committed under pipeline/ocr-cache/). Long non-load-bearing boilerplate (the
// wadium-procedure, RODO, cudzoziemcy, and rekompensata paragraphs) is trimmed;
// every OCR sentence that feeds a parsed field (address, area, price, date,
// round, kind, outcome) is kept EXACTLY as tesseract produced it — including its
// quirks, which the parser must survive:
//   - the m² superscript OCRs as "m?" / 'm"' (never rely on the ² glyph);
//   - zero grosze print as a dash: "400.000,- zł" and the spaced "74.300, - zł";
//   - the property street sits in the body ("przy ul. Chopina 34"), while the
//     auction VENUE ("ul. Warszawska 19") and the flat-VIEWING date ("16 marca
//     2026") are decoys the extractors must not pick;
//   - the standing "Zastrzega się prawo odwołania przetargu" clause is on every
//     announcement and must NOT read as a cancellation.
//
// Groundtruth (hand-verified against the live scans):
//   ul. Chopina 34/8  (lokal mieszkalny nr 8, 116,70 m², dz. 289/5), round I:
//     announce  att 129340  cena wyw. 400.000 zł, auction 2026-03-27
//     result R1 att 129767  UNSOLD — "wynikiem negatywnym, z uwagi na brak
//                           chętnych"; no achieved price (art. 43604)
//     result R2 att 130620  round II, auction 2026-06-12, again UNSOLD
//   ul. Malborska 59/3 (lokal mieszkalny nr 3, 32,10 m², dz. 149/2), round I:
//     announce  att 129341  cena wyw. 74.300 zł, auction 2026-03-27
//     result    att 129766  SOLD — osiągnięta 75.050 zł, nabywca named
//                           (art. 43605) — the announce ("Malborskiej 59") and
//                           result ("Malborskiej 59") key IDENTICALLY off the
//                           body, so build-properties can merge them
//   ul. Graniczna  (nieruchomość gruntowa niezabudowana, obręb 0005), round I:
//     announce  att 129921  grunt; auction 2026-05-29 (from "Przetarg odbędzie
//                           się w dniu …", the land date form). Its parcels sit
//                           in an OCR-mangled scan table → dzialka_nr resolves to
//                           null by design (a garbled parcel is never emitted).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverAll, crawlActive, crawlResultDocs, textCached } from '../src/cities/kwidzyn/crawl.js';
import { urlCacheKey } from '../src/core/hash.js';
import { config } from '../src/cities/kwidzyn/config.js';

import {
  parsePLN,
  parseArea,
  roundFromText,
  parseDateText,
  isCancellation,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/kwidzyn/parse.js';

const pdfUrl = (id) => `https://bip.kwidzyn.pl/e,pobierz,get.html?id=${id}`;
const currentFlat = (id) => readFileSync(new URL(`../ocr-cache/${urlCacheKey(pdfUrl(id))}.txt`, import.meta.url), 'utf8');
const entry = (id) => ({ id, aliasFields: [{ alias: 'title', value: 'Ogłoszenie o przetargu na sprzedaż lokalu' }] });

test('parcel lookup uses the canonical official municipal identity', () => {
  const { cities } = JSON.parse(readFileSync(new URL('../../spikes/master-cities.json', import.meta.url), 'utf8'));
  assert.equal(config.teryt.replace('_', ''), cities.find((city) => city.id === config.id).official.terc_gmina);
});

function sourceOptions(overrides = {}) {
  return {
    thisYear: 2026, knownUrls: new Set(), isCached: () => true,
    extractText: async (url) => currentFlat(new URL(url).searchParams.get('id')),
    fetchJson: async (url) => {
      if (url.endsWith('/menu/13536')) return [{ id: 13536, children: [{ id: 16626, name: '2026' }] }];
      if (url.includes('/menu/13536/articles')) return { total: 0, articles: [] };
      if (url.includes('/menu/16626/articles')) return { total: 2, articles: [entry(44282), entry(44281)] };
      const id = Number(url.split('/').at(-1));
      return { id, attachments: [{ id: id === 44282 ? 131119 : 131118, extension: 'pdf', name: 'Ogłoszenie' }] };
    },
    ...overrides,
  };
}

test('cached current announcements remain eligible even when their URLs are already known', async () => {
  const state = await discoverAll(sourceOptions({ knownUrls: new Set([pdfUrl(131119), pdfUrl(131118)]) }));
  const active = await crawlActive({ discover: async () => state, today: '2026-10-20' });
  assert.equal(active.land_complete, false, 'a rolling board cannot replace land history');
  assert.deepEqual(active.listings.map((row) => [row.address.key, row.area_m2, row.starting_price_pln, row.auction_date, row.round]), [
    ['hallera|15|15', 22.1, 41108, '2026-10-23', 2],
    ['chopina|34|8', 116.7, 350000, '2026-10-23', 4],
  ]);
});

test('an uncached cap does not starve cached current announcements and cannot prove complete results', async () => {
  const extracted = [];
  const state = await discoverAll(sourceOptions({ maxUncached: 0, isCached: (url) => url === pdfUrl(131118),
    extractText: async (url) => { extracted.push(url); return currentFlat(131118); },
  }));
  assert.deepEqual(extracted, [pdfUrl(131118)]);
  assert.equal(state.records.length, 1);
  assert.equal((await crawlResultDocs({ discover: async () => state })).complete, false);
});

test('both text caches save extraction work; tiny scanned-PDF artifacts do not', () => {
  const directory = mkdtempSync(join(tmpdir(), 'kwidzyn-cache-test-'));
  try {
    const path = join(directory, urlCacheKey(pdfUrl(131119)) + '.txt');
    writeFileSync(path, '\f');
    assert.equal(textCached(pdfUrl(131119), [directory]), false);
    writeFileSync(path, currentFlat(131119));
    assert.equal(textCached(pdfUrl(131119), [directory]), true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('API failures, missing attachments, wrong identity and changed list shapes are incomplete', async () => {
  for (const broken of [
    async () => { throw new Error('offline'); },
    async () => ({ total: 0 }),
    async () => ({ total: 1, articles: [] }),
    async () => ({ total: 2, articles: [entry(44282), entry(44282)] }),
    async () => ({ total: 2, articles: [entry(44282), entry(44281)] }),
  ]) {
    const base = sourceOptions();
    const state = await discoverAll({ ...base, fetchJson: (url) => url.endsWith('/menu/13536') ? base.fetchJson(url) : broken(url) });
    assert.equal(state.complete, false);
  }
  const base = sourceOptions();
  for (const article of [{ id: 44282, attachments: [] }, { id: 1, attachments: [{ id: 131119, extension: 'pdf' }] }]) {
    const state = await discoverAll({ ...base, fetchJson: (url) => url.includes('/api/articles/') ? article : base.fetchJson(url) });
    assert.equal(state.complete, false);
  }
});

test('older linked years and unparsed result PDFs keep achieved-price coverage incomplete', async () => {
  const base = sourceOptions();
  const older = await discoverAll({ ...base, fetchJson: (url) => url.endsWith('/menu/13536')
    ? [{ id: 13536, children: [{ id: 16626, name: '2026' }, { id: 15878, name: '2024' }] }]
    : base.fetchJson(url) });
  assert.equal(older.complete, false);
  const unsupported = await discoverAll({ ...base, extractText: async () => 'Informacja o wyniku przetargu — nieczytelna tabela' });
  assert.equal(unsupported.complete, false);
});

// --------------------------------------------------------------- fixtures

const CHOPINA_ANNOUNCE = `Burmistrz Miasta Kwidzyna

działając w oparciu o przepisy ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
(t. j. Dz. U. z 2024r. poz. 1145 z późn. zm.)

ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8
położonego w budynku przy ul. Chopina 34 w Kwidzynie

Lokal będący przedmiotem przetargu zlokalizowany jest w budynku przy ul. Chopina 34
w Kwidzynie, położonym na działce nr 289/5 o pow. 0,0316 ha, dla której prowadzona jest
przez Sąd Rejonowy w Kwidzynie księga wieczysta nr GD11/00007594/4.

Lokal mieszkalny położony jest na II piętrze budynku i składa się z 5 pokoi, 2 przedpokoi,
kuchni, łazienki i spiżarni o łącznej pow. użytkowej 116,70 m? oraz z przynależnej piwnicy
o pow. 17,50 m?.

Termin złożenia wniosku przez osoby, którym przysługiwało pierwszeństwo w nabyciu
nieruchomości na podstawie art. 34 ust. 1 pkt. 1 i 2 upłynął w dniu 20 stycznia 2026 r.

Zapraszamy osoby fizyczne oraz prawne zainteresowane nabyciem lokalu do wzięcia udziału
w przetargu w dniu 27 marca 2026 r. o godz. 10 w sali nr 111 Urzędu Miejskiego
w Kwidzynie, ul. Warszawska 19.

Dla osób zainteresowanych nabyciem, lokal zostanie udostępniony w dniu 16 marca 2026 r.
o godz. 11.

Cena wywoławcza nieruchomości wynosi 400.000,- zł (słownie złotych: czterysta tysięcy).
Minimalna wysokość postąpienia wynosi 1% ceny wywoławczej.

Zastrzega się prawo odwołania przetargu w przypadku zaistnienia uzasadnionych powodów.`;

const MALBORSKA_ANNOUNCE = `Burmistrz Miasta Kwidzyna

działając w oparciu o przepisy ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami

ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3
położonego w budynku przy ul. Malborskiej 59 w Kwidzynie

Lokal będący przedmiotem przetargu zlokalizowany jest w budynku przy ul. Malborskiej 59
w Kwidzynie, położonym na działce nr 149/2 o pow. 0,0799 ha, dla której prowadzona jest
przez Sąd Rejonowy w Kwidzynie księga wieczysta nr GD1I/00054833/6.

Lokal mieszkalny położony jest na parterze budynku i składa się z pokoju, kuchni, łazienki
i korytarza o łącznej pow. użytkowej 32,10 m”. Do lokalu przynależne jest pomieszczenie
gospodarcze o pow. 10,70 m*, znajdujące się w budynku gospodarczym wolnostojącym.

Zapraszamy osoby fizyczne oraz prawne zainteresowane nabyciem lokalu do wzięcia udziału
w przetargu w dniu 27 marca 2026 r. o godz. 10 w sali nr 111 Urzędu Miejskiego
w Kwidzynie, ul. Warszawska 19.

Dla osób zainteresowanych nabyciem, lokal zostanie udostępniony w dniu 16 marca 2026 r.
o godz. 11.

Cena wywoławcza nieruchomości wynosi 74.300, - zł (słownie złotych: siedemdziesiąt cztery
tysiące trzysta).`;

const GRANICZNA_LAND_ANNOUNCE = `Burmistrz Miasta Kwidzyna

działając w oparciu o przepisy ustawy z dnia 21.08.1997 r. o gospodarce nieruchomościami

ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
niezabudowanej, stanowiącej własność Miasta Kwidzyna, położonej przy ul. Granicznej
w obrębie 0005, przeznaczonej pod zabudowę mieszkaniową.

Lp| - Nrdziałek Pow. wm? / Nr księgi wieczystej Cena wywoławcza netto Wysokość wadium
1... 373/12 375/8 894 GD11/00023554/0 150 000 zł 26 000 zł

I. Warunki przetargu:
1. Przetarg odbędzie się w dniu 29 maja 2026 r. od godz. 10 w pok. nr 111
w siedzibie Urzędu Miejskiego w Kwidzynie przy ul. Warszawskiej 19.
4. Warunkiem udziału w przetargu jest:
1) wniesienie do dnia 25 maja 2026 r. wadium w pieniądzu (PLN) w wysokości podanej powyżej.`;

const MALBORSKA_RESULT_SOLD = `BURMISTRZ MIASTA
KWIDZYNA
woj. pomorskie

Informacja o wyniku przetargu    GG.6840.5.3.2025

1. | Data, miejsce i rodzaj przeprowadzonego | 27.03.2026 r., pierwszy przetarg ustny nieograniczony
przetargu:

2. | Oznaczenie nieruchomości: Lokal mieszkalny nr 3 położony parterze budynku przy ul. Malborskiej 59 w Kwidzynie,
składający się z pokoju, kuchni, łazienki i korytarza o łącznej pow. użytkowej 32,10 m? oraz
z przynależnego budynku gospodarczego o pow. 10,70 m”. Z lokalem związany jest udział
w wysokości 278/1000 w częściach wspólnych budynku oraz w działce nr 149/2 o pow.
0,0799 ha, dla której założona jest księga wieczysta nr GD11/00054833/6.

4.| 1) cena wywoławcza 1) 74.300,- zł
2) najwyższa cena osiągnięta 2) 75.050, - zł

5. | Imię i nazwisko osoby ustalonej jako nabywca nieruchomości: Mariusz Igielski

Wywieszono w dniu: 03.04.2026 r.`;

const CHOPINA_RESULT_R1_UNSOLD = `BURMISTRZ MIASTA
KWIDZYNA GG.6840.5.2.2025

woj. pomorskie Informacja o wyniku przetargu

1. | Data, miejsce i rodzaj przeprowadzonego | 27.03.2026 r., pierwszy przetarg ustny nieograniczony
przetargu:

2. | Oznaczenie nieruchomości: Lokal mieszkalny nr 8 położony Il piętrze budynku przy ul. Chopina 34 w Kwidzynie,
składający się z 5 pokoi, 2 przedpokoi, kuchni, łazienki i spiżarki o łącznej pow. użytkowej
116,70 m? oraz z przynależnej piwnicy o pow. 17,50 m?. Z lokalem związany jest udział
w wysokości 125/1000 w częściach wspólnych budynku oraz w działce nr 289/5 o pow.
0,0316 ha, dla której założona jest księga wieczysta nr GD11/00007594/4.

4.| 1) cena wywoławcza 1) 400.000, - zł

2) najwyższa cena osiągnięta | =
w przetargu:

5. | Imię i nazwisko osoby ustalonej jako Przetarg zakończył się wynikiem negatywnym, z uwagi na brak chętnych.
nabywca nieruchomości:

Wywieszono w dniu: 03.04.2026 r.`;

const CHOPINA_RESULT_R2_UNSOLD = `GG.6840.5.2.2025
Informacja o wyniku przetargu

1. | Data, miejsce i rodzaj przeprowadzonego | 12.06.2026 r., drugi przetarg ustny nieograniczony
przetargu:

2. | Oznaczenie nieruchomości: Lokal mieszkalny nr 8 położony II piętrze budynku przy ul. Chopina 34 w Kwidzynie,
składający się z 5 pokoi, 2 przedpokoi, kuchni, łazienki i spiżarki o łącznej pow. użytkowej
116,70 m? oraz z przynależnej piwnicy o pow. 17,50 m?. Z lokalem związany jest udział
w wysokości 125/1000 w częściach wspólnych budynku oraz w działce nr 289/5 o pow.
0,0316 ha, dla której założona jest księga wieczysta nr GD11/00007594/4.

4.| 1) cena wywoławcza 1) 400.000,- zł
2) najwyższa cena osiągnięta 2) mannnnannam

5. | Imię i nazwisko osoby ustalonej jako nabywca nieruchomości: Przetarg zakończył się wynikiem negatywnym, z uwagi na brak chętnych.

Wywieszono w dniu:`;

// -------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, space-thousands, and the dash-grosze OCR form', () => {
  assert.equal(parsePLN('400.000,-'), 400000);   // dash grosze
  assert.equal(parsePLN('74.300'), 74300);
  assert.equal(parsePLN('75.050'), 75050);
  assert.equal(parsePLN('150 000'), 150000);      // land, space thousands
  assert.equal(parsePLN('320.800,00'), 320800);
  assert.equal(parsePLN(''), null);
});

test('parseArea: comma decimals and a bare integer', () => {
  assert.equal(parseArea('0,0316'), 0.0316);
  assert.equal(parseArea('116,70'), 116.7);
  assert.equal(parseArea('32,10'), 32.1);
  assert.equal(parseArea('894'), 894);
});

test('roundFromText: ordinal words (incl. plural "przetargach") and Roman numerals', () => {
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('12.06.2026 r., drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('ogłoszenie o trzecim przetargu na sprzedaż lokalu'), 3);
  assert.equal(roundFromText('ogłoszenie o trzecich przetargach ustnych nieograniczonych'), 3);
  assert.equal(roundFromText('ogłoszenie o II przetargu na sprzedaż lokalu'), 2);
});

test('parseDateText: numeric (results) and Polish word-month (announcements)', () => {
  assert.equal(parseDateText('27.03.2026 r.'), '2026-03-27');
  assert.equal(parseDateText('12.06.2026'), '2026-06-12');
  assert.equal(parseDateText('29 maja 2026 r.'), '2026-05-29');
  assert.equal(parseDateText('27 marca 2026 r.'), '2026-03-27');
  assert.equal(parseDateText('brak daty'), null);
});

test('isCancellation: the standing "prawo odwołania przetargu" clause is NOT a cancellation', () => {
  assert.equal(isCancellation('Zastrzega się prawo odwołania przetargu w przypadku zaistnienia uzasadnionych powodów.'), false);
  assert.equal(isCancellation('Informacja o wyniku przetargu'), false);
  assert.equal(isCancellation('Ogłoszenie o odwołaniu przetargu na sprzedaż lokalu przy ul. Chopina'), true);
});

// ------------------------------------------------------- parseAnnouncement (flats)

test('parseAnnouncement: Chopina 34/8 round I — address from BODY (not venue "Warszawska"), OCR "m?" area, dash-grosze price, auction date not the viewing date', () => {
  const r = parseAnnouncement(CHOPINA_ANNOUNCE, 'Ogłoszenie o przetargu nieograniczonym na sprzedaż lokalu mieszkalnego przy ul. Chopina 34/8 w Kwidzynie', 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=129340');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Chopina');
  assert.equal(r.address.building, '34');
  assert.equal(r.address.apt, '8');
  assert.equal(r.address.key, 'chopina|34|8');
  assert.equal(r.area_m2, 116.7);
  assert.equal(r.starting_price_pln, 400000);
  assert.equal(r.auction_date, '2026-03-27'); // NOT 2026-03-16 (viewing) / 2026-01-20 (pre-emption)
  assert.equal(r.round, 1);
});

test('parseAnnouncement: Malborska 59/3 round I — genitive body street ("Malborskiej"), spaced dash-grosze price "74.300, - zł"', () => {
  const r = parseAnnouncement(MALBORSKA_ANNOUNCE, 'Ogłoszenie … ul. Malborska 59/3', 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=129341');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Malborskiej');
  assert.equal(r.address.building, '59');
  assert.equal(r.address.apt, '3');
  assert.equal(r.address.key, 'malborskiej|59|3'); // must match the SOLD result's key below
  assert.equal(r.area_m2, 32.1);
  assert.equal(r.starting_price_pln, 74300);
  assert.equal(r.auction_date, '2026-03-27');
  assert.equal(r.round, 1);
});

// -------------------------------------------------------- parseAnnouncement (land)

test('parseAnnouncement: Graniczna round I — LAND classifies "grunt", land date form ("Przetarg odbędzie się w dniu"), OCR-table parcel resolves to null (never a garbled dz. nr)', () => {
  const r = parseAnnouncement(GRANICZNA_LAND_ANNOUNCE, 'ogłoszenie … o sprzedaży … przy ul. Granicznej', 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=129921');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-05-29'); // NOT 2026-05-25 (wadium deadline)
  assert.equal(r.address, null);              // land is parcel-keyed, no street address
});

// ----------------------------------------------------------------- parseResultDoc

test('parseResultDoc: Malborska 59/3 SOLD — osiągnięta 75.050 zł, body-keyed IDENTICALLY to its announcement, outcome sold', () => {
  const [r] = parseResultDoc(MALBORSKA_RESULT_SOLD, null, 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=129766');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'malborskiej|59|3');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-03-27');
  assert.equal(r.starting_price_pln, 74300);
  assert.equal(r.final_price_pln, 75050);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=129766');
});

test('parseResultDoc: Chopina 34/8 round I UNSOLD — "wynikiem negatywnym, z uwagi na brak chętnych"; no fabricated final price', () => {
  const [r] = parseResultDoc(CHOPINA_RESULT_R1_UNSOLD, null, 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=129767');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'chopina|34|8');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-03-27');
  assert.equal(r.starting_price_pln, 400000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak chętnych');
});

test('parseResultDoc: Chopina 34/8 round II UNSOLD — same flat key, round 2, auction 2026-06-12 (garbled achieved-price cell → null)', () => {
  const [r] = parseResultDoc(CHOPINA_RESULT_R2_UNSOLD, null, 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=130620');
  assert.equal(r.address.key, 'chopina|34|8');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-06-12');
  assert.equal(r.starting_price_pln, 400000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
});

test('parseResultDoc: an announcement (no result markers) and empty input both return []', () => {
  assert.deepEqual(parseResultDoc(CHOPINA_ANNOUNCE, null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});

test('result 127118 never labels a parcel hectare figure as flat square metres', async () => {
  const { readFileSync } = await import('node:fs');
  const parser = await import('../src/cities/kwidzyn/parse.js');
  const text = readFileSync(new URL('../ocr-cache/e_pobierz_get.html_id_127118.8fe4133d.txt', import.meta.url), 'utf8');
  const rows = parser.parseResultDoc(text, '2025-04-04', 'https://bip.kwidzyn.pl/e,pobierz,get.html?id=127118');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].area_m2, null);
  assert.equal(rows[0].starting_price_pln, 89000);
});
