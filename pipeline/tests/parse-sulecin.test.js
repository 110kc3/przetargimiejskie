// Sulęcin parser tests — REAL fixtures: cached born-digital + OCR PDF text,
// live-fetched from bip.sulecin.pl 2026-07-11. Groundtruth hand-verified against
// the source PDFs (see src/cities/sulecin/parse.js header for the six document
// pairs and their confirmed figures). NOTE: the lease (dzierżawa) gate is tested
// against a synthetic title built from Sulęcin's own real phrasing (no live
// dzierżawa listing existed on the board at build time) — flagged inline below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePLN, haToM2, monthNum,
  announceRoundFromText, announceDateFromText, resultDateFromText,
  isLease, isResultNotice, isNegativeOutcome,
  startingPriceFromWynik, achievedPriceFromWynik,
  wynikFlatAddressRaw, wynikLandParcel,
  parseResultDoc, parseAnnouncement,
} from '../src/cities/sulecin/parse.js';

const RYCHLIK_II_WYNIK = `Nasz znak: IZiG.7124.8.2024                                                    data: 10 lipca 2025 r.


          Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i
trybu       przeprowadzania       przetargów      oraz     rokowań      na     zbycie  nieruchomości
(t.j. Dz. U. z 2021 r. poz. 2213) Burmistrz Sulęcina podaje do publicznej wiadomości:

                                  informację o wyniku przetargu

    1. Data i miejsce oraz rodzaj przeprowadzonego przetargu:

       10 lipca 2025 r., Urząd Miejski w Sulęcinie, ul. Lipowa 18,
       pierwszy przetarg ustny nieograniczony dot. sprzedaży lokalu mieszkalnego
       stanowiącego własność Gminy Sulęcin.

    2. Oznaczenie nieruchomości będącej przedmiotem przetargu według katastru nieruchomości i
       księgi wieczystej:

       Lokal mieszkalny nr 3 w Rychliku, numer budynku 16B, znajdujący się na działce nr 14/6
       obręb 0045, księga wieczysta gruntu: GW1U/00003532/6

    3. Liczba osób dopuszczonych do uczestnictwa w przetargu:
       2

    4. Cena wywoławcza nieruchomości:
       73 100,00 zł (sprzedaż zwolniona z VAT zgodnie z art. 43 ust. 1 pkt 10 i art. 29a ust. 8 ustawy
       z dnia 11 marca 2004 r. o podatku od towarów i usług (t.j. Dz. U. z 2025 r. poz. 775).

   5. Cena osiągnięta w przetargu
      73 840,00 zł brutto (sprzedaż zwolniona z VAT zgodnie z art. 43 ust. 1 pkt 10 i art. 29a ust.
      8 ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług (t.j. Dz. U. z 2025 r. poz.
      775).

   6. Imię i nazwisko albo nazwa firmy ustalonej jako nabywcy nieruchomości:
      Państwo Małgorzata i Radosław Cerbin




                                                                  Signature Not Verified
                                                                  Dokument podpisany przez
                                                                  IWONA WALCZAK
                                                                  Data: 2025.07.10 14:59:08
                                                                  CEST
`;

