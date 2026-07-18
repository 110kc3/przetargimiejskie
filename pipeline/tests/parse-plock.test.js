// Płock (ARS Sp. z o.o.) parser tests. Fixtures are condensed-but-faithful
// copies of REAL data fetched live from ars.plock.pl (2026-07-18, from this
// Pi's Polish residential IP):
//   - BOARD LIST: the exact `<div class="listing">` / `pagingPanel` markup of
//     the "Ogłoszenia o przetargach" board (page 1).
//   - ANNOUNCEMENT PDFs: `pdftotext -layout` of the born-digital
//     Ogloszenie.pdf for the Synagogalna 13 lokal 9 flat (GetAttachment/569),
//     and OCR (tesseract -l pol) of the SCANNED Ogloszenie.pdf for the
//     Sienkiewicza 64 building (GetAttachment/538, Producer "KONICA MINOLTA
//     bizhub C458" — no text layer).
//   - RESULT PROTOCOLS: `pdftotext -layout` of the born-digital protokol.pdf
//     for the Synagogalna 13 lokal 9 SOLD auction (GetAttachment/573), and
//     OCR of the SCANNED protokol.pdf for the Sienkiewicza 64 building's SOLD
//     (but OCR-garbled) auction (GetAttachment/543) and a rental's UNSOLD
//     auction (GetAttachment/562, used only for the low-level outcome-
//     function checks — its real title has no "sprzeda" and is correctly
//     gated out by isSaleTitle before any adapter code would touch its PDF).
//
// Groundtruth (hand-verified against the live pages/PDFs):
//   Synagogalna 13, lokal mieszkalny nr 9 (announce id 140 / result id 135 +
//   142): cena wywoławcza 299 130 zł, auction 2026-04-29, area 46,02 m²,
//   wadium deadline 2026-04-28. Result: SOLD to ASTORGA MED Sp. z o.o. for
//   299 630 zł (both the id-135 and id-142 result notices point at the SAME
//   protocol text; id 142's title omits "nr 9" — the unit number is
//   backfilled from the protocol body, see unitNoFromText).
//   Sienkiewicza 64, nieruchomość gruntowa zabudowana (announce id 119 /
//   result id 123): cena wywoławcza 1 150 000 zł, auction 2025-08-28, plot
//   0,12431 ha = 1243 m². Result: SOLD (a winner NIP/REGON letterhead survives
//   after "Podpis wygrywającego przetarg:") but the achieved-price line itself
//   OCR'd to noise — final_price_pln stays null with an explanatory note.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListItems,
  maxPageFromPagingPanel,
  bodyTextFromDetail,
  attachmentsFromDetail,
} from '../src/cities/plock/crawl.js';
import {
  parsePLN,
  parseArea,
  isSaleTitle,
  streetBuildingFromTitle,
  unitNoFromText,
  addressRawFromTitle,
  startingPriceFromText,
  auctionDateFromText,
  resultDateFromText,
  wadiumDeadlineFromText,
  flatAreaFromText,
  plotAreaHaFromText,
  achievedPriceFromResult,
  hasWinnerRegistrationBlock,
  isNegativeResult,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/plock/parse.js';

// --------------------------------------------------------------- fixtures

// Condensed real excerpt of ogloszenia_p1.html (fetched live 2026-07-18):
// two SALE items, one RENTAL item, and the real pagingPanel (8 pages).
const BOARD_LIST_HTML = `
<div class="listing">
    <div class="listing-title"><a href="/pl/przetargi/141/Publiczny-przetarg-ustny-na-wynajem-lokalu-uzytkowego-nr-4-zlokalizowanego-w-budynku-Tumska-13-w-Plocku">Publiczny przetarg ustny na wynajem lokalu użytkowego nr 4 zlokalizowanego w budynku Tumska 13 w Płocku</a></div>
    <span class="listing-additional-info">
        Dodano: <b>23-04-2026</b>
    </span>
    <span class="listing-action-links">
<a href="/pl/przetargi/141/x">czytaj dalej &#187;</a>        </span>
</div>
<div class="listing">
    <div class="listing-title"><a href="/pl/przetargi/140/Publiczny-przetarg-ustny-na-sprzedaz-lokalu-mieszkalnego-nr-9_-polozonego-w-budynku-mieszkalnym--zlokalizowanym-w-Plocku-przy-ul_Synagogalna-13_">Publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, położonego w budynku mieszkalnym  zlokalizowanym w Płocku przy ul. Synagogalna 13.</a></div>
    <span class="listing-additional-info">
        Dodano: <b>15-04-2026</b>
    </span>
    <span class="listing-action-links">
<a href="/pl/przetargi/140/x">czytaj dalej &#187;</a>        </span>
</div>
<div class="listing">
<a href="/pl/Auction/Details/127?title=x"><img class="img-responsive img-thumbnail" src="/Gallery/Auction/pt_127.jpg" width="200" /></a>
    <div class="listing-title"><a href="/pl/Auction/Details/127?title=3-przetarg-Remont">3 przetarg Remont i przebudowa lokalu mieszkalnego w budynku mieszkalnym w Płocku przy ul. Tumskiej 13 m. 3</a></div>
    <span class="listing-additional-info">
        Dodano: <b>26-09-2025</b>
    </span>
    <span class="listing-action-links">
<a href="/pl/Auction/Details/127?title=x">czytaj dalej &#187;</a>        </span>
</div>

<div class="pagingPanel">
            <a href="/pl/przetargi/ogloszenia-o-przetargach" class="active">1</a>
        <a href="/pl/przetargi/ogloszenia-o-przetargach/2" class="">2</a>
        <a href="/pl/przetargi/ogloszenia-o-przetargach/3" class="">3</a>
        <a href="/pl/przetargi/ogloszenia-o-przetargach/4" class="">4</a>
        <a href="/pl/przetargi/ogloszenia-o-przetargach/5" class="">5</a>
        <a href="/pl/przetargi/ogloszenia-o-przetargach/6" class="">6</a>
        <a href="/pl/przetargi/ogloszenia-o-przetargach/7" class="">7</a>
        <a href="/pl/przetargi/ogloszenia-o-przetargach/8" class="">8</a>
    <a href="/pl/przetargi/ogloszenia-o-przetargach/2">następna &#187;</a></div>
`;

// Real detail-page markup (id 140 — Ogloszenia.pdf + Regulamin.pdf attachments).
const DETAIL_140_HTML = `
<h2 class="standard">Publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, położonego w budynku mieszkalnym  zlokalizowanym w Płocku przy ul. Synagogalna 13.</h2>

<div class="standard-content">
    <p>Publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, położonego w budynku mieszkalnym zlokalizowanym w Płocku przy ul. Synagogalna 13.</p>
</div>
<div class="standard-gallery">
    <h3>Załączniki</h3>
        <p>
            <a href="/pl/AttachmentGallery/GetAttachment/569" class="btn btn-default">
                <span class="glyphicon glyphicon-download"></span> Ogloszenie.pdf
            </a>
        </p>
        <p>
            <a href="/pl/AttachmentGallery/GetAttachment/570" class="btn btn-default">
                <span class="glyphicon glyphicon-download"></span> Regulamin.pdf
            </a>
        </p>

</div>
`;

// pdftotext -layout of the born-digital Ogloszenie.pdf, GetAttachment/569
// (Synagogalna 13 lokal 9 flat announcement) — verbatim load-bearing
// sentences (room-by-room areas kept, to prove the labelled-area pattern is
// tried BEFORE the bare "o powierzchni" fallback that would otherwise catch
// a room's own area).
const PDF_569_FLAT_ANNOUNCE = `
ogłasza publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, położonego w budynku mieszkalnym
zlokalizowanym w Płocku przy ul. Synagogalna 13.

Lokal mieszkalny nr 9 położony jest na II piętrze budynku. W jego skład wchodzą:
• I pokój o powierzchni 8,70 m2
• II pokój o powierzchni 9,30 m2
• kuchnia o powierzchni 5,72 m2
 Powierzchnia lokalu wynosi 46,02 m2.

Cena wywoławcza brutto wynosi 299.130,00 zł., natomiast wysokość minimalnego postąpienia wynosi
500,00 zł netto.

Warunkiem przystąpienia do przetargu jest wpłacenie wadium w wysokości 29.913,00 zł w terminie do dnia
28.04.2026r. godz. 15.00 na konto Spółki ARS w banku Pekao S.A., nr konta 22 1240 3174 1111 0000 2891 4152.

Przetarg odbędzie się w siedzibie Spółki w Płocku, przy Pl. Stary Rynek 5 lok. 6A III piętro (wejście od ulicy
Bielskiej) - sala konferencyjna w dniu 29.04.2026r. o godz. 10:00

Wszelkie informacje dotyczące przedmiotu przetargu i regulaminu można uzyskać:
1) w Biurze Obsługi Klienta ARS Sp. z o.o. ul. Synagogalna 9/11 w Płocku od poniedziałku do piątku
   w godz. 8.00 – 15.00,
`;

// OCR (tesseract -l pol) of the SCANNED Ogloszenie.pdf, GetAttachment/538
// (Sienkiewicza 64 building announcement) — verbatim load-bearing sentences
// from pages 1 and 6-7 of the real 8-page scan.
const OCR_538_BUILDING_ANNOUNCE = `
ogłasza publiczny przetarg ustny na sprzedaż nieruchomości gruntowej zabudowanej, położonej w Płocku przy
ul. Sienkiewicza 64, na działce o numerze ewidencyjnym 230 o powierzchni 0,12431ha, stanowiącą własność
Agencji Rewitalizacji Starówki ARS Spółka z ograniczoną odpowiedzialnością. Nieruchomość zabudowana jest
budynkiem mieszkalnym o powierzchni zabudowy 157 m?, oraz 3 budynkami niemieszkalnymi.

zabudowy 157 m?
Powierzchnie
użytkowa 5 lokali mieszkalnych; 117,81 m?
Kubatura 655 m3

Cena wywoławcza brutto wynosi 1.150.000,00 zł (słownie: jeden milion sto pięćdziesiąt tysięcy złotych ),
natomiast wysokość minimalnego postąpienia wynosi 1.000,00 zł.

Warunkiem przystąpienia do przetargu jest wpłacenie wadium w wysokości 57.500,00 zł
(słownie: pięćdziesiąt siedem tysięcy pięćset złotych) w terminie do 27.08.2025r. godz. 14:00 na konto Spółki
ARS w banku Pekao S.A. nr konta 22 1240 3174 1111 0000 2891 4152.

Przetarg odbędzie się w siedzibie Spółki w Płocku, przy Pl. Stary Rynek 5 lok. 6A III piętro (wejście od ulicy
Bielskiej) - sala konferencyjna w dniu 28.08.2025r. o godz. 13:00
`;

// pdftotext -layout of the born-digital protokol.pdf, GetAttachment/573 —
// FULL real text (Synagogalna 13 lokal 9, SOLD to ASTORGA MED Sp. z o.o. for
// 299 630 zł). Note clause 6's negative boilerplate is printed regardless —
// see parse.js header note.
const PROTOKOL_573_FLAT_SOLD = `
                                         PROTOKÓŁ
                                      z dn.29.04.2026r.
   z przeprowadzonego ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego
nr 9 wraz z pomieszczeniem przynależnym zlokalizowanym w budynku Synagogalna 13 w Płocku

Komisja powołana Uchwałą nr 11/2899/Z/26 z dn. 03.03.2026r. Zarządu Agencji Rewitalizacji Starówki
ARS Sp. z o.o.

w dniu 29.04.2026r. r. przeprowadziła ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 9
zlokalizowanego w budynku przy ul. Synagogalnej 13 w Płocku, o powierzchni 46,02 m2 i powierzchni piwnicy
9,35 m2 położonego na działce o numerze ewidencyjnym 1116.
1/ Przetarg ustny nieograniczony odbył się w siedzibie Agencji Rewitalizacji Starówki ARS Sp. z o.o., III piętro Plac
Stary Rynek 5 lok.6A w Płocku o godzinie 10.00, a zakończył o godzinie 10.30.
2/ Przed przystąpieniem do licytacji Przewodniczący Komisji poinformował zebranych o warunkach i przedmiocie
przetargu, w szczególności o zasadach licytacji, kwocie wywoławczej która ustalona została w wysokości
299 130,00 zł brutto oraz minimalnym postąpieniu, które ustalono w wysokości 500,00 zł
3/ W przetargu wziął udział 1 (jeden) uczestnik, który spełnił warunki dopuszczające do przetargu.
4/ Do przetargu nie zostało dopuszczonych .......--------....... osób z powodu:
5/ W wyniku licytacji przetarg na sprzedaż lokalu mieszkalnego nr 9 w budynku przy Synagogalnej 13 w Płocku
wygrała ASTORGA MED Sp. z o.o., adres: ul. Osiedle pod jodłami nr 16, Nowe Grabie 09 – 530, poczta Gąbin,
reprezentowana przez Prezesa Zarządu Waldemara Królaka, za cenę brutto 299 630,00 zł (słownie dwieście
dziewięćdziesiąt dziewięć tysięcy sześćset trzydzieści złotych, 00/100).
6/ Przetarg zakończył się wynikiem negatywnym z uwagi na brak uczestników przetargu. *
Na tym protokół odczytano, zakończono i podpisano.
Podpis wygrywającego przetarg:

/ - / Waldemar Królak
`;

// OCR of the SCANNED protokol.pdf, GetAttachment/543 (Sienkiewicza 64
// building, a genuine SOLD auction whose achieved-price line OCR'd to noise —
// only the winner's registration-block letterhead survived cleanly).
const OCR_543_BUILDING_SOLD_GARBLED = `
PROTOKÓŁ
z dn.28.08.2025r.
z przeprowadzonego ustnego przetargu nieograniczonego na sprzedaż nieruchomości
gruntowej zabudowanej, położonej w Płocku przy ul. Sienkiewicza 64.

4/ Do przetargu nie zostało dopuszczonych ................... osób z powodu:

brutto....4 (AARD OO.....zł (Słownie: a2N... STOP EC OZESLĄTIAZM TYSĄCE. AALYOO
6/ Przetarg zakończył się wynikiem negatywnym z uwagi na brak uczestników przetargu. *

Podpis wygrywającego przetarg :

Przedsiębiorstwo Budowark
INVEST BUD |
Karol Wiśniew
09-409 Pióck ule | 2
NIP 774-24-70-489, REGON 611318918
`;

// OCR of the SCANNED protokol.pdf, GetAttachment/562 — a RENTAL auction
// result (Grodzka 8 lok. 3, "wynajem lokalu użytkowego"). Its real board title
// ("Protokołu z licytacji Grodzka 8 lok 3") has no "sprzeda" and is correctly
// gated out by isSaleTitle before any adapter code touches this text — used
// here only to groundtruth the low-level outcome functions against a genuine
// UNSOLD (blank clause 5) protocol.
const OCR_562_RENTAL_UNSOLD = `
PROTOKÓŁ
z dn.16.03.2026 r.
z przeprowadzonego ustnego przetargu nieograniczonego na wynajem lokalu użytkowego
zlokalizowanego w budynku Grodzka 8 lokal nr 3 w Płocku o powierzchni 51,30 m?.

5/W wyniku przeprowadzonej licytacji przetarg na wynajem lokalu
WYJTAłA eaten WONSONESSTOC OC ENEA
Za stawkę netto ..................... zł (słownie................ 0 ZZOZ PACKET DJOĄ )
6/ Przetarg zakończył się wynikiem negatywnym z uwagi na brak uczestników przetargu.*
`;

// --------------------------------------------------------------- board list

test('parseListItems: extracts title, absolute detail_url, and Dodano date', () => {
  const items = parseListItems(BOARD_LIST_HTML);
  assert.equal(items.length, 3);
  const flat = items.find((i) => /Synagogalna 13/.test(i.title));
  assert.ok(flat);
  assert.equal(
    flat.detail_url,
    'http://www.ars.plock.pl/pl/przetargi/140/Publiczny-przetarg-ustny-na-sprzedaz-lokalu-mieszkalnego-nr-9_-polozonego-w-budynku-mieszkalnym--zlokalizowanym-w-Plocku-przy-ul_Synagogalna-13_',
  );
  assert.equal(flat.published_date, '2026-04-15');
});

test('maxPageFromPagingPanel: reads the real 8-page panel', () => {
  assert.equal(maxPageFromPagingPanel(BOARD_LIST_HTML), 8);
});

test('maxPageFromPagingPanel: a single-page board (no panel) returns 1', () => {
  assert.equal(maxPageFromPagingPanel('<div class="listing">only one page</div>'), 1);
});

test('bodyTextFromDetail + attachmentsFromDetail on the real id-140 detail page', () => {
  const body = bodyTextFromDetail(DETAIL_140_HTML);
  assert.match(body, /sprzedaż lokalu mieszkalnego nr 9/);
  const atts = attachmentsFromDetail(DETAIL_140_HTML);
  assert.equal(atts.length, 2);
  assert.match(atts[0].url, /GetAttachment\/569$/);
  assert.equal(atts[0].name, 'Ogloszenie.pdf');
  assert.match(atts[1].name, /Regulamin/i);
});

// --------------------------------------------------------------- basic numeric parsers

test('parsePLN: dot-thousands, space-thousands, and a plain integer', () => {
  assert.equal(parsePLN('299.130,00'), 299130);
  assert.equal(parsePLN('299 630,00'), 299630);
  assert.equal(parsePLN('1.150.000,00'), 1150000);
  assert.equal(parsePLN('500,00'), 500);
  assert.equal(parsePLN(null), null);
});

test('parseArea: comma and dot decimals', () => {
  assert.equal(parseArea('46,02'), 46.02);
  assert.equal(parseArea('0.12431'), 0.12431);
  assert.equal(parseArea(null), null);
});

// --------------------------------------------------------------- sale-title gate

test('isSaleTitle: real sale titles pass', () => {
  assert.equal(
    isSaleTitle(
      'Publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, położonego w budynku mieszkalnym  zlokalizowanym w Płocku przy ul. Synagogalna 13.',
    ),
    true,
  );
  assert.equal(
    isSaleTitle('Przetarg ustny na sprzedaż nieruchomości gruntowej zabudowanej, położonej w Płocku przy ul. Sienkiewicza 64'),
    true,
  );
  assert.equal(isSaleTitle('Protokół: Sprzedaż lokalu mieszkalnego nr 9 w budynku przy ul. Synagogalnej 13 w Płocku'), true);
});

test('isSaleTitle: rentals and construction/procurement noise are excluded', () => {
  assert.equal(isSaleTitle('Publiczny przetarg ustny na wynajem lokalu użytkowego nr 4 zlokalizowanego w budynku Tumska 13 w Płocku'), false);
  assert.equal(
    isSaleTitle(
      'Remont i przebudowa lokali mieszkalnych wraz z modernizacją instalacji elektrycznej, wodno-kanalizacyjnej i centralnego ogrzewania w budynku wielorodzinnym przy ul. Kwiatka 11 m. 12 i 13 - 2 postępowanie',
    ),
    false,
  );
  assert.equal(
    isSaleTitle('3 przetarg Remont i przebudowa lokalu mieszkalnego w budynku mieszkalnym w Płocku przy ul. Tumskiej 13 m. 3'),
    false,
  );
  assert.equal(isSaleTitle('Ogłoszenie o przetargu ustnym nieograniczonym na dzierżawę gruntu zlokalizowanego przy ul. Nabrzeże Stanisława Górnickiego'), false);
  assert.equal(isSaleTitle('Sukcesywna dostawa oleju opałowego do kotłowni w zachodniej części budynku Szkoły Podstawowej nr 5'), false);
  assert.equal(isSaleTitle('Zaproszenie do składania ofert - badanie sprawozdania finansowego za 2024 i 2025 rok'), false);
  assert.equal(
    isSaleTitle(
      'Zawiadomienie o wyborze oferty najkorzystniejszej w postępowaniu pn.: "Remont i przebudowa lokalu mieszkalnego wraz z modernizacją instalacji elektrycznej ... w budynku wielorodzinnym przy ul. Jerozolimskiej 2/4 m. 6 w Płocku”',
    ),
    false,
  );
  assert.equal(isSaleTitle('Protokół z licytacji najmu lokalu użytkowego nr 4 zlokalizowanego w budynku przy ul. Tumskiej 13 w Płocku'), false);
  assert.equal(isSaleTitle('Protokołu z licytacji na wynajem lokalu użytkowego Tumska 13 lok 4'), false);
  // Ambiguous real title with neither "sprzeda" nor a lease word (confirmed
  // live to be the Grodzka 8 lok. 3 RENTAL result) — correctly excluded
  // (false negatives over false positives for a low-volume city).
  assert.equal(isSaleTitle('Protokołu z licytacji Grodzka 8 lok 3'), false);
});

// --------------------------------------------------------------- address extraction

test('streetBuildingFromTitle: "ul." form and the letter-suffix building', () => {
  assert.deepEqual(streetBuildingFromTitle('... przy ul. Synagogalna 13.'), { street: 'Synagogalna', building: '13' });
  assert.deepEqual(streetBuildingFromTitle('... przy ul. Bielskiej 23A, na działce ...'), { street: 'Bielskiej', building: '23A' });
});

test('streetBuildingFromTitle: "w budynku" fallback when a title omits "ul."', () => {
  assert.deepEqual(
    streetBuildingFromTitle('Przetarg ustny na sprzedaż lokalu mieszkalnego nr 9 w budynku Synagogalna 13 w Płocku wraz z pomieszczeniem przynależnym'),
    { street: 'Synagogalna', building: '13' },
  );
});

test('streetBuildingFromTitle: no match returns null', () => {
  assert.equal(streetBuildingFromTitle('Zaproszenie do składania ofert - badanie sprawozdania finansowego'), null);
});

test('unitNoFromText: "lokal(u) ... nr N" in a title or a PDF body', () => {
  assert.equal(unitNoFromText('sprzedaż lokalu mieszkalnego nr 9, położonego w budynku'), '9');
  assert.equal(unitNoFromText('na sprzedaż lokalu mieszkalnego\nnr 9 wraz z pomieszczeniem przynależnym'), '9');
  assert.equal(unitNoFromText('Przetarg ustny na sprzedaż nieruchomości gruntowej zabudowanej'), null);
});

test('addressRawFromTitle: combines street/building with a backfilled unit number', () => {
  assert.equal(addressRawFromTitle('przy ul. Synagogalna 13.', '9'), 'ul. Synagogalna 13/9');
  assert.equal(addressRawFromTitle('przy ul. Sienkiewicza 64', null), 'ul. Sienkiewicza 64');
  assert.equal(addressRawFromTitle('no street here', '9'), null);
});

// --------------------------------------------------------------- price / date / area

test('startingPriceFromText: "Cena wywoławcza ... wynosi" (announcement) and the protocol restatement', () => {
  assert.equal(startingPriceFromText(PDF_569_FLAT_ANNOUNCE), 299130);
  assert.equal(startingPriceFromText(OCR_538_BUILDING_ANNOUNCE), 1150000);
  assert.equal(startingPriceFromText(PROTOKOL_573_FLAT_SOLD), 299130); // "kwocie wywoławczej ... w wysokości"
});

test('auctionDateFromText: "w dniu ... o godz", not the wadium/document deadline', () => {
  assert.equal(auctionDateFromText(PDF_569_FLAT_ANNOUNCE), '2026-04-29');
  assert.equal(auctionDateFromText(OCR_538_BUILDING_ANNOUNCE), '2025-08-28');
});

test('resultDateFromText: the protocol header "PROTOKÓŁ z dn. ..."', () => {
  assert.equal(resultDateFromText(PROTOKOL_573_FLAT_SOLD), '2026-04-29');
  assert.equal(resultDateFromText(OCR_543_BUILDING_SOLD_GARBLED), '2025-08-28');
});

test('wadiumDeadlineFromText', () => {
  assert.equal(wadiumDeadlineFromText(PDF_569_FLAT_ANNOUNCE), '2026-04-28');
  assert.equal(wadiumDeadlineFromText(OCR_538_BUILDING_ANNOUNCE), '2025-08-27');
});

test('flatAreaFromText: the labelled "Powierzchnia lokalu wynosi" line wins over room subareas', () => {
  assert.equal(flatAreaFromText(PDF_569_FLAT_ANNOUNCE), 46.02);
});

test('plotAreaHaFromText: hectares -> m2', () => {
  assert.equal(plotAreaHaFromText(OCR_538_BUILDING_ANNOUNCE), 1243);
});

// --------------------------------------------------------------- result outcome

test('achievedPriceFromResult: a filled clause 5 ("za cenę brutto ... zł")', () => {
  assert.equal(achievedPriceFromResult(PROTOKOL_573_FLAT_SOLD), 299630);
});

test('achievedPriceFromResult: null on a blank clause 5 (dots) or OCR-garbled noise', () => {
  assert.equal(achievedPriceFromResult(OCR_562_RENTAL_UNSOLD), null);
  assert.equal(achievedPriceFromResult(OCR_543_BUILDING_SOLD_GARBLED), null);
});

test('hasWinnerRegistrationBlock: a real NIP/REGON letterhead after the signature line', () => {
  assert.equal(hasWinnerRegistrationBlock(OCR_543_BUILDING_SOLD_GARBLED), true);
  assert.equal(hasWinnerRegistrationBlock(PROTOKOL_573_FLAT_SOLD), false); // personal signature, no company block
  assert.equal(hasWinnerRegistrationBlock(OCR_562_RENTAL_UNSOLD), false);
});

test('isNegativeResult: the boilerplate clause 6 is printed unconditionally (informational only)', () => {
  assert.equal(isNegativeResult(PROTOKOL_573_FLAT_SOLD), true); // genuinely SOLD despite this
  assert.equal(isNegativeResult(OCR_562_RENTAL_UNSOLD), true);
});

// --------------------------------------------------------------- parseAnnouncement (crawlActive)

test('parseAnnouncement: flat (Synagogalna 13/9) — full real fixture', () => {
  const rec = parseAnnouncement({
    title:
      'Publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, położonego w budynku mieszkalnym  zlokalizowanym w Płocku przy ul. Synagogalna 13.',
    bodyText: 'Publiczny przetarg ustny na sprzedaż lokalu mieszkalnego nr 9, położonego w budynku mieszkalnym zlokalizowanym w Płocku przy ul. Synagogalna 13.',
    pdfText: PDF_569_FLAT_ANNOUNCE,
    detailUrl: 'http://www.ars.plock.pl/pl/przetargi/140/x',
    publishedDate: '2026-04-15',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'synagogalna|13|9');
  assert.equal(rec.area_m2, 46.02);
  assert.equal(rec.starting_price_pln, 299130);
  assert.equal(rec.auction_date, '2026-04-29');
  assert.equal(rec.wadium_deadline, '2026-04-28');
  assert.equal(rec.land_area_m2, undefined); // flats never carry a plot area
});

test('parseAnnouncement: whole building sale (Sienkiewicza 64) — kind zabudowana, land_area_m2', () => {
  const rec = parseAnnouncement({
    title: 'Przetarg ustny na sprzedaż nieruchomości gruntowej zabudowanej, położonej w Płocku przy ul. Sienkiewicza 64',
    bodyText:
      'Agencja Rewitalizacji Starówki ARS Sp.   z o.o. ogłasza publiczny przetarg ustny na sprzedaż nieruchomości gruntowej zabudowanej, położonej w Płocku przy ul. Sienkiewicza 64, na działce o numerze ewidencyjnym 230 o powierzchni 0,12431ha.',
    pdfText: OCR_538_BUILDING_ANNOUNCE,
    detailUrl: 'http://www.ars.plock.pl/pl/przetargi/119/x',
    publishedDate: '2025-06-20',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'sienkiewicza|64|');
  assert.equal(rec.area_m2, null); // building floor area not extracted; see plot area instead
  assert.equal(rec.land_area_m2, 1243);
  assert.equal(rec.starting_price_pln, 1150000);
  assert.equal(rec.auction_date, '2025-08-28');
});

test('parseAnnouncement: rentals and unrecognised-kind titles return null', () => {
  assert.equal(
    parseAnnouncement({ title: 'Publiczny przetarg ustny na wynajem lokalu użytkowego nr 4 w budynku Tumska 13', bodyText: '', pdfText: '' }),
    null,
  );
  assert.equal(
    parseAnnouncement({ title: 'Zaproszenie do składania ofert - badanie sprawozdania finansowego', bodyText: '', pdfText: '' }),
    null,
  );
});

// --------------------------------------------------------------- parseResultDoc (crawlResultDocs)

test('parseResultDoc: flat SOLD, title carries the unit number (id 135)', () => {
  const title = 'Protokół: Sprzedaż lokalu mieszkalnego nr 9 w budynku przy ul. Synagogalnej 13 w Płocku o powierzchni 46,02 m2';
  const text = `TYTUL: ${title}\n\n${PROTOKOL_573_FLAT_SOLD}`;
  const recs = parseResultDoc(text, null, 'http://www.ars.plock.pl/pl/Auction/Details/135');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'synagogalnej|13|9'); // coalesced with the nominative key by build-properties
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 299630);
  assert.equal(r.starting_price_pln, 299130);
  assert.equal(r.auction_date, '2026-04-29');
  assert.equal(r.area_m2, 46.02);
  assert.equal(r.source_pdf, 'http://www.ars.plock.pl/pl/Auction/Details/135');
});

test('parseResultDoc: flat SOLD, title OMITS the unit number — backfilled from the protocol body (id 142)', () => {
  const title = 'Protokołu z licytacji sprzedaży lokalu mieszkalnego przy ul. Synagogalnej 13.';
  const text = `TYTUL: ${title}\n\n${PROTOKOL_573_FLAT_SOLD}`;
  const recs = parseResultDoc(text, null, 'http://www.ars.plock.pl/pl/przetargi/142/x');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].address.key, 'synagogalnej|13|9'); // "9" backfilled, same key as id 135
  assert.equal(recs[0].outcome, 'sold');
  assert.equal(recs[0].final_price_pln, 299630);
});

