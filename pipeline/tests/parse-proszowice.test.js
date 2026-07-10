// Proszowice parser tests. Fixtures are REAL flattened article text, fetched
// live from proszowice.pl 2026-07-10 (board: aktualnosci-25-nieruchomosci_gminne.html
// + ?page=N; articles: aktualnosc-NNNN-*.html), captured via the actual
// core/finn-bip.js htmlToText() extractor (not paraphrased) — same
// groundtruthing standard as tests/parse-naklo-nad-notecia.test.js.
//
//   10833  ul. Królewska 72/4  — flat ANNOUNCEMENT, I przetarg, 43,34 m²,
//          280 000 zł, przetarg 18.06.2026.
//   10934  ul. Królewska 72/4  — flat RESULT, SAME property/round as 10833:
//          "wynikiem pozytywnym", nabywca Pani Urszula Korfel. No distinct
//          achieved-price sentence in this (2026, table-based) template — the
//          sale concluded at cena wywoławcza, so final_price_pln falls back to
//          starting_price_pln (with a note). This exact live body is also what
//          exposed a REAL bug in core/finn-bip.js's generic priceFromText: its
//          {0,140} gap + whitespace-permissive capture bridges across the
//          table's KW number "...KR1H/00009288/2" straight into the price cell,
//          returning 2280000 instead of 280000 (confirmed empirically). Fixed
//          locally via startingPriceFromText()'s (?<!\/) guard — see parse.js.
//   8766   ul. Królewska 70/53 — flat ANNOUNCEMENT, OLDER template (no round
//          ordinal anywhere — round defaults to 1), 34,05 m², 210 000 zł,
//          przetarg 28.06.2024.
//   8924   ul. Królewska 70/53 — flat RESULT, SAME property/round as 8766:
//          "Cena ustalona w przetargu 212 100,00 złotych" (higher than the
//          210 000 zł cena wywoławcza — a real postąpienie), "Osoba
//          ustalona jako nabywca w przetargu Pan Naleźnik Przemysław" (older
//          template's buyer phrasing, distinct from 10934's "Nabywcą ...
//          została"). Confirms the result stream carries a genuine
//          higher-than-asking achieved price + named buyer.
//   9555   dz. 2274/2, Proszowice — LAND (niezabudowana) ANNOUNCEMENT, VI
//          przetarg (szóstym, spelled out — not a Roman numeral; finn-bip's
//          shared roundFromTitle only resolves pierwszy..piąty + Roman
//          numerals and would undercount this to 1), 1566 m² (0,1566 ha),
//          123 200 zł, przetarg 28.03.2025. Body opens in a letter-spaced
//          ALL-CAPS style ("O G Ł A S Z A SZóSTY ...") from an older template —
//          round is still resolved correctly because the TITLE alone already
//          states "szóstym".
//   9635   dz. 2274/2, Proszowice — LAND RESULT, SAME parcel/round as 9555:
//          "Nikt nie wpłacił wadium" → unsold, no achieved price.
//   11006  dz. 18/3, Wolwanowice — LAND ANNOUNCEMENT, IX przetarg (dziewiąty),
//          343 m² (0,0343 ha), 35 700 zł, przetarg 11.08.2026. Body's history
//          recap enumerates ALL EIGHT prior rounds by name ("Pierwszy ...
//          odbył się ..., drugi ... odbył się ..., ..., ósmy ... został
//          odwołany") — the operative round must be read from the EARLIEST
//          ordinal (the "ogłasza dziewiąty przetarg" opening), not the first
//          one textually, or this would misparse as round 1. This plot carries
//          a "zabudowanej budynkiem" (built, a former milk depot) — resolveKind
//          still resolves 'grunt' because the TITLE only ever says "działki"
//          (title-first discipline; see core/finn-bip.js resolveKind).
//   10590  dz. 18/3, Wolwanowice — LAND RESULT, VI przetarg: "Nikt nie
//          wpłacił wadium" → unsold. The TITLE carries no ordinal at all here
//          (unlike 9635) — round must be recovered from the body's opening
//          "Szósty przetarg ustny nieograniczony..." sentence. Also exercises
//          the same "zabudowanej budynkiem" 'grunt'-not-'zabudowana' resolution
//          as 11006, but through parseResultDoc's title-recovery path (a real
//          bug found + fixed: resolveKind('', fullText) — no title at all —
//          let the body's "zabudowanej" win and misclassified this as
//          'zabudowana', which then fell through the address (flat) branch and
//          produced ZERO records; fixed by recovering the title from the
//          `${title}. ${body}` convention before calling resolveKind).
//   9948   Klimontów, lokal użytkowy — a RENTAL (najem) auction: "Ogłoszenie
//          pierwszego przetargu ustnego ograniczonego NA ODDANIE W NAJEM
//          lokalu użytkowego...". Real title passes the cheap title-level
//          gate (starts "Ogłoszenie", contains "przetargu") but must be
//          dropped by parseAnnouncement's body-level isLeaseText() gate.
//   10659  ul. 3 Maja 70, lokal użytkowy — a RENTAL RESULT: "na wynajem...
//          Najemcą nieruchomości została Anna Jelonkiewicz...". Also says
//          "wynikiem pozytywnym" (shared boilerplate with genuine sale
//          results) — proves isLeaseText() is checked BEFORE outcome
//          detection in parseResultDoc, not after.
//   11003 / 10588 (titles only) — "Ogłoszenie o odwołaniu ..." cancellation
//          notices; must never reach crawlActive/crawlResultDocs at all.
//   7730   ul. 3 Maja 61/8 — flat ANNOUNCEMENT, I przetarg, 37,43 m², 160 000
//          zł, przetarg 22.06.2023. A second REAL bug found via the live smoke
//          test (node src/cities/proszowice/crawl.js): "3 Maja" (May 3rd
//          Constitution Day) is an extremely common Polish street name — and
//          literally the Urząd's own street — but starts with a DIGIT, not a
//          capital letter; addressFrom's street-capture required an uppercase
//          first character and silently dropped every "ul. 3 Maja" flat.
//          Fixed by widening the leading-char class; safe because the regex
//          stays anchored to the "budynku ... przy ul. <street>" property
//          clause, which never wraps the differently-shaped office mention
//          ("w siedzibie ... ul. 3 Maja 72").
//
// core/finn-bip.js vocabulary that does NOT apply to Proszowice (see parse.js
// header for the full explanation): the operative sale verb is "zbycie", never
// "sprzedaż" — confirmed zero "sprzeda" hits across every real body fetched.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isCancelledTitle,
  isWykazTitle,
  isAnnouncementTitle,
  isResultTitle,
  isSaleText,
  isLeaseText,
  roundFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isSoldOutcome,
  isUnsoldOutcome,
  addressFrom,
  parcelFromText,
  plotAreaFromText,
  locationFromText,
  villageBuildingFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/proszowice/parse.js';

// ---------------------------------------------------------------- real fixtures

