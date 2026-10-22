// Prudnik parser tests. Fixtures are faithful copies of REAL pdftotext output
// from bip.prudnik.pl PDFs (verified 2026-10-22):
//
// 1. ANN_RYNEK_20: article 2266 / 2110 — Rynek 20/8, 32.90 m², wyw. 160.000 zł
// 2. RESULT_RYNEK_20: article 2110 — 18.06.2026, 160.000 zł, wynik negatywny (unsold)
// 3. ANN_PARKOWA_8: article 1782 — Parkowa 8/5, 76.09 m², wyw. 162.600 zł, round 4
// 4. RESULT_PARKOWA_8: article 1782 — 12.11.2025, 162.600 → 164.260 zł, Bernadeta Bednarczuk (SOLD)
// 5. ANN_MULTI_665: article 665 — Klasztorna 8/10, Klasztorna 16/2, Chrobrego 11/5
// 6. RESULT_MULTI_665: article 665 — Klasztorna 16/2 (SOLD 56.600 zł), Chrobrego 11/5 (SOLD 39.800 zł)
// 7. RESULT_RYNEK_9: article 1485 — 07.05.2025, Rynek 9/7 106.000 → 107.060 zł (SOLD)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isResultNotice,
  isSkippableTitle,
  parsePLN,
  parseArea,
  auctionDateFromText,
  resultDateFromText,
  extractLotRound,
  extractAddressFromLot,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/prudnik/parse.js';

import {
  parseArticleList,
  parsePdfAttachments,
  classifyAttachment,
} from '../src/cities/prudnik/crawl.js';

// ─────────────────────────── REAL FIXTURES ───────────────────────────────────

const ANN_RYNEK_20 = `MG-III.6840.1.2025                                                     Prudnik, dnia 13.05.2026 r.

                                        OGŁOSZENIE O PRZETARGU
Burmistrz Prudnika ogłasza, że w dniu 18 czerwca 2026 roku o godzinie 1100 w Urzędzie Miejskim w Prudniku
przy ul. Kościuszki nr 3, piętro I - sala nr 117 odbędzie się przetarg ustny nieograniczony ogłoszony w celu
zbycia niżej wymienionej nieruchomości, stanowiącej własność Gminy Prudnik.

PRZETARG PO RAZ PIERWSZY

        Położenie i oznaczenie nieruchomości                                   Opis nieruchomości
  Księga wieczysta prowadzona dla budynku Nr      Lokal mieszkalny nr 8 położony III piętrze w budynku przy ul. Rynek 20
 OP1P/00029756/9.                                 w Prudniku, złożony z jednego pokoju, kuchni, przedpokoju oraz łazienki
 Księga wieczysta prowadzona dla lokalu Nr        z wc o powierzchni użytkowej 32,90 m2. Do lokalu przynależy piwnica
 OP1P/00044340/1                                  o powierzchni 4,58 m2. Łączna powierzchnia lokalu mieszkalnego wraz z pomieszczeniem
 Budynek położony w Prudniku przy ul. Rynek 20    przynależnym wynosi 37,48 m2.

                                             Przeznaczenie nieruchomości, sposób i terminy jej zagospodarowania
 Nabywca nieruchomości ma obowiązek korzystania z nieruchomości zgodnie z jej przeznaczeniem – jako lokal mieszkalny.
 Sposób zbycia - sprzedaż lokalu mieszkalnego wraz ze sprzedażą udziału 63/1000 części w nieruchomości wspólnej, w tym w gruncie.
 Cena wywoławcza brutto – 160.000,00 zł /sprzedaż zwolniona z podatku Vat/
 Wysokość wadium – 16.000,00 zł`;

