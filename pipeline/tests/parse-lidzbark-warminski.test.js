// Lidzbark Warmiński parser tests.
// Fixtures are verbatim copies of real page/PDF texts fetched live from bip.lidzbarkw.pl
// (SYSTEMDOBIP.PL / E-LINE board /przetargi/10054/status/{0,1}/).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  startingPriceFromText,
  achievedPriceFromText,
  flatAreaFromText,
  roundFromText,
  extractFlatAddress,
  isFlatSaleRow,
  isNegativeOutcome,
  isResultNotice,
  dateOnly,
  buildResultText,
  buildNegativeResultText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/lidzbark-warminski/parse.js';

import {
  boardUrl,
  parseBoardPage,
  pickAnnouncementAttachment,
  pickResultAttachment,
} from '../src/cities/lidzbark-warminski/crawl.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

// 1. Krucza 4/1a (ID 145) — SOLD flat result
const KRUCZA_ROW = {
  detailUrl: 'https://bip.lidzbarkw.pl/przetargi/10054/145/GG_6840_4_1_2024_JB/',
  dotyczyText:
    'Pierwszy ustny przetarg nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 1a położonego w Lidzbarku Warmińskim przy ulicy Kruczej 4',
  cenaText: '50.100,00zł',
  wynikText: 'Pozytywny',
  announcedDate: '2024-07-17 00:00:00',
  auctionDateRaw: '2024-08-20 10:00:00',
  attachments: [
    {
      url: 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=Ogloszenie_o_przetargu_Krucza_4_lokal_1a.pdf&id=ef9ad223686d0fa51a45af67643abeaf',
      filename: 'Ogloszenie_o_przetargu_Krucza_4_lokal_1a.pdf',
    },
    {
      url: 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargu_-_Krucza_4-1a_-_I_przetarg_nieograniczony.pdf&id=a5ed4483bf8794114f13363eb027309a',
      filename: 'Informacja_o_wyniku_przetargu_-_Krucza_4-1a_-_I_przetarg_nieograniczony.pdf',
    },
  ],
};

const KRUCZA_ANN_PDF = `BURMISTRZ LIDZBARKA WARMIŃSKIEGO OGŁASZA PIERWSZY USTNY PRZETARG NIEOGRANICZONY
na sprzedaż wolnego lokalu mieszkalnego nr 1a położonego w Lidzbarku Warmińskim przy ulicy Kruczej 4 z równoczesną sprzedażą udziału wynoszącego 224/1000 w częściach wspólnych budynku oraz w działce gruntu oznaczonej w obrębie 7 numerem ewidencyjnym 134/18 o powierzchni 88m2, ujawnionej w księdze wieczystej nr OL1L/00027067/2.
Lokal położony jest na parterze. Składa się z pokoju z aneksem kuchennym oraz łazienki z WC o łącznej powierzchni użytkowej 16,30m2. Funkcjonalność lokalu jest zła. Standard wewnątrz lokalu jest zły. Lokal wymaga gruntownego remontu.`;

const KRUCZA_WYNIK_PDF = `Lidzbark Warmiński, dnia 28.08.2024 roku
INFORMACJA
Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 roku w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 roku, poz. 2213) podaję do publicznej wiadomości, na okres siedmiu dni tj. od dnia 28 sierpnia 2024 roku do dnia 04 września 2024 roku informację, że dnia 20 sierpnia 2024 roku odbył się pierwszy ustny przetarg nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 1a położonego w Lidzbarku Warmińskim przy ulicy Kruczej 4 z równoczesną sprzedażą udziału wynoszącego 224/1000 w częściach wspólnych budynku oraz w działce gruntu oznaczonej w obrębie 7 numerem ewidencyjnym 134/18 o powierzchni 88m2, ujawnionej w księdze wieczystej nr OL1L/00027067/2.
Wadium: 6.000,00zł – wpłynęły 4 wpłaty wadium
Liczba osób dopuszczonych do udziału w przetargu: 4
Liczba osób niedopuszczonych do udziału w przetargu: 0
Cena wywoławcza: 50.100,00zł
Cena osiągnięta w przetargu – 84.000,00zł
Nabywca ustalony w drodze przetargu: Monika Stańczak i Daniel Kępiński`;

