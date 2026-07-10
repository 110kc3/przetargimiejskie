// Zgorzelec parser tests. Fixtures are the REAL title (board anchor text) + REAL
// article body (extractDocBody output) fetched live from zgorzelec.bip.info.pl on
// 2026-07-10, so every parser is groundtruthed against production data exactly
// like parse-naklo-nad-notecia.test.js / parse-chelmno.test.js.
//
//   iddok 18253 (idmp 32)  ul. Reymonta 32/1     — FLAT, round I, 180 000 zł,
//                          przetarg 26.08.2026, pow. 57,61 m² (decoys: 39,69 m²
//                          "pomieszczeń mieszkalnych" + 17,92 m² piwnica).
//   iddok 18255 (idmp 32)  ul. Warszawska 12/6A  — COMMERCIAL (lokal
//                          niemieszkalny), round I, 88 950 zł, 13.08.2026, 28,60 m².
//   iddok 18166 (idmp 32)  ul. Francuska, dz. 20/4 — LAND, round III, 270 850 zł,
//                          04.08.2026, 3933 m². Two groundtruthed traps:
//                          (a) PRIOR-ROUND history "Pierwszy przetarg odbył się
//                          dnia 21.01.2026 r. Drugi … 12.05.2026 r." must NOT win
//                          the round or the auction date; (b) the plot is
//                          ENCUMBERED by a pre-existing ag lease ("Działka … objęta
//                          jest umową dzierżawy gruntu rolnego") — isLease() must
//                          still return FALSE so this valid SALE is not dropped.
//   iddok 18192 (idmp 34)  ul. Migdałowa, dz. 11/3 — LAND RESULT, SOLD, round I,
//                          215 000 → 217 150 zł, 09.06.2026, buyer JOBCONSULT.
//
// Two real bugs were found writing these fixtures and fixed in parse.js:
//   * LAND_STREET_RE over-ran the terminator-less TITLE occurrence into the
//     article body (~120 chars) → garbage street; now length-bounded so the clean
//     BODY occurrence ("… przy ul. Francuskiej, który …") wins.
//   * isLease() matched a bare "dzierżaw", so a land SALE that merely notes an
//     existing lease encumbrance was skipped as a lease; now anchored on the lease
//     being the auction PURPOSE ("na/w/do dzierżawę", monthly rent).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isResultDoc,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  kindFromText,
  parsePLN,
} from '../src/cities/zgorzelec/parse.js';

// --------------------------------------------------------------- real fixtures