const RYCHLIK_I_WYNIK = `Nasz znak: IZiG.7124.8.2024                                                          data: 20 maja 2025 r.



        Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i
trybu       przeprowadzania      przetargów       oraz      rokowań       na      zbycie         nieruchomości
(Dz. U. z 2021 r., poz. 2213 ) Burmistrz Sulęcina podaje do publicznej wiadomości:



                                         informację o wyniku przetargu

    1. Data i miejsce oraz rodzaj przeprowadzonego przetargu:
        13 maja 2025 r., Urząd Miejski Sulęcin ul. Lipowa 18, pierwszy przetarg ustny
        nieograniczony na sprzedaż lokalu mieszkalnego.


    2. Oznaczenie nieruchomości będącej przedmiotem przetargu:
        Lokal mieszkalny nr 3 położony w Rychliku – numer budynku 16, klatka B, położony na
        działce nr 14/6, księga wieczysta gruntu GW1U/00003532/6.


    3. Liczba osób dopuszczonych do uczestnictwa w przetargu:

        0

    4. Cena wywoławcza nieruchomości:
        73 100,00 zł brutto (sprzedaż zwolniona z VAT zgodnie z art. 43 ust. 1 pkt 10 i art. 29a ust. 8 ustawy
        z dnia 11 marca 2004 r. o podatku od towarów i usług Dz. U. z 2024 r., poz. 361 t.j.).

    5. Imię, nazwisko albo nazwa firmy ustalonej jako nabywca nieruchomości:
        brak wpłaty wadium, więc przetarg zakończył się wynikiem negatywnym.
`;

const ZUBROW_WYNIK = `Nasz znak: IZiG.7124.11.2024                                          data: 17 marca 2025 r.


        Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i
trybu     przeprowadzania       przetargów      oraz     rokowań       na    zbycie  nieruchomości
(Dz. U. z 2021 r., poz. 2213) Burmistrz Sulęcina podaje do publicznej wiadomości:

                                 informację o wyniku przetargu

   1. Data i miejsce oraz rodzaj przeprowadzonego przetargu:

       10 marca 2025 r., Urząd Miejski w Sulęcinie, ul. Lipowa 18,
       pierwszy przetarg ustny nieograniczony dot. sprzedaży lokalu mieszkalnego
       stanowiącego własność Gminy Sulęcin.

   2. Oznaczenie nieruchomości będącej przedmiotem przetargu według katastru nieruchomości i
      księgi wieczystej:

       Lokal mieszkalny nr 1 w Żubrowie, numer budynku 23, znajdujący się na działce nr 77/4
       obręb 0054, księga wieczysta lokalu: GW1U/00011498/4

   3. Liczba osób dopuszczonych do uczestnictwa w przetargu:
      2

   4. Cena wywoławcza nieruchomości:
      97 200,00 zł (sprzedaż zwolniona z VAT zgodnie z art. 43 ust. 1 pkt 10 i art. 29a ust. 8 ustawy
      z dnia 11 marca 2004 r. o podatku od towarów i usług (Dz. U. z 2024 r., poz. 361).

   5. Cena osiągnięta w przetargu
      98 180,00 zł brutto (sprzedaż zwolniona z VAT zgodnie z art. 43 ust. 1 pkt 10 i art. 29a ust.
      8 ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług (Dz. U. z 2024 r., poz. 361).

   6. Imię i nazwisko albo nazwa firmy ustalonej jako nabywcy nieruchomości:
      Państwo Dominika Patrycja i Andrzej Raniewicz
`;

const DZ437_WYNIK = `Nasz znak: IZiG. 6840.2.2026 data : 22 stycznia 2026 r.
Nasz znak: IZiG. 6840.1.2025

Zgodnie z$ 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu |
trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2014 r., poz. 1490 )
Burmistrz Sulęcina podaje do publicznej wiadomości:

informację o wyniku przetargu

1. data i miejsce oraz rodzaj przeprowadzonego przetargu :
14 stycznia 2026 r., Urząd Miejski Sulęcin ul. Lipowa 18,
pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości gruntowej
niezabudowanej.

2. oznaczenie nieruchomości będącej przedmiotem przetargu według katastru nieruchomości i księgi
wieczystej;
nieruchomość gruntowa niezabudowana składająca się z działki nr 437/1 o pow.0.0295 ha
położona w Sulęcinie obręb 0048.
Dla nieruchomości Sąd Rejonowy w Sulęcinie Wydział Ksiąg Wieczystych prowadzi księgę
wieczystą nr GW1U/00002496/4.

3. liczba osób dopuszczonych do uczestnictwa w przetargu ;

2 ( małżonkowie)
4. cena wywoławcza nieruchomości ;
29 000,00 zł brutto ( sprzedaż zwolniona z podatku VAT zgodnie z ustawą z dnia 11
marca 2004 r. o podatku od towarów i usług ( Dz. U z 2025 r. poz. 7751570 ze zm. )

5. cena uzyskana w przetargu ;
29 290,00 zł brutto ( sprzedaż zwolniona z podatku VAT zgodnie z ustawą z dnia 11
marca 2004 r. o podatku od towarów i usług ( t.j. Dz. U z 2025 r. poz. 1570 ze zm. )

6. Imię, nazwisko albo nazwa firmy ustalonej jako nabywca nieruchomości ;
Państwo Anna i Marcin Zmudzińscy

Dariusz Ejchart

Burmistrz Sulęcina

podpisano certyfikowanym
podpisem elektronicznym
`;

