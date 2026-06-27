// Piła parser + crawl-helper tests.
//
// Fixtures groundtruthed against LIVE data (2026-06-27):
//
// ANNOUNCEMENT PDF (single flat, 2026):
//   https://bip.pila.pl/files/file_add/download/11503_ogloszenieoprzetargulokalmieszkalny.pdf
//   Article: bip.pila.pl/prezydent-miasta-pily-oglasza-pierwszy-przetarg-ustny-
//     nieograniczony-na-sprzedaz-prawa-wlasnoscinieruchomosci-lokalowej-lokalu-
//     mieszkalnego-nr-8-polozonego-w-pile-przy-ul-11-listopada-39-termin-przetargu-17072026.html
//   ul. 11 Listopada 39/8, area 47,40 m², cena wywoławcza 167 000,00 zł,
//   wadium 33 400 zł, przetarg 17 LIPCA 2026, round 1 (pierwszy).
//
// RESULT NOTICE (inferred structure — VALIDATE on first CI run):
//   Post-auction result PDF added to the same article page as a "wyniki" attachment.
//   Standard Polish municipal result wording confirmed by spike + analog cities
//   (Tarnowskie Góry, Wejherowo). Groundtruthed phrasing TBD on live run.
//
// LIST PAGE (live, 2026-06-27):
//   https://bip.pila.pl/542-aktualne-przetargi-na-nieruchomosci.html
//   5 entries visible; 1 flat (lokal mieszkalny) entry confirmed.
//
// JOIN KEY: announcement + result both key on `11 listopada|39|8` (after
// normalize.js POLISH_LOWER + strip-diacritics). Round=1 matches both sides.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSkippableTitle,
  isFlatAnnouncementTitle,
  isResultNotice,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  addressFromPdfText,
  splitPdfIntoRows,
  parseAnnouncementPdf,
  parseResultDoc,
} from '../src/cities/pila/parse.js';

import {
  parseListPage,
  parseArticleAttachments,
} from '../src/cities/pila/crawl.js';

// ─── isSkippableTitle ──────────────────────────────────────────────────────────

test('isSkippableTitle: skips najem (lease)', () => {
  assert.equal(isSkippableTitle('Prezydent Miasta Piły ogłasza przetargi na najem lokali użytkowych'), true);
});

test('isSkippableTitle: skips dzierżawa', () => {
  assert.equal(isSkippableTitle('pierwsze przetargi ustne ograniczone na dzierżawę nieruchomości'), true);
});

test('isSkippableTitle: skips land-only (nieruchomości gruntowych)', () => {
  assert.equal(isSkippableTitle('Prezydent ogłasza przetargi na sprzedaż nieruchomości gruntowych przy ul. Glinianej'), true);
});

test('isSkippableTitle: does NOT skip flat announcement', () => {
  assert.equal(isSkippableTitle('PREZYDENT MIASTA PIŁY ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości lokalowej – lokalu mieszkalnego nr 8'), false);
});

test('isSkippableTitle: does NOT skip mixed batch with lokal mieszkalny', () => {
  assert.equal(isSkippableTitle('PREZYDENT ogłasza przetargi na sprzedaż lokali mieszkalnych'), false);
});

// ─── isFlatAnnouncementTitle ──────────────────────────────────────────────────

test('isFlatAnnouncementTitle: detects "lokal mieszkalny"', () => {
  assert.equal(isFlatAnnouncementTitle('PREZYDENT MIASTA PIŁY ogłasza pierwszy przetarg na sprzedaż lokalu mieszkalnego nr 8'), true);
});

test('isFlatAnnouncementTitle: detects "lokali mieszkalnych" (batch)', () => {
  assert.equal(isFlatAnnouncementTitle('ogłasza przetargi na sprzedaż lokali mieszkalnych'), true);
});

