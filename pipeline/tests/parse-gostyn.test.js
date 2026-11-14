import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  roundFromText,
  announcementDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  parcelFromText,
  localityFromText,
  streetFromHeader,
  addressRawFromText,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isResultNotice,
  parseArticleList,
  extractTitle,
  extractAttachments,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/gostyn/parse.js';


const BURMISTRZ_ANNOUNCE = `BURMISTRZ GOSTYNIA
ogłasza II przetarg ustny nieograniczony
na sprzedaż prawa własności do nieruchomości położonej w Sikorzynie gmina Gostyń, oznaczonej w ewidencji gruntów i budynków jako działka nr 107/2 o powierzchni 0,1010 ha, zapisanej w księdze wieczystej KW PO1Y/00022485/3 wraz z udziałem 1/7 części w działkach nr 107/3 i nr 107/8 o łącznej powierzchni 0,0742 ha, zapisanej w księdze wieczystej KW PO1Y/00045131/4
Cena wywoławcza: 52.000,00 zł netto
wadium: 8.000,00 zł
Przetarg odbędzie się w dniu 22 czerwca 2022 roku o godz. 930 w siedzibie Urzędu Miejskiego w Gostyniu przy ul. Wrocławskiej 256 (salka narad – piwnica).
BURMISTRZ GOSTYNIA
ogłasza II przetarg ustny nieograniczony
na sprzedaż prawa własności do nieruchomości położonej w Sikorzynie gmina Gostyń, oznaczonej w ewidencji gruntów i budynków jako działka nr 107/5 o powierzchni 0,1002 ha, zapisanej w księdze wieczystej KW PO1Y/00022485/3 wraz z udziałem 1/7 części w działkach nr 107/3 i nr 107/8 o łącznej powierzchni 0,0742 ha, zapisanej w księdze wieczystej KW PO1Y/00045131/4
Cena wywoławcza: 51.000,00 zł netto
wadium: 8.000,00 zł
Przetarg odbędzie się w dniu 22 czerwca 2022 roku o godz. 1000 w siedzibie Urzędu Miejskiego w Gostyniu przy ul. Wrocławskiej 256 (salka narad – piwnica).
BURMISTRZ GOSTYNIA
ogłasza II przetarg ustny nieograniczony
na sprzedaż prawa własności do nieruchomości położonej w Sikorzynie gmina Gostyń, oznaczonej w ewidencji gruntów i budynków jako działka nr 107/7 o powierzchni 0,0975 ha, zapisanej w księdze wieczystej KW PO1Y/00022485/3 wraz z udziałem 1/7 części w działkach nr 107/3 i nr 107/8 o łącznej powierzchni 0,0742 ha, zapisanej w księdze wieczystej KW PO1Y/00045131/4
Cena wywoławcza: 50.000,00 zł netto
wadium: 8.000,00 zł
Przetarg odbędzie się w dniu 22 czerwca 2022 roku o godz. 1030 w siedzibie Urzędu Miejskiego w Gostyniu przy ul. Wrocławskiej 256 (salka narad – piwnica).`;

