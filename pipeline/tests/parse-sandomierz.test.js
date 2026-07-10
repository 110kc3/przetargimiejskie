// Sandomierz parser tests. Fixtures are REAL live bip.um.sandomierz.pl article
// bodies (fetched + verified 2026-07-10), condensed to the operative
// sentences (address/area/price/date/round/outcome) — boilerplate (identity
// verification, payment account numbers, contact emails, the trailing
// PDF-attachment-name list) is cut, but every KEPT sentence is a verbatim
// substring of the live page, not reworded. Re-verified after condensing
// that every assertion below still holds against the full uncut body.
//
//   Portowa 18/16      — flat ANNOUNCEMENT (article 13385, I przetarg, 17,08
//                         m², cena wywoławcza 76 500 zł, przetarg 24.10.2024)
//                         + its own RESULT (article 13746, sold 92 000 zł,
//                         nabywca named) — this is the exact pair the spike
//                         confirms ("cena osiągnięta 92000 zł").
//   K.K.Baczyńskiego 9/14 — a SECOND real flat ANNOUNCEMENT + RESULT pair
//                         (article 8507/8935, I przetarg, 27,30 m², 99 698 zł
//                         -> sold 100 698 zł) — cross-checks the parser
//                         against an independent flat, different phrasing
//                         quirks (no separate "lokal nr" clause; udział
//                         clause sits BEFORE "cena wywoławcza", not between
//                         label and amount like Portowa's WYNIK doc does).
//   Piaski dz. 2133/24  — land RESULT UNSOLD (article 17912, II przetarg,
//                         0,1036 ha, 66 420 zł, "zakończył się wynikiem
//                         negatywnym" — nobody paid the wadium).
//   Zaleśnej dz. 816/5  — land RESULT UNSOLD (article 18157, III przetarg
//                         USTNY OGRANICZONY — restricted, not nieograniczony
//                         — 0,2648 ha, 199 260 zł, same negative outcome).
//   Piaski (announcement) — a real MULTI-PARCEL land announcement (article
//                         17543: two plots, dz. 2133/10 + dz. 2133/24, each
//                         with its own price/date, in ONE document) that also
//                         reproduces the classifyKind 'garaz' misfire (see
//                         parse.js resolveKindLocal) via its real zoning
//                         boilerplate "...wolnostojącymi z garażami...".
//   3x "Wykaz ... na rzecz najemcy" — real tenant-sale (bezprzetargowo)
//                         designations (Por.T.Króla 6/48, K.K.Baczyńskiego
//                         9/16, Por.T.Króla 8/16) — never reach an auction.
//   "Ogłoszenie o wolnym lokalu mieszkalnym" — a real RENTAL-vacancy notice
//                         (no "przetarg" in the title at all).
//   "Ogłoszenie o II przetargu licytacyjnym ..." (Opatowska 13) — a real,
//                         LIVE title/body mismatch: the board's own preambule
//                         blurb for this article reads "na sprzedaż lokalu
//                         użytkowego ..." (sale) but the article's actual
//                         body reads "na wynajem lokalu użytkowego ..."
//                         (rental) — confirms why isAnnouncementTitle only
//                         pre-filters on title and isSaleBody (on the fetched
//                         BODY) is the sole sale-vs-rental authority.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isResultTitle,
  isAnnouncementTitle,
  isSaleBody,
  roundFromBody,
  startingPriceFromText,
  achievedPriceFromText,
  isNegativeOutcome,
  parcelFromText,
  plotAreaFromText,
  landStreetFromText,
  resolveKindLocal,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/sandomierz/parse.js';

// --------------------------------------------------------------- real fixtures

const PORTOWA_ANN_TITLE = "Ogłoszenie o I przetargu ustnym nieograniczonym";
const PORTOWA_ANN_TEXT = "Załącznik nr 2 do Zarządzenia Burmistrza Miasta Sandomierza Nr206/2042/GN z dnia 20.09.2024r. Burmistrz Miasta Sandomierza ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego Nr 16 położonego w komunalnym budynku wielomieszkaniowym w Sandomierzu przy ul. Portowej 18, stanowiącego własność Gminy Sandomierz, KW KI1S/00065581/2. Powierzchnia lokalu wynosi 17,08 m 2 . Składa się on z pokoju, przedpokoju, kuchni i łazienki ( I piętro).Lokal przeznaczony do remontu. Do lokalu przynależy piwnica o pow. 5,30 m 2 . Z własnością lokalu mieszkalnego związany jest udział w częściach wspólnych budynku i w prawie własności działki nr 1406/53 o pow. 0,2273 ha wynoszący 2238/103205 części, wyliczony proporcjonalnie do powierzchni użytkowej lokalu i całego budynku. Cena wywoławcza wynosi – 76.500,00 zł. Minimalne postąpienie wynosi 1%. Wadium w pieniądzu w wysokości 7.650,00 zł płatne najpóźniej do dnia 17.10. 2024r . na konto Urzędu Miejskiego w Sandomierzu BS Sandomierz Nr 15 9429 0004 2001 0000 1300 0028. Przetarg odbędzie się w dniu 24.10.2024r. o godz. 9 00 w siedzibie Urzędu Miejskiego w Sandomierzu Pl. Poniatowskiego 3.";

