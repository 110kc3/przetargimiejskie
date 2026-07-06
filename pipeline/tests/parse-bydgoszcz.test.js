// Bydgoszcz parser tests. Fixtures are condensed-but-faithful copies of the REAL
// extracted text of LIVE attachments (fetched from bip.um.bydgoszcz.pl 2026-07-06):
//   attachments/download/32143 flat ANNOUNCEMENT .doc via catdoc — ul. Henryka
//     Sienkiewicza 37 lokal nr 2, VII przetarg 09.07.2026, 94,29 m2, 299 000,-
//     (article /artykul/1208/10271/…);
//   attachments/download/32401 flat ANNOUNCEMENT .doc — ul. Grunwaldzkiej 90
//     lokal nr 3, I przetarg 31.07.2026, 38,04 m2, 250 000,- (article
//     /artykul/1208/10367/…);
//   attachments/download/32667 flat RESULT .docx via unzip word/document.xml —
//     ul. Chodkiewicza 2 lokal nr 1, VI przetarg 26.06.2026, wywoławcza
//     135.000,- zł, UNSOLD (article /artykul/1208/10466/…);
//   attachments/download/32640 land RESULT .docx — ul. ks. Augusta
//     Szamarzewskiego dz. 9/6, 25.06.2026, grunt → no address-keyed record
//     (article /artykul/1208/10455/…).
// The SOLD result fixture is the real Chodkiewicza DOCX with the outcome lines
// swapped to the sold form of the same template (no sold flat was live on
// 2026-07-06) — the label wording "Najwyższa cena osiągnięta w przetargu – …"
// and "Nabywca nieruchomości – …" is verbatim from the live unsold DOCX.
//
// Traps that MUST hold:
//   * the auction VENUE "przy ul. Jezuickiej 2" and the WMG office
//     "ul. Grudziądzka 9-15" appear in every document — never the property address;
//   * catdoc wraps the announcement price cell across a newline ("299\n000,-");
//   * result notices use DOT thousands ("135.000,- zł");
//   * plot areas are integers ("pow.778 m 2", "322m2") — flat area is decimal.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  romanToInt,
  roundFromText,
  parsePLN,
  isResultNotice,
  auctionDateFromAnn,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  addressRawFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/bydgoszcz/parse.js';
import {
  parseIndexPage,
  classifyArticle,
  docAttachments,
  pubDateFromHtml,
} from '../src/cities/bydgoszcz/crawl.js';

// ---------------------------------------------------------------------- fixtures

// attachments/download/32143 (catdoc -a -d utf-8), condensed; layout-critical
// spans (line-wrapped price cell, plot "m 2", venue clause) are verbatim.
const ANN_SIENKIEWICZA = `PREZYDENT MIASTA BYDGOSZCZY

ogłasza VII przetarg ustny nieograniczony na sprzedaż lokalu
mieszkalnego stanowiącego własność Miasta Bydgoszczy

Oznaczenie i położenie lokalu 	Oznaczenie nieruchomości wg księgi
wieczystej oraz ewidencji gruntów	Powierzchnia

użytkowa lokalu w m2	Opis lokalu mieszkalnego	Cena wywoławcza w zł
Wysokość wadium w zł	Przeznaczenie nieruchomości i sposób jej
zagospodarowania,

przeznaczenie lokalu

lokal mieszkalny nr 2

znajdujący się na  parterze w III-kondygnacyjnym budynku położonym
przy

ul. Henryka Sienkiewicza 37 w Bydgoszczy

oraz udział w nieruchomości wspólnej wynoszący 10056/96760.	KW nr

BY1B/00007337/7

obręb 111

działka  nr  59

pow.778 m 2

	94,29 m2

+ pomieszczenie przynależne P.12- piwnica:  6,27m2.

	W skład lokalu nr 2 wchodzą następujące pomieszczenia:
        3 pokoje i kuchnia,w.c.,korytarz i pom.gospodarcze.

Wyposażony jest w instalacje: elektryczną, wod-kan., gazową, oraz
domofonową. Lokal dotychczas był ogrzewany przy pomocy piecy
kaflowych, których dalsza eksploatacja nie jest dopuszczalna. W/w lokal
jest niezamieszkały i wolny w sensie prawnym.  Wymaga remontu.	299
000,-	30 000,-	    Nieruchomość przy ul. Henryka Sienkiewicza 37 na
której znajduje się przeznaczony do sprzedaży lokal położona jest
w obszarze objętym miejscowym planem zagospodarowania przestrzennego.

Pierwszy przetarg na sprzedaż w/w lokalu odbył się w dniu 28.02.2025
r., drugi 20.05.2025r., trzeci 07.07.2025r.,czwarty 21.10.2025r., piąty
19.03.2026r. i 15.05.2026r.zakończyły się wynikiem negatywnym.

Przetarg odbędzie się w Urzędzie Miasta Bydgoszczy przy ul.
Jezuickiej 2 w Sali Łochowskiego (parter) w dniu 09 lipca 2026 r.
o godzinie 10.00

Warunkiem uczestnictwa w przetargu jest wpłacenie wadium w gotówce
(PLN) w wysokości określonej w tabeli powyżej, najpóźniej do dnia
01.07.2026 r. przelewem na konto Urzędu Miasta Bydgoszczy w Banku
Pekao SA Nr 27 1240 6452 1111 0010 4788 2066.

Przetarg może zostać odwołany jedynie z ważnych powodów, o czym
organizator przetargu niezwłocznie powiadomi poprzez wywieszenie
informacji na tablicy ogłoszeń Referatu Lokali i Wspólnot
Mieszkaniowych w Wydziale Mienia i Geodezji Urzędu Miasta Bydgoszczy
przy ul. Grudziądzkiej 9-15, budynek „C".`;