// 2. Konstytucji 3 Maja 6/1 (ID 141) — SOLD flat result
const KONST3MAJA_ROW = {
  detailUrl: 'https://bip.lidzbarkw.pl/przetargi/10054/141/GG_6840_4_82_2023_JB/',
  dotyczyText:
    'Pierwszy ustny przetarg nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 1 położonego w Lidzbarku Warmińskim przy ulicy Konstytucji 3 Maja 6.',
  cenaText: '43.100,00zł',
  wynikText: 'Pozytywny',
  auctionDateRaw: '2024-07-25 10:00:00',
  attachments: [
    {
      url: 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=Konstytucji_3_Maja_6-1.pdf&id=270484e21b0b2e3108067506e7b942fa',
      filename: 'Konstytucji_3_Maja_6-1.pdf',
    },
    {
      url: 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=Informaja_o_wyniku_przetargu_-_ul._Konstytucji_3_Maja_6.pdf&id=82a1de9809dc3545688679ae84ccf89b',
      filename: 'Informaja_o_wyniku_przetargu_-_ul._Konstytucji_3_Maja_6.pdf',
    },
  ],
};

const KONST3MAJA_ANN_PDF = `BURMISTRZ LIDZBARKA WARMIŃSKIEGO OGŁASZA PIERWSZY USTNY PRZETARG NIEOGRANICZONY
na sprzedaż wolnego lokalu mieszkalnego nr 1 położonego w Lidzbarku Warmińskim przy ulicy Konstytucji 3 Maja 6 z równoczesną sprzedażą udziału wynoszącego 40/1000 w częściach wspólnych budynku oraz w działce gruntu oznaczonej w obrębie 7 numerem ewidencyjnym 76/33 o powierzchni 143m2, ujawnionej w księdze wieczystej nr OL1L/00018249/6.
Lokal położony jest na pierwszym piętrze. Składa się z pokoju z aneksem kuchennym, o łącznej powierzchni użytkowej 15,10m2. Do lokalu przynależy WC o pow. 0,64m2 położone na półpiętrze.`;

const KONST3MAJA_WYNIK_PDF = `Lidzbark Warmiński, dnia 02.08.2024 roku
INFORMACJA
Na podstawie § 12 Rozporządzenia Rady Ministrów ... podaję do publicznej wiadomości informację, że dnia 25 lipca 2024 roku odbył się pierwszy ustny przetarg nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 1 położonego w Lidzbarku Warmińskim przy ulicy Konstytucji 3 Maja 6 z równoczesną sprzedażą udziału wynoszącego 40/1000 w częściach wspólnych budynku oraz w działce gruntu...
Wadium: 5.000,00zł – wpłynęły 3 wpłaty wadium
Cena wywoławcza: 43.100,00zł
Cena osiągnięta w przetargu – 60.000,00zł
Nabywca ustalony w drodze przetargu: Monika i Adrian Andrukajtis`;

// 3. Wiejska 51/3 (ID 83) — UNSOLD flat result (Round II)
const WIEJSKA83_ROW = {
  detailUrl: 'https://bip.lidzbarkw.pl/przetargi/10054/83/GG_6840_4_4_2022_JB/',
  dotyczyText:
    'Drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 3 położonego w Lidzbarku Warmińskim przy ulicy Wiejskiej 51.',
  cenaText: '154.000,00zł',
  wynikText: 'Negatywny',
  auctionDateRaw: '2023-07-07 10:00:00',
  attachments: [
    {
      url: 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=II_przetarg_Wiejska_51-3.pdf&id=4b964bff484acf02653e2ff00c84b188',
      filename: 'II_przetarg_Wiejska_51-3.pdf',
    },
    {
      url: 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=Wiejska_51-_inf._o_wynik._II_przetargu.pdf&id=34bf75aa3600f01a3a172abae7717a00',
      filename: 'Wiejska_51-_inf._o_wynik._II_przetargu.pdf',
    },
  ],
};

const WIEJSKA83_ANN_PDF = `BURMISTRZ LIDZBARKA WARMIŃSKIEGO OGŁASZA DRUGI USTNY PRZETARG NIEOGRANICZONY
na sprzedaż lokalu mieszkalnego nr 3 położonego w Lidzbarku Warmińskim przy ulicy Wiejskiej 51 z równoczesną sprzedażą udziału wynoszącego 326/1000 w częściach wspólnych budynku oraz w działce gruntu oznaczonej w obrębie 9 numerem ewidencyjnym 4/9 o powierzchni 575m2, ujawnionej w księdze wieczystej nr OL1L/00019964/1.
Lokal położony jest na pierwszym piętrze – poddaszu, składa się z trzech pokoi, kuchni, łazienki i WC o łącznej powierzchni użytkowej 57,31m2. Do lokalu przynależy pomieszczenie strychowe o pow. 4,32m².`;

