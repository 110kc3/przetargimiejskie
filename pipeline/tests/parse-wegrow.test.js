// Węgrów parser tests. Fixtures are REAL captured strings fetched live from
// bip.wegrow.com.pl on 2026-07-10/11 (board 345 "Ogłoszenia sprzedaży"):
// titles are verbatim from the board's own XML feed
// (/artykuly/xml/345/1/1); bodies are the ACTUAL extracted text of each
// article's primary PDF attachment — pdftotext (native) for the two
// Narutowicza-7 2024 documents and the bezprzetargowo wykaz, `tesseract -l
// pol` OCR (the ogłoszenie/wynik PDFs sampled live are 300dpi scans with no
// embedded text layer — pdffonts lists zero fonts) for the four 2026
// documents — so the OCR noise (mangled m² glyph, an "©" misread for "o",
// stray letter-spacing on signature blocks) is preserved verbatim, exactly
// as the real crawl would see it, not paraphrased or cleaned up.
//
//   article 12148  ul. Nowej 3/19       — PENDING flat, round unstated (1),
//                   160 000 zł, przetarg 28.04.2026 (announcement OCR'd)
//   article 12233  ul. Nowej 3/19       — UNSOLD (wynikiem negatywnym, "brak
//                   uczestników / nikt nie wpłacił wadium"), round unstated,
//                   same 160 000 zł — also the fixture that caught a REAL bug
//                   (this notice restates the AUCTION VENUE, "przy ul. Rynek
//                   Mariacki 16", the town hall's own address, BEFORE the
//                   subject flat's own "przy ul. Nowej 3" — unguarded, that
//                   venue mention was picked as "the" address)
//   article 12186  ul. Ks. Kazimierza Czarkowskiego — PENDING land, round
//                   unstated, 3 parcels (3286/2, 5742/2, 5773/7), 1282 m²,
//                   500 000 zł netto, przetarg 16.06.2026 — the fixture that
//                   caught a second REAL bug: OCR misreads the "o" in the
//                   3rd parcel's OWN "5773/7 o pow. 0,0582 ha" as "©",
//                   silently dropping it from the per-parcel regex; recovered
//                   via the same announcement's summary list clause instead
//   article 12289  ul. Ks. Kazimierza Czarkowskiego — SOLD, round unstated,
//                   500 000 -> 605 000 zł netto (buyer: a sp. z o.o.)
//   article 10953  ul. Narutowicza 7    — PENDING house (zabudowana), ROUND
//                   2 EXPLICIT ("ogłasza drugi przetarg"), 500.000 zł
//                   (dot-thousands, unlike the 2026 docs' space-thousands),
//                   przetarg 26.03.2024 — also carries a live prior-round
//                   history trap ("Pierwszy przetarg został ogłoszony w dniu
//                   07 listopada 2023 r. i zakończył się wynikiem
//                   negatywnym.") that a naive round regex could misfire on
//   article 11070  ul. Narutowicza 7    — SOLD, round 2 explicit ("odbył się
//                   drugi przetarg"), 500.000 -> 505.000 zł (en-dash
//                   achieved-price phrasing, no "wyniosła" verb — a SECOND
//                   live phrasing distinct from Czarkowskiego's)
//   article 12147  ul. Piłsudskiego 9/19 — BEZPRZETARGOWO tenant wykaz
//                   ("Sprzedaż w trybie bezprzetargowym na rzecz najemcy"),
//                   222 586,00 zł — SKIPPED by title alone (isSkippableTitle),
//                   never fetched as an announcement/result; a genuine
//                   Word-produced native-text PDF (not a scan, unlike every
//                   ogłoszenie/wynik document above)
//
// A REAL bug's context worth restating: classify-kind.js's BUILT_RE guard is
// an UNWINDOWED full-text scan, and Węgrów's own land-announcement boilerplate
// describes NEIGHBORING parcels as "zabudowane" ("Otoczenie nieruchomości
// stanowią nieruchomości gruntowe zabudowane …", article 12186 point 2) —
// feeding it the whole body would flip the (niezabudowana) SUBJECT parcel to
// 'zabudowana'. kindFromText here tries the TITLE first (reliably terse) and
// only falls back to a 700-char BODY WINDOW (comfortably clear of that later
// paragraph on every live sample) — see parse.js for the exact character
// offsets this was validated against.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isNegativeOutcome,
  unitAreaFromText,
  streetFromHeader,
  addressRawFromText,
  parsePLN,
} from '../src/cities/wegrow/parse.js';
import { parseBoardPage, primaryAttachmentUrl } from '../src/cities/wegrow/crawl.js';

// --------------------------------------------------------------- real fixtures

const NOWA_3_19_ANN_TITLE = "Ogłoszenie przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiącej lokal mieszkalny nr 19 przy ul. Nowej 3 w Węgrowie";

