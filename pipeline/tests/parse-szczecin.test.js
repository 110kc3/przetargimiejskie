// Szczecin parser + RSS-crawl-helper tests.
//
// Fixtures groundtruthed against LIVE data fetched 2026-06-27:
//
// ANNOUNCEMENT (active, round 2):
//   https://bip.um.szczecin.pl/chapter_131207.asp?soid=0040FE1CF9FE4AD68A581184AB236384
//   "Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego
//    nr 4 położonego w nieruchomości przy ul. Krzemiennej 28 w Szczecinie"
//   Address: Krzemienna 28/4 · area: 31,40 m² · cena: 215 400,00 zł
//   Auction date: 17.11.2025 (second auction; first was 06.08.2025)
//   RSS pubDate: Mon, 06 Oct 2025 06:59:28 GMT
//
// ANNOUNCEMENT (active, round 2, 2026):
//   https://bip.um.szczecin.pl/chapter_131207.asp?soid=0375356C3DCF4DC3BC96D57C3AA247C7
//   "Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego
//    nr 16 położonego w nieruchomości przy ul. Pocztowej 30 w Szczecinie"
//   Address: Pocztowa 30/16 · area: 162,04 m² · cena: 806 200,00 zł
//   Auction date: 03.06.2026
//   RSS pubDate: Mon, 30 Mar 2026 08:55:37 GMT
//
// RESULT NOTICE (achieved price):
//   https://bip.um.szczecin.pl/chapter_131207.asp?soid=00B57BEA97AA44EE9B007CF9D660A543
//   "Informacja o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż
//    lokalu mieszkalnego nr 4 położonego przy ul. Ludwika Waryńskiego 22"
//   Address: ul. Ludwika Waryńskiego 22/4 · area: 140,81 m²
//   Cena wywoławcza: 589 900,00 zł · Cena osiągnięta: 764 000,00 zł
//   Auction date: 27.03.2024 · round: 2
//
// JOIN KEYS (build-properties links result → announcement):
//   Krzemienna:   krzemienna|28|4
//   Pocztowa:     pocztowa|30|16
//   Warynskiego:  ludwika warynskiego|22|4

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  roundFromText,
  isAnnouncementTitle,
  isResultTitle,
  auctionDateFromText,
  auctionDateFromResultText,
  extractAddressFromCell,
  parseAnnouncementPage,
  isResultNotice,
  parseResultDoc,
} from '../src/cities/szczecin/parse.js';

import { parseRss } from '../src/cities/szczecin/crawl.js';

// ─── roundFromText ────────────────────────────────────────────────────────────

test('roundFromText: "Drugi przetarg …" → 2', () => {
  assert.equal(roundFromText('Drugi przetarg ustny nieograniczony na sprzedaż lokalu'), 2);
});

test('roundFromText: "DRUGIEGO PRZETARGU" (uppercase genitive) → 2', () => {
  assert.equal(roundFromText('INFORMACJA O WYNIKU DRUGIEGO PRZETARGU USTNEGO NIEOGRANICZONEGO'), 2);
});

test('roundFromText: "Trzeci przetarg" → 3', () => {
  assert.equal(roundFromText('Trzeci przetarg ustny nieograniczony na sprzedaż'), 3);
});

test('roundFromText: "Trzeciego przetargu" (genitive) → 3', () => {
  assert.equal(roundFromText('Informacja o wyniku trzeciego przetargu'), 3);
});

test('roundFromText: "Czwarty przetarg" → 4', () => {
  assert.equal(roundFromText('Czwarty przetarg ustny nieograniczony'), 4);
});

test('roundFromText: "Piąty przetarg" → 5', () => {
  assert.equal(roundFromText('Piąty przetarg ustny nieograniczony na sprzedaż gminnego lokalu'), 5);
});

test('roundFromText: bare "Przetarg …" (no ordinal) → 1', () => {
  assert.equal(roundFromText('Przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego'), 1);
});

test('roundFromText: "Ogłoszenie o przetargu …" → 1', () => {
  assert.equal(roundFromText('Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu'), 1);
});

test('roundFromText: null/empty → null', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});

// ─── isAnnouncementTitle ──────────────────────────────────────────────────────