const WIEJSKA83_WYNIK_PDF = `Lidzbark Warmiński, dnia 17 lipca 2023r.
INFORMACJA O WYNIKU PRZETARGU
Na podstawie §12 Rozporządzenia Rady Ministrów ... informację, że dnia 07 lipca 2023r. w siedzibie Urzędu Miejskiego w Lidzbarku Warmińskim odbył się II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego oznaczonego nr 3 położonego w Lidzbarku Warmińskim przy ul. Wiejskiej 51, z równoczesną sprzedażą udziału wynoszącego 326/1000 w działce gruntu...
Wadium – 15.000,00zł - brak wpłaty wadium
Cena wywoławcza nieruchomości – 154.000, 00zł
Najwyższa cena osiągnięta w przetargu – BRAK
Przetarg zakończył się wynikiem negatywnym.`;

// 4. Wiejska 51/3 (ID 94) — SOLD flat result (Round III)
const WIEJSKA94_ANN_PDF = `BURMISTRZ LIDZBARKA WARMIŃSKIEGO OGŁASZA TRZECI USTNY PRZETARG NIEOGRANICZONY
na sprzedaż wolnego lokalu mieszkalnego nr 3 położonego w Lidzbarku Warmińskim przy ulicy Wiejskiej 51 z równoczesną sprzedażą udziału wynoszącego 326/1000 w częściach wspólnych budynku oraz w działce gruntu oznaczonej w obrębie 9 numerem ewidencyjnym 4/9 o powierzchni 575m2, ujawnionej w księdze wieczystej nr OL1L/00019964/1.
Lokal położony jest na pierwszym piętrze – poddaszu, składa się z trzech pokoi, kuchni, łazienki i WC o łącznej powierzchni użytkowej 57,31m2. Do lokalu przynależy pomieszczenie strychowe o pow. 4,32m².`;

const WIEJSKA94_WYNIK_PDF = `Lidzbark Warmiński, dnia 12 września 2023r.
INFORMACJA O WYNIKU PRZETARGU
... że dnia 04 września 2023r. w siedzibie Urzędu Miejskiego w Lidzbarku Warmińskim odbył się III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego oznaczonego nr 3 położonego w Lidzbarku Warmińskim przy ul. Wiejskiej 51 ...
Cena wywoławcza nieruchomości – 123.200,00zł
Najwyższa cena osiągnięta w przetargu – 124.440,00zł
Nabywcy ustaleni w drodze przetargu: Agnieszka Angelika Buraczyńska i Jarosław Bohdan Szumczyk`;

// 5. Dantyszka 11/2 (ID 42) — SOLD flat result (Round I)
const DANTYSZKA_WYNIK_PDF = `Lidzbark Warmiński, dnia 18 lipca 2022r.
INFORMACJA O WYNIKU PRZETARGU
... że w dnia 08 lipca 2022r. w siedzibie Urzędu Miejskiego w Lidzbarku Warmińskim odbył się I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego oznaczonego nr 2 położonego w budynku przy ul. Dantyszka 11 w Lidzbarku Warmiński wraz z równoczesną sprzedażą udziału...
Cena wywoławcza nieruchomości – 52.900,00zł
Najwyższa cena osiągnięta w przetargu – 53.430,00zł
Nabywca ustalony w drodze przetargu: Maria Bożena Grynek.`;

const DANTYSZKA_ANN_PDF = `BURMISTRZ LIDZBARKA WARMIŃSKIEGO OGŁASZA PIERWSZY USTNY PRZETARG NIEOGRANICZONY
na sprzedaż lokalu mieszkalnego nr 2 położonego w Lidzbarku Warmińskim przy ulicy Dantyszka 11 z równoczesną sprzedażą udziału wynoszącego 11/100...
Lokal składa się z pokoju i kuchni o łącznej powierzchni użytkowej 21,46m2. Do lokalu przynależy pomieszczenie WC o pow.1,20m² oraz piwnica o pow. 9,39m².`;

