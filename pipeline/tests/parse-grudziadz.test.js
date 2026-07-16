// Grudziądz parser tests — groundtruthed against REAL fixtures (2026-07-16).
//
// Fixtures captured from:
//   Board:  https://bip.grudziadz.pl/artykul/sprzedaz-nieruchomosci
//   Announcement 1 (single lot, "złotych" spelled out):
//     https://bip.grudziadz.pl/artykul/prezydent-grudziadza-oglasza-pierwszy-przetarg-ustny-nieograniczony-organizowany-w-dniu-6-maja-1
//     .doc: https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/30928/4a-ogloszenie-o-i-przetargu.doc
//   Announcement 2 (two lots in one table, "złotych" spelled out):
//     https://bip.grudziadz.pl/artykul/prezydent-grudziadza-oglasza-pierwsze-przetargi-ustne-nieograniczone-organizowane-w-dniu-29-cze
//     .doc: https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/31408/2-ogloszenie.doc
//   Announcement 3 (single lot, abbreviated "zł" + abbreviated "pow. uż." area
//   label — a DIFFERENT format than 1/2, confirming both variants are handled):
//     https://bip.grudziadz.pl/artykul/prezydent-grudziadza-oglasza-piaty-przetarg-ustny-nieograniczony-organizowany-w-dniu-2-czerwca
//     .doc: https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/31211/2-regulamin-przetargu.doc
//   Result notice (the ONLY result-of-a-concluded-auction notice found across
//   the ENTIRE ~620-row board archive, 2008-2026 — a scanned PDF, OCR'd via
//   tesseract -l pol; a negative/unsold outcome, so no achieved-price fixture
//   exists on this board yet):
//     https://bip.grudziadz.pl/artykul/informacja-z-przeprowadzonych-przetargow-na-sprzedaz-nieruchomosci-stanowiacych-wlasnosc-skarbu-4
//     .pdf: https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/5850/18_09_2024_11_13_52_20240918080804683.pdf
//
// The .doc fixtures were converted via `catdoc -a -d utf-8` (core/doc-text.js's
// exact conversion path) and are embedded here TRUNCATED to a contiguous real
// prefix (through the operative "odbędzie/odbędą się w dniu" sentence) — the
// remaining ~200 lines of each real document are generic wadium/procedure
// boilerplate not read by the parser. The result fixture is the FULL real OCR
// output (short — one page).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseBoardTable, attachmentUrlFromDetail, isCancelled, isResultNotice } from '../src/cities/grudziadz/crawl.js';
import {
  parseAnnouncement,
  parseResultDoc,
  roundFromText,
  auctionDateFromText,
  priceFromText,
  areaFromText,
} from '../src/cities/grudziadz/parse.js';

// ── Board table parser ───────────────────────────────────────────────────────
//
// Condensed but structurally faithful copy of the real board HTML (2026-07-16):
// the site's own markup leaves each row's <a> anchor UNCLOSED (no </a> before
// </td>) — real, live-verified, not a fixture typo.

const BOARD_HTML = `
<div>
<table class="table table-striped lista_artykuly" width="100%">
<thead>
<tr>
<th>Tytuł</th>
<th style="width: 25%">Data publikacji</th>
</tr>
</thead>
<tbody>
<tr>
<td><a href="/artykul/prezydent-grudziadza-oglasza-pierwszy-przetarg-ustny-nieograniczony-organizowany-w-dniu-6-maja-1">PREZYDENT GRUDZIĄDZA ogłasza
pierwszy przetarg ustny nieograniczony, organizowany w dniu  6 maja 2026r. na sprzedaż niezabudowanej nieruchomości, stanowiącej własność gminy – miasto Grudziądz przy ul. Libelta 10A lokal mieszkalny nr 5</td>
<td>2026-04-01 13:05:34</td>
</tr>
<tr>
<td><a href="/artykul/prezydent-grudziadza-odwoluje-trzeci-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkaln">Prezydent Grudziądza ODWOŁUJE trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego, stanowiącego własność gminy-miasto Grudziądz, położonego w budynku przy ulicy Dworcowej 8</td>
<td>2025-12-23 12:20:51</td>
</tr>
<tr>
<td><a href="/artykul/informacja-z-przeprowadzonych-przetargow-na-sprzedaz-nieruchomosci-stanowiacych-wlasnosc-skarbu-4">INFORMACJA Z PRZEPROWADZONYCH PRZETARGÓW NA SPRZEDAŻ NIERUCHOMOŚCI STANOWIĄCYCH WŁASNOŚĆ SKARBU PAŃSTWA  przy ulicy  Libelta</td>
<td>2024-09-18 11:13:52</td>
</tr>
<tr>
<td><a href="/artykul/informacja-z-przeprowadzonej-kwalifikacji-do-uczestnictwa-w-ogloszonym-przez-prezydenta-grudzia-22">Informacja z przeprowadzonej kwalifikacji do uczestnictwa w ogłoszonym przez Prezydenta Grudziądza na dzień 30 czerwca 2026 r., na sprzedaż należącego do Skarbu Państwa udziału wynoszącego 120/4320 części</td>
<td>2026-06-24 13:56:48</td>
</tr>
</tbody>
</table>
</div>
`;

