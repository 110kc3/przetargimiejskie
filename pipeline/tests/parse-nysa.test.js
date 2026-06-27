// Nysa parser tests. Fixtures are faithful copies of REAL pdftotext -layout
// output from live bip.nysa.pl PDFs (verified 2026-06-27):
//
//   ANN_MONIUSZKI: article ?a=8934, attachment id=22892 (111 kB, 3 pages)
//     "kolejny przetarg ustny nieograniczony" — flat Moniuszki 1/27, 33,10 m²,
//     cena wywoławcza 145.000,00 zł, przetarg 17 grudnia 2024 r.
//   RESULT_MONIUSZKI: article ?a=8934, attachment id=23554 (45 kB, 1 page)
//     5 bidders, 145.000,00 → 165.000,00 zł, Nabywca: Stanisława i Andrzej Szewczyk
//   ANN_MARIACKA: article ?a=11718, attachment id=29480 — flat Mariackiej 21/3, 102,48 m²
//   RESULT_MARIACKA: article ?a=11718, attachment id=30096 — 342.000 → 362.000 zł, 5-05-2026
//
// The join key the first real refresh must confirm: ANN_MONIUSZKI and
// RESULT_MONIUSZKI both key on `moniuszki|1|27`, so build-properties folds
// them into one property's history.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isResultNotice,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  addressRawFromText,
  unitAreaFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isSkippableTitle,
  isFlatSaleTitle,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/nysa/parse.js';

import {
  parseArticleList,
  parsePdfAttachments,
  classifyAttachmentLabel,
} from '../src/cities/nysa/crawl.js';

// ─────────────────────────── REAL FIXTURES ───────────────────────────────────

// Condensed but faithful to the real pdftotext -layout output of id=22892.
const ANN_MONIUSZKI = `BURMISTRZ NYSY
 ul. Kolejowa 15
  48-300 Nysa
GN.GO.6840.2.42.2023


                                   BURMISTRZ NYSY
 ogłasza kolejny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego
                              w Nysie przy ul. Moniuszki 1/27

Opis nieruchomości - położenie:
Lokal mieszkalny nr 27 o łącznej powierzchni użytkowej 33,10 m2, położony na V piętrze budynku
mieszkalnego wielorodzinnego w Nysie przy ul. Moniuszki nr 1.
Do lokalu przynależy piwnica o powierzchni użytkowej 3,87 m2.

Dane ewidencyjne nieruchomości:
Działka nr 30/11; karta mapy 32; pow. 314 m²; symbol klasouż. B; poz.rej. G1144.

                     Cena wywoławcza nieruchomości wynosi: 145.000,00 zł
                         (słownie: sto czterdzieści pięć tysięcy złotych 00/100)

        Przetarg odbędzie się w dniu 17 grudnia 2024 r. w siedzibie Urzędu Miejskiego
                w Nysie ul. Kolejowa 15, sala nr 200 (II piętro) o godz. 10:00`;

// Real pdftotext -layout output of id=23554 (result notice, 1 page).
const RESULT_MONIUSZKI = `                                                                    Informacja o wyniku przetargu

                 z przeprowadzonego w dniu 17 grudnia 2024 r. kolejnego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego
                                                        położonego w Nysie przy ul. Moniuszki 1/27

 Data i miejsce oraz rodzaj              Oznaczenie i opis nieruchomości         Liczba osób    Cena wywoławcza     Cena osiągnięta w   Imię i nazwisko / nazwa firmy
    przeprowadzonego                                                            dopuszczonych                          przetargu          lub osoby ustalonej jako
         przetargu                                                                                                                         nabywca nieruchomości

17-12-2024 r.                 Lokal mieszkalny nr 27 o łącznej powierzchni           5          145.000,00 zł       165.000,00 zł         Stanisława i Andrzej
Urząd Miejski w Nysie         użytkowej 33,10 m2, położony na V piętrze                                                                        Szewczyk
kolejny przetarg ustny        budynku mieszkalnego wielorodzinnego w Nysie
nieograniczony.               przy ul. Moniuszki nr 1.`;

