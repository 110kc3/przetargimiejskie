// Nidzica parser and crawler unit tests.
// Fixtures are verbatim excerpts from real municipal documents published on bip.nidzica.pl.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseHa,
  haToM2,
  parseAreaM2,
  monthNum,
  parseDate,
  roundFromText,
  isLease,
  isResultNotice,
  isNegativeOutcome,
  isCancelled,
  normalizeVillage,
  extractFlatAddressRaw,
  extractAreaM2,
  startingPriceFromText,
  achievedPriceFromText,
  buyerFromText,
  extractParcel,
  extractPrecinct,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/nidzica/parse.js';

import {
  stripTags,
  moduleStatusUrl,
  parseTenderRows,
  parseInformationList,
  parseAttachments,
} from '../src/cities/nidzica/crawl.js';

// ── Verbatim Real Fixtures ───────────────────────────────────────────────────

const FIXTURE_ANN_BRZOZOWA = `
Nidzica, 02.12.2025r.
GMKR.6840.8.2025

BURMISTRZ NIDZICY
na podstawie art. 39 ust. 2 ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami (Dz. U. z 2024r. poz. 1145 ze zm.) 
ogłasza rokowania na sprzedaż nieruchomości lokalowej stanowiącej własność Gminy Nidzica, znajdującej się w budynku przy ul. Brzozowej 8 w Nidzicy, stanowiącej:

lokal mieszkalny nr 2 o powierzchni użytkowej 24,00 m2, usytuowany na parterze budynku (I kondygnacja), składający się z 1-pokoju, przejściowej kuchni, wc na korytarzu wspólnym wraz z pomieszczeniem przynależnym tj. piwnicą o pow. 2,20 m2 oraz udziałem wynoszącym 143/1000 części w nieruchomości wspólnej budynku i działce nr 103/2, obręb 2 m. Nidzica, o pow. 825 m2, dla której Sąd Rejonowy w Nidzicy IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą o numerze OL1N/00013999/5, opis użytku – B tereny mieszkaniowe.

Cena wywoławcza nieruchomości wynosi: 78 000,00 zł (siedemdziesiąt osiem tysięcy złotych 00/100) brutto.
Warunkiem złożenia zgłoszenia udziału w rokowaniach jest wniesienie zaliczki w wysokości: 10 000,00 zł.
Rokowania odbędą się w dniu 14 stycznia 2026 r. o godz. 13:00 w Urzędzie Miejskim w Nidzicy.
`;

const FIXTURE_ANN_WARSZAWSKA_16 = `
Nidzica, 19.09.2025r.
GMKR.6840.14.2025

BURMISTRZ NIDZICY OGŁASZA
II przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej stanowiącej własność Gminy Nidzica, znajdującej się w budynku przy ul. Warszawskiej 4A w Nidzicy, nr KW OL1N/00015301/0, stanowiącej:

lokal mieszkalny nr 16 o powierzchni użytkowej 29,90 m2, składający się z 1-pokoju z kuchnią, łazienki z wc oraz przedpokoju, dla którego Sąd Rejonowy w Nidzicy IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą o numerze OL1N/00015301/0, wraz z pomieszczeniem przynależnym tj. piwnicą o pow. 4,30 m2 oraz udziałem wynoszącym 8/1000 części w nieruchomości wspólnej budynku i działce nr 93/18, obręb 5 m. Nidzica, o pow. 4 605 m2.

Cena wywoławcza nieruchomości wynosi: 160 000,00 zł (sto sześćdziesiąt tysięcy złotych 00/100).
Przetarg odbędzie się dnia 06 listopada 2025 r. o godzinie 10:00 w Urzędzie Miejskim w Nidzicy.
`;