test('parseBoardTable: extracts all 4 rows from the board HTML', () => {
  const rows = parseBoardTable(BOARD_HTML);
  assert.equal(rows.length, 4);
});

test('parseBoardTable: title, detailUrl (relative → absolute), publishedDate — mieszkalny row', () => {
  const rows = parseBoardTable(BOARD_HTML);
  const r = rows[0];
  assert.equal(
    r.detailUrl,
    'https://bip.grudziadz.pl/artykul/prezydent-grudziadza-oglasza-pierwszy-przetarg-ustny-nieograniczony-organizowany-w-dniu-6-maja-1',
  );
  assert.match(r.title, /Libelta 10A lokal mieszkalny nr 5/);
  assert.equal(r.publishedDate, '2026-04-01');
});

test('parseBoardTable: whitespace/newlines inside the title are collapsed', () => {
  const rows = parseBoardTable(BOARD_HTML);
  assert.ok(!/\n/.test(rows[0].title));
  assert.match(rows[0].title, /^PREZYDENT GRUDZIĄDZA ogłasza pierwszy przetarg/);
});

test('parseBoardTable: empty/unrelated HTML returns empty array', () => {
  assert.deepEqual(parseBoardTable('<html><body>nic</body></html>'), []);
});

// ── Row routing predicates ───────────────────────────────────────────────────

test('isCancelled: true for an ODWOŁUJE row', () => {
  assert.equal(
    isCancelled('Prezydent Grudziądza ODWOŁUJE trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'),
    true,
  );
});

test('isCancelled: false for a normal announcement', () => {
  assert.equal(isCancelled('PREZYDENT GRUDZIĄDZA ogłasza pierwszy przetarg ustny nieograniczony'), false);
});

test('isResultNotice: true for "INFORMACJA Z PRZEPROWADZONYCH PRZETARGÓW"', () => {
  assert.equal(
    isResultNotice('INFORMACJA Z PRZEPROWADZONYCH PRZETARGÓW NA SPRZEDAŻ NIERUCHOMOŚCI STANOWIĄCYCH WŁASNOŚĆ SKARBU PAŃSTWA'),
    true,
  );
});

test('isResultNotice: false for the much more common "kwalifikacji" eligibility notice (real title)', () => {
  // Real board title — a pre-auction bidder-qualification notice for a
  // RESTRICTED auction, NOT a result. "przeprowadzonej" here is immediately
  // followed by "kwalifikacji", never by "przetargu" — this is the exact
  // wording that must NOT match isResultNotice (21 of these exist on the
  // board vs. 1 real result notice).
  assert.equal(
    isResultNotice(
      'Informacja z przeprowadzonej kwalifikacji do uczestnictwa w ogłoszonym przez Prezydenta Grudziądza na dzień 30 czerwca 2026 r.',
    ),
    false,
  );
});

// ── attachmentUrlFromDetail ───────────────────────────────────────────────────
//
// Real detail-page markup (2026-07-16):
//   Announcement: <a href="/pliki/grudziadz/zalaczniki/30928/4a-ogloszenie-o-i-przetargu.doc" class="download" id="34161" download="">4a. Ogłoszenie o I przetargu  (DOC, 129.50Kb)</a>
//   Result:       <a href="/pliki/grudziadz/zalaczniki/5850/18_09_2024_11_13_52_20240918080804683.pdf" class="download" id="7277" download="">18 09 2024 11 13 52 20240918080804683 (PDF, 203.40Kb)</a>

test('attachmentUrlFromDetail: extracts .doc href from an announcement page', () => {
  const html =
    '<a href="/pliki/grudziadz/zalaczniki/30928/4a-ogloszenie-o-i-przetargu.doc" class="download" id="34161" download="">4a. Ogłoszenie o I przetargu  (DOC, 129.50Kb)</a>';
  assert.equal(
    attachmentUrlFromDetail(html),
    'https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/30928/4a-ogloszenie-o-i-przetargu.doc',
  );
});

