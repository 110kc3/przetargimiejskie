// Katowice result-PDF parser tests. The neg-wykaz fixture reproduces the
// pdftotext -layout output of a real committed cache file
// (pdf-text-cache/Wyniki_2019.05.2026_…neg.pdf.*.txt): negative rows carry
// "Przetarg zakończony wynikiem negatywnym" in the buyer column and "------"
// in the achieved-price column. Regression: these rows were published as
// outcome:'sold' with final_price_pln:null.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseAnnouncement, parseAnnouncements, parseLandAnnouncement, parseResultDoc, parseResultPdf } from '../src/cities/katowice/parse.js';

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

// Announcement area SELECTION (CI sanity-gate catch, June 2026): lokal
// announcements state the PARCEL first ("nieruchomości gruntowej … o
// powierzchni 800 m²"), so the old first-match grab published 800 m² "flats"
// at 225 zł/m². The flat's own area must win; whole-property announcements
// route their total to land_area_m2.
test('announcement: parcel area is skipped, the lokal area wins', () => {
  const html = `<p>Sprzedaż lokalu mieszkalnego nr 57 położonego w budynku przy
    ul. Oswobodzenia 38C, usytuowanego na nieruchomości gruntowej oznaczonej
    jako działka nr 12/3 o powierzchni 800 m². Lokal mieszkalny o powierzchni
    38,40 m² składa się z pokoju i kuchni. Cena wywoławcza: 180 000 zł.
    Przetarg odbędzie się w dniu 10.07.2026 r.</p>`;
  const a = parseAnnouncement(html, 'Pierwszy przetarg … lokalu mieszkalnego przy ul. Oswobodzenia 38C/57', 'doc://x');
  assert.ok(a);
  assert.equal(a.area_m2, 38.4, 'flat area, not the 800 m² parcel');
  assert.equal(a.land_area_m2 ?? null, null);
});

test('announcement: whole-property total → land_area_m2, never area_m2', () => {
  const html = `<p>Sprzedaż nieruchomości zabudowanej budynkiem mieszkalnym przy
    ul. Górnej 4 o powierzchni 1049,48 m². Cena wywoławcza: 2 000 000 zł.</p>`;
  const a = parseAnnouncement(html, 'Pierwszy przetarg … nieruchomości zabudowanej przy ul. Górnej 4', 'doc://y');
  assert.ok(a);
  assert.equal(a.area_m2, null);
  assert.equal(a.land_area_m2, 1049.48);
});

// ------------------------------------------------------------------ land

// Live fixture modelled on bip.katowice.eu idr=152394:
//   title: "Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
//           … przy ul. Solskiego (dz. 1241/36)"
//   body:  "działka nr 1241/36, z karty mapy 19, obręb Górne Lasy Pszczyńskie …
//           o pow. 1772 m2 … Cena wywoławcza … 880 000 zł …
//           Przetarg odbędzie się w dniu 15.09.2026 …"
const LAND_HTML = `<p>Prezydent Miasta Katowice ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej o
pow. 1772 m2, położonej przy ul. Solskiego, oznaczonej jako działka nr
1241/36, z karty mapy 19, obręb Górne Lasy Pszczyńskie, stanowiącej
własność Miasta Katowice.</p>
<p>Cena wywoławcza nieruchomości wynosi&#58;&#160; 880 000 zł</p>
<p>Wadium może być wnoszone w pieniądzu do dnia 07.09.2026 r.
Przetarg odbędzie się w dniu 15.09.2026 o godz. 09&#58;40 w sali nr 4-5
w siedzibie Urzędu Miasta Katowice, ul. Młyńska 4.</p>`;

const LAND_TITLE =
  'Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej położonej w Katowicach przy ul. Solskiego (dz. 1241/36)';

