// Iława parser and crawler unit tests.
// Fixtures are verbatim excerpts from real municipal documents published on bip.umilawa.pl.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  roundFromText,
  monthNum,
  announceDate,
  resultAuctionDate,
  isResultNotice,
  isNegativeOutcome,
  isCancelled,
  extractSubject,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/ilawa/parse.js';

import {
  harvestItemsFromHtml,
  isRentalOrOrdinance,
  isResultTitle,
  isAnnouncementTitle,
  extractAttachmentUrls,
} from '../src/cities/ilawa/crawl.js';

// ── Verbatim Fixtures ───────────────────────────────────────────────────────

const FIXTURE_ANN_FLAT = `
Iława, dnia 19.02.2026 r.
BURMISTRZ MIASTA IŁAWY
ogłasza III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 1, położonego w Iławie przy ul. Plażowej 5 wraz z udziałem w prawie własności gruntu stanowiącego mienie gminne.
Lokalizacja: woj. Warmińsko-Mazurskie, powiat iławski, miasto Iława, ul. Plażowa 5/1.
Oznaczenie nieruchomości:
Przeznaczony do sprzedaży lokal mieszkalny nr 1 usytuowany jest w budynku wielorodzinnym trzykondygnacyjnym, całkowicie podpiwniczonym, wolnostojącym, położonym w Iławie przy ul. Plażowej 5, na nieruchomości gruntowej oznaczonej wg danych z ewidencji gruntów i budynków m. Iławy w obrębie 11, jako działka nr 37/2 o pow. 0,0931 ha, dla której Sąd Rejonowy w Iławie prowadzi księgę wieczystą KW nr EL1I/00023342/3.
Opis lokalu:
Przedmiotem zbycia jest lokal mieszkalny o pow. 88,17 m2 wraz z przynależną piwnicą o pow. 9,58 m2 i udziałem 16/100 w częściach wspólnych budynku oraz prawie własności gruntu.
Cena wywoławcza nieruchomości: 420.000,00 zł (słownie: czterysta dwadzieścia tysięcy).
Termin i miejsce przeprowadzenia przetargu: przetarg odbędzie się w dniu 26 marca 2026 r. o godz. 1100 w sali nr 215 Urzędu Miasta Iławy przy ul. Niepodległości 13.
`;

const FIXTURE_RES_FLAT_NEG = `
Iława, dnia 2.04.2026 r.
GKPP.6840.33.2025

Informacja o wyniku przetargu
Na podstawie §12. Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz. U. z 2021 r., poz.2213).
Burmistrz Miasta Iławy podaje do publicznej wiadomości informację o wyniku III ustnego przetargu nieograniczonego
przeprowadzonego w dniu 26 marca 2026 r. w Urzędzie Miasta Iławy przy ul. Niepodległości 13 w Iławie na sprzedaż lokalu nr 1 znajdującego się na I kondygnacji budynku mieszkalnego wielorodzinnego położonego w Iławie przy ul. Plażowej 5 (na parterze), o pow. 88,17 m2 wraz z przynależną piwnicą o pow. 9,58 m2 i udziałem 16/100 w częściach wspólnych budynku oraz prawie własności gruntu, położonego na nieruchomości gruntowej oznaczonej w ewidencji gruntów m. Iławy w obrębie nr 11 jako działka nr 37/2 o pow. 0,0931 ha, zapisana w KW nr EL1I/00023342/3.
Liczba osób dopuszczonych do przetargu: 0
Liczba osób niedopuszczonych do przetargu: 0
Cena wywoławcza nieruchomości: 420.000,00 zł
Przetarg zakończył się wynikiem negatywnym, ponieważ w oznaczonym terminie żaden oferent nie wpłacił wadium w wysokości 40.000,00 zł.
`;

const FIXTURE_RES_BUILDING_SOLD = `
Iława, dnia 26.11.2025 r.
GKPP.6840.21.2025

Ogłoszenie o wyniku I ustnego przetargu nieograniczonego na zbycie nieruchomości 
zabudowanej budynkiem mieszkalnym wielorodzinnym, 
położonej w Iławie przy ul. Wojska Polskiego 24A

Na podstawie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz. U. z 2021 r., poz. 2213) Burmistrz Miasta Iławy informuje, że w dniu 18 listopada 2025 r. w Urzędzie Miasta Iławy przeprowadzono I ustny przetarg nieograniczony na zbycie nieruchomości zabudowanej budynkiem mieszkalnym wielorodzinnym, stanowiącej własność Gminy Miejskiej Iława, położonej w Iławie przy ul. Wojska Polskiego 24A, oznaczonej w ewidencji gruntów m. Iławy w obrębie nr 10 jako działka nr 346 o pow. 0,1402 ha, zapisanej w KW nr EL1I/00024842/5.

Liczba osób dopuszczonych do uczestnictwa w przetargu: 1,
Liczba osób niedopuszczonych do uczestnictwa w przetargu: 0,
Cena wywoławcza nieruchomości: 980.000,00 zł,
Najwyższa cena osiągnięta w przetargu: 989.800,00 zł,
Nabywca nieruchomości: Metrażeria Spółka z o.o. z siedzibą w Iławie.

Informacja o wyniku przetargu została wywieszona na tablicy ogłoszeń Urzędu Miasta Iławy w dniu 26.11.2025 r.
`;

