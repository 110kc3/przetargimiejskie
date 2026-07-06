// Gorzów Wielkopolski parser tests — REAL fixtures, live-groundtruthed 2026-07-06.
//
// Fixtures are faithful copies of `pdftotext -layout` output (poppler 25.07,
// the same extractor family CI uses) of live-fetched PDFs, plus verbatim board
// HTML from the live BIP:
//
//   ANN_61_2025 — announcement Ogłoszenie Nr 61/2025 (05.09.2025), 12 flats,
//     auction 09.10.2025, all "drugi przetarg":
//     https://bip.um.gorzow.pl/system/obj/59130_Ogloszenie_nr_61-2025.pdf
//
//   RESULT_FLATS_05FEB — result notice for the 05.02.2026 flat przetargi
//     (Ogłoszenie 77/2025), 4 lots ALL SOLD. NOTE: this EZD-printed PDF embeds
//     its diacritic font without a ToUnicode map, so words with ą/ę/ł/ś/ż/ź/ć/ń
//     are dropped by every extractor — rows 3+4 lose their street names
//     ("     19/7") and are UNPARSEABLE by design; the parser must return the
//     2 rows that survive:
//     https://bip.um.gorzow.pl/system/pobierz.php?plik=informacja_o_wyniku_przetargu.pdf&id=a7a56a4144b2940d40da90ac2b872c22&stats=true
//
//   RESULT_LAND_16APR — result notice 16.04.2026 godz. 10 (Ogłoszenie 9/2026),
//     6 land lots (5 negative, 1 sold) — NO flats, must yield 0 records:
//     https://bip.um.gorzow.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargow_9-2026_z_16.04.2026.pdf&id=2cf2aa3fcd59798adbf4d77a4ec84cdc&stats=true
//
//   BOARD_ROWS — two verbatim <tr> rows from /przetargi/320/status/0/
//     (fetched 2026-07-06): the flat batch Ogłoszenie 34/2026 (auction
//     09.07.2026) and the land-only Ogłoszenie 30/2026.
//
//   RESULTS_PAGE — the verbatim flats-result item from the /509/ archive page 2
//     plus a dzierżawa item (same markup) that must be filtered out.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  monthNum,
  auctionDateFromText,
  resultDateFromText,
  extractFlatAddresses,
  isResultNotice,
  isNegative,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/gorzow-wielkopolski/parse.js';

import {
  boardUrl,
  parseBoardPage,
  isFlatSaleRow,
  parseResultsPage,
  isSaleResultRow,
} from '../src/cities/gorzow-wielkopolski/crawl.js';

// ── Fixture: announcement PDF (12 flats, born-digital) ───────────────────────