const ANN_72_4_TITLE = "Ogłoszenie o pierwszym przetargu ustnym nieograniczonym - ul. Królewska 72/4";
const ANN_72_4_BODY = "Burmistrz Gminy i Miasta Proszowice ogłasza pierwszy przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego nr 4 stanowiącego własność Gminy Proszowice położonego w budynku wielorodzinnym nr 72 przy ul. Królewskiej w Proszowicach wraz z przynależnym udziałem wynoszącym 17/1000 w częściach wspólnych budynku oraz w prawie własności gruntu w działce nr ewid. 572/4 o powierzchni 0,0967 ha. Lokal mieszkalny znajduje się na parterze, składa się z przedpokoju, dwóch pokoi, kuchni, łazienki z WC o powierzchni użytkowej 43,34 m 2 oraz przynależnej piwnicy o powierzchni 2,56 m 2 . Lokal wyposażony jest w instalację elektryczną, telekomunikacyjną, sieć wodno - kanalizacyjną oraz c.o. Ww. nieruchomość stanowiąca działkę nr ewid. 572/4 w Proszowicach objęta jest księgą wieczystą KR1H/00009288/2 prowadzoną przez Sąd Rejonowy dla Krakowa - Nowej Huty, Zamiejscowy Wydział V Ksiąg Wieczystych w Proszowicach. Aktualnie Gmina i Miasto Proszowice posiada plan zagospodarowania przestrzennego. Zgodnie z obowiązującym Planem Zagospodarowania Przestrzennego Gminy i Miasta Proszowice działka nr ewid. 572/4 o powierzchni 0,0967 ha położona jest w terenach, których przeznaczenie jest następujące: 4.MW2 - teren zabudowy mieszkaniowej wielorodzinnej. Pierwszy przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego nr 4 w położonego w budynku nr 72 przy ul. Królewskiej w Proszowicach wraz z przynależnym udziałem wynoszącym 17/1000 w częściach wspólnych budynku oraz w prawie własności gruntu w działce nr ewid. 572/4 o powierzchni 0,0967 ha odbędzie się w dniu 18 czerwca 2026 . o godzinie 10:00 w siedzibie Urzędu Gminy i Miasta Proszowice, ul. 3 Maja 72. Cena wywoławcza w kwocie brutto 280.000,00 złotych (słownie brutto: dwieście osiemdziesiąt tysięcy 00/100 złotych). Wadium wynosi 20.000,00 złotych (słownie: dwadzieścia tysięcy 00/100 złotych). O wysokości postąpienia decydują uczestnicy przetargu z tym, że postąpienie nie może wynosić mniej niż 1% ceny wywoławczej nieruchomości z zaokrągleniem w górę do pełnych dziesiątek złotych. Warunki uczestnictwa w przetargu: wpłacenie wadium na konto Urzędu Gminy i Miasta Proszowice: Bank Spółdzielczy w Proszowicach, nr 25 8597 0001 0010 0000 1049 0007. Termin wpłacania wadium upływa w dniu 11 czerwca 2026 r. włącznie - decyduje data wpływu środków na rachunek Urzędu Gminy i Miasta Proszowice. Wadium zwraca się niezwłocznie po rozstrzygnięciu przetargu, nie później niż przed upływem trzech dni od dnia odwołania lub zamknięcia przetargu. Wpłacone wadium przez uczestnika, który przetarg wygrał zalicza się na poczet ceny nieruchomości. W razie uchylenia się uczestnika, który przetarg wygrał, od zawarcia umowy - wadium nie podlega zwrotowi. Szczegółowe informacje dotyczące przetargu można uzyskać w Urzędzie Gminy i Miasta Proszowice ul. 3 Maja 72 pok. 42 lub telefonicznie pod nr 12 386-10-05 wew. 421. Właściciel nieruchomości zastrzega sobie prawo do unieważnienia przetargu bez podania przyczyny. Burmistrz Gminy i Miasta Proszowice Grzegorz Cichy";

const RES_72_4_TITLE = "Informacja o pierwszym przetargu ustnym nieograniczonym - lokal mieszkalny nr 4 położony w budynku wielorodzinnym nr 72 przy ulicy Królewskiej w Proszowicach";
const RES_72_4_BODY = "Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz. U. z 2021 r., poz. 2213) Burmistrz Gminy i Miasta podaje do publicznej wiadomości: samodzielnego lokalu mieszkalnego nr 4 stanowiącego własność Gminy Proszowice położonego w budynku wielorodzinnym nr 72 przy ul. Królewskiej w Proszowicach wraz z przynależnym udziałem wynoszącym 17/1000 w częściach wspólnych budynku oraz w prawie własności gruntu w działce nr ewid. 572/4 o powierzchni 0,0967 ha. Adres Nr działki KW Cena wywoławcza brutto Udział w nieruchomości gruntowej Wadium Minimalne postąpienie wynosi ul. Królewska 72/4 572/4 KR1H/00009288/2 280.000,00 zł 17/1000 20.000,00 zł 2.800,00 zł Lokal mieszkalny znajduje się na parterze, składa się z przedpokoju, dwóch pokoi, kuchni, łazienki z WC o powierzchni użytkowej 43,34 m 2 oraz przynależnej piwnicy o powierzchni 2,56 m 2 . Lokal wyposażony jest w instalację elektryczną, telekomunikacyjną, sieć wodno - kanalizacyjną, instalację C.O. Pierwszy przetarg ustny nieograniczony w dniu 18 czerwca 2026 r. - lokal nr 4 przy ul. Królewskiej 72 w Proszowicach uważa się za zakończony wynikiem pozytywnym. Dwie osoby dopuszczone do przetargu. Nabywcą nieruchomości została Pani Urszula Korfel. Niniejszą informację wywiesza się na okres 7 dni. Zastępca Burmistrza Gminy i Miasta Proszowice Danuta Szopa Wprowadził: Dominik Ochęduszko";
const RES_72_4_TEXT = `${RES_72_4_TITLE}. ${RES_72_4_BODY}`;