const FIXTURE_ANN_BUILDING = `
Iława, dnia 27.02.2026 r.
BURMISTRZ MIASTA IŁAWY
ogłasza II ustny przetarg nieograniczony na zbycie prawa własności nieruchomości zabudowanej budynkiem mieszkalnym, stanowiącej własność Gminy Miejskiej Iława, położonej w Iławie przy ul. Dąbrowskiego 17.
Lokalizacja: woj. Warmińsko-Mazurskie, powiat iławski, miasto Iława, ul. Dąbrowskiego 17.
Opis nieruchomości: 
Przedmiotowa nieruchomość zabudowana budynkiem mieszkalnym położona jest w Iławie przy ul. Dąbrowskiego 17.
Powierzchnia użytkowa budynku (zgodnie z w/w protokołem) wynosi 173,90 m2, powierzchnia zabudowy (zgodnie z ewidencją budynków) wynosi 131 m2.
Oznaczenie nieruchomości wg danych z ewidencji gruntów i budynków: obręb nr 2, działka nr 204/11 o pow. 0,0937 ha.
Cena wywoławcza nieruchomości: 999.000,00 zł (słownie: dziewięćset dziewięćdziesiąt dziewięć tysięcy).
Termin i miejsce przeprowadzenia przetargu: przetarg odbędzie się w dniu 20 maja 2026 r. o godz. 1200 w sali nr 215 Urzędu Miasta Iławy przy ul. Niepodległości 13.
`;

const FIXTURE_RES_LAND_SOLD = `
GKPP.6840.6.2025
Iława, dnia 9.07.2025 r.

Ogłoszenie o wyniku I ustnego przetargu nieograniczonego 
na zbycie nieruchomości położonej przy ul. Przemysłowej w Iławie

Na podstawie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz. U. z 2021 r., poz. 2213) Burmistrz Miasta Iławy informuje, że w dniu 2 lipca 2025 r. w Urzędzie Miasta Iławy przeprowadzono I ustny przetarg nieograniczony na zbycie nieruchomości niezabudowanej, stanowiącej własność Gminy Miejskiej Iława, położonej w Iławie przy ul. Przemysłowej, oznaczonej w ewidencji gruntów m. Iławy w obrębie nr 6 jako działka nr 46/12 o pow. 1,2169 ha, zapisanej w KW nr EL1I/00031379/0.

Liczba osób dopuszczonych do uczestnictwa w przetargu: 1,
Liczba osób niedopuszczonych do uczestnictwa w przetargu: 0,
Cena wywoławcza nieruchomości: 1.100.000,00 zł brutto,
Najwyższa cena osiągnięta w przetargu: 1.111.000,00 zł brutto,
Nabywca nieruchomości: Radex Poland Spółka z o.o. z siedzibą w Iławie.

Informacja o wyniku przetargu została wywieszona na tablicy ogłoszeń Urzędu Miasta Iławy w dniu 09.07.2025 r.
`;

const FIXTURE_RES_LAND_NEG = `
INFORMACJA O WYNIKU PRZETARGU

W dniu 31 października 2018 roku o godzinie 10,00 w sali 215 Urzędu Miasta Iławy odbył się I ustny przetarg nieograniczony na zbycie nieruchomości niezabudowanej, położonej w Iławie przy ul. Pileckiego, w obrębie nr 7, oznaczonej w ewidencji gruntów i budynków miasta Iławy jako działki nr 229/1 i 214/2 o łącznej pow. 0,8276 ha.

Liczba osób dopuszczonych do uczestnictwa w przetargu: 1,
Liczba osób niedopuszczonych do uczestnictwa w przetargu: 0,
Cena wywoławcza nieruchomości wynosiła: 2.311.170,00 złotych brutto,
Najwyższa cena osiągnięta w przetargu wyniosła: brak ofert kupna,
Nabywcą nieruchomości został: brak ofert kupna.

Informacja o wyniku przetargu została wywieszona na tablicy ogłoszeń Urzędu Miasta Iławy w dniu: 07.11.2018r.
`;

// ── Unit Tests ──────────────────────────────────────────────────────────────