test('parseLandAnnouncement: extracts dzialka_nr, obreb, area, price, date', () => {
  const r = parseLandAnnouncement(
    LAND_HTML,
    LAND_TITLE,
    'https://bip.katowice.eu/ogloszenia/tablicaogloszen/dokument.aspx?idr=152394&menu=679',
  );
  assert.ok(r, 'expected non-null land record');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1241/36', 'parcel number');
  assert.ok(
    r.obreb && /G[oó]rne\s+Lasy/i.test(r.obreb),
    `obreb should contain "Górne Lasy", got: ${r.obreb}`,
  );
  assert.equal(r.area_m2, 1772, 'plot area in m²');
  assert.equal(r.starting_price_pln, 880000, 'starting price');
  assert.equal(r.auction_date, '2026-09-15', 'auction date');
  assert.equal(r.round, 1, 'first auction → round 1');
  // Land parcels have no building number
  assert.equal(r.building, null);
  assert.equal(r.address, null);
  assert.ok(r.street, 'street extracted from title');
});

test('parseLandAnnouncement: multi-parcel body, obreb present', () => {
  const html = `<p>przetarg ustny nieograniczony na sprzedaz nieruchomosci gruntowej o
pow. 80 702 m2, polozone] przy ul. Magazynowej, oznaczonej jako dzialki
nr 811/69 i 813/69, z karty mapy 1, obreb Rozdzien, stanowiacej wlasnosc
Miasta Katowice.</p>
<p>Cena wywolawcza nieruchomosci wynosi&#58; 20 000 000 zl</p>
<p>Przetarg odbedzie sie w dniu 16.06.2026 r. o godz. 09&#58;00</p>`;
  const title = 'Przetarg ustny nieograniczony na sprzedaz nieruchomosci gruntowej przy ul. Magazynowej (dz.811/69 i 813/69)';
  const r = parseLandAnnouncement(
    html,
    title,
    'https://bip.katowice.eu/ogloszenia/tablicaogloszen/dokument.aspx?idr=151403&menu=679',
  );
  assert.ok(r, 'expected non-null land record');
  assert.equal(r.kind, 'grunt');
  assert.ok(r.dzialka_nr, 'parcel number present');
  assert.match(r.dzialka_nr, /811\/69/, 'first parcel number captured');
  assert.equal(r.area_m2, 80702);
  assert.equal(r.starting_price_pln, 20000000);
  assert.equal(r.auction_date, '2026-06-16');
});

// -------------------------------------------------------- multi-unit announcement

const MULTI_TITLE =
  'Przetargi ustne nieograniczone na sprzedaż 4 lokali mieszkalnych (ul. Rybnicka 8/8, ul. Broniewskiego 1b/13, ul. Sokolska 52/12 i ul. Grażyńskiego 42/4)';