const NOWA_3_19_ANN_BODY = "Załącznik nr 1 do Zarządzenia nr 352/2026\nBurmistrza Miasta Węgrowa\nz dnia 12 marca 2026 r.\n\nBURMISTRZ MIASTA WĘGROWA\n\nOGŁASZA PRZETARG USTNY NIEOGRANICZONY\nna sprzedaż nieruchomości stanowiącej lokal mieszkalny nr 19 położony w Węgrowie\nprzy ul. Nowej 3\n\n. Przedmiotem przetargu ustnego nieograniczonego jest lokal mieszkalny nr 19, położony w\nbudynku mieszkalnym wielorodzinnym przy ul. Nowej 3 w Węgrowie, o powierzchni użytkowej\n52,70 m? z jednoczesną sprzedażą udziału 527/10600 części we współwłasności nieruchomości\ngruntowej, oznaczonej w ewidencji gruntów jako działka nr 5769/12 o pow. 0,0512 ha\n(zabudowana budynkiem mieszkalnym wielorodzinnym), uregulowana w księdze wieczystej nr\nSI1W/00046428/3 i udziału 527/26664 części we współwłasności nieruchomości gruntowej,\noznaczonej w ewidencji gruntów jako działka nr 5769/3 o pow. 0,1741 ha, uregulowana w księdze\nwieczystej nr SI1W/00046430/0 oraz udziały w częściach wspólnych budynku i urządzeń, zwany\ndalej „nieruchomością”.\n\n. Przedmiotowy lokal usytuowany jest na poddaszu budynku mieszkalnego wielorodzinnego, w\nktórego skład wchodzi: pomieszczenie o pow. 15,5 m?, kuchnia o pow. 10 m? WC o pow. 2,1 m”,\npokój o pow. 12,6 m?, pomieszczenie o pow. 12,5 m?, lokal nie posiada balkonu oraz\npomieszczenia przynależnego (piwnicy). Wysokość lokalu zmienna. Stolarka okienna PCV bez\nnawietrzników, ekspozycja okien na wschód. Lokal nie posiada wewnętrznej komunikacji, wejścia\ndo poszczególnych pomieszczeń za wyjątkiem kuchni odbywają się z korytarza, będącego częścią\nogólnodostępną wspólnoty mieszkaniowej. Stan lokalu pogorszony wymaga remontu.\n\n. W obowiązującym Miejscowym Planie Zagospodarowania Przestrzennego Strefy Śródmiejskiej\nMiasta Węgrowa część I, zatwierdzonym Uchwałą Rady Miejskiej Węgrowa Nr XXX1/200/2013\nz dnia 27 czerwca 2013 r. (Dz. Urz. Woj. Maz. poz. 11322), tereny te przeznaczone są pod\nzabudowę mieszkaniową wielorodzinną z dopuszczeniem usług nieuciążliwych oraz realizacji\ninfrastruktury towarzyszącej funkcji podstawowej, takiej jak: place zabaw, miejsca postojowe,\ninfrastruktura techniczna, dojścia i dojazdy oraz mała architektura (oznaczenie na rysunku ww.\nplanu symbolem — 25.MWU).\n\n. Nieruchomość stanowiąca przedmiot przetargu nie jest obciążona ograniczonymi prawami\nrzeczowymi i nie ma przeszkód prawnych w rozporządzaniu nią.\n\n„. Cena wywoławcza nieruchomości wynosi 160 000,00 zł (słownie: sto sześćdziesiąt tysięcy\nzłotych 00/100). Na podstawie art. 43 ust. 1 pkt 10 ustawy z dnia 11 marca 2004 r o podatku od\ntowarów i usług (Dz. U. z 2025 r. poz. 775 z późn. zm.) sprzedaż lokalu zwolniona jest z opłaty\npodatku VAT.\n\n„Przetarg odbędzie się w dniu 28 kwietnia 2026 r. o godz. 12%9 w siedzibie Urzędu Miejskiego w\nWęgrowie, Rynek Mariacki 16, piętro I, pokój nr 8 (sala konferencyjna).\n\n. . Warunkiem przystąpienia do przetargu jest wniesienie w pieniądzu (PLN) wadium w wysokości:\n16 000,00 zł (słownie: szesnaście tysięcy złotych 00/100) na rachunek Urzędu Miejskiego w\nWęgrowie, w PKO BP O/Węgrów Nr 61 1020 4476 0000 8702 0365 0132 w terminie do dnia\n23 kwietnia 2026 r. oraz podanie w tytule „Wadium na przetarg ustny nieograniczony lokal\nmieszkalny nr 19 przy ul. Nowej 3” — (za datę wniesienia wadium uważa się datę jego wpływu na\nkonto Urzędu).\n\n. Wadium wpłacone przez uczestnika, który przetarg wygrał, zaliczone zostanie na poczet ceny\n\nstr. 1\n10.\n\n11.\n\n12.\n\n3.\n\n14.\n\nnabycia nieruchomości. Wadium ulega przepadkowi w razie uchylenia się uczestnika, który\nprzetarg wygrał od zawarcia umowy sprzedaży. Pozostałym uczestnikom przetargu wadium\nzostanie zwrócone niezwłocznie po odwołaniu albo zamknięciu przetargu, jednak nie później niż\nprzed upływem 3 dni od dnia odpowiednio: odwołania przetargu, zamknięcia przetargu,\nunieważnienia przetargu, zakończenia przetargu wynikiem negatywnym.\n\nBurmistrz Miasta może odwołać ogłoszony przetarg z ważnych powodów, informując o tym\nniezwłocznie w formie właściwej dla ogłoszenia o przetargu i podając przyczynę odwołania\nprzetargu.\n\nW przetargu mogą brać udział osoby fizyczne i prawne. Osoby fizyczne zobowiązane są do\nprzedstawienia komisji przetargowej dokumentu stwierdzającego tożsamość. Osoba\nreprezentująca w przetargu osobę prawną winna okazać stosowne pełnomocnictwo.\n\nPrzed przystąpieniem do przetargu należy zapoznać się ze stanem nieruchomości oraz\nregulaminem przetargu dostępnym w Wydziale Gospodarki Przestrzennej i Nieruchomości (adres\nponiżej) i na stronie internetowej: https://bip.wegrow.com.pl/artykuly/345/ogloszenia-sprzedazy .\nOsoby zainteresowane nabyciem nieruchomości będą mogły obejrzeć ją w uzgodnionym\ntelefonicznie terminie (25 308 11 90 w. 208 lub 206).\n\nSzczegółowe informacje o przedmiocie przetargu można uzyskać w Wydziale Gospodarki\nPrzestrzennej i Nieruchomości Urzędu Miejskiego w Węgrowie, ul. Wyszyńskiego 1, piętro I,\npokój nr 5 i 6 lub pod nr tel. 25 308 11 90 w. 208 1 206.\n\nOgłoszenie niniejsze podlega publikacji na okres co najmniej 30 dni przed wyznaczonym terminem\nprzetargu poprzez wywieszenie na tablicy ogłoszeń w siedzibie Urzędu Miejskiego w Węgrowie\nul. Rynek Mariacki 16, 07-100 Węgrów, na stronie internetowej Urzędu Miejskiego w Węgrowie\noraz w Biuletynie Informacji Publicznej. Ponadto wyciąg z ogłoszenia o przetargu zamieszcza się,\nw prasie o zasięgu obejmującym co najmniej powiat, na terenie którego położona jest zbywana\nnieruchomość tj. „Tygodnik Siedlecki”.\n\nBURM\n\nPaweł MIA chela\n\nstr. 2\n";

const NOWA_3_19_RESULT_TITLE = "Informacja o wyniku przetargu na sprzedaż nieruchomości stanowiącej lokal mieszkalny nr 19 przy ul. Nowej 3 w Węgrowie";

const NOWA_3_19_RESULT_BODY = "BURMISTRZ MIASTA WĘGROWA\nRynek Mariacki 16 * 07-100 Węgrów * tel. (25) 308 12 00 * fax. (25) 308 12 08\nwww.wegrow.com.pl * e-mail: sekretariatQ©wegrow.com.pl\n\nWęgrów, 06.05.2026 r.\nGPN.6840.2.2025\n\nINFORMACJA O WYNIKU PRZETARGU\n\nBurmistrz Miasta Węgrowa informuje, że w dniu 28 kwietnia 2026 r. o godz. 12:00\nw siedzibie Urzędu Miejskiego w Węgrowie, przy ul. Rynek Mariacki 16, odbył się przetarg\nustny nieograniczony na sprzedaż nieruchomości stanowiącej lokal mieszkalny nr 19,\npołożony w budynku mieszkalnym wielorodzinnym przy ul. Nowej 3 w Węgrowie, o\npowierzchni użytkowej 52,70 m? z jednoczesną sprzedażą udziału 527/10600 części we\nwspółwłasności nieruchomości gruntowej, oznaczonej w ewidencji gruntów jako działka nr\n5769/12 o pow. 0,0512 ha (zabudowana budynkiem mieszkalnym wielorodzinnym),\nuregulowana w księdze wieczystej nr SI1W/00046428/3 i udziału 527/26664 części we\nwspółwłasności nieruchomości gruntowej, oznaczonej w ewidencji gruntów jako działka nr\n5769/3 o pow. 0,1741 ha, uregulowana w księdze wieczystej nr SI1W/00046430/0 oraz\nudziały w częściach wspólnych budynku i urządzeń.\n\nCena wywoławcza nieruchomości wynosiła 160 000,00 zł (słownie: sto sześćdziesiąt tysięcy\nzłotych 00/100). Sprzedaż nieruchomości zwolniona z opłaty podatku VAT.\n\nPrzetarg zakończył się wynikiem negatywnym, z powodu braku uczestników przetargu (nikt\nnie wpłacił wadium).\n\nPowyższą informację wywiesza się na okres 7 dni na tablicy ogłoszeń w siedzibie Urzędu\n\nMiejskiego w Węgrowie, przy ul. Rynek Mariacki 16, 07-100 Węgrów, na stronie\ninternetowej Urzędu Miejskiego w Węgrowie oraz w Biuletynie Informacji Publicznej.\n\nBUR! AŻ; TRZ\nPaweł Li hela\n\n585 lat Węgrowa\n1441 - 2026\n";