const ANN_61_2025 = `  PREZYDENT
Miasta Gorzowa Wlkp.
                                                                    Ogłoszenie Nr 61/2025
                                                          Prezydenta Miasta Gorzowa Wielkopolskiego
                                                                     z dnia 05 września 2025r.

                                    Ogłaszam przetargi ustne nieograniczone na sprzedaż na własność lokali mieszkalnych
                                                 stanowiących własność Miasta Gorzowa Wielkopolskiego

                     terminy
                                położenie nieruchomości,                          opis i przeznaczenie                          udział w częściach      cena      wysokość
                przeprowadzenia
   lp. przetarg                 nr i powierzchnia działki,                           nieruchomości                             wspólnych budynku     wywoławcza    wadium
                  poprzednich
                                     księga wieczysta                 numer świadectwa charakterystyki energetycznej                i gruncie           [ zł ]      [ zł ]
                   przetargów
                                                             lokal mieszkalny o pow. 19,43m2 położony na II piętrze
                                     Fabryczna 53/9          budynku, składający się z jednego pokoju i kuchni; do lokalu
   1.   drugi    I – 21.08.2025r.   10 – 73 i 74, 777m2      przynależy wc o pow. 0,76m2 położone na parterze klatki             3121/91703            39.000      7.800
                                    GW1G/00047313/2          schodowej oraz piwnica nr 9 o pow. 11,02m2
                                                             SCHE/23864/385/2025
                                                             lokal mieszkalny o pow. 20,94m2 położony na III piętrze
                                     Fabryczna 57/8
                                                             budynku, składający się z jednego pokoju, kuchni, skrytki i wc;
   2.   drugi    I – 21.08.2025r.    10 - 66, 129m2                                                                                65/1000             42.000      8.400
                                                             do lokalu przynależy piwnica nr 8 o pow. 5,04m2
                                    GW1G/00070270/8
                                                             SCHE/23864/141/2025
                                                             lokal mieszkalny o pow. 46,96m2 położony na IV piętrze
                                        Grobla 22/12
                                                             budynku, składający się z dwóch pokoi, kuchni łazienki i
   3.   drugi    I – 21.08.2025r.   10 - 423 i 424, 534m2                                                                       5.126/124.339          85.000     17.000
                                                             przedpokoju; do lokalu przynależy piwnica nr 12 o pow. 4,30m2
                                     GW1G/00062895/6
                                                             SCHE/23864/317/2025
                                    Kobylogórska 105/8       lokal mieszkalny o pow. 29,73m2 położony w piwnicy budynku,
   4.   drugi    I – 21.08.2025r.     11-464, 181m2          składający się z jednego pokoju, kuchni, przedpokoju i wc             57/1000             54.000     10.800
                                    GW1G/00032533/2          SCHE/23864/140/2025
                                     Kolejowa 6/10           lokal mieszkalny o pow. 33,57m2 położony na II piętrze
   5.   drugi    I – 21.08.2025r.    10-712, 251m2           budynku, składający się z jednego pokoju, kuchni i przedpokoju        63/1000             62.000     12.400
                                    GW1G/00029049/8          SCHE/23864/148/2025
                                                             lokal mieszkalny o pow. 41,19m2 położony na III piętrze
                                     Kolejowa 10/10
                                                             budynku, składający się z dwóch pokoi, kuchni i przedpokoju;
   6.   drugi    I – 21.08.2025r.    10-719/1, 226m2                                                                               77/1000             75.000     15.000
                                                             do lokalu przynależą dwie piwnice o pow. 5,97m2 i 8,02m2
                                    GW1G/00066118/4
                                                             SCHE/23864/207/2025
                                  Ogrodowa 4/10      lokal mieszkalny o pow. 17,21m2 położony na poddaszu
7.    drugi   I – 21.08.2025r.    5-2297, 279m2      budynku, składający się z jednego pokoju i kuchni                 21/1000       37.000       7.400
                                 GW1G/00024167/6     SCHE/23864/184/2025
                                                     lokal mieszkalny o pow. 38,79m2 położony na I piętrze budynku,
                                  Sikorskiego 88/5
                                                     składający się z dwóch pokoi, kuchni, łazienki i dostępnego ze
8.    drugi   I – 21.08.2025r.    6-1170/2, 184m2                                                                      87/1000       85.000      17.000
                                                     spocznika klatki schodowej pomieszczenia wc
                                 GW1G/00051742/9
                                                     SCHE/23864/144/2025
                                                     lokal mieszkalny o pow. 32,45m2 położony na parterze
                                  Słoneczna 42/4     budynku, składający się z jednego pokoju, kuchni i łazienki; do
9.    drugi   I – 21.08.2025r.    6-2142, 227m2      lokalu                                                            56/1000       66.000      13.200
                                 GW1G/00067159/0     przynależy piwnica nr M-4 o pow. 6,10m2
                                                     SCHE/23864/138/2025
                                                     lokal mieszkalny o pow. 18,37m2 położony na poddaszu
                                    Szkolna 3/9
                                                     budynku, składający się z jednego pokoju i kuchni; do lokalu
10.   drugi   I – 21.08.2025r.    5-2277/1, 239m2                                                                      55/1000       39.000       7.800
                                                     przynależy piwnica nr 9 o pow. 6,97m2
                                 GW1G/00074640/1
                                                     SCHE/23864/185/2025
                                                     lokal mieszkalny o pow. 22,20m2 położony na poddaszu
                                 Warszawska 40/13
                                                     budynku, składający się z jednego pokoju i kuchni; do lokalu
11.   drugi   I – 21.08.2025r.    5-2319, 777m2                                                                        26/1000       44.000       8.800
                                                     przynależy piwnica nr 13 o pow. 3,90m2
                                 GW1G/00072375/8
                                                     SCHE/23864/151/2025
                                                     lokal mieszkalny o pow. 35,43m2 położony na poddaszu
                                     Wąska 4/7
                                                     budynku, składający się z dwóch pokoi, kuchni, przedpokoju
12.   drugi   I – 21.08.2025r.    10-562/2, 273m2                                                                      49/1000       59.000      11.800
                                                     i wc; do lokalu przynależy piwnica nr 7 o pow. 0,74m2
                                 GW1G/00068441/1
                                                     SCHE/23864/153/2025


Lokale będące przedmiotem przetargu przeznaczone są na cele mieszkaniowe i wymagają przeprowadzenia remontu. Sprzedaż lokali następuje wraz
z udziałem w nieruchomości wspólnej, którą stanowi działka gruntu oraz części budynku i urządzenia, które nie służą wyłącznie do użytku właścicieli lokali.
Lokale objęte ogłoszeniem wolne są od obciążeń i zobowiązań.
Dla lokali zostały sporządzone świadectwa charakterystyki energetycznej części budynku o numerach podanych odpowiednio w tabeli, których wyniki
dostępne są w Centralnym rejestrze charakterystyki energetycznej budynków Ministerstwa Rozwoju i Technologii.


Przetargi odbędą się 9 października 2025r. o godz. 1200 w siedzibie Urzędu Miasta Gorzowa Wielkopolskiego przy ul. Sikorskiego 4 i prowadzone
będą wg kolejności podanej w tabeli.
W przetargu mogą brać udział osoby, które wniosą wadium w pieniądzu, z określeniem nieruchomości, której wpłata dotyczy - najpóźniej do 2 października
2025r. Wadium należy wpłacić na konto Urzędu Miasta Gorzowa Wlkp. Nr 25 1020 5402 0000 0402 0325 6286. Na dowodzie wpłaty należy wskazać
nieruchomość, której wpłata dotyczy (liczbę porządkową lub położenie nieruchomości) oraz nazwisko lub nazwę osoby (lub osób) zamierzających nabyć
nieruchomość w przetargu. W przypadku przelewu – za datę wniesienia wadium uznaje się datę wpływu na konto Urzędu Miasta lub datę polecenia przelewu -
po jego udokumentowaniu przez uczestnika przetargu.
Minimalne postąpienie wynosi 1% ceny wywoławczej z zaokrągleniem wzwyż do pełnych dziesiątek złotych. Przetarg jest ważny, jeśli przynajmniej jeden
uczestnik zaoferuje co najmniej jednio postąpienie powyżej ceny wywoławczej.

Uczestnicy przetargu zobowiązani są do przedłożenia komisji przetargowej przed otwarciem przetargu dowodu tożsamości oraz pełnomocnictwa
– w przypadku działania przez pełnomocnika, a w odniesieniu do osób prawnych - wypisu z KRS.
Uczestnikowi przetargu, który wygra przetarg - wadium zalicza się na poczet ceny nabycia nieruchomości, natomiast pozostałym uczestnikom zwraca się
niezwłocznie po odwołaniu, zamknięciu, unieważnieniu lub zakończeniu przetargu wynikiem negatywnym.
Sprzedaż lokali jest zwolniona z podatku VAT na podstawie art. 43 ust. 1 pkt 10 ustawy z dnia 11 marca 2004r. o podatku od towarów i usług.
Termin zawarcia umowy sprzedaży ustalony zostanie najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargu. W przypadku, gdy osoba ustalona nabywcą
nie przystąpi do zawarcia umowy notarialnej bez usprawiedliwienia w ustalonym miejscu i terminie, wpłacone wadium nie podlega zwrotowi.
Przetargi mogą być odwołane jedynie z ważnych powodów.
Szczegółowe informacje dotyczące lokalu będącego przedmiotem przetargu można uzyskać w Wydziale Gospodarki Nieruchomościami i Majątku Urzędu
Miasta pok. 404 (tel. 95 73- 55-404, 95 73-55-524).


                                                                                                              z up. Prezydenta Miasta
                                                                                                                Jacek Szymankiewicz
                                                                                                           Zastępca Prezydenta Miasta
                                                                                                            /podpisano elektronicznie/
`;

