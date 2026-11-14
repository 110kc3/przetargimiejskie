
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  areaFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isNegativeOutcome,
  isResultNotice,
  roundFromText,
  dateOnly,
  isInScopeRow,
  extractFlatAddress,
  parcelFromText,
  landPlaceFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/strzelce-krajenskie/parse.js';
import { boardUrl, parseBoardPage } from '../src/cities/strzelce-krajenskie/crawl.js';


const GILOW_PDF_TEXT = "                           O G Ł O S Z E N I E Nr GPM- 24/2025\n                                Burmistrza Strzelec Krajeńskich\n                                         z 23 maja 2025r.\n      Burmistrz Strzelec Krajeńskich ogłasza I nieograniczony przetarg ustny na sprzedaż\nlokalu mieszkalnego położonego w Gilowie 20/1 o pow. 37,78 m²\nwraz       z     udziałem       140/1000        w      częściach      wspólnych      budynku\ni urządzeniach nie służących tylko do użytku właściciela lokalu oraz w prawie własności działki\nnr 25/4 o łącznej powierzchni 801m².\n\nDla nieruchomości gruntowej urządzona jest księga wieczysta KW nr GW1K/00015872/9\nprowadzona przez Sąd Rejonowy w Strzelcach Krajeńskich.\n\nNieruchomość położona jest w miejscowości Gilów, ok. 15 km od Strzelec Krajeńskich\n\nLokal mieszkalny położony na parterze budynku wielorodzinnego w części niepodpiwniczonej.\nPosiada niezależne wejście przez wiatrołap usytuowany w szczycie budynku.\nSkłada się z niżej wymienionych pomieszczeń o powierzchniach:\n1/ pokój          - 23,13 m²\n2/ kuchnia        - 7,94 m²\n3/ łazienka z wc - 1,63 m²\n4/ przedpokój - 1,80 m²\n5/ wiatrołap      - 3,28 m²\nRAZEM POWIERZCHNIA = 37,78 m²\n\nUkład funkcjonalno-przestrzenny mniej korzystny – wejście przez kuchnię.\nLokal wymaga gruntownego remontu. Sufity i ściany zawilgocone, miejscami okopcone.\nStolarka okienna w stanie średnim, instalacje częściowo zdemontowane. Ogólnie cały lokal\nwymaga kompleksowego remontu. Stan techniczny określa się jako niezadawalający. Ocena\nnie stanowi ekspertyzy.\n\nInstalacje: wodociąg, odprowadzenie ścieków do zbiornika bezodpływowego, energia\nelektryczna, ogrzewanie – indywidualne dla każdego lokalu.\n\nDla wycenianego terenu brak obowiązującego planu zagospodarowania przestrzennego.\nW studium uwarunkowań i kierunków zagospodarowania przestrzennego nieruchomość leży\nna obszarze oznaczonym symbolem MU – teren zabudowy mieszkaniowej.\n\nNieruchomość można oglądać po wcześniejszym uzgodnieniu z urzędem.\n\n\n\nCena wywoławcza - 54.000,00zł (słownie złotych: pięćdziesiąt cztery tysiące 00/100)\nWadium         -     5.400,00zł (słownie złotych: pięć tysięcy czterysta 00/100)\n\nWarunki przyłączenia się do mediów określą poszczególni właściciele sieci na wniosek\nnabywcy nieruchomości.\n\fW przypadku określenia zapewnienia dostawy energii elektrycznej oraz określenia warunków\nprzyłączenia należy wystąpić z pisemnym wnioskiem do Biura Obsługi Klienta ul. Walczaka 31\nw Gorzowie Wlkp. – druki dostępne na stronie internetowej www.operator.enea.pl oraz w\nBOK.\n\nNieruchomość nie jest obciążona ograniczonymi prawami rzeczowymi.\nNabywca przyjmuje nieruchomość w stanie istniejącym.\nOrganizator nie odpowiada za wady ukryte.\nBrak zobowiązań dla nieruchomości.\n\n\nUWAGA\nMinimalne postąpienie - o które należy podwyższyć cenę wywoławczą przy licytacji ww.\nnieruchomości - zostanie ustalone przez uczestników przetargu bezpośrednio przed\nrozpoczęciem licytacji, jednak w wysokości nie mniejszej niż 1% ceny wywoławczej,\nz zaokrągleniem w górę do pełnych dziesiątek złotych.\n\nPrzetarg odbędzie się w dniu 3 lipca 2025r. o godz. 11°° w sali nr 1 tutejszego Urzędu.\nW przetargu mogą brać udział osoby fizyczne oraz osoby prawne (cudzoziemcy na zasadach\nokreślonych w ustawie o nabywaniu nieruchomości przez cudzoziemców -\n(t.j.Dz.U.2017,poz.2278 ,którzy wpłacą wadium w terminie do 26 czerwca 2025r. na konto\nbankowe nr 49836200050399181920000020 Lubusko-Wielkopolski Bank Spółdzielczy Oddział\nStrzelce Krajeńskie.\nWpłacone wadium winno znajdować się na wyżej wymienionym koncie najpóźniej w dniu\n26 czerwca 2025r.\nWadium winno być wpłacone na osobę biorącą udział w przetargu.\n\nUczestnicy przetargu zobowiązani są przed otwarciem przetargu do przedłożenia komisji\nprzetargowej dowodu wniesienia wadium, dowodu tożsamości oraz w odniesieniu do osób\nprawnych aktualny odpis z KRS - oryginału lub potwierdzonej notarialnie kserokopii,\na w przypadku osób ich reprezentujących - pełnomocnictwo do udziału w przetargu\npotwierdzone notarialnie.\nZgodnie z art.6 ust. l pkt 4 ustawy o opłacie skarbowej (t.j.Dz.U.2023r.,poz.2111 ze zm.) -\nw przypadku przedłożenia pełnomocnictwa, o którym mowa wyżej, należy uiścić opłatę\nskarbową w wysokości 17.00zł (część IV załącznika do tej ustawy). Powyższej opłaty nie uiszcza\nsię w przypadku gdy pełnomocnictwo udzielane jest: małżonkowi, wstępnemu, zstępnemu lub\nrodzeństwu.\n\nMałżonkowie biorą udział w przetargu osobiście. W przypadku brania udziału\nw licytacji przez jednego z małżonków posiadających ustrój wspólności majątkowej\nmałżeńskiej wymagana jest zgoda drugiego współmałżonka - w formie aktu notarialnego -\ndotycząca wyrażenia zgody na udział w przetargu na kupno określonej nieruchomości.\nW przypadku posiadania rozdzielności majątkowej małżeńskiej należy przed przetargiem\ndostarczyć komisji przetargowej stosowny dokument potwierdzony notarialnie.\nWadium wpłacone przez osobę, która wygra przetarg, zostanie zaliczone na poczet nabycia\nnieruchomości, pozostałym natomiast będą zwrócone w ciągu trzech dni od dnia zamknięcia\nprzetargu.\n\fNabywca zostanie powiadomiony w ciągu 21-dni od zamknięcia przetargu o terminie zawarcia\naktu notarialnego (termin ten nie może być krótszy niż 7 dni od dnia doręczenia).\n\nWarunkiem nabycia nieruchomości, obok wygrania przetargu, jest wpłacenie ceny uzyskanej w\nprzetargu na wskazane w protokole z przetargu konto bankowe.\nWpłacona kwota winna znajdować się na wskazanym w protokole koncie najpóźniej do czasu\nzawarcia umowy notarialnej.\n\nWadium ulega przepadkowi w razie uchylenia się osoby, która przetarg wygra, od zawarcia\numowy notarialnej.\n\nOrganizator przetargu zastrzega sobie prawo unieważnienia go w uzasadnionych przypadkach.\nOgłoszenie zostało wywieszone na tablicy ogłoszeń przy Urzędzie Miejskim,\nw gazecie lokalnej „Ziemia Strzelecka\", na stronie internetowej Urzędu www.bip.strzelce.pl\noraz w serwisie prasowym na stronie internetowej www.przetargi-komunikaty.pl\n\nBliższych informacji udzielają pracownicy referatu Gospodarki Przestrzennej i Mienia\nGminnego Urzędu Miejskiego w Strzelcach Krajeńskich (pokój nr 32, II piętro),\nnr tel. 95 76 36 332.\n\n\n\n\n                                           Burmistrz Strzelec Krajeńskich Mateusz FEDER\n\f\f\f\f\f\f\f\f";