const ANN_70_53_TITLE = "Ogłoszenie przetargu - lokal mieszkalny 70/53 przy ul. Królewskiej";
const ANN_70_53_BODY = "Burmistrz Gminy i Miasta Proszowice ogłasza przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego numer 53 w budynku wielorodzinnym o numerze porządkowym 70 przy ulicy Królewskiej w Proszowicach wraz z przynależnym udziałem wynoszącym 12/1000 w częściach wspólnych budynku oraz współwłasności w działce numer ewidencyjny 572/3 o powierzchni 0,1250 ha i przynależnej piwnicy. Lokal mieszkalny o powierzchni użytkowej 34,05 m 2 znajduje się na IV kondygnacji naziemnej (to jest III piętro), składa się z pokoju + kuchni, łazienki z WC, przedpokoju oraz przynależnej piwnicy o powierzchni 3,16 m 2 . Lokal wyposażony jest w instalacje: elektryczną, telekomunikacyjną, wodną, kanalizacyjną i CO miejską. Lokal wymaga przeprowadzenia remontu. Dla przedmiotowej nieruchomości prowadzona jest księga wieczysta KR1H/00009090/7 . Zgodnie z Miejscowym Planem zagospodarowania Przestrzennego obszaru miasta Proszowice uchwalonym Uchwałą Nr XXXI/250/2021 Rady Miejskiej w Proszowicach z dnia 18.02.2021 r. (ogłoszonym w Dzienniku Urzędowym Województwa Małopolskiego z 2021 r. poz. 1564 z dnia 16 marca 2021r.), oraz zmianą naprawczą miejscowego planu zagospodarowania przestrzennego miasta Proszowice uchwaloną w dniu 30 czerwca 2022 r. uchwałą Rady Miejskiej w Proszowicach Nr L/383/2022 ogłoszoną w dzienniku Urzędowym Województwa Małopolskiego poz. 4977 z dnia 14 lipca 2022 r. działka o numerze ewidencyjnym 572/3 o powierzchni 0,1250 ha położona w Proszowicach znajduje się w terenach: 4.MW2 - tereny zabudowy mieszkaniowej wielorodzinnej. Przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego numer 53 w budynku wielorodzinnym o numerze porządkowy 70 przy ulicy Królewskiej w Proszowicach wraz z przynależnym udziałem wynoszącym 12/1000 w częściach wspólnych budynku, prawie współwłasności w działce numer 572/3 o powierzchni 0,1250 ha i przynależnej piwnicy odbędzie się w dniu 28 czerwca 2024 r. o godzinie 12:00 w siedzibie Urzędu Gminy i Miasta Proszowice ul. 3 Maja 72 sala nr 8. Cena wywoławcza wynosi brutto 210 000,00 złotych (słownie brutto: dwieście dziesięć tysięcy 00/100 złotych). Wadium w kwocie wadium w kwocie 30 000,00 złotych (słownie: trzydzieści tysięcy 00/100 złotych). O wysokości postąpienia decydują uczestnicy przetargu z tym, że nie może wynosić mniej niż 1% ceny wywoławczej nieruchomości z zaokrągleniem w górę do pełnych dziesiątek złotych. Osoby zainteresowane nabyciem lokalu mogą go oglądać w dniach: 20 czerwca 2024 r. od godziny 14:30 do godziny 15:30, 21 czerwca 2024 r. od godziny 13:00do godziny 14:00. Warunki uczestnictwa w przetargu: Wpłacenie wadium na konto Urzędu Gminy i Miasta Proszowice - Bank Spółdzielczy Proszowice nr 25 8597 0001 0010 0000 1049 0007. Termin wpłacenia wadium upływa w dniu 24 czerwca 2024 r . - decyduje data wpływu środków na rachunek Urzędu Gminy i Miasta Proszowice. Wadium zwraca się niezwłocznie po rozstrzygnięciu przetargu, nie później niż przed upływem trzech dni od dnia odwołania lub zamknięcia przetargu. Wpłacone wadium przez uczestnika, który przetarg wygrał zalicza się na poczet ceny nabycia. W razie uchylenia się uczestnika, który przetarg wygrał od zawarcia umowy - wadium nie podlega zwrotowi. Szczegółowe informacje dotyczące przetargów można uzyskać w Urzędzie Gminy i Miasta Proszowice ul. 3 Maja 72 pokój nr 44 lub telefonicznie pod numerem 12 385 12 34. Właściciel nieruchomości zastrzega sobie prawo do unieważnienia przetargu bez podania przyczyny. Wprowadził: Dominik Ochęduszko";

const RES_70_53_TITLE = "Informacja o przeprowadzonym przetargu - lokal mieszkalny numer 53 w budynku wielorodzinnym o numerze porządkowym 70 przy ulicy Królewskiej w Proszowicach";
const RES_70_53_BODY = "WIP-RI.6840.4.2024.JG Informacja o przeprowadzonym przetargu Przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego numer 53 w budynku wielorodzinnym o numerze porządkowym 70 przy ulicy Królewskiej w Proszowicach wraz z przynależnym udziałem wynoszącym 12/1000 w częściach wspólnych budynku oraz współwłasności w działce numer ewidencyjny 572/3 o powierzchni 0,1250 ha i przynależnej piwnicy. Przetarg odbył się w dniu 28 czerwca 2024 roku w siedzibie Urzędu Gminy i Miasta Proszowice. Liczba osób dopuszczonych do przetargu - 2 Liczba osób niedopuszczonych do przetargu - 0 Cena wywoławcza brutto 210 000,00 złotych Cena ustalona w przetargu 212 100,00 złotych Osoba ustalona jako nabywca w przetargu Pan Naleźnik Przemysław. Osoba odpowiedzialna za wytworzenie informacji: Jadwiga Grysakowska Wprowadził: Dominik Ochęduszko";
const RES_70_53_TEXT = `${RES_70_53_TITLE}. ${RES_70_53_BODY}`;

// Numbered street name ("3 Maja") — regression fixture for the addressFrom
// leading-digit bug (see file header).
const ANN_3MAJA_TITLE = "Ogłoszenie pierwszego przetargu ustnego nieograniczonego - lokal mieszkalny ul. 3 Maja 61/8";
const ANN_3MAJA_BODY = "Burmistrz Gminy i Miasta Proszowice ogłasza pierwszy przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego nr 8 stanowiącego własność Gminy Proszowice położonego w budynku wielorodzinnym nr 61 przy ul. 3 Maja w Proszowicach wraz z przynależnym udziałem wynoszącym 63/1000 w częściach wspólnych budynku oraz w prawie własności gruntu w działce nr ewid. 1203/1 o powierzchni 0,0563 ha. Lokal mieszkalny znajduje się na poddaszu użytkowym, składa się z przedpokoju, dwóch pokoi, kuchni, łazienki z WC o powierzchni użytkowej 37,43 m 2 oraz przynależnej piwnicy o powierzchni 4,37 m 2 . Lokal wyposażony jest w instalację elektryczną, telekomunikacyjną, sieć wodno - kanalizacyjną, instalację C.O. Ww. nieruchomość stanowiąca działkę nr ewid. 1203/1 w Proszowicach objęta jest księgą wieczystą KR1H/00013148/0 prowadzoną przez Sąd Rejonowy dla Krakowa - Nowej Huty, Zamiejscowy Wydział V Ksiąg Wieczystych w Proszowicach. Aktualnie Gmina i Miasto Proszowice posiada plan zagospodarowania przestrzennego. Zgodnie z obowiązującym Planem Zagospodarowania Przestrzennego Gminy i Miasta Proszowice działka nr ewid. 1203/1 o powierzchni 0,0563 ha położona jest w terenach, których przeznaczenie jest następujące: 3.MW2 - teren zabudowy mieszkaniowej wielorodzinnej. Pierwszy przetarg ustny nieograniczony na zbycie samodzielnego lokalu mieszkalnego nr 8 w położonego w budynku nr 61 przy ul. 3 Maja w Proszowicach wraz z przynależnym udziałem wynoszącym 63/1000 w częściach wspólnych budynku oraz w prawie własności gruntu w działce nr ewid. 1203/1 o powierzchni 0,0563 ha odbędzie się w dniu 22 czerwca 2023 r. o godzinie 11:00 w siedzibie Urzędu Gminy i Miasta Proszowice, ul. 3 Maja 72. Cena wywoławcza w kwocie brutto 160.000,00 złotych (słownie brutto: sto sześćdziesiąt tysięcy 00 / 100 złotych). Wadium wynosi 10.000,00 złotych (słownie: dziesięć tysięcy 00 / 100 złotych). O wysokości postąpienia decydują uczestnicy przetargu z tym, że postąpienie nie może wynosić mniej niż 1% ceny wywoławczej nieruchomości z zaokrągleniem w górę do pełnych dziesiątek złotych. Warunki uczestnictwa w przetargach: Wpłacenie wadium na konto Urzędu Gminy i Miasta Proszowice - Bank Spółdzielczy w Proszowicach nr 25 8597 0001 0010 0000 1049 0007. Termin wpłacania wadium upływa w dniu 16 czerwca 2023 r. włącznie - decyduje data wpływu środków na rachunek Urzędu Gminy w Proszowicach. Wadium zwraca się niezwłocznie po rozstrzygnięciu przetargu, nie później niż przed upływem trzech dni od dnia odwołania lub zamknięcia przetargu. Wpłacone wadium przez uczestnika, który przetarg wygrał zalicza się na poczet ceny nieruchomości. W razie uchylenia się uczestnika, który przetarg wygrał, od zawarcia umowy - wadium nie podlega zwrotowi. Szczegółowe informacje dotyczące przetargu można uzyskać w Urzędzie Gminy i Miasta Proszowice ul. 3 Maja 72 pok. 42, 40 lub telefonicznie pod nr (12) 386-10-05 wew. 142 lub 140. Właściciel nieruchomości zastrzega sobie prawo do unieważnienia przetargu bez podania przyczyny. Wprowadził: Dominik Ochęduszko";