const WYNIK_OCR = `INFORMACJA

Na podstawie $ 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 roku
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(tekst jednolity Dz. U. z 2021 roku, poz. 2213), Burmistrz Gostynia informuje, że w dniu
22 czerwca 2022 roku w Urzędzie Miejskim w Gostyniu przy ul. Wrocławskiej 256
przeprowadzony został II przetarg ustny nieograniczony na sprzedaż prawa własności do
nieruchomości, położonej w Sikorzynie gmina Gostyń, oznaczonej w ewidencji gruntów
i budynków jako działka nr 107/2 o powierzchni 0,1010 ha, zapisanej w księdze wieczystej
Kw POLY/00022485/3 wraz z udziałem 1/7 części w działkach nr 107/3 i nr 107/8 o łącznej
powierzchni 0,0742 ha, zapisanej w księdze wieczystej KW PO1Y/00045131/4.
Cenę wywoławczą nieruchomości ustalono w wysokości 52.000,00 zł netto.

W wyniku przeprowadzonego przetargu osiągnięto cenę 55.000,00 zł netto.

Nabywcą przedmiotowej nieruchomości został: Krzysztof Wojtkowiak.
BUGMISTRZ GOSTYNIA

INFORMACJA

Na podstawie $ 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 roku
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(tekst jednolity Dz. U. z 2021 roku, poz. 2213), Burmistrz Gostynia informuje, że w dniu
22 czerwca 2022 roku w Urzędzie Miejskim w Gostyniu przy ul. Wrocławskiej 256
przeprowadzony został II przetarg ustny nieograniczony na sprzedaż prawa własności do
nieruchomości, położonej w Sikorzynie gmina Gostyń, oznaczonej w ewidencji gruntów
i budynków jako działka nr 107/7 o powierzchni 0,0975 ha, zapisanej w księdze wieczystej
Kw POLY/00022485/3 wraz z udziałem 1/7 części w działkach nr 107/3 i nr 107/8 o łącznej
powierzchni 0,0742 ha, zapisanej w księdze wieczystej KW PO1Y/00045131/4.
Cenę wywoławczą nieruchomości ustalono w wysokości 50.000,00 zł netto.

W wyniku przeprowadzonego przetargu osiągnięto cenę 57.200,00 zł netto.

Nabywcą przedmiotowej nieruchomości został: Krzysztof Wojtkowiak.
BURMISTRZ GOSTYNIA

INFORMACJA

Na podstawie $ 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 roku
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(tekst jednolity Dz. U. z 2021 roku, poz. 2213), Burmistrz Gostynia informuje, że w dniu
22 czerwca 2022 roku w Urzędzie Miejskim w Gostyniu przy ul. Wrocławskiej 256
przeprowadzony został II przetarg ustny nieograniczony na sprzedaż prawa własności do
nieruchomości, położonej w Sikorzynie gmina Gostyń, oznaczonej w ewidencji gruntów
i budynków jako działka nr 107/5 o powierzchni 0,1002 ha, zapisanej w księdze wieczystej
KW PO1Y/00022485/3 wraz z udziałem 1/7 części w działkach nr 107/3 i nr 107/8 o łącznej
powierzchni 0,0742 ha, zapisanej w księdze wieczystej KW PO1Y/00045131/4.
Cenę wywoławczą nieruchomości ustalono w wysokości 51.000,00 zł netto.

W wyniku przeprowadzonego przetargu osiągnięto cenę 51.600,00 zł netto.

Nabywcą przedmiotowej nieruchomości został: Monika Kubiak.

BURMISTRZ GOSTYNIA`;

const ARTICLE_HTML = `<div id="main-content" class="contents">
<h1 id="content-header">II przetarg ustny nieograniczony (wyniki przetargu)</h1>
<section class="wysiwyg" aria-labelledby="content-header"><div><p>na sprzedaż prawa własności do nieruchomości położonych w Sikorzynie działki:</p></div></section>
<section id="attachments" class="attachments">
<h2>Załączniki</h2>
<div class="header">
<span><a id="attachments-title" title="Plik do pobrania" href="https://biuletyn.gostyn.pl/attachments/download/19214">Informacje o wyniku II przetargu na sprzedaż działek w Sikorzynie</a></span>
<span class="files textPDF">pdf, 509 kB</span>
</div>
<div class="header">
<span><a id="attachments-title" title="Plik do pobrania" href="https://biuletyn.gostyn.pl/attachments/download/19049">Szczegółowe informacje o II przetargu na sprzedaż działek w Sikorzynie</a></span>
<span class="files textWord">docx, 22 kB</span>
</div>
</section>
</div>`;

const XML_FEED = `<?phpxml version="1.0" encoding="UTF-8"?><biuletyn.gostyn.pl>
<oferty-miasta>
<strona>1</strona>
<ilosc-stron>1</ilosc-stron>
<ilosc-rekordow>1</ilosc-rekordow>
<artykuly>
<artykul>
<url>https://biuletyn.gostyn.pl/artykul/280/12356/ii-przetarg-ustny-nieograniczony-wyniki-przetargu</url>
<tytul>II przetarg ustny nieograniczony (wyniki przetargu)</tytul>
<data>11.05.2022</data>
<skrot><![CDATA[na sprzedaż prawa własności do nieruchomości położonych w Sikorzynie działki: nr 107/2 pow. 0,1010 ha...]]></skrot>
</artykul>
</artykuly>
</oferty-miasta>
</biuletyn.gostyn.pl>`;


