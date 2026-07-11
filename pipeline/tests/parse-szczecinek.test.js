// Szczecinek parser tests. Fixtures are condensed-but-faithful copies of REAL
// `pdftotext -layout` / HTML-body-extracted text fetched live 2026-07-10/11:
//   - flat announcement (round III) — article 645/7273, Narutowicza 3E/9
//   - flat announcement (round III, alt area phrasing) — article 547/5115,
//     Koszalińska 58/2
//   - land announcement (word-month date, no round marker) — article
//     645/7276, Kołobrzeska (parcels 466/2, 465/3, 465/4)
//   - RESULT stub (board 338, NO PDF attachment at all — confirmed live,
//     repeat-fetch byte-identical) — article 338/7239, Narutowicza flat
//   - RESULT multi-row table PDF (attachment 13801, article 338/7156) — 7
//     parcels from one przetarg session, sold + unsold rows, INCLUDING the
//     office's own period-for-comma grosze rendering glitch on 2 rows
//   - RESULT single-row table PDF (attachment 14403, article 338/7446) —
//     Kołobrzeska land batch, SOLD (the ≥1-achieved-price groundtruth)
//   - RESULT table PDF, building/zabudowana (attachment 13677, article
//     338/7091) — Władysława Bartoszewskiego 12, UNSOLD (round III)
//   - RESULT table PDF (attachment 14478, article 338/7484) — rounds III AND
//     IV in the SAME PDF
//   - lease-board slug (board 348/647, out of scope for this crawler but
//     real — isSkippableTitle groundtruth)
//
// Three REAL bugs were caught and fixed while building this against live
// data (see parse.js's inline comments at each site); the regression tests
// below are named after them:
//   1. isResultNotice used \w* (ASCII-only) against the office's own
//      ACCUSATIVE phrasing ("...informację o wyniku...") — silently matched
//      NOTHING on this host until the character class went Polish-aware.
//   2. amountsInChunk misread parts of TWO different dates as amounts: the
//      row-start marker's own date ("21.01.2026" -> a bogus 1202), and a
//      citation date elsewhere in a row's prose ("07.02.2017r." -> a bogus
//      2201) — fixed by excluding the marker from row text and adding a
//      (?<![\d.]) guard so a match can't start mid-way through another
//      dotted digit run.
//   3. streetFromHeader's terminator list didn't anticipate "wpisanej"
//      (a common word directly after a building number in RESULT-table
//      prose, as opposed to the terse announcements) — a building number
//      capture is now itself a sufficient stop, no trailing word needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isResultNotice,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  amountsInChunk,
  unitAreaFromText,
  plotFromText,
  obrebFromText,
  streetFromHeader,
  addressRawFromText,
  parseAnnouncement,
  parseResultDoc,
  splitResultRows,
  extractBodyText,
} from '../src/cities/szczecinek/parse.js';

// ---------------------------------------------------------------- title routing

test('isSkippableTitle: wykaz, lease (real board-348 slug), cancellation, rokowania', () => {
  assert.equal(
    isSkippableTitle('', 'wykaz-nieruchomosci-przeznaczonej-do-zbycia-polozonej-przy-ul-armii-krajowej'),
    true,
  );
  // real slug from board 348/647 (Nieruchomości przeznaczone do wydzierżawienia) — out
  // of scope for this crawler, but the classifier must still recognize it defensively.
  assert.equal(isSkippableTitle('', 'wykaz-nieruchomosci-przeznaczonych-do-wydzierzawienia'), true);
  assert.equal(isSkippableTitle('', 'odwolanie-przetargu'), true);
  assert.equal(isSkippableTitle('Burmistrz ogłasza rokowania na sprzedaż nieruchomości', ''), true);
  // a real sale announcement is NOT skippable
  assert.equal(isSkippableTitle('', 'ogloszenie-o-przetargu-na-zbycie-lokalu-przy-ulicy-narutowicza-3e-9'), false);
});

test('isResultTitle / isAnnouncementTitle: real slugs (incl. the "ogloszenia"/"ulicu" typo variant seen live)', () => {
  assert.equal(
    isResultTitle('', 'informacja-o-wyniku-przetargu-z-dnia-19-02-2026r-na-sprzedaz-lokalu-mieszkalnego-nr-9'),
    true,
  );
  assert.equal(isAnnouncementTitle('', 'przetarg-na-sprzedaz-nieruchomosci-polozonej-przy-ul-kolobrzeskiej'), true);
  // multi-item batch announcement (plural "przetargi")
  assert.equal(
    isAnnouncementTitle('', 'przetargi-na-sprzedaz-nieruchomosci-polozonych-przy-ulicach-lipowej-winnicznej-pilskiej'),
    true,
  );
  // real live typo: "ogloszenia" (not "ogloszenie") + "ulicu" (not "ulicy") — board
  // 645 page 2 — the broad sprzeda|zbyci substring match must survive typos like this.
  assert.equal(
    isAnnouncementTitle('', 'ogloszenia-o-przetargu-na-zbycie-lokalu-przy-ulicu-koszalinskiej-58-2'),
    true,
  );
  assert.equal(isAnnouncementTitle('', 'odwolanie-przetargu'), false);
});

