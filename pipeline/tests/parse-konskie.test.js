// Końskie parser tests. Fixtures are byte-faithful copies of REAL pdftotext
// -layout output fetched live from bip.umkonskie.pl board 5027 (verified
// 2026-07-10), read straight out of the on-disk pdf-text-cache after fetching
// each PDF through the actual core/pdf-text.js used at runtime. Each fixture
// feeds the SAME normalizeText() + field-extractor pipeline crawl.js drives,
// so the parsers are groundtruthed against production data — including the
// real line-wrap quirks pdftotext produces (see WARSZTATOWA_ANN_R2 below).
//
//   id 882606  Mieszka I 3/43   — ANNOUNCEMENT, round I  (coop-share, udział 1/2)
//   id 891845  Mieszka I 3/43   — RESULT, round I, UNSOLD (0 wadium)
//   id 868285  Warsztatowa 2B/4 — ANNOUNCEMENT, round II (price cut 109k->85k)
//   id 849424  Warsztatowa 2B/4 — RESULT, round I,  UNSOLD (0 wadium)
//   id 875621  Warsztatowa 2B/4 — RESULT, round II, UNSOLD (1 wadium, no-show)
//
// All 5 live fixtures are UNSOLD — 0 sales fell inside this crawl's window
// (see parse.js header). ONE synthetic fixture (SOLD_SYNTHETIC, clearly
// marked, built by editing only the outcome paragraph of a real result) is
// included to sanity-check the sold-outcome code path; its extrapolated
// regex is NOT live-confirmed — same caveat tczew's parser shipped with.
//
// The Warsztatowa round-2 ANNOUNCEMENT (id 868285) is the load-bearing
// fixture for auctionDateFromText: it narrates the PRIOR round's history
// ("Pierwszy przetarg został przeprowadzony w dniu 29 października 2025
// roku") BEFORE stating the current round's schedule ("... odbędzie się
// dnia 25 marca 2026 roku") later in the same PDF — catching this decoy
// live is what forced the SCHEDULED-before-HELD priority split in parse.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeText,
  aptFromText,
  streetBuildingFromText,
  addressRawFromText,
  addressFromText,
  areaFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isNegativeOutcome,
  flatKindFromText,
  roundFromText,
  auctionDateFromText,
  shareFromText,
  publishedDateFromDetail,
  attachmentPdfUrlFromDetail,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/konskie/parse.js';
import { parseListPage, isAnnouncementTitle, isResultTitle } from '../src/cities/konskie/crawl.js';

// --------------------------------------------------------------- real fixtures

const ANN_MIESZKA_I = `                                                                  Końskie, dnia 11.05.2026 r.

                            OGŁOSZENIE O PRZETARGU

Burmistrz Miasta i Gminy Końskie działając na podstawie uchwały Rady Miejskiej
   w Końskich Nr XVIII/131/2025 z dnia 22 września 2025 r. ogłasza pierwszy
      przetarg ustny nieograniczony na sprzedaż udziału w spółdzielczym
                 własnościowym prawie do lokalu mieszkalnego


Przedmiotem sprzedaży jest spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 43
o powierzchni użytkowej 46,94 m², położonego w budynku wielorodzinnym przy ul. Mieszka I 3
w Końskich, przysługujące Gminie Końskie w udziale wynoszącym 1/2 części.
Dla przedmiotowego lokalu Sąd Rejonowy w Końskich Wydział Ksiąg Wieczystych prowadzi
księgę wieczystą numer KI1K/00064118/2.
Cena wywoławcza lokalu wynosi – 105.500,00 złotych.
Wadium wynosi - 10.000,00 zł
Sprzedaż lokalu jest zwolniona z podatku VAT zgodnie z przepisami ustawy o podatku od
towarów i usług z dnia 11 marca 2004 r. (Dz.U. z 2025 r. poz. 775 ze zm.)

Lokal mieszkalny nr 43 o powierzchni użytkowej 46,94 m², położony jest na IV piętrze budynku
i składa się z 2 pokoi, kuchni, łazienki z WC i przedpokoju, do lokalu przynależy piwnica.
Właścicielem budynku wielorodzinnego, w którym znajduje się przedmiotowy lokal jest
w 433284/447587 części Konecka Spółdzielnia Mieszkaniowa a w pozostałej części osoby
fizyczne. Budynek znajduje się na działce nr 5171/4 o powierzchni 0,4242 ha, położonej
w Końskich w obrębie geodezyjnym 0002. Dla działki Sąd Rejonowy w Końskich Wydział Ksiąg
Wieczystych prowadzi księgę wieczystą numer KI1K/00001391/0. Według ewidencji gruntów
działka stanowi użytek B tj. tereny mieszkaniowe.

Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 43, położonego w budynku
wielorodzinnym przy ul. Mieszka I 3 w Końskich, przysługuje Gminie Końskie w udziale
wynoszącym 1/2 części oraz osobie fizycznej w 1/2 części. Osoba prywatna będąca
właścicielem pozostałego udziału wynoszącego 1/2 części też jest zainteresowana jego
sprzedażą.

   Pierwszy przetarg ustny nieograniczony na sprzedaż udziału w spółdzielczym
                   własnościowym prawie do lokalu mieszkalnego
  odbędzie się dnia 23 czerwca 2026 roku o godz. 10:00 w siedzibie Urzędu Miasta
   i Gminy w Końskich, przy ul. Partyzantów 1, skrzydło zachodnie, pokój nr 2

1. Warunkiem przystąpienia do przetargu jest:
    1. wpłacenie wadium, wpłaty wadium należy dokonać na rachunek bankowy Urzędu Miasta
       i Gminy Końskie nr 64 1020 2629 0000 9202 0511 5557 do dnia 17 czerwca 2026 roku, przy
       czym liczy się termin faktycznego wpływu w/w kwoty na konto urzędu.
8. Przetarg zostanie przeprowadzony zgodnie z przepisami ustawy z dnia 21 sierpnia 1997 r. o gospodarce
nieruchomościami (Dz.U. z 2026 r. poz. 339) oraz rozporządzeniem Rady Ministrów z dnia 14 września
2004 roku w sprawie trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z
2021 r., poz. 2213).
9. Przy zakupie nieruchomości przez osobę będącą cudzoziemcem w rozumieniu ustawy z dnia 24 marca
1920 r. o nabywaniu nieruchomości przez cudzoziemców (Dz. U. z 2017 r., poz. 2278) wymagane jest
stosowne zezwolenie wynikające z przepisów tej ustawy.

Wywieszono dn. …………… 2026 r.
Zdjęto dn. …………… 2026 r.
`;