const FLAT_REYMONTA = {
  title: "Ogłoszenie o I ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego nr 1 położonego w Zgorzelcu przy ul. Reymonta 32",
  body: "OGŁOSZENIE BURMISTRZA MIASTA ZGORZELEC o I ustnym przetargu nieograniczonym na sprzedaż lokalu mieszkalnego nr 1 położonego w Zgorzelcu przy ul. Reymonta 32 wraz z udziałem w części gruntu, który odbędzie się w dniu 26 sierpnia 2026 r. o godz. 10:00 w siedzibie Urzędu Miasta Zgorzelec przy ul. Domańskiego 6 parter, sala nr 04 ( przejście przez budynek przy ul. Domańskiego 7). Przedmiotem przetargu jest nieruchomość stanowiąca własność Gminy Miejskiej Zgorzelec lokal mieszkalny nr 1 o pow. 57,61 m 2 , składający się z 2 pokoi, kuchni i WC na korytarzu układ pomieszczeń przechodni, 2 wejścia do lokalu z korytarza ( do kuchni lub do pokoju). Układ okien południe. Powierzchnia użytkowa pomieszczeń mieszkalnych lokalu wynosi 39,69 m 2 . Do lokalu przynależy piwnica o powierzchni użytkowej 17,92 m 2 . Standard wykończenia lokalu niski. Brak łazienki, brak c.o , WC na klatce schodowej . Ściany tynk zatarty na gładko bielony, stare płytki ceramiczne w obszarze roboczym w kuchni, panele ścienne drewnopodobne w WC. Sufity malowany tynk, na podłodze w kuchni ceramiczne płytki w pozostałych pomieszczeniach panele podłogowe. Okna PCV, drzwi zewnętrzne metalowe, wewnętrzne drewniane płytowe. Niekompletne instalacje elektryczna i wodno-kanalizacyjna. Instalacja gazowa zdemontowana ( istnieje możliwość podłączenia). Lokal od dłuższego czasu nie użytkowany, materiały wykończeniowe o znacznym zużyciu technicznym i funkcjonalnym, zawilgocenia i odbarwienia ścian , do remontu kapitalnego. Nabywca przyjmuje nieruchomość w stanie istniejącym. Udział w częściach wspólnych budynku oraz w działce nr 29 (Obręb IX, AM-4 o pow. 516 m²) wynosi 31,09 %. Przeznaczenie w planie: MN3 teren zabudowy mieszkaniowej, jednorodzinnej. CENA WYWOŁAWCZA NIERUCHOMOŚCI : 180.000,00 ZŁ * *Zwolnione z podatku VAT na podstawie art. 43 ust. 1 pkt 10 i art. 29a ust. 8 ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług (t.j. Dz. U. z 2022 r. poz. 931 z późn. zm.). Budynek przy ul. Reymonta 32 znajduje się w gminnej ewidencji zabytków. Dla nieruchomości zabudowanej budynkiem położonym w Zgorzelcu przy ul. Reymonta 32 Wydział V Ksiąg Wieczystych prowadzi księgę wieczystą nr JG1Z/00046381/9 . Forma sprzedaży : lokal i grunt na własność. Forma zapłaty: 100% wylicytowanej ceny nieruchomości płatne przed zawarciem aktu notarialnego. Wpłata za wylicytowaną nieruchomość winna znajdować się na koncie Urzędu Miasta Zgorzelec najpóźniej jeden dzień przed wyznaczonym terminem podpisania aktu notarialnego. Gmina Miejska Zgorzelec zawiadamia osobę ustaloną jako nabywcę lokalu o miejscu i terminie zawarcia umowy zbycia, najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargu. Termin zawarcia umowy zostanie uzgodniony z Nabywcą, a w razie nieosiągnięcia porozumienia w tej kwestii, miejsce i termin zawarcia umowy zostaną wyznaczone przez Gminę Miejską Zgorzelec. Wyznaczony termin nie może być krótszy niż 7 dni od dnia doręczenia zawiadomienia. W przypadku nieprzystąpienia Nabywcy do zawarcia umowy, tj. niestawienia się w miejscu i terminie podanych w zawiadomieniu lub braku wpłaty ceny nabycia lokalu do dnia zawarcia umowy, Burmistrz Miasta Zgorzelec odstąpi od zawarcia umowy, a wpłacone wadium nie podlega zwrotowi. Warunkiem przystąpienia do przetargu jest wniesienie przez uczestników przetargu wadium w pieniądzu. Wadium w wysokości 18.000,00 zł należy wnieść najpóźniej do dnia 19 sierpnia 2026 r . włącznie na konto Urzędu Miasta Zgorzelec Bank Pekao S.A. nr 75 1240 3464 1111 0010 6448 8461. W tytule wpłaty należy wpisać: Wadium na sprzedaż w przetargu lokalu mieszkalnego ul. Reymonta 32/1 . Za datę wniesienia wadium uważa się datę jego wpływu na konto urzędu. Wadium wniesione przez uczestnika, który wygra przetarg zostanie zaliczone na poczet ceny nabycia nieruchomości. Pozostałym osobom wadium zostaje zwrócone w ciągu 3 dni po przeprowadzeniu przetargu. Wadium przepada na rzecz Gminy Miejskiej Zgorzelec w razie uchylenia się uczestnika przetargu, który wygrał przetarg od zawarcia umowy sprzedaży (aktu notarialnego) w ustalonym miejscu i terminie. Uczestnik przetargu winien przedłożyć komisji przeprowadzającej przetarg dokument tożsamości oraz: - w przypadku osób innych niż osoby fizyczne konieczne jest dodatkowo przedłożenie aktualnego dokumentu (oryginał), z którego wynika upoważnienie do reprezentowania tego podmiotu, a gdy działa pełnomocnik, konieczne jest przedłożenie pełnomocnictwa w formie aktu notarialnego; - w przypadku małżonków posiadających wspólność ustawową (majątkową) do dokonywania czynności przetargowych konieczna jest obecność obojga małżonków lub jednego z nich ze stosownym pełnomocnictwem (oryginał) drugiego małżonka, zawierającym zgodę na uczestnictwo w przetargu w celu odpłatnego nabycia nieruchomości po cenie wylicytowanej przez małżonka biorącego udział w przetargu dotyczy również osób fizycznych prowadzących działalność gospodarczą; - w przypadku pełnomocników osób fizycznych , poza przypadkami wskazanymi powyżej, konieczne jest przedłożenie pełnomocnictwa w formie aktu notarialnego. Osoby przystępujące do przetargu zobowiązane będą do złożenia oświadczenia: o wyrażeniu zgody na przetwarzanie danych osobowych przez Gminę Miejską Zgorzelec w związku z przetargiem na sprzedaż nieruchomości; że znany jest im stan przedmiotu przetargu i nie wnoszą z tytułu stanu przedmiotu przetargu żadnych zastrzeżeń. Komisja dopuszcza do licytacji tylko tych uczestników, którzy złożyli dokumenty wymagane przez organizatora przetargu. Uczestnik, który spóźnił się na otwarcie przetargu nie zostanie dopuszczony do licytacji. Cudzoziemcy (w rozumieniu ustawy z dnia 24 marca 1920 r. o nabywaniu nieruchomości przez cudzoziemców t.j. Dz. U. 2017 poz. 2278) przed zawarciem umowy notarialnej uzyskać zezwolenie ministra właściwego do spraw wewnętrznych na nabycie nieruchomości w przypadku, gdy zezwolenie to jest wymagane. W przypadku nie uzyskania zezwolenia jw. przed zawarciem aktu notarialnego wadium przepada na rzecz Gminy Miejskiej Zgorzelec. Lokal wolny od obciążeń i zobowiązań. Nabywca przyjmuje nieruchomość w stanie istniejącym. Koszty notarialne i sądowe ponosi nabywca nieruchomości. Zastrzega się prawo odwołania przetargu z uzasadnionej przyczyny. W celu zapoznania się ze stanem nieruchomości należy kontaktować się z Administracją Domów Mieszkalnych w Zgorzelec, ul. Warszawska 1/218, tel. 663-930-063. Dodatkowe informacje: Urząd Miasta Zgorzelec ul. Domańskiego 7 Wydział Gospodarki Nieruchomościami (pok. 011), tel. 75-77-59-900 wew. 0174.",
};