const PORTOWA_WYNIK_TITLE = "Informacja o wyniku przetargu na sprzedaż nieruchomości";
const PORTOWA_WYNIK_TEXT = "Sandomierz, 31.10.2024r. GN.7125.19.2022.IPI Informacja o wyniku przetargu na sprzedaż nieruchomości I przetarg ustny nieograniczony przeprowadzono w dniu 24 października 2024r . w siedzibie Urzędu Miejskiego w Sandomierzu Plac Poniatowskiego 3. I przetargiem objęto sprzedaż lokalu mieszkalnego Nr 16 położonego w komunalnym budynku wielomieszkaniowym w Sandomierzu przy ul. Portowa 18, stanowiący własność Gminy Sandomierz, księga wieczysta Nr KI1S/00065581/2. Cena wywoławcza lokalu mieszkalnego wraz z udziałem w częściach wspólnych budynku i w prawie własności działki nr 1406/53 udziału wynoszącego 2238/103205 części wynosiła brutto 76.500,00 zł /słownie: siedemdziesiąt sześć tysięcy pięćset złotych 00/100 /. Komisja Przetargowa stwierdziła, że w wyznaczonym terminie tj. do 17.10.2024r. (włącznie) pięć osób wpłaciło wadium w wysokości 7.650,00 zł. i zostały dopuszczone do przetargu. Pomimo wpłaconego wadium jedna osoba nie przystąpiła do przetargu. W wyniku przeprowadzonego przetargu ustnego nieograniczonego nabywcą lokalu mieszkaniowego Nr 16 położonego w komunalnym budynku wielomieszkaniowym przy ul. Portowa 18, jest Grzegorz i Magdalena małż. Surma. Ustalona w wyniku przetargu cena nabycia lokalu mieszkaniowego wynosi brutto 92.000,00 zł/słownie: dziewięćdziesiąt dwa tysiące złotych 00/100 /. Burmistrz Sandomierza Paweł Niedźwiedź";

const BACZYNSKIEGO_ANN_TITLE = "Ogłoszenie Burmistrza Miasta Sandomierza o I przetargu ustnym nieograniczonym";
const BACZYNSKIEGO_ANN_TEXT = "Załącznik nr 1 do Zarządzenia Burmistrza Miasta Sandomierza GN 113/2023/GN z dnia 31.05.2023r. Burmistrz Miasta Sandomierza ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego stanowiącego własność Gminy Sandomierz, położonego w komunalnym budynku wielomieszkaniowym w Sandomierzu, stanowiącym własność Gminy Sandomierz przy ulicy K.K.Baczyńskiego 9/14 . Powierzchnia lokalu wynosi 27,30 m 2 . Składa się on z pokoju, przedpokoju, kuchni i łazienki ( IV piętro), przeznaczony do remontu. Do lokalu przynależy piwnica o pow. 2,90m 2 . Z własnością lokalu mieszkalnego związany jest udział w częściach wspólnych budynku i w prawie własności działki wynoszący 302/29921 części, wyliczony proporcjonalnie do powierzchni użytkowej lokalu i całego budynku. Cena wywoławcza wynosi – 99.698,00 zł. Minimalne postąpienie wynosi 1%. Wadium w pieniądzu w wysokości 10.000,00 zł płatne najpóźniej do dnia 26.06.2023r. na konto Urzędu Miejskiego w Sandomierzu BS Sandomierz Nr 15 9429 0004 2001 0000 1300 0028. Przetarg odbędzie się w dniu 03 lipca 2023r. o godz. 9 00 w siedzibie Urzędu Miejskiego w Sandomierzu Pl. Poniatowskiego 3.";