test('isAnnouncementTitle: Krzemienna flat announcement → true', () => {
  assert.equal(
    isAnnouncementTitle('Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 4 położonego w nieruchomości przy ul. Krzemiennej 28 w Szczecinie'),
    true,
  );
});

test('isAnnouncementTitle: Pocztowa flat announcement → true', () => {
  assert.equal(
    isAnnouncementTitle('Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 16 położonego w nieruchomości przy ul. Pocztowej 30 w Szczecinie'),
    true,
  );
});

test('isAnnouncementTitle: result notice → false', () => {
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 4 przy ul. Waryńskiego 22'),
    false,
  );
});

test('isAnnouncementTitle: commercial (pomieszczenie gospodarcze) → false', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o przetargu ustnym nieograniczonym na zbycie gminnego lokalu niemieszkalnego-pomieszczenia gospodarczego nr 17A'),
    false,
  );
});

test('isAnnouncementTitle: empty → false', () => {
  assert.equal(isAnnouncementTitle(''), false);
  assert.equal(isAnnouncementTitle(null), false);
});

// ─── isResultTitle ────────────────────────────────────────────────────────────

test('isResultTitle: Waryńskiego result notice → true', () => {
  assert.equal(
    isResultTitle('Informacja o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 4 położonego przy ul. Ludwika Waryńskiego 22'),
    true,
  );
});

test('isResultTitle: announcement title → false', () => {
  assert.equal(
    isResultTitle('Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 4 przy ul. Krzemiennej 28'),
    false,
  );
});

test('isResultTitle: commercial result → false', () => {
  assert.equal(
    isResultTitle('Informacja o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu niemieszkalnego - pomieszczenia gospodarczego nr 18 przy ul. Pocztowej'),
    false,
  );
});

// ─── auctionDateFromText ──────────────────────────────────────────────────────

test('auctionDateFromText: "odbędzie się w dniu 17.11.2025 r."', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w dniu 17.11.2025 r. o godz. 10:00'),
    '2025-11-17',
  );
});

test('auctionDateFromText: "odbędzie się w dniu 03.06.2026 r."', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w dniu 03.06.2026 r. o godz. 09:00 w siedzibie Urzędu'),
    '2026-06-03',
  );
});

test('auctionDateFromText: no date → null', () => {
  assert.equal(auctionDateFromText('brak informacji o terminie'), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText(null), null);
});

// ─── auctionDateFromResultText ────────────────────────────────────────────────

test('auctionDateFromResultText: "PRZEPROWADZONEGO W DNIU 27.03.2024 r."', () => {
  assert.equal(
    auctionDateFromResultText('USTNEGO NIEOGRANICZONEGO PRZEPROWADZONEGO W DNIU 27.03.2024 r. W URZĘDZIE MIASTA SZCZECIN'),
    '2024-03-27',
  );
});

test('auctionDateFromResultText: no date → null', () => {
  assert.equal(auctionDateFromResultText('informacja bez daty'), null);
  assert.equal(auctionDateFromResultText(null), null);
});

// ─── extractAddressFromCell ───────────────────────────────────────────────────
// The "Położenie i opis lokalu" cell text after HTML tag stripping.

test('extractAddressFromCell: "Ul. Krzemienna 28/4 1 piętro …" → "Ul. Krzemienna 28/4"', () => {
  const addr = extractAddressFromCell('Ul. Krzemienna 28/4 1 piętro Opis: 1 pokój, 1 kuchnia');
  assert.ok(addr, 'must return non-null');
  assert.ok(/krzemienna/i.test(addr), `street must include "krzemienna", got: ${addr}`);
  assert.ok(/28/.test(addr), `must contain building 28, got: ${addr}`);
  assert.ok(/4/.test(addr), `must contain apt 4, got: ${addr}`);
});

test('extractAddressFromCell: "Pocztowa 30/16 3 piętro …" → contains Pocztowa 30/16', () => {
  const addr = extractAddressFromCell('Pocztowa 30/16 3 piętro Opis: 5 pokoi, 2 kuchnie');
  assert.ok(addr, 'must return non-null');
  assert.ok(/pocztowa/i.test(addr), `street must include "pocztowa", got: ${addr}`);
  assert.ok(/30/.test(addr), `must contain building 30, got: ${addr}`);
  assert.ok(/16/.test(addr), `must contain apt 16, got: ${addr}`);
});