const DZ231_WYNIK = `Nasz znak: IZiG. 6840.3.2025                                                      data : 8 lipca 2025 r.


      Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i
trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2014 r., poz. 1490 )
Burmistrz Sulęcina podaje do publicznej wiadomości:

                                   informację o wyniku przetargu

   1. data i miejsce oraz rodzaj przeprowadzonego przetargu :
           30 czerwca 2025 r., Urząd Miejski Sulęcin ul. Lipowa 18,
           pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości gruntowej
           niezabudowanej .

   2. oznaczenie nieruchomości będącej przedmiotem przetargu według katastru nieruchomości i księgi
      wieczystej;
          nieruchomość gruntowa niezabudowana składająca się z działki nr 231/17 o pow.0.0035 ha
          położona w Sulęcinie obręb 48.
          Dla nieruchomości Sąd Rejonowy w Sulęcinie Wydział Ksiąg Wieczystych prowadzi księgę
          wieczystą nr GW1U/00003095/0.

   3. liczba osób dopuszczonych do uczestnictwa w przetargu ;

          2
   4. cena wywoławcza nieruchomości ;
         7 740,00 zł brutto ( sprzedaż zwolniona z podatku VAT zgodnie z ustawą z dnia 11
                  marca 2004 r. o podatku od towarów i usług ( Dz. U z 2023 r. poz. 1570 ze zm. )

   5. cena uzyskana w przetargu ;
        13 800,00 zł brutto ( sprzedaż zwolniona z podatku VAT zgodnie z ustawą z dnia 11
                  marca 2004 r. o podatku od towarów i usług ( Dz. U z 2023 r. poz. 1570 ze zm. )


   6. Imię, nazwisko albo nazwa firmy ustalonej jako nabywca nieruchomości ;
         Państwo Lucyna i Mariusz Lurka
`;