const FIXTURE_ANN_DOBRZYN = `
GMKR.6840.1.2013
BURMISTRZ NIDZICY OGŁASZA
II przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej położonej w Dobrzyniu 31, stanowiącej własność Gminy Nidzica:

lokal mieszkalny nr 3 o powierzchni użytkowej 83,4 m2, składający się z trzech pokoi, kuchni, łazienki, wc i przedpokoju, położony w budynku nr 31 w Dobrzyniu; wraz z udziałem w wysokości 3/10 części w elementach wspólnych budynku oraz w działce nr 28/4 o powierzchni 1839 m2, KW OL1N/00023315/0. Opis użytku – B (tereny mieszkaniowe). Do lokalu przynależy pomieszczenie gospodarcze nr 3 o pow. 18,1 m2.

Cena wywoławcza nieruchomości wynosi: 35 000,00 zł (trzydzieści pięć tysięcy złotych 00/100).
II przetarg ustny nieograniczony odbędzie się dnia 26 lutego 2014 roku o godzinie 10:00 w Urzędzie Miejskim w Nidzicy.
`;

const FIXTURE_ANN_ZAGRZEWO = `
GMKR.7125.5.2019
BURMISTRZ NIDZICY OGŁASZA
I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej stanowiącej własność Gminy Nidzica, położonej w miejscowości i obrębie Zagrzewo, gm. Nidzica, KW OL1N/00020869/7, stanowiącej:

lokal nr 3 (po byłej świetlicy) z przeznaczeniem do przebudowy i zmiany sposobu użytkowania na lokal mieszkalny, o powierzchni użytkowej 88,06 m2, składający się z 2-pomieszczeń, korytarza oraz łazienki wraz z pomieszczeniem przynależnym – wiatą na opał o powierzchni użytkowej 12,00 m2. Lokal usytuowany w budynku nr 21 w miejscowości i obrębie Zagrzewo na pierwszej kondygnacji (parter).

Cena wywoławcza nieruchomości wynosi: 45 000,00 zł.
Przetarg odbędzie się dnia 10 czerwca 2020 r. o godz. 10:00 w Urzędzie Miejskim w Nidzicy.
`;

const FIXTURE_ANN_WIKNO_LAND = `
GMKR.6840.16.2024
BURMISTRZ NIDZICY OGŁASZA
II przetarg ustny nieograniczony na sprzedaż niezabudowanych nieruchomości stanowiących własność Gminy Nidzica, położonych w obrębie Jabłonka, gm. Nidzica, oznaczonych jako działki numer:

247/4 o pow. 0,2235 ha, opis użytku RVI, KW OL1N/00008106/1 – sprzedaż działki wraz z udziałem wynoszącym 13/100 części w działce nr 247/3 o pow. 0,1583 ha.

Cena wywoławcza nieruchomości wraz z udziałem w działce nr 247/3 wynosi: 231 793,50 zł.
Przetarg odbędzie się dnia 28 października 2026 roku o godzinie 11:00 w Urzędzie Miejskim w Nidzicy.
`;

const FIXTURE_RES_POLNA_LAND_SOLD = `
Nidzica, 15 października 2026 r.
GMKR.6840.26.2022

Burmistrz Nidzicy
podaje informację o wyniku II przetargu ustnego nieograniczonego

W dniu 07 października 2026 roku w Urzędzie Miejskim w Nidzicy, ul. Plac Wolności 1 (Ratusz) pok. nr 16 o godz. 10:00 odbył się II przetarg ustny nieograniczony na sprzedaż niezabudowanej nieruchomości stanowiącej własność Gminy Nidzica.

Przetargiem objęto nieruchomość niezabudowaną położoną w obrębie 2 m. Nidzica, oznaczoną jako działka nr 166/26 o pow. 0,1064 ha, opis użytku Bp, dla której Sąd Rejonowy w Nidzicy IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą o numerze OL1N/00009606/3 wraz z udziałem wynoszącym 24/100 części w działce nr 166/30.
Działka niezabudowana, położona na zapleczu ul. Polnej, w południowo-zachodniej części miasta.

Liczba osób dopuszczonych do przetargu - 3
Liczba osób niedopuszczonych do przetargu – 0

Cena wywoławcza nieruchomości położonej w obrębie 2 m. Nidzica, oznaczonej jako działka nr 166/26 wynosiła 108 000,00 zł.
Najwyższa cena w przetargu wyniosła 117 000,00 zł.

6) Imię, nazwisko albo adres albo nazwa lub firma osoby ustalonej jako nabywca nieruchomości:
Marek Wasiołkowski prowadzący działalność gospodarczą pod nazwą: JA-MAR Marek Wasiołkowski z siedzibą w Nidzicy.

Powyższy przetarg został zamknięty z wyłonieniem nabywcy.
`;

