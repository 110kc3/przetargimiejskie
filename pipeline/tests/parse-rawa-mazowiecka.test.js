// Rawa Mazowiecka parser tests. Fixtures are faithful copies of REAL document
// bodies + attachment file names, fetched live from bip.rawamazowiecka.pl
// (verified 2026-07-10) via the actual crawl.js `extractDoc()` extractor
// against the live document URLs — not paraphrased, not hand-typed — so the
// parsers are groundtruthed against production data exactly like
// parse-naklo-nad-notecia.test.js / parse-zgorzelec.test.js.
//
//   REYMONTA_ANNOUNCE  tresc=32411  3-in-1 PENDING flats (nr 1/4/5), round
//                      unstated (1st listing) — the spike's headline fixture:
//                      ul. Reymonta 11 (building number ONLY recoverable from
//                      the PDF attachment name — see parse.js REAL DATA
//                      QUIRK #1), 40/31.28/31.88 m², 110k/87k/53k zł,
//                      22.10.2024
//   REYMONTA_RESULT    tresc=32589  the SAME 3 flats, ALL SOLD — 110k→111.5k,
//                      87k→88k, 53k→53.7k, buyers "Państwo Kazimierz i
//                      Grażyna Stefańscy"
//   BIALA_ANNOUNCE     tresc=33622  multi-parcel LAND pending (dz. 205/11 +
//                      206/12 + 706/5, łączny obszar 0,0830 ha), 273 900 zł,
//                      10.09.2025 — no street number (land; address is
//                      context only)
//   BIALA_RESULT_SOLD  tresc=33775  same parcels SOLD 273 900→276 900 zł,
//                      single buyer ("został", not "zostali")
//   DZ167_RESULT_UNSOLD tresc=33865  land UNSOLD (2-parcel, dz.167+166,
//                      "Nie wpłynęła żadna wpłata wadium … zakończył się
//                      wynikiem negatywnym")
//   LEASE_ANNOUNCE_R1  tresc=31750  NAJEM (lease) of Pl. Piłsudskiego 7,
//                      round 1 stated as the WORD ordinal "pierwszego
//                      ustnego przetargu" (unlike zgorzelec's Roman-numeral
//                      "I ustnym przetargu") — must never reach an active
//                      listing (isLease gate)
//   LEASE_RESULT_R1_UNSOLD tresc=31853  that lease's result, UNSOLD — must
//                      never reach parseResultDoc's output (isLease gate)
//   QUALIFIED_BIDDERS  tresc=32478  "Lista osób zakwalifikowanych …" — a
//                      THIRD document type sharing the RESULTS board
//                      (published between announcement and result for a
//                      "przetarg ograniczony"). Written entirely in future
//                      tense ("odbędzie się", "zgłosili się") — REAL BUG this
//                      caught: a naive "mentions a przetarg + a date" parse
//                      would have manufactured a bogus result from it;
//                      isResultDoc() requires the past-tense
//                      "przeprowadzono"/"odbył się" (or "wyniku") signal,
//                      which this document never has.
//   MURARSKA_ANNOUNCE  tresc=31181  kind 'zabudowana' (built, not a flat) —
//                      round-2 re-announcement of dz. 321/2, and UNLIKE most
//                      zabudowana sales here, the body DOES state a building
//                      number: "przy ul. Murarskiej 1." — 118 m², 240 000 zł,
//                      16.01.2024, round 2 ("drugi ustny przetarg")
//   PRUSA_RESULT       tresc=32532  dz. 265, a "przetarg OGRANICZONY do
//                      właścicieli nieruchomości przyległych" (restricted to
//                      adjacent owners) result — REAL BUG this caught: this
//                      template never says "działka"/"niezabudowana"/"grunt"
//                      at all (just "nieruchomości … oznaczonej nr ewid.
//                      265"), so classifyKind() returns 'unknown', not
//                      'grunt' — parse.js's isLandLike() routes it to land
//                      anyway by recognising the "<N> o pow. <area> ha" shape
//                      landPlotsFromText finds. SOLD 20 000→20 300 zł.
//   MSZCZONOWSKA_ANNOUNCE tresc=33629  land REAL BUG regression: "przy ul.
//                      Mszczonowskiej w sąsiedztwie zabudowy …" has NO comma
//                      before the next clause — the street name must stop at
//                      "Mszczonowskiej" (lowercase "w" follows) without
//                      swallowing the run-on sentence.
//   JEZIORANSKIEGO_ANNOUNCE tresc=30279  land REAL BUG regression: "przy ul.
//                      Jeziorańskiego Przedmiotem ustnego przetargu…" runs
//                      the header straight into a new, ALSO-capitalized
//                      sentence with only a space — must resolve to
//                      "Jeziorańskiego" (via the doc's second, comma-
//                      terminated mention), not "Jeziorańskiego Przedmiotem".
//   SLONECZNA_ANNOUNCE tresc=29982  land REAL BUG regression (price): source
//                      itself typos the grosze comma as a third dot — "Cena
//                      wywoławcza wynosi 53.197.50 zł" (should be
//                      "53.197,50") — must parse as 53 197 zł, not the
//                      100x-inflated 5 319 750 a naive all-dots-stripped
//                      parse produces. ALSO exhibits the same street-into-
//                      new-sentence shape as Jeziorańskiego ("przy ul.
//                      Słonecznej Przedmiotem…").
//
// Every regex is anchored against these exact captured strings; see parse.js
// / crawl.js header comments for the full bug-by-bug narrative (7 real
// parser bugs were found and fixed by testing against this live data before
// this file was written).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parsePLN,
  streetFromText,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  isSaleAuction,
  isLease,
  isResultDoc,
  isNegativeOutcome,
  kindFromText,
  splitAnnouncementUnits,
  splitResultUnits,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/rawa-mazowiecka/parse.js';
import { parseBoardRefs, extractDoc } from '../src/cities/rawa-mazowiecka/crawl.js';

// --------------------------------------------------------------- real fixtures