test('extractAddressFromCell: empty → null', () => {
  assert.equal(extractAddressFromCell(''), null);
  assert.equal(extractAddressFromCell(null), null);
});

// ─── parseAnnouncementPage — Krzemienna fixture ───────────────────────────────
//
// Condensed but faithful reconstruction of the live page HTML from
// chapter_131207.asp?soid=0040FE1CF9FE4AD68A581184AB236384 (2026-06-27).
// Includes the essential parts: <h2>, table with one data row, and the
// auction-date prose paragraph after the table.

const ANN_KRZEMIENNA = `<!DOCTYPE html>
<html><body>
<div id="tresc">
<h1>Ogłoszenia dotyczące przetargowego zbycia</h1>
<div class="alert alert-light">
<h2>Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 4 położonego w nieruchomości przy ul. Krzemiennej 28  w Szczecinie wraz ze sprzedażą udziału w nieruchomości </h2>
</div><br>Rodzaj: Lokale<br><br>
<p align="center">PREZYDENT MIASTA SZCZECIN</p>
<p align="center">ogłasza</p>
<p align="center">DRUGI PRZETARG USTNY NIEOGRANICZONY</p>
<p align="center">na sprzedaż gminnego lokalu mieszkalnego wraz z udziałem w częściach wspólnych budynków i udziałem w nieruchomości gruntowej</p>
<table align="center" border="1">
  <tbody>
    <tr>
      <td><p align="center"><em>Lp.</em></p></td>
      <td><p align="center"><em>Położenie i opis lokalu</em></p></td>
      <td><p align="center"><em>Nr działki</em></p><p align="center"><em>Obręb</em></p></td>
      <td><p align="center"><em>Pow. lokalu</em></p><p align="center"><em>w m&sup2;</em></p><p align="center"><em>Pow. działki</em></p><p align="center"><em>w m<sup>2</sup></em></p></td>
      <td><p align="center"><em>Przeznaczenie nieruchomości i sposób jej zagospodarowania</em></p></td>
      <td><p align="center"><em>Udział w częściach wspólnych budynku i w nieruchomości gruntowej</em></p></td>
      <td><p align="center"><em>Cena wywoławcza (zł)</em></p></td>
      <td><p align="center"><em>Wadium (zł)</em></p></td>
    </tr>
    <tr>
      <td><p align="center">1.</p></td>
      <td>
        <p align="center">&nbsp;</p>
        <p align="center"><strong>Ul. Krzemienna 28/4</strong></p>
        <p align="center">1 piętro</p>
        <p align="center">Opis:<br>1 pokój, 1 kuchnia,<br>1 łazienka<br>1 przedpokój oraz pomieszczenie przynależne<br>piwnica o pow. 5,76 m&sup2;</p>
      </td>
      <td><p align="center">nr dz.: 3/2</p><p align="center">Obr. 4127</p></td>
      <td>
        <p align="center"><strong>31,40</strong></p>
        <p align="center">1230</p>
      </td>
      <td><p align="center">Zgodnie ze Studium: funkcja dominująca - zabudowa mieszkaniowa jednorodzinna</p></td>
      <td><p align="center">120/1000</p></td>
      <td>
        <p align="center">&nbsp;</p>
        <p align="center"><strong>215 400,00</strong></p>
        <p align="center"><em>(dwieście piętnaście tysięcy czterysta)</em></p>
        <p align="center">w tym:</p>
        <p align="center">135 100,00</p>
        <p align="center">lokal mieszkalny</p>
        <p align="center">80 300,00</p>
        <p align="center">udział w nieruchomości gruntowej</p>
      </td>
      <td><p align="center"><strong>10 800,00</strong></p></td>
    </tr>
  </tbody>
</table>
<p align="center"><strong>Przetarg odbędzie się w dniu 17.11.2025 r. o godz. 10:00 w siedzibie Urzędu Miasta Szczecin, pl. Armii Krajowej 1.</strong></p>
</div>
</body></html>`;

test('parseAnnouncementPage (Krzemienna): returns non-null record', () => {
  const rec = parseAnnouncementPage(
    ANN_KRZEMIENNA,
    'https://bip.um.szczecin.pl/chapter_131207.asp?soid=0040FE1CF9FE4AD68A581184AB236384',
    'Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 4 przy ul. Krzemiennej 28',
    '2025-10-06',
  );
  assert.ok(rec, 'must return a record');
});

