// Sopot parser tests. Fixtures are REAL text (condensed to the load-bearing
// sentences, boilerplate letterhead/footer trimmed) fetched live 2026-07-18
// from bip.sopot.pl's JSON API:
//   - id 58541 (announcement .doc): "(ZAKOŃCZONY) I publiczny przetarg ustny
//     nieograniczony na sprzedaż lokalu mieszkalnego nr 1 ... Armii Krajowej
//     61 w Sopocie" — attachment "przetarg I Armii Krajowej 61 lokal
//     mieszkalny 1.doc".
//   - id 59208 (result .doc, SAME property, NEGATIVE — no wadium paid):
//     attachment "Informacja o wyniku I przetargu nieograniczonego ...".
//   - id 55644 (result .doc, Wybickiego 45/4, SOLD): attachment "Wybickiego
//     45 4 informacja o wyniku przetargu.doc" — carries a real catdoc-noise
//     run (stray control-char lines from the legacy .doc binary) between two
//     real sentences, kept here to prove the regexes tolerate it.
//   - id 17712 (INLINE result article `content`, Fiszera 2, 2016 era,
//     NEGATIVE) — no attachment at all, the whole result lives in the
//     article's HTML content field.
//   - id 19871 (garage announcement title, no street building number):
//     "I publiczny przetarg ustny nieograniczony na sprzedaż garażu nr 16
//     położonego przy ul. Traugutta w Sopocie wraz z prawem własności
//     działki nr 50/3".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isOutOfScopeTitle,
  isCancelledTitle,
  titleInScopeKind,
  isSaleAnnouncementTitle,
  isResultStandaloneTitle,
  isAnnouncementText,
  isResultText,
  isNegativeResultText,
  achievedPriceFromText,
  buyerFromText,
  unsoldReasonFromText,
  roundFrom,
  garageAddressFrom,
  resultDateFromText,
  buildAnnouncementRecord,
  buildResultRecord,
  parseResultDoc,
} from '../src/cities/sopot/parse.js';

const ANNOUNCEMENT_TITLE =
  '(ZAKOŃCZONY) I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 położonego w budynku przy ul. Armii Krajowej 61 w Sopocie';

const ANNOUNCEMENT_TEXT = `budynku przy ul. Armii Krajowej 61 w Sopocie.
Lokal składa się z 2-ch pokoi ( o powierzchni: 21,45 m², 27,15 m² ),
przedpokoju o powierzchni 7,60 m², kuchni o powierzchni 6,30 m² i
łazienki o powierzchni 2,70 m².
Powierzchnia użytkowa lokalu wynosi  65,20 m².
Z przedmiotowym lokalem związany będzie udział 20/100 niewydzielonych
części w prawie własności nieruchomości wspólnej.
Lokal mieszkalny nr 1 wymaga remontu generalnego.
Cena wywoławcza lokalu mieszkalnego nr 1
wraz z udziałem w prawie własności gruntu wynosi:
900.000,00 zł
Przetarg odbędzie się w dniu 16 lipca 2026 r. o godz. 11.00 w sali nr
132 Urzędu Miasta Sopotu na I piętrze budynku, zlokalizowanego przy
ul. Rzemieślniczej 17-19 w Sopocie.`;

const RESULT_NEGATIVE_TEXT = `Prezydent Miasta Sopotu
GN.6840.11.2026.KJ
Sopot, 16 lipca 2026r.
INFORMACJA  O  WYNIKU  PRZETARGU
dotycząca rozstrzygnięcia I publicznego przetargu ustnego
nieograniczonego
na sprzedaż lokalu mieszkalnego nr 1 w
budynku przy ul. Armii Krajowej 61  w Sopocie,
stanowiącego własność Gminy Miasta Sopotu.
W dniu 16 lipca 2026 r. o godz. 11.00 w sali nr 132 budynku Urzędu
Miasta Sopotu przy ul. Rzemieślniczej 17-19 w Sopocie odbył się I
publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
nr 1 o powierzchni użytkowej 65,20 m2, położonego na parterze (I
kondygnacji) w budynku przy  ul. Armii Krajowej 61 w Sopocie.
Wadium w wysokości 150.000,00 zł w terminie wyznaczonym w ogłoszeniu
o przetargu tj. do dnia 13.07.2026 r. nie zostało wpłacone przez żaden
podmiot.
Cena wywoławcza lokalu mieszkalnego nr 1 wraz z udziałem w prawie
własności gruntu wynosiła  -  900.000,00 zł.
Z uwagi na brak wadium - przetarg zakończył się wynikiem negatywnym.`;

