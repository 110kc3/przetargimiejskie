// Wołów parser tests. Fixtures are condensed-but-faithful copies of REAL page
// text fetched live from wolow.pl (verified 2026-07-11, from this Pi's Polish
// residential IP). Long non-load-bearing boilerplate (RODO/GDPR data-
// processing paragraph, generic wadium-handling procedure, notarial-cost
// warnings) is trimmed; every sentence that feeds a parsed field (address,
// area, price, date, round, kind) is kept verbatim. Pełczyn 26's fixture
// deliberately KEEPS the standing "Zastrzega się prawo odwołania przetargu"
// clause (present on every real announcement) as a regression fixture for a
// bug found during this build: it reads exactly like a cancellation to a
// loose body-wide scan ("odwołania" + "przetargu" both present) even though
// it just means the mayor RESERVES THE RIGHT to cancel, not that this
// specific auction WAS cancelled.
//
// Groundtruth (hand-verified against the live pages):
//   Pełczyn 26, lokal mieszkalny nr 2, 61,25 m², dz. nr 522/2:
//     round I   announce  wolow.pl/3475  cena wywoławcza 140 000 zł,
//                         auction 2026-01-13, published 2025-11-27
//     round II  announce  wolow.pl/3866  cena wywoławcza 130 000 zł,
//                         auction 2026-06-15, published 2026-04-27 — body
//                         self-reports "I przetarg przeprowadzono
//                         13.01.2026 r." (round I therefore CONFIRMED unsold,
//                         independent of round II ever being crawled)
//   Wołów, ul. Komuny Paryskiej 41/1, lokal mieszkalny nr 1, 39,47 m²:
//     round I  announce  wolow.pl/3909  cena wywoławcza 88 500 zł,
//                         auction 2026-06-30, published 2026-05-15 — the
//                         URL SLUG never says "lokal" (classifyKind on the
//                         BODY is what correctly resolves this to a flat)
//   Prawików, dz. nr 156/4 Am 1 (grunt, niezabudowana, 0,1296 ha = 1296 m²):
//     round II  announce wolow.pl/1100  cena wywoławcza 29 500 zł,
//                         auction 2021-12-16, published 2021-11-05
//     round III announce wolow.pl/1281  cena wywoławcza 28 000 zł,
//                         auction 2022-03-01 — body self-reports BOTH
//                         "I ... przeprowadzono 07.09.2021r." AND
//                         "a drugi 16.12.2022r." (note: the source's OWN
//                         round-III text disagrees with round II's own
//                         auction date by exactly one year — a genuine
//                         source typo, not a parser bug; this adapter never
//                         relies on that self-report for round II's date,
//                         only for confirming round I's)
//   Wołów, ul. Polna, dz. nr 8/12 Am 25 (grunt, niezabudowana, 0,1565 ha):
//     round I  announce  wolow.pl/801   cena wywoławcza 80 000 zł,
//                         auction 2021-08-18
//   Wołów, ul. Inwalidów Wojennych 40, dz. nr 170 Am 21 (zabudowana — a
//   whole built property, NOT a bare flat; area_m2 is the HOUSE's own
//   103,17 m², not the 712 m² plot):
//     round I  announce  wolow.pl/1544  cena wywoławcza 158 500 zł,
//                         auction 2022-08-11
//   Lubiąż, ul. Willmanna 17/3 (body sometimes spells it "17-3", hyphen not
//   slash — same flat, same wykaz — confirming the apartment must come from
//   the separate "Lokal ... nr N" match, never the street-number token):
//     wykaz             wolow.pl/3701  Cena nieruchomości 88 500 zł, no date
//     round I  announce wolow.pl/3537  cena wywoławcza 88 500 zł, auction
//                        date is a LITERAL BLANK TEMPLATE ("……..01.2026r.")
//                        on the live source — must resolve to null, not a
//                        fabricated guess
//   Wołów, ul. Marsz. J. Piłsudskiego 17, lokal niemieszkalny nr 1 (a
//   COMMERCIAL unit — must classify 'uzytkowy', not 'mieszkalny'):
//     wykaz             wolow.pl/1549  Cena nieruchomości 18 500 zł

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  roundFromTitle,
  isCancelled,
  extractArticleText,
  extractTitle,
  extractPublishedDate,
  parseAnnouncement,
  parseWykaz,
  parseResultDoc,
} from '../src/cities/wolow/parse.js';