const RES_MIESZKA_I = `              BURMISTRZ MIASTA I GMINY
                    KOŃSKIE
              26-200 Końskie, ul. Partyzantów 1, tel. ( 41 ) 372 32 49, fax ( 41 ) 372 29 55
                            e-mail: sekretariat@umkonskie.pl; www.umkonskie.pl

                                                                Końskie, dn. 02.07.2026 r.


                        Informacja o wynikach przetargu

Zgodnie z § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 roku
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (Dz. U. 2021, poz. 2213) Burmistrz Miasta i Gminy Końskie podaje do
publicznej wiadomości informacje o wynikach pierwszego przetargu ustnego
nieograniczonego przeprowadzonego w dniu 23 czerwca 2026 roku o godz. 10:00 w siedzibie
Urzędu Miasta i Gminy w Końskich przy ul. Partyzantów 1.

Przedmiotem przetargu było spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 43
o powierzchni użytkowej 46,94 m², położonego w budynku wielorodzinnym przy ul. Mieszka
I 3 w Końskich, przysługujące Gminie Końskie w udziale wynoszącym 1/2 części.
Dla przedmiotowego lokalu Sąd Rejonowy w Końskich Wydział Ksiąg Wieczystych
prowadzi księgę wieczystą numer KI1K/00064118/2.
Cena wywoławcza lokalu wynosiła – 105.500,00 złotych.

Do dnia 17.06.2026 roku zgodnie z ogłoszeniem o przetargu na konto urzędu nie wpłynęło
żadne wadium. Po wyznaczonym terminie na konto urzędu też nie wpłynęło żadne wadium.
Osób dopuszczonych ani osób niedopuszczonych do uczestniczenia w przetargu nie było.
Wobec powyższego przetarg zakończył się wynikiem negatywnym.

Informację o wynikach przetargu podaje się do publicznej wiadomości poprzez zamieszczenie
w Biuletynie Informacji Publicznej oraz wywieszenie na tablicy ogłoszeń w siedzibie Urzędu
Miasta i Gminy Końskie, na okres co najmniej 7 dni.


Wywieszono dnia 02.07.2026 r.
Zdjęto dnia …….07.2026 r.
`;

