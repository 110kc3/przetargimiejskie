// Jarocin parser tests. Fixtures are condensed-but-faithful copies of the
// REAL born-digital text extracted (pdftotext -layout) from live PDFs on
// bip2.wokiss.pl/jarocin, fetched 2026-07-11 from this Pi's Polish
// residential IP. Long non-load-bearing boilerplate (the multi-paragraph
// legal-basis preamble, RODO clause, wadium-handling procedure, notarial-cost
// warnings) is trimmed; every line that feeds a parsed field (round, address /
// parcel, area, cena wywoławcza, cena osiągnięta, nabywca, date, outcome) is
// kept VERBATIM, including the source's own spacing and "netto + 23% VAT" /
// "zł brutto" tails.
//
// Groundtruth (hand-verified against the live PDFs):
//   Flat ANNOUNCE — ogloszenie-przetarg-lokal-konstytucji-17.03.2025.pdf
//     (bip2.wokiss.pl/jarocin ...przetargi-w-roku-2025.html?pid=21054):
//     Os. Konstytucji 3 Maja 20/17, lokal mieszkalny nr 17, 68,30 m²,
//     round III (word "TRZECI"), cena wywoławcza 320.800,00 zł,
//     auction 8 maja 2025 (word-month date). [The 3rd przetarg was later
//     ODWOŁANY — that cancellation is a separate pid the crawler skips by
//     title, so it never reaches the parser.]
//   Result SOLD — wynik-przetargu-dz.-592-42-jarocin.pdf (?pid=21132):
//     Jarocin, ul. St. Mikołajczyka, dz. nr 592/42, 0,0188 ha (=188 m²),
//     round I (word "pierwszy"), cena wywoławcza 23.000, cena osiągnięta
//     23.230 (named buyer → sold), auction 20.03.2025 (numeric date).
//   Result UNSOLD — informacja-o-wyniku... Witaszyce (?pid=21612):
//     Witaszyce, ul. Słoneczna, dz. nr 1267/7, 0,2000 ha (=2000 m²),
//     round I, cena wywoławcza 251.300, "zakończył się wynikiem negatywnym"
//     (jedno wadium, niewstawienie się oferenta → unsold, no hammer price),
//     auction 29.05.2025.
//
// KIND is decided by classifyKind(BODY): the flat body carries "lokal
// mieszkalny nr 17" → mieszkalny (address-keyed); the two results carry
// "działka nr ..." → grunt (parcel-keyed). Neither the URL slug nor the title
// is trusted for kind.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  parseDateText,
  roundFromText,
  isCancellation,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/jarocin/parse.js';

// --------------------------------------------------------------- fixtures

const FLAT_ANN_TITLE =
  'Ogłoszenie trzeciego przetargu nieograniczonego na sprzedaż nieruchomości lokalowej położonej w Jarocinie Os. Konstytucji 3 Maja 20/17';

// pdftotext -layout output (condensed). The flat states its price as a bare
// table "Cena / <amount> zł brutto" (no "cena wywoławcza" label), its area as
// "Powierzchnia lokalu 68,30 m²", and its auction date on the "odbędzie się
// dnia" line with a Polish month word.
const FLAT_ANN_TEXT = `                                                 OGŁOSZENIE O PRZETARGU

Burmistrz Jarocina działając na podstawie art. 30 ust. 2 pkt 2 i 3 ustawy z dnia 8 marca 1990 r. o samorządzie gminnym
oraz w wykonaniu Uchwały Nr LVI/513/2021 Rady Miejskiej w Jarocinie z dnia 5 grudnia 2021 r. w sprawie wyrażenia
zgody na zbycie lokalu mieszkalnego nr 17 w budynku położonym w Jarocinie Os. Konstytucji 3 Maja

                                     OGŁASZA TRZECI PRZETARG USTNY NIEOGRANICZONY
                     na sprzedaż nieruchomości lokalowej położonej w Jarocinie Os. Konstytucji 3 Maja 20/17

                                                                                           Cena
                                                                                           320.800,00 zł brutto

         Położenie            Jarocin, Os. Konstytucji 3 Maja 20 lokal mieszkalny nr 17

                              Powierzchnia lokalu 68,30 m²

Przetarg odbędzie się dnia 8 maja 2025 r. o godz. 11:00 w Urzędzie Miejskim w Jarocinie`;