// attachments/download/32401 (catdoc), condensed the same way.
const ANN_GRUNWALDZKA = `PREZYDENT MIASTA BYDGOSZCZY

ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu
mieszkalnego stanowiącego własność Miasta Bydgoszczy

Oznaczenie i położenie lokalu 	Oznaczenie nieruchomości wg księgi
wieczystej oraz ewidencji gruntów	Powierzchnia

użytkowa lokalu w m2	Opis lokalu mieszkalnego	Cena wywoławcza w zł
Wysokość wadium w zł	Przeznaczenie nieruchomości i sposób jej
zagospodarowania,

przeznaczenie lokalu

lokal mieszkalny nr 3

znajdujący się na I piętrze w II-kondygnacyjnym budynku położonym
przy

ul. Grunwaldzkiej 90 w Bydgoszczy

oraz udział w nieruchomości wspólnej wynoszący 4914/26993.

KW nr

BY1B/00062126/8

obręb 62

działki:  nr  ewid.                 9/2 i 9/1

o łącznej pow.639 m 2

	38,04m2                               + pomieszczenia przynależne:

wc o pow.1,82m2,

piwnica o pow. 3,64m2

i komórka o pow.5,64m2.	W skład lokalu nr 3 wchodzą następujące
pomieszczenia:                      3 pokoje i kuchnia.

Wyposażony jest w instalacje: elektryczną, wod-kan. i gazową. Lokal
dotychczas był ogrzewany przy pomocy pieca kaflowego, którego dalsza
eksploatacja nie jest dopuszczalna. W/w lokal jest niezamieszkały
i wolny w sensie prawnym. Wymaga remontu..	250 000,-	25 000,-
Nieruchomość przy ul. Grunwaldzkiej 90 na której znajduje się
przeznaczony do sprzedaży lokal położona jest   w obszarze na którym
nie obowiązuje aktualny miejscowy plan zagospodarowania przestrzennego.

Przetarg odbędzie się w Urzędzie Miasta Bydgoszczy przy ul.
Jezuickiej 2 w Sali Łochowskiego (parter) w dniu 31 lipca 2026 r.
o godzinie 10.00`;