const LUDOWA_PDF_TEXT = "                           O G Ł O S Z E N I E Nr GPM - 30/2024\n                                Burmistrza Strzelec Krajeńskich\n                                   z 1 sierpnia 2024 r.\n\n     Burmistrz Strzelec Krajeńskich ogłasza IV nieograniczony przetarg ustny na sprzedaż lokalu\nmieszkalnego nr 4 o powierzchni użytkowej 87,03 m² położonego przy ul. Ludowej 9 w Strzelcach\nKrajeńskich wraz z przynależną piwnicą o powierzchni 16,59 m² oraz udział w wysokości\n1677/21100 w częściach wspólnych budynku oraz w prawie użytkowania wieczystego działki\nnumer 10 o powierzchni 1055 m², na której posadowiony jest budynek.\n\nLokal mieszkalny – położony jest na I piętrze budynku, na parterze znajdują się lokale handlowo-\nusługowe. Budynek posiada bramę przejazdową, umożliwiającą dostęp do budynków w podwórku,\nznajdujących się na tej samej działce (nr 10), które zagospodarowane są pod lokale mieszkalne,\nhandlowo-usługowe i biurowe. Składa się z dwóch pokoi, kuchni, korytarza, łazienki z wc. Układ\nfunkcjonalno-przestrzenny mniej korzystny, pomieszczenia przechodnie, wejście do lokalu przez\nkuchnię. Położenie w budynku dwustronne, pomieszczenia doświetlone. Ściany pomiędzy pokojami i\nłazienką bez wypełnienia i tynku, pozostawiona jedynie konstrukcja drewniana, brak ściany działowej\nłazienki. Lokal aktualnie nie nadaje się do zamieszkania. Zdemontowana posadzka. Do lokalu\nprzynależy pomieszczenie w piwnicy o pow. 16,59 m2 (dostęp przez właz w przejściu na podwórze).\nInstalacje: wodna, kanalizacyjna, elektryczna, ogrzewanie - z informacji uzyskanej od administratora\nbudynku, we wcześniejszych latach używane były piece kaflowe, które zostały zdemontowane, później\ngrzejniki elektryczne, aktualnie również zdemontowane, ciepła woda – bojler elektryczny.\nW październiku 2022 r. została wykonana ekspertyza – ocena stanu elementów konstrukcyjnych\nbudynku. W jej wyniku stwierdzono przeciążenia stropów oraz deformację belek stropowych.\nKonieczne jest odciążenie stropów i wymiana ciężkiego wypełnienia konstrukcji na lekką wełnę\nmineralną. Strop nad przejazdem wymaga wzmocnienia podciągiem stalowym. Elewacja bez\ndocieplenia, nie spełnia aktualnych wymogów.\nLokal nr 4 położony w budynku nr 9 przy ul. Ludowej zlokalizowany jest na działce 10 o powierzchni\n1055 m², która w ewidencji gruntów i budynków sklasyfikowana jest jako tereny mieszkaniowe (B).\nDziałka o kształcie regularnym, na której zlokalizowane są dwa budynki mieszkalne oraz trzy budynki,\nktóre zgodnie w ewidencją gruntów i budynków sklasyfikowane są jako pozostałe budynki\nniemieszkalne.\nNieruchomość zlokalizowana jest w ścisłym centrum, bezpośrednio przy Rynku, dojazd drogą o trwałej\nnawierzchni brukowej.\nSąsiedztwo i otoczenie stanowi skoncentrowana zabudowa miejska handlowo – usługowa,\nmieszkaniowa, obiekty użyteczności publicznej, Sąd Rejonowy.\nNieruchomość wpisana jest w księdze wieczystej GW1K/00005259/3 prowadzonej przez Sąd Rejonowy\nw Strzelcach Krajeńskich, zbywany lokal nie posiada urządzonej księgi wieczystej.\nDla wycenianego terenu brak obowiązującego planu zagospodarowania przestrzennego.\nW studium uwarunkowań i kierunków zagospodarowania przestrzennego działka położona jest na\nterenie oznaczonym symbolem MM – obszary zabudowy miejskiej. Zgodnie z zapisami studium\nnieruchomość znajduje się na obszarze zabytkowego, średniowiecznego układu urbanistyczno-\nkrajobrazowego miasta Strzelce Krajeńskie - w strefie „A” ścisłej ochrony konserwatorskiej.\nDo wglądu operat szacunkowy sporządzony przez uprawnionego rzeczoznawcę majątkowego oraz\nekspertyza – ocena stanu elementów konstrukcyjnych budynku.\n\nZ przedmiotowym lokalem związany jest udział 1677/21100 w prawie użytkowania wieczystego (do\n2093 roku) działki numer 10 o powierzchni 1055 m², wobec czego zgodnie z art. 71 ust 1 ustawy z dnia\n21 sierpnia 1997 roku o gospodarce nieruchomościami (tj. Dz. U. z 2023 poz. 344 ze zm.) nabywca\nbędzie zobowiązany wnieść pierwszą opłatę i opłaty roczne. Pierwsza opłata za oddanie nieruchomości\ngruntowej w użytkowanie wieczyste w drodze przetargu, stanowi 25% wylicytowanego udziału w\ngruncie i podlega zapłacie jednorazowo, nie później niż do dnia zawarcia umowy notarialnej o oddanie\ntej nieruchomości w użytkowanie wieczyste. Opłaty roczne, stanowiące 1% ceny nieruchomości\ngruntowej, wnosi się przez cały okres użytkowania wieczystego, w terminie do dnia 31 marca każdego\nroku, z góry za dany rok.\n\fOpłaty rocznej nie pobiera się za rok, w którym zostało ustanowione prawo użytkowania wieczystego.\nOpłaty te mogą ulegać zmianie w razie zmiany wartości gruntu w okresach nie krótszych niż raz na trzy\nlata.\nWartość lokalu wraz z przynależnościami określona przez rzeczoznawcę majątkowego wynosi\n132.000,00 zł, w tym wartość udziału w gruncie wynosi 24.200,00 zł\nUWAGA\nWartość udziału w prawie użytkowania wieczystego gruntu zostanie obliczona proporcjonalnie do\nwylicytowanej ceny. Do wartości tej zostanie doliczony podatek VAT w stawce 23%.\n\nNieruchomość można oglądać po wcześniejszym uzgodnieniu z urzędem.\n\nCena wywoławcza - 80 000,00zł (słownie złotych: osiemdziesiąt tysięcy)\nWadium          - 8 000,00zł (słownie złotych: osiem tysięcy)\n\n\nWarunki przyłączenia się do mediów określą poszczególni właściciele sieci na wniosek nabywcy\nnieruchomości.\nW przypadku określenia zapewnienia dostawy energii elektrycznej oraz określenia warunków\nprzyłączenia należy wystąpić z pisemnym wnioskiem do Biura Obsługi Klienta ul. Walczaka 31 w\nGorzowie Wlkp. – druki dostępne na stronie internetowej www.operator.enea.pl oraz w BOK.\n\nNieruchomość nie jest obciążona ograniczonymi prawami rzeczowymi.\nNabywca przyjmuje nieruchomość w stanie istniejącym.\nOrganizator nie odpowiada za wady ukryte.\nBrak zobowiązań dla nieruchomości.\n\nUWAGA\nMinimalne postąpienie, o które należy podwyższyć cenę wywoławczą przy licytacji ww.\nnieruchomości zostanie ustalone przez uczestników przetargu bezpośrednio przed rozpoczęciem\nlicytacji, jednak w wysokości nie mniejszej niż 1% ceny wywoławczej, z zaokrągleniem w górę do\npełnych dziesiątek złotych.\ntermin I przetargu 05 marca 2024r.,\ntermin II przetargu 18 kwietnia 2024r.,\ntermin III przetargu 05 czerwca 2024r.\n\n\nPrzetarg odbędzie się w dniu 5 września 2024r. o godz. 10ºº w sali nr 1 tutejszego Urzędu.\nW przetargu mogą brać udział osoby fizyczne oraz osoby prawne (cudzoziemcy na zasadach\nokreślonych w ustawie o nabywaniu nieruchomości przez cudzoziemców - (t.j.Dz.U.2017,poz.2278 ze\nzm.), którzy wpłacą wadium w terminie do 30 sierpnia 2024r. na konto bankowe nr\n49836200050399181920000020 Lubusko-Wielkopolski Bank Spółdzielczy Oddział Strzelce\nKrajeńskie.\nWpłacone wadium winno znajdować się na wyżej wymienionym koncie najpóźniej w dniu\n30 sierpnia 2024r.\nWadium winno być wpłacone na osobę biorącą udział w przetargu.\n\nUczestnicy przetargu zobowiązani są przed otwarciem przetargu do przedłożenia komisji przetargowej\ndowodu wniesienia wadium, dowodu tożsamości oraz w odniesieniu do osób prawnych aktualny odpis\nz KRS - oryginału lub potwierdzonej notarialnie kserokopii, a w przypadku osób ich reprezentujących\n- pełnomocnictwo do udziału w przetargu potwierdzone notarialnie.\nZgodnie z art.6 ust. l pkt 4 ustawy o opłacie skarbowej (t.j. Dz.U. 2023r. poz. 2111) - w przypadku\nprzedłożenia pełnomocnictwa, o którym mowa wyżej, należy uiścić opłatę skarbową w wysokości 17.00zł\n(część IV załącznika do tej ustawy). Powyższej opłaty nie uiszcza się w przypadku gdy pełnomocnictwo\nudzielane jest: małżonkowi, wstępnemu, zstępnemu lub rodzeństwu.\n\fMałżonkowie biorą udział w przetargu osobiście. W przypadku brania udziału w licytacji przez jednego\nz małżonków posiadających ustrój wspólności majątkowej małżeńskiej wymagana jest zgoda drugiego\nwspółmałżonka - w formie aktu notarialnego - dotycząca wyrażenia zgody na udział w przetargu na\nkupno określonej nieruchomości.\nW przypadku posiadania rozdzielności majątkowej małżeńskiej należy przed przetargiem dostarczyć\nkomisji przetargowej stosowny dokument potwierdzony notarialnie.\n\nWadium wpłacone przez osobę, która wygra przetarg, zostanie zaliczone na poczet nabycia\nnieruchomości, pozostałym natomiast będą zwrócone w ciągu trzech dni od dnia zamknięcia przetargu.\nNabywca zostanie powiadomiony w ciągu 21-dni od zamknięcia przetargu o terminie zawarcia aktu\nnotarialnego (termin ten nie może być krótszy niż 7 dni od dnia doręczenia).\n\nWarunkiem nabycia nieruchomości, obok wygrania przetargu, jest wpłacenie ceny uzyskanej w przetargu\nna wskazane w protokole z przetargu konto bankowe.\nWpłacona kwota winna znajdować się na wskazanym w protokole koncie najpóźniej do czasu zawarcia\numowy notarialnej.\nWadium ulega przepadkowi w razie uchylenia się osoby, która przetarg wygra, od zawarcia umowy\nnotarialnej.\n\nOrganizator przetargu zastrzega sobie prawo unieważnienia go w uzasadnionych przypadkach.\nOgłoszenie zostało wywieszone na tablicy ogłoszeń przy Urzędzie Miejskim, w gazecie lokalnej\n„Ziemia Strzelecka\", na stronie internetowej Urzędu www.bip.strzelce.pl oraz w serwisie prasowym na\nstronie internetowej www.przetargi-komunikaty.pl\n\nBliższych informacji udzielają pracownicy referatu Gospodarki Przestrzennej i Mienia Gminnego\nUrzędu Miejskiego w Strzelcach Krajeńskich (pokój nr 32, II piętro), nr tel. 95 76 36 332.\n\n\n\n                                                Burmistrz Strzelec Krajeńskich\n                                                     Mateusz FEDER\n\f";