const REYMONTA_ANNOUNCE = {
  body:
    'id="PageContent"> BURMISTRZ MIASTA RAWA MAZOWIECKA ogłasza ustne przetargi nieograniczone na sprzedaż trzech lokali mieszkalnych, położonych w budynku na działce nr 308/13 w obrębie 4 miasta Rawa Mazowiecka 1. Przedmiotem ustnych przetargów nieograniczonych jest sprzedaż trzech lokali mieszkalnych, położonych w budynku na działce nr 308/13 w obrębie 4 miasta Rawa Mazowiecka , objętej księgą wieczystą nr LD1R/00034776/5, przeznaczonej w miejscowym planie zagospodarowania przestrzennego miasta Rawa Mazowiecka pod tereny zabudowy usługowej – teren oznaczony symbolem 4.4.19.U oraz 4.4.16.U. z dostępem do drogi publicznej – ul. Reymonta oraz do infrastruktury technicznej posadowionej w tej ulicy. Budynek w wysokim stopniu zdekapitalizowany, wymagający generalnego remontu (nieocieplony, zniszczona elewacja oraz konstrukcja i pokrycie dachu) lub rozbiórki. 2. Ustny przetarg nieograniczony dla lokalu nr 1 odbędzie się w dniu 22 października 2024 r. o godz. 10.00 w siedzibie Urzędu Miasta Rawa Mazowiecka, Pl. Piłsudskiego 5, w sali konferencyjnej, I piętro. 3. Lokal mieszkalny nr 1 o pow. 40 m 2 , położony na parterze, składający się z pokoju, kuchni i łazienki z sanitariatem z piwnicą nr 1, położoną w odrębnym budynku o pow. 9 m 2 , dla którego Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/00040623/3 wraz z udziałem wynoszącym 4900/26374 części w prawie współwłasności działki nr 308/13, objętej księgą wieczystą nr LD1R/00034776/5 oraz takim samym udziałem w prawie własności części wspólnych budynku, z którego lokal został wyodrębniony i innych urządzeń, które nie służą do wyłącznego użytku właścicieli poszczególnych lokali. Lokal o niskim stanie technicznym, kwalifikujący się do generalnego remontu. 4. Cena wywoławcza lokalu nr 1 wynosi 110.000,00 zł brutto (zw. z VAT). 5. Wadium dla lokalu nr 1 wynosi: 20.000 zł. 6. Ustny przetarg nieograniczony dla lokalu nr 4 odbędzie się w dniu 22 października 2024 r. o godz. 10.30 w siedzibie Urzędu Miasta Rawa Mazowiecka, Pl. Piłsudskiego 5, w sali konferencyjnej, I piętro. 7. Lokal mieszkalny nr 4 o pow. 31,28 m 2 , położony na parterze, składający się z pokoju i kuchni z piwnicą nr 3, położoną w odrębnym budynku o pow. 9 m 2 , dla którego Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/0005839/5 wraz z udziałem wynoszącym 4028/26374 części w prawie współwłasności działki nr 308/13, objętej księgą wieczystą nr LD1R/00034776/5 oraz takim samym udziałem w prawie własności części wspólnych budynku, z którego lokal został wyodrębniony i innych urządzeń, które nie służą do wyłącznego użytku właścicieli poszczególnych lokali. Lokal o niskim stanie technicznym, kwalifikujący się do generalnego remontu. 8. Cena wywoławcza lokalu nr 4 wynosi 87.000,00 zł brutto (zw. z VAT). 9. Wadium dla lokalu nr 4 wynosi: 16.000 zł. 10. Ustny przetarg nieograniczony dla lokalu nr 5 odbędzie się w dniu 22 października 2024 r. o godz. 11.00 w siedzibie Urzędu Miasta Rawa Mazowiecka, Pl. Piłsudskiego 5, w sali konferencyjnej, I piętro. 11. Lokal mieszkalny nr 5 o pow. 31,88 m 2 , położony na piętrze, składający się z pokoju i kuchni oraz strychu nr 1 o pow. 6,03 m 2 , dla którego Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/00045840/5 wraz z udziałem wynoszącym 3791/26374 części w prawie współwłasności działki nr 308/13, objętej księgą wieczystą nr LD1R/00034776/5 oraz takim samym udziałem w prawie własności części wspólnych budynku, z którego lokal został wyodrębniony i innych urządzeń, które nie służą do wyłącznego użytku właścicieli poszczególnych lokali. Lokal o stanie technicznym substandard (poniżej niskiego), kwalifikujący się do generalnego remontu. 12. Cena wywoławcza lokalu nr 5 wynosi 53.000,00 zł brutto (zw. z VAT), 13. Wadium dla lokalu nr 5 wynosi: 10.000 zł. 14. Warunkiem przystąpienia do przetargów jest wpłacenie wadium odrębnie na każdy lokal w wysokości wskazanej powyżej, przelewem na rachunek bankowy Urzędu Miasta Rawa Mazowiecka w Banku Spółdzielczym w Białej Rawskiej nr 87 9291 0001 0054 2395 2000 0040, tytułem: „wadium – lokal nr …….” najpóźniej do dnia 16 października 2024 r. włącznie. Rawa Mazowiecka, dnia 17 września 2024 r. ogłoszenie o przetargu lokale Reymonta 11.pdf (PDF)',
  attach: 'ogłoszenie o przetargu lokale Reymonta 11.pdf',
};