test('isResultNotice: REGRESSION — the office\'s real ACCUSATIVE phrasing ("informację", not "informacja")', () => {
  // \w* is ASCII-only in JS; this office's live boilerplate never uses the
  // nominative "INFORMACJA" TG/Skarżysko fixtures use — it's always
  // "...publicznej wiadomości informację o wyniku przetargu..." (accusative,
  // "ę"). A bare \w* silently fails to match this on EVERY result page.
  assert.equal(
    isResultNotice('Burmistrz Miasta Szczecinek … podaje do publicznej wiadomości informację o wyniku przetargu z dnia 19.02.2026r.'),
    true,
  );
  // the ALL-CAPS nominative header form (as seen atop the PDF tables) still works
  assert.equal(isResultNotice('INFORMACJA O WYNIKU PRZETARGU'), true);
  assert.equal(isResultNotice('Burmistrz Miasta Szczecinek ogłasza: III przetarg ustny nieograniczony na sprzedaż'), false);
});

// -------------------------------------------------------------- shared extractors

test('roundFromText: Roman numeral (current attempt) wins over a later word-ordinal history mention', () => {
  assert.equal(roundFromText('ogłasza: III przetarg ustny nieograniczony na sprzedaż'), 3);
  assert.equal(roundFromText('IV przetarg ustny nieograniczony na sprzedaż'), 4);
  assert.equal(roundFromText('I przetarg ustny nieograniczony na sprzedaż'), 1);
  assert.equal(roundFromText('przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej'), null, 'no marker at all -> null, never assumed 1');
  // REGRESSION: a word-ordinal-only regex (the TG/Skarżysko pattern) would
  // grab "Pierwszy" -> 1 here since it's the first ordinal-shaped token; the
  // TRUE current round (III, stated up front) must win.
  assert.equal(
    roundFromText(
      'III przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 9. Pierwszy przetarg odbył się w dniu 20.11.2025 r. Drugi przetarg odbył się w dniu 19.02.2026r.',
    ),
    3,
  );
  // word-ordinal fallback (used only when no Roman marker exists)
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny nieograniczony'), 1);
  // must NOT false-fire on the Polish conjunction "i" ("and") right before "przetarg"
  assert.equal(roundFromText('dokonać wpłaty wadium i przetarg ustny nieograniczony zostanie przeprowadzony'), null);
});

test('auctionDateFromText: numeric DD.MM.YYYY (flats) AND word-month (land) — both used by this office', () => {
  assert.equal(
    auctionDateFromText('Przetarg zostanie przeprowadzony w dniu 28.04.2026 r. o godz. 10-tej w siedzibie Urzędu Miasta Szczecinek'),
    '2026-04-28',
  );
  assert.equal(
    auctionDateFromText('Przetarg na sprzedaż w/w nieruchomości zostanie przeprowadzony w dniu 03 czerwca 2026 r. o godz. 10-tej'),
    '2026-06-03',
  );
  // prior-round past-tense mentions must NOT be picked up
  assert.equal(
    auctionDateFromText('Pierwszy przetarg odbył się w dniu 20.11.2025 r. Przetarg zostanie przeprowadzony w dniu 28.04.2026 r.'),
    '2026-04-28',
  );
});

test('resultDateFromText: "…informację o wyniku przetargu z dnia D.M.Y…" — the ONLY date source for a stub result', () => {
  assert.equal(
    resultDateFromText('podaje do publicznej wiadomości informację o wyniku przetargu z dnia 19.02.2026r. na sprzedaż lokalu'),
    '2026-02-19',
  );
  assert.equal(resultDateFromText('z dnia 26.03.2026r. na sprzedaż lokalu mieszkalnego nr 2'), null, 'needs the "przetargu z dnia" anchor, not a bare "z dnia"');
  // a PDF table's own text never restates "z dnia" (the date lives per-row instead)
  assert.equal(resultDateFromText('Lp. Data i miejsce przeprowadzonego przetargu … 1. 21.01.2026 r. Urząd Miasta'), null);
});