const BACZYNSKIEGO_WYNIK_TITLE = "Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego";
const BACZYNSKIEGO_WYNIK_TEXT = "Sandomierz, dnia 10.07.2023r. GN.7125.18.2022.EDU Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego I przetarg ustny nieograniczony przeprowadzono w dniu 3 lipca 2023r . w siedzibie Urzędu Miejskiego w Sandomierzu Plac Poniatowskiego 3. I przetargiem objęto sprzedaż lokalu mieszkalnego położonego w Sandomierzu przy ul. K.K.Baczyńskiego 9/14 wraz z udziałem 302/29921 w częściach wspólnych budynku i w prawie własności gruntu - nr ewid. działki 1572/50 o pow. 0,2095 ha. wpisaną do księgi wieczystej NrKI1S/00057529/1 Cena wywoławcza lokalu mieszkalnego wynosiła brutto 99.698,00 złotych. Komisja Przetargowa stwierdziła, że w wyznaczonym terminie tj. do 26.06.2023r. (włącznie) jedna osoba wpłaciła wadium w wysokości 10.000,00 zł., i została dopuszczona do przetargu. W wyniku przeprowadzonego przetargu ustnego nieograniczonego nabywcami lokalu mieszkalnego położonego w Sandomierzu przy ul. K.K.Baczyńskiego 9/14 wraz z udziałem 302/29921 w częściach wspólnych budynku i w prawie własności gruntu są Anna Kowalczyk-Wałaszczyk i Sławomir Wałaszczyk - małż. Ustalona w wyniku przetargu cena nabycia lokalu mieszkalnego wynosi brutto 100.698,00 zł/słownie: sto tysięcy sześćset dziewięćdziesiąt osiem zł. Z up. Burmistrza Janusz Stasiak Zastępca Burmistrza";

const WYNIK_PIASKI_TITLE = "Informacja o wyniku przetargu na sprzedaż nieruchomości";
const WYNIK_PIASKI_TEXT = "Sandomierz, 04.12.2025r. GN.6840.1.2016.EDU Informacja o wyniku przetargu na sprzedaż nieruchomości II przetarg ustny nieograniczony przeprowadzono w dniu 04 grudnia 2025r . w siedzibie Urzędu Miejskiego w Sandomierzu Plac Poniatowskiego 3. II przetargiem objęto sprzedaż nieruchomości położonej w Sandomierzu przy ul. Piaski, oznaczoną nr ewid. 2133/24 o pow. 0,1036 ha, stanowiącą własność Gminy Sandomierz, wpisaną do księgi wieczystej Nr KI1S/00080711/4. Cena wywoławcza nieruchomości wynosiła brutto 66.420,00 zł /słownie: sześćdziesiąt sześć tysięcy czterysta dwadzieścia złotych/. Komisja Przetargowa stwierdziła, że w wyznaczonym terminie tj. do 27.11.2025r. (włącznie) nikt nie uiścił wadium w wysokości 6.650,00 zł wobec czego II przetarg ustny nieograniczony zakończył się wynikiem negatywnym. Burmistrz Sandomierza Paweł Niedźwiedź";

const WYNIK_ZALESNEJ_TITLE = "Informacja o wyniku przetargu na sprzedaż nieruchomości";
const WYNIK_ZALESNEJ_TEXT = "Sandomierz, dnia 30.12.2025r. G.6840.5.2024.EDU Informacja o wyniku przetargu na sprzedaż nieruchomości III przetarg ustny ograniczony przeprowadzono w dniu 30 grudnia 2025r . w siedzibie Urzędu Miejskiego w Sandomierzu Plac Poniatowskiego 3. III przetargiem objęto sprzedaż nieruchomości położonej w Sandomierzu przy ul. Zaleśnej, oznaczoną nr ewid. 816/5 o pow. 0,2648 ha , wpisaną do księgi wieczystej Nr KI1S/00076721/6. Cena wywoławcza nieruchomości wynosiła brutto 199.260,00 zł /słownie: sto dziewięćdziesiąt dziewięć tysięcy dwieście sześćdziesiąt złotych/. Komisja Przetargowa stwierdziła, że w wyznaczonym terminie tj. do 23.12.2025r. (włącznie) nikt nie uiścił wadium w wysokości 20.000,00 zł i nikt nie zadeklarował uczestnictwa w przetargu, wobec czego III przetarg ustny ograniczony zakończył się wynikiem negatywnym. Burmistrz Sandomierza Paweł Niedźwiedź";

