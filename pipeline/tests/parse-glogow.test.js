// Głogów parser tests. Fixtures are REAL captured documents fetched live
// from glogow.bip.info.pl's /api/fo/ JSON:API (2026-07-19/20, insecure-TLS —
// the host ships an incomplete cert chain; see crawl.js): each fixture's
// `title` is the article's own metadata title and `body` is the FULL
// `pdftotext -layout` output of ONE attachment PDF, fed through
// parse.buildRecordText() exactly as crawl.js does, so every parser below is
// groundtruthed against production data. See parse.js's header for the
// document-structure story these fixtures pin down (multi-LOT announcements
// vs multi-ATTACHMENT results, word-ordinal rounds, the prior-round-history
// and zoning-boilerplate decoys).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  splitLots,
  isSaleAuction,
  isLease,
  isAnnouncement,
  isResultDoc,
  isQualifiedBiddersList,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  addressRawFromText,
  landStreetFromText,
  landPlotFromText,
  kindFromText,
  parsePLN,
} from '../src/cities/glogow/parse.js';

// --------------------------------------------------------------- real fixtures

// ANNOUNCEMENT, single-lot flat, round III (word ordinal "trzeci") —
// Rzemieślniczej 21a/9, 345 000 zł, 47,75 m², przetarg 15.09.2026. Carries
// the prior-round HISTORY decoy in item 16 ("Pierwszy przetarg … odbył się
// w dniu 31 marca 2026 r., a drugi w dniu 9 czerwca 2026 r.") that the
// round + date parsers must not trip on, and the EUR-conversion decoy
// ("tj. 80500,27 euro") right after the price.
const ANN_RZEMIESLNICZA = {
  title: `PREZYDENT MIASTA GŁOGOWA ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w Głogowie przy ul. Rzemieślniczej 21a/9.`,
  body: `WRM.DGiGG.6840.5.13.2026

PREZYDENT MIASTA GŁOGOWA
ogłasza trzeci przetarg ustny nieograniczony
na sprzedaż lokalu mieszkalnego nr 9, położonego na II piętrze (3 kondygnacji)
w budynku mieszkalnym, wielolokalowym przy ul. Rzemieślniczej 21a w Głogowie,
o powierzchni użytkowej 47,75 m2, ujawnionego w księdze wieczystej
nr LE1G/00094182/5 wraz z udziałem 48/2740 w częściach wspólnych budynku
i w prawie własności działki gruntu oznaczonej nr geod. 667/3 obręb 9 „Żarków”,
o powierzchni 1705 m2, ujawnionej w księdze wieczystej nr LE1G/00091297/3,
przeznaczonej na zabudowę mieszkaniową wielorodzinną.


W skład lokalu wchodzą: pokój, pokój z aneksem kuchennym, łazienka z wc
i przedpokój. Brak pomieszczeń przynależnych. Mieszkanie jest dwustronne,
środkowe, z balkonem, okna umieszczone są od strony wschodniej i zachodniej.
Lokal wyposażony jest w pełni w urządzenia komunalne, tj. w instalacje:
wodociągową, kanalizacyjną, elektryczną, gazową. Centralne ogrzewanie etażowe
i ciepła woda użytkowa poprzez kocioł gazowy dwufunkcyjny.


Cena wywoławcza: 345000,00 zł (słownie: trzysta czterdzieści pięć tysięcy złotych
00/100), tj. 80500,27 euro według średniego kursu NBP ogłoszonego na dzień
3 lipca 2026 r. (1 EUR = 4,2857).
Wadium: 30000,00 zł (słownie: trzydzieści tysięcy złotych 00/100).
Minimalne postąpienie: 3450,00 zł (słownie: trzy tysiące czterysta pięćdziesiąt złotych
00/100).


1. Przetarg odbędzie się w dniu 15 września 2026 r. o godz. 11:30 w sali nr 114
   Urzędu Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.
2. W przetargu mogą brać udział osoby fizyczne i prawne, które w wyznaczonym
   terminie wniosą wadium i przedłożą Komisji przetargowej w dniu przetargu:
   1) w przypadku osoby fizycznej: dokument stwierdzający tożsamość
      i oświadczenie o niepodleganiu wykluczeniu z przetargu na mocy art. 24fa
      ust. 1 pkt 2 ustawy z dnia 8 marca 1990 r. o samorządzie gminnym (t. j. Dz. U.
      z 2026 r., poz. 662): „wójtowie, zastępcy wójtów, radni, małżonkowie wójtów,
      zastępców wójtów, radnych, a także osoby pozostające we wspólnym pożyciu
      z wójtami, zastępcami wójtów, radnymi, nie mogą nabywać własności lokali
WRM.DGiGG.6840.5.13.2026

      mieszkalnych stanowiących mieszkaniowy zasób gminy, w której wójt
      lub zastępca wójta pełni funkcję lub radny uzyskał mandat”;
   2) w przypadku osoby prawnej lub innej jednostki podlegającej obowiązkowi
      wpisu do KRS: dokument stwierdzający tożsamość osoby reprezentującej
      podmiot, odpis/wydruk z KRS (ważny 3 miesiące), uchwałę wyrażającą zgodę
      na nabycie lokalu;
   3) w pozostałych przypadkach: stosowne dokumenty, np. umowy, uchwały,
      zaświadczenia oraz dokument stwierdzający tożsamość osoby upoważnionej
      do nabycia lokalu;
   4) w przypadku pełnomocnika: dokument stwierdzający tożsamość
      oraz pełnomocnictwo notarialne lub z poświadczonym podpisem mocodawcy.
3. Nabycie lokalu przez cudzoziemca może nastąpić w przypadku uzyskania
   zezwolenia ministra właściwego do spraw wewnętrznych, jeżeli wymagają tego
   przepisy ustawy z dnia 24 marca 1920 r. o nabywaniu nieruchomości
   przez cudzoziemców (t. j. Dz. U. z 2017 r., poz. 2278). Cudzoziemiec
   zobowiązany jest do ustalenia we własnym zakresie, czy nabycie lokalu
   będącego przedmiotem przetargu wymaga uzyskania zezwolenia.
4. Wadium w podanej wysokości należy wpłacić na rachunek Gminy Miejskiej
   Głogów: BNP Paribas Bank Polska S.A. nr 65 2030 0045 1110 0000 0192 9720,
   z dopiskiem: „wadium na lokal przy ul. Rzemieślniczej 21a/9”, w terminie
   nie później niż do dnia 9 września 2026 r. Za datę wpłacenia wadium uważa się
   wpływ wymaganej kwoty na rachunek Gminy Miejskiej Głogów.
   1) Wadium zwraca się niezwłocznie, jednak nie później niż przed upływem 3 dni
      od dnia, odpowiednio: odwołania przetargu, zamknięcia przetargu,
      unieważnienia przetargu lub zakończenia przetargu wynikiem negatywnym.
      Wadium zwraca się przelewem na rachunek podany przez uczestnika
      przetargu.
   2) Wadium wpłacone przez uczestnika przetargu, który przetarg wygrał,
      zalicza się na poczet ceny nabycia lokalu. Zaliczenie wadium na poczet ceny
      nabycia lokalu nastąpi w dniu zamknięcia przetargu.
   3) Wpłacone wadium nie podlega zwrotowi w razie uchylenia się osoby,
      która przetarg wygrała, od zawarcia umowy sprzedaży.
5. Przetarg jest ważny bez względu na liczbę uczestników przetargu, jeżeli
   przynajmniej jeden uczestnik zaoferuje co najmniej jedno postąpienie powyżej
WRM.DGiGG.6840.5.13.2026

   ceny wywoławczej. O wysokości postąpienia decydują uczestnicy przetargu,
   z tym że postąpienie nie może wynosić mniej niż 1% ceny wywoławczej,
   z zaokrągleniem w górę do pełnych dziesiątek złotych.
6. Organizator przetargu jest obowiązany zawiadomić osobę ustaloną jako nabywca
   lokalu o miejscu i terminie zawarcia umowy sprzedaży, najpóźniej w ciągu 21 dni
   od dnia rozstrzygnięcia przetargu. Jeżeli osoba ustalona jako nabywca lokalu
   nie przystąpi bez usprawiedliwienia do zawarcia umowy w miejscu i w terminie
   podanych w zawiadomieniu, Organizator przetargu może odstąpić od zawarcia
   umowy, a wpłacone wadium nie podlega zwrotowi.
7. Termin uiszczenia ceny sprzedaży lokalu, pomniejszonej o wpłacone wadium,
   upływa w dniu zawarcia aktu notarialnego. O dotrzymaniu terminu płatności
   decyduje data wpływu wymaganej należności na rachunek Gminy Miejskiej
   Głogów.
8. Koszty zawarcia aktu notarialnego i koszty sądowe ponosi w całości nabywca
   lokalu.
9. Wydanie lokalu nastąpi po zawarciu aktu notarialnego, na podstawie protokołu
   zdawczo-odbiorczego spisanego pomiędzy Zakładem Gospodarki Mieszkaniowej
   a nabywcą lokalu. Nabywca przejmie lokal w stanie istniejącym.
10. Przed przystąpieniem do przetargu należy zapoznać się z dokumentacją
   dotyczącą lokalu oraz z warunkami przetargu podanymi w ogłoszeniu o przetargu.
11. Prawa i obowiązki właścicieli lokali oraz sposób zarządu nieruchomością wspólną
   określają odpowiednio rozdziały 3 i 4 ustawy z dnia 24 czerwca 1994 r.
   o własności lokali (t. j. Dz. U. z 2026 r., poz. 232), między innymi:
   1) Właściciel ponosi wydatki związane z utrzymaniem jego lokalu,
      jest obowiązany utrzymywać swój lokal w należytym stanie, przestrzegać
      porządku domowego, uczestniczyć w kosztach zarządu związanych
      z utrzymaniem nieruchomości wspólnej, korzystać z niej w sposób
      nieutrudniający korzystania przez innych współwłaścicieli oraz współdziałać
      z nimi w ochronie wspólnego dobra.
   2) Na koszty zarządu nieruchomością wspólną składają się w szczególności:
      a) wydatki na remonty i bieżącą konserwację;
      b) opłaty za dostawę energii elektrycznej i cieplnej, gazu i wody, w części
             dotyczącej nieruchomości wspólnej, oraz opłaty za antenę zbiorczą
             i windę;
WRM.DGiGG.6840.5.13.2026

      c) ubezpieczenia, podatki i inne opłaty publicznoprawne, chyba że są
          pokrywane bezpośrednio przez właścicieli poszczególnych lokali;
      d) wydatki na utrzymanie porządku i czystości;
      e) wynagrodzenie członków zarządu i zarządcy.
12. Na pokrycie kosztów zarządu właściciele lokali uiszczają zaliczki w formie
   bieżących opłat, płatne z góry do dnia 10-tego każdego miesiąca. Szczegółowe
   informacje dot. aktualnej wysokości zaliczki należy uzyskać od Zarządcy
   Wspólnoty Mieszkaniowej, tj. „DOMATOR” Zarządzanie nieruchomościami
   Ewa Kuć-Brzonkalik, ul. Słowiańska 16, 67-200 Głogów, tel. 76/ 8322764.
13. Oględzin lokalu można dokonać po uprzednim uzgodnieniu z Administracją
   Domów Mieszkalnych Rejon „HUTNIK” w Głogowie, ul. Norwida 1,
   67-200 Głogów, tel. 76/ 8531190.
14. W dziale III księgi wieczystej nr LE1G/00094182/5 prowadzonej
   dla przedmiotowego lokalu wpisane jest:
   1) Roszczenie dotychczasowego właściciela gruntu o roczną opłatę
      przekształceniową w odniesieniu do każdoczesnego właściciela
      nieruchomości na podstawie ustawy z dnia 20 lipca 2018 r. o przekształceniu
      prawa użytkowania wieczystego gruntów zabudowanych na cele
      mieszkaniowe w prawo własności tych gruntów.
   2) Ostrzeżenie o niezgodności treści księgi z rzeczywistym stanem prawnym
      skierowane przeciwko prawu Marcina Piotra Baleja, a przysługujące
      spadkobiercom – właścicielem lokalu jest Gmina Miejska Głogów
      na podstawie prawomocnego postanowienia Sądu Rejonowego w Głogowie
      sygn. akt I Ns 914/21 z dnia 24 sierpnia 2022 r. wydanego w sprawie
      o stwierdzenie nabycia spadku po Marcinie Piotrze Baleja. Ponadto
      w wyżej powołanej księdze wieczystej błędnie wpisane zostało położenie
      lokalu, tj. na drugiej kondygnacji, co jest niezgodne ze stanem faktycznym.
15. Prezydent Miasta Głogowa zastrzega sobie prawo odwołania przetargu jedynie
   z ważnych powodów, informując o tym niezwłocznie w formie właściwej
   dla ogłoszenia o przetargu i podając przyczynę odwołania przetargu.
16. Pierwszy przetarg ustny nieograniczony na sprzedaż przedmiotowego lokalu
   odbył się w dniu 31 marca 2026 r., a drugi w dniu 9 czerwca 2026 r.
17. Dodatkowych informacji udziela: Dział Geodezji i Gospodarki Gruntami Urzędu
   Miejskiego w Głogowie, Rynek 10, 67-200 Głogów, pokój 215, tel. 76/ 7265453.
WRM.DGiGG.6840.5.13.2026



Z upoważnienia Prezydenta Miasta
/-/
Piotr Poznański
Zastępca Prezydenta


Głogów, 2026-07-06


 RODO
 Klauzula informacyjna dotycząca przetwarzania danych osobowych.
 Tożsamość         Prezydent Miasta Głogowa
 i dane            Rynek 10, 67-200 Głogów
 kontaktowe        e-mail: prezydent@glogow.um.gov.pl
 administratora:   tel. +48 76/ 7265401
 Dane              Rynek 10, 67-200 Głogów
 kontaktowe        e-mail: iod@glogow.um.gov.pl
 inspektora        tel. +48 76/ 7265471
 ochrony danych
 osobowych:
 Cel               Realizacja czynności związanych ze zbyciem lokalu w drodze
 przetwarzania:    przetargu.
 Kategorie         Dane identyfikacyjne oraz dane kontaktowe.
 danych
 osobowych:
 Źródło danych:    Druga strona umowy lub osoba, której dane dotyczą.
 Podstawa          1. Art. 6 ust. 1 lit. b RODO – przetwarzanie jest niezbędne
 prawna               do wykonania umowy, której stroną jest osoba, której dane
 przetwarzania        dotyczą lub do podjęcia działań na żądanie osoby, której
 danych               dane dotyczą, przed zawarciem umowy.
 osobowych:        2. Art. 6 ust. 1 lit. c RODO – przetwarzanie jest niezbędne
                      do wypełnienia obowiązku prawnego ciążącego
                      na administratorze, wynikającego z przepisów:
WRM.DGiGG.6840.5.13.2026


                  1) rozporządzenia Rady Ministrów z dnia 14 września
                      2004 r. w sprawie sposobu i trybu przeprowadzania
                      przetargów oraz rokowań na zbycie nieruchomości;
                  2) ustawy z dnia 21 sierpnia 1997 r. o gospodarce
                      nieruchomościami;
                  3) ustawy z dnia 6 lipca 1982 r. o księgach wieczystych
                      i hipotece;
                  4) ustawy z dnia 27 sierpnia 2009 r. o finansach publicznych
                      (do celu księgowania, windykacji i egzekucji zobowiązań);
                  5) ustawy z dnia 17 listopada 1964 r. Kodeks postępowania
                      cywilnego;
                  6) uchwały nr IV/24/2024 Rady Miejskiej w Głogowie z dnia
                      26 czerwca 2024 r. w sprawie zasad gospodarowania
                      nieruchomościami stanowiącymi własność Gminy
                      Miejskiej Głogów.
               3. Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes
                  realizowany przez administratora w celu realizacji umowy,
                  ustalenia i dochodzenia ewentualnych roszczeń.
Odbiorcy       Do Pani/Pana danych osobowych będą mieć dostęp:
danych:           -   upoważnieni pracownicy Urzędu Miejskiego w Głogowie
                      oraz Zakładu Gospodarki Mieszkaniowej w Głogowie;
                  -   podmioty, które mają dostęp do danych osobowych
                      na podstawie zawartej umowy na świadczenie usługi,
                      tj.: MICOMP Systemy Komputerowe z siedzibą
                      w Katowicach, COIG S.A. z siedzibą w Gliwicach,
                      Kancelaria Radcy Prawnego z siedzibą w Głogowie;
                  -   podmioty, którym administrator przekazuje dane
                      na podstawie przepisów prawa, tj.: Urząd Skarbowy
                      w Głogowie, Sąd Rejonowy w Głogowie V Wydział Ksiąg
                      Wieczystych, Powiatowy Ośrodek Dokumentacji
                      Geodezyjnej i Kartograficznej w Głogowie;
                  -   inni administratorzy danych: „DOMATOR” Zarządzanie
                      nieruchomościami Ewa Kuć-Brzonkalik z siedzibą
WRM.DGiGG.6840.5.13.2026


                         w Głogowie, BNP Paribas Bank Polska SA z siedzibą
                         w Warszawie, kancelaria notarialna, kurierzy itp.
Okres             Akta sprawy stanowią materiały archiwalne i będą
przechowywania przechowywane przez okres 25 lat, licząc od stycznia kolejnego
danych:           roku po zakończeniu sprawy. Następnie zostaną przekazane
                  do Archiwum Państwowego, gdzie będą przechowywane
                  wieczyście.
Prawa             Przysługuje Pani/Panu prawo dostępu do Pani/Pana danych,
podmiotów         prawo żądania ich sprostowania i prawo do ograniczenia
danych:           ich przetwarzania w zakresie dopuszczonym przez przepisy
                  prawa. W celu skorzystania ze swoich praw należy
                  skontaktować się z inspektorem ochrony danych.
Prawo             Przysługuje Pani/Panu prawo do wniesienia sprzeciwu,
do sprzeciwu:     z przyczyn związanych ze szczególną sytuacją, wobec
                  przetwarzania danych osobowych.
Prawo             Przysługuje Pani/Panu prawo wniesienia skargi do organu
wniesienia        nadzorczego, tj. do Prezesa Urzędu Ochrony Danych
skargi            Osobowych.
do organu
nadzorczego:
Informacja        Podanie danych osobowych jest wymogiem ustawowym.
o dowolności      Brak podania danych obligatoryjnych skutkować będzie brakiem
lub obowiązku     realizacji w/w celu.
podania danych:
`,
};

