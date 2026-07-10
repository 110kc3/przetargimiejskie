// Pleszew parser tests. Every fixture below is copied verbatim from REAL
// live documents fetched from bip.pleszew.pl on 2026-07-10 (announcement/
// result PDFs extracted with the real `pdftotext -layout`, board HTML copied
// from the live year-board pages) — the generic legal boilerplate paragraphs
// repeated on every notice (pełnomocnictwa, cudzoziemcy, oględziny, contact
// info, "zastrzega sobie prawo", "Ogłoszenie zamieszczono ...") are trimmed
// for brevity, matching the parse-chodziez.test.js convention, but every
// sentence kept is verbatim, including its real quirks (spacing, "r." vs no
// "r.", "ustny nieograniczony" vs "ustny ograniczony").
//
//   ZACHODNIA_II_ANN   ul. Zachodniej 1, 1/2 udziału w lokalu nr 1 — II
//                      przetarg (posted 2025-01-20, auction 2025-02-26),
//                      122 260 zł, 69,10 m². Same asset's I przetarg
//                      (2024-10-31, auction 2024-12-05) is the
//                      ZACHODNIA_I_WYNIK fixture below — both rounds are
//                      REAL and both concluded UNSOLD (no bidders); as of
//                      2026-07-10 no III przetarg has been posted yet (the
//                      live crawl.js smoke test confirms 0 active flat
//                      listings right now — see the adapter's build report).
//   ZACHODNIA_I_WYNIK  same lokal nr 1, I przetarg result: "wyniku brak
//                      oferentów zakończył się wynikiem negatywnym" — UNSOLD.
//   KALISZ_ANN         "nieruchomość lokalowa" nr 4, ul. Młynarska 13,
//                      Kalisz — a Pleszew-owned unit physically in
//                      neighbouring Kalisz (KW prefix KZ1A, Sąd Rejonowy w
//                      Kaliszu). I przetarg, 232 500 zł, 77,50 m². Note the
//                      street is NOMINATIVE "Młynarska" here.
//   KALISZ_WYNIK_SOLD  same flat, II przetarg result: "zakończył się
//                      wynikiem pozytywnym. Nabywcą za cenę 227 000 zł ...
//                      została Pani Julita Szaleniec." — SOLD. Note the
//                      street is GENITIVE "Młynarskiej" here (a real,
//                      observed source inconsistency — see parse.js).
//   NOWAWIES_R4_ANN    3 działki (249/7, 249/8, 249/9), Nowa Wieś — IV
//                      przetarg, posted 2026-07-09 (ONE DAY before this
//                      fixture was fetched), auction 2026-08-18 — CURRENTLY
//                      OPEN as of 2026-07-10, the freshest live fixture in
//                      this whole file. Per-parcel table price (all three
//                      91 020,00 zł).
//   KUCZKOW_ANN        4 działki (67/1, 67/4, 67/5, 67/6), Kuczków — II
//                      przetarg, DIFFERENT per-parcel price phrasing ("dla
//                      działki NR – KWOTA zł") than Nowa Wieś's bare table.
//   SOWIN_WYNIK        dz. 138/39, Sowin — I przetarg result: "nie wpłynęło
//                      żadne wadium ... zakończył się wynikiem negatywnym"
//                      — UNSOLD. Single-parcel TABLE-row result format.
//   ZAWIDOWICE_WYNIK   dz. 111, Zawidowice — I przetarg result: "nabywcą ww.
//                      działki za kwotę brutto 16.150,00 zł zostali:
//                      Agnieszka i Tomasz Pilarczyk" — SOLD (15 990 -> 16
//                      150 zł). Bare (non-table) single-parcel format.
//   LENARTOWICE_WYNIK  dz. 136/6, Lenartowice — I przetarg USTNY
//                      OGRANICZONY (restricted, not nieograniczony) result:
//                      SOLD (12 935 -> 13 065 zł, "netto" price phrasing —
//                      a third starting-price wording distinct from both
//                      Sowin's and Zawidowice's).
//   LEASE_PIASKI_OGLOSZENIE / WYKAZ_PIASKI_DZIERZAWA
//                      ul. Piaski 41, Pleszew — a grunt LEASE (dzierżawa),
//                      real board teasers, MUST be skipped despite the
//                      lease announcement using the exact same "ogłasza
//                      <round> przetarg ustny nieograniczony na ..." shape
//                      as a real sale (differing only in the object noun:
//                      "na wydzierżawienie" not "na sprzedaż" — this is the
//                      hard case the skip-gate must inspect the whole
//                      teaser, not just the "ogłasza" anchor, to catch).
//   WYKAZ_ZACHODNIA_GENUINE / WYKAZ_PIEKARZEWO_GENUINE
//                      genuine PRE-AUCTION sale wykazy (flat + land) —
//                      "wykazuje do sprzedaży w drodze przetargu ..." /
//                      "zamierza sprzedać działkę ...". The Piekarzewo one
//                      is the exact real fixture that caught a genuine
//                      SALE_VERB_RE bug while building this adapter (see
//                      parse.js's file header) — an earlier version of the
//                      pattern matched only the ż/z-ending noun forms
//                      ("sprzedaż"/"sprzedaży") and silently missed this
//                      ć-ending infinitive verb form ("sprzedać").
//   BOARD_HTML         a condensed-but-real excerpt of the live 2024 year
//                      board combining the Zachodnia I przetarg entry
//                      (h2 + prose + <hr/> + result link, verbatim) and the
//                      Piaski dzierżawa wykaz entry, to exercise
//                      parseYearBoard's entry-splitting + pdfLinks harvest.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  stripTags,
  parsePLN,
  parseArea,
  parseDateText,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  streetBuildingFromText,
  flatAptFromText,
  flatAreaFromText,
  parcelFromText,
  obrebFromText,
  miejscowoscFromText,
  plotAreaFromText,
  parcelsFromText,
  parcelPriceFromText,
  achievedPriceFromText,
  isUnsoldText,
  isSoldText,
  isSkippableEntryText,
  isSaleAnnouncementText,
  isGenuineSaleWykazText,
  isResultLabel,
  parseAnnouncementPage,
  parseYearBoard,
  wykazRecordFromEntry,
  parseResultDoc,
} from '../src/cities/pleszew/parse.js';