test('parseResultDoc: building SOLD but achieved-price line OCR-garbled — inferred SOLD via winner registration block', () => {
  const title = 'Protokuł: Sprzedaż nieruchomości gruntowej zabudowanej, położonej w Płocku przy ul. Sienkiewicza 64 ';
  const text = `TYTUL: ${title}\n\n${OCR_543_BUILDING_SOLD_GARBLED}`;
  const recs = parseResultDoc(text, null, 'http://www.ars.plock.pl/pl/Auction/Details/123');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'sienkiewicza|64|');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, null); // unrecoverable — see the note
  assert.equal(r.auction_date, '2025-08-28');
  assert.ok(r.notes.some((n) => /winner registration block/.test(n)));
});

test('parseResultDoc: a rental result never reaches the parser (gated by isSaleTitle upstream)', () => {
  const title = 'Protokołu z licytacji Grodzka 8 lok 3';
  const text = `TYTUL: ${title}\n\n${OCR_562_RENTAL_UNSOLD}`;
  assert.deepEqual(parseResultDoc(text, null, 'http://www.ars.plock.pl/pl/przetargi/134/x'), []);
});

test('parseResultDoc: no TYTUL marker (malformed input) returns no records rather than throwing', () => {
  assert.deepEqual(parseResultDoc('', null, 'http://example.invalid'), []);
  assert.deepEqual(parseResultDoc('just some text with no marker', null, 'http://example.invalid'), []);
});
