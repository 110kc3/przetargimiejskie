// Poddębice parser tests. Every fixture below is a faithful copy of REAL
// strings fetched live from bip.poddebice.pl on 2026-07-10 (board id=102,
// devcomm "bipv45"): titles are copied verbatim from the DataTables JSON list
// endpoint (&akcja=pobierz_dokumenty_ajax), and PDF bodies are the ACTUAL
// `pdftotext -layout` output of the real attachment (some trimmed to the
// contiguous lines the parsers actually read — verified byte-for-byte
// identical extraction results against the untrimmed document before
// trimming; see parse.js's file header for the full fixture catalogue).
//
//   p2=10065722  ul. Przejazd 18/28 — FLAT, PENDING, przetarg 7 lipca 2026,
//                cena 285.000 zł (wadium 28.500 zł), pow. 43,54 m2. No round
//                stated (this board never spells out round 1).
//   p2=10066232  Poddębice obr. 1, dz. 122/2 — LAND ("gruntowej
//                zabudowanej" — has an old outbuilding, still no street
//                address), PENDING, przetarg 22 lipca 2026, cena 20.000 zł
//                (wadium 2.000 zł, INLINE "t.j." phrasing — no bullet list),
//                pow. 54 m2.
//   p2=10056362  obręb Dzierzązna — LAND, 4-item multi-parcel notice
//                (182/3, 182/5, a 183/4+182/4 combo, 311), one wadium BULLET
//                each ("- dla działki nr … - N zł"), przetarg 3 listopada
//                2025.
//   p2=10064614  Poddębice obr. 6, dz. 5/5+5/6+5/7+5/8 — LAND, one 4-parcel
//                COMBO item, cena 5.120.000 zł (wadium 512.000 zł) via a 3rd
//                wadium phrasing: "t.j. dla działek Nr …, Nr … - N zł" (no
//                bullet, but names every parcel), przetarg 12 sierpnia 2026.
//   p2=10063641  obręb 11 + obręb Antonina (one notice, TWO obręby) — LAND,
//                2 items (dz. 84/8 obręb 11, dz. 112/2 obręb Antonina) via a
//                4th wadium phrasing with a "1.600,-zł" dash-grosze amount
//                and no leading "- " separator before the number, przetarg
//                26 maja 2026.
//   p2=10014817  "... o przetargu ustnym nieograniczonym dot. oddanie w
//                najem lokalu użytkowego - garażu ..." — LEASE (2022),
//                real title only (never reaches PDF parsing — the lease
//                gate fires on the title alone).
//   p2=10062730  "... w sprawie ustalenia wykazu i ogłoszenia do sprzedaży
//                w formie przetargu ustnego nieograniczonego nieruchomości
//                lokalowych ..." — WYKAZ PRE-ANNOUNCEMENT (no committed
//                date/price of its own yet), title only — excluded by
//                isAuctionSaleTitle, never reaches crawlActive's PDF fetch.
//   p2=10064020  "... wykazu nieruchomości lokalowych ... w trybie
//                bezprzetargowym na rzecz dotychczasowych najemców ..." —
//                tenant buy-out designation (never an auction), title only.
//
// GENUINE PARSER BUG found + fixed while groundtruthing this adapter: the
// shared core/classify-kind.js FLAT_RE requires "lokal" and "mieszkalny"
// adjacent ("lokal mieszkalny"), but every real Poddębice flat title reads
// "... na sprzedaż nieruchomości LOKALOWEJ ... w budynku MIESZKALNYM
// wielorodzinnym ..." — the words describe different nouns and are never
// adjacent, so classifyKind(title) alone returns 'grunt'/'unknown' for every
// real flat here (verified: a first crawlActive() run against live data
// found "0 flat listing(s), 27 land record(s)" — Przejazd 18 had been
// silently mis-routed into the land stream). Fixed in parse.js's
// kindFromTitle() by checking Poddębice's own "nieruchomości
// lokalowej/lokalowych" phrasing before falling back to classifyKind() —
// core/ is shared and was NOT modified. See the roundtripFlat vs
// classifyKind regression test below.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  auctionDateFromText,
  roundFromTitle,
  obrebFromTitle,
  streetFromTitle,
  isAuctionSaleTitle,
  isLeaseTitle,
  kindFromTitle,
  extractItems,
  areaTokens,
  parseAnnouncementPdf,
  parseResultDoc,
} from '../src/cities/poddebice/parse.js';
import { parseListJson, pdfUrlFromDetail } from '../src/cities/poddebice/crawl.js';
import { classifyKind } from '../src/core/classify-kind.js';

