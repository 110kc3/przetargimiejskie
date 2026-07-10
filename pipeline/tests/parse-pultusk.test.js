// Pułtusk parser tests — groundtruthed against REAL fixtures fetched LIVE
// from pultusk.pl (wp-json/wp/v2/posts, search + list endpoints) on
// 2026-07-10. Every HTML fixture below is content.rendered exactly as WordPress
// returned it (byte-for-byte, generated from the captured JSON — not
// paraphrased); title/date/link are the same posts' real metadata.
//
//   FLAT pending (round III): https://pultusk.pl/ogloszenie-z-dnia-26-03-2026-r/
//     "OGŁOSZENIE z dnia 26.03.2026 r. BURMISTRZ MIASTA PUŁTUSK OGŁASZA III PRZETARG USTNY NIEOGRANICZONY"
//     ul. Na Skarpie 3/25, 73,00 m², 300 000,00 zł / wadium 30 000,00 zł,
//     przetarg 05.05.2026, KW OS1U/00044602/6. Round is stated ONLY in the
//     TITLE (the body never restates "ogłasza ... przetarg") — the real
//     quirk that roundFromText's title fallback exists for.
//
//   LAND pending (round III, obręb 28, 2 bundled-parcel rows): https://pultusk.pl/ogloszenie-o-iii-przetargach/
//     "OGŁOSZENIE O III PRZETARGACH"
//     Row 1: działki 122/6+121/5, 0,0953 ha, 105 000,00 zł / wadium 10 000,00 zł.
//     Row 2: działki 122/7+120/5, 0,1366 ha, 205 000,00 zł / wadium 20 000,00 zł.
//     Price cells here are BARE numbers (no inline "zł"). Round stated in a
//     body <h1>. Shares its two prior (higher-priced, failed) rounds' real
//     announcement text with LAND_OBREB28_ROUND_I_INTRO/ROUND_II below.
//
//   LAND pending (round I, obręb 20, 3 single-parcel rows + a 7th "Decyzja o
//   warunkach zabudowy" column the obręb-28 table doesn't have): https://pultusk.pl/ogloszenie-o-i-przetargu/
//     "OGŁOSZENIE O I PRZETARGACH"
//     58/18 0,0709 ha 262 000,00 zł / wadium 26 000,00 zł
//     58/19 0,0725 ha 268 000,00 zł / wadium 26 000,00 zł
//     58/20 0,0727 ha 268 500,00 zł / wadium 26 000,00 zł
//     Price cells here carry an inline "zł" suffix + `&nbsp;` thousands sep —
//     the opposite quirk from the obręb-28 table, both real.
//
//   LEASE (must be skipped — never reaches parseFlatAnnouncement): https://pultusk.pl/nabor-wnioskow-o-najem-lokalu-mieszkalnego-w-budynku-przy-al-tysiaclecia-2a/
//     "Nabór wniosków o najem lokalu mieszkalnego w budynku przy Al. Tysiąclecia 2A"
//     A municipal-flat rental application window, not a sale.
//
//   WYKAZ (excluded — no scheduled date, contract allows wykaz: []):
//     "WYKAZ NIERUCHOMOŚCI PRZEZNACZONEJ DO SPRZEDAŻY POŁOŻONEJ W MIEJSCOWOŚCI GŁOWNO"
//
//   Real word-ordinal + "date before odbędzie się" fixture (round I
//   predecessor of the Na Skarpie 3/25 flat above — no price table, so it
//   never reaches parseFlatAnnouncement, but groundtruths roundFromText's
//   word-ordinal branch + auctionDateFromText's 3rd fallback pattern):
//   https://pultusk.pl/pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ul-na-skarpie-3-2/
//     "Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Na Skarpie 3"
//
//   No results stream: "informacja o wyniku" searched live 2026-07-10 — 0
//   relevant hits for property auctions (see parse.js file header).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  haToM2,
  roundFromText,
  auctionDateFromText,
  kwNumberFromText,
  obrebFromText,
  aptFromText,
  streetBuildingFromText,
  areaFromDescCell,
  parcelsFromCell,
  isLeaseTitle,
  isWykazTitle,
  extractTables,
  findPricedTable,
  parseFlatAnnouncement,
  parseLandAnnouncements,
  parseAnnouncementPost,
  parseResultDoc,
} from '../src/cities/pultusk/parse.js';

// --------------------------------------------------------------- real fixtures

