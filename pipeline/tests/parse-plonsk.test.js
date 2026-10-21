// Tests for Płońsk municipal property auction adapter.
// Real fixtures from BIP Urząd Miejski w Płońsku (umplonsk.bip.org.pl).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/cities/plonsk/config.js';
import { itemsFromBoardHtml } from '../src/cities/plonsk/crawl.js';
import {
  htmlToText,
  parseDate,
  parsePLN,
  parseArea,
  roundFromText,
  isResultDoc,
  isAnnouncementDoc,
  addressFromText,
  startingPriceFromText,
  achievedPriceFromText,
  outcomeFromText,
  buyerFromText,
  unitAreaFromText,
  plotAreaFromText,
  parcelFromText,
  obrebFromText,
  shareFromText,
  auctionDateFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/plonsk/parse.js';

// --- Real HTML excerpt from year 2026 board (/id/2602) ---
const BOARD_2602_HTML = `
<div class="attachments list-group list-group-item">
 <h5>Załączone pliki:</h5>
 <ul class="info_version">
    <li>
   <div class="row">
     <div class="col-3">
       <a href="/pliki/ugplonsk1/przetarg.pdf?20261021232144" target="_blank">
        <span class="icon_info">
         <img src="/images/icons/doc.png" alt="ikona pdf" />
         <span>pdf</span>
        </span>
       I przetarg ustny nieograniczony - lokal mieszkalny nr 4, ul. Młodzieżowa 23, Płońsk       </a>
     </div>
     <div class="col-9">
       <div class="list-group list-group-item">
        <ul>
                <li>Osoba odpowiedzialna za treść: <strong>Burmistrz miasta Płońsk </strong></li>
                <li>Informację wprowadził(a) do BIP: <strong>Olechowicz Monika</strong></li>
        <li>Data dodania: <strong>2026-02-10 08:53:41</strong></li>
        <li>Data ostatniej aktualizacji: <strong>2026-09-10 09:11:18</strong></li>
        </ul>
       </div>
     </div>
   </div>
  </li>
    <li>
   <div class="row">
     <div class="col-3">
       <a href="/pliki/ugplonsk1/informacja_wynik__pierwszego__przetargu__ustnego_nieograniczonego_ul._mlodziezowa_23_m._4.pdf?20261021232144" target="_blank">
        <span class="icon_info">
         <img src="/images/icons/doc.png" alt="ikona pdf" />
         <span>pdf</span>
        </span>
       informacja_wynik__pierwszego__przetargu__ustnego_nieograniczonego_ul._mlodziezowa_23_m._4       </a>
     </div>
     <div class="col-9">
       <div class="list-group list-group-item">
        <ul>
                <li>Osoba odpowiedzialna za treść: <strong>I z-ca Burmistrza Teresa Kozera</strong></li>
                <li>Informację wprowadził(a) do BIP: <strong>Olechowicz Monika</strong></li>
        <li>Data dodania: <strong>2026-03-27 09:25:19</strong></li>
        <li>Data ostatniej aktualizacji: <strong>2026-09-10 09:11:18</strong></li>
        </ul>
       </div>
     </div>
   </div>
  </li>
    <li>
   <div class="row">
     <div class="col-3">
       <a href="/pliki/ugplonsk1/ogloszenie_i__przetarg_ustny_nieograniczony_ul._rzemieslnicza__plonsk__.docx?20261021232144" target="_blank">
        <span class="icon_info">
         <img src="/images/icons/doc.png" alt="ikona docx" />
         <span>docx</span>
        </span>
       Ogłoszenie_I__przetarg_ustny_nieograniczony_ul._Rzemieślnicza_Płońsk__działka nr_1793/44       </a>
     </div>
     <div class="col-9">
       <div class="list-group list-group-item">
        <ul>
                <li>Osoba odpowiedzialna za treść: <strong>Burmistrz Miasta Płońsk</strong></li>
                <li>Informację wprowadził(a) do BIP: <strong>Olechowicz Monika</strong></li>
        <li>Data dodania: <strong>2026-04-27 08:50:01</strong></li>
        <li>Data ostatniej aktualizacji: <strong>2026-09-10 09:11:18</strong></li>
        </ul>
       </div>
     </div>
   </div>
  </li>
    <li>
   <div class="row">
     <div class="col-3">
       <a href="/pliki/ugplonsk1/lista_osob_zakwailfikowanych_do_przetargu.pdf?20261021232144" target="_blank">
        <span class="icon_info">
         <img src="/images/icons/doc.png" alt="ikona pdf" />
         <span>pdf</span>
        </span>
       Lista osob zakwalifikowanych do przetargu       </a>
     </div>
     <div class="col-9">
       <div class="list-group list-group-item">
        <ul>
        <li>Data dodania: <strong>2026-05-02 08:00:00</strong></li>
        </ul>
       </div>
     </div>
   </div>
  </li>
  </ul>
</div>
<div class="list-group list-group-item">
 <div><strong>Informacje o dokumencie:</strong></div>
</div>
`;

// --- Real document fixtures from live BIP attachments ---

const MLODZIEZOWA_ANNOUNCE = `
GP.6840.1.2025.MO

                           BURMISTRZ MIASTA PŁOŃSK
 o g ł a s z a pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
  nr 4 stanowiącego własność Gminy Miasto Płońsk, położonego w Płońsku w budynku
                                przy ul. Młodzieżowej 23.

         Przedmiotem przetargu jest: lokal mieszkalny, stanowiący własność Gminy Miasto
Płońsk, położony na pierwszej kondygnacji nadziemnej – parter, oznaczony nr 4
o pow. użytk. 22,91 m2 wraz z pomieszczeniem przynależnym piwnicą o pow. użytk. 1,94 m2, położony
w wielorodzinnym budynku mieszkalnym przy ul. Młodzieżowej 23 w Płońsku.
Lokal składa się z jednego pokoju, kuchni, łazienki z WC, przedpokoju.

        Przetarg na sprzedaż ww. nieruchomości odbędzie się w dniu 20.03.2026 roku o godzinie
1100 w Urzędzie Miejskim w Płońsku, sala nr 117.
        Cena wywoławcza nieruchomości wynosi: 145.000,00 zł.
        Warunkiem przystąpienia do przetargu jest:
- wniesienie wadium w pieniądzu w wysokości 10% ceny wywoławczej, tj. kwoty – 14.500,00 zł.

Płońsk, dnia 10.02.2026 r.
Szczegółowych informacji udziela Wydział Planowania Przestrzennego i Gospodarki
Nieruchomościami Urzędu Miejskiego w Płońsku, ul. Płocka 39, wejście od ul. 1-go Maja.
`;

const MLODZIEZOWA_RESULT = `
BURMISTRZ MIASTA
PŁOŃSK

GP. 7125.1.2025.MO Płońsk, dnia 27.03.2026 r.

Na podstawie 8 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r.
w sprawie sposobu i trybu przeprowadzania przetargów
oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213), podaję do publicznej
wiadomości:

Informację
o wyniku pierwszego przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego nr 4, stanowiącego własność Gminy Miasto
Płońsk, położonego w Płońsku w budynku przy ul. Młodzieżowej 23,
który odbył się w dniu 20 marca 2026 r.
w siedzibie Urzędu Miejskiego w Płońsku.

1. Przedmiotem przetargu był lokal mieszkalny nr 4 o pow. użytk. 22,91 m? wraz
z pomieszczeniem przynależnym piwnicą o pow. użytk. 1,94 m, położony
w wielorodzinnym budynku mieszkalnym przy ul. Młodzieżowej 23 w Płońsku.

2. Na ww lokal mieszkalny w pierwszym przetargu wadium wpłacił 1 oferent, który nie pojawił się na przetargu.

3. Cena wywoławcza przedmiotowego lokalu mieszkalnego, zgodnie z ogłoszeniem
o przetargu wyniosła 145.000,00 zł.

4. Przetarg zakończył się wynikiem negatywnym.
`;

const POLNOCNA_ANNOUNCE = `
GP.7125.4.2023.MO
BURMISTRZ  MIASTA  PŁOŃSK 
o g ł a s z a  pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 22 stanowiącego własność Gminy Miasto Płońsk, położonego w Płońsku w budynku przy ul. Północnej 10.

Przedmiotem przetargu jest: lokal mieszkalny, stanowiący własność Gminy Miasto Płońsk, położony na pierwszej kondygnacji nadziemnej – parter, oznaczony nr 22 o pow. użytk. 36,65 m2 wraz z pomieszczeniem przynależnym piwnicą o pow. użytk. 2,32 m2, położony w wielorodzinnym budynku mieszkalnym przy ul. Północnej 10 w Płońsku. 
Lokal składa się z dwóch pokoi, kuchni, łazienki z WC, garderoby/schowka, przedpokoju.

Przetarg na sprzedaż ww. nieruchomości odbędzie się w dniu 15.12.2023 roku o godzinie 11:00 w Urzędzie Miejskim w Płońsku, sala nr 117.
Cena wywoławcza nieruchomości wynosi: 183.250,00 zł.
Wadium: 18.325,00 zł.
`;

const POLNOCNA_RESULT = `
BURMISTRZ MIASTA
PŁOŃSK

GP. 7125.4.2023.MO Płońsk, dnia 22.12.2023 r.

Informację
o wyniku pierwszego przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego nr 22, stanowiącego własność Gminy Miasto Płońsk,
położonego w Płońsku w budynku przy ul. Północnej 10
który odbył się w dniu 15 grudnia 2023 r.
w siedzibie Urzędu Miejskiego w Płońsku.

1. Przedmiotem przetargu był lokal mieszkalny ny nr 22 o pow. użytk. 36.65 m* wraz
z pomieszczeniem przynależnym piwnicą o pow. użytk. 2,32 m, położony
w wielorodzinnym budynku mieszkalnym przy ul. Północnej 10 w Płońsku.

2. Na ww. lokal mieszkalny w pierwszym przetargu wadium w gotówce wpłacił 1 oferent, który przystąpił do licytacji.

3. Cena wywoławcza przedmiotowego lokalu mieszkalnego, zgodnie z ogłoszeniem
o przetargu wyniosła 183.250,00 zł.

4. Przetarg zakończył się wynikiem pozytywnym. Najwyższa cena osiągnięta w przetargu
wyniosła 185.090,00 zł. /słownie: sto osiemdziesiąt pięć tysięcy dziewięćdziesiąt złotych zero groszy/.

5. Nabywcą ww. lokalu mieszkalnego zostali Państwo Marcin i Beata małż. Szymańscy.
`;

const PLAC_15_SIERPNIA_RESULT = `
BURMISTRZ MIASTA
PŁOŃSK

GP. 6840.1.2019.AŚ Płońsk, dnia 11.07.2024 r.

Informację
o wyniku pierwszego przetargu ustnego nieograniczonego
na sprzedaż udziału w zabudowanej nieruchomości gruntowej,
stanowiącej własność Gminy Miasto Płońsk,
wyznaczonego na dzień 04 lipca 2024 r.
w siedzibie Urzędu Miejskiego w Płońsku.

l. Przedmiotem przetargu był udział '2 części w zabudowanej nieruchomości
gruntowej, stanowiącej własność Gminy Miasto Płońsk, oznaczonej numerem
ewidencyjnym działki 814 o powierzchni 0,0313 ha, położona w obrębie 0217
Płońsk przy PI. 15-go Sierpnia 2.

3. Cena wywoławcza przedmiotowego udziału we współwłasności nieruchomości,
zgodnie z ogłoszeniem o przetargu wyniosła 232.344 zł.

4. Przetarg zakończył się wynikiem pozytywnym. Najwyższa cena osiągnięta
w przetargu wyniosła 253.447,92 zł.

5. Nabywcą ww. udziału w nieruchomości została Pani Teresa Pestkowska.
`;

const RZEMIESLNICZA_LAND_ANNOUNCE = `
GP.6840.6.2025.MO

                             BURMISTRZ MIASTA PŁOŃSK
   o g ł a s z a drugi przetarg ustny nieograniczony na sprzedaż niezabudowanej
                               nieruchomości gruntowej.
Przedmiotem przetargu jest:
         Niezabudowana nieruchomość gruntowa, położona w obrębie 0217 Płońsk przy
ul. Rzemieślniczej, oznaczona numerem ewidencyjnym działki 1793/44 o powierzchni 0,4618
ha. Dla działki nr 1793/44 o powierzchni 0,4618 ha w Sądzie Rejonowym w Płońsku
w Wydziale IV Ksiąg Wieczystych prowadzona jest księga wieczysta KW PL1L/00019845/2.

Przetarg odbędzie się w dniu 20.11.2026 r. o godzinie 10:00.
Cena wywoławcza wynosi: 980.000,00 zł.
`;

const RZEMIESLNICZA_LAND_RESULT = `
BURMISTRZ MIASTA PŁOŃSK
Informację o wyniku I przetargu ustnego nieograniczonego
na sprzedaż niezabudowanej nieruchomości gruntowej przy ul. Rzemieślniczej,
oznaczonej jako działka nr 1793/44 o pow. 0,4618 ha, który odbył się w dniu 03 lipca 2026 r.
Cena wywoławcza: 1.003.487,00 zł.
Przetarg zakończył się wynikiem negatywnym.
`;

// --- Tests ---

test('config: exports valid city descriptor for Płońsk', () => {
  assert.equal(config.id, 'plonsk');
  assert.equal(config.label, 'Płońsk');
  assert.equal(config.voivodeship, 'mazowieckie');
  assert.equal(config.teryt, '1420011');
  assert.equal(config.authority, 'Burmistrz Miasta Płońska (Gmina Miasto Płońsk)');
  assert.equal(config.host, 'umplonsk.bip.org.pl');
  assert.equal(config.source, 'html');
});

test('itemsFromBoardHtml: extracts attachments from year board HTML', () => {
  const items = itemsFromBoardHtml(BOARD_2602_HTML, 'https://umplonsk.bip.org.pl/id/2602');
  assert.equal(items.length, 4);

  const flatAnnounce = items.find((i) => i.url.endsWith('przetarg.pdf'));
  assert.ok(flatAnnounce, 'flat announcement should be found');
  assert.equal(flatAnnounce.url, 'https://umplonsk.bip.org.pl/pliki/ugplonsk1/przetarg.pdf');
  assert.equal(flatAnnounce.publishedDate, '2026-02-10');
  assert.ok(flatAnnounce.title.includes('Młodzieżowa 23'));

  const resultDoc = items.find((i) => i.url.includes('informacja_wynik'));
  assert.ok(resultDoc, 'result doc should be found');
  assert.equal(resultDoc.publishedDate, '2026-03-27');
});

test('discriminators: isResultDoc and isAnnouncementDoc route correctly', () => {
  assert.ok(isAnnouncementDoc('I przetarg ustny nieograniczony - lokal mieszkalny', MLODZIEZOWA_ANNOUNCE));
  assert.ok(!isResultDoc('I przetarg ustny nieograniczony - lokal mieszkalny', MLODZIEZOWA_ANNOUNCE));

  assert.ok(isResultDoc('informacja_wynik__pierwszego__przetargu', MLODZIEZOWA_RESULT));
  assert.ok(!isAnnouncementDoc('informacja_wynik__pierwszego__przetargu', MLODZIEZOWA_RESULT));

  // Typo variant from live board: "Informacja o wynku"
  assert.ok(isResultDoc('Informacja o wynku I przetargu', PLAC_15_SIERPNIA_RESULT));

  // "Lista osób zakwalifikowanych" is neither announcement nor result
  assert.ok(!isAnnouncementDoc('Lista osób zakwalifikowanych do przetargu', 'Lista osób zakwalifikowanych'));
  assert.ok(!isResultDoc('Lista osób zakwalifikowanych do przetargu', 'Lista osób zakwalifikowanych'));
});

test('field extractors: parseDate, parsePLN, parseArea, roundFromText', () => {
  assert.equal(parseDate('20.03.2026'), '2026-03-20');
  assert.equal(parseDate('15.12.2023'), '2023-12-15');
  assert.equal(parseDate('20 marca 2026'), '2026-03-20');
  assert.equal(parseDate('15 grudnia 2023'), '2023-12-15');
  assert.equal(parseDate('04 lipca 2024'), '2024-07-04');

  assert.equal(parsePLN('145.000,00 zł'), 145000);
  assert.equal(parsePLN('183.250,00 zł'), 183250);
  assert.equal(parsePLN('185.090,00 zł'), 185090);
  assert.equal(parsePLN('253.447,92 zł'), 253448);
  assert.equal(parsePLN('232.344 zł'), 232344);

  assert.equal(parseArea('22,91'), 22.91);
  assert.equal(parseArea('36.65'), 36.65);

  assert.equal(roundFromText('pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('drugi przetarg ustny'), 2);
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('trzeci przetarg'), 3);
});

test('addressFromText: extracts and normalizes addresses, ignores City Hall office', () => {
  const a1 = addressFromText('', MLODZIEZOWA_ANNOUNCE);
  assert.ok(a1);
  assert.equal(a1.raw, 'ul. Młodzieżowa 23/4');
  assert.equal(a1.parsed.street, 'Młodzieżowa');
  assert.equal(a1.parsed.building, '23');
  assert.equal(a1.parsed.apt, '4');
  assert.equal(a1.parsed.key, 'mlodziezowa|23|4');

  const a2 = addressFromText('', POLNOCNA_ANNOUNCE);
  assert.ok(a2);
  assert.equal(a2.raw, 'ul. Północna 10/22');
  assert.equal(a2.parsed.street, 'Północna');
  assert.equal(a2.parsed.building, '10');
  assert.equal(a2.parsed.apt, '22');
  assert.equal(a2.parsed.key, 'polnocna|10|22');

  const a3 = addressFromText('', PLAC_15_SIERPNIA_RESULT);
  assert.ok(a3);
  assert.equal(a3.raw, 'Pl. 15-go Sierpnia 2');
  assert.equal(a3.parsed.building, '2');
  assert.equal(a3.parsed.key, '15 go sierpnia|2|');

  // Must not pick up City Hall address (Płocka 39)
  const officeOnly = 'Urząd Miejski w Płońsku, ul. Płocka 39, 09-100 Płońsk, wejście od ul. 1-go Maja.';
  assert.equal(addressFromText('', officeOnly), null);
});

test('parseAnnouncement: parses Młodzieżowa 23/4 flat announcement', () => {
  const rec = parseAnnouncement(
    'I przetarg ustny nieograniczony - lokal mieszkalny nr 4, ul. Młodzieżowa 23, Płońsk',
    MLODZIEZOWA_ANNOUNCE,
    'https://umplonsk.bip.org.pl/pliki/ugplonsk1/przetarg.pdf',
    'https://umplonsk.bip.org.pl/id/2602',
    '2026-02-10',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Młodzieżowa 23/4');
  assert.equal(rec.address.key, 'mlodziezowa|23|4');
  assert.equal(rec.area_m2, 22.91);
  assert.equal(rec.starting_price_pln, 145000);
  assert.equal(rec.auction_date, '2026-03-20');
  assert.equal(rec.round, 1);
  assert.equal(rec.published_date, '2026-02-10');
  assert.equal(rec.source_url, 'https://umplonsk.bip.org.pl/pliki/ugplonsk1/przetarg.pdf');
});

test('parseAnnouncement: parses Północna 10/22 flat announcement', () => {
  const rec = parseAnnouncement(
    'Ogloszenie_-_ul._Północna_10_-_pierwszy_przetarg_ustny_nieograniczony_na_sprzedaz_lokalu_mieszkalnego_nr_22',
    POLNOCNA_ANNOUNCE,
    'https://umplonsk.bip.org.pl/pliki/ugplonsk1/ogloszenie_polnocna.docx',
    'https://umplonsk.bip.org.pl/id/2234',
    '2023-11-14',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Północna 10/22');
  assert.equal(rec.address.key, 'polnocna|10|22');
  assert.equal(rec.area_m2, 36.65);
  assert.equal(rec.starting_price_pln, 183250);
  assert.equal(rec.auction_date, '2023-12-15');
  assert.equal(rec.round, 1);
  assert.equal(rec.published_date, '2023-11-14');
});

test('parseAnnouncement: parses land announcement with kind "grunt"', () => {
  const rec = parseAnnouncement(
    'II-przetarg-ustny-nieograniczony-Płońsk-ul.-Rzemieślnicza',
    RZEMIESLNICZA_LAND_ANNOUNCE,
    'https://umplonsk.bip.org.pl/pliki/ugplonsk1/rzemieslnicza_ii.pdf',
    'https://umplonsk.bip.org.pl/id/2602',
    '2026-09-10',
  );

  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1793/44');
  assert.equal(rec.obreb, '0217');
  assert.equal(rec.street, 'Rzemieślnicza');
  assert.equal(rec.area_m2, 4618);
  assert.equal(rec.starting_price_pln, 980000);
  assert.equal(rec.auction_date, '2026-11-20');
  assert.equal(rec.round, 2);
});

test('parseResultDoc: parses unsold flat result (Młodzieżowa 23/4)', () => {
  const recs = parseResultDoc(
    MLODZIEZOWA_RESULT,
    null,
    'https://umplonsk.bip.org.pl/pliki/ugplonsk1/informacja_wynik_mlodziezowa.pdf',
  );

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Młodzieżowa 23/4');
  assert.equal(r.address.key, 'mlodziezowa|23|4');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'oferent_nie_przystapil');
  assert.equal(r.starting_price_pln, 145000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.area_m2, 22.91);
  assert.equal(r.auction_date, '2026-03-20');
  assert.equal(r.round, 1);
  assert.equal(r.buyer, null);
});

test('parseResultDoc: parses sold flat result with hammer price & buyer (Północna 10/22)', () => {
  const recs = parseResultDoc(
    POLNOCNA_RESULT,
    null,
    'https://umplonsk.bip.org.pl/pliki/ugplonsk1/informacja_wynik_polnocna.pdf',
  );

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Północna 10/22');
  assert.equal(r.address.key, 'polnocna|10|22');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 183250);
  assert.equal(r.final_price_pln, 185090);
  assert.equal(r.area_m2, 36.65);
  assert.equal(r.auction_date, '2023-12-15');
  assert.equal(r.round, 1);
  assert.equal(r.buyer, 'Państwo Marcin i Beata małż. Szymańscy');
});

test('parseResultDoc: parses sold share result (Pl. 15-go Sierpnia 2)', () => {
  const recs = parseResultDoc(
    PLAC_15_SIERPNIA_RESULT,
    null,
    'https://umplonsk.bip.org.pl/pliki/ugplonsk1/informacja_wynik_plac.pdf',
  );

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address_raw, 'Pl. 15-go Sierpnia 2');
  assert.equal(r.address.key, '15 go sierpnia|2|');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 232344);
  assert.equal(r.final_price_pln, 253448);
  assert.equal(r.auction_date, '2024-07-04');
  assert.equal(r.round, 1);
  assert.ok(r.buyer.includes('Teresa Pestkowska'));
});

test('parseResultDoc: parses land result document (kind "grunt")', () => {
  const recs = parseResultDoc(
    RZEMIESLNICZA_LAND_RESULT,
    null,
    'https://umplonsk.bip.org.pl/pliki/ugplonsk1/rzemieslnicza_result.pdf',
  );

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1793/44');
  assert.equal(r.street, 'Rzemieślnicza');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.starting_price_pln, 1003487);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.auction_date, '2026-07-03');
  assert.equal(r.round, 1);
});

test('parseResultDoc: empty or unparseable input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'url'), []);
  assert.deepEqual(parseResultDoc(null, null, 'url'), []);
  assert.deepEqual(parseResultDoc('Jakiś tekst bez wyniku przetargu', null, 'url'), []);
});