const DLUGIE_PDF_TEXT = "                                  OGŁOSZENIE GPM nr 25/2026\n                                  Burmistrza Strzelec Krajeńskich\n                                      z 25 czerwca 2026 r.\n\nBurmistrz Strzelec Krajeńskich ogłasza IV nieograniczony przetarg ustny na sprzedaż\nniezabudowanej nieruchomości położonej w Długiem oznaczonej numerem\newidencyjnym gruntu 306/17 o powierzchni 415 m2.\n\nPrzedmiotem przetargu jest niezabudowana działka gruntu o numerze ewidencyjnym\n306/17 o powierzchni 415 m² położona w Długiem przy ul. Morskiej.\n\nCena wywoławcza – 121 000,00 zł (słownie złotych: sto dwadzieścia jeden tysięcy 00/100)\n\nWadium – 12 100,00 zł (słownie złotych: dwanaście tysięcy sto 00/100)\n\nDo ceny wylicytowanej w przetargu zostanie doliczony podatek VAT w wysokości 23%.\n\n\nNieruchomość wpisana jest w księdze wieczystej GW1K/00014372/7 prowadzonej przez Sąd\nRejonowy w Strzelcach Krajeńskich.\nWg Ewidencji Gruntów i Budynków Starostwa Powiatowego w Strzelcach Krajeńskich działka\nsklasyfikowana jest jako PsV.\nDziałka niezabudowana, położona przy ul. Morskiej we wschodniej części miejscowości\nDługie, na obrzeżach zabudowy letniskowej. Dojazd drogą gruntową. Sąsiedztwo i otoczenie\nstanowią lasy, zabudowa letniskowa, niewielki zbiornik wodny.\n(Zgodnie z art. 83a i art. 83f ust 4 ustawy o ochronie przyrody właściciel nieruchomości jest obowiązany\ndokonać zgłoszenia do organu zamiaru usunięcia drzewa, jeżeli obwód pnia drzewa mierzonego na wysokości 5\ncm przekracza: 1) 80 cm - w przypadku topoli, wierzb, klonu jesionolistnego oraz klonu srebrzystego; 2) 65 cm\n– w przypadku kasztanowca zwyczajnego, robinii akacjowej oraz platanu klonolistnego; 3) 50 cm – w\nprzypadku pozostałych gatunków drzew).\n\nDziałka o kształcie regularnym i zróżnicowanym ukształtowaniu terenu. Odległość od plaży\ni kąpieliska ok. 500 m.\nUzbrojenie: energia elektryczna w odległości ok. 40 m, wodociąg i kanalizacja w odległości\nok. 10 m.\n\nPołożona po prawej stronie drogi krajowej E-22 w kierunku Strzelce Krajeńskie – Dobiegniew.\n\nWarunki przyłączenia się do mediów określą poszczególni właściciele sieci na wniosek\nnabywcy nieruchomości.\nW przypadku określenia zapewnienia dostawy energii elektrycznej oraz określenia warunków\nprzyłączenia należy wystąpić z pisemnym wnioskiem do Biura Obsługi Klienta ul. Walczaka\n31 w Gorzowie Wlkp. – druki dostępne na stronie internetowej www.operator.enea.pl oraz w\nBOK.\n\nWw. działka znajduje się na terenie, dla którego tut. Urząd posiada aktualny plan\nzagospodarowania przestrzennego terenów w miejscowości Długie, zatwierdzony Uchwałą nr\nXXX/229/2012 Rady Miejskiej w Strzelcach Krajeńskich z dnia 27.09.2012 r. Zgodnie z\nzapisami w planie obszar, na którym położona jest działka oznaczony jest symbolem 2UTL –\nfunkcja „tereny zabudowy letniskowej”.\n\nW akcie sprzedaży zostanie ustanowiona służebność przesyłu mediów na rzecz\nPrzedsiębiorstwa Gospodarki Komunalnej Sp. z o.o. (oraz każdoczesnego właściciela) na\nczas nieoznaczony w pasie 3 m od granicy działki (z działką nr 306/18) – w celu budowy\nsieci oraz przyłączy wodociągowych, kanalizacji sanitarnej oraz kanalizacji deszczowej.\n\fBrak zobowiązań dla nieruchomości.\nWw. działka w chwili obecnej nie jest obciążona ograniczonymi prawami rzeczowymi.\nNabywca przyjmuje nieruchomość w stanie istniejącym.\nOrganizator nie odpowiada za wady ukryte.\n\n\nTermin I przetargu – 28 maja 2025 r.\nTermin II przetargu – 24 września 2025 r.\nTermin III przetargu – 11 czerwca 2026 r.\n\n\nUWAGA\nMinimalne postąpienie - o które należy podwyższyć cenę wywoławczą przy licytacji ww.\nnieruchomości - zostanie ustalone przez uczestników przetargu bezpośrednio przed\nrozpoczęciem licytacji, jednak w wysokości nie mniejszej niż 1% ceny wywoławczej,\nz zaokrągleniem w górę do pełnych dziesiątek złotych.\n\nPrzetarg odbędzie się w dniu 2 września o godz. 10:00 w sali nr 1 tutejszego Urzędu.\nW przetargu mogą brać udział osoby fizyczne oraz osoby prawne (cudzoziemcy na zasadach\nokreślonych w ustawie o nabywaniu nieruchomości przez cudzoziemców – t.j. Dz. U. 2017,\npoz. 2278), którzy wpłacą wadium w terminie do 27 sierpnia 2026 r. na konto bankowe nr\n49836200050399181920000020 Lubusko-Wielkopolski Bank Spółdzielczy Oddział Strzelce\nKrajeńskie.\n\nWpłacone wadium winno znajdować się na wyżej wymienionym koncie najpóźniej w dniu\n27 sierpnia 2026 r.\nWadium winno być wpłacone na osobę biorącą udział w przetargu.\n\n\nUczestnicy przetargu zobowiązani są przed otwarciem przetargu do przedłożenia komisji\nprzetargowej dowodu wniesienia wadium, dowodu tożsamości oraz w odniesieniu do osób\nprawnych aktualny odpis z KRS – oryginału lub potwierdzonej notarialnie kserokopii,\na w przypadku osób ich reprezentujących – pełnomocnictwo do udziału w przetargu\npotwierdzone notarialnie.\n\fZgodnie z art. 6 ust. l pkt 4 ustawy o opłacie skarbowej (t.j.Dz.U.2025r., poz.1154 ze zm.) –\nw przypadku przedłożenia pełnomocnictwa, o którym mowa wyżej, należy uiścić opłatę\nskarbową w wysokości 17,00 zł (część IV załącznika do tej ustawy). Powyższej opłaty nie\nuiszcza się w przypadku, gdy pełnomocnictwo udzielane jest: małżonkowi, wstępnemu,\nzstępnemu lub rodzeństwu.\n\nMałżonkowie biorą udział w przetargu osobiście. W przypadku brania udziału\nw licytacji przez jednego z małżonków posiadających ustrój wspólności majątkowej\nmałżeńskiej wymagana jest zgoda drugiego współmałżonka – w formie aktu notarialnego –\ndotycząca wyrażenia zgody na udział w przetargu na kupno określonej nieruchomości.\nW przypadku posiadania rozdzielności majątkowej małżeńskiej należy przed przetargiem\ndostarczyć komisji przetargowej stosowny dokument potwierdzony notarialnie.\n\nWadium wpłacone przez osobę, która wygra przetarg, zostanie zaliczone na poczet nabycia\nnieruchomości, pozostałym natomiast będą zwrócone w ciągu trzech dni od dnia zamknięcia\nprzetargu.\nNabywca zostanie powiadomiony w ciągu 21-dni od zamknięcia przetargu o terminie zawarcia\naktu notarialnego (termin ten nie może być krótszy niż 7 dni od dnia doręczenia).\n\nWarunkiem nabycia nieruchomości, obok wygrania przetargu, jest wpłacenie całej ceny\nnieruchomości (wraz z podatkiem VAT) uzyskanej w przetargu na wskazane\nw protokole z przetargu konto bankowe.\nWpłacona kwota winna znajdować się na wskazanym w protokole koncie najpóźniej do czasu\nzawarcia umowy notarialnej.\n\nWadium ulega przepadkowi w razie uchylenia się osoby, która przetarg wygra, od zawarcia\numowy notarialnej.\n\nOrganizator przetargu zastrzega sobie prawo unieważnienia go w uzasadnionych przypadkach.\nOgłoszenie zostało wywieszone na tablicy ogłoszeń przy Urzędzie Miejskim,\nw gazecie lokalnej „Ziemia Strzelecka\", na stronie internetowej Urzędu www.bip.strzelce.pl\noraz w serwisie prasowym na stronie internetowej www.monitorurzedowy.pl.\n\nBliższych informacji udzielają pracownicy referatu Gospodarki Przestrzennej i Mienia\nGminnego Urzędu Miejskiego w Strzelcach Krajeńskich (pokój nr 32,\nnr tel. 95 76 36 332).\n\n\n\n\nStrzelce Krajeńskie, 25 czerwca 2026 r.                         Burmistrz Strzelec Krajeńskich\n                                                                       Mateusz FEDER\n\f";