test('parsePLN: dotted thousands (Gostyń form) + grosze tail', () => {
  assert.equal(parsePLN('52.000,00'), 52000);
  assert.equal(parsePLN('57.200,00'), 57200);
  assert.equal(parsePLN('136.000,-'), 136000);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: ha decimal with comma/dot', () => {
  assert.equal(parseArea('0,1010'), 0.101);
  assert.equal(parseArea('0.0975'), 0.0975);
});

test('roundFromText: Roman "II przetarg ustny" -> 2 (and word ordinal fallback)', () => {
  assert.equal(roundFromText('ogłasza II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('przeprowadzony został III przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('drugi przetarg na sprzedaż'), 2);
});

test('resultDateFromText: anchors on "informuje … w dniu", NOT the rozporządzenie "z dnia 14 września 2004"', () => {
  assert.equal(resultDateFromText(WYNIK_OCR), '2022-06-22');
});

test('announcementDateFromText: "Przetarg odbędzie się w dniu 22 czerwca 2022 roku"', () => {
  assert.equal(announcementDateFromText(BURMISTRZ_ANNOUNCE), '2022-06-22');
});

test('startingPriceFromText: both "Cena wywoławcza: X" and "Cenę wywoławczą … ustalono w wysokości X"', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza: 52.000,00 zł netto'), 52000);
  assert.equal(startingPriceFromText('Cenę wywoławczą nieruchomości ustalono w wysokości 51.000,00 zł netto.'), 51000);
});

test('achievedPriceFromText: "osiągnięto cenę 55.000,00 zł"', () => {
  assert.equal(achievedPriceFromText('W wyniku przeprowadzonego przetargu osiągnięto cenę 55.000,00 zł netto.'), 55000);
  assert.equal(achievedPriceFromText('Cena wywoławcza: 52.000,00 zł netto'), null);
});

test('parcelFromText: main "działka nr 107/2 o powierzchni 0,1010 ha", NOT the udział "działkach … łącznej powierzchni"', () => {
  const p = parcelFromText(
    'jako działka nr 107/2 o powierzchni 0,1010 ha, zapisanej w księdze wieczystej KW PO1Y/00022485/3 wraz z udziałem 1/7 części w działkach nr 107/3 i nr 107/8 o łącznej powierzchni 0,0742 ha',
  );
  assert.equal(p.dzialka_nr, '107/2');
  assert.equal(p.area_m2, 1010);
});

test('localityFromText: "położonej w Sikorzynie gmina Gostyń" -> "Sikorzynie"', () => {
  assert.equal(localityFromText('nieruchomości położonej w Sikorzynie gmina Gostyń'), 'Sikorzynie');
});