// --------------------------------------------------------------- real fixtures

const ZACHODNIA_II_ANN = `
                        BURMISTRZ MIASTA I GMINY PLESZEW
Ogłasza II przetarg ustny nieograniczony na sprzedaż ½ udziału w nieruchomości lokalowej nr 1 dla
której prowadzona jest księga wieczysta nr KZ1P/00016067/5, położonej przy ul. Zachodniej 1
w Pleszewie na działce oznaczonej nr 2841 o pow. 507 m2, księga wieczysta nieruchomości
gruntowej nr KZ1P/00006613/5.
Dział III i IV księgi wieczystej nieruchomości lokalowej przynależny do udziału Miasta i Gminy
Pleszew wolne od wpisów.
Lokal mieszkalny nr 1 położony jest na parterze budynku dwurodzinnego, o łącznej pow. użytkowej
69,10 m². Do lokalu przynależy garaż znajdujący się w budynku gospodarczym. Udział w gruncie
i częściach wspólnych nieruchomości wynosi 1/4.
Terminy poprzedniego przetargu 5 grudnia 2024 r.
Przetarg odbędzie się 26 lutego 2025 r. o godz. 1000 w Urzędzie Miasta i Gminy w Pleszewie,
pokój Nr 301 (poddasze), cena wywoławcza 122.260 zł.
Powyższa nieruchomość zwolniona jest z podatku VAT.
Uczestnicy przetargu zobowiązani są do wpłacenia wadium w wysokości 20% ceny wywoławczej tj.
24.452 zł wyłącznie przelewem, na konto Urzędu Miasta i Gminy Pleszew w Banku Spółdzielczym
w Pleszewie nr 26 8407 0003 0007 1000 2000 0374, w nieprzekraczalnym terminie do 21 lutego
2025 r.
Pleszew, dnia 20 stycznia 2025 r.
`;

const ZACHODNIA_I_WYNIK = `
                                                       Pleszew, dnia 5 grudnia 2024 r.

                                     INFORMACJA
o wyniku I przetargu ustnego nieograniczonego na sprzedaż ½ udziału w nieruchomości
lokalowej nr 1 położonej w Pleszewie przy ul. Zachodniej 1.

       Uprzejmie informuję, że przetarg ustny nieograniczony na sprzedaż ½ udziału w
nieruchomości lokalowej nr 1 dla której prowadzona jest księga wieczysta nr KZ1A/00016067/5,
położonej w Pleszewie przy ul. Zachodniej 1, będącej własnością Miasta i Gminy Pleszew,
wyznaczony na dzień 5 grudnia 2024 r. wyniku brak oferentów zakończył się wynikiem
negatywnym.
Wpłacone wadium - brak.
Do przetargu dopuszczono - brak.
`;

const KALISZ_ANN = `
                    BURMISTRZ MIASTA I GMINY PLESZEW
Ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej nr 4 dla której
prowadzona jest księga wieczysta nr KZ1A/00008268/0, położonej w Kaliszu przy ul.
Młynarska 13, na działce oznaczonej nr 13 o pow. 611 m2, księga wieczysta nieruchomości
gruntowej nr KZ1A/00008246/0. Dział III „Prawa, roszczenia i ograniczenia” i IV „Hipoteka”
księgi wieczystej nieruchomości lokalowej wolne od wpisów.
Lokal mieszkalny nr 4 położony jest na I piętrze budynku wielorodzinnego, w skład którego
wchodzą trzy pokoje, kuchnia, korytarz i łazienka o łącznej pow. użytkowej 77,50 m². Do
lokalu przynależy udział w gruncie i częściach wspólnych nieruchomości wynoszący 1/4.
Lokal wymaga remontu.
Przetarg odbędzie się 23 września 2024 r. o godz. 1000 w Urzędzie Miasta i Gminy
w Pleszewie, pokój Nr 301 (poddasze), cena wywoławcza 232.500,00 zł.
Powyższa nieruchomość zwolniona jest z podatku VAT.
Uczestnicy przetargu zobowiązani są do wpłacenia wadium w wysokości 20% ceny
wywoławczej tj. 46.500,00 zł wyłącznie przelewem, na konto Urzędu Miasta i Gminy Pleszew
w Banku Spółdzielczym w Pleszewie nr 26 8407 0003 0007 1000 2000 0374.
Pleszew, dnia 19 sierpnia 2024 r.
`;

const KALISZ_WYNIK_SOLD = `
                                                        Pleszew, dnia 11 grudnia 2024 r.

                                INFORMACJA
o wyniku II przetargu ustnego nieograniczonego na sprzedaż nieruchomości
lokalowej nr 4 położonej w Kaliszu przy ul. Młynarskiej 13.

      Uprzejmie informuję, że II przetarg ustny nieograniczony na sprzedaż nierucho-
mości lokalowej nr 4 dla której prowadzona jest księga wieczysta nr
KZ1A/00008268/0, położonej w Kaliszu przy ul. Młynarskiej 13, będącej własnością
Miasta i Gminy Pleszew, wyznaczony na dzień 3 grudnia 2024 r. zakończył się wyni-
kiem pozytywnym. Nabywcą za cenę 227 000 zł (słownie: dwieście dwadzieścia sie-
dem tysięcy złotych 00/100) została Pani Julita Szaleniec.
Liczba osób dopuszczonych do przetargu – dwie.
Liczba osób niedopuszczonych do przetargu – nie dotyczy.
`;