test('isFlatAnnouncementTitle: false for land', () => {
  assert.equal(isFlatAnnouncementTitle('ogłasza przetarg na sprzedaż nieruchomości gruntowej'), false);
});

// ─── roundFromText ────────────────────────────────────────────────────────────

test('roundFromText: "pierwszy przetarg" → 1', () => {
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż'), 1);
});

test('roundFromText: "drugi przetarg" → 2', () => {
  assert.equal(roundFromText('ogłasza drugi przetarg ustny nieograniczony'), 2);
});

test('roundFromText: "trzeciego przetargu" (result notice) → 3', () => {
  assert.equal(roundFromText('Informacja o wyniku trzeciego przetargu ustnego nieograniczonego'), 3);
});

test('roundFromText: bare "przetarg" with no ordinal → 1', () => {
  assert.equal(roundFromText('PREZYDENT MIASTA PIŁY ogłasza przetargi ustne na sprzedaż lokali'), 1);
});

test('roundFromText: null/empty → null or 1', () => {
  // empty text has no "przetarg" → null
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});

// ─── auctionDateFromText ──────────────────────────────────────────────────────
// Groundtruthed against the live 2026-07-17 announcement (pdftotext output).

test('auctionDateFromText: CAPS "PRZETARG ODBĘDZIE SIĘ 17 LIPCA 2026 R."', () => {
  const text = 'PRZETARG ODBĘDZIE SIĘ 17 LIPCA 2026 R. O GODZ. 9:00 W SIEDZIBIE URZĘDU MIASTA PIŁY';
  assert.equal(auctionDateFromText(text), '2026-07-17');
});

test('auctionDateFromText: lowercase "przetarg odbędzie się 17 lipca 2026 r."', () => {
  const text = 'Przetarg odbędzie się 17 lipca 2026 r. o godzinie 9:00.';
  assert.equal(auctionDateFromText(text), '2026-07-17');
});

test('auctionDateFromText: "odbędzie się 24 października 2025"', () => {
  const text = 'Przetarg ustny nieograniczony odbędzie się 24 października 2025 r. o godz. 9:00';
  assert.equal(auctionDateFromText(text), '2025-10-24');
});

test('auctionDateFromText: null/empty → null, no throw', () => {
  assert.equal(auctionDateFromText(null), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText('brak daty'), null);
});

// ─── startingPriceFromText ────────────────────────────────────────────────────
// Live fixture: "167 000,00 zł" (space-thousands, comma-grosze).

test('startingPriceFromText: "167 000,00 zł" → 167000', () => {
  // Simulates the PDF table column which has "Cena wywoławcza" header then value
  assert.equal(startingPriceFromText('Cena wywoławcza\n167 000,00 zł'), 167000);
});

test('startingPriceFromText: "123 759,00 zł" (2025 batch)', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza (netto)1\n123 759,00 zł'), 123759);
});

test('startingPriceFromText: "cena wywoławcza wynosi 167 000,00 zł"', () => {
  assert.equal(startingPriceFromText('cena wywoławcza za lokal wynosi 167 000,00 zł'), 167000);
});

test('startingPriceFromText: null/missing → null, no throw', () => {
  assert.equal(startingPriceFromText(null), null);
  assert.equal(startingPriceFromText('brak ceny'), null);
});

// ─── achievedPriceFromText ────────────────────────────────────────────────────

test('achievedPriceFromText: "osiągnięta w przetargu: 170 000,00 zł"', () => {
  assert.equal(achievedPriceFromText('Cena osiągnięta w przetargu: 170 000,00 zł'), 170000);
});

test('achievedPriceFromText: "osiągnięta w przetargu – 170000 zł" (dash separator)', () => {
  assert.equal(achievedPriceFromText('Cena osiągnięta w przetargu – 170 000 zł'), 170000);
});

test('achievedPriceFromText: no achieved price → null', () => {
  assert.equal(achievedPriceFromText('wynik negatywny'), null);
  assert.equal(achievedPriceFromText(null), null);
});