const REYMONTA_RESULT = {
  body:
    'id="PageContent"> INFORMACJA O WYNIKU PRZETARGÓW Działając na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) Burmistrz Miasta Rawa Mazowiecka informuje, że: W dniu 22 października 2024 r. o godz. 10 00 w siedzibie Urzędu Miasta Rawa Mazowiecka przeprowadzono ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 1 zlokalizowanego w budynku przy ul. Reymonta w Rawie Mazowieckiej, dla którego Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/00040623/3 wraz z udziałem wynoszącym 4900/26374 części w prawie współwłasności działki nr 308/13, obręb 4 miasta Rawa Mazowiecka, objętej księgą wieczystą nr LD1R/00034776/5. Liczba osób dopuszczonych do przetargu: 1, tj. wszyscy oferenci, którzy w wyznaczonym terminie wpłacili wadium i spełnili warunki niezbędne do zakwalifikowania się do udziału w przetargu ograniczonym. Liczba osób niedopuszczonych do przetargu: 0. Cena wywoławcza lokalu mieszkalnego nr 1 wynosiła 110 .000,00 zł brutto ( zw. z VAT). W wyniku przeprowadzonego przetargu uzyskano kwotę 111 .500,00 zł brutto (zw. z VAT). Nabywcą nieruchomości zostali Państwo Kazimierz i Grażyna Stefańscy. W dniu 22 października 2024 r. o godz. 10 30 w siedzibie Urzędu Miasta Rawa Mazowiecka przeprowadzono ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 4 zlokalizowanego w budynku przy ul. Reymonta w Rawie Mazowieckiej, dla którego Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/00045839/5 wraz z udziałem wynoszącym 4028/26374 części w prawie współwłasności działki nr 308/13, obręb 4 miasta Rawa Mazowiecka, objętej księgą wieczystą nr LD1R/00034776/5. Liczba osób dopuszczonych do przetargu: 1, tj. wszyscy oferenci, którzy w wyznaczonym terminie wpłacili wadium i spełnili warunki niezbędne do zakwalifikowania się do udziału w przetargu ograniczonym. Liczba osób niedopuszczonych do przetargu: 0. Cena wywoławcza lokalu mieszkalnego nr 4 wynosiła 87 .000,00 zł brutto (zw. z VAT). W wyniku przeprowadzonego przetargu uzyskano kwotę 88 .000,00 zł brutto (zw. z VAT). Nabywcą nieruchomości zostali Państwo Kazimierz i Grażyna Stefańscy. W dniu 22 października 2024 r. o godz. 11 00 w siedzibie Urzędu Miasta Rawa Mazowiecka przeprowadzono ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 5 zlokalizowanego w budynku przy ul. Reymonta w Rawie Mazowieckiej, dla którego Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/00045840/5 wraz z udziałem wynoszącym 3791/26374 części w prawie współwłasności działki nr 308/13, obręb 4 miasta Rawa Mazowiecka, objętej księgą wieczystą nr LD1R/00034776/5. Liczba osób dopuszczonych do przetargu: 1, tj. wszyscy oferenci, którzy w wyznaczonym terminie wpłacili wadium i spełnili warunki niezbędne do zakwalifikowania się do udziału w przetargu ograniczonym. Liczba osób niedopuszczonych do przetargu: 0. Cena wywoławcza lokalu mieszkalnego nr 5 wynosiła 53 .000,00 zł brutto (zw. z VAT). W wyniku przeprowadzonego przetargu uzyskano kwotę 53 .700,00 zł brutto (zw. z VAT). Nabywcą nieruchomości zostali Państwo Kazimierz i Grażyna Stefańscy. Rawa Mazowiecka, dnia 30 października 2024 r. Informacja o wyniku przetargu lokale nr 1 4 5 Reymonta 11.pdf (PDF)',
  attach: 'Informacja o wyniku przetargu lokale nr 1 4 5 Reymonta 11.pdf',
};

const BIALA_ANNOUNCE = {
  body:
    'id="PageContent"> BURMISTRZ MIASTA RAWA MAZOWIECKA ogłasza ustny przetarg nieograniczony na sprzedaż nieruchomości, położonej w obrębie 2 miasta Rawa Mazowiecka Przedmiotem ustnego przetargu nieograniczonego jest sprzedaż nieruchomości gruntowej, oznaczonej w ewidencji gruntów jako działki nr: 205/11 o pow. 0,0507 ha, 206/12 o pow. 0,0301 ha, 706/5 o pow. 0,0022 ha (użytek gruntowy Bi) o łącznym obszarze 0,0830 ha , położonej w obrębie 2 miasta Rawa Mazowiecka, uregulowanej w księdze wieczystej LD1R/00039878/5 , przeznaczonej w miejscowym planie zagospodarowania przestrzennego miasta Rawa Mazowiecka pod tereny zabudowy usługowej o symbolu 2.3.52.U . Nieruchomość będąca przedmiotem przetargu zlokalizowana jest w pobliżu węzła drogi ekspresowej S8 … stanowi niezabudowany obszar w kształcie wydłużonego trapezu. Teren nieruchomości jest nieogrodzony, od strony południowej przylega do ul. Białej (uzgodnienie zjazdu – na warunkach zarządcy drogi). Ustny przetarg nieograniczony odbędzie się w dniu 10 września 2025 r. o godz. 10.00 w siedzibie Urzędu Miasta Rawa Mazowiecka, Pl. Piłsudskiego 5, w sali konferencyjnej, I piętro. Cena wywoławcza nieruchomości wynosi 273.900,00 zł brutto (w tym VAT 23%). Warunkiem przystąpienia do przetargu jest wpłacenie wadium w PLN w wysokości: 40.000,00 zł przelewem na rachunek bankowy Urzędu Miasta Rawa Mazowiecka. Rawa Mazowiecka, dnia 31 lipca 2025 r. ogłoszenie o przetargu Biała.pdf (PDF)',
  attach: 'ogłoszenie o przetargu Biała.pdf',
};

const BIALA_RESULT_SOLD = {
  body:
    'id="PageContent"> INFORMACJA O WYNIKU PRZETARGU Działając na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) Burmistrz Miasta Rawa Mazowiecka informuje, że: W dniu 10 września 2025 r. o godz. 10 00 w siedzibie Urzędu Miasta Rawa Mazowiecka przeprowadzono ustny przetarg nieograniczony na sprzedaż nieruchomości gruntowej, oznaczonej w ewidencji gruntów jako działki nr: 205/11 o pow. 0,0507 ha, 206/12 o pow. 0,0301 ha, 706/5 o pow. 0,0022 ha o łącznym obszarze 0,0830 ha , położonej w obrębie 2 miasta Rawa Mazowiecka , uregulowanej w księdze wieczystej LD1R/00039878/5 . Liczba osób dopuszczonych do przetargu: 1, tj. wszyscy oferenci, którzy w wyznaczonym terminie wpłacili wadium i spełnili warunki niezbędne do zakwalifikowania się do udziału w przetargu nieograniczonym. Liczba osób niedopuszczonych do przetargu: 0. Cena wywoławcza nieruchomości, o której mowa w ust. 1 wynosiła 273 .900,00 zł brutto w tym 23% VAT). W wyniku przeprowadzonego przetargu uzyskano kwotę 276 .900,00 zł brutto w tym 23% VAT). Nabywcą nieruchomości został Pan Piotr Grzegorz Ornafa. Rawa Mazowiecka, dnia 18 września 2025 r. Informacja o wyniku przetargu ul. Biała.pdf (PDF)',
  attach: 'Informacja o wyniku przetargu ul. Biała.pdf',
};

