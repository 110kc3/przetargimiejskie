// Góra parser tests. Fixtures are the REAL text extracted live (2026-07-21)
// by the core docText/pdfText extractors from the actual DOCX/PDF attachments
// on bip.gora.com.pl's two boards — embedded verbatim below (each string is the
// byte-for-byte extractor output; the source URL is given above each). No
// paraphrasing — exactly the discipline of parse-wschowa.test.js.
//
// RESULT notices (/wyniki-przetargow.html), flats only:
//   Kłoda Górowska 28/7  — SOLD, linearized table: 31 000 → 68 000 zł (2024-02-16)
//   Wrocławska 26/3      — UNSOLD, II przetarg negatywny (2024-10-25)
//   Wrocławska 26/3      — UNSOLD, rokowania negatywne (2025-01-17)
//   Starogórska 15/6     — SOLD, table: 100 850 → 109 590 zł (2023-12-22)
//   Armii Polskiej 9/7   — SOLD, free-prose rokowania: 27 600 → 32 000 zł (2021-09-30)
//   Czernina Rynek 16    — lokal UŻYTKOWY: must never produce a flat record
// ANNOUNCEMENTS (/233-przetargi.html):
//   Brzeżany 42/2        — I przetarg, FUTURE auction 2026-08-18 (active listing)
//   Kłoda Górowska 28/7  — I przetarg 2024-02-16 (same date as the result → dedups)
//   Armii Polskiej 9/7   — II przetarg 2021-06-23, born-digital PDF whose
//                          two-column cena wywoławcza got scrambled by PDF
//                          linearization → starting_price is legitimately null
//                          (the achieved price lives in the result stream).
//
// See spike: spikes/dolnoslaskie/powiat-gorowski/gora.md

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  moneyTokensZl,
  startingPriceAnnouncement,
  flatAreaFromText,
  roundFromText,
  parsePolishDate,
  auctionDateFromResult,
  auctionDateFromAnnouncement,
  extractFlatAddress,
  isNegativeOutcome,
  isResultNotice,
  parseResultDoc,
  parseAnnouncement,
} from '../src/cities/gora/parse.js';
import { harvestAttachments, isFlatSlug } from '../src/cities/gora/crawl.js';

// ─────────────────────────────────────────────────────── real fetched fixtures

// https://bip.gora.com.pl/files/file_add/download/8073_informacja-o-wyniku-przetargu-lokal-mieszkalny-kloda-gorowska-28-m7.docx
const KLODA_RES = "\nINFORMACJA O WYNIKU PRZETARGU\nData i miejsce przetargu\n\nRodzaj przetargu\nOznaczenie nieruchomości \nNR KW\nLiczba osób dopuszczonych do przetargu\nLiczba wpłaconych wadiów\nLiczba ofert niedopuszczonych do przetargu\nCena wywoławcza w zł\nNajwyższa cena osiągnięta w przetargu\nImię i Nazwisko lub nazwa firmy ustalonych jako nabywcy\n\n\n\n16.02.2024 r. Urząd Miasta i Gminy w Górze\n\n\n\nPrzetarg ustny nieograniczony\n\n\nLokal\nmieszkalny  położony w miejscowości Kłoda Górowska 28/7\n\ndz. nr  190\nKW LE1G/ 00077336/5\n\n\n\n\n5\n\n\n5\n\n\n-\n\n\n31 000,00 zł\n\n\n68 000,00 zł\n\n\nAlina Jan Mendyka\nPrzewodniczący Komisji Przetargowej\n\n  Leszek Szendryk\n\n";
const KLODA_RES_URL = "https://bip.gora.com.pl/files/file_add/download/8073_informacja-o-wyniku-przetargu-lokal-mieszkalny-kloda-gorowska-28-m7.docx";

// https://bip.gora.com.pl/files/file_add/download/9069_informacja-o-wyniku-ii-przetargu-lokal-mieszkalny-gora-ul-wroclawska-26-m3.docx
const WROCL_II_RES = "\nINFORMACJA O WYNIKU II PRZETARGU ustnego nieograniczonego z dnia 25 października 2024 r. na sprzedaż nieruchomości Gminy Góra- lokal mieszkalny położony w Górze przy ul. Wrocławskiej 26/3\n\n\nData i miejsce przetargu\n\nRodzaj przetargu\nOznaczenie nieruchomości \nNR KW\nLiczba osób dopuszczonych do przetargu\nLiczba wpłaconych wadiów\nLiczba ofert niedopuszczonych do przetargu\nCena wywoławcza w zł\nNajwyższa cena osiągnięta w przetargu\nImię i Nazwisko lub nazwa firmy ustalonych jako nabywcy\n\n\n\n25.10.2024 r. Urząd Miasta i Gminy w Górze\n\n\n\nPrzetarg ustny nieograniczony\n\n\nLokal\nmieszkalny  położony w  Górze przy ul. Wrocławskiej 26/3\n\ndz. nr  2016/1\nKW/LE1G/ 00074497/0\n\n\n\n\nbrak uczestników\n\n\n-\n\n\nbrak\n\n\n60 000,00 zł\n\n\n-\n\nSprzedaż przedmiotowej nieruchomości w II przetargu ustnym nieograniczonym zakończyła się wynikiem negatywnym z powodu braku uczestników- w wyznaczonym terminie nikt nie wpłacił wadium\n\nPrzewodnicząca Komisji Przetargowej\n\n  Jolanta Strzeczkowska\nWywieszono na tablicy ogłoszeń Wydziału Gospodarki Nieruchomościami i Spraw Komunalnych\nznajdującej się na korytarzu, na I piętrze bok pok. nr 106 w siedzibie Urzędu Miasta i Gminy w Górze \nul. Mickiewicza 1 w dniu 25.10.2024 r. \n";
const WROCL_II_RES_URL = "https://bip.gora.com.pl/files/file_add/download/9069_informacja-o-wyniku-ii-przetargu-lokal-mieszkalny-gora-ul-wroclawska-26-m3.docx";