const FIXTURE_RES_BRZOZOWA_UNSOLD = `
BURMISTRZ NIDZICY OGŁASZA
II przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej stanowiącej własność Gminy Nidzica, znajdującej się w budynku przy ul. Brzozowej 8 w Nidzicy, stanowiącej:
lokal mieszkalny nr 2 o powierzchni użytkowej 24,00 m2.
Cena wywoławcza nieruchomości wynosi: 97 500,00 zł.
Termin przetargu: 2025-10-29.

Wynik przetargu: Negatywny
`;

const FIXTURE_TABLE_ROW_HTML = `
<tr class="odd">
  <td class="td-no"><span>Lp: </span>1</td>
  <td class="td-date-1"><div>Data ogłoszenia</div>2026-09-25 00:00:00</td>
  <td class="td-date-2"><div>Data i godzina przetargu</div>2026-10-28 11:00:00</td>
  <td class="td-title-1"><div>Dotyczy</div><a href="https://bip.nidzica.pl/przetargi/257/150/GMKR_6840_16_2024/" title="Przejdź do szczegółów informacji">Ogłoszenie o II przetargu ustnym nieograniczonym na sprzedaż, wraz z udziałem w działce nr 247/3, nieruchomości położonych w obrębie Jabłonka gm. Nidzica, oznaczonych numerami: 247/4, 247/6.</a></td>
  <td class="td-title-2"><div>Cena wywoławcza</div>231 793,50 zł</td>
  <td class="td-title-1"><div>Wynik</div>Brak wyniku</td>
  <td class="td-attachments-1"><div>Załączniki</div>
    <ul class="attachments">
      <li><a href="https://bip.nidzica.pl/system/pobierz.php?plik=przetarg_II_-_Wikno_247_4_2C_6.doc&amp;id=3478dc5863f54416af38f9cf250e16c2" title="Pobierz"><img src="doc.png" alt="DOC" /></a></li>
      <li><a href="https://bip.nidzica.pl/system/pobierz.php?plik=Wikno_247_4_i_247_6.jpg&amp;id=4d6c77ceccc5e323c6d5ca3424335afb" title="Pobierz"><img src="jpg.png" alt="JPG" /></a></li>
    </ul>
  </td>
</tr>
`;

const FIXTURE_ARTICLE_LIST_HTML = `
<div class="information">
  <p class="phx ph3">
    <a href="https://bip.nidzica.pl/258/1829/OGLOSZENIE_o_II_przetargu_ustnym_nieograniczonym_Dobrzyn_31/" title="Szczegóły">
      OGŁOSZENIE o II przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalowej położonej w Dobrzyniu 31
    </a>
  </p>
</div>
<div class="information">
  <p class="phx ph3">
    <a href="https://bip.nidzica.pl/259/9039/Wykaz_nieruchomosci_Waszulki_58_12/" title="Szczegóły">
      Wykaz nieruchomości przeznaczonej do zbycia – sprzedaż nieruchomości położonej w obrębie Waszulki gm. Nidzica, oznaczonej numerem 58/12 o pow. 0,1481 ha
    </a>
  </p>
</div>
`;

// ── Tests: Unit Helpers ──────────────────────────────────────────────────────