const DZ167_RESULT_UNSOLD = {
  body:
    'id="PageContent"> INFORMACJA O WYNIKU PRZETARGU Działając na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213), Burmistrz Miasta Rawa Mazowiecka informuje, że: 1. W dniu 8 października 2025 r. o godz. 10 00 w siedzibie Urzędu Miasta Rawa Mazowiecka przeprowadzono ustny przetarg nieograniczony na sprzedaż nieruchomości gruntowej, oznaczonej w ewidencji gruntów jako działki nr: 167 o pow. 0,2086 ha i 166 o pow. 0,0475 ha, położonej w obrębie 2 miasta Rawa Mazowiecka o łącznym obszarze 0,2561 ha, uregulowanej w księdze wieczystej LD1R/00046659/6 . 2. Cena wywoławcza nieruchomości wynosiła 815.000,00 zł + podatek VAT 23%. 3. Nie wpłynęła żadna wpłata wadium, jak również nie zgłosiła się żadna osoba fizyczna lub prawna. 4. Przetarg zakończył się wynikiem negatywnym. Rawa Mazowiecka, dnia 16 października 2025 r.',
  attach: '',
};

const LEASE_ANNOUNCE_R1 = {
  body:
    'id="PageContent"> BURMISTRZ MIASTA RAWA MAZOWIECKA ogłasza ustny przetarg nieograniczony na oddanie w najem lokali użytkowych na czas oznaczony 15 lat, położonych w budynku przy Pl. Marsz. Józefa Piłsudskiego 7 w Rawie Mazowieckiej Przedmiotem pierwszego ustnego przetargu nieograniczonego jest oddanie w najem lokali użytkowych o powierzchni 80,00 m2 i 85,90 m2 na czas oznaczony 15 lat, położonych w obrębie 4 miasta Rawa Mazowiecka przy Pl. Marsz. Józefa Piłsudskiego 7 pod działalność handlowo-usługową (gastronomia). Przetarg odbędzie się w dniu 30 kwietnia 2024 r. o godz. 10.00 w siedzibie Urzędu Miasta Rawa Mazowiecka. Cena wywoławcza miesięcznego czynszu najmu lokali wynosi: 5 000,00 zł netto + obowiązująca stawka VAT. Rawa Mazowiecka, dnia 10.04.2024 r.',
  attach: '',
};

const LEASE_RESULT_R1_UNSOLD = {
  body:
    'id="PageContent"> INFORMACJA O WYNIKU PRZETARGU Działając na podstawie § 7 Zarządzenia nr 49 Burmistrza Miasta Rawa Mazowiecka z dnia 10 czerwca 2020 r. w sprawie ustalenia regulaminu przeprowadzania przetargów na dzierżawę lub najem nieruchomości stanowiących własność Miasta Rawa Mazowiecka, na czas oznaczony dłuższy niż 3 lata oraz na czas nieoznaczony informuje, że: 1. W dniu 30.04.2024 r. o godz. 10.00 w siedzibie Urzędu Miasta Rawa Mazowiecka przeprowadzono ustny przetarg nieograniczony na oddanie w najem lokali użytkowych na czas oznaczony 15 lat … 2. Cena wywoławcza miesięcznego czynszu najmu lokali wynosiła 6 150,00 zł brutto (5 000,00 zł netto + VAT 23% w kwocie 1 150,00). 3. Nie wpłynęła żadna wpłata wadium, jak też nie zgłosiła się żadna osoba fizyczna lub prawna. 4. Przetarg zakończył się wynikiem negatywnym. Rawa Mazowiecka, dnia 08.05.2024 r. Informacja o wyniku przetargu Pl. Piłsudskiego 7.pdf (PDF)',
  attach: 'Informacja o wyniku przetargu Pl. Piłsudskiego 7.pdf',
};

const QUALIFIED_BIDDERS = {
  body:
    'id="PageContent"> Lista osób zakwalifikowanych do udziału w ustnym przetargu ograniczonym do właścicieli nieruchomości przyległych na sprzedaż nieruchomości, położonej w obrębie 7 miasta Rawa Mazowiecka Działając na podstawie § 15 pkt 2 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213), informuję, że w terminie do dnia 2 października 2024 r. do godz. 14:00 zgłosili się: Państwo Teresa i Grzegorz małż. Rochala, zainteresowani udziałem w ustnym przetargu ograniczonym na sprzedaż nieruchomości położonej w obrębie 7 miasta Rawa Mazowiecka, oznaczonej nr ewid. 265 o pow. 0,0098 ha, który odbędzie się w dniu 8 października 2024 r. o godz. 10.00 i zostali oni zakwalifikowani do udziału w ww. przetargu. Rawa Mazowiecka, dnia 4 października 2024 r. lista osób zakwalifikowanych.pdf (PDF)',
  attach: 'lista osób zakwalifikowanych.pdf',
};

