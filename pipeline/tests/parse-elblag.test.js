// Elbląg parser tests. Fixtures are condensed-but-faithful copies of REAL
// extracted text, verified live 2026-07-16 against bip.elblag.eu:
//   - attachment 14800 "2025-10-27 - Mickiewicza.pdf" — flat ANNOUNCEMENT
//     (ul. Adama Mickiewicza 29/2, I przetarg, 160.000 zł, area 31,60 m2, obręb
//     16 działka 355, auction 27.10.2025). `pdftotext -layout`.
//   - attachment 17827 "Dębowa usługa.pdf" — a "nieruchomość zabudowana"
//     ANNOUNCEMENT whose "Lokalizacja" line carries NO building number (ul.
//     Dębowa, obręb 24 działka 238/2, 225.000 zł) — a real edge case the
//     announcement parser must SKIP (address-keyed kinds need a resolvable
//     building number to join on), not guess at. `pdftotext -layout`.
//   - attachment 18396/18393 "informacja o wynikach przetargów -
//     06.07.2026.doc" — a BATCH result document covering three properties
//     decided the same day: ul. Legionów (I przetarg ograniczony, dz. 795/4,
//     obręb 5, SOLD — single admitted bidder, wins at the cena wywoławcza
//     50.500 zł, no recorded raise) and ul. Dębowa x2 (I przetarg
//     nieograniczony, dz. 230/2 + 238/2, obręb 24, both UNSOLD — "Brak wpłaty
//     wadium"). `catdoc -a -d utf-8`. This is the SAME document linked from
//     both the Legionów and Dębowa detail pages (byte-identical attachments) —
//     crawl.js dedupes by text so it is only parsed once per crawl.
//   - attachment 18374 "ZPME nr 273_2026 - wersja edytowalna.pdf" — a REAL
//     tenant-sale (bezprzetargowo) wykaz: "ZARZĄDZENIE NR 273/2026 …w sprawie
//     … wykazu lokali mieszkalnych przeznaczonych do sprzedaży na rzecz
//     najemców…" / "…sprzedaży w trybie bezprzetargowym na rzecz ich
//     najemców…", carrying a bonifikata table (Ogrodowa 17/8, Giermków 22/5,
//     Przyjaźni 21/1, …) with NO "cena wywoławcza" / "przetarg ustny" anywhere.
//     Groundtruths the load-bearing bezprzetargowo exclusion. `pdftotext -layout`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  isBezprzetargowoDoc,
  isResultDoc,
  isAnnouncementDoc,
  romanToInt,
  roundFromRoundField,
  roundFromSectionHeader,
  ddmmyyyyToIso,
  auctionDateFromText,
  resultDateFromText,
  lokalizacjaFromText,
  addressRawFromText,
  dzialkaFromText,
  unitAreaFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/elblag/parse.js';

// ------------------------------------------------------------------- helpers

test('parsePLN: dot-thousands, trailing "zł", table dash placeholders', () => {
  assert.equal(parsePLN('160.000 zł'), 160000);
  assert.equal(parsePLN('225.000 zł'), 225000);
  assert.equal(parsePLN('2.043.200 zł'), 2043200);
  assert.equal(parsePLN('50.500'), 50500);
  assert.equal(parsePLN('225.000,00'), 225000); // dot thousands + comma grosze
  assert.equal(parsePLN('-----'), null); // "not applicable" table placeholder
  assert.equal(parsePLN('------'), null);
  assert.equal(parsePLN(''), null);
  assert.equal(parsePLN(null), null);
});

test('romanToInt / roundFromRoundField: HTML "Przetarg na" field (Roman numeral)', () => {
  assert.equal(romanToInt('I'), 1);
  assert.equal(romanToInt('III'), 3);
  assert.equal(romanToInt('V'), 5);
  assert.equal(romanToInt('bad'), null);
  assert.equal(roundFromRoundField('I przetarg nieograniczony'), 1);
  assert.equal(roundFromRoundField('V Przetarg nieograniczony'), 5);
  assert.equal(roundFromRoundField('I przetarg ograniczony'), 1);
  assert.equal(roundFromRoundField('III ustny przetarg nieograniczony'), 3);
});