test('attachmentUrlFromDetail: extracts .pdf href from a result-notice page', () => {
  const html =
    '<a href="/pliki/grudziadz/zalaczniki/5850/18_09_2024_11_13_52_20240918080804683.pdf" class="download" id="7277" download="">18 09 2024 11 13 52 20240918080804683 (PDF, 203.40Kb)</a>';
  assert.equal(
    attachmentUrlFromDetail(html),
    'https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/5850/18_09_2024_11_13_52_20240918080804683.pdf',
  );
});

test('attachmentUrlFromDetail: returns null when there is no download link', () => {
  assert.equal(attachmentUrlFromDetail('<a href="/artykul/foo">no attachment here</a>'), null);
  assert.equal(attachmentUrlFromDetail(''), null);
});

// ── Announcement .doc parser: single lot, "złotych" spelled out ─────────────
//
// REAL catdoc output (truncated after the operative date sentence — see file
// header) from ul. Libelta 10A/5's announcement .doc.
// Ground truth (verified from the document):
//   address:            'Libelta 10A/5'
//   area_m2:            45.20   (from "o powierzchni użytkowej 45,20 m2")
//   starting_price_pln: 109000  (from "109.000,00 złotych")
//   auction_date:       '2026-05-06'
//   round:              1       (bare "pierwszy przetarg", no history clause)

const ANN_LIBELTA = `

PREZYDENT GRUDZIĄDZA ogłasza

pierwszy przetarg ustny nieograniczony, organizowany w dniu  6 maja
2026r.

na  sprzedaż lokalu mieszkalnego, stanowiącego własność gminy –
miasto Grudziądz



Lp.	Położenie

Nieruchomości

w Grudziądzu

Oznaczenie

księgi  wieczystej 	Powierzchnia nieruchomości gruntowej

Opis

nieruchomości

Cena

wywoławcza

Wysokość wadium



1.



ul. Libelta 10A

lokal mieszkalny nr 5



Nieruchomość gruntowa

TO1U/00018916/4



Działki nr 108/2, 122

obręb 108

łączna pow. 0,0748 ha

Lokal mieszkalny nr 5 położony na poddaszu budynku (III kondygnacji) o
powierzchni użytkowej 45,20 m2 ( pow. łączna 60,75m2), składający
się z dwóch pokoi, kuchni, łazienki i przedpokoju oraz pomieszczenia
przynależnego: piwnicy nr 3 o pow. 15,55 m2, wraz z udziałem
wynoszącym 6075/95485 części we współwłasności gruntu

i w częściach wspólnych budynku mieszkalnego,  które nie służą
wyłącznie do użytku właścicieli  poszczególnych lokali. Lokal
wyposażony jest

w instalacje: wodociągową, kanalizacyjną, elektroenergetyczną i
gazową.

Na podłogach wykładziny. Ściany malowane lub pokryte tapetami lub
panelami PCV. Stolarka okienna wykonana

z PCV i drewna, drzwi drewniane. Ogrzewanie lokalu piecem kaflowym.
Lokal

w niskim standardzie wykończenia.

109.000,00 złotych



11.000,00 złotych

UWAGI!

Dla terenu, na którym położona jest przedmiotowa nieruchomość gmina
– miasto Grudziądz nie posiada  miejscowego planu zagospodarowania
przestrzennego. Studium uwarunkowań i kierunków zagospodarowania
przestrzennego miasta Grudziądza (Uchwała Nr LXXVI/655/23 Rady
Miejskiej Grudziądza z dnia 31.05.2023 r.), dla terenu, na którym
położona jest przedmiotowa nieruchomość została ustalona funkcja
zabudowy mieszkaniowej wielorodzinnej.

Budynek mieszkalnym wielorodzinny wybudowany w 1942r. Budynek jest
podpiwniczony. Składa się z dwóch kondygnacji nadziemnych z poddaszem
częściowo użytkowym. Ściany zewnętrzne i wewnętrzne wykonane w
technologii tradycyjnej murowanej. Ściany działowe murowane z cegły
czerwonej oraz z płyt kartonowo - gipsowych. Kominy wykonane z cegły.
Stropy między piętrowe drewniane, żelbetonowe nad piwnicą. Dach
konstrukcji drewnianej pokryty dachówką ceramiczną karpiówką.

Lokal mieszkalny nr 5 położony jest

na poddaszu budynku (III kondygnacji) o powierzchni użytkowej 45,20 m2,
składający się z dwóch pokoi, kuchni, łazienki i przedpokoju oraz
pomieszczenia przynależnego: piwnicy nr 3 o pow. 15,55 m2, wraz z
udziałem wynoszącym 6075/95485 części we współwłasności gruntu i
w częściach wspólnych budynku mieszkalnego,  które nie służą
wyłącznie do użytku właścicieli  poszczególnych lokali. Lokal
wyposażony jest w instalacje: wodociągową, kanalizacyjną,
elektroenergetyczną i gazową. Na podłogach wykładziny. Ściany
malowane lub pokryte tapetami lub panelami PCV. Stolarka okienna
wykonana z PCV i drewna, drzwi drewniane. Ogrzewanie lokalu piecem
kaflowym. Lokal w niskim standardzie wykończenia.

 Nieruchomość posiada dostęp do drogi publicznej - ul. Libelta.

 W dziale III księgi wieczystej TO1U/00018916/4 - PRAWA ROSZCZENIA I
OGRANICZENIA widnieje INNY WPIS: Zarząd nieruchomością wspólną
sprawuje  Miejskie Przedsiębiorstwo Gospodarki Nieruchomościami  Sp. z
o.o. w Grudziądzu.

  Ustanowienie odrębnej własności i założenie księgi wieczystej
dla lokalu nr 5 nastąpi przy sprzedaży    przedmiotowej
nieruchomości.

Przetarg na sprzedaż powyższej nieruchomości odbędzie się w dniu 6
maja 2026r. o godz. 09.00

w siedzibie Urzędu Miejskiego w Grudziądzu, ul. Ratuszowa 1 - pokój
310.
`;