const MURARSKA_ANNOUNCE = {
  body:
    'id="PageContent"> Burmistrz Miasta Rawa Mazowiecka ogłasza drugi ustny przetarg nieograniczony na sprzedaż nieruchomości zabudowanej, położonej w obrębie 1 miasta Rawa Mazowiecka przy ul. Murarskiej 1. Przedmiotem ustnego drugiego przetargu nieograniczonego jest sprzedaż nieruchomości zabudowanej budynkiem przeznaczonym do rozbiórki, położonej w obrębie 1 miasta Rawa Mazowiecka przy ul. Murarskiej, oznaczonej jako działka nr ewid. 321/2 o pow. 0,0997 ha (użytek gruntowy Bi – inne tereny zabudowane), dla której Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/00016365/9. Jest ona zabudowana jednokondygnacyjnym, murowanym budynkiem myjni samochodowej o pow. użytkowej 118 m2, przeznaczonym do rozbiórki. 3. Przetarg odbędzie się w dniu 16 stycznia 2024 r. o godz. 10.00 w siedzibie Urzędu Miasta Rawa Mazowiecka, Pl. Marsz. J. Piłsudskiego 5, w sali konferencyjnej, I piętro. 4. Cena wywoławcza wynosi 240.000,00 zł (słownie: dwieście czterdzieści tysięcy złotych 00/100) brutto (zw. z VAT). 5. Warunkiem przystąpienia do drugiego przetargu jest wpłacenie wadium w PLN w wysokości: 45.000,00 zł. Rawa Mazowiecka, dnia 8 grudnia 2023 r. Ogłoszenie Murarska II.pdf (PDF)',
  attach: 'Ogłoszenie Murarska II.pdf',
};

const PRUSA_RESULT = {
  body:
    'id="PageContent"> INFORMACJA O WYNIKU PRZETARGU Działając na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) Burmistrz Miasta Rawa Mazowiecka informuje, że: W dniu 8 października 2024 r. o godz. 10 00 w siedzibie Urzędu Miasta Rawa Mazowiecka przeprowadzono ustny przetarg ograniczony na sprzedaż nieruchomości położonej w obrębie 7 miasta Rawa Mazowiecka przy ul. Bolesława Prusa, oznaczonej nr ewid. 265 o pow. 0,0098 ha, dla której prowadzona jest księga wieczysta LD1R/00013555/7. Liczba osób dopuszczonych do przetargu: 1, tj. wszyscy oferenci, którzy w wyznaczonym terminie wpłacili wadium i spełnili warunki niezbędne do zakwalifikowania się do udziału w przetargu ograniczonym. Liczba osób niedopuszczonych do przetargu: 0. Cena wywoławcza nieruchomości oznaczonej nr ewid. 265 wynosiła 20.000,00 zł brutto ( w tym 23% VAT). W wyniku przeprowadzonego przetargu uzyskano kwotę 20.300,00 zł brutto (w tym 23% VAT). Nabywcą nieruchomości zostali Państwo Grzegorz i Teresa Rochala. Rawa Mazowiecka, dnia 16 października 2024 r.',
  attach: '',
};

// REAL BUG regression: unpunctuated "przy ul. Mszczonowskiej w sąsiedztwie …"
// must stop at "Mszczonowskiej" (see parse.js STREET_RE header).
const MSZCZONOWSKA_ANNOUNCE = {
  body:
    'id="PageContent"> BURMISTRZ MIASTA RAWA MAZOWIECKA ogłasza ustny przetarg nieograniczony na sprzedaż nieruchomości, położonej w obrębie 2 miasta Rawa Mazowiecka Przedmiotem ustnego przetargu nieograniczonego jest sprzedaż nieruchomości gruntowej, oznaczonej w ewidencji gruntów jako działki nr: 167 o pow. 0,2086 ha (użytek gruntowy B,RV) i 166 o pow. 0,0475 ha (użytek gruntowy dr), położonej w obrębie 2 miasta Rawa Mazowiecka o łącznym obszarze 0,2561 ha , uregulowanej w księdze wieczystej LD1R/00046659/6 . 2. Nieruchomość będąca przedmiotem przetargu położona jest w północno-wschodniej części miasta przy ul. Mszczonowskiej w sąsiedztwie zabudowy produkcyjno-usługowej i magazynowej wielkokubaturowej. W skład nieruchomości wchodzą działki ewidencyjne nr 167 i 166. 3. Ustny przetarg nieograniczony odbędzie się w dniu 8 października 2025 r. o godz. 10.00 w siedzibie Urzędu Miasta Rawa Mazowiecka. Cena wywoławcza nieruchomości wynosi 815.000,00 zł + podatek VAT 23%. Rawa Mazowiecka, dnia 5 sierpnia 2025 r. ogłoszenie o przetargu Mszczonowska.pdf (PDF)',
  attach: 'ogłoszenie o przetargu Mszczonowska.pdf',
};

// REAL BUG regression: "przy ul. Jeziorańskiego Przedmiotem ustnego …" runs
// the header straight into a new (also-capitalized) sentence with no
// punctuation — must resolve via the doc's SECOND, comma-terminated mention.
const JEZIORANSKIEGO_ANNOUNCE = {
  body:
    'id="PageContent"> Burmistrz Miasta Rawa Mazowiecka ogłasza ustny przetarg nieograniczony na sprzedaż nieruchomości, położonej w obrębie 5 miasta Rawa Mazowiecka przy ul. Jeziorańskiego Przedmiotem ustnego przetargu nieograniczonego jest sprzedaż nieruchomości położonej w obrębie 5 miasta Rawa Mazowiecka przy ul. Jeziorańskiego, oznaczonej jako działka nr 38/1 o pow. 0,1927 ha (użytek gruntowy RIVa – grunty orne), uregulowanej w księdze wieczystej LD1R/00014488/3. Przetarg odbędzie się w dniu 6 czerwca 2023 r. o godz. 11.00 w siedzibie Urzędu Miasta Rawa Mazowiecka. Cena wywoławcza wynosi 237.021,00 zł brutto (192.700,00 zł netto + VAT 23% w kwocie 44.321,00 zł). Rawa Mazowiecka, dnia 28 kwietnia 2023 r. Ogłoszenie o przetargu ul. Jeziorańskiego.pdf (PDF)',
  attach: 'Ogłoszenie o przetargu ul. Jeziorańskiego.pdf',
};