// attachments/download/32667 (unzip word/document.xml), near-verbatim.
const RES_CHODKIEWICZA_UNSOLD = `
PREZYDENT  MIASTA  BYDGOSZCZY

działając zgodnie z dyspozycją § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości(Dz. U. z 2021 r., poz. 2213),
podaje do publicznej wiadomości
	informację o wyniku przeprowadzonego w dniu 26.06.2026r. w siedzibie Urzędu Miasta Bydgoszczy przy ul. Jezuickiej 2 w Sali Łochowskiego,

VI przetargu ustnego nieograniczonego na sprzedaż  lokalu mieszkalnego nr 1, stanowiącego własność Miasta Bydgoszczy, położonego w Bydgoszczy przy ul. Chodkiewicza 2, o pow. 53,27m2 oraz udziału w nieruchomości wspólnej wynoszącego 5327/96569 części działki nr 51/1 o pow. 322m2 (obręb 169) – zapisanej w księdze wieczystej KW nr BY1B/00044586/8 i tej samej wysokości udziału w częściach wspólnych budynku i urządzeń, które nie służą wyłącznie do użytku właścicieli lokali.

	Z uwagi na fakt, że podmiot, który dokonał wpłaty wadium, nie posiadał ważnego dokumentu tożsamości, przetarg zakończył się wynikiem negatywnym.

Liczba osób dopuszczonych do uczestniczenia w przetargu - 0
Liczba osób niedopuszczonych do uczestniczenia w przetargu – 1
Cena wywoławcza nieruchomości: 135.000,- zł
Najwyższa cena osiągnięta w przetargu – brak
Nabywca nieruchomości – VI przetarg zakończył się wynikiem negatywnym
Niniejsza informacja zostaje podana do publicznej wiadomości poprzez zamieszczenie jej na  stronie internetowej  Urzędu Miasta Bydgoszcz www.bip.um.bydgoszcz.pl oraz wywieszenie na tablicy ogłoszeń w Wydziale Mienia i Geodezji Urzędu Miasta Bydgoszczy, ul. Grudziądzka 9-15,budynek „C"
na okres 7 dni, tj.
od dnia 03.07.2026r.do dnia 10.07.2026 r.`;

// attachments/download/32640 (unzip word/document.xml), near-verbatim. Land —
// spelled-out round ("trzecim") + spelled month with doubled spaces.
const RES_LAND_SZAMARZEWSKIEGO = `
                     WMG-II.6840.5.14.2025.GD

                                                                     PREZYDENT  MIASTA  BYDGOSZCZY

działając zgodnie z dyspozycją § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t. j. Dz. U. z 2021 r., poz. 2213),

podaje do publicznej wiadomości

	informację o wyniku przeprowadzonego w dniu  25 czerwca  2026 r. w  Urzędzie Miasta Bydgoszczy przy ul. Jezuickiej 2 – trzecim  przetargu ustnym nieograniczonym na sprzedaż  nieruchomości gruntowej niezabudowanej, stanowiącej własność Miasta Bydgoszczy, położonej w Bydgoszczy przy ul. ks. Augusta Szamarzewskiego  , w obrębie  0009, dz. nr 9/6 o pow. 0,1955 ha, KW nr BY1B/00027516/2.

	Z uwagi na brak wpłaconego wadium w wyznaczonym terminie, tj. do dnia 17.06.2026 r.ww. przetarg zakończył się wynikiem negatywnym.

Liczba osób dopuszczonych do uczestniczenia w przetargu - 0
Liczba osób niedopuszczonych do uczestniczenia w przetargu – 0
Cena wywoławcza nieruchomości: 340.000,- zł netto*
Najwyższa cena osiągnięta w przetargu – brak
Nabywca nieruchomości – III przetarg zakończył się wynikiem negatywnym`;

// SOLD variant of the real Chodkiewicza template (outcome lines swapped to the
// sold form; label wording verbatim from the live DOCX).
const RES_SOLD_TEMPLATE = `
PREZYDENT  MIASTA  BYDGOSZCZY

podaje do publicznej wiadomości
	informację o wyniku przeprowadzonego w dniu 26.06.2026r. w siedzibie Urzędu Miasta Bydgoszczy przy ul. Jezuickiej 2 w Sali Łochowskiego,

VI przetargu ustnego nieograniczonego na sprzedaż  lokalu mieszkalnego nr 1, stanowiącego własność Miasta Bydgoszczy, położonego w Bydgoszczy przy ul. Chodkiewicza 2, o pow. 53,27m2 oraz udziału w nieruchomości wspólnej wynoszącego 5327/96569 części działki nr 51/1 o pow. 322m2 (obręb 169).

Liczba osób dopuszczonych do uczestniczenia w przetargu - 2
Cena wywoławcza nieruchomości: 135.000,- zł
Najwyższa cena osiągnięta w przetargu – 142.000,- zł
Nabywca nieruchomości – osoba fizyczna`;