// --------------------------------------------------------------- real titles

const PRZEJAZD_18_TITLE =
  'Ogłoszenie Burmistrza Poddębic  z dnia 29 maja 2026 roku w sprawie przeprowadzenia przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowej usytuowanej w budynku mieszkalnym wielorodzinnym w Poddębicach przy ulicy Przejazd 18 wraz ze sprzedażą ułamkowych części gruntu pod budynkiem';

const POLUDNIOWA_II_TITLE =
  'OGŁOSZENIE BURMISTRZA PODDĘBIC  z dnia 30 listopada 2021 roku w sprawie  przeprowadzenia II przetargu ustnego nieograniczonego  na sprzedaż nieruchomości lokalowej usytuowanej w budynku mieszkalnym wielorodzinnym  w Poddębicach  przy ulicy Południowej 1A wraz z sprzedażą ułamkowej części gruntu pod budynkiem';

const ZABUDOWANA_122_2_TITLE =
  'Ogłoszenie Burmistrza Poddębic z dnia  15  czerwca 2026 roku w sprawie ogłoszenia i przeprowadzenia przetargu ustnego ograniczonego na sprzedaż nieruchomości gruntowej zabudowanej stanowiącej własność Gminy Poddębice położonej w Poddębicach w obrębie geodezyjnym nr 1';

const DZIERZAZNA_NOROUND_TITLE =
  'Ogłoszenie Burmistrza  Poddębic  z dnia   22 września 2025 roku w sprawie ogłoszenia i przeprowadzenia przetargu ustnego nieograniczonego  na  sprzedaż   nieruchomości  gruntowych  stanowiących własność Gminy Poddębice położonych w obrębie geodezyjnym  Dzierzązna';

const DZIERZAZNA_III_TITLE =
  'Ogłoszenie Burmistrza  Poddębic  z dnia  4  lutego 2026 roku w sprawie ogłoszenia i przeprowadzenia III przetargu ustnego nieograniczonego  na  sprzedaż   nieruchomości  gruntowych  stanowiących własność Gminy Poddębice położonych w obrębie geodezyjnym  Dzierzązna';

const OBREB6_TITLE =
  'Ogłoszenie Burmistrza Poddębic z dnia 8 maja 2026 roku w sprawie ogłoszenia i przeprowadzenia przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiących własność Gminy Poddębice położonych w Poddębicach w obrębie geodezyjnym Nr 6';

const ANTONINA_TITLE =
  'Ogłoszenie Burmistrza Poddębic z dnia  14  kwietnia 2026 roku w sprawie ogłoszenia i przeprowadzenia przetargu ustnego ograniczonego na sprzedaż nieruchomości gruntowych stanowiących własność Gminy Poddębice położonych  w Poddębicach w obrębie geodezyjnym nr 11 i w obrębie Antonina';

const LEASE_TITLE =
  'Ogłoszenie Burmistrza Poddębic z dnia 26.05.2022r. o przetargu ustnym nieograniczonym dot. oddanie w najem lokalu użytkowego - garażu o pow. 16,70 m2﻿ w obr. 8, stanowiącego własność Gminy Poddębice.';

const WYKAZ_PRECURSOR_TITLE =
  'Ogłoszenie Burmistrza  Poddębic  z dnia  19 marca 2026 roku w  sprawie ustalenia wykazu i ogłoszenia do sprzedaży w formie przetargu ustnego nieograniczonego nieruchomości lokalowych                     usytuowanych w budynkach mieszkalnych wielorodzinnych w Poddębicach wraz ze sprzedażą ułamkowych części  gruntu pod budynkiem';

const BEZPRZETARGOWO_TITLE =
  'Ogłoszenie Burmistrza  Poddębic  z dnia  23  kwietnia 2026 roku w  sprawie  podania  do publicznej wiadomości wykazu nieruchomości lokalowych usytuowanych w budynkach mieszkalnych wielorodzinnych  w Poddębicach przeznaczonych  do sprzedaży  w trybie  bezprzetargowym  na rzecz dotychczasowych najemców wraz ze sprzedażą ułamkowej części gruntu pod budynkiem.';

const CANCELLED_TITLE =
  'Informacja Burmistrza  Poddębic z dnia 15 maja 2020 roku w sprawie odwołania przetargu ustnego nieograniczonego ogłoszonego na dzień 19 maja 2020 roku na godzinę 10.00 dotyczącego sprzedaży nieruchomości lokalowej Nr 32 położonej w budynku mieszkalnym wielorodzinnym przy ul. Targowej 16/18 w Poddębicach.';