// Load-bearing fixture for the SCHEDULED-before-HELD date-priority fix: line
// "Pierwszy przetarg został przeprowadzony w dniu 29 października 2025 roku."
// (history) appears BEFORE "... odbędzie się dnia 25 marca 2026 roku."
// (operative) — see auctionDateFromText's header comment in parse.js.
const WARSZTATOWA_ANN_R2 = `              BURMISTRZ MIASTA I GMINY
                    KOŃSKIE
              26-200 Końskie, ul. Partyzantów 1, tel. ( 41 ) 372 32 49, fax ( 41 ) 372 29 55
                            e-mail: sekretariat@umkonskie.pl; www.umkonskie.pl

Znak: GN.6840.20.2025.IG                                         Końskie, dn. 20.02.2026 r.

                   OGŁOSZENIE O DRUGIM PRZETARGU
       Burmistrz Miasta i Gminy Końskie działając na podstawie uchwały Rady Miejskiej
w Końskich Nr XII/67/2007 z dnia 28 czerwca 2007 r. ogłasza drugi przetarg ustny
nieograniczony na zbycie nieruchomości lokalowej stanowiącej własność Gminy Końskie.
Pierwszy przetarg został przeprowadzony w dniu 29 października 2025 roku.
Przedmiotem sprzedaży jest lokal mieszkalny nr 4 położony w Końskich przy ulicy
Warsztatowej 2B.
Forma zbycia nieruchomości – zbycie w drodze przetargu ustnego nieograniczonego
Cena nieruchomości wynosi - 85.000,00 złotych
Wadium wynosi – 10.000,00 złotych
Cena lokalu jest zwolniona z podatku VAT, zgodnie z przepisami ustawy o podatku od
towarów i usług z dnia 11 marca 2004 roku (Dz. U. z 2025 poz. 775 ze zm.).

Opis nieruchomości: lokal mieszkalny numer 4 o powierzchni użytkowej 53,00 m², położony
na poddaszu w budynku przy ul. Warsztatowej 2B, wybudowanym w 1938 roku.
Z własnością lokalu związany jest udział do 5300/37774 części w częściach wspólnych
budynku i udziałem w prawie własności działki nr 1009/14 o powierzchni 0,1465 ha, dla
której prowadzona jest księga wieczysta KI1K/00035346/7.

Drugi przetarg ustny nieograniczony na sprzedaż w/w lokalu mieszkalnego
     odbędzie się dnia 25 marca 2026 roku o godz. 10:00 w siedzibie
       Urzędu Miasta i Gminy w Końskich, przy ul. Partyzantów 1,
                     skrzydło zachodnie, pokój nr 2
1. Warunkiem przystąpienia do przetargu jest:
    1. wpłacenie wadium, wpłaty wadium należy dokonać na rachunek bankowy Urzędu Miasta
       i Gminy Końskie nr 64 1020 2629 0000 9202 0511 5557 do dnia 19 marca 2026 roku, przy
       czym liczy się termin faktycznego wpływu w/w kwoty na konto urzędu.
8. Przetarg zostanie przeprowadzony zgodnie z przepisami ustawy z dnia 21 sierpnia 1997 r.
o gospodarce nieruchomościami (Dz.U. z 2024 r. poz.1145 ze zm.) oraz rozporządzeniem Rady
Ministrów z dnia 14 września 2004 roku w sprawie trybu przeprowadzania przetargów oraz rokowań
na zbycie nieruchomości (Dz. U. z 2021 r., poz. 2213).

Wywieszono dn. …………… 2026 r.
Zdjęto dn. …………… 2026 r.
`;

const RES_WARSZTATOWA_R1 = `              BURMISTRZ MIASTA I GMINY
                    KOŃSKIE
              26-200 Końskie, ul. Partyzantów 1, tel. ( 41 ) 372 32 49, fax ( 41 ) 372 29 55
                            e-mail: sekretariat@umkonskie.pl; www.umkonskie.pl

                                                                Końskie, dn. 06.11.2025 r.


                        Informacja o wynikach przetargu

Zgodnie z § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 roku
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (Dz. U. z 2021 r., poz. 2213) Burmistrz Miasta i Gminy Końskie podaje do
publicznej wiadomości informacje o wynikach pierwszego przetargu ustnego
nieograniczonego przeprowadzonego w dniu 29 października 2025 roku o godz. 10:00
w siedzibie Urzędu Miasta i Gminy w Końskich przy ul. Partyzantów 1.

Przedmiotem przetargu był lokal mieszkalny położony na poddaszu w budynku przy ulicy
Warsztatowej 2B, oznaczony numerem 4 o powierzchni użytkowej 53,00 m². Lokal składa się
z dwóch pokoi, kuchni, łazienki i przedpokoju.
Z własnością lokalu związany jest udział do 5300/37774 części w częściach wspólnych
budynku i udziałem w prawie własności działki nr 1009/14 o powierzchni 0,1465 ha, dla
której prowadzona jest księga wieczysta KI1K/00035346/7.
Cena wywoławcza nieruchomości wynosiła 109.000,00 złotych brutto.

Do dnia 23.10.2025 r. zgodnie z ogłoszeniem na konto urzędu nie wpłynęło żadne wadium.
Po wyznaczonym terminie też na konto urzędu nie wpłynęło żadne wadium. Wobec
powyższego ani osób dopuszczonych ani osób niedopuszczonych do uczestniczenia
w przetargu nie było. Przetarg zorganizowany w dniu 29.10.2025 r. zakończył się wynikiem
negatywnym.

Informację o wynikach przetargu podaje się do publicznej wiadomości poprzez zamieszczenie
w Biuletynie Informacji Publicznej oraz wywieszenie na tablicy ogłoszeń w siedzibie Urzędu
Miasta i Gminy Końskie, na okres co najmniej 7 dni.

Wywieszono dnia 06.11.2025 r.
Zdjęto dnia …….11.2025 r.
`;