const RYCHLIK_II_OGL = `                                                                                                                                                  Sulęcin, dnia 10 czerwca 2025 r.


                                                                           69-200 SULĘCIN, UL. LIPOWA 18,
                                                                          TEL. (95) 755 36 01 FAX 95 755 21 22
                                                                                  e-mail: umig@sulecin.pl
                                                                                      www.sulecin.pl




                                                                        BURMISTRZ SULĘCINA
                                                                                        ogłasza
                                                                          II przetarg ustny nieograniczony
             w dniu 10 lipca 2025 roku o godz. 10:00 w sali konferencyjnej Urzędu Miejskiego w Sulęcinie ul. Lipowa 18 na sprzedaż lokalu
                                                                                    mieszkalnego:



                                                                                 Rychlik 16B/3, gmina Sulęcin

             Położenie               Numer          Powierzchnia działki (ha)                Księga wieczysta gruntu                 Cena wywoławcza brutto             Wadium (zł)
              lokalu                 działki                                                                                                    (zł)
                                                    Udział w nieruchomości

        gmina Sulęcin                 14/6                    0,0524                             GW1U/00003532/6                             73 100,00                    7 310,00
     obręb: 0045 Rychlik
                                                             110/1000

 Lokal mieszkalny nr 3 wraz z udziałem w prawie własności gruntu i częściach wspólnych budynku, położony w gminie Sulęcin, we wsi Rychlik w budynku nr 16B.


 Lokal usytuowany jest w parterze, po prawej stronie klatki schodowej. Wejście do lokalu z klatki schodowej. Powierzchnia użytkowa lokalu mieszkalnego: 26,90 m2. Ilość pomieszczeń: pokój,
 kuchnia, łazienka, przedpokój. Wysokość pomieszczeń: 2,50 m. Instalacje w lokalu: elektryczna, wodna, kanalizacyjna, ogrzewanie piecowe (jeden piec kaflowy pokojowy), ciepła woda użytkowa
 (z pieca kaflowego kuchennego z podkową i bojlerem), wentylacja grawitacyjna.


 Udział lokalu w częściach wspólnych budynku i prawie do gruntu: 110/1000. Standard wykończenia lokalu niekorzystny. Lokal wymaga przeprowadzenia gruntownego remontu.


 Budynek, w którym znajduje się przedmiotowy lokal, jest obiektem mieszkalnym wielorodzinnym, dwukondygnacyjnym, podpiwniczonym, w zabudowie wolnostojącej, oznaczonym adresowo:
 Rychlik 16b. Budynek wybudowany został w 1969 r. w technologii tradycyjnej. W budynku wydzielono 6 lokali mieszkalnych.


 Budynek mieszkalny umiejscowiony jest na działce gruntu nr 14/6 o powierzchni 524 m2. Kształt działki regularny, prostokątny. Rzeźba terenu o nieznacznych zróżnicowaniach.
 Niezabudowany obszar działki stanowi niewielkie podwórze.


 Właściciel lokalu: Gmina Sulęcin.



Aby przystąpić do przetargu należy:

W przetargu mogą brać udział osoby fizyczne lub prawne, jeżeli wpłacą wadium w pieniądzu (PLN), w kasie Urzędu Miejskiego w Sulęcinie ul. Lipowa 18 lub na konto Gminy Sulęcin - Bank PEKAO
S.A. O/Sulęcin nr 79124036241111000030633166 w takim terminie, aby najpóźniej w dniu 3 lipca 2025 roku wymagana kwota znajdowała się na koncie Urzędu Miejskiego. O wysokości postąpienia
decydują uczestnicy przetargu, z tym, że postąpienie nie może wynosić mniej niż 1 % ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. Wadium wniesione
w pieniądzu przez uczestnika przetargu, który przetarg wygrał, zalicza się na poczet ceny nabycia nieruchomości gruntowej. Pozostałym uczestnikom przetargu wadium zwraca się niezwłocznie
po odwołaniu lub zamknięciu przetargu, jednak nie później niż przed upływem 3 dni od dnia odwołania lub zamknięcia przetargu. Tytuł wpłaty wadium winien wskazywać jednoznacznie uczestnika
przetargu.

Uczestnicy przetargu zobowiązani są do przedłożenia komisji przetargowej przed otwarciem przetargu :

 - dowodu wniesienia wadium oraz dokumentu tożsamości (dowód osobisty, paszport),

 - osoba reprezentująca w przetargu osobę prawną (lub jednostkę organizacyjną nie posiadającą osobowości prawnej) aktualny wypis z właściwego dla danego podmiotu rejestru, dokument
 określający ustrój reprezentowanego podmiotu (np. umowę spółki, statut spółdzielni, statut stowarzyszenia itp.) oraz zgodę właściwych organów statutowych na nabycie nieruchomości objętej
 przetargiem
 - w przypadku reprezentowania przez pełnomocnika osoby prawnej lub jednostki organizacyjnej nie posiadającej osobowości prawnej należy przedłożyć pełnomocnictwo upoważniające do
 działania na etapie postępowania przetargowego z notarialnie poświadczonym podpisem mocodawcy, natomiast do nabycia w drodze umowy notarialnej pełnomocnictwo w formie aktu
 notarialnego,

 - w przypadku małżonków, konieczna jest obecność obojga małżonków lub jednego z nich z pełnomocnictwem drugiego małżonka, zawierającym zgodę na odpłatne nabycie nieruchomości
 do majątku wspólnego. Dopuszczalne jest pełnomocnictwo współmałżonka wyłącznie do czynności przetargowych w formie pisemnej z poświadczonym notarialnie podpisem. Pełnomocnictwo
 do czynności przetargowych i nabycia w drodze umowy notarialnej powinno być sporządzone w formie aktu notarialnego. Małżonek pozostający w rozdzielności majątkowej, uczestniczący
 w czynnościach przetargowych powinien przedłożyć dokument potwierdzający ustanowienie rozdzielności majątkowej.

Nabycie nieruchomości przez cudzoziemców może nastąpić w przypadku uzyskania zezwolenia Ministra Spraw Wewnętrznych, jeżeli wymagają tego przepisy ustawy z dnia 24 marca 1920 roku
o nabywaniu nieruchomości przez cudzoziemców (Dz. U z 2017 r., poz. 2278 ze zm.). Nabywca nieruchomości jest zobowiązany we własnym zakresie do ustalenia, czy nabycie nieruchomości
będącej przedmiotem przetargu wymaga takiego zezwolenia.

Wylicytowana cena sprzedaży pomniejszona o wpłacone wadium podlega zapłacie przed zawarciem aktu notarialnego.

Osoba ustalona jako nabywca nieruchomości w terminie do 21 dni od daty rozstrzygnięcia przetargu zawiadomiona zostanie pisemnie o miejscu i terminie zawarcia umowy notarialnej. Wyznaczony
termin nie może być krótszy niż 7 dni od dnia doręczenia zawiadomienia. Koszty notarialne i sądowe ponosi Nabywca. Jeżeli osoba ustalona Nabywcą nieruchomości nie stawi się bez
usprawiedliwienia w miejscu i terminie podanym w zawiadomieniu, Burmistrz może odstąpić od zawarcia umowy notarialnej, a wpłacone wadium nie podlega zwrotowi.

Na Nabywcy spoczywa obowiązek podatkowy w podatku od nieruchomości wynikający z ustawy z dnia 12 stycznia 1991 r. o podatkach i opłatach lokalnych (Dz. U z 2023 r., poz.70).

Przetarg zostanie przeprowadzony zgodnie z Rozporządzeniem Rady Ministrów z 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(Dz. U z 2021 r., poz. 2213).

Z uzasadnionej przyczyny przetarg może być odwołany.

Wszelkich dodatkowych informacji udziela Wydział Inwestycji, Zagospodarowania Przestrzennego i Gospodarki Nieruchomościami Urzędu Miejskiego w Sulęcinie ul. Lipowa 18, pokój nr 6, telefon
95 777 0 935. Ogłoszenie dostępne na stronie internetowej urzędu www.sulecin.pl oraz na stronie Biuletynu Informacji Publicznej www.bip.sulecin.pl.
`;