// --------------------------------------------------------- real PDF bodies
// (pdftotext -layout output, byte-faithful to the fetched attachment)

// p2=10065722, upload/pliki/OGLOSZENIE_o_przetargu_na_lokale.pdf (full text)
const PRZEJAZD_18_PDF = `                                                        OGŁOSZENIE BURMISTRZA PODDĘBIC
                                                                          z dnia 29 maja 2026 roku

             w sprawie przeprowadzenia przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowej usytuowanej w budynku
          mieszkalnym wielorodzinnym w Poddębicach przy ulicy Przejazd 18 wraz ze sprzedażą ułamkowych części gruntu pod budynkiem

          Stosownie do Zarządzenia Nr 263/2026 Burmistrza Poddębic z dnia 29 maja 2026r. oraz § 13 Rozporządzenia Rady Ministrów z dnia 14
      września 2004 roku w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz.U. z 2014 r. poz. 1490)
      ogłaszam przetarg ustny nieograniczony na sprzedaż opisanej w zamieszczonym wykazie nieruchomości lokalowej na niżej przedstawionych
      warunkach:
                 Wykaz nieruchomości lokalowej przeznaczonej do sprzedaży w formie przetargu ustnego nieograniczonego
          Położenie        Nr      Części składowe lokalu    Pow. użyt.    Udział ułamkowej       Nr KW           Cena lokalu, części Wadium w złotych     Postąpienie w
Nr         lokalu        lokalu                             lokalu w m2      części gruntu                      wspólnych i ułamkowej                         złotych
                                                                                                                  części gruntu w zł

1.        Poddębice       28       2 pokoje, kuchnia,         43,54        4354/186867 w      SR2L/00006230/8       285.000,00 zł           28.500,00 zł   2.850,00 zł
       ul. Przejazd 18               łazienka z wc i                        działce nr 184
                                       przedpokój                           o pow. 506m2                          (zwolnione z podatku
         IV piętro                                                                                               VAT zgodnie z art. 43

   Termin do złożenia wniosku przez osoby, którym przysługiwało pierwszeństwo w nabyciu nieruchomości na podstawie art. 34 ust.1pkt.1 i 2 ustawy
z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami (tj. Dz. U. z 2026 r. poz. 399) upłynął w dniu 05.05.2026 r. W w/w terminie nie wpłynął
żaden wniosek.

       W/w nieruchomość stanowi własność Gminy Poddębice i jest zabudowana budynkiem mieszkalnym wielorodzinnym.

             Przetarg odbędzie się w dniu 7 lipca 2026 roku /wtorek/ o godz. 1000 w siedzibie Urzędu Miejskiego w Poddębicach
       ul. Łódzka 17/21 Pokój Nr 116 I piętro/.

             W przetargu mogą brać udział osoby fizyczne i prawne, które wpłacą gotówką wadium w wysokości 10% ceny wywoławczej
       nieruchomości lokalowej i ułamkowej części gruntu t.j.
           • dla lokalu nr 28 przy ulicy Przejazd 18 – 28.500,00 zł (słownie: dwadzieścia osiem tysięcy pięćset złotych 00/100);

     na rachunek Urzędu Miejskiego w Poddębicach Bank Spółdzielczy w Poddębicach Nr 87 9263 0000 0000 0013 2000 0005 , wniosą obligacje
         Skarbu Państwa lub papiery wartościowe dopuszczone do obrotu publicznego w terminie do dnia 3 lipca 2026 r.
     Za datę wpłacenia wadium uważa się wpływ wymaganej kwoty na w/w rachunek.

                                                                                                                   Burmistrz Poddębic
                                                                                                                   (-) Piotr Sęczkowski`;