const ANN_2274_2_TITLE = "Ogłoszenie o szóstym przetargu ustnym nieograniczonym na zbycie niezabudowanej nieruchomości składającej się z działki o numerze ewidencyjnym 2274/2 o powierzchni 0,1566 ha położonej w Proszowicach";
const ANN_2274_2_BODY = "BURMISTRZ GMINY I MIASTA PROSZOWICE O G Ł A S Z A SZóSTY PRZETARG USTNY NIEOGRANICZONY na zbycie niezabudowanej nieruchomości składającej się z działki o numerze ewidencyjnym 2274/2 o powierzchni 0,1566 ha położonej w Proszowicach. Dla działki o numerze ewidencyjnym 2274/2 o powierzchni 0,1566 ha położonej w Proszowicach, stanowiącej własność Gminy Proszowice prowadzona jest księga wieczysta KR1H/00011982/4. Pierwszy przetarg ustny nieograniczony odbył się w dniu 17 maja 2024 r., drugi przetarg ustny nieograniczony odbył się w dniu 29 sierpnia 2024 r., trzeci przetarg ustny nieograniczony odbył się w dniu 11 października 2024 r., czwarty przetarg ustny nieograniczony odbył się w dniu 13 grudnia 2024 r., piąty przetarg ustny nieograniczony odbył się w dniu 24 stycznia 2025 r.. Zgodnie z Miejscowym Planem zagospodarowania Przestrzennego obszaru miasta Proszowice uchwalonym Uchwałą Nr XXXI/250/2021 Rady Miejskiej w Proszowicach z dnia 18.02.2021 r. (ogłoszonym w Dzienniku Urzędowym Województwa Małopolskiego z 2021 r. poz. 1564 z dnia 16 marca 2021r.), działka o numerze ewidencyjnym 2274/2 o powierzchni 0,1566 ha położona w Proszowicach znajduje się w terenach: 11.MU - teren zabudowy wielofunkcyjnej. Działka posiada kształt zbliżony do wydłużonego prostokąta i rozciąga się na terenie płaskim w kierunku północ - południe. Działka nie posiada prawnie zapewnionego dostępu do drogi publicznej. W sąsiedztwie działki znajdują się nieruchomości gruntowe zabudowane budynkami mieszkalnymi jednorodzinnymi i budynkami gospodarczymi oraz nieruchomości gruntowe niezabudowane przeznaczone na cele budowlane, budowlano - rolne. W sąsiedztwie działki znajduje się sieć wodociągowa i przyłącz energetyczny. Przetarg ustny nieograniczony na zbycie nieruchomości położonej w Proszowicach składającej się z działki o numerze ewidencyjnym 2274/2 o powierzchni 0,1566 ha odbędzie się w dniu 28 marca 2025 r. o godzinie 11 00 w siedzibie Urzędu Gminy i Miasta w Proszowicach, ul. 3 Maja 72 sala nr 8. Cena wywoławcza wynosi brutto 123 200,00 złotych (słownie brutto: sto dwadzieścia trzy tysiące dwieście 00/100 złotych) w tym podatek VAT 23 037,40 złotych. Wadium w kwocie wadium w kwocie 20 000,00 złotych ( słownie: dwadzieścia tysięcy 00/100 złotych), o wysokości postąpienia decydują uczestnicy przetargu z tym, że nie może wynosić mniej niż 1% ceny wywoławczej nieruchomości z zaokrągleniem w górę do pełnych dziesiątek złotych. Warunki uczestnictwa w przetargu: 1. Wpłacenie wadium na konto Urzędu Gminy i Miasta w Proszowicach - Bank Spółdzielczy Proszowice nr 25 85970001 0010 0000 1049 0007. Termin wpłacenia wadium upływa w dniu 24 marca 2025 r . - decyduje data wpływu środków na rachunek Urzędu Gminy i Miasta w Proszowicach. Wadium zwraca się niezwłocznie po rozstrzygnięciu przetargu, nie później niż przed upływem trzech dni od dnia odwołania lub zamknięcia przetargu. 3. Wpłacone wadium przez uczestnika, który przetarg wygrał zalicza się na poczet ceny nabycia. 4. W razie uchylenia się uczestnika, który przetarg wygrał od zawarcia umowy - wadium nie podlega zwrotowi. Szczegółowe informacje dotyczące przetargów można uzyskać w Urzędzie Gminy i Miasta w Proszowicach ul. 3 Maja 72 pokój nr. 45 lub telefonicznie pod numerem 12 385 12 34. Właściciel nieruchomości zastrzega sobie prawo do unieważnienia przetargu bez podania przyczyny.";

const RES_2274_2_TITLE = "Informacja o przeprowadzonym szóstym przetargu - działka nr ew. 2274/2 położona w Proszowicach";
const RES_2274_2_BODY = "Informacja o przeprowadzonym szóstym przetargu Szósty przetarg ustny nieograniczony na zbycie niezabudowanej nieruchomości składającej się z działki numer ewidencyjny 2274/2 o powierzchni 0,1566 ha położonej w Proszowicach, księga wieczysta KR1H/00011982/4. Przetarg odbył się w dniu 28 marca 2025 roku w siedzibie Urzędu Gminy i Miasta Proszowice. Cena wywoławcza brutto 123 200,00 złotych Liczba osób dopuszczonych do przetargu - 0 Liczba osób niedopuszczonych do przetargu - 0 Nikt nie wpłacił wadium. Z upoważnienia Burmistrza Gminy i Miasta Proszowice inż. Danuta Szopa Zastępca Burmistrza Gminy i Miasta Proszowice Wprowadził: Dominik Ochęduszko";
const RES_2274_2_TEXT = `${RES_2274_2_TITLE}. ${RES_2274_2_BODY}`;