test('parsePLN parses spaced, dotted, and decimal PLN strings', () => {
  assert.equal(parsePLN('78 000,00 zł'), 78000);
  assert.equal(parsePLN('160.000,00 zł'), 160000);
  assert.equal(parsePLN('117 000 zł'), 117000);
  assert.equal(parsePLN('231 793,50 zł'), 231794);
  assert.equal(parsePLN('35 000,00 zł'), 35000);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(''), null);
});

test('parseHa and haToM2 convert hectares to square meters correctly', () => {
  assert.equal(parseHa('0,1064 ha'), 0.1064);
  assert.equal(haToM2('0,1064 ha'), 1064);
  assert.equal(haToM2('0.2235 ha'), 2235);
  assert.equal(haToM2('1.5 ha'), 15000);
  assert.equal(haToM2(''), null);
});

test('parseAreaM2 extracts float square meters', () => {
  assert.equal(parseAreaM2('24,00 m2'), 24.0);
  assert.equal(parseAreaM2('29,90 m2'), 29.9);
  assert.equal(parseAreaM2('88,06 m²'), 88.06);
  assert.equal(parseAreaM2('83,4 m2'), 83.4);
  assert.equal(parseAreaM2(null), null);
});

test('monthNum maps Polish month names correctly', () => {
  assert.equal(monthNum('stycznia'), '01');
  assert.equal(monthNum('lutego'), '02');
  assert.equal(monthNum('marca'), '03');
  assert.equal(monthNum('maja'), '05');
  assert.equal(monthNum('października'), '10');
  assert.equal(monthNum('listopada'), '11');
  assert.equal(monthNum('grudnia'), '12');
  assert.equal(monthNum('invalid'), null);
});

test('parseDate handles ISO, Polish words, and dotted dates', () => {
  assert.equal(parseDate('2026-10-28 11:00:00'), '2026-10-28');
  assert.equal(parseDate('W dniu 07 października 2026 roku'), '2026-10-07');
  assert.equal(parseDate('dnia 26 lutego 2014 roku'), '2014-02-26');
  assert.equal(parseDate('26.02.2014'), '2014-02-26');
  assert.equal(parseDate('02.12.2025'), '2025-12-02');
  assert.equal(parseDate('invalid'), null);
});

