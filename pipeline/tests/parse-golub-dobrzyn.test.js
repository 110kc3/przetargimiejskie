// Golub-Dobrzyń parser tests — groundtruthed on REAL fetched documents
// (verified live 2026-07). Each fixture is the actual extracted page/PDF text;
// buildRecordText assembles the SAME TITLE+BODY blob the crawler feeds the
// parsers, so these assert the real extraction end-to-end.
//
//   POWIAT (bip.golub-dobrzyn.com.pl, inline HTML):
//     8339 — flat RESULT, PTTK 5 lokal nr 3, round III, SOLD 81 810 zł
//     8173 — flat RESULT, PTTK 5 lokal nr 3, round II,  SOLD 81 810 zł
//     8268 — flat ANNOUNCEMENT (table layout), PTTK 5 lokal nr 3, round III
//     8440 — land RESULT (multi-parcel Kowalewo), round III, UNSOLD
//   MIASTO (bip.golub-dobrzyn.pl, born-digital PDF):
//     działka nr 375 obręb VIII — land RESULT, SOLD 55 570 zł

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as parse from '../src/cities/golub-dobrzyn/parse.js';

const {
  buildRecordText: build,
  parseResultDoc: parseResult,
  parseAnnouncement: parseAnnounce,
  isResultDoc: isResult,
  isRealEstateSale: isSale,
  isLease: lease,
  buyerName: buyer,
} = parse;

// --------------------------------------------------------------------- fixtures

const BODY_8339 =
  'GN.6840.4.2025.Ac Informacja o wyniku trzeciego ustnego nieograniczonego przetargu na sprzedaż nieruchomości stanowiącej własność Powiatu Golubsko-Dobrzyńskiego, położonej w 2 obrębie miasta Golubia-Dobrzynia, przy ulicy PTTK 5, lokal mieszkalny nr 3. Zarząd Powiatu Golubsko-Dobrzyńskiego działając na podstawie § 12 ust. 1 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) podaje do publicznej wiadomości informację o wyniku pierwszego ustnego przetargu: 1. Trzeci przetarg ustny nieograniczony odbył się dnia 30 kwietnia 2026 r. o godz. 10-tej w siedzibie Starostwa Powiatowego w Golubiu-Dobrzyniu, Plac Tysiąclecia 25, pokój nr S5 (Biuro Rady Powiatu). 2. Przedmiotem przetargu był lokal mieszkalny nr 3 położony na parterze budynku mieszkalnego wielorodzinnego położonego przy ulicy PTTK 5, lokal o powierzchni użytkowej 31,91m² składający się z 2 pokoi, kuchni, natrysku, wc, przedpokoju i piwnicy o pow. 5,11m². Lokal posiada instalacje elektryczną, c.o. z kotłowni miałowej w sąsiednim budynku, wod-kan. Udział w częściach wspólnych budynku i gruntu wynosi 3702/101331 do nieruchomości oznaczonej nr geod. 82/1, o pow. 0,2608ha dla której Sąd Rejonowy w Golubiu-Dobrzyniu IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą nr TO1G/00008376/0. 3. Do przetargu dopuszczono: 1 osoby (wpłacone wadium). Do przetargu nie dopuszczono: 0 osób. 4. Cena wywoławcza nieruchomości: 81.000,00zł (netto). Najwyższa cena osiągnięta w przetargu: 81.810,00zł. 5. Nabywcą nieruchomości został/ła – Andrzej Jankowski. Starosta Golubsko-Dobrzyński mgr Jacek Foksiński Informacje podano do publicznej wiadomości na okres 7 dni od dnia 8 maja 2026 r. Sporządziła: A. Chmielewska';
const TITLE_8339 =
  'Informacja o wyniku trzeciego ustnego nieograniczonego przetargu na sprzedaż nieruchomości stanowiącej własność Powiatu Golubsko-Dobrzyńskiego';

