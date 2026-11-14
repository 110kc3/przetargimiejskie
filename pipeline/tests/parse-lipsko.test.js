import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyKind } from '../src/core/classify-kind.js';
import {
  parsePLN,
  parseArea,
  parseDateText,
  roundFrom,
  classifyLipsko,
  isRental,
  isCancelled,
  extractTitle,
  extractPublishedDate,
  extractInlineBody,
  extractAttachmentUrl,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/lipsko/parse.js';


const WOLKA_TITLE = 'Informacja o wyniku przetargu - dzi. ewid 392/3 w Wólce';
const WOLKA_HTML = `<!doctype html><html><body>
<div class="article-area main-container ">
<article class="article-area__article ">
<h2>${WOLKA_TITLE}</h2>
<div class="editor-content">
<div><p><span style="font-size:12pt">Na podstawie &sect; 12 ust. 1 Rozporządzenia Rady Ministr&oacute;w z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzenia przetarg&oacute;w oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) Burmistrz Miasta i Gminy Lipsko informuje: Dnia 16.07.2024 r. o godz. 09.00 w siedzibie Urzędu Miasta i Gminy Lipsko, został przeprowadzony I przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości gruntowej niezabudowanej, oznaczonej w ewidencji gruntów jako działka nr 392/3 o powierzchni 0,1723 ha, położonej w obrębie geodezyjnym 0035 Wola Solecka Wólka. Cena wywoławcza nieruchomości wynosiła 56 600 zł, cena osiągnięta w przetargu: 57 170 zł netto. Osoby ustalone jako nabywcy nieruchomości: Zbigniew i Justyna małż. Stępień. Lipsko, dnia 24.07.2024 r.</span></p></div>
</div>
<div class="metrics">
<dl><div><dt>Pierwsza publikacja:</dt> <dd>24.07.2024 08:33 Fabian Smaga</dd></div></dl>
</div>
</article>
</div>
</body></html>`;

const ANN_TITLE =
  'Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż nieruchomości - dz. ewid nr 1332/2 w Lipsku';
const ANN_OCR = `MIASTO I GMINA LIPSKO
ul. 1 Maja 2, 27-300 Lipsko
województwo mazowieckie
OGŁOSZENIE O PRZETARGU NIEOGRANICZONYM
NA SPRZEDAŻ NIERUCHOMOŚCI GRUNTOWEJ NIEZABUDOWANEJ
POŁOŻONEJ W LIPSKU
Burmistrz Miasta i Gminy Lipsko ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej położonej w miejscowości Lipsko.
I. Przedmiotem sprzedaży jest prawo własności nieruchomości gruntowej niezabudowanej, oznaczonej w ewidencji gruntów jako działka ewid. nr 1332/2 o powierzchni 0,0018 ha, położonej w obrębie geodezyjnym 0001 Lipsko.
Aktualnie objęta umową dzierżawy, na której zlokalizowany jest nietrwale związany z gruntem garaż typu „blaszak” (nakłady dzierżawcy).
VI. Cena wywoławcza nieruchomości wynosi: 4200,00 zł (słownie: cztery tysiące dwieście złotych 00/100) w tym 2700 zł wart. działki, 1500 zł koszt przygotowania działki do zbycia.
VII. Przetarg odbędzie się w dniu 22.07.2025 r. (wtorek) o godzinie 10.00 w pokoju nr 25 w siedzibie Urzędu Miasta i Gminy Lipsko.`;

const R2_OCR = `MIASTO I GMINA LIPSKO
INFORMACJA O WYNIKU PRZETARGU
Na podstawie § 12 ust. 1 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) Burmistrz Miasta i Gminy Lipsko informuje:
1. Dnia 04 listopada 2025 r. o godz. 09.00 w siedzibie Urzędu Miasta i Gminy Lipsko został przeprowadzony II przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości gruntowej niezabudowanej, oznaczonej w ewidencji gruntów jako działka nr 1332/1 o powierzchni 0,0018 ha, położonej w obrębie geodezyjnym 0001 Lipsko.
2. Liczba osób dopuszczonych do uczestniczenia w przetargu: 1 osoba.
3. Cena wywoławcza nieruchomości wynosiła 4200,00 zł, cena osiągnięta w przetargu: 4250 zł netto.
4. Osoba ustalona jako nabywca nieruchomości: Dariusz Kaźmierski.
Lipsko, dnia 13.11.2025 r.`;

const ANN_PDF_HTML = `<!doctype html><html><body>
<article class="article-area__article ">
<h2>${ANN_TITLE}</h2>
<div class="editor-content">
<div></div>
</div>
<h3>Materiały</h3>
<a class="file-download" href="/attachment/0d535d85-7d1e-4e5c-950e-1d2084151984" target="_blank" download aria-label="Pobierz plik przetarg_Lipsko.pdf">Ogłoszenie o I przetargu — przetarg_Lipsko.pdf</a>
<div class="metrics"><dl><div><dt>Pierwsza publikacja:</dt> <dd>02.06.2025 00:00 Fabian Smaga</dd></div></dl></div>
</article>
</body></html>`;

const NEG_TEMPLATE = `INFORMACJA O WYNIKU PRZETARGU
Burmistrz Miasta i Gminy Lipsko informuje: Dnia 10.03.2025 r. o godz. 10.00 w siedzibie Urzędu Miasta i Gminy Lipsko został przeprowadzony I przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości gruntowej niezabudowanej, oznaczonej w ewidencji gruntów jako działka nr 555/1 o powierzchni 0,0500 ha, położonej w obrębie geodezyjnym 0001 Lipsko.
Cena wywoławcza nieruchomości wynosiła 30 000 zł. Przetarg zakończył się wynikiem negatywnym, ponieważ nikt nie przystąpił do przetargu.`;

const RENTAL_TITLE =
  'Ogłoszenie o I przetargu ustnym nieograniczonym na dzierżawę nieruchomości rolnej w Babilonie o pow. łącznej 1,08181 ha';
const CANCEL_TITLE =
  'Informacja o odwołaniu II przetargu na zbycie działki 1332/1 (omyłkowo 1332/2) położonej w Lipsku';


test('parsePLN: space-thousands, comma-grosze, plain integer', () => {
  assert.equal(parsePLN('56 600'), 56600);
  assert.equal(parsePLN('4200,00'), 4200);
  assert.equal(parsePLN('57 170'), 57170);
  assert.equal(parsePLN('4250'), 4250);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: hectare decimals with comma/dot', () => {
  assert.equal(parseArea('0,1723'), 0.1723);
  assert.equal(parseArea('0,0018'), 0.0018);
  assert.equal(parseArea('0.0500'), 0.05);
});

test('parseDateText: numeric and spelled-out (genitive) Polish month', () => {
  assert.equal(parseDateText('16.07.2024'), '2024-07-16');
  assert.equal(parseDateText('04 listopada 2025'), '2025-11-04');
  assert.equal(parseDateText('22.07.2025 r.'), '2025-07-22');
  assert.equal(parseDateText('brak'), null);
});

test('roundFrom: roman-before-przetarg (both cases) and word form', () => {
  assert.equal(roundFrom('Ogłoszenie o I przetargu ustnym'), 1);
  assert.equal(roundFrom('wyniku II przetargu na sprzedaż'), 2);
  assert.equal(roundFrom('został przeprowadzony II przetarg ustny'), 2);
  assert.equal(roundFrom('ogłasza pierwszy przetarg ustny'), 1);
  assert.equal(roundFrom('nie ma tu numeru'), null);
});

test('classifyLipsko TRAP #1: land notice with an incidental "garaż blaszak" — classifyKind(fullBody) wrongly says garaz, classifyLipsko (sale-subject) says grunt', () => {
  assert.equal(classifyKind(ANN_OCR), 'garaz');
  assert.equal(classifyLipsko(ANN_OCR, ANN_TITLE), 'grunt');
});

test('isRental TRAP #2: a plot "objęta umową dzierżawy" being SOLD is NOT a rental; a genuine "na dzierżawę" notice IS', () => {
  assert.equal(isRental(ANN_OCR), false);
  assert.equal(isRental(ANN_TITLE), false);
  assert.equal(isRental(RENTAL_TITLE), true);
  assert.equal(isRental('Ogłoszenie o I przetargu na najem budynku magazynowego'), true);
});

test('isCancelled: title-scoped; the standing "prawo odwołania przetargu" boilerplate is NOT a cancellation', () => {
  assert.equal(isCancelled(CANCEL_TITLE), true);
  assert.equal(isCancelled(ANN_TITLE), false);
  assert.equal(isCancelled('Zastrzega się prawo odwołania przetargu bez podania przyczyny'), false);
});


test('extractTitle / extractPublishedDate / extractInlineBody: real govpl inline article (Wólka), entities decoded', () => {
  assert.equal(extractTitle(WOLKA_HTML), WOLKA_TITLE);
  assert.equal(extractPublishedDate(WOLKA_HTML), '2024-07-24');
  const body = extractInlineBody(WOLKA_HTML);
  assert.ok(body.includes('§ 12'), `entity &sect; not decoded: ${body.slice(0, 40)}`);
  assert.ok(body.includes('Ministrów'), 'entity &oacute; not decoded');
  assert.ok(body.includes('cena osiągnięta w przetargu: 57 170 zł'), 'field text missing from inline body');
});

test('extractInlineBody / extractAttachmentUrl: a scanned-PDF article has EMPTY inline body and a /attachment link', () => {
  assert.equal(extractInlineBody(ANN_PDF_HTML), '');
  assert.equal(
    extractAttachmentUrl(ANN_PDF_HTML),
    'https://samorzad.gov.pl/attachment/0d535d85-7d1e-4e5c-950e-1d2084151984',
  );
});


test('parseAnnouncement: dz. 1332/2 (OCR scan) — grunt (not garaz), round I, parcel/obręb/area/price/date', () => {
  const a = parseAnnouncement(ANN_OCR, ANN_TITLE);
  assert.equal(a.cancelled, false);
  assert.equal(a.kind, 'grunt');
  assert.equal(a.round, 1);
  assert.equal(a.dzialka_nr, '1332/2');
  assert.equal(a.obreb, 'Lipsko');
  assert.equal(a.address_raw, 'Lipsko, dz. nr 1332/2');
  assert.equal(a.address, null);
  assert.equal(a.area_m2, 18);
  assert.equal(a.starting_price_pln, 4200);
  assert.equal(a.auction_date, '2025-07-22');
});

test('parseAnnouncement: a rental notice returns null (skipped)', () => {
  assert.equal(parseAnnouncement('Przetarg na dzierżawę nieruchomości rolnej', RENTAL_TITLE), null);
});


test('parseResultDoc: Wólka 392/3 (INLINE HTML) — sold, real cena wywoławcza→osiągnięta, parcel-keyed', () => {
  const body = extractInlineBody(WOLKA_HTML);
  const [r] = parseResultDoc(body, '2024-07-24', 'https://samorzad.gov.pl/web/miasto-i-gmina-lipsko/x');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '392/3');
  assert.equal(r.obreb, 'Wola Solecka Wólka');
  assert.equal(r.round, 1);
  assert.equal(r.area_m2, 1723);
  assert.equal(r.starting_price_pln, 56600);
  assert.equal(r.final_price_pln, 57170);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2024-07-16');
  assert.equal(r.source_pdf, 'https://samorzad.gov.pl/web/miasto-i-gmina-lipsko/x');
});

test('parseResultDoc: dz. 1332/1 (OCR scan) — sold, round II, spelled-out auction month', () => {
  const [r] = parseResultDoc(R2_OCR, '2025-11-13', 'https://samorzad.gov.pl/web/miasto-i-gmina-lipsko/y');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1332/1');
  assert.equal(r.obreb, 'Lipsko');
  assert.equal(r.round, 2);
  assert.equal(r.area_m2, 18);
  assert.equal(r.starting_price_pln, 4200);
  assert.equal(r.final_price_pln, 4250);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2025-11-04');
});

test('parseResultDoc: negative outcome (standard template) — unsold, no achieved price', () => {
  const [r] = parseResultDoc(NEG_TEMPLATE, null, 'https://samorzad.gov.pl/web/miasto-i-gmina-lipsko/z');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '555/1');
  assert.equal(r.starting_price_pln, 30000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.auction_date, '2025-03-10');
});

test('parseResultDoc: empty / rental / cancelled inputs return []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
  assert.deepEqual(parseResultDoc('Informacja o wyniku przetargu na dzierżawę gruntu', null, 'x'), []);
  assert.deepEqual(parseResultDoc('Informacja o odwołaniu przetargu na zbycie działki', null, 'x'), []);
});