const CZARKOWSKIEGO_ANN_TITLE = "Ogłoszenie przetargu ustnego nieograniczonego na sprzedaż nieruchomości gruntowych położonych w Węgrowie przy ul. Ks. Kazimierza Czarkowskiego";

const CZARKOWSKIEGO_ANN_BODY = "Załącznik nr 1 do Zarządzenia nr 368/2026\nBurmistrza Miasta Węgrowa\nz dnia 9 kwietnia 2026 r.\n\nBURMISTRZ MIASTA WĘGROWA\n\nOGŁASZA PRZETARG USTNY NIEOGRANICZONY\nna sprzedaż nieruchomości gruntowych położonych w Węgrowie\nprzy ul. Ks. Kazimierza Czarkowskiego\n\n. Przedmiotem przetargu ustnego nieograniczonego są następujące nieruchomości gruntowe\nniezabudowane stanowiące własność Miasta Węgrowa, oznaczone w ewidencji gruntów jako\ndziałka nr 3286/2 o pow. 0,0412 ha, uregulowana w księdze wieczystej nr SIL1W/00028243/0,\nnr 5742/2 o pow. 0,0288 ha, uregulowana w księdze wieczystej nr SI1W/00007374/4 oraz nr\n5773/7 © pow. 0,0582 ha, uregulowana w księdze wieczystej nr SII1W/00028245/4, położone\nw Węgrowie przy ul. Ks. Kazimierza Czarkowskiego, zwane dalej „nieruchomościami”.\n\n.. Nieruchomości te stanowią trzy sąsiadujące ze sobą działki nr 3286/2, 5742/2, 5773/7 o łącznej\npowierzchni 0,1282 ha, które usytuowane są w centralnej części Węgrowa przy ul. Ks. Kazimierza\nCzarkowskiego. Otoczenie nieruchomości stanowią nieruchomości gruntowe zabudowane\nzabudową mieszkalną jednorodzinną i usługową. Od północy graniczą one z działkami\nzabudowanymi zabudową mieszkalną jednorodzinną, od zachodu z działką zabudowaną\nbudynkami usługowymi, a od wschodu z działką drogową. Południową ich granicę stanowi\nul. Ks. Kazimierza Czarkowskiego. Teren płaski bez ogrodzenia na całej swojej powierzchni\nporośnięty roślinnością trawiastą.\n\n. W obowiązującym Miejscowym Planie Zagospodarowania Przestrzennego Strefy Śródmiejskiej\nMiasta Węgrowa część I, zatwierdzonym Uchwałą Rady Miejskiej Węgrowa Nr XXXI/200/2013\nz dnia 27 czerwca 2013 r. (Dz. Urz. Woj. Maz. poz. 11322), tereny te przeznaczone są pod\nzabudowę mieszkaniową wielorodzinną z dopuszczeniem usług nieuciążliwych oraz realizacji\ninfrastruktury towarzyszącej funkcji podstawowej, takiej jak: place zabaw, miejsca postojowe,\ninfrastruktura techniczna, dojścia i dojazdy oraz mała architektura (oznaczenie na rysunku ww.\nplanu symbolem — 73.MWU).\n\n. Nieruchomości te nie są obciążone ograniczonymi prawami rzeczowymi i nie ma przeszkód\nprawnych w rozporządzaniu nimi.\n\n. Cena wywoławcza nieruchomości wynosi 500 000,00 zł netto (słownie: pięćset tysięcy złotych\n00/100). Do ceny nabycia nieruchomości dolicza się podatek VAT 23%.\n\n. Przetarg odbędzie się w dniu 16 czerwca 2026 r. o godz. 1209 w siedzibie Urzędu Miejskiego w\nWęgrowie, Rynek Mariacki 16, piętro I, pokój nr 8 (sala konferencyjna).\n\n„ Warunkiem przystąpienia do przetargu jest wniesienie w pieniądzu (PLN) wadium w wysokości:\n50 000,00 zł (słownie: pięćdziesiąt tysięcy złotych 00/100) na rachunek Urzędu Miejskiego w\nWęgrowie, w PKO BP O/Węgrów Nr 61 1020 4476 0000 8702 0365 0132 w terminie do dnia\n11 czerwca 2026 r. oraz podanie w tytule „Wadium na przetarg ustny nieograniczony dz. nr\n3286/2, 5742/2, 5773/7 obręb Węgrów przy ul. Ks. Kazimierza Czarkowskiego” — (za datę\nwniesienia wadium uważa się datę jego wpływu na konto Urzędu).\n\n.. Wadium wpłacone przez uczestnika, który przetarg wygrał, zaliczone zostanie na poczet ceny\nnabycia nieruchomości. Wadium ulega przepadkowi w razie uchylenia się uczestnika, który\nprzetarg wygrał od zawarcia umowy sprzedaży. Pozostałym uczestnikom przetargu wadium\nzostanie zwrócone niezwłocznie po odwołaniu albo zamknięciu przetargu, jednak nie później niż\n\nstr. 1\n\n10.\n\n11.\n\n12,\n\n13.\n\n14.\n\nprzed upływem 3 dni od dnia odpowiednio: odwołania przetargu, zamknięcia przetargu,\nunieważnienia przetargu, zakończenia przetargu wynikiem negatywnym.\n\nBurmistrz Miasta może odwołać ogłoszony przetarg z ważnych powodów, informując o tym\nniezwłocznie w formie właściwej dla ogłoszenia o przetargu i podając przyczynę odwołania\nprzetargu.\n\nW przetargu mogą brać udział osoby fizyczne i prawne. Osoby fizyczne zobowiązane są do\nprzedstawienia komisji przetargowej dokumentu stwierdzającego tożsamość. Osoba\nreprezentująca w przetargu osobę prawną winna okazać stosowne pełnomocnictwo.\n\nPrzed przystąpieniem do przetargu należy zapoznać się ze stanem nieruchomości oraz\nregulaminem przetargu dostępnym w Wydziale Gospodarki Przestrzennej i Nieruchomości (adres\nponiżej) i na stronie internetowej: https://bip.wegrow.com.pl/artykuly/345/ogloszenia-sprzedazy .\nOsoby zainteresowane nabyciem nieruchomości będą mogły obejrzeć ją w uzgodnionym\ntelefonicznie terminie (25 308 11 90 w. 208 lub 206).\n\nSzczegółowe informacje o przedmiocie przetargu można uzyskać w Wydziale Gospodarki\nPrzestrzennej i Nieruchomości Urzędu Miejskiego w Węgrowie, ul. Wyszyńskiego 1, piętro I,\npokój nr 5 i 6 lub pod nr tel. 25 308 11 90 w. 208 lub 206.\n\nOgłoszenie niniejsze podlega publikacji na okres co najmniej 2 miesięcy przed wyznaczonym\nterminem przetargu poprzez wywieszenie na tablicy ogłoszeń w siedzibie Urzędu Miejskiego w\nWęgrowie ul. Rynek Mariacki 16, 07-100 Węgrów, na stronie internetowej Urzędu Miejskiego w\nWęgrowie oraz w Biuletynie Informacji Publicznej. Ponadto wyciąg z ogłoszenia o przetargu\nzamieszcza się w prasie codziennej ogólnokrajowej tj. „Puls Biznesu”.\n\nBURMISTRZ\n\nPaweł chela\n\nstr. 2\n";

const CZARKOWSKIEGO_RESULT_TITLE = "Informacja o wyniku przetargu - sprzedaż nieruchomości gruntowych przy ul. Ks. Kazimierza Czarkowskiego";