const DZ437_OGL = `                                                                                                                Sulęcin, dnia 02 grudnia 2025 r.


                                                                 BURMISTRZ SULĘCINA
                                                                             ogłasza
                                                               pierwszy przetarg ustny ograniczony
                              w dniu 14 stycznia 2026 r. o godz. 1000 w sali konferencyjnej Urzędu Miejskiego w Sulęcinie ul. Lipowa 18
                                                       na sprzedaż nieruchomości gruntowej niezabudowanej


   Położenie        Nr działki      Pow. działki     Księga wieczysta      Cena wywoławcza         Wadium       Uzasadnienie formy wyboru przetargu ograni-
    działki                             /ha/                                   brutto /zł /          /zł/                            czonego
                                                     GW1U/00002496/4
    Sulęcin           437/1            0,0295                                  29 000,00           3 000,00    Działka nie posiada bezpośredniego dostępu do
  obręb 0048                                                                                                   drogi publicznej. Posiada tylko dojście od ulicy
                                                                                                               Malinowej lub ulicy Wincentego Witosa, toteż
                                                                                                               sprzedaż ograniczona jest do właścicieli przyle-
                                                                                                               głych do niej działek: 432/6 i 439.
                                                                         Opis działki
Dla działki nie opracowano miejscowego planu zagospodarowania przestrzennego, nie wydana została decyzja o warunkach zabudowy i zagospodarowania terenu.
Rada Miejska podjęła uchwałę nr V/32/24 z dnia 26 lipca 2024 r. w sprawie przystąpienia do sporządzenia planu ogólnego gminy Sulęcin. W studium uwarunkowań i
kierunków zagospodarowania przestrzennego gminy Sulęcin zatwierdzonym uchwałą nr LXXVIII/482/23 z dnia 20 maja 2023 r., teren działki opisany jest jako strefa
zabudowy mieszkaniowej jednorodzinnej Działka ma kształt prostokąta, porośnięta jest trawą, pojedynczymi krzewami, drzewami liściastymi i owocowymi bez wartości
 użytkowej. Najbliższe pełne uzbrojenie w sieć energii elektrycznej, wodociągowej, kanalizacyjnej, gazowej i telekomunikacyjnej przebiega w działkach 437/3 i 437/4
 oznaczonych w ewidencji gruntów symbolem Bp. Przez obszar działki przebiega ogrodzenie z siatki na betonowych słupkach, nietrwale związanych z gruntem Usunię-
 cie ogrodzenia leżeć będzie w gestii nabywcy nieruchomości na koszt własny. Działka nie jest obciążona ograniczonymi prawami rzeczowymi, ograniczeniami w rozpo-
 rządzeniu , długami lub ciężarami.
Sprzedaż zwolniona jest z podatku VAT zgodnie z ustawą z dnia 11 marca 2004 r. o podatku od towarów i usług ( t.j. Dz. U z 2025 r., poz. 775 ze zm.). W przetargu mogą brać
udział właściciele nieruchomości przyległych, jeżeli wpłacą wadium, w pieniądzu (PLN), w kasie Urzędu Miejskiego w Sulęcinie ul. Lipowa 18 lub na konto Gminy Sulęcin -
Bank PEKAO S.A. O/Sulęcin nr 79124036241111000030633166 w takim terminie, aby najpóźniej w dniu 9 stycznia 2026 r. wymagana kwota znajdowała się na koncie
Urzędu Miejskiego.


W przetargu mogą brać udział tylko właściciele działek nr 432/6, 439 bezpośrednio przyległych do działki sprzedawanej położonych w Sulęcinie obręb 0048, którzy
zgłoszą uczestnictwo w przetargu ograniczonym.


 Warunkami przystąpienia do przetargu ograniczonego są:
 1. pisemne zgłoszenie uczestnictwa w przetargu z podaniem imienia i nazwiska, numeru działki wraz z numerem księgi wieczystej do której jest wpisana
    (w załączeniu- wzór zgłoszenia uczestnictwa w przetargu ),
 2. potwierdzenie wpłaty wadium,
 3. okazanie dowodu tożsamości ( dowód osobisty, paszport ),
 4. pełnomocnicy – stosowne pełnomocnictwo do uczestnictwa w przetargu,
 5. w przypadku małżonków, konieczna jest obecność obojga małżonków lub jednego z nich z pełnomocnictwem drugiego małżonka, zawierającym zgodę na odpłatne naby-
 cie nieruchomości do majątku wspólnego. Dopuszczalne jest pełnomocnictwo współmałżonka wyłącznie do czynności przetargowych w formie pisemnej z poświadczonym
 notarialnie podpisem. Pełnomocnictwo do czynności przetargowych i nabycia w drodze umowy notarialnej powinno być sporządzone w formie aktu notarialnego.
 Dokumenty wymienione w pkt 1, 2 i 4 należy złożyć w terminie do 12 stycznia 2026 r. w biurze obsługi interesanta Urzędu Miejskiego w Sulęcinie ul. Lipowa 18 Lista
 osób zakwalifikowanych do przetargu zamieszczona zostanie na stronach internetowych urzędu www.sulecin.pl , www.bip.sulecin.pl oraz wywieszona na tablicy ogłoszeń
 na parterze Urzędu Miejskiego w Sulęcinie w dniu 13 stycznia 2026 r. O wysokości postąpienia decydują uczestnicy przetargu, z tym, że postąpienie nie może wynosić
 mniej niż 1 % ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. Wylicytowana cena sprzedaży pomniejszona o wpłacone wadium podlega zapłacie
 przed zawarciem aktu notarialnego. Osoba ustalona jako Nabywca nieruchomości w terminie do 21 dni od daty rozstrzygnięcia przetargu zawiadomiona zostanie pisemnie o
miejscu i terminie zawarcia umowy sprzedaży. Wyznaczony termin nie może być krótszy niż 7 dni od dnia doręczenia zawiadomienia. Jeżeli osoba ustalona Nabywcą nieru-
chomości nie stawi się bez usprawiedliwienia w miejscu i terminie podanym w zawiadomieniu, Burmistrz może odstąpić od zawarcia umowy notarialnej, a wpłacone wadium
nie podlega zwrotowi.
Przetarg zostanie przeprowadzony zgodnie z Rozporządzeniem Rady Ministrów z 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań
na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213 ).
Na Nabywcy spoczywa obowiązek podatkowy w podatku od nieruchomości wynikający z ustawy z dnia 12 stycznia 1991 r. o podatkach i opłatach lokal nich ( t.j.Dz. U z
2025 r. poz.707 ).
Z uzasadnionej przyczyny przetarg może być odwołany.
Wszelkich dodatkowych informacji udziela Wydział Inwestycji, Zagospodarowania Przestrzennego i Gospodarki Nieruchomościami Urzędu Miejskiego w
Sulęcinie ul. Lipowa 18, pokój nr 6, telefon 95 777 0 935. Ogłoszenie dostępne na stronie internetowej urzędu www.sulecin.pl oraz na stronie Biuletynu
Informacji Publicznej www.bip.sulecin.pl.
`;