// --------------------------------------------------------------- fixtures

// Wraps body prose in the real wolow.pl skyCMS (city-portal) page skeleton,
// confirmed live 2026-07-11: <h1 class="pageHeader">, content inside
// <div class="sub-page__content mt-4">, trailing boundary
// <footer class="sub-page__footer"> containing the "Data publikacji" span.
function pageHtml(title, bodyText, publishedDDMMYYYY) {
  return `<!doctype html><html><body>
<main class="sub-page" id="main">
<article class="container"><div class="row"><div class="col-lg-12 sub-page__container mb-5">
<section class="print-area">
<header class="sub-page__header mt-5 mb-1"><h1 class="pageHeader">${title}</h1></header>
<div class="sub-page__content mt-4">
<p>${bodyText}</p>
</div>
<footer class="sub-page__footer flex-wrap d-flex justify-content-between align-items-center">
<div class="user-create"><span class="pageDatetimeCreate"><span class="pageDatetimeCreatePhraseBefore">Data publikacji:</span>&nbsp;${publishedDDMMYYYY}</span></div>
</footer>
</section>
</div></div></article>
</main>
</body></html>`;
}

const PELCZYN1_TITLE =
  'I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego położonego w Pełczynie, Pełczyn 26';
const PELCZYN1_HTML = pageHtml(
  PELCZYN1_TITLE,
  `Zgodnie z art. 39 ust.1 i art. 40 ust.1 pkt.1 ustawy z dnia 21 sierpnia 1997 r.
o gospodarce nieruchomościami (Dz. U. z 2024r. poz. 1145 z zm.) Burmistrz Gminy
Wołów podaje do publicznej wiadomości ogłoszenie o I ustnym przetargu
nieograniczonym na sprzedaż lokalu mieszkalnego położonego w Pełczynie Pełczyn 26
Lokal mieszkalny nr 2 o pow. 61,25 m2 położony na pierwszym piętrze budynku
mieszkalnego składający się z: 2 pokoi, kuchni i WC znajdującego się na działce nr
522/2 o pow. 0,1606 ha. Forma zbycia – przeniesienie prawa własności. Cena
wywoławcza – 140.000,00 zł. Wadium –14.000,00 zł. Przetarg na sprzedaż ww.
nieruchomości odbędzie się 13.01.2026r. o godz. 12.00 w siedzibie Urzędu
Miejskiego w Wołowie (Rynek 34, sala sesyjna). Zastrzega się prawo odwołania
przetargu.`,
  '27-11-2025 08:44',
);

const PELCZYN2_TITLE =
  'II ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego położonego w Pełczynie, Pełczyn 26';
const PELCZYN2_HTML = pageHtml(
  PELCZYN2_TITLE,
  `Burmistrz Gminy Wołów podaje do publicznej wiadomości ogłoszenie o II ustnym
przetargu nieograniczonym na sprzedaż nieruchomości położonej w Pełczynie. I
przetarg przeprowadzono 13.01.2026 r. Pełczyn nr 26 Lokal mieszkalny nr 2 o pow.
61,25 m2 położony na pierwszym piętrze budynku mieszkalnego na działce nr 522/2 o
pow. 0,1606 ha. Forma zbycia – przeniesienie prawa własności. Cena wywoławcza –
130.000,00 zł Wadium –14.000,00 zł Przetarg na sprzedaż ww. nieruchomości
odbędzie się 15.06.2026 r. o godz. 10.00 w siedzibie Urzędu Miejskiego w Wołowie
(Rynek 34, sala sesyjna).`,
  '27-04-2026 11:11',
);