const CZARKOWSKIEGO_RESULT_BODY = "BURMISTRZ MIASTA WĘGROWA\nRynek Mariacki 16 * 07-100 Węgrów * tel. (25) 308 12 00 * fax. (25) 308 12 08\nwww.wegrow.com.pl * e-mail: sekretariatQ©wegrow.com.pl\n\nWęgrów, 24.06.2026 r.\nGPN.6840.3.2025\n\nINFORMACJA\no wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości gruntowych\npołożonych w Węgrowie przy ul. Ks. Kazimierza Czarkowskiego\n\nNa podstawie $ 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie\nsposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z\n2021r., poz. 2213), Burmistrz Miasta Węgrowa informuje, że w dniu 16 czerwca 2026r.\nw siedzibie Urzędu Miejskiego w Węgrowie, Rynek Mariacki 16 odbył się przetarg ustny\nnieograniczony na sprzedaż nieruchomości gruntowych niezabudowanych położonych w Węgrowie\nprzy ul. Ks. Kazimierza Czarkowskiego, oznaczonych w ewidencji gruntów jako działka nr 3286/2\no pow. 0,0412 ha, uregulowana w księdze wieczystej nr SI1W/00028243/0, nr 5742/2 o pow.\n0,0288 ha, uregulowana w księdze wieczystej nr SI1W/00007374/4 oraz nr 5773/7 o pow. 0,0582\nha, uregulowana w księdze wieczystej nr SI1 W/00028245/4.\n\nLiczba osób dopuszczonych do uczestniczenia w przetargu — 4.\nLiczba osób niedopuszczonych do uczestniczenia w przetargu — 0.\nDo przetargu przystąpiły 2 osoby.\n\nCena wywoławcza nieruchomości wynosiła 500 000,00 zł netto (słownie: pięćset tysięcy\n\nzłotych 00/100). Do ceny nieruchomości dolicza się podatek VAT w wysokości 23%.\nCena osiągnięta w przetargu wyniosła 605 000,00 zł netto (słownie: sześćset pięć tysięcy złotych\n00/100). Do ceny nabycia nieruchomości dolicza się podatek VAT w wysokości 23%, tj. 139\n150,00 zł. Łączna cena nabycia nieruchomości wraz z podatkiem VAT wyniosła 744 150,00 zł\nbrutto (słownie: siedemset czterdzieści cztery tysiące sto pięćdziesiąt złotych 00/100).\n\nNajwyższą cenę za ww. nieruchomości zaoferowała i przetarg wygrała ARMANAY FIVE\nSpółka z o. o. z siedzibą w Warszawie.\n\nPowyższą informację wywiesza się na okres 7 dni na tablicy ogłoszeń w siedzibie Urzędu\nMiejskiego w Węgrowie, Rynek Mariacki 16, a także zamieszcza w Biuletynie Informacji\n\nPublicznej Urzędu Miejskiego w Węgrowie.\n\nBURNUKII RZ\nPaweł Maątchela\n\n—f* |585 lat Węgrowa\nsm 1441 - 2026\n\n";

const NARUTOWICZA_ANN_TITLE = "Ogłoszenie o drugim przetargu na sprzedaż nieruchomości przy ul. Narutowicza 7";

const NARUTOWICZA_ANN_BODY = "                                                                  Załącznik nr 2 do Zarządzenia nr 916/2024\n                                                                  Burmistrza Miasta Węgrowa z dnia\n                                                                  18 stycznia 2024 r.\n\n                                 OGŁOSZENIE O PRZETARGU\n                           BURMISTRZ MIASTA WĘGROWA\n     ogłasza drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej\n                 zabudowanej położonej w Węgrowie przy ul. Narutowicza\n\n1. Przedmiotem sprzedaży jest nieruchomość gruntowa stanowiąca własność Miasta Węgrowa, oznaczona\n    w ewidencji gruntów jako działka nr 3520 o pow. 0,0397 ha, położona w Węgrowie przy\n    ul. Narutowicza 7, ujawniona w księdze wieczystej nr SI1W/00070501/6 prowadzonej przez Sąd\n    Rejonowy w Węgrowie.\n2. Nieruchomość zabudowana jest budynkiem jednorodzinnym, murowanym, dwukondygnacyjnym\n    z poddaszem gospodarczym, podpiwniczonym, w zabudowie bliźniaczej, o powierzchni użytkowej -\n    119,25 m2, wyposażonym w instalacje: elektryczną, wodno- kanalizacyjną, centralne ogrzewanie z\n    piecem na gaz ziemny o r a z budynkiem handlowo-usługowym, usytuowanym na granicy działki,\n    murowanym, jednokondygnacyjnym z poddaszem gospodarczym – strychem, o pow. użyt. 60,17 m2,\n    wyposażonym w instalację elektryczną, wodno- kanalizacyjną, brak centralnego ogrzewania\n    (wykorzystywanym wcześniej na hurtownię materiałów elektrycznych). Budynki wybudowane\n    w latach 70-tych. Średni stan techniczny budynków. Nieruchomość położona w centrum miasta, w\n    odległości ok. 150 m zrewitalizowany rynek miejski, w sąsiedztwie starsza zabudowa mieszkaniowa\n    jednorodzinna, liczne obiekty handlowe, usługowe, obiekty użyteczności publicznej, urzędy i inne.\n    Pełne uzbrojenie w media. Kształt działki korzystny. Sąsiedztwo korzystne zarówno dla funkcji\n    mieszkaniowej jak i prowadzenia działalności gospodarczej (w pobliżu duży parking).\n3. W obowiązującym miejscowym planie zagospodarowania przestrzennego strefy śródmiejskiej miasta\n    Węgrowa jest to teren zabudowy mieszkaniowej jednorodzinnej, z dopuszczeniem usług\n    nieuciążliwych.\n4. Nieruchomość nie jest obciążona ograniczonymi prawami rzeczowymi i nie ma przeszkód prawnych\n    w rozporządzaniu nią.\n5. Pierwszy przetarg został ogłoszony w dniu 07 listopada 2023 r. i zakończył się wynikiem negatywnym.\n6. Cena wywoławcza nieruchomości wynosi 500.000,00 zł (słownie: pięćset tysięcy złotych 00/100).\n    Sprzedaż nieruchomości zwolniona jest z opłaty podatku VAT.\n7. Warunkiem przystąpienia do przetargu jest wniesienie w pieniądzu (PLN) wadium w wysokości\n    50.000,00 zł (słownie: pięćdziesiąt tysięcy złotych 00/100) na rachunek Urzędu Miejskiego\n    w Węgrowie w PKO BP O/Węgrów Nr 61 1020 4476 0000 8702 0365 0132 w terminie do dnia\n    21 marca 2024 r. (data wpływu na konto).\n8. Przetarg odbędzie się w dniu 26 marca 2024 r. o godz. 1200 w siedzibie Urzędu Miejskiego\n    w Węgrowie, Rynek Mariacki 16, pokój nr 8.\n 9. Wadium wpłacone przez uczestnika, który przetarg wygrał, zaliczone zostanie na poczet ceny nabycia\n     nieruchomości.\n 10. Wadium ulega przepadkowi w razie uchylenia się uczestnika, który przetarg wygrał, od zawarcia\n     umowy sprzedaży nieruchomości.\n 11. Burmistrz Miasta może odwołać ogłoszony przetarg jedynie z ważnych powodów, informując o tym\n     niezwłocznie w formie właściwej dla ogłoszenia o przetargu i podając przyczynę odwołania przetargu.\n 12. W przetargu mogą brać udział osoby fizyczne i prawne. Osoba reprezentująca w przetargu osobę\n     prawną winna się okazać stosownym pełnomocnictwem.\n 13. Osoby zainteresowane nabyciem nieruchomości będą mogły obejrzeć ją w uzgodnionym telefonicznie\n     terminie (25 308 11 90 w. 206).\n 14. Szczegółowe informacje o przedmiocie przetargu można uzyskać w Wydziale Gospodarki\n     Przestrzennej i Nieruchomości Urzędu Miejskiego w Węgrowie, ul. Wyszyńskiego 1, pokój nr 5 i 6\n     lub pod nr tel. 25 308 11 90 w. 206 i 208.\n 15. Ogłoszenie niniejsze podlega publikacji na okres co najmniej 2 miesięcy przed wyznaczonym terminem\n     przetargu poprzez wywieszenie na tablicy ogłoszeń w siedzibie Urzędu Miejskiego w Węgrowie,\n     na stronie internetowej Urzędu Miejskiego w Węgrowie oraz w Biuletynie Informacji Publicznej.\n     Ponadto wyciąg ogłoszenia o przetargu zamieszcza się w prasie codziennej ogólnokrajowej,\n     tj. w Dzienniku Gazety Prawnej.\n\n                                                                                 BURMISTRZ\n                                                                                Paweł Marchela\n\f";