const FLAT_URL = "https://pultusk.pl/ogloszenie-z-dnia-26-03-2026-r/";
const FLAT_TITLE = "OGŁOSZENIE z dnia 26.03.2026 r. BURMISTRZ MIASTA PUŁTUSK OGŁASZA III PRZETARG USTNY NIEOGRANICZONY";
const FLAT_DATE = "2026-03-31T13:56:00";
const FLAT_HTML = `
<p class="wp-block-paragraph"><strong>Na sprzedaż lokalu mieszkalnego nr 25 w budynku przy ulicy Na Skarpie 3 w Pułtusku wraz z udziałem w nieruchomości wspólnej, dla którego Sąd Rejonowy<br>w Pułtusku IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą nr OS1U/00044602/6.</strong></p>



<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td><strong>Oznaczenie nieruchomości wg danych ewidencji gruntów, nr księgi wieczystej</strong></td><td><strong>Opis lokalu</strong></td><td><strong>Udział w nieruchomości wspólnej</strong></td><td><strong>Przeznaczenie nieruchomości i sposób jej zagospodarowania</strong></td><td><strong>Cena wywoławcza</strong> <strong>&nbsp;zł</strong></td><td><strong>Wadium</strong> <strong>&nbsp;</strong> <strong>&nbsp;zł</strong></td></tr><tr><td>Miasto Pułtusk Obręb 19 &nbsp; Działka nr 113 o pow. 1,9671 ha &nbsp; &nbsp; KW Nr OS1U/00042453/2</td><td>Lokal mieszkalny o powierzchni 73,00 m<sup>2</sup>, mieści się na drugim piętrze w budynku przy ul. Na Skarpie 3 w Pułtusku.W skład lokalu mieszkalnego wchodzą cztery pokoje, kuchnia, przedpokój, łazienka i wc.</td><td>7300/399223</td><td>Budynek przy ul. Na Skarpie 3, w którym mieści się lokal mieszkalny objęty niniejszym ogłoszeniem, leży na obszarze nieobjętym ustaleniami miejscowego planu zagospodarowania przestrzennego. Nieruchomość jest zagospodarowana jako mieszkalna. &nbsp;</td><td><strong>300 000,00</strong> &nbsp;</td><td><strong>30 000,00</strong></td></tr></tbody></table></figure>



<p class="wp-block-paragraph"><strong>Przetarg odbędzie się w dniu 05.05.2026 r. o godz. 9<sup>00 </sup>w siedzibie Urzędu Miejskiego w Pułtusku – Rynek, Ratusz, w Sali Rady (I piętro).</strong></p>



<p class="wp-block-paragraph">Wadium w wysokości określonej powyżej uczestnik przetargu winien wpłacić w formie pieniężnej, najpóźniej w dniu 30.04.2026 r. w Punkcie Kasowym Banku w siedzibie Urzędu Miejskiego w Pułtusku lub na konto Gminy Pułtusk &#8211; PKO Bank Polski S.A. Nr 73 1020 1592 0000 2702 0276 3597.</p>



<p class="wp-block-paragraph"><em>W przetargu&nbsp; mogą brać udział osoby, które wniosą wadium w wysokości i terminie wyznaczonym w niniejszym ogłoszeniu. Przystąpienie do przetargu wymaga legitymowania się dokumentem potwierdzającym tożsamość. Jeżeli uczestnika przetargu zastępuje inna osoba, winna ona przedstawić pełnomocnictwo z notarialnie poświadczonymi podpisami. W przypadku małżonków, do dokonania czynności przetargowych konieczna jest obecność obojga lub jednego z nich ze stosownym pełnomocnictwem drugiego małżonka, zawierającym zgodę na odpłatne nabycie nieruchomości ze środków pochodzących z majątku wspólnego lub złożenie przez osobę przystępującą do przetargu oświadczenia woli nabycia nieruchomości z majątku odrębnego. W przypadku osoby upoważnionej do reprezentowania osoby prawnej podlegającej wpisowi do Krajowego Rejestru Sądowego wymagane jest okazanie przez osobę upoważnioną do reprezentowania osoby prawnej aktualnego wypisu z KRS. Na wypadek nie dokonania przez bank przelewu wadium wpłaconego przez osobę zamierzającą wziąć udział w niniejszym przetargu, zaleca się posiadanie przy sobie dowodu jego wpłaty.</em></p>



<p class="wp-block-paragraph">Wadium wpłacone przez uczestnika, który wygra przetarg zalicza się na poczet ceny sprzedaży nieruchomości. W razie uchylenia się uczestnika, który wygra przetarg od zawarcia umowy notarialnej wadium ulega przepadkowi. Osobom, które nie wygrały przetargu, wadium wpłacone przelewem zostanie zwrócone nie później niż przed upływem 3 dni od dnia zamknięcia przetargu i po pisemnej dyspozycji wpłacającego.</p>



<p class="wp-block-paragraph">Organizator przetargu zawiadomi osobę ustaloną jako Nabywca nieruchomości o miejscu i terminie zawarcia umowy sprzedaży najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargu. W przypadku uchylenia się Nabywcy od zawarcia umowy notarialnej, tj. nie przystąpienia bez usprawiedliwienia do zawarcia umowy w miejscu i terminie podanym w zawiadomieniu lub braku zapłaty ceny nieruchomości do dnia zawarcia umowy, Burmistrz Miasta Pułtusk może odstąpić od zawarcia umowy, a wpłacone wadium nie podlega zwrotowi. Cena sprzedaży nie może być rozłożona na raty, a dokonanie jej zapłaty wymagane jest jednorazowo najpóźniej w przeddzień zawarcia aktu notarialnego.</p>



<p class="wp-block-paragraph">Lokal mieszkalny jest wolny od wszelkich obciążeń na rzecz osób trzecich i nie jest przedmiotem zobowiązań. Brak wpisów w działach III i IV księgi wieczystej Nr OS1U/00044602/6. Nabywca przejmuje nieruchomość w stanie istniejącym.</p>



<p class="wp-block-paragraph">W dziale III Księgi Wieczystej (OS1U/00042453/2) prowadzonej dla nieruchomości oznaczonej numerem ewid. 113 położonej w obrębie 19 miasta Pułtusk wpisano: ograniczone prawo rzeczowe związane z inną nieruchomością – prawo służebności gruntowej przechodu i przejazdu ustanowione na działkach nr 113 i 112 objętych niniejszą księgą i KW Nr 27431 na rzecz każdoczesnego właściciela działki nr 108/6 objętej KW Nr 26845, o treści według §4 aktu notarialnego Rep. A 4326/01 z dnia 31 grudnia 2001 r. sporządzonego przed notariuszem J. Koniecek w jej kancelarii w Pułtusku zawierającego umowę ustanowienia służebności gruntowej (K. 1-9 W KW 39073); po przepisaniu z KW 39073. Wpisano dnia 13 stycznia 2006 r.</p>



<p class="wp-block-paragraph">Lokal mieszkalny można oglądać w każdy wtorek w godz. 10-12, po wcześniejszym potwierdzeniu terminu z Wydziałem Gospodarki Gruntami i Architektury Urzędu Miejskiego w Pułtusku, tel. 23 306 72 37.</p>



<p class="wp-block-paragraph">Burmistrz Miasta Pułtusk może odwołać przetarg z ważnych powodów.</p>



<p class="wp-block-paragraph">Przeprowadzone w dniach 25.11.2025 r. i 24.02.2026 r. przetargi ustne nieograniczone na sprzedaż w/w lokalu mieszkalnego zakończyły się wynikiem negatywnym.</p>



<p class="wp-block-paragraph">Bliższych informacji o przetargu udziela Wydział Gospodarki Gruntami i Architektury Urzędu Miejskiego w Pułtusku pok. nr 37, tel.23 306 72 37.</p>



<div data-wp-interactive="core/file" class="wp-block-file"><object data-wp-bind--hidden="!state.hasPdfPreview" hidden class="wp-block-file__embed" data="https://pultusk.pl/wp-content/uploads/2026/03/UMPultusk__20260331_120645.pdf" type="application/pdf" style="width:100%;height:600px" aria-label="Osadzone z UMPułtusk__20260331_120645."></object><a id="wp-block-file--media-5894bd00-ee64-4b9b-b127-837ec7e93dad" href="https://pultusk.pl/wp-content/uploads/2026/03/UMPultusk__20260331_120645.pdf">UMPułtusk__20260331_120645</a><a href="https://pultusk.pl/wp-content/uploads/2026/03/UMPultusk__20260331_120645.pdf" class="wp-block-file__button wp-element-button" download aria-describedby="wp-block-file--media-5894bd00-ee64-4b9b-b127-837ec7e93dad">Pobierz</a></div>



<p class="wp-block-paragraph"><em>Wydział Gospodarki Gruntami i Architektury</em></p>
`;