// Real gotcha: the URL slug for this one is
// "i-ustny-przetarg-nieograniczony-na-sprzedaz-nieruchomosci-polozonej-w-wolowie-..."
// — no "lokal" anywhere in it — yet the body is unambiguously a flat.
const KP41_TITLE =
  'I ustny przetarg nieograniczony na sprzedaż nieruchomości położonej w Wołowie, ul. Komuny Paryskiej 41, dz. nr 38/11 AM-28';
const KP41_HTML = pageHtml(
  KP41_TITLE,
  `Burmistrz Gminy Wołów podaje do publicznej wiadomości ogłoszenie o I ustnym
przetargu nieograniczonym na sprzedaż nieruchomości położonej w Wołowie. Wołów
ul. Komuny Paryskiej 41 Lokal mieszkalny nr 1 o pow. użytkowej 39,47 m2
składający się z dwóch pokoi, położony na parterze budynku mieszkalnego
wielorodzinnego na działce numer 38/11 AM 28 o pow. 0.0794 ha. Forma zbycia –
przeniesienie własności. Cena wywoławcza – 88.500,00 zł Wadium – 17.000,00 zł
Przetarg na sprzedaż ww. nieruchomości odbędzie się 30.06.2026 r. o godz. 10.00 w
siedzibie Urzędu Miejskiego w Wołowie (Rynek 34, sala sesyjna).`,
  '15-05-2026 11:28',
);

const POLNA_TITLE =
  'I ustny przetarg nieograniczony na sprzedaż nieruchomości położonej w Wołowie, ul. Polna, dz. nr 8/12, AM-25';
const POLNA_HTML = pageHtml(
  POLNA_TITLE,
  `Burmistrz Gminy Wołów podaje do publicznej wiadomości ogłoszenie o I ustnym
przetargu nieograniczonym na sprzedaż nieruchomości położonej w Wołowie. Wołów,
ul. Polna Działka niezabudowana nr 8/12 Am 25 o pow. 0,1565 ha. Forma zbycia –
przeniesienie własności Cena wywoławcza – 80.000,00 zł Wadium – 8.000,00 zł
Przetarg na sprzedaż ww. nieruchomości odbędzie się 18.08.2021 r. o godz. 10.00 w
siedzibie Urzędu Miejskiego w Wołowie (Rynek 34).`,
  '05-07-2021 09:00',
);

const PRAWIKOW2_TITLE =
  'II ustny przetarg nieograniczony na sprzedaż nieruchomości położonej w Prawikowie, dz. nr 156/4, AM-1';
const PRAWIKOW2_HTML = pageHtml(
  PRAWIKOW2_TITLE,
  `Burmistrz Gminy Wołów podaje do publicznej wiadomości ogłoszenie o II ustnym
przetargu nieograniczonym na sprzedaż nieruchomości położonej w Prawikowie. I
przetarg na sprzedaż nieruchomości przeprowadzono 07.09.2021r. Prawików Działka
niezabudowana nr 156/4 Am 1 o pow. 0,1296 ha. Forma zbycia – przeniesienie prawa
własności. Cena wywoławcza – 29.500,00 zł. Wadium – 3.000,00 zł. Przetarg na
sprzedaż ww. nieruchomości odbędzie się 16.12.2021r. o godz. 11.15 w siedzibie
Urzędu Miejskiego w Wołowie (Rynek 34, sala sesyjna).`,
  '05-11-2021 10:00',
);

const PRAWIKOW3_TITLE =
  'III ustny przetarg nieograniczony na sprzedaż nieruchomości położonej w Prawikowie, dz. nr 156/4, AM-1';