test('parseAnnouncement: Libelta 10A/5 — exactly 1 lot', () => {
  assert.equal(parseAnnouncement(ANN_LIBELTA).length, 1);
});

test('parseAnnouncement: Libelta 10A/5 — address key', () => {
  const [lot] = parseAnnouncement(ANN_LIBELTA);
  assert.equal(lot.address.key, 'libelta|10A|5');
  assert.equal(lot.address_raw, 'Libelta 10A/5');
});

test('parseAnnouncement: Libelta 10A/5 — area 45.20 m² (not the 60.75 m² łączna total)', () => {
  const [lot] = parseAnnouncement(ANN_LIBELTA);
  assert.equal(lot.area_m2, 45.2);
});

test('parseAnnouncement: Libelta 10A/5 — starting price 109 000 zł (not the 11 000 zł wadium)', () => {
  const [lot] = parseAnnouncement(ANN_LIBELTA);
  assert.equal(lot.starting_price_pln, 109000);
});

test('parseAnnouncement: Libelta 10A/5 — auction date 2026-05-06', () => {
  const [lot] = parseAnnouncement(ANN_LIBELTA);
  assert.equal(lot.auction_date, '2026-05-06');
});

test('parseAnnouncement: Libelta 10A/5 — round 1 (bare "pierwszy przetarg")', () => {
  const [lot] = parseAnnouncement(ANN_LIBELTA);
  assert.equal(lot.round, 1);
});

// ── Announcement .doc parser: two lots in one table, "złotych" spelled out ──
//
// REAL catdoc output (truncated after the operative date sentence) from the
// Rybacka 27C announcement covering lokal nr 4 AND lokal nr 6 in one table.
// Ground truth (verified from the document):
//   lot 1: Rybacka 27C/4, area 35.00 m², price 70 400 zł
//   lot 2: Rybacka 27C/6, area 32.20 m², price 58 300 zł
//   both:  round 1 (plural "pierwsze przetargi"), auction_date 2026-06-29