// ---------------------------------------------------------------- unit helpers

test('romanToInt: I, VI, VII, XIV', () => {
  assert.equal(romanToInt('I'), 1);
  assert.equal(romanToInt('VI'), 6);
  assert.equal(romanToInt('VII'), 7);
  assert.equal(romanToInt('XIV'), 14);
  assert.equal(romanToInt('bad'), null);
});

test('roundFromText: uppercase Roman before "przetarg…", conjunction "i" never matches', () => {
  assert.equal(roundFromText('ogłasza VII przetarg ustny nieograniczony'), 7);
  assert.equal(roundFromText('VI przetargu ustnego nieograniczonego na sprzedaż'), 6);
  assert.equal(roundFromText('przedmiot i datę przetargu zgodnie z ogłoszeniem'), null);
  assert.equal(roundFromText('w II-kondygnacyjnym budynku'), null);
});

test('parsePLN: newline/space/dot thousands, ",-" suffix, grosze tail', () => {
  assert.equal(parsePLN('299\n000'), 299000);   // catdoc-wrapped table cell
  assert.equal(parsePLN('135.000'), 135000);    // result-notice dot thousands
  assert.equal(parsePLN('450 000,00'), 450000);
  assert.equal(parsePLN('250 000,-'), 250000);
});

test('isResultNotice: result header vs announcement', () => {
  assert.equal(isResultNotice('podaje do publicznej wiadomości informację o wyniku przeprowadzonego w dniu'), true);
  assert.equal(isResultNotice('ogłasza VII przetarg ustny nieograniczony na sprzedaż lokalu'), false);
});

test('date extractors: venue clause spanned, prior-round recap skipped, no-space "r."', () => {
  // ~84 chars of venue text between "odbędzie się" and "w dniu" (live format):
  assert.equal(auctionDateFromAnn(ANN_SIENKIEWICZA), '2026-07-09');
  // recap "odbył się w dniu 28.02.2025" must NOT be picked:
  assert.equal(auctionDateFromAnn('W dniu 28.02.2025 r. odbył się I przetarg ustny'), null);
  // "26.06.2026r." with no space before "r." (live result DOCX):
  assert.equal(resultDateFromText(RES_CHODKIEWICZA_UNSOLD), '2026-06-26');
  // spelled month + doubled spaces (live land result DOCX):
  assert.equal(resultDateFromText(RES_LAND_SZAMARZEWSKIEGO), '2026-06-25');
});

test('price extractors on live formats', () => {
  assert.equal(startingPriceFromText(RES_CHODKIEWICZA_UNSOLD), 135000);
  assert.equal(startingPriceFromText(ANN_SIENKIEWICZA), 299000); // "299\n000,-" before wadium "30 000,-"
  assert.equal(startingPriceFromText(ANN_GRUNWALDZKA), 250000);
  assert.equal(achievedPriceFromText(RES_CHODKIEWICZA_UNSOLD), null); // "– brak"
  assert.equal(achievedPriceFromText(RES_SOLD_TEMPLATE), 142000);
});

test('unitAreaFromText: decimal flat area, integer plot + piwnica skipped', () => {
  assert.equal(unitAreaFromText(ANN_SIENKIEWICZA), 94.29);  // not plot 778 m 2, not piwnica 6,27
  assert.equal(unitAreaFromText(ANN_GRUNWALDZKA), 38.04);   // "38,04m2", not wc/piwnica/komórka
  assert.equal(unitAreaFromText(RES_CHODKIEWICZA_UNSOLD), 53.27); // "o pow. 53,27m2", not plot 322m2
});