test('startingPriceFromText: en-dash connector, dot-thousands (this office\'s house style)', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza – 130.000,00 zł netto (sprzedaż zwolniona z podatku VAT)'), 130000);
  assert.equal(startingPriceFromText('Cena wywoławcza – 2.700.000,00 zł netto'), 2700000);
  assert.equal(startingPriceFromText('Wysokość postąpienia nie może wynosić mniej niż 1% ceny wywoławczej.'), null);
});

test('amountsInChunk: reading-order [wywoławcza, osiągnięta]; REGRESSION — dates must never be read as amounts', () => {
  assert.deepEqual(amountsInChunk('… 120.000,00   121.200,00        Ilona i Bartosz Pytlak'), [120000, 121200]);
  assert.deepEqual(amountsInChunk('… 110.000,00                  przetarg zakończył się wynikiem negatywnym'), [110000], 'unsold row: only the starting price, no dash-as-amount');
  // this office's grosze-as-period rendering glitch (seen on 2 real rows)
  assert.deepEqual(amountsInChunk('… 120.000.00   129.600,00           Niewiadomscy'), [120000, 129600]);
  assert.deepEqual(amountsInChunk('… 200.000.00   202.000.00       ARFEN POLSKA'), [200000, 202000]);
  // REGRESSION 1: the row-start marker's own date must not appear here at all
  // (splitResultRows excludes the marker from row text — this asserts the
  // marker's date shape alone, in isolation, is inert)
  assert.deepEqual(amountsInChunk(' 2.    21.01.2026 r.            przetarg'), []);
  // REGRESSION 2: a citation date elsewhere in the row's prose must not be
  // misread starting at its month ("02.201" from "02.2017")
  assert.deepEqual(amountsInChunk('Burmistrza Miasta Szczecinek z dn. 07.02.2017r. (ze zm.)'), []);
});

test('unitAreaFromText: "o powierzchni użytkowej" (direct) AND "Lokal o pow." (alt) — excludes cellar/łączna-total', () => {
  assert.equal(
    unitAreaFromText('sprzedaż wolnego lokalu mieszkalnego nr 9 o powierzchni użytkowej 29,49 m2 położonego na drugim piętrze'),
    29.49,
  );
  assert.equal(unitAreaFromText('Lokal o pow. 127,60 m² składa się z: I pokój o pow. 26,42 m²'), 127.6);
  // never the attached cellar, and never the "łączna...wraz z piwnicami" total
  assert.equal(unitAreaFromText('Do lokalu przynależy piwnica o pow. 5,08 m2'), null);
  assert.equal(unitAreaFromText('Łączna powierzchnia lokalu wraz z powierzchnią piwnic wynosi 149,49 m².'), null);
});

test('plotFromText: word-order-agnostic parcel list ("działki numer…" AND "numerami działek…"), m2-direct AND ha-converted', () => {
  // announcement order: dzialk-word first
  assert.deepEqual(plotFromText('działki nr : 466/2, 465/3 i 465/4 o łącznej pow. 1,0698 ha'), {
    dzialka_nr: '466/2, 465/3, 465/4',
    area_m2: 10698,
  });
  // results-table order: numer-word first (REGRESSION — an order-anchored
  // regex, like TG's "działk…numer" pattern, only catches one of these two)
  assert.deepEqual(plotFromText('oznaczona numerami działek : 466/2, 465/3 i 465/4 o łącznej pow. 1,0698 ha w obrębie 07'), {
    dzialka_nr: '466/2, 465/3, 465/4',
    area_m2: 10698,
  });
  // a single small parcel already given directly in m2 (no ha conversion)
  assert.deepEqual(plotFromText('oznaczona numerem działki 454/12 o pow. 866 m2 w obrębie 18'), {
    dzialka_nr: '454/12',
    area_m2: 866,
  });
  // a co-owned access-road parcel mentioned alongside must NOT be folded into the main parcel's area
  assert.deepEqual(
    plotFromText('numerem działki 1448/7 o pow. 757 m2 w obrębie 09 wraz z udziałem do 1/5 części w działce nr 1448/8 o pow. 481 m2'),
    { dzialka_nr: '1448/7', area_m2: 757 },
  );
});

test('obrebFromText: bare NUMBER (not a name, unlike Tarnowskie Góry) — both "obrębie N" and "obr. N" forms', () => {
  assert.equal(obrebFromText('działka gruntu nr 14/7 położoną w obr. 13 o pow. 4843 m2'), '13');
  assert.equal(obrebFromText('numerem działki 454/12 o pow. 866 m2 w obrębie 18, przeznaczona'), '18');
  assert.equal(obrebFromText('brak wzmianki'), null);
});