const COMM_WARSZAWSKA = {
  title: "Ogłoszenie o I ustnym przetargu nieograniczonym na sprzedaż lokalu niemieszkalnego nr 6A położonego w Zgorzelcu przy ul. Warszawskiej 12",
  body: "OGŁOSZENIE BURMISTRZA MIASTA ZGORZELEC o I ustnym przetargu nieograniczonym na sprzedaż lokalu niemieszkalnego nr 6A położonego w Zgorzelcu przy ul. Warszawskiej 12 wraz z udziałem w gruncie, który odbędzie się w dniu 13 sierpnia 2026 r. o godz. 10:00 w siedzibie Urzędu Miasta Zgorzelec przy ul. Domańskiego 6 parter, sala nr 04 ( przejście przez budynek przy ul. Domańskiego 7). Przedmiotem przetargu Przedmiotem przetargu jest nieruchomość stanowiąca własność Gminy Miejskiej Zgorzelec: lokal niemieszkalny nr 6A o pow. 28,60 m 2 , położony na II piętrze budynku, układ okien jednostronny. Składający się z 2 pomieszczeń użytkowych, do których prowadzi wejście z klatki schodowej poprzez wspólny z sąsiednim lokalem niewielki korytarz, układ przechodni. Do lokalu przynależy WC położone na półpiętrze. - udział w gruncie dz. nr 61, Obr. VII, AM-1. Standard wykończenia lokalu niski. (materiały wykończeniowe o znacznym zużyciu technicznym i funkcjonalnym. Ściany- tapety, sufity- płyty styropianowe, drzwi stare drewniane lite, podłogi- panele podłogowe, okna stare drewniane podwójne. Standard użytkowy lokalu- słaby - brak c.o., brak instalacji wodno-kanalizacyjnej, pomieszczenia przechodnie. Lokal wyposażony jest w instalację elektryczną, ogrzewanie piecowe. Budynek po remoncie, wymienione pokrycie dachowe, odnowiona elewacja. Udział w częściach wspólnych budynku oraz w działce nr 61 (Obręb VII, AM-1 o pow. 252 m²) wynosi 3,96%. Przeznaczenie w planie: C13.MW-U teren zabudowy mieszkaniowej, wielorodzinnej oraz zabudowy usługowej. CENA WYWOŁAWCZA NIERUCHOMOŚCI : 88.950,00 ZŁ* *Zwolnione z podatku VAT na podstawie art. 43 ust. 1 pkt 10 i art. 29a ust. 8 ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług (t.j. Dz. U. z 2022 r. poz. 931 z późn. zm.). Budynek przy ul. Warszawskiej 12 znajduje się w gminnej ewidencji zabytków. Dla nieruchomości zabudowanej budynkiem położonym w Zgorzelcu przy ul. Warszawskiej 12 Wydział V Ksiąg Wieczystych prowadzi księgę wieczystą nr JG1Z/00017979/6 Forma sprzedaży : lokal i grunt na własność. Forma zapłaty: 100% wylicytowanej ceny nieruchomości płatne przed zawarciem aktu notarialnego. Wpłata za wylicytowaną nieruchomość winna znajdować się na koncie Urzędu Miasta Zgorzelec najpóźniej jeden dzień przed wyznaczonym terminem podpisania aktu notarialnego. Osoba ustalona jako nabywca nieruchomości zostanie powiadomiona o miejscu i terminie zawarcia umowy notarialnej. Warunkiem przystąpienia do przetargu jest wniesienie przez uczestników przetargu wadium w pieniądzu. Wadium w wysokości 7.000,00 zł należy wnieść najpóźniej do dnia 06.08.2026 r . włącznie na konto Urzędu Miasta Zgorzelec Bank Pekao S.A. nr 75 1240 3464 1111 0010 6448 8461. W tytule wpłaty należy wpisać: Wadium na sprzedaż w przetargu lokalu niemieszkalnego ul. Warszawska 12/6A . Za datę wniesienia wadium uważa się datę jego wpływu na konto urzędu. Wadium wniesione przez uczestnika, który wygra przetarg zostanie zaliczone na poczet ceny nabycia nieruchomości. Pozostałym osobom wadium zostaje zwrócone w ciągu 3 dni po przeprowadzeniu przetargu. Wadium przepada na rzecz Gminy Miejskiej Zgorzelec w razie uchylenia się uczestnika przetargu, który wygrał przetarg od zawarcia umowy sprzedaży (aktu notarialnego) w ustalonym miejscu i terminie. Uczestnik przetargu winien przedłożyć komisji przeprowadzającej przetarg dokument tożsamości oraz: - w przypadku osób innych niż osoby fizyczne konieczne jest dodatkowo przedłożenie aktualnego dokumentu (oryginał), z którego wynika upoważnienie do reprezentowania tego podmiotu, a gdy działa pełnomocnik, konieczne jest przedłożenie pełnomocnictwa w formie aktu notarialnego; - w przypadku małżonków posiadających wspólność ustawową (majątkową) do dokonywania czynności przetargowych konieczna jest obecność obojga małżonków lub jednego z nich ze stosownym pełnomocnictwem (oryginał) drugiego małżonka, zawierającym zgodę na uczestnictwo w przetargu w celu odpłatnego nabycia nieruchomości po cenie wylicytowanej przez małżonka biorącego udział w przetargu dotyczy również osób fizycznych prowadzących działalność gospodarczą; - w przypadku pełnomocników osób fizycznych , poza przypadkami wskazanymi powyżej, konieczne jest przedłożenie pełnomocnictwa w formie aktu notarialnego. Osoby przystępujące do przetargu zobowiązane będą do złożenia oświadczenia: o wyrażeniu zgody na przetwarzanie danych osobowych przez Gminę Miejską Zgorzelec w związku z przetargiem na sprzedaż nieruchomości; że znany jest im stan przedmiotu przetargu i nie wnoszą z tytułu stanu przedmiotu przetargu żadnych zastrzeżeń. Komisja dopuszcza do licytacji tylko tych uczestników, którzy złożyli dokumenty wymagane przez organizatora przetargu. Uczestnik, który spóźnił się na otwarcie przetargu nie zostanie dopuszczony do licytacji. Cudzoziemcy (w rozumieniu ustawy z dnia 24 marca 1920 r. o nabywaniu nieruchomości przez cudzoziemców t.j. Dz. U. 2017 poz. 2278) przed zawarciem umowy notarialnej uzyskać zezwolenie ministra właściwego do spraw wewnętrznych na nabycie nieruchomości w przypadku, gdy zezwolenie to jest wymagane. W przypadku nie uzyskania zezwolenia jw. przed zawarciem aktu notarialnego wadium przepada na rzecz Gminy Miejskiej Zgorzelec. Lokal wolny od obciążeń i zobowiązań. Nabywca przyjmuje nieruchomość w stanie istniejącym. Koszty notarialne i sądowe ponosi nabywca nieruchomości. Zastrzega się prawo odwołania przetargu z uzasadnionej przyczyny. W celu zapoznania się ze stanem nieruchomości należy kontaktować się z Administracją Domów Mieszkalnych w Zgorzelec, ul. Warszawska 1/218, tel. 663-930-063. Dodatkowe informacje: Urząd Miasta Zgorzelec ul. Domańskiego 7 Wydział Gospodarki Nieruchomościami (pok. 011), tel. 75-77-59-900 wew. 0174.",
};