const ANN_RYBACKA = `

PREZYDENT GRUDZIĄDZA ogłasza

pierwsze  przetargi ustne nieograniczone, organizowane w dniu  29
czerwca 2026r.

na  sprzedaż lokali mieszkalnych, stanowiących własność gminy –
miasto Grudziądz



Lp.	Położenie

Nieruchomości

w Grudziądzu

Oznaczenie

księgi  wieczystej 	Powierzchnia nieruchomości gruntowej

Opis

nieruchomości

Cena

wywoławcza

Wysokość wadium



1.



ul. Rybacka 27C

lokal mieszkalny nr 4



Nieruchomość gruntowa

TO1U/00022250/8



Działki nr 22 i nr 23

obręb 48

łączna pow. 0,0563 ha

Lokal mieszkalny nr 4 położony na pierwszym piętrze (II kondygnacji)

o powierzchni użytkowej 35,00 m2, składający się z pokoju, kuchni,
łazienki z wc oraz pomieszczenia przynależnego: piwnicy nr 4 o pow.
4,50 m2, wraz z udziałem wynoszącym 395/5304 części we
współwłasności gruntu

i w częściach wspólnych budynku mieszkalnego,  które nie służą
wyłącznie do użytku właścicieli  poszczególnych lokali.

70.400,00 złotych



8.000,00 złotych

2.

ul. Rybacka 27C

lokal mieszkalny nr 6



Nieruchomość gruntowa

TO1U/00022250/8



Działki nr 22 i nr 23

obręb 48

łączna pow. 0,0563 ha	Lokal mieszkalny nr 6 położony na drugim
piętrze (III kondygnacji)

o powierzchni użytkowej 32,20 m2, składający się z dwóch pokoi,
kuchni, łazienki z wc oraz pomieszczenia przynależnego: piwnicy nr 6 o
pow. 7,80 m2, wraz z udziałem wynoszącym 400/5304 części we
współwłasności gruntu

i w częściach wspólnych budynku mieszkalnego,  które nie służą
wyłącznie do użytku właścicieli  poszczególnych lokali.

58.300,00 złotych

6.000,00 złotych



Lokale wyposażone są w instalacje: wodociągowe, kanalizacyjne,
elektroenergetyczne i gazowe.  Ogrzewanie piecami kaflowymi. Lokale o
niskim standardzie wykończenia – nadające się do generalnego
remontu.  W lokalu nr 4 stolarka okienna typowa PCV, drzwi wewnętrzne
płytowe, drzwi zewnętrzne metalowe. W lokalu nr 6 stolarka okienna
drewniana, drzwi wewnętrzne drewniane.

UWAGI!

Dla terenu, na którym położona jest przedmiotowa nieruchomość gmina
– miasto Grudziądz nie posiada miejscowego planu zagospodarowania
przestrzennego. Studium uwarunkowań i kierunków zagospodarowania
przestrzennego miasta Grudziądza (Uchwała Nr LXXVI/655/23 Rady
Miejskiej Grudziądza z dnia 31.05.2023 r.), dla terenu, na którym
położona jest przedmiotowa nieruchomość została ustalona funkcja
zabudowy mieszkaniowej wielorodzinnej.

Nieruchomość zabudowana budynkiem mieszkalnym wielorodzinnym
wybudowanym ok. 1900r.

Nieruchomość posiada dostęp do drogi publicznej - ul. Rybackiej
poprzez drogę wewnętrzną składającą się z działek gruntu nr 16/2
i 16/3 w obr. 48, zapisanych w księdze wieczystej TO1U/00024374/7.
             Dla każdoczesnych właścicieli nieruchomości oznaczonej
jako działki nr 22 i 23 w obr. 48, zapisanej                w księdze
wieczystej TO1U/00022250/8 została ustanowiona służebność gruntowa
polegająca na prawie przechodu i przejazdu przez działkę nr 16/3 w
obr. 48.

W dziale I - SP księgi wieczystej TO1U/00022250/8 – SPIS PRAW
ZWIĄZANYCH Z WŁASNOŚCIĄ widnieje wpis: uprawnienie wynikające z
prawa ujawnionego w dziale III innej księgi wieczystej o treści:
odpłatna za jednorazowym wynagrodzeniem i bezterminowa służebność
gruntowa polegająca na prawie przechodu i przejazdu przez działkę nr
16/3 – o powierzchni 182 m2, zapisaną w KW TO1U/00024374/7, do drogi
publicznej ul. Rybackiej.

Zarząd nieruchomością wspólną sprawuje MPGN  Sp. zo.o. z siedzibą
w Grudziądzu.

Ustanowienie odrębnej własności i założenie księgi wieczystej dla
lokali nr 4 i nr 6 nastąpi przy sprzedaży przedmiotowej
nieruchomości.

Przetargi na sprzedaż powyższych nieruchomości odbędą się w dniu
29 czerwca 2026r. o godz. 10.00

w siedzibie Urzędu Miejskiego w Grudziądzu, ul. Ratuszowa 1 - pokój
310.

W przetargu mogą wziąć udział osoby fizyczne i prawne, jeżeli
wniosą wadium w formie przelewu gotówki w terminie do dnia 22 czerwca
2026r. na rachunek Urzędu Miejskiego w Grudziądzu – Bank PKO BP SA
`;

test('parseAnnouncement: Rybacka 27C — 2 lots (one detail page, two flats)', () => {
  assert.equal(parseAnnouncement(ANN_RYBACKA).length, 2);
});

test('parseAnnouncement: Rybacka 27C/4 — address, area 35.00 m², price 70 400 zł', () => {
  const [lot4] = parseAnnouncement(ANN_RYBACKA);
  assert.equal(lot4.address.key, 'rybacka|27C|4');
  assert.equal(lot4.area_m2, 35);
  assert.equal(lot4.starting_price_pln, 70400);
});