// 6. Land auction row (to test out-of-scope filtering)
const LAND_ROW = {
  detailUrl: 'https://bip.lidzbarkw.pl/przetargi/10054/181/GG_6840_3_11_2025_AT/',
  dotyczyText:
    'Drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej położonej w Lidzbarku Warmińskim przy ul. Jarosława Dąbrowskiego (dz. 3-7/27).',
  cenaText: '576.500,00zł',
  wynikText: 'Negatywny',
  auctionDateRaw: '2026-01-14 09:00:00',
  attachments: [],
};

// ── Tests ────────────────────────────────────────────────────────────────────

test('parsePLN: parses dot-thousands, space-thousands and space-after-comma formats', () => {
  assert.equal(parsePLN('50.100,00'), 50100);
  assert.equal(parsePLN('154.000, 00'), 154000);
  assert.equal(parsePLN('84 000,00'), 84000);
  assert.equal(parsePLN('124.440,00'), 124440);
  assert.equal(parsePLN('BRAK'), null);
});

test('roundFromText: parses word ordinals and Roman numerals', () => {
  assert.equal(roundFromText('Pierwszy ustny przetarg nieograniczony'), 1);
  assert.equal(roundFromText('Drugi ustny przetarg nieograniczony'), 2);
  assert.equal(roundFromText('Trzeciego przetargu ustnego nieograniczonego'), 3);
  assert.equal(roundFromText('I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('III przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('IV przetarg ustny nieograniczony'), 4);
  assert.equal(roundFromText('ogłoszenie bez numeru rundy'), null);
});

test('flatAreaFromText: extracts usable floor area and ignores cellar/plot area', () => {
  assert.equal(flatAreaFromText(KRUCZA_ANN_PDF), 16.3);
  assert.equal(flatAreaFromText(KONST3MAJA_ANN_PDF), 15.1);
  assert.equal(flatAreaFromText(WIEJSKA83_ANN_PDF), 57.31);
  assert.equal(flatAreaFromText(DANTYSZKA_ANN_PDF), 21.46);
  assert.equal(flatAreaFromText('działka o powierzchni 88m2'), null);
});

test('startingPriceFromText: handles labeled and bare price patterns', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza: 50.100,00zł'), 50100);
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości – 123.200,00zł'), 123200);
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości – 154.000, 00zł'), 154000);
  assert.equal(startingPriceFromText('43.100,00zł'), 43100);
});

test('achievedPriceFromText: extracts final sold price or returns null', () => {
  assert.equal(achievedPriceFromText('Cena osiągnięta w przetargu – 84.000,00zł'), 84000);
  assert.equal(achievedPriceFromText('Cena osiągnięta w przetargu – 60.000,00zł'), 60000);
  assert.equal(achievedPriceFromText('Najwyższa cena osiągnięta w przetargu – 124.440,00zł'), 124440);
  assert.equal(achievedPriceFromText('Najwyższa cena osiągnięta w przetargu – 53.430,00zł'), 53430);
  assert.equal(achievedPriceFromText('Najwyższa cena osiągnięta w przetargu – BRAK'), null);
});

test('extractFlatAddress: extracts street, building and apartment number', () => {
  assert.equal(extractFlatAddress(KRUCZA_ROW.dotyczyText), 'ul. Kruczej 4/1a');
  assert.equal(extractFlatAddress(KONST3MAJA_ROW.dotyczyText), 'ul. Konstytucji 3 Maja 6/1');
  assert.equal(extractFlatAddress(WIEJSKA83_ROW.dotyczyText), 'ul. Wiejskiej 51/3');
  assert.equal(extractFlatAddress('lokalu mieszkalnego nr 2 w budynku przy ul. Dantyszka 11'), 'ul. Dantyszka 11/2');
  assert.equal(extractFlatAddress('lokal mieszkalny nr 1 przy ul. M. Kopernika 10'), 'ul. M. Kopernika 10/1');
  assert.equal(extractFlatAddress('przy ul. Kruczej 4/1a'), 'ul. Kruczej 4/1a');
});

test('extractFlatAddress: rejects auction venue (Świętochowskiego 14)', () => {
  assert.equal(
    extractFlatAddress('w siedzibie Urzędu Miejskiego w Lidzbarku Warmińskim, ul. A. Świętochowskiego 14'),
    null,
  );
});