// p2=10066232, upload/pliki/33O___G___L___O___S___Z___E___N__I__E.pdf
// (trimmed: the ~28-line MPZP/zoning-history prose in the "Opis
// nieruchomości"/"Przeznaczenie w planie" columns is cut — verified live
// that no parser reads it; the table row, date and wadium clause below are
// otherwise byte-faithful and contiguous in the source)
const ZABUDOWANA_122_2_PDF = `                                                         O G Ł O S Z E N I E
                                               Burmistrza Poddębic z dnia 15 czerwca 2026 roku
        w sprawie ogłoszenia i przeprowadzenia przetargu ustnego ograniczonego na sprzedaż nieruchomości gruntowej zabudowanej
                       stanowiącej własność Gminy Poddębice położonej w Poddębicach w obrębie geodezyjnym nr 1

                               Wykaz nieruchomości przeznaczonej do sprzedaży stanowiącej własność Gminy Poddębice
Lp.   Położenie    Numer     Pow.      Nr Kw              Opis                Przeznaczenie w               Cena       Wadium w Postąpienie       Uwagi
                                 2
    nieruchomości działki w m                       nieruchomości         planie zagospodarowania nieruchomości złotych w złotych
                                                                                                          w złotych
                                                        Nieruchomość       Zgodnie z miejscowym planem                                               Przetarg ustny
1.    Poddębice     122/2   o pow. SR2L/00001536/8 położona jest w     zagospodarowania przestrzennego 20.000,00 zł      2.000,00 zł   200,00 zł       ograniczony
        obr. 1              54 m2                  centralnej części przyjętego uchwałą NR XXIV/158/04                                                  - warunki

         Termin do złożenia wniosku przez osoby, którym przysługiwało pierwszeństwo w nabyciu nieruchomości na podstawie art. 34 ust.1pkt.1 i 2 ustawy
  z dnia 21 sierpnia 1997roku o gospodarce nieruchomościami (tj. Dz. U. z 2026r. poz399) upłynął w dniu 06.05.2026 r. W w/w terminie nie wpłynął żaden
  wniosek.
       Przetarg odbędzie się w dniu 22 lipca 2026 roku /środa/ o godz. 1100 w siedzibie Urzędu Miejskiego w Poddębicach ul.
  Łódzka 17/21 /Pokój Nr 106, I piętro/.
        W przetargu na działkę 122/2 obręb 1 m. Poddębice mogą brać udział właściciele nieruchomości sąsiednich położonych w Poddębicach w obrębie
  geodezyjnym nr 1 oznaczonej działkami: nr 122/4 i nr 122/5 posiadający udział 1/2 w działkach nr 122/3 i 122/6 stanowiących drogę dojazdową oraz
  działką nr 121, którzy wpłacą gotówką wadium w wysokości 10% ceny wywoławczej nieruchomości t.j. 2.000,00 zł (słownie: dwa tysiące złotych);
        na rachunek Urzędu Miejskiego w Poddębicach Bank Spółdzielczy w Poddębicach Nr 87 9263 0000 0000 0013 2000 0005 lub wniosą

                                                                                                                Burmistrz Poddębic
                                                                                                                (-) Piotr Sęczkowski`;

// p2=10056362, upload/pliki/22O___G___L___O___S___Z___E___N__I__E.pdf
// (trimmed to the date + wadium-bullet section — verified live that this
// excerpt alone produces identical extractItems()/auctionDateFromText()
// results as the full 2-page document, which also carries a lengthy
// per-parcel "Opis nieruchomości" table no parser reads)
const DZIERZAZNA_PDF_EXCERPT = `          Przetarg odbędzie się w dniu 3 listopada 2025 roku /poniedziałek/ o godz. 1000 w siedzibie Urzędu Miejskiego
     w Poddębicach ul. Łódzka 17/21 /Sala Konferencyjna Nr 201, II piętro/.

           W przetargu mogą brać udział osoby, które wpłacą gotówką wadium w wysokości 10% ceny wywoławczej nieruchomości t.j.
     - dla działki nr 182/3 - 4.460,00 zł (słownie: cztery tysiące czterysta sześćdziesiąt złotych);
     - dla działki nr 182/5 - 4.550,00 zł (słownie: cztery tysiące pięćset pięćdziesiąt złotych);
     - dla działki nr 183/4 i nr 182/4 - 4.760,00 zł (słownie: cztery tysiące siedemset sześćdziesiąt złotych);
     - dla działki nr 311 - 8.290,00 zł (słownie: osiem tysięcy dwieście dziewięćdziesiąt złotych);`;

// p2=10064614, upload/pliki/Ogloszenie_uwagi_-_ek.pdf (trimmed the same way)
const OBREB6_PDF_EXCERPT = `Przetarg odbędzie się w dniu 12 sierpnia 2026 roku /środa/ o godz. 1100 w siedzibie Urzędu Miejskiego w Poddębicach
ul. Łódzka 17/21 /Pokój Nr 116 I piętro/.
W przetargu mogą brać udział osoby, które:
    • wpłacą gotówką wadium w wysokości 10% ceny wywoławczej nieruchomości t.j. dla działek Nr 5/5, Nr 5/6, Nr 5/7, Nr 5/8 m.
        Poddębice obręb Nr 6 - 512.000,00 zł (słownie: pięćset dwanaście tysięcy złotych) na rachunek Urzędu Miejskiego w Poddębicach`;