test('roundFromText detects Roman numerals, words, and rokowania rounds', () => {
  assert.equal(roundFromText('I przetarg ustny'), 1);
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('III przetarg ustny'), 3);
  assert.equal(roundFromText('IV przetarg'), 4);
  assert.equal(roundFromText('pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('drugi przetarg'), 2);
  assert.equal(roundFromText('kolejny (czwarty) przetarg'), 4);
  assert.equal(roundFromText('ogłasza rokowania na sprzedaż'), 1);
  assert.equal(roundFromText('drugie rokowania na sprzedaż'), 2);
  assert.equal(roundFromText('trzecie rokowania na sprzedaż'), 3);
  assert.equal(roundFromText('czwarte rokowania na sprzedaż'), 4);
});

test('isLease correctly identifies leases but ignores sale footer breadcrumbs', () => {
  assert.equal(isLease('oddanie w dzierżawę na okres do 3 lat'), true);
  assert.equal(isLease('przetarg ustny na dzierżawę lokalu'), true);
  assert.equal(isLease('najem lokalu użytkowego'), true);
  assert.equal(isLease('Majątek Gminy przeznaczony do sprzedaży i dzierżawy'), false);
  assert.equal(isLease('przetarg ustny na sprzedaż nieruchomości'), false);
});

test('isResultNotice recognizes outcome documents', () => {
  assert.equal(isResultNotice('Burmistrz Nidzicy podaje informację o wyniku II przetargu'), true);
  assert.equal(isResultNotice('Informacja o wyniku przetargu'), true);
  assert.equal(isResultNotice('Wynik przetargu: Pozytywny'), true);
  assert.equal(isResultNotice('Ogłoszenie o I przetargu ustnym'), false);
});

test('isNegativeOutcome identifies unsold outcomes', () => {
  assert.equal(isNegativeOutcome('przetarg zakończył się wynikiem negatywnym'), true);
  assert.equal(isNegativeOutcome('Wynik przetargu: Negatywny'), true);
  assert.equal(isNegativeOutcome('brak oferentów z powodu braku wpłaty wadium'), true);
  assert.equal(isNegativeOutcome('zamknięty bez wyłonienia nabywcy'), true);
  assert.equal(isNegativeOutcome('Powyższy przetarg został zamknięty z wyłonieniem nabywcy'), false);
  assert.equal(isNegativeOutcome('Wynik przetargu: Pozytywny'), false);
});

test('isCancelled detects actual cancellations but ignores reserve clauses', () => {
  assert.equal(isCancelled('Informacja o unieważnieniu przetargu na sprzedaż'), true);
  assert.equal(isCancelled('Ogłoszenie o odwołaniu przetargu ustnego'), true);
  assert.equal(isCancelled('Wadium zwraca się w razie odwołania lub unieważnienia przetargu'), false);
  assert.equal(isCancelled('Właściciel zastrzega sobie prawo odwołania przetargu z uzasadnionej przyczyny'), false);
});

test('normalizeVillage converts locative and inflected forms to nominative', () => {
  assert.equal(normalizeVillage('Dobrzyniu'), 'Dobrzyń');
  assert.equal(normalizeVillage('Zagrzewie'), 'Zagrzewo');
  assert.equal(normalizeVillage('Muszakach'), 'Muszaki');
  assert.equal(normalizeVillage('Bartoszkach'), 'Bartoszki');
  assert.equal(normalizeVillage('Napiwodzie'), 'Napiwoda');
  assert.equal(normalizeVillage('Jabłonce'), 'Jabłonka');
  assert.equal(normalizeVillage('Waszulkach'), 'Waszulki');
});

test('extractFlatAddressRaw extracts street, village and apt numbers accurately', () => {
  assert.equal(
    extractFlatAddressRaw('w budynku przy ul. Brzozowej 8 w Nidzicy, lokal mieszkalny nr 2'),
    'ul. Brzozowej 8/2',
  );
  assert.equal(
    extractFlatAddressRaw('w budynku przy ul. Warszawskiej 4A w Nidzicy, lokal mieszkalny nr 16'),
    'ul. Warszawskiej 4A/16',
  );
  assert.equal(
    extractFlatAddressRaw('w budynku przy ul. Aleja Wojska Polskiego 9 w Nidzicy, lokal mieszkalny nr 1'),
    'ul. Aleja Wojska Polskiego 9/1',
  );
  assert.equal(
    extractFlatAddressRaw('położony w budynku nr 31 w Dobrzyniu, lokal mieszkalny nr 3'),
    'Dobrzyń 31/3',
  );
  assert.equal(
    extractFlatAddressRaw('w budynku nr 21 w miejscowości i obrębie Zagrzewo, lokal nr 3'),
    'Zagrzewo 21/3',
  );
  assert.equal(
    extractFlatAddressRaw('w miejscowości Dobrzyniu 31 lokal nr 4'),
    'Dobrzyń 31/4',
  );
});

test('extractParcel and extractPrecinct parse cadastral details', () => {
  assert.equal(extractParcel('oznaczonych jako działki numer: 247/4 o pow. 0,2235 ha'), '247/4');
  assert.equal(extractParcel('oznaczonych numerami: 247/4, 247/6.'), '247/4, 247/6');
  assert.equal(extractParcel('oznaczonej numerem 162/106 o pow. 0,1481 ha'), '162/106');
  assert.equal(extractParcel('działka nr 166/26 o pow. 0,1064 ha'), '166/26');

  assert.equal(extractPrecinct('położonych w obrębie Jabłonka, gm. Nidzica'), 'Jabłonka');
  assert.equal(extractPrecinct('położonej w obrębie Napiwoda gm. Nidzica'), 'Napiwoda');
  assert.equal(extractPrecinct('położoną w obrębie 2 m. Nidzica'), '2 m. Nidzica');
});

test('buyerFromText extracts clean buyer name', () => {
  const t =
    '6) Imię, nazwisko albo adres albo nazwa lub firma osoby ustalonej jako nabywca nieruchomości: Marek Wasiołkowski prowadzący działalność gospodarczą pod nazwą: JA-MAR Marek Wasiołkowski z siedzibą w Nidzicy. Powyższy przetarg został zamknięty z wyłonieniem nabywcy.';
  assert.equal(buyerFromText(t), 'Marek Wasiołkowski prowadzący działalność gospodarczą pod nazwą: JA-MAR Marek Wasiołkowski z siedzibą w Nidzicy');
  assert.equal(buyerFromText('Nabywca nieruchomości: Brak'), null);
});

// ── Tests: Groundtruthed Announcements ───────────────────────────────────────

test('parseAnnouncement correctly parses Brzozowa 8/2 (rokowania)', () => {
  const recs = parseAnnouncement(FIXTURE_ANN_BRZOZOWA, {
    detailUrl: 'https://bip.nidzica.pl/przetargi/257/125/GMKR_6840_8_2025_09/',
    sourceUrl: 'https://bip.nidzica.pl/system/pobierz.php?plik=ogloszenie_o_I_rokowaniach_Brzozowa_8_lok_2.docx',
  });

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.building, '8');
  assert.equal(r.address.apt, '2');
  assert.equal(r.area_m2, 24.0);
  assert.equal(r.starting_price_pln, 78000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-01-14');
  assert.equal(r.detail_url, 'https://bip.nidzica.pl/przetargi/257/125/GMKR_6840_8_2025_09/');
});

test('parseAnnouncement correctly parses Warszawska 4A/16 (II przetarg)', () => {
  const recs = parseAnnouncement(FIXTURE_ANN_WARSZAWSKA_16, {
    detailUrl: 'https://bip.nidzica.pl/przetargi/257/118/GMKR_6840_14_2025_09/',
  });

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.building, '4A');
  assert.equal(r.address.apt, '16');
  assert.equal(r.area_m2, 29.9);
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2025-11-06');
});