// ANNOUNCEMENT, MULTI-LOT (three flats bundled in ONE attachment PDF, each
// opened by its own "Samodzielny lokal mieszkalny nr N" marker; round I in
// the PLURAL "pierwsze przetargi ustne"; ONE shared session "Przetargi
// odbędą się w dniu 6 lipca 2026 r.") — Wały Bolesława Chrobrego 6/13
// (240 000 zł, 70,49 m²), 6/14 (260 000 zł, 77,42 m²), 6/15 (180 000 zł,
// 47,47 m²).
const ANN_CHROBREGO = {
  title: `PREZYDENT MIASTA GŁOGOWA ogłasza pierwsze przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych położonych w Głogowie przy ul. Wały Bolesława Chrobrego 6.`,
  body: `WRM.DGiGG.6840.5.9.2026.JSz

PREZYDENT MIASTA GŁOGOWA
ogłasza
pierwsze przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych
położonych w Głogowie przy ul. Wały Bolesława Chrobrego 6.


1.
Samodzielny lokal mieszkalny nr 13, położony na IV piętrze w budynku mieszkalnym,
wielorodzinnym przy ul. Wały Bolesława Chrobrego 6 w Głogowie, o powierzchni
użytkowej 70,49 m2 wraz z udziałem 670/10000 w częściach wspólnych budynku
i w prawie własności działki gruntu oznaczonej nr geod. 96 obręb 7 „Stare Miasto”,
o powierzchni 318 m2, ujawnionej w księdze wieczystej nr LE1G/00021742/7.
W skład lokalu wchodzą: 2 pokoje, kuchnia, jadalnia, łazienka z wc i przedpokój.
Lokal wymaga kompleksowego remontu.
Cena wywoławcza: 240000,00 zł (słownie: dwieście czterdzieści tysięcy złotych
00/100), tj. 56663,92 euro wg średniego kursu NBP ogłoszonego na dzień 28 maja
2026 r. (1 EUR = 4,2355). Podana cena wywoławcza nie obejmuje 8% podatku VAT,
który będzie doliczony do ceny wylicytowanej w przetargu.
Wadium: 20000,00 zł (słownie: dwadzieścia tysięcy złotych 00/100).
Minimalne postąpienie: 2400,00 zł (słownie: dwa tysiące czterysta złotych 00/100).


2.
Samodzielny lokal mieszkalny nr 14, położony na IV piętrze w budynku mieszkalnym,
wielorodzinnym przy ul. Wały Bolesława Chrobrego 6 w Głogowie, o powierzchni
użytkowej 77,42 m2 wraz z udziałem 735/10000 w częściach wspólnych budynku
i w prawie własności działki gruntu oznaczonej nr geod. 96 obręb 7 „Stare Miasto”,
o powierzchni 318 m2, ujawnionej w księdze wieczystej nr LE1G/00021742/7.
W skład lokalu wchodzą: 2 pokoje, kuchnia, spiżarnia, łazienka z wc i przedpokój.
Lokal wymaga kompleksowego remontu.
Cena wywoławcza: 260000,00 zł (słownie: dwieście sześćdziesiąt tysięcy złotych
00/100), tj. 61385,91 euro wg średniego kursu NBP ogłoszonego na dzień 28 maja
2026 r. (1 EUR = 4,2355). Podana cena wywoławcza nie obejmuje 8% podatku VAT,
który będzie doliczony do ceny wylicytowanej w przetargu.
Wadium: 20000,00 zł (słownie: dwadzieścia tysięcy złotych 00/100).
Minimalne postąpienie: 2600,00 zł (słownie: dwa tysiące sześćset złotych 00/100).
WRM.DGiGG.6840.5.9.2026.JSz



3.
Samodzielny lokal mieszkalny nr 15, położony na IV piętrze w budynku mieszkalnym,
wielorodzinnym przy ul. Wały Bolesława Chrobrego 6 w Głogowie, o powierzchni
użytkowej 47,47 m2 wraz z udziałem 441/10000 w częściach wspólnych budynku
i w prawie własności działki gruntu oznaczonej nr geod. 96 obręb 7 „Stare Miasto”,
o powierzchni 318 m2, ujawnionej w księdze wieczystej nr LE1G/00021742/7.
W skład lokalu wchodzą: pokój, garderoba, kuchnia, łazienka z wc, przedpokój
i pomieszczenie gospodarcze. Lokal wymaga kompleksowego remontu.
Cena wywoławcza: 180000,00 zł (słownie: sto osiemdziesiąt tysięcy złotych 00/100),
tj. 42497,94 euro wg średniego kursu NBP ogłoszonego na dzień 28 maja 2026 r.
(1 EUR = 4,2355). Podana cena wywoławcza nie obejmuje 8% podatku VAT, który
będzie doliczony do ceny wylicytowanej w przetargu.
Wadium: 20000,00 zł (słownie: dwadzieścia tysięcy złotych 00/100).
Minimalne postąpienie: 1800,00 zł (słownie: jeden tysiąc osiemset złotych 00/100).


1. Przetargi odbędą się w dniu 6 lipca 2026 r. w sali nr 114 Urzędu Miejskiego
     w Głogowie, Rynek 10, 67-200 Głogów. Rozpoczęcie o godz. 11:00.
2. W przetargu mogą brać udział osoby fizyczne i prawne, które w wyznaczonym
     terminie wniosą wadium i przedłożą Komisji przetargowej w dniu przetargu:
     1) w przypadku osoby fizycznej: dokument stwierdzający tożsamość
        i oświadczenie o niepodleganiu wykluczeniu z przetargu na mocy art. 24fa
        ust. 1 pkt 2 ustawy z dnia 8 marca 1990 r. o samorządzie gminnym (t. j. Dz. U.
        z 2025 r., poz. 1153 ze zm.): „wójtowie, zastępcy wójtów, radni, małżonkowie
        wójtów, zastępców wójtów, radnych, a także osoby pozostające we wspólnym
        pożyciu z wójtami, zastępcami wójtów, radnymi, nie mogą nabywać własności
        lokali mieszkalnych stanowiących mieszkaniowy zasób gminy, w której wójt
        lub zastępca wójta pełni funkcję lub radny uzyskał mandat”;
     2) w przypadku osoby prawnej lub innej jednostki podlegającej obowiązkowi
        wpisu do KRS: dokument stwierdzający tożsamość osoby reprezentującej
        podmiot, odpis/wydruk z KRS (ważny 3 miesiące), uchwałę wyrażającą zgodę
        na nabycie lokalu;
WRM.DGiGG.6840.5.9.2026.JSz

   3) w pozostałych przypadkach: stosowne dokumenty, np. umowy, uchwały,
      zaświadczenia oraz dokument stwierdzający tożsamość osoby upoważnionej
      do nabycia lokalu;
   4) w przypadku pełnomocnika: dokument stwierdzający tożsamość
      oraz pełnomocnictwo notarialne lub z poświadczonym podpisem mocodawcy.
3. Nabycie lokalu przez cudzoziemca może nastąpić w przypadku uzyskania
   zezwolenia ministra właściwego do spraw wewnętrznych, jeżeli wymagają
   tego przepisy ustawy z dnia 24 marca 1920 r. o nabywaniu nieruchomości
   przez cudzoziemców (t. j. Dz. U. z 2017 r., poz. 2278). Cudzoziemiec
   zobowiązany jest do ustalenia we własnym zakresie, czy nabycie lokalu
   będącego przedmiotem przetargu wymaga uzyskania zezwolenia.
4. Wadium w podanej wysokości należy wpłacić na rachunek Gminy Miejskiej
   Głogów: BNP Paribas Bank Polska S.A. nr 65 2030 0045 1110 0000 0192 9720,
   z dopiskiem: „wadium na lokal przy ul. Wały Bolesława Chrobrego …”, w terminie
   nie później niż do dnia 30 czerwca 2026 r. Za datę wpłacenia wadium uważa się
   wpływ wymaganej kwoty na rachunek Gminy Miejskiej Głogów.
   1) Wadium zwraca się niezwłocznie, jednak nie później niż przed upływem 3 dni
      od dnia, odpowiednio: odwołania przetargu, zamknięcia przetargu,
      unieważnienia przetargu lub zakończenia przetargu wynikiem negatywnym.
      Wadium zwraca się przelewem na rachunek podany przez uczestnika
      przetargu.
   2) Wadium wpłacone przez uczestnika przetargu, który przetarg wygrał,
      zalicza się na poczet ceny nabycia lokalu. Zaliczenie wadium na poczet ceny
      nabycia lokalu nastąpi w dniu zamknięcia przetargu.
   3) Wpłacone wadium nie podlega zwrotowi w razie uchylenia się osoby,
      która przetarg wygrała, od zawarcia umowy sprzedaży.
5. Przetarg jest ważny bez względu na liczbę uczestników przetargu,
   jeżeli przynajmniej jeden uczestnik zaoferuje co najmniej jedno postąpienie
   powyżej ceny wywoławczej. O wysokości postąpienia decydują uczestnicy
   przetargu, z tym że postąpienie nie może wynosić mniej niż 1% ceny
   wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych.
6. Organizator przetargu jest obowiązany zawiadomić osobę ustaloną jako nabywca
   lokalu o miejscu i terminie zawarcia umowy sprzedaży, najpóźniej w ciągu 21 dni
   od dnia rozstrzygnięcia przetargu. Jeżeli osoba ustalona jako nabywca lokalu
WRM.DGiGG.6840.5.9.2026.JSz

   nie przystąpi bez usprawiedliwienia do zawarcia umowy w miejscu i w terminie
   podanych w zawiadomieniu, Organizator przetargu może odstąpić od zawarcia
   umowy, a wpłacone wadium nie podlega zwrotowi.
7. Termin uiszczenia ceny sprzedaży lokalu, pomniejszonej o wpłacone wadium,
   upływa w dniu zawarcia aktu notarialnego. O dotrzymaniu terminu płatności
   decyduje data wpływu wymaganej należności na rachunek Gminy Miejskiej
   Głogów.
8. Koszty zawarcia aktu notarialnego i koszty sądowe ponosi w całości nabywca
   lokalu.
9. Wydanie lokalu nastąpi po zawarciu aktu notarialnego, na podstawie protokołu
   zdawczo-odbiorczego spisanego pomiędzy nabywcą lokalu a Administracją
   Domów Mieszkalnych Rejon „Śródmieście” w Głogowie, Al. Wolności 40A,
   67-200 Głogów. Nabywca przejmie lokal w stanie istniejącym.
10. Prawa i obowiązki właścicieli lokali oraz sposób zarządu nieruchomością wspólną
   określają odpowiednio rozdziały 3 i 4 ustawy z dnia 24 czerwca 1994 r.
   o własności lokali (t. j. Dz. U. z 2026 r., poz. 232), między innymi:
   1) Właściciel ponosi wydatki związane z utrzymaniem jego lokalu,
      jest obowiązany utrzymywać swój lokal w należytym stanie, przestrzegać
      porządku domowego, uczestniczyć w kosztach zarządu związanych
      z utrzymaniem nieruchomości wspólnej, korzystać z niej w sposób
      nieutrudniający korzystania przez innych współwłaścicieli oraz współdziałać
      z nimi w ochronie wspólnego dobra.
   2) Na koszty zarządu nieruchomością wspólną składają się w szczególności:
      a) wydatki na remonty i bieżącą konserwację;
      b) opłaty za dostawę energii elektrycznej i cieplnej, gazu i wody, w części
             dotyczącej nieruchomości wspólnej, oraz opłaty za antenę zbiorczą
             i windę;
      c) ubezpieczenia, podatki i inne opłaty publicznoprawne, chyba że są
             pokrywane bezpośrednio przez właścicieli poszczególnych lokali;
      d) wydatki na utrzymanie porządku i czystości;
      e) wynagrodzenie członków zarządu i zarządcy.
11. Na pokrycie kosztów zarządu właściciele lokali uiszczają zaliczki w formie
   bieżących opłat, płatne z góry do dnia 10-tego każdego miesiąca. Szczegółowe
WRM.DGiGG.6840.5.9.2026.JSz

      informacje dot. aktualnej wysokości zaliczki należy uzyskać od Zarządcy
      Wspólnoty Mieszkaniowej.
12.Zgodnie z miejscowym planem zagospodarowania przestrzennego Starego
      Miasta w Głogowie, zatwierdzonym Uchwałą nr V/45/99 Rady Miejskiej
      w Głogowie z dnia 23 lutego 1999 r. (Dziennik Urzędowy Województwa
      Dolnośląskiego nr 15, poz. 695 z dnia 25 czerwca 1999 r.), nieruchomość
      położona w Głogowie przy ul. Wały Bolesława Chrobrego 6, w granicach działki
      gruntu o nr geod. 96 obręb 7 „Stare Miasto”, zawiera się w obszarze oznaczonym
      w tekście i na rysunku planu symbolem 13MU, dla którego ustala się
      przeznaczenie na istniejącą zabudowę pierzejową. Ponadto niniejsza
      nieruchomość zlokalizowana jest w granicach zespołu urbanistyczno-
      krajobrazowego Starego Miasta w Głogowie, wpisanego do rejestru zabytków
      pod nr A/2641/89 decyzją z dnia 16 kwietnia 1985 r. i pod nr A/2642/2178 decyzją
      z dnia 31 marca 1975 r. oraz w strefie „A” ścisłej ochrony konserwatorskiej.
      Budynek, w którym znajdują się przedmiotowe lokale, stanowi obiekt o walorach
      kulturowych i ujęty jest w Gminnej Ewidencji Zabytków Nieruchomych miasta
      Głogowa pod nr 033.
13. Prezydent Miasta Głogowa zastrzega sobie prawo odwołania przetargu
      jedynie z ważnych powodów, informując o tym niezwłocznie w formie właściwej
      dla ogłoszenia o przetargu i podając przyczynę odwołania przetargu.
14. Przed przystąpieniem do przetargu należy zapoznać się z dokumentacją
      dotyczącą lokalu oraz z warunkami przetargu podanymi w ogłoszeniu o przetargu.
15. Oględzin lokalu można dokonać po uprzednim uzgodnieniu z Administracją
      Domów Mieszkalnych Rejon „Śródmieście” w Głogowie, Al. Wolności 40A,
      67-200 Głogów, tel. 76/ 8531180.
16. Dodatkowych informacji udziela: Dział Geodezji i Gospodarki Gruntami Urzędu
      Miejskiego w Głogowie, Rynek 10, 67-200 Głogów, pokój 215, tel. 76/ 7265453.


Prezydent Miasta Głogowa
/-/
Rafael Rokaszewicz


Głogów, 2026-05-29
WRM.DGiGG.6840.5.9.2026.JSz


RODO – Klauzula informacyjna dotycząca przetwarzania danych osobowych.
Tożsamość         Prezydent Miasta Głogowa
i dane            Rynek 10, 67-200 Głogów
kontaktowe        e-mail: prezydent@glogow.um.gov.pl
administratora:   tel. +48 76/ 7265401
Dane              Rynek 10, 67-200 Głogów
kontaktowe        e-mail: iod@glogow.um.gov.pl
inspektora        tel. +48 76/ 7265471
ochrony danych
osobowych:
Cel               Realizacja czynności związanych ze zbyciem lokalu w drodze
przetwarzania:    przetargu.
Kategorie         Dane identyfikacyjne oraz dane kontaktowe.
danych
osobowych:
Źródło danych:    Druga strona umowy lub osoba, której dane dotyczą.
Podstawa          1. Art. 6 ust. 1 lit. b RODO – przetwarzanie jest niezbędne
prawna               do wykonania umowy, której stroną jest osoba, której dane
przetwarzania        dotyczą lub do podjęcia działań na żądanie osoby, której
danych               dane dotyczą, przed zawarciem umowy.
osobowych:        2. Art. 6 ust. 1 lit. c RODO – przetwarzanie jest niezbędne
                     do wypełnienia obowiązku prawnego ciążącego
                     na administratorze, wynikającego z przepisów:
                     1) rozporządzenia Rady Ministrów z dnia 14 września
                        2004 r. w sprawie sposobu i trybu przeprowadzania
                        przetargów oraz rokowań na zbycie nieruchomości;
                     2) ustawy z dnia 21 sierpnia 1997 r. o gospodarce
                        nieruchomościami;
                     3) ustawy z dnia 6 lipca 1982 r. o księgach wieczystych
                        i hipotece;
                     4) ustawy z dnia 27 sierpnia 2009 r. o finansach publicznych
                        (do celu księgowania, windykacji i egzekucji zobowiązań);
WRM.DGiGG.6840.5.9.2026.JSz


                    5) ustawy z dnia 17 listopada 1964 r. Kodeks postępowania
                        cywilnego;
                    6) uchwały nr IV/24/2024 Rady Miejskiej w Głogowie z dnia
                        26 czerwca 2024 r. w sprawie zasad gospodarowania
                        nieruchomościami stanowiącymi własność Gminy
                        Miejskiej Głogów.
                 3. Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes
                    realizowany przez administratora w celu realizacji umowy,
                    ustalenia i dochodzenia ewentualnych roszczeń.
Odbiorcy         Do Pani/Pana danych osobowych będą mieć dostęp:
danych:             -   upoważnieni pracownicy Urzędu Miejskiego w Głogowie
                        oraz Zakładu Gospodarki Mieszkaniowej w Głogowie;
                    -   podmioty, które mają dostęp do danych osobowych
                        na podstawie zawartej umowy na świadczenie usługi,
                        tj.: MICOMP Systemy Komputerowe z siedzibą
                        w Katowicach, COIG S.A. z siedzibą w Gliwicach,
                        Kancelaria Radcy Prawnego z siedzibą w Głogowie;
                    -   podmioty, którym administrator przekazuje dane
                        na podstawie przepisów prawa, tj.: Urząd Skarbowy
                        w Głogowie, Sąd Rejonowy w Głogowie V Wydział Ksiąg
                        Wieczystych, Powiatowy Ośrodek Dokumentacji
                        Geodezyjnej i Kartograficznej w Głogowie;
                    -   inni administratorzy danych: BNP Paribas Bank Polska
                        SA z siedzibą w Warszawie, kancelaria notarialna,
                        kurierzy itp.
Okres            Akta sprawy stanowią materiały archiwalne i będą
przechowywania przechowywane przez okres 25 lat, licząc od stycznia kolejnego
danych:          roku po zakończeniu sprawy. Następnie zostaną przekazane
                 do Archiwum Państwowego, gdzie będą przechowywane
                 wieczyście.
Prawa            Przysługuje Pani/Panu prawo dostępu do Pani/Pana danych,
podmiotów        prawo żądania ich sprostowania i prawo do ograniczenia
danych:          ich przetwarzania w zakresie dopuszczonym przez przepisy
WRM.DGiGG.6840.5.9.2026.JSz


                  prawa. W celu skorzystania ze swoich praw należy
                  skontaktować się z inspektorem ochrony danych.
Prawo             Przysługuje Pani/Panu prawo do wniesienia sprzeciwu,
do sprzeciwu:     z przyczyn związanych ze szczególną sytuacją, wobec
                  przetwarzania danych osobowych.
Prawo             Przysługuje Pani/Panu prawo wniesienia skargi do organu
wniesienia        nadzorczego, tj. do Prezesa Urzędu Ochrony Danych
skargi            Osobowych.
do organu
nadzorczego:
Informacja        Podanie danych osobowych jest wymogiem ustawowym.
o dowolności      Brak podania danych obligatoryjnych skutkować będzie brakiem
lub obowiązku     realizacji w/w celu.
podania danych:
`,
};