test('streetFromHeader / addressRawFromText: REGRESSION — a building number is self-terminating (no trailing-word list needed)', () => {
  assert.deepEqual(streetFromHeader('położonego w budynku przy ul. Narutowicza 3E w Szczecinku.'), { street: 'Narutowicza', building: '3E' });
  assert.deepEqual(streetFromHeader('przy ul. Kołobrzeskiej w Szczecinku'), { street: 'Kołobrzeskiej', building: null });
  // REGRESSION: real result-table prose ("…12 wpisanej do księgi wieczystej…")
  // — the original terminator list (period/comma/"w Szczecin"/…) didn't
  // anticipate "wpisanej" and the whole match failed, silently dropping the
  // record. A captured building number must need nothing more to stop.
  assert.deepEqual(streetFromHeader('w obrębie 13 przy ul. Władysława Bartoszewskiego 12 wpisanej do księgi wieczystej nr KO11/00021547/1'), {
    street: 'Władysława Bartoszewskiego',
    building: '12',
  });
  assert.equal(addressRawFromText('sprzedaż lokalu mieszkalnego nr 9 położonego w budynku przy ul. Narutowicza 3E'), 'ul. Narutowicza 3E/9');
});

// -------------------------------------------------------- announcement parse (real)

const ANN_FLAT_NARUTOWICZA = `O  G  Ł  O  S  Z  E  N  I  E o przetargu na zbycie lokalu Burmistrz Miasta Szczecinek ogłasza: III przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 9 o powierzchni użytkowej 29,49 m2 położonego na drugim piętrze w budynku wielomieszkaniowym przy ul. Narutowicza 3E w Szczecinku. Do lokalu przynależy piwnica o pow. 5,08 m2. Lokal posiada urządzoną księgę wieczystą nr KO1I/00050270/0 prowadzoną przez Sąd Rejonowy w Szczecinku. Z własnością lokalu związany jest udział wynoszący 2950/413240 części w nieruchomości wspólnej, która stanowi działkę gruntu nr 14/7 położoną w obr. 13 o pow. 4843 m2 wpisaną do księgi wieczystej nr KO1I/00042818/5. Pierwszy przetarg odbył się w dniu 20.11.2025 r. Drugi przetarg odbył się w dniu 19.02.2026r. Cena wywoławcza – 130.000,00 zł netto (sprzedaż zwolniona z podatku VAT) Wadium – 13.000,00 zł Minimalne postąpienie – 1.300,00 zł Przetarg zostanie przeprowadzony w dniu 28.04.2026 r. o godz. 10- tej w siedzibie Urzędu Miasta Szczecinek przy Placu Wolności 13 w sali nr 104.`;

test('parseAnnouncement: flat (Narutowicza, article 645/7273) — address/area/price/date/round=III, prior rounds not mistaken for current', () => {
  const r = parseAnnouncement(ANN_FLAT_NARUTOWICZA);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Narutowicza 3E/9');
  assert.equal(r.address.key, 'narutowicza|3E|9'); // ← the result→announcement JOIN KEY
  assert.equal(r.area_m2, 29.49, 'flat usable area, NOT the 5,08 m² cellar');
  assert.equal(r.starting_price_pln, 130000);
  assert.equal(r.auction_date, '2026-04-28', 'the CURRENT round\'s future date, not the 20.11.2025/19.02.2026 prior rounds');
  assert.equal(r.round, 3);
  assert.equal(r.land_area_m2, undefined, 'a flat has a usable area, so no land_area_m2 fallback');
});

const ANN_FLAT_KOSZALINSKA = `O  G  Ł  O  S  Z  E  N  I  E o przetargu na zbycie nieruchomości Burmistrz Miasta Szczecinek ogłasza: III przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 2 położonego na 1 piętrze w budynku przy ul. Koszalińskiej 58 w Szczecinku wraz z udziałem do 490/1000 części w nieruchomości wspólnej, którą stanowi działka gruntu nr 168/2 położona w obrębie 08 o pow. 801 m² oraz części wspólne budynku, wpisanej do księgi wieczystej nr KO1I/00039127/0 prowadzonej w Sądzie Rejonowym w Szczecinku. Lokal o pow. 127,60 m² składa się z: I pokój o pow. 26,42 m², II pokój o pow. 22,25 m², III pokój o pow. 22,37 m², IV pokój o pow. 20,03 m², I kuchnia o pow. 11,70 m², II kuchnia o pow. 6,97 m², przedpokój o pow. 11,10 m², łazienka z wc o pow. 5,49 m² oraz spiżarka o pow. 1,27 m². Do lokalu przynależą 2 pomieszczenia piwniczne o pow. 10,82 m² i 11,07 m², które stanowią część składową lokalu. Łączna powierzchnia lokalu wraz z powierzchnią piwnic wynosi 149,49 m². Pierwszy przetarg odbył się w dniu 15.05.2025r. Drugi przetarg odbył się w dniu 31.07.2025r. Cena wywoławcza – 350.000,00 zł netto (sprzedaż zwolniona z podatku VAT) Wadium – 35.000,00 zł Minimalne postąpienie – 3.500,00 zł Przetarg zostanie przeprowadzony w dniu 09.10.2025 r. o godz. 10- tej w siedzibie Urzędu Miasta Szczecinek przy Placu Wolności 13 w sali nr 104.`;