// ─── unitAreaFromText ─────────────────────────────────────────────────────────
// Live fixture: "lokal o powierzchni użytkowej 47,40 m2 składający się z:
//   2 pokoi (16,50 m2, 12,50 m2), kuchni (7,50 m2), łazienki (1,60 m2),
//   WC (1,00 m2), przedpokoju (8,30 m2) oraz pomieszczenia przynależnego,
//   tj. piwnicy (1,80 m2), razem powierzchnia użytkowa 49,20 m2"
// Must return 47.40, NOT 49.20 (total with cellar) or 1.80 (cellar alone).

test('unitAreaFromText: "lokal o powierzchni użytkowej 47,40 m2" → 47.4', () => {
  const text = 'lokal o powierzchni użytkowej 47,40 m2 składający się z: 2 pokoi (16,50 m2, 12,50 m2), kuchni (7,50 m2), łazienki (1,60 m2), WC (1,00 m2), przedpokoju (8,30 m2) oraz pomieszczenia przynależnego, tj. piwnicy (1,80 m2), razem powierzchnia użytkowa 49,20 m2';
  assert.equal(unitAreaFromText(text), 47.4);
});

test('unitAreaFromText: "powierzchni użytkowej 32,85 m2" (2025 batch)', () => {
  assert.equal(unitAreaFromText('lokal mieszkalny o powierzchni użytkowej 32,85 m2 wraz z udziałem'), 32.85);
});

test('unitAreaFromText: null/empty → null, no throw', () => {
  assert.equal(unitAreaFromText(null), null);
  assert.equal(unitAreaFromText(''), null);
});

// ─── addressFromPdfText ───────────────────────────────────────────────────────
// Live fixture (form a): "Piła, ul. 11 Listopada 39/8" → key `11 listopada|39|8`

test('addressFromPdfText: "Piła, ul. 11 Listopada 39/8" → correct key', () => {
  const addr = addressFromPdfText('Piła, ul. 11 Listopada 39/8\nlokal mieszkalny nr 8 w budynku przy ul. 11 Listopada 39');
  assert.ok(addr, 'address must be parsed');
  assert.equal(addr.building, '39');
  assert.equal(addr.apt, '8');
  assert.ok(/listopada/i.test(addr.street_norm), `street_norm should contain listopada, got: ${addr.street_norm}`);
});

test('addressFromPdfText: form (b) "lokal nr 8 … przy ul. 11 Listopada 39 w Pile"', () => {
  const addr = addressFromPdfText('lokal mieszkalny nr 8 w budynku przy ul. 11 Listopada 39 w Pile, o powierzchni');
  assert.ok(addr, 'address must be parsed');
  assert.equal(addr.building, '39');
  assert.equal(addr.apt, '8');
});

test('addressFromPdfText: "Piła, ul. Wawelska 53/3" → building=53, apt=3', () => {
  const addr = addressFromPdfText('Piła, ul. Wawelska 53/3\nlokal mieszkalny nr 3 w budynku przy ul. Wawelska 53');
  assert.ok(addr, 'address must be parsed');
  assert.equal(addr.building, '53');
  assert.equal(addr.apt, '3');
  assert.ok(/wawelska/i.test(addr.street_norm));
});

test('addressFromPdfText: "Piła, al. Powstańców Wlkp. 105/5" → building=105, apt=5', () => {
  const addr = addressFromPdfText('Piła, al. Powstańców Wlkp. 105/5\nlokal mieszkalny nr 5 w budynku');
  assert.ok(addr, 'address must be parsed');
  assert.equal(addr.building, '105');
  assert.equal(addr.apt, '5');
});

test('addressFromPdfText: null/empty → null, no throw', () => {
  assert.equal(addressFromPdfText(null), null);
  assert.equal(addressFromPdfText(''), null);
  assert.equal(addressFromPdfText('brak adresu'), null);
});