test('parseAnnouncement: Rybacka 27C/6 — address, area 32.20 m², price 58 300 zł', () => {
  const [, lot6] = parseAnnouncement(ANN_RYBACKA);
  assert.equal(lot6.address.key, 'rybacka|27C|6');
  assert.equal(lot6.area_m2, 32.2);
  assert.equal(lot6.starting_price_pln, 58300);
});

test('parseAnnouncement: Rybacka 27C — round 1 (plural "pierwsze przetargi") for both lots', () => {
  const lots = parseAnnouncement(ANN_RYBACKA);
  assert.equal(lots[0].round, 1);
  assert.equal(lots[1].round, 1);
});

test('parseAnnouncement: Rybacka 27C — auction date 2026-06-29 (plural "odbędą się")', () => {
  const lots = parseAnnouncement(ANN_RYBACKA);
  assert.equal(lots[0].auction_date, '2026-06-29');
  assert.equal(lots[1].auction_date, '2026-06-29');
});

// ── Announcement .doc parser: 5th round, abbreviated "zł" + "pow. uż." ──────
//
// REAL catdoc output (truncated after the operative date sentence) from the
// Żeromskiego 3/5 announcement — a re-listed (5th round) flat, and a DIFFERENT
// currency/area-label format than the two fixtures above ("zł" not "złotych",
// "pow. uż." not "powierzchni użytkowej"): both must parse.
// Ground truth: area 38.46 m² (NOT the 51.51 m² łączna total), price 80 000 zł
// (NOT the 8 000 zł wadium), round 5, auction_date 2026-06-02.

const ANN_ZEROMSKIEGO = `

PREZYDENT GRUDZIĄDZA ogłasza

piąty przetarg ustny nieograniczony, organizowany w dniu 2 czerwca
2026r.

na ustanowienie odrębnej własności lokalu mieszkalnego i sprzedaż
lokalu mieszkalnego, stanowiącego własność gminy – miasto
Grudziądz





Lp.	Położenie

Nieruchomości

w Grudziądzu

Oznaczenie

księgi  wieczystej 	Powierzchnia nieruchomości gruntowej

Opis

nieruchomości

Cena

wywoławcza

Wysokość wadium



1.



ul. Żeromskiego 3

lokal mieszkalny nr 5



Nieruchomość gruntowa

TO1U/00035766/2



Działka

nr 170

obręb 108

pow. 0,1136 ha

Lokal mieszkalny

nr 5 położony na poddaszu o łącznej pow.51,51m2

(pow. uż. 38,46 m2), składający się z: dwóch pokoi, kuchni,
łazienki,  przedpokoju oraz pomieszczenia przynależnego: piwnicy nr 7

o powierzchni 13,05 m2  wraz z udziałem wynoszącym 5151/47577 części
 we współwłasności gruntu i w częściach wspólnych budynku
mieszkalnego,

które nie służą wyłącznie do użytku właścicieli
poszczególnych lokali.

80.000,00 zł



8.000,00 zł



UWAGI!

Dla terenu, na którym położona jest przedmiotowa nieruchomość gmina
– miasto Grudziądz                      nie posiada miejscowego planu
zagospodarowania przestrzennego. Studium uwarunkowań i kierunków
zagospodarowania przestrzennego miasta Grudziądza (Uchwała Nr
LXXVI/655/23 Rady Miejskiej Grudziądza z dnia 31.05.2023 r.), dla
terenu, na którym położona jest przedmiotowa nieruchomość została
ustalona funkcja zabudowy mieszkaniowej.

Budynek mieszkalny wielorodzinny, podpiwniczony, wybudowany w 1942r.
składa się z dwóch kondygnacji nadziemnych z poddaszem częściowo
użytkowym. Ściany zewnętrzne i wewnętrzne wykonane w technologii
tradycyjnej murowanej. Ściany działowe murowane z cegły czerwonej
oraz z płyt kartonowo - gipsowych. Kominy wykonane z cegły. Stropy
między piętrowe drewniane, żelbetonowe nad piwnicą.
Dach konstrukcji drewnianej pokryty dachówką ceramiczną karpiówką.

Sprzedaży podlega lokal mieszkalny nr 5 na odrębną własność
usytuowany na poddaszu o  łącznej powierzchni 51,51m2 (powierzchni
użytkowej 38,46m2) i składa się z dwóch pokoi, kuchni, łazienki,
przedpokoju oraz pomieszczenia przynależnego: piwnicy nr 7 o
powierzchni 13,05 m2 wraz z udziałem wynoszącym wraz  z udziałem
wynoszącym 5151/47577 części we współwłasności gruntu i w
częściach wspólnych budynku mieszkalnego, które nie służą
wyłącznie do użytku właścicieli  poszczególnych lokali oraz w
prawie własności nieruchomości gruntowej oznaczonej jako działka nr
170 w obr. 108 zapisanej                  w księdze wieczystej
TO1U/00035766/2.

Lokal mieszkalny nr 5 wyposażony jest w instalacje: wodociągową,
kanalizacyjną, elektroenergetyczną  i gazową. Podłogi drewniane.
Ściany malowane lub pokryte tapetą. Stolarka okienna drewniana drzwi
płytowe. Ogrzewanie lokalu piecami kaflowymi. Lokal w niskim
standardzie wykończenia.

Nieruchomość posiada dostęp do drogi publicznej - ul. Żeromskiego.

W dziale III księgi wieczystej TO1U/00035766/2 - PRAWA ROSZCZENIA I
OGRANICZENIA widnieje INNY WPIS: Zarząd nieruchomością wspólną
sprawuje  Miejskie Przedsiębiorstwo Gospodarki Nieruchomościami Sp. z
o.o. w Grudziądzu.

Ustanowienie odrębnej własności i założenie księgi wieczystej dla
lokalu nr 5 nastąpi przy sprzedaży przedmiotowej nieruchomości.

Koszty związane z ustanowieniem odrębnej własności lokalu oraz
nabyciem tego lokalu

w całości ponosi nabywca nieruchomości.



Przetarg na sprzedaż powyższej nieruchomości odbędzie się w dniu 2
czerwca 2026r. o godz.10.00                        w siedzibie Urzędu
Miejskiego w Grudziądzu, ul. Ratuszowa 1 - pokój 310.
`;