const LAND_FRANCUSKA = {
  title: "Ogłoszenie o III ustnym przetargu nieograniczonym na sprzedaż nieruchomości niezabudowanej położonej w Zgorzelcu przy ul. Francuskiej",
  body: "OGŁOSZENIE BURMISTRZA MIASTA ZGORZELEC o III ustnym przetargu nieograniczonym na sprzedaż nieruchomości niezabudowanej, położonej w Zgorzelcu przy ul. Francuskiej, który odbędzie się w dniu 04.08.2026 r. o godz. 10.00 w siedzibie Urzędu Miasta Zgorzelec w sali nr 04, budynek przy ul. Domańskiego 6, parter, przejście przez budynek przy ul. Domańskiego 7. Pierwszy przetarg odbył się dnia 21.01.2026 r. Drugi przetarg odbył się dnia 12.05.2026 r. Przedmiotem przetargu jest nieruchomość niezabudowana. Działka Nr 20/4, Obręb X, AM-2 o pow. 3933 m 2 Cena wywoławcza: 270.850,00 zł* Wadium: 27.100,00 zł *Do ostatecznej ceny uzyskanej w przetargu doliczony zostanie należny podatek VAT. Księga wieczysta JG1Z/00015505/9 , w której wpisana jest nieruchomość w dziale III zawiera wpis ograniczonego prawa rzeczowego związanego z inną nieruchomością oraz wzmianki o wpisy służebności przesyłu dotyczące przedmiotowej nieruchomości. Działka ma nieregularny kształt, nieco zbliżony do liter L . Działka od strony wschodniej częściowo graniczy z gminną drogą wewnętrzną, częściowo z działkami użytkowanymi jako ogrody przydomowe, od strony północnej z działką niezabudowaną przeznaczoną pod zabudowę mieszkaniową, z pozostałych stron graniczy z terenami zieleni krajobrazowej (drzewostan liściasty). Działka we wschodnim obszarze dość nachylona, w zachodnim o niewielkim nachyleniu, spadek terenu w kierunku południowo-zachodnim, działka znajduje się poniżej poziomu przebiegającej obok ul. Francuskiej. Działka jest nieogrodzona, niezagospodarowana, porośnięta dziko rosnącą roślinnością niską, samosiejkami drzew i krzewów, na działce znajduje się kilka starszych drzew. Przez działkę przebiega linia napowietrzna kablowa energetyczna niskiego napięcia. Na etapie planowania zabudowy obiektami budowlanymi ww. nieruchomości należy wystąpić do TAURON Dystrybucja S.A. Wydziału Dokumentacji o uzgodnienie branżowe zgodnie z obowiązującymi w tym zakresie procedurami. Brak jest urządzeń dystrybucyjnej sieci gazowej. Przyłączenie instalacji gazowych obiektów projektowanych na działce może technicznie zostać zrealizowane poprzez włączenie do sieci gazowej średniego ciśnienia ułożonej w ul. Francuskiej, z zachowaniem wymogu uzyskania warunków Przyłączenia do sieci Gazowej w oparciu o Rozporządzenie Ministra Gospodarki z dnia 02 lipca 2010 r. w sprawie szczegółowych warunków funkcjonowania systemu gazowego. Po terenie działki przebiega kolektor sanitarny 500, należący do PWiK ,, Nysa Sp. z o.o., tłoczący ścieki z Przepompowni Ścieków przy ul. Francuskiej w stronę Oczyszczalni Ścieków w Jędrzychowicach. W pobliżu działki w pasie drogowym ul. Francuskiej przebiega sieć wodociągowa 80/ 100 oraz sieć kanalizacji sanitarnej 250 będąca własnością PWiK Nysa Sp. z o.o. Brak jest możliwości przyłączenia nieruchomości do kanalizacji sanitarnej w sposób grawitacyjny. W przypadku zamiaru przyłączenia działki do sieci kanalizacji sanitarnej konieczne będzie wybudowanie przez jej właściciela lokalnej przepompowni ścieków. Przyłączenie do sieci wod.-kan. będzie możliwe wyłącznie w przypadku planowania na przedmiotowej nieruchomości pojedynczego budynku. W przypadku podziału działki oraz planowania większej ilości budynków na przedmiotowej działce nie będzie możliwości przyłączenia do ww. sieci wod.-kan. Podłączenie nieruchomości będzie wiązało się z koniecznością budowy sieci. Z wnioskiem o wydanie technicznych warunków przyłączenia do sieci wod,-kan. oraz zapewnienie dostawy wody i odbiór ścieków, należy zwrócić się do PWiK Nysa Sp. z o.o. Wieloletni plan rozwoju i modernizacji urządzeń wod.-kan. PWiK Nysa Sp. z o.o. nie przewiduje budowy sieci wod.-kan. rejonie działki nr 20/4 (Obr. X, AM-2). W obrębie działki przebiega sieć kanalizacji deszczowej 250. Istnieje możliwość podłączenia do sieci poprzez zabudowę studni rewizyjnej na kolektorze głównym sieci deszczowej. Nie ma przeciwwskazań do uzyskania zgody na skomunikowanie działki z drogą publiczną ul. Francuską, za pośrednictwem drogi wewnętrznej stanowiącej dz. nr 25 ( Obr. X, AM 2 ). Na działce występują urządzenia stanowiące własność RFC Internet Sp. z o.o. w Bydgoszczy. Na terenie nieruchomości zostały ustanowione dwie służebności przesyłu na rzecz PWiK Nysa oraz RFC Internet Sp. z o.o. Działka. nr 20/4 (Obr. X, AM-2), objęta jest umową dzierżawy gruntu rolnego. Nowy właściciel (nabywca) przejmuje prawa i obowiązki zbywcy. Zgodnie z Rozporządzeniem nr 6 Wojewody Dolnośląskiego z dnia 21 maja 2025 r. w sprawie ustanowienia strefy ochronnej ujęcia wód podziemnych przy ul. Elizy Orzeszkowej w Zgorzelcu ogłoszonym w Dzienniku Urzędowym Województwa Dolnośląskiego dnia 22 maja 2025 r. , poz.2593 dz. nr 20/4 (Obr. X, AM-2) położona jest w granicach terenu ochrony pośredniej. Zgodnie z obowiązującym Miejscowym Planem Zagospodarowania Przestrzennego Dzielnicy Ujazd Południe w Zgorzelcu uchwalonym przez Radę Miasta Uchwałą Nr 175/2016 z dnia 28 czerwca 2016 roku, ogłoszoną w Dzienniku Urzędowym Województwa Dolnośląskiego dnia 20 lipca 2016 r.poz.3676, działka nr 20/4 ( Obr. X, AM-2 ) oznaczona jest symbolem A4.MN teren zabudowy mieszkaniowej jednorodzinnej. Na działce znajduje się nieprzekraczalna linia zabudowy. Przedmiotowa działka objęta jest granicą strefy OW obserwacji archeologicznej dla historycznej zabudowy Zgorzelca oraz granicą strefy ochrony konserwatorskiej historycznej zabudowy miasta i przedmieść Zgorzelca. Ponadto działka objęta jest obszarem, na którym prawdopodobieństwo powodzi jest niskie i wynosi raz na 500 lat oraz obszarem szczególnego zagrożenia powodzią prawdopodobieństwo przewyższenia Q1%. W przypadku gdy przebiegające sieci lub urządzenia występujące na nieruchomości kolidują z realizacją zamierzonej inwestycji nabywca zobowiązany jest do ich przełożenia własnym kosztem i staraniem, w uzgodnieniu z jednostkami branżowymi i właścicielami sieci. Korzystanie z wszelkich urządzeń infrastruktury komunalnej i technicznej wymaga uzgodnienia z dysponentem sieci i obciąża całkowicie nabywcę nieruchomości. Istniejące na nieruchomości urządzenia infrastruktury technicznej i komunalnej mogą być wykorzystywane przez nabywcę tylko i wyłącznie na warunkach określonych przez dysponenta tych urządzeń. Nabywca przyjmuje nieruchomość w stanie istniejącym. Forma zapłaty: 100% wylicytowanej ceny, płatne przed zawarciem aktu notarialnego. Wpłata za wylicytowaną nieruchomość winna znajdować się na koncie Urzędu Miasta Zgorzelec najpóźniej jeden dzień przed wyznaczonym terminem podpisania aktu notarialnego . Gmina Miejska Zgorzelec zawiadamia osobę ustaloną jako nabywcę nieruchomości o miejscu i terminie zawarcia umowy zbycia, najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargu. Termin zawarcia umowy zostanie uzgodniony z Nabywcą, a w razie nieosiągnięcia porozumienia w tej kwestii, miejsce i termin zawarcia umowy zostaną wyznaczone przez Gminę Miejską Zgorzelec. Wyznaczony termin nie może być krótszy niż 7 dni od dnia doręczenia zawiadomienia. W przypadku nieprzystąpienia Nabywcy do zawarcia umowy, tj. niestawienia się w miejscu i terminie podanych w zawiadomieniu lub braku wpłaty ceny nabycia nieruchomości do dnia zawarcia umowy, Burmistrz Miasta Zgorzelec odstąpi od zawarcia umowy, a wpłacone wadium nie podlega zwrotowi. Warunkiem przystąpienia do przetargu jest wniesienie przez uczestników przetargu wadium w pieniądzu. Wadium we wskazanej wysokości należy wnieść najpóźniej na 7 dni przed przetargiem tj. do dnia 28 lipca 2026 r. włącznie na konto Urzędu Miasta Zgorzelec Bank Pekao S.A. Nr 75 1240 3464 1111 0010 6448 8461. W tytule wpłaty należy wpisać: (Imię i nazwisko osób przystępujących do przetargu) Wadium na sprzedaż w przetargu nieruchomości dz. nr 20/4 (Obr. X, AM-2). Za datę wniesienia wadium uważa się datę jego wpływu na konto urzędu. Wadium wniesione przez uczestnika, który wygra przetarg zostanie zaliczone na poczet nabycia nieruchomości. Pozostałym osobom wadium zostaje zwrócone w ciągu 3 dni po przeprowadzeniu przetargu. Wadium przepada na rzecz Gminy Miejskiej Zgorzelec w razie uchylenia się uczestnika przetargu, który wygrał przetarg od zawarcia umowy sprzedaży (aktu notarialnego) w ustalonym miejscu i terminie. Uczestnik przetargu winien przedłożyć komisji przeprowadzającej przetarg dokument tożsamości oraz: - w przypadku osób innych niż osoby fizyczne konieczne jest dodatkowo przedłożenie aktualnego dokumentu (oryginał), z którego wynika upoważnienie do reprezentowania tego podmiotu, a gdy działa pełnomocnik, konieczne jest przedłożenie pełnomocnictwa w formie aktu notarialnego; - jeżeli małżonkowie posiadają rozdzielność majątkową, a jedno z nich upoważnia drugiego małżonka do działania w jego imieniu pełnomocnictwo do takich czynności należy sporządzić notarialnie; - w przypadku małżonków do dokonywania czynności przetargowych konieczna jest obecność obojga małżonków lub jednego z nich ze stosownym pełnomocnictwem (oryginał) drugiego małżonka, zawierającym zgodę na uczestnictwo w przetargu w celu odpłatnego nabycia nieruchomości dotyczy również osób fizycznych prowadzących działalność gospodarczą; - w przypadku pełnomocników osób fizycznych , poza przypadkami wskazanymi powyżej, konieczne jest przedłożenie pełnomocnictwa w formie aktu notarialnego. Osoby przystępujące do przetargu zobowiązane będą do złożenia oświadczenia: o wyrażeniu zgody na przetwarzanie danych osobowych przez Gminę Miejską Zgorzelec w związku z przetargiem na sprzedaż nieruchomości. że znany jest im stan przedmiotu przetargu i nie wnoszą z tytułu stanu przedmiotu przetargu żadnych zastrzeżeń; że zapoznały się z zapisami miejscowego planu zagospodarowania przestrzennego dla nieruchomości objętej przetargiem. Komisja dopuszcza do licytacji tylko tych uczestników, którzy złożą dokumenty wymagane przez organizatora przetargu. Uczestnik, który spóźnił się na otwarcie przetargu nie zostanie dopuszczony do licytacji. Cudzoziemcy (w rozumieniu ustawy z dnia 24 marca 1920 r. o nabywaniu nieruchomości przez cudzoziemców t.j. Dz. U. 2017, poz.2278 ) w przypadku wygrania przetargu zobowiązani są przed zawarciem umowy notarialnej uzyskać zezwolenie Ministra Spraw Wewnętrznych i Administracji na nabycie nieruchomości w przypadku, gdy zezwolenie to jest wymagane. W przypadku nie uzyskania zezwolenia jw. przed zawarciem aktu notarialnego wadium przepada na rzecz Gminy Miejskiej Zgorzelec. Nieruchomość sprzedawana na podstawie danych z ewidencji gruntów, wznowienie i okazanie granic na koszt i staraniem nabywcy. Zastrzega się prawo odwołania przetargu z uzasadnionej przyczyny. Koszty notarialne i sądowe ponosi nabywca. Dodatkowe informacje: Urząd Miasta Zgorzelec, ul. Domańskiego 6, tel. 75 77 59 900 wew. 0175. Miejscowy plan zagospodarowania przestrzennego do wglądu w Wydziale Gospodarki Przestrzennej i Architektury w Urzędzie Miasta Zgorzelec. Ogłoszenie będzie opublikowane na stronie www.zgorzelec.eu w zakładce Aktualności-Ogłoszenia, Biuletynie Informacji Publicznej w zakładce Przetargi-Ogłoszenia.",
};