test('parseAnnouncement: flat (Koszalińska, article 547/5115) — "Lokal o pow." alt phrasing, NOT the 149,49 m² total-with-cellars', () => {
  const r = parseAnnouncement(ANN_FLAT_KOSZALINSKA);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Koszalińskiej 58/2');
  assert.equal(r.address.key, 'koszalinskiej|58|2');
  assert.equal(r.area_m2, 127.6, 'the flat\'s own area (room breakdown sums to it), not the 149.49 m² total incl. 2 cellars');
  assert.equal(r.starting_price_pln, 350000);
  assert.equal(r.auction_date, '2025-10-09');
  assert.equal(r.round, 3);
});

const ANN_LAND_KOLOBRZESKA = `Szczecinek, dnia 25.03.2026 r. OGŁOSZENIE o przetargu na zbycie nieruchomości Burmistrz Miasta Szczecinek ogłasza: przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej oznaczonej jako działki nr : 466/2, 465/3 i 465/4 o łącznej pow. 1,0698 ha, położonej w obrębie 07 przy ul. Kołobrzeskiej w Szczecinku. W miejscowym planie zagospodarowania przestrzennego „Kołobrzeska” działki nr : 466/2 i 465/3 przeznaczone są pod zabudowę mieszkaniową wielorodzinną, natomiast działka nr 465/4 stanowi teren komunikacji wewnętrznej. Cena wywoławcza – 2.700.000,00 zł netto (do ceny ustalonej w przetargu zostanie doliczony podatek VAT w stawce obowiązującej w dniu podpisania umowy notarialnej) Wadium - 270.000,00 zł Minimalne postąpienie – 27.000,00 zł Przetarg na sprzedaż w/w nieruchomości zostanie przeprowadzony w dniu 03 czerwca 2026 r. o godz. 10-tej w siedzibie Urzędu Miasta Szczecinka przy Placu Wolności 13 w sali nr 104.`;

test('parseAnnouncement: land (Kołobrzeska, article 645/7276) — word-month date, no round marker, obreb, 3-parcel list', () => {
  const r = parseAnnouncement(ANN_LAND_KOLOBRZESKA);
  assert.ok(r);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '466/2, 465/3, 465/4');
  assert.equal(r.area_m2, 10698, '1,0698 ha -> m²');
  assert.equal(r.obreb, '07');
  assert.equal(r.address_raw, 'ul. Kołobrzeskiej');
  assert.equal(r.starting_price_pln, 2700000);
  assert.equal(r.auction_date, '2026-06-03', 'word-month date form ("03 czerwca 2026 r."), unlike the flats\' numeric form');
  assert.equal(r.round, null, 'no ordinal marker at all on a first attempt — never assumed round 1');
});

// -------------------------------------------------------------- result parse (real)

test('parseResultDoc: STUB result (board 338, NO PDF at all — confirmed live) — best-effort record, no fabricated price', () => {
  const STUB_NARUTOWICZA = `Burmistrz Miasta Szczecinek na podstawie art. 42 ust. 1 i 2 ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami / Dz. U. z 2024 r. poz. 1145 ze zm /, oraz § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości / Dz. U. z 2021 r. poz. 2213 ze zm. / podaje do publicznej wiadomości informację o wyniku przetargu z dnia 19.02.2026r. na sprzedaż lokalu mieszkalnego nr 9 położonego w budynku przy ul. Narutowicza 3E`;
  assert.equal(isResultNotice(STUB_NARUTOWICZA), true);
  const recs = parseResultDoc(STUB_NARUTOWICZA, null, 'https://bip.szczecinek.pl/artykul/338/7239/informacja-o-wyniku-przetargu-z-dnia-19-02-2026r-na-sprzedaz-lokalu-mieszkalnego-nr-9-polozonego-w-budynku-przy-ul-narutowicza-3e');
  assert.equal(recs.length, 1);
  const s = recs[0];
  assert.equal(s.address.key, 'narutowicza|3E|9', 'same key as the announcement — they JOIN');
  assert.equal(s.auction_date, '2026-02-19', 'recovered from the boilerplate "z dnia" — the PDF-table date source is absent here');
  assert.equal(s.starting_price_pln, null, 'genuinely absent from the source — never fabricated');
  assert.equal(s.final_price_pln, null);
  assert.equal(s.outcome, 'unsold', 'best-effort default; the missing-price notes carry the real signal');
  assert.ok(s.notes.includes('parse: missing starting price'));
  assert.ok(s.notes.includes('parse: no achieved price and no explicit negative outcome'));
});