const OGARDY_PDF_TEXT = "                              OGŁOSZENIE GPM 22/2026\n                             Burmistrza Strzelec Krajeńskich\n                                z dnia 11 czerwca 2026 r.\n\n\nBurmistrz Strzelec Krajeńskich ogłasza I ograniczony przetarg ustny na sprzedaż lokalu\nniemieszkalnego o powierzchni użytkowej 41,92 m² położonego w budynku mieszkalnym\nzlokalizowanym w Ogardach pod numerem 52, nr dz. 117/1.\nZ uwagi na brak węzła sanitarnego lokal zostaje przeznaczony do sprzedaży w drodze\nprzetargu ustnego ograniczonego dla współwłaścicieli działki gruntu numer 117/1 oraz\nwłaścicieli działki gruntu 117/2 położonych w miejscowości Ogardy.\n\n\nDla nieruchomości gruntowej została urządzona księga wieczysta KW nr GW1K/00021942/6,\nprowadzona przez Sąd Rejonowy V Wydział Ksiąg Wieczystych w Strzelcach Krajeńskich.\nLokal niemieszkalny położony jest na parterze budynku i składa się z jednego\npomieszczenia – pokoju o powierzchni 41,92 m², pomieszczenie służyło jako siedziba\nfilialna biblioteki publicznej.\nLokal wymaga odnowienia, okna nieszczelne, podłoga uszkodzona, pod wykładziną\nwyczuwalne ubytki i uszkodzenia desek, malatura ścian do odnowienia. Na dzień wyceny brak\nogrzewania. Stan techniczny lokalu określa się jako zadowalający. Ocena stanu technicznego\nnie stanowi ekspertyzy.\nNieruchomość zabudowana budynkiem parterowym, niepodpiwniczonym, oznaczanym\nnumerem 52, obejmująca działkę gruntu nr 117/1 o powierzchni 0,0557 ha, położona\nw miejscowości Ogardy. Budynek wykonany w technologii tradycyjnej, murowanej. Budynek\nw średnim stanie technicznym, elewacja nieocieplona, nie spełnia aktualnych norm\nizolacyjnych. Pokrycie dachu i orynnowanie po wymianie, w stanie dobrym. Biorąc pod uwagę\nwiek budynku i prowadzoną gospodarkę remontową jego stan określa się jako średni. Ocena\nstanu technicznego nie stanowi ekspertyzy. Do budynku 52 przylega sąsiedni budynek\nmieszkalny numer 52A, stanowiący odrębną nieruchomość, ale posiadający wejście przez\nkorytarz w budynku numer 52.\nNieruchomość zlokalizowana jest w centrum miejscowości, wśród skoncentrowanej zabudowy.\nDojazd drogą o trwałej nawierzchni asfaltowej. Sąsiedztwo i otoczenie stanowią zabudowa\nmieszkaniowa, siedliskowa, kościół, staw wiejski.\nDziałka o kształcie nieregularnym, wydłużonym, w północnej części zabudowana budynkiem\nmieszkalno-użytkowym. Południowa część o zróżnicowanej konfiguracji, zagospodarowana\njako ogród, z pojedynczymi drzewami. Od wschodniej strony ogrodzona murem. Uzbrojenie\nterenu: energia elektryczna i wodociąg, media doprowadzone do budynku.\nDla wycenianego terenu brak obowiązującego planu zagospodarowania przestrzennego.\nW planie ogólnym, zatwierdzonym Uchwałą nr XXVII/158/26 z 30.01.2026 r. w sprawie\nuchwalenia planu ogólnego (Dz. Urz. Woj. Lubuskiego z 09.03.2026 r. poz. 492) działka\nzlokalizowana w strefie wielofunkcyjnej z zabudowie zagrodowej (283 SZ).\nNa dzień sporządzenia niniejszego ogłoszenia nieruchomość nie jest obciążona ograniczonymi\nprawami rzeczowymi. W umowie sprzedaży zostanie ustanowiona służebność przechodu\nna rzecz właścicieli działki nr 117/2.\n\fNabywca przyjmuje nieruchomość w stanie istniejącym. Organizator nie odpowiada za wady\nukryte. Brak zobowiązań dla nieruchomości.\n\nCena nieruchomości – 35 000 zł (słownie złotych: trzydzieści pięć tysięcy 00/100)\nCena wywoławcza – 35 000 zł (słownie złotych: trzydzieści pięć tysięcy 00/100)\nWadium – 3500 zł (słownie złotych: trzy tysiące pięćset 00/100)\nMinimalne postąpienie – o które należy podwyższyć cenę wywoławczą przy licytacji ww.\nlokalu – zostanie ustalone przez uczestników przetargu bezpośrednio przed rozpoczęciem\nlicytacji, jednak w wysokości nie mniejszej niż 1% ceny wywoławczej, z zaokrągleniem\nw górę do pełnych dziesiątek złotych.\nPrzetarg odbędzie się w dniu 15 lipca 2026 r. o godz. 10ºº w sali nr 1 tutejszego Urzędu. W\nprzetargu mogą brać udział osoby fizyczne, które wpłacą wadium w terminie\ndo 10 lipca 2026 r. na konto bankowe nr 49836200050399181920000020 Lubusko-\nWielkopolski Bank Spółdzielczy Oddział Strzelce Krajeńskie.\nWpłacone wadium winno znajdować się na wyżej wymienionym koncie najpóźniej\nw dniu 10 lipca 2026 r.\n\n\nUWAGA\nWarunkiem zakwalifikowania do udziału w przetargu jest:\n 1. Posiadanie tytułu prawnego do działki 117/1 lub 117/2, na których położona jest\n    nieruchomość – w przypadku braku ujawnienia tego prawa w księdze wieczystej\n    konieczne jest okazanie się podczas przetargu stosownym dokumentem (w oryginale)\n    potwierdzającym prawo do nieruchomości, np. aktem notarialnym, postanowieniem o\n    nabyciu spadku itp.\n 2. Złożenie zgłoszenia udziału w przetargu w zamkniętych kopertach z dopiskiem\n    „ZGŁOSZENIE PRZETARG OGARDY 52” w Punkcie Informacyjnym, tj. w pokoju nr\n    3, w Urzędzie Miejskim w Strzelcach Krajeńskich. Zgłoszenie powinno zawierać\n    wskazanie z imienia i nazwiska osoby, od której pochodzi, PESEL, jej adres i wyraźne\n    wyrażenie chęci przystąpienia do przetargu z podaniem położenia nieruchomości, tj. jej\n    adresu, w tym numeru działki, na której się znajduje. Zgłoszenie winno być opatrzone\n    czytelnym podpisem osoby je składającej. Osoby, które na dzień składania zgłoszenia nie\n    zostały ujawnione w księdze wieczystej do zgłoszenia, o którym mowa powyżej,\n    dostarczają kserokopię dokumentu określonego w pkt. 1.\n\nWykaz osób zakwalifikowanych do uczestnictwa w przetargu zostanie wywieszony na tablicy\nogłoszeń przed budynkiem Urzędu Miejskiego w Strzelcach Krajeńskich\nprzy ul. Al. Wolności 48 w dniu 13.07.2026 r.\n\nUczestnicy przetargu zobowiązani są przed otwarciem przetargu do przedłożenia komisji\nprzetargowej dowodu wniesienia wadium, dowodu tożsamości, a w przypadku osób ich\nreprezentujących – pełnomocnictwo do udziału w przetargu potwierdzone notarialnie.\n\fZgodnie z art. 6 ust. 1 pkt 4 ustawy o opłacie skarbowej (Dz.U. z 2025 r. poz. 1154) –\nw przypadku przedłożenia pełnomocnictwa, o którym mowa wyżej, należy uiścić opłatę\nskarbową w wysokości 17,00 zł (część IV załącznika do tej ustawy). Powyższej opłaty nie\nuiszcza się w przypadku, gdy pełnomocnictwo udzielane jest: małżonkowi, wstępnemu,\nzstępnemu lub rodzeństwu.\nMałżonkowie biorą udział w przetargu osobiście. W przypadku brania udziału w licytacji przez\njednego z małżonków posiadających ustrój wspólności majątkowej małżeńskiej wymagana jest\nzgoda drugiego współmałżonka – w formie aktu notarialnego – dotycząca wyrażenia zgody na\nudział w przetargu na kupno określonej nieruchomości.\nW przypadku posiadania rozdzielności majątkowej małżeńskiej należy przed przetargiem\ndostarczyć komisji przetargowej stosowny dokument potwierdzony notarialnie.\nWadium wpłacone przez osobę, która wygra przetarg, zostanie zaliczone na poczet nabycia\nnieruchomości, pozostałym natomiast zostanie zwrócone w ciągu trzech dni od dnia zamknięcia\nprzetargu.\nNabywca zostanie powiadomiony w ciągu 21-dni od zamknięcia przetargu o terminie zawarcia\naktu notarialnego (termin ten nie może być krótszy niż 7 dni od dnia doręczenia).\nWarunkiem nabycia nieruchomości, obok wygrania przetargu, jest wpłacenie całej ceny\nnieruchomości uzyskanej w przetargu na wskazane w protokole z przetargu konto bankowe.\nWpłacona kwota winna znajdować się na wskazanym w protokole koncie najpóźniej do czasu\nzawarcia umowy notarialnej.\nWadium ulega przepadkowi w razie uchylenia się osoby, która przetarg wygra, od zawarcia\numowy notarialnej.\nOrganizator przetargu zastrzega sobie prawo unieważnienia go w uzasadnionych przypadkach.\nOgłoszenie zostało wywieszone na tablicy ogłoszeń przy Urzędzie Miejskim, w gazecie\nlokalnej „Ziemia Strzelecka\", na stronie internetowej Urzędu www.bip.strzelce.pl oraz na\nstronie www.monitorurzedowy.pl.\nBliższych informacji udzielają pracownicy referatu Gospodarki Przestrzennej i Mienia\nGminnego Urzędu Miejskiego w Strzelcach Krajeńskich (pokój nr 32 i 38)\nnr tel. 95 76 36 332, 95 76 36 330.\n\n\nStrzelce Krajeńskie, 11 czerwca 2026 r.                   Burmistrz Strzelec Krajeńskich\n                                                                 Mateusz FEDER\n\f";