test('parseAnnouncement correctly parses Dobrzyń 31/3 (village flat)', () => {
  const recs = parseAnnouncement(FIXTURE_ANN_DOBRZYN, {
    detailUrl: 'https://bip.nidzica.pl/258/1829/OGLOSZENIE_Dobrzyn_31/',
  });

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street_norm, 'dobrzyn');
  assert.equal(r.address.building, '31');
  assert.equal(r.address.apt, '3');
  assert.equal(r.area_m2, 83.4);
  assert.equal(r.starting_price_pln, 35000);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2014-02-26');
});

test('parseAnnouncement correctly parses Zagrzewo 21/3 (converted village flat)', () => {
  const recs = parseAnnouncement(FIXTURE_ANN_ZAGRZEWO, {
    detailUrl: 'https://bip.nidzica.pl/258/4512/BURMISTRZ_NIDZICY_Zagrzewo/',
  });

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street_norm, 'zagrzewo');
  assert.equal(r.address.building, '21');
  assert.equal(r.address.apt, '3');
  assert.equal(r.area_m2, 88.06);
  assert.equal(r.starting_price_pln, 45000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2020-06-10');
});

test('parseAnnouncement correctly parses Wikno land plot', () => {
  const recs = parseAnnouncement(FIXTURE_ANN_WIKNO_LAND, {
    detailUrl: 'https://bip.nidzica.pl/przetargi/257/150/GMKR_6840_16_2024/',
  });

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '247/4');
  assert.equal(r.obreb, 'Jabłonka');
  assert.equal(r.area_m2, 2235);
  assert.equal(r.starting_price_pln, 231794);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-10-28');
});

// ── Tests: Groundtruthed Results ─────────────────────────────────────────────