// https://bip.gora.com.pl/files/file_add/download/9362_informacja-o-wyniku-rokowan-lokal-mieszkalny-gora-ul-wroclawska-26-m-3.docx
const WROCL_ROK_RES = "\nINFORMACJA O WYNIKU ROKOWAŃ na sprzedaż nieruchomości Gminy Góra- lokal mieszkalny położony w Górze przy ul. Wrocławskiej 26/3\n\n\nData i miejsce rokowań\n\nRodzaj procedury\nOznaczenie nieruchomości \nNR KW\nLiczba osób dopuszczonych do rokowań\nLiczba wpłaconych zaliczek\nLiczba ofert niedopuszczonych do rokowań\nCena wywoławcza w zł\nNajwyższa cena osiągnięta w rokowaniach\nImię i Nazwisko lub nazwa firmy ustalonych jako nabywcy\n\n\n\n17.01.2025 r. Urząd Miasta i Gminy w Górze\n\n\n\nrokowania\n\n\nLokal\nmieszkalny  położony w  Górze przy ul. Wrocławskiej 26/3\n\ndz. nr  2016/1\nKW/LE1G/ 00074497/0\n\n\n\n\nbrak uczestników\n\n\n-\n\n\nbrak\n\n\n60 000,00 zł\n\n\n-\n\nSprzedaż przedmiotowej nieruchomości w drodze rokowań zakończyła się wynikiem negatywnym z powodu braku osób chętnych na nabycie nieruchomości\n\nPrzewodniczący Komisji do przeprowadzania rokowań\n\n  Leszek Szendryk\nWywieszono na tablicy ogłoszeń Wydziału Mienia, Spraw Komunalnych i Środowiska\nznajdującej się na korytarzu, na II piętrze obok pok. nr 205 w siedzibie Urzędu Miasta i Gminy w Górze \nul. Mickiewicza 1 w dniu 17.01.2025 r. \n";
const WROCL_ROK_RES_URL = "https://bip.gora.com.pl/files/file_add/download/9362_informacja-o-wyniku-rokowan-lokal-mieszkalny-gora-ul-wroclawska-26-m-3.docx";

// https://bip.gora.com.pl/files/file_add/download/7870_informacja-o-wyniku-przetargu-lokal-mieszkalny-gora-ul-starogorska-15-m-6.docx
const STAROG_RES = "\nINFORMACJA O WYNIKU PRZETARGU\nData i miejsce przetargu\n\nRodzaj przetargu\nOznaczenie nieruchomości \nNR KW\nLiczba osób dopuszczonych do przetargu\nLiczba wpłaconych wadiów\nLiczba ofert niedopuszczonych do przetargu\nCena wywoławcza w zł\nNajwyższa cena osiągnięta w przetargu\nImię i Nazwisko lub nazwa firmy ustalonych jako nabywcy\n\n\n\n22.12.2023 r. Urząd Miasta i Gminy w Górze\n\n\n\nPrzetarg ustny ograniczony\n\n\nLokal\nmieszkalny  położony w  Górze przy ul. Starogórskiej 15/6\n\ndz. nr  916\nKW/LE1G/ 0008141401/3\n\n\n\n\n1\n\n\n1\n\n\n-\n\n\n100 850,00 zł\n\n\n109 590,00 zł\n\n\nMagdalena Szolc\nPrzewodniczący Komisji Przetargowej\n\n  Leszek Szendryk\n\n";
const STAROG_RES_URL = "https://bip.gora.com.pl/files/file_add/download/7870_informacja-o-wyniku-przetargu-lokal-mieszkalny-gora-ul-starogorska-15-m-6.docx";

// https://bip.gora.com.pl/files/file_add/download/3458_informacja-o-wyniku-rokowan-na-sprzedaz-lokal-mieszkalny-gora-ul-armii-polskiej-9-m-7.docx
const ARMII_ROK_RES = "\nINFORMACJA O WYNIKU ROKOWAŃ NA SPRZEDAŻ NIERUCHOMOŚCI\n\n\nW dniu 30 września 2021 r. w siedzibie Urzędu Miasta i Gminy w Górze odbyły się rokowania w sprawie sprzedaży lokalu mieszkalnego położonego w Górze przy ul. Armii Polskiej 9/7, działka nr 2067/1 o pow. 0,0919 ha, dla której prowadzona jest KW LE1G/00073912/9 udział przypisany do lokalu 3010/219680, tj. 1/100\n\nDo rokowań zakwalifikowano 2 zgłoszenia, które zostały złożone w wyznaczonym terminie i zawierały wszystkie wymagane dane.\n\nDo rokowań przystąpił jeden oferent.\n\nCena wywoławcza do rokowań wynosiła 27 600,00 zł.\n\nCena osiągnięta w wyniku przeprowadzonych rokowań dla lokalu mieszkalnego wyniosła 32 000,00 zł.\n\nNabywcą nieruchomości lokalowej został Pan Piotr Świątek zam. 56-200 Góra, ul. Jodłowa 6.\n\n\n\nPRZEWODNICZĄCA KOMISJI\n\n       Jolanta Strzeczkowska\n";
const ARMII_ROK_RES_URL = "https://bip.gora.com.pl/files/file_add/download/3458_informacja-o-wyniku-rokowan-na-sprzedaz-lokal-mieszkalny-gora-ul-armii-polskiej-9-m-7.docx";