// ── Fixture: flats result PDF 05.02.2026 (broken diacritic font) ─────────────

const RESULT_FLATS_05FEB = `                  MIASTA
       Gorzowa Wielkopolskiego
       Gospodarki                i
            ul. Sikorskiego 4
       66-400 Gorzów Wielkopolski
                                                                                                                                          Gorzów Wielkopolski 12.02.2026r.
                                           Informacja o wynikach przetargów na

Na podstawie § 12                  Rady Ministrów z dnia 14          2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz        na
zbycie                 (Dz.U. z 2021r. poz. 2213)          do publicznej                         o wynikach przetargów ustnych nieograniczonych
                                                 00
przeprowadzonych dnia 5 lutego 2026 r. o godz. 10 w siedzibie        Miasta Gorzowa Wielkopolskiego.
Przedmiotem przetargów ustnych nieograniczonych             lokale mieszkalne             w              nr 77/2025 Prezydenta Miasta Gorzowa
Wielkopolskiego z dnia 15 grudnia 2025r.
Wyniki przetargów
                                                                                                                                                cena
                                                                                                     w              cena        liczba osób                   osoba ustalona
                                                     opis i przeznaczenie
 lp.   nr i powierzchnia                                                                           wspólnych                  dopuszczonych
                                                                                                                                                  w
                  wieczysta                                                                     budynku i gruncie   [   ]      do przetargu
                                                                                                                                              przetargu
          Armii Polskiej 17/4   lokal mieszkalny o pow. 93,64m2        na I         budynku,
                                                                                                                                                               Ivan Shulinok
1.          5-1092, 289m2                        z trzech pokoi, kuchni,            skrytki i      106/1000         181.000         2          215.000
                                                                                                                                                           i Anastasiia Driamova
          GW1G/00034383/9       przedpokoju; SCHE/23864/513/2025
          Armii Polskiej 17/9   lokal mieszkalny o pow. 85,40m2                na III
                                                                                                                                                               MILTON BUD
2.          5-1092, 289m2       budynku,                z trzech pokoi, kuchni,         z wc        97/1000         162.000         3          198.000
                                                                                                                                                                Sp. z o.o.
          GW1G/00034383/9       i przedpokoju; SCHE/23864/512/2025
                      19/7      lokal mieszkalny o pow. 97,42m2                na III
3.          5-1413, 317m2       budynku,                z trzech pokoi, dwóch kuchni,            9742/101292        156.000         2          212.000     Marek Szubartowski
          GW1G/00021761/9       pomieszczenia wc i korytarza; SCHE/23864/314/2025
                                lokal mieszkalny o pow. 80,32m2                na III
                    28/8        budynku,                z trzech pokoi, kuchni,         wraz
4.         5-1781, 467m2        z wc i przedpokoju; do lokalu            piwnica nr 8 o pow.        81/1000         153.000         1          154.530     Marek Szubartowski
          GW1G/00053033/0       3,75m2          w kondygnacji piwnic budynku;
                                SCHE/23864/309/2025

                                                                                                                                 Kierownik Referatu
                                                                                                                              Obrotu
                                                                                                                                   Wioleta Chudy
                                                                                                                              /podpisano elektronicznie/
                           351904.1032173.1205423




                           12.02.2026 11:28:54




                                                    EZD 3.132.31.31.


Data wydruku: 12.02.2026
`;