const BODY_8173 =
  'Informacja o wyniku drugiego ustnego nieograniczonego przetargu na sprzedaż nieruchomości stanowiącej własność Powiatu Golubsko-Dobrzyńskiego, położonej w 2 obrębie miasta Golubia-Dobrzynia, przy ulicy PTTK 5, lokal mieszkalny nr 3. Zarząd Powiatu Golubsko-Dobrzyńskiego działając na podstawie § 12 ust. 1 Rozporządzenia Rady Ministrów podaje do publicznej wiadomości informację o wyniku pierwszego ustnego przetargu: 1. Drugi przetarg ustny nieograniczony odbył się dnia 15 stycznia 2026 r. o godz. 12-tej w siedzibie Starostwa Powiatowego w Golubiu-Dobrzyniu, Plac Tysiąclecia 25, pokój nr S5 (Biuro Rady Powiatu). 2. Przedmiotem przetargu był lokal mieszkalny nr 3 położony na parterze budynku mieszkalnego wielorodzinnego położonego przy ulicy PTTK 5, lokal o powierzchni użytkowej 31,91m² składający się z 2 pokoi. 3. Do przetargu dopuszczono: 3 osoby (wpłacone wadium). Do przetargu nie dopuszczono: 0 osób. 4. Cena wywoławcza nieruchomości: 81.000,00zł (netto). Najwyższa cena osiągnięta w przetargu: 81.810,00zł. 5. Nabywcą nieruchomości został/ła – Hanna Piotrowska-Werner. Starosta Golubsko-Dobrzyński mgr Jacek Foksiński';
const TITLE_8173 =
  'Informacja o wyniku drugiego ustnego nieograniczonego przetargu na sprzedaż nieruchomości stanowiącej własność Powiatu Golubsko-Dobrzyńskiego';

const BODY_8268 =
  'Zarząd Powiatu Golubsko-Dobrzyńskiego ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3 znajdującego się w budynku przy ulicy PTTK 5 w Golubiu-Dobrzyniu Lp Oznaczenie nieruch. wg księgi wieczystej oraz katastru nieruch. Pow. nieruch Opis nieruchomości Przeznaczenie nieruchomości i sposób jej zagospodarowania Cena wywoławcza netto Wadium 1 2 3 4 5 6 7 1 TO1G/00008376/0 Sąd Rejonowy w Golubiu-Dobrzyniu, obręb 2 miasta Golub-Dobrzyń, ul. PTTK 5 nr działki 82/1 o pow. 0,2608ha - 31,91m² -5,11m² piwnica -3702/101331 udział w częściach wspólnych budynku i gruntu Lokal mieszkalny nr 3 znajdujący się na parterze budynku mieszkalnego, wielolokalowego. W skład lokalu wchodzą: 2 pokoje, kuchnia, w.c., natrysk przedpokój, piwnica. Lokal do remontu. 8 MN – tereny zabudowy jednorodzinnej Częściowo 1 KD – ulica główna. 81.000,00 zł 8.100,00 zł 1. Służebności i obciążenia: brak. 2. Na podstawie art. 43 ust. 1 pkt. 10 ustawy o podatku od towarów i usług sprzedaż nieruchomości lokalowej zwolniona jest z podatku VAT. 3. Przetarg odbędzie się dnia 30 kwietnia 2026 r. o godzinie 10-tej w pokoju nr S5 – (Biuro Rady Powiatu) parter Starostwa Powiatowego w Golubiu-Dobrzyniu przy ulicy Plac Tysiąclecia 25. 4. Warunkiem przystąpienia do przetargu jest wpłacenie wadium najpóźniej do dnia 24.04.2026 r.';
const TITLE_8268 =
  'Trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3 znajdującego się w budynku przy ulicy PTTK 5 w Golubiu-Dobrzyniu';