// https://bip.gora.com.pl/files/file_add/download/4787_informacja-o-wyniku-rokowan-sprzedaz-lokal-uzytkowy-czernina-rynek-16.docx
const CZERNINA_UZY_RES = "\nINFORMACJA O WYNIKU ROKOWAŃ NA SPRZEDAŻ NIERUCHOMOŚCI\n\n\nW dniu 14 stycznia 2022 r. w siedzibie Urzędu Miasta i Gminy w Górze odbyły się rokowania w sprawie sprzedaży lokalu użytkowego położonego w Czerninie przy ul. Rynek 16, dz. nr 164/44 o pow. 0,0586 ha KW LE1G/00079084/7, udział 8355/37055\n\nDo rokowań zakwalifikowano 1 zgłoszenia, które zostało złożone w wyznaczonym terminie i zawierało wszystkie wymagane dane.\n\nDo rokowań przystąpił jeden oferent.\n\nCena wywoławcza do rokowań wynosiła 37 760,00 zł.\n\nCena osiągnięta w wyniku przeprowadzonych rokowań dla lokalu użytkowego wyniosła 41 500,00 zł.\n\nNabywcą nieruchomości lokalowej została Firma Handlowo Usługowa Jaworski Cezary. Czernina ul. Rynek 18, 56-200 Góra\n\n\nPRZEWODNICZĄCY KOMISJI\n\n           Leszek Szendryk\n";
const CZERNINA_UZY_RES_URL = "https://bip.gora.com.pl/files/file_add/download/4787_informacja-o-wyniku-rokowan-sprzedaz-lokal-uzytkowy-czernina-rynek-16.docx";

// https://bip.gora.com.pl/files/file_add/download/11557_ogloszenie-o-i-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-brzezany-422.docx
const BRZEZANY_ANN = "\nBURMISTRZ GÓRY\nul. Adama Mickiewicza 1\n56-200 Góra\nMKS.7121.4.2025\t\t\t\t\t\t    Góra, dnia 11 czerwca 2026 r.                                                                           \nO G Ł O S Z E N I E\nNa podstawie art. 38 ust. 1 i 2 Ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami /Dz. U. z 2026 poz. 399/ oraz Rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości /Dz. U. z 2021 poz. 2213/.\nBurmistrz Góry\nogłasza I przetarg ustny nieograniczony\n\nna sprzedaż wolnego lokalu mieszkalnego w miejscowości Brzeżany 42/2 wraz z ułamkową częścią działki nr 64.\n\nAdres\nBrzeżany 42/2, KW LE1G/00082031/5\nObręb\nBrzeżany, działka nr 64 o pow. 0,1000 ha \nPrzeznaczenie nieruchomości\ni sposób jej zagospodarowania\nRM – tereny zabudowy zagrodowej w gospodarstwach rolnych, hodowlanych i ogrodniczych \nKD – pozostałe drogi\nOpis lokalu\nLokal mieszkalny położony jest na I piętrze  budynku mieszkalnego. Powierzchnia użytkowa lokalu wynosi 36,50 m2, na którą składają się jeden pokój, kuchnia.      Do lokalu przynależy pomieszczenie przynależne- pomieszczenie gospodarcze o pow. 7,00 m2. Lokal do remontu.\nLokal wyposażony w instalację elektryczną, wodno-kanalizacyjną - do wymianyNieruchomość nie jest obciążona wpisami hipotecznymi. Działy III i IV ksiąg wieczystych wolne są od wpisów.\nCena wywoławcza  w zł.\n57 000,00 zł /słownie złotych: pięćdziesiąt siedem tysięcy  złotych 00/100\nSprzedaż następuje w trybie art. 43 ust. 1 pkt 10  i art. 29 a  ust. 8 ustawy z 11 marca 2004 r. o podatku od towarów i usług (Dz.U. z 2025 r., poz. 775 ze zm.)/ podlega zwolnieniu z podatku VAT/.\nWadium w zł.\n5 700,00 zł /słownie złotych: pięć tysięcy siedemset złotych /00/100\nWysokość  opłat i terminy ich wnoszenia.\nCena osiągnięta w przetargu płatna najpóźniej do dnia zawarcia aktu notarialnego na konto Urzędu.\nForma sprzedaży\nLokal i grunt na własność. \nUWAGA\n\n1. Przetarg odbędzie się w siedzibie Urzędu Miasta i Gminy w Górze                 ul. Mickiewicza nr 1 pok. nr 205 o godz. 900 w dniu 18.08.2026 r.\n2. Wadium w wysokości  5 700,00 zł /słownie zł: pięć tysięcy siedemset złotych/ należy wpłacić najpóźniej do dnia 11.08.2026 r. na konto Gminy Góra PKO BP S.A. o/Góra nr 45 1020 5226 0000 6202 0497 0226 z dopiskiem „ I Przetarg na lokal mieszkalny Brzeżany 42/2”.  Data wniesienia wadium jest data uznania rachunku bankowego Gminy.\n3. O wysokości postąpienia decydują uczestnicy przetargu z tym, że postąpienie nie może wynosić mniej niż 1% ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. \n4. Przetarg jest ważny bez względu na liczbę uczestników, jeżeli chociaż jeden uczestnik przetargu zaoferuje, co najmniej jedno postąpienie powyżej ceny wywoławczej.\n5. W przetargu mogą brać udział osoby fizyczne i prawne, które wpłacą wadium w wyznaczonym terminie i przedłożą komisji przetargowej w dniu przetargu:\n- w przypadku osób fizycznych- dowód tożsamości i oryginał dowodu wpłaty wadium,\n- w przypadku osób fizycznych prowadzących działalność gospodarczą- wydruk z CEIDG, dowód tożsamości, stosowne pełnomocnictwa,\n- w przypadku osób pozostających w związku małżeńskim posiadających ustawową wspólność małżeńską do udziału w przetargu wymagana jest obecność obojga małżonków. W przypadku uczestnictwa w przetargu jednego małżonka należy złożyć do akt pisemne oświadczenie współmałżonka o wyrażeniu zgody na przystąpienie małżonka do przetargu z zamiarem nabycia nieruchomości będącej przedmiotem przetargu ze środków pochodzących z majątku wspólnego za cenę ustaloną w przetargu.\n- w przypadku osób prawnych - aktualny wypis z rejestru, właściwe pełnomocnictwa, dowody tożsamości osób reprezentujących podmiot, oryginał dowodu wpłaty wadium,\n- pełnomocnicy osób fizycznych zobowiązani są przedstawić upoważnienie,\n-nabycie nieruchomości przez cudzoziemców może nastąpić w przypadku uzyskania zezwolenia Ministra Spraw Wewnętrznych i Administracji, jeżeli wymagają tego przepisy ustawy z dnia 24 marca 1920 r. o nabywaniu nieruchomości przez cudzoziemców (Dz. U. z 2017 r., poz. 2278 z późn zm.)\n6. Wadium wpłacone przez uczestnika, który wygrał przetarg zalicza się na poczet ceny nabycia nieruchomości, a w przypadku uchylenia się od zawarcia umowy notarialnej wadium przepada na rzecz „Sprzedającego” Pozostałym uczestnikom przetargu wadium zostanie zwrócone w terminie 3 dni od daty zamknięcia przetargu. \n7. O terminie zawarcia umowy wygrywający przetarg zawiadamiany jest na piśmie. Koszty zawarcia aktu notarialnego oraz wpisu w księdze wieczystej ponosi nabywca.\n8. Szczegółowe informacje o przedmiocie przetargu można uzyskać w Urzędzie Miasta i Gminy w Górze w Wydziale Gospodarki Komunalnej pok. nr 206 tel.  65 544 36 66. Ogłoszenie znajduje się na stronie internetowej Urzędu Miasta i Gminy w Górze- www.gora.com.pl w dziale PRZETARGI\n9. Termin złożenia wniosku przez osoby, którym przysługuje prawo pierwszeństwa w nabyciu przedmiotowej nieruchomości upłynął w dniu 29 grudnia 2025 r.\n\nORGANIZATOR  PRZETARGU  ZASTRZEGA SOBIE PRAWO ODWOŁANIA PRZETARGU TYLKO Z WAŻNYCH PRZYCZYN. \n\n";
const BRZEZANY_ANN_URL = "https://bip.gora.com.pl/files/file_add/download/11557_ogloszenie-o-i-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-brzezany-422.docx";