// ANNOUNCEMENT, whole tenement house (kind 'zabudowana'), round II —
// Kamienna Droga 49, dz. 48/7 obręb 3, plot 1055 m², building usable area
// 182,03 m² (the parser must skip the 131,06 m² "powierzchni zabudowy"
// footprint), 530 000 zł, przetarg 5.08.2025. Its zoning boilerplate
// ("… parkingi, miejsca postojowe i garaże") is the live-verified decoy
// that classify-kind's GARAGE_RE would misroute to 'garaz' if kindFromText
// classified the FULL body instead of the subject-statement head.
const ANN_KAMIENNA49 = {
  title: `PREZYDENT MIASTA GŁOGOWA ogłasza drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej położonej w Głogowie przy ul. Kamienna Droga 49, oznaczonej nr geod. 48/7 obręb 3 „Wyspa Katedralna”, o powierzchni 1055 m2, ujawnionej w księdze wieczystej nr LE1G/00110910/7, zabudowanej budynkiem mieszkalnym, wielorodzinnym, stanowiącej własność Gminy Miejskiej Głogów.`,
  body: `WRM.DGiGG.6840.5.12.2025.JSz

PREZYDENT MIASTA GŁOGOWA
ogłasza
drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej położonej
w Głogowie przy ul. Kamienna Droga 49, oznaczonej nr geod. 48/7 obręb 3 „Wyspa
Katedralna”, o powierzchni 1055 m2, ujawnionej w księdze wieczystej
nr LE1G/00110910/7, zabudowanej budynkiem mieszkalnym, wielorodzinnym,
4-lokalowym o powierzchni zabudowy 131,06 m2 i powierzchni użytkowej 182,03 m2
oraz budynkiem gospodarczym o powierzchni użytkowej 24 m2, stanowiącej
własność Gminy Miejskiej Głogów.


Cena wywoławcza: 530000,00 zł (słownie: pięćset trzydzieści tysięcy złotych 00/100),
tj. 125186,01 euro. Cena nieruchomości w euro ustalona została wg średniego kursu
NBP ogłoszonego na dzień 12 maja 2025 r. (1 EUR = 4,2337).
Wadium: 50000,00 zł (słownie: pięćdziesiąt tysięcy złotych 00/100).
Minimalne postąpienie: 5300,00 zł (słownie: pięć tysięcy trzysta złotych 00/100).


1. Przetarg odbędzie się w dniu 5 sierpnia 2025 r. o godz. 10:00 w sali nr 114
   Urzędu Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.
2. W przetargu mogą brać udział osoby fizyczne i prawne, które w wyznaczonym
   terminie wniosą wadium i przedłożą Komisji przetargowej w dniu przetargu:
   1) w przypadku osoby fizycznej: dokument stwierdzający tożsamość;
   2) w przypadku osoby prawnej lub innej jednostki podlegającej obowiązkowi
      wpisu do KRS: dokument stwierdzający tożsamość osoby reprezentującej
      podmiot, odpis/wydruk z KRS (ważny 3 miesiące), uchwałę wyrażającą zgodę
      na nabycie nieruchomości;
   3) w pozostałych przypadkach: stosowne dokumenty, np. umowy, uchwały,
      zaświadczenia oraz dokument stwierdzający tożsamość osoby upoważnionej
      do nabycia nieruchomości;
   4) w przypadku pełnomocnika: dokument stwierdzający tożsamość
      oraz pełnomocnictwo notarialne lub z poświadczonym podpisem mocodawcy.
3. Nabycie nieruchomości przez cudzoziemca może nastąpić w przypadku
   uzyskania zezwolenia ministra właściwego do spraw wewnętrznych,
   jeżeli wymagają tego przepisy ustawy z dnia 24 marca 1920 r. o nabywaniu
   nieruchomości przez cudzoziemców (t. j. Dz. U. z 2017 r., poz. 2278).
WRM.DGiGG.6840.5.12.2025.JSz

   Cudzoziemiec zobowiązany jest do ustalenia we własnym zakresie, czy nabycie
   nieruchomości będącej przedmiotem przetargu wymaga uzyskania zezwolenia.
4. Wadium w podanej wysokości należy wpłacić na rachunek Gminy Miejskiej
   Głogów: BNP Paribas Bank Polska S.A. nr 65 2030 0045 1110 0000 0192 9720
   z dopiskiem „przetarg na działkę gruntu nr 48/7 obręb 3”, w terminie nie później
   niż do dnia 30 lipca 2025 r. Za datę wpłacenia wadium uważa się wpływ
   wymaganej kwoty na rachunek Gminy Miejskiej Głogów.
   1) Wadium zwraca się niezwłocznie, jednak nie później niż przed upływem 3 dni
      od dnia, odpowiednio: odwołania przetargu, zamknięcia przetargu,
      unieważnienia przetargu lub zakończenia przetargu wynikiem negatywnym.
      Wadium zwraca się przelewem na rachunek podany przez uczestnika
      przetargu.
   2) Wadium wpłacone przez uczestnika przetargu, który przetarg wygrał,
      zalicza się na poczet ceny nabycia nieruchomości. Zaliczenie wadium
      na poczet ceny nabycia nieruchomości nastąpi w dniu zamknięcia przetargu.
   3) Wpłacone wadium nie podlega zwrotowi w razie uchylenia się osoby,
      która przetarg wygrała, od zawarcia umowy sprzedaży.
5. Przetarg jest ważny bez względu na liczbę uczestników przetargu,
   jeżeli przynajmniej jeden uczestnik zaoferuje co najmniej jedno postąpienie
   powyżej ceny wywoławczej. O wysokości postąpienia decydują uczestnicy
   przetargu, z tym że postąpienie nie może wynosić mniej niż 1% ceny
   wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych.
6. Organizator przetargu jest obowiązany zawiadomić osobę ustaloną jako nabywca
   nieruchomości o miejscu i terminie zawarcia umowy sprzedaży, najpóźniej
   w ciągu 21 dni od dnia rozstrzygnięcia przetargu.
7. Jeżeli osoba ustalona jako nabywca nieruchomości nie przystąpi
   bez usprawiedliwienia do zawarcia umowy sprzedaży w miejscu i w terminie
   podanych w zawiadomieniu, Organizator przetargu może odstąpić od zawarcia
   umowy, a wpłacone wadium nie podlega zwrotowi.
8. Termin uiszczenia ceny sprzedaży nieruchomości, pomniejszonej o wpłacone
   wadium, upływa w dniu zawarcia umowy sprzedaży. O dotrzymaniu terminu
   płatności decyduje data wpływu wymaganej należności na rachunek Gminy
   Miejskiej Głogów.
WRM.DGiGG.6840.5.12.2025.JSz

9. Koszty zawarcia aktu notarialnego i koszty sądowe ponosi w całości nabywca
   nieruchomości.
10.Prezydent Miasta Głogowa zastrzega sobie prawo odwołania przetargu jedynie
   z ważnych powodów, informując o tym niezwłocznie w formie właściwej
   dla ogłoszenia o przetargu i podając przyczynę odwołania przetargu.
11.Przed przystąpieniem do przetargu należy zapoznać się z dokumentacją
   dotyczącą nieruchomości oraz z warunkami przetargu podanymi w ogłoszeniu
   o przetargu.


Informacje dotyczące zbywanej nieruchomości oraz warunki realizacji zamierzeń
inwestycyjnych.


1. Przedmiotem przetargu jest nieruchomość gruntowa zabudowana budynkiem
   mieszkalnym, wielorodzinnym, 4-lokalowym o powierzchni zabudowy 131,06 m2
   i powierzchni użytkowej 182,03 m2 oraz budynkiem gospodarczym o powierzchni
   użytkowej 24 m2. Budynek mieszkalny został wzniesiony w technologii tradycyjnej
   w latach 30-tych XX w. jako budynek dwukondygnacyjny z poddaszem
   użytkowym, bez podpiwniczenia.
2. Otoczenie nieruchomości stanowią tereny zabudowy mieszkaniowej
   jednorodzinnej i wielorodzinnej, usługi oraz tereny zielone. W pobliżu
   zlokalizowane są wały przeciwpowodziowe z korytem starej rzeki Odry.
   Obszar objęty jest zagrożeniem powodziowym.
3. W zakresie ochrony przeciwpowodziowej obowiązują n/w ustalenia:
   1) dla terenów zagrożonych powodzią, przeznaczonych pod nową zabudowę
      i zagospodarowanie, w tym pod drogi publiczne – podwyższenie terenu
      min. do rzędnej poziomu wód powodziowych Q1% (75,70 m n.p.m.), w celu
      ochrony przed powodzią;
   2) dla nowych budynków zakaz lokalizacji piwnic, poziom wejścia do budynków
      i poziom podłogi pierwszej kondygnacji powinien znajdować się min. 30 cm
      powyżej poziomu wód powodziowych Q1% (75,70 m n.p.m.);
   3) zakaz lokalizacji działalności i prowadzenia robót mających negatywny wpływ
      na zapewnienie szczelności i stabilności wałów przeciwpowodziowych;
   4) opracowanie szczegółowego projektu zabezpieczeń przeciwpowodziowych
      uwzględniając skutki powodzi z 1997 r.;
WRM.DGiGG.6840.5.12.2025.JSz

   5) dopuszcza się budowę wałów przeciwpowodziowych w obrębie wyspy;
   6) możliwość prowadzenia robót związanych z eksploatacją koryta rzeki Odry
      i jej zatok oraz obiektów hydrotechnicznych;
   7) zakaz grodzenia nieruchomości przyległych do rzeki Odry i jej zatok;
   8) dopuszcza się prace regulacyjne dla rzeki Odry i jej zatok.
4. Zgodnie ze zmianą miejscowego planu zagospodarowania przestrzennego
   Ostrowa Tumskiego w Głogowie, zatwierdzoną Uchwałą Rady Miejskiej
   w Głogowie nr XVI/86/11 z dnia 13 września 2011 r. (Dziennik Urzędowy
   Województwa Dolnośląskiego nr 234, poz. 4049 z dnia 17 listopada 2011 r.),
   nieruchomość zawiera się w obszarze oznaczonym w tekście i na rysunku planu
   symbolem 5.1.MW, dla którego ustala się przeznaczenie podstawowe
   na zabudowę mieszkaniową wielorodzinną oraz przeznaczenie uzupełniające na:
   usługi (z wyłączeniem usług uciążliwych), drogi wewnętrzne, infrastrukturę
   techniczną, parkingi, miejsca postojowe i garaże.
5. Na terenie objętym w/w planem w zakresie ochrony dziedzictwa kulturowego
   i zabytków ustala się:
   1) strefę „B” ochrony konserwatorskiej;
   2) strefę „OW” obserwacji archeologicznej;
   3) strefę „E” ochrony ekspozycji;
   4) strefę „K” ochrony krajobrazu kulturowego;
   5) strefę ochrony krajobrazowej Starego Miasta w Głogowie, wpisanej
      do rejestru zabytków pod nr A/2641/89 decyzją z dnia 16 kwietnia 1958 r.
      oraz pod nr A/2642/2178 decyzją z dnia 31 marca 1975 r.
6. Dla w/w obszaru obowiązują przepisy szczególne dot. m.in.: wymogu
   konsultowania i uzyskania opinii Wojewódzkiego Konserwatora Zabytków
   dla wszelkich działań inwestycyjnych, konieczności przeprowadzenia badań
   archeologicznych poprzedzających roboty ziemne za pozwoleniem właściwych
   służb ochrony zabytków oraz ochrony znajdujących się na tym terenie zabytków
   archeologicznych.
7. Nieruchomość uzbrojona jest w infrastrukturę techniczna w postaci sieci
   elektroenergetycznej, wodociągowej i kanalizacyjnej. Z przyłączy
   (elektroenergetycznego i wodociągowego) poprowadzonych do budynku
   mieszkalnego korzysta również właściciel nieruchomości przyległej, tj. działki
   gruntu położonej przy ul. Kamienna Droga 49A, oznaczonej nr geod. 48/1 obręb 3
WRM.DGiGG.6840.5.12.2025.JSz

   „Wyspa Katedralna”, zagospodarowanej na usługi samochodowe, który podjął
   czynności zmierzające do zapewnienia na własne potrzeby dostawy wszelkich
   niezbędnych mediów z wyłączeniem dalszego wykorzystywania do tych celów
   nieruchomości gminnej. Prezydent Miasta Głogowa zastrzega sobie możliwość
   rozwiązania wszelkich umów na dostawę energii elektrycznej i wody
   oraz odprowadzania ścieków w przypadku sprzedaży nieruchomości.
8. Wszystkie inwestycje i zmiany w zakresie zaopatrzenia w energię elektryczną,
   gaz, ciepło, wodę, odprowadzania ścieków, wód opadowych oraz lokalizacji
   innych urządzeń infrastruktury technicznej wymagają uzyskania przez inwestora
   warunków technicznych od właściwych dysponentów sieci. Warunki należy
   uzyskać indywidualnie, na własny koszt, w oparciu o faktyczne zapotrzebowanie
   określone przez nabywcę. Przy projektowaniu urządzeń i sieci uzbrojenia
   technicznego należy uwzględnić warunki wynikające z zagrożenia powodziowego
   terenu.
9. Przebudowa sieci uzbrojenia terenu kolidującej z planowanym zainwestowaniem
   nastąpi na koszt inwestora, na warunkach określonych przez właściciela sieci.
10.Gmina Miejska Głogów nie ponosi odpowiedzialności za kolizje
   z nieuwidocznionymi na podkładach geodezyjnych sieciami uzbrojenia
   technicznego.
11.Nabywca przejmie nieruchomość w stanie istniejącym i poniesie koszty związane
   z przygotowaniem terenu pod planowaną inwestycję.
12.Pierwszy przetarg ustny nieograniczony na sprzedaż przedmiotowej
   nieruchomości odbył się w dniu 15 kwietnia 2025 r.
13.Oględzin nieruchomości można dokonać po uprzednim uzgodnieniu
   z Administracją Domów Mieszkalnych „Śródmieście” w Głogowie,
   Al. Wolności 40A, 67-200 Głogów, tel. 76/ 8531180.
14.Dodatkowych informacji udziela Urząd Miejski w Głogowie, Rynek 10,
   67-200 Głogów, Dział Geodezji i Gospodarki Gruntami, pokój 215,
   tel. 76/ 7265453.


Prezydent Miasta Głogowa
Rafael Rokaszewicz


Głogów, 2025-05-12
WRM.DGiGG.6840.5.12.2025.JSz


RODO
Klauzula informacyjna dotycząca przetwarzania danych osobowych.
Tożsamość         Prezydent Miasta Głogowa
i dane            Rynek 10, 67-200 Głogów
kontaktowe        e-mail: prezydent@glogow.um.gov.pl, tel.: +48 76/ 7265401
administratora:
Dane              Rynek 10, 67-200 Głogów
kontaktowe        e-mail: iod@glogow.um.gov.pl, tel.: +48 76/ 7265471
inspektora
ochrony danych
osobowych:
Cel               Realizacja czynności związanych ze zbyciem nieruchomości
przetwarzania:    w drodze przetargu.
Kategorie         Dane identyfikacyjne oraz dane kontaktowe.
danych
osobowych:
Źródło danych:    Druga strona umowy lub osoba, której dane dotyczą.
Podstawa          1. Art. 6 ust. 1 lit. b RODO – przetwarzanie jest niezbędne
prawna               do wykonania umowy, której stroną jest osoba, której dane
przetwarzania        dotyczą lub do podjęcia działań na żądanie osoby, której
danych               dane dotyczą, przed zawarciem umowy.
osobowych:        2. Art. 6 ust. 1 lit. c RODO – przetwarzanie jest niezbędne
                     do wypełnienia obowiązku prawnego ciążącego
                     na administratorze, wynikającego z przepisów:
                  1) rozporządzenia Rady Ministrów z dnia 14 września 2004 r.
                     w sprawie sposobu i trybu przeprowadzania przetargów
                     oraz rokowań na zbycie nieruchomości;
                  2) ustawy z dnia 21 sierpnia 1997 r. o gospodarce
                     nieruchomościami;
                  3) ustawy z dnia 6 lipca 1982 r. o księgach wieczystych
                     i hipotece;
                  4) ustawy z dnia 27 sierpnia 2009 r. o finansach publicznych
                     (do celu księgowania, windykacji i egzekucji zobowiązań);
WRM.DGiGG.6840.5.12.2025.JSz


                 5) ustawy z dnia 17 listopada 1964 r. Kodeks postępowania
                    cywilnego;
                 6) uchwały nr IV/24/2024 Rady Miejskiej w Głogowie z dnia
                    26 czerwca 2024 r. w sprawie zasad gospodarowania
                    nieruchomościami stanowiącymi własność Gminy Miejskiej
                    Głogów.
                 3. Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes
                    realizowany przez administratora w celu realizacji umowy,
                    ustalenia i dochodzenia ewentualnych roszczeń.
Odbiorcy         Do Pani/Pana danych osobowych będą mieć dostęp:
danych:          pracownicy Urzędu Miejskiego w Głogowie, Rynek 10,
                 67-200 Głogów, pracownicy Zakładu Gospodarki Mieszkaniowej
                 w Głogowie, ul. Poczdamska 1, 67-200 Głogów, pracownicy
                 Sądu Rejonowego w Głogowie V Wydziału Ksiąg Wieczystych,
                 ul. Kutrzeby 2, 67-200 Głogów, pracownicy Powiatowego
                 Ośrodka Dokumentacji Geodezyjnej i Kartograficznej
                 w Głogowie, ul. Sikorskiego 21, 67-200 Głogów oraz inne
                 podmioty, np. firmy informatyczne serwisujące systemy
                 informatyczne, banki, kancelarie notarialne, kancelarie prawne,
                 kurierzy itp.
Okres            Akta sprawy stanowią materiały archiwalne i będą
przechowywania przechowywane przez okres 25 lat, licząc od stycznia kolejnego
danych:          roku po zakończeniu sprawy. Następnie zostaną przekazane
                 do Archiwum Państwowego, gdzie będą przechowywane
                 wieczyście.
Prawa            Przysługuje Pani/Panu prawo dostępu do Pani/Pana danych,
podmiotów        prawo żądania ich sprostowania i prawo do ograniczenia
danych:          ich przetwarzania w zakresie dopuszczonym przez przepisy
                 prawa. W celu skorzystania ze swoich praw należy
                 skontaktować się z inspektorem ochrony danych.
Prawo            Przysługuje Pani/Panu prawo do wniesienia sprzeciwu –
do sprzeciwu:    z przyczyn związanych ze szczególną sytuacją – wobec
                 przetwarzania danych osobowych.
WRM.DGiGG.6840.5.12.2025.JSz


Prawo             Przysługuje Pani/Panu prawo wniesienia skargi do organu
wniesienia        nadzorczego, tj. do Prezesa Urzędu Ochrony Danych
skargi            Osobowych na adres: Biuro Prezesa Urzędu Ochrony Danych
do organu         Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa,
nadzorczego:      tel. +48 22/ 5310300.
Informacja        Podanie danych osobowych jest wymogiem ustawowym.
o dowolności      Brak podania danych obligatoryjnych skutkować będzie brakiem
lub obowiązku     realizacji w/w celu.
podania danych:
`,
};