// p2=10063641, upload/pliki/31O___G___L___O___S___Z___E___N__I__E.pdf (trimmed)
const ANTONINA_PDF_EXCERPT = `     Przetarg odbędzie się w dniu 26 maja 2026 roku /wtorek/ o godz. 1000 w siedzibie Urzędu Miejskiego w Poddębicach ul.
Łódzka 17/21 /Pokój Nr 101, I piętro/.
      W przetargu na działkę 84/8 obręb 11 m. Poddębice mogą brać udział właściciele nieruchomości sąsiednich położonych w Poddębicach w obrębie
geodezyjnym nr 11 oznaczonych działkami: nr 111 nr 82/6, nr 84/5 którzy wpłacą gotówką wadium w wysokości 10% ceny wywoławczej
nieruchomości.
      W przetargu na działkę 112/2 obręb Antonina mogą brać udział właściciele nieruchomości sąsiednich położonych w obrębie geodezyjnym
Antonina oznaczonych działkami: nr 111, nr 112/1, nr 112/3, nr 112/4, nr 113, którzy wpłacą gotówką wadium w wysokości 10% ceny wywoławczej
nieruchomości. t.j.
      - dla działki nr 84/8 obręb nr 11 w Poddębicach 1.600,-zł (słownie: jeden tysiąc sześćset złotych);
      - dla działki nr 112/2 obręb Antonina 1.000,-zł (słownie: jeden tysiąc złotych);
      na rachunek Urzędu Miejskiego w Poddębicach Bank Spółdzielczy w Poddębicach Nr 87 9263 0000 0000 0013 2000 0005 lub wniosą`;

// ------------------------------------------------------------------ unit funcs

test('parsePLN: dot-thousands, grosze tail, dashless integer', () => {
  assert.equal(parsePLN('285.000,00'), 285000);
  assert.equal(parsePLN('20.000,00'), 20000);
  assert.equal(parsePLN('512.000,00'), 512000);
  assert.equal(parsePLN('1.600'), 1600);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(null), null);
});

test('auctionDateFromText: "Przetarg odbędzie się w dniu D MONTH YYYY roku" across every fixture', () => {
  assert.equal(auctionDateFromText(PRZEJAZD_18_PDF), '2026-07-07');
  assert.equal(auctionDateFromText(ZABUDOWANA_122_2_PDF), '2026-07-22');
  assert.equal(auctionDateFromText(DZIERZAZNA_PDF_EXCERPT), '2025-11-03');
  assert.equal(auctionDateFromText(OBREB6_PDF_EXCERPT), '2026-08-12');
  assert.equal(auctionDateFromText(ANTONINA_PDF_EXCERPT), '2026-05-26');
  assert.equal(auctionDateFromText('no date here'), null);
});

test('roundFromTitle: unstated (round 1 is never spelled out) vs II / III', () => {
  assert.equal(roundFromTitle(PRZEJAZD_18_TITLE), null);
  assert.equal(roundFromTitle(DZIERZAZNA_NOROUND_TITLE), null);
  assert.equal(roundFromTitle(POLUDNIOWA_II_TITLE), 2);
  assert.equal(roundFromTitle(DZIERZAZNA_III_TITLE), 3);
});

test('obrebFromTitle: numeric "nr 1" vs named "Dzierzązna"', () => {
  assert.equal(obrebFromTitle(ZABUDOWANA_122_2_TITLE), '1');
  assert.equal(obrebFromTitle(DZIERZAZNA_NOROUND_TITLE), 'Dzierzązna');
  assert.equal(obrebFromTitle(PRZEJAZD_18_TITLE), null); // flat title has no obręb clause
});

test('streetFromTitle: "przy ulicy Przejazd 18" title fallback', () => {
  assert.deepEqual(streetFromTitle(PRZEJAZD_18_TITLE), { street: 'Przejazd', building: '18' });
  assert.equal(streetFromTitle(ZABUDOWANA_122_2_TITLE), null);
});

test('isAuctionSaleTitle: scheduled sale auctions (flat + land) pass, wykaz/bezprzetargowo/cancelled/lease fail', () => {
  assert.equal(isAuctionSaleTitle(PRZEJAZD_18_TITLE), true);
  assert.equal(isAuctionSaleTitle(POLUDNIOWA_II_TITLE), true);
  assert.equal(isAuctionSaleTitle(ZABUDOWANA_122_2_TITLE), true);
  assert.equal(isAuctionSaleTitle(DZIERZAZNA_NOROUND_TITLE), true);
  assert.equal(isAuctionSaleTitle(OBREB6_TITLE), true);
  assert.equal(isAuctionSaleTitle(ANTONINA_TITLE), true);
  assert.equal(isAuctionSaleTitle(WYKAZ_PRECURSOR_TITLE), false); // no committed date/price yet
  assert.equal(isAuctionSaleTitle(BEZPRZETARGOWO_TITLE), false); // never an auction
  assert.equal(isAuctionSaleTitle(CANCELLED_TITLE), false);
  assert.equal(isAuctionSaleTitle(LEASE_TITLE), false); // no "sprzedaż"
});