const ANN_WOLWANOWICE_TITLE = "Ogłoszenie dziewiątego przetargu ustnego nieograniczonego na zbycie nieruchomości składającej się z działki o numerze ewidencyjnym 18/3 położonej w Wolwanowicach";
const ANN_WOLWANOWICE_BODY = "Burmistrz Gminy i Miasta Proszowice ogłasza dziewiąty przetarg ustny nieograniczony na zbycie nieruchomości składającej się z działki o numerze ewidencyjnym 18/3 o powierzchni 0,0343 ha położonej w Wolwanowicach zabudowanej budynkiem o numerze porządkowym 33A Pierwszy przetarg ustny nieograniczony odbył się w dniu 16 maja 2025 r., drugi przetarg ustny nieograniczony odbył się w dniu 11 lipca 2025 r., trzeci przetarg ustny nieograniczony odbył się w dniu 29 sierpnia 2025 r., czwarty przetarg ustny nieograniczony odbył się w dniu 5 grudnia 2025 r., piąty przetarg ustny nieograniczony odbył się w dniu 16 stycznia 2026 r., szósty przetarg ustny nieograniczony odbył się w dniu 6 marca 2026 r., siódmy przetarg ustny nieograniczony odbył się w dniu 15 maja 2026 r., ósmy przetarg ustny nieograniczony został odwołany. Dla działki o numerze ewidencyjnym 18/3 o powierzchni 0,0343 ha położonej w Wolwanowicach, stanowiącej własność Gminy Proszowice prowadzona jest księga wieczysta KR1H/00008059/1. W studium uwarunkowań i kierunków zagospodarowania przestrzennego Gminy i Miasta Proszowice (kierunki rozwoju) zatwierdzonym Uchwałą Rady Miejskiej w Proszowicach Nr XXXIV/286/2021 z dnia 17.06.2021 r. działka o numerze ewidencyjnym 18/3 położona w Wolwanowicach przeznaczona jest: U1 - obszar rozwoju aktywności gospodarczej Działka posiada kształt zbliżony do wydłużonego prostokąta i rozciąga się w kierunku północny - zachód - południowy - wschód ze spadkiem w kierunku południowo - zachodnim. Działka zbudowana jest budynkiem byłej zlewni mleka. Dojazd do działki jednostronny od strony południowo - zachodniej bezpośrednio z drogi powiatowej asfaltowej (działka numer ewidencyjny 208/4). W sąsiedztwie działki znajdują się nieruchomości gruntowe zabudowane budynkami mieszkalnymi jednorodzinnymi i budynkami gospodarczymi oraz nieruchomości gruntowe niezabudowane przeznaczone na cele budowlane, budowlano - rolne oraz rolne. W sąsiedztwie działki znajduje się sieć wodociągowa i przyłącz energetyczny. Działka zabudowana jest budynkiem o numerze porządkowym Wolwanowice 33A, po byłej zlewni mleka. Budynek jest częściowo podpiwniczony, parterowy z poddaszem użytkowym o powierzchni zabudowy 165 m 2 i powierzchni użytkowej 157,67 m 2 . Budynek został wybudowany w latach 50-tych XX wieku w technologii tradycyjnej - murowanej. Na parterze znajdują się 4 pomieszczenia, natomiast na poddaszu użytkowym znajduje się komunikacja oraz jedno pomieszczenie. Aktualnie pomieszczenia znajdujące się w budynku są nieużytkowane. Budynek jest w złym stanie technicznym. Przetarg ustny nieograniczony na zbycie nieruchomości położonej w Wolwanowicach składającej się z działki o numerze ewidencyjnym 18/3 o powierzchni 0,0343 ha, zabudowanej budynkiem o numerze porządkowym Wolwanowice 33A odbędzie się w dniu 11 sierpnia 2026 r. o godzinie 10:00 w siedzibie Urzędu Gminy i Miasta Proszowice, ul. 3 Maja 72 sala nr 8 Cena wywoławcza wynosi brutto 35 700,00 złotych (słownie brutto: trzydzieści pięć tysięcy siedemset 00/100 złotych). Wadium w kwocie wadium w kwocie 4 000,00 złotych (słownie: cztery tysiące 00/100 złotych). O wysokości postąpienia decydują uczestnicy przetargu z tym, że nie może wynosić mniej niż 1% ceny wywoławczej nieruchomości z zaokrągleniem w górę do pełnych dziesiątek złotych. Warunki uczestnictwa w przetargu: Wpłacenie wadium na konto Urzędu Gminy i Miasta Proszowice - Bank Spółdzielczy Proszowice nr 25 8597 0001 0010 0000 1049 0007. Termin wpłacenia wadium upływa w dniu 6 sierpnia 2026 r . - decyduje data wpływu środków na rachunek Urzędu Gminy i Miasta Proszowice. Wadium zwraca się niezwłocznie po rozstrzygnięciu przetargu, nie później niż przed upływem trzech dni od dnia odwołania lub zamknięcia przetargu. Wpłacone wadium przez uczestnika, który przetarg wygrał zalicza się na poczet ceny nabycia. W razie uchylenia się uczestnika, który przetarg wygrał od zawarcia umowy - wadium nie podlega zwrotowi. Szczegółowe informacje dotyczące przetargów można uzyskać w Urzędzie Gminy i Miasta Proszowice ul. 3 Maja 72 pokój nr 44 lub telefonicznie pod numerem 12 385 12 34. Właściciel nieruchomości zastrzega sobie prawo do odwołania przetargu bez podania przyczyny. Burmistrz Gminy i Miasta Proszowice Grzegorz Cichy Wprowadził: Dominik Ochęduszko";

const RES_WOLWANOWICE_TITLE = "Informacja o przeprowadzonym przetargu - działka nr ew. 18/3 położona w Wolwanowicach";
const RES_WOLWANOWICE_BODY = "Informacja o przeprowadzonym przetargu Szósty przetarg ustny nieograniczony na zbycie nieruchomości składającej się z działki numer ewidencyjny 18/3 o powierzchni 0,0343 ha położonej w Wolwanowicach, zabudowanej budynkiem o numerze porządkowym Wolwanowice 33A, stanowiącej własność Gminy Proszowice dla której prowadzona jest księga wieczysta KR1H/00008059/1. Przetarg odbył się w dniu 6 marca 2026 roku w siedzibie Urzędu Gminy i Miasta Proszowice. Cena wywoławcza brutto 44 000,00 złotych Liczba osób dopuszczonych do przetargu - 0 Liczba osób niedopuszczonych do przetargu - 0 Nikt nie wpłacił wadium. Burmistrz Gminy i Miasta Proszowice Grzegorz Cichy Wprowadził: Dominik Ochęduszko";
const RES_WOLWANOWICE_TEXT = `${RES_WOLWANOWICE_TITLE}. ${RES_WOLWANOWICE_BODY}`;