const BODY_8440 =
  'GN.6840.4.2024.Ac Informacja o wyniku trzeciego ustnego nieograniczonego przetargu na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 3 miasta Kowalewo Pomorskie stanowiących własność Powiatu Golubsko-Dobrzyńskiego Zarząd Powiatu Golubsko-Dobrzyńskiego działając na podstawie § 12 ust. 1 Rozporządzenia Rady Ministrów podaje do publicznej wiadomości informację o wyniku ustnego przetargu: 1. Trzeci przetarg ustny nieograniczony odbył się dnia 25 czerwca 2026 r. o godz. 10-tej w siedzibie Starostwa Powiatowego w Golubiu-Dobrzyniu, Plac Tysiąclecia 25, parter, pokój nr S5 (Biuro Rady Powiatu). 2. Do przetargu dopuszczono : 0 osób. Do przetargu nie dopuszczono: 0 osób. 3. Nabywcą nieruchomości został – ------------------------- Lp. Przedmiot przetargu Pow. nieruch Przeznaczenie nieruchomości i sposób jej zagospodarowania Cena wywoławcza Najwyższa cena osiągnięta w przetargu 1 2 3 5 6 7 1 TO1G/00028346/7 działki położone w obrębie 3 miasta Kowalewo Pomorskie, oznaczone nr geod. 17/9 wraz z udziałem do 1/6 części działki oznaczonej nr geod. 17/15 o pow. 0,1142 ha 0,1963 ha 1MN 108.000,00 zł 0,00 zł';
const TITLE_8440 =
  'Informacja o wyniku trzeciego ustnego nieograniczonego przetargu na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 3 miasta Kowalewo Pomorskie';

// Miasto born-digital PDF (soft hyphens already normalised, exactly as pdfText
// hands it after crawl.js's soft-hyphen strip).
const BODY_MIASTO_375 =
  'Golub-Dobrzyń, 2025-09-19 INFORMACJA O WYNIKU PRZETARGU USTNEGO OGRANICZONEGO NA SPRZEDAŻ DZIAŁKI OZNACZONEJ NR GEOD. 375 OBRĘB VIII, KW NR TO1G/00020569/0 Na podstawie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz.U. 2021, poz. 2213) uprzejmie informuję, że przetarg ustny ograniczony na sprzedaż działki ozn. nr 375 o powierzchni 835 m2, obręb VIII, KW nr TO1G/00020569/0, będącej własnością Gminy Miasto Golub-Dobrzyń, odbył się w dniu 10 września 2025 r. w siedzibie Urzędu Miasta Golubia-Dobrzynia przy ul. Plac 1000-lecia 25, o godzinie 10.00. W wyniku przeprowadzonego przetargu nabywcą została: 1) Hurtownia Olejów i Paliw Gabriel Kropkowski Cena wywoławcza nieruchomości wynosiła 18.400,00 zł netto Najwyższa cena osiągnięta w przetargu wyniosła 55.570,00 zł netto Liczba uczestników dopuszczonych do uczestnictwa w przetargu — 2';
const TITLE_MIASTO_375 = 'informacja o wynikach przetargu';

const SRC = 'https://www.bip.golub-dobrzyn.com.pl/redir,8339';

// --------------------------------------------------------------------- tests

test('POWIAT flat result 8339 — PTTK 5 lokal nr 3, round III, SOLD 81 810 zł', () => {
  const blob = build({ title: TITLE_8339, body: BODY_8339 });
  const recs = parseResult(blob, '2026-05-08', SRC);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'PTTK 5/3');
  assert.equal(r.address.key, 'pttk|5|3');
  assert.equal(r.address.building, '5');
  assert.equal(r.address.apt, '3');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-04-30');
  assert.equal(r.starting_price_pln, 81000);
  assert.equal(r.final_price_pln, 81810);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.area_m2, 31.91);
  assert.equal(r.source_url, SRC);
});

test('POWIAT flat result 8173 — PTTK 5 lokal nr 3, round II, SOLD 81 810 zł', () => {
  const blob = build({ title: TITLE_8173, body: BODY_8173 });
  const recs = parseResult(blob, '2026-01-23', SRC);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'PTTK 5/3');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-01-15');
  assert.equal(r.starting_price_pln, 81000);
  assert.equal(r.final_price_pln, 81810);
  assert.equal(r.outcome, 'sold');
});