test('roundFromSectionHeader: RESULT batch-doc section header (word ordinal)', () => {
  assert.equal(roundFromSectionHeader('Pierwszy ustny przetarg ograniczony'), 1);
  assert.equal(roundFromSectionHeader('Pierwszy ustny przetarg nieograniczony'), 1);
  assert.equal(roundFromSectionHeader('Drugi ustny przetarg nieograniczony'), 2);
  assert.equal(roundFromSectionHeader('nic tu nie ma'), null);
});

test('ddmmyyyyToIso', () => {
  assert.equal(ddmmyyyyToIso('06.07.2026'), '2026-07-06');
  assert.equal(ddmmyyyyToIso('27.10.2025'), '2025-10-27');
  assert.equal(ddmmyyyyToIso('bad'), null);
});

// ----------------------------------------------------------- doc classifiers

test('isAnnouncementDoc / isResultDoc / isBezprzetargowoDoc: mutually exclusive on real headers', () => {
  const ann = 'PREZYDENT MIASTA ELBLĄG\nogłasza\npierwszy ustny przetarg nieograniczony\nna sprzedaż nieruchomości lokalowej';
  const result = 'Informacja o wynikach przetargów przeprowadzonych w dniu 6 lipca 2026\nr.';
  const wykaz = 'ZARZĄDZENIE NR 273/2026\nPREZYDENTA MIASTA ELBLĄG\nw sprawie sporządzenia i ogłoszenia wykazu lokali mieszkalnych przeznaczonych do sprzedaży na\nrzecz najemców oraz udzielenia bonifikat od ceny sprzedaży lokali';

  assert.equal(isAnnouncementDoc(ann), true);
  assert.equal(isResultDoc(ann), false);
  assert.equal(isBezprzetargowoDoc(ann), false);

  assert.equal(isResultDoc(result), true);
  assert.equal(isBezprzetargowoDoc(result), false);

  assert.equal(isBezprzetargowoDoc(wykaz), true);
});

// ------------------------------------------------------- flat announcement (real)
//
// Condensed from attachment 14800 "2025-10-27 - Mickiewicza.pdf" (pdftotext -layout).

const ANN_FLAT_MICKIEWICZA = `                                     PREZYDENT MIASTA ELBLĄG
                                                 ogłasza
                                  pierwszy ustny przetarg nieograniczony
             na sprzedaż nieruchomości lokalowej, stanowiącej własność Gminy Miasta Elbląg

1. Lokalizacja: Elbląg, ul. Adama Mickiewicza 29/2.
2. Opis nieruchomości: lokal mieszkalny, usytuowany na parterze w pięciokondygnacyjnym budynku
   mieszkalnym. Składa się z 2 pokoi, kuchni, łazienki z WC oraz przedpokoju o łącznej powierzchni
   użytkowej 31,60 m2. Do lokalu przynależy piwnica o powierzchni użytkowej 3,3 m2. Z własnością lokalu
   związany jest udział do 16/1000 części wspólnych i niepodzielnych budynku oraz w prawie własności
   gruntu, na którym budynek jest posadowiony.
3. Oznaczenie nieruchomości wg danych ewidencji gruntów i budynków: obręb 16, działka
   nr 355 o powierzchni 0,2777 ha.
   Dla lokalu mieszkalnego Sąd Rejonowy w Elblągu prowadzi księgę wieczystą nr EL1E/00093840/1.
5. Cena wywoławcza nieruchomości: 160.000 zł (słownie złotych: sto sześćdziesiąt tysięcy
   00/100), w tym: lokal 142.752 zł (słownie złotych: sto czterdzieści dwa tysiące siedemset pięćdziesiąt
   dwa 00/100), udział w gruncie 17.248 zł (słownie złotych: siedemnaście tysięcy dwieście czterdzieści
   osiem 00/100).
8. Termin i miejsce przeprowadzenia przetargu: przetarg odbędzie się w dniu 27 października
   2025 r. o godz. 1000, w sali nr 300 w Urzędzie Miejskim przy ul. Łączności 1 w Elblągu.`;