const NOWAWIES_R4_ANN = `
                          BURMISTRZ MIASTA I GMINY PLESZEW
 Ogłasza IV przetarg ustny nieograniczony na sprzedaż działek niezabudowanych położonych
 w Nowej Wsi, będących własnością Miasta i Gminy Pleszew.
 Przedmiotem sprzedaży jest:
Działka nr        Pow.               Nr KW                                 Opis działki
  249/7        0,0869 ha                               Teren niezabudowany, nieutwardzony, nieogrodzony
                                                       o kształcie wielokątnym.
  249/8        0,0860 ha                               Teren niezabudowany, nieutwardzony, nieogrodzony
                              KZ1P/00001713/1          o kształcie czworokątnym.
  249/9        0,0860 ha                               Teren niezabudowany, nieutwardzony, nieogrodzony
                                                       o kształcie czworokątnym, wydłużonym.
 Działy: III "prawa, roszczenia i ograniczenia" oraz IV "hipoteka" księgi wieczystej nr:
 KZ1P/00001713/1 - wolne od obciążeń.
 Przetarg odbędzie się w siedzibie Urzędu Miasta i Gminy w Pleszewie, Rynek 1 (w pokoju
 301; III p.), w dniu 18 sierpnia 2026r. (wtorek) o godz. 10/00 dla dz. nr 249/7;
                                                          10/30 dla dz. nr 249/8;
                                                          11/00 dla dz. nr 249/9.
 CENA WYWOŁAWCZA w wysokości brutto):
                                 Działka nr               cena
                                   249/7              91.020,00 zł
                                   249/8              91.020,00 zł
                                   249/9              91.020,00 zł
 (w tym należny podatek VAT 23%).
 Terminy poprzednich przetargów: 8 lipca 2025 r. (I przetarg); 15 września 2025 r. (II przetarg); 15
 kwietnia 2026 r. (III przetarg).
 Uczestnicy przetargu zobowiązani są do wpłacenia wadium w wysokości 20% ceny wywoławczej
 brutto tj.: 18.204,00 zł wyłącznie przelewem na konto Urzędu Miasta i Gminy Pleszew w Banku
 Spółdzielczym w Pleszewie nr 26 8407 0003 0007 1000 2000 0374.
Pleszew, dnia 9.07.2026 r.
`;

const KUCZKOW_ANN = `
                       BURMISTRZ MIASTA I GMINY PLESZEW
Ogłasza II przetarg ustny nieograniczony na sprzedaż działek niezabudowanych położonych
w Kuczkowie, będących własnością Miasta i Gminy Pleszew.

Przedmiotem sprzedaży są:
                     Działka nr                    Pow.                    Nr KW
                        67/1                    0,1103 ha
                        67/4                    0,1391 ha            KZ1P/00036091/8
                        67/5                    0,1517 ha
                        67/6                    0,1605 ha
Opis nieruchomości: Przedmiotowe działki położone są w Kuczkowie o kształcie nieregularnym,
wydłużonym. Teren niezabudowany, nieutwardzony i niezagospodarowany.
Działy: III "prawa, roszczenia i ograniczenia" oraz IV "hipoteka" księgi wieczystej nr:
KZ1P/00036091/8 - wolne od obciążeń.
Przetarg odbędzie się w siedzibie Urzędu Miasta i Gminy w Pleszewie, Rynek 1 (w pokoju
301; III p.), w dniu 12 lipca 2024 r. (piątek) o godz.: 10/00 – dla działki 67/1; 10/30 dla działki
67/4, 11/00 dla działki 67/5 i 11/30 dla działki 67/6.
                                CENA WYWOŁAWCZA brutto:
     dla działki 67/1 – 67.834,50 zł brutto (w tym należny podatek VAT 23% tj. 12.684,50 zł)
     dla działki 67/4 – 85.546,50 zł brutto (w tym należny podatek VAT 23% tj. 15.996,50 zł)
     dla działki 67/5 – 93.295,50 zł brutto (w tym należny podatek VAT 23% tj. 17.445,50 zł)
     dla działki 67/6 – 98.707,50 zł brutto (w tym należny podatek VAT 23% tj. 18.457,50 zł).
Uczestnicy przetargu zobowiązani są do wpłacenia wadium w wysokości 20% ceny
wywoławczej brutto tj.: 13.566,90 zł dla działki nr 67/1; 17.109,30 zł dla działki nr 67/4.
Pleszew, dnia 28 maja 2024 r.
`;

const SOWIN_WYNIK = `
                                  INFORMACJA

       Zgodnie z zarządzeniem Burmistrza Miasta i Gminy Pleszew na dzień
19 grudnia 2024 r. w Urzędzie Miasta i Gminy w Pleszewie (pok. 301 – III piętro),
ustalono termin I przetargu ustnego nieograniczonego, na sprzedaż działki
niezabudowanej położonej w Sowinie, oznaczonej ewidencyjnie nr:
     Nr            Pow.               Nr KW                 Cena wywoławcza
  działki                                                        brutto
  138/39        0,1014 ha         KZ1P/00017410/2             63.960,00 zł
W wyznaczonym terminie nie wpłynęło żadne wadium.
Liczba osób zakwalifikowanych do przetargu – nie dotyczy.
Liczba osób niedopuszczonych do przetargu – nie dotyczy.
Osoby, które nie przystąpiły do przetargu – nie dotyczy.
       W związku z brakiem wpłaty wadium I przetarg ustny nieograniczony,
zakończył się wynikiem negatywnym.

Sporządziła dnia: 19.12.2024 r.
`;

const ZAWIDOWICE_WYNIK = `
                        INFORMACJA

    Zgodnie z zarządzeniem Burmistrza Miasta i Gminy Pleszew
na dzień 23 stycznia 2024 r. w Urzędzie Miasta i Gminy w Pleszewie
(pok. 301 – III piętro), ustalono termin I przetargu ustnego
nieograniczonego, na sprzedaż działki niezabudowanej położonej
w Zawidowicach oznaczonej ewidencyjnie nr 111 o pow. 0,1300 ha;
zapisanej w księdze wieczystej nr KZ1P/00040616/6.
Cenę wywoławczą do I przetargu ustnego nieograniczonego ustalono
w wysokości netto 15.990,00 zł brutto
(słownie: piętnaście tysięcy dziewięćset dziewięćdziesiąt złotych
00/100).
W wyznaczonym terminie wpłynęło jedno wadium.
Liczba osób dopuszczonych do przetargu – 1.
Liczba osób niedopuszczonych do przetargu – 0.
W wyniku I przetargu ustnego nieograniczonego nabywcą ww. działki
za kwotę brutto 16.150,00 zł zostali: Agnieszka i Tomasz Pilarczyk.
`;