const ANN_NAJEM_KLIMONTOW_TITLE = "Ogłoszenie pierwszego przetargu ustnego ograniczonego na oddanie w najem lokalu użytkowego położonego w budynku Wspólnoty Mieszkaniowej Nr 1 w Klimontowie";
const ANN_NAJEM_KLIMONTOW_BODY = "Ogłoszenie Burmistrza Gminy i Miasta Proszowice z dnia 24 lipca 2025 r. w sprawie pierwszego przetargu ustnego ograniczonego na oddanie w najmu lokalu użytkowego położonego w budynku Wspólnoty Mieszkaniowej Nr 1 w Klimontowie stanowiącego własność Gminy Proszowice Na podstawie art. 30 ust. 1, ust. 2 pkt 3 ustawy z dnia 8 marca 1990 r. o samorządzie gminnym (t.j. Dz. U. z 2024 r. poz. 1465 z późn. zm.), art. 40 ust. 1 pkt 2, ust. 2 i ust. 3 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (t.j. Dz. U. z 2024 r., poz. 1145 z późn. zm.), Uchwały Nr XV/107/2025 Rady Miejskiej w Proszowicach z dnia 6 maja 2025 r. w sprawie wyrażenia zgody na oddanie w najem w trybie przetargu ograniczonego na okres do 5 lat lokalu użytkowego położonego w Klimontowie stanowiącego własność Gminy Proszowice, Burmistrz Gminy i Miasta Proszowice ogłasza: I. Pierwszy przetarg ustny ograniczony na wynajem na okres do 5 lat lokalu użytkowego położonego w budynku Wspólnoty Mieszkaniowej Nr 1 w Klimontowie, stanowiącego własność Gminy Proszowice. Lokal użytkowy o powierzchni 34,74 m 2 , usytuowany na działce nr ewid. 409/11 o pow. 0,2053 ha, z przeznaczeniem na prowadzenie działalności gospodarczej, tj. punktu aptecznego lub gabinetu lekarskiego w tym stomatologicznego. Dla ww. nieruchomości prowadzona jest Księga Wieczysta nr KR1H/00033021/0 przez Sąd Rejonowy dla Krakowa-Nowej Huty w Krakowie Zamiejscowy V wydział Ksiąg Wieczystych z siedzibą w Proszowicach. Dla ww. przetargu ustala się następujące warunki: 1) przedmiotem przetargu jest miesięczna stawka czynszu najmu za 1 m 2 powierzchni użytkowej lokalu. Stawka wywoławcza za 1 m 2 netto wynosi 20,00 + VAT (słownie netto: dwadzieścia złotych 00 / 100 ), 2) wadium w kwocie 1.500,00 zł (słownie: jeden tysiąc pięćset złotych 00 / 100 ), 3) o wysokości postąpienia decydują uczestnicy przetargu z tym, że nie może ono wynosić mniej niż netto 1,00 zł, 4) przetarg odbędzie się 11 września 2025 r. o godz. 9:00 w siedzibie Urzędu Gminy i Miasta Proszowice, ul. 3 Maja 72, 32-100 Proszowice sala nr 8, 5) wadium płatne jest przelewem na konto Urzędu Gminy i Miasta Proszowice - Bank Spółdzielczy w Proszowicach nr 25 8597 0001 0010 0000 1049 0007 najpóźniej do dnia 4 września 2025 r . włącznie - decyduje data wpływu środków na rachunek Urzędu; w tytule przelewu należy wpisać \"wadium lokal użytkowy Klimontów\", 6) najemcę oprócz czynszu najmu obciążają następujące opłaty dodatkowe: a) ogrzewanie lokalu, b) koszty zużycia energii elektrycznej zgodnie ze wskazaniami sublicznika na podstawie wystawionej przez wynajmującego faktury VAT, c) koszty zużycia wody i ścieków zgodnie z obowiązującą taryfą za doprowadzenie wody i odprowadzenie ścieków,\" d) opłata za wywóz śmieci, e) podatek od nieruchomości. 7) wniesione wadium przez uczestnika przetargu, który przetarg wygrał, zalicza się na poczet czynszu, a wadium pozostałych uczestników zostanie zwrócone niezwłocznie jednak nie później niż przed upływem 3 dni od dnia zamknięcia przetargu, odwołania przetargu, unieważnienia przetargu lub jego zakończenia wynikiem negatywnym, 8) że w razie uchylenia się uczestnika, który przetarg wygrał, od zawarcia umowy - wadium nie podlega zwrotowi. II. Szczegółowe informacje dotyczące przetargu można uzyskać w Urzędzie Gminy i Miasta Proszowice ul. 3 Maja 72 pok. 42 lub telefonicznie pod nr 12 386-10-05 wew. 401. Właściciel nieruchomości zastrzega sobie prawo do unieważnienia przetargu bez podania przyczyny. Burmistrz Gminy i Miasta Proszowice Grzegorz Cichy Wprowadził: Dominik Ochęduszko";

const RES_NAJEM_3MAJA_TITLE = "Informacja o pierwszym przetargu ustnym ograniczonym - lokal użytkowy położony w Proszowicach - ul. 3 Maja 70";
const RES_NAJEM_3MAJA_BODY = "Pierwszy przetarg ustny ograniczony na wynajem na okres do 10 lat lokalu użytkowego położonego w budynku nr 70 położonym w Proszowicach przy ul. 3 Maja, stanowiącego własność Gminy Proszowice. Lokal użytkowy o powierzchni 20,43 m2, usytuowany na działce nr ewid. 1183/6, 1183/3 z przeznaczeniem na prowadzenie działalności gospodarczej, tj. medycznej. Dla ww. nieruchomości prowadzona jest Księga Wieczysta nr KR1H/00003905/2 przez Sąd Rejonowy dla Krakowa - Nowej Huty w Krakowie Zamiejscowy V wydział Ksiąg Wieczystych z siedzibą w Proszowicach. Niniejszy pierwszy przetarg ustny nieograniczony uważa się za zakończony wynikiem pozytywnym. Jedna osoba dopuszczona do przetargu. Najemcą nieruchomości została Anna Jelonkiewicz, Maria Magdalena Kułaga-Wieczorek ZDROWIE Sp. jawna. Niniejszą informację wywiesza się na okres 7 dni. Wprowadził: Dominik Ochęduszko";
const RES_NAJEM_3MAJA_TEXT = `${RES_NAJEM_3MAJA_TITLE}. ${RES_NAJEM_3MAJA_BODY}`;

const CANCEL_WOLWANOWICE_TITLE = "Ogłoszenie o odwołaniu ósmego przetargu ustnego nieograniczonego - działka nr ew. 18/3 położona w Wolwanowicach";
const CANCEL_BOBIN_TITLE = "Ogłoszenie o odwołaniu przetargu ustnego nieograniczonego na zbycie nieruchomości - Bobin";
const WYKAZ_TITLE = 'Wykaz nieruchomości przeznaczonych do zbycia w trybie przetargu ustnego nieograniczonego (WIP-RI.6840.4.2022)';

// ---------------------------------------------------------------- title routing