test('parseAnnouncementPage (Krzemienna): kind = mieszkalny', () => {
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.equal(rec.kind, 'mieszkalny');
});

test('parseAnnouncementPage (Krzemienna): address keyed krzemienna|28|4', () => {
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.ok(rec.address, 'address must be parsed');
  assert.ok(/krzemienna/i.test(rec.address.street_norm), `street_norm must contain krzemienna, got: ${rec.address.street_norm}`);
  assert.equal(rec.address.building, '28');
  assert.equal(rec.address.apt, '4');
  assert.equal(rec.address.key, 'krzemienna|28|4');
});

test('parseAnnouncementPage (Krzemienna): area_m2 = 31.4', () => {
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.equal(rec.area_m2, 31.4);
});

test('parseAnnouncementPage (Krzemienna): starting_price_pln = 215400', () => {
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.equal(rec.starting_price_pln, 215400);
});

test('parseAnnouncementPage (Krzemienna): auction_date = 2025-11-17', () => {
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.equal(rec.auction_date, '2025-11-17');
});

test('parseAnnouncementPage (Krzemienna): round = 2', () => {
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.equal(rec.round, 2);
});

test('parseAnnouncementPage (Krzemienna): published_date = 2025-10-06', () => {
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.equal(rec.published_date, '2025-10-06');
});

test('parseAnnouncementPage (Krzemienna): detail_url stored', () => {
  const url = 'https://bip.um.szczecin.pl/chapter_131207.asp?soid=0040FE1CF9FE4AD68A581184AB236384';
  const rec = parseAnnouncementPage(ANN_KRZEMIENNA, url, 'Drugi przetarg na lokal mieszkalny', '2025-10-06');
  assert.equal(rec.detail_url, url);
});

// ─── parseAnnouncementPage — Pocztowa fixture (2026, round 2) ────────────────
//
// Condensed faithful reconstruction from
// chapter_131207.asp?soid=0375356C3DCF4DC3BC96D57C3AA247C7 (2026-06-27).
// Address WITHOUT "Ul." prefix ("Pocztowa 30/16"), larger flat, bigger price.

const ANN_POCZTOWA = `<!DOCTYPE html>
<html><body>
<div id="tresc">
<h1>Ogłoszenia dotyczące przetargowego zbycia</h1>
<div class="alert alert-light">
<h2>Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 16 położonego w nieruchomości przy ul. Pocztowej 30 w Szczecinie wraz ze sprzedażą udziału w nieruchomości </h2>
</div><br>Rodzaj: Lokale<br><br>
<p align="center">PREZYDENT MIASTA SZCZECIN</p>
<p align="center">ogłasza</p>
<p align="center">DRUGI PRZETARG USTNY NIEOGRANICZONY</p>
<p align="center">na sprzedaż gminnego lokalu mieszkalnego wraz z udziałem w częściach wspólnych budynku i udziałem w nieruchomości gruntowej</p>
<table align="center" border="1">
  <tbody>
    <tr>
      <td><p><em>Lp.</em></p></td>
      <td><p><em>Położenie i opis lokalu</em></p></td>
      <td><p><em>Nr działki</em></p><p><em>Obręb</em></p></td>
      <td><p><em>Pow. lokalu</em></p><p><em>w m&sup2;</em></p><p><em>Pow. działki</em></p><p><em>w m<sup>2</sup></em></p></td>
      <td><p><em>Przeznaczenie nieruchomości i sposób jej zagospodarowania</em></p></td>
      <td><p><em>Udział w częściach wspólnych budynku i w nieruchomości gruntowej</em></p></td>
      <td><p><em>Cena wywoławcza (zł)</em></p></td>
      <td><p><em>Wadium (zł)</em></p></td>
    </tr>
    <tr>
      <td><p align="center">1.</p></td>
      <td>
        <p align="center"><strong>Pocztowa 30/16</strong></p>
        <p align="center">3 piętro</p>
        <p align="center">Opis:<br>5 pokoi, 2 kuchnie (w tym 1 kuchnia ze schowkiem), 2 łazienki z WC, 2 przedpokoje</p>
      </td>
      <td><p align="center">nr dz.: 102</p><p align="center">Obr. 2157</p></td>
      <td>
        <p align="center"><strong>162,04</strong></p>
        <p align="center">593</p>
      </td>
      <td><p align="center">Zgodnie ze Studium uwarunkowań: funkcja dominująca wielofunkcyjna zabudowa śródmiejska</p></td>
      <td><p align="center">73/1000</p></td>
      <td>
        <p align="center"><strong>806 200,00</strong></p>
        <p align="center"><em>(osiemset sześć tysięcy dwieście)</em></p>
        <p align="center">w tym:</p>
        <p align="center">717 500,00 lokal mieszkalny</p>
        <p align="center">88 700,00 udział w nieruchomości gruntowej</p>
      </td>
      <td><p align="center"><strong>40 400,00</strong></p></td>
    </tr>
  </tbody>
</table>
<p align="center"><strong>Przetarg odbędzie się w dniu 03.06.2026 r. o godz. 09:00 w siedzibie Urzędu Miasta Szczecin, pl. Armii Krajowej 1.</strong></p>
</div>
</body></html>`;