const LAND_PIASKI_ANN_TITLE = "Ogłoszenie o II przetargu ustnym nieograniczonym";
const LAND_PIASKI_ANN_TEXT = "Załącznik Nr 1 do Zarządzenia Burmistrza Miasta Sandomierza Nr 208/2025/GN z dnia 03.11.2025r. Burmistrz Miasta Sandomierza Ogłasza II przetargi ustne nieograniczone na sprzedaż nieruchomości gruntowych położonych w Sandomierzu przy ul. Piaski stanowiących własność Gminy Sandomierz, przeznaczonych pod zabudowę mieszkaniową jednorodzinną, wpisanych do księgi wieczystej Nr KI1S/00080711/4. 1.dz. nr 2133/10 o pow. 0,1403 ha. Cena wywoławcza nieruchomości wynosi 67.650,00 zł. Cena zawiera 23% podatek VAT. Wadium w pieniądzu w wysokości 6.770,00 zł płatne najpóźniej do dnia 27.11.2025r. z dopiskiem „wadium – dz. nr 2133/10” na konto Urzędu Miejskiego w Sandomierzu BS Sandomierz Nr 15 9429 0004 2001 0000 1300 0028. Przetarg odbędzie się w dniu 4.12.2025r. o godz. 900 w siedzibie Urzędu Miejskiego w Sandomierzu Pl. Poniatowskiego 3. 2.dz. nr 2133/24 o pow. 0,1036 ha. Cena wywoławcza nieruchomości wynosi 66.420,00 zł. Cena zawiera 23% podatek VAT. Wadium w pieniądzu w wysokości 6.650,00 zł płatne najpóźniej do dnia 27.11.2025r. z dopiskiem „ wadium – dz. nr 2133/24” na konto Urzędu Miejskiego w Sandomierzu BS Sandomierz Nr 15 9429 0004 2001 0000 1300 0028. Przetarg odbędzie się w dniu 4.12.2025r. o godz. 1000 w siedzibie Urzędu Miejskiego w Sandomierzu Pl. Poniatowskiego 3. Termin złożenia wniosku przez osoby, którym przysługiwało pierwszeństwo w nabyciu nieruchomości na podstawie art. 34 ust.1 pkt. 1 i 2 ustawy z dnia 21 sierpnia 1997r. o gospodarce nieruchomościami upłynął w dniu 24.07.2025r. I przetargi na sprzedaż nieruchomości nr. ewid. 2133/10, nr 2133/24 odbyły się w dniu 26.09.2025r. i zakończyły wynikami negatywnymi. Obciążenia i zobowiązania dotyczące w/w nieruchomości: hipoteka - brak, prawa, roszczenia i ograniczenia – bez obciążeń. Przeznaczenie nieruchomości - brak planu zagospodarowania przestrzennego. Zgodnie z decyzją o warunkach zabudowy z dnia 17.08.2015r. znak: UA.6730.67.2015 działki przeznaczone są pod zabudowę domami mieszkalnymi, jednorodzinnymi, wolnostojącymi z garażami, ze zjazdami indywidualnymi na każdą działkę.";

const WYKAZ_NAJEMCA_KROLA_TITLE = "Wykaz lokalu mieszkalnego przeznaczonego do sprzedaży na rzecz najemcy";
const WYKAZ_NAJEMCA_KROLA_TEXT = "GN.7125.15.2025.IPI Działając w trybie art. 35 ust. 1 i 2 ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami /j. t. Dz. U. z 2024r poz.1145 z późn.zm./ Burmistrz Miasta Sandomierza podaje do publicznej wiadomości: WYKAZ lokalu mieszkalnego, położonego w Sandomierzu, przeznaczonego do sprzedaży na rzecz najemcy Lp. Nr działki Pow. /m 2 / Nr KW dla nieruchomości Położenie lokalu Opis lokalu Przeznaczenie nieruchomości i sposób zagospodarowania Udział w częściach wspólnych budynku i w prawie własności działki Cena lokalu zł Powierzchnia lokalu m 2 1. 435/10 986 KI1S/00032247/9 ul. Por.T. Króla 6/48 lokal mieszkalny położony w budynku komunalnym wielomieszkaniowym na IV piętrze, z przynależną piwnicą Brak MPZP. W obowiązującym studium uwarunkowań i kierunków zagospodarowania przestrzennego nieruchomość położona jest w obszarze przeznaczonym pod zabudowę mieszkaniową wielorodzinną 38/3849 188.463,00 37,85 Termin do złożenia wniosku przez osoby, którym przysługuje pierwszeństwo w nabyciu nieruchomości na podst. art. 34 ust.1 pkt. 1, 2 ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami /j. t. Dz. U. z 2024r. poz.1145 z późn.zm/ wynosi 6 tygodni od dnia wywieszenia niniejszego wykazu tj. od dnia 04.12.2025r. do dnia 15.01.2026r. Od ceny lokalu mieszkalnego i ułamkowej części gruntu najemcy przysługuje bonifikata w wysokości określonej w uchwale Rady Miasta Sandomierza Obciążenia i zobowiązania dotyczące lokalu: hipoteka - brak, prawa, roszczenia i ograniczenia – bez obciążeń. Sandomierz, dnia 04.12.2025r. Burmistrz Sandomierza Paweł Niedźwiedź";