const WIELISLAWICE_WYNIK_TEXT = "                                          OGŁOSZENIE\n\nNa podstawie § 12 Rozporządzenia Rady Ministrów 14 września 2004 roku w sprawie sposobu\ni trybu przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości /t.j.: Dz.U. z 2021\nroku, poz. 2213/.\n\n                                          podaje się:\n\ndo publicznej wiadomości na okres od dnia 8 kwietnia 2026 roku do 15 kwietnia 2026 roku\ninformację o wynikach przeprowadzonego przetargu ustnego.\n\nI nieograniczony przetarg ustny na sprzedaż nieruchomości położonej w Wielisławicach\noznaczonej numerem ewidencyjnym gruntu 144/7 o powierzchni 0,8991 ha zabudowanej\nbudynkiem placówki edukacyjnej.\n\nDla nieruchomości prowadzona jest księga wieczysta GW1K/00009492/6.\n\nBrak wpłat wadium w terminie określonym w ogłoszeniu o przetargu, w związku z czym\nprzetarg się nie odbył.\n\nStrzelce Krajeńskie, 8 kwietnia 2026 r.\n                                                             Burmistrz\n                                                        Strzelec Krajeńskich\n                                                        /-/ Mateusz FEDER\n\f";

const OGARDY_TITLE =
  "Burmistrz Strzelec Krajeńskich ogłasza I ograniczony przetarg ustny na sprzedaż lokalu niemieszkalnego o powierzchni użytkowej 41,92 m² położonego w budynku mieszkalnym zlokalizowanym w Ogardach pod numerem 52, nr dz. 117/1.";