const RESULT_SOLD_TITLE =
  'Informacja o wyniku przetargu na sprzedaż nieruchomości położonej w Jarocinie przy ul. Stanisława Mikołajczyka';
const RESULT_SOLD_TEXT = `                                              INFORMACJA O WYNIKU PRZETARGU

                                               Burmistrz Jarocina informuje, że:

w dniu 20.03.2025 r. o godz. 11:00 w Urzędzie Miejskim w Jarocinie pok. 47 przeprowadzony
został pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości położonej
w Jarocinie przy ul. Stanisława Mikołajczyka, oznaczonej w ewidencji gruntów jako działka
nr 592/42 o pow. 0,0188 ha, zapisanej w KZ1J/00025766/5 na rzecz Gminy Jarocin.

                                     Cena wywoławcza nieruchomości w przetargu
                                     wynosiła 23.000,00 zł netto + 23% podatku VAT

              W przetargu uzyskano cenę w wysokości 23.230,00 zł netto + 23% podatku VAT

          Nabywcą nieruchomości wyłonionym w przetargu zostali Państwo Michał i Milena
                  Wróbel, zam. ul. Kazimierza Jagiellończyka 10, 63-200 Jarocin.

Jarocin, dnia 28.03.2025 r.`;

const RESULT_UNSOLD_TITLE =
  'Informacja o wyniku przetargu na sprzedaż nieruchomości położonej w Witaszycach przy ul. Słonecznej';
const RESULT_UNSOLD_TEXT = `                                        INFORMACJA O WYNIKU PRZETARGU

                                        Burmistrz Jarocina informuje, że:

w dniu 29.05.2025 r. o godz. 11:00 w Urzędzie Miejskim w Jarocinie pok. 47 przeprowadzony
został pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości położonej
w Witaszycach przy ul. Słonecznej, oznaczonej w ewidencji gruntów jako działka nr 1267/7
o pow. 0,2000 ha, zapisanej w KZ1J/00034169/6.

                          Cena wywoławcza nieruchomości w przetargu wynosiła:

                             251.300,00 zł + 23 % podatku od towarów i usług VAT

w wyznaczonym terminie wpłynęło jedno wadium, jednakże w związku z niewstawieniem się
oferenta na przetargu, przetarg na w/w nieruchomość zakończył się wynikiem negatywnym.

Jarocin, dnia 06.06.2025 r.`;

// -------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands + comma-grosze, space-thousands, million, junk', () => {
  assert.equal(parsePLN('320.800,00'), 320800);
  assert.equal(parsePLN('23.000,00'), 23000);
  assert.equal(parsePLN('2.323.300,00'), 2323300);
  assert.equal(parsePLN('251 300,00'), 251300);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: comma/dot decimals', () => {
  assert.equal(parseArea('68,30'), 68.3);
  assert.equal(parseArea('0,0188'), 0.0188);
  assert.equal(parseArea('0.2000'), 0.2);
});

test('parseDateText: Polish word-month AND numeric forms', () => {
  assert.equal(parseDateText('8 maja 2025 r.'), '2025-05-08');
  assert.equal(parseDateText('27 sierpnia 2025 r.'), '2025-08-27');
  assert.equal(parseDateText('w dniu 20.03.2025 r.'), '2025-03-20');
  assert.equal(parseDateText('29.05.2025'), '2025-05-29');
  assert.equal(parseDateText('brak daty'), null);
});