test('isLeaseTitle: the real 2022 garage-lease title, vs a real sale title', () => {
  assert.equal(isLeaseTitle(LEASE_TITLE), true);
  assert.equal(isLeaseTitle(PRZEJAZD_18_TITLE), false);
});

test('kindFromTitle: REGRESSION for the classifyKind adjacency bug — every real flat title', () => {
  // The bug: classifyKind() alone (the shared, un-editable core util) does
  // NOT resolve these to 'mieszkalny' because "lokalowej"/"mieszkalnym"
  // describe different nouns and are never adjacent in Poddębice's phrasing.
  assert.notEqual(classifyKind(PRZEJAZD_18_TITLE), 'mieszkalny');
  assert.notEqual(classifyKind(POLUDNIOWA_II_TITLE), 'mieszkalny');
  // kindFromTitle() fixes it at the adapter level:
  assert.equal(kindFromTitle(PRZEJAZD_18_TITLE), 'mieszkalny');
  assert.equal(kindFromTitle(POLUDNIOWA_II_TITLE), 'mieszkalny');
  // Land titles (incl. one classifyKind can't resolve at all -> 'unknown')
  // still correctly route to 'grunt':
  assert.equal(classifyKind(OBREB6_TITLE), 'unknown');
  assert.equal(kindFromTitle(OBREB6_TITLE), 'grunt');
  assert.equal(kindFromTitle(ZABUDOWANA_122_2_TITLE), 'grunt');
  assert.equal(kindFromTitle(DZIERZAZNA_NOROUND_TITLE), 'grunt');
  assert.equal(kindFromTitle(ANTONINA_TITLE), 'grunt');
});

test('extractItems: flat single wadium bullet (Przejazd 18)', () => {
  const items = extractItems(PRZEJAZD_18_PDF, true);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].ids, ['28']);
  assert.equal(items[0].street, 'Przejazd');
  assert.equal(items[0].building, '18');
  assert.equal(items[0].wadium, 28500);
});

test('extractItems: land single-item INLINE "t.j. AMOUNT zł" (dz. 122/2, no bullet list)', () => {
  const items = extractItems(ZABUDOWANA_122_2_PDF, false);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].ids, ['122/2']);
  assert.equal(items[0].wadium, 2000);
});

test('extractItems: land 4-item BULLET list incl. a 2-parcel combo (Dzierzązna)', () => {
  const items = extractItems(DZIERZAZNA_PDF_EXCERPT, false);
  assert.equal(items.length, 4);
  assert.deepEqual(items.map((i) => i.ids), [['182/3'], ['182/5'], ['183/4', '182/4'], ['311']]);
  assert.deepEqual(items.map((i) => i.wadium), [4460, 4550, 4760, 8290]);
});

test('extractItems: land INLINE combo naming every parcel (obr. 6, "t.j. dla działek Nr …")', () => {
  const items = extractItems(OBREB6_PDF_EXCERPT, false);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].ids, ['5/5', '5/6', '5/7', '5/8']);
  assert.equal(items[0].wadium, 512000);
});

test('extractItems: multi-obręb OBREB_BULLET path, dash-grosze amounts, per-item obręb (Antonina)', () => {
  const items = extractItems(ANTONINA_PDF_EXCERPT, false);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].ids, ['84/8']);
  assert.equal(items[0].obreb, '11');
  assert.equal(items[0].wadium, 1600);
  assert.deepEqual(items[1].ids, ['112/2']);
  assert.equal(items[1].obreb, 'Antonina');
  assert.equal(items[1].wadium, 1000);
});

test('areaTokens: flat usable area sits before the udział fraction, land area is the sole "m2" token', () => {
  assert.deepEqual(areaTokens(PRZEJAZD_18_PDF, true), [43.54]);
  assert.deepEqual(areaTokens(ZABUDOWANA_122_2_PDF, false), [54]);
});

// ------------------------------------------------------------- active listings

