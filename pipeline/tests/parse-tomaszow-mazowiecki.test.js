// Tomaszów Mazowiecki adapter tests. Fixtures are REAL board/item HTML
// fragments + REAL PDF text (pdftotext -layout) live-fetched from
// bip.tomaszow.miasta.pl on 2026-07-19:
//   - BOARD_FRAGMENT — the real "Zbycie - Aktualne ogłoszenia o przetargach"
//     board (?id=144386) content area, 3 live items: ul. Zielona 38-40 (I),
//     ul. Środkowa 3 (IV), ul. Spalska 42 (IV) — each a SUB-PAGE link
//     (`?id=`, class "nazwa_pliku nourl"), not a file.
//   - ITEM_ATTACHMENTS_FRAGMENT — the real ul. Zielona 38-40 sub-page
//     (?id=239781) content area: 6 attachments (mapa, regulamin, 2x
//     oświadczenie, the real "Ogłoszenie o przetargu ul. Zielona 38-40.pdf",
//     klauzula) — proves pickAnnouncementFile() finds the real announcement
//     among decoys.
//   - RESULTS_BOARD_FRAGMENT — 2 real rows from the results board
//     (?id=148898): ul. Parkowa (direct getFile link, dated 2026-06-17) and
//     ul. Mireckiego 62 V przetarg (dated 2026-06-05) — proves
//     fileItemsFromBoard() reads a direct-file board row + its
//     udostepnil_data date.
//   - ZIELONA_TEXT — full real pdftotext of the Zielona 38-40 announcement
//     PDF (getFile?id=624378): LAND (2 combined parcels 522/3 + 525/1, obr.
//     24, 442 m² total), I przetarg ustny nieograniczony, "cena WYJŚCIOWA"
//     (not wywoławcza) 110 000,00 zł, auction 2026-08-12.
//   - PARKOWA_TEXT — full real pdftotext of a results-board PDF
//     (getFile?id=623585): LAND (parcel 1121/2, obr. 13, 717 m²), I przetarg,
//     cena wywoławcza 123 000,00 zł, UNSOLD ("przetarg zakończył się wynikiem
//     negatywnym" — no wadium received), auction 2026-06-08.
//   - KOSCIUSZKI_TEXT — full real pdftotext of a results-board PDF
//     (getFile?id=558829): FLAT, Plac Kościuszki 23 (genitive "Placu
//     Kościuszki" in the source) lokal mieszkalny nr 9, 63,30 m², unnumbered/
//     round-1 przetarg, cena wywoławcza 35 000,00 zł, SOLD at 35 350,00 zł,
//     auction 2022-08-19.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  announcementItemsFromBoard,
  fileItemsFromBoard,
  pickAnnouncementFile,
} from '../src/cities/tomaszow-mazowiecki/crawl.js';
import {
  isAuctionSaleDoc,
  isAnnouncement,
  isResultNotice,
  builtAddress,
  landFields,
  builtAreaM2,
  startingPriceFrom,
  achievedPriceFrom,
  isNegativeOutcome,
  auctionDateFromText,
  roundFromAnnouncement,
  roundFromResult,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/tomaszow-mazowiecki/parse.js';

const BOARD_FRAGMENT = `<div id="content" role="main">
        <div class="table_content">
            <h1 id="pageHeader">Zbycie - Aktualne ogłoszenia o przetargach</h1>
            <div class="td_content podkategoria">
                <ul>
                    <li class="element_podkategorii">
                        <div>
                            <div>
                                <a href="/public/?id=239781" class="nazwa_pliku nourl">I przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Miasto Tomaszów Mazowiecki, położonej w Tomaszowie Mazowieckim przy ul. Zielonej 38-40.</a>
                                <span></span>
                            </div>

                        </div>

                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <div>
                                <a href="/public/?id=239779" class="nazwa_pliku nourl">IV przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Miasto Tomaszów Mazowiecki, położonej w Tomaszowie Mazowieckim przy ul. Środkowej 3</a>
                                <span></span>
                            </div>

                        </div>

                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <div>
                                <a href="/public/?id=239634" class="nazwa_pliku nourl">IV przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Miasto Tomaszów Mazowiecki, położonej w Tomaszowie Mazowieckim przy ul. Spalskiej 42</a>
                                <span></span>
                            </div>

                        </div>

                    </li>
                </ul>
            </div>
        </div></div>`;

const ITEM_ATTACHMENTS_FRAGMENT = `<div id="content" role="main">
        <div class="table_content">
            <h1 id="pageHeader">I przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Miasto Tomaszów Mazowiecki, położonej w Tomaszowie Mazowieckim przy ul. Zielonej 38-40.</h1>
            <div class="td_content podkategoria">
                <ul>
                    <li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=624382"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku">
                                <img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>załącznik - mapa sytuacyjnoi-wysokościowa.pdf</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Lesiak Piotr</div>
                                    <div class="udostepnil_data">(2026-07-10 09:31:05)</div>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=624381"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku">
                                <img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>Regulamin Przetargu ul. Zielona.pdf</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Lesiak Piotr</div>
                                    <div class="udostepnil_data">(2026-07-10 09:31:03)</div>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=624380"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku">
                                <img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>OŚWIADCZENIE OSOBY PRAWNEJ.pdf</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Lesiak Piotr</div>
                                    <div class="udostepnil_data">(2026-07-10 09:31:01)</div>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=624379"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku">
                                <img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>OŚWIADCZENIE OSOBY FIZYCZNEJ.pdf</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Lesiak Piotr</div>
                                    <div class="udostepnil_data">(2026-07-10 09:30:59)</div>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=624378"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku">
                                <img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>Ogłoszenie o przetargu ul. Zielona 38-40.pdf</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Lesiak Piotr</div>
                                    <div class="udostepnil_data">(2026-07-10 09:30:57)</div>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=624377"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku">
                                <img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>Klauzula.pdf</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Lesiak Piotr</div>
                                    <div class="udostepnil_data">(2026-07-10 09:30:55)</div>
                                </div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </div></div>`;

const RESULTS_BOARD_FRAGMENT = `<li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=623585"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku" >
 								<img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>Informacja o wynikach przetargu ul. Parkowa.pdf</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Węgrzynowski Krzysztof</div>
                                    <div class="udostepnil_data">(2026-06-17 13:39:36)</div>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li class="element_podkategorii">
                        <div>
                            <a href="/public/getFile?id=623325"
                               title="Podgląd pliku otworzy się w nowej karcie" target="_blank" class="nazwa_pliku" >
 								<img src="/icons/pdf.gif" alt="Obrazek przedstawia ikonę symboliczną pliku" />
                                <span>Informacja o wynikach: V przetargu ul. Mireckiego 62</span>
                            </a>
                            <div class="td_content metryczka">
                                <div class="udostepnil">
                                    <div class="udostepnil_autor">Węgrzynowski Krzysztof</div>
                                    <div class="udostepnil_data">(2026-06-05 14:07:22)</div>
                                </div>
                            </div>
                        </div>
                    </li>`;

// Full real pdftotext -layout of getFile?id=624378 (Ogłoszenie o przetargu ul. Zielona 38-40.pdf).
const ZIELONA_TEXT = `
                      Prezydent Miasta Tomaszowa Mazowieckiego
                        Ogłasza I przetarg ustny nieograniczony

na sprzedaż nieruchomości stanowiących własność Gminy Miasto Tomaszów
Mazowiecki, położonych w Tomaszowie Mazowieckim przy ul. Zielonej 38-40, o łącznej
pow. 442 m2, działek oznaczonych w ewidencji gruntów numerem 522/3 oraz 525/1
w obr. 24, dla których prowadzona jest księga wieczysta PT1T/00015785/3.

Przetarg odbędzie się w dniu 12 sierpnia 2026 roku o godz. 1000 w sali nr 22 (I piętro
budynku A) w Urzędzie Miasta w Tomaszowie Mazowieckim ul. P.O.W. 10/16.

        Cena wyjściowa do przetargu ustalona została na kwotę – 110 000,00 zł brutto w tym
  VAT zw. (słownie: sto dziesięć tysięcy złotych 00/100).
        Sprzedaż nieruchomości zwolniona jest z podatku od towarów i usług VAT na
  podstawie art. 43 ust. 1 pkt. 9 ustawy z dnia 11 marca 2004 r. o podatku od towarów
  i usług (t.j. Dz. U. z 2025 r. poz. 775 z późn. zm.)

Nieruchomości są niezabudowane, nieogrodzone oraz porośnięte roślinnością trawiastą.

Warunkiem wzięcia udziału w przetargu jest wpłacenie wadium w pieniądzu
w wysokości 11 000,00 zł. (słownie: jedenaście tysięcy złotych 00/100) na rachunek
bankowy Gminy Miasto Tomaszów Mazowiecki Nr 58 1050 1461 1000 0023 6464 4415
najpóźniej do dnia 05 sierpnia 2026r.
`;

// Full real pdftotext -layout of getFile?id=623585 (Informacja o wynikach przetargu ul. Parkowa.pdf).
const PARKOWA_TEXT = `
                                      Informacja
                     Prezydenta Miasta Tomaszowa Mazowieckiego

o wynikach I przetargu ustnego nieograniczonego na sprzedaż nieruchomości
stanowiącej własność Gminy Miasto Tomaszów Mazowiecki, położonej w Tomaszowie
Mazowieckim przy ul. Parkowej, w obrębie 13, składającej się z działki oznaczonej
w ewidencji gruntów i budynków numerem 1121/2 o powierzchni 717 m2, dla której
prowadzona jest księga wieczysta PT1T/00031906/6.

      Prezydent Miasta Tomaszowa Mazowieckiego, na podstawie § 12 Rozporządzenia
Rady Ministrów z dnia 14 września 2004 roku w sprawie sposobu i trybu przeprowadzania
przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz.U. z 2021 r. Nr 2213), informuje,
że:

1. w dniu 08 czerwca 2026 roku o godz. 1000 w Urzędzie Miasta w Tomaszowie
      Mazowieckim, odbył się I przetarg ustny nieograniczony na sprzedaż nieruchomości
      stanowiącej własność Gminy Miasto Tomaszów Mazowiecki, położonej w Tomaszowie
      Mazowieckim przy ul. Parkowej;
2. komisja przetargowa w dniu 02 maja 2026 roku, stwierdziła, że do dnia 01 czerwca
      2026 roku włącznie nie wpłynęło żadne wadium uprawniające do uczestnictwa
      w przetargu;
3. cena wywoławcza do przetargu została ustalona na kwotę 123 000,00 zł brutto (słownie:
      sto dwadzieścia trzy tysiące złotych 00/100) w tym 23% VAT.;
4. w związku z powyższym przetarg zakończył się wynikiem negatywnym.
`;

// Full real pdftotext -layout of getFile?id=558829 (Informacja ... lokalu mieszkalnego nr 9 ... Placu Kościuszki nr 23).
const KOSCIUSZKI_TEXT = `
                                   INFORMACJA
                       Prezydenta Miasta Tomaszowa Mazowieckiego
   o wynikach przetargu ustnego nieograniczony na sprzedaż lokalu mieszkalnego nr 9 wraz
   z pomieszczeniami przynależnymi o łącznej pow.63,30 m2 znajdującego się w budynku
   oficyny położonym w Tomaszowie Mazowieckim przy Placu Kościuszki nr 23, wraz
   z udziałem wynoszącym 633/10085 części we współwłasności działki oznaczonej
   w ewidencji gruntów numerem 123, w obr.12 o pow. 992 m2 – użytek B, dla której
   prowadzona jest księga wieczysta PT1T/00001157/1 i udziałem wynoszącym 633/10085
   w częściach budynku i innych urządzeń, które nie służą wyłącznie do użytku właścicieli
   poszczególnych lokali.

  Prezydent Miasta Tomaszowa Mazowieckiego na podstawie § 12 Rozporządzenia Rady
  Ministrów z dnia 14 września 2004 roku w sprawie sposobu i trybu przeprowadzenia
  przetargów oraz rokowań na zbycie nieruchomości ( t.j. Dz.U. z 2021 r. Nr 2213.)

  informuje, że:

 w dniu 19 sierpnia 2022 r. o godz. 11:00 w Urzędzie Miasta w Tomaszowie Mazowieckim
  odbył się przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9 wraz
  z pomieszczeniami przynależnymi o łącznej pow.63,30 m2 znajdującego się w budynku
  oficyny położonym w Tomaszowie Mazowieckim przy Placu Kościuszki nr 23, wraz
  z udziałem wynoszącym 633/10085 części we współwłasności działki oznaczonej
  w ewidencji gruntów numerem 123, w obr.12 o pow. 992 m2 – użytek B, dla której
  prowadzona jest księga wieczysta PT1T/00001157/1 i udziałem wynoszącym 633/10085
  w częściach budynku i innych urządzeń, które nie służą wyłącznie do użytku właścicieli
  poszczególnych lokali,
 Komisja przetargowa w dniu 12 sierpnia 2022 roku stwierdziła, że do dnia
  11 sierpnia 2022 roku włącznie wpłynęło jedno wadium uprawniające do uczestnictwa
  w przetargu,
 do uczestnictwa w przetargu dopuszczono jedną osobę,
 cena wywoławcza do przetargu została ustalona na kwotę 35.000,00 zł w tym VAT zw.
  (słownie: trzydzieści pięć tysięcy złotych),
 najwyższą cenę osiągniętą w przetargu stanowi kwota 35 350,00 zł w tym VAT zw. ( słownie:
  trzydzieści pięć tysięcy trzysta pięćdziesiąt złotych ),
 nabywcą w/w nieruchomości wyłonionym w przetargu został Pan Mariusz Sobański na
  potrzeby prowadzonej działalności gospodarczej pod nazwą: Zakład Optyczny Masoko
  Mariusz Sobański w Tomaszowie Mazowieckim.
`;

// ---------------------------------------------------------------------- crawl.js board parsing

test('announcementItemsFromBoard reads the 3 live sub-page rows', () => {
  const items = announcementItemsFromBoard(BOARD_FRAGMENT);
  assert.equal(items.length, 3);
  assert.equal(items[0].id, '239781');
  assert.equal(items[0].url, 'http://bip.tomaszow.miasta.pl/public/?id=239781');
  assert.match(items[0].title, /Zielonej 38-40/);
  assert.equal(items[1].id, '239779');
  assert.match(items[1].title, /Środkowej 3/);
  assert.equal(items[2].id, '239634');
  assert.match(items[2].title, /Spalskiej 42/);
});

test('fileItemsFromBoard reads a sub-page attachment list + picks the real Ogłoszenie among decoys', () => {
  const attachments = fileItemsFromBoard(ITEM_ATTACHMENTS_FRAGMENT);
  assert.equal(attachments.length, 6);
  assert.equal(attachments[0].title, 'załącznik - mapa sytuacyjnoi-wysokościowa.pdf');
  assert.equal(attachments[4].title, 'Ogłoszenie o przetargu ul. Zielona 38-40.pdf');
  assert.equal(attachments[4].url, 'http://bip.tomaszow.miasta.pl/public/getFile?id=624378');

  const picked = pickAnnouncementFile(attachments);
  assert.equal(picked.id, '624378');
  assert.equal(picked.title, 'Ogłoszenie o przetargu ul. Zielona 38-40.pdf');
});

test('fileItemsFromBoard reads direct-linked results-board rows + publish dates', () => {
  const items = fileItemsFromBoard(RESULTS_BOARD_FRAGMENT);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, '623585');
  assert.equal(items[0].url, 'http://bip.tomaszow.miasta.pl/public/getFile?id=623585');
  assert.equal(items[0].title, 'Informacja o wynikach przetargu ul. Parkowa.pdf');
  assert.equal(items[0].date, '2026-06-17');
  assert.equal(items[1].id, '623325');
  assert.match(items[1].title, /Mireckiego 62/);
  assert.equal(items[1].date, '2026-06-05');
});

