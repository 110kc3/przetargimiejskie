// Kalisz parser tests. Fixtures are REAL board HTML rows + REAL PDF text
// (pdftotext -layout) this build live-fetched from bip.kalisz.pl on
// 2026-07-16:
//   - BOARD_ITEMS_HTML — real raw HTML rows from the live "Sprzedaż,
//     dzierżawa nieruchomości" board (r_ogl=SN), items #4, #9, #13 in their
//     real board numbering, concatenated — groundtruths
//     itemsFromBoardHtml()'s title/pdfUrl/ref extraction. Item #9 is the
//     board's OWN mismatched entry (see crawl.js header): its title claims a
//     Częstochowska 7/6A flat result, but its real linked PDF
//     (03072026do24072026.pdf) is an unrelated lease wykaz — kept here to
//     prove the crawler extracts the raw href/title/ref faithfully
//     regardless of what the PDF actually contains (routing/classification
//     happens on the PDF TEXT, tested separately below, never on this title).
//   - GORNOSLASKA_EXCERPT — ul. Górnośląska 42/11A, flat, II przetarg ustny
//     OGRANICZONY po obniżonej cenie, area 14,63 m², price 43.000,00 zł,
//     auction 2026-07-30 (excerpt: subject + termin + area + cena wywoławcza
//     sections of the real 6-page PDF, 1706gornoslaska42lok11a.pdf).
//   - PULASKIEGO_EXCERPT — ul. Kazimierza Pułaskiego 14/2 (the spike's own
//     cited fixture, still live 2026-07-16), flat, I przetarg ustny
//     NIEOGRANICZONY, area 43,60 m², price 130.000,00 zł, auction
//     2024-08-22 (excerpt of the real 8-page PDF,
//     20240712-wgm_6840_01_0029_2022_ad.pdf). Deliberately has the OPPOSITE
//     clause order from Górnośląska ("przy ul. X ... o powierzchni Y" vs
//     "o powierzchni Y ... przy ul. X"), proving addressFromText/
//     areaFromText are order-agnostic.
//   - GARNCARSKA_RESULT — ul. Garncarska 9A, RESULT notice (full real
//     1-page PDF text, 1307garncarska9a.pdf), kind zabudowana (a built
//     property, not a flat — "zabudowanej nieruchomości", no "lokal
//     mieszkalny"), I przetarg ustny nieograniczony, cena wywoławcza
//     350.000,00 zł, SOLD above asking at 353.500,00 zł, "Przetarg
//     zakończył się wynikiem pozytywnym."
//   - CZESTOCHOWSKA_MISMATCH — the full real 1-page PDF actually linked from
//     board item #9 (03072026do24072026.pdf): a WYKAZ (lease designation)
//     for ul. Wojciecha z Brudzewa, completely unrelated to item #9's own
//     board title. Proves isAnnouncement/isResultNotice correctly reject it
//     (neither an announcement nor a result) even though the board title
//     claimed it was a flat result notice.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { itemsFromBoardHtml } from '../src/cities/kalisz/crawl.js';
import {
  isAuctionSaleDoc,
  isAnnouncement,
  isResultNotice,
  addressFromText,
  roundFromText,
  auctionDateFromText,
  achievedPriceFromText,
  isPositiveOutcome,
  isNegativeOutcome,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/kalisz/parse.js';

const BOARD_ITEMS_HTML = `<td width=25><font color='#000080'><strong>4.</strong></font></td><td>Informacja o wyniku pierwszego przetargu ustnego nieograniczonego na sprzedaż prawa własności zabudowanej nieruchomości, położonej w Kaliszu przy ulicy Garncarskiej 9a. <br /><br /></td></tr><tr><td width=15>&nbsp;</td><td><a href="./ogloszenia/sn/1307garncarska9a.pdf"><img src="./grafika/pdf_icon.gif"border="0"alt="pobierz ogłoszenie"><strong>Pobierz</strong></a><div id="ogl_zalaczniki180699269"style="display:none;"><br/><strong>Załączniki do ogłoszenia:</strong><div align="right"><img src="./grafika/ogl_close.gif"width="16px"height="16px"border="0"alt="Zamknij załączniki do ogłoszenia"  onclick="hide('ogl_zalaczniki180699269')"   ><p><a href="./ogloszenia/sn/"></a></p></div></div><div style="text-align:right"><a href="javascript:news_print('index.php?id=1&o_id=180699269&o_typ=SN')"onmouseout="hide(180699269)"><img src="./grafika/print_32px.gif" alt="Drukuj ogłoszenie o numerze: 180699269" title="Drukuj ogłoszenie o numerze: 180699269"></a></div><div id="ogl_info180699269"height="120px"style="display:block;"><font size="-1"><strong><u>Informacje o ogłoszeniu:</u></strong></font>
	      <p style="font-size:11px;color:#000080;">Informację wytworzył(-a):&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">Krystian Kinastowski</span>&nbsp;&nbsp;&nbsp;Data wytworzenia:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">09-07-2026 </span><br/>Ogłoszenie wprowadził(-a):&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">Góral Aleksander</span>&nbsp;&nbsp;&nbsp;Data wprowadzenia:&nbsp;&nbsp;&nbsp;<span style="font-size:11px;font-weight:bold;color:#000000;">13-07-2026 </span><br/>
	    Na stronie biuletynu od:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">13-07-2026 </span>&nbsp;&nbsp;&nbsp;do&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">20-07-2026 </span><br />Na podstawie:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">WGM.6840.01.0039.2023.AW</span><br/></p></div><tr class="p"align="justify"valign="top"><td colspan="2"><hr size="1px"color='#000080'></td></tr><tr class=p align=justify valign=top><td width=25><font color='#000080'><strong>9.</strong></font></td><td>Informacja o wyniku II przetargu ustnego ograniczonego na sprzedaż prawa własności lokalu mieszkalnego, położonego w Kaliszu przy ul. Częstochowskiej 7/6A <br /><br /></td></tr><tr><td width=15>&nbsp;</td><td><a href="./ogloszenia/sn/03072026do24072026.pdf"><img src="./grafika/pdf_icon.gif"border="0"alt="pobierz ogłoszenie"><strong>Pobierz</strong></a><div id="ogl_zalaczniki180699205"style="display:none;"><br/><strong>Załączniki do ogłoszenia:</strong><div align="right"><img src="./grafika/ogl_close.gif"width="16px"height="16px"border="0"alt="Zamknij załączniki do ogłoszenia"  onclick="hide('ogl_zalaczniki180699205')"   ><p><a href="./ogloszenia/sn/"></a></p></div></div><div style="text-align:right"><a href="javascript:news_print('index.php?id=1&o_id=180699205&o_typ=SN')"onmouseout="hide(180699205)"><img src="./grafika/print_32px.gif" alt="Drukuj ogłoszenie o numerze: 180699205" title="Drukuj ogłoszenie o numerze: 180699205"></a></div><div id="ogl_info180699205"height="120px"style="display:block;"><font size="-1"><strong><u>Informacje o ogłoszeniu:</u></strong></font>
	      <p style="font-size:11px;color:#000080;">Informację wytworzył(-a):&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">Krystian Kinastowski</span>&nbsp;&nbsp;&nbsp;Data wytworzenia:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">02-07-2026 </span><br/>Ogłoszenie wprowadził(-a):&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">Góral Aleksander</span>&nbsp;&nbsp;&nbsp;Data wprowadzenia:&nbsp;&nbsp;&nbsp;<span style="font-size:11px;font-weight:bold;color:#000000;">02-07-2026 </span><br/>
	    Na stronie biuletynu od:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">03-07-2026 </span>&nbsp;&nbsp;&nbsp;do&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">24-07-2026 </span><br />Na podstawie:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">WGM.6845.01.0008.2026.AM </span><br/></p></div><tr class="p"align="justify"valign="top"><td colspan="2"><hr size="1px"color='#000080'></td></tr><tr class=p align=justify valign=top><td width=25><font color='#000080'><strong>13.</strong></font></td><td>Ogłoszenie i informacja o sprzedaży w drodze II przetargu ustnego ograniczonego, po obniżonej cenie, prawa własności lokalu mieszkalnego nr 11A o powierzchni 14,63 m2, usytuowanego w budynku przy ul. Górnośląskiej 42 w Kaliszu, wraz z udziałem 176/10000 części w nieruchomości wspólnej, którą stanowi grunt oraz części budynku i urządzenia, które nie służą wyłącznie do użytku właścicieli lokali.
<br /><br /></td></tr><tr><td width=15>&nbsp;</td><td><a href="./ogloszenia/sn/1706gornoslaska42lok11a.pdf"><img src="./grafika/pdf_icon.gif"border="0"alt="pobierz ogłoszenie"><strong>Pobierz</strong></a><div id="ogl_zalaczniki180699123"style="display:none;"><br/><strong>Załączniki do ogłoszenia:</strong><div align="right"><img src="./grafika/ogl_close.gif"width="16px"height="16px"border="0"alt="Zamknij załączniki do ogłoszenia"  onclick="hide('ogl_zalaczniki180699123')"   ><p><a href="./ogloszenia/sn/"></a></p></div></div><div style="text-align:right"><a href="javascript:news_print('index.php?id=1&o_id=180699123&o_typ=SN')"onmouseout="hide(180699123)"><img src="./grafika/print_32px.gif" alt="Drukuj ogłoszenie o numerze: 180699123" title="Drukuj ogłoszenie o numerze: 180699123"></a></div><div id="ogl_info180699123"height="120px"style="display:block;"><font size="-1"><strong><u>Informacje o ogłoszeniu:</u></strong></font>
	      <p style="font-size:11px;color:#000080;">Informację wytworzył(-a):&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">Grzegorz Kulawinek</span>&nbsp;&nbsp;&nbsp;Data wytworzenia:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">09-06-2026 </span><br/>Ogłoszenie wprowadził(-a):&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">Góral Aleksander</span>&nbsp;&nbsp;&nbsp;Data wprowadzenia:&nbsp;&nbsp;&nbsp;<span style="font-size:11px;font-weight:bold;color:#000000;">17-06-2026 </span><br/>
	    Na stronie biuletynu od:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">17-06-2026 </span>&nbsp;&nbsp;&nbsp;do&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">30-07-2026 </span><br />Na podstawie:&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;color:#000000;">WGM.6840.01.0019.2024.AD</span><br/></p></div><tr class="p"align="justify"valign="top"><td colspan="2"><hr size="1px"color='#000080'></td></tr><tr class=p align=justify valign=top>`;

const GORNOSLASKA_EXCERPT = `PREZYDENT MIASTA KALISZA
WGM.6840.01.0019.2024.AD
D2026.06.00794



                                       Prezydent Miasta Kalisza


działając na podstawie art. 38 ust.1 i 2, art. 39 ust. 1 i 3, i art. 40 ust.1 pkt 2, ust. 2 i 2a ustawy z
dnia 21 sierpnia 1997r. o gospodarce nieruchomościami (Dz. U. z 2026 r. poz. 399) oraz § 15
rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu
przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. 2021, poz. 2213),

                                                 ogłasza


drugi przetarg ustny ograniczony w sprawie sprzedaży po obniżonej cenie prawa własności
lokalu mieszkalnego nr 11A o powierzchni 14,63 m2, usytuowanego w budynku położonym w
Kaliszu przy ul. Górnośląskiej 42 wraz z udziałem wynoszącym 176/10000 części w nieruchomości
wspólnej, którą stanowi grunt oraz części budynku i urządzenia, które nie służą wyłącznie do
użytku właścicieli lokali.

Przetarg ograniczony jest do właścicieli lub wszystkich współwłaścicieli lokali usytuowanych
w budynku wielorodzinnym, położonym przy ul. Górnośląskiej 42 w Kaliszu, ujawnionych w
księgach wieczystych urządzonych dla poszczególnych lokali, w ostatnim dniu zgłaszania
I. Termin i miejsce przetargu

Przetarg odbędzie się w Urzędzie Miasta Kalisza, Główny Rynek 20, I piętro sala nr 36,
w dniu 30 lipca 2026 r. o godz. 10.00.

Organizator przetargu zastrzega sobie prawo do zmiany miejsca przeprowadzenia przetargu.

Pierwszy przetarg odbył się w dniu 13 maja 2026 r.

II. Dane dotyczące nieruchomości
   Kaliszu, oznaczonej w obrębie geodezyjnym nr 069 Czaszki jako działka nr 10 o pow. 850 m2.
   Lokal składa się z jednego pokoju oraz WC o powierzchni użytkowej 14,63 m2. Lokal
   usytuowany jest na drugim piętrze budynku. Jest wyposażony w instalacje: wodno –
 III. Cena wywoławcza

 1. Obniżona cena wywoławcza nieruchomości wynosi brutto 43.000,00 zł (słownie złotych:
    czterdzieści trzy tysiące 00/100). Zbycie nieruchomości podlega zwolnieniu z podatku VAT na
`;

const PULASKIEGO_EXCERPT = `Prezydent Miasta Kalisza

WGM.6840.01.0029.2022.AD
D2024.07.00944




                            Prezydent Miasta Kalisza

działając na podstawie art. 38 ust. 1 i 2, art. 40 ust. 1 pkt 1 ustawy z dnia 21 sierpnia
1997 roku o gospodarce nieruchomościami (t.j. Dz. U. z 2023r. poz. 344 z póżn. zm)
oraz § 13 rozporządzenia Rady Ministrów z dnia 14 września 2004 roku w sprawie
sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(Dz. U. z 2021r. poz. 2213),

                                     ogłasza

pierwszy przetarg ustny nieograniczony w sprawie sprzedaży prawa własności
lokalu mieszkalnego nr 2, położonego w Kaliszu przy ul. Kazimierza Pułaskiego 14,
o powierzchni 43,60 m2, wraz z udziałem 316/10000 w nieruchomości wspólnej, którą
stanowi grunt oraz części budynku i urządzenia, które nie służą wyłącznie do użytku
właścicieli lokali.



I. Termin i miejsce przetargu

Przetarg odbędzie się w dniu 22 sierpnia 2024r. o godz. 10.00 w Urzędzie
Miasta Kalisza, Główny Rynek 20, Ratusz, pokój nr 36, I piętro.

Organizator przetargu zastrzega sobie prawo do zmiany miejsca przeprowadzenia
przetargu.
III. Cena wywoławcza

1. Cena wywoławcza wynosi łącznie brutto 130.000,00 zł (słownie złotych: sto
trzydzieści tysięcy 00/100). Zbycie ww. nieruchomości lokalowej podlega zwolnieniu
z podatku VAT na podstawie art. 43 ust. 1 pkt 10 oraz art. 29a ust. 8 ustawy z dnia 11
`;

const GARNCARSKA_RESULT = `PREZYDENT MIASTA KALISZA
WGM.6840.01.0039.2023.AW
D2026.07.00686


                               INFORMACJA
o wyniku pierwszego przetargu ustnego nieograniczonego na sprzedaż prawa własności
zabudowanej nieruchomości, stanowiącej własność Miasta Kalisza, położonej w Kaliszu przy
ulicy Garncarskiej 9A.

Prezydent Miasta Kalisza informuje, że w dniu 3 lipca 2026 r. w siedzibie Urzędu Miasta
Kalisza, Główny Rynek 20, został przeprowadzony pierwszy przetarg ustny nieograniczony
na sprzedaż prawa własności zabudowanej nieruchomości, stanowiącej własność Miasta
Kalisza, położonej w Kaliszu przy ulicy Garncarskiej 9A, zapisanej w księdze wieczystej
numer KZ1A/00009843/2, oznaczonej w ewidencji gruntów i budynków Miasta Kalisza
w obrębie ewidencyjnym 027 Chmielnik jako działka numer 57/3 o powierzchni 0,1152 ha.
Sprzedaż nieruchomości nastąpi wraz z ustanowieniem odpłatnej jednorazowo służebności
gruntowej i ograniczonej w czasie tj. na okres 5 lat od dnia zawarcia umowy notarialnej
przenoszącej własność nieruchomości.

Liczba osób dopuszczonych do uczestnictwa w przetargu – 1,
Liczba osób niedopuszczonych do przetargu – 0.

Cena wywoławcza ww. nieruchomości wynosiła 350.000,00 zł (słownie złotych: trzysta
pięćdziesiąt tysięcy 00/100).

Najwyższa cena osiągnięta w przetargu wyniosła 353.500,00 zł (słownie złotych: trzysta
pięćdziesiąt trzy tysiące pięćset 00/100). Sprzedaż ww. nieruchomości podlega zwolnieniu
z podatku VAT na podstawie art. 43 ust.1 pkt 10 w zw. z art. 29a ust. 8 ustawy z dnia
11 marca 2004 r. o podatku od towarów i usług (Dz. U. z 2025 r. poz. 775 z późn. zm.).

Przetarg zakończył się wynikiem pozytywnym.

Nabywcą przedmiotowej nieruchomości została spółka: GM NIERUCHOMOŚCI Spółka
z ograniczoną odpowiedzialnością z siedzibą w Kaliszu.

Informację tę zamieszcza się w Biuletynie Informacji Publicznej /www.bip.kalisz.pl/ oraz
wywiesza się w siedzibie Urzędu Miasta Kalisza na okres 7 dni, tj. od dnia
13 lipca 2026 roku do dnia 20 lipca 2026 roku.



                                    Prezydent
                                  Miasta Kalisza
                                       /.../
                                Krystian Kinastowski




Data wywieszenia: 13 lipca 2026 roku                   Data zdjęcia: 20 lipca 2026 roku
`;

const CZESTOCHOWSKA_MISMATCH = `WGM.6845.01.0008.2026.AM
D2026.06.04862

                                                                                            WYKAZ
                                                                       nieruchomości przeznaczonych do oddania w dzierżawę

Prezydent Miasta Kalisza zgodnie z art. 35 ust.1 i 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz.U. z 2026r. poz. 399) podaje do publicznej wiadomości wykaz
nieruchomości przeznaczonych do oddania w dzierżawę:

        Położenie
                                                                                  Opis nieruchomości i
    nieruchomości z         Oznaczenie w/g                                                                                                     Wysokość opłaty i termin
                                                Przeznaczenie nieruchomości              sposób          Pow. w m²    Warunki udostępnienia                                     Zasady aktualizacji czynszu
   oznaczeniem księgi      ewidencji gruntów                                                                                                        jej wnoszenia
                                                                                   zagospodarowania
       wieczystej



                                               Zgodnie z Planem ogólnym                                                                       Roczny czynsz dzierżawny w
Kalisz                                         miasta Kalisza, zatwierdzonym                                                                  wysokości 4,14 zł za 1m², lecz
                           Obręb 115 Rypinek   uchwałą nr XXVIII/381/2026 Rady                                       Tryb bezprzetargowy,     nie mnie niż 104,09 zł +         Zarządzenie nr 303/2024
ul. Wojciecha z Brudzewa
                                               Miasta Kalisza z dnia 30 kwietnia Przeznaczona na cele                                         podatek VAT za powierzchnię      Prezydenta Miasta Kalisza
                           część dz. nr 17                                                                  118      dzierżawa na okres
KZ1A/00057704/7                                2026r. teren działki objęty jest  składowe                                                     do 1000 m²                       z dnia 17.05.2024r.
                                               jednostką bilansową oznaczona                                         do 3 lat                                                  (z późn. zm.).
                                               symbolem 27SP- strefa                                                                          płatny do dnia 30 czerwca
                                               gospodarcza                                                                                    każdego roku.




Data wywieszenia 03.07.2026 r.                     Data zdjęcia 24.07.2026 r.



                                                                                                                            Prezydent Miasta Kalisza
                                                                                                                                     /…/
                                                                                                                             Krystian Kinastowski
`;

test('itemsFromBoardHtml: real board rows #4, #9, #13 (item #9 is the board\'s own title/PDF mismatch)', () => {
  const items = itemsFromBoardHtml(BOARD_ITEMS_HTML);
  assert.equal(items.length, 3);

  assert.match(items[0].title, /Garncarskiej 9a/);
  assert.equal(items[0].pdfUrl, 'https://bip.kalisz.pl/ogloszenia/sn/1307garncarska9a.pdf');
  assert.equal(items[0].ref, 'WGM.6840.01.0039.2023.AW');

  assert.match(items[1].title, /Częstochowskiej 7\/6A/);
  assert.equal(items[1].pdfUrl, 'https://bip.kalisz.pl/ogloszenia/sn/03072026do24072026.pdf');
  assert.equal(items[1].ref, 'WGM.6845.01.0008.2026.AM');

  assert.match(items[2].title, /Górnośląskiej 42/);
  assert.equal(items[2].pdfUrl, 'https://bip.kalisz.pl/ogloszenia/sn/1706gornoslaska42lok11a.pdf');
  assert.equal(items[2].ref, 'WGM.6840.01.0019.2024.AD');
});

test('isAuctionSaleDoc / isAnnouncement / isResultNotice: real flat announcements vs the real result notice vs the real mismatched lease wykaz', () => {
  assert.equal(isAnnouncement(GORNOSLASKA_EXCERPT), true);
  assert.equal(isResultNotice(GORNOSLASKA_EXCERPT), false);

  assert.equal(isAnnouncement(PULASKIEGO_EXCERPT), true);
  assert.equal(isResultNotice(PULASKIEGO_EXCERPT), false);

  assert.equal(isResultNotice(GARNCARSKA_RESULT), true);
  assert.equal(isAnnouncement(GARNCARSKA_RESULT), false);

  // The board's OWN mismatched PDF: neither an announcement nor a result —
  // it's an unrelated dzierżawa wykaz, correctly rejected by CONTENT, not
  // by the (wrong) board title.
  assert.equal(isAuctionSaleDoc(CZESTOCHOWSKA_MISMATCH), false);
  assert.equal(isAnnouncement(CZESTOCHOWSKA_MISMATCH), false);
  assert.equal(isResultNotice(CZESTOCHOWSKA_MISMATCH), false);
});

test('addressFromText: order-agnostic across the two real flat fixtures\' opposite clause orders', () => {
  const a = addressFromText(GORNOSLASKA_EXCERPT);
  assert.ok(a);
  assert.equal(a.address.key, 'gornoslaskiej|42|11A');
  assert.equal(a.address_raw, 'ul. Górnośląskiej 42/11A');

  const b = addressFromText(PULASKIEGO_EXCERPT);
  assert.ok(b);
  assert.equal(b.address.key, 'kazimierza pulaskiego|14|2');
  assert.equal(b.address_raw, 'ul. Kazimierza Pułaskiego 14/2');

  const c = addressFromText(GARNCARSKA_RESULT);
  assert.ok(c);
  assert.equal(c.address.key, 'garncarskiej|9A|');
  assert.equal(c.address_raw, 'ul. Garncarskiej 9A');
});

test('roundFromText: word-ordinal round from both the announcement ("ogłasza") and result ("wyniku") idioms', () => {
  assert.equal(roundFromText(GORNOSLASKA_EXCERPT), 2); // "ogłasza ... drugi przetarg ustny ograniczony"
  assert.equal(roundFromText(PULASKIEGO_EXCERPT), 1); // "ogłasza pierwszy przetarg ustny nieograniczony"
  assert.equal(roundFromText(GARNCARSKA_RESULT), 1); // "o wyniku pierwszego przetargu"
});

test('auctionDateFromText: future-tense announcement date + past-tense result date', () => {
  assert.equal(auctionDateFromText(GORNOSLASKA_EXCERPT), '2026-07-30');
  assert.equal(auctionDateFromText(PULASKIEGO_EXCERPT), '2024-08-22');
  assert.equal(auctionDateFromText(GARNCARSKA_RESULT), '2026-07-03');
});

test('achievedPriceFromText / outcome: real Garncarska sold-above-asking result', () => {
  assert.equal(achievedPriceFromText(GARNCARSKA_RESULT), 353500);
  assert.equal(isPositiveOutcome(GARNCARSKA_RESULT), true);
  assert.equal(isNegativeOutcome(GARNCARSKA_RESULT), false);
});

test('parseAnnouncement: real Górnośląska 42/11A restricted flat announcement', () => {
  const rec = parseAnnouncement(GORNOSLASKA_EXCERPT, {
    url: 'https://bip.kalisz.pl/ogloszenia/sn/1706gornoslaska42lok11a.pdf',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'gornoslaskiej|42|11A');
  assert.equal(rec.address_raw, 'ul. Górnośląskiej 42/11A');
  assert.equal(rec.area_m2, 14.63);
  assert.equal(rec.round, 2);
  assert.equal(rec.starting_price_pln, 43000);
  assert.equal(rec.auction_date, '2026-07-30');
  assert.equal(rec.detail_url, 'https://bip.kalisz.pl/ogloszenia/sn/1706gornoslaska42lok11a.pdf');
});

test('parseAnnouncement: real Kazimierza Pułaskiego 14/2 flat announcement (the spike\'s own cited fixture)', () => {
  const rec = parseAnnouncement(PULASKIEGO_EXCERPT, {
    url: 'https://bip.kalisz.pl/ogloszenia/sn/20240712-wgm_6840_01_0029_2022_ad.pdf',
  });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'kazimierza pulaskiego|14|2');
  assert.equal(rec.address_raw, 'ul. Kazimierza Pułaskiego 14/2');
  assert.equal(rec.area_m2, 43.6);
  assert.equal(rec.round, 1);
  assert.equal(rec.starting_price_pln, 130000);
  assert.equal(rec.auction_date, '2024-08-22');
});

test('parseResultDoc: real Garncarska 9A result — sold above asking (350 000 -> 353 500 zł)', () => {
  const recs = parseResultDoc(GARNCARSKA_RESULT, null, 'https://bip.kalisz.pl/ogloszenia/sn/1307garncarska9a.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'garncarskiej|9A|');
  assert.equal(r.address_raw, 'ul. Garncarskiej 9A');
  assert.equal(r.round, 1);
  assert.equal(r.area_m2, null);
  assert.equal(r.starting_price_pln, 350000);
  assert.equal(r.final_price_pln, 353500);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-07-03');
  assert.equal(r.source_pdf, 'https://bip.kalisz.pl/ogloszenia/sn/1307garncarska9a.pdf');
});

test('parseAnnouncement / parseResultDoc: the board\'s own mismatched PDF (real lease wykaz) yields nothing from either parser', () => {
  assert.equal(parseAnnouncement(CZESTOCHOWSKA_MISMATCH), null);
  assert.deepEqual(parseResultDoc(CZESTOCHOWSKA_MISMATCH, null, 'x'), []);
});

test('isNegativeOutcome: documented cross-city idiom conformance (ADAPTER-GUIDE.md §5.3 / spike §4) — NOT yet live-caught against a real Kalisz negatywny fixture, see parse.js header', () => {
  assert.equal(isNegativeOutcome('Przetarg zakończył się wynikiem negatywnym.'), true);
  assert.equal(isNegativeOutcome('Przetarg zakończył się wynikiem pozytywnym.'), false);
});

// --- Regression fixtures: two REAL bugs caught by a full live 18-item
// board smoke test (not the curated fixtures above) during this build, both
// from scanning the WHOLE multi-page PDF instead of just the subject clause
// — see parse.js's subjectWindow() header note for the full story:
//   - RUSINOWO_EXCERPT — a real multi-parcel LAND notice (Rusinowo, two
//     działki, 2,5960 ha + 1,7948 ha). Its subject says "niezabudowanych
//     nieruchomości gruntowych" (land), but section II incidentally mentions
//     an unrelated small utility structure ("część działki ... zabudowana
//     przepompownią ścieków" — a sewage pump station on part of the plot).
//     An UNSCOPED classifyKind(wholeText) misread this as kind 'zabudowana'
//     (built property) instead of 'grunt' (land) — this excerpt keeps both
//     the real subject clause AND that real section-II sentence to prove
//     classifyKind(subjectWindow(text)) picks the subject's 'grunt', not the
//     section-II noise.
//   - JANKOW_DRUGI_EXCERPT — a real BUILT ('zabudowana') property notice for
//     a village property (miejscowość Janków Drugi, gmina Blizanów — no city
//     street at all). Its RODO/data-processing clause (present in every real
//     Kalisz notice) names a software VENDOR'S own office address ("Logotec
//     Enterprise S.A. ... przy ulicy Aleksandra Ostrowskiego 7," Wrocław) —
//     real "przy ulicy <street> <number>" text that is NOT the property's
//     address. An UNSCOPED addressFromText(wholeText) fell through to this
//     vendor address and fabricated a bogus "ul. Aleksandra Ostrowskiego 7"
//     record. This excerpt keeps both the real (street-less) subject AND
//     that real vendor-address sentence to prove addressFromText()/
//     subjectWindow() correctly stop at the "I. Miejsce i termin przetargu"
//     section header and never reach the vendor address, yielding null.

const RUSINOWO_EXCERPT = `PREZYDENT MIASTA KALISZA
WGM.6840.01.0021.2026.JJ
D2026.06.02511

                                 Prezydent Miasta Kalisza

działając na podstawie art. 38 ust. 1 i 2, art. 40 ust. 1 pkt 1 ustawy z dnia 21 sierpnia 1997r.
o gospodarce nieruchomościami (Dz. U. z 2026 r. poz. 399) oraz § 13 rozporządzenia Rady
Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz
rokowań na zbycie nieruchomości (Dz. U. z 2021r. poz. 2213)

                                          ogłasza


pierwszy przetarg ustny nieograniczony dotyczący sprzedaży prawa własności inwestycyjnych,
niezabudowanych nieruchomości gruntowych, stanowiących własność Miasta Kalisza, zapisanych
w księdze wieczystej KO1E/00006306/5, położonych w Rusinowie, gminie Postomino, powiecie
sławieńskim, województwie zachodniopomorskim, oznaczonych w obrębie 0024 Rusinowo jako:

    1) działka nr 55/5 i 56/2 o łącznej powierzchni 2,5960 ha,

    2) działka nr 57/2 o powierzchni 1,7948 ha,

       przeznaczonych pod zabudowę pensjonatową domów wycieczkowych i kempingów.


I. Miejsce i termin przetargu
      55/5 przechodzi napowietrzna linia energetyczna;
   b) stan prawny nieruchomości:
      Zgodnie z księgą wieczystą nr KO1E/00006306/5, przedmiotowa nieruchomość nie posiada
      obciążeń, ani nie jest przedmiotem zobowiązań.
      - cześć działki nr 55/5 o powierzchni 29 m2 zabudowana przepompownią ścieków stanowi
        przedmiot umowy dzierżawy zawartej na czas oznaczony do dnia 31.12.2028r.,
      - część działki nr 55/5 o powierzchni 150 m2 stanowi przedmiot umowy dzierżawy na cele
`;

const JANKOW_DRUGI_EXCERPT = `WGM.6840.01.0047.2020.KŻ
D2026.06.01052
                                Prezydent Miasta Kalisza


działając na podstawie art. 38 ust. 1 i 2, art. 40 ust. 1 pkt 1 ustawy z dnia 21 sierpnia
1997r. o gospodarce nieruchomościami (Dz. U. z 2026r. poz. 399) oraz § 13
rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu
i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U.
z 2021r. poz. 2213)

                                       ogłasza

pierwszy przetarg ustny nieograniczony na sprzedaż, prawa własności
zabudowanej nieruchomości, położonej w powiecie kaliskim, gminie Blizanów,
miejscowości Janków Drugi Nr 3, oznaczonej w ewidencji gruntów i budynków
prowadzonej przez Starostę Kaliskiego w obrębie 0010 Janków jako działka nr 567
o powierzchni 0,7900ha, zapisanej w księdze wieczystej KZ1A/00094932/5
stanowiącej własność Miasta Kalisza z możliwością przeznaczenia pod inwestycję
polegającą na budowie budynku magazynowo-usługowego.

I. Miejsce i termin przetargu
wsparcia technicznego systemów informatycznych z których korzysta Administrator
przy realizacji zadania do których należą:
- Logotec Enterprise S. A. mający siedzibę we Wrocławiu przy ulicy Aleksandra
   Ostrowskiego 7, świadczący usługi wsparcia technicznego wykorzystywanego przez
   administratora Systemu Zarządzenia Obiegiem Dokumentów DDM9000 Web
   Edition;
- Asseco Data System S. A. mający siedzibę w Gdyni przy ulicy Podolskiej 21,
`;

test('subjectWindow / classifyKind: real Rusinowo land notice is NOT misclassified by an incidental section-II "zabudowana" (utility pump station)', () => {
  assert.equal(isAnnouncement(RUSINOWO_EXCERPT), true);
  const rec = parseAnnouncement(RUSINOWO_EXCERPT, { url: 'https://bip.kalisz.pl/ogloszenia/sn/1507rusinowo.pdf' });
  // Correctly rejected: kind 'grunt' (land) is out of scope this build (see
  // parse.js header) — NOT fabricated as a 'zabudowana' address-keyed record.
  assert.equal(rec, null);
});

test('subjectWindow / addressFromText: real Janków Drugi village-property notice never picks up the RODO clause\'s software-vendor office address', () => {
  assert.equal(isAnnouncement(JANKOW_DRUGI_EXCERPT), true);
  // No real city street exists for this subject (a village property in gmina
  // Blizanów) — addressFromText must NOT fall through to the vendor address
  // ("ul. Aleksandra Ostrowskiego 7") that appears later in the same real text.
  assert.equal(addressFromText(JANKOW_DRUGI_EXCERPT), null);
  const rec = parseAnnouncement(JANKOW_DRUGI_EXCERPT, { url: 'https://bip.kalisz.pl/ogloszenia/sn/0707drugi.pdf' });
  assert.equal(rec, null);
});