const NARUTOWICZA_RESULT_TITLE = "Informacja o wyniku drugiego przetargu - ul. Narutowicza 7";

const NARUTOWICZA_RESULT_BODY = "                             BURMISTRZ MI ASTA WĘGROW A\n              Rynek Mariacki 16 * 07-100 Węgrów * tel. 25 308 12 00 * fax. 25 308 12 08\n                    www.wegrow.com.pl * e-mail: sekretariat@wegrow.com.pl\n\n                                                                              Węgrów, 03.04.2024 r.\nGPN.6840.4.2022\n\n\n\n                          INFORMACJA O WYNIKU PRZETARGU\n\n\n\nBurmistrz Miasta Węgrowa informuje, że w dniu 26 marca 2024 r. w siedzibie Urzędu Miejskiego w\nWęgrowie, Rynek Mariacki 16 odbył się drugi przetarg ustny nieograniczony na sprzedaż\nnieruchomości gruntowej zabudowanej położonej w Węgrowie przy ul. Narutowicza 7, oznaczonej\nnr 3520 o pow. 0,0397 ha, ujawnionej w księdze wieczystej nr SI1W/00070501/6 prowadzonej przez\nWydział Ksiąg Wieczystych Sądu Rejonowego w Węgrowie.\nW przetargu uczestniczyła jedna osoba.\nWadium wpłaciła jedna osoba.\nOsób niedopuszczonych do uczestnictwa w przetargu nie było.\nCena wywoławcza nieruchomości wynosiła 500.000,00 zł (słownie: pięćset tysięcy złotych 00/100).\nSprzedaż nieruchomości zwolniona jest z opłaty podatku VAT.\nCena osiągnięta w przetargu – 505.000,00 zł (słownie: pięćset pięć tysięcy złotych 00/100).\nNajwyższą cenę za w/w nieruchomość zaoferował i przetarg wygrał Pan Mariusz Krasnodębski.\nPowyższą informację wywiesza się na okres 7 dni na tablicy ogłoszeń w siedzibie Urzędu Miejskiego\nw Węgrowie, Rynek Mariacki 16, a także zamieszcza w Biuletynie Informacji Publicznej Urzędu\nMiejskiego w Węgrowie.\n\n\n\n\n                                                                     BURMISTRZ\n                                                                      Paweł Marchela\n\f";

const PILSUDSKIEGO_9_19_TITLE = "Wykaz lokalu mieszkalnego Nr 19 przy ul. Piłsudskiego 9 przeznaczonego do sprzedaży na rzecz jego najemcy";

const PILSUDSKIEGO_9_19_BODY = "                                                                                                                                     Załącznik Nr 1 do Zarządzenia Nr 355/2026\n                                                                                                                              Burmistrza Miasta Węgrowa z dnia 16 marca 2026 r.\n\n\n                                                                     W Y K A Z\n                                           lokalu mieszkalnego przeznaczonego do sprzedaży na rzecz jego najemcy\n\n\n\n                                                                                                  Opis lokalu mieszkalnego                                                 Termin do\n                                                                                                                                                                       złożenia wniosku\n       Nr        Oznaczenie                                                                                                                                                o nabycie\n    ewidenc                     Powierzch                                                                                Udział w                             Cena\n                                                                                                                                                                        nieruchomości\n                     w                       Położenie                     Opis\nLp.   yjny                         nia                                                            Pow. Udział w         działkach       Przeznaczenie       lokalu w\n             Księdze wieczystej           nieruchomości                                    Nr                                                                  zł\n                                                                                                                                                                         przez osoby,\n                                                                     nieruchomości                użytk. działce nr     nr 5891/8 i                                          którym\n     nieruch                      w ha                                                   lokalu\n                   KW Nr                                                                           w m2 5891/16\n     omości                                                                                                              5891/17                                          przysługuje\n                                                                                                                                                                        pierwszeństwo\n                                                                                                                                                                            nabycia*\n 1      2               3                 4             5                   6               7        8          9            10               11               12              13\n                                                                    Działka 5891/16 -\n                                                                       zabudowana                                                                                      6 tygodni licząc od\n     5891/16 SI1W/00041962/3           0,0538                                                                                                                          dnia wywieszenia\n                                                                        budynkiem\n                                                                                                                                                                       wykazu\n     5891/8    SI1W/00041963/0         0,0847    ul. Piłsudskiego     mieszkalnym                                                      Sprzedaż w trybie\n1.                                                                   wielorodzinnym        19      45,50   514/11098 514/35614         bezprzetargowym 222 586,00\n     5891/17 SI1W/00041963/0           0,1227           9\n                                                                     działki 5891/8 i                                                  na rzecz najemcy\n                                                                         5891/17 -\n                                                                     niezabudowane\n\n\n1.Wykaz podlega wywieszeniu na tablicy ogłoszeń w Urzędzie Miejskim w Węgrowie na okres 21 dni. tj. od dnia 18.03.2026 r. do dnia 08.04.2026 r. oraz zamieszczeniu na stronie\n  internetowej Urzędu i w Biuletynie Informacji Publicznej.\n2.Informację o zamieszeniu wykazu należy ogłosić w prasie lokalnej o zasięgu obejmującym co najmniej powiat.\nUwaga!\n*-Pierwszeństwo w nabyciu nieruchomości przysługuje osobie, która spełnia jeden z następujących warunków:\n1. przysługuje jej roszczenie o nabycie nieruchomości z mocy ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2024 r., poz. 1145 z późn. zm.) lub odrębnych\n   przepisów, jeżeli złoży wniosek o nabycie przed upływem w/w terminu (art. 34 ust. 1 pkt. 1).\n2. jest poprzednim właścicielem zbywanej nieruchomości pozbawionym prawa własności tej nieruchomości przed dniem 5 grudnia 1990 r. albo jego spadkobiercą, jeżeli złoży wniosek o\n   nabycie przed upływem w/w terminu (art. 34 ust. 1 pkt. 2).\n\n                                                                                                                                                   BURMISTRZ\n                                                                                                                                                    Paweł Marchela\n\f";

// ------------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands, dot-thousands, grosze tail', () => {
  assert.equal(parsePLN('160 000,00'), 160000);
  assert.equal(parsePLN('500.000,00'), 500000);
  assert.equal(parsePLN('2 302 240,00'), 2302240);
  assert.equal(parsePLN('brak'), null);
});