const RESULT_RYNEK_20 = `MG-III.6840.1.2025                                                    Prudnik, dnia 26.06.2026 r.

                                     Informacja o wyniku przetargu ustnego nieograniczonego przeprowadzonego
                                           w dniu 18 czerwca 2026 roku w Urzędzie Miejskim w Prudniku.

                                                     Liczba osób        Liczba osób nie
                                                                                           Cena wywoławcza    Najwyższa cena       Imię i nazwisko
          Oznaczenie nieruchomości będącej          dopuszczonych       dopuszczonych
Lp.                                                                                         nieruchomości       osiągnięcia        osoby ustalonej
               przedmiotem przetargu               do uczestniczenia   do uczestniczenia
                                                                                                brutto         w przetargu          jako nabywca
                                                      w przetargu         w przetargu
      Lokal mieszkalny nr 8 położony w budynku
              przy ul. Rynek w Prudniku,
      wraz z udziałem 63/1000 części w działkach
        nr 1328/125 (nowy nr 5487), 1325/124
                                                                                                                 Przetarg zakończył się wynikiem
       (nowy nr 5485) oraz 1322/123 (nowy nr
1.                                                     nie było            nie było          160.000,00 zł     negatywnym, ponieważ nikt do niego
        5482) o łącznej powierzchni 0,0167 ha,
                                                                                                                           nie przystąpił.
      Księgą wieczysta prowadzona dla budynku
                Nr OP1P/00029756/9`;

const ANN_PARKOWA_8 = `MG-V.6840.20.2023                                                      Prudnik, dnia 08.10.2025 r.

                                        OGŁOSZENIE O PRZETARGACH
Burmistrz Prudnika ogłasza, że w dniu 12 listopada 2025 roku o godzinie 1000 w Urzędzie Miejskim w Prudniku
przy ul. Kościuszki nr 3 pokój nr 117 odbędą się przetargi ustne nieograniczone ogłoszone w celu zbycia
niżej wymienionych nieruchomości, stanowiących własność Gminy Prudnik.

PRZETARG PO RAZ CZWARTY
                 Położenie
                                                                                               Opis nieruchomości
        i oznaczenie nieruchomości
 1. Księga wieczysta prowadzona dla       Lokal mieszkalny nr 5 położony I piętrze budynku przy ul. Parkowej 8 w Prudniku, złożony z jednego pokoju z wykuszem,
 budynku Nr OP1P/00029780/6.              kuchni, przedpokoju oraz łazienki o powierzchni użytkowej 76,09 m2. Do lokalu przynależy 1 pokój i przedpokój
Lokal mieszkalny nr 5                     o powierzchni 29,52 m2. Łączna powierzchnia lokalu mieszkalnego wraz z pomieszczeniami przynależnymi wynosi 105,61 m2.
usytuowany w budynku położonym
w Prudniku przy ul. Parkowej 8

                                               Przeznaczenie nieruchomości, sposób i terminy jej zagospodarowania
Nabywca nieruchomości ma obowiązek korzystania z nieruchomości zgodnie z jej przeznaczeniem – jako lokal mieszkalny.
Sposób zbycia - sprzedaż lokalu mieszkalnego wraz ze sprzedażą udziału 6/100 części w nieruchomości wspólnej, w tym w gruncie.
Cena wywoławcza brutto – 162.600,00 zł - sprzedaż zwolniona z podatku VAT
Wysokość wadium – 16.260,00 zł
I przetarg odbył się 07.05.2025 r.
II przetarg odbył się 25.06.2025 r.
III przetarg odbył się 09.09.2025 r.

Przetargi przeprowadza się na każdą nieruchomość oddzielnie.`;

const RESULT_PARKOWA_8 = `MG-II.6840.1.2021                                                      Prudnik, dnia 20.11.2025 r.

                                     Informacja o wynikach przetargu ustnego nieograniczonego przeprowadzonego
                                           w dniu 12 listopada 2025 roku w Urzędzie Miejskim w Prudniku

                                                Liczba osób        Liczba osób nie
                                                                                                        Najwyższa cena          Imię i nazwisko
       Oznaczenie nieruchomości będącej       dopuszczonych        dopuszczonych      Cena wywoławcza
Lp.                                                                                                       osiągnięcia           osoby ustalonej
           przedmiotem przetargu            do uczestniczenia w   do uczestniczenia    nieruchomości
                                                                                                         w przetargu             jako nabywca
                                                 przetargu          w przetargu

     Lokal mieszkalny przy
7.   ul. Parkowej 8/5 w Prudniku             1       nie było   162.600,00 zł       164.260,00 zł        Bernadeta Bednarczuk
     o pow. 105,61 m2.`;