// ── Fixture: land result PDF 16.04.2026 (no flats) ───────────────────────────

const RESULT_LAND_16APR = `                                                                                                                 Gorzów Wlkp., 24 kwietnia 2026 r


                                            Informacja o wyniku przetargów na sprzedaż nieruchomości


  Na podstawie § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów
  oraz rokowań na zbycie nieruchomości (t.j. Dz.U. z 2021r. poz. 2213) podaję do publicznej wiadomości informację o wyniku przetargów
  ustnych nieograniczonych, przeprowadzonych dnia 16 kwietnia 2026r. o godz. 10 w siedzibie Urzędu Miasta Gorzowa Wlkp.

  Przedmiotem przetargów ustnych nieograniczonych były niezabudowane nieruchomości określone w ogłoszeniu Nr 9/2026 Prezydenta
  Miasta Gorzowa Wlkp. z dnia 13 lutego 2026r.

  Wyniki przetargów są następujące:
                                   pow.                                                                                      cena netto
                                                                                                cena netto     liczba osób                   osoba ustalona
       położenie    obręb i nr    działki        opis i przeznaczenie            księga                                      osiągnięta
lp.                                                                                            wywoławcza    dopuszczonych                      nabywcą
        (ulica)      działki     łącznie            nieruchomości               wieczysta                                    w przetargu
                                                                                                   [ zł ]    do przetargów                   nieruchomości
                                   [m2]                                                                                          [ zł ]

                                            pod budowę do sześciu budynków
  1.   Na Skarpie   2 – 2379/2   2.652      mieszkaniowych jednorodzinnych   GW1G/00139453/7    620.000           -
                                                w zabudowie szeregowej

  2.   Koniawska    11 - 1375    5.301            zabudowa usługowa          GW1G/00014327/3    1.100.000         -
                                                                                                                                 przetarg zakończył się
  3. Szczecińska     7 - 417     7.298                                                          1.030.000         -              wynikiem negatywnym


  4. Szczecińska     7 - 419     6.775      zabudowa usługowa, w tym usług                      1.000.000         -
                                                       rzemiosła             GW1G/00082803/1
  5. Szczecińska     7 – 420     6.816        oraz zabudowy magazynowej                         1.000.000         -


  6. Szczecińska     7 – 426     6.947                                                          1.100.000         2           1.400.000      ANDA Sp. z o. o.



                                                                                      Kierownik Referatu
                                                                                   Obrotu Nieruchomościami
                                                                                        Wioleta Chudy
                                                                                   /podpisano elektronicznie/
`;

// ── Fixture: live board rows (flat batch + land) ─────────────────────────────