// ─── splitPdfIntoRows ─────────────────────────────────────────────────────────

test('splitPdfIntoRows: single-flat PDF → 1 chunk', () => {
  const text = 'PREZYDENT MIASTA PIŁY\n\nPiła, ul. 11 Listopada 39/8\nlokal mieszkalny nr 8\n\nPRZETARG ODBĘDZIE SIĘ 17 LIPCA 2026';
  const rows = splitPdfIntoRows(text);
  assert.equal(rows.length, 1);
  assert.ok(/listopada/i.test(rows[0]));
});

test('splitPdfIntoRows: multi-flat PDF → N chunks', () => {
  const text = [
    'PREZYDENT MIASTA PIŁY\n',
    'Piła, ul. Wawelska 53/3\nlokal mieszkalny nr 3\n167 000,00 zł\n',
    'Piła, al. Powstańców Wlkp. 105/5\nlokal mieszkalny nr 5\n123 759,00 zł\n',
    'PRZETARG ODBĘDZIE SIĘ 16 MAJA 2025 R.\n',
  ].join('');
  const rows = splitPdfIntoRows(text);
  assert.equal(rows.length, 2, 'two flat rows');
  assert.ok(/wawelska/i.test(rows[0]));
  assert.ok(/powstańców|powstancow/i.test(rows[1]));
});

test('splitPdfIntoRows: no "Piła," anchor → returns whole text', () => {
  const text = 'some text without any anchor line';
  const rows = splitPdfIntoRows(text);
  assert.equal(rows.length, 1);
  assert.equal(rows[0], text);
});

// ─── parseAnnouncementPdf (full fixture) ──────────────────────────────────────
//
// Condensed-but-faithful reconstruction of the real pdftotext -layout output
// from bip.pila.pl/files/file_add/download/11503_ogloszenieoprzetargulokalmieszkalny.pdf
// (fetched live 2026-06-27 and verified field-by-field).

const ANN_SINGLE = `                                                                                                  PREZYDENT MIASTA PIŁY

                                                            ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności
                                                    nieruchomości lokalowej – lokalu mieszkalnego nr 8 położonego w Pile przy ul. 11 Listopada 39

Przedmiotem pierwszego przetargu ustnego nieograniczonego jest następująca nieruchomość lokalowa:

                Położenie nieruchomości, oznaczenie
                                                                                                                                                                      Forma zbycia                 Cena wywoławcza                 Wysokość
                   wg księgi wieczystej i katastru,                             Opis nieruchomości, przeznaczenie i sposób jej zagospodarowania
                                                                                                                                                                      nieruchomości                     (netto)1                    wadium
                    powierzchnia nieruchomości

Piła, ul. 11 Listopada 39/8                              lokal mieszkalny położony na III piętrze w budynku mieszkalnym     lokal mieszkalny             167 000,00 zł                                                           33 400,00 zł
                                                         wielorodzinnym przy ul. 11 Listopada 39 w Pile, stanowiący            na własność
lokal mieszkalny nr 8 w budynku przy ul. 11 Listopada 39 aktualnie pustostan
w Pile, wraz z udziałem w wysokości 492/5974 części
w nieruchomości wspólnej

nieruchomość oznaczona geodezyjnie nr działki 242/44
(obręb 18)

powierzchnia działki: 0,0251 ha

lokal o powierzchni użytkowej 47,40 m2 składający się
z: 2 pokoi (16,50 m2, 12,50 m2), kuchni (7,50 m2), łazienki
(1,60 m2), WC (1,00 m2), przedpokoju (8,30 m2) oraz
pomieszczenia przynależnego, tj. piwnicy (1,80 m2), razem
powierzchnia użytkowa 49,20 m2

                                                PRZETARG ODBĘDZIE SIĘ 17 LIPCA 2026 R. O GODZ. 9:00
                                W SIEDZIBIE URZĘDU MIASTA PIŁY – PLAC STASZICA 10, 64-920 PIŁA – W SALI 229B II PIĘTRO
`;