const WOLNY_LOKAL_TITLE = "Ogłoszenie o wolnym lokalu mieszkalnym";
const WOLNY_LOKAL_TEXT = "Sandomierz, 04.12.2025 r. GN.7124.46.2025.AKB O G Ł O S Z E N I E Burmistrz Miasta Sandomierza informuje, że dysponuje wolnym lokalem mieszkalnym nr 3 położonym w budynku przy ul. Rynek 18, usytuowanym na II piętrze, składającym się z: 1 pokoju, kuchni, łazienki z wc, przedpokoju o łącznej powierzchni użytkowej 35,58 m 2 . Ww. lokal wyposażony jest w instalację: elektryczną, gazową, centralnego ogrzewania i wodno-kanalizacyjną. Lokal do remontu.";

const RENTAL_LICYTACYJNY_TITLE = "Ogłoszenie o II przetargu licytacyjnym ustnym nieograniczonym";
const RENTAL_LICYTACYJNY_TEXT = "OGŁOSZENIE Burmistrz Miasta Sandomierza o g ł a s z a II przetarg licytacyjny ustny nieograniczony na wynajem lokalu użytkowego położonego w obrębie Starego Miasta w budynku przy ul. Opatowskiej 13, usytuowanego na parterze, składającego się z: 3 pomieszczeń, korytarza oraz zaplecza z wc, o łącznej powierzchni użytkowej 43,48 m 2 . Ww. lokal wyposażony jest w instalację: elektryczną, wodno-kanalizacyjną i centralnego ogrzewania. Przedmiot najmu przeznaczony jest na prowadzenie działalności gospodarczej – z wyłączeniem prowadzenia usług w zakresie urządzania gier hazardowych (losowych), w tym na automatach o niskich wygranych. Przetarg odbędzie się w dniu 02.01.2026 r. o godz. 11 00 w siedzibie Urzędu Miejskiego pl. Poniatowskiego 1 pok. nr 103.";

// ------------------------------------------------------------------- unit funcs

test('title routing: sale announcement vs result notice vs noise', () => {
  assert.equal(isAnnouncementTitle(PORTOWA_ANN_TITLE), true);
  assert.equal(isAnnouncementTitle(BACZYNSKIEGO_ANN_TITLE), true);
  assert.equal(isResultTitle(PORTOWA_WYNIK_TITLE), true);
  assert.equal(isResultTitle(BACZYNSKIEGO_WYNIK_TITLE), true);
  assert.equal(isAnnouncementTitle(PORTOWA_WYNIK_TITLE), false);
  assert.equal(isResultTitle(PORTOWA_ANN_TITLE), false);
  // "Wykaz ... na rzecz najemcy" (bezprzetargowo tenant sale) is never an
  // announcement, regardless of it containing "sprzedaży".
  assert.equal(isAnnouncementTitle(WYKAZ_NAJEMCA_KROLA_TITLE), false);
  assert.equal(isResultTitle(WYKAZ_NAJEMCA_KROLA_TITLE), false);
  // "Ogłoszenie o wolnym lokalu mieszkalnym" (rental vacancy) has no
  // "przetarg" in the title at all.
  assert.equal(isAnnouncementTitle(WOLNY_LOKAL_TITLE), false);
  // Dzierżawa/najem result variants (not fixtured above) must not pass as a
  // sale result.
  assert.equal(isResultTitle('Informacja o wyniku przetargu na dzierżawę nieruchomości'), false);
  assert.equal(isResultTitle('Informacja o wyniku  przetargu na najem lokalu użytkowego'), false);
});