const BOARD_ROWS = `<tr class="even">
			<td class="td-no"><span>Lp: </span>2</td>
			<td class="td-date-1"><div>Data ogłoszenia</div>2026-05-28 09:32:00</td>
			<td class="td-date-2"><div>Data i godzina przetargu</div>2026-07-09 12:00:00</td>
			<td class="td-title-1"><div>Dotyczy</div><a href="https://bip.um.gorzow.pl/przetargi/320/782/Ogloszenie_Nr_34_2F2026_Prezydenta_Miasta_Gorzowa_Wielkopolskiego_z_dnia_27_maja_2026r__o_przetargach/" title="Przejdź do szczegółów informacji">Ogłoszenie Nr 34/2026 Prezydenta Miasta Gorzowa Wielkopolskiego z dnia 27 maja 2026r. o przetargach ustnych nieograniczonych na sprzedaż na własność lokali mieszkalnych stanowiących własność Miasta Gorzowa Wielkopolskiego</a></td>
			<td class="td-title-2"><div>Cena wywoławcza</div>podana w ogłoszeniu w tabeli</td>
			<td class="td-title-1"><div>Wynik</div>Brak wyniku</td>
			<td class="td-attachments-1"><div>Załączniki</div>	<!-- .......................... start : lista uproszczona zalacznikow .......................... -->
	<ul class="attachments">
			<li><a href="https://bip.um.gorzow.pl/system/pobierz.php?plik=ogloszenie_o_przetartgu_na_dzien_09.07.2026r..pdf&amp;id=ce3dfd0954ac875953a9e77f5d0a450a" title="Pobierz załącznik"><img src="https://bip.um.gorzow.pl/ikona.php?plik=ogloszenie_o_przetartgu_na_dzien_09.07.2026r..pdf" alt="Ikona (PDF)" /></a></li>
			</ul>
	<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->
	</td>
		</tr>
<tr class="odd">
			<td class="td-no"><span>Lp: </span>3</td>
			<td class="td-date-1"><div>Data ogłoszenia</div>2026-05-13 00:00:00</td>
			<td class="td-date-2"><div>Data i godzina przetargu</div>2026-07-16 10:00:00</td>
			<td class="td-title-1"><div>Dotyczy</div><a href="https://bip.um.gorzow.pl/przetargi/320/779/Ogloszenie_Nr_30_2F2026_Prezydenta_Miasta_Gorzowa_Wielkopolskiego_z_dnia_13_maja_2026r/" title="Przejdź do szczegółów informacji">Ogłoszenie Nr 30/2026 Prezydenta Miasta Gorzowa Wielkopolskiego z dnia 13 maja 2026 r. o przetargu ustnym nieograniczonym na sprzedaż nieruchomości</a></td>
			<td class="td-title-2"><div>Cena wywoławcza</div>w treści ogłoszenia</td>
			<td class="td-title-1"><div>Wynik</div>Brak wyniku</td>
			<td class="td-attachments-1"><div>Załączniki</div>	<!-- .......................... start : lista uproszczona zalacznikow .......................... -->
	<ul class="attachments">
			<li><a href="https://bip.um.gorzow.pl/system/pobierz.php?plik=Ogloszenie_nr_30-2026.pdf&amp;id=615eaa1c1032386db8ddeb3502750eff" title="Pobierz załącznik"><img src="https://bip.um.gorzow.pl/ikona.php?plik=Ogloszenie_nr_30-2026.pdf" alt="Ikona (PDF)" /></a></li>
			</ul>
	<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->
	</td>
		</tr>`;

// ── Fixture: results-archive items (flats result + dzierżawa) ────────────────

const RESULTS_PAGE = `<div class="information">
					<p class="phx ph3">
						Informacja o wyniku przetargów ustnych nieograniczonych na sprzedaż lokali mieszkalnych stanowiących własność Miasta Gorzowa Wlkp., przeprowadzonych w dniu 5 lutego 2026r. o godz.10 w siedzibie Urzędu Miasta Gorzowa Wlkp.						</p>
				
				 

		
			<p class="phx ph4">Załączniki</p>
	<ul class="attachments">
						
		<li >
			<a href="https://bip.um.gorzow.pl/system/pobierz.php?plik=informacja_o_wyniku_przetargu.pdf&amp;id=a7a56a4144b2940d40da90ac2b872c22&amp;stats=true" title="Pobierz załącznik"><img src="https://bip.um.gorzow.pl/ikona.php?plik=informacja_o_wyniku_przetargu.pdf" alt="Ikona (PDF)" /> <span>Informacja o wyniku przetargów ustnych nieograniczonych na sprzedaż lokali mieszkalnych stanowiących własność Miasta Gorzowa Wlkp., przeprowadzonych w dniu 5 lutego 2026r. o godz.10 w siedzibie Urzędu Miasta Gorzowa Wlkp. (PDF, 352.8 KiB)</span></a>
			<span class="parameters">
			
							<span>Data wprowadzenia do BIP: <em>2026-02-12 11:44:34</em></span> | 
							<span>Data wytworzenia informacji: <em>2026-02-12</em></span>
			 | <span>Informacja o wyniku przetargów ustnych nieograniczonych na sprzedaż lokali mieszkalnych stanowiących własność Miasta Gorzowa Wlkp., przeprowadzonych w dniu 5 lutego 2026r. o godz.10 w siedzibie Urzędu Miasta Gorzowa Wlkp.</span>			</span>
		</li>		
		</ul>
<div class="information">
	<p class="phx ph3">
		Informacja o wyniku przetargu ustnego nieograniczonego na dzierżawę nieruchomości stanowiącej własność Miasta Gorzowa Wlkp., przeprowadzonego w dniu 14 kwietnia 2026r. w siedzibie Urzędu Miasta Gorzowa Wlkp. 	</p>
	<p class="phx ph4">Załączniki</p>
	<ul class="attachments">
		<li><a href="https://bip.um.gorzow.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargu_na_dzierzawe_nieruchomosci.pdf&amp;id=2e0488a744ac1227325ddeb94414dd61&amp;stats=true" title="Pobierz załącznik">dzierżawa (PDF)</a></li>
	</ul>
</div>`;

const ANN_URL = 'https://bip.um.gorzow.pl/system/obj/59130_Ogloszenie_nr_61-2025.pdf';
const RES_URL =
  'https://bip.um.gorzow.pl/system/pobierz.php?plik=informacja_o_wyniku_przetargu.pdf&id=a7a56a4144b2940d40da90ac2b872c22&stats=true';