const LAND28_URL = "https://pultusk.pl/ogloszenie-o-iii-przetargach/";
const LAND28_TITLE = "OGŁOSZENIE O III PRZETARGACH";
const LAND28_DATE = "2026-06-30T15:47:00";
const LAND28_HTML = `
<p class="wp-block-paragraph">OGŁOSZENIE z dnia 24.06.2026 r.</p>



<h1 class="wp-block-heading">BURMISTRZ MIASTA PUŁTUSK OGŁASZA III PRZETARGI USTNE NIEOGRANICZONE</h1>



<p class="wp-block-paragraph"><strong>na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 28 miasta Pułtusk, stanowiących własność Gminy Pułtusk, objętych księgą wieczystą KW nr 0S1U/00040080/2, wymienionych w poniższej tabeli:</strong></p>



<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td><strong>L.p.</strong></td><td><strong>Oznaczenie</strong> <strong>nieruchomości-</strong> <strong>nr ewid. działek</strong></td><td><strong>Powierzchnia</strong> <strong>ha</strong> <strong>łącznie</strong></td><td><strong>Cena wywoławcza</strong> <strong>zł</strong></td><td><strong>Wadium</strong> <strong>zł</strong></td><td><strong>Godzina przetargu</strong></td></tr><tr><td>1.</td><td>122/6 121/5</td><td>0,0953 ha</td><td>105 000,00</td><td>10 000,00</td><td>godz. 10<sup>30</sup></td></tr><tr><td>2.</td><td>122/7 120/5</td><td>0,1366 ha</td><td>205 000,00</td><td>20 000,00</td><td>godz. 11<sup>00</sup></td></tr></tbody></table></figure>



<p class="wp-block-paragraph">Przedmiotowe nieruchomości położone są na terenie nieobjętym ustaleniami miejscowego planu zagospodarowania przestrzennego.</p>



<p class="wp-block-paragraph">W dniu 01.03.2022 r. Burmistrz Miasta Pułtusk wydał decyzję Nr 38/2022 o warunkach zabudowy dla inwestycji polegającej na budowie 2 budynków mieszkalnych jednorodzinnych wraz z niezbędną infrastrukturą, na terenie działek nr ewid. 121/5, 122/5 (numer działki przed podziałem), 120/5 w obrębie 28 m. Pułtusk.</p>



<p class="wp-block-paragraph">Przetargi przeprowadzone zostaną w dniu 04.08.2026 r. w siedzibie Urzędu Miejskiego w Pułtusku przy ul. Rynek 41, Ratusz, Sala Rady (I piętro), kolejno w godzinach wskazanych w tabeli.</p>



<p class="wp-block-paragraph">Wadium należy wpłacić w formie pieniężnej najpóźniej w dniu 31.07.2026 r. w Punkcie Kasowym<br>w siedzibie Urzędu Miejskiego w Pułtusku (w godz. 8<sup>00</sup>-15<sup>00</sup>)lub na konto Gminy Pułtusk- PKO Bank Polski S.A. Nr 73 1020 1592 0000 2702 0276 3597.</p>



<p class="wp-block-paragraph"><strong>Chcąc uczestniczyć w przetargach na sprzedaż dwóch działek, należy wnieść wadium oddzielnie na każdą z tych nieruchomości. </strong><strong></strong></p>



<p class="wp-block-paragraph"><em>W przetargu mogą brać udział osoby, które wniosą wadium w terminie wyznaczonym w niniejszym ogłoszeniu. Przystąpienie do przetargu wymaga legitymowania się dokumentem potwierdzającym tożsamość. Jeżeli uczestnika przetargu zastępuje inna osoba, winna ona przedstawić pełnomocnictwo z notarialnie poświadczonymi podpisami. W przypadku małżonków, do dokonania czynności przetargowych konieczna jest obecność obojga lub jednego z nich ze stosownym pełnomocnictwem drugiego małżonka, zawierającym zgodę na odpłatne nabycie nieruchomości ze środków pochodzących z majątku wspólnego lub złożenie przez osobę przystępującą do przetargu oświadczenia woli nabycia nieruchomości z majątku odrębnego. W przypadku osoby upoważnionej do reprezentowania osoby prawnej podlegającej wpisowi do Krajowego Rejestru Sądowego wymagane jest okazanie przez osobę upoważnioną do reprezentowania osoby prawnej aktualnego wypisu z KRS. </em><em>Na wypadek nie dokonania przez bank przelewu wadium wpłaconego przez osobę zamierzającą wziąć udział w niniejszym przetargu, zaleca się posiadanie przy sobie dowodu jego wpłaty.</em></p>



<p class="wp-block-paragraph"><strong>W/w nieruchomości są wolne od obciążeń na rzecz osób trzecich, brak wpisów w Działach III i IV księgi wieczystej 0S1U/00040080/2.</strong></p>



<p class="wp-block-paragraph">W dniu 01.03.2016 r. Gmina Pułtusk zawarła umowę dzierżawy, której przedmiotem jest część działki oznaczonej nr ewid. 121/5 położonej w obrębie 28 miasta Pułtusk. Umowa została zawarta na czas nieoznaczony. Zgodnie z wyżej wymienioną umową każda ze stron ma prawo wypowiedzieć umowę z zachowaniem 1- miesięcznego okresu wypowiedzenia ze skutkiem na koniec miesiąca.</p>



<p class="wp-block-paragraph">Wadium wpłacone przez uczestnika, który wygra przetarg zalicza się na poczet ceny sprzedaży nieruchomości. W razie uchylenia się uczestnika, który wygra przetarg od zawarcia umowy notarialnej wadium ulega przepadkowi. Osobom, które nie wygrały przetargu, wadium&nbsp; zostanie zwrócone nie później niż przed upływem 3 dni od dnia zamknięcia przetargu i po pisemnej dyspozycji wpłacającego.</p>



<p class="wp-block-paragraph">Organizator przetargu zawiadomi osobę ustaloną jako Nabywca nieruchomości o miejscu i terminie zawarcia umowy sprzedaży najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargu. W przypadku uchylenia się Nabywcy od zawarcia umowy notarialnej, tj. nie przystąpienia bez usprawiedliwienia do zawarcia umowy w miejscu i terminie podanym w zawiadomieniu lub braku zapłaty&nbsp; ceny nieruchomości do dnia zawarcia umowy, Burmistrz Miasta Pułtusk może odstąpić od zawarcia umowy,<br>a wpłacone wadium nie podlega zwrotowi.</p>



<p class="wp-block-paragraph"><strong>Cena sprzedaży nie może być rozłożona na raty, a dokonanie jej zapłaty wymagane jest jednorazowo najpóźniej<br>w przeddzień zawarcia aktu notarialnego.</strong></p>



<p class="wp-block-paragraph">Przeprowadzone w dniach 03.03.2026 r. i 21.04.2026 r. przetargi ustne nieograniczone na sprzedaż w/w nieruchomości zakończyły się wynikiem negatywnym.</p>



<p class="wp-block-paragraph">Bliższych informacji o przetargu udziela Wydział Gospodarki Gruntami i Architektury Urzędu Miejskiego w Pułtusku, Rynek 41 [pokój nr 37, tel.233067237]. Burmistrz może odwołać przetarg z ważnych powodów.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>



<div class="wp-block-file"><a id="wp-block-file--media-94f821f5-dd32-4a6e-9cc6-e6d361d29c59" href="https://pultusk.pl/wp-content/uploads/2026/06/ogloszenie-o-III-przetargu-obreb-28.pdf">ogłoszenie o III przetargu obręb 28</a><a href="https://pultusk.pl/wp-content/uploads/2026/06/ogloszenie-o-III-przetargu-obreb-28.pdf" class="wp-block-file__button wp-element-button" download aria-describedby="wp-block-file--media-94f821f5-dd32-4a6e-9cc6-e6d361d29c59">Pobierz</a></div>



<div class="wp-block-uagb-image uagb-block-9c8838c6 wp-block-uagb-image--layout-default wp-block-uagb-image--effect-static wp-block-uagb-image--align-none"><figure class="wp-block-uagb-image__figure"><img decoding="async" srcset="https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-6-2-1024x559.jpg ,https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-6-2.jpg 780w, https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-6-2.jpg 360w" sizes="auto, (max-width: 480px) 150px" src="https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-6-2-1024x559.jpg" alt="" class="uag-image-314376195" width="1024" height="559" title="obrazek_wyroznajancy_nowy (6)" loading="lazy" role="img"/></figure></div>



<p class="wp-block-paragraph"><em>Wydział Gospodarki Gruntami i Architektury</em></p>
`;