test('wynik: RYCHLIK_II_WYNIK', () => {
  const [r] = parseResultDoc(RYCHLIK_II_WYNIK, null, 'http://bip.sulecin.pl/RYCHLIK_II_WYNIK');
  assert.ok(r, 'expected one record');
  assert.deepEqual(r.kind, "mieszkalny");
  assert.deepEqual(r.outcome, "sold");
  assert.deepEqual(r.starting_price_pln, 73100);
  assert.deepEqual(r.final_price_pln, 73840);
  assert.deepEqual(r.address_raw, "Rychlik 16B/3");
});

test('wynik: RYCHLIK_I_WYNIK', () => {
  const [r] = parseResultDoc(RYCHLIK_I_WYNIK, null, 'http://bip.sulecin.pl/RYCHLIK_I_WYNIK');
  assert.ok(r, 'expected one record');
  assert.deepEqual(r.kind, "mieszkalny");
  assert.deepEqual(r.outcome, "unsold");
  assert.deepEqual(r.final_price_pln, null);
  assert.deepEqual(r.address_raw, "Rychlik 16B/3");
});

test('wynik: ZUBROW_WYNIK', () => {
  const [r] = parseResultDoc(ZUBROW_WYNIK, null, 'http://bip.sulecin.pl/ZUBROW_WYNIK');
  assert.ok(r, 'expected one record');
  assert.deepEqual(r.kind, "mieszkalny");
  assert.deepEqual(r.outcome, "sold");
  assert.deepEqual(r.starting_price_pln, 97200);
  assert.deepEqual(r.final_price_pln, 98180);
  assert.deepEqual(r.address_raw, "Żubrów 23/1");
});