// ANNOUNCEMENT, LAND (kind 'grunt', parcel-keyed), round II — ul.
// Stanisława Kutrzeby, dz. 159/2 obręb 7, 1935 m² (written "1935 m2" — NO
// space/superscript, the form a m\b regex cannot match), 950 000 zł netto,
// przetarg 13.05.2025. Its conditions carry the easement decoy parcel
// ("… murów oporowych bastionu Św. Sebastiana … nr geod. 118 …") that
// landPlotFromText must NOT collect (subject-statement bounding).
const ANN_KUTRZEBY = {
  title: `PREZYDENT MIASTA GŁOGOWA ogłasza drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej, położonej w Głogowie przy ul. Stanisława Kutrzeby, oznaczonej nr geod. 159/2 obręb 7 „Stare Miasto”`,
  body: `WRM.DGiGG.6840.5.6.2025.JSz

PREZYDENT MIASTA GŁOGOWA
ogłasza
drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
niezabudowanej, położonej w Głogowie przy ul. Stanisława Kutrzeby, oznaczonej
nr geod. 159/2 obręb 7 „Stare Miasto”, o powierzchni 1935 m2, ujawnionej w księdze
wieczystej nr LE1G/00051965/5, przeznaczonej na zabudowę mieszkaniową niskiej
intensywności z towarzyszeniem usług, stanowiącej własność Gminy Miejskiej
Głogów.


Cena wywoławcza: 950000,00 zł netto (słownie: dziewięćset pięćdziesiąt tysięcy
złotych 00/100), tj. 229629,45 euro wg średniego kursu NBP ogłoszonego na dzień
27 lutego 2025 r. (1 EUR = 4,1371). Podana cena wywoławcza nieruchomości
nie obejmuje 23% podatku VAT, który będzie doliczony do ceny wylicytowanej.
Wadium: 100000,00 zł (słownie: sto tysięcy złotych 00/100).
Minimalne postąpienie: 9500,00 zł (słownie: dziewięć tysięcy pięćset złotych 00/100).


1. Przetarg odbędzie się w dniu 13 maja 2025 r. o godz. 10:00 w sali nr 114 Urzędu
   Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.
2. W przetargu mogą brać udział osoby fizyczne i prawne, które w wyznaczonym
   terminie wniosą wadium i przedłożą Komisji przetargowej w dniu przetargu:
   1) w przypadku osoby fizycznej: dokument stwierdzający tożsamość;
   2) w przypadku osoby prawnej lub innej jednostki podlegającej obowiązkowi
      wpisu do KRS: dokument stwierdzający tożsamość osoby reprezentującej
      podmiot, odpis/wydruk z KRS (ważny 3 miesiące), uchwałę wyrażającą zgodę
      na nabycie nieruchomości;
   3) w pozostałych przypadkach: stosowne dokumenty, np. umowy, uchwały,
      zaświadczenia oraz dokument stwierdzający tożsamość osoby upoważnionej
      do nabycia nieruchomości;
   4) w przypadku pełnomocnika: dokument stwierdzający tożsamość
      oraz pełnomocnictwo notarialne lub z poświadczonym podpisem mocodawcy.
3. Nabycie nieruchomości przez cudzoziemca może nastąpić w przypadku
   uzyskania zezwolenia ministra właściwego do spraw wewnętrznych,
   jeżeli wymagają tego przepisy ustawy z dnia 24 marca 1920 r. o nabywaniu
   nieruchomości przez cudzoziemców (t. j. Dz. U. z 2017 r., poz. 2278).
WRM.DGiGG.6840.5.6.2025.JSz

   Cudzoziemiec zobowiązany jest do ustalenia we własnym zakresie, czy nabycie
   nieruchomości będącej przedmiotem przetargu wymaga uzyskania zezwolenia.
4. Wadium w podanej wysokości należy wpłacić na rachunek Gminy Miejskiej
   Głogów: BNP Paribas Bank Polska S.A. nr 65 2030 0045 1110 0000 0192 9720
   z dopiskiem „przetarg na działkę gruntu nr 159/2 obręb 7”, w terminie nie później
   niż do dnia 7 maja 2025 r. Za datę wpłacenia wadium uważa się wpływ
   wymaganej kwoty na rachunek Gminy Miejskiej Głogów.
   1) Wadium zwraca się niezwłocznie, jednak nie później niż przed upływem 3 dni
      od dnia, odpowiednio: odwołania przetargu, zamknięcia przetargu,
      unieważnienia przetargu lub zakończenia przetargu wynikiem negatywnym.
      Wadium zwraca się przelewem na rachunek podany przez uczestnika
      przetargu.
   2) Wadium wpłacone przez uczestnika przetargu, który przetarg wygrał,
      zalicza się na poczet ceny nabycia nieruchomości. Zaliczenie wadium
      na poczet ceny nabycia nieruchomości nastąpi w dniu zamknięcia przetargu.
   3) Wpłacone wadium nie podlega zwrotowi w razie uchylenia się osoby,
      która przetarg wygrała, od zawarcia umowy sprzedaży.
5. Przetarg jest ważny bez względu na liczbę uczestników przetargu,
   jeżeli przynajmniej jeden uczestnik zaoferuje co najmniej jedno postąpienie
   powyżej ceny wywoławczej. O wysokości postąpienia decydują uczestnicy
   przetargu, z tym że postąpienie nie może wynosić mniej niż 1% ceny
   wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych.
6. Organizator przetargu jest obowiązany zawiadomić osobę ustaloną jako nabywca
   nieruchomości o miejscu i terminie zawarcia umowy sprzedaży, najpóźniej
   w ciągu 21 dni od dnia rozstrzygnięcia przetargu. Jeżeli osoba ustalona
   jako nabywca nieruchomości nie przystąpi bez usprawiedliwienia do zawarcia
   umowy sprzedaży w miejscu i w terminie podanych w zawiadomieniu, Organizator
   przetargu może odstąpić od zawarcia umowy, a wpłacone wadium nie podlega
   zwrotowi.
7. Termin uiszczenia ceny sprzedaży nieruchomości, pomniejszonej o wpłacone
   wadium, upływa w dniu zawarcia umowy sprzedaży. O dotrzymaniu terminu
   płatności decyduje data wpływu wymaganej należności na rachunek Gminy
   Miejskiej Głogów.
WRM.DGiGG.6840.5.6.2025.JSz

8. Koszty zawarcia aktu notarialnego i koszty sądowe ponosi w całości nabywca
   nieruchomości.
9. Prezydent Miasta Głogowa zastrzega sobie prawo odwołania przetargu jedynie
   z ważnych powodów, informując o tym niezwłocznie w formie właściwej
   dla ogłoszenia o przetargu i podając przyczynę odwołania przetargu.
10.Przed przystąpieniem do przetargu należy zapoznać się z dokumentacją
   dotyczącą nieruchomości oraz z warunkami przetargu podanymi w ogłoszeniu
   o przetargu.
11.Pierwszy przetarg ustny nieograniczony na sprzedaż przedmiotowej
   nieruchomości odbył się w dniu 21 stycznia 2025 r.


Informacje dotyczące zbywanej nieruchomości oraz warunki realizacji zamierzeń
inwestycyjnych.


1. Przedmiotem przetargu jest nieruchomość gruntowa niezabudowana,
   niezagospodarowana, sklasyfikowana jako zurbanizowane tereny niezabudowane
   lub w trakcie zabudowy (Bp) i tereny rekreacyjno-wypoczynkowe (Bz),
   usytuowana bezpośrednio przy fosie miejskiej, w sąsiedztwie Sądu Rejonowego
   w Głogowie, porośnięta trawą, drzewami i krzewami. W celu wycinki drzew
   nabywca winien zwrócić się do Urzędu Miejskiego w Głogowie o dokonanie
   uzgodnień.
2. Na nieruchomości zlokalizowane są ruiny dawnej zabudowy. Zagłębiona w ziemi
   budowla jest pozostałością fundamentów i piwnic przedwojennego budynku
   mieszkalnego.
3. Zgodnie z miejscowym planem zagospodarowania przestrzennego Starego
   Miasta w Głogowie nieruchomość zawiera się w obszarze oznaczonym w tekście
   i na rysunku planu symbolem: 29 MnU, dla którego ustala się przeznaczenie
   na zabudowę mieszkaniową niskiej intensywności z towarzyszeniem usług.
4. Nieruchomość położona jest w granicach:
   1) Zespołu urbanistyczno-krajobrazowego miasta Głogowa wpisanego
      do rejestru zabytków decyzją nr 443/L z dnia 31 marca 1975 r.
   2) Obszaru obwarowań miejskich wpisanych do rejestru zabytków decyzją
      nr 360/L z dnia 18 grudnia 1963 r.
WRM.DGiGG.6840.5.6.2025.JSz

   3) Strefy „A” ścisłej ochrony konserwatorskiej: wszelka działalność budowlana
      wymaga pisemnego zezwolenia Państwowej Służby Ochrony Zabytków.
      Wprowadza się wymóg konsultowania i uzgadniania z PSOZ wszelkich
      zamierzeń inwestycyjnych na tym obszarze. Inwestor winien liczyć się
      z koniecznością zlecenia dodatkowych badań lub opracowań studialnych –
      archeologicznych, architektonicznych, stratygraficznych lub innych. W strefie
      tej, ochronie podlegają wszelkie obiekty podziemne i pojedyncze stanowiska
      oraz odkryte podczas remontów detale architektoniczne. Ustala się wymóg
      uzyskania zezwolenia Wojewódzkiego Konserwatora Zabytków na podjęcie
      wszelkich prac ziemnych, które uwarunkowane są przeprowadzeniem badań
      archeologicznych wyprzedzających lub towarzyszących. W wypadku
      podejmowania inwestycji budowlanych inwestor winien liczyć się
      z koniecznością zapewnienia nadzoru archeologicznego nad pracami
      ziemnymi lub badań ratowniczych. Koszt nadzoru i ratowniczych badań
      archeologicznych lub architektonicznych pokrywa inwestor.
   4) Strefy „W” ścisłej ochrony archeologicznej: wszelkie inwestycje (związane
      z pracami ziemnymi) planowane w obszarach objętych tą strefą powinny
      uzyskać akceptację archeologicznych służb konserwatorskich, które ustalą
      tryb i rodzaj wymaganych na tym terenie badań.
5. Na nieruchomości, wzdłuż murów oporowych fosy miejskiej, został wyodrębniony
   pas terenu o szerokości 2,5 m i powierzchni 215 m2, określony jako tereny
   rekreacyjno-wypoczynkowe (Bz), w którym występuje zakaz zabudowy
   i dokonywania nasadzeń zieleni średniej i wysokiej. Na nieruchomości
   obligatoryjnie zostanie ustanowiona, w wyżej wymienionym pasie terenu,
   na rzecz Gminy Miejskiej Głogów nieodpłatna służebność gruntowa polegającą
   na swobodnym dostępie do murów oporowych bastionu Św. Sebastiana,
   zlokalizowanych w granicach działki gruntu oznaczonej nr geod. 118 obręb
   7 „Stare Miasto”, ujawnionej w księdze wieczystej nr LE1G/00111202/8,
   w celu ich remontu i konserwacji.
6. Wszystkie inwestycje i zmiany w zakresie zaopatrzenia w energię elektryczną,
   gaz, ciepło, wodę, odprowadzania ścieków, wód opadowych oraz lokalizacji
   innych urządzeń infrastruktury technicznej wymagają uzyskania przez inwestora
   warunków technicznych od właściwych dysponentów sieci. Warunki należy
WRM.DGiGG.6840.5.6.2025.JSz

   uzyskać indywidualnie, na własny koszt, w oparciu o faktyczne zapotrzebowanie
   określone przez nabywcę.
7. Przebudowa sieci uzbrojenia terenu kolidującej z planowanym zainwestowaniem
   nastąpi na koszt inwestora, na warunkach określonych przez właściciela sieci.
8. Gmina Miejska Głogów nie ponosi odpowiedzialności za kolizje
   z nieuwidocznionymi na podkładach geodezyjnych sieciami uzbrojenia
   technicznego.
9. Nabywca przejmie nieruchomość w stanie istniejącym i poniesie koszty związane
   z przygotowaniem terenu pod planowaną inwestycję.
10.Dodatkowych informacji udziela: Urząd Miejski w Głogowie, Rynek 10,
   67-200 Głogów, Dział Geodezji i Gospodarki Gruntami, pokój 215,
   tel. 76/ 7265453.


Prezydent Miasta Głogowa
Rafael Rokaszewicz


Głogów, 2025-02-28
 RODO
 Klauzula informacyjna dotycząca przetwarzania danych osobowych.
 Tożsamość         Prezydent Miasta Głogowa
 i dane            Rynek 10, 67-200 Głogów
 kontaktowe        e-mail: prezydent@glogow.um.gov.pl
 administratora:   tel.: +48 76/ 7265401
 Dane              Rynek 10, 67-200 Głogów
 kontaktowe        e-mail: iod@glogow.um.gov.pl
 inspektora        tel.: +48 76/ 7265471
 ochrony danych
 osobowych:
 Cel               Realizacja czynności związanych ze zbyciem nieruchomości
 przetwarzania:    w drodze przetargu.
 Kategorie         Dane identyfikacyjne oraz dane kontaktowe.
 danych
 osobowych:
WRM.DGiGG.6840.5.6.2025.JSz


Źródło danych:   Druga strona umowy lub osoba, której dane dotyczą.
Podstawa         1. Art. 6 ust. 1 lit. b RODO – przetwarzanie jest niezbędne
prawna              do wykonania umowy, której stroną jest osoba, której dane
przetwarzania       dotyczą lub do podjęcia działań na żądanie osoby, której
danych              dane dotyczą, przed zawarciem umowy.
osobowych:       2. Art. 6 ust. 1 lit. c RODO – przetwarzanie jest niezbędne
                    do wypełnienia obowiązku prawnego ciążącego
                    na administratorze, wynikającego z przepisów:
                 1) rozporządzenia Rady Ministrów z dnia 14 września 2004 r.
                    w sprawie sposobu i trybu przeprowadzania przetargów
                    oraz rokowań na zbycie nieruchomości;
                 2) ustawy z dnia 21 sierpnia 1997 r. o gospodarce
                    nieruchomościami;
                 3) ustawy z dnia 6 lipca 1982 r. o księgach wieczystych
                    i hipotece;
                 4) ustawy z dnia 27 sierpnia 2009 r. o finansach publicznych
                    (do celu księgowania, windykacji i egzekucji zobowiązań);
                 5) ustawy z dnia 17 listopada 1964 r. Kodeks postępowania
                    cywilnego;
                 6) uchwały nr IV/24/2024 Rady Miejskiej w Głogowie z dnia
                    26 czerwca 2024 r. w sprawie zasad gospodarowania
                    nieruchomościami stanowiącymi własność Gminy Miejskiej
                    Głogów.
                 3. Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes
                    realizowany przez administratora w celu realizacji umowy,
                    ustalenia i dochodzenia ewentualnych roszczeń.
Odbiorcy         Do Pani/Pana danych osobowych będą mieć dostęp:
danych:          pracownicy Urzędu Miejskiego w Głogowie, Rynek 10,
                 67-200 Głogów, pracownicy Sądu Rejonowego w Głogowie
                 V Wydziału Ksiąg Wieczystych, ul. Kutrzeby 2, 67-200 Głogów,
                 pracownicy Powiatowego Ośrodka Dokumentacji Geodezyjnej
                 i Kartograficznej w Głogowie, ul. Sikorskiego 21, 67-200 Głogów
                 oraz inne podmioty, np. firmy informatyczne serwisujące
WRM.DGiGG.6840.5.6.2025.JSz


                  systemy informatyczne, banki, kancelarie notarialne, kancelarie
                  prawne, kurierzy itp.
Okres             Akta sprawy stanowią materiały archiwalne i będą
przechowywania przechowywane przez okres 25 lat, licząc od stycznia kolejnego
danych:           roku po zakończeniu sprawy. Następnie zostaną przekazane
                  do Archiwum Państwowego, gdzie będą przechowywane
                  wieczyście.
Prawa             Przysługuje Pani/Panu prawo dostępu do Pani/Pana danych,
podmiotów         prawo żądania ich sprostowania i prawo do ograniczenia
danych:           ich przetwarzania w zakresie dopuszczonym przez przepisy
                  prawa. W celu skorzystania ze swoich praw należy
                  skontaktować się z inspektorem ochrony danych.
Prawo             Przysługuje Pani/Panu prawo do wniesienia sprzeciwu –
do sprzeciwu:     z przyczyn związanych ze szczególną sytuacją – wobec
                  przetwarzania danych osobowych.
Prawo             Przysługuje Pani/Panu prawo wniesienia skargi do organu
wniesienia        nadzorczego, tj. do Prezesa Urzędu Ochrony Danych
skargi            Osobowych na adres: Biuro Prezesa Urzędu Ochrony Danych
do organu         Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa,
nadzorczego:      tel. +48 22/ 5310300.
Informacja        Podanie danych osobowych jest wymogiem ustawowym.
o dowolności      Brak podania danych obligatoryjnych skutkować będzie brakiem
lub obowiązku     realizacji w/w celu.
podania danych:
`,
};