const LAND20_URL = "https://pultusk.pl/ogloszenie-o-i-przetargu/";
const LAND20_TITLE = "OGŁOSZENIE O I PRZETARGACH";
const LAND20_DATE = "2026-06-30T15:45:35";
const LAND20_HTML = `
<p class="wp-block-paragraph">OGŁOSZENIE z dnia 24.06.2026 r.</p>



<h1 class="wp-block-heading">BURMISTRZ MIASTA PUŁTUSK OGŁASZA I PRZETARGI USTNE NIEOGRANICZONE</h1>



<p class="wp-block-paragraph"><strong>na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 20 miasta Pułtusk, stanowiących własność Gminy Pułtusk, objętych księgą wieczystą KW nr 0S1U/00016474/4, wymienionych w poniższej tabeli:</strong></p>



<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td><strong>L.p.</strong></td><td><strong>Oznaczenie</strong> <strong>nieruchomości-</strong> <strong>nr ewid. działek</strong></td><td><strong>Powierzchnia</strong> <strong>ha</strong></td><td><strong>Cena wywoławcza</strong> <strong>zł</strong></td><td><strong>Wadium</strong> <strong>zł</strong></td><td><strong>Godzina przetargu</strong></td><td><strong>Decyzja o warunkach zabudowy</strong></td></tr><tr><td>1.</td><td>58/18</td><td>0,0709 ha</td><td>262&nbsp;000,00 zł</td><td>26&nbsp;000,00 zł</td><td>godz. 9<sup>00</sup></td><td>W dniu 14.01.2026 r. została wydana decyzja Nr 23/2026 o warunkach zabudowy dla inwestycji polegającej na budowie wolnostojącego, nie więcej niż dwukondygnacyjnego budynku mieszkalnego. &nbsp;</td></tr><tr><td>2.</td><td>58/19</td><td>0,0725 ha</td><td>268&nbsp;000,00 zł</td><td>26&nbsp;000,00 zł</td><td>godz. 9<sup>30</sup></td><td>W dniu 14.01.2026 r. została wydana decyzja Nr 18/2026 o warunkach zabudowy dla inwestycji polegającej na budowie wolnostojącego, nie więcej niż dwukondygnacyjnego budynku mieszkalnego. &nbsp;</td></tr><tr><td>3.</td><td>58/20</td><td>0,0727 ha</td><td>268&nbsp;500,00 zł</td><td>26&nbsp;000,00 zł</td><td>godz. 10<sup>00</sup></td><td>W dniu 14.01.2026 r. została wydana decyzja Nr 19/2026 o warunkach zabudowy dla inwestycji polegającej na budowie wolnostojącego, nie więcej niż dwukondygnacyjnego budynku mieszkalnego. &nbsp;</td></tr></tbody></table></figure>



<p class="wp-block-paragraph">Nieruchomości znajdują się na terenie zespołu urbanistyczno-architektonicznego miasta Pułtusk, wpisanego do rejestru zabytków.</p>



<p class="wp-block-paragraph">Przetargi przeprowadzone zostaną w dniu 04.08.2026 r. w siedzibie Urzędu Miejskiego w Pułtusku przy ul. Rynek 41, Ratusz, Sala Rady<br>(I piętro), kolejno w godzinach wskazanych w tabeli.</p>



<p class="wp-block-paragraph">Wadium należy wpłacić w formie pieniężnej najpóźniej w dniu 31.07.2026 r. w Punkcie Kasowym w siedzibie Urzędu Miejskiego w Pułtusku (w godz. 8<sup>00</sup>-15<sup>00</sup>)lub na konto Gminy Pułtusk- PKO Bank Polski S.A. Nr 73 1020 1592 0000 2702 0276 3597, ze wskazaniem, którego przetargu dotyczy wpłata.</p>



<p class="wp-block-paragraph"><strong>Chcąc uczestniczyć w przetargach na sprzedaż jednej lub więcej działek, należy wnieść wadium oddzielnie na każdą z tych nieruchomości.</strong></p>



<p class="wp-block-paragraph"><em>W przetargu mogą brać udział osoby, które wniosą wadium w terminie wyznaczonym w niniejszym ogłoszeniu. Przystąpienie do przetargu wymaga legitymowania się dokumentem potwierdzającym tożsamość. Jeżeli uczestnika przetargu zastępuje inna osoba, winna ona przedstawić pełnomocnictwo z notarialnie poświadczonymi podpisami. W przypadku małżonków, do dokonania czynności przetargowych konieczna jest obecność obojga lub jednego z nich ze stosownym pełnomocnictwem drugiego małżonka, zawierającym zgodę na odpłatne nabycie nieruchomości ze środków pochodzących z majątku wspólnego lub złożenie przez osobę przystępującą do przetargu oświadczenia woli nabycia nieruchomości z majątku odrębnego. W przypadku osoby upoważnionej do reprezentowania osoby prawnej podlegającej wpisowi do Krajowego Rejestru Sądowego wymagane jest okazanie przez osobę upoważnioną do reprezentowania osoby prawnej aktualnego wypisu z KRS. </em><em>Na wypadek nie dokonania przez bank przelewu wadium wpłaconego przez osobę zamierzającą wziąć udział w niniejszych przetargach, zaleca się posiadanie przy sobie dowodu jego wpłaty.</em></p>



<p class="wp-block-paragraph"><strong>W/w nieruchomości są wolne od obciążeń na rzecz osób trzecich i nie są przedmiotem zobowiązań.&nbsp;</strong></p>



<p class="wp-block-paragraph">Wadium wpłacone przez uczestnika, który wygra przetarg zalicza się na poczet ceny sprzedaży nieruchomości. W razie uchylenia się uczestnika, który wygra przetarg od zawarcia umowy notarialnej wadium ulega przepadkowi. Osobom, które nie wygrały przetargu, wadium&nbsp; zostanie zwrócone nie później niż przed upływem 3 dni od dnia zamknięcia przetargu i po pisemnej dyspozycji wpłacającego.</p>



<p class="wp-block-paragraph">Organizator przetargu zawiadomi osobę ustaloną jako Nabywca nieruchomości o miejscu i terminie zawarcia umowy sprzedaży najpóźniej w ciągu 21 dni od dnia rozstrzygnięcia przetargu. W przypadku uchylenia się Nabywcy od zawarcia umowy notarialnej, tj. nie przystąpienia bez usprawiedliwienia do zawarcia umowy<br>w miejscu i terminie podanym w zawiadomieniu lub braku zapłaty ceny nieruchomości do dnia zawarcia umowy, Burmistrz Miasta Pułtusk może odstąpić od zawarcia umowy, a wpłacone wadium nie podlega zwrotowi.</p>



<p class="wp-block-paragraph"><strong>Cena sprzedaży nie może być rozłożona na raty, a dokonanie jej zapłaty wymagane jest jednorazowo najpóźniej w przeddzień zawarcia aktu notarialnego.</strong></p>



<p class="wp-block-paragraph">Bliższych informacji o przetargu udziela Wydział Gospodarki Gruntami i Architektury Urzędu Miejskiego w Pułtusku, Rynek 41 [pokój nr 37, tel.233067237]. Burmistrz może odwołać przetarg z ważnych powodów.</p>



<div class="wp-block-file"><a id="wp-block-file--media-c785bc9e-cf0d-4e4e-b28f-d7ef8dab891e" href="https://pultusk.pl/wp-content/uploads/2026/06/ogloszenie-o-I-przetargu-obreb-20.pdf">ogłoszenie o I przetargu obręb 20</a><a href="https://pultusk.pl/wp-content/uploads/2026/06/ogloszenie-o-I-przetargu-obreb-20.pdf" class="wp-block-file__button wp-element-button" download aria-describedby="wp-block-file--media-c785bc9e-cf0d-4e4e-b28f-d7ef8dab891e">Pobierz</a></div>



<div class="wp-block-uagb-image uagb-block-bb727b46 wp-block-uagb-image--layout-default wp-block-uagb-image--effect-static wp-block-uagb-image--align-none"><figure class="wp-block-uagb-image__figure"><img decoding="async" srcset="https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-8-2-1024x559.jpg ,https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-8-2.jpg 780w, https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-8-2.jpg 360w" sizes="auto, (max-width: 480px) 150px" src="https://pultusk.pl/wp-content/uploads/2026/06/obrazek_wyroznajancy_nowy-8-2-1024x559.jpg" alt="" class="uag-image-314376199" width="1024" height="559" title="obrazek_wyroznajancy_nowy (8)" loading="lazy" role="img"/></figure></div>



<p class="wp-block-paragraph"><em>Wydział Gospodarki Gruntami i Architektury </em></p>



<p class="wp-block-paragraph"></p>
`;