test('lokalizacjaFromText / addressRawFromText: flat — street + building + apt', () => {
  assert.deepEqual(lokalizacjaFromText(ANN_FLAT_MICKIEWICZA), { street: 'Adama Mickiewicza', building: '29', apt: '2' });
  assert.equal(addressRawFromText(ANN_FLAT_MICKIEWICZA), 'ul. Adama Mickiewicza 29/2');
});

test('dzialkaFromText: obręb (a NUMBER in Elbląg, not a name) + dzialka_nr + plot area ha→m2', () => {
  assert.deepEqual(dzialkaFromText(ANN_FLAT_MICKIEWICZA), { obreb: '16', dzialka_nr: '355', area_m2: 2777 });
});

test('unitAreaFromText: "łącznej powierzchni użytkowej" — NOT the 3,3 m2 cellar', () => {
  assert.equal(unitAreaFromText(ANN_FLAT_MICKIEWICZA), 31.6);
});

test('auctionDateFromText: "przetarg odbędzie się w dniu DD miesiąc YYYY"', () => {
  assert.equal(auctionDateFromText(ANN_FLAT_MICKIEWICZA), '2025-10-27');
});

test('parseAnnouncement: flat — address key, usable area, price, date, round, kind=mieszkalny', () => {
  const r = parseAnnouncement({
    kindText: 'lokal mieszkalny',
    roundText: 'I przetarg nieograniczony',
    priceText: '160.000 zł',
    auctionDateIso: '2025-10-27',
    pdfText: ANN_FLAT_MICKIEWICZA,
  });
  assert.ok(r, 'a record is returned');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'adama mickiewicza|29|2'); // ← the result→announcement JOIN KEY
  assert.equal(r.address_raw, 'ul. Adama Mickiewicza 29/2');
  assert.equal(r.area_m2, 31.6, 'flat usable area, NOT the 3,3 m² cellar');
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.auction_date, '2025-10-27');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: falls back to PDF prose when HTML fields are absent', () => {
  const r = parseAnnouncement({ pdfText: ANN_FLAT_MICKIEWICZA });
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.starting_price_pln, 160000); // parsed from "Cena wywoławcza nieruchomości: 160.000 zł"
  assert.equal(r.auction_date, '2025-10-27');
});

// --------------------------------------------------- building announcement (real, SKIP case)
//
// Condensed from attachment 17827 "Dębowa usługa.pdf". Real edge case: the
// "Lokalizacja" line carries NO building number (a service-pavilion PLOT, not
// an addressed building) — parseAnnouncement must return null for an
// address-keyed kind it cannot join, not guess an address. Also exercises the
// auctionDateFromText anchor against a DECOY "odbędzie się" earlier in the body
// (an unrelated uzbrojenie/utilities sentence) that must NOT be picked up.

const ANN_BUILDING_DEBOWA = `                                       PREZYDENT MIASTA ELBLĄG
                                ogłasza pierwszy ustny przetarg nieograniczony
                    na sprzedaż nieruchomości stanowiącej własność Gminy Miasto Elbląg

1. Lokalizacja: Elbląg, ul. Dębowa.
2. Opis nieruchomości: nieruchomość zabudowana, położona w Elblągu, na terenie osiedla jednorodzinnej
   zabudowy mieszkaniowej. Budynki niemieszkalne posadowione na przedmiotowej nieruchomości są w złym
   stanie technicznym, przeznaczone do rozbiórki.
3. Oznaczenie nieruchomości wg danych z ewidencji gruntów i budynków: obr. 24, działka
   nr 238/2 o pow. 0,1177 ha. Dla nieruchomości Sąd Rejonowy w Elblągu prowadzi księgę wieczystą
   nr EL1E/00114259/5.
5. Uzbrojenie: przez nieruchomość przebiega sieć telekomunikacyjna. Doprowadzenie uzbrojenia do
   nieruchomości i usunięcie ewentualnych kolizji z istniejącym uzbrojeniem, a także zasilenie obiektów
   w media, odbędzie się staraniem i na koszt Nabywcy, na warunkach wskazanych przez dysponentów mediów.
7. Cena wywoławcza nieruchomości: 225.000 zł (słownie złotych: dwieście dwadzieścia pięć
   tysięcy), plus podatek od towarów i usług (VAT), zgodnie z obowiązującymi przepisami.
9. Termin i miejsce przeprowadzenia przetargu: przetarg odbędzie się w dniu 6 lipca 2026 r.,
    o godz. 1100, w sali nr 300 Urzędu Miejskiego w Elblągu.`;