const LENARTOWICE_WYNIK = `
                        INFORMACJA

    Zgodnie z zarządzeniem Burmistrza Miasta i Gminy Pleszew
na dzień 23 stycznia 2024 r. w Urzędzie Miasta i Gminy w Pleszewie
(pok. 301 – III piętro), ustalono termin I przetargu ustnego
ograniczonego, na sprzedaż działki niezabudowanej położonej
w Lenartowicach oznaczonej ewidencyjnie nr 136/6 o pow. 0,0199 ha;
zapisanej w księdze wieczystej nr KZ1P/00018154/6.
Cenę wywoławczą do I przetargu ustnego ograniczonego ustalono
w wysokości netto 12.935,00 zł netto
(słownie: dwanaście tysięcy dziewięćset trzydzieści pięć złotych
00/100).
W wyznaczonym terminie wpłynęło jedno wadium.
Liczba osób dopuszczonych do przetargu – 1.
Liczba osób niedopuszczonych do przetargu – 1.
W wyniku I przetargu ustnego ograniczonego nabywcą ww. działki za
kwotę netto 13.065,00 zł zostali: Emilia i Ryszard Kujawscy.
`;

// Real board teasers (inline HTML prose, stripped) — copied verbatim from
// the live 2024/2025/2026 year-board pages. The lease cases are the hard
// ones: both use the exact "ogłasza <round> przetarg ustny nieograniczony
// na ..." shape a real sale announcement uses.
const LEASE_PIASKI_OGLOSZENIE =
  'Burmistrz Miasta i Gminy Pleszew ogłasza przetarg ustny nieograniczony na wydzierżawienie ' +
  'gruntu pod działalność gospodarczą o pow. 54 m2 (w tym 24 m2 pod ustawienie obiektu ' +
  'handlowego nie związanego z gruntem) na okres 3 lat położonego w Pleszewie przy ul. Piaski ' +
  '41, stanowiącego część działki nr 2177/1, ark. m. 27, KW KZ1P/00012012/7.';

const WYKAZ_PIASKI_DZIERZAWA =
  'Burmistrz Miasta i Gminy Pleszew zamierza wydzierżawić grunt z przeznaczeniem na ' +
  'działalność gospodarczą położony w Pleszewie przy ul. Piaski 41 na okres 3 lat. Grunt o pow. ' +
  '54 m2 (w tym 24 m2 pod ustawienie obiektu handlowego nie związanego z gruntem) stanowi ' +
  'część działki nr 2177/1, ark. m. 27, KW KZ1P/00012012/7';

const WYKAZ_ZACHODNIA_GENUINE =
  'Burmistrz Miasta i Gminy Pleszew zgodnie z art. 35 ust. 1 ustawy z dnia 21 sierpnia 1997 r. ' +
  'o gospodarce nieruchomościami (Dz. U. z 2024 r., poz. 1145 tj.) wykazuje do sprzedaży w ' +
  'drodze przetargu 1/2 udziału w nieruchomości lokalowej nr 1 dla której prowadzona jest ' +
  'księga wieczysta nr KZ1P/00016067/5, położonej przy ul. Zachodniej 1 w Pleszewie na działce ' +
  'oznaczonej nr 2841 o pow. 507 m2, księga wieczysta nieruchomości gruntowej nr ' +
  'KZ1P/00006613/5.';

// The exact real fixture that caught a genuine SALE_VERB_RE bug (see
// parse.js file header): "zamierza SPRZEDAĆ" (infinitive verb, ć-ending) —
// an earlier pattern only matched the ż/z-ending noun forms and silently
// missed this, the DOMINANT phrasing on genuine sale wykazy.
const WYKAZ_PIEKARZEWO_GENUINE =
  'Burmistrz Miasta i Gminy Pleszew zamierza sprzedać działkę nr 117 o pow. 0,2275 ha, ' +
  'zapisaną w KW nr KZ1P/00022904/0 w miejscowości Piekarzewie';

// Condensed-but-real excerpt of the live 2024 year-board HTML: the
// Zachodnia I przetarg entry (h2 + prose + <hr/> + result link — verbatim,
// including the real trailing content-footer boundary) followed by the
// Piaski dzierżawa wykaz entry.
const BOARD_HTML = `
<div class="text-wrapper">
<h1>Ogłoszenia 2024</h1>
<h2>Ogłoszenie Burmistrza Miasta i Gminy Pleszew z dnia 31.10.2024 r.</h2>
<p class="justifyfull">Burmistrz Miasta i Gminy Pleszew ogłasza I przetarg ustny nieograniczony na sprzedaż 1/2 udziału w nieruchomości lokalowej nr 1 dla której prowadzona jest księga wieczysta nr KZ1P/00016067/5, położonej przy ul. Zachodniej 1 w Pleszewie na działce oznaczonej nr 2841 o pow. 507 m2, księga wieczysta nieruchomości gruntowej nr KZ1P/00006613/5.</p>
<p class="justifyfull"><a title="Kliknięcie otwiera w nowym oknie plik w formacie pdf" href="zasoby/files/nieruchomosci/2024/gp-ogl-31102024-1.pdf">Pobierz dokument - format pdf</a></p>
<hr />
<p class="justifyfull"><a title="Kliknięcie otwiera w nowym oknie plik w formacie pdf" href="zasoby/files/nieruchomosci/2024/gp-inf-10122024-1.pdf" target="_blank">Informacja o wyniku przetargu - format pdf</a></p>
<div class="content-footer">
  <strong>Osoba odpowiedzialna za:</strong>
  <ul>
<li>wprowadzenie informacji do podstrony BIP: Michał Stempniewicz (2024-10-31 12:17:42)</li>
</ul>
<style>.print-button { float: right; }</style><div class="print-button">
<a href="wydruk.html?id=15373" target="_blank"><img src="media/images/print16x16.png" alt="Wydrukuj dokument"></a>
</div>
</div>
<h2>Wykaz z dnia 05.12.2024</h2>
<p class="justifyfull">Burmistrz Miasta i Gminy Pleszew zamierza wydzierżawić grunt z przeznaczeniem na działalność gospodarczą położony w Pleszewie przy ul. Piaski 41 na okres 3 lat. Grunt o pow. 54 m<sup>2</sup> (w tym 24 m<sup>2</sup> pod ustawienie obiektu handlowego nie związanego z gruntem) stanowi część działki nr 2177/1, ark. m. 27, KW KZ1P/00012012/7</p>
<p><a title="Kliknięcie otwiera w nowym oknie plik w formacie pdf" href="zasoby/files/nieruchomosci/2024/os-wkz-05122024.pdf" target="_blank">Pobierz dokument - format pdf</a></p>
<div class="content-footer">
  <strong>Osoba odpowiedzialna za:</strong>
  <ul>
<li>wprowadzenie informacji do podstrony BIP: Michał Grobelny (2024-12-05 13:59:31)</li>
</ul>
</div>
</div>
`;

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands (no decimal), dot-thousands+comma-decimal, space-thousands', () => {
  assert.equal(parsePLN('122.260'), 122260); // Zachodnia cena wywoławcza
  assert.equal(parsePLN('91.020,00'), 91020); // Nowa Wieś table price
  assert.equal(parsePLN('227 000'), 227000); // Kalisz achieved price (space-thousands, no decimal)
  assert.equal(parsePLN('82.270,60'), 82270); // Kowalewo achieved (grosze truncated)
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(''), null);
});