// ── monthNum ─────────────────────────────────────────────────────────────────

test('monthNum: full and diacritic-stripped Polish month tokens', () => {
  assert.equal(monthNum('października'), '10');
  assert.equal(monthNum('padziernika'), '10'); // xpdf drops the ź
  assert.equal(monthNum('lutego'), '02');
  assert.equal(monthNum('września'), '09');
  assert.equal(monthNum('wrzenia'), '09'); // dropped ś
  assert.equal(monthNum('maja'), '05');
  assert.equal(monthNum('grudnia'), '12');
  assert.equal(monthNum('xyz'), null);
  assert.equal(monthNum(''), null);
});

// ── auctionDateFromText ──────────────────────────────────────────────────────

test('auctionDateFromText: "Przetargi odbędą się 9 października 2025r."', () => {
  assert.equal(auctionDateFromText(ANN_61_2025), '2025-10-09');
});

test('auctionDateFromText: tolerates dropped diacritics (xpdf variant)', () => {
  assert.equal(auctionDateFromText('Przetargi odbd si 9 padziernika 2025r. o godz. 1200'), '2025-10-09');
});

test('auctionDateFromText: null when absent', () => {
  assert.equal(auctionDateFromText('Ogłaszam przetarg na sprzedaż'), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText(null), null);
});

// ── resultDateFromText ───────────────────────────────────────────────────────

test('resultDateFromText: PDF body ("przeprowadzonych dnia 5 lutego 2026 r.")', () => {
  assert.equal(resultDateFromText(RESULT_FLATS_05FEB), '2026-02-05');
  assert.equal(resultDateFromText(RESULT_LAND_16APR), '2026-04-16');
});

test('resultDateFromText: board title ("przeprowadzonych w dniu 5 lutego 2026r.")', () => {
  assert.equal(
    resultDateFromText(
      'Informacja o wyniku przetargów ustnych nieograniczonych na sprzedaż lokali mieszkalnych ' +
        'stanowiących własność Miasta Gorzowa Wlkp., przeprowadzonych w dniu 5 lutego 2026r. o godz.10',
    ),
    '2026-02-05',
  );
});

// ── extractFlatAddresses ─────────────────────────────────────────────────────

test('extractFlatAddresses: accepts real flat addresses', () => {
  assert.equal(extractFlatAddresses('  Armii Polskiej 17/4  lokal')[0]?.raw, 'ul. Armii Polskiej 17/4');
  assert.equal(extractFlatAddresses('ul. Grobla 22/12')[0]?.raw, 'ul. Grobla 22/12');
  assert.equal(extractFlatAddresses('Kobylogórska 105/8')[0]?.raw, 'ul. Kobylogórska 105/8');
});

test('extractFlatAddresses: rejects ids, parcels, fractions, doc numbers', () => {
  assert.equal(extractFlatAddresses('Ogłoszenie Nr 61/2025').length, 0);
  assert.equal(extractFlatAddresses('w ogłoszeniu Nr 11/2026 Prezydenta').length, 0);
  assert.equal(extractFlatAddresses('GW1G/00047313/2').length, 0);
  assert.equal(extractFlatAddresses('10-719/1, 226m2').length, 0);
  assert.equal(extractFlatAddresses('5.126/124.339').length, 0);
  assert.equal(extractFlatAddresses('SCHE/23864/385/2025').length, 0);
  assert.equal(extractFlatAddresses('').length, 0);
});

// ── parseAnnouncement (12-flat batch, groundtruthed) ─────────────────────────

test('parseAnnouncement: guard — non-announcement text returns []', () => {
  assert.deepEqual(parseAnnouncement('Informacja o wyniku przetargu na dzierżawę', {}), []);
  assert.deepEqual(parseAnnouncement('', {}), []);
  assert.deepEqual(parseAnnouncement(null, {}), []);
});

test('parseAnnouncement: Ogłoszenie 61/2025 — exactly 12 flat records', () => {
  const recs = parseAnnouncement(ANN_61_2025, { pdfUrl: ANN_URL, detailUrl: 'https://bip.um.gorzow.pl/przetargi/320/x/' });
  assert.equal(recs.length, 12, `expected 12 records, got ${recs.length}`);
});

test('parseAnnouncement: every record — date 2025-10-09, round 2, kind mieszkalny', () => {
  const recs = parseAnnouncement(ANN_61_2025, { pdfUrl: ANN_URL });
  for (const r of recs) {
    assert.equal(r.auction_date, '2025-10-09', r.address_raw);
    assert.equal(r.round, 2, r.address_raw);
    assert.equal(r.kind, 'mieszkalny', r.address_raw);
    assert.equal(r.source_url, ANN_URL);
  }
});