const MULTI_HTML = `<p>PREZYDENT MIASTA KATOWICE ogłasza przetargi ustne nieograniczone na sprzedaż:</p>
<p>1. lokalu mieszkalnego nr 8 o pow. 28,52 m2, usytuowanego w Katowicach przy
ul. Rybnickiej 8 wraz ze sprzedażą ułamkowej części gruntu w wysokości 0,0484
cz. oznaczonego jako nr 160/1 o pow. 222 m2, karta mapy 58, obręb Bogucice -
Zawodzie, stanowiącej współwłasność Miasta Katowice i innych osób.</p>
<p>Cena wywoławcza wynosi:&#160;<b>380 000,00 zł</b><br>Wysokość wadium wynosi:&#160;<b>38 000,00 zł</b></p>
<p>2. lokalu mieszkalnego nr 13 o pow. 21,35 m2, usytuowanego w Katowicach przy
ul. Broniewskiego 1b wraz ze sprzedażą ułamkowej części gruntu w wysokości
0,0099 cz. oznaczonego jako działki nr 110/21 i 127/1 o łącznej pow. 349 m2,
karta mapy 24, obręb Bogucice - Zawodzie, stanowiącej współwłasność Miasta
Katowice i innych osób.</p>
<p>Cena wywoławcza wynosi:&#160;<b>170 000,00 zł</b><br>Wysokość wadium wynosi:&#160;<b>17 000,00 zł</b></p>
<p>3. lokalu mieszkalnego nr 12 o pow. 52,41 m2, usytuowanego w Katowicach przy
ul. Sokolskiej 52 wraz ze sprzedażą ułamkowej części gruntu w wysokości 0,0935
cz. oznaczonego jako działka nr 25/5 o pow. 194 m2, karta mapy 24, obręb
Bogucice - Zawodzie.</p>
<p>Cena wywoławcza wynosi:&#160;<b>330 000,00 zł</b><br>Wysokość wadium wynosi:&#160;<b>33 000,00 zł</b></p>
<p>4. lokalu mieszkalnego nr 4 o pow. 48,00 m2, usytuowanego w Katowicach przy
ul. Grażyńskiego 42 wraz ze sprzedażą ułamkowej części gruntu w wysokości
0,0100 cz. oznaczonego jako działki nr 25/35, 59/8 i 60/1 o łącznej pow. 174
m2, karta mapy 24, obręb Bogucice - Zawodzie.</p>
<p>Cena wywoławcza wynosi:&#160;<b>320 000,00 zł</b><br>Wysokość wadium wynosi:&#160;<b>32 000,00 zł</b></p>
<p>Sprzedaż lokali następuje za cenę uzyskaną w wyniku przetargów.</p>
<p>Wadium może być wnoszone w pieniądzu <b>do dnia 06.07.2026 r.</b></p>
<p>Przetargi odbędą się <b>w dniu 14.07.2026 r.</b></p>
<p>1. na sprzedaż nieruchomości z poz. 1 <b>o godz. 09:20</b></p>
<p>2. na sprzedaż nieruchomości z poz. 2 <b>o godz. 09:40</b></p>
<p>3. na sprzedaż nieruchomości z poz. 3 <b>o godz. 10:00</b></p>
<p>4. na sprzedaż nieruchomości z poz. 4 <b>o godz. 10:20</b></p>
<p>Oglądanie lokali będzie możliwe w dniach od 11.06.2026 r. do 06.07.2026 r.</p>`;

test('multi-unit announcement (idr=152360): emits one listing per flat', () => {
  const recs = parseAnnouncements(
    MULTI_HTML,
    MULTI_TITLE,
    'https://bip.katowice.eu/ogloszenia/tablicaogloszen/dokument.aspx?idr=152360&menu=679',
  );
  assert.equal(recs.length, 4, 'four flats → four listings');
  const expected = [
    { key: 'rybnicka|8|8', area: 28.52, price: 380000 },
    { key: 'broniewskiego|1B|13', area: 21.35, price: 170000 },
    { key: 'sokolska|52|12', area: 52.41, price: 330000 },
    { key: 'grazynskiego|42|4', area: 48, price: 320000 },
  ];
  expected.forEach((e, i) => {
    assert.equal(recs[i].address.key, e.key, `unit ${i + 1} address key`);
    assert.equal(recs[i].area_m2, e.area, `unit ${i + 1} flat area (not the parcel)`);
    assert.equal(recs[i].land_area_m2 ?? null, null, `unit ${i + 1} has no land_area_m2`);
    assert.equal(recs[i].starting_price_pln, e.price, `unit ${i + 1} starting price`);
    assert.equal(recs[i].kind, 'mieszkalny', `unit ${i + 1} kind`);
    assert.equal(recs[i].auction_date, '2026-07-14', `unit ${i + 1} auction date`);
    assert.equal(recs[i].wadium_deadline, '2026-07-06', `unit ${i + 1} wadium deadline`);
    assert.equal(recs[i].viewing_date, '2026-07-06', `unit ${i + 1} viewing date`);
  });
});