// REAL BUG regression (price): the source itself typos the grosze comma as a
// THIRD dot — "53.197.50" (should be "53.197,50") — must parse as 53 197 zł,
// not a 100x-inflated 5 319 750. Also exhibits the same street/"Przedmiotem"
// run-on shape as Jeziorańskiego (bonus coverage, different parcel).
const SLONECZNA_ANNOUNCE = {
  body:
    'id="PageContent"> Burmistrz Miasta Rawa Mazowiecka ogłasza ustny przetarg nieograniczony na sprzedaż nieruchomości, położonej w obrębie 2 miasta Rawa Mazowiecka przy ul. Słonecznej Przedmiotem ustnego przetargu nieograniczonego jest sprzedaż nieruchomości położonej w obrębie 2 miasta Rawa Mazowiecka przy ul. Słonecznej, nr 319 o pow. 0,0173ha (użytek gruntowy B) dla której Sąd Rejonowy w Rawie Mazowieckiej prowadzi księgę wieczystą LD1R/00002593/5. Przetarg odbędzie się w dniu 29 marca 2023 r. o godz. 11.00 w siedzibie Urzędu Miasta Rawa Mazowiecka. Cena wywoławcza wynosi 53.197.50 zł brutto (43.250 zł netto + VAT23% - 9.947,50 zł). Warunkiem przystąpienia do przetargu jest wpłacenie wadium w PLN w wysokości: 5.000,00 zł, tytułem: „wadium – działka nr 319”. Rawa Mazowiecka, dnia 24 lutego 2023 r.',
  attach: '',
};

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, space-thousands, and the double-dot grosze typo', () => {
  assert.equal(parsePLN('110.000,00'), 110000);
  assert.equal(parsePLN('2 302 240,00'), 2302240);
  // REAL BUG (tresc=29982): source typos "," as "." before the grosze —
  // "53.197.50" must still parse as 53 197, not 5 319 750.
  assert.equal(parsePLN('53.197.50'), 53197);
  assert.equal(parsePLN('815.000,00'), 815000);
  assert.equal(parsePLN('brak'), null);
});

test('streetFromText: single word (Reymonta, both connector styles) and multi-word (Zamkowa-style) forms', () => {
  assert.equal(streetFromText(buildRecordText(REYMONTA_ANNOUNCE)), 'Reymonta'); // "– ul. Reymonta oraz …"
  assert.equal(streetFromText(buildRecordText(REYMONTA_RESULT)), 'Reymonta'); // "przy ul. Reymonta w Rawie …"
  assert.equal(streetFromText(buildRecordText(PRUSA_RESULT)), 'Bolesława Prusa'); // 2-word, comma-terminated
  assert.equal(streetFromText(buildRecordText(MURARSKA_ANNOUNCE)), 'Murarskiej'); // genitive, kept as-is
});

test('streetFromText: REAL BUG regressions — run-on sentences must not over-capture', () => {
  // "przy ul. Mszczonowskiej w sąsiedztwie …" — no comma; must stop before
  // the lowercase "w" rather than swallowing the rest of the sentence.
  assert.equal(streetFromText(buildRecordText(MSZCZONOWSKA_ANNOUNCE)), 'Mszczonowskiej');
  // "przy ul. Jeziorańskiego Przedmiotem ustnego …" — "Przedmiotem" is ALSO
  // capitalized (sentence-initial); must resolve via the doc's second,
  // comma-terminated mention, not glob the new sentence's first word.
  assert.equal(streetFromText(buildRecordText(JEZIORANSKIEGO_ANNOUNCE)), 'Jeziorańskiego');
  assert.equal(streetFromText(buildRecordText(SLONECZNA_ANNOUNCE)), 'Słonecznej');
});

test('roundFromText: word ordinals (not Roman numerals) — pierwszego=1, drugi=2', () => {
  assert.equal(roundFromText(buildRecordText(LEASE_ANNOUNCE_R1)), 1); // "Przedmiotem pierwszego ustnego przetargu"
  assert.equal(roundFromText(buildRecordText(MURARSKA_ANNOUNCE)), 2); // "ogłasza drugi ustny przetarg"
  assert.equal(roundFromText(buildRecordText(REYMONTA_ANNOUNCE)), null); // unstated (1st time) — not a parse failure
});

test('auctionDateFromText: future-tense "odbędzie się w dniu" (word-month), scoped', () => {
  assert.equal(auctionDateFromText(buildRecordText(BIALA_ANNOUNCE)), '2025-09-10');
  assert.equal(auctionDateFromText(buildRecordText(MURARSKA_ANNOUNCE)), '2024-01-16');
});

test('resultDateFromText: past-tense "W dniu … o godz. … przeprowadzono", scoped', () => {
  assert.equal(resultDateFromText(buildRecordText(BIALA_RESULT_SOLD)), '2025-09-10');
  assert.equal(resultDateFromText(buildRecordText(DZ167_RESULT_UNSOLD)), '2025-10-08');
});

test('startingPriceFromText: REAL BUG regression — a digit-excluding gap cannot cross the unit number', () => {
  // "Cena wywoławcza lokalu nr 1 wynosi 110.000,00 zł" — the "1" in "nr 1"
  // sits BETWEEN the keyword and the amount; a naive [^0-9] gap dies there.
  assert.equal(startingPriceFromText(buildRecordText(REYMONTA_ANNOUNCE)), 110000);
  assert.equal(startingPriceFromText(buildRecordText(BIALA_ANNOUNCE)), 273900);
  assert.equal(startingPriceFromText(buildRecordText(MURARSKA_ANNOUNCE)), 240000);
});

test('achievedPriceFromText: only when a buyer is named; null for unsold', () => {
  assert.equal(achievedPriceFromText(buildRecordText(BIALA_RESULT_SOLD)), 276900);
  assert.equal(achievedPriceFromText(buildRecordText(DZ167_RESULT_UNSOLD)), null);
  assert.equal(achievedPriceFromText(buildRecordText(PRUSA_RESULT)), 20300);
});