// Real catdoc noise (stray control-char lines from the .doc binary) kept
// between two real sentences to prove the regexes tolerate it.
const RESULT_POSITIVE_TEXT = `GN.6840.WYB.45.4.2025.KJ
Sopot, 22 maja 2025r.
INFORMACJA  O  WYNIKU  PRZETARGU
dotycząca rozstrzygnięcia  przetargu ustnego nieograniczonego
na sprzedaż lokalu niemieszkalnego nr 4 w
budynku przy ul. Gen. Józefa Wybickiego 45 w Sopocie,
stanowiącego własność Gminy Miasta Sopotu.
W dniu 22 maja 2025r. o godz. 10.00 w sali nr 58 Urzędu Miasta Sopotu
odbył się przetarg ustny nieograniczony na sprzedaż lokalu
niemieszkalnego nr 4 o powierzchni użytkowej 40,76 m2 wraz z
przynależnym pomieszczeniem w piwnicy o powierzchni  2,75 m²,
położonego na poddaszu (III kondygnacji) w budynku przy  ul. Gen.
Józefa Wybickiego 45 w Sopocie.

t
!t
z
š
œ

Cena wywoławcza lokalu niemieszkalnego nr 4 wraz z udziałem w prawie
własności gruntu wynosiła  -  400.000,00 zł.
Postąpienie ustalono na 4.000,00 zł.
Cena sprzedaży lokalu niemieszkalnego nr 4 wraz z udziałem w prawie
własności gruntu osiągnęła w wyniku przetargu kwotę - 404.000,00
zł.
Nabywcą lokalu została Pani Katarzyna Jagiełka, zamieszkała przy
ul. Wybickiego 45/3, 81-842 Sopot`;

const RESULT_INLINE_OLD_TEXT = `Informacja dotycząca rozstrzygnięcia I publicznego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 3 położonego w budynku przy ul. Fiszera 2 w Sopocie, stanowiącego własność Gminy Miasta Sopotu.
Termin przetargu: 29 września 2016r., godz. 12.00. Miejsce przetargu: Urząd Miasta Sopotu, sala nr 39.
CENA WYWOŁAWCZA - 1.290.000,00 zł
WADIUM w wysokości - 180.000,00 zł należało wpłacić do dnia 23 września 2016r.
POSTĄPIENIE - nie mniejsze niż 13.000,00 zł
Z uwagi na brak wpłaty wadium w zakreślonym w ogłoszeniu terminie przetarg zakończył się wynikiem negatywnym.`;

const GARAGE_TITLE =
  'I publiczny przetarg ustny nieograniczony na sprzedaż garażu nr 16 położonego przy ul. Traugutta w Sopocie wraz z prawem własności działki nr 50/3';

// ---- title-level filters -----------------------------------------------------

test('title filters: out-of-scope / cancelled', () => {
  assert.equal(isOutOfScopeTitle('Pisemny przetarg nieograniczony na najem lokalu użytkowego'), true);
  assert.equal(isOutOfScopeTitle('PRZETARG NA SPRZEDAŻ SKŁADNIKA MAJĄTKU RUCHOMEGO'), true);
  assert.equal(isOutOfScopeTitle('Informacja o rozstrzygnięciu II przetargu na kawiarenki mobilne'), true);
  assert.equal(
    isOutOfScopeTitle('Informacja o wyniku przeprowadzenia rokowań dotyczących zbycia nieruchomości'),
    true,
  );
  assert.equal(isOutOfScopeTitle(ANNOUNCEMENT_TITLE), false);
  assert.equal(isCancelledTitle('(ODWOŁANY) I publiczny przetarg ustny nieograniczony na sprzedaż garażu nr 16'), true);
  assert.equal(isCancelledTitle('[UNIEWAŻNIONY] Przetarg ustny nieograniczony na sprzedaż nieruchomości'), true);
  assert.equal(isCancelledTitle(ANNOUNCEMENT_TITLE), false);
});

