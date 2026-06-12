// Katowice result-PDF parser tests. The neg-wykaz fixture reproduces the
// pdftotext -layout output of a real committed cache file
// (pdf-text-cache/Wyniki_2019.05.2026_…neg.pdf.*.txt): negative rows carry
// "Przetarg zakończony wynikiem negatywnym" in the buyer column and "------"
// in the achieved-price column. Regression: these rows were published as
// outcome:'sold' with final_price_pln:null.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseResultDoc, parseResultPdf } from '../src/cities/katowice/parse.js';

const NEG_PDF = `                                     WYKAZ Z DNIA 27.05.2026 r. DOTYCZĄCY WYNIKÓW PRZETARGÓW NA SPRZEDAŻ NIERUCHOMOŚCI

                                                                                                                      Cena       Ilość osób (ofert) dopuszczonych/
                          Miejsce                                                                        Cena       osiągnięta    niedopuszczonych do przetargu      Imię i Nazwisko (nazwa firmy)
Lp.   Data przetargu                   Rodzaj przetargu              Oznaczenie nieruchomości
                         Przetargu                                                                     wywoławcza   w wyniku                          Niedop.                nowonabywcy
                                                                                                                    przetargu         Dop.
                                                          ul. Skłodowskiej-Curie 21/1
                                                          lokal mieszkalny o pow. użytkowej 64,21 m2
                       Urząd Miasta
                         Katowice          ustny                                                                                                                         Przetarg zakończony
1      19.05.2026                                         dz. nr 127/13 o pow. 673 m2,                 850 000 zł     ------            1                 0
                       ul. Młyńska 4   nieograniczony     km. 28,
                                                                                                                                                                        wynikiem negatywnym
                           s. 4-5                         obręb: Śródmieście – Załęże
                                                          wł. Miasto Katowice i inne osoby
                                                          ul. Staromiejska 15/8
                                                          lokal mieszkalny o pow. użytkowej 27,28 m2
                       Urząd Miasta
                         Katowice          ustny                                                                                                                         Przetarg zakończony
2      19.05.2026                                         dz. nr 139/2 o pow. 347 m2,                  160 000 zł     ------            2                 0
                                                                                                                                                                        wynikiem negatywnym
                       ul. Młyńska 4   nieograniczony     k.m. 40,
                           s. 4-5                         obręb: Bogucice - Zawodzie
                                                          wł. Miasto Katowice i inne osoby
`;

const POS_PDF = `                                     WYKAZ Z DNIA 20.02.2026 r. DOTYCZĄCY WYNIKÓW PRZETARGÓW NA SPRZEDAŻ NIERUCHOMOŚCI

                                                          ul. Grzyśki 1/7
                                                          lokal mieszkalny o pow. użytkowej 48,30 m2
                       Urząd Miasta
                         Katowice          ustny
1      17.02.2026                                         dz. nr 12/3 o pow. 410 m2,                   280 000 zł    286 000 zł         3                 0              Jan Kowalski
                       ul. Młyńska 4   nieograniczony     km. 11, obręb Ligota
`;

test('negative wykaz rows → outcome unsold, final price null', () => {
  const recs = parseResultDoc(NEG_PDF, null, 'https://example/neg.pdf');
  assert.equal(recs.length, 2);
  for (const r of recs) {
    assert.equal(r.outcome, 'unsold');
    assert.equal(r.unsold_reason, 'unknown');
    assert.equal(r.final_price_pln, null);
    assert.equal(r.auction_date, '2026-05-19');
    assert.equal(r.kind, 'mieszkalny');
  }
  assert.equal(recs[0].address.key, 'sklodowskiej curie|21|1');
  assert.equal(recs[0].starting_price_pln, 850000);
  assert.equal(recs[1].address.key, 'staromiejska|15|8');
  assert.equal(recs[1].starting_price_pln, 160000);
});

test('prices with grosze and dotted thousands parse (June 2026 fix)', () => {
  // The row regex used to accept only "850 000 zł" — a row priced
  // "150 000,00 zł" parsed BOTH prices to null.
  const pdf = `                                     WYKAZ Z DNIA 10.03.2026 r. DOTYCZĄCY WYNIKÓW PRZETARGÓW NA SPRZEDAŻ NIERUCHOMOŚCI

                                                          ul. Polna 5/3
                                                          lokal mieszkalny o pow. użytkowej 41,20 m2
                       Urząd Miasta
                         Katowice          ustny
1      03.03.2026                                         dz. nr 7/1 o pow. 300 m2,                150 000,00 zł    152.000,00 zł       2                 0              Anna Nowak
                       ul. Młyńska 4   nieograniczony     km. 9, obręb Śródmieście
`;
  const recs = parseResultPdf(pdf, null, 'https://example/grosze.pdf');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].starting_price_pln, 150000);
  assert.equal(recs[0].final_price_pln, 152000);
  assert.equal(recs[0].outcome, 'sold');
});