test('parseArea: comma-decimal m2/ha values', () => {
  assert.equal(parseArea('69,10'), 69.1);
  assert.equal(parseArea('0,1014'), 0.1014);
  assert.equal(parseArea(''), null);
});

test('parseDateText: numeric and spelled-out', () => {
  assert.equal(parseDateText('26 lutego 2025'), '2025-02-26');
  assert.equal(parseDateText('05.12.2024'), '2024-12-05');
  assert.equal(parseDateText('garbage'), null);
});

test('roundFromText: "Ogłasza <ROMAN> przetarg" anchor (case-insensitive O, case-sensitive numeral)', () => {
  assert.equal(roundFromText(ZACHODNIA_II_ANN), 2);
  assert.equal(roundFromText(KALISZ_ANN), 1);
  assert.equal(roundFromText(NOWAWIES_R4_ANN), 4);
  assert.equal(roundFromText(KUCZKOW_ANN), 2);
  // Lower-case Polish "i" (the conjunction "and") must never false-match.
  assert.equal(roundFromText('kuchnia i łazienka, ogłasza się coś tutaj'), null);
});

test('roundFromText: result-doc fallbacks ("o wyniku <ROMAN>", "ustalono termin <ROMAN>")', () => {
  assert.equal(roundFromText(ZACHODNIA_I_WYNIK), 1);
  assert.equal(roundFromText(KALISZ_WYNIK_SOLD), 2);
  assert.equal(roundFromText(SOWIN_WYNIK), 1);
  assert.equal(roundFromText(LENARTOWICE_WYNIK), 1);
});

test('auctionDateFromText: inline ("Przetarg odbędzie się <date> r.") and location-clause-intervening forms', () => {
  assert.equal(auctionDateFromText(ZACHODNIA_II_ANN), '2025-02-26');
  assert.equal(auctionDateFromText(KALISZ_ANN), '2024-09-23');
  // Nowa Wieś / Kuczków: "Przetarg odbędzie się w siedzibie Urzędu ... w dniu <date>"
  assert.equal(auctionDateFromText(NOWAWIES_R4_ANN), '2026-08-18');
  assert.equal(auctionDateFromText(KUCZKOW_ANN), '2024-07-12');
});

test('startingPriceFromText: inline "cena wywoławcza X zł" and result-doc "ustalono w wysokości X zł"', () => {
  assert.equal(startingPriceFromText(ZACHODNIA_II_ANN), 122260);
  assert.equal(startingPriceFromText(KALISZ_ANN), 232500);
  assert.equal(startingPriceFromText(ZAWIDOWICE_WYNIK), 15990);
  assert.equal(startingPriceFromText(LENARTOWICE_WYNIK), 12935);
  // Sowin's price sits in a TABLE ("Cena wywoławcza" column header far from
  // the value, with the parcel/area/KW columns in between) — NOT this
  // generic single-price helper's job; parseResultDoc reaches it via
  // parcelPriceFromText/parcelsFromText instead (see those tests below,
  // and the "parseResultDoc: Sowin" integration test).
  assert.equal(startingPriceFromText(SOWIN_WYNIK), null);
});

test('streetBuildingFromText: same Kalisz street in two grammatical cases across two real documents', () => {
  assert.deepEqual(streetBuildingFromText(ZACHODNIA_II_ANN), { street: 'Zachodniej', building: '1' });
  // Announcement: nominative "Młynarska". Result doc: genitive "Młynarskiej"
  // (see parse.js's documented source-inconsistency note) — both captured
  // as-stated, never force-normalized.
  assert.deepEqual(streetBuildingFromText(KALISZ_ANN), { street: 'Młynarska', building: '13' });
  assert.deepEqual(streetBuildingFromText(KALISZ_WYNIK_SOLD), { street: 'Młynarskiej', building: '13' });
});

test('flatAptFromText: genitive "lokalowej nr N" form', () => {
  assert.equal(flatAptFromText(ZACHODNIA_II_ANN), '1');
  assert.equal(flatAptFromText(KALISZ_ANN), '4');
});

test('flatAptFromText: real bug #1 — accusative "lokalową nr N" (Kalisz wykaz phrasing)', () => {
  const accusative = 'Burmistrz Miasta i Gminy Pleszew wykazuje do sprzedaży w drodze przetargu, nieruchomość lokalową nr 4 dla której prowadzona jest księga wieczysta nr KZ1A/00008268/0';
  assert.equal(flatAptFromText(accusative), '4');
});

test('flatAreaFromText: "o łącznej pow. użytkowej XX,XX m2"', () => {
  assert.equal(flatAreaFromText(ZACHODNIA_II_ANN), 69.1);
  assert.equal(flatAreaFromText(KALISZ_ANN), 77.5);
});

test('parcelFromText: bare inline "nr N" (Zawidowice/Lenartowice — no table) and real bug #1 (accusative "działkę nr N")', () => {
  assert.equal(parcelFromText(ZAWIDOWICE_WYNIK), '111');
  assert.equal(parcelFromText(LENARTOWICE_WYNIK), '136/6');
  assert.equal(parcelFromText(WYKAZ_PIEKARZEWO_GENUINE), '117'); // "zamierza sprzedać działkę nr 117" — accusative
});