test('addressRawFromText: anchored on "położon…" — venue ul. Jezuickiej never wins', () => {
  assert.equal(addressRawFromText(ANN_SIENKIEWICZA), 'ul. Henryka Sienkiewicza 37/2');
  assert.equal(addressRawFromText(ANN_GRUNWALDZKA), 'ul. Grunwaldzkiej 90/3');
  assert.equal(addressRawFromText(RES_CHODKIEWICZA_UNSOLD), 'ul. Chodkiewicza 2/1');
  // venue-only text (no "położon…" anchor) yields nothing:
  assert.equal(
    addressRawFromText('Przetarg odbędzie się w Urzędzie Miasta Bydgoszczy przy ul. Jezuickiej 2 w Sali Łochowskiego'),
    null,
  );
});

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: Sienkiewicza 37/2 — VII przetarg, 94,29 m2, 299 000,-', () => {
  const rec = parseAnnouncement(ANN_SIENKIEWICZA);
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Henryka Sienkiewicza 37/2');
  assert.equal(rec.address.key, 'henryka sienkiewicza|37|2');
  assert.equal(rec.area_m2, 94.29);
  assert.equal(rec.starting_price_pln, 299000);
  assert.equal(rec.auction_date, '2026-07-09');
  assert.equal(rec.round, 7);
});

test('parseAnnouncement: Grunwaldzka 90/3 — I przetarg, 38,04 m2, 250 000,-', () => {
  const rec = parseAnnouncement(ANN_GRUNWALDZKA);
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'grunwaldzkiej|90|3');
  assert.equal(rec.area_m2, 38.04);
  assert.equal(rec.starting_price_pln, 250000);
  assert.equal(rec.auction_date, '2026-07-31');
  assert.equal(rec.round, 1);
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: Chodkiewicza 2/1 unsold — VI przetarg, wywoławcza 135.000,-', () => {
  const [rec, ...rest] = parseResultDoc(
    RES_CHODKIEWICZA_UNSOLD,
    null,
    'https://bip.um.bydgoszcz.pl/attachments/download/32667',
  );
  assert.ok(rec);
  assert.equal(rest.length, 0);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'chodkiewicza|2|1');
  assert.equal(rec.area_m2, 53.27);
  assert.equal(rec.round, 6);
  assert.equal(rec.starting_price_pln, 135000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.auction_date, '2026-06-26');
  assert.equal(rec.source_pdf, 'https://bip.um.bydgoszcz.pl/attachments/download/32667');
});

test('parseResultDoc: land result → no address-keyed record', () => {
  assert.deepEqual(parseResultDoc(RES_LAND_SZAMARZEWSKIEGO, null, 'x'), []);
});

test('parseResultDoc: sold template — achieved price wins over wywoławcza', () => {
  const [rec] = parseResultDoc(RES_SOLD_TEMPLATE, null, 'x');
  assert.ok(rec);
  assert.equal(rec.address.key, 'chodkiewicza|2|1');
  assert.equal(rec.starting_price_pln, 135000);
  assert.equal(rec.final_price_pln, 142000);
  assert.equal(rec.outcome, 'sold');
});

test('parseResultDoc: announcement text is rejected by the gate', () => {
  assert.deepEqual(parseResultDoc(ANN_SIENKIEWICZA, null, 'x'), []);
});

// ----------------------------------------------------------------- crawl helpers
// Markup excerpts verbatim from the LIVE board/article pages (2026-07-06).

const INDEX_HTML = `<div class="list general">
<article><header><h2>
<a href="https://bip.um.bydgoszcz.pl/artykul/1208/10466/informacja-o-wyniku-przetargu-przeprowadzonego-w-dniu-26-06-2026r-ul-chodkiewicza-2-lokal-nr-1">Informacja o wyniku przetargu przeprowadzonego w dniu 26.06.2026r, ul. Chodkiewicza 2, lokal nr 1</a>
</h2></header></article>
<article><header><h2>
<a href="https://bip.um.bydgoszcz.pl/artykul/1208/10271/lokal-przeznaczony-do-sprzedazy-w-drodze-przetargu-ustnego-nieograniczonego-w-dniu-09-07-2026-r-ul-h-sienkiewicza-37m2">Lokal przeznaczony do sprzedaży w drodze przetargu ustnego nieograniczonego w dniu 09.07.2026 r., ul.H.Sienkiewicza 37m2</a>
</h2></header></article>
</div>`;