const RES_WARSZTATOWA_R2 = `              BURMISTRZ MIASTA I GMINY
                    KOŃSKIE
              26-200 Końskie, ul. Partyzantów 1, tel. ( 41 ) 372 32 49, fax ( 41 ) 372 29 55
                            e-mail: sekretariat@umkonskie.pl; www.umkonskie.pl

                                                                Końskie, dn. 02.04.2026 r.


                        Informacja o wynikach przetargu

Zgodnie z § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 roku
w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (Dz. U. z 2021 r., poz. 2213) Burmistrz Miasta i Gminy Końskie podaje do
publicznej wiadomości informacje o wynikach drugiego przetargu ustnego nieograniczonego
przeprowadzonego w dniu 25 marca 2026 roku o godz. 10:00 w siedzibie Urzędu Miasta
i Gminy w Końskich przy ul. Partyzantów 1.

Przedmiotem przetargu był lokal mieszkalny położony w Końskich przy ulicy Warsztatowej
2B, oznaczony numerem 4 o powierzchni użytkowej 53,00 m². Lokal składa się z dwóch
pokoi, kuchni, łazienki i przedpokoju. Z własnością lokalu związany jest udział do
5300/37774 części w częściach wspólnych budynku i udziałem w prawie własności działki
nr 1009/14 o powierzchni 0,1465 ha, dla której prowadzona jest księga wieczysta
KI1K/00035346/7.
Cena wywoławcza lokalu wynosiła 85.000,00 złotych.

Do dnia 19.03.2026 r. zgodnie z ogłoszeniem na konto urzędu wpłynęło jedno wadium. Po
wyznaczonym terminie na konto urzędu nie wpłynęło żadne wadium. Osoba, która wpłaciła
wadium została dopuszczona do uczestniczenia w przetargu, osób niedopuszczonych nie było.
Osoba dopuszczona nie stawiła się na przetargu. Wobec powyższego przetarg zakończył się
wynikiem negatywnym.

Informację o wynikach przetargu podaje się do publicznej wiadomości poprzez zamieszczenie
w Biuletynie Informacji Publicznej oraz wywieszenie na tablicy ogłoszeń w siedzibie Urzędu
Miasta i Gminy Końskie, na okres co najmniej 7 dni.

Wywieszono dnia 02.04.2026 r.
Zdjęto dnia …….04.2026 r.
`;

// SYNTHETIC — NOT fetched live. Built by replacing only RES_WARSZTATOWA_R2's
// negative-outcome paragraph with a hypothetical positive one, in the same
// §12-template shape used by chelmno/tczew's own (also-unvalidated) sold
// regex. Exercises the sold code path only; achievedPriceFromText is NOT
// live-confirmed for Końskie (see parse.js header VALIDATE note).
const RES_WARSZTATOWA_SOLD_SYNTHETIC = RES_WARSZTATOWA_R2.replace(
  /Do dnia 19\.03\.2026[\s\S]*?wynikiem\s+negatywnym\./,
  'Do dnia 19.03.2026 r. zgodnie z ogłoszeniem na konto urzędu wpłynęły dwa wadia. Najwyższa\n' +
    'cena osiągnięta w przetargu wynosi 92.500,00 złotych. Nabywcą nieruchomości została Pani\n' +
    'Anna Kowalska za cenę 92.500,00 złotych.',
);

// Real title string captured verbatim from board 5027 page 8 (2026-07-10) —
// unusually long, doubles as body text. Used to confirm the classifyKind
// gate rejects LAND entries (village/parcel-numbered, no street address) in
// parseAnnouncement/parseResultDoc, exactly as board 5027 requires (flats
// and land share one undifferentiated title stream — see crawl.js header).
const LAND_TITLE_REAL =
  'OGŁOSZENIE O PRZETARGU  pierwszy przetarg ustny nieograniczony na sprzedaż ' +
  'niezabudowanej nieruchomości położonej w miejscowości Młynek Nieświński ' +
  'oznaczonej numerem działki 785 o pow. 0,1626 ha.';