test('positive wykaz row still parses as sold with both prices', () => {
  const recs = parseResultPdf(POS_PDF, null, 'https://example/pos.pdf');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'sold');
  assert.equal(recs[0].unsold_reason, null);
  assert.equal(recs[0].address.key, 'grzyski|1|7');
  assert.equal(recs[0].starting_price_pln, 280000);
  assert.equal(recs[0].final_price_pln, 286000);
});

// Yearly-summary table: the linearised columns can interleave the auction-type
// cell into a street capture ("ul. Oddziałów Młodzieży  II ustny … 86 000 zł"
// → street "Oddziałów Młodzieży II ustny…" with the price's leading digits as
// the building). pickAddress now applies the same column-bleed vocabulary
// filter as parseResultRow: such a candidate is junk, the row is dropped
// rather than emitted under a garbage key. Clean rows still parse.
const YEARLY_BLEED_PDF = `Wykaz nieruchomości sprzedanych w roku 2025

1   07.04.2025r.  lokal mieszkalny  ul. Oddziałów Młodzieży   II ustny nieograniczony   86 000,00 zł   95 000,00 zł
2   12.05.2025r.  lokal mieszkalny  ul. Gliwicka 12/3   28,5 m2   100 000,00 zł   120 000,00 zł
`;

test('yearly summary: column-bleed street ("… II ustny …") is rejected, clean row still parses', () => {
  const recs = parseResultDoc(YEARLY_BLEED_PDF, null, 'sample://yearly-bleed');
  assert.ok(
    !recs.some((r) => /ustny|przetarg/i.test(r.address_raw || '')),
    'no record may carry auction-type words in its address',
  );
  const ok = recs.find((r) => r.address_raw === 'Gliwicka 12/3');
  assert.ok(ok, 'clean Gliwicka 12/3 row missing');
  assert.equal(ok.outcome, 'sold');
  assert.equal(ok.starting_price_pln, 100000);
  assert.equal(ok.final_price_pln, 120000);
});

// Result-table row where the start-price cell has no own "zł" and the area
// uses the terse "o pow. X m2" (the Widok 37/3 case, "Wyniki 03.02.2026
// pozytywne.pdf"): whitespace collapse glues "180 000      221 400 zł" into
// one 180-billion token. splitGluedAmounts must yield start + achieved, and
// the lokal-anchored area fallback must catch 26,26 m² while the parcel's
// "o łącznej pow. 68 194 m2" stays excluded.
const GLUED_PRICE_PDF = `WYKAZ Z DNIA 05.02.2026 r. DOTYCZĄCY WYNIKÓW PRZETARGÓW NA SPRZEDAŻ NIERUCHOMOŚCI

                                                      ul. Widok 37/3
                   Urząd Miasta                       lokal mieszkalny o pow. 26,26 m2
                     Katowice           ustny         dz. nr 18/16 i 177/10
3     03.02.2026                                                                                         180 000      221 400 zł          7                 0                     Jan Nowak
                   ul. Młyńska 4   nieograniczony     o łącznej pow. 12 570 m2,
`;

test('glued start+achieved prices are split; terse "o pow." area parsed (Widok 37/3)', () => {
  const recs = parseResultPdf(GLUED_PRICE_PDF, null, 'sample://glued');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address_raw, 'Widok 37/3');
  assert.equal(r.starting_price_pln, 180000);
  assert.equal(r.final_price_pln, 221400);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.area_m2, 26.26, 'flat area, not the 12 570 m² parcel');
});

// Whole-property rows (no lokal): the area is the PLOT/building total — it
// must land in land_area_m2, never area_m2 (zł/m² from a 1080 m² plot next
// to flat rows was apples-to-oranges). The bare-column area form ("1080,73"
// with no m2 unit) parses; spaced-thousands price fragments can't match it.
const YEARLY_ZABUDOWANA_PDF = `Wykaz nieruchomości sprzedanych w roku 2023

32   20.03.2023r.  I ustny  lokal mieszkalny  ul. Wita Stwosza 1/11   144,07   430 000,00 zł   490 200,00 zł
33   26.06.2023r.  I ustny  nieruchomość zabudowana  ul. Stanisława 7   1080,73   2 500 000,00 zł   4 000 000,00 zł
`;

test('yearly summary: zabudowana row area → land_area_m2, lokal row → area_m2', () => {
  const recs = parseResultDoc(YEARLY_ZABUDOWANA_PDF, null, 'sample://zabudowana');
  const flat = recs.find((r) => r.address_raw === 'Wita Stwosza 1/11');
  assert.ok(flat, 'lokal row missing');
  assert.equal(flat.area_m2, 144.07);
  assert.equal(flat.land_area_m2 ?? null, null);
  const bldg = recs.find((r) => r.address_raw.startsWith('Stanisława'));
  assert.ok(bldg, 'zabudowana row missing');
  assert.equal(bldg.area_m2, null, 'plot total must not be a flat area');
  assert.equal(bldg.land_area_m2, 1080.73);
});