const LEASE_URL = "https://pultusk.pl/nabor-wnioskow-o-najem-lokalu-mieszkalnego-w-budynku-przy-al-tysiaclecia-2a/";
const LEASE_TITLE = "Nabór wniosków o najem lokalu mieszkalnego w budynku przy Al. Tysiąclecia 2A";
const LEASE_DATE = "2025-05-28T13:14:02";
const LEASE_HTML = `
<p class="wp-block-paragraph">Urząd Miejski w Pułtusku informuje, że zgodnie z Zarządzeniem Nr 186/2025 Burmistrza Miasta Pułtusk z dnia 27 maja 2025r. został ogłoszony nabór wniosków o najem lokalu mieszkalnego w budynku przy Al. Tysiąclecia 2A. </p>



<p class="wp-block-paragraph">Wnioski należy składać  w terminie <strong>od 30 maja 2025 r. do 30 czerwca 2025 r.</strong> w biurze podawczym Urzędu Miejskiego w Pułtusku ul. Rynek 41. </p>



<p class="wp-block-paragraph">Druk wniosku można pobrać ze strony (<a href="https://bip.pultusk.pl/kategorie/177-najem-lokali/artykuly/4416-wniosek-o-najem-lokalu-mieszkalnego-w-budynku-przy-al-tysiaclecia-2a?lang=PL">wniosek o najem</a>) oraz w budynku Urzędu Miejskiego przy ul. Rynek 13.</p>



<p class="wp-block-paragraph"><em>Wydział Gospodarki Komunalnej, Rolnictwa i Ochrony Środowiska<br>Zespół do spraw Gospodarki Mieszkaniowej</em></p>



<p class="wp-block-paragraph"></p>
`;

const WYKAZ_TITLE = "WYKAZ NIERUCHOMOŚCI PRZEZNACZONEJ DO SPRZEDAŻY POŁOŻONEJ W MIEJSCOWOŚCI GŁOWNO";