test('titleInScopeKind: flat / commercial / garage / land(null)', () => {
  assert.equal(titleInScopeKind(ANNOUNCEMENT_TITLE), 'mieszkalny');
  assert.equal(
    titleInScopeKind('I publiczny przetarg ustny nieograniczony na sprzedaż lokalu niemieszkalnego nr 8'),
    'uzytkowy',
  );
  assert.equal(
    titleInScopeKind('I publiczny przetarg ustny nieograniczony na sprzedaż lokalu użytkowego nr 1A'),
    'uzytkowy',
  );
  assert.equal(titleInScopeKind(GARAGE_TITLE), 'garaz');
  assert.equal(
    titleInScopeKind('Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej'),
    null,
  );
});

test('isSaleAnnouncementTitle / isResultStandaloneTitle', () => {
  assert.equal(isSaleAnnouncementTitle(ANNOUNCEMENT_TITLE), true);
  // "na najem" (rental) has no "sprzedaż" — isOutOfScopeTitle is what drops
  // rentals; this title-shape check alone correctly says "not a sale" too.
  assert.equal(isSaleAnnouncementTitle('Pisemny przetarg nieograniczony na najem garażu nr 358'), false);
  assert.equal(
    isResultStandaloneTitle(
      'Informacja dotycząca rozstrzygnięcia I publicznego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 3',
    ),
    true,
  );
  assert.equal(isResultStandaloneTitle('Wybickiego 45 4 informacja o wynikach przetargu'), true);
  assert.equal(isResultStandaloneTitle(ANNOUNCEMENT_TITLE), false);
});

// ---- text-level classification ----------------------------------------------

test('isAnnouncementText / isResultText distinguish the two attachment roles', () => {
  assert.equal(isAnnouncementText(ANNOUNCEMENT_TEXT), true);
  assert.equal(isResultText(ANNOUNCEMENT_TEXT), false);
  assert.equal(isResultText(RESULT_NEGATIVE_TEXT), true);
  assert.equal(isAnnouncementText(RESULT_NEGATIVE_TEXT), false); // has "cena wywoławcza" too, but result wins
  assert.equal(isResultText(RESULT_POSITIVE_TEXT), true);
  assert.equal(isResultText(RESULT_INLINE_OLD_TEXT), true);
});

test('isNegativeResultText / achievedPriceFromText / buyerFromText', () => {
  assert.equal(isNegativeResultText(RESULT_NEGATIVE_TEXT), true);
  assert.equal(achievedPriceFromText(RESULT_NEGATIVE_TEXT), null);
  assert.equal(isNegativeResultText(RESULT_POSITIVE_TEXT), false);
  assert.equal(achievedPriceFromText(RESULT_POSITIVE_TEXT), 404000);
  assert.equal(buyerFromText(RESULT_POSITIVE_TEXT), 'Pani Katarzyna Jagiełka');
  assert.equal(unsoldReasonFromText(RESULT_NEGATIVE_TEXT), 'no_wadium');
});

// ---- round --------------------------------------------------------------------

test('roundFrom: Roman + "publiczny", bare Roman, word forms, "l" typo', () => {
  assert.equal(roundFrom(ANNOUNCEMENT_TITLE), 1); // "(ZAKOŃCZONY) I publiczny przetarg ..."
  assert.equal(roundFrom('II przetarg ustny nieograniczony na sprzedaż nieruchomości'), 2);
  assert.equal(
    roundFrom('II publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 6'),
    2,
  );
  assert.equal(
    roundFrom('III publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2'),
    3,
  );
  assert.equal(roundFrom('Drugi przetarg pisemny nieograniczony na sprzedaż nieruchomości gruntowej'), 2);
  assert.equal(
    roundFrom('l publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4'),
    1,
  );
});

// ---- garage address -------------------------------------------------------------

test('garageAddressFrom: no building number (bare garage court)', () => {
  const addr = garageAddressFrom(GARAGE_TITLE);
  assert.ok(addr);
  assert.equal(addr.address.street, 'Traugutta');
  assert.equal(addr.address.building, '0');
  assert.equal(addr.address.apt, 'garaz-16');
  assert.equal(addr.address.key, 'traugutta|0|garaz-16');
});