test('lokalizacjaFromText / addressRawFromText: bare-street Lokalizacja line has no building number', () => {
  assert.deepEqual(lokalizacjaFromText(ANN_BUILDING_DEBOWA), { street: 'Dębowa', building: null, apt: null });
  assert.equal(addressRawFromText(ANN_BUILDING_DEBOWA), null);
});

test('dzialkaFromText: "obr." (dotted) + "o pow." (short form) variants', () => {
  assert.deepEqual(dzialkaFromText(ANN_BUILDING_DEBOWA), { obreb: '24', dzialka_nr: '238/2', area_m2: 1177 });
});

test('auctionDateFromText: skips the DECOY "…odbędzie się staraniem…" (uzbrojenie) line, anchors on "przetarg odbędzie się"', () => {
  assert.equal(auctionDateFromText(ANN_BUILDING_DEBOWA), '2026-07-06');
});

test('parseAnnouncement: address-keyed kind (zabudowana) with no building number → null (skip, not guess)', () => {
  const r = parseAnnouncement({
    kindText: 'nieruchomość zabudowana',
    roundText: 'I przetarg nieograniczony',
    priceText: '225.000 zł',
    auctionDateIso: '2026-07-06',
    pdfText: ANN_BUILDING_DEBOWA,
  });
  assert.equal(r, null);
});

test('parseAnnouncement: no pdfText at all → null', () => {
  assert.equal(parseAnnouncement({ kindText: 'lokal mieszkalny' }), null);
  assert.equal(parseAnnouncement({}), null);
});

// --------------------------------------------------------- RESULT batch doc (real)
//
// Condensed (blank lines collapsed, matching parseResultDoc's own normalization)
// from attachment 18396/18393 "informacja o wynikach przetargów -
// 06.07.2026.doc" (catdoc -a -d utf-8). Real columns: Lp. | Adres | KW | Obręb |
// Nr działki | Pow. w ha | Liczba dopuszczonych | Liczba niedopuszczonych |
// Cena wywoławcza netto | Najwyższa zaoferowana cena netto | Nabywca.

const RESULT_BATCH = `Informacja o wynikach przetargów przeprowadzonych w dniu 6 lipca 2026
r.
w Urzędzie Miejskim w Elblągu, ul. Łączności 1
\tPierwszy ustny przetarg ograniczony
Lp.\tAdres\tDane geodezyjne\tLiczba osób dopuszczonych do przetargu\tLiczba
osób niedopuszczonych do przetargu\tCena wywoławcza
netto
(zł)\tNajwyższa zaoferowana cena netto
(zł)\tOsoba wyłoniona jako nabywca nieruchomości
KW\tObręb\tNr
działki\tPow.
w ha
\t1.\tLegionów \t115189/0\t5\t795/4\t0,0345\t1\t-----\t50.500\t------\tDanuta i
Michał Dąbrowscy
Indywidualna Specjalistyczna Praktyka Lekarska Danuta Dąbrowska
\tPierwszy ustny przetarg nieograniczony
Lp.\tAdres\tDane geodezyjne\tLiczba osób dopuszczonych do przetargu\tLiczba
osób niedopuszczonych do przetargu\tCena wywoławcza
netto
(zł)\tNajwyższa zaoferowana cena netto
(zł)\tOsoba wyłoniona jako nabywca nieruchomości
KW\tObręb\tNr
działki\tPow.
w ha
\t1.\tDębowa\t114259/5\t24\t230/2\t0,0545\t----\t-----\t145.000\t------\tBrak
wpłaty wadium
2.\tDębowa\t114259/5\t24\t238/2\t0,1177\t-----\t------\t225.000\t------\tBrak
wpłaty wadium
`;