const PRAWIKOW3_HTML = pageHtml(
  PRAWIKOW3_TITLE,
  `Burmistrz Gminy Wołów podaje do publicznej wiadomości ogłoszenie o III ustnym
przetargu nieograniczonym na sprzedaż nieruchomości położonej w Prawikowie. I
przetarg na sprzedaż nieruchomości przeprowadzono 07.09.2021r., a drugi
16.12.2022r. Prawików Działka niezabudowana nr 156/4 Am 1 o pow. 0,1296 ha. Forma
zbycia – przeniesienie prawa własności. Cena wywoławcza – 28.000,00 zł. Wadium –
2.800,00 zł. Przetarg na sprzedaż ww. nieruchomości odbędzie się 01.03.2022r. o
godz. 11.00 w siedzibie Urzędu Miejskiego w Wołowie (Rynek 34, sala sesyjna).`,
  '19-01-2022 09:00',
);

const INWALIDOW_TITLE =
  'I ustny przetarg nieograniczony na sprzedaż nieruchomości położonej w Wołowie, ul. Inwalidów Wojennych 40, dz. nr 170, AM-21';
const INWALIDOW_HTML = pageHtml(
  INWALIDOW_TITLE,
  `Burmistrz Gminy Wołów podaje do publicznej wiadomości ogłoszenie o I ustnym
przetargu nieograniczonym na sprzedaż nieruchomości położonej w Wołowie. Wołów
ul. Inwalidów Wojennych 40, nieruchomość zabudowana budynkiem mieszkalnym i
gospodarczym położona na działce numer 170 Am 21 o pow. 712 m², dla której
prowadzona jest Księga Wieczysta numer WR1L/00025081/3 Nieruchomość zabudowana:
- budynkiem mieszkalnym o powierzchni użytkowej 103,17 m², - budynkiem
gospodarczym o powierzchni zabudowy 29 m². Forma zbycia – przeniesienie prawa
własności. Cena wywoławcza – 158.500,00 zł. Wadium – 15.850,00 zł. Przetarg na
sprzedaż ww. nieruchomości odbędzie się 11.08.2022 r. o godz. 12.00 w siedzibie
Urzędu Miejskiego w Wołowie (Rynek 34, sala sesyjna).`,
  '22-06-2022 08:00',
);

// Real source typo: the day-of-month is a literal run of dots on the live
// page, twice ("odbędzie się ……..01.2026r." / "wniesione do ………..01.2026r.").
const WILLMANNA1_TITLE =
  'Ogłoszenie o I ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego położonego w Lubiążu, ul. Willmanna 17-3, działka nr 220/1';
const WILLMANNA1_HTML = pageHtml(
  WILLMANNA1_TITLE,
  `Burmistrz Gminy Wołów podaje do publicznej wiadomości ogłoszenie o I ustnym
przetargu nieograniczonym na sprzedaż lokalu mieszkalnego położonego w Lubiążu.
Lubiąż ul. Willmanna 17-3 Działka nr 220/1 o pow. 0,1305 ha, Lokal mieszkalny nr
3, położony na I piętrze budynku mieszkalnego, wielorodzinnego, składający się
z: pokoju, kuchni i łazienki o łącznej powierzchni użytkowej 32,44 m 2 Forma
zbycia – przeniesienie prawa własności. Cena wywoławcza – 88.500,00 zł. Wadium –
8.850,00 zł. Przetarg na sprzedaż ww. nieruchomości odbędzie się ……..01.2026r. o
godz. 12.00 w siedzibie Urzędu Miejskiego w Wołowie (Rynek 34, sala sesyjna).
Wadium musi zostać wniesione do ………..01.2026r.`,
  '12-12-2025 11:43',
);

const WILLMANNA_WYKAZ_TITLE =
  'Wykaz nieruchomości przeznaczonych do sprzedaży - Lubiąż, ul. M.L. Willmanna 17/3, dz. nr 220/1';