// ---------------------------------------------------------------------- parse.js discriminators

test('isAnnouncement/isResultNotice gate correctly on the 3 real fixtures', () => {
  assert.equal(isAuctionSaleDoc(ZIELONA_TEXT), true);
  assert.equal(isAnnouncement(ZIELONA_TEXT), true);
  assert.equal(isResultNotice(ZIELONA_TEXT), false);

  assert.equal(isResultNotice(PARKOWA_TEXT), true);
  assert.equal(isAnnouncement(PARKOWA_TEXT), false);

  assert.equal(isResultNotice(KOSCIUSZKI_TEXT), true);
});

// ---------------------------------------------------------------------- field extractors

test('landFields extracts parcel + obręb + area for both land fixtures', () => {
  const zielona = landFields(ZIELONA_TEXT);
  assert.equal(zielona.dzialka_nr, '522/3');
  assert.equal(zielona.obreb, '24');
  assert.equal(zielona.area_m2, 442);

  const parkowa = landFields(PARKOWA_TEXT);
  assert.equal(parkowa.dzialka_nr, '1121/2');
  assert.equal(parkowa.obreb, '13');
  assert.equal(parkowa.area_m2, 717);
});

test('builtAddress + placToNominative fold "Placu Kościuszki" -> "Plac Kościuszki"', () => {
  const addr = builtAddress(KOSCIUSZKI_TEXT, 'mieszkalny');
  assert.equal(addr.address_raw, 'Plac Kościuszki 23/9');
  assert.equal(addr.address.street, 'Plac Kościuszki');
  assert.equal(addr.address.building, '23');
  assert.equal(addr.address.apt, '9');
});