test('parseAnnouncementPdf: PENDING flat (real fixture, Przejazd 18/28)', () => {
  const [rec] = parseAnnouncementPdf(PRZEJAZD_18_PDF, PRZEJAZD_18_TITLE, '2026-05-29', 'https://bip.poddebice.pl/upload/pliki/OGLOSZENIE_o_przetargu_na_lokale.pdf');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'przejazd|18|28');
  assert.equal(rec.address.street, 'Przejazd');
  assert.equal(rec.address.building, '18');
  assert.equal(rec.address.apt, '28');
  assert.equal(rec.area_m2, 43.54);
  assert.equal(rec.starting_price_pln, 285000); // wadium 28.500 x 10, cross-checked against the table's own 285.000,00 zł cell
  assert.equal(rec.auction_date, '2026-07-07');
  assert.equal(rec.round, null);
});

test('parseAnnouncementPdf: PENDING land, single parcel (real fixture, obr. 1 dz. 122/2)', () => {
  const [rec] = parseAnnouncementPdf(ZABUDOWANA_122_2_PDF, ZABUDOWANA_122_2_TITLE, '2026-06-15', 'https://bip.poddebice.pl/upload/pliki/33O___G___L___O___S___Z___E___N__I__E.pdf');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '122/2');
  assert.equal(rec.obreb, '1');
  assert.equal(rec.address_raw, 'Poddębice, obręb 1');
  assert.equal(rec.area_m2, 54);
  assert.equal(rec.starting_price_pln, 20000); // wadium 2.000 x 10, cross-checked against the table's own 20.000,00 zł cell
  assert.equal(rec.auction_date, '2026-07-22');
  assert.equal(rec.round, null);
});

test('parseAnnouncementPdf: PENDING land, 4-parcel notice splits into 4 records (Dzierzązna)', () => {
  const recs = parseAnnouncementPdf(DZIERZAZNA_PDF_EXCERPT, DZIERZAZNA_NOROUND_TITLE, '2025-09-22', 'https://bip.poddebice.pl/upload/pliki/22O___G___L___O___S___Z___E___N__I__E.pdf');
  assert.equal(recs.length, 4);
  assert.deepEqual(recs.map((r) => r.kind), ['grunt', 'grunt', 'grunt', 'grunt']);
  assert.deepEqual(recs.map((r) => r.dzialka_nr), ['182/3', '182/5', '183/4, 182/4', '311']);
  assert.deepEqual(recs.map((r) => r.obreb), ['Dzierzązna', 'Dzierzązna', 'Dzierzązna', 'Dzierzązna']);
  // cross-checked against the table's own cena cells (44.600 / 45.500 / 47.600 / 82.900 zł)
  assert.deepEqual(recs.map((r) => r.starting_price_pln), [44600, 45500, 47600, 82900]);
  // multi-item land notices leave area_m2 null rather than risk a
  // mis-associated value — see parse.js's areaTokens() header comment.
  assert.deepEqual(recs.map((r) => r.area_m2), [null, null, null, null]);
  assert.deepEqual(recs.map((r) => r.auction_date), ['2025-11-03', '2025-11-03', '2025-11-03', '2025-11-03']);
});

test('parseAnnouncementPdf: PENDING land, 4-parcel COMBO sold as one item (obr. 6)', () => {
  const [rec] = parseAnnouncementPdf(OBREB6_PDF_EXCERPT, OBREB6_TITLE, '2026-05-08', 'https://bip.poddebice.pl/upload/pliki/Ogloszenie_uwagi_-_ek.pdf');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '5/5, 5/6, 5/7, 5/8');
  assert.equal(rec.obreb, '6');
  assert.equal(rec.starting_price_pln, 5120000); // wadium 512.000 x 10, cross-checked against the source's 5.120.000,00 zł cena
  assert.equal(rec.auction_date, '2026-08-12');
});

test('parseAnnouncementPdf: PENDING land, multi-obręb notice splits by obręb (Antonina)', () => {
  const recs = parseAnnouncementPdf(ANTONINA_PDF_EXCERPT, ANTONINA_TITLE, '2026-04-14', 'https://bip.poddebice.pl/upload/pliki/31O___G___L___O___S___Z___E___N__I__E.pdf');
  assert.equal(recs.length, 2);
  assert.equal(recs[0].dzialka_nr, '84/8');
  assert.equal(recs[0].obreb, '11');
  assert.equal(recs[0].address_raw, 'Poddębice, obręb 11');
  assert.equal(recs[0].starting_price_pln, 16000); // wadium 1.600 x 10, cross-checked against the table's own 16.000,00 zł cell
  assert.equal(recs[1].dzialka_nr, '112/2');
  assert.equal(recs[1].obreb, 'Antonina');
  assert.equal(recs[1].address_raw, 'Antonina');
  assert.equal(recs[1].starting_price_pln, 10000); // wadium 1.000 x 10, cross-checked against the table's own 10.000,00 zł cell
  assert.deepEqual(recs.map((r) => r.auction_date), ['2026-05-26', '2026-05-26']);
});