test('parseAnnouncementPage (Pocztowa): address keyed pocztowa|30|16', () => {
  const rec = parseAnnouncementPage(ANN_POCZTOWA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2026-03-30');
  assert.ok(rec, 'must return a record');
  assert.ok(rec.address, 'address must be parsed');
  assert.ok(/pocztowa/i.test(rec.address.street_norm), `street_norm must contain pocztowa, got: ${rec.address.street_norm}`);
  assert.equal(rec.address.building, '30');
  assert.equal(rec.address.apt, '16');
  assert.equal(rec.address.key, 'pocztowa|30|16');
});

test('parseAnnouncementPage (Pocztowa): area_m2 = 162.04', () => {
  const rec = parseAnnouncementPage(ANN_POCZTOWA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2026-03-30');
  assert.equal(rec.area_m2, 162.04);
});

test('parseAnnouncementPage (Pocztowa): starting_price_pln = 806200', () => {
  const rec = parseAnnouncementPage(ANN_POCZTOWA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2026-03-30');
  assert.equal(rec.starting_price_pln, 806200);
});

test('parseAnnouncementPage (Pocztowa): auction_date = 2026-06-03', () => {
  const rec = parseAnnouncementPage(ANN_POCZTOWA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2026-03-30');
  assert.equal(rec.auction_date, '2026-06-03');
});

test('parseAnnouncementPage (Pocztowa): round = 2', () => {
  const rec = parseAnnouncementPage(ANN_POCZTOWA, 'https://example.com/test', 'Drugi przetarg na lokal mieszkalny', '2026-03-30');
  assert.equal(rec.round, 2);
});

// ─── parseAnnouncementPage edge cases ────────────────────────────────────────

test('parseAnnouncementPage: null/empty → null', () => {
  assert.equal(parseAnnouncementPage(null, 'https://example.com', 'Przetarg na lokal mieszkalny', null), null);
  assert.equal(parseAnnouncementPage('', 'https://example.com', 'Przetarg na lokal mieszkalny', null), null);
});

test('parseAnnouncementPage: non-flat title rejected → null', () => {
  // Replace ALL forms of "lokal mieszkaln*" (nom + genitive) with commercial equivalent
  const html = ANN_KRZEMIENNA
    .replace(/lokalu?\s+mieszkaln\w*/gi, 'lokal użytkowy')
    .replace(/lokal\w*\s+mieszkaln\w*/gi, 'lokal użytkowy');
  const rec = parseAnnouncementPage(html, 'https://example.com', 'Przetarg ustny nieograniczony na sprzedaż lokalu użytkowego nr 4', null);
  assert.equal(rec, null);
});

// ─── isResultNotice ───────────────────────────────────────────────────────────

test('isResultNotice: html with INFORMACJA O WYNIKU → true', () => {
  assert.equal(isResultNotice('<p>INFORMACJA O WYNIKU PRZETARGU</p>'), true);
  assert.equal(isResultNotice('<p>Informacja o wyniku drugiego przetargu</p>'), true);
});

test('isResultNotice: announcement html → false', () => {
  assert.equal(isResultNotice(ANN_KRZEMIENNA), false);
});

test('isResultNotice: null/empty → false', () => {
  assert.equal(isResultNotice(null), false);
  assert.equal(isResultNotice(''), false);
});

// ─── parseResultDoc — Waryńskiego fixture ────────────────────────────────────
//
// Condensed faithful reconstruction from
// chapter_131207.asp?soid=00B57BEA97AA44EE9B007CF9D660A543 (2026-06-27).
// Result table: address / działka / area / bidders / rejected /
//               cena wywoławcza / cena osiągnięta / nabywca

const RESULT_WARYNSKIEGO = `<!DOCTYPE html>
<html><body>
<div id="tresc">
<h1>Ogłoszenia dotyczące przetargowego zbycia</h1>
<div class="alert alert-light">
<h2>Informacja o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 4 położonego przy ul. Ludwika Waryńskiego 22 </h2>
</div><br>Rodzaj: Lokale<br>
<p style="margin-left: 18pt; text-align: center;"><strong><u>INFORMACJA O WYNIKU DRUGIEGO PRZETARGU</u></strong></p>
<p align="center" style="margin-left:18.0pt;">USTNEGO NIEOGRANICZONEGO PRZEPROWADZONEGO W DNIU 27.03.2024 r. W URZĘDZIE MIASTA SZCZECIN NA SPRZEDAŻ GMINNEGO LOKALU MIESZKALNEGO</p>
<p align="center" style="margin-left:18.0pt;">Informację wywiesza się na okres od dnia 04.04.2024 r. do 11.04.2024 r.</p>
<table border="1">
  <tbody>
    <tr>
      <td><p align="center">Lp.</p></td>
      <td><p align="center">Adres</p><p align="center">(ulica)</p></td>
      <td><p align="center">Nr działki</p><p align="center">(obręb)</p></td>
      <td><p align="center"><em>Pow. lokalu [m<sup>2</sup>]</em></p><p align="center"><em>Pow. działki</em></p><p align="center"><em>[m<sup>2</sup>]</em></p></td>
      <td><p align="center">Liczba oferentów dopuszczonych do przetargu</p></td>
      <td><p align="center">Liczba osób niedopuszczonych do przetargu</p></td>
      <td><p align="center">Cena wywoławcza</p><p align="center">[zł]</p></td>
      <td><p align="center">Cena osiągnięta w przetargu</p><p align="center">[zł]</p></td>
      <td><p align="center">Nabywca nieruchomości</p></td>
    </tr>
    <tr>
      <td><p align="center">1.</p></td>
      <td><p align="center"><strong>ul. Ludwika Waryńskiego 22/4 </strong></p></td>
      <td><p align="center">317</p><p align="center">2072</p></td>
      <td><p align="center">140,81</p><p align="center">620</p></td>
      <td><p align="center">6</p></td>
      <td><p align="center">0</p></td>
      <td><p align="center">589 900,00</p></td>
      <td><p align="center">764 000,00</p></td>
      <td><p align="center">&nbsp;</p></td>
    </tr>
  </tbody>
</table>
<br><br>Data publikacji: 2024/04/04<br>
</div>
</body></html>`;

test('parseResultDoc (Waryńskiego): returns 1 record', () => {
  const recs = parseResultDoc(
    RESULT_WARYNSKIEGO,
    '2024-04-04',
    'https://bip.um.szczecin.pl/chapter_131207.asp?soid=00B57BEA97AA44EE9B007CF9D660A543',
  );
  assert.equal(recs.length, 1);
});

test('parseResultDoc (Waryńskiego): outcome = sold', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  assert.equal(recs[0].outcome, 'sold');
});

test('parseResultDoc (Waryńskiego): auction_date = 2024-03-27', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  assert.equal(recs[0].auction_date, '2024-03-27');
});

test('parseResultDoc (Waryńskiego): round = 2', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  assert.equal(recs[0].round, 2);
});

test('parseResultDoc (Waryńskiego): address keyed ludwika warynskiego|22|4', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  const r = recs[0];
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/warynskiego|waryńskiego/i.test(r.address.street_norm), `street_norm must contain warynskiego, got: ${r.address.street_norm}`);
  assert.equal(r.address.building, '22');
  assert.equal(r.address.apt, '4');
});