// RESULT, UNSOLD flat, round I — Wały Bolesława Chrobrego 6/15. First
// negative phrasing: "Przetarg zakończył się wynikiem negatywnym, gdyż nikt
// nie przystąpił do przetargu." Starting price in the ACCUSATIVE "cenę
// wywoławczą ustalono na kwotę 180000,00 zł" — the spelling an ASCII-only
// cen\w* regex silently fails on (JS \w has no "ę").
const RES_CHROBREGO_6_15 = {
  title: `INFORMACJA o wyniku przeprowadzonego pierwszego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego położonego w Głogowie przy ul. Wały Bolesława Chrobrego 6/15.`,
  body: `Głogów, 2026-07-14


WRM.DGiGG.6840.5.9.2026.JSz


INFORMACJA
o wyniku przeprowadzonego pierwszego przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego położonego w Głogowie przy ul. Wały Bolesława
Chrobrego 6/15.


§ 1.


Przetarg przeprowadzono w dniu 6 lipca 2026 r. w sali nr 114 Urzędu Miejskiego
w Głogowie, Rynek 10, 67-200 Głogów.


§ 2.


Przedmiotem przetargu był samodzielny lokal mieszkalny nr 15, położony
na IV piętrze w budynku mieszkalnym, wielorodzinnym przy ul. Wały Bolesława
Chrobrego 6 w Głogowie, o powierzchni użytkowej 47,47 m2, składający się z pokoju,
garderoby, kuchni, łazienki z wc, przedpokoju i pomieszczenia gospodarczego
wraz z udziałem 441/10000 w częściach wspólnych budynku i w prawie własności
działki gruntu oznaczonej nr geod. 96 obręb 7 „Stare Miasto”, o powierzchni 318 m 2,
ujawnionej w księdze wieczystej nr LE1G/00021742/7, przeznaczonej w miejscowym
planie zagospodarowania przestrzennego na istniejącą zabudowę pierzejową.


§ 3.


Na podstawie Zarządzenia nr 63/2026 Prezydenta Miasta Głogowa z dnia
1 kwietnia 2026 r. cenę wywoławczą ustalono na kwotę 180000,00 zł (słownie:
sto osiemdziesiąt tysięcy złotych 00/100), tj. 42497,94 euro wg średniego kursu
NBP ogłoszonego na dzień 28 maja 2026 r. (1 EUR = 4,2355).


§ 4.
Przetarg zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił do przetargu.


§ 5.


Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Prezydent Miasta Głogowa
/-/
Rafael Rokaszewicz
`,
};

// RESULT, SOLD flat, round III — Jedności Robotniczej 6a/10 (the spike's
// reference case, legacy iddok=12143). "Nabywcą lokalu został Rafał
// Patrzałek za najwyższą zaoferowaną cenę 166650,00 zł"; starting price
// 165 000 zł.
const RES_JEDNOSCI = {
  title: `INFORMACJA o wyniku przeprowadzonego trzeciego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego położonego w Głogowie przy ul. Jedności Robotniczej 6a/10.`,
  body: `Głogów, 2025-03-12
WRM.DGiGG.6840.5.2.2025.JSz


INFORMACJA
o wyniku przeprowadzonego trzeciego przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego położonego w Głogowie przy ul. Jedności
Robotniczej 6a/10.


§ 1.
Przetarg przeprowadzono w dniu 4 marca 2025 r. o godz. 10:00 w sali nr 114 Urzędu
Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.


§ 2.
1. Przedmiotem przetargu był samodzielny lokal mieszkalny nr 10, położony
   na trzecim piętrze w budynku mieszkalno-usługowym, wielolokalowym
   przy ul. Jedności Robotniczej 6a w Głogowie, o powierzchni użytkowej 58,26 m2,
   składający się z dwóch pokoi, kuchni, łazienki, wc i przedpokoju wraz z udziałem
   429/10000 w częściach wspólnych budynku i w prawie własności działki gruntu
   oznaczonej nr geod. 81 obręb 2 „Matejki”, o powierzchni 375 m2, ujawnionej
   w księdze wieczystej nr LE1G/00020998/9.
2. Nieruchomość gruntowa oznaczona nr geod. 81 obręb 2 „Matejki” m. Głogów
   położona jest w obszarze oznaczonym w tekście i na rysunku miejscowego planu
   zagospodarowania przestrzennego symbolem 11 MW, UC, dla którego ustala się
   przeznaczenie na zabudowę wielorodzinną i usługi komercyjne nieuciążliwe,
   przede wszystkim w parterze. Ponadto nieruchomość zlokalizowana jest w strefie
   ochrony krajobrazowej Starego Miasta w Głogowie, wpisanej do rejestru zabytków
   pod nr A/2641/89 decyzją z dnia 16 kwietnia 1958 r. i pod nr A/2642/2178 decyzją
   z dnia 31 marca 1975 r.
3. Budynek, w którym zlokalizowany jest przedmiotowy lokal, ujęty jest w Gminnej
   Ewidencji Zabytków Nieruchomych miasta Głogowa (budynek o walorach
   kulturowych).


§ 3.
Na podstawie Zarządzenia nr 15/2025 Prezydenta Miasta Głogowa z dnia
16 stycznia 2025 r. cenę wywoławczą lokalu ustalono na kwotę 165000,00 zł
(słownie: sto sześćdziesiąt pięć tysięcy złotych 00/100).


§ 4.
W przetargu wziął udział jeden uczestnik.


§ 5.
W wyniku przeprowadzonego przetargu Nabywcą lokalu został Rafał Patrzałek
za najwyższą zaoferowaną cenę 166650,00 zł (słownie: sto sześćdziesiąt sześć
tysięcy sześćset pięćdziesiąt złotych 00/100).


§ 6.
Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Prezydent Miasta Głogowa
Rafael Rokaszewicz
`,
};