// Real captured intro-paragraph text (obręb 28, rounds I and II — the two
// PRIOR, now-superseded rounds of the SAME land bundle LAND28_HTML is round
// III of), used for roundFromText's 3 real body shapes: an <h1> heading
// (LAND28/LAND20 above), a plain body PARAGRAPH (round I, below,
// https://pultusk.pl/sprzedaz-nieruchomosci-niezabudowanych-polozonych-w-obrebie-28-w-pultusku-ogloszenie/),
// and an <h1> reached via a news-style write-up post (round II, below,
// https://pultusk.pl/ii-przetargi-ustne-w-pultusku-nieruchomosci-gminne-na-sprzedaz/).
// Derived programmatically (see gen-test.mjs) — not hand-transcribed.
const LAND_OBREB28_ROUND_I_INTRO = "Burmistrz Miasta Pułtusk ogłasza I PRZETARGI USTNE NIEOGRANICZONE na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 28 miasta Pułtusk, stanowiących własność Gminy Pułtusk, objętych księgą wieczystą KW nr 0S1U/00040080/2, wymienionych w poniższej tabeli:";
const LAND_OBREB28_ROUND_II_INTRO = "OGŁOSZENIE z dnia 10.03.2026 r. BURMISTRZ MIASTA PUŁTUSK OGŁASZA II PRZETARGI USTNE NIEOGRANICZONE na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 28 miasta Pułtusk, stanowiących własność Gminy Pułtusk, objętych księgą wieczystą KW nr 0S1U/00040080/2, wymienionych w poniższej tabeli:";
// The SAME extraction (introText) applied to the two full-HTML fixtures
// above, for a direct real-<h1>-heading round test (LAND28_HTML/LAND20_HTML
// already prove this end-to-end via parseLandAnnouncements further down).
const LAND_OBREB28_ROUND_III_INTRO = "OGŁOSZENIE z dnia 24.06.2026 r. BURMISTRZ MIASTA PUŁTUSK OGŁASZA III PRZETARGI USTNE NIEOGRANICZONE na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 28 miasta Pułtusk, stanowiących własność Gminy Pułtusk, objętych księgą wieczystą KW nr 0S1U/00040080/2, wymienionych w poniższej tabeli:";
const LAND_OBREB20_ROUND_I_INTRO = "OGŁOSZENIE z dnia 24.06.2026 r. BURMISTRZ MIASTA PUŁTUSK OGŁASZA I PRZETARGI USTNE NIEOGRANICZONE na sprzedaż nieruchomości niezabudowanych, położonych w obrębie 20 miasta Pułtusk, stanowiących własność Gminy Pułtusk, objętych księgą wieczystą KW nr 0S1U/00016474/4, wymienionych w poniższej tabeli:";
// Real captured flat intro text + the "Opis lokalu" table cell — both
// derived programmatically from FLAT_HTML (see gen-test.mjs), used for the
// standalone aptFromText/streetBuildingFromText/areaFromDescCell unit tests.
const FLAT_INTRO = "Na sprzedaż lokalu mieszkalnego nr 25 w budynku przy ulicy Na Skarpie 3 w Pułtusku wraz z udziałem w nieruchomości wspólnej, dla którego Sąd Rejonowy w Pułtusku IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą nr OS1U/00044602/6.";
const FLAT_DESC_CELL = "Lokal mieszkalny o powierzchni 73,00 m 2 , mieści się na drugim piętrze w budynku przy ul. Na Skarpie 3 w Pułtusku.W skład lokalu mieszkalnego wchodzą cztery pokoje, kuchnia, przedpokój, łazienka i wc.";

// Real captured text (stripped) of the round-I predecessor of Na Skarpie
// 3/25 — a short announcement with NO price table (never reaches
// parseFlatAnnouncement), used to groundtruth the word-ordinal round branch
// + auctionDateFromText's "date BEFORE odbędzie się" fallback. Derived
// programmatically (see gen-test.mjs) from the real captured content.rendered
// — not hand-transcribed.
const PIERWSZY_PRZETARG_TEXT = "Burmistrz Miasta Pułtusk niniejszym informuje, że w dniu 25.11.2025 r. o godz. 10 00 w siedzibie Urzędu Miejskiego w Pułtusku odbędzie się pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego Nr 25 o powierzchni 73,00 m 2 w budynku przy ul. Na Skarpie 3. W skład lokalu mieszkalnego wchodzą cztery pokoje, kuchnia, przedpokój, łazienka i wc Szczegółowe informacje dotyczące przetargu dostępne są stronie: https://bip.pultusk.pl/kategorie/45-zawiadomienia-obwieszczenia-i-ogloszenia/artykuly/5220-ogloszenie-o-i-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-nr-25-w-budynku-przy-ulicy-na-skarpie-3-w-pultusku?lang=PL Wydział Gospodarki Gruntami i Architektury";

// ------------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands + grosze tail, with and without inline "zł"', () => {
  assert.equal(parsePLN('300 000,00'), 300000);
  assert.equal(parsePLN('105 000,00'), 105000);
  assert.equal(parsePLN('262 000,00 zł'), 262000);
  assert.equal(parsePLN('30 000,00'), 30000);
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

test('parseArea: comma-decimal', () => {
  assert.equal(parseArea('73,00'), 73);
  assert.equal(parseArea('0,0953'), 0.0953);
  assert.equal(parseArea(null), null);
});

test('haToM2: hectares -> m2 (real land-table values)', () => {
  assert.equal(haToM2('0,0953 ha'), 953);
  assert.equal(haToM2('0,1366 ha'), 1366);
  assert.equal(haToM2('0,0709 ha'), 709);
  assert.equal(haToM2(null), null);
});

test('roundFromText: <h1> "ogłasza III/I PRZETARGI" body heading (real intro text of LAND28_HTML / LAND20_HTML)', () => {
  assert.equal(roundFromText(LAND_OBREB28_ROUND_III_INTRO), 3);
  assert.equal(roundFromText(LAND_OBREB20_ROUND_I_INTRO), 1);
});

test('roundFromText: plain-paragraph "ogłasza I PRZETARGI" (real obręb 28 round I intro, different template than the <h1> shape)', () => {
  assert.equal(roundFromText(LAND_OBREB28_ROUND_I_INTRO), 1);
});

test('roundFromText: "OGŁASZA II PRZETARGI" reached via a news-style write-up (real obręb 28 round II intro)', () => {
  assert.equal(roundFromText(LAND_OBREB28_ROUND_II_INTRO), 2);
});

test('roundFromText: "OGŁOSZENIE O <N> PRZETARGACH" real title shape (LAND28_TITLE / LAND20_TITLE)', () => {
  assert.equal(roundFromText(LAND28_TITLE), 3);
  assert.equal(roundFromText(LAND20_TITLE), 1);
});