test('parseResultDoc (Waryńskiego): starting_price_pln = 589900', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  assert.equal(recs[0].starting_price_pln, 589900);
});

test('parseResultDoc (Waryńskiego): final_price_pln = 764000', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  assert.equal(recs[0].final_price_pln, 764000);
});

test('parseResultDoc (Waryńskiego): area_m2 = 140.81', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  assert.equal(recs[0].area_m2, 140.81);
});

test('parseResultDoc (Waryńskiego): kind = mieszkalny', () => {
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, 'https://example.com');
  assert.equal(recs[0].kind, 'mieszkalny');
});

test('parseResultDoc (Waryńskiego): source_pdf stored', () => {
  const url = 'https://bip.um.szczecin.pl/chapter_131207.asp?soid=00B57BEA97AA44EE9B007CF9D660A543';
  const recs = parseResultDoc(RESULT_WARYNSKIEGO, null, url);
  assert.equal(recs[0].source_pdf, url);
});

test('parseResultDoc (Waryńskiego): fallbackDate used when no inline date', () => {
  const noDate = RESULT_WARYNSKIEGO.replace('PRZEPROWADZONEGO W DNIU 27.03.2024 r.', 'PRZEPROWADZONEGO W URZĘDZIE MIASTA');
  const recs = parseResultDoc(noDate, '2024-03-27', 'https://example.com');
  assert.ok(recs.length > 0);
  assert.equal(recs[0].auction_date, '2024-03-27');
});