const WILLMANNA_WYKAZ_HTML = pageHtml(
  WILLMANNA_WYKAZ_TITLE,
  `Zgodnie z art. 35 ustawy dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
Burmistrz Gminy Wołów podaje do publicznej wiadomości wykaz nieruchomości
przeznaczonych do sprzedaży. Lubiąż ul. Michała Leopolda Willmanna 17/3 Działka
nr 220/1 o pow. 0,1305 ha. Lokal mieszkalny nr 3, o powierzchni użytkowej 32,44
m2, położony na pierwszym piętrze budynku mieszkalnego, wielorodzinnego,
składający się z: pokoju, kuchni i łazienki. Forma zbycia: przeniesienie
własności Cena nieruchomości – 88.500,00 zł Wykaz zostaje wywieszony na okres 21
dni na tablicy ogłoszeń w Urzędzie Miejskim w Wołowie.`,
  '26-01-2026 09:00',
);

const COMMERCIAL_WYKAZ_TITLE =
  'Wykaz nieruchomości przeznaczonych do sprzedaży - Wołów, ul. Marsz. J. Piłsudskiego 17, lokal niemieszkalny 1, dz. nr 176/9 Am-28';
const COMMERCIAL_WYKAZ_HTML = pageHtml(
  COMMERCIAL_WYKAZ_TITLE,
  `Zgodnie z art. 35 ustawy dnia 21 sierpnia 1997 r. Burmistrz Gminy Wołów podaje
do publicznej wiadomości wykaz nieruchomości przeznaczonych do sprzedaży. Wołów,
ul. Marsz. J. Piłsudskiego 17- lokal niemieszkalny nr 1 przeznaczony do
sprzedaży w trybie przetargu nieograniczonego Dz. nr 176/9 Am 28 pow. 0,0446 ha.
Lokal niemieszkalny nr 1 o pow. 14,90 m 2 położony na poddaszu budynku. Forma
zbycia – przeniesienie własności. Cena nieruchomości – 18.500,00 zł. Wykaz
zostaje wywieszony na okres 21 dni na tablicy ogłoszeń w Urzędzie Miejskim w
Wołowie.`,
  '28-06-2022 10:00',
);

// -------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands, dot-thousands+grosze, and the two documented source typos', () => {
  assert.equal(parsePLN('140.000,00'), 140000);
  assert.equal(parsePLN('136 350,00'), 136350);
  assert.equal(parsePLN('53.197.50'), 53197); // mistyped extra dot instead of comma
  assert.equal(parsePLN('23.290,00-'), 23290); // trailing-dash typo
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: comma and dot decimal separators', () => {
  assert.equal(parseArea('0,1296'), 0.1296);
  assert.equal(parseArea('0.0794'), 0.0794);
  assert.equal(parseArea('61,25'), 61.25);
});

test('roundFromTitle: declension-tolerant ("ustny przetarg" subject case vs "ustnym przetargu" object case)', () => {
  assert.equal(roundFromTitle(PELCZYN1_TITLE), 1);
  assert.equal(roundFromTitle(PELCZYN2_TITLE), 2);
  assert.equal(roundFromTitle(PRAWIKOW3_TITLE), 3);
  assert.equal(roundFromTitle(WILLMANNA1_TITLE), 1); // "ustnym przetargu" — object case
});

test('isCancelled: the standing "Zastrzega się prawo odwołania przetargu" clause (present on every real announcement) is NOT a cancellation', () => {
  // Regression: this exact substring pairing ("odwołania" + "przetargu")
  // false-positived against a naive body-wide scan during this build.
  assert.equal(isCancelled(PELCZYN1_TITLE), false);
  assert.equal(isCancelled('Ogłoszenie o odwołanym przetargu Wołów ul. Spacerowa'), true);
  assert.equal(isCancelled('Ogłoszenie o odwołaniu przetargu Gliniany dz. nr 729 AM-1'), true);
  assert.equal(isCancelled('Unieważnienie wykazu Lubiąż ul. Willmanna 17/3'), true);
});

test('extractArticleText / extractTitle / extractPublishedDate: real skyCMS city-portal container classes', () => {
  const text = extractArticleText(PELCZYN1_HTML);
  assert.ok(text.includes('140.000,00 zł'), `expected price in: ${text.slice(0, 200)}`);
  assert.equal(extractTitle(PELCZYN1_HTML), PELCZYN1_TITLE);
  assert.equal(extractPublishedDate(PELCZYN1_HTML), '2025-11-27');
});