test('parseResultDoc parses sold land document with buyer and hammer price (Polna 166/26)', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_POLNA_LAND_SOLD,
    '2026-10-07',
    'https://bip.nidzica.pl/system/pobierz.php?plik=inform._o_wynikach_II_przet._2026_Polna_166_26.doc',
  );

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '166/26');
  assert.equal(r.obreb, '2 m. Nidzica');
  assert.equal(r.area_m2, 1064);
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, 108000);
  assert.equal(r.final_price_pln, 117000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-10-07');
  assert.ok(r.notes.some((n) => n.includes('Marek Wasiołkowski')));
});

test('parseResultDoc parses unsold flat outcome with negative result (Brzozowa 8/2)', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_BRZOZOWA_UNSOLD,
    '2025-10-29',
    'https://bip.nidzica.pl/przetargi/257/117/GMKR_6840_8_2025_09/',
  );

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.building, '8');
  assert.equal(r.address.apt, '2');
  assert.equal(r.area_m2, 24.0);
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, 97500);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'negative_no_bidders');
  assert.equal(r.auction_date, '2025-10-29');
});

test('parseResultDoc parses sold flat with positive binary signal from module', () => {
  const text = `${FIXTURE_ANN_WARSZAWSKA_16}\n\nWynik przetargu: Pozytywny\n`;
  const recs = parseResultDoc(
    text,
    '2025-11-06',
    'https://bip.nidzica.pl/przetargi/257/118/GMKR_6840_14_2025_09/',
  );

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.building, '4A');
  assert.equal(r.address.apt, '16');
  assert.equal(r.area_m2, 29.9);
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2025-11-06');
});

// ── Tests: Crawler HTML Parsers ──────────────────────────────────────────────

test('moduleStatusUrl formats page 1 and paginated URLs correctly', () => {
  assert.equal(moduleStatusUrl(0), 'https://bip.nidzica.pl/przetargi/257/status/0/');
  assert.equal(moduleStatusUrl(1, 1), 'https://bip.nidzica.pl/przetargi/257/status/1/');
  assert.equal(moduleStatusUrl(1, 2), 'https://bip.nidzica.pl/przetargi/257/2/status/1/');
  assert.equal(moduleStatusUrl(2, 3), 'https://bip.nidzica.pl/przetargi/257/3/status/2/');
});

test('parseTenderRows extracts structured fields from table HTML', () => {
  const rows = parseTenderRows(FIXTURE_TABLE_ROW_HTML);
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.detailUrl, 'https://bip.nidzica.pl/przetargi/257/150/GMKR_6840_16_2024/');
  assert.equal(r.auctionDate, '2026-10-28');
  assert.ok(r.title.includes('Ogłoszenie o II przetargu'));
  assert.ok(r.priceRaw.includes('231 793,50 zł'));
  assert.equal(r.wynikRaw, 'Brak wyniku');
  assert.equal(r.attachments.length, 2);
  assert.equal(r.attachments[0].filename, 'przetarg_II_-_Wikno_247_4_2C_6.doc');
});

test('parseInformationList extracts article URLs and titles', () => {
  const items = parseInformationList(FIXTURE_ARTICLE_LIST_HTML);
  assert.equal(items.length, 2);
  assert.equal(items[0].url, 'https://bip.nidzica.pl/258/1829/OGLOSZENIE_o_II_przetargu_ustnym_nieograniczonym_Dobrzyn_31/');
  assert.ok(items[0].title.includes('Dobrzyniu 31'));
  assert.equal(items[1].url, 'https://bip.nidzica.pl/259/9039/Wykaz_nieruchomosci_Waszulki_58_12/');
  assert.ok(items[1].title.includes('Waszulki'));
});

test('parseAttachments extracts pobierz.php links', () => {
  const atts = parseAttachments(FIXTURE_TABLE_ROW_HTML);
  assert.equal(atts.length, 2);
  assert.equal(atts[0].filename, 'przetarg_II_-_Wikno_247_4_2C_6.doc');
  assert.ok(atts[0].url.startsWith('https://bip.nidzica.pl/system/pobierz.php'));
  assert.equal(atts[1].filename, 'Wikno_247_4_i_247_6.jpg');
});