test('isResultDoc / isBezprzetargowoDoc on the real batch doc', () => {
  assert.equal(isResultDoc(RESULT_BATCH), true);
  assert.equal(isBezprzetargowoDoc(RESULT_BATCH), false);
});

test('resultDateFromText: batch header "przeprowadzonych w dniu DD miesiąc YYYY"', () => {
  assert.equal(resultDateFromText(RESULT_BATCH), '2026-07-06');
});

test('parseResultDoc: batch doc expands into ONE RECORD PER ROW (3 properties, same source doc)', () => {
  const recs = parseResultDoc(RESULT_BATCH, null, 'https://bip.elblag.eu/attachments/download/18396');
  assert.equal(recs.length, 3);

  const [legionow, debowa1, debowa2] = recs;

  // Legionów — I przetarg OGRANICZONY, single admitted bidder: SOLD at the
  // cena wywoławcza (no numeric "najwyższa cena" recorded — a real nuance of
  // restricted auctions with exactly one qualified participant).
  assert.equal(legionow.kind, 'grunt');
  assert.equal(legionow.address_raw, 'ul. Legionów');
  assert.equal(legionow.dzialka_nr, '795/4');
  assert.equal(legionow.obreb, '5');
  assert.equal(legionow.area_m2, 345); // 0,0345 ha
  assert.equal(legionow.round, 1);
  assert.equal(legionow.starting_price_pln, 50500);
  assert.equal(legionow.final_price_pln, 50500);
  assert.equal(legionow.outcome, 'sold');
  assert.equal(legionow.auction_date, '2026-07-06');
  assert.ok(legionow.notes.length > 0, 'flags the single-bidder-at-wywoławcza inference');

  // Dębowa działka 230/2 — I przetarg NIEOGRANICZONY, unsold (no wadium paid).
  assert.equal(debowa1.kind, 'grunt');
  assert.equal(debowa1.address_raw, 'ul. Dębowa');
  assert.equal(debowa1.dzialka_nr, '230/2');
  assert.equal(debowa1.obreb, '24');
  assert.equal(debowa1.area_m2, 545); // 0,0545 ha
  assert.equal(debowa1.starting_price_pln, 145000);
  assert.equal(debowa1.final_price_pln, null);
  assert.equal(debowa1.outcome, 'unsold');

  // Dębowa działka 238/2 — same round/day, different parcel, also unsold.
  assert.equal(debowa2.kind, 'grunt');
  assert.equal(debowa2.dzialka_nr, '238/2');
  assert.equal(debowa2.obreb, '24');
  assert.equal(debowa2.area_m2, 1177); // 0,1177 ha
  assert.equal(debowa2.starting_price_pln, 225000);
  assert.equal(debowa2.final_price_pln, null);
  assert.equal(debowa2.outcome, 'unsold');
});

test('parseResultDoc: not a result doc (an announcement) → []', () => {
  assert.deepEqual(parseResultDoc(ANN_FLAT_MICKIEWICZA, null, 'u'), []);
});

test('parseResultDoc: missing/empty text → []', () => {
  assert.deepEqual(parseResultDoc('', null, 'u'), []);
  assert.deepEqual(parseResultDoc(null, null, 'u'), []);
});

// ------------------------------------------------ bezprzetargowo (tenant-sale) exclusion
//
// THE load-bearing correctness requirement for this city (see spike + config.js).
// Condensed from a REAL wykaz notice: attachment 18374 "ZPME nr 273_2026 -
// wersja edytowalna.pdf" (pdftotext -layout), fetched from
// bip.elblag.eu/artykul/191/10430/... (the "Wykaz nieruchomości - zbycie"
// board — a board this adapter's crawler never visits; this fixture proves the
// SECOND, explicit layer of defense: even if such a document's text ever
// reached parseAnnouncement/parseResultDoc, it is rejected, not misread as a
// real auction).