// https://bip.gora.com.pl/files/file_add/download/7866_ogloszenie-o-i-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-kloda-gorowska-28-m-7.docx
const KLODA_ANN = "\nBURMISTRZ GÓRY\nul. Adama Mickiewicza 1\n56-200 Góra\nGN.7121.8.2023\t\t\t\t\t\t    Góra, dnia  21  grudnia  2023 r.                                                                           \nO G Ł O S Z E N I E\nNa podstawie art. 38 ust. 1 i 2 Ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami /Dz. U. z 2023 poz. 344 z późn. zm./ oraz Rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu  przeprowadzania przetargów oraz rokowań na zbycie nieruchomości /Dz. U. z 2021 poz. 2213/.\nBurmistrz Góry\nogłasza I przetarg ustny nieograniczony\n\nna sprzedaż wolnego lokalu mieszkalnego w miejscowości Kłoda Górowska 28/7 wraz z ułamkową częścią działki nr 190.\n\nAdres\nKłoda Górowska 28/7, KW LE1G/00077336/5. KW lokalowa LE1G/00077921/3\nObręb\nKłoda Górowska, działka nr 190 o pow. 0,0171 ha \nPrzeznaczenie  nieruchomości\ni sposób jej zagospodarowania\nMW – tereny zabudowy mieszkaniowej wielorodzinnej, \nOpis lokalu\nLokal mieszkalny położony jest na II piętrze  budynku mieszkalnego. Powierzchnia użytkowa lokalu wynosi 26,10 m2, na którą składają się jeden pokój, kuchniai łazienka. Do lokalu przynależy pomieszczenie przynależne- piwnica o pow. 8,00 m2. Lokal do remontu.\nLokal wyposażony w instalację elektryczną, wodno-kanalizacyjną.Nieruchomość nie jest obciążona wpisami hipotecznymi. Działy III i IV ksiąg wieczystych wolne są od wpisów.\nCena wywoławcza  w zł.\n31 000,00 zł /słownie złotych: trzydzieści jeden tysięcy  złotych 00/100\nSprzedaż następuje w trybie art. 43 ust. 1 pkt 10  i art. 29 a  ust. 8 stawy z 11 marca 2004 r. o podatku od towarów i usług (Dz.U. z 2023 r., poz. 1750 ze zm.)/podlega zwolnieniu z podatku VAT/.\nWadium w zł.\n3 100,00 zł /słownie złotych: trzy tysiące sto złotych/ \nWysokość  opłat i terminy ich wnoszenia.\nCena osiągnięta w przetargu płatna najpóźniej do dnia zawarcia aktu notarialnego na  konto Urzędu.\nForma sprzedaży\nLokal i grunt na własność. \nUWAGA\n\n1. Przetarg odbędzie się w siedzibie Urzędu Miasta i Gminy w Górze                 ul. Mickiewicza nr 1 pok. nr 106 o godz. 900 w dniu 16.02.2024 r.\n2. Wadium w wysokości  3 100,00 zł /słownie zł: trzy  tysiące  sto złotych/ należy wpłacić najpóźniej do dnia 12.02.2024 r. na konto Gminy Góra PKO BP S.A. o/Góra nr 45 1020 5226 0000 6202 0497 0226 z dopiskiem „ I Przetarg na lokal mieszkalny Kłoda Górowska 28/7”.  Data wniesienia wadium jest data uznania rachunku bankowego Gminy.\n3. O wysokości postąpienia decydują uczestnicy przetargu z tym, że postąpienie nie może wynosić mniej niż 1% ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. \n4. Przetarg jest ważny bez względu na liczbę uczestników, jeżeli chociaż jeden uczestnik przetargu zaoferuje, co najmniej jedno postąpienie powyżej ceny wywoławczej.\n5. W przetargu mogą brać udział osoby fizyczne i prawne, które wpłacą wadium w wyznaczonym terminie i przedłożą komisji przetargowej w dniu przetargu:\n- w przypadku osób fizycznych- dowód tożsamości i oryginał dowodu wpłaty wadium,\n- w przypadku osób fizycznych prowadzących działalność gospodarczą- wydruk z CEIDG, dowód tożsamości, stosowne pełnomocnictwa,\n- w przypadku osób pozostających w związku małżeńskim posiadających ustawową wspólność małżeńską do udziału w przetargu wymagana jest obecność obojga małżonków. W przypadku uczestnictwa w przetargu jednego małżonka należy złożyć do akt pisemne oświadczenie współmałżonka o wyrażeniu zgody na przystąpienie małżonka do przetargu z zamiarem nabycia nieruchomości będącej przedmiotem przetargu ze środków pochodzących z majątku wspólnego za cenę ustaloną w przetargu.\n- w przypadku osób prawnych- aktualny wypis z rejestru, właściwe pełnomocnictwa, dowody tożsamości osób reprezentujących podmiot, oryginał dowodu wpłaty wadium,\n- pełnomocnicy osób fizycznych zobowiązani są przedstawić upoważnienie,\n-nabycie nieruchomości przez cudzoziemców może nastąpić w przypadku uzyskania zezwolenia Ministra Spraw Wewnętrznych i Administracji, jeżeli wymagają tego przepisy ustawy z dnia 24 marca 1920 r. o nabywaniu nieruchomości przez cudzoziemców  (Dz. U. z 2017 r., poz. 2278 z późn zm.)\n6. Wadium wpłacone przez uczestnika, który wygrał przetarg zalicza się na poczet ceny nabycia nieruchomości, a w przypadku uchylenia się od zawarcia umowy notarialnej wadium przepada na rzecz „Sprzedającego” Pozostałym uczestnikom przetargu  wadium zostanie zwrócone w terminie 3 dni od daty zamknięcia przetargu.. \n7. O terminie zawarcia umowy wygrywający przetarg zawiadamiany jest na piśmie. Koszty zawarcia aktu notarialnego  oraz wpisu w księdze wieczystej ponosi nabywca.\n8. Szczegółowe informacje o przedmiocie przetargu można uzyskać w Urzędzie Miasta i Gminy w Górze w Wydziale Gospodarki Nieruchomościami i Spraw Komunalnych pok. nr 106 tel.  65 544 36 28. Ogłoszenie znajduje się na stronie internetowej Urzędu Miasta i Gminy w Górze- www.gora.com.pl w dziale PRZETARGI\n9. Termin złożenia wniosku przez osoby, którym przysługuje prawo pierwszeństwa w nabyciu przedmiotowej nieruchomości upłynął w dniu 7 grudnia 2024 r.\n\nORGANIZATOR  PRZETARGU  ZASTRZEGA SOBIE PRAWO ODWOŁANIA PRZETARGU TYLKO Z WAŻNYCH PRZYCZYN. \n\n";
const KLODA_ANN_URL = "https://bip.gora.com.pl/files/file_add/download/7866_ogloszenie-o-i-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-kloda-gorowska-28-m-7.docx";