test('roundFromText: Polish ORDINAL words (dominant) and Roman fallback', () => {
  assert.equal(roundFromText('OGŁASZA TRZECI PRZETARG USTNY NIEOGRANICZONY'), 3);
  assert.equal(roundFromText('przeprowadzony został pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('Ogłoszenie o drugim przetargu ustnym'), 2);
  assert.equal(roundFromText('o wyniku czwartego przetargu'), 4);
  assert.equal(roundFromText('Informacja o wyniku I przetargu ustnego'), 1); // Roman
  assert.equal(roundFromText('Informacja o wyniku III przetargu'), 3);       // Roman
  // The Polish conjunction "i" (and) must NOT be misread as Roman 1.
  assert.equal(roundFromText('sprzedaż gruntów i nieruchomości gminnych'), null);
});

test('isCancellation: only an "odwołanie" notice is a cancellation', () => {
  assert.equal(isCancellation('Informacja o odwołaniu trzeciego przetargu ustnego nieograniczonego'), true);
  assert.equal(isCancellation(FLAT_ANN_TITLE), false);
  assert.equal(isCancellation(RESULT_SOLD_TITLE), false);
});

// ------------------------------------------------------- parseAnnouncement

test('parseAnnouncement: flat Os. Konstytucji 3 Maja 20/17 — mieszkalny from BODY, round III (word), bare "zł brutto" price, "Powierzchnia lokalu" area, word-month date', () => {
  const r = parseAnnouncement(FLAT_ANN_TEXT, FLAT_ANN_TITLE, 'https://bip2.wokiss.pl/jarocin/zasoby/przetargi/ogloszenie-przetarg-lokal-konstytucji-17.03.2025.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Konstytucji 3 Maja');
  assert.equal(r.address.building, '20');
  assert.equal(r.address.apt, '17');
  assert.equal(r.address.key, 'konstytucji 3 maja|20|17');
  assert.equal(r.area_m2, 68.3);
  assert.equal(r.starting_price_pln, 320800);
  assert.equal(r.auction_date, '2025-05-08');
  assert.equal(r.round, 3);
  assert.equal(r.dzialka_nr, null);
});

// --------------------------------------------------------- parseResultDoc

test('parseResultDoc: SOLD land result (ul. St. Mikołajczyka dz. 592/42) — grunt/parcel-keyed, round I (word), cena wywoławcza + achieved price, numeric date, obręb de-inflected Jarocinie→Jarocin', () => {
  const [r] = parseResultDoc(RESULT_SOLD_TEXT, null, 'https://bip2.wokiss.pl/jarocin/zasoby/przetargi/wynik-przetargu-dz.-592-42-jarocin.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address, null);
  assert.equal(r.dzialka_nr, '592/42');
  assert.equal(r.obreb, 'Jarocin');
  assert.equal(r.area_m2, 188); // 0,0188 ha × 10000
  assert.equal(r.starting_price_pln, 23000);
  assert.equal(r.final_price_pln, 23230);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-03-20');
  assert.equal(r.source_pdf, 'https://bip2.wokiss.pl/jarocin/zasoby/przetargi/wynik-przetargu-dz.-592-42-jarocin.pdf');
});

test('parseResultDoc: UNSOLD land result (Witaszyce dz. 1267/7) — "wynikiem negatywnym" → unsold, NO fabricated hammer price, obręb Witaszycach→Witaszyce', () => {
  const [r] = parseResultDoc(RESULT_UNSOLD_TEXT, null, 'https://x/unsold.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1267/7');
  assert.equal(r.obreb, 'Witaszyce');
  assert.equal(r.area_m2, 2000); // 0,2000 ha × 10000
  assert.equal(r.starting_price_pln, 251300);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak uczestników');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-05-29');
});

test('parseResultDoc: fallbackDate is used only when the body states no auction date', () => {
  const noDate = RESULT_SOLD_TEXT.replace(/w dniu 20\.03\.2025 r\./, 'w wyznaczonym dniu');
  const [r] = parseResultDoc(noDate, '2025-03-20', 'https://x/x.pdf');
  assert.equal(r.auction_date, '2025-03-20');
});

test('parseResultDoc: defensive gates — empty/null input, a non-result document, and a cancellation notice all return []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
  assert.deepEqual(parseResultDoc('Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż', null, 'x'), []);
  assert.deepEqual(
    parseResultDoc('Informacja o odwołaniu przetargu. Burmistrz Jarocina odwołuje przetarg ogłoszony na sprzedaż nieruchomości. wynikiem negatywnym', null, 'x'),
    [],
  );
});