test('builtAreaM2 reads the "o łącznej pow.63,30 m2" flat-area idiom', () => {
  assert.equal(builtAreaM2(KOSCIUSZKI_TEXT), 63.3);
});

test('startingPriceFrom handles both "cena wywoławcza" and "cena wyjściowa" labels', () => {
  assert.equal(startingPriceFrom(ZIELONA_TEXT), 110000); // "cena wyjściowa"
  assert.equal(startingPriceFrom(PARKOWA_TEXT), 123000); // "cena wywoławcza"
  assert.equal(startingPriceFrom(KOSCIUSZKI_TEXT), 35000);
});

test('achievedPriceFrom + isNegativeOutcome distinguish sold vs unsold', () => {
  assert.equal(achievedPriceFrom(KOSCIUSZKI_TEXT), 35350);
  assert.equal(isNegativeOutcome(KOSCIUSZKI_TEXT), false);

  assert.equal(achievedPriceFrom(PARKOWA_TEXT), null);
  assert.equal(isNegativeOutcome(PARKOWA_TEXT), true);
});

test('auctionDateFromText reads both future-tense (announcement) and past-tense (result) phrasing', () => {
  assert.equal(auctionDateFromText(ZIELONA_TEXT), '2026-08-12');
  assert.equal(auctionDateFromText(PARKOWA_TEXT), '2026-06-08');
  assert.equal(auctionDateFromText(KOSCIUSZKI_TEXT), '2022-08-19');
});