test('parseAnnouncementPdf: single flat — kind/address/area/price/date/round', () => {
  const recs = parseAnnouncementPdf(ANN_SINGLE);
  assert.equal(recs.length, 1, 'exactly one record');
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.ok(r.address, 'address must be set');
  assert.equal(r.address.building, '39');
  assert.equal(r.address.apt, '8');
  assert.ok(/listopada/i.test(r.address.street_norm));
  // JOIN KEY used by build-properties to link result→announcement:
  assert.equal(r.address.key, '11 listopada|39|8');
  assert.equal(r.area_m2, 47.4, 'usable area 47,40 m², NOT 49,20 total or cellar 1,80');
  assert.equal(r.starting_price_pln, 167000);
  assert.equal(r.auction_date, '2026-07-17');
  assert.equal(r.round, 1);
});

test('parseAnnouncementPdf: null/empty → empty array', () => {
  assert.deepEqual(parseAnnouncementPdf(null), []);
  assert.deepEqual(parseAnnouncementPdf(''), []);
});

// Multi-flat batch fixture — condensed faithful reconstruction of a batch like
// the confirmed 16.05.2025 (Wawelska 53 + Aleja Powstańców 105) structure.

const ANN_MULTI = `PREZYDENT MIASTA PIŁY

ogłasza przetargi ustne nieograniczone na sprzedaż prawa własnościnieruchomości lokalowych – lokali mieszkalnych położonych w Pile – termin przetargów 16.05.2025

Piła, ul. Wawelska 53/3                              lokal mieszkalny nr 3 na III piętrze         lokal mieszkalny             145 000,00 zł                33 400,00 zł
lokal mieszkalny nr 3 w budynku przy ul. Wawelska 53  lokal o powierzchni użytkowej 38,20 m2       na własność
w Pile

Piła, al. Powstańców Wlkp. 105/5                     lokal mieszkalny nr 5 na II piętrze          lokal mieszkalny             123 759,00 zł                33 400,00 zł
lokal mieszkalny nr 5 w budynku przy al. Powstańców   lokal o powierzchni użytkowej 32,85 m2       na własność
Wlkp. 105 w Pile

PRZETARG ODBĘDZIE SIĘ 16 MAJA 2025 R. O GODZ. 9:00 W SIEDZIBIE URZĘDU MIASTA PIŁY – PLAC STASZICA 10
`;

test('parseAnnouncementPdf: multi-flat batch → 2 records', () => {
  const recs = parseAnnouncementPdf(ANN_MULTI);
  assert.equal(recs.length, 2, 'two records from multi-flat batch');
});

test('parseAnnouncementPdf: multi-flat — first flat Wawelska 53/3', () => {
  const recs = parseAnnouncementPdf(ANN_MULTI);
  const waw = recs.find(r => /wawelska/i.test(r.address?.street_norm ?? ''));
  assert.ok(waw, 'Wawelska record must exist');
  assert.equal(waw.address.building, '53');
  assert.equal(waw.address.apt, '3');
  assert.equal(waw.area_m2, 38.2);
  assert.equal(waw.starting_price_pln, 145000);
  assert.equal(waw.auction_date, '2025-05-16');
  assert.equal(waw.round, 1);
});

test('parseAnnouncementPdf: multi-flat — second flat Powstańców 105/5', () => {
  const recs = parseAnnouncementPdf(ANN_MULTI);
  const pow = recs.find(r => /powstancow|powstańców/i.test(r.address?.street_norm ?? ''));
  assert.ok(pow, 'Powstańców record must exist');
  assert.equal(pow.address.building, '105');
  assert.equal(pow.address.apt, '5');
  assert.equal(pow.area_m2, 32.85);
  assert.equal(pow.starting_price_pln, 123759);
  assert.equal(pow.auction_date, '2025-05-16');
});