const ANN_MULTI_665 = `MG-V.6840.20.2022                                                        Prudnik, dnia 06.09.2023 r.

                                        OGŁOSZENIE O PRZETARGACH
Burmistrz Prudnika ogłasza, że w dniu 18 października 2023 roku o godzinie 1000 w Urzędzie Miejskim w Prudniku
przy ul. Kościuszki nr 3 pokój nr 117 odbędą się przetargi ustne nieograniczone.

Lokal mieszkalny nr 10 położony na poddaszu (III piętrze) budynku przy ul. Klasztornej 8 w Prudniku, złożony z dwóch pokoi oraz kuchni o pow. użytkowej 48,85 m2.
Cena wywoławcza brutto – 58.400,00 zł /sprzedaż zwolniona z podatku Vat/
Wysokość wadium – 5.840,00 zł

Lokal mieszkalny nr 2 położony na I piętrze budynku przy ul. Klasztornej 16 w Prudniku, złożony z 2 pokoi oraz kuchni o powierzchni użytkowej 54,53 m2.
Cena wywoławcza brutto – 56.000,00 zł /sprzedaż zwolniona z podatku Vat/
Wysokość wadium – 5.600,00 zł

Lokal mieszkalny nr 5 położony na II piętrze budynku przy ul. Chrobrego 11 w Prudniku, złożony z 2 pokoi oraz kuchni o powierzchni użytkowej 62,11 m2.
Cena wywoławcza brutto – 39.400,00 zł /sprzedaż zwolniona z podatku Vat/
Wysokość wadium – 3.940,00 zł
Pierwszy przetarg odbył się 21 czerwca 2022 r.
Drugi przetarg odbył się 12 października 2022 r.
Trzeci przetarg odbył się 29 marca 2023 r.
Czwarty przetarg odbył się 20 czerwca 2023 r.

Przetargi przeprowadza się na każdą nieruchomość oddzielnie.`;

const RESULT_MULTI_665 = `MG-V.6840.20.2022                                                    Prudnik, dnia 26.10.2023 r.

                          Informacja o wynikach przetargów ustnych nieograniczonych przeprowadzonych
                                w dniu 18 października 2023 roku w Urzędzie Miejskim w Prudniku

                                                  Liczba osób      Liczba osób nie
                                                                                           Cena       Najwyższa cena      Imię i nazwisko
       Oznaczenie nieruchomości będącej          dopuszczonych     dopuszczonych
Lp.                                                                                    wywoławcza       osiągnięcia       osoby ustalonej
           przedmiotem przetargu                do uczestniczenia do uczestniczenia
                                                                                      nieruchomości    w przetargu         jako nabywca
                                                  w przetargu       w przetargu

     Lokal mieszkalny nr 10 położony
     w Prudniku przy ul. Klasztornej 8
                                                        58.400,00 zł
4.   wraz z udziałem 10/100 w części      brak   brak                        Przetarg zakończony negatywnie
                                                        - zw. z VAT
       wspólnej, w tym w gruncie,
          KW OP1P/00041820/9

      Lokal mieszkalny nr 2 położony
     w Prudniku przy ul. Klasztornej 16
                                                        56.000,00 zł        56.600,00 zł         Arkadiusz
5.   wraz z udziałem 82/1000 w części      1     brak
                                                        - zw. z VAT         - zw. z VAT          Samborski
        wspólnej, w tym w gruncie,
          KW OP1P/00054690/2

      Lokal mieszkalny nr 5 położony
     w Prudniku przy ul. Chrobrego 11
                                                        39.400,00 zł        39.800,00 zł
6.   wraz z udziałem 14/100 w części       1     brak                                          Tomasz Gaura
                                                        - zw. z VAT         - zw. z VAT
        wspólnej, w tym w gruncie,
          KW OP1P/00041113/0`;