// Real (condensed-but-faithful) excerpt from the Strażacka 26 announcement
// PDF (case GN.6840.6.2025.IG, board entry id 836195, fetched live
// 2026-07-10) — a classifyKind() FALSE-POSITIVE fixture. The notice's own
// sale-object clause says a "zabudowana działka" (built plot / whole
// building) is being sold, but the body ALSO says the building contains six
// "lokale mieszkalne" that are explicitly NOT independent units —
// classifyKind() alone reads 'mieszkalny' off that substring. This is what
// flatKindFromText()'s override exists to catch (real bug: this Strażacka
// entry surfaced as a bogus flat listing, area 150.67 m² / price null, in
// this adapter's first live crawlActive() run before the fix).
const STRAZACKA_PLOT_REAL =
  'Burmistrz Miasta i Gminy Końskie działając na podstawie uchwały Rady Miejskiej ' +
  'w Końskich Nr XII/67/2007 z dnia 28 czerwca 2007 r. ogłasza pierwszy przetarg ustny ' +
  'nieograniczony na zbycie zabudowanej działki położonej w Końskich przy ulicy Strażackiej, ' +
  'obręb 0005, oznaczonej w ewidencji gruntów i budynków numerem 4467 o pow. 0,0204 ha. ' +
  'Cena wywoławcza nieruchomości - 250.000,00 złotych. ' +
  'Opis nieruchomości: działka nr 4467 o powierzchni 204 m², położona jest w mieście ' +
  'Końskie przy ulicy Strażackiej 26. Budynek mieszkalny – został najprawdopodobniej ' +
  'wybudowany w okresie pierwszych lat powojennych. Powierzchnia zabudowy 118,00 m², ' +
  'powierzchnia użytkowa 150,67 m², powierzchnia netto 174,38 m². W budynku znajduje się ' +
  'sześć lokali mieszkalnych, nie stanowiących samodzielnych lokali w świetle przepisów prawa.';

// Real detail-page HTML excerpts (attachment link + Rejestr-zmian date),
// captured verbatim from https://bip.umkonskie.pl/wiadomosci/5027/wiadomosc/882606/... (2026-07-10).
const DETAIL_HTML_REAL =
  '<div class="t1 attachment">\n' +
  '\t\t<a href="https://bip-v1-files.idcom-jst.pl/sites/46779/wiadomosci/882606/files/ogloszenie_udzial_lokal_mieszka_i_20260511.pdf" target="_blank" title=\'Otwórz w nowym oknie\' class="contener i2">\n' +
  '\t\t    ogloszenie udzial lokal mieszka i 20260511\n' +
  '\t\t</a>\n' +
  '    </div>\n' +
  '<span>Data wytworzenia dokumentu: <span>11.05.2026</span></span>';

// Real board-5027 page-1 list excerpt (three consecutive entries, verbatim),
// captured 2026-07-10 — mirrors chelmno's board-XML test.
const LIST_PAGE_REAL =
  '<div class="wiadomosci ajaxContener"><div class="t1 clickable"><div class="contener">' +
  '<p class="title"><a href="https://bip.umkonskie.pl/wiadomosci/5027/wiadomosc/893479/ogloszenie__drugi_przetarg_ustny_nieograniczony_na_sprzedaz_nier">Ogłoszenie - drugi przetarg ustny nieograniczony na sprzedaż nieruchomości - Pomyków</a></p>' +
  '</div></div><div class="t1 clickable"><div class="contener">' +
  '<p class="title"><a href="https://bip.umkonskie.pl/wiadomosci/5027/wiadomosc/893199/informacja_o_wynikach_przetargu__ul_lesna">Informacja o wynikach przetargu - ul. Leśna</a></p>' +
  '</div></div><div class="t1 clickable"><div class="contener">' +
  '<p class="title"><a href="https://bip.umkonskie.pl/wiadomosci/5027/wiadomosc/893081/wykaz_nieruchomosci_gminnych_przeznaczonych_do_zbycia__konskie_d">Wykaz nieruchomości gminnych przeznaczonych do zbycia - Końskie dz. 2384/19</a></p>' +
  '</div></div></div>';

// ------------------------------------------------------------------- unit funcs

test('normalizeText: collapses pdftotext line-wraps to single spaces', () => {
  assert.equal(normalizeText('ul. Mieszka\nI 3'), 'ul. Mieszka I 3');
  assert.equal(normalizeText('  a   b\n\nc  '), 'a b c');
});

test('aptFromText: "lokalu... nr N" (announce) vs "oznaczony numerem N" (result)', () => {
  assert.equal(aptFromText(normalizeText(ANN_MIESZKA_I)), '43');
  assert.equal(aptFromText(normalizeText(RES_MIESZKA_I)), '43');
  assert.equal(aptFromText(normalizeText(RES_WARSZTATOWA_R1)), '4');
  assert.equal(aptFromText(normalizeText(RES_WARSZTATOWA_R2)), '4');
  // Third template: "lokal mieszkalny nr 4" appears well before the street.
  assert.equal(aptFromText(normalizeText(WARSZTATOWA_ANN_R2)), '4');
});