const RESULT_MIGDALOWA = {
  title: "Informacja o wyniku I ustnego przetargu nieograniczonego na sprzedaż nieruchomości niezabudowanej położonej w Zgorzelcu przy ul. Migdałowej",
  body: "Informacja o wyniku przetargu Dnia 09.06.2026 roku o godz. 10:00 w budynku Urzędu Miasta Zgorzelec przy ul. Domańskiego 6, został przeprowadzony I ustny przetarg nieograniczony na sprzedaż nieruchomości niezabudowanej położonej przy ul. Migdałowej w Zgorzelcu, KW nr JG1Z/00024840/5 . Przetargiem objęto nw. działkę niezabudowaną: Działka Nr 11/3, Obręb II, AM-5 o pow. 1437 m 2 Cena wywoławcza: 215.000,00 zł* Wadium: 21.500,00 zł Liczba osób dopuszczonych do uczestniczenia w przetargu: 3. Liczba osób niedopuszczonych do uczestniczenia w przetargu: 0. 1. Najwyższa cena netto osiągnięta w przetargu za działkę nr 11/3 (Obr. II, AM-5) 217.150,00 zł. Firma ustalona jako nabywca nieruchomości: JOBCONSULT Sp. z o.o. z siedzibą w Zgorzelcu Informację o wyniku przetargu podano do publicznej wiadomości poprzez wywieszenie na tablicy ogłoszeń w Urzędzie Miasta Zgorzelec na okres 7 dni oraz na stronie internetowej BIP Urzędu Miasta Zgorzelec.",
};