test('title routing: announcement vs result vs cancelled vs wykaz', () => {
  assert.equal(isAnnouncementTitle(ANN_72_4_TITLE), true);
  assert.equal(isAnnouncementTitle(ANN_70_53_TITLE), true); // no ordinal, still an announcement
  assert.equal(isAnnouncementTitle(ANN_2274_2_TITLE), true);
  assert.equal(isAnnouncementTitle(ANN_WOLWANOWICE_TITLE), true);
  assert.equal(isResultTitle(RES_72_4_TITLE), true);
  assert.equal(isResultTitle(RES_70_53_TITLE), true);
  assert.equal(isResultTitle(RES_2274_2_TITLE), true);
  assert.equal(isResultTitle(RES_WOLWANOWICE_TITLE), true); // no ordinal in title either

  // Cancellations: dropped by both gates, regardless of "Ogłoszenie" prefix.
  assert.equal(isCancelledTitle(CANCEL_WOLWANOWICE_TITLE), true);
  assert.equal(isCancelledTitle(CANCEL_BOBIN_TITLE), true);
  assert.equal(isAnnouncementTitle(CANCEL_WOLWANOWICE_TITLE), false);
  assert.equal(isAnnouncementTitle(CANCEL_BOBIN_TITLE), false);

  // Wykaz (pre-auction designation): dropped even though it mentions "przetargu".
  assert.equal(isWykazTitle(WYKAZ_TITLE), true);
  assert.equal(isAnnouncementTitle(WYKAZ_TITLE), false);

  // A rental auction's title passes the cheap title-level gate (it IS a real
  // "Ogłoszenie ... przetargu") — only the body-level gate below drops it.
  assert.equal(isAnnouncementTitle(ANN_NAJEM_KLIMONTOW_TITLE), true);
  assert.equal(isResultTitle(RES_NAJEM_3MAJA_TITLE), true);
});

test('isSaleText requires "zbyci" (Proszowice never says "sprzedaż"); isLeaseText catches najem/dzierżawa/wynajem', () => {
  assert.equal(isSaleText(ANN_72_4_BODY), true);
  assert.equal(isSaleText(ANN_WOLWANOWICE_BODY), true);
  assert.equal(/sprzeda/i.test(ANN_72_4_BODY), false); // confirms the real vocabulary gap
  assert.equal(isLeaseText(ANN_NAJEM_KLIMONTOW_BODY), true);
  assert.equal(isLeaseText(RES_NAJEM_3MAJA_BODY), true);
  assert.equal(isLeaseText(ANN_72_4_BODY), false);
});

// -------------------------------------------------------------- unit extractors

test('roundFromText: spelled-out Polish ordinals through IX, earliest occurrence wins over a later history recap', () => {
  assert.equal(roundFromText(`${ANN_72_4_TITLE} ${ANN_72_4_BODY}`), 1);
  assert.equal(roundFromText(`${ANN_70_53_TITLE} ${ANN_70_53_BODY}`), 1); // no ordinal anywhere -> default 1
  assert.equal(roundFromText(`${ANN_2274_2_TITLE} ${ANN_2274_2_BODY}`), 6); // szóstym (VI)
  // dz. 18/3's announcement lists EIGHT prior rounds by name after the
  // operative "ogłasza dziewiąty przetarg" — must resolve to 9, not 1.
  assert.equal(roundFromText(`${ANN_WOLWANOWICE_TITLE} ${ANN_WOLWANOWICE_BODY}`), 9);
  // dz. 18/3's result has NO ordinal in the title; must fall back to the body's
  // opening "Szósty przetarg ustny nieograniczony..." sentence.
  assert.equal(roundFromText(RES_WOLWANOWICE_TEXT), 6);
});

test('roundFromText: round 10 (dziesiąty) is deliberately not attempted — regression for the decade-word/boilerplate collision', () => {
  // "dwieście dziesięć tysięcy" (210 000 spelled out) must NOT read as round 10.
  assert.equal(roundFromText(ANN_70_53_BODY), 1);
  // "dziewięćdziesiąt sześć tysięcy" (96 200 spelled out, a different real
  // fixture) contains the literal substring "dziesiąt" — must not misfire either.
  assert.equal(/dziewięćdziesiąt/.test('dziewięćdziesiąt sześć tysięcy'), true);
  assert.equal(roundFromText('Cena wywoławcza wynosi brutto 96 200,00 złotych (słownie brutto: dziewięćdziesiąt sześć tysięcy dwieście 00/100 złotych). Pierwszy przetarg ustny nieograniczony'), 1);
});

test('startingPriceFromText: prose template, and the table-flattened result template (real bug regression)', () => {
  assert.equal(startingPriceFromText(ANN_72_4_BODY), 280000);
  assert.equal(startingPriceFromText(ANN_70_53_BODY), 210000);
  assert.equal(startingPriceFromText(ANN_2274_2_BODY), 123200);
  assert.equal(startingPriceFromText(ANN_WOLWANOWICE_BODY), 35700);
  // The exact live body that exposed the finn-bip priceFromText bug: a naive
  // {0,140}-gap scan bridges across "...KR1H/00009288/2" into "280.000,00 zł"
  // and returns 2280000. Must return the correct 280000.
  assert.equal(startingPriceFromText(RES_72_4_BODY), 280000);
  assert.equal(startingPriceFromText(RES_70_53_BODY), 210000);
});

test('achievedPriceFromText: "Cena ustalona w przetargu" (older template) vs absent (newer template)', () => {
  assert.equal(achievedPriceFromText(RES_70_53_BODY), 212100);
  assert.equal(achievedPriceFromText(RES_72_4_BODY), null); // newer template never states it distinctly
  assert.equal(achievedPriceFromText(RES_2274_2_BODY), null); // unsold, no buyer, no price
});

test('isSoldOutcome / isUnsoldOutcome: both buyer-phrasing templates, and the negative "Nikt nie wpłacił wadium" phrasing', () => {
  assert.equal(isSoldOutcome(RES_72_4_BODY), true); // "wynikiem pozytywnym" + "Nabywcą ... została"
  assert.equal(isSoldOutcome(RES_70_53_BODY), true); // "Osoba ustalona jako nabywca w przetargu"
  assert.equal(isUnsoldOutcome(RES_2274_2_BODY), true); // "Nikt nie wpłacił wadium"
  assert.equal(isUnsoldOutcome(RES_WOLWANOWICE_BODY), true);
  assert.equal(isSoldOutcome(RES_2274_2_BODY), false);
});

test('addressFrom: building-BEFORE-street phrasing, both "nr" and "o numerze porządkowym" variants', () => {
  const a = addressFrom(ANN_72_4_TITLE, ANN_72_4_BODY);
  assert.equal(a.address_raw, 'Królewskiej 72/4');
  assert.equal(a.address.street, 'Królewskiej');
  assert.equal(a.address.building, '72');
  assert.equal(a.address.apt, '4');

  const b = addressFrom(RES_70_53_TITLE, RES_70_53_BODY);
  assert.equal(b.address_raw, 'Królewskiej 70/53'); // "o numerze porządkowym 70" variant
  assert.equal(b.address.key, 'krolewskiej|70|53');
});