test('unitAreaFromText: usable area from the unit-scoped "nr N o pow." clause, not the piwnica', () => {
  // Reymonta lokal 1: "Lokal mieszkalny nr 1 o pow. 40 m 2 … piwnicą nr 1 …
  // o pow. 9 m 2" — must pick 40, never the cellar's 9.
  const [{ text: unit1 }] = splitAnnouncementUnits(buildRecordText(REYMONTA_ANNOUNCE));
  assert.equal(unitAreaFromText(unit1, '1'), 40);
});

test('gates: isSaleAuction / isLease / isResultDoc / isNegativeOutcome', () => {
  assert.equal(isSaleAuction(buildRecordText(REYMONTA_ANNOUNCE)), true);
  assert.equal(isLease(buildRecordText(REYMONTA_ANNOUNCE)), false);
  assert.equal(isSaleAuction(buildRecordText(LEASE_ANNOUNCE_R1)), false);
  assert.equal(isLease(buildRecordText(LEASE_ANNOUNCE_R1)), true);

  assert.equal(isResultDoc(buildRecordText(REYMONTA_RESULT)), true);
  assert.equal(isResultDoc(buildRecordText(BIALA_RESULT_SOLD)), true);
  // REAL BUG regression: the qualified-bidders procedural notice (future
  // tense throughout) must NOT look like a result.
  assert.equal(isResultDoc(buildRecordText(QUALIFIED_BIDDERS)), false);

  assert.equal(isNegativeOutcome(buildRecordText(DZ167_RESULT_UNSOLD)), true);
  assert.equal(isNegativeOutcome(buildRecordText(BIALA_RESULT_SOLD)), false);
});

test('kindFromText: mieszkalny / grunt / zabudowana / unknown (the "ograniczony" template quirk)', () => {
  assert.equal(kindFromText(buildRecordText(REYMONTA_ANNOUNCE)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(BIALA_ANNOUNCE)), 'grunt');
  assert.equal(kindFromText(buildRecordText(MURARSKA_ANNOUNCE)), 'zabudowana');
  // REAL BUG: the "przetarg ograniczony" RESULT template never says
  // "działka"/"niezabudowana"/"grunt" — classifyKind() genuinely can't tell,
  // and returns 'unknown'. parseResultDoc's isLandLike() compensates (see
  // the "parseResultDoc: PRUSA_RESULT" test below) rather than this
  // function lying about what the text actually says.
  assert.equal(kindFromText(buildRecordText(PRUSA_RESULT)), 'unknown');
});

// ----------------------------------------------------- multi-unit splitting

test('splitAnnouncementUnits: 3 windows for Reymonta, REAL BUG regression — no duplicate per unit', () => {
  // "dla lokalu nr 1" appears TWICE (the date clause AND the wadium clause) —
  // an earlier version treated every match as a new window boundary and
  // produced 6 windows (2 per flat); must dedupe to exactly 3.
  const units = splitAnnouncementUnits(buildRecordText(REYMONTA_ANNOUNCE));
  assert.deepEqual(units.map((u) => u.unit), ['1', '4', '5']);
  // Each window must carry its OWN price clause through to the next unit's
  // boundary (not truncated at the wadium re-mention of the same unit).
  assert.ok(units[0].text.includes('Cena wywoławcza lokalu nr 1 wynosi 110.000,00'));
  assert.ok(!units[0].text.includes('dla lokalu nr 4'));
});

test('splitResultUnits: 3 windows for Reymonta, each anchored on its own "W dniu … o godz." clause', () => {
  const units = splitResultUnits(buildRecordText(REYMONTA_RESULT));
  assert.deepEqual(units.map((u) => u.unit), ['1', '4', '5']);
  assert.ok(units[1].text.includes('Cena wywoławcza lokalu mieszkalnego nr 4 wynosiła 87 .000,00'));
  assert.ok(units[1].text.includes('uzyskano kwotę 88 .000,00'));
});

// ------------------------------------------------------------- active listings

test('parseAnnouncement: Reymonta 3-in-1 PENDING flat → 3 independent address-keyed records', () => {
  const recs = parseAnnouncement(buildRecordText(REYMONTA_ANNOUNCE));
  assert.equal(recs.length, 3);
  const [u1, u4, u5] = recs;
  assert.equal(u1.kind, 'mieszkalny');
  assert.equal(u1.address.key, 'reymonta|11|1'); // building "11" ONLY from the attachment name
  assert.equal(u1.area_m2, 40);
  assert.equal(u1.starting_price_pln, 110000);
  assert.equal(u1.auction_date, '2024-10-22');

  assert.equal(u4.address.key, 'reymonta|11|4');
  assert.equal(u4.area_m2, 31.28);
  assert.equal(u4.starting_price_pln, 87000);

  assert.equal(u5.address.key, 'reymonta|11|5');
  assert.equal(u5.area_m2, 31.88);
  assert.equal(u5.starting_price_pln, 53000);
});

test('parseAnnouncement: multi-parcel land (Biała, real fixture) → kind grunt, joined dzialka_nr', () => {
  const [rec] = parseAnnouncement(buildRecordText(BIALA_ANNOUNCE));
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '205/11, 206/12, 706/5');
  assert.equal(rec.area_m2, 830); // "łącznym obszarze 0,0830 ha" wins over summing parts
  assert.equal(rec.starting_price_pln, 273900);
  assert.equal(rec.auction_date, '2025-09-10');
});

test('parseAnnouncement: zabudowana WITH a resolvable address (Murarska round 2)', () => {
  const [rec] = parseAnnouncement(buildRecordText(MURARSKA_ANNOUNCE));
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'murarskiej|1|');
  assert.equal(rec.area_m2, 118);
  assert.equal(rec.starting_price_pln, 240000);
  assert.equal(rec.round, 2);
});

test('parseAnnouncement: lease (najem) never reaches an active listing — gated before parseAnnouncement runs', () => {
  const text = buildRecordText(LEASE_ANNOUNCE_R1);
  assert.equal(isSaleAuction(text), false);
  assert.equal(isLease(text), true);
});

// ----------------------------------------------------------------- result records