// RESULT, UNSOLD flat, round IV — Kamienna Droga 37/8, the FIRST of FOUR
// separate single-lot attachment PDFs on ONE "INFORMACJE o wynikach …"
// article whose aggregate title names all four addresses (37/8, 39/2, 39/6,
// 39/8). The parser must take the address/price/area from THIS attachment's
// body, never the shared title.
const RES_KAMIENNA37_8 = {
  title: `INFORMACJE o wynikach przeprowadzonych czwartych przetargów ustnych nieograniczonych na sprzedaż lokali mieszkalnych położonych w Głogowie przy ul. Kamienna Droga nr 37/8, nr 39/2, nr 39/6 i nr 39/8.`,
  body: `Głogów, 2025-05-28
WRM.DGiGG.6840.5.11.2025.JSz


INFORMACJA
o wyniku przeprowadzonego czwartego przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego położonego w Głogowie przy ul. Kamienna
Droga 37/8.


§ 1.


Przetarg przeprowadzono w dniu 20 maja 2025 r. w Urzędzie Miejskim w Głogowie,
Rynek 10, 67-200 Głogów.


§ 2.


Przedmiotem przetargu był samodzielny lokal mieszkalny nr 8, położony na trzecim
piętrze w budynku mieszkalnym, wielorodzinnym przy ul. Kamienna Droga 37
w Głogowie, o powierzchni użytkowej 78,83 m2, składający się z dwóch pokoi,
kuchni, łazienki z wc, przedpokoju i dwóch skrytek wraz z pomieszczeniem
przynależnym (piwnicą) o powierzchni 9,97 m2 oraz udziałem 665/10000 w częściach
wspólnych budynku i w prawie własności działki gruntu oznaczonej nr geod. 35 obręb
3 „Wyspa Katedralna” m. Głogów, o powierzchni 1497 m2, ujawnionej w księdze
wieczystej nr LE1G/00033399/4, przeznaczonej w miejscowym planie
zagospodarowania przestrzennego na zabudowę mieszkaniową wielorodzinną.


§ 3.


Na podstawie Zarządzenia nr 70/2025 Prezydenta Miasta Głogowa z dnia 7 kwietnia
2025 r. cenę wywoławczą ustalono na kwotę 185000,00 zł (słownie: sto
osiemdziesiąt pięć tysięcy złotych 00/100), tj. 43628,99 euro wg średniego kursu
NBP ogłoszonego na dzień 4 kwietnia 2025 r. (1 EUR = 4,2403).


§ 4.
Przetarg zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił do przetargu.


§ 5.


Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Prezydent Miasta Głogowa
Rafael Rokaszewicz
`,
};

// RESULT, UNSOLD whole tenement house (kind 'zabudowana'), round I —
// Kamienna Droga 49, 550 000 zł. Two parser traps, both live-verified: the
// address is spelled OUT ("przy ulicy Kamienna Droga 49", not "przy ul."),
// and the price amount is NOT followed by "zł" ("… ustalono na kwotę
// 550000,00 (słownie: …" — "zł" only appears inside the parenthetical).
const RES_KAMIENNA49_HOUSE = {
  title: `INFORMACJA o wyniku przeprowadzonego pierwszego przetargu ustnego nieograniczonego na sprzedaż zabudowanej nieruchomości gruntowej`,
  body: `Głogów, 2025-04-23
WRM.DGiGG.6840.5.27.2024.JSz


INFORMACJA
o wyniku przeprowadzonego pierwszego przetargu ustnego nieograniczonego
na sprzedaż zabudowanej nieruchomości gruntowej.


§ 1.


Przetarg przeprowadzono w dniu 15 kwietnia 2025 r. o godz. 10:00 w sali nr 114
Urzędu Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.


§ 2.


1. Przedmiotem przetargu była nieruchomość gruntowa położona w Głogowie
   przy ulicy Kamienna Droga 49, oznaczona nr geod. 48/7 obręb 3 „Wyspa
   Katedralna”, o powierzchni 1055 m2, ujawniona w księdze wieczystej
   nr LE1G/00110910/7, zabudowana budynkiem mieszkalnym, wielorodzinnym,
   4-lokalowym, o powierzchni zabudowy 131,06 m2 i powierzchni użytkowej
   182,03 m2 oraz budynkiem gospodarczym o powierzchni użytkowej 24 m 2,
   stanowiąca własność Gminy Miejskiej Głogów.
2. Na podstawie Zarządzenia nr 230/2024 Prezydenta Miasta Głogowa z dnia
   2 grudnia 2024 r. cenę wywoławczą w pierwszym przetargu ustnym
   nieograniczonym na sprzedaż przedmiotowej nieruchomości ustalono
   na kwotę 550000,00 (słownie: pięćset pięćdziesiąt tysięcy złotych 00/100),
   tj. 130180,60 euro wg średniego kursu NBP ogłoszonego na dzień 4 lutego
   2025 r. (1 EUR = 4,2249).
3. Zgodnie ze zmianą miejscowego planu zagospodarowania przestrzennego
   Ostrowa Tumskiego w Głogowie, zatwierdzoną Uchwałą Rady Miejskiej
   w Głogowie nr XVI/86/11 z dnia 13 września 2011 r. (Dziennik Urzędowy
   Województwa Dolnośląskiego nr 234, poz. 4049 z dnia 17 listopada 2011 r.),
   nieruchomość zawiera się w obszarze oznaczonym w tekście i na rysunku planu
   symbolem 5.1.MW, dla którego ustala się przeznaczenie podstawowe
   na zabudowę mieszkaniową wielorodzinną oraz przeznaczenie uzupełniające na:
   usługi (z wyłączeniem usług uciążliwych), drogi wewnętrzne, infrastrukturę
   techniczną, parkingi, miejsca postojowe i garaże.


§ 3.


Przetarg zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił do przetargu.


§ 5.


Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Prezydent Miasta Głogowa
Rafael Rokaszewicz
`,
};

// RESULT, UNSOLD land, round II — ul. Stanisława Kutrzeby dz. 159/2,
// 950 000 zł netto. SECOND negative phrasing: "… wynikiem negatywnym, gdyż
// uczestnik przetargu nie zaoferował postąpienia ponad cenę wywoławczą."
const RES_KUTRZEBY = {
  title: `INFORMACJA o wyniku przeprowadzonego drugiego przetargu ustnego nieograniczonego na sprzedaż nieruchomości gruntowej niezabudowanej.`,
  body: `Głogów, 2025-05-21
WRM.DGiGG.6840.5.6.2025.JSz


INFORMACJA
o wyniku przeprowadzonego drugiego przetargu ustnego nieograniczonego
na sprzedaż nieruchomości gruntowej niezabudowanej.


§ 1.


Przetarg przeprowadzono w dniu 13 maja 2025 r. o godz. 10:00 w sali nr 114 Urzędu
Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.


§ 2.


1. Przedmiotem przetargu była nieruchomość gruntowa niezabudowana położona
   w Głogowie przy ul. Stanisława Kutrzeby, oznaczona nr geod. 159/2 obręb 7
   „Stare Miasto”, o powierzchni 1935 m2, ujawniona w księdze wieczystej
   nr LE1G/00051965/5, stanowiąca własność Gminy Miejskiej Głogów.
2. Na podstawie Zarządzenia nr 42/2025 Prezydenta Miasta Głogowa z dnia
   28 lutego 2025 r. cenę wywoławczą w drugim przetargu ustnym nieograniczonym
   na sprzedaż przedmiotowej nieruchomości ustalono na kwotę 950000,00 zł netto
   (słownie: dziewięćset pięćdziesiąt tysięcy złotych 00/100), tj. 229629,45 euro
   wg średniego kursu NBP ogłoszonego na dzień 27 lutego 2025 r.
   (1 EUR = 4,1371).
3. Zgodnie z miejscowym planem zagospodarowania przestrzennego Starego
   Miasta w Głogowie nieruchomość zawiera się w obszarze oznaczonym w tekście
   i na rysunku planu symbolem: 29MnU, dla którego ustala się przeznaczenie
   na zabudowę mieszkaniową niskiej intensywności z towarzyszeniem usług.


§ 3.


W przetargu wziął udział jeden uczestnik.


§ 4.
Przetarg zakończył się wynikiem negatywnym, gdyż uczestnik przetargu
nie zaoferował postąpienia ponad cenę wywoławczą.


§ 5.


Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Prezydent Miasta Głogowa
Rafael Rokaszewicz
`,
};

// RESULT, UNSOLD flat on a SQUARE, round I — "lokal mieszkalny nr 22 …
// przy Placu 1000-lecia 10 w Głogowie" (35,29 m², 172.000,00 zł — note the
// DOT-thousands price form, unique to this doc among the fixtures). The
// article title is the GENERIC "… na sprzedaż lokalu mieszkalnego." with no
// address at all, so the body must supply it; the street both uses the
// "Placu" designator (folded to nominative "Plac …") and OPENS WITH DIGITS
// ("1000-lecia") — the two traps that silently dropped this flat before the
// designator/digit support was added.
const RES_PLAC1 = {
  title: `INFORMACJA o wyniku przeprowadzonego pierwszego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego.`,
  body: `Głogów, 2025-02-05
WRM.DGiGG.6840.5.16.2024.JSz


INFORMACJA o wyniku przeprowadzonego pierwszego przetargu ustnego
nieograniczonego na sprzedaż lokalu mieszkalnego.


§ 1.


Przetarg przeprowadzono w dniu 28 stycznia 2025 r. o godz. 10:00 w sali nr 114
Urzędu Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.


§ 2.


1. Przedmiotem przetargu był lokal mieszkalny nr 22, położony na czwartym piętrze
   w budynku mieszkalno-usługowym, wielolokalowym przy Placu 1000-lecia 10
   w Głogowie, o powierzchni użytkowej 35,29 m2, ujawniony w księdze wieczystej
   nr LE1G/00055534/3, składający się z: dwóch pokoi, kuchni, łazienki z wc
   i przedpokoju wraz z udziałem 35/6123 w częściach wspólnych budynku
   i w prawie własności działki gruntu oznaczonej nr geod. 34/1 obręb 2 „Matejki”
   m. Głogów, o powierzchni 1766 m2, ujawnionej w księdze wieczystej
   nr LE1G/00021537/7.
2. Zgodnie z miejscowym planem zagospodarowania przestrzennego terenu
   Śródmieścia w Głogowie, zatwierdzonym Uchwałą nr XLIVII/390/98 Rady
   Miejskiej w Głogowie z dnia 24 marca 1998 r. (Dziennik Urzędowy Województwa
   Legnickiego nr 10, poz. 94 z dnia 11 maja 1998 r.), nieruchomość gruntowa
   o nr geod. 34/1 obręb 2 „Matejki”, zawiera się w obszarze oznaczonym w tekście
   i na rysunku planu symbolem 11 MW, UC, dla którego ustala się przeznaczenie
   na zabudowę wielorodzinną i usługi komercyjne, przede wszystkim w parterze.
   Ponadto w/w nieruchomość gruntowa zlokalizowana jest w strefie ochrony
   krajobrazowej Starego Miasta w Głogowie, wpisanej do rejestru zabytków
   pod nr A/2641/89 decyzją z dnia 16 kwietnia 1958 r. i pod nr A/2642/2178 decyzją
   z dnia 31 marca 1975 r.


§ 3.
Na podstawie Zarządzenia nr 194/2024 Prezydenta Miasta Głogowa z dnia
28 października 2024 r. cenę wywoławczą ustalono na kwotę 172.000,00 zł (słownie:
sto siedemdziesiąt dwa tysiące złotych 00/100), tj. 40.260,29 euro wg średniego
kursu NBP ogłoszonego na dzień 13 grudnia 2024 r. (1 EUR = 4,2722).


§ 4.


Przetarg zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił do przetargu.


§ 5.


Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Zastępca Prezydenta Miasta Głogowa
Piotr Poznański
`,
};

// RESULT, UNSOLD shed-plot ("nieruchomość gruntowa … przy ulicy Spokojnej,
// … zabudowana budynkiem gospodarczym"), round II — classify-kind calls it
// 'zabudowana' (built), but there is NO building number ("przy ulicy
// Spokojnej," straight to the geod. clause), so it cannot be address-keyed:
// exercises the parcel-keyed fallback (dz. 93, 1256 m², 200.000,00 zł).
const RES_SPOKOJNA = {
  title: `INFORMACJA o wyniku przeprowadzonego drugiego przetargu ustnego nieograniczonego na sprzedaż nieruchomości gruntowej zabudowanej`,
  body: `Głogów, 2023-05-17
WRM.DGiGG.6840.5.6.2023.JSz


INFORMACJA
o wyniku przeprowadzonego drugiego przetargu ustnego nieograniczonego
na sprzedaż nieruchomości gruntowej zabudowanej


§ 1.


Przetarg przeprowadzono w dniu 9 maja 2023 r. o godz. 12:00 w sali nr 114 Urzędu
Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.


§ 2.


1. Przedmiotem przetargu była nieruchomość gruntowa położona w Głogowie
   przy ulicy Spokojnej, oznaczona nr geod. 93 obręb 3 „Wyspa Katedralna”,
   o powierzchni 1256 m2, ujawniona w księdze wieczystej nr LE1G/00094824/8,
   zabudowana budynkiem gospodarczym o powierzchni zabudowy 154,00 m 2
   i powierzchni użytkowej 135,40 m2, stanowiąca własność Gminy Miejskiej
   Głogów.
2. Na podstawie Zarządzenia nr 51/2023 Prezydenta Miasta Głogowa z dnia
   29 marca 2023 r. cenę wywoławczą w drugim przetargu ustnym nieograniczonym
   na sprzedaż przedmiotowej nieruchomości ustalono na kwotę 200.000,00 zł
   ( słownie: dwieście tysięcy złotych 00/100), tj. 42.734,13 euro wg średniego kursu
   NBP ogłoszonego na dzień 30 marca 2023 r. ( 1 EUR = 4,6801).


§ 3.


Zgodnie ze zmianą miejscowego planu zagospodarowania przestrzennego Ostrowa
Tumskiego w Głogowie, zatwierdzoną Uchwałą Rady Miejskiej w Głogowie
nr XVI/86/11 z dnia 13 września 2011 r. ( Dziennik Urzędowy Województwa
Dolnośląskiego nr 234, poz. 4049 z dnia 17 listopada 2011 r.), przedmiotowa
nieruchomość zawiera się w obszarze oznaczonym na rysunku planu symbolem
6.1.MN, dla którego ustala się przeznaczenie podstawowe na zabudowę
mieszkaniową jednorodzinną oraz przeznaczenie uzupełniające na: usługi
( z wyłączeniem usług uciążliwych, w tym m. in. warsztatów mechanicznych,
samochodowych i stolarskich), miejsca postojowe i garaże, budynki gospodarcze,
infrastrukturę techniczną.


§ 4.


Przetarg zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił do przetargu.


§ 5.


Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Prezydent Miasta Głogowa
Rafael Rokaszewicz
`,
};