test('parsePLN correctly converts Polish currency strings', () => {
  assert.equal(parsePLN('420.000,00 zł'), 420000);
  assert.equal(parsePLN('1.111.000,00 zł brutto'), 1111000);
  assert.equal(parsePLN('989.800,00 zł,'), 989800);
  assert.equal(parsePLN('50 400,00 zł'), 50400);
  assert.equal(parsePLN('brak ofert kupna'), null);
  assert.equal(parsePLN(null), null);
});

test('monthNum and date parsing', () => {
  assert.equal(monthNum('marca'), '03');
  assert.equal(monthNum('listopada'), '11');
  assert.equal(monthNum('października'), '10');
  assert.equal(monthNum('pazdziernika'), '10');
  assert.equal(announceDate(FIXTURE_ANN_FLAT), '2026-03-26');
  assert.equal(announceDate(FIXTURE_ANN_BUILDING), '2026-05-20');
  assert.equal(resultAuctionDate(FIXTURE_RES_FLAT_NEG), '2026-03-26');
  assert.equal(resultAuctionDate(FIXTURE_RES_BUILDING_SOLD), '2025-11-18');
  assert.equal(resultAuctionDate(FIXTURE_RES_LAND_SOLD), '2025-07-02');
  assert.equal(resultAuctionDate(FIXTURE_RES_LAND_NEG), '2018-10-31');
});

test('roundFromText detects Roman and word numerals', () => {
  assert.equal(roundFromText('ogłasza I ustny przetarg'), 1);
  assert.equal(roundFromText('ogłasza II ustny przetarg'), 2);
  assert.equal(roundFromText('ogłasza III ustny przetarg'), 3);
  assert.equal(roundFromText('wyniku IV ustnego przetargu'), 4);
  assert.equal(roundFromText('w drugim przetargu'), 2);
  assert.equal(roundFromText('w pierwszym przetargu'), 1);
  assert.equal(roundFromText('kolejny przetarg'), null);
});

test('crawler classifiers distinguish titles', () => {
  assert.equal(
    isRentalOrOrdinance('Ogłoszenie o ustnym przetargu na dzierżawę nieruchomości gruntowej przy ul. Kajki'),
    true,
  );
  assert.equal(
    isRentalOrOrdinance('Zarządzenie Nr 0050-145/2025 Burmistrza Miasta Iława w sprawie obniżenia ceny'),
    true,
  );
  assert.equal(
    isRentalOrOrdinance('Ogłoszenie o III ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego'),
    false,
  );

  assert.equal(
    isResultTitle('Informacja o wyniku III ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego'),
    true,
  );
  assert.equal(
    isResultTitle('Ogłoszenie o wyniku I ustnego przetargu nieograniczonego na zbycie nieruchomości'),
    true,
  );
  assert.equal(
    isResultTitle('Ogłoszenie o III ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego'),
    false,
  );

  assert.equal(
    isAnnouncementTitle('Ogłoszenie o III ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o wyniku I ustnego przetargu'),
    false,
  );
});

test('harvestItemsFromHtml parses items from listing HTML', () => {
  const html = `
    <div class="information">
      <p class="phx ph3">
        <a href="https://bip.umilawa.pl/77/7041/Ogloszenie_o_III_ustnym_przetargu/">
          Ogłoszenie o III ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego nr 1 przy ul. Plażowej 5
        </a>
      </p>
    </div>
    <div class="information">
      <p class="phx ph3">
        <a href="/77/7084/Informacja_o_wyniku_III_ustnego_przetargu/">
          Informacja o wyniku III ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 1
        </a>
      </p>
    </div>
  `;
  const items = harvestItemsFromHtml(html);
  assert.equal(items.length, 2);
  assert.equal(items[0].url, 'https://bip.umilawa.pl/77/7041/Ogloszenie_o_III_ustnym_przetargu/');
  assert.match(items[0].title, /Plażowej 5/);
  assert.equal(items[1].url, 'https://bip.umilawa.pl/77/7084/Informacja_o_wyniku_III_ustnego_przetargu/');
});

test('extractAttachmentUrls prioritizes docx/doc over pdf and drops maps', () => {
  const html = `
    <ul class="attachments">
      <li>
        <a href="https://bip.umilawa.pl/system/pobierz.php?plik=Plazowa_5_mapa.pdf&amp;id=123">
          <span>Pobierz treść ogłoszenia - mapa (PDF, 100 KiB)</span>
        </a>
      </li>
      <li>
        <a href="https://bip.umilawa.pl/system/pobierz.php?plik=Plazowa_5_ogloszenie.pdf&amp;id=456">
          <span>Ogłoszenie o przetargu (PDF, 300 KiB)</span>
        </a>
      </li>
      <li>
        <a href="https://bip.umilawa.pl/system/pobierz.php?plik=Plazowa_5_ogloszenie.docx&amp;id=789">
          <span>Ogłoszenie o przetargu (DOCX, 46 KiB)</span>
        </a>
      </li>
    </ul>
  `;
  const { docUrl, pdfUrl } = extractAttachmentUrls(html);
  assert.equal(docUrl, 'https://bip.umilawa.pl/system/pobierz.php?plik=Plazowa_5_ogloszenie.docx&id=789');
  assert.equal(pdfUrl, 'https://bip.umilawa.pl/system/pobierz.php?plik=Plazowa_5_ogloszenie.pdf&id=456');
});