test('parseAnnouncement: Żeromskiego 3/5 — exactly 1 lot', () => {
  assert.equal(parseAnnouncement(ANN_ZEROMSKIEGO).length, 1);
});

test('parseAnnouncement: Żeromskiego 3/5 — area 38.46 m² (abbreviated "pow. uż." label, not the 51.51 m² łączna)', () => {
  const [lot] = parseAnnouncement(ANN_ZEROMSKIEGO);
  assert.equal(lot.area_m2, 38.46);
});

test('parseAnnouncement: Żeromskiego 3/5 — price 80 000 zł (abbreviated "zł", not "złotych")', () => {
  const [lot] = parseAnnouncement(ANN_ZEROMSKIEGO);
  assert.equal(lot.starting_price_pln, 80000);
});

test('parseAnnouncement: Żeromskiego 3/5 — round 5 ("piąty przetarg")', () => {
  const [lot] = parseAnnouncement(ANN_ZEROMSKIEGO);
  assert.equal(lot.round, 5);
});

test('parseAnnouncement: Żeromskiego 3/5 — auction date 2026-06-02', () => {
  const [lot] = parseAnnouncement(ANN_ZEROMSKIEGO);
  assert.equal(lot.auction_date, '2026-06-02');
});

// ── parser helper null/empty safety ──────────────────────────────────────────

test('parser helpers: null/empty inputs return null/[] without throwing', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText(null), null);
  assert.equal(priceFromText('brak ceny'), null);
  assert.equal(priceFromText(null), null);
  assert.equal(areaFromText(''), null);
  assert.equal(areaFromText(null), null);
  assert.deepEqual(parseAnnouncement(''), []);
  assert.deepEqual(parseAnnouncement(null), []);
});

// ── Result-doc parser (OCR'd scanned PDF) ────────────────────────────────────
//
// REAL full tesseract -l pol output (core/ocr-pdf.js's exact conversion path)
// from the ONE result-of-a-concluded-auction notice found on the entire live
// board (2008-2026). Tolerant of real OCR noise (the price/area table column
// is largely garbled — "mż" for "m2", stray "©"/"—" glyphs — which is exactly
// why parseResultDoc does NOT depend on that column for outcome/address/round/
// date; those come from the clean opening prose sentence).
// Ground truth (verified against the source PDF via `pdftoppm` + manual read):
//   address:   'Libelta 10/4'
//   round:     2      (drugi przetarg)
//   outcome:   'unsold', unsold_reason 'no_participants'
//              ("Żadna osoba nie przystąpiła do przetargu")
//   auction_date: '2024-09-10' (from "w dniu 10 września 2024r.")
//   final_price_pln: null (negative outcome — no sale)