// RESULT, UNSOLD ½-share of a VILLAGE estate ("w Witanowicach nr 18, gmina
// Gaworzyce" — Gmina Miejska Głogów selling an out-of-town property, no
// Głogów street at all), round I — the second parcel-keyed-fallback shape:
// no street (address_raw null), dz. 99, 700 m², 50 000 zł ("50000,00
// (słownie…" — amount not followed by zł).
const RES_WITANOWICE = {
  title: `INFORMACJA o wyniku przeprowadzonego pierwszego przetargu ustnego nieograniczonego na sprzedaż udziału w zabudowanej nieruchomości gruntowej.`,
  body: `Głogów, 2026-01-28


WRM.DGiGG.6840.5.18.2025.JSz


INFORMACJA
o wyniku przeprowadzonego pierwszego przetargu ustnego nieograniczonego
na sprzedaż udziału w zabudowanej nieruchomości gruntowej.


§ 1.


Przetarg przeprowadzono w dniu 20 stycznia 2026 r. o godz. 10:00 w sali nr 114
Urzędu Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.


§ 2.


1. Przedmiotem przetargu był udział w wysokości ½ części w prawie własności
   nieruchomości gruntowej położonej w Witanowicach nr 18, gmina Gaworzyce,
   oznaczonej nr geod. 99 o powierzchni 700 m2, ujawnionej w księdze wieczystej
   nr LE1G/00004444/3, zabudowanej budynkiem mieszkalnym
   oraz towarzyszącymi budynkami gospodarczymi.
2. Budynek mieszkalny, o którym mowa w ust. 1, to obiekt parterowy z poddaszem
   nieużytkowym, niepodpiwniczony, wybudowany przed 1939 rokiem w technologii
   tradycyjnej murowanej, o powierzchni użytkowej 91,23 m 2.


§ 3.


Na podstawie Zarządzenia nr 186/2025 Prezydenta Miasta Głogowa z dnia
2 października 2025 r. cenę wywoławczą ustalono na kwotę 50000,00 (słownie:
pięćdziesiąt tysięcy złotych 00/100).


§ 4.


Przeznaczenie nieruchomości, ustalone na podstawie studium uwarunkowań
i kierunków zagospodarowania przestrzennego gminy Gaworzyce (brak miejscowego
planu zagospodarowania przestrzennego), określone zostało jako tereny z przewagą
zabudowy jednorodzinnej lub zagrodowej oraz obiektów usług i produkcji
niekolidujących z funkcją mieszkaniową.


§ 5.


Przetarg zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił do przetargu.


§ 6.


Niniejszą informację podaje się do publicznej wiadomości poprzez wywieszenie
na tablicy ogłoszeń Urzędu Miejskiego w Głogowie oraz publikację w Biuletynie
Informacji Publicznej.


Prezydent Miasta Głogowa
Rafael Rokaszewicz
`,
};

// ANNOUNCEMENT for the same Witanowice ½-share (round I) — exercises the
// SAME parcel-keyed fallback on the ANNOUNCEMENT path.
const ANN_WITANOWICE = {
  title: `PREZYDENT MIASTA GŁOGOWA ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż udziału w wysokości ½ części w prawie własności zabudowanej nieruchomości gruntowej położonej w Witanowicach nr 18.`,
  body: `WRM.DGiGG.6840.5.18.2025.JSz

PREZYDENT MIASTA GŁOGOWA
ogłasza
pierwszy przetarg ustny nieograniczony na sprzedaż udziału w wysokości ½ części
w prawie własności nieruchomości gruntowej położonej w Witanowicach nr 18,
gmina Gaworzyce, oznaczonej nr geod. 99 o powierzchni 700 m2, ujawnionej
w księdze wieczystej nr LE1G/00004444/3, zabudowanej budynkiem mieszkalnym
oraz towarzyszącymi budynkami gospodarczymi.


Budynek mieszkalny zlokalizowany w granicach przedmiotowej nieruchomości
gruntowej to obiekt parterowy z poddaszem nieużytkowym, niepodpiwniczony,
wybudowany przed 1939 rokiem w technologii tradycyjnej murowanej, o powierzchni
użytkowej 91,23 m2.


Cena wywoławcza: 50000,00 zł (słownie: pięćdziesiąt tysięcy złotych 00/100),
tj. 11807,77 euro, wg średniego kursu NBP ogłoszonego na dzień 24 listopada
2025 r. (1 EUR = 4,2345).
Wadium: 5000,00 zł (słownie: pięć tysięcy złotych 00/100).
Minimalne postąpienie: 500,00 zł (słownie: pięćset złotych 00/100).


1. Przetarg odbędzie się w dniu 20 stycznia 2026 r. o godz. 10:00 w sali nr 114
   Urzędu Miejskiego w Głogowie, Rynek 10, 67-200 Głogów.
2. W przetargu mogą brać udział osoby fizyczne i prawne, które w wyznaczonym
   terminie wniosą wadium i przedłożą komisji przetargowej w dniu przetargu:
   1) w przypadku osoby fizycznej: dokument stwierdzający tożsamość;
   2) w przypadku osoby prawnej lub innej jednostki podlegającej obowiązkowi
      wpisu do KRS: dokument stwierdzający tożsamość osoby reprezentującej
      podmiot, odpis/wydruk z KRS (ważny 3 miesiące), uchwałę wyrażającą zgodę
      na nabycie nieruchomości;
   3) w pozostałych przypadkach: stosowne dokumenty, np. umowy, uchwały,
      zaświadczenia oraz dokument stwierdzający tożsamość osoby upoważnionej
      do nabycia nieruchomości;
   4) w przypadku pełnomocnika: dokument stwierdzający tożsamość
      oraz pełnomocnictwo notarialne lub z poświadczonym podpisem mocodawcy.
WRM.DGiGG.6840.5.18.2025.JSz

3. Nabycie nieruchomości przez cudzoziemca może nastąpić w przypadku
   uzyskania zezwolenia ministra właściwego do spraw wewnętrznych,
   jeżeli wymagają tego przepisy ustawy z dnia 24 marca 1920 r. o nabywaniu
   nieruchomości przez cudzoziemców (t. j. Dz. U. z 2017 r., poz. 2278).
   Cudzoziemiec zobowiązany jest do ustalenia we własnym zakresie, czy nabycie
   nieruchomości będącej przedmiotem przetargu wymaga uzyskania zezwolenia.
4. Wadium w podanej wysokości należy wpłacić na rachunek Gminy Miejskiej
   Głogów: BNP Paribas Bank Polska S.A. nr 65 2030 0045 1110 0000 0192 9720
   z dopiskiem „wadium – Witanowice 18”, w terminie nie później niż do dnia
   14 stycznia 2026 r. Za datę wpłacenia wadium uważa się wpływ wymaganej
   kwoty na rachunek Gminy Miejskiej Głogów.
   1) Wadium zwraca się niezwłocznie, jednak nie później niż przed upływem 3 dni
      od dnia, odpowiednio: odwołania przetargu, zamknięcia przetargu,
      unieważnienia przetargu lub zakończenia przetargu wynikiem negatywnym.
      Wadium zwraca się przelewem na rachunek podany przez uczestnika
      przetargu.
   2) Wadium wpłacone przez uczestnika przetargu, który przetarg wygrał,
      zalicza się na poczet ceny nabycia nieruchomości. Zaliczenie wadium
      na poczet ceny nabycia nieruchomości nastąpi w dniu zamknięcia przetargu.
   3) Wpłacone wadium nie podlega zwrotowi w razie uchylenia się osoby,
      która przetarg wygrała, od zawarcia umowy sprzedaży.
5. Przetarg jest ważny bez względu na liczbę uczestników przetargu,
   jeżeli przynajmniej jeden uczestnik zaoferuje co najmniej jedno postąpienie
   powyżej ceny wywoławczej. O wysokości postąpienia decydują uczestnicy
   przetargu, z tym że postąpienie nie może wynosić mniej niż 1% ceny
   wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych.
6. Organizator przetargu jest obowiązany zawiadomić osobę ustaloną jako nabywca
   nieruchomości o miejscu i terminie zawarcia umowy sprzedaży, najpóźniej
   w ciągu 21 dni od dnia rozstrzygnięcia przetargu. Jeżeli osoba ustalona
   jako nabywca nieruchomości nie przystąpi bez usprawiedliwienia do zawarcia
   umowy sprzedaży w miejscu i w terminie podanych w zawiadomieniu, Organizator
   przetargu może odstąpić od zawarcia umowy, a wpłacone wadium nie podlega
   zwrotowi.
WRM.DGiGG.6840.5.18.2025.JSz

7. Termin uiszczenia ceny sprzedaży nieruchomości, pomniejszonej o wpłacone
   wadium, upływa w dniu zawarcia umowy sprzedaży. O dotrzymaniu terminu
   płatności decyduje data wpływu wymaganej należności na rachunek Gminy
   Miejskiej Głogów.
8. Koszty zawarcia aktu notarialnego i koszty sądowe ponosi w całości nabywca
   nieruchomości.
9. Prezydent Miasta Głogowa zastrzega sobie prawo odwołania przetargu jedynie
   z ważnych powodów, informując o tym niezwłocznie w formie właściwej
   dla ogłoszenia o przetargu i podając przyczynę odwołania przetargu.
10. Przed przystąpieniem do przetargu należy zapoznać się z dokumentacją
   dotyczącą nieruchomości oraz z warunkami przetargu podanymi w ogłoszeniu
   o przetargu.


Informacje dotyczące zbywanej nieruchomości oraz warunki realizacji zamierzeń
inwestycyjnych.


1. Przedmiotem przetargu jest udział ½ części w nieruchomości gruntowej
   zabudowanej budynkiem mieszkalnym, parterowym z poddaszem nieużytkowym,
   niepodpiwniczonym, wybudowanym przed 1939 r. w technologii tradycyjnej
   murowanej, o powierzchni użytkowej 91,23 m2 oraz towarzyszącymi budynkami
   gospodarczymi.
2. Do budynku mieszkalnego doprowadzone jest przyłącze energii elektrycznej,
   woda użytkowa pozyskiwana jest ze studni, ścieki bytowe odprowadzane są
   do szamba, ogrzewanie budynku realizowane jest przez piece kaflowe.
3. Budynek znajduje się w niskim stanie technicznym. Wszystkie podstawowe
   elementy konstrukcyjne oraz wykończeniowe wykazują znaczący stopień zużycia
   fizycznego i funkcjonalnego. Z uwagi na zaawansowany stopień zużycia
   oraz wiek budynku, jego przydatność użytkowa jest obecnie ograniczona,
   a dalsze funkcjonowanie wymaga nakładów inwestycyjnych.
4. Przeznaczenie nieruchomości, ustalone na podstawie studium uwarunkowań
   i kierunków zagospodarowania przestrzennego gminy Gaworzyce
   (brak miejscowego planu zagospodarowania przestrzennego), określone zostało
   jako tereny z przewagą zabudowy jednorodzinnej lub zagrodowej oraz obiektów
   usług i produkcji niekolidujących z funkcją mieszkaniową.
WRM.DGiGG.6840.5.18.2025.JSz

5. Nieruchomość jest ogrodzona, a w jej granicach zlokalizowana jest infrastruktura
   techniczna w postaci napowietrznej sieci elektroenergetycznej wraz ze słupem
   elektroenergetycznym. Nabywca obowiązany będzie nieodpłatnie udostępnić
   nieruchomość oraz zapewnić stały dostęp (dojazd i dojście) dla właściciela sieci,
   w celu wykonania czynności związanych z usuwaniem awarii, remontem,
   konserwacją, modernizacją, pracami eksploatacyjnymi, utrzymaniem
   i dokonaniem pomiarów. Nabywca zobowiązany będzie przestrzegać
   warunków zagospodarowania terenu, w miejscu przebiegu sieci, określonych
   przez jej właściciela, tj. wszelkie prace w obrębie sieci należy uzgodnić
   z gestorem tej sieci.
6. Wszystkie inwestycje i zmiany w zakresie zaopatrzenia w energię elektryczną,
   gaz, ciepło, wodę, odprowadzania ścieków, wód opadowych oraz lokalizacji
   innych urządzeń infrastruktury technicznej wymagają uzyskania przez inwestora
   warunków technicznych od właściwych dysponentów sieci. Warunki należy
   uzyskać indywidualnie, na własny koszt, w oparciu o faktyczne zapotrzebowanie
   określone przez nabywcę.
7. Przebudowa sieci uzbrojenia terenu kolidującej z planowanym zainwestowaniem
   może nastąpić na koszt inwestora, na warunkach określonych przez właściciela
   sieci.
8. Gmina Miejska Głogów nie ponosi odpowiedzialności za kolizje
   z nieuwidocznionymi na podkładach geodezyjnych sieciami uzbrojenia
   technicznego.
9. Nabywca przejmie nieruchomość w stanie istniejącym i poniesie koszty związane
   z przygotowaniem terenu pod planowaną inwestycję.
10. Dodatkowych informacji udziela Urząd Miejski w Głogowie, Rynek 10,
   67-200 Głogów, Dział Geodezji i Gospodarki Gruntami, pokój 215,
   tel. 76/ 7265453.


Prezydent Miasta Głogowa
Rafael Rokaszewicz


Głogów, 2025-11-25
WRM.DGiGG.6840.5.18.2025.JSz


RODO
Klauzula informacyjna dotycząca przetwarzania danych osobowych.
Tożsamość         Prezydent Miasta Głogowa
i dane            Rynek 10, 67-200 Głogów
kontaktowe        e-mail: prezydent@glogow.um.gov.pl, tel.: +48 76/ 7265401
administratora:
Dane              Rynek 10, 67-200 Głogów
kontaktowe        e-mail: iod@glogow.um.gov.pl, tel.: +48 76/ 7265471
inspektora
ochrony danych
osobowych:
Cel               Realizacja czynności związanych ze zbyciem nieruchomości
przetwarzania:    w drodze przetargu.
Kategorie         Dane identyfikacyjne oraz dane kontaktowe.
danych
osobowych:
Źródło danych:    Druga strona umowy lub osoba, której dane dotyczą.
Podstawa          1. Art. 6 ust. 1 lit. b RODO – przetwarzanie jest niezbędne
prawna               do wykonania umowy, której stroną jest osoba, której dane
przetwarzania        dotyczą lub do podjęcia działań na żądanie osoby, której
danych               dane dotyczą, przed zawarciem umowy.
osobowych:        2. Art. 6 ust. 1 lit. c RODO – przetwarzanie jest niezbędne
                     do wypełnienia obowiązku prawnego ciążącego
                     na administratorze, wynikającego z przepisów:
                  1) Rozporządzenia Rady Ministrów z dnia 14 września 2004 r.
                     w sprawie sposobu i trybu przeprowadzania przetargów
                     oraz rokowań na zbycie nieruchomości;
                  2) Ustawy z dnia 21 sierpnia 1997 r. o gospodarce
                     nieruchomościami;
                  3) Ustawy z dnia 6 lipca 1982 r. o księgach wieczystych
                     i hipotece;
                  4) Ustawy z dnia 27 sierpnia 2009 r. o finansach publicznych
                     (do celu księgowania, windykacji i egzekucji zobowiązań);
WRM.DGiGG.6840.5.18.2025.JSz


                 5) Ustawy z dnia 17 listopada 1964 r. Kodeks postępowania
                    cywilnego;
                 6) Uchwały nr IV/24/2024 Rady Miejskiej w Głogowie z dnia
                    26 czerwca 2024 r. w sprawie zasad gospodarowania
                    nieruchomościami stanowiącymi własność Gminy Miejskiej
                    Głogów.
                 3. Art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes
                    realizowany przez administratora w celu realizacji umowy,
                    ustalenia i dochodzenia ewentualnych roszczeń.
Odbiorcy         Do Pani/Pana danych osobowych będą mieć dostęp:
danych:          pracownicy Urzędu Miejskiego w Głogowie, Rynek 10,
                 67-200 Głogów, pracownicy Sądu Rejonowego w Głogowie
                 V Wydziału Ksiąg Wieczystych, ul. Kutrzeby 2, 67-200 Głogów,
                 pracownicy Powiatowego Ośrodka Dokumentacji Geodezyjnej
                 i Kartograficznej w Głogowie, ul. Sikorskiego 21, 67-200 Głogów
                 oraz inne podmioty, np. firmy informatyczne serwisujące
                 systemy informatyczne, banki, kancelarie notarialne, kancelarie
                 prawne, kurierzy itp.
Okres            Akta sprawy stanowią materiały archiwalne i będą
przechowywania przechowywane przez okres 25 lat, licząc od stycznia kolejnego
danych:          roku po zakończeniu sprawy. Następnie zostaną przekazane
                 do Archiwum Państwowego, gdzie będą przechowywane
                 wieczyście.
Prawa            Przysługuje Pani/Panu prawo dostępu do Pani/Pana danych,
podmiotów        prawo żądania ich sprostowania i prawo do ograniczenia
danych:          ich przetwarzania w zakresie dopuszczonym przez przepisy
                 prawa. W celu skorzystania ze swoich praw należy
                 skontaktować się z inspektorem ochrony danych.
Prawo            Przysługuje Pani/Panu prawo do wniesienia sprzeciwu,
do sprzeciwu:    z przyczyn związanych ze szczególną sytuacją, wobec
                 przetwarzania danych osobowych.
Prawo            Przysługuje Pani/Panu prawo wniesienia skargi do organu
wniesienia       nadzorczego, tj. do Prezesa Urzędu Ochrony Danych
WRM.DGiGG.6840.5.18.2025.JSz


skargi            Osobowych na adres: Biuro Prezesa Urzędu Ochrony Danych
do organu         Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa,
nadzorczego:      tel. +48 22/ 5310300.
Informacja        Podanie danych osobowych jest wymogiem ustawowym.
o dowolności      Brak podania danych obligatoryjnych skutkować będzie brakiem
lub obowiązku     realizacji w/w celu.
podania danych:
`,
};