// https://bip.gora.com.pl/files/file_add/download/2494_ogloszenie-ii-przetarg-lokal-mieszkalny-gora-ul-armii-polskiej-9-m7.pdf
const ARMII_II_PDF_ANN = "BURMISTRZ GÓRY\nul. Adama Mickiewicza 1\n56-200 Góra\n\nGN.7121.5.2020                                              Góra, dnia 13 maja 2021 r.\n\n\n                                  OGŁOSZENIE\n\n\nNa podstawie art. 38 ust. 1 i 2 Ustawy z dnia 21 sierpnia 1997 r. o gospodarce\nnieruchomościami /Dz. U. z 2020 poz. 1990 z późn. zm./ oraz Rozporządzenia Rady\nMinistrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz\nrokowań na zbycie nieruchomości /Dz. U. z 2014 poz. 1490/.\n                                     Burmistrz Góry\n                        ogłasza II przetarg ustny nieograniczony\nna sprzedaż wolnego lokalu mieszkalnego położonego w Górze ul. Armii Polskiej 9/7\nw budynku mieszkalnym wraz z ułamkową częścią działki nr 2067/1.\n                                Góra, ul. Armii Polskiej 9/7, działka nr 2067/1,\nAdres\n                                KW LE1G/00073912/9.\nObręb                           Góra działka nr 2067/1 o pow. 0,0919 ha.\n                                Działka znajduje się na terenie zabudowy mieszkaniowej\nPrzeznaczenie nieruchomości\n                                wielorodzinnej, oznaczonej symbolem AE 48MW. Ścisła\ni sposób jej zagospodarowania\n                                strefa „A” ochrony konserwatorskiej.\n                                Lokal mieszkalny położony na poddaszu budynku\n                                mieszkalnego (IV kondygnacji). Powierzchnia użytkowa\n                                lokalu wynosi 27,30 m2, na którą składają się pokój,\n                                kuchnia i łazienka. Łazienka znajduje się poza lokalem-\n                                wejście z korytarza. Do lokalu przynależy piwnica o pow.\n                                użytkowej 2,80 m2.\nOpis lokalu\n                                Lokal o standardzie utrzymania średnim– do remontu.\n                                Lokal wyposażony w instalację elektryczną, wodno\n                                kanalizacyjną (brak odpływu w kuchni- wykonanie na\n                                koszt przyszłego nabywcy), gazową, ogrzewanie CO\n                                Nieruchomość nie jest obciążona wpisami hipotecznymi.\n                                Działy III i IV ksiąg wieczystych wolne są od wpisów.\n                                45 000,00 zł /słownie złotych: czterdzieści pięć tysięcy\n                                złotych\nCena wywoławcza w zł.           Sprzedaż następuje w trybie art. 43 ust. 1 pkt 10 i art. 29a\n                                ust. 8 stawy z 11 marca 2004 r. o podatku od towarów\n                                i usług /podlega zwolnieniu z podatku VAT/.\n\nWadium w zł.                    4 500,00 zł /słownie złotych: cztery tysiące pięćset złotych/\n\fWysokość opłat i terminy ich   Cena osiągnięta w przetargu płatna najpóźniej do dnia\nwnoszenia.                     zawarcia aktu notarialnego na konto Urzędu.\nForma sprzedaży                  Lokal i grunt na własność.\nUWAGA\n1. Przetarg odbędzie się w siedzibie Urzędu Miasta i Gminy w Górze\n ul. Mickiewicza nr 1 pok. nr 106 o godz. 1000 w dniu 23.06.2021 r. Pierwszy przetarg na\nsprzedaż nieruchomości odbył się w dniu 19.02.2021 r. i został zakończony wynikiem\nnegatywnym z uwagi na brak oferentów).\n 2. Wadium w wysokości 4 500,00 zł /słownie zł: cztery tysiące pięćset złotych/ należy\nwpłacić najpóźniej do dnia 17.06.2021 r. na konto Gminy Góra PKO BP S.A. o/Góra nr\n45 1020 5226 0000 6202 0497 0226 z dopiskiem „ Przetarg na lokal mieszkalny Góra\nul. Armii Polskiej 9/7”. Data wniesienia wadium jest data uznania rachunku bankowego\nGminy.\n3. O wysokości postąpienia decydują uczestnicy przetargu z tym, że postąpienie nie może\nwynosić mniej niż 1% ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek\nzłotych\n4. W przetargu mogą brać udział osoby, które wpłacą wadium w wyznaczonym terminie\n i przedłożą komisji przetargowej w dniu przetargu:\n- w przypadku osób fizycznych- dowód tożsamości i oryginał dowodu wpłaty wadium,\n- w przypadku osób prawnych- aktualny wypis z rejestru, właściwe pełnomocnictwa, dowody\ntożsamości osób reprezentujących podmiot, oryginał dowodu wpłaty wadium,\n- pełnomocnicy osób fizycznych zobowiązani są przedstawić upoważnienie,\n- w przypadku osób pozostających w związku małżeńskim posiadających ustawową\nwspólność małżeńską do udziału w przetargu wymagana jest obecność obojga małżonków.\nW przypadku uczestnictwa w przetargu jednego małżonka należy złożyć do akt pisemne\noświadczenie współmałżonka o wyrażeniu zgody na przystąpienie małżonka do przetargu\n z zamiarem nabycia nieruchomości będącej przedmiotem przetargu ze środków\npochodzących z majątku wspólnego za cenę ustaloną w przetargu.\n5. Wadium wpłacone przez uczestnika, który wygrał przetarg zalicza się na poczet ceny\nnabycia nieruchomości, a w przypadku uchylenia się od zawarcia umowy notarialnej wadium\nprzepada na rzecz „Sprzedającego”\nPozostałym uczestnikom przetargu wadium zostanie zwrócone w terminie 3 dni od daty\nzamknięcia przetargu.\n6. Przetarg jest ważny bez względu na liczbę uczestników, jeżeli chociaż jeden uczestnik\nprzetargu zaoferuje, co najmniej jedno postąpienie powyżej ceny wywoławczej.\n7. O terminie zawarcia umowy wygrywający przetarg zawiadamiany jest na piśmie. Koszty\nzawarcia aktu notarialnego oraz wpisu w księdze wieczystej ponosi nabywca.\n8. Szczegółowe informacje o przedmiocie przetargu można uzyskać w Urzędzie Miasta\n i Gminy w Górze w Wydziale Gospodarki Nieruchomościami i Spraw Komunalnych\npok. nr 106 tel. 65 544 36 28\n9. Termin złożenia wniosku przez osoby, którym przysługuje prawo pierwszeństwa\nw nabyciu przedmiotowej nieruchomości minął w dniu 18 grudnia 2020 r.\n\fORGANIZATOR PRZETARGU ZASTRZEGA SOBIE PRAWO ODWOŁANIA\nPRZETARGU TYLKO Z WAŻNYCH PRZYCZYN.\n\f";
const ARMII_II_PDF_ANN_URL = "https://bip.gora.com.pl/files/file_add/download/2494_ogloszenie-ii-przetarg-lokal-mieszkalny-gora-ul-armii-polskiej-9-m7.pdf";