test('obrebFromText / miejscowoscFromText: locality extraction, incl. real bug #2 (no lower-case leak into 2nd word)', () => {
  assert.equal(miejscowoscFromText(NOWAWIES_R4_ANN), 'Nowej Wsi'); // two-word locality via "w miejscowości"
  assert.equal(miejscowoscFromText(SOWIN_WYNIK), 'Sowinie');
  // "położonej w Zawidowicach oznaczonej ..." — must capture ONLY "Zawidowicach",
  // not "Zawidowicach oznaczonej" (the real bug #2 regression).
  assert.equal(miejscowoscFromText(ZAWIDOWICE_WYNIK), 'Zawidowicach');
  assert.equal(miejscowoscFromText(KALISZ_ANN), 'Kaliszu'); // "położonej w Kaliszu przy ul." — must not swallow "przy"
});

test('plotAreaFromText: "o pow. X,XXXX ha" -> m2 (bare inline single-parcel notices only)', () => {
  assert.equal(plotAreaFromText(ZAWIDOWICE_WYNIK), 1300);
  assert.equal(plotAreaFromText(LENARTOWICE_WYNIK), 199);
  // Sowin's area lives in the SAME table as its price (no bare "o pow. X ha"
  // sentence at all) — reached via parcelsFromText instead (see below).
  assert.equal(plotAreaFromText(SOWIN_WYNIK), null);
});

test('parcelsFromText: multi-parcel table rows, Kuczków and Nowa Wieś shapes', () => {
  assert.deepEqual(parcelsFromText(KUCZKOW_ANN), [
    { dzialka_nr: '67/1', area_m2: 1103 },
    { dzialka_nr: '67/4', area_m2: 1391 },
    { dzialka_nr: '67/5', area_m2: 1517 },
    { dzialka_nr: '67/6', area_m2: 1605 },
  ]);
  assert.deepEqual(parcelsFromText(NOWAWIES_R4_ANN), [
    { dzialka_nr: '249/7', area_m2: 869 },
    { dzialka_nr: '249/8', area_m2: 860 },
    { dzialka_nr: '249/9', area_m2: 860 },
  ]);
  // single-parcel table-row result doc (Sowin) also matches this shape
  assert.deepEqual(parcelsFromText(SOWIN_WYNIK), [{ dzialka_nr: '138/39', area_m2: 1014 }]);
});

test('parcelPriceFromText: "dla działki NR – KWOTA zł" (Kuczków) — a real false-match was caught here', () => {
  assert.equal(parcelPriceFromText(KUCZKOW_ANN, '67/1'), 67834);
  assert.equal(parcelPriceFromText(KUCZKOW_ANN, '67/4'), 85546);
  // 67/5 and 67/6 are mentioned EARLIER in the "godz. ... dla działki 67/5 i
  // 11/30 dla działki 67/6" time-schedule sentence, right before the real
  // price table — an unanchored version of this function matched THAT
  // mid-sentence mention and returned the WRONG (67/1's) price for both.
  assert.equal(parcelPriceFromText(KUCZKOW_ANN, '67/5'), 93295);
  assert.equal(parcelPriceFromText(KUCZKOW_ANN, '67/6'), 98707);
});

test('parcelPriceFromText: bare table row (Nowa Wieś), line-anchored so a mid-sentence mention never wins', () => {
  assert.equal(parcelPriceFromText(NOWAWIES_R4_ANN, '249/7'), 91020);
  assert.equal(parcelPriceFromText(NOWAWIES_R4_ANN, '249/8'), 91020);
  assert.equal(parcelPriceFromText(NOWAWIES_R4_ANN, '249/9'), 91020);
});

test('parcelPriceFromText: a KW-code trailing digit must never be mistaken for the start of the price (Sowin)', () => {
  // "138/39 ... KZ1P/00017410/2             63.960,00 zł" — the "2" ending
  // the KW number sits right before the real price; without the
  // whitespace-anchored capture this returned 263960 (the stray "2" glued
  // onto the front of the real amount).
  assert.equal(parcelPriceFromText(SOWIN_WYNIK, '138/39'), 63960);
});

test('achievedPriceFromText: "Nabywcą za cenę X zł ... została" (flat) and "nabywcą ... za kwotę brutto X zł zostali" (land, plural)', () => {
  assert.equal(achievedPriceFromText(KALISZ_WYNIK_SOLD), 227000);
  assert.equal(achievedPriceFromText(ZAWIDOWICE_WYNIK), 16150);
  assert.equal(achievedPriceFromText(LENARTOWICE_WYNIK), 13065);
  assert.equal(achievedPriceFromText(ZACHODNIA_I_WYNIK), null); // unsold — no buyer
});

test('isUnsoldText / isSoldText', () => {
  assert.equal(isUnsoldText(ZACHODNIA_I_WYNIK), true);
  assert.equal(isUnsoldText(SOWIN_WYNIK), true);
  assert.equal(isSoldText(KALISZ_WYNIK_SOLD), true);
  assert.equal(isSoldText(ZAWIDOWICE_WYNIK), true);
  assert.equal(isSoldText(ZACHODNIA_I_WYNIK), false);
  assert.equal(isUnsoldText(KALISZ_WYNIK_SOLD), false);
});

// ------------------------------------------------------- board-entry classification

test('isSkippableEntryText: real lease cases (both the wykaz AND the harder "ogłasza ... na wydzierżawienie" announcement shape)', () => {
  assert.equal(isSkippableEntryText(WYKAZ_PIASKI_DZIERZAWA), true);
  assert.equal(isSkippableEntryText(LEASE_PIASKI_OGLOSZENIE), true);
});