// Multi-row results-table PDF — attachment 13801 (article 338/7156, 21.01.2026
// batch). 7 parcels from one przetarg session; kept verbatim (incl. the raw
// column-interleaved pdftotext -layout garbling) because the row-splitting +
// dewrapping fixes are only meaningfully tested against the REAL messy shape.
const RESULT_TABLE_13801 = `
       Data i miejsce    Rodzaj przetargu                       Oznaczenie nieruchomości wg księgi wieczystej                           Liczba osób       Liczba osób         Cena      Najwyższa        Imię i nazwisko albo nazwa
Lp.   przeprowadzoneg                                                      i katastru nieruchomości                                    dopuszczonych   niedopuszczonych wywoławcza cena osiągnięta      lub firma osoby ustalonej jako
         o przetargu                                                                                                                    do przetargu   do uczestniczenia nieruchomości  w przetargu        nabywca nieruchomości
                                                                                                                                                          w przetargu        netto [zł]  netto [zł]
 1.    21.01.2026 r.            przetarg      nieruchomość niezabudowana położona w Szczecinku przy ul. Kaszubskiej, oznaczona                                              110.000,00                  przetarg zakończył się wynikiem
        Urząd Miasta              ustny       numerem działki 1448/7 o pow. 757 m2 w obrębie 09 wraz z udziałem do 1/5                                                                                   negatywnym - nikt nie wpłacił
         Szczecinek          nieograniczony   części w działce nr 1448/8 o pow. 481 m2 w obrębie 09, przeznaczona                                                                                            wymaganego wadium
 2.    21.01.2026 r.            przetarg      nieruchomość niezabudowana położona w Szczecinku przy ul. Kaszubskiej, oznaczona               1                              120.000,00   121.200,00        Ilona i Bartosz Pytlak
        Urząd Miasta              ustny       numerem działki 1448/11 o pow. 858 m2 w obrębie 09 wraz z udziałem do 1/5
         Szczecinek          nieograniczony   części w działce nr 1448/8 o pow. 481 m2 w obrębie 09, przeznaczona
 3.    21.01.2026 r.            przetarg      nieruchomość niezabudowana położona w Szczecinku przy ul. Modrzewiowej,                                                       100.000,00                  przetarg zakończył się wynikiem
        Urząd Miasta              ustny       oznaczona numerem działki 454/12 o pow. 866 m2 w obrębie 18, przeznaczona                                         -                            -           negatywnym - nikt nie wpłacił
         Szczecinek          nieograniczony   w miejscowym planie zagospodarowania przestrzennego „Pilska-4" pod zabudowę                                                                                    wymaganego wadium
 6.    21.01.2026 r.            przetarg      nieruchomość niezabudowana położona w Szczecinku przy ul. Modrzewiowej,                                                                                      Bogusława i Waldemar
        Urząd Miasta              ustny       oznaczona numerem działki 454/15 o pow. 1067 m2 w obrębie 18, przeznaczona                     2                  -           120.000.00   129.600,00           Niewiadomscy
         Szczecinek          nieograniczony   w miejscowym planie zagospodarowania przestrzennego „Pilska-4" pod zabudowę
 7.    21.01.2026 r.            przetarg      nieruchomość niezabudowana położona w Szczecinku przy ul. Fabrycznej, oznaczona                1                              200.000.00   202.000.00       ARFEN POLSKA Sp. z o.o.
        Urząd Miasta             ustny        numerem działki 31/18 o pow. 2388 m2 w obrębie 21, przeznaczona w miejscowym
         Szczecinek          nieograniczony   planie zagospodarowania przestrzennego „Pilska-3" pod zabudowę przemysłową lub zabudowę usługową.
podaje do publicznej wiadomości informację o wyniku przetargu.`;