// ─── isResultNotice ───────────────────────────────────────────────────────────

test('isResultNotice: "Informacja o wyniku przetargu" → true', () => {
  assert.equal(isResultNotice('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
});

test('isResultNotice: "INFORMACJA o wyniku" (CAPS) → true', () => {
  assert.equal(isResultNotice('INFORMACJA o wyniku pierwszego przetargu'), true);
});

test('isResultNotice: announcement body → false', () => {
  assert.equal(isResultNotice(ANN_SINGLE), false);
});

test('isResultNotice: null/empty → false', () => {
  assert.equal(isResultNotice(null), false);
  assert.equal(isResultNotice(''), false);
});

// ─── parseResultDoc ───────────────────────────────────────────────────────────
//
// Inferred from spike data + Piła standard municipal Polish wording.
// VALIDATE on first live CI run against actual pdftotext output.

const RESULT_SOLD = `
Informacja o wyniku pierwszego przetargu ustnego nieograniczonego
na sprzedaż prawa własności nieruchomości lokalowej –
lokalu mieszkalnego nr 8 położonego w Pile przy ul. 11 Listopada 39

W dniu 17 lipca 2026 r. odbył się w Urzędzie Miasta Piły pierwszy przetarg ustny
nieograniczony na sprzedaż prawa własności nieruchomości lokalowej – lokalu
mieszkalnego nr 8 w budynku przy ul. 11 Listopada 39 w Pile.

Piła, ul. 11 Listopada 39/8
lokal mieszkalny nr 8, powierzchnia użytkowa 47,40 m2

Cena wywoławcza: 167 000,00 zł
Cena osiągnięta w przetargu: 170 000,00 zł

Nabywcą nieruchomości został Jan Kowalski.
`;

const RESULT_UNSOLD = `
Informacja o wyniku pierwszego przetargu ustnego nieograniczonego
na sprzedaż prawa własności nieruchomości lokalowej –
lokalu mieszkalnego nr 8 położonego w Pile przy ul. 11 Listopada 39

W dniu 17 lipca 2026 r. odbył się pierwszy przetarg ustny nieograniczony.

Piła, ul. 11 Listopada 39/8
lokal mieszkalny nr 8, powierzchnia użytkowa 47,40 m2

Cena wywoławcza: 167 000,00 zł
Przetarg zakończył się wynikiem negatywnym z uwagi na brak uczestników przetargu.
`;

test('parseResultDoc: guard — non-result text returns []', () => {
  assert.deepEqual(parseResultDoc('Ogłoszenie o przetargu na lokal.', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});

test('parseResultDoc: SOLD — outcome=sold, final_price_pln set', () => {
  const recs = parseResultDoc(RESULT_SOLD, null, 'https://bip.pila.pl/files/file_add/download/99999_wyniki.pdf');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'sold');
  assert.equal(recs[0].final_price_pln, 170000);
  assert.equal(recs[0].starting_price_pln, 167000);
});

test('parseResultDoc: SOLD — address keys match the announcement JOIN KEY', () => {
  const recs = parseResultDoc(RESULT_SOLD, null, 'https://example.com');
  assert.ok(recs[0].address, 'address must be set');
  // Must produce the same key as the announcement: `11 listopada|39|8`
  assert.equal(recs[0].address.key, '11 listopada|39|8');
  assert.equal(recs[0].round, 1, 'same round as the announcement');
});

test('parseResultDoc: SOLD — area 47.40 m²', () => {
  const recs = parseResultDoc(RESULT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].area_m2, 47.4);
});

test('parseResultDoc: SOLD — kind=mieszkalny', () => {
  const recs = parseResultDoc(RESULT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].kind, 'mieszkalny');
});

test('parseResultDoc: SOLD — auction_date from body', () => {
  const recs = parseResultDoc(RESULT_SOLD, null, 'https://example.com');
  assert.equal(recs[0].auction_date, '2026-07-17');
});

test('parseResultDoc: SOLD — source_pdf stored', () => {
  const url = 'https://bip.pila.pl/files/file_add/download/99999_wyniki.pdf';
  const recs = parseResultDoc(RESULT_SOLD, null, url);
  assert.equal(recs[0].source_pdf, url);
});

test('parseResultDoc: UNSOLD — outcome=unsold, no final price', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, null, 'https://example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
});