test('isSaleAnnouncementText: real sale teasers -> true; the lease-shaped "ogłasza ... przetarg" teaser -> false', () => {
  const zachodniaTeaser =
    'Burmistrz Miasta i Gminy Pleszew ogłasza I przetarg ustny nieograniczony na sprzedaż 1/2 ' +
    'udziału w nieruchomości lokalowej nr 1 dla której prowadzona jest księga wieczysta nr ' +
    'KZ1P/00016067/5, położonej przy ul. Zachodniej 1 w Pleszewie.';
  assert.equal(isSaleAnnouncementText(zachodniaTeaser), true);
  const nowawiesTeaser =
    'Burmistrz Miasta i Gminy Pleszew ogłasza IV przetarg ustny nieograniczony na sprzedaż ' +
    'działek niezabudowanych, położonych w miejscowości Nowa Wieś, będących własnością ' +
    'Miasta i Gminy Pleszew, zapisanych w KW nr KZ1P/00001713/1, oznaczonych ewidencyjnie nr: ' +
    '249/7, 249/8 i 249/9';
  assert.equal(isSaleAnnouncementText(nowawiesTeaser), true);
  // The hard case: same "ogłasza <round> przetarg ustny nieograniczony na"
  // shape, but the object is "wydzierżawienie" (lease), not "sprzedaż".
  assert.equal(isSaleAnnouncementText(LEASE_PIASKI_OGLOSZENIE), false);
});

test('isGenuineSaleWykazText: real genuine-sale wykazy -> true (incl. the accusative-verb bug catcher); lease wykaz -> false', () => {
  assert.equal(isGenuineSaleWykazText(WYKAZ_ZACHODNIA_GENUINE), true);
  assert.equal(isGenuineSaleWykazText(WYKAZ_PIEKARZEWO_GENUINE), true);
  assert.equal(isGenuineSaleWykazText(WYKAZ_PIASKI_DZIERZAWA), false);
  // bezprzetargowo sale — real 2025 fixture — out of scope despite the sale verb.
  const bezprzetargowo =
    'Burmistrz Miasta i Gminy Pleszew zamierza sprzedać w trybie bezprzetargowym lokal ' +
    'mieszkalny nr 2, położony w budynku przy ul. Dworcowej 20';
  assert.equal(isGenuineSaleWykazText(bezprzetargowo), false);
  // capital-contribution ("aport") — real 2024 fixture — never a sale.
  const aport =
    'Burmistrz Miasta i Gminy Pleszew zamierza wnieść aport rzeczowy do majątku Spółki ' +
    'Społeczna Inicjatywa Mieszkaniowa "KZN - Wielkopolska" Sp.';
  assert.equal(isGenuineSaleWykazText(aport), false);
});

test('isResultLabel: distinguishes the two real anchor labels', () => {
  assert.equal(isResultLabel('Informacja o wyniku przetargu - format pdf'), true);
  assert.equal(isResultLabel('Pobierz dokument - format pdf'), false);
});

// ----------------------------------------------------------- parseAnnouncementPage

test('parseAnnouncementPage: Zachodnia II przetarg — pending flat (1/2 udział)', () => {
  const [r] = parseAnnouncementPage(ZACHODNIA_II_ANN, 'https://bip.pleszew.pl/x/zachodnia-ii-1.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'zachodniej|1|1');
  assert.equal(r.area_m2, 69.1);
  assert.equal(r.starting_price_pln, 122260);
  assert.equal(r.auction_date, '2025-02-26');
  assert.equal(r.round, 2);
  assert.equal(r.detail_url, 'https://bip.pleszew.pl/x/zachodnia-ii-1.pdf');
});

test('parseAnnouncementPage: Kalisz — a Pleszew-owned flat physically in Kalisz', () => {
  const [r] = parseAnnouncementPage(KALISZ_ANN, 'https://bip.pleszew.pl/x/kalisz.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'mlynarska|13|4');
  assert.equal(r.area_m2, 77.5);
  assert.equal(r.starting_price_pln, 232500);
  assert.equal(r.auction_date, '2024-09-23');
  assert.equal(r.round, 1);
});

test('parseAnnouncementPage: Nowa Wieś IV przetarg — CURRENTLY PENDING land, 3 parcels, per-parcel table price', () => {
  const recs = parseAnnouncementPage(NOWAWIES_R4_ANN, 'https://bip.pleszew.pl/x/nowawies-r4.pdf');
  assert.equal(recs.length, 3);
  assert.deepEqual(recs.map((r) => r.dzialka_nr), ['249/7', '249/8', '249/9']);
  assert.deepEqual(recs.map((r) => r.area_m2), [869, 860, 860]);
  for (const r of recs) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.starting_price_pln, 91020);
    assert.equal(r.auction_date, '2026-08-18');
    assert.equal(r.round, 4);
    assert.equal(r.obreb, 'Nowej Wsi');
    assert.equal(r.address, null); // land is parcel-keyed, not address-keyed
  }
});

test('parseAnnouncementPage: Kuczków II przetarg — 4 parcels, DIFFERENT per-parcel prices each', () => {
  const recs = parseAnnouncementPage(KUCZKOW_ANN, 'https://bip.pleszew.pl/x/kuczkow.pdf');
  assert.equal(recs.length, 4);
  assert.deepEqual(
    recs.map((r) => [r.dzialka_nr, r.area_m2, r.starting_price_pln]),
    [
      ['67/1', 1103, 67834],
      ['67/4', 1391, 85546],
      ['67/5', 1517, 93295],
      ['67/6', 1605, 98707],
    ],
  );
  for (const r of recs) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.auction_date, '2024-07-12');
    assert.equal(r.round, 2);
    assert.equal(r.obreb, 'Kuczkowie');
  }
});

test('parseAnnouncementPage: empty/unparseable input -> []', () => {
  assert.deepEqual(parseAnnouncementPage('', 'x'), []);
  assert.deepEqual(parseAnnouncementPage('losowy tekst bez tresci przetargowej', 'x'), []);
});

// ----------------------------------------------------------------- board + wykaz