test('wynik: DZ437_WYNIK', () => {
  const [r] = parseResultDoc(DZ437_WYNIK, null, 'http://bip.sulecin.pl/DZ437_WYNIK');
  assert.ok(r, 'expected one record');
  assert.deepEqual(r.kind, "grunt");
  assert.deepEqual(r.outcome, "sold");
  assert.deepEqual(r.starting_price_pln, 29000);
  assert.deepEqual(r.final_price_pln, 29290);
  assert.deepEqual(r.dzialka_nr, "437/1");
  assert.deepEqual(r.obreb, "0048");
});

test('wynik: DZ231_WYNIK', () => {
  const [r] = parseResultDoc(DZ231_WYNIK, null, 'http://bip.sulecin.pl/DZ231_WYNIK');
  assert.ok(r, 'expected one record');
  assert.deepEqual(r.kind, "grunt");
  assert.deepEqual(r.outcome, "sold");
  assert.deepEqual(r.starting_price_pln, 7740);
  assert.deepEqual(r.final_price_pln, 13800);
  assert.deepEqual(r.dzialka_nr, "231/17");
});

test('ogl: RYCHLIK_II_OGL', () => {
  const [r] = parseAnnouncement(RYCHLIK_II_OGL, { pdfUrl: 'http://bip.sulecin.pl/RYCHLIK_II_OGL', detailUrl: null });
  assert.ok(r, 'expected one record');
  assert.deepEqual(r.kind, "mieszkalny");
  assert.deepEqual(r.address_raw, "Rychlik 16B/3");
  assert.deepEqual(r.round, 2);
});