test('parseResultDoc: Reymonta 3-in-1 RESULT → 3 SOLD records', () => {
  const recs = parseResultDoc(buildRecordText(REYMONTA_RESULT), '2024-10-30', 'https://bip.rawamazowiecka.pl/redir,3477?tresc=32589');
  assert.equal(recs.length, 3);
  assert.deepEqual(
    recs.map((r) => [r.address.key, r.starting_price_pln, r.final_price_pln, r.outcome]),
    [
      ['reymonta|11|1', 110000, 111500, 'sold'],
      ['reymonta|11|4', 87000, 88000, 'sold'],
      ['reymonta|11|5', 53000, 53700, 'sold'],
    ],
  );
  assert.ok(recs.every((r) => r.auction_date === '2024-10-22'));
  assert.ok(recs.every((r) => r.source_url === 'https://bip.rawamazowiecka.pl/redir,3477?tresc=32589'));
});

test('parseResultDoc: multi-parcel land SOLD (Biała, single buyer "został")', () => {
  const [r] = parseResultDoc(buildRecordText(BIALA_RESULT_SOLD), null, 'x');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '205/11, 206/12, 706/5');
  assert.equal(r.starting_price_pln, 273900);
  assert.equal(r.final_price_pln, 276900);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2025-09-10');
});

test('parseResultDoc: land UNSOLD (2-parcel, wynikiem negatywnym) — fallbackDate wins (no explicit past-tense date needed beyond the body\'s own)', () => {
  const [r] = parseResultDoc(buildRecordText(DZ167_RESULT_UNSOLD), '2025-10-16', 'x');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '167, 166');
  assert.equal(r.area_m2, 2561);
  assert.equal(r.starting_price_pln, 815000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2025-10-08');
});

test('parseResultDoc: REAL BUG regression — "przetarg ograniczony" result (kind=unknown) still routes to land', () => {
  // classifyKind() returns 'unknown' for this template (no "działka"/
  // "grunt"/"niezabudowana" anywhere) — isLandLike() must still recognise
  // the "265 o pow. 0,0098 ha" shape and route it to land, not drop it.
  const [r] = parseResultDoc(buildRecordText(PRUSA_RESULT), null, 'x');
  assert.equal(kindFromText(buildRecordText(PRUSA_RESULT)), 'unknown');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '265');
  assert.equal(r.starting_price_pln, 20000);
  assert.equal(r.final_price_pln, 20300);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: REAL BUG regression — the qualified-bidders procedural notice returns [] (not a bogus 0-price result)', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(QUALIFIED_BIDDERS), null, 'x'), []);
});

test('parseResultDoc: lease result never reaches the output (isLease gate)', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(LEASE_RESULT_R1_UNSOLD), null, 'x'), []);
});

test('parseResultDoc: returns [] for a non-result (pending announcement) blob', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(REYMONTA_ANNOUNCE), null, 'x'), []);
});

// ----------------------------------------------------- crawl.js board + document shape

test('parseBoardRefs: extracts distinct tresc ids from the real board-list href shape', () => {
  // Mirrors the real board_3496 HTML shape: each notice is a
  // "wyswietl_wiecej_link" anchor to redir,<board>?tresc=<id> (verified live,
  // board 3496 / przetargi-2024 — 6 real notices, IDs 32411 down to 31750).
  const html = `
    <div class="akapit_skrot">… <a href="redir,3496?tresc=32411" class="wyswietl_wiecej_link">więcej &raquo;<span class="hide"> ()</span></a></div>
    <div class="akapit_skrot">… <a href="redir,3496?tresc=32402" class="wyswietl_wiecej_link">więcej &raquo;<span class="hide"> ()</span></a></div>
    <div class="akapit_skrot">… <a href="redir,3496?tresc=32411" class="wyswietl_wiecej_link">więcej &raquo;<span class="hide"> ()</span></a></div>`;
  assert.deepEqual(parseBoardRefs(html, '3496'), ['32411', '32402']); // dedup, in first-seen order
});

test('extractDoc: cuts BODY at the metryka footer and collects ATTACH names, REAL BUG regression on the boundary itself', () => {
  // Mirrors the real detail-page shape (verified live, tresc=32411):
  // PageContent > akapit body text > obiekt_pliki attachment list > metryka
  // footer (the "<div class=\"metryka_przycisk_wrapper\">" boundary). A
  // naive `indexOf('metryka_przycisk_wrapper')` cut lands MID-ATTRIBUTE,
  // inside that div's own opening tag, leaving a dangling, unclosed
  // "<div class=\"" fragment that the tag-stripper can't remove (no ">" to
  // match) — verified live on tresc=34834, where BODY used to end "…dnia
  // 29.05.2026 r. <div class=\"". extractDoc must back the cut up to a clean
  // tag boundary.
  const html = `<html><body>
    <div id="wrapperSectionPageContent"><div id="PageContent">
    <article><div class="system_anchor obiekt obiekt_akapit" id="akapit_1">Treść ogłoszenia. Cena wywoławcza wynosi 100.000,00 zł.</div>
    <div class="system_anchor obiekt obiekt_pliki" id="pliki_1"><ul><li class="pliki_box"><a href="plik,1,x.pdf" class="pliki_link"><span class="pliki_nazwa">ogłoszenie testowe.pdf</span></a></li></ul></div></article>
    </div>
    <div class="wrapperSectionContentBox standard_button"><section><div class="metryka_przycisk_wrapper"><h3>Metryka</h3>
    <li class="system_metryka_pozycja data_publikacji"><span class="system_metryka_kategoria">Data publikacji </span><span class="system_metryka_wartosc">2024-09-17 14:59</span></li>
    </div></section></div>
    <p id="wstecz_link_1">« wstecz</p>
    </body></html>`;
  const { body, attach, publishDate } = extractDoc(html);
  assert.ok(body.includes('Cena wywoławcza wynosi 100.000,00 zł.'));
  assert.ok(!body.includes('<div'), `body leaked an unclosed tag: ${JSON.stringify(body.slice(-40))}`);
  assert.ok(!body.includes('Metryka'), 'metryka footer must not leak into BODY');
  assert.equal(attach, 'ogłoszenie testowe.pdf');
  assert.equal(publishDate, '2024-09-17');
});