// Real title of a procedural qualified-bidders-list notice from the SAME
// board (crawl.js gates these on the TITLE ALONE, before any article fetch —
// mirrored here by building the blob with no body).
const QUALIFIED_LIST_TITLE =
  'LISTA OSÓB ZAKWALIFIKOWANYCH do drugiego przetargu ustnego ograniczonego do właścicieli nieruchomości przyległych na sprzedaż nieruchomości gruntowej niezabudowanej, położonej w Głogowie w obrębie 18 „Kopernik”, oznaczonej nr geod. 411/2 o powierzchni 41 m2, ujawnionej w księdze wieczystej nr LE1G/00052132/4, stanowiącej własność Gminy Miejskiej Głogów';

const blob = (f) => buildRecordText(f);

// ------------------------------------------------------------------- unit funcs

test('parsePLN: no-separator grosze form, defensive space/dot stripping', () => {
  assert.equal(parsePLN('345000,00'), 345000);
  assert.equal(parsePLN('550000,00'), 550000);
  assert.equal(parsePLN('1 234 567'), 1234567);
  assert.equal(parsePLN('180.000,00'), 180000);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: word ordinals, singular + plural, decoy-safe', () => {
  assert.equal(roundFromText(blob(ANN_RZEMIESLNICZA)), 3); // "trzeci" — beats item 16's "Pierwszy … a drugi …" history
  assert.equal(roundFromText(blob(ANN_CHROBREGO)), 1); // PLURAL "pierwsze przetargi"
  assert.equal(roundFromText(blob(ANN_KAMIENNA49)), 2); // "drugi"
  assert.equal(roundFromText(blob(RES_KAMIENNA37_8)), 4); // genitive "czwartego przetargu"
  assert.equal(roundFromText(blob(RES_JEDNOSCI)), 3); // "trzeciego"
});

test('auctionDateFromText: announcement (odbędzie/odbędą się) + result (przeprowadzono)', () => {
  assert.equal(auctionDateFromText(blob(ANN_RZEMIESLNICZA)), '2026-09-15'); // not 31.03/9.06 (history decoy)
  assert.equal(auctionDateFromText(blob(ANN_CHROBREGO)), '2026-07-06'); // plural "Przetargi odbędą się"
  assert.equal(auctionDateFromText(blob(ANN_KUTRZEBY)), '2025-05-13');
  assert.equal(auctionDateFromText(blob(RES_CHROBREGO_6_15)), '2026-07-06');
  assert.equal(auctionDateFromText(blob(RES_KAMIENNA49_HOUSE)), '2025-04-15');
});

test('startingPriceFromText: nominative announcement + ACCUSATIVE result forms', () => {
  assert.equal(startingPriceFromText(ANN_RZEMIESLNICZA.body), 345000); // "Cena wywoławcza: 345000,00 zł"
  assert.equal(startingPriceFromText(RES_CHROBREGO_6_15.body), 180000); // "cenę wywoławczą ustalono na kwotę …" (ę!)
  assert.equal(startingPriceFromText(RES_JEDNOSCI.body), 165000); // "cenę wywoławczą lokalu ustalono …"
  assert.equal(startingPriceFromText(RES_KAMIENNA49_HOUSE.body), 550000); // amount NOT followed by "zł"
  assert.equal(startingPriceFromText(RES_KUTRZEBY.body), 950000); // long "w drugim przetargu … ustalono" gap
});

test('achievedPriceFromText: only when a buyer (Nabywcą) is named', () => {
  assert.equal(achievedPriceFromText(RES_JEDNOSCI.body), 166650);
  assert.equal(achievedPriceFromText(RES_CHROBREGO_6_15.body), null); // unsold
  assert.equal(achievedPriceFromText(RES_KUTRZEBY.body), null); // unsold
});

test('unitAreaFromText: usable area only — skips the zabudowy footprint', () => {
  assert.equal(unitAreaFromText(ANN_RZEMIESLNICZA.body), 47.75);
  assert.equal(unitAreaFromText(ANN_KAMIENNA49.body), 182.03); // NOT 131,06 (powierzchni zabudowy)
  assert.equal(unitAreaFromText(RES_JEDNOSCI.body), 58.26);
});

test('addressRawFromText: "przy ul." AND spelled-out "przy ulicy"; unit nr appended', () => {
  assert.equal(addressRawFromText(ANN_RZEMIESLNICZA.body), 'Rzemieślniczej 21a/9');
  assert.equal(addressRawFromText(RES_KAMIENNA49_HOUSE.body), 'Kamienna Droga 49'); // "przy ulicy …", no unit
  assert.equal(addressRawFromText(RES_KAMIENNA37_8.body), 'Kamienna Droga 37/8');
});

test('landStreetFromText + landPlotFromText: subject-bounded parcel/area', () => {
  assert.equal(landStreetFromText(ANN_KUTRZEBY.body), 'Stanisława Kutrzeby');
  const plot = landPlotFromText(ANN_KUTRZEBY.body);
  assert.equal(plot.dzialka_nr, '159/2'); // NOT '159/2, 118' — easement decoy parcel excluded
  assert.equal(plot.area_m2, 1935); // "1935 m2" — no \b between m and 2
  assert.equal(landPlotFromText(RES_KUTRZEBY.body).dzialka_nr, '159/2');
  assert.equal(landPlotFromText(RES_KUTRZEBY.body).area_m2, 1935);
});

test('kindFromText: subject-statement head beats deep zoning boilerplate', () => {
  assert.equal(kindFromText(blob(ANN_KAMIENNA49)), 'zabudowana'); // NOT 'garaz' ("… parkingi, miejsca postojowe i garaże")
  assert.equal(kindFromText(blob(RES_KAMIENNA49_HOUSE)), 'zabudowana');
  assert.equal(kindFromText(blob(ANN_RZEMIESLNICZA)), 'mieszkalny');
  assert.equal(kindFromText(blob(ANN_KUTRZEBY)), 'grunt');
  assert.equal(kindFromText(blob(RES_KUTRZEBY)), 'grunt');
});

test('splitLots: 3 chunks for the bundled announcement, 1 for everything else', () => {
  assert.equal(splitLots(ANN_CHROBREGO.body).length, 3);
  assert.equal(splitLots(ANN_RZEMIESLNICZA.body).length, 1);
  assert.equal(splitLots(RES_KAMIENNA37_8.body).length, 1);
});

test('gates: stream routing + noise exclusion', () => {
  for (const f of [ANN_RZEMIESLNICZA, ANN_CHROBREGO, ANN_KAMIENNA49, ANN_KUTRZEBY]) {
    assert.equal(isAnnouncement(blob(f)), true);
    assert.equal(isResultDoc(blob(f)), false);
  }
  for (const f of [RES_CHROBREGO_6_15, RES_JEDNOSCI, RES_KAMIENNA37_8, RES_KAMIENNA49_HOUSE, RES_KUTRZEBY]) {
    assert.equal(isResultDoc(blob(f)), true);
    assert.equal(isAnnouncement(blob(f)), false); // results never carry "ogłasza" — routing order is safe
    assert.equal(isSaleAuction(blob(f)), true);
    assert.equal(isLease(blob(f)), false);
  }
  assert.equal(isSaleAuction(blob(ANN_RZEMIESLNICZA)), true);
  assert.equal(isLease(blob(ANN_RZEMIESLNICZA)), false);
  // Qualified-bidders list: title-only blob, exactly as crawl.js gates it.
  const qual = buildRecordText({ title: QUALIFIED_LIST_TITLE });
  assert.equal(isQualifiedBiddersList(qual), true);
  assert.equal(isAnnouncement(qual), false);
  assert.equal(isResultDoc(qual), false);
});

test('isNegativeOutcome: both real negative phrasings; false when sold', () => {
  assert.equal(isNegativeOutcome(blob(RES_CHROBREGO_6_15)), true); // "nikt nie przystąpił"
  assert.equal(isNegativeOutcome(blob(RES_KUTRZEBY)), true); // "nie zaoferował postąpienia"
  assert.equal(isNegativeOutcome(blob(RES_JEDNOSCI)), false); // sold
});

// --------------------------------------------------------------- announcements

test('parseAnnouncement: single-lot flat (Rzemieślniczej 21a/9, round III)', () => {
  const recs = parseAnnouncement(blob(ANN_RZEMIESLNICZA));
  assert.equal(recs.length, 1);
  const [r] = recs;
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Rzemieślniczej 21a/9');
  assert.equal(r.address.key, 'rzemieslniczej|21A|9');
  assert.equal(r.area_m2, 47.75);
  assert.equal(r.starting_price_pln, 345000);
  assert.equal(r.auction_date, '2026-09-15');
  assert.equal(r.round, 3);
});

test('parseAnnouncement: MULTI-LOT — three flats, per-lot fields, shared session', () => {
  const recs = parseAnnouncement(blob(ANN_CHROBREGO));
  assert.equal(recs.length, 3);
  const byApt = Object.fromEntries(recs.map((r) => [r.address.apt, r]));
  assert.deepEqual(Object.keys(byApt).sort(), ['13', '14', '15']);
  assert.equal(byApt['13'].starting_price_pln, 240000);
  assert.equal(byApt['13'].area_m2, 70.49);
  assert.equal(byApt['14'].starting_price_pln, 260000);
  assert.equal(byApt['14'].area_m2, 77.42);
  assert.equal(byApt['15'].starting_price_pln, 180000);
  assert.equal(byApt['15'].area_m2, 47.47);
  for (const r of recs) {
    assert.equal(r.kind, 'mieszkalny');
    assert.equal(r.address.street, 'Wały Bolesława Chrobrego');
    assert.equal(r.address.building, '6');
    assert.equal(r.auction_date, '2026-07-06'); // shared
    assert.equal(r.round, 1); // shared
  }
});

test('parseAnnouncement: whole house (Kamienna Droga 49, round II) — address-keyed zabudowana', () => {
  const recs = parseAnnouncement(blob(ANN_KAMIENNA49));
  assert.equal(recs.length, 1);
  const [r] = recs;
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'kamienna droga|49|');
  assert.equal(r.area_m2, 182.03);
  assert.equal(r.starting_price_pln, 530000);
  assert.equal(r.auction_date, '2025-08-05');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: land (Kutrzeby dz. 159/2, round II) — parcel-keyed grunt', () => {
  const recs = parseAnnouncement(blob(ANN_KUTRZEBY));
  assert.equal(recs.length, 1);
  const [r] = recs;
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '159/2');
  assert.equal(r.area_m2, 1935);
  assert.equal(r.address_raw, 'Stanisława Kutrzeby');
  assert.equal(r.starting_price_pln, 950000);
  assert.equal(r.auction_date, '2025-05-13');
  assert.equal(r.round, 2);
});

// --------------------------------------------------------------------- results

test('parseResultDoc: UNSOLD flat (Chrobrego 6/15, round I) — clean, no notes', () => {
  const [r] = parseResultDoc(blob(RES_CHROBREGO_6_15), '2026-07-14', 'https://glogow.bip.info.pl/api/fo/files/X/download');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'waly boleslawa chrobrego|6|15');
  assert.equal(r.area_m2, 47.47);
  assert.equal(r.starting_price_pln, 180000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-07-06'); // body's "przeprowadzono w dniu" beats the fallback
  assert.equal(r.source_pdf, 'https://glogow.bip.info.pl/api/fo/files/X/download'); // the field build-properties persists
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: SOLD flat (Jedności Robotniczej 6a/10, round III)', () => {
  const [r] = parseResultDoc(blob(RES_JEDNOSCI), null, 'https://glogow.bip.info.pl/api/fo/files/Y/download');
  assert.equal(r.address.key, 'jednosci robotniczej|6A|10');
  assert.equal(r.area_m2, 58.26);
  assert.equal(r.starting_price_pln, 165000);
  assert.equal(r.final_price_pln, 166650);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2025-03-04');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: one attachment of a multi-attachment article — body wins over aggregate title', () => {
  const [r] = parseResultDoc(blob(RES_KAMIENNA37_8), '2025-06-02', 'Z');
  assert.equal(r.address.key, 'kamienna droga|37|8'); // NOT 39/2, 39/6, 39/8 from the shared title
  assert.equal(r.starting_price_pln, 185000);
  assert.equal(r.area_m2, 78.83);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 4);
  assert.equal(r.auction_date, '2025-05-20');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: UNSOLD house (Kamienna Droga 49, "przy ulicy", no-zł price)', () => {
  const [r] = parseResultDoc(blob(RES_KAMIENNA49_HOUSE), '2025-04-23', 'W');
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'kamienna droga|49|');
  assert.equal(r.area_m2, 182.03);
  assert.equal(r.starting_price_pln, 550000);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-04-15');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: UNSOLD land (Kutrzeby dz. 159/2, round II) — parcel-keyed, source_url', () => {
  const [r] = parseResultDoc(blob(RES_KUTRZEBY), '2025-05-22', 'https://glogow.bip.info.pl/api/fo/files/V/download');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '159/2');
  assert.equal(r.area_m2, 1935);
  assert.equal(r.starting_price_pln, 950000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2025-05-13');
  assert.equal(r.source_url, 'https://glogow.bip.info.pl/api/fo/files/V/download'); // the field build-land persists
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: returns [] for a non-result (announcement) blob', () => {
  assert.deepEqual(parseResultDoc(blob(ANN_RZEMIESLNICZA), null, 'x'), []);
});

// ------------------------------------------- square addresses + parcel fallback

test('addressRawFromText: "przy Placu 1000-lecia 10" — designator folded, digits-first street', () => {
  assert.equal(addressRawFromText(RES_PLAC1.body), 'Plac 1000-lecia 10/22');
});

test('parseResultDoc: UNSOLD flat on Plac 1000-lecia (round I) — generic title, body-sourced address', () => {
  const [r] = parseResultDoc(blob(RES_PLAC1), '2025-02-11', 'P');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'plac 1000 lecia|10|22');
  assert.equal(r.address.street, 'Plac 1000-lecia');
  assert.equal(r.area_m2, 35.29);
  assert.equal(r.starting_price_pln, 172000); // dot-thousands "172.000,00 zł"
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-01-28');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: shed-plot zabudowana with no building number — parcel-keyed fallback', () => {
  const [r] = parseResultDoc(blob(RES_SPOKOJNA), '2023-05-18', 'S');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '93');
  assert.equal(r.area_m2, 1256);
  assert.equal(r.address_raw, 'Spokojnej');
  assert.equal(r.starting_price_pln, 200000);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2023-05-09');
  assert.deepEqual(r.notes, ['parse: address-less built property — parcel-keyed']);
});

test('parseResultDoc: village-estate share (Witanowice) — parcel-keyed fallback, no street', () => {
  const [r] = parseResultDoc(blob(RES_WITANOWICE), '2026-01-30', 'V');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '99');
  assert.equal(r.area_m2, 700);
  assert.equal(r.address_raw, null);
  assert.equal(r.starting_price_pln, 50000); // "50000,00 (słownie…" — no trailing zł
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-01-20');
  assert.deepEqual(r.notes, ['parse: address-less built property — parcel-keyed']);
});

test('parseAnnouncement: Witanowice share — same parcel-keyed fallback on the announcement path', () => {
  const recs = parseAnnouncement(blob(ANN_WITANOWICE));
  assert.equal(recs.length, 1);
  const [r] = recs;
  assert.equal(r.kind, 'grunt'); // routes to land.json
  assert.equal(r.dzialka_nr, '99');
  assert.equal(r.area_m2, 700);
  assert.equal(r.starting_price_pln, 50000);
  assert.equal(r.auction_date, '2026-01-20');
  assert.equal(r.round, 1);
});