const DLUGIE_TITLE =
  "Burmistrz Strzelec Krajeńskich ogłasza IV nieograniczony przetarg ustny na sprzedaż niezabudowanej nieruchomości położonej w Długiem oznaczonej numerem ewidencyjnym gruntu 306/17 o powierzchni 415 m2.";
const GILOW_TITLE =
  "I nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego położonego w Gilowie 20/1";
const LUDOWA_TITLE =
  "Ogłoszenie GPM 30/2024 Burmistrz Strzelec Krajeńskich ogłasza IV nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego nr 4 o powierzchni użytkowej 87,03 m² położonego przy ul. Ludowej 9 w Strzelcach Krajeńskich";
const LEASE_TITLE =
  "dzierżawa nieruchomości położonej w Długiem stanowiącej część działki oznaczonej numerem ewidencyjnym gruntu 5/138 z przeznaczeniem na prowadzenie działalności gastronomicznej";
const LEASE_CENA_TEXT =
  "Wywoławcza wysokość czynszu dzierżawnego za jedno stanowisko – 13.000,00 zł (słownie: trzynaście tysięcy złotych) netto plus media (za cały okres najmu).";
const WIELISLAWICE_TITLE =
  "Burmistrz Strzelec Krajeńskich ogłasza rokowania po II przetargu nieograniczonym ustnym zakończonym wynikiem negatywnym na sprzedaż nieruchomości położonej w Wielisławicach oznaczonej numerem ewidencyjnym gruntu 144/7 o powierzchni 0,8991 ha zabudowanej budynkiem placówki edukacyjnej";

const ROW_HTML_OGARDY = "<tr class=\"odd\">\n\t\t\t<td class=\"td-no\"><span>Lp: </span>1</td>\n\t\t\t<td class=\"td-date-1\"><div>Data ogłoszenia</div>2026-06-11 00:00:00</td>\n\t\t\t<td class=\"td-date-2\"><div>Data i godzina przetargu</div>2026-07-15 10:00:00</td>\n\t\t\t<td class=\"td-title-1\"><div>Dotyczy</div><a href=\"https://bip.strzelce.pl/przetargi/29/135/OGLOSZENIE_GPM_22_2F2026/\" title=\"Przejdź do szczegółów informacji\">Burmistrz Strzelec Krajeńskich ogłasza I ograniczony przetarg ustny na sprzedaż lokalu niemieszkalnego o powierzchni użytkowej 41,92 m² położonego w budynku mieszkalnym zlokalizowanym w Ogardach pod numerem 52, nr dz. 117/1.</a></td>\n\t\t\t<td class=\"td-title-2\"><div>Cena wywoławcza</div>informacja w załączniku </td>\n\t\t\t<td class=\"td-title-1\"><div>Wynik</div>Brak wyniku</td>\n\t\t\t<td class=\"td-attachments-1\"><div>Załączniki</div>\t<!-- .......................... start : lista uproszczona zalacznikow .......................... -->\n\t<ul class=\"attachments\">\n\t\t\t<li><a href=\"https://bip.strzelce.pl/system/pobierz.php?plik=GPM_22_2026.pdf&amp;id=9da92bef2145b043aee010591fb17fd6\" title=\"Pobierz załącznik\"><img src=\"https://bip.strzelce.pl/ikona.php?plik=GPM_22_2026.pdf\" alt=\"Ikona (PDF)\" /></a></li>\n\t\t\t\t<li><a href=\"https://bip.strzelce.pl/system/pobierz.php?plik=Wzor_zgloszenia.pdf&amp;id=77deb3b5872c94ea9ee4536df4742e49\" title=\"Pobierz załącznik\"><img src=\"https://bip.strzelce.pl/ikona.php?plik=Wzor_zgloszenia.pdf\" alt=\"Ikona (PDF)\" /></a></li>\n\t\t\t</ul>\n\t<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->\n\t</td>\n\t\t</tr>";
const ROW_HTML_DLUGIE = "<tr class=\"even\">\n\t\t\t<td class=\"td-no\"><span>Lp: </span>2</td>\n\t\t\t<td class=\"td-date-1\"><div>Data ogłoszenia</div>2026-06-25 00:00:00</td>\n\t\t\t<td class=\"td-date-2\"><div>Data i godzina przetargu</div>2026-09-02 10:00:00</td>\n\t\t\t<td class=\"td-title-1\"><div>Dotyczy</div><a href=\"https://bip.strzelce.pl/przetargi/29/136/OGLOSZENIE_GPM_25_2F2026/\" title=\"Przejdź do szczegółów informacji\">Burmistrz Strzelec Krajeńskich ogłasza IV nieograniczony przetarg ustny na sprzedaż niezabudowanej nieruchomości położonej w Długiem oznaczonej numerem ewidencyjnym gruntu 306/17 o powierzchni 415 m2.</a></td>\n\t\t\t<td class=\"td-title-2\"><div>Cena wywoławcza</div>informacja w załączniku </td>\n\t\t\t<td class=\"td-title-1\"><div>Wynik</div>Brak wyniku</td>\n\t\t\t<td class=\"td-attachments-1\"><div>Załączniki</div>\t<!-- .......................... start : lista uproszczona zalacznikow .......................... -->\n\t<ul class=\"attachments\">\n\t\t\t<li><a href=\"https://bip.strzelce.pl/system/pobierz.php?plik=GPM_25_2026.pdf&amp;id=74b446f53fd27791e51e87040a2d8518\" title=\"Pobierz załącznik\"><img src=\"https://bip.strzelce.pl/ikona.php?plik=GPM_25_2026.pdf\" alt=\"Ikona (PDF)\" /></a></li>\n\t\t\t</ul>\n\t<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->\n\t</td>\n\t\t</tr>";
const ROW_HTML_LEASE = "<tr class=\"even\">\n\t\t\t<td class=\"td-no\"><span>Lp: </span>4</td>\n\t\t\t<td class=\"td-date-1\"><div>Data ogłoszenia</div>2026-03-31 00:00:00</td>\n\t\t\t<td class=\"td-date-2\"><div>Data i godzina przetargu</div>2026-05-08 10:00:00</td>\n\t\t\t<td class=\"td-title-1\"><div>Dotyczy</div><a href=\"https://bip.strzelce.pl/przetargi/29/132/OGLOSZENIE_Przedsiebiorstwo_Gospodarki_Komunalnej_Sp__z_o_o/\" title=\"Przejdź do szczegółów informacji\">dzierżawa nieruchomości położonej w Długiem stanowiącej część działki oznaczonej numerem ewidencyjnym gruntu 5/138 z przeznaczeniem na prowadzenie działalności gastronomicznej </a></td>\n\t\t\t<td class=\"td-title-2\"><div>Cena wywoławcza</div>Wywoławcza wysokość czynszu dzierżawnego za jedno stanowisko – 13.000,00 zł (słownie: trzynaście tysięcy złotych) netto plus media (za cały okres najmu).</td>\n\t\t\t<td class=\"td-title-1\"><div>Wynik</div>Brak wyniku</td>\n\t\t\t<td class=\"td-attachments-1\"><div>Załączniki</div>\t<!-- .......................... start : lista uproszczona zalacznikow .......................... -->\n\t<ul class=\"attachments\">\n\t\t\t<li><a href=\"https://bip.strzelce.pl/system/pobierz.php?plik=ogloszenie_przetarg_plaza_03_2026.pdf&amp;id=77eb3e777b253411c96d65de2526b1ea\" title=\"Pobierz załącznik\"><img src=\"https://bip.strzelce.pl/ikona.php?plik=ogloszenie_przetarg_plaza_03_2026.pdf\" alt=\"Ikona (PDF)\" /></a></li>\n\t\t\t\t<li><a href=\"https://bip.strzelce.pl/system/pobierz.php?plik=umowa_dzierzawy_Dlugie_plaza_03_2026.pdf&amp;id=5335df1cde34cdcc55bd6ed745694455\" title=\"Pobierz załącznik\"><img src=\"https://bip.strzelce.pl/ikona.php?plik=umowa_dzierzawy_Dlugie_plaza_03_2026.pdf\" alt=\"Ikona (PDF)\" /></a></li>\n\t\t\t\t<li><a href=\"https://bip.strzelce.pl/system/pobierz.php?plik=Dlugie_ogloszenie_po.pdf&amp;id=db3f39c190496ef77d59290e324b4b25\" title=\"Pobierz załącznik\"><img src=\"https://bip.strzelce.pl/ikona.php?plik=Dlugie_ogloszenie_po.pdf\" alt=\"Ikona (PDF)\" /></a></li>\n\t\t\t</ul>\n\t<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->\n\t</td>\n\t\t</tr>";
const ROW_HTML_GILOW = "<tr class=\"odd\">\n\t\t\t<td class=\"td-no\"><span>Lp: </span>9</td>\n\t\t\t<td class=\"td-date-1\"><div>Data ogłoszenia</div>2025-05-29 00:00:00</td>\n\t\t\t<td class=\"td-date-2\"><div>Data i godzina przetargu</div>2025-07-03 11:00:00</td>\n\t\t\t<td class=\"td-title-1\"><div>Dotyczy</div><a href=\"https://bip.strzelce.pl/przetargi/29/126/OGLOSZENIE_GPM-_24_2F2025/\" title=\"Przejdź do szczegółów informacji\">I nieograniczony przetarg ustny na sprzedaż lokalu mieszkalnego położonego w Gilowie 20/1</a></td>\n\t\t\t<td class=\"td-title-2\"><div>Cena wywoławcza</div>informacja w załączniku </td>\n\t\t\t<td class=\"td-title-1\"><div>Wynik</div>Brak wyniku</td>\n\t\t\t<td class=\"td-attachments-1\"><div>Załączniki</div>\t<!-- .......................... start : lista uproszczona zalacznikow .......................... -->\n\t<ul class=\"attachments\">\n\t\t\t<li><a href=\"https://bip.strzelce.pl/system/pobierz.php?plik=GPM_przetarg_Gilow_20_3B1.pdf&amp;id=1f62487e29c813edd5f39d1a52a2edbf\" title=\"Pobierz załącznik\"><img src=\"https://bip.strzelce.pl/ikona.php?plik=GPM_przetarg_Gilow_20_3B1.pdf\" alt=\"Ikona (PDF)\" /></a></li>\n\t\t\t</ul>\n\t<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->\n\t</td>\n\t\t</tr>";