test('parseAnnouncement: flat (Plażowa 5/1)', () => {
  const recs = parseAnnouncement(
    'Ogłoszenie o III ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego nr 1, położonego w Iławie przy ul. Plażowej 5',
    FIXTURE_ANN_FLAT,
    'https://bip.umilawa.pl/77/7041/detail',
    'https://bip.umilawa.pl/system/pobierz.php?plik=Plazowa.docx',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.match(r.address_raw, /Plażowa/i);
  assert.equal(r.address.building, '5');
  assert.equal(r.address.apt, '1');
  assert.equal(r.area_m2, 88.17);
  assert.equal(r.starting_price_pln, 420000);
  assert.equal(r.auction_date, '2026-03-26');
  assert.equal(r.round, 3);
  assert.equal(r.dzialka_nr, '37/2');
  assert.equal(r.obreb, '11');
});

test('parseResultDoc: flat negative outcome (Plażowa 5/1)', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_FLAT_NEG,
    null,
    'https://bip.umilawa.pl/system/pobierz.php?plik=Plazowa_wynik.docx',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.match(r.address_raw, /Plażow/i);
  assert.equal(r.address.building, '5');
  assert.equal(r.address.apt, '1');
  assert.equal(r.area_m2, 88.17);
  assert.equal(r.round, 3);
  assert.equal(r.starting_price_pln, 420000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'negative_no_bidders');
  assert.equal(r.auction_date, '2026-03-26');
  assert.equal(r.dzialka_nr, '37/2');
  assert.equal(r.obreb, '11');
});

test('parseResultDoc: residential building sold (Wojska Polskiego 24A)', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_BUILDING_SOLD,
    null,
    'https://bip.umilawa.pl/system/pobierz.php?plik=Wojska_Polskiego_24A_wynik.doc',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.match(r.address_raw, /Wojska Polskiego 24A/i);
  assert.equal(r.address.building, '24A');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 980000);
  assert.equal(r.final_price_pln, 989800);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2025-11-18');
  assert.equal(r.dzialka_nr, '346');
  assert.equal(r.obreb, '10');
  assert.ok(r.notes.some((n) => /Metrażeria/i.test(n)));
});

test('parseAnnouncement: residential building (Dąbrowskiego 17)', () => {
  const recs = parseAnnouncement(
    'Ogłoszenie o II ustnym przetargu nieograniczonym na zbycie nieruchomości zabudowanej przy ul. Dąbrowskiego 17',
    FIXTURE_ANN_BUILDING,
    'https://bip.umilawa.pl/77/7056/detail',
    'https://bip.umilawa.pl/system/pobierz.php?plik=Dabrowskiego.docx',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.match(r.address_raw, /Dąbrowskiego 17/i);
  assert.equal(r.address.building, '17');
  assert.equal(r.area_m2, 173.9);
  assert.equal(r.starting_price_pln, 999000);
  assert.equal(r.auction_date, '2026-05-20');
  assert.equal(r.round, 2);
  assert.equal(r.dzialka_nr, '204/11');
  assert.equal(r.obreb, '2');
});

test('parseResultDoc: land plot sold (Przemysłowa)', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_LAND_SOLD,
    null,
    'https://bip.umilawa.pl/system/pobierz.php?plik=Przemyslowa_wynik.doc',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '46/12');
  assert.equal(r.obreb, '6');
  assert.equal(r.area_m2, 12169);
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 1100000);
  assert.equal(r.final_price_pln, 1111000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2025-07-02');
  assert.ok(r.notes.some((n) => /Radex Poland/i.test(n)));
});

test('parseResultDoc: land plot negative outcome (Pileckiego)', () => {
  const recs = parseResultDoc(
    FIXTURE_RES_LAND_NEG,
    null,
    'https://bip.umilawa.pl/system/pobierz.php?plik=Pileckiego_wynik.pdf',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '229/1 i 214/2');
  assert.equal(r.obreb, '7');
  assert.equal(r.area_m2, 8276);
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 2311170);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'negative_no_bidders');
  assert.equal(r.auction_date, '2018-10-31');
});