// ---- result date ------------------------------------------------------------------

test('resultDateFromText: "W dniu ... odbył się" (modern) and "Termin przetargu:" (2016 era)', () => {
  assert.equal(resultDateFromText(RESULT_NEGATIVE_TEXT), '2026-07-16');
  assert.equal(resultDateFromText(RESULT_POSITIVE_TEXT), '2025-05-22');
  assert.equal(resultDateFromText(RESULT_INLINE_OLD_TEXT), '2016-09-29');
});

// ---- record builders --------------------------------------------------------------

test('buildAnnouncementRecord: Armii Krajowej 61/1, round 1, area/price/date', () => {
  const rec = buildAnnouncementRecord(ANNOUNCEMENT_TITLE, ANNOUNCEMENT_TEXT, 'https://bip.sopot.pl/a,24962,x.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'armii krajowej|61|1');
  assert.equal(rec.area_m2, 65.2);
  assert.equal(rec.starting_price_pln, 900000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-07-16');
  assert.equal(rec.detail_url, 'https://bip.sopot.pl/a,24962,x.html');
});

test('buildResultRecord: NEGATIVE (no wadium paid) — unsold, no final price', () => {
  const rec = buildResultRecord(RESULT_NEGATIVE_TEXT, 'https://bip.sopot.pl/a,24962,x.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'armii krajowej|61|1');
  assert.equal(rec.area_m2, 65.2);
  assert.equal(rec.starting_price_pln, 900000);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'no_wadium');
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.auction_date, '2026-07-16');
  assert.equal(rec.round, 1);
  assert.deepEqual(rec.notes, []);
});

test('buildResultRecord: SOLD (Wybickiego 45/4) — final price + buyer note', () => {
  const rec = buildResultRecord(RESULT_POSITIVE_TEXT, 'https://bip.sopot.pl/a,23848,x.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'uzytkowy');
  // "Gen." is expanded to "Generała" (see STREET_PREFIX_NORMALIZATIONS) so
  // this property keys identically to an announcement that spells the street
  // in full — observed live: id 23848 used "Generała Józefa Wybickiego".
  assert.equal(rec.address.key, 'generala jozefa wybickiego|45|4');
  assert.equal(rec.area_m2, 40.76);
  assert.equal(rec.starting_price_pln, 400000);
  assert.equal(rec.final_price_pln, 404000);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.unsold_reason, null);
  assert.equal(rec.auction_date, '2025-05-22');
  assert.deepEqual(rec.notes, ['nabywca: Pani Katarzyna Jagiełka']);
});

test('buildResultRecord: 2016-era INLINE result (Fiszera 2) — unsold, price still recovered', () => {
  const rec = buildResultRecord(RESULT_INLINE_OLD_TEXT, 'https://bip.sopot.pl/a,17712,x.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'fiszera|2|3');
  assert.equal(rec.starting_price_pln, 1290000);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.auction_date, '2016-09-29');
});

test('parseResultDoc: adapter contract entry point returns a 1-record array', () => {
  const recs = parseResultDoc(RESULT_POSITIVE_TEXT, null, 'https://bip.sopot.pl/a,23848,x.html');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].final_price_pln, 404000);

  const empty = parseResultDoc('', null, 'x');
  assert.deepEqual(empty, []);
});

test('parseResultDoc: fallbackDate used only when the text itself has no date', () => {
  const noDateText = `INFORMACJA O WYNIKU PRZETARGU
na sprzedaż lokalu niemieszkalnego nr 4 w
budynku przy ul. Gen. Józefa Wybickiego 45 w Sopocie,
stanowiącego własność Gminy Miasta Sopotu.
Cena wywoławcza lokalu niemieszkalnego nr 4 wynosiła - 400.000,00 zł.
Cena sprzedaży lokalu niemieszkalnego nr 4 osiągnęła w wyniku przetargu
kwotę - 404.000,00 zł.`;
  const recs = parseResultDoc(noDateText, '2025-05-01', 'x');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2025-05-01');
});