test('ogl: DZ437_OGL', () => {
  const [r] = parseAnnouncement(DZ437_OGL, { pdfUrl: 'http://bip.sulecin.pl/DZ437_OGL', detailUrl: null });
  assert.ok(r, 'expected one record');
  assert.deepEqual(r.kind, "grunt");
  assert.deepEqual(r.dzialka_nr, "437/1");
  assert.deepEqual(r.round, 1);
  assert.deepEqual(r.starting_price_pln, 29000);
});

test('parsePLN: space thousands + comma decimal', () => {
  assert.equal(parsePLN('73 100,00'), 73100);
  assert.equal(parsePLN('800,00'), 800);
  assert.equal(parsePLN('7 740,00'), 7740);
  assert.equal(parsePLN(''), null);
});

test('haToM2: comma OR period decimal hectares', () => {
  assert.equal(haToM2('0,0295'), 295);
  assert.equal(haToM2('0.0035'), 35);
});

test('monthNum: Polish genitive months', () => {
  assert.equal(monthNum('lipca'), 7);
  assert.equal(monthNum('stycznia'), 1);
  assert.equal(monthNum('grudnia'), 12);
  assert.equal(monthNum('nonsense'), null);
});

test('announceRoundFromText: Roman (flat) and ordinal word (land)', () => {
  assert.equal(announceRoundFromText('ogłasza II przetarg ustny nieograniczony'), 2);
  assert.equal(announceRoundFromText('ogłasza pierwszy przetarg ustny ograniczony'), 1);
});

test('isResultNotice: bridges the Polish accusative "informację"', () => {
  assert.equal(isResultNotice('Burmistrz podaje informację o wyniku przetargu'), true);
  assert.equal(isResultNotice('ogłoszenie o przetargu'), false);
});

test('isLease: defensive vocabulary gate (synthetic — no live dzierżawa fixture existed)', () => {
  assert.equal(isLease('Burmistrz Sulęcina ogłasza przetarg na dzierżawę nieruchomości'), true);
  assert.equal(isLease('przetarg na sprzedaż lokalu mieszkalnego'), false);
});