test('parseResultDoc: UNSOLD — starting price still parsed', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, null, 'https://example.com');
  assert.equal(recs[0].starting_price_pln, 167000);
});

test('parseResultDoc: fallbackDate used when body has no recognisable date', () => {
  const noDate = RESULT_SOLD.replace(/W dniu 17 lipca 2026 r\. odbył się/i, 'Odbył się');
  const recs = parseResultDoc(noDate, '2026-07-17', 'https://example.com');
  assert.ok(recs.length > 0);
  assert.ok(
    recs[0].auction_date === '2026-07-17' || recs[0].auction_date === null,
    'date must be fallback or null, never wrong',
  );
});

// ─── parseListPage (crawl helper) ─────────────────────────────────────────────
//
// Condensed faithful copy of the real /542 page structure (2026-06-27).
// The CMS uses "Kliknij aby przejść do <TITLE>." link text pattern.

const LIST_HTML = `
<table class="registry">
<thead><tr>
  <th>TYP</th><th>NAZWA</th><th>DATA MODYFIKACJI</th><th>DATA DODANIA</th>
</tr></thead>
<tbody>
<tr>
  <td data-label="TYP"></td>
  <td data-label="NAZWA">
    <a href="prezydent-miasta-pily-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-prawa-wlasnosci-nieruchomosci-gruntowej-polozonej-przy-ul-kamiennej-w-pile-termin-przetargu-7-sierpnia-2026-r-.html?">
      Kliknij aby przejść do PREZYDENT MIASTA PIŁY ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości gruntowej, położonej przy ul. Kamiennej w Pile - termin przetargu 7 sierpnia 2026 r.</a>
  </td>
  <td data-label="DATA MODYFIKACJI">2026-06-23 11:25:29</td>
  <td data-label="DATA DODANIA">2026-06-23 09:59:01</td>
</tr>
<tr>
  <td data-label="TYP"></td>
  <td data-label="NAZWA">
    <a href="prezydent-miasta-pily-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-prawa-wlasnoscinieruchomosci-lokalowej-lokalu-mieszkalnego-nr-8-polozonego-w-pile-przy-ul-11-listopada-39-termin-przetargu-17072026.html?">
      Kliknij aby przejść do PREZYDENT MIASTA PIŁY ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż prawa własnościnieruchomości lokalowej – lokalu mieszkalnego nr 8 położonego w Pile przy ul. 11 Listopada 39 - termin przetargu 17.07.2026.</a>
  </td>
  <td data-label="DATA MODYFIKACJI">Brak modyfikacji</td>
  <td data-label="DATA DODANIA">2026-06-03 13:11:59</td>
</tr>
</tbody>
</table>`;

test('parseListPage: extracts flat auction entry', () => {
  const stubs = parseListPage(LIST_HTML);
  const flat = stubs.find(s => /lokalu-mieszkalnego/i.test(s.href));
  assert.ok(flat, 'flat entry must be present');
  assert.ok(/lokal.*mieszkaln/i.test(flat.title), `title should mention lokal mieszkalny, got: ${flat.title}`);
  assert.equal(flat.added_date, '2026-06-03');
});

test('parseListPage: land entry also extracted (caller filters)', () => {
  const stubs = parseListPage(LIST_HTML);
  const land = stubs.find(s => /gruntow/i.test(s.href));
  assert.ok(land, 'land entry should be in raw output for caller to filter');
});