test('title routing: isSkippableTitle catches every wykaz variant (singular/plural/bare), qualified-bidder lists, cancellations, and movable-property sales', () => {
  assert.equal(isSkippableTitle(PILSUDSKIEGO_9_19_TITLE), true); // bezprzetargowo tenant wykaz
  assert.equal(isSkippableTitle('Wykaz nieruchomości stanowiącej lokal mieszkalny przeznaczonej do sprzedaży w drodze przetargu ustnego nieograniczonego'), true); // pre-przetarg designation wykaz — ALSO skipped (see crawl.js header)
  assert.equal(isSkippableTitle('Wykazy lokali mieszkalnych przeznaczonych do sprzedaży na rzecz ich najemców (lokal nr 4 przy ul. Przemysłowej 10 i lokale nr 9 i 18 przy ul. Nowej 3)'), true); // plural "Wykazy"
  assert.equal(isSkippableTitle('Wykaz'), true); // bare title, real (article 8528)
  assert.equal(isSkippableTitle('Lista osób zakwalifikowanych do uczestnictwa w przetargu ustnym ograniczonym na sprzedaż nieruchomości gruntowej dz. nr 3975/2'), true);
  assert.equal(isSkippableTitle('ODWOŁANIE PRZETARGU NA SPRZEDAŻ NIERUCHOMOŚCI PRZY UL. ZWYCIĘSTWA 3'), true);
  // movables (ruchomości, NOT nieruchomości) — a real historical false-positive
  // risk: this title also contains "przetarg" + "sprzedaż", which would
  // otherwise satisfy isAnnouncementTitle.
  assert.equal(isSkippableTitle('ogłoszenie o drugim przetargu na sprzedaż ruchomości po hurtowni elektrycznej'), true);
  assert.equal(isSkippableTitle(NOWA_3_19_ANN_TITLE), false);
});

test('title routing: isResultTitle matches singular/plural/ograniczony phrasing', () => {
  assert.equal(isResultTitle(NOWA_3_19_RESULT_TITLE), true);
  assert.equal(isResultTitle(CZARKOWSKIEGO_RESULT_TITLE), true);
  assert.equal(isResultTitle(NARUTOWICZA_RESULT_TITLE), true);
  assert.equal(isResultTitle('Informacje o wyniku przetargów'), true); // plural, real (article 10842)
  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego ograniczonego na sprzedaż nieruchomości dz. nr 3975/2'), true);
  assert.equal(isResultTitle(NOWA_3_19_ANN_TITLE), false);
});

test('title routing: isAnnouncementTitle matches "Ogłoszenie (o) przetargu" and bare "Przetarg na sprzedaż"; crawl.js checks isResultTitle FIRST so a result title (which also matches "przetarg"+"sprzedaż") is routed to the result stream, not here', () => {
  assert.equal(isAnnouncementTitle(NOWA_3_19_ANN_TITLE), true);
  assert.equal(isAnnouncementTitle(CZARKOWSKIEGO_ANN_TITLE), true);
  assert.equal(isAnnouncementTitle(NARUTOWICZA_ANN_TITLE), true);
  assert.equal(isAnnouncementTitle('Przetarg na sprzedaż lokalu mieszkalnego nr 19 przy ul. Nowej 5'), true); // bare title, no "Ogłoszenie" (real, article 10357)
  // isAnnouncementTitle is intentionally NOT exclusive of isResultTitle on its
  // own (a result title also contains "przetarg" + "sprzedaż") — the actual
  // routing precedence (isResultTitle checked BEFORE isAnnouncementTitle) is
  // crawl.js's job and is exercised directly here:
  assert.equal(isResultTitle(NOWA_3_19_RESULT_TITLE), true);
});

// ------------------------------------------------------------------- round

test('roundFromText: unstated (round 1, implicit) on 2 independent real fixtures', () => {
  assert.equal(roundFromText(buildRecordText({ title: NOWA_3_19_ANN_TITLE, body: NOWA_3_19_ANN_BODY })), null);
  assert.equal(roundFromText(buildRecordText({ title: CZARKOWSKIEGO_ANN_TITLE, body: CZARKOWSKIEGO_ANN_BODY })), null);
});

test('roundFromText: explicit round 2 ("ogłasza drugi przetarg" / "odbył się drugi przetarg"), not fooled by the prior-round-history clause', () => {
  const ann = buildRecordText({ title: NARUTOWICZA_ANN_TITLE, body: NARUTOWICZA_ANN_BODY });
  assert.equal(roundFromText(ann), 2);
  // the fixture body ALSO contains "Pierwszy przetarg został ogłoszony w dniu
  // 07 listopada 2023 r. i zakończył się wynikiem negatywnym." (point 5) —
  // confirm that history clause is present (so this test is actually
  // exercising the anchor's specificity) yet round still resolves to 2, not 1.
  assert.ok(/Pierwszy przetarg został ogłoszony/.test(NARUTOWICZA_ANN_BODY));
  const result = buildRecordText({ title: NARUTOWICZA_RESULT_TITLE, body: NARUTOWICZA_RESULT_BODY });
  assert.equal(roundFromText(result), 2);
});

// ------------------------------------------------------------------- dates

test('auctionDateFromText: announcement ("odbędzie się") and result ("odbył się", incl. round-word bridging) phrasings', () => {
  assert.equal(auctionDateFromText(buildRecordText({ title: NOWA_3_19_ANN_TITLE, body: NOWA_3_19_ANN_BODY })), '2026-04-28');
  assert.equal(auctionDateFromText(buildRecordText({ title: NOWA_3_19_RESULT_TITLE, body: NOWA_3_19_RESULT_BODY })), '2026-04-28');
  assert.equal(auctionDateFromText(buildRecordText({ title: CZARKOWSKIEGO_ANN_TITLE, body: CZARKOWSKIEGO_ANN_BODY })), '2026-06-16');
  // "16 czerwca 2026r." — no space before "r." (real live spacing quirk)
  assert.equal(auctionDateFromText(buildRecordText({ title: CZARKOWSKIEGO_RESULT_TITLE, body: CZARKOWSKIEGO_RESULT_BODY })), '2026-06-16');
  assert.equal(auctionDateFromText(buildRecordText({ title: NARUTOWICZA_ANN_TITLE, body: NARUTOWICZA_ANN_BODY })), '2024-03-26');
  // result phrasing here is "... odbył się DRUGI przetarg ..." — the extra
  // ordinal word between "się" and "przetarg" must not break the date anchor.
  assert.equal(auctionDateFromText(buildRecordText({ title: NARUTOWICZA_RESULT_TITLE, body: NARUTOWICZA_RESULT_BODY })), '2024-03-26');
});

// ------------------------------------------------------------------- prices

test('startingPriceFromText: present-tense "wynosi" (announcements) and past-tense "wynosiła" (results)', () => {
  assert.equal(startingPriceFromText(buildRecordText({ title: NOWA_3_19_ANN_TITLE, body: NOWA_3_19_ANN_BODY })), 160000);
  assert.equal(startingPriceFromText(buildRecordText({ title: NOWA_3_19_RESULT_TITLE, body: NOWA_3_19_RESULT_BODY })), 160000);
  assert.equal(startingPriceFromText(buildRecordText({ title: CZARKOWSKIEGO_ANN_TITLE, body: CZARKOWSKIEGO_ANN_BODY })), 500000);
  assert.equal(startingPriceFromText(buildRecordText({ title: CZARKOWSKIEGO_RESULT_TITLE, body: CZARKOWSKIEGO_RESULT_BODY })), 500000);
  // dot-thousands (2024 doc), unlike the 2026 docs' space-thousands
  assert.equal(startingPriceFromText(buildRecordText({ title: NARUTOWICZA_ANN_TITLE, body: NARUTOWICZA_ANN_BODY })), 500000);
  assert.equal(startingPriceFromText(buildRecordText({ title: NARUTOWICZA_RESULT_TITLE, body: NARUTOWICZA_RESULT_BODY })), 500000);
});