// ------------------------------------------------------------- parseAnnouncement (flats)

test('parseAnnouncement: Pełczyn 26 round I (wolow.pl/3475) — rural village+number address, no "ul." prefix', () => {
  const r = parseAnnouncement(PELCZYN1_HTML, 'https://wolow.pl/3475/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Pełczyn');
  assert.equal(r.address.building, '26');
  assert.equal(r.address.apt, '2');
  assert.equal(r.address.key, 'pelczyn|26|2');
  assert.equal(r.area_m2, 61.25);
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.auction_date, '2026-01-13');
  assert.equal(r.round, 1);
  assert.equal(r.cancelled, false);
  assert.equal(r.dzialka_nr, '522/2');
});

test('parseAnnouncement: Pełczyn 26 round II (wolow.pl/3866) — same property key, price dropped 140k->130k', () => {
  const r = parseAnnouncement(PELCZYN2_HTML, 'https://wolow.pl/3866/x.html');
  assert.equal(r.address.key, 'pelczyn|26|2');
  assert.equal(r.area_m2, 61.25);
  assert.equal(r.starting_price_pln, 130000);
  assert.equal(r.auction_date, '2026-06-15');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: ul. Komuny Paryskiej 41/1 (wolow.pl/3909) — classified a flat from BODY despite a "lokal"-free URL slug; abbreviated "pow. użytkowej" area form', () => {
  const r = parseAnnouncement(KP41_HTML, 'https://wolow.pl/3909/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Komuny Paryskiej');
  assert.equal(r.address.building, '41');
  assert.equal(r.address.apt, '1');
  assert.equal(r.area_m2, 39.47);
  assert.equal(r.starting_price_pln, 88500);
  assert.equal(r.auction_date, '2026-06-30');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: Willmanna 17-3 (wolow.pl/3537) — hyphen bldg/apt separator resolved via the separate "Lokal...nr" match; blank-template date -> null, not fabricated', () => {
  const r = parseAnnouncement(WILLMANNA1_HTML, 'https://wolow.pl/3537/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Willmanna');
  assert.equal(r.address.building, '17');
  assert.equal(r.address.apt, '3');
  assert.equal(r.area_m2, 32.44);
  assert.equal(r.starting_price_pln, 88500);
  assert.equal(r.auction_date, null);
  assert.equal(r.round, 1);
});

// --------------------------------------------------------- parseAnnouncement (land/house)

test('parseAnnouncement: ul. Polna dz. nr 8/12 (wolow.pl/801) — LAND classifies "grunt", not "garaz" (bug-class guard: this doc never mentions garaż)', () => {
  const r = parseAnnouncement(POLNA_HTML, 'https://wolow.pl/801/x.html');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address, null);
  assert.equal(r.dzialka_nr, '8/12');
  assert.equal(r.obreb, 'Wołów');
  assert.equal(r.area_m2, 1565); // 0,1565 ha x 10000
  assert.equal(r.starting_price_pln, 80000);
  assert.equal(r.auction_date, '2021-08-18');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: Prawików dz. nr 156/4 round II (wolow.pl/1100) — self-report sentence between locative and nominative town mentions does not corrupt obręb', () => {
  const r = parseAnnouncement(PRAWIKOW2_HTML, 'https://wolow.pl/1100/x.html');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '156/4');
  assert.equal(r.obreb, 'Prawików');
  assert.equal(r.area_m2, 1296); // 0,1296 ha x 10000
  assert.equal(r.starting_price_pln, 29500);
  assert.equal(r.auction_date, '2021-12-16');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: Prawików dz. nr 156/4 round III (wolow.pl/1281) — self-report sentence lists TWO prior dates, own price dropped 29.5k->28k', () => {
  const r = parseAnnouncement(PRAWIKOW3_HTML, 'https://wolow.pl/1281/x.html');
  assert.equal(r.dzialka_nr, '156/4');
  assert.equal(r.obreb, 'Prawików');
  assert.equal(r.area_m2, 1296);
  assert.equal(r.starting_price_pln, 28000);
  assert.equal(r.auction_date, '2022-03-01');
  assert.equal(r.round, 3);
});