test('isSaleBody: the real board-preambule/body mismatch (article 17919, Opatowska 13)', () => {
  // The title alone is ambiguous ("Ogłoszenie o II przetargu licytacyjnym
  // ustnym nieograniczonym" — no "sprzedaż"/"wynajem" either way), and the
  // board's own preambule for this exact article reads "na sprzedaż lokalu
  // użytkowego ..." — but the fetched body is unambiguous: "na wynajem
  // lokalu użytkowego ...". isSaleBody must side with the body.
  assert.equal(isAnnouncementTitle(RENTAL_LICYTACYJNY_TITLE), true); // title-gate lets it through
  assert.match(RENTAL_LICYTACYJNY_TEXT, /na\s+wynajem\s+lokalu\s+użytkowego/);
  assert.equal(isSaleBody(RENTAL_LICYTACYJNY_TEXT), false); // body-gate rejects it
  assert.equal(isSaleBody(PORTOWA_ANN_TEXT), true);
  assert.equal(isSaleBody(LAND_PIASKI_ANN_TEXT), true);
});

test('roundFromBody: case-sensitive roman ordinal immediately before "przetarg ustn..."', () => {
  assert.equal(roundFromBody('I przetarg ustny nieograniczony przeprowadzono w dniu 24 października 2024r'), 1);
  assert.equal(roundFromBody('II przetarg ustny nieograniczony przeprowadzono w dniu 04 grudnia 2025r'), 2);
  // "ustny OGRANICZONY" (restricted, not nieograniczony) still matches.
  assert.equal(roundFromBody('III przetarg ustny ograniczony przeprowadzono w dniu 30 grudnia 2025r'), 3);
});

test('startingPriceFromText: real fixture bug -- finn-bip priceFromText returns null on Portowa\'s WYNIK doc (162-char label-to-amount gap)', () => {
  // Real captured sentence: the "udział w częściach wspólnych budynku ...
  // udziału wynoszącego 2238/103205 części" clause sits BETWEEN "cena
  // wywoławcza" and "wynosiła", well past finn-bip's priceFromText 140-char
  // cap. startingPriceFromText anchors on "wynosi(ła)" instead and must not
  // be fooled by the digit runs in that clause ("1406/53", "2238/103205").
  const wideGap = 'Cena wywoławcza lokalu mieszkalnego wraz z udziałem w częściach wspólnych budynku i w prawie własności działki nr 1406/53 udziału wynoszącego 2238/103205 części wynosiła brutto 76.500,00 zł';
  assert.equal(startingPriceFromText(wideGap), 76500);
  // Short-gap form (Baczyńskiego's WYNIK doc -- the udział clause sits
  // BEFORE "cena wywoławcza" this time, so the label-to-amount gap is short;
  // must still work).
  assert.equal(startingPriceFromText('Cena wywoławcza lokalu mieszkalnego wynosiła brutto 99.698,00 złotych.'), 99698);
  // Announcement phrasing: "wynosi – <kwota> zł" (en-dash, present tense).
  assert.equal(startingPriceFromText('Cena wywoławcza wynosi – 76.500,00 zł.'), 76500);
  assert.equal(startingPriceFromText(PORTOWA_ANN_TEXT), 76500);
  assert.equal(startingPriceFromText(PORTOWA_WYNIK_TEXT), 76500);
  assert.equal(startingPriceFromText(BACZYNSKIEGO_WYNIK_TEXT), 99698);
});

test('achievedPriceFromText: "cena nabycia ... wynosi brutto ... zł" (present tense, not bochnia\'s "wyniosła")', () => {
  assert.equal(achievedPriceFromText(PORTOWA_WYNIK_TEXT), 92000);
  assert.equal(achievedPriceFromText(BACZYNSKIEGO_WYNIK_TEXT), 100698);
  // A "cena wywoławcza" alone (no "cena nabycia") must not be read as achieved.
  assert.equal(achievedPriceFromText('Cena wywoławcza wynosi – 76.500,00 zł.'), null);
  assert.equal(achievedPriceFromText(WYNIK_PIASKI_TEXT), null); // unsold: no buyer
});

test('isNegativeOutcome: "zakończył się wynikiem negatywnym" (nobody paid the wadium)', () => {
  assert.equal(isNegativeOutcome(WYNIK_PIASKI_TEXT), true);
  assert.equal(isNegativeOutcome(WYNIK_ZALESNEJ_TEXT), true);
  assert.equal(isNegativeOutcome(PORTOWA_WYNIK_TEXT), false);
});

test('parcelFromText: announcement "dz. nr N/N" vs WYNIK doc "nr ewid. N/N" (real fixture bug -- neither is bochnia/olkusz\'s "działk..." stem)', () => {
  assert.equal(parcelFromText('1.dz. nr 2133/10 o pow. 0,1403 ha'), '2133/10');
  assert.equal(parcelFromText('oznaczoną nr ewid. 2133/24 o pow. 0,1036 ha'), '2133/24');
  assert.equal(parcelFromText(WYNIK_PIASKI_TEXT), '2133/24');
  assert.equal(parcelFromText(WYNIK_ZALESNEJ_TEXT), '816/5');
  assert.equal(parcelFromText(LAND_PIASKI_ANN_TEXT), '2133/10'); // first parcel only
});