test('parseResultDoc: multi-row TABLE PDF (13801) splits into one record per Lp row', () => {
  assert.equal(isResultNotice(RESULT_TABLE_13801), true);
  const rows = splitResultRows(RESULT_TABLE_13801);
  assert.equal(rows.length, 5, 'rows 1, 2, 3, 6, 7 (a representative subset of the real 7-row PDF)');

  const recs = parseResultDoc(RESULT_TABLE_13801, '2026-01-21', 'https://bip.szczecinek.pl/attachments/download/13801');
  assert.equal(recs.length, 5);
  for (const r of recs) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.auction_date, '2026-01-21');
    assert.equal(r.source_pdf, 'https://bip.szczecinek.pl/attachments/download/13801');
  }

  const unsold = recs.find((r) => r.dzialka_nr === '1448/7');
  assert.ok(unsold, 'row 1 (unsold, no achieved price at all)');
  assert.equal(unsold.obreb, '09');
  assert.equal(unsold.area_m2, 757);
  assert.equal(unsold.starting_price_pln, 110000);
  assert.equal(unsold.final_price_pln, null);
  assert.equal(unsold.outcome, 'unsold');

  const sold = recs.find((r) => r.dzialka_nr === '1448/11');
  assert.ok(sold, 'row 2 (sold, comma-grosze)');
  assert.equal(sold.starting_price_pln, 120000);
  assert.equal(sold.final_price_pln, 121200);
  assert.equal(sold.outcome, 'sold');

  // REGRESSION: rows 6 and 7 render the grosze separator as "." not "," —
  // this office's own PDF-rendering quirk, not an OCR scan.
  const soldPeriodGrosze = recs.find((r) => r.dzialka_nr === '454/15');
  assert.ok(soldPeriodGrosze, 'row 6 ("120.000.00" period-grosze)');
  assert.equal(soldPeriodGrosze.starting_price_pln, 120000);
  assert.equal(soldPeriodGrosze.final_price_pln, 129600);
  assert.equal(soldPeriodGrosze.outcome, 'sold');

  const fabryczna = recs.find((r) => r.dzialka_nr === '31/18');
  assert.ok(fabryczna, 'row 7 (both amounts period-grosze)');
  assert.equal(fabryczna.starting_price_pln, 200000);
  assert.equal(fabryczna.final_price_pln, 202000);
});

const RESULT_KOLOBRZESKA_14403 = `
1.        03.06.2026 r.           przetarg      nieruchomość niezabudowana położona w Szczecinko przy                     3                                 2.700.000,00             3.590.000,00           Hanna i Wiesław małż. Pączka
          Urząd Miasta              ustny       ul. Kołobrzeskiej, oznaczona numerami działek : 466/2, 465/3
           Szczecinek          nieograniczony   i 465/4 o łącznej pow. 1,0698 ha w obrębie 07, przeznaczona
podaje do publicznej wiadomości informację o wyniku przetargu.`;

test('parseResultDoc: land batch SOLD (14403, Kołobrzeska) — the ≥1-achieved-price groundtruth, word order "numerami działek"', () => {
  const recs = parseResultDoc(RESULT_KOLOBRZESKA_14403, '2026-06-03', 'https://bip.szczecinek.pl/attachments/download/14403');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '466/2, 465/3, 465/4');
  assert.equal(r.area_m2, 10698);
  assert.equal(r.obreb, '07');
  assert.equal(r.starting_price_pln, 2700000);
  assert.equal(r.final_price_pln, 3590000, 'the achieved price — well above the starting price');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2026-06-03');
});

const RESULT_BARTOSZEWSKIEGO_13677 = `
 1.          11.12.2025 r.     III przetarg Nieruchomość zabudowana oznaczona jako działki numer 214/10 i 214/11 o łącznej pow. 0,0854 ha,
             Urząd Miasta          ustny    położona w Szczecinku w obrębie 13 przy ul. Władysława Bartoszewskiego 12 wpisanej do
              Szczecinek     nieograniczony księgi wieczystej nr KO11/00021547/1 prowadzonej w Sądzie Rejonowym w Szczecinku.                                                                                                przetarg
                                            Nieruchomość zabudowana jest budynkami o funkcji niemieszkalnej, które stanowią zorganizowaną                -                 -            2.500.000,00           -          zakończył się
                                            całość (była siedziba SZOK) o łącznej pow. użytkowej 1385,30 m2.                                                                                                                 wynikiem
                                            Budynek przy ul. Bartoszewskiego 12 ujęty jest w Gminnej Ewidencji Zabytków                                                                                                    negatywnym -
                                            miasta Szczecinek - Żarz, nr 18/2017 Burmistrza Miasta Szczecinek z dn. 07.02.2017r. (ze zm.) w                                                                              osoba która
                                            sprawie założenia Gminnej Ewidencji Zabytków z terenu miasta Szczecinek.                                                                                                    wpłaciła wadium
                                            Pierwszy przetarg odbył się w dniu 08.05.2025r. Drugi przetarg odbył się w dniu 04.09.2025r.                                                                             nie stawiła się na
                                                                                                                                                                                                                             przetargu.
podaje do publicznej wiadomości informację o wyniku przetargu.`;