test('parsePLN: dot-thousands, space-thousands, bare, invalid', () => {
  assert.equal(parsePLN('54.000,00'), 54000);
  assert.equal(parsePLN('121 000,00'), 121000);
  assert.equal(parsePLN('80 000,00'), 80000);
  assert.equal(parsePLN('3500'), 3500);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(''), null);
});

test('areaFromText: village flat, town flat, land (all real captured text)', () => {
  assert.equal(areaFromText(GILOW_PDF_TEXT), 37.78);
  assert.equal(areaFromText(LUDOWA_PDF_TEXT), 87.03);
  assert.equal(areaFromText(DLUGIE_PDF_TEXT), 415);
  assert.equal(areaFromText(OGARDY_PDF_TEXT), 41.92);
});

test('startingPriceFromText: all separator variants observed live', () => {
  assert.equal(startingPriceFromText(GILOW_PDF_TEXT), 54000);
  assert.equal(startingPriceFromText(DLUGIE_PDF_TEXT), 121000);
  assert.equal(startingPriceFromText(LUDOWA_PDF_TEXT), 80000);
  assert.equal(startingPriceFromText(OGARDY_PDF_TEXT), 35000);
  assert.equal(startingPriceFromText('Cena wywoławcza informacja w załączniku'), null);
});

test('roundFromText: Roman-numeral ordinal, nominative and genitive', () => {
  assert.equal(roundFromText(GILOW_PDF_TEXT), 1);
  assert.equal(roundFromText(LUDOWA_PDF_TEXT), 4);
  assert.equal(roundFromText(DLUGIE_PDF_TEXT), 4);
  assert.equal(roundFromText(OGARDY_PDF_TEXT), 1);
});

test('dateOnly: board "Data i godzina przetargu" -> ISO date', () => {
  assert.equal(dateOnly('2026-09-02 10:00:00'), '2026-09-02');
  assert.equal(dateOnly(null), null);
});


test('isInScopeRow: REGRESSION — lokal NIEmieszkalny (Ogardy 52) must NOT be treated as a flat', () => {
  assert.equal(isInScopeRow(OGARDY_TITLE), false);
});

test('isInScopeRow: village flat, town flat, and land titles are in scope', () => {
  assert.equal(isInScopeRow(GILOW_TITLE), true);
  assert.equal(isInScopeRow(LUDOWA_TITLE), true);
  assert.equal(isInScopeRow(DLUGIE_TITLE), true);
});

test('isInScopeRow: LEASE (dzierżawa) is skipped', () => {
  assert.equal(isInScopeRow(LEASE_TITLE), false);
});

test('isInScopeRow: rokowania + zabudowana (Wielisławice) is skipped', () => {
  assert.equal(isInScopeRow(WIELISLAWICE_TITLE), false);
});


test('extractFlatAddress: VILLAGE form — glued building/apt, nominative recovered from "miejscowości" anchor', () => {
  // jest w miejscowości Gilów, ok. 15 km od Strzelec Krajeńskich" elsewhere
  assert.equal(extractFlatAddress(GILOW_PDF_TEXT), 'Gilów 20/1');
});

test('extractFlatAddress: TOWN form — ul. + separate "lokal ... nr N"', () => {
  assert.equal(extractFlatAddress(LUDOWA_PDF_TEXT), 'Ludowej 9/4');
});

test('extractFlatAddress: no match on land text', () => {
  assert.equal(extractFlatAddress(DLUGIE_PDF_TEXT), null);
});


test('parcelFromText / landPlaceFromText / areaFromText: Długie dz. 306/17', () => {
  assert.equal(parcelFromText(DLUGIE_PDF_TEXT), '306/17');
  assert.equal(landPlaceFromText(DLUGIE_PDF_TEXT), 'Długie');
  assert.equal(areaFromText(DLUGIE_PDF_TEXT), 415);
});


test('parseAnnouncement: Gilów 20/1 — PENDING-shaped flat, village form, round I', () => {
  const row = {
    detailUrl: 'https://bip.strzelce.pl/przetargi/29/126/OGLOSZENIE_GPM-_24_2F2025/',
    dotyczyText: GILOW_TITLE,
    cenaText: 'informacja w załączniku',
    auctionDateRaw: '2025-07-03 11:00:00',
  };
  const r = parseAnnouncement(row, GILOW_PDF_TEXT, 'https://bip.strzelce.pl/system/pobierz.php?plik=GPM_przetarg_Gilow_20_3B1.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Gilów 20/1');
  assert.equal(r.address.key, 'gilow|20|1');
  assert.equal(r.area_m2, 37.78);
  assert.equal(r.starting_price_pln, 54000);
  assert.equal(r.auction_date, '2025-07-03');
  assert.equal(r.round, 1);
  assert.deepEqual(r.notes, []);
});