// ─── parseResultDoc — unsold result ──────────────────────────────────────────

const RESULT_UNSOLD = `<!DOCTYPE html>
<html><body>
<div id="tresc">
<h2>Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego przy ul. Przykładowej 5/3</h2>
<p align="center"><strong><u>INFORMACJA O WYNIKU PRZETARGU</u></strong></p>
<p align="center">USTNEGO NIEOGRANICZONEGO PRZEPROWADZONEGO W DNIU 15.01.2025 r.</p>
<table border="1">
  <tbody>
    <tr>
      <td><p>Lp.</p></td>
      <td><p>Adres (ulica)</p></td>
      <td><p>Nr działki (obręb)</p></td>
      <td><p>Pow. lokalu [m²] / Pow. działki [m²]</p></td>
      <td><p>Liczba oferentów</p></td>
      <td><p>Liczba niedopuszczonych</p></td>
      <td><p>Cena wywoławcza [zł]</p></td>
      <td><p>Cena osiągnięta w przetargu [zł]</p></td>
      <td><p>Nabywca nieruchomości</p></td>
    </tr>
    <tr>
      <td><p>1.</p></td>
      <td><p><strong>ul. Przykładowa 5/3</strong></p></td>
      <td><p>100/2072</p></td>
      <td><p>45,00</p><p>250</p></td>
      <td><p>0</p></td>
      <td><p>0</p></td>
      <td><p>200 000,00</p></td>
      <td><p>&nbsp;</p></td>
      <td><p>&nbsp;</p></td>
    </tr>
  </tbody>
</table>
</div>
</body></html>`;

test('parseResultDoc (unsold): outcome = unsold', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, null, 'https://example.com/unsold');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
});

test('parseResultDoc (unsold): final_price_pln = null', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, null, 'https://example.com/unsold');
  assert.equal(recs[0].final_price_pln, null);
});

test('parseResultDoc (unsold): starting_price_pln = 200000', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, null, 'https://example.com/unsold');
  assert.equal(recs[0].starting_price_pln, 200000);
});

test('parseResultDoc (unsold): auction_date = 2025-01-15', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, null, 'https://example.com/unsold');
  assert.equal(recs[0].auction_date, '2025-01-15');
});

// ─── parseResultDoc edge cases ────────────────────────────────────────────────

test('parseResultDoc: non-result html → []', () => {
  assert.deepEqual(parseResultDoc(ANN_KRZEMIENNA, null, 'https://example.com'), []);
});

test('parseResultDoc: null/empty → []', () => {
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
});

// ─── parseRss ────────────────────────────────────────────────────────────────
// Condensed faithful XML structure from live rss_131207.xml (2026-06-27).