const TENANT_SALE_WYKAZ = `                                    ZARZĄDZENIE NR 273/2026
                                  PREZYDENTA MIASTA ELBLĄG

                                           z dnia 6 lipca 2026 r.

  w sprawie sporządzenia i ogłoszenia wykazu lokali mieszkalnych przeznaczonych do sprzedaży na
                 rzecz najemców oraz udzielenia bonifikat od ceny sprzedaży lokali
Na podstawie art. 35 ust.1 i 2, art. 37 ust.2 pkt 1 i art. 68 ust.1 pkt. 7 ustawy z dnia 21 sierpnia 1997 r.
o gospodarce nieruchomościami (Dz.U. z 2026 r. poz. 399) oraz §1 uchwały nr XXIII/538/05 Rady Miejskiej
w Elblągu z dnia 23 czerwca 2005 r. w sprawie zasad udzielania bonifikat od ceny sprzedaży lokali
mieszkalnych na rzecz ich najemców (Dz.Urz.Woj.Warm.-Mazur. z 2016 r. poz. 4693),
                                        zarządza się, co następuje:
§ 1. 1. Z zasobu nieruchomości Gminy Miasto Elbląg przeznacza się do sprzedaży lokale mieszkalne wraz
z udziałami w prawie własności przynależnych części nieruchomości gruntowych, szczegółowo opisanych
w załączniku do niniejszego zarządzenia, na rzecz najemców tych lokali.
2. Udziela się bonifikaty od ceny sprzedaży lokali mieszkalnych, o których mowa w ust.1, w wysokościach
jak w załączniku do niniejszego zarządzenia.
                                                                                                                                         Załącznik do zarządzenia nr 273/2026
                                                                                                                                         Prezydenta Miasta Elbląg
                                                                                                                                         z dnia 6 lipca 2026 r.

       Wykaz lokali mieszkalnych przeznaczonych do sprzedaży w trybie bezprzetargowym na rzecz ich najemców wraz z udziałem w prawie własności
                                                             przynależnej części gruntu

                                      Oznaczenie lokalu                                                Oznaczenie nieruchomości gruntowej
Lp.                                                  Nr           Nr                             Nr          Nr            Pow.                                       Cena
                       Ulica                                                   użytk.                                                           Nr KW
                                                  budynku       lokalu                         działki      obrębu         w ha                                       nieruchomości
 1.     Ogrodowa                                    17              8            43,20           376            16         0,0356                                           111.810
 2.     Giermków                                    22              5            33,90           257            15         0,0728                                           148.310
 3.     Przyjaźni                                   21              1            49,76           324            17         0,4319                                           267.810
`;

test('isBezprzetargowoDoc: real tenant-sale wykaz (ZARZĄDZENIE, "w trybie bezprzetargowym") → true', () => {
  assert.equal(isBezprzetargowoDoc(TENANT_SALE_WYKAZ), true);
});

test('isBezprzetargowoDoc: real auction announcement and real result batch → false (no false positives)', () => {
  assert.equal(isBezprzetargowoDoc(ANN_FLAT_MICKIEWICZA), false);
  assert.equal(isBezprzetargowoDoc(ANN_BUILDING_DEBOWA), false);
  assert.equal(isBezprzetargowoDoc(RESULT_BATCH), false);
});

test('isResultDoc / isAnnouncementDoc: the tenant-sale wykaz matches NEITHER (it is its own doc type)', () => {
  assert.equal(isResultDoc(TENANT_SALE_WYKAZ), false);
  assert.equal(isAnnouncementDoc(TENANT_SALE_WYKAZ), false);
});

test('parseAnnouncement: a tenant-sale wykaz can never produce a fake auction record', () => {
  const r = parseAnnouncement({
    kindText: 'lokal mieszkalny',
    pdfText: TENANT_SALE_WYKAZ,
  });
  assert.equal(r, null);
});

test('parseResultDoc: a tenant-sale wykaz can never produce a fake result record', () => {
  assert.deepEqual(parseResultDoc(TENANT_SALE_WYKAZ, null, 'x'), []);
});

test('addressRawFromText: the tenant-sale wykaz has no "Lokalizacja:" line to (mis)parse an address from', () => {
  assert.equal(lokalizacjaFromText(TENANT_SALE_WYKAZ), null);
  assert.equal(addressRawFromText(TENANT_SALE_WYKAZ), null);
});