test('POWIAT flat announcement 8268 — PTTK 5 lokal nr 3, round III, table price', () => {
  const blob = build({ title: TITLE_8268, body: BODY_8268 });
  const recs = parseAnnounce(blob);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'PTTK 5/3');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-04-30');
  assert.equal(r.starting_price_pln, 81000);
  // Announcement table has no "powierzchni użytkowej" label → area not extracted.
  assert.equal(r.area_m2, null);
});

test('POWIAT land result 8440 — multi-parcel Kowalewo, round III, UNSOLD (dash buyer)', () => {
  const blob = build({ title: TITLE_8440, body: BODY_8440 });
  const recs = parseResult(blob, '2026-07-01', SRC);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-06-25');
  assert.ok(r.dzialka_nr.includes('17/9'), `dzialka_nr should include 17/9, got ${r.dzialka_nr}`);
  // The table's "108.000,00 zł" / "0,00 zł" columns must NOT become a price.
  assert.equal(r.address_raw, null);
});

test('MIASTO land result — działka nr 375 obręb VIII, SOLD 55 570 zł (born-digital PDF)', () => {
  const blob = build({ title: TITLE_MIASTO_375, body: BODY_MIASTO_375 });
  const recs = parseResult(blob, '2025-09-19', 'https://bip.golub-dobrzyn.pl/plik,9884,informacja-o-wynikach-przetargu-pdf.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 18400);
  assert.equal(r.final_price_pln, 55570);
  assert.equal(r.auction_date, '2025-09-10');
  assert.ok(r.dzialka_nr.includes('375'), `dzialka_nr should include 375, got ${r.dzialka_nr}`);
  assert.equal(r.area_m2, 835);
});

test('doc-type gates route announcement vs result vs movable/lease correctly', () => {
  const resultBlob = build({ title: TITLE_8339, body: BODY_8339 });
  const announceBlob = build({ title: TITLE_8268, body: BODY_8268 });
  assert.equal(isResult(resultBlob), true);
  assert.equal(isResult(announceBlob), false);
  assert.equal(isSale(announceBlob), true);

  // Movable property (a car / equipment) is NOT a real-estate sale.
  const movable = build({
    title: 'Ogłoszenie o II pisemnym przetargu na sprzedaż składnika rzeczowego majątku ruchomego',
    body: 'Zarząd Powiatu ogłasza przetarg pisemny na sprzedaż składnika rzeczowego majątku ruchomego - samochodu.',
  });
  assert.equal(isSale(movable), false);

  // A lease (dzierżawa) is gated out.
  const leaseBlob = build({
    title: 'Pierwszy pisemny przetarg nieograniczony na oddanie w dzierżawę nieruchomości Skarbu Państwa',
    body: 'przetarg pisemny nieograniczony na oddanie w dzierżawę nieruchomości Skarbu Państwa - jezioro.',
  });
  assert.equal(lease(leaseBlob), true);
  assert.deepEqual(parseResult(leaseBlob, null, SRC), []);
});

test('buyerName: named ⇒ sold, dash placeholder ⇒ unsold', () => {
  assert.ok(buyer(build({ title: '', body: BODY_8339 })));            // Andrzej Jankowski
  assert.ok(buyer(build({ title: '', body: BODY_MIASTO_375 })));      // Hurtownia ...
  assert.equal(buyer(build({ title: '', body: BODY_8440 })), null);   // dashes
});

test('parsePLN / parseNum units', () => {
  assert.equal(parse.parsePLN('81.000,00'), 81000);
  assert.equal(parse.parsePLN('55.570,00'), 55570);
  assert.equal(parse.parsePLN('1 500 000,00'), 1500000);
  assert.equal(parse.parsePLN('0,00'), null);
  assert.equal(parse.parseNum('31,91'), 31.91);
  assert.equal(parse.parseNum('835'), 835);
});