const b = (f) => buildRecordText(f);

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands + grosze tail', () => {
  assert.equal(parsePLN('180.000,00'), 180000);
  assert.equal(parsePLN('88.950,00'), 88950);
  assert.equal(parsePLN('270.850,00'), 270850);
  assert.equal(parsePLN('217.150,00'), 217150);
  assert.equal(parsePLN('215.000,00'), 215000);
  assert.equal(parsePLN('brak'), null);
});

test('doc-type gates: isSaleAuction / isResultDoc split by board', () => {
  assert.equal(isSaleAuction(b(FLAT_REYMONTA)), true);
  assert.equal(isSaleAuction(b(COMM_WARSZAWSKA)), true);
  assert.equal(isSaleAuction(b(LAND_FRANCUSKA)), true);
  assert.equal(isResultDoc(b(FLAT_REYMONTA)), false);
  assert.equal(isResultDoc(b(LAND_FRANCUSKA)), false);
  assert.equal(isResultDoc(b(RESULT_MIGDALOWA)), true);
});

test('isLease: an existing-lease ENCUMBRANCE on a land SALE is not a lease', () => {
  // Francuska body: "Działka … objęta jest umową dzierżawy gruntu rolnego."
  assert.equal(isLease(b(LAND_FRANCUSKA)), false);
  assert.equal(isLease(b(FLAT_REYMONTA)), false);
  assert.equal(isLease(b(COMM_WARSZAWSKA)), false);
});