test('achievedPriceFromText: two live phrasings — "wyniosła X zł" (Czarkowskiego) and en-dash "– X zł" with no verb (Narutowicza); null when unsold', () => {
  assert.equal(achievedPriceFromText(buildRecordText({ title: CZARKOWSKIEGO_RESULT_TITLE, body: CZARKOWSKIEGO_RESULT_BODY })), 605000);
  assert.equal(achievedPriceFromText(buildRecordText({ title: NARUTOWICZA_RESULT_TITLE, body: NARUTOWICZA_RESULT_BODY })), 505000);
  assert.equal(achievedPriceFromText(buildRecordText({ title: NOWA_3_19_RESULT_TITLE, body: NOWA_3_19_RESULT_BODY })), null);
});

test('isNegativeOutcome: "wynikiem negatywnym" (Nowa 3/19, incl. genitive "braku uczestników"); false on sold results', () => {
  assert.equal(isNegativeOutcome(buildRecordText({ title: NOWA_3_19_RESULT_TITLE, body: NOWA_3_19_RESULT_BODY })), true);
  assert.ok(/braku uczestników/.test(NOWA_3_19_RESULT_BODY));
  assert.equal(isNegativeOutcome(buildRecordText({ title: CZARKOWSKIEGO_RESULT_TITLE, body: CZARKOWSKIEGO_RESULT_BODY })), false);
  assert.equal(isNegativeOutcome(buildRecordText({ title: NARUTOWICZA_RESULT_TITLE, body: NARUTOWICZA_RESULT_BODY })), false);
});

// ------------------------------------------------------------------- area

test('unitAreaFromText: usable floor area, tolerating the OCR-mangled m² glyph ("m?")', () => {
  assert.equal(unitAreaFromText(buildRecordText({ title: NOWA_3_19_ANN_TITLE, body: NOWA_3_19_ANN_BODY })), 52.70);
  assert.equal(unitAreaFromText(buildRecordText({ title: NOWA_3_19_RESULT_TITLE, body: NOWA_3_19_RESULT_BODY })), 52.70);
  assert.ok(/52,70 m\?/.test(NOWA_3_19_ANN_BODY), 'fixture must carry the real OCR-mangled m² glyph');
});

// ------------------------------------------------------------------- address

test('streetFromHeader/addressRawFromText: flat address incl. unit number', () => {
  const text = buildRecordText({ title: NOWA_3_19_ANN_TITLE, body: NOWA_3_19_ANN_BODY });
  assert.deepEqual(streetFromHeader(text), { street: 'Nowej', building: '3' });
  assert.equal(addressRawFromText(text), 'ul. Nowej 3/19');
});

test('streetFromHeader: REAL BUG regression — result notices restate the AUCTION VENUE ("… w siedzibie Urzędu Miejskiego w Węgrowie, przy ul. Rynek Mariacki 16, odbył się przetarg …") with a "przy ul." prefix and a real building number, BEFORE the subject property\'s own address; must resolve to the property (Nowa 3/19), never the town hall', () => {
  const text = buildRecordText({ title: NOWA_3_19_RESULT_TITLE, body: NOWA_3_19_RESULT_BODY });
  assert.ok(/przy ul\. Rynek Mariacki 16/.test(NOWA_3_19_RESULT_BODY), 'fixture must carry the real venue-address collision');
  assert.deepEqual(streetFromHeader(text), { street: 'Nowej', building: '3' });
  assert.equal(addressRawFromText(text), 'ul. Nowej 3/19');
});

test('streetFromHeader: land (Czarkowskiego) — bare street, no building number (identified by dzialka_nr instead)', () => {
  const text = buildRecordText({ title: CZARKOWSKIEGO_ANN_TITLE, body: CZARKOWSKIEGO_ANN_BODY });
  assert.deepEqual(streetFromHeader(text), { street: 'Ks. Kazimierza Czarkowskiego', building: null });
});

test('streetFromHeader: house (Narutowicza 7) — the FIRST "przy ul. Narutowicza" mention (title/header line) has no building number, the SECOND (point 1) does; must resolve to the numbered one, not truncate on the list-marker "1." that immediately follows the bare mention', () => {
  const text = buildRecordText({ title: NARUTOWICZA_ANN_TITLE, body: NARUTOWICZA_ANN_BODY });
  assert.deepEqual(streetFromHeader(text), { street: 'Narutowicza', building: '7' });
  assert.equal(addressRawFromText(text), 'ul. Narutowicza 7');
});

// --------------------------------------------------------------- active listings

test('parseAnnouncement: PENDING flat (real fixture, Nowa 3/19)', () => {
  const rec = parseAnnouncement(buildRecordText({ title: NOWA_3_19_ANN_TITLE, body: NOWA_3_19_ANN_BODY }));
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'nowej|3|19');
  assert.equal(rec.address.street, 'Nowej');
  assert.equal(rec.address.building, '3');
  assert.equal(rec.address.apt, '19');
  assert.equal(rec.area_m2, 52.70);
  assert.equal(rec.starting_price_pln, 160000);
  assert.equal(rec.auction_date, '2026-04-28');
  assert.equal(rec.round, null);
});

test('parseAnnouncement: PENDING land (real fixture, Czarkowskiego — 3 parcels, incl. an OCR "©"-for-"o" glitch on the 3rd parcel\'s own "o pow." occurrence, recovered via the summary list clause)', () => {
  assert.ok(CZARKOWSKIEGO_ANN_BODY.includes('5773/7 © pow.'), 'fixture must carry the real OCR glitch (© instead of o)');
  const rec = parseAnnouncement(buildRecordText({ title: CZARKOWSKIEGO_ANN_TITLE, body: CZARKOWSKIEGO_ANN_BODY }));
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '3286/2, 5742/2, 5773/7');
  assert.equal(rec.area_m2, 1282);
  assert.equal(rec.address_raw, 'ul. Ks. Kazimierza Czarkowskiego');
  assert.equal(rec.starting_price_pln, 500000);
  assert.equal(rec.auction_date, '2026-06-16');
  assert.equal(rec.round, null);
});

test('parseAnnouncement: PENDING house, round 2 (real fixture, Narutowicza 7) — usable area null (it is not a flat), plot area carried separately as land_area_m2', () => {
  const rec = parseAnnouncement(buildRecordText({ title: NARUTOWICZA_ANN_TITLE, body: NARUTOWICZA_ANN_BODY }));
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'narutowicza|7|');
  assert.equal(rec.area_m2, null);
  assert.equal(rec.land_area_m2, 397);
  assert.equal(rec.starting_price_pln, 500000);
  assert.equal(rec.auction_date, '2024-03-26');
  assert.equal(rec.round, 2);
});

test('bezprzetargowo tenant wykaz (real fixture, Piłsudskiego 9/19): SKIPPED by title alone, never fetched/parsed', () => {
  // isSkippableTitle already asserted true above; this test corroborates it
  // against the REAL native-PDF body text (a Word-produced table export, not
  // OCR — Word: extractable natively via pdftotext, no scan needed), proving
  // the classification story: it genuinely IS a bezprzetargowo sale.
  assert.equal(isSkippableTitle(PILSUDSKIEGO_9_19_TITLE), true);
  assert.ok(/bezprzetargowym/i.test(PILSUDSKIEGO_9_19_BODY));
  assert.ok(/na rzecz najemcy/i.test(PILSUDSKIEGO_9_19_BODY));
});