test('title routing: results vs announcements vs skip vs board-232 planning noise', () => {
  assert.equal(isResultTitle('II przetarg ustny nieograniczony (wyniki przetargu)'), true);
  assert.equal(isAnnouncementTitle('I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isResultTitle('I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'), false);
  assert.equal(isSkippableTitle('I przetarg ustny nieograniczony na dzierżawę gruntu'), true);
  assert.equal(isSkippableTitle('Wykaz nieruchomości przeznaczonych do sprzedaży'), true);
  const planning = 'Obwieszczenie Burmistrza Gostynia o ustaleniu lokalizacji inwestycji celu publicznego RGM.PP.6733.18.2025';
  assert.equal(isSkippableTitle(planning), false);
  assert.equal(isResultTitle(planning), false);
  assert.equal(isAnnouncementTitle(planning), false);
});


test('parseArticleList: ignores the malformed <?phpxml prolog, DD.MM.YYYY -> ISO', () => {
  const { pages, items } = parseArticleList(XML_FEED);
  assert.equal(pages, 1);
  assert.equal(items.length, 1);
  assert.equal(items[0].url, 'https://biuletyn.gostyn.pl/artykul/280/12356/ii-przetarg-ustny-nieograniczony-wyniki-przetargu');
  assert.equal(items[0].title, 'II przetarg ustny nieograniczony (wyniki przetargu)');
  assert.equal(items[0].date, '2022-05-11');
});

test('extractTitle / extractAttachments: <h1 id="content-header"> + typed download links', () => {
  assert.equal(extractTitle(ARTICLE_HTML), 'II przetarg ustny nieograniczony (wyniki przetargu)');
  const atts = extractAttachments(ARTICLE_HTML);
  assert.equal(atts.length, 2);
  assert.equal(atts[0].url, 'https://biuletyn.gostyn.pl/attachments/download/19214');
  assert.equal(atts[0].ext, 'pdf');
  assert.match(atts[0].name, /Informacje o wyniku/);
  assert.equal(atts[1].url, 'https://biuletyn.gostyn.pl/attachments/download/19049');
  assert.equal(atts[1].ext, 'docx');
});


test('parseAnnouncement: the .docx yields THREE land records (one per działka) with real prices/areas', () => {
  const recs = parseAnnouncement(BURMISTRZ_ANNOUNCE);
  assert.equal(recs.length, 3);
  for (const r of recs) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.address_raw, null);
    assert.equal(r.obreb, 'Sikorzynie');
    assert.equal(r.round, 2);
    assert.equal(r.auction_date, '2022-06-22');
  }
  const by = Object.fromEntries(recs.map((r) => [r.dzialka_nr, r]));
  assert.equal(by['107/2'].area_m2, 1010);
  assert.equal(by['107/2'].starting_price_pln, 52000);
  assert.equal(by['107/5'].area_m2, 1002);
  assert.equal(by['107/5'].starting_price_pln, 51000);
  assert.equal(by['107/7'].area_m2, 975);
  assert.equal(by['107/7'].starting_price_pln, 50000);
});

test('parseAnnouncement: returns [] on RESULT text (never books a wynik notice as active)', () => {
  assert.deepEqual(parseAnnouncement(WYNIK_OCR), []);
});


test('parseResultDoc: the OCR yields THREE sold land results with cena wywoławcza + osiągnięta', () => {
  const recs = parseResultDoc(WYNIK_OCR, null, 'https://biuletyn.gostyn.pl/attachments/download/19214');
  assert.equal(recs.length, 3);
  for (const r of recs) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.outcome, 'sold');
    assert.equal(r.round, 2);
    assert.equal(r.auction_date, '2022-06-22');
    assert.equal(r.source_pdf, 'https://biuletyn.gostyn.pl/attachments/download/19214');
  }
  const by = Object.fromEntries(recs.map((r) => [r.dzialka_nr, r]));
  assert.equal(by['107/2'].starting_price_pln, 52000);
  assert.equal(by['107/2'].final_price_pln, 55000);
  assert.equal(by['107/2'].area_m2, 1010);
  assert.equal(by['107/7'].starting_price_pln, 50000);
  assert.equal(by['107/7'].final_price_pln, 57200);
  assert.equal(by['107/5'].starting_price_pln, 51000);
  assert.equal(by['107/5'].final_price_pln, 51600);
});

test('parseResultDoc: returns [] on ANNOUNCEMENT text (isResultNotice guard)', () => {
  assert.equal(isResultNotice(BURMISTRZ_ANNOUNCE), false);
  assert.deepEqual(parseResultDoc(BURMISTRZ_ANNOUNCE, null, 'x'), []);
});


test('flat helpers (ported from analog; no live Gostyń flat existed): street + "ul. …/apt" address', () => {
  const h = streetFromHeader('lokalu mieszkalnego nr 7 w budynku przy ul. Powstańców Wielkopolskich 8 w Gostyniu');
  assert.equal(h.street, 'Powstańców Wielkopolskich');
  assert.equal(h.building, '8');
  assert.equal(
    addressRawFromText('sprzedaż lokalu mieszkalnego nr 7 przy ul. Powstańców Wielkopolskich 8 w Gostyniu'),
    'ul. Powstańców Wielkopolskich 8/7',
  );
});