test('plotAreaFromText: hectares to m²', () => {
  assert.equal(plotAreaFromText(WYNIK_PIASKI_TEXT), 1036); // 0,1036 ha
  assert.equal(plotAreaFromText(WYNIK_ZALESNEJ_TEXT), 2648); // 0,2648 ha
});

test('landStreetFromText: stops at prose continuation, not just a comma (real fixture bug vs bochnia\'s unguarded lookahead)', () => {
  // Bochnia's plain landStreetFromText would run past "Piaski" all the way to
  // "księgi" here (no comma stops it before "stanowiących"); the
  // PROSE-continuation stop set fixes that.
  assert.equal(landStreetFromText(LAND_PIASKI_ANN_TEXT), 'Piaski');
  assert.equal(landStreetFromText(WYNIK_PIASKI_TEXT), 'Piaski');
  assert.equal(landStreetFromText(WYNIK_ZALESNEJ_TEXT), 'Zaleśnej');
  // The office address must never read as a land street.
  assert.equal(landStreetFromText('w siedzibie Urzędu Miejskiego w Sandomierzu przy Pl. Poniatowskiego 3'), null);
});

test('resolveKindLocal: real fixture bug -- classifyKind GARAGE_RE misfires on land zoning boilerplate ("...z garażami...")', () => {
  // Verified live: classifyKind() alone returns 'garaz' on the Piaski
  // announcement's raw text (GARAGE_RE is checked before LAND_RE in the
  // shared classifier) because of "...zabudowę domami mieszkalnymi,
  // jednorodzinnymi, wolnostojącymi z garażami..." -- pure zoning boilerplate
  // about what may be BUILT there, never the sale's subject.
  assert.equal(resolveKindLocal(LAND_PIASKI_ANN_TITLE, LAND_PIASKI_ANN_TEXT), 'grunt');
  // A genuine garage-for-sale (singular "garażu"/"garażem") must still classify as a garage.
  assert.equal(resolveKindLocal('', 'sprzedaż garażu położonego przy ul. Krótkiej'), 'garaz');
  // Land WYNIK docs with no "działka"/"niezabudowana"/"grunt" word at all
  // (just "nr ewid. N/N o pow. 0,NNNN ha") still resolve to land.
  assert.equal(resolveKindLocal('', WYNIK_PIASKI_TEXT), 'grunt');
  assert.equal(resolveKindLocal(PORTOWA_ANN_TITLE, PORTOWA_ANN_TEXT), 'mieszkalny');
});

// ------------------------------------------------------------- active listings

test('parseAnnouncement: PENDING flat (real fixture, Portowa 18/16, article 13385) -> active listing carrying cena wywoławcza', () => {
  const rec = parseAnnouncement(PORTOWA_ANN_TITLE, PORTOWA_ANN_TEXT, 'https://bip.um.sandomierz.pl/13385/ogloszenie-o-i-przetargu-ustnym-nieograniczonym.html');
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Portowej 18/16');
  assert.equal(rec.address.street, 'Portowej');
  assert.equal(rec.address.building, '18');
  assert.equal(rec.address.apt, '16');
  assert.equal(rec.area_m2, 17.08);
  assert.equal(rec.starting_price_pln, 76500);
  assert.equal(rec.auction_date, '2024-10-24');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: a SECOND real pending flat (K.K.Baczyńskiego 9/14, article 8507) -- cross-check against an independent fixture', () => {
  const rec = parseAnnouncement(BACZYNSKIEGO_ANN_TITLE, BACZYNSKIEGO_ANN_TEXT, 'https://bip.um.sandomierz.pl/8507/ogloszenie-burmistrza-miasta-sandomierza-o-i-przetargu-ustnym-nieograniczonym.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'K.K.Baczyńskiego 9/14');
  assert.equal(rec.address.building, '9');
  assert.equal(rec.address.apt, '14');
  assert.equal(rec.area_m2, 27.30);
  assert.equal(rec.starting_price_pln, 99698);
  assert.equal(rec.auction_date, '2023-07-03');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: multi-parcel land (real fixture, Piaski, article 17543) -> first parcel kept, garage-zoning noise does not misclassify it', () => {
  const rec = parseAnnouncement(LAND_PIASKI_ANN_TITLE, LAND_PIASKI_ANN_TEXT, 'https://bip.um.sandomierz.pl/17543/132/ogloszenie-o-ii-przetargu-ustnym-nieograniczonym.html');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '2133/10');
  assert.equal(rec.area_m2, 1403); // 0,1403 ha
  assert.equal(rec.address_raw, 'ul. Piaski');
  assert.equal(rec.starting_price_pln, 67650);
  assert.equal(rec.auction_date, '2025-12-04');
  assert.equal(rec.round, 2);
});