const RESULTS_BOARD_SNIPPET = "<div class=\"file_add__file\"><div class=\"file_add__main\">\n<a href=\"files/file_add/download/8073_informacja-o-wyniku-przetargu-lokal-mieszkalny-kloda-gorowska-28-m7.docx\" class=\"file_add__link file_add__name\" target=\"_blank\" download title=\"Kliknij aby pobrać plik: INFORMACJA O WYNIKU PRZETARGU lokal mieszkalny Kłoda Górowska 28 m7.docx.\">INFORMACJA O WYNIKU PRZETARGU lokal mieszkalny Kłoda Górowska 28 m7.docx</a></div></div>\n<div class=\"file_add__file\"><a href=\"files/file_add/download/7870_informacja-o-wyniku-przetargu-lokal-mieszkalny-gora-ul-starogorska-15-m-6.docx\" class=\"file_add__link\">INFORMACJA O WYNIKU PRZETARGU lokal ul. Starogórska 15/6</a></div>\n<div class=\"file_add__file\"><a href=\"files/file_add/download/4787_informacja-o-wyniku-rokowan-sprzedaz-lokal-uzytkowy-czernina-rynek-16.docx\" class=\"file_add__link\">INFORMACJA O WYNIKU ROKOWAŃ sprzedaż lokal użytkowy Czernina Rynek 16</a></div>\n<div class=\"file_add__file\"><a href=\"files/file_add/download/11239_informacja-o-wyniku-przetargu-na-sprzedaz-dzialki-nr-13674-obreb-gora.docx\" class=\"file_add__link\">Informacja o wyniku przetargu na sprzedaż działki nr 1367/4 obręb Góra</a></div>";