test('parseAnnouncement: row 1 — ul. Fabryczna 53/9, 19,43 m², 39 000 zł', () => {
  const recs = parseAnnouncement(ANN_61_2025, {});
  const r = recs.find((x) => x.address.key === 'fabryczna|53|9');
  assert.ok(r, 'Fabryczna 53/9 must be present');
  assert.equal(r.area_m2, 19.43);
  assert.equal(r.starting_price_pln, 39000);
});

test('parseAnnouncement: row 3 — ul. Grobla 22/12, 46,96 m², 85 000 zł', () => {
  const recs = parseAnnouncement(ANN_61_2025, {});
  const r = recs.find((x) => x.address.key === 'grobla|22|12');
  assert.ok(r, 'Grobla 22/12 must be present');
  assert.equal(r.area_m2, 46.96);
  assert.equal(r.starting_price_pln, 85000);
});

test('parseAnnouncement: row 4 — ul. Kobylogórska 105/8, 29,73 m², 54 000 zł', () => {
  const recs = parseAnnouncement(ANN_61_2025, {});
  const r = recs.find((x) => x.address.key === 'kobylogorska|105|8');
  assert.ok(r, 'Kobylogórska 105/8 must be present');
  assert.equal(r.area_m2, 29.73);
  assert.equal(r.starting_price_pln, 54000);
});

test('parseAnnouncement: row 8 — ul. Sikorskiego 88/5, 38,79 m², 85 000 zł', () => {
  const recs = parseAnnouncement(ANN_61_2025, {});
  const r = recs.find((x) => x.address.key === 'sikorskiego|88|5');
  assert.ok(r, 'Sikorskiego 88/5 must be present');
  assert.equal(r.area_m2, 38.79);
  assert.equal(r.starting_price_pln, 85000);
});

test('parseAnnouncement: row 12 — ul. Wąska 4/7, 35,43 m², 59 000 zł', () => {
  const recs = parseAnnouncement(ANN_61_2025, {});
  const r = recs.find((x) => x.address.key === 'waska|4|7');
  assert.ok(r, 'Wąska 4/7 must be present');
  assert.equal(r.area_m2, 35.43);
  assert.equal(r.starting_price_pln, 59000);
});

test('parseAnnouncement: board date-2 (fallbackAuctionDate) wins over body date', () => {
  const recs = parseAnnouncement(ANN_61_2025, { fallbackAuctionDate: '2025-10-09' });
  assert.equal(recs[0].auction_date, '2025-10-09');
});

// ── isResultNotice / isNegative ──────────────────────────────────────────────

test('isResultNotice: recognises both result fixtures', () => {
  assert.equal(isResultNotice(RESULT_FLATS_05FEB), true);
  assert.equal(isResultNotice(RESULT_LAND_16APR), true);
});

test('isResultNotice: rejects announcements and empty text', () => {
  assert.equal(isResultNotice(ANN_61_2025), false);
  assert.equal(isResultNotice(''), false);
  assert.equal(isResultNotice(null), false);
});

test('isNegative: detects "wynikiem negatywnym"', () => {
  assert.equal(isNegative('przetarg zakończył się wynikiem negatywnym'), true);
  assert.equal(isNegative(RESULT_LAND_16APR), true);
  assert.equal(isNegative('cena osiągnięta 215.000'), false);
});

// ── parseResultDoc (flats result, groundtruthed) ─────────────────────────────

test('parseResultDoc: guard — non-result text returns []', () => {
  assert.deepEqual(parseResultDoc(ANN_61_2025, null, RES_URL), []);
  assert.deepEqual(parseResultDoc('', null, RES_URL), []);
  assert.deepEqual(parseResultDoc(null, null, RES_URL), []);
});

test('parseResultDoc: 05.02.2026 flats — 2 parseable records (rows 3-4 lose their street to the broken PDF font)', () => {
  const recs = parseResultDoc(RESULT_FLATS_05FEB, null, RES_URL);
  assert.equal(recs.length, 2, `expected 2 records, got ${recs.length}`);
});

test('parseResultDoc: lot 1 — ul. Armii Polskiej 17/4 sold 181 000 → 215 000 zł, 93,64 m²', () => {
  const recs = parseResultDoc(RESULT_FLATS_05FEB, null, RES_URL);
  const r = recs.find((x) => x.address.key === 'armii polskiej|17|4');
  assert.ok(r, 'Armii Polskiej 17/4 must be present');
  assert.equal(r.starting_price_pln, 181000);
  assert.equal(r.final_price_pln, 215000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.area_m2, 93.64);
  assert.equal(r.auction_date, '2026-02-05');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.source_pdf, RES_URL);
  assert.equal(r.round, null);
});

test('parseResultDoc: lot 2 — ul. Armii Polskiej 17/9 sold 162 000 → 198 000 zł, 85,40 m²', () => {
  const recs = parseResultDoc(RESULT_FLATS_05FEB, null, RES_URL);
  const r = recs.find((x) => x.address.key === 'armii polskiej|17|9');
  assert.ok(r, 'Armii Polskiej 17/9 must be present');
  assert.equal(r.starting_price_pln, 162000);
  assert.equal(r.final_price_pln, 198000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.area_m2, 85.4);
});