test('roundFromText: current-auction roman only, prior-round history ignored', () => {
  assert.equal(roundFromText(b(FLAT_REYMONTA)), 1);
  assert.equal(roundFromText(b(COMM_WARSZAWSKA)), 1);
  // III ustny przetarg — NOT the "Pierwszy/Drugi przetarg odbył się …" history.
  assert.equal(roundFromText(b(LAND_FRANCUSKA)), 3);
  assert.equal(roundFromText(b(RESULT_MIGDALOWA)), 1);
});

test('auctionDateFromText: future "odbędzie się" / result "Dnia … przeprowadzony"', () => {
  assert.equal(auctionDateFromText(b(FLAT_REYMONTA)), '2026-08-26');
  assert.equal(auctionDateFromText(b(COMM_WARSZAWSKA)), '2026-08-13');
  // 04.08.2026, NOT the past-tense history 21.01.2026 / 12.05.2026.
  assert.equal(auctionDateFromText(b(LAND_FRANCUSKA)), '2026-08-04');
  assert.equal(auctionDateFromText(b(RESULT_MIGDALOWA)), '2026-06-09');
});

test('startingPriceFromText: nominative cena wywoławcza, not wadium', () => {
  assert.equal(startingPriceFromText(b(FLAT_REYMONTA)), 180000);
  assert.equal(startingPriceFromText(b(COMM_WARSZAWSKA)), 88950);
  assert.equal(startingPriceFromText(b(LAND_FRANCUSKA)), 270850);
  assert.equal(startingPriceFromText(b(RESULT_MIGDALOWA)), 215000);
});