test('isFlatSaleRow: distinguishes flats from land, commercial units, and leases', () => {
  assert.equal(isFlatSaleRow(KRUCZA_ROW.dotyczyText), true);
  assert.equal(isFlatSaleRow(KONST3MAJA_ROW.dotyczyText), true);
  assert.equal(isFlatSaleRow(WIEJSKA83_ROW.dotyczyText), true);
  assert.equal(isFlatSaleRow(LAND_ROW.dotyczyText), false);
  assert.equal(isFlatSaleRow('przetarg na sprzedaż lokalu użytkowego nr 4'), false);
  assert.equal(isFlatSaleRow('przetarg na dzierżawę działki przy ul. Wiejskiej'), false);
});

test('dateOnly: strips time component from datetime strings', () => {
  assert.equal(dateOnly('2024-08-20 10:00:00'), '2024-08-20');
  assert.equal(dateOnly('2023-07-07 00:00:00'), '2023-07-07');
  assert.equal(dateOnly(null), null);
});

test('boardUrl: generates valid URLs for page 1 and paginated pages', () => {
  assert.equal(boardUrl(0, 1), 'https://bip.lidzbarkw.pl/przetargi/10054/status/0/');
  assert.equal(boardUrl(0, 2), 'https://bip.lidzbarkw.pl/przetargi/10054/2/status/0/');
  assert.equal(boardUrl(1, 1), 'https://bip.lidzbarkw.pl/przetargi/10054/status/1/');
  assert.equal(boardUrl(1, 7), 'https://bip.lidzbarkw.pl/przetargi/10054/7/status/1/');
});

test('parseBoardPage: parses SYSTEMDOBIP.PL HTML table row', () => {
  const sampleHtml = `
    <table class="table-data">
      <tr class="odd">
        <td class="td-no"><span>Lp: </span>1</td>
        <td class="td-date-1"><div>Data ogłoszenia</div>2024-07-17 00:00:00</td>
        <td class="td-date-2"><div>Data i godzina przetargu</div>2024-08-20 10:00:00</td>
        <td class="td-title-1"><div>Dotyczy</div><a href="https://bip.lidzbarkw.pl/przetargi/10054/145/GG_6840_4_1_2024_JB/">Pierwszy ustny przetarg nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 1a położonego w Lidzbarku Warmińskim przy ulicy Kruczej 4</a></td>
        <td class="td-title-2"><div>Cena wywoławcza</div>50.100,00zł</td>
        <td class="td-title-1"><div>Wynik</div>Pozytywny</td>
        <td class="td-attachments-1">
          <ul class="attachments">
            <li><a href="https://bip.lidzbarkw.pl/system/pobierz.php?plik=Ogloszenie_o_przetargu_Krucza_4_lokal_1a.pdf&amp;id=abc"><img src="ikona.php" /></a></li>
            <li><a href="https://bip.lidzbarkw.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargu_-_Krucza_4-1a_-_I_przetarg_nieograniczony.pdf&amp;id=def"><img src="ikona.php" /></a></li>
          </ul>
        </td>
      </tr>
    </table>
  `;

  const rows = parseBoardPage(sampleHtml);
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.dotyczyText, KRUCZA_ROW.dotyczyText);
  assert.equal(r.cenaText, '50.100,00zł');
  assert.equal(r.wynikText, 'Pozytywny');
  assert.equal(r.auctionDateRaw, '2024-08-20 10:00:00');
  assert.equal(r.attachments.length, 2);
  assert.equal(r.attachments[0].filename, 'Ogloszenie_o_przetargu_Krucza_4_lokal_1a.pdf');
  assert.equal(r.attachments[1].filename, 'Informacja_o_wyniku_przetargu_-_Krucza_4-1a_-_I_przetarg_nieograniczony.pdf');
});

test('pickAnnouncementAttachment and pickResultAttachment: pick correct files', () => {
  const ann = pickAnnouncementAttachment(KRUCZA_ROW.attachments);
  assert.equal(ann.filename, 'Ogloszenie_o_przetargu_Krucza_4_lokal_1a.pdf');

  const res = pickResultAttachment(KRUCZA_ROW.attachments);
  assert.equal(res.filename, 'Informacja_o_wyniku_przetargu_-_Krucza_4-1a_-_I_przetarg_nieograniczony.pdf');
});