test('roundFromAnnouncement/roundFromResult read the Roman numeral, default to 1 when unnumbered', () => {
  assert.equal(roundFromAnnouncement(ZIELONA_TEXT), 1);
  assert.equal(roundFromResult(PARKOWA_TEXT), 1);
  assert.equal(roundFromResult(KOSCIUSZKI_TEXT), 1); // unnumbered "przetargu" -> default round 1
});

// ---------------------------------------------------------------------- top-level parsers

test('parseAnnouncement(ZIELONA_TEXT) -> a LAND record with all fields', () => {
  const rec = parseAnnouncement(ZIELONA_TEXT, { url: 'https://bip.tomaszow.miasta.pl/public/getFile?id=624378' });
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '522/3');
  assert.equal(rec.obreb, '24');
  assert.equal(rec.area_m2, 442);
  assert.equal(rec.round, 1);
  assert.equal(rec.starting_price_pln, 110000);
  assert.equal(rec.auction_date, '2026-08-12');
});

test('parseResultDoc(PARKOWA_TEXT) -> an UNSOLD land result record', () => {
  const [rec] = parseResultDoc(PARKOWA_TEXT, null, 'https://bip.tomaszow.miasta.pl/public/getFile?id=623585');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1121/2');
  assert.equal(rec.starting_price_pln, 123000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'wynikiem negatywnym');
  assert.equal(rec.auction_date, '2026-06-08');
});

test('parseResultDoc(KOSCIUSZKI_TEXT) -> a SOLD flat result record', () => {
  const [rec] = parseResultDoc(KOSCIUSZKI_TEXT, null, 'https://bip.tomaszow.miasta.pl/public/getFile?id=558829');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Plac Kościuszki 23/9');
  assert.equal(rec.address.key, 'plac kosciuszki|23|9');
  assert.equal(rec.area_m2, 63.3);
  assert.equal(rec.starting_price_pln, 35000);
  assert.equal(rec.final_price_pln, 35350);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.unsold_reason, null);
  assert.equal(rec.auction_date, '2022-08-19');
});

test('parseResultDoc rejects a non-auction/non-result text', () => {
  assert.deepEqual(parseResultDoc('Regulamin przetargu — postanowienia ogólne.', null, 'https://example/x.pdf'), []);
});