const RESULT_RYNEK_9 = `MG-V.6840.1.2025                                                      Prudnik, dnia 15.05.2025 r.

                     Informacja o wyniku przetargów ustnych nieograniczonych przeprowadzonych
                              w dniu 07 maja 2025 roku w Urzędzie Miejskim w Prudniku

       Lokal mieszkalny przy
 1.    ul. Parkowej 8/5 w Prudniku             nie było   nie było   271.000,00 zł   Przetarg zakończył się wynikiem negatywnym

       Lokal mieszkalny nr 7 położony przy
 2.    ul. Rynek 9 w Prudniku                     1       nie było   106.000,00 zł     107.060,00 zł      Jan Kowalski`;

// ─────────────────────────── isResultNotice ──────────────────────────────────

test('isResultNotice: correctly distinguishes result notices from announcements', () => {
  assert.equal(isResultNotice(RESULT_RYNEK_20), true);
  assert.equal(isResultNotice(RESULT_PARKOWA_8), true);
  assert.equal(isResultNotice(RESULT_MULTI_665), true);
  assert.equal(isResultNotice(RESULT_RYNEK_9), true);
  assert.equal(isResultNotice(ANN_RYNEK_20), false);
  assert.equal(isResultNotice(ANN_PARKOWA_8), false);
  assert.equal(isResultNotice(ANN_MULTI_665), false);
});

// ─────────────────────────── isSkippableTitle ────────────────────────────────

test('isSkippableTitle: skips bare land and vehicle auctions, retains flats', () => {
  assert.equal(isSkippableTitle('sprzedaż nieruchomości niezabudowanej dz. nr 600/7'), true);
  assert.equal(isSkippableTitle('sprzedaż nieruchomości rolnej - dz. 127'), true);
  assert.equal(isSkippableTitle('teren specjalnej strefy ekonomicznej w Prudniku'), true);
  assert.equal(isSkippableTitle('lokal mieszkalny ul. Rynek 20/8'), false);
  assert.equal(isSkippableTitle('lokalu mieszkalnego nr 5 przy ul. Parkowej 8'), false);
  assert.equal(isSkippableTitle('dot. lokali mieszkalnych przy ul. Klasztornej 8/10'), false);
  assert.equal(isSkippableTitle('przetarg ustny nieograniczony na zbycie nieruchomości'), false);
});

// ─────────────────────────── dates & numbers ─────────────────────────────────

test('auctionDateFromText & resultDateFromText: formats Polish date expressions to ISO', () => {
  assert.equal(auctionDateFromText(ANN_RYNEK_20), '2026-06-18');
  assert.equal(auctionDateFromText(ANN_PARKOWA_8), '2025-11-12');
  assert.equal(auctionDateFromText(ANN_MULTI_665), '2023-10-18');

  assert.equal(resultDateFromText(RESULT_RYNEK_20), '2026-06-18');
  assert.equal(resultDateFromText(RESULT_PARKOWA_8), '2025-11-12');
  assert.equal(resultDateFromText(RESULT_MULTI_665), '2023-10-18');
  assert.equal(resultDateFromText(RESULT_RYNEK_9), '2025-05-07');
});

test('parsePLN & parseArea: handles dot-thousands and Polish comma decimals', () => {
  assert.equal(parsePLN('160.000,00 zł'), 160000);
  assert.equal(parsePLN('164 260,00 zł'), 164260);
  assert.equal(parsePLN('58.400,00'), 58400);
  assert.equal(parseArea('32,90'), 32.9);
  assert.equal(parseArea('105,61 m2'), 105.61);
});

// ─────────────────────────── extractLotRound ─────────────────────────────────