test('parseAnnouncement: tenant-sale wykaz (na rzecz najemcy, bezprzetargowo) never reaches an active listing', () => {
  // crawl.js's candidateRole() gate (isAnnouncementTitle) skips these before
  // parseAnnouncement is ever called on them -- asserted directly here.
  assert.equal(isAnnouncementTitle(WYKAZ_NAJEMCA_KROLA_TITLE), false);
  // Three independently-confirmed real tenant-sale titles, all excluded the same way.
  assert.equal(isAnnouncementTitle('Wykaz lokalu mieszkalnego przeznaczonego do sprzedaży na rzecz najemcy'), false);
});

test('parseAnnouncement: rental (wolny lokal / licytacyjny wynajem) never reaches an active listing', () => {
  assert.equal(isAnnouncementTitle(WOLNY_LOKAL_TITLE), false); // no "przetarg" in title
  assert.equal(parseAnnouncement(RENTAL_LICYTACYJNY_TITLE, RENTAL_LICYTACYJNY_TEXT, 'x'), null); // body-gated
});

// ----------------------------------------------------------------- result records

test('parseResultDoc: Portowa 18/16 SOLD (real fixture, article 13746) -- cena osiągnięta/nabycia 92 000 zł + nabywca named', () => {
  const [r] = parseResultDoc(
    PORTOWA_WYNIK_TEXT,
    null,
    'https://bip.um.sandomierz.pl/13746/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci.html',
  );
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'Portowa 18/16');
  assert.equal(r.address.building, '18');
  assert.equal(r.address.apt, '16');
  assert.equal(r.starting_price_pln, 76500);
  assert.equal(r.final_price_pln, 92000); // matches the spike's confirmed "cena osiągnięta 92000 zł"
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2024-10-24');
  assert.equal(r.round, 1);
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: K.K.Baczyńskiego 9/14 SOLD (real fixture, article 8935) -- a second real sold flat, cross-checks the achieved-price parser', () => {
  const [r] = parseResultDoc(
    BACZYNSKIEGO_WYNIK_TEXT,
    null,
    'https://bip.um.sandomierz.pl/8935/informacja-o-wyniku-przetargu-na-sprzedaz-lokalu-mieszkalnego.html',
  );
  assert.ok(r);
  assert.equal(r.address_raw, 'K.K.Baczyńskiego 9/14');
  assert.equal(r.starting_price_pln, 99698);
  assert.equal(r.final_price_pln, 100698);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2023-07-03');
});

test('parseResultDoc: Piaski land UNSOLD (real fixture, article 17912) -- nobody paid the wadium', () => {
  const [r] = parseResultDoc(WYNIK_PIASKI_TEXT, null, 'https://bip.um.sandomierz.pl/17912/132/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci.html');
  assert.ok(r);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '2133/24');
  assert.equal(r.area_m2, 1036);
  assert.equal(r.address_raw, 'ul. Piaski');
  assert.equal(r.starting_price_pln, 66420);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2025-12-04');
});

test('parseResultDoc: Zaleśnej land UNSOLD via USTNY OGRANICZONY round III (real fixture, article 18157)', () => {
  const [r] = parseResultDoc(WYNIK_ZALESNEJ_TEXT, null, 'https://bip.um.sandomierz.pl/18157/132/informacja-o-wyniku-przetargu-na-sprzedaz-nieruchomosci.html');
  assert.ok(r);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '816/5');
  assert.equal(r.area_m2, 2648);
  assert.equal(r.starting_price_pln, 199260);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 3); // "III przetarg ustny ograniczony", not nieograniczony
  assert.equal(r.auction_date, '2025-12-30');
});

test('parseResultDoc: returns [] for a rental result title\'s body text (defensive; rentals are filtered before this point in crawl.js)', () => {
  assert.deepEqual(parseResultDoc('Informacja o wyniku przetargu na najem lokalu użytkowego położonego przy ul. Rynek 2.', null, 'x'), []);
});