test('achievedPriceFromText: only when a buyer is named', () => {
  assert.equal(achievedPriceFromText(b(RESULT_MIGDALOWA)), 217150);
  assert.equal(achievedPriceFromText(b(FLAT_REYMONTA)), null);
  assert.equal(achievedPriceFromText(b(LAND_FRANCUSKA)), null);
});

test('unitAreaFromText: unit area, not the room-breakdown/piwnica decoys', () => {
  assert.equal(unitAreaFromText(b(FLAT_REYMONTA)), 57.61);
  assert.equal(unitAreaFromText(b(COMM_WARSZAWSKA)), 28.6);
});

test('kindFromText: title-first classification', () => {
  assert.equal(kindFromText(b(FLAT_REYMONTA)), 'mieszkalny');
  assert.equal(kindFromText(b(COMM_WARSZAWSKA)), 'uzytkowy');
  assert.equal(kindFromText(b(LAND_FRANCUSKA)), 'grunt');
  assert.equal(kindFromText(b(RESULT_MIGDALOWA)), 'grunt');
});

// ------------------------------------------------------------- active listings

test('parseAnnouncement: FLAT Reymonta 32/1 → address-keyed active record', () => {
  const r = parseAnnouncement(b(FLAT_REYMONTA));
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Reymonta 32/1');
  assert.equal(r.address.key, 'reymonta|32|1');
  assert.equal(r.address.building, '32');
  assert.equal(r.address.apt, '1');
  assert.equal(r.area_m2, 57.61);
  assert.equal(r.starting_price_pln, 180000);
  assert.equal(r.auction_date, '2026-08-26');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: COMMERCIAL Warszawska 12/6A (lokal niemieszkalny)', () => {
  const r = parseAnnouncement(b(COMM_WARSZAWSKA));
  assert.equal(r.kind, 'uzytkowy');
  assert.equal(r.address_raw, 'Warszawskiej 12/6A');
  assert.equal(r.address.building, '12');
  assert.equal(r.address.apt, '6A');
  assert.equal(r.area_m2, 28.6);
  assert.equal(r.starting_price_pln, 88950);
  assert.equal(r.auction_date, '2026-08-13');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: LAND Francuska dz. 20/4 → parcel-keyed grunt (kept despite lease encumbrance)', () => {
  const r = parseAnnouncement(b(LAND_FRANCUSKA));
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '20/4');
  assert.equal(r.area_m2, 3933);
  assert.equal(r.address_raw, 'Francuskiej');
  assert.equal(r.starting_price_pln, 270850);
  assert.equal(r.auction_date, '2026-08-04');
  assert.equal(r.round, 3);
});

// ----------------------------------------------------------------- result records

test('parseResultDoc: Migdałowa dz. 11/3 SOLD (215 000 → 217 150 zł, buyer named)', () => {
  const [r] = parseResultDoc(
    b(RESULT_MIGDALOWA),
    '2026-06-09',
    'https://zgorzelec.bip.info.pl/dokument.php?iddok=18192&idmp=34&r=r',
  );
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '11/3');
  assert.equal(r.area_m2, 1437);
  assert.equal(r.address_raw, 'Migdałowej');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 215000);
  assert.equal(r.final_price_pln, 217150);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2026-06-09');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: an announcement (not a wynik) yields no result record', () => {
  assert.deepEqual(parseResultDoc(b(FLAT_REYMONTA), null, 'x'), []);
});