test('streetBuildingFromText: "przy ul." and "przy ulicy" both resolve, across a mid-token line-wrap', () => {
  assert.deepEqual(streetBuildingFromText(normalizeText(ANN_MIESZKA_I)), { street: 'Mieszka I', building: '3' });
  // RES_MIESZKA_I wraps "Mieszka\nI 3" across a line — normalizeText must
  // repair this before the regex runs.
  assert.deepEqual(streetBuildingFromText(normalizeText(RES_MIESZKA_I)), { street: 'Mieszka I', building: '3' });
  assert.deepEqual(streetBuildingFromText(normalizeText(RES_WARSZTATOWA_R1)), { street: 'Warsztatowej', building: '2B' });
  // RES_WARSZTATOWA_R2 wraps "Warsztatowej\n2B" across a line too.
  assert.deepEqual(streetBuildingFromText(normalizeText(RES_WARSZTATOWA_R2)), { street: 'Warsztatowej', building: '2B' });
});

test('addressFromText: full parseAddress() output, apt joined via building/apt', () => {
  const a = addressFromText(normalizeText(ANN_MIESZKA_I));
  assert.equal(a.street, 'Mieszka I');
  assert.equal(a.building, '3');
  assert.equal(a.apt, '43');
  assert.equal(a.key, 'mieszka i|3|43');

  const w = addressFromText(normalizeText(RES_WARSZTATOWA_R1));
  assert.equal(w.building, '2B');
  assert.equal(w.apt, '4');
  assert.equal(w.key, 'warsztatowej|2B|4');
});

test('areaFromText: "powierzchni użytkowej N,NN m²" — identical phrase across templates', () => {
  assert.equal(areaFromText(normalizeText(ANN_MIESZKA_I)), 46.94);
  assert.equal(areaFromText(normalizeText(RES_MIESZKA_I)), 46.94);
  assert.equal(areaFromText(normalizeText(WARSZTATOWA_ANN_R2)), 53);
  assert.equal(areaFromText(normalizeText(RES_WARSZTATOWA_R1)), 53);
  assert.equal(areaFromText(normalizeText(RES_WARSZTATOWA_R2)), 53);
});

test('startingPriceFromText: label varies ("Cena wywoławcza lokalu/nieruchomości wynosi(ła)", "Cena nieruchomości wynosi") but all resolve', () => {
  assert.equal(startingPriceFromText(normalizeText(ANN_MIESZKA_I)), 105500);
  assert.equal(startingPriceFromText(normalizeText(RES_MIESZKA_I)), 105500);
  assert.equal(startingPriceFromText(normalizeText(WARSZTATOWA_ANN_R2)), 85000);
  assert.equal(startingPriceFromText(normalizeText(RES_WARSZTATOWA_R1)), 109000);
  assert.equal(startingPriceFromText(normalizeText(RES_WARSZTATOWA_R2)), 85000);
});

test('isNegativeOutcome: true for all 3 real (unsold) results, false for announcements', () => {
  assert.equal(isNegativeOutcome(normalizeText(RES_MIESZKA_I)), true);
  assert.equal(isNegativeOutcome(normalizeText(RES_WARSZTATOWA_R1)), true);
  assert.equal(isNegativeOutcome(normalizeText(RES_WARSZTATOWA_R2)), true);
  assert.equal(isNegativeOutcome(normalizeText(ANN_MIESZKA_I)), false);
});

test('achievedPriceFromText: null for unsold; extrapolated §12 phrasing resolves on the synthetic sold fixture', () => {
  assert.equal(achievedPriceFromText(normalizeText(RES_MIESZKA_I)), null);
  assert.equal(achievedPriceFromText(normalizeText(RES_WARSZTATOWA_SOLD_SYNTHETIC)), 92500);
});

test('roundFromText: "ogłasza <ordinal> przetarg" (announce) beats prior-round history; "wynikach <ordinal-genitive> przetargu" (result)', () => {
  assert.equal(roundFromText(normalizeText(ANN_MIESZKA_I)), 1);
  assert.equal(roundFromText(normalizeText(RES_MIESZKA_I)), 1);
  // Load-bearing: "ogłasza drugi przetarg" (operative) must win over the
  // history clause "Pierwszy przetarg został przeprowadzony ..." two
  // sentences later in the SAME document.
  assert.equal(roundFromText(normalizeText(WARSZTATOWA_ANN_R2)), 2);
  assert.equal(roundFromText(normalizeText(RES_WARSZTATOWA_R1)), 1);
  assert.equal(roundFromText(normalizeText(RES_WARSZTATOWA_R2)), 2);
});