const ARTICLE_ATTACH_HTML = `<section id="attachments" class="attachments">
<h2>Załączniki</h2>
<div class="header">
    <span><a id="attachments-title" title="Plik do pobrania"
             href="https://bip.um.bydgoszcz.pl/attachments/download/32142">
            ogłoszenie VII przetarg Sienkiewicza 37m2</a></span>
    <span class="files textPDF">pdf, 324 kB</span>
</div>
<div class="header">
    <span><a id="attachments-title" title="Plik do pobrania"
             href="https://bip.um.bydgoszcz.pl/attachments/download/32143">
            ogłoszenie VII przetarg Sienkiewicza 37-2</a></span>
    <span class="files textWord">doc, 54 kB</span>
</div>
<div class="header">
    <span><a id="attachments-title" title="Plik do pobrania"
             href="https://bip.um.bydgoszcz.pl/attachments/download/32640">
            informacja o wyniku</a></span>
    <span class="files textWord">, 19 kB</span>
</div>
</section>
<tr><th>Data wytworzenia:</th><td><time datetime="2026-06-03">03.06.2026</time></td></tr>
<tr><th>Data opublikowania:</th><td><time datetime="2026-06-08T00:00:01">08.06.2026 00:00</time></td></tr>`;

test('parseIndexPage: absolute live hrefs → id/slug/title stubs', () => {
  const stubs = parseIndexPage(INDEX_HTML);
  assert.equal(stubs.length, 2);
  assert.equal(stubs[0].id, '10466');
  assert.match(stubs[0].title, /^Informacja o wyniku przetargu/);
  assert.equal(stubs[1].id, '10271');
  assert.match(stubs[1].slug, /^lokal-przeznaczony-do-sprzedazy/);
});

test('classifyArticle: live titles route correctly', () => {
  assert.equal(
    classifyArticle('Lokal przeznaczony do sprzedaży w drodze przetargu ustnego nieograniczonego w dniu 09.07.2026 r., ul.H.Sienkiewicza 37m2', 'lokal-przeznaczony-do-sprzedazy-w-drodze-przetargu-ustnego-nieograniczonego-w-dniu-09-07-2026-r-ul-h-sienkiewicza-37m2'),
    'flat-ann',
  );
  assert.equal(
    classifyArticle('Informacja o wyniku przetargu przeprowadzonego w dniu 26.06.2026r, ul. Chodkiewicza 2, lokal nr 1', 'informacja-o-wyniku-przetargu-przeprowadzonego-w-dniu-26-06-2026r-ul-chodkiewicza-2-lokal-nr-1'),
    'result',
  );
  assert.equal(
    classifyArticle('Sprzedaż nieruchomości  niezabudowanych, wdrodze III przetargu, w dniu 28.07.2026r. , położonych  przy ul. ks.Augusta Szamarzewskiego (poz.1-3)', 'sprzedaz-nieruchomosci-niezabudowanych-wdrodze-iii-przetargu-w-dniu-28-07-2026r-polozonych-przy-ul-ks-augusta-szamarzewskiego-poz-1-3'),
    'skip',
  );
  assert.equal(classifyArticle('Informacja o odwołaniu przetargu', 'informacja-o-odwolaniu-przetargu'), 'skip');
});

test('docAttachments: textWord class selects .doc/.docx, skips PDFs, tolerates empty ext label', () => {
  const atts = docAttachments(ARTICLE_ATTACH_HTML);
  assert.deepEqual(atts.map((a) => a.url), [
    'https://bip.um.bydgoszcz.pl/attachments/download/32143',
    'https://bip.um.bydgoszcz.pl/attachments/download/32640',
  ]);
  assert.equal(atts[0].name, 'ogłoszenie VII przetarg Sienkiewicza 37-2');
});

test('pubDateFromHtml: metryczka <time datetime>', () => {
  assert.equal(pubDateFromHtml(ARTICLE_ATTACH_HTML), '2026-06-03');
  assert.equal(pubDateFromHtml('<p>no metryczka</p>'), null);
});