test('extractLotRound: counts prior tenders or reads Roman numeral / word heading', () => {
  assert.equal(extractLotRound(ANN_RYNEK_20), 1);
  assert.equal(extractLotRound(ANN_PARKOWA_8), 4); // 3 prior rounds + heading PO RAZ CZWARTY
  assert.equal(extractLotRound('PRZETARGI PO RAZ DRUGI'), 2);
  assert.equal(extractLotRound('PRZETARG PO RAZ TRZECI'), 3);
});

// ─────────────────────────── address extraction ──────────────────────────────

test('extractAddressFromLot: parses streets with embedded building and unit', () => {
  assert.equal(extractAddressFromLot(ANN_RYNEK_20), 'ul. Rynek 20/8');
  assert.equal(extractAddressFromLot(ANN_PARKOWA_8), 'ul. Parkowej 8/5');
  assert.equal(extractAddressFromLot('Lokal mieszkalny nr 10 położony przy ul. Klasztornej 8'), 'ul. Klasztornej 8/10');
  assert.equal(extractAddressFromLot('Lokal mieszkalny nr 2 usytuowany w klatce schodowej Piastowska 21 w Prudniku'), 'ul. Piastowska 21/2');
  assert.equal(extractAddressFromLot('Lokal mieszkalny nr 1a usytuowany w budynku przy ul. Kochanowskiego 3'), 'ul. Kochanowskiego 3/1a');
  assert.equal(extractAddressFromLot('Lokal mieszkalny nr 7 położony przy ul. Rynek 9 w Prudniku'), 'ul. Rynek 9/7');
});

// ─────────────────────────── parseAnnouncement ───────────────────────────────

test('parseAnnouncement: single lot Rynek 20/8', () => {
  const lots = parseAnnouncement(ANN_RYNEK_20, 'https://bip.prudnik.pl/detail', 'https://bip.prudnik.pl/ann.pdf');
  assert.equal(lots.length, 1);
  const l = lots[0];
  assert.equal(l.address.key, 'rynek|20|8');
  assert.equal(l.kind, 'mieszkalny');
  assert.equal(l.starting_price_pln, 160000);
  assert.equal(l.area_m2, 32.9);
  assert.equal(l.auction_date, '2026-06-18');
  assert.equal(l.round, 1);
});

test('parseAnnouncement: multi-lot Klasztorna & Chrobrego', () => {
  const lots = parseAnnouncement(ANN_MULTI_665, 'detail', 'ann.pdf');
  assert.equal(lots.length, 3);
  assert.equal(lots[0].address.key, 'klasztornej|8|10');
  assert.equal(lots[0].starting_price_pln, 58400);
  assert.equal(lots[0].area_m2, 48.85);

  assert.equal(lots[1].address.key, 'klasztornej|16|2');
  assert.equal(lots[1].starting_price_pln, 56000);
  assert.equal(lots[1].area_m2, 54.53);

  assert.equal(lots[2].address.key, 'chrobrego|11|5');
  assert.equal(lots[2].starting_price_pln, 39400);
  assert.equal(lots[2].area_m2, 62.11);
  assert.equal(lots[2].round, 5); // 4 prior tenders -> round 5
});

// ─────────────────────────── parseResultDoc ──────────────────────────────────