test('single-unit announcement still yields exactly one listing', () => {
  const html = `<p>Sprzedaż lokalu mieszkalnego nr 57 położonego w budynku przy
    ul. Oswobodzenia 38C, usytuowanego na nieruchomości gruntowej oznaczonej
    jako działka nr 12/3 o powierzchni 800 m². Lokal mieszkalny o powierzchni
    38,40 m² składa się z pokoju i kuchni. Cena wywoławcza: 180 000 zł.
    Przetarg odbędzie się w dniu 10.07.2026 r.</p>`;
  const recs = parseAnnouncements(
    html,
    'Pierwszy przetarg … lokalu mieszkalnego przy ul. Oswobodzenia 38C/57',
    'doc://single',
  );
  assert.equal(recs.length, 1, 'single-unit → one listing');
  assert.equal(recs[0].area_m2, 38.4, 'flat area, not the 800 m² parcel');
  assert.equal(recs[0].land_area_m2 ?? null, null);
  assert.equal(recs[0].starting_price_pln, 180000);
  assert.equal(recs[0].address.key, 'oswobodzenia|38C|57');
});

// Auction-date regex regression (June 2026): the multi-unit change rewrote the
// shared auction-date pattern from `odb[ęe]dzie\s+si[ęe]` to
// `odb[ęe]d[ąa]?\s*si[ęe]` to catch the plural "Przetargi odbędą się". But the
// optional single `[ąa]` cannot span the "zie" in the SINGULAR "odbędzie się"
// that every single-property announcement uses (verified live on
// bip.katowice.eu idr=152394: "Przetarg odbędzie się w dniu 15.09.2026 …"), so
// auction_date silently dropped to null for ~30 active listings. The fixed
// alternation `odb[ęe]d(?:zie|[ąa])\s*si[ęe]` matches BOTH forms. This guards
// the singular path; the multi-unit test above guards the plural one.
test('single-unit announcement extracts auction_date from singular "odbędzie się"', () => {
  // Body wording lifted verbatim from bip.katowice.eu idr=152394.
  const flatHtml = `<p>Sprzedaż lokalu mieszkalnego nr 5 przy ul. Solskiego 10
    o pow. użytkowej 42,10 m². Cena wywoławcza: 250 000 zł.
    Wadium może być wnoszone w pieniądzu do dnia 07.09.2026 r.
    Przetarg odbędzie się w dniu 15.09.2026 o godz. 09:40 w sali nr 4-5
    w siedzibie Urzędu Miasta Katowice, ul. Młyńska 4.</p>`;
  const flat = parseAnnouncement(
    flatHtml,
    'Pierwszy przetarg … lokalu mieszkalnego przy ul. Solskiego 10/5',
    'doc://singular-flat',
  );
  assert.ok(flat, 'expected a listing');
  assert.equal(flat.auction_date, '2026-09-15', 'singular "odbędzie się" must set auction_date');
  assert.equal(flat.wadium_deadline, '2026-09-07');
  assert.equal(flat.area_m2, 42.1, 'flat usable area');

  // A single-unit zabudowana with the same singular wording: the date must
  // resolve AND the plot total must route to land_area_m2, not area_m2.
  const zabHtml = `<p>Sprzedaż nieruchomości zabudowanej budynkiem mieszkalnym
    przy ul. Górnej 4 o powierzchni 1049,48 m². Cena wywoławcza: 2 000 000 zł.
    Przetarg odbędzie się w dniu 12.08.2026 o godz. 10:00.</p>`;
  const zab = parseAnnouncement(
    zabHtml,
    'Pierwszy przetarg … nieruchomości zabudowanej przy ul. Górnej 4',
    'doc://singular-zab',
  );
  assert.ok(zab, 'expected a listing');
  assert.equal(zab.auction_date, '2026-08-12', 'singular form on a zabudowana announcement');
  assert.equal(zab.area_m2, null, 'plot total is not a flat area');
  assert.equal(zab.land_area_m2, 1049.48, 'whole-property total → land_area_m2 (by design)');
});