test('parseAnnouncementPdf: LEASE (real 2022 garage-lease title) never reaches a listing — gated on title alone', () => {
  assert.deepEqual(parseAnnouncementPdf('irrelevant body text, never read', LEASE_TITLE, '2022-05-27', 'x'), []);
});

test('parseAnnouncementPdf: wykaz pre-announcement / bezprzetargowo titles are excluded upstream by isAuctionSaleTitle', () => {
  // crawl.js's candidate filter (isAuctionSaleTitle && !isLeaseTitle) skips
  // these before a PDF is ever fetched for them — asserted directly here
  // against the real fixture titles, mirroring naklo-nad-notecia's isLease
  // gate test.
  assert.equal(isAuctionSaleTitle(WYKAZ_PRECURSOR_TITLE), false);
  assert.equal(isAuctionSaleTitle(BEZPRZETARGOWO_TITLE), false);
});

// ----------------------------------------------------------------- result docs

test('parseResultDoc: no live result notice exists for this city — returns [] for unrelated text', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc('Zaproszenie do złożenia oferty cenowej.', null, 'x'), []);
  // Even Poddębice's own announcement PDFs (which name "Burmistrz Poddębic"
  // but never state a result) shouldn't fabricate a record: no price/outcome
  // signal at all beyond the guard phrase.
  assert.deepEqual(parseResultDoc('Burmistrz Poddębic ogłasza przetarg.', null, 'x'), []);
});

// ----------------------------------------------------------- board JSON + HTML

test('parseListJson: extracts title/date/p2 from the real DataTables aaData shape', () => {
  // Real rows captured live 2026-07-10 (poddebice-list.json), row indices
  // per the spike: [2]=title, [5]=date, [9]=p2.
  const json = JSON.stringify({
    sEcho: '1',
    iTotalRecords: 279,
    iTotalDisplayRecords: 279,
    aaData: [
      [
        '0', 'Miśkiewicz-Kowalczyk Paulina', PRZEJAZD_18_TITLE, '',
        'Miśkiewicz-Kowalczyk Paulina', '2026-05-29', '10077912', '3824', '0',
        '10065722', '102', '', '', '', '1', '28681', '160',
      ],
      [
        '0', 'Karwacka Sylwia', LEASE_TITLE, '',
        'Karwacka Sylwia', '2022-05-27', '10019300', '3824', '0',
        '10014817', '102', '', '', '', '1', '10000329', '160',
      ],
    ],
  });
  const entries = parseListJson(json);
  assert.equal(entries.length, 2);
  // parseListJson collapses the source's inconsistent double/triple spacing
  // (a PDF-generated-title artifact, e.g. "Poddębic  z dnia") to single
  // spaces — the other real-title constants in this file are asserted
  // against verbatim elsewhere (they only feed regexes, which already treat
  // \s+ as one gap), so only this specific parseListJson output check needs
  // the normalized form.
  assert.equal(entries[0].title, PRZEJAZD_18_TITLE.replace(/\s+/g, ' '));
  assert.equal(entries[0].date, '2026-05-29');
  assert.equal(entries[0].p2, '10065722');
  assert.equal(entries[1].p2, '10014817');
});

test('parseListJson: malformed JSON / missing aaData -> []', () => {
  assert.deepEqual(parseListJson('not json'), []);
  assert.deepEqual(parseListJson('{}'), []);
  assert.deepEqual(parseListJson(''), []);
});

test('pdfUrlFromDetail: extracts + resolves the real relative "upload/pliki/*.pdf" link', () => {
  // Real snippet captured live from the Przejazd 18 detail page
  // (index.php?id=102&p1=szczegoly&p2=10065722).
  const html =
    '<div class="info-value"><div class="element-content-link">' +
    '<a onclick="zapisz_pobranie(10077912)" href="upload/pliki/OGLOSZENIE_o_przetargu_na_lokale.pdf">' +
    '<img alt="ikona pliku" src="_img/pdfico.gif"/>&nbsp;<span>Plik źródłowy (pdf)</span>' +
    '<span> (149.39 KB)</span></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>';
  assert.equal(
    pdfUrlFromDetail(html),
    'https://bip.poddebice.pl/upload/pliki/OGLOSZENIE_o_przetargu_na_lokale.pdf',
  );
});

test('pdfUrlFromDetail: no attachment link -> null', () => {
  assert.equal(pdfUrlFromDetail('<div>no attachment here</div>'), null);
  assert.equal(pdfUrlFromDetail(''), null);
});