test('auctionDateFromText: SCHEDULED ("odbędzie się") beats the HELD-history decoy in a round-2 announcement', () => {
  assert.equal(auctionDateFromText(normalizeText(ANN_MIESZKA_I)), '2026-06-23');
  // REGRESSION: WARSZTATOWA_ANN_R2 contains "Pierwszy przetarg został
  // przeprowadzony w dniu 29 października 2025 roku" (prior-round history)
  // BEFORE "... odbędzie się dnia 25 marca 2026 roku" (operative). A single
  // combined regex without SCHEDULED-first priority would return
  // '2025-10-29' here instead of the correct '2026-03-25'.
  assert.equal(auctionDateFromText(normalizeText(WARSZTATOWA_ANN_R2)), '2026-03-25');
});

test('auctionDateFromText: HELD ("przeprowadzon...") resolves on result docs, which never say "odbędzie się"', () => {
  assert.equal(auctionDateFromText(normalizeText(RES_MIESZKA_I)), '2026-06-23');
  assert.equal(auctionDateFromText(normalizeText(RES_WARSZTATOWA_R1)), '2025-10-29');
  assert.equal(auctionDateFromText(normalizeText(RES_WARSZTATOWA_R2)), '2026-03-25');
});

test('shareFromText: "w udziale wynoszącym 1/2 części" on the coop-share flat only', () => {
  assert.equal(shareFromText(normalizeText(ANN_MIESZKA_I)), '1/2');
  assert.equal(shareFromText(normalizeText(RES_MIESZKA_I)), '1/2');
  assert.equal(shareFromText(normalizeText(RES_WARSZTATOWA_R1)), null);
});

test('publishedDateFromDetail: dot-separated "Data wytworzenia dokumentu" (Końskie-specific — Tczew/Giżycko use dashes)', () => {
  assert.equal(publishedDateFromDetail(DETAIL_HTML_REAL), '2026-05-11');
  assert.equal(publishedDateFromDetail(''), null);
});

test('attachmentPdfUrlFromDetail: bip-v1-files.idcom-jst.pl PDF link, site 46779', () => {
  assert.equal(
    attachmentPdfUrlFromDetail(DETAIL_HTML_REAL),
    'https://bip-v1-files.idcom-jst.pl/sites/46779/wiadomosci/882606/files/ogloszenie_udzial_lokal_mieszka_i_20260511.pdf',
  );
  assert.equal(attachmentPdfUrlFromDetail('<p>no attachment here</p>'), null);
});

// ------------------------------------------------------------- parseAnnouncement

test('parseAnnouncement: Mieszka I 3/43 (coop-share, round I)', () => {
  const rec = parseAnnouncement(ANN_MIESZKA_I, { detailUrl: 'https://bip.umkonskie.pl/x/882606', publishedDate: '2026-05-11' });
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'mieszka i|3|43');
  assert.equal(rec.area_m2, 46.94);
  assert.equal(rec.starting_price_pln, 105500);
  assert.equal(rec.auction_date, '2026-06-23');
  assert.equal(rec.round, 1);
  assert.equal(rec.share, '1/2');
  assert.equal(rec.detail_url, 'https://bip.umkonskie.pl/x/882606');
  assert.equal(rec.published_date, '2026-05-11');
});

test('parseAnnouncement: Warsztatowa 2B/4 round II (price cut visible, date beats history decoy)', () => {
  const rec = parseAnnouncement(WARSZTATOWA_ANN_R2, { detailUrl: 'https://bip.umkonskie.pl/x/868285', publishedDate: '2026-02-20' });
  assert.equal(rec.address.key, 'warsztatowej|2B|4');
  assert.equal(rec.area_m2, 53);
  assert.equal(rec.starting_price_pln, 85000);
  assert.equal(rec.auction_date, '2026-03-25');
  assert.equal(rec.round, 2);
  assert.equal(rec.share, undefined);
});

test('parseAnnouncement: returns null for a LAND entry (classifyKind gate)', () => {
  assert.equal(parseAnnouncement(LAND_TITLE_REAL), null);
});

test('flatKindFromText: REGRESSION — a whole-building "zabudowana działka" sale is not classified as a flat, even though its body mentions non-independent "lokale mieszkalne"', () => {
  const norm = normalizeText(STRAZACKA_PLOT_REAL);
  assert.equal(flatKindFromText(norm), 'zabudowana');
  assert.equal(parseAnnouncement(STRAZACKA_PLOT_REAL), null);
});

// ------------------------------------------------------------- parseResultDoc