test('roundFromText: "ogłasza III PRZETARG" (flat title shape, singular)', () => {
  assert.equal(roundFromText(FLAT_TITLE), 3);
});

test('roundFromText: word ordinal "pierwszy przetarg" (real fixture, no Roman numeral at all)', () => {
  assert.equal(roundFromText(PIERWSZY_PRZETARG_TEXT), 1);
});

test('roundFromText: no przetarg anchor -> null', () => {
  assert.equal(roundFromText('coś zupełnie innego'), null);
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});

test('auctionDateFromText: "odbędzie się w dniu DD.MM.YYYY" (flat shape)', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 05.05.2026 r. o godz. 9'), '2026-05-05');
});

test('auctionDateFromText: "przeprowadzone zostaną w dniu DD.MM.YYYY" (land shape, obręb 20/28 round III)', () => {
  assert.equal(auctionDateFromText('Przetargi przeprowadzone zostaną w dniu 04.08.2026 r. w siedzibie'), '2026-08-04');
});

test('auctionDateFromText: "przeprowadzone zostaną DD.MM.YYYY" with no "w dniu" (real obręb 28 round I shape)', () => {
  assert.equal(auctionDateFromText('Przetargi przeprowadzone zostaną 03.03.2026 r. w siedzibie Urzędu'), '2026-03-03');
});

test('auctionDateFromText: date BEFORE "odbędzie się" (real "pierwszy przetarg" fixture)', () => {
  assert.equal(auctionDateFromText(PIERWSZY_PRZETARG_TEXT), '2025-11-25');
});

test('auctionDateFromText: no date -> null', () => {
  assert.equal(auctionDateFromText('brak daty'), null);
});

test('kwNumberFromText: "księgę wieczystą nr X" (real flat intro) and "KW nr X" (real land intro, incl. the real "0S1U" leading-zero quirk)', () => {
  assert.equal(kwNumberFromText(FLAT_INTRO), 'OS1U/00044602/6');
  assert.equal(kwNumberFromText(LAND_OBREB28_ROUND_I_INTRO), '0S1U/00040080/2');
  assert.equal(kwNumberFromText('brak'), null);
});

test('obrebFromText: "w obrębie N miasta Pułtusk" (real land intros, obręb 28 and obręb 20)', () => {
  assert.equal(obrebFromText(LAND_OBREB28_ROUND_I_INTRO), '28');
  assert.equal(obrebFromText(LAND_OBREB20_ROUND_I_INTRO), '20');
  assert.equal(obrebFromText('brak'), null);
});

test('aptFromText / streetBuildingFromText: real flat intro text (FLAT_HTML, via introText)', () => {
  assert.equal(aptFromText(FLAT_INTRO), '25');
  assert.equal(streetBuildingFromText(FLAT_INTRO), 'Na Skarpie 3');
});

test('areaFromDescCell: real "Opis lokalu" table cell (no "użytkowej" qualifier on this source)', () => {
  assert.equal(areaFromDescCell(FLAT_DESC_CELL), 73);
  assert.equal(areaFromDescCell('brak'), null);
});

test('parcelsFromCell: single and bundled parcel numbers', () => {
  assert.deepEqual(parcelsFromCell('58/18'), ['58/18']);
  assert.deepEqual(parcelsFromCell('122/6 121/5'), ['122/6', '121/5']);
  assert.deepEqual(parcelsFromCell('brak'), []);
});

test('isLeaseTitle / isWykazTitle: real titles', () => {
  assert.equal(isLeaseTitle(LEASE_TITLE), true);
  assert.equal(isLeaseTitle(FLAT_TITLE), false);
  assert.equal(isWykazTitle(WYKAZ_TITLE), true);
  assert.equal(isWykazTitle(FLAT_TITLE), false);
  assert.equal(isWykazTitle(LAND28_TITLE), false);
});

// ----------------------------------------------------------------- table extraction

test('extractTables + findPricedTable: real flat table (6 cols, "Opis lokalu" present)', () => {
  const tables = extractTables(FLAT_HTML);
  assert.equal(tables.length, 1);
  assert.equal(tables[0][0].length, 6);
  assert.ok(tables[0][0].some((h) => /opis\s+lokalu/i.test(h)));

  const priced = findPricedTable(FLAT_HTML);
  assert.ok(priced);
  assert.equal(priced.dataRows.length, 1);
  assert.ok(/cena\s+wywo[łl]awcza/i.test(priced.header[priced.priceCol]));
});

test('extractTables + findPricedTable: real land table (obręb 28, 6 cols, no "Opis lokalu")', () => {
  const tables = extractTables(LAND28_HTML);
  assert.equal(tables.length, 1);
  assert.equal(tables[0][0].length, 6);
  assert.ok(!tables[0][0].some((h) => /opis\s+lokalu/i.test(h)));

  const priced = findPricedTable(LAND28_HTML);
  assert.ok(priced);
  assert.equal(priced.dataRows.length, 2);
});

test('extractTables: real land table (obręb 20) has 7 columns (extra "Decyzja o warunkach zabudowy")', () => {
  const tables = extractTables(LAND20_HTML);
  assert.equal(tables.length, 1);
  assert.equal(tables[0][0].length, 7);
  assert.equal(tables[0].length, 4); // header + 3 parcel rows
});

test('findPricedTable: no table -> null', () => {
  assert.equal(findPricedTable('<p>no table here</p>'), null);
  assert.equal(findPricedTable(''), null);
});

// --------------------------------------------------------------- flat announcement

test('parseFlatAnnouncement: Na Skarpie 3/25 round III — full record matches live data', () => {
  const post = { title: FLAT_TITLE, content: FLAT_HTML, date: FLAT_DATE, link: FLAT_URL };
  const r = parseFlatAnnouncement(post);
  assert.ok(r, 'should return a record');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'na skarpie|3|25');
  assert.equal(r.address.street, 'Na Skarpie');
  assert.equal(r.address.building, '3');
  assert.equal(r.address.apt, '25');
  assert.equal(r.address_raw, 'Na Skarpie 3/25');
  assert.equal(r.area_m2, 73);
  assert.equal(r.starting_price_pln, 300000);
  assert.equal(r.wadium_pln, 30000);
  assert.equal(r.auction_date, '2026-05-05');
  assert.equal(r.round, 3, 'round must come from the TITLE fallback — the body never restates it');
  assert.equal(r.kw_nr, 'OS1U/00044602/6');
  assert.equal(r.published_date, '2026-03-31');
  assert.equal(r.detail_url, FLAT_URL);
  assert.equal(r.detail_pdf, 'https://pultusk.pl/wp-content/uploads/2026/03/UMPultusk__20260331_120645.pdf');
});