test('parcelFromText / plotAreaFromText (ha->m2) / locationFromText / villageBuildingFromText', () => {
  assert.equal(parcelFromText(ANN_2274_2_BODY), '2274/2');
  assert.equal(plotAreaFromText(ANN_2274_2_BODY), 1566); // 0,1566 ha
  assert.equal(locationFromText(ANN_2274_2_BODY), 'Proszowicach');

  assert.equal(parcelFromText(ANN_WOLWANOWICE_BODY), '18/3');
  assert.equal(plotAreaFromText(ANN_WOLWANOWICE_BODY), 343); // 0,0343 ha
  const vb = villageBuildingFromText(ANN_WOLWANOWICE_BODY);
  assert.equal(vb.bldg, '33A');
});

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: PENDING flat (Królewska 72/4, I przetarg)', () => {
  const rec = parseAnnouncement(ANN_72_4_TITLE, ANN_72_4_BODY, 'https://proszowice.pl/aktualnosc-10833-ogloszenie_o_pierwszym_przetargu_ustnym.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Królewskiej 72/4');
  assert.equal(rec.address.key, 'krolewskiej|72|4');
  assert.equal(rec.area_m2, 43.34);
  assert.equal(rec.starting_price_pln, 280000);
  assert.equal(rec.auction_date, '2026-06-18');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: PENDING flat, older template with no round ordinal anywhere (Królewska 70/53)', () => {
  const rec = parseAnnouncement(ANN_70_53_TITLE, ANN_70_53_BODY, 'https://proszowice.pl/aktualnosc-8766-ogloszenie_przetargu_lokal_mieszkalny.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Królewskiej 70/53');
  assert.equal(rec.area_m2, 34.05);
  assert.equal(rec.starting_price_pln, 210000);
  assert.equal(rec.auction_date, '2024-06-28');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: PENDING flat on a NUMBERED street (ul. 3 Maja 61/8) — regression for the leading-digit addressFrom bug', () => {
  const rec = parseAnnouncement(ANN_3MAJA_TITLE, ANN_3MAJA_BODY, 'https://proszowice.pl/aktualnosc-7730-ogloszenie_pierwszego_przetargu_ustnego.html');
  assert.ok(rec, 'a record is returned (was null before the leading-digit street fix)');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, '3 Maja 61/8');
  assert.equal(rec.address.street, '3 Maja');
  assert.equal(rec.address.building, '61');
  assert.equal(rec.address.apt, '8');
  assert.equal(rec.area_m2, 37.43);
  assert.equal(rec.starting_price_pln, 160000);
  assert.equal(rec.auction_date, '2023-06-22');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: PENDING land (dz. 2274/2, Proszowice, VI przetarg spelled out)', () => {
  const rec = parseAnnouncement(ANN_2274_2_TITLE, ANN_2274_2_BODY, 'https://proszowice.pl/aktualnosc-9555-x.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '2274/2');
  assert.equal(rec.area_m2, 1566);
  assert.equal(rec.address_raw, 'Proszowicach');
  assert.equal(rec.starting_price_pln, 123200);
  assert.equal(rec.auction_date, '2025-03-28');
  assert.equal(rec.round, 6);
});

test('parseAnnouncement: PENDING land, built ("zabudowanej") village plot still resolves grunt (dz. 18/3 Wolwanowice, IX przetarg)', () => {
  const rec = parseAnnouncement(ANN_WOLWANOWICE_TITLE, ANN_WOLWANOWICE_BODY, 'https://proszowice.pl/aktualnosc-11006-ogloszenie_dziewiatego_przetargu.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '18/3');
  assert.equal(rec.area_m2, 343);
  assert.equal(rec.address_raw, 'Wolwanowicach 33A');
  assert.equal(rec.address.key, 'wolwanowicach|33A|');
  assert.equal(rec.starting_price_pln, 35700);
  assert.equal(rec.auction_date, '2026-08-11');
  assert.equal(rec.round, 9);
});

test('parseAnnouncement: rental (najem) auction never reaches an active listing, despite passing the title-level gate', () => {
  assert.equal(isAnnouncementTitle(ANN_NAJEM_KLIMONTOW_TITLE), true);
  const rec = parseAnnouncement(ANN_NAJEM_KLIMONTOW_TITLE, ANN_NAJEM_KLIMONTOW_BODY, 'https://proszowice.pl/aktualnosc-9948-x.html');
  assert.equal(rec, null);
});

// ----------------------------------------------------------------- result parse

test('parseResultDoc: flat SOLD, named buyer, NO distinct achieved price -> falls back to cena wywoławcza (Królewska 72/4)', () => {
  const [rec] = parseResultDoc(RES_72_4_TEXT, null, 'https://proszowice.pl/aktualnosc-10934-informacja_o_pierwszym_przetargu_ustnym.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Królewskiej 72/4');
  assert.equal(rec.address.key, 'krolewskiej|72|4');
  assert.equal(rec.area_m2, 43.34);
  assert.equal(rec.starting_price_pln, 280000);
  assert.equal(rec.final_price_pln, 280000); // fallback: no postąpienie recorded
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-06-18');
  assert.ok(rec.notes.some((n) => /achieved price not stated/.test(n)));
});

test('parseResultDoc: flat SOLD, named buyer, WITH a higher achieved price than cena wywoławcza (Królewska 70/53)', () => {
  const [rec] = parseResultDoc(RES_70_53_TEXT, null, 'https://proszowice.pl/aktualnosc-8924-informacja_o_przeprowadzonym_przetargu.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Królewskiej 70/53');
  assert.equal(rec.starting_price_pln, 210000);
  assert.equal(rec.final_price_pln, 212100); // real postąpienie: "Cena ustalona w przetargu"
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2024-06-28');
  assert.deepEqual(rec.notes, []); // achieved price stated explicitly -> no fallback note
});

test('parseResultDoc: land UNSOLD ("Nikt nie wpłacił wadium") — dz. 2274/2, Proszowice', () => {
  const [rec] = parseResultDoc(RES_2274_2_TEXT, null, 'https://proszowice.pl/aktualnosc-9635-informacja_o_przeprowadzonym_szostym.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '2274/2');
  assert.equal(rec.area_m2, 1566);
  assert.equal(rec.address_raw, 'Proszowicach');
  assert.equal(rec.starting_price_pln, 123200);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.round, 6);
  assert.equal(rec.auction_date, '2025-03-28');
});

test('parseResultDoc: land UNSOLD, built village plot, round recovered from BODY (no ordinal in title) — dz. 18/3 Wolwanowice', () => {
  const [rec] = parseResultDoc(RES_WOLWANOWICE_TEXT, null, 'https://proszowice.pl/aktualnosc-10590-informacja_o_przeprowadzonym_przetargu.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt'); // NOT 'zabudowana' — regression for the title-recovery bug
  assert.equal(rec.dzialka_nr, '18/3');
  assert.equal(rec.area_m2, 343);
  assert.equal(rec.address_raw, 'Wolwanowice 33A');
  assert.equal(rec.starting_price_pln, 44000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.round, 6); // from the body's opening "Szósty przetarg..." — title has no ordinal
  assert.equal(rec.auction_date, '2026-03-06');
});

test('parseResultDoc: rental (najem) result is dropped even though it shares "wynikiem pozytywnym" boilerplate with real sale results', () => {
  assert.deepEqual(parseResultDoc(RES_NAJEM_3MAJA_TEXT, null, 'https://proszowice.pl/aktualnosc-10659-x.html'), []);
});