test('parseResultDoc: Mieszka I 3/43 UNSOLD (round I, 0 wadium)', () => {
  const [r] = parseResultDoc(RES_MIESZKA_I, '2026-07-02', 'https://bip-v1-files.idcom-jst.pl/.../informacja_o_wynikach_przetargu_z_2026_06_23.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'mieszka i|3|43');
  assert.equal(r.area_m2, 46.94);
  assert.equal(r.starting_price_pln, 105500);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_buyer');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-06-23');
  assert.equal(r.share, '1/2');
  assert.equal(r.source_pdf, 'https://bip-v1-files.idcom-jst.pl/.../informacja_o_wynikach_przetargu_z_2026_06_23.pdf');
});

test('parseResultDoc: Warsztatowa 2B/4 round I UNSOLD (price 109 000 — pre-cut)', () => {
  const [r] = parseResultDoc(RES_WARSZTATOWA_R1, '2025-11-06', 'x');
  assert.equal(r.address.key, 'warsztatowej|2B|4');
  assert.equal(r.area_m2, 53);
  assert.equal(r.starting_price_pln, 109000);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-10-29');
});

test('parseResultDoc: Warsztatowa 2B/4 round II UNSOLD (price 85 000 — post-cut, bidder no-show)', () => {
  const [r] = parseResultDoc(RES_WARSZTATOWA_R2, '2026-04-02', 'x');
  assert.equal(r.address.key, 'warsztatowej|2B|4');
  assert.equal(r.starting_price_pln, 85000);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-03-25');
});

test('parseResultDoc: SYNTHETIC sold fixture resolves outcome/final_price_pln (extrapolated — see file header)', () => {
  const [r] = parseResultDoc(RES_WARSZTATOWA_SOLD_SYNTHETIC, '2026-04-02', 'x');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 92500);
  assert.equal(r.unsold_reason, null);
});

test('parseResultDoc: returns [] for a LAND entry (classifyKind gate)', () => {
  assert.deepEqual(parseResultDoc(LAND_TITLE_REAL, null, 'x'), []);
});

test('parseResultDoc / parseAnnouncement: [] / null on empty text', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.equal(parseAnnouncement(''), null);
});

// ----------------------------------------------------------- crawl.js: board HTML

test('parseListPage: extracts {url, title} from a real board-5027 list excerpt', () => {
  const entries = parseListPage(LIST_PAGE_REAL);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].title, 'Ogłoszenie - drugi przetarg ustny nieograniczony na sprzedaż nieruchomości - Pomyków');
  assert.equal(entries[1].title, 'Informacja o wynikach przetargu - ul. Leśna');
  assert.equal(entries[2].title, 'Wykaz nieruchomości gminnych przeznaczonych do zbycia - Końskie dz. 2384/19');
  assert.equal(entries[0].url, 'https://bip.umkonskie.pl/wiadomosci/5027/wiadomosc/893479/ogloszenie__drugi_przetarg_ustny_nieograniczony_na_sprzedaz_nier');
});

test('isAnnouncementTitle: real "Ogłoszenie" sale titles pass; wykaz/lease/restricted/cancelled/result titles are excluded', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie - pierwszy przetarg ustny nieograniczony na sprzedaż udziału w spółdzielczym własnościowym prawie do lokalu mieszkalnego'), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie - drugi przetarg ustny nieograniczony na zbycie nieruchomości lokalowej - Końskie ul. Warsztatowa'), true);
  // wykaz — pre-announcement, not a scheduled auction
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości gminnych przeznaczonych do zbycia - Końskie dz. 2384/19'), false);
  // lease
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości gminnych przeznaczonych do wydzierżawienia i wynajmu'), false);
  // restricted ("ograniczony" without "nie-"), also a lease tender
  assert.equal(isAnnouncementTitle('Ogłoszenie - przetarg ustny ograniczony na wydzierżawienie na okres do 5 miesięcy miejsc pod ogródki gastronomiczne - Końskie płyta rynku miejskiego'), false);
  // cancelled
  assert.equal(isAnnouncementTitle('Ogłoszenie o odwołaniu przetargu ustnego nieograniczonego - Końskie ul. Strażacka'), false);
  // a result notice, not an announcement
  assert.equal(isAnnouncementTitle('Informacja o wynikach przetargu - ul. Mieszka I'), false);
});

test('isResultTitle: real "Informacja o wynikach" titles pass; announcements/wykaz do not', () => {
  assert.equal(isResultTitle('Informacja o wynikach przetargu - ul. Mieszka I'), true);
  assert.equal(isResultTitle('Informacja o wynikach przetargu - Końskie ul. Warsztatowa'), true);
  assert.equal(isResultTitle('Ogłoszenie - pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości - Pomyków'), false);
  assert.equal(isResultTitle('Wykaz nieruchomości gminnych przeznaczonych do zbycia - Pomyków'), false);
});