test('parseFlatAnnouncement: no priced table -> null', () => {
  const post = { title: 'x', content: '<p>no table</p>', date: '2026-01-01', link: 'https://x' };
  assert.equal(parseFlatAnnouncement(post), null);
});

test('parseFlatAnnouncement: null post -> null', () => {
  assert.equal(parseFlatAnnouncement(null), null);
});

// --------------------------------------------------------------- land announcements

test('parseLandAnnouncements: obręb 28 round III — 2 bundled-parcel records, bare (no "zł") price cells', () => {
  const post = { title: LAND28_TITLE, content: LAND28_HTML, date: LAND28_DATE, link: LAND28_URL };
  const recs = parseLandAnnouncements(post);
  assert.equal(recs.length, 2);

  const [a, b] = recs;
  assert.equal(a.kind, 'grunt');
  assert.equal(a.dzialka_nr, '122/6, 121/5');
  assert.equal(a.area_m2, 953);
  assert.equal(a.starting_price_pln, 105000);
  assert.equal(a.wadium_pln, 10000);

  assert.equal(b.dzialka_nr, '122/7, 120/5');
  assert.equal(b.area_m2, 1366);
  assert.equal(b.starting_price_pln, 205000);
  assert.equal(b.wadium_pln, 20000);

  for (const r of recs) {
    assert.equal(r.address_raw, 'obręb 28 m. Pułtusk');
    assert.equal(r.auction_date, '2026-08-04');
    assert.equal(r.round, 3);
    assert.equal(r.kw_nr, '0S1U/00040080/2');
    assert.equal(r.published_date, '2026-06-30');
    assert.equal(r.detail_url, LAND28_URL);
    assert.equal(r.detail_pdf, 'https://pultusk.pl/wp-content/uploads/2026/06/ogloszenie-o-III-przetargu-obreb-28.pdf');
  }
});

test('parseLandAnnouncements: obręb 20 round I — 3 single-parcel records, "zł"-suffixed price cells', () => {
  const post = { title: LAND20_TITLE, content: LAND20_HTML, date: LAND20_DATE, link: LAND20_URL };
  const recs = parseLandAnnouncements(post);
  assert.equal(recs.length, 3);

  assert.deepEqual(recs.map((r) => r.dzialka_nr), ['58/18', '58/19', '58/20']);
  assert.deepEqual(recs.map((r) => r.area_m2), [709, 725, 727]);
  assert.deepEqual(recs.map((r) => r.starting_price_pln), [262000, 268000, 268500]);
  assert.deepEqual(recs.map((r) => r.wadium_pln), [26000, 26000, 26000]);

  for (const r of recs) {
    assert.equal(r.kind, 'grunt');
    assert.equal(r.address_raw, 'obręb 20 m. Pułtusk');
    assert.equal(r.auction_date, '2026-08-04');
    assert.equal(r.round, 1);
    assert.equal(r.kw_nr, '0S1U/00016474/4');
    assert.equal(r.detail_pdf, 'https://pultusk.pl/wp-content/uploads/2026/06/ogloszenie-o-I-przetargu-obreb-20.pdf');
  }
});

test('parseLandAnnouncements: no priced table -> []', () => {
  const post = { title: 'x', content: '<p>no table</p>', date: '2026-01-01', link: 'https://x' };
  assert.deepEqual(parseLandAnnouncements(post), []);
});

test('parseLandAnnouncements: null post -> []', () => {
  assert.deepEqual(parseLandAnnouncements(null), []);
});

// ------------------------------------------------------------- top-level dispatcher

test('parseAnnouncementPost: routes the real flat post to a 1-element mieszkalny array', () => {
  const post = { title: FLAT_TITLE, content: FLAT_HTML, date: FLAT_DATE, link: FLAT_URL };
  const recs = parseAnnouncementPost(post);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'mieszkalny');
  assert.equal(recs[0].address.key, 'na skarpie|3|25');
});

test('parseAnnouncementPost: routes the real land post to a 2-element grunt array', () => {
  const post = { title: LAND28_TITLE, content: LAND28_HTML, date: LAND28_DATE, link: LAND28_URL };
  const recs = parseAnnouncementPost(post);
  assert.equal(recs.length, 2);
  assert.ok(recs.every((r) => r.kind === 'grunt'));
});

test('parseAnnouncementPost: the real LEASE post is skipped (isLeaseTitle guard) even though classifyKind alone would call it mieszkalny', () => {
  const post = { title: LEASE_TITLE, content: LEASE_HTML, date: LEASE_DATE, link: LEASE_URL };
  assert.deepEqual(parseAnnouncementPost(post), []);
});

test('parseAnnouncementPost: a WYKAZ-titled post is skipped (isWykazTitle guard) regardless of body content', () => {
  // Real title (a real wykaz post genuinely does carry a priced table with no
  // auction date — see WYKAZ_TITLE's post); body here is synthetic filler
  // that deliberately WOULD parse as a priced flat/land table if the guard
  // didn't fire first, to prove the title guard wins regardless of body.
  const post = { title: WYKAZ_TITLE, content: '<table><tr><td>Cena wywoławcza</td></tr><tr><td>301 000,00</td></tr></table>', date: '2026-06-30', link: 'https://pultusk.pl/wykaz-nieruchomosci-przeznaczonej-do-sprzedazy-polozonej-w-miejscowosci-glowno/' };
  assert.deepEqual(parseAnnouncementPost(post), []);
});

test('parseAnnouncementPost: unrelated news (real title, "OSTRZEŻENIE O SILNYM WIETRZE", 2026-07-08) -> []', () => {
  // Body is synthetic filler (only the title was checked live) — the guard
  // this proves is classifyKind returning something other than mieszkalny/
  // grunt for ordinary city-news content, which doesn't depend on body text.
  const post = { title: 'OSTRZEŻENIE O SILNYM WIETRZE', content: '<p>ostrzeżenie meteorologiczne</p>', date: '2026-07-08', link: 'https://pultusk.pl/ostrzezenie-o-silnym-wietrze-8/' };
  assert.deepEqual(parseAnnouncementPost(post), []);
});

test('parseAnnouncementPost: null post -> []', () => {
  assert.deepEqual(parseAnnouncementPost(null), []);
});

// ----------------------------------------------------------------------- result stub

test('parseResultDoc: stub returns [] for any input (no achieved-price stream on pultusk.pl)', () => {
  assert.deepEqual(parseResultDoc('cena osiągnięta 350000 zł', '2026-07-30', 'https://example.com'), []);
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});