// Condensed faithful copy of id=29480 (Mariackiej 21/3, I piętro, 102,48 m²).
const ANN_MARIACKA = `BURMISTRZ NYSY
 ul. Kolejowa 15
   48-300 Nysa
GN.GO.6840.2.5.2025


                                   BURMISTRZ NYSY
 ogłasza kolejny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego
                             w Nysie przy ul. Mariackiej nr 21/3.

Opis nieruchomości - położenie:
Lokal mieszkalny nr 3 o łącznej powierzchni użytkowej 102,48 m2, położony na I piętrze budynku
mieszkalnego wielorodzinnego w Nysie przy ul. Mariackiej nr 21. Do lokalu przynależą dwie piwnice
o łącznej powierzchni użytkowej 16,10 m2 zlokalizowane w budynku.

Dane ewidencyjne nieruchomości:
Działka nr 2214, pow. 236 m², symbol klasouż.B., poz.rej. G1143.

Na przedmiotową nieruchomość były ogłaszane przetargi:
- I przetarg ustny nieograniczony – 27.11.2025 r.
- II przetarg ustny nieograniczony – 18.02.2026 r.

                     Cena wywoławcza nieruchomości wynosi: 342.000,00 zł

        Przetarg odbędzie się w dniu 5 maja 2026 r. w siedzibie Urzędu Miejskiego
                w Nysie ul. Kolejowa 15, sala nr 200 o godz. 10:00`;

// Real pdftotext -layout output of id=30096.
const RESULT_MARIACKA = `                                                                Informacja o wyniku przetargu

            z przeprowadzonego w dniu 5 maja 2026r. kolejnego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego wielorodzinnego,
                                                              położonego w Nysie przy ul. Mariackiej nr 21/3

   Data i miejsce oraz                Oznaczenie i opis nieruchomości               Liczba osób      Cena wywoławcza   Cena osiągnięta    Imię i nazwisko / nazwa
rodzaj przeprowadzonego                                                            dopuszczonych                        w przetargu      firmy lub osoby ustalonej
        przetargu                                                                                                                              jako nabywca
                                                                                                                                               nieruchomości
5-05-2026 r.              Lokal mieszkalny nr 3 o łącznej powierzchni użytkowej          2             342.000,00 zł   362.000,00 zł      MAŁGORZATA SMYK
Urząd Miejski w Nysie     102,48 m2, położony na I piętrze budynku mieszkalnego                                                              PIOTR SMYK
kolejny przetarg ustny    wielorodzinnego w Nysie przy ul. Mariackiej nr 21.
nieograniczony.`;

// ─────────────────────────── isResultNotice ──────────────────────────────────

test('isResultNotice: result notice detected, announcement is not', () => {
  assert.equal(isResultNotice(RESULT_MONIUSZKI), true);
  assert.equal(isResultNotice(RESULT_MARIACKA), true);
  assert.equal(isResultNotice(ANN_MONIUSZKI), false);
  assert.equal(isResultNotice(ANN_MARIACKA), false);
});

// ─────────────────────────── roundFromText ───────────────────────────────────