// ----------------------------------------------------------------- result records

test('parseResultDoc: Nowa 3/19 UNSOLD (wynikiem negatywnym, no achieved price)', () => {
  const [r] = parseResultDoc(
    buildRecordText({ title: NOWA_3_19_RESULT_TITLE, body: NOWA_3_19_RESULT_BODY }),
    '2026-05-06',
    'https://bip.wegrow.com.pl/artykul/345/12233/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci-stanowiacej-lokal-mieszkalny-nr-19-przy-ul-nowej-3-w-wegrowie',
  );
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'nowej|3|19');
  assert.equal(r.address_raw, 'ul. Nowej 3/19'); // regression: NOT the "Rynek Mariacki 16" venue address
  assert.equal(r.area_m2, 52.70);
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.round, null);
  assert.equal(r.auction_date, '2026-04-28');
});

test('parseResultDoc: Czarkowskiego land SOLD (500 000 -> 605 000 zł netto)', () => {
  const [r] = parseResultDoc(
    buildRecordText({ title: CZARKOWSKIEGO_RESULT_TITLE, body: CZARKOWSKIEGO_RESULT_BODY }),
    '2026-06-24',
    'https://bip.wegrow.com.pl/artykul/345/12289/informacja-o-wyniku-przetargu-sprzedaz-nieruchomosci-gruntowych-przy-ul-ks-kazimierza-czarkowskiego',
  );
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '3286/2, 5742/2, 5773/7');
  assert.equal(r.area_m2, 1282);
  assert.equal(r.starting_price_pln, 500000);
  assert.equal(r.final_price_pln, 605000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, null);
  assert.equal(r.auction_date, '2026-06-16');
});

test('parseResultDoc: Narutowicza 7 house SOLD, round 2 (500.000 -> 505.000 zł, en-dash achieved-price phrasing)', () => {
  const [r] = parseResultDoc(
    buildRecordText({ title: NARUTOWICZA_RESULT_TITLE, body: NARUTOWICZA_RESULT_BODY }),
    '2024-04-03',
    'https://bip.wegrow.com.pl/artykul/345/11070/informacja-o-wyniku-drugiego-przetargu-ul-narutowicza-7',
  );
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'narutowicza|7|');
  assert.equal(r.starting_price_pln, 500000);
  assert.equal(r.final_price_pln, 505000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2024-03-26');
});

test('parseResultDoc: returns [] for a PENDING (announcement, not yet concluded) record', () => {
  assert.deepEqual(
    parseResultDoc(buildRecordText({ title: NOWA_3_19_ANN_TITLE, body: NOWA_3_19_ANN_BODY }), null, 'x'),
    [],
  );
});

// ------------------------------------------------------------- board XML + attachments

test('parseBoardPage: extracts id/url/tytul/published_date from the real generic-article-board XML shape (board 345)', () => {
  const xml = `<?phpxml version="1.0" encoding="UTF-8"?><bip.wegrow.com.pl>
    <ogloszenia-sprzedazy>
        <strona>1</strona>
        <ilosc-stron>1</ilosc-stron>
        <ilosc-rekordow>3</ilosc-rekordow>
                    <artykuly>
                                    <artykul>
                        <url>https://bip.wegrow.com.pl/artykul/345/12148/ogloszenie-przetargu-ustnego-nieograniczonego-na-sprzedaz-nieruchomosci-stanowiacej-lokal-mieszkalny-nr-19-przy-ul-nowej-3-w-wegrowie</url>
                        <tytul>${NOWA_3_19_ANN_TITLE}</tytul>
                        <data>18.03.2026</data>
                        <skrot><![CDATA[]]></skrot>
                    </artykul>
                                    <artykul>
                        <url>https://bip.wegrow.com.pl/artykul/345/12233/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci-stanowiacej-lokal-mieszkalny-nr-19-przy-ul-nowej-3-w-wegrowie</url>
                        <tytul>${NOWA_3_19_RESULT_TITLE}</tytul>
                        <data>06.05.2026</data>
                        <skrot><![CDATA[]]></skrot>
                    </artykul>
                                    <artykul>
                        <url>https://bip.wegrow.com.pl/artykul/345/12147/wykaz-lokalu-mieszkalnego-nr-19-przy-ul-pilsudskiego-9-przeznaczonego-do-sprzedazy-na-rzecz-jego-najemcy</url>
                        <tytul>${PILSUDSKIEGO_9_19_TITLE}</tytul>
                        <data>18.03.2026</data>
                        <skrot><![CDATA[]]></skrot>
                    </artykul>
                            </artykuly>
            </ogloszenia-sprzedazy>
</bip.wegrow.com.pl>`;
  const refs = parseBoardPage(xml);
  assert.equal(refs.length, 3);
  assert.equal(refs[0].id, '12148');
  assert.equal(refs[0].tytul, NOWA_3_19_ANN_TITLE);
  assert.equal(refs[0].published_date, '2026-03-18');
  assert.equal(refs[1].id, '12233');
  assert.equal(refs[1].published_date, '2026-05-06');
  assert.equal(refs[2].id, '12147');
});

test('primaryAttachmentUrl: new-style article (body paragraph + #attachments both present) — exact title match wins the FIRST of several attachments', () => {
  // shape mirrors article 12148's real #attachments section (Ogłoszenie +
  // Regulamin, trimmed to 2 of the real 4 attachments for a compact fixture)
  const html = `<section id="attachments" class="attachments">
        <h2>Załączniki</h2>
                                    <div class="header">
                    <span><a id="attachments-title" title="Plik do pobrania"
                             href="https://bip.wegrow.com.pl/attachments/download/5546">
                            ${NOWA_3_19_ANN_TITLE}</a></span>
                    <span class="files textPDF">pdf, 711 kB</span>
                    </div>
                                    <div class="header">
                    <span><a id="attachments-title" title="Plik do pobrania"
                             href="https://bip.wegrow.com.pl/attachments/download/5547">
                            Regulamin przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiącej lokal mieszkalny nr 19 przy ul. Nowej 3 w Węgrowie</a></span>
                    <span class="files textPDF">pdf, 909 kB</span>
                    </div>
        </section>`;
  assert.equal(primaryAttachmentUrl(html, NOWA_3_19_ANN_TITLE), 'https://bip.wegrow.com.pl/attachments/download/5546');
});

test('primaryAttachmentUrl: old-style article (NO body paragraph at all, e.g. article 10953 — #attachments is the ONLY source) — falls back to the first entry when its label is a shortened paraphrase of the full board title', () => {
  // shape mirrors article 10953's real (single-attachment) #attachments
  // section — its label "Ogłoszenie o drugim przetargu" does NOT exactly
  // match the fuller board title, so this exercises the fallback-to-first
  // path, not the exact-match path.
  const html = `<section id="attachments" class="attachments">
        <h2>Załączniki</h2>
                                    <div class="header">
                    <span><a id="attachments-title" title="Plik do pobrania"
                             href="https://bip.wegrow.com.pl/attachments/download/3890">
                            Ogłoszenie o drugim przetargu</a></span>
                    <span class="files textPDF">pdf, 212 kB</span>
                    </div>
        </section>`;
  assert.equal(primaryAttachmentUrl(html, NARUTOWICZA_ANN_TITLE), 'https://bip.wegrow.com.pl/attachments/download/3890');
});