const SAMPLE_RSS = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[Ogłoszenia dotyczące przetargowego zbycia]]></title>
    <item>
      <title><![CDATA[Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 4 położonego w nieruchomości przy ul. Krzemiennej 28  w Szczecinie wraz ze sprzedażą udziału w nieruchomości, Sprzedaż, Lokale, 2025/10/06]]></title>
      <link><![CDATA[http://bip.um.szczecin.pl/chapter_131207.asp?soid=0040FE1CF9FE4AD68A581184AB236384]]></link>
      <pubDate><![CDATA[Mon, 06 Oct 2025 06:59:28 GMT]]></pubDate>
    </item>
    <item>
      <title><![CDATA[Informacja o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 4 położonego przy ul. Ludwika Waryńskiego 22, Sprzedaż, Lokale, 2024/04/04]]></title>
      <link><![CDATA[http://bip.um.szczecin.pl/chapter_131207.asp?soid=00B57BEA97AA44EE9B007CF9D660A543]]></link>
      <pubDate><![CDATA[Fri, 12 Apr 2024 06:10:31 GMT]]></pubDate>
    </item>
    <item>
      <title><![CDATA[Ogłoszenie o przetargu ustnym nieograniczonym na zbycie gminnego lokalu niemieszkalnego-pomieszczenia gospodarczego nr 17A przy Al. Boh. Warszawy 104, Sprzedaż, Lokale]]></title>
      <link><![CDATA[http://bip.um.szczecin.pl/chapter_131207.asp?soid=01D15232D62F4B7099369A314D8CC76C]]></link>
      <pubDate><![CDATA[Tue, 14 Jun 2022 11:14:18 GMT]]></pubDate>
    </item>
    <item>
      <title><![CDATA[Drugi przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 16 położonego w nieruchomości przy ul. Pocztowej 30 w Szczecinie, Sprzedaż, Lokale, 2026/03/30]]></title>
      <link><![CDATA[http://bip.um.szczecin.pl/chapter_131207.asp?soid=0375356C3DCF4DC3BC96D57C3AA247C7]]></link>
      <guid isPermaLink="false"><![CDATA[http://bip.um.szczecin.pl/chapter_131207.asp?soid=0375356C3DCF4DC3BC96D57C3AA247C7]]></guid>
      <pubDate><![CDATA[Mon, 30 Mar 2026 08:55:37 GMT]]></pubDate>
    </item>
  </channel>
</rss>`;

test('parseRss: returns 4 items from sample XML', () => {
  const items = parseRss(SAMPLE_RSS);
  assert.equal(items.length, 4);
});

test('parseRss: Krzemienna item — title stripped of suffix', () => {
  const items = parseRss(SAMPLE_RSS);
  // The RSS title uses the genitive "Krzemiennej" not nominative "Krzemienna"
  const k = items.find(i => /krzemiennej|krzemienna/i.test(i.title));
  assert.ok(k, 'Krzemienna item must be present');
  // Suffix ", Sprzedaż, Lokale, 2025/10/06" must be stripped
  assert.ok(!/Sprzedaż/.test(k.title), `title suffix must be stripped, got: ${k.title}`);
  assert.ok(/Krzemienn/i.test(k.title), `title must include Krzemienn*, got: ${k.title}`);
  assert.ok(/ 28/.test(k.title), `title must include building 28, got: ${k.title}`);
});

test('parseRss: Krzemienna item — href upgraded to https', () => {
  const items = parseRss(SAMPLE_RSS);
  // The RSS title uses the genitive "Krzemiennej" not nominative "Krzemienna"
  const k = items.find(i => /krzemiennej|krzemienna/i.test(i.title));
  assert.ok(k, 'Krzemienna item must be present for href test');
  assert.ok(k.href.startsWith('https://'), `href must be https, got: ${k.href}`);
  assert.ok(k.href.includes('soid=0040FE1CF9FE4AD68A581184AB236384'));
});

test('parseRss: Waryńskiego item — pubMs is valid ms epoch', () => {
  const items = parseRss(SAMPLE_RSS);
  const w = items.find(i => /wyniku/i.test(i.title));
  assert.ok(w, 'result item must be present');
  assert.ok(w.pubMs > 0, 'pubMs must be positive');
  // 2024-04-12 → approx 1712880000000 ms
  assert.ok(w.pubMs > 1_000_000_000_000, 'pubMs must be in reasonable range');
});

test('parseRss: commercial (pomieszczenie) item included in raw output (filter is caller\'s job)', () => {
  const items = parseRss(SAMPLE_RSS);
  // parseRss is a dumb XML parser -- filtering is done in crawlAll(); all 4 items present
  assert.equal(items.length, 4);
});

test('parseRss: empty XML -> []', () => {
  assert.deepEqual(parseRss(''), []);
  assert.deepEqual(parseRss(null), []);
});