test('parseResultDoc: fallbackDate is used when the body date is unreadable', () => {
  const noDate = RESULT_FLATS_05FEB.replace(/przeprowadzonych dnia 5 lutego 2026 r\./, 'przeprowadzonych (data)');
  const recs = parseResultDoc(noDate, '2026-02-05', RES_URL);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].auction_date, '2026-02-05');
});

test('parseResultDoc: 16.04.2026 land result — 0 flat records', () => {
  const recs = parseResultDoc(RESULT_LAND_16APR, null, 'https://example.com/land.pdf');
  assert.equal(recs.length, 0, `expected 0 records, got ${recs.length}`);
});

// ── crawl helpers (verbatim live board HTML) ─────────────────────────────────

test('boardUrl: page 1 plain, page N puts the number before the status segment', () => {
  assert.equal(boardUrl(0, 1), 'https://bip.um.gorzow.pl/przetargi/320/status/0/');
  assert.equal(boardUrl(1, 3), 'https://bip.um.gorzow.pl/przetargi/320/3/status/1/');
});

test('parseBoardPage: parses both live rows with dates, detail URL and decoded PDF URL', () => {
  const rows = parseBoardPage(BOARD_ROWS);
  assert.equal(rows.length, 2);

  const flat = rows.find((r) => /lokali mieszkalnych/.test(r.title));
  assert.ok(flat, 'flat-batch row must be present');
  assert.equal(flat.announcedDate, '2026-05-28');
  assert.equal(flat.auctionDateRaw, '2026-07-09');
  assert.match(flat.detailUrl, /przetargi\/320\/782\//);
  assert.equal(
    flat.pdfUrl,
    'https://bip.um.gorzow.pl/system/pobierz.php?plik=ogloszenie_o_przetartgu_na_dzien_09.07.2026r..pdf&id=ce3dfd0954ac875953a9e77f5d0a450a',
  );

  const land = rows.find((r) => !/lokali mieszkalnych/.test(r.title));
  assert.ok(land, 'land row must be present');
  assert.equal(land.auctionDateRaw, '2026-07-16');
});

test('parseBoardPage: empty/foreign HTML → []', () => {
  assert.deepEqual(parseBoardPage('<html><body>nic</body></html>'), []);
  assert.deepEqual(parseBoardPage(''), []);
});

test('isFlatSaleRow: flat batch accepted; land / dzierżawa / rokowania / odwołanie rejected', () => {
  const rows = parseBoardPage(BOARD_ROWS);
  const flat = rows.find((r) => /lokali mieszkalnych/.test(r.title));
  const land = rows.find((r) => !/lokali mieszkalnych/.test(r.title));
  assert.equal(isFlatSaleRow(flat.title), true, flat.title);
  assert.equal(isFlatSaleRow(land.title), false, land.title);
  assert.equal(isFlatSaleRow('Ogłoszenie o przetargu na dzierżawę nieruchomości'), false);
  assert.equal(isFlatSaleRow('Rokowania na sprzedaż lokali mieszkalnych'), false);
  assert.equal(isFlatSaleRow('Odwołanie przetargu na sprzedaż lokali mieszkalnych'), false);
  assert.equal(isFlatSaleRow(''), false);
  assert.equal(isFlatSaleRow(null), false);
});

test('parseResultsPage: two items; flats item has title + decoded PDF URL', () => {
  const items = parseResultsPage(RESULTS_PAGE);
  assert.equal(items.length, 2);
  const flats = items.find((i) => /lokali mieszkalnych/.test(i.title));
  assert.ok(flats, 'flats result item must be present');
  assert.match(flats.title, /przeprowadzonych w dniu 5 lutego 2026r/);
  assert.equal(
    flats.pdfUrl,
    'https://bip.um.gorzow.pl/system/pobierz.php?plik=informacja_o_wyniku_przetargu.pdf&id=a7a56a4144b2940d40da90ac2b872c22&stats=true',
  );
});

test('isSaleResultRow: sale results kept (incl. rokowania), dzierżawa/najem dropped', () => {
  const items = parseResultsPage(RESULTS_PAGE);
  const flats = items.find((i) => /lokali mieszkalnych/.test(i.title));
  const dzierzawa = items.find((i) => /dzierżawę/.test(i.title));
  assert.equal(isSaleResultRow(flats.title), true);
  assert.equal(isSaleResultRow(dzierzawa.title), false);
  assert.equal(isSaleResultRow('Informacja o wyniku rokowań na sprzedaż nieruchomości'), true);
  assert.equal(isSaleResultRow('Informacja o wyniku przetargu na najem lokalu'), false);
  assert.equal(isSaleResultRow(''), false);
});

test('title → auction date for crawl refs (flats archive item)', () => {
  const items = parseResultsPage(RESULTS_PAGE);
  const flats = items.find((i) => /lokali mieszkalnych/.test(i.title));
  assert.equal(resultDateFromText(flats.title), '2026-02-05');
});