test('parseListPage: slug href has trailing "?" stripped', () => {
  const stubs = parseListPage(LIST_HTML);
  const flat = stubs.find(s => /lokalu-mieszkalnego/i.test(s.href));
  assert.ok(flat);
  assert.ok(!flat.href.endsWith('?'), 'trailing ? must be stripped');
});

test('parseListPage: empty HTML returns []', () => {
  assert.deepEqual(parseListPage(''), []);
  assert.deepEqual(parseListPage('<html><body></body></html>'), []);
});

// ─── parseArticleAttachments (crawl helper) ───────────────────────────────────
//
// Confirmed live structure from the 11 Listopada 39 article (2026-06-27):
//   ref_84: DRZWI_OTWARTE_LOKAL_MIESZKALNY.pdf → other
//   ref_87: ogloszenie_o_przetargu_lokal_mieszkalny.pdf → announcement
//   ref_90: Klauzula_informacyjna_zalacznik_nr_1.pdf → other
//   ref_93: mapa_242_44.pdf → other

const ARTICLE_HTML = `
<div class="attachments">
  <a href="files/file_add/download/11528_drzwiotwartelokalmieszkalny.pdf">
    Kliknij aby pobrać plik: DRZWI_OTWARTE_LOKAL_MIESZKALNY.pdf.</a>
  <a href="files/file_add/download/11503_ogloszenieoprzetargulokalmieszkalny.pdf">
    Kliknij aby pobrać plik: ogloszenie_o_przetargu_lokal_mieszkalny.pdf.</a>
  <a href="files/file_add/download/11502_klauzulainformacyjnazalaczniknr1.pdf">
    Kliknij aby pobrać plik: Klauzula_informacyjna_zalacznik_nr_1.pdf.</a>
  <a href="files/file_add/download/11501_mapa24244.pdf">
    Kliknij aby pobrać plik: mapa_242_44.pdf.</a>
</div>`;

const ARTICLE_HTML_WITH_RESULT = `
<div class="attachments">
  <a href="files/file_add/download/11503_ogloszenieoprzetargulokalmieszkalny.pdf">
    Kliknij aby pobrać plik: ogloszenie_o_przetargu_lokal_mieszkalny.pdf.</a>
  <a href="files/file_add/download/11599_wyniki_przetargu_11listopada39.pdf">
    Kliknij aby pobrać plik: wyniki_przetargu_11listopada39.pdf.</a>
</div>`;

test('parseArticleAttachments: identifies announcement PDF', () => {
  const atts = parseArticleAttachments(ARTICLE_HTML);
  const ann = atts.find(a => a.role === 'announcement');
  assert.ok(ann, 'announcement attachment must be found');
  assert.ok(ann.url.includes('11503_ogloszenieoprzetargulokalmieszkalny.pdf'));
});

test('parseArticleAttachments: announcement URL is absolute', () => {
  const atts = parseArticleAttachments(ARTICLE_HTML);
  const ann = atts.find(a => a.role === 'announcement');
  assert.ok(ann.url.startsWith('https://bip.pila.pl/'), 'URL must be absolute');
});

test('parseArticleAttachments: no result PDF when not yet published', () => {
  const atts = parseArticleAttachments(ARTICLE_HTML);
  const result = atts.find(a => a.role === 'result');
  assert.equal(result, undefined, 'no result PDF before auction');
});

test('parseArticleAttachments: identifies result PDF when present', () => {
  const atts = parseArticleAttachments(ARTICLE_HTML_WITH_RESULT);
  const result = atts.find(a => a.role === 'result');
  assert.ok(result, 'result PDF must be found');
  assert.ok(result.url.includes('wyniki'), 'result PDF filename must contain wyniki');
});

test('parseArticleAttachments: empty HTML returns []', () => {
  assert.deepEqual(parseArticleAttachments(''), []);
});