test('parseAnnouncement: parses active listing from row + announcement PDF body', () => {
  const listing = parseAnnouncement(KRUCZA_ROW, KRUCZA_ANN_PDF, KRUCZA_ROW.attachments[0].url);
  assert.ok(listing);
  assert.equal(listing.kind, 'mieszkalny');
  assert.equal(listing.address.street, 'Kruczej');
  assert.equal(listing.address.building, '4');
  assert.equal(listing.address.apt, '1A');
  assert.equal(listing.address.key, 'kruczej|4|1A');
  assert.equal(listing.area_m2, 16.3);
  assert.equal(listing.starting_price_pln, 50100);
  assert.equal(listing.auction_date, '2024-08-20');
  assert.equal(listing.round, 1);
});

test('parseResultDoc: Krucza 4/1a (ID 145) — SOLD flat', () => {
  const text = buildResultText(KRUCZA_ROW.dotyczyText, KRUCZA_ROW.cenaText, KRUCZA_WYNIK_PDF, KRUCZA_ANN_PDF);
  const recs = parseResultDoc(text, '2024-08-20', KRUCZA_ROW.attachments[1].url);

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'kruczej|4|1A');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 50100);
  assert.equal(r.final_price_pln, 84000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 16.3);
  assert.equal(r.auction_date, '2024-08-20');
});

test('parseResultDoc: Konstytucji 3 Maja 6/1 (ID 141) — SOLD flat', () => {
  const text = buildResultText(KONST3MAJA_ROW.dotyczyText, KONST3MAJA_ROW.cenaText, KONST3MAJA_WYNIK_PDF, KONST3MAJA_ANN_PDF);
  const recs = parseResultDoc(text, '2024-07-25', KONST3MAJA_ROW.attachments[1].url);

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'konstytucji 3 maja|6|1');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 43100);
  assert.equal(r.final_price_pln, 60000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 15.1);
  assert.equal(r.auction_date, '2024-07-25');
});

test('parseResultDoc: Wiejska 51/3 (ID 83) — UNSOLD flat (Round II)', () => {
  const text = buildResultText(WIEJSKA83_ROW.dotyczyText, WIEJSKA83_ROW.cenaText, WIEJSKA83_WYNIK_PDF, WIEJSKA83_ANN_PDF);
  const recs = parseResultDoc(text, '2023-07-07', WIEJSKA83_ROW.attachments[1].url);

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'wiejskiej|51|3');
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, 154000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.area_m2, 57.31);
  assert.equal(r.auction_date, '2023-07-07');
});

test('parseResultDoc: Wiejska 51/3 (ID 94) — SOLD flat (Round III)', () => {
  const text = buildResultText(
    'Trzeciego przetargu ustnego nieograniczonego na sprzedaż wolnego lokalu mieszkalnego nr 3 położonego w Lidzbarku Warmińskim przy ul. Wiejskiej 51',
    '123.200,00zł',
    WIEJSKA94_WYNIK_PDF,
    WIEJSKA94_ANN_PDF,
  );
  const recs = parseResultDoc(text, '2023-09-04', 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargu.pdf&id=3bd41ca080d156ba817743b6cee298bf');

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'wiejskiej|51|3');
  assert.equal(r.round, 3);
  assert.equal(r.starting_price_pln, 123200);
  assert.equal(r.final_price_pln, 124440);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 57.31);
  assert.equal(r.auction_date, '2023-09-04');
});

test('parseResultDoc: Dantyszka 11/2 (ID 42) — SOLD flat (Round I)', () => {
  const text = buildResultText(
    'Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 położonego w Lidzbarku Warmińskim przy ul. Dantyszka 11.',
    '52.900,00zł',
    DANTYSZKA_WYNIK_PDF,
    DANTYSZKA_ANN_PDF,
  );
  const recs = parseResultDoc(text, '2022-07-08', 'https://bip.lidzbarkw.pl/system/pobierz.php?plik=Informacja_o_wyniku_-_ul._Dantyszka.pdf&id=9cfc60dbddf118d82f68cf3af0bcc5c5');

  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'dantyszka|11|2');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 52900);
  assert.equal(r.final_price_pln, 53430);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 21.46);
  assert.equal(r.auction_date, '2022-07-08');
});

test('parseResultDoc: land auction is filtered out', () => {
  const text = buildResultText(LAND_ROW.dotyczyText, LAND_ROW.cenaText, '', '');
  const recs = parseResultDoc(text, '2026-01-14', null);
  assert.equal(recs.length, 0);
});