test('parseResultDoc: building (zabudowana) UNSOLD (13677, Bartoszewskiego) — "wpisanej" street REGRESSION + citation-date REGRESSION together', () => {
  const recs = parseResultDoc(RESULT_BARTOSZEWSKIEGO_13677, '2025-12-11', 'https://bip.szczecinek.pl/attachments/download/13677');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana', 'a built/commercial property, not raw land, despite mentioning "działki"');
  assert.equal(r.address_raw, 'ul. Władysława Bartoszewskiego 12');
  assert.equal(r.address.key, 'wladyslawa bartoszewskiego|12|');
  assert.equal(r.round, 3, 'III przetarg');
  assert.equal(r.starting_price_pln, 2500000, 'NOT 2201 — the 07.02.2017 citation date must not be misread as an amount');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.land_area_m2, 854, '0,0854 ha plot -> 854 m², kept out of the zł/m² field (a building has no usable-unit area here)');
});

const RESULT_MIXED_ROUNDS_14478 = `
 1.    23.06.2026 r.           III przetarg   nieruchomość niezabudowana położona w Szczecinku przy ul. Modrzewiowej,                                                  100.000,00                    przetarg zakończył się wynikiem
        Urząd Miasta               ustny      oznaczona numerem działki 454/12 o pow. 866 m2 w obrębie 18, przeznaczona                                                                               negatywnym - nikt nie wpłacił
         Szczecinek           nieograniczony  w miejscowym planie zagospodarowania przestrzennego „Pilska-4" pod zabudowę                                                                                 wymaganego wadium
 4.    23.06.2026 r.           IV przetarg    nieruchomość niezabudowana położona w Szczecinku przy ul. Konstantego Ildefonsa                                          110.000,00                    przetarg zakończył się wynikiem
       Urząd Miasta               ustny       Gałczyńskiego, oznaczona numerem działki 341/17 o pow. 1001 m2 w obrębie 15,                                                                            negatywnym - nikt nie wpłacił
        Szczecinek            nieograniczony  przeznaczona w miejscowym planie zagospodarowania przestrzennego „Marcelin-1" pod                                                                           wymaganego wadium
podaje do publicznej wiadomości informację o wyniku przetargu.`;

test('parseResultDoc: rounds III and IV in the SAME PDF (14478) are read per-row, not shared', () => {
  const recs = parseResultDoc(RESULT_MIXED_ROUNDS_14478, '2026-06-23', 'https://bip.szczecinek.pl/attachments/download/14478');
  assert.equal(recs.length, 2);
  const r3 = recs.find((r) => r.dzialka_nr === '454/12');
  const r4 = recs.find((r) => r.dzialka_nr === '341/17');
  assert.equal(r3.round, 3);
  assert.equal(r4.round, 4);
  assert.equal(r3.outcome, 'unsold');
  assert.equal(r4.outcome, 'unsold');
});

test('parseResultDoc / isResultNotice: an announcement is not a result notice', () => {
  assert.equal(isResultNotice(ANN_FLAT_NARUTOWICZA), false);
  assert.deepEqual(parseResultDoc(ANN_FLAT_NARUTOWICZA, null, 'u'), []);
});

// ------------------------------------------------------------- HTML extraction

test('extractBodyText: pulls the <section class="wysiwyg"> body, strips tags/entities', () => {
  const html = `<html><body><section class="wysiwyg" aria-labelledby="content-header">
    <div><p style="text-align: left;">Cena wywoławcza &ndash; 130.000,00 z&#322; netto<br /><br />pow. 29,49 m&sup2;</p></div>
  </section><section class="content_legal"><h2>Metryczka</h2></section></body></html>`;
  const text = extractBodyText(html);
  assert.ok(text.includes('Cena wywoławcza – 130.000,00'), 'entity-decoded en-dash');
  assert.ok(text.includes('29,49 m²'), 'sup2 entity decoded to ²');
  assert.ok(!text.includes('Metryczka'), 'the Metryczka/content_legal section is excluded');
});