test('parseAnnouncement: ul. Inwalidów Wojennych 40 (wolow.pl/1544) — a whole BUILT property ("nieruchomość zabudowana") classifies "zabudowana", address-keyed, area is the HOUSE\'s own 103,17 m² not the 712 m² plot', () => {
  const r = parseAnnouncement(INWALIDOW_HTML, 'https://wolow.pl/1544/x.html');
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.street, 'Inwalidów Wojennych');
  assert.equal(r.address.building, '40');
  assert.equal(r.address.apt, null);
  assert.equal(r.area_m2, 103.17);
  assert.equal(r.starting_price_pln, 158500);
  assert.equal(r.auction_date, '2022-08-11');
  assert.equal(r.dzialka_nr, '170');
});

// --------------------------------------------------------------------- parseWykaz

test('parseWykaz: Lubiąż ul. Willmanna 17/3 (wolow.pl/3701) — clean address, "Cena nieruchomości" price, NO auction date (pre-announcement)', () => {
  const w = parseWykaz(WILLMANNA_WYKAZ_HTML, 'https://wolow.pl/3701/x.html');
  assert.equal(w.kind, 'mieszkalny');
  assert.equal(w.address.street, 'Michała Leopolda Willmanna');
  assert.equal(w.address.building, '17');
  assert.equal(w.address.apt, '3');
  assert.equal(w.starting_price_pln, 88500);
  assert.equal(w.area_m2, 32.44);
  assert.equal(w.published_date, '2026-01-26');
  assert.ok(!('auction_date' in w));
});

test('parseWykaz: ul. Marsz. J. Piłsudskiego 17, lokal niemieszkalny (wolow.pl/1549) — classifies "uzytkowy" (commercial), not "mieszkalny"', () => {
  const w = parseWykaz(COMMERCIAL_WYKAZ_HTML, 'https://wolow.pl/1549/x.html');
  assert.equal(w.kind, 'uzytkowy');
  assert.equal(w.address.street, 'Marsz. J. Piłsudskiego');
  assert.equal(w.address.building, '17');
  assert.equal(w.starting_price_pln, 18500);
  assert.equal(w.area_m2, 14.9);
});

// ----------------------------------------------------------------- parseResultDoc

test('parseResultDoc: Pełczyn 26 round I (wolow.pl/3475) forwarded as CONFIRMED-superseded (round II exists) — real price/area/date, outcome unsold, no fabricated final price', () => {
  const [r] = parseResultDoc(PELCZYN1_HTML, null, 'https://wolow.pl/3475/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'pelczyn|26|2');
  assert.equal(r.area_m2, 61.25);
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'superseded_by_next_round');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-01-13');
  assert.equal(r.source_pdf, 'https://wolow.pl/3475/x.html');
});

test('parseResultDoc: Prawików dz. nr 156/4 round II (wolow.pl/1100) forwarded as CONFIRMED-superseded (round III exists) — parcel-keyed, real price/date', () => {
  const [r] = parseResultDoc(PRAWIKOW2_HTML, null, 'https://wolow.pl/1100/x.html');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '156/4');
  assert.equal(r.obreb, 'Prawików');
  assert.equal(r.starting_price_pln, 29500);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2021-12-16');
});

test('parseResultDoc: a cancelled-titled doc returns [] (defensive backstop; crawl.js is the primary filter)', () => {
  const cancelledHtml = pageHtml(
    'Ogłoszenie o odwołanym przetargu Wołów ul. Spacerowa',
    'Burmistrz Gminy Wołów odwołuje przetarg ogłoszony na sprzedaż nieruchomości.',
    '01-01-2022 09:00',
  );
  assert.deepEqual(parseResultDoc(cancelledHtml, null, 'https://wolow.pl/1625/x.html'), []);
});

test('parseResultDoc: empty/null input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