test('parseYearBoard: splits the real condensed 2024 excerpt into 2 entries with correct pdfLinks', () => {
  const entries = parseYearBoard(BOARD_HTML, 'https://bip.pleszew.pl/pleszewm/');
  assert.equal(entries.length, 2);

  const [zachodnia, wykaz] = entries;
  assert.equal(zachodnia.title, 'Ogłoszenie Burmistrza Miasta i Gminy Pleszew z dnia 31.10.2024 r.');
  assert.match(zachodnia.bodyText, /ogłasza I przetarg ustny nieograniczony na sprzedaż/);
  assert.equal(zachodnia.pdfLinks.length, 2);
  assert.equal(zachodnia.pdfLinks[0].url, 'https://bip.pleszew.pl/pleszewm/zasoby/files/nieruchomosci/2024/gp-ogl-31102024-1.pdf');
  assert.equal(zachodnia.pdfLinks[0].label, 'Pobierz dokument - format pdf');
  assert.equal(zachodnia.pdfLinks[1].url, 'https://bip.pleszew.pl/pleszewm/zasoby/files/nieruchomosci/2024/gp-inf-10122024-1.pdf');
  assert.equal(zachodnia.pdfLinks[1].label, 'Informacja o wyniku przetargu - format pdf');
  // the boilerplate content-footer (person names/timestamps) must NOT leak into bodyText
  assert.doesNotMatch(zachodnia.bodyText, /Stempniewicz/);

  assert.equal(wykaz.title, 'Wykaz z dnia 05.12.2024');
  assert.match(wykaz.bodyText, /zamierza wydzierżawić grunt/);
  assert.equal(wykaz.pdfLinks.length, 1);
  assert.equal(wykaz.pdfLinks[0].url, 'https://bip.pleszew.pl/pleszewm/zasoby/files/nieruchomosci/2024/os-wkz-05122024.pdf');
});

test('parseYearBoard: a "Pobierz dokument" link label must never leak into the prose bodyText (real bug caught live)', () => {
  // Reproduces the exact shape that broke miejscowoscFromText on the live
  // site: a locality name as the LAST word of the prose, immediately
  // followed by the "Pobierz dokument - format pdf" link paragraph. Without
  // stripping the anchor's own text before building bodyText, stripTags's
  // whitespace-collapse joined them into "Piekarzewie Pobierz".
  const html = `
<h2>Wykaz z dnia 07.07.2026</h2>
<p>Burmistrz Miasta i Gminy Pleszew zamierza sprzedać działkę nr 117 o pow. 0,2275 ha, zapisaną w KW nr KZ1P/00022904/0 w miejscowości Piekarzewie</p>
<p><a title="Kliknięcie otwiera w nowym oknie plik w formacie pdf" href="zasoby/files/nieruchomosci/2026/gp-wkz-07072026.pdf">Pobierz dokument - format pdf</a></p>
<p> </p>
`;
  const [entry] = parseYearBoard(html, 'https://bip.pleszew.pl/pleszewm/');
  assert.equal(miejscowoscFromText(entry.bodyText), 'Piekarzewie');
  assert.doesNotMatch(entry.bodyText, /Pobierz/);
});

test('wykazRecordFromEntry: genuine sale wykaz -> flat record (Zachodnia) and land record (Piekarzewo)', () => {
  const flat = wykazRecordFromEntry(WYKAZ_ZACHODNIA_GENUINE, 'https://bip.pleszew.pl/x/zach-wkz.pdf');
  assert.equal(flat.kind, 'mieszkalny');
  assert.equal(flat.address.key, 'zachodniej|1|1');
  assert.equal(flat.detail_url, 'https://bip.pleszew.pl/x/zach-wkz.pdf');

  const land = wykazRecordFromEntry(WYKAZ_PIEKARZEWO_GENUINE, 'https://bip.pleszew.pl/x/piek-wkz.pdf');
  assert.equal(land.kind, 'grunt');
  assert.equal(land.dzialka_nr, '117');
  assert.equal(land.area_m2, 2275);
  assert.equal(land.address_raw, 'Piekarzewie');
});

// ------------------------------------------------------------- parseResultDoc

test('parseResultDoc: Zachodnia I przetarg — UNSOLD flat (brak oferentów)', () => {
  const [r] = parseResultDoc(ZACHODNIA_I_WYNIK, null, 'https://bip.pleszew.pl/x/zachodnia-i-wynik.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'zachodniej|1|1');
  assert.equal(r.round, 1);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.auction_date, '2024-12-05');
});

test('parseResultDoc: Kalisz II przetarg — SOLD flat (227 000 zł to Julita Szaleniec)', () => {
  const [r] = parseResultDoc(KALISZ_WYNIK_SOLD, null, 'https://bip.pleszew.pl/x/kalisz-wynik.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'mlynarskiej|13|4');
  assert.equal(r.round, 2);
  assert.equal(r.final_price_pln, 227000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2024-12-03');
});

test('parseResultDoc: Sowin — UNSOLD land (brak wpłaty wadium), table-row format', () => {
  const [r] = parseResultDoc(SOWIN_WYNIK, null, 'https://bip.pleszew.pl/x/sowin-wynik.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '138/39');
  assert.equal(r.area_m2, 1014);
  assert.equal(r.starting_price_pln, 63960);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2024-12-19');
});

test('parseResultDoc: Zawidowice — SOLD land (15 990 -> 16 150 zł), bare inline format', () => {
  const [r] = parseResultDoc(ZAWIDOWICE_WYNIK, null, 'https://bip.pleszew.pl/x/zawidowice-wynik.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '111');
  assert.equal(r.area_m2, 1300);
  assert.equal(r.starting_price_pln, 15990);
  assert.equal(r.final_price_pln, 16150);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2024-01-23');
});

test('parseResultDoc: Lenartowice — SOLD land via ustny OGRANICZONY (restricted), netto price phrasing', () => {
  const [r] = parseResultDoc(LENARTOWICE_WYNIK, null, 'https://bip.pleszew.pl/x/lenartowice-wynik.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '136/6');
  assert.equal(r.area_m2, 199);
  assert.equal(r.starting_price_pln, 12935);
  assert.equal(r.final_price_pln, 13065);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2024-01-23');
});

test('parseResultDoc: a pure FUTURE-tense announcement must never be misclassified as a result', () => {
  assert.deepEqual(parseResultDoc(ZACHODNIA_II_ANN, null, 'x'), []);
  assert.deepEqual(parseResultDoc(KALISZ_ANN, null, 'x'), []);
  assert.deepEqual(parseResultDoc(NOWAWIES_R4_ANN, null, 'x'), []);
});

test('parseResultDoc: non-result / empty text -> []', () => {
  assert.deepEqual(parseResultDoc('Losowy tekst bez związku z przetargiem.', null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