const RESULT_LIBELTA_OCR = `PREZYDENT GRUCZIĄDZA
uł. Rstuszawa
86-300 Grudziądz  (Ż) Wywieszono dn. 2024-09-18
Zdjęto dn. 2024-09-26

INFORMACJA Z PRZEPROWADZONEGO "PRZETARGU NA SPRZEDAŻ
NIERUCHOMOŚCI STANOWIĄCEJ WŁASNOŚĆ GMINY - MIASTO GRUDZIĄDZ

Działając na podstawie $ 12 Rozporządzenia Rady Ministrów z dnia
14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na
zbycie nieruchomości (Dz. U. z 2021r., poz. 2213), podaje się do publicznej wiadomości,
że w dniu 10 września 2024r. w siedzibie Urzędu Miejskiego w Grudziądzu przeprowadzony
został drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4
stanowiącego własność gminy-miasto Grudziądz, mieszczącego się w budynku położonym
w Grudziądzu przy ul. Libelta 10

ul. Libelta 10: *| Nieruchomość
©0600, | gruntowa |

102,80 mż, skladając
się z czterech pokoi,
garderoby, dwóch:
kuchni, przedpokoj

Ę z 122 o pów.
-0,0332ha

pomieszczeń
przynależnych: jej,
RESE SĘ nr 9:0 powierzchni AE
0112.65 mż, piwnicy nr8.
DES ©|/0 pów. 43,05m2. kk:
© | wrażz udziałem
o. | wynoszącym
—01/10280/95485 części we
współwłasności części
„| budynku i urządzeń,
| które nie służą.
--|-wyłącznie: do użytku 5
-|kupujących oraz
w prawie własności
nieruchomości 5 |-
gruntowej oznaczonej - |-
jako działki nr. 10842:
oraz 122.w obr 108...

który został zakończony wynikiem negatywnym, ponieważ Żadna osoba nie przystąpiła
do przetargu.
Nie było osób dopuszczonych i niedopuszczonych do przetargu.

Grudziądz, dnia 2024-09-18
JRCĄDMIEJSKI

w Gruliziądzu
Wydział OrganizacyjnoAdminisiracyjny
ul, Rztuszowa |, 56.300 Grudziądz

OTA-| 0129 SM. 2OZh`;

const RESULT_URL =
  'https://bip.grudziadz.pl/pliki/grudziadz/zalaczniki/5850/18_09_2024_11_13_52_20240918080804683.pdf';

test('parseResultDoc: guard — non-result text returns empty', () => {
  assert.deepEqual(parseResultDoc('Ogłoszenie o przetargu na lokal mieszkalny', null, RESULT_URL), []);
  assert.deepEqual(parseResultDoc('', null, RESULT_URL), []);
});

test('parseResultDoc: Libelta 10/4 — exactly 1 record', () => {
  assert.equal(parseResultDoc(RESULT_LIBELTA_OCR, null, RESULT_URL).length, 1);
});

test('parseResultDoc: Libelta 10/4 — address key', () => {
  const [rec] = parseResultDoc(RESULT_LIBELTA_OCR, null, RESULT_URL);
  assert.equal(rec.address.key, 'libelta|10|4');
  assert.equal(rec.address_raw, 'Libelta 10/4');
});

test('parseResultDoc: Libelta 10/4 — round 2 ("drugi przetarg")', () => {
  const [rec] = parseResultDoc(RESULT_LIBELTA_OCR, null, RESULT_URL);
  assert.equal(rec.round, 2);
});

test('parseResultDoc: Libelta 10/4 — auction date 2024-09-10', () => {
  const [rec] = parseResultDoc(RESULT_LIBELTA_OCR, null, RESULT_URL);
  assert.equal(rec.auction_date, '2024-09-10');
});

test('parseResultDoc: Libelta 10/4 — outcome unsold, no_participants, no final price', () => {
  const [rec] = parseResultDoc(RESULT_LIBELTA_OCR, null, RESULT_URL);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'no_participants');
  assert.equal(rec.final_price_pln, null);
});

test('parseResultDoc: Libelta 10/4 — kind mieszkalny, source_pdf carries the fetched URL', () => {
  const [rec] = parseResultDoc(RESULT_LIBELTA_OCR, null, RESULT_URL);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.source_pdf, RESULT_URL);
});

test('parseResultDoc: fallbackDate used when the body has no parseable date', () => {
  const noDate = RESULT_LIBELTA_OCR.replace(/w\s+dniu\s+10\s+wrze[śs]nia\s+2024r\./i, 'niedawno');
  const recs = parseResultDoc(noDate, '2024-09-10', RESULT_URL);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2024-09-10');
});