// ───────────────────────────────────────────────────────────────── unit funcs

test('parsePLN: space/dot thousands + unseparated', () => {
  assert.equal(parsePLN('31 000,00'), 31000);
  assert.equal(parsePLN('100.850,00'), 100850);
  assert.equal(parsePLN('57000'), 57000);
  assert.equal(parsePLN('brak'), null);
});

test('moneyTokensZl: ordered zł amounts, label "w zł" ignored', () => {
  assert.deepEqual(moneyTokensZl('Cena wywoławcza w zł 31 000,00 zł ... 68 000,00 zł'), [31000, 68000]);
  assert.deepEqual(moneyTokensZl('wyniosła 32 000,00 zł. wywoławcza 27 600,00 zł'), [32000, 27600]);
  assert.deepEqual(moneyTokensZl('brak uczestników'), []);
});

test('roundFromText: roman qualifying "przetarg"; "Miasta i Gminy"/rokowania → null', () => {
  assert.equal(roundFromText('ogłasza I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('INFORMACJA O WYNIKU II PRZETARGU ustnego nieograniczonego'), 2);
  assert.equal(roundFromText('Urząd Miasta i Gminy w Górze'), null);
  assert.equal(roundFromText('INFORMACJA O WYNIKU ROKOWAŃ'), null);
});

test('parsePolishDate: numeric + long-form Polish months', () => {
  assert.equal(parsePolishDate('18.08.2026'), '2026-08-18');
  assert.equal(parsePolishDate('9 sierpnia 2024'), '2024-08-09');
  assert.equal(parsePolishDate('30 września 2021'), '2021-09-30');
  assert.equal(parsePolishDate('22.12.2023'), '2023-12-22');
});

test('extractFlatAddress: ul./pl. street form, w-miejscowości form; venue rejected', () => {
  assert.equal(extractFlatAddress('lokal mieszkalny położony w Górze przy ul. Wrocławskiej 26/3'), 'Wrocławskiej 26/3');
  assert.equal(extractFlatAddress('lokalu mieszkalnego położonego w Górze przy ul. Armii Polskiej 9/7, działka nr 2067/1'), 'Armii Polskiej 9/7');
  assert.equal(extractFlatAddress('lokalu mieszkalnego położonego w Górze pl. B. Chrobrego 2/2 w budynku'), 'B. Chrobrego 2/2');
  assert.equal(extractFlatAddress('Lokal mieszkalny położony w miejscowości Kłoda Górowska 28/7'), 'Kłoda Górowska 28/7');
  // the office/venue address (no /apt slash) must never be mistaken for the flat
  assert.equal(extractFlatAddress('w siedzibie Urzędu Miasta i Gminy w Górze ul. Mickiewicza nr 1 pok. nr 205'), null);
});

test('isNegativeOutcome / isResultNotice', () => {
  assert.equal(isNegativeOutcome('zakończyła się wynikiem negatywnym z powodu braku uczestników'), true);
  assert.equal(isNegativeOutcome('najwyższa cena osiągnięta 68 000,00 zł'), false);
  assert.equal(isResultNotice('INFORMACJA O WYNIKU PRZETARGU'), true);
  assert.equal(isResultNotice('Burmistrz Góry ogłasza I przetarg ustny'), false);
});

test('auctionDateFromResult / auctionDateFromAnnouncement on real fixtures', () => {
  assert.equal(auctionDateFromResult(KLODA_RES), '2024-02-16');   // first numeric table date
  assert.equal(auctionDateFromResult(ARMII_ROK_RES), '2021-09-30'); // long-form prose ("30 września 2021")
  assert.equal(auctionDateFromAnnouncement(BRZEZANY_ANN), '2026-08-18');
  assert.equal(auctionDateFromAnnouncement(KLODA_ANN), '2024-02-16');
});

test('startingPriceAnnouncement / flatAreaFromText on real announcement', () => {
  assert.equal(startingPriceAnnouncement(BRZEZANY_ANN), 57000);
  assert.equal(flatAreaFromText(BRZEZANY_ANN), 36.5);
  assert.equal(flatAreaFromText(KLODA_ANN), 26.1);
});

// ─────────────────────────────────────────────────────────────── result docs

test('parseResultDoc: SOLD table (Kłoda Górowska 28/7) — 31 000 → 68 000 zł', () => {
  const out = parseResultDoc(KLODA_RES, null, KLODA_RES_URL);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    auction_date: '2024-02-16',
    source_pdf: KLODA_RES_URL,
    kind: 'mieszkalny',
    address_raw: 'Kłoda Górowska 28/7',
    address: { street: 'Kłoda Górowska', street_norm: 'kloda gorowska', building: '28', apt: '7', key: 'kloda gorowska|28|7', warning: null },
    round: null,
    starting_price_pln: 31000,
    final_price_pln: 68000,
    outcome: 'sold',
    unsold_reason: null,
    area_m2: null,
    notes: [],
  });
});

test('parseResultDoc: SOLD table (Starogórska 15/6) — 100 850 → 109 590 zł', () => {
  const out = parseResultDoc(STAROG_RES, null, STAROG_RES_URL);
  assert.equal(out.length, 1);
  assert.equal(out[0].address.key, 'starogorskiej|15|6');
  assert.equal(out[0].auction_date, '2023-12-22');
  assert.equal(out[0].starting_price_pln, 100850);
  assert.equal(out[0].final_price_pln, 109590);
  assert.equal(out[0].outcome, 'sold');
});