test('parseResultDoc: UNSOLD Rynek 20/8', () => {
  const recs = parseResultDoc(RESULT_RYNEK_20, null, 'https://bip.prudnik.pl/res.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'rynek|20|8');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.auction_date, '2026-06-18');
});

test('parseResultDoc: SOLD Parkowa 8/5 with achieved price', () => {
  const recs = parseResultDoc(RESULT_PARKOWA_8, null, 'https://bip.prudnik.pl/res.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'parkowej|8|5');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 162600);
  assert.equal(r.final_price_pln, 164260);
  assert.equal(r.auction_date, '2025-11-12');
});

test('parseResultDoc: multi-lot result 665 — sold and unsold lots', () => {
  const recs = parseResultDoc(RESULT_MULTI_665, null, 'https://bip.prudnik.pl/res.pdf');
  assert.equal(recs.length, 3);

  const k10 = recs.find((x) => x.address.key === 'klasztornej|8|10');
  assert.ok(k10);
  assert.equal(k10.outcome, 'unsold');
  assert.equal(k10.starting_price_pln, 58400);
  assert.equal(k10.final_price_pln, null);

  const k2 = recs.find((x) => x.address.key === 'klasztornej|16|2');
  assert.ok(k2);
  assert.equal(k2.outcome, 'sold');
  assert.equal(k2.starting_price_pln, 56000);
  assert.equal(k2.final_price_pln, 56600);

  const c5 = recs.find((x) => x.address.key === 'chrobrego|11|5');
  assert.ok(c5);
  assert.equal(c5.outcome, 'sold');
  assert.equal(c5.starting_price_pln, 39400);
  assert.equal(c5.final_price_pln, 39800);
});

test('parseResultDoc: paired result 1485 with SOLD Rynek 9/7', () => {
  const recs = parseResultDoc(RESULT_RYNEK_9, null, 'https://bip.prudnik.pl/res.pdf');
  assert.equal(recs.length, 2);

  const p8 = recs.find((x) => x.address.key === 'parkowej|8|5');
  assert.ok(p8);
  assert.equal(p8.outcome, 'unsold');
  assert.equal(p8.starting_price_pln, 271000);

  const r9 = recs.find((x) => x.address.key === 'rynek|9|7');
  assert.ok(r9);
  assert.equal(r9.outcome, 'sold');
  assert.equal(r9.starting_price_pln, 106000);
  assert.equal(r9.final_price_pln, 107060);
});

// ─────────────────────────── crawl helpers ───────────────────────────────────

test('parseArticleList: extracts articles from table', () => {
  const html = `
    <tbody>
      <tr>
        <td class="list-title">
          <a href="/gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali/2110-ogloszenie-z-dnia-13-05-2026-r-lokal-rynek-20-8">
            Ogłoszenie - lokal mieszkalny Rynek 20/8
          </a>
        </td>
      </tr>
      <tr>
        <td class="list-title">
          <a href="/gospodarka-przestrzenna/przetargi-na-zbycie-nieruchomosci-i-lokali/1782-ogloszenie-parkowa-8-5">
            Ogłoszenie - lokale mieszkalne i użytkowe Parkowa 8/5
          </a>
        </td>
      </tr>
    </tbody>
  `;
  const arts = parseArticleList(html);
  assert.equal(arts.length, 2);
  assert.equal(arts[0].id, '2110');
  assert.equal(arts[1].id, '1782');
});

test('parsePdfAttachments: extracts clean PDF URLs and labels', () => {
  const html = `
    <div itemprop="articleBody">
      <p><a href="/images/artykuly/ogloszenie.pdf" class="wf_file"><span>ogloszenie.pdf</span></a></p>
      <p><a href="/images/artykuly/informacja-o-wyniku.pdf" class="wf_file"><span>informacja o wyniku</span></a></p>
    </div>
  `;
  const atts = parsePdfAttachments(html);
  assert.equal(atts.length, 2);
  assert.equal(atts[0].url, 'https://bip.prudnik.pl/images/artykuly/ogloszenie.pdf');
  assert.equal(atts[1].url, 'https://bip.prudnik.pl/images/artykuly/informacja-o-wyniku.pdf');
});

test('classifyAttachment: classifies result, announcement, and skip', () => {
  assert.equal(classifyAttachment('/images/informacja-o-wynikach-przetargow.pdf'), 'result');
  assert.equal(classifyAttachment('/images/ogloszenie-z-dnia-13.05.2026.pdf'), 'announcement');
  assert.equal(classifyAttachment('/images/rzuty-graficzne-lokali.pdf'), 'skip');
  assert.equal(classifyAttachment('/images/lista-osob-zakwalifikowanych.pdf'), 'skip');
});