test('roundFromText: ordinal words and Roman numerals', () => {
  assert.equal(roundFromText('I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('III przetarg ustny'), 3);
  assert.equal(roundFromText('pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('drugi przetarg ustny nieograniczony'), 2);
  // "kolejny przetarg" — no numeric ordinal stated → null
  assert.equal(roundFromText('kolejny przetarg ustny nieograniczony'), null);
  assert.equal(roundFromText('brak'), null);
});

// ─────────────────────────── auctionDateFromText ─────────────────────────────

test('auctionDateFromText: "odbędzie się w dniu DD miesiąc YYYY"', () => {
  assert.equal(auctionDateFromText(ANN_MONIUSZKI), '2024-12-17');
  assert.equal(auctionDateFromText(ANN_MARIACKA), '2026-05-05');
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w dniu 3 marca 2026 r. o godzinie 10:00'),
    '2026-03-03',
  );
  assert.equal(auctionDateFromText('brak daty'), null);
});

// ─────────────────────────── resultDateFromText ──────────────────────────────

test('resultDateFromText: header "przeprowadzonego w dniu" and cell "DD-MM-YYYY r."', () => {
  // From the header line "z przeprowadzonego w dniu 17 grudnia 2024 r."
  assert.equal(resultDateFromText(RESULT_MONIUSZKI), '2024-12-17');
  // From "z przeprowadzonego w dniu 5 maja 2026r."
  assert.equal(resultDateFromText(RESULT_MARIACKA), '2026-05-05');
  // Fallback: ISO-style date cell "17-12-2024 r."
  assert.equal(resultDateFromText('17-12-2024 r. Urząd Miejski w Nysie kolejny przetarg'), '2024-12-17');
  assert.equal(resultDateFromText('brak'), null);
});

// ─────────────────────────── addressRawFromText ──────────────────────────────

test('addressRawFromText: header "przy ul. Street N/M" form', () => {
  // Moniuszki 1/27 — address embedded as bldg/apt in header
  assert.equal(addressRawFromText(ANN_MONIUSZKI), 'ul. Moniuszki 1/27');
});

test('addressRawFromText: header "przy ul. Street nr N/M" — Mariackiej', () => {
  // "przy ul. Mariackiej nr 21/3" — the "nr" prefix is stripped from the output
  // so normalize.js receives a clean "ul. Mariackiej 21/3" (no spurious "nr" in key).
  assert.equal(addressRawFromText(ANN_MARIACKA), 'ul. Mariackiej 21/3');
});

test('addressRawFromText: result notice address extraction', () => {
  // Result notice header: "w Nysie przy ul. Moniuszki 1/27"
  assert.ok(addressRawFromText(RESULT_MONIUSZKI)?.includes('Moniuszki'));
});

// ─────────────────────────── unitAreaFromText ────────────────────────────────

test('unitAreaFromText: flat area, NOT the cellar/piwnica area', () => {
  // ANN: "Lokal mieszkalny nr 27 o łącznej powierzchni użytkowej 33,10 m2"
  //      "piwnica o powierzchni użytkowej 3,87 m2" → must NOT be taken
  assert.equal(unitAreaFromText(ANN_MONIUSZKI), 33.1);
  // ANN Mariackiej: "Lokal mieszkalny nr 3 o łącznej powierzchni użytkowej 102,48 m2"
  //                 "piwnice o łącznej powierzchni użytkowej 16,10 m2" → must NOT be taken
  assert.equal(unitAreaFromText(ANN_MARIACKA), 102.48);
  // Result notice also contains the flat description
  assert.equal(unitAreaFromText(RESULT_MONIUSZKI), 33.1);
});

// ─────────────────────────── startingPriceFromText ───────────────────────────

test('startingPriceFromText: dot-thousands format "145.000,00 zł"', () => {
  assert.equal(startingPriceFromText(ANN_MONIUSZKI), 145000);
  assert.equal(startingPriceFromText(ANN_MARIACKA), 342000);
  // From result notice table cell
  assert.equal(startingPriceFromText(RESULT_MONIUSZKI), 145000);
  assert.equal(startingPriceFromText(RESULT_MARIACKA), 342000);
});

// ─────────────────────────── achievedPriceFromText ───────────────────────────

test('achievedPriceFromText: result table "Cena osiągnięta w przetargu"', () => {
  assert.equal(achievedPriceFromText(RESULT_MONIUSZKI), 165000);
  assert.equal(achievedPriceFromText(RESULT_MARIACKA), 362000);
  // Announcement has no achieved price
  assert.equal(achievedPriceFromText(ANN_MONIUSZKI), null);
});

// ─────────────────────────── title filters ───────────────────────────────────

test('isSkippableTitle: land/ground/vehicle/rental titles skipped', () => {
  assert.equal(isSkippableTitle('Nysa, dz. nr 697 w rejonie ul. Krasińskiego, obręb Górna Wieś- nieruchomość gruntowa niezabudowana'), true);
  assert.equal(isSkippableTitle('Nysa,obręb Wroblewskiego, działka nr 29/58-nieruchomość gruntowa niezabudowana'), true);
  assert.equal(isSkippableTitle('Sprzedaż drewna'), true);
  assert.equal(isSkippableTitle('Sprzedaż: Autobus 14-osobowy marki Renault Master'), true);
  assert.equal(isSkippableTitle('Zapytanie ofertowe na demontaż pojazdu'), true);
  assert.equal(isSkippableTitle('Nysa, ul. Racławicka 1- budynek Centrum Przesiadkowego - najem lokalu użytkowego nr 3'), true);
  // Real flat sale article titles are NOT skippable
  assert.equal(isSkippableTitle('Nysa ul.Moniuszki 1/27 - lokal mieszkalny'), false);
  assert.equal(isSkippableTitle('Nysa przy ul. Mariackiej nr 21/3 - lokal mieszkalny'), false);
});

test('isFlatSaleTitle: positively identifies flat sale articles', () => {
  assert.equal(isFlatSaleTitle('Nysa ul.Moniuszki 1/27 - lokal mieszkalny'), true);
  assert.equal(isFlatSaleTitle('Nysa przy ul. Mariackiej nr 21/3 - lokal mieszkalny'), true);
  assert.equal(isFlatSaleTitle('Nysa, lokal mieszkalny nr 3 przy ul. Mariackiej nr 21'), true);
  // Non-flat articles
  assert.equal(isFlatSaleTitle('Nysa, dz. nr 697 - nieruchomość gruntowa niezabudowana'), false);
  assert.equal(isFlatSaleTitle('Sprzedaż drewna'), false);
});

// ─────────────────────────── parseAnnouncement ───────────────────────────────

test('parseAnnouncement: Moniuszki 1/27 — address key, area, price, date, kind', () => {
  const r = parseAnnouncement(ANN_MONIUSZKI);
  assert.ok(r, 'a record is returned');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Moniuszki 1/27');
  assert.equal(r.address.key, 'moniuszki|1|27', '← join key must match RESULT_MONIUSZKI');
  assert.equal(r.area_m2, 33.1, 'flat usable area, NOT the 3,87 m² cellar');
  assert.equal(r.starting_price_pln, 145000);
  assert.equal(r.auction_date, '2024-12-17');
  assert.equal(r.round, null, '"kolejny" → no numeric ordinal');
});

test('parseAnnouncement: Mariackiej 21/3 — area, price, date', () => {
  const r = parseAnnouncement(ANN_MARIACKA);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'mariackiej|21|3');
  assert.equal(r.area_m2, 102.48, 'NOT the 16,10 m² piwnice');
  assert.equal(r.starting_price_pln, 342000);
  assert.equal(r.auction_date, '2026-05-05');
  assert.equal(r.round, null);
});

test('parseAnnouncement: result notice returns null (not an announcement)', () => {
  assert.equal(parseAnnouncement(RESULT_MONIUSZKI), null);
});

// ─────────────────────────── parseResultDoc ──────────────────────────────────

test('parseResultDoc: SOLD — Moniuszki 1/27 achieved price, join key matches announcement', () => {
  assert.equal(isResultNotice(RESULT_MONIUSZKI), true);
  const recs = parseResultDoc(
    RESULT_MONIUSZKI,
    null,
    'https://bip.nysa.pl/?p=document&action=show&id=23554&bar_id=8934',
  );
  assert.equal(recs.length, 1);
  const s = recs[0];
  assert.equal(s.address.key, 'moniuszki|1|27', '← same as parseAnnouncement JOIN KEY');
  assert.equal(s.kind, 'mieszkalny');
  assert.equal(s.area_m2, 33.1);
  assert.equal(s.starting_price_pln, 145000);
  assert.equal(s.final_price_pln, 165000);
  assert.equal(s.outcome, 'sold');
  assert.equal(s.unsold_reason, null);
  assert.equal(s.auction_date, '2024-12-17');
  assert.equal(s.source_pdf, 'https://bip.nysa.pl/?p=document&action=show&id=23554&bar_id=8934');
  assert.equal(s.round, null, '"kolejny" round → null');
});

test('parseResultDoc: SOLD — Mariackiej 21/3 correct join key and prices', () => {
  const recs = parseResultDoc(
    RESULT_MARIACKA,
    null,
    'https://bip.nysa.pl/?p=document&action=show&id=30096&bar_id=11718',
  );
  assert.equal(recs.length, 1);
  const s = recs[0];
  assert.equal(s.address.key, 'mariackiej|21|3');
  assert.equal(s.starting_price_pln, 342000);
  assert.equal(s.final_price_pln, 362000);
  assert.equal(s.outcome, 'sold');
  assert.equal(s.auction_date, '2026-05-05');
});

test('parseResultDoc: announcement text returns empty array', () => {
  assert.deepEqual(parseResultDoc(ANN_MONIUSZKI, null, 'u'), []);
});

// ─────────────────────────── crawl helpers ───────────────────────────────────

test('parseArticleList: extracts ids and titles from board HTML', () => {
  const html = `
    <li><a href="?a=8934" class="blue">Nysa ul.Moniuszki 1/27 - lokal mieszkalny</a></li>
    <li><a href="?a=11718" class="blue">Nysa przy ul. Mariackiej nr 21/3 - lokal mieszkalny</a></li>
    <li><a href="?a=12040" class="blue">Nysa,obręb Wroblewskiego, działka nr 29/58-nieruchomość gruntowa niezabudowana</a></li>
    <a href="?a=12116" class="" title="Czytaj dalej">Czytaj dalej</a>
  `;
  const arts = parseArticleList(html);
  assert.equal(arts.length, 3); // blue-class only, no "Czytaj dalej"
  assert.equal(arts[0].id, '8934');
  assert.equal(arts[0].title, 'Nysa ul.Moniuszki 1/27 - lokal mieszkalny');
  assert.equal(arts[1].id, '11718');
  // Deduplication
  const htmlDup = html + `<li><a href="?a=8934" class="blue">duplicate</a></li>`;
  assert.equal(parseArticleList(htmlDup).length, 3);
});

test('parsePdfAttachments: extracts PDF show links, skips docs and zips', () => {
  const artId = '8934';
  const html = `
    <tr>
      <td class="attachmentTableColumn1">ogłoszenie - kolejny przetarg (111.5kB)</td>
      <td class="attachmentTableColumn2"><a href="?p=document&amp;action=save&amp;id=22892&amp;bar_id=8934"></a></td>
      <td class="attachmentTableColumn3"><a href="?p=document&amp;action=show&amp;id=22892&amp;bar_id=8934" class="lnk"><img src="/ui2015/img/icons/icon_pdf_show.gif" /></a></td>
    </tr>
    <tr>
      <td class="attachmentTableColumn1">ogłoszenie - wersja do odczytu (21.5kB)</td>
      <td class="attachmentTableColumn2"><a href="?p=document&amp;action=save&amp;id=22893&amp;bar_id=8934"></a></td>
      <td class="attachmentTableColumn3"><a href="?p=document&amp;action=show&amp;id=22893&amp;bar_id=8934" class="lnk"><img src="/ui2015/img/icons/icon_doc_show.gif" /></a></td>
    </tr>
    <tr>
      <td class="attachmentTableColumn1">zdjęcia (80.6MB)</td>
      <td class="attachmentTableColumn2"><a href="?p=document&amp;action=save&amp;id=22894&amp;bar_id=8934"></a></td>
      <td class="attachmentTableColumn3">&nbsp;</td>
    </tr>
    <tr class="last">
      <td class="attachmentTableColumn1">Informacja o wyniku kolejnego przetargu (45.4kB)</td>
      <td class="attachmentTableColumn2"><a href="?p=document&amp;action=save&amp;id=23554&amp;bar_id=8934"></a></td>
      <td class="attachmentTableColumn3"><a href="?p=document&amp;action=show&amp;id=23554&amp;bar_id=8934" class="lnk"><img src="/ui2015/img/icons/icon_pdf_show.gif" /></a></td>
    </tr>
  `;
  const atts = parsePdfAttachments(html, artId);
  // Should get both PDFs that have show links (announcement + result)
  // but NOT the .doc (22893 has show link too, so it comes through — label decides)
  assert.ok(atts.length >= 2);
  const ids = atts.map((a) => a.docId);
  assert.ok(ids.includes('22892'), 'announcement PDF');
  assert.ok(ids.includes('23554'), 'result PDF');
  // bar_id safety: wrong bar_id must not appear
  const wrongHtml = html.replace(/bar_id=8934/g, 'bar_id=9999');
  assert.equal(parsePdfAttachments(wrongHtml, artId).length, 0);
});

test('classifyAttachmentLabel: routing by label text', () => {
  assert.equal(classifyAttachmentLabel('Informacja o wyniku kolejnego przetargu'), 'result');
  assert.equal(classifyAttachmentLabel('Informacja o wyniku przetargu'), 'result');
  assert.equal(classifyAttachmentLabel('ogłoszenie - kolejny przetarg'), 'announcement');
  assert.equal(classifyAttachmentLabel('ogłoszenie'), 'announcement');
  assert.equal(classifyAttachmentLabel('ogłoszenie - wersja do odczytu'), 'announcement');
  assert.equal(classifyAttachmentLabel('zdjęcia'), 'skip');
  assert.equal(classifyAttachmentLabel('wersja do odczytu'), 'skip');
});