test('parseResultDoc: SOLD free-prose rokowania (Armii Polskiej 9/7) — 27 600 → 32 000 zł', () => {
  const out = parseResultDoc(ARMII_ROK_RES, null, ARMII_ROK_RES_URL);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    auction_date: '2021-09-30',
    source_pdf: ARMII_ROK_RES_URL,
    kind: 'mieszkalny',
    address_raw: 'Armii Polskiej 9/7',
    address: { street: 'Armii Polskiej', street_norm: 'armii polskiej', building: '9', apt: '7', key: 'armii polskiej|9|7', warning: null },
    round: null,
    starting_price_pln: 27600,
    final_price_pln: 32000,
    outcome: 'sold',
    unsold_reason: null,
    area_m2: null,
    notes: ['procedure: rokowania'],
  });
});

test('parseResultDoc: UNSOLD II przetarg negatywny (Wrocławska 26/3)', () => {
  const out = parseResultDoc(WROCL_II_RES, null, WROCL_II_RES_URL);
  assert.equal(out.length, 1);
  assert.equal(out[0].address.key, 'wroclawskiej|26|3');
  assert.equal(out[0].auction_date, '2024-10-25');
  assert.equal(out[0].round, 2);
  assert.equal(out[0].starting_price_pln, 60000);
  assert.equal(out[0].final_price_pln, null);
  assert.equal(out[0].outcome, 'unsold');
});

test('parseResultDoc: UNSOLD rokowania negatywne (Wrocławska 26/3)', () => {
  const out = parseResultDoc(WROCL_ROK_RES, null, WROCL_ROK_RES_URL);
  assert.equal(out.length, 1);
  assert.equal(out[0].address.key, 'wroclawskiej|26|3');
  assert.equal(out[0].auction_date, '2025-01-17');
  assert.equal(out[0].final_price_pln, null);
  assert.equal(out[0].outcome, 'unsold');
  assert.deepEqual(out[0].notes, ['procedure: rokowania']);
});

test('parseResultDoc: lokal UŻYTKOWY (Czernina Rynek 16) is never a flat record', () => {
  assert.deepEqual(parseResultDoc(CZERNINA_UZY_RES, null, CZERNINA_UZY_RES_URL), []);
  assert.deepEqual(parseResultDoc('', null, null), []);
  assert.deepEqual(parseResultDoc(null, null, null), []);
});

// ───────────────────────────────────────────────────────────── announcements

test('parseAnnouncement: FUTURE active listing (Brzeżany 42/2, 2026-08-18)', () => {
  const r = parseAnnouncement(BRZEZANY_ANN, BRZEZANY_ANN_URL);
  assert.ok(r);
  assert.equal(r.address.key, 'brzezany|42|2');
  assert.equal(r.address_raw, 'Brzeżany 42/2');
  assert.equal(r.auction_date, '2026-08-18');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 57000);
  assert.equal(r.area_m2, 36.5);
  assert.equal(r.kind, 'mieszkalny');
});

test('parseAnnouncement: Kłoda 28/7 I przetarg shares the result key + date (enables dedup + area enrichment)', () => {
  const r = parseAnnouncement(KLODA_ANN, KLODA_ANN_URL);
  assert.ok(r);
  assert.equal(r.address.key, 'kloda gorowska|28|7');
  assert.equal(r.auction_date, '2024-02-16'); // identical to the Kłoda result → dedupeListingsByDate collapses them
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 31000);
  assert.equal(r.area_m2, 26.1);
});

test('parseAnnouncement: born-digital PDF (Armii Polskiej II przetarg) parses address/round/area; scrambled price → null', () => {
  const r = parseAnnouncement(ARMII_II_PDF_ANN, ARMII_II_PDF_ANN_URL);
  assert.ok(r);
  assert.equal(r.address.key, 'armii polskiej|9|7');
  assert.equal(r.auction_date, '2021-06-23');
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, null); // legitimate: PDF two-column linearization detached the value from its label
});

// ───────────────────────────────────────────────────────────── crawl helpers

test('isFlatSlug: mieszkalny slugs pass, użytkowy/land slugs rejected', () => {
  // the Starogórska result whose visible anchor text is only "lokal ul. Starogórska 15/6"
  // still classifies flat via the slug's "lokal-mieszkalny"
  assert.equal(isFlatSlug('informacja-o-wyniku-przetargu-lokal-mieszkalny-gora-ul-starogorska-15-m-6'), true);
  assert.equal(isFlatSlug('ogloszenie-o-i-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-brzezany-422'), true);
  assert.equal(isFlatSlug('informacja-o-wyniku-rokowan-sprzedaz-lokal-uzytkowy-czernina-rynek-16'), false);
  assert.equal(isFlatSlug('informacja-o-wyniku-przetargu-na-sprzedaz-dzialki-nr-13674-obreb-gora'), false);
});

test('harvestAttachments: real board anchors → {id, slug, ext, abs url}, newest-first', () => {
  const atts = harvestAttachments(RESULTS_BOARD_SNIPPET);
  const flats = atts.filter((a) => isFlatSlug(a.slug));
  assert.deepEqual(flats.map((a) => a.id), [8073, 7870]); // desc; użytkowy(4787) + land(11239) excluded by slug
  const kloda = atts.find((a) => a.id === 8073);
  assert.equal(kloda.ext, 'docx');
  assert.equal(kloda.url, 'https://bip.gora.com.pl/files/file_add/download/8073_informacja-o-wyniku-przetargu-lokal-mieszkalny-kloda-gorowska-28-m7.docx');
  assert.ok(kloda.slug.includes('lokal-mieszkalny'));
});