test('parseAnnouncement: ul. Ludowej 9/4 — flat, town form, round IV', () => {
  const row = {
    detailUrl: 'https://bip.strzelce.pl/przetargi/29/119/OGLOSZENIE_GPM_30_2F2024/',
    dotyczyText: LUDOWA_TITLE,
    cenaText: 'informacja w załączniku',
    auctionDateRaw: '2024-09-05 10:00:00',
  };
  const r = parseAnnouncement(row, LUDOWA_PDF_TEXT, 'https://bip.strzelce.pl/system/pobierz.php?plik=Ogloszenie_GPM_30_2024_.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Ludowej 9/4');
  assert.equal(r.address.key, 'ludowej|9|4');
  assert.equal(r.area_m2, 87.03);
  assert.equal(r.starting_price_pln, 80000);
  assert.equal(r.auction_date, '2024-09-05');
  assert.equal(r.round, 4);
});

test('parseAnnouncement: Długie dz. 306/17 — genuinely ACTIVE land, round IV', () => {
  const row = {
    detailUrl: 'https://bip.strzelce.pl/przetargi/29/136/OGLOSZENIE_GPM_25_2F2026/',
    dotyczyText: DLUGIE_TITLE,
    cenaText: 'informacja w załączniku',
    auctionDateRaw: '2026-09-02 10:00:00',
  };
  const r = parseAnnouncement(row, DLUGIE_PDF_TEXT, 'https://bip.strzelce.pl/system/pobierz.php?plik=GPM_25_2026.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '306/17');
  assert.equal(r.address_raw, 'Długie');
  assert.equal(r.area_m2, 415);
  assert.equal(r.starting_price_pln, 121000);
  assert.equal(r.auction_date, '2026-09-02');
  assert.equal(r.round, 4);
  assert.deepEqual(r.notes, []);
});

test('parseAnnouncement: REGRESSION — Ogardy 52 (lokal niemieszkalny) never becomes a listing', () => {
  const row = {
    detailUrl: 'https://bip.strzelce.pl/przetargi/29/135/OGLOSZENIE_GPM_22_2F2026/',
    dotyczyText: OGARDY_TITLE,
    cenaText: 'informacja w załączniku',
    auctionDateRaw: '2026-07-15 10:00:00',
  };
  assert.equal(parseAnnouncement(row, OGARDY_PDF_TEXT, 'x'), null);
});

test('parseAnnouncement: title-only fallback when the PDF fetch fails (no crash, degrades gracefully)', () => {
  const row = {
    detailUrl: 'https://bip.strzelce.pl/przetargi/29/136/OGLOSZENIE_GPM_25_2F2026/',
    dotyczyText: DLUGIE_TITLE,
    cenaText: 'informacja w załączniku',
    auctionDateRaw: '2026-09-02 10:00:00',
  };
  const r = parseAnnouncement(row, null, null);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '306/17');
  assert.equal(r.area_m2, 415);
  assert.equal(r.starting_price_pln, null);
  assert.ok(r.notes.includes('parse: missing starting price'));
});


test('parseResultDoc: Wielisławice — REAL result doc, correctly excluded (zabudowana, not mieszkalny/grunt)', () => {
  assert.deepEqual(
    parseResultDoc(WIELISLAWICE_WYNIK_TEXT, '2026-04-08', 'https://bip.strzelce.pl/system/pobierz.php?plik=GPM_wynik_przetargu_Wielislawice.pdf'),
    [],
  );
});

test('isResultNotice / isNegativeOutcome: Wielisławice\'s real negative-outcome phrasing ("Brak wpłat wadium ... przetarg się nie odbył")', () => {
  assert.equal(isResultNotice(WIELISLAWICE_WYNIK_TEXT), true);
  assert.equal(isNegativeOutcome(WIELISLAWICE_WYNIK_TEXT), true);
});

test('parseResultDoc: empty / non-result text -> []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc('lorem ipsum, no outcome signal at all', null, 'x'), []);
});

test('achievedPriceFromText: no "nabywca" mention -> null (no positive result observed live yet)', () => {
  assert.equal(achievedPriceFromText(WIELISLAWICE_WYNIK_TEXT), null);
  assert.equal(achievedPriceFromText(GILOW_PDF_TEXT), null);
});


test('boardUrl: page 1 omits the page segment, page>1 puts it before status', () => {
  assert.equal(boardUrl(0, 1), 'https://bip.strzelce.pl/przetargi/29/status/0/');
  assert.equal(boardUrl(1, 1), 'https://bip.strzelce.pl/przetargi/29/status/1/');
  assert.equal(boardUrl(1, 3), 'https://bip.strzelce.pl/przetargi/29/3/status/1/');
});


test('parseBoardPage: Ogardy row (real HTML) — niemieszkalny, 2 attachments incl. a bid-form template', () => {
  const [row] = parseBoardPage(`<table><tr><th>h</th></tr>${ROW_HTML_OGARDY}</table>`);
  assert.equal(row.detailUrl, 'https://bip.strzelce.pl/przetargi/29/135/OGLOSZENIE_GPM_22_2F2026/');
  assert.match(row.dotyczyText, /lokalu niemieszkalnego/);
  assert.equal(row.cenaText, 'Cena wywoławcza informacja w załączniku');
  assert.equal(row.wynikText, 'Wynik Brak wyniku');
  assert.equal(row.announcedDate, '2026-06-11 00:00:00');
  assert.equal(row.auctionDateRaw, '2026-07-15 10:00:00');
  assert.equal(row.attachments.length, 2);
  assert.equal(row.attachments[0].filename, 'GPM_22_2026.pdf');
  assert.equal(row.attachments[1].filename, 'Wzor_zgloszenia.pdf');
});

test('parseBoardPage: Długie row (real HTML) — land, 1 attachment', () => {
  const [row] = parseBoardPage(`<table><tr><th>h</th></tr>${ROW_HTML_DLUGIE}</table>`);
  assert.equal(row.detailUrl, 'https://bip.strzelce.pl/przetargi/29/136/OGLOSZENIE_GPM_25_2F2026/');
  assert.match(row.dotyczyText, /niezabudowanej nieruchomości/);
  assert.equal(row.auctionDateRaw, '2026-09-02 10:00:00');
  assert.equal(row.attachments.length, 1);
  assert.equal(row.attachments[0].filename, 'GPM_25_2026.pdf');
  assert.equal(isInScopeRow(row.dotyczyText), true);
});

test('parseBoardPage: lease row (real HTML) — dzierżawa, inline cena text present but must be skipped by kind', () => {
  const [row] = parseBoardPage(`<table><tr><th>h</th></tr>${ROW_HTML_LEASE}</table>`);
  assert.match(row.dotyczyText, /dzierżawa nieruchomości/);
  assert.equal(row.cenaText, `Cena wywoławcza ${LEASE_CENA_TEXT}`);
  assert.equal(row.attachments.length, 3);
  assert.equal(isInScopeRow(row.dotyczyText), false);
});

test('parseBoardPage: Gilów row (real HTML) — single-PDF flat announcement', () => {
  const [row] = parseBoardPage(`<table><tr><th>h</th></tr>${ROW_HTML_GILOW}</table>`);
  assert.equal(row.detailUrl, 'https://bip.strzelce.pl/przetargi/29/126/OGLOSZENIE_GPM-_24_2F2025/');
  assert.equal(row.dotyczyText, GILOW_TITLE);
  assert.equal(row.auctionDateRaw, '2025-07-03 11:00:00');
  assert.equal(row.attachments.length, 1);
  assert.equal(row.attachments[0].filename, 'GPM_przetarg_Gilow_20_3B1.pdf');
  assert.match(row.attachments[0].url, /^https:\/\/bip\.strzelce\.pl\/system\/pobierz\.php\?plik=GPM_przetarg_Gilow_20_3B1\.pdf&id=/);
});
