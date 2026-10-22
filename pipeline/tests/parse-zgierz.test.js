// Zgierz unit tests: parser + crawl helper tests.
//
// Groundtruthed against real fixtures from zgierz.bip.net.pl (2026-10-22):
//   1. ACTIVE RESIDENTIAL ANNOUNCEMENTS:
//      - Session 2026-11-16 (attachment 5056): 5 flats (Dubois 29/48, Dubois 31/21,
//        pl. Kilińskiego 7/28, 3 Maja 34/6, ks. Sz. Rembowskiego 6/7).
//      - Session 2026-11-16 (attachment 5055): 3 flats (K. Baczyńskiego 1/95,
//        Długa 75/7, 1 Maja 73/7).
//      - MPGM session (attachment 3612): Koszarowa 9/9, 47,80 m², 150 000 zł.
//   2. ACTIVE LAND ANNOUNCEMENTS:
//      - Session 2026-10-26 (attachment 4955): ul. Wandy Chotomskiej 7, 309 000 zł.
//      - Session 2026-10-26 (attachment 4956): obręb 0010 Dzierżązna, dz. 332/4, 85 000 zł.
//   3. SOLD RESIDENTIAL RESULT:
//      - Attachment 4188: 1 Maja 73/14, 2026-04-08, 250 000 zł -> 253 000 zł, sold.
//   4. UNSOLD RESIDENTIAL RESULTS:
//      - Attachment 4965: pl. Kilińskiego 7/28, 2026-09-21, 231 000 zł, unsold (no_bids).
//      - Attachment 4962: 3 Maja 34/6, 2026-09-21, 265 000 zł, unsold (no_bids).
//   5. LAND RESULTS:
//      - Attachment 4895: dz. 347/2 ul. Jabłoniowa, 2026-09-07, 97 000 zł -> 98 000 zł, sold.
//      - Attachment 4953: Aleksandrowska 41, dz. 31, 2026-09-14, 610 000 zł, unsold.
//      - Attachment 4896: dz. 332/4 Dzierżązna, 2026-09-07, 90 000 zł, unsold.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/cities/zgierz/config.js';
import {
  parsePLN,
  parseArea,
  cleanAddressString,
  formatAddress,
  addressFromText,
  auctionDateFromText,
  roundFromText,
  startingPriceFromText,
  finalPriceFromText,
  areaFromText,
  parcelFromText,
  obrebFromText,
  outcomeFromText,
  parseListPage,
  parseDetailPage,
  parseAnnouncementFlats,
  parseAnnouncementLand,
  parseResultDoc,
} from '../src/cities/zgierz/parse.js';

// ── Config tests ─────────────────────────────────────────────────────────────

test('zgierz config contract', () => {
  assert.equal(config.id, 'zgierz');
  assert.equal(config.label, 'Zgierz');
  assert.equal(config.voivodeship, 'lodzkie');
  assert.equal(config.teryt, '102003_1');
  assert.equal(config.authority, 'Prezydent Miasta Zgierza');
  assert.equal(config.host, 'zgierz.bip.net.pl');
  assert.equal(config.source, 'html');
});

// ── Numeric & String helpers ──────────────────────────────────────────────────

test('parsePLN handles spaced and dot-separated amounts', () => {
  assert.equal(parsePLN('269 000,00 zł'), 269000);
  assert.equal(parsePLN('85.000,00 zł'), 85000);
  assert.equal(parsePLN('309.000,00'), 309000);
  assert.equal(parsePLN('150 000 zł'), 150000);
  assert.equal(parsePLN('0'), null);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea handles commas, dots, and trailing units', () => {
  assert.equal(parseArea('44,61 m²'), 44.61);
  assert.equal(parseArea('47.67'), 47.67);
  assert.equal(parseArea('1000 m2'), 1000);
  assert.equal(parseArea('0'), null);
  assert.equal(parseArea(null), null);
});

test('roundFromText parses Roman and arabic rounds', () => {
  assert.equal(roundFromText('II PRZETARG USTNY NIEOGRANICZONY'), 2);
  assert.equal(roundFromText('IV przetarg ustny'), 4);
  assert.equal(roundFromText('VIII przetarg ustny'), 8);
  assert.equal(roundFromText('I nieograniczony przetarg pisemny'), 1);
  assert.equal(roundFromText('brak informacji'), null);
});

test('auctionDateFromText extracts event date and avoids statute references', () => {
  const statuteNotice = `Na podstawie art. 38 ust. 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
    PREZYDENT MIASTA ZGIERZA zawiadamia, że w dniu 16 listopada 2026 r. o godz. 11:30 w siedzibie Urzędu odbędzie się:`;
  assert.equal(auctionDateFromText(statuteNotice), '2026-11-16');

  const resultNotice = `w dniu 21 września 2026 r. o godz. 11:30 w siedzibie Urzędu Miasta Zgierza odbył się
    I przetarg ustny nieograniczony`;
  assert.equal(auctionDateFromText(resultNotice), '2026-09-21');

  const mpgmNotice = `zawiadamia, że w dniu 03.02.2026 r. o godz. 12:00 w siedzibie Miejskiego Przedsiębiorstwa ... odbędzie się:`;
  assert.equal(auctionDateFromText(mpgmNotice), '2026-02-03');
});

test('cleanAddressString & formatAddress normalize Zgierz street names to canonical keys', () => {
  const addr1 = formatAddress('ulicy Dubois 29 w Zgierzu', '48');
  assert.ok(addr1);
  assert.equal(addr1.key, 'dubois|29|48');

  const addr2 = formatAddress('ul. Pl. J. Kilińskiego 7 w Zgierzu', '28');
  assert.ok(addr2);
  assert.equal(addr2.key, 'jana kilinskiego|7|28');

  const addr3 = formatAddress('ulicy ks. Sz. Rembowskiego 6', '7');
  assert.ok(addr3);
  assert.equal(addr3.key, 'ks sz rembowskiego|6|7');

  const addr4 = formatAddress('ulicy K. Baczyńskiego 1 w Zgierzu', '95');
  assert.ok(addr4);
  assert.equal(addr4.key, 'baczynskiego|1|95');

  const addr5 = formatAddress('ulicy 3 Maja 34 w Zgierzu', '6');
  assert.ok(addr5);
  assert.equal(addr5.key, '3 maja|34|6');

  const addr6 = formatAddress('Koszarowej nr 9 w Zgierzu', '9');
  assert.ok(addr6);
  assert.equal(addr6.key, 'koszarowa|9|9');
});

// ── HTML list and detail parser tests ────────────────────────────────────────

const FIXTURE_CATEGORY_HTML = `
<ul>
  <li><a title="sygnalisci" href="/kategorie/171-sygnalisci/artykuly/807-sygnalisci-?lang=PL">Sygnalisci</a></li>
  <li>
    <div>
      <a title="II Przetarg" href="/kategorie/121-sprzedaz-lokali-/artykuly/1431-ii-przetarg-ustny?lang=PL">
        II Przetarg Ustny Nieograniczony – lokal mieszkalny nr 48 przy ul. Dubois 29
      </a>
    </div>
    <div>(Opublikowano: 2026-10-14)</div>
  </li>
  <li>
    <div>
      <a title="IV Przetarg" href="/kategorie/121-sprzedaz-lokali-/artykuly/1430-iv-przetarg-ustny?lang=PL">
        IV Przetarg Ustny Nieograniczony – lokal mieszkalny nr 95 przy ul. K. Baczyńskiego 1
      </a>
    </div>
    <div>(Opublikowano: 2026-10-14)</div>
  </li>
</ul>
`;

test('parseListPage extracts articles and excludes global nav stubs', () => {
  const entries = parseListPage(FIXTURE_CATEGORY_HTML, '121');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].id, '1431');
  assert.equal(entries[0].published_date, '2026-10-14');
  assert.equal(entries[1].id, '1430');
  assert.equal(entries[1].published_date, '2026-10-14');
});

const FIXTURE_DETAIL_HTML = `
<div>
  <h3>II Przetarg Ustny Nieograniczony – lokale mieszkalne</h3>
  <div class="text-accent50 text-xs mr-[20px]">2026-10-14 14:16</div>
  <div>
    <a href="https://zgierz-api.bip.net.pl/api/attachments/5056" title="Ogłoszenie o przetargu.pdf">Pobierz</a>
  </div>
</div>
`;

test('parseDetailPage extracts title, publishedDate, and attachment URLs', () => {
  const detail = parseDetailPage(FIXTURE_DETAIL_HTML);
  assert.equal(detail.title, 'II Przetarg Ustny Nieograniczony – lokale mieszkalne');
  assert.equal(detail.publishedDate, '2026-10-14');
  assert.equal(detail.attachments.length, 1);
  assert.equal(detail.attachments[0].url, 'https://zgierz-api.bip.net.pl/api/attachments/5056');
  assert.equal(detail.attachments[0].name, 'Ogłoszenie o przetargu.pdf');
});

// ── Active announcement tests ────────────────────────────────────────────────

const FIXTURE_ANNOUNCEMENT_5056 = `
OGŁOSZENIE O PRZETARGU
Na podstawie ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
PREZYDENT MIASTA ZGIERZA
zawiadamia, że w dniu 16 listopada 2026 r. o godz. 11:30 w siedzibie Urzędu Miasta Zgierza, Plac Jana Pawła II nr 16, pok. 114 odbędzie się:
II PRZETARG USTNY NIEOGRANICZONY na zbycie nw. lokali mieszkalnych

Przedmiot przetargu: lokal mieszkalny nr 48 przy ulicy Dubois 29 w Zgierzu
Cena wywoławcza: 269 000,00 zł (słownie złotych: dwieście sześćdziesiąt dziewięć tysięcy 00/100) – zwolnione od podatku VAT,
Wadium: 13 500,00 zł,
Powierzchnia użytkowa lokalu: 44,61 m²,
Opis lokalu: IV piętro, dwa pokoje, kuchnia.

Przedmiot przetargu: lokal mieszkalny nr 21 przy ulicy Dubois 31 w Zgierzu
Cena wywoławcza: 278 000,00 zł (słownie złotych: dwieście siedemdziesiąt osiem tysięcy 00/100) – zwolnione od podatku VAT,
Wadium: 13 900,00 zł,
Powierzchnia użytkowa lokalu: 47,67 m²,
Opis lokalu: I piętro, dwa pokoje.

Przedmiot przetargu: lokal mieszkalny nr 28 przy ul. Pl. J. Kilińskiego 7 w Zgierzu
Cena wywoławcza: 226 000,00 zł – zwolnione od podatku VAT,
Wadium: 11 300,00 zł,
Powierzchnia użytkowa lokalu: 40,02 m²,

Przedmiot przetargu: lokal mieszkalny nr 6 przy ulicy 3 Maja 34 w Zgierzu
Cena wywoławcza: 259 000,00 zł – zwolnione od podatku VAT,
Wadium: 13 000,00 zł,
Powierzchnia użytkowa lokalu: 45,19 m²,

Przedmiot przetargu: lokal mieszkalny nr 7 przy ulicy ks. Sz. Rembowskiego 6 w Zgierzu
Cena wywoławcza: 87 000,00 zł – zwolnione od podatku VAT,
Wadium: 4 400,00 zł,
Powierzchnia użytkowa lokalu: 17,80 m²,
`;

test('parseAnnouncementFlats correctly extracts all 5 flats from multi-flat announcement', () => {
  const flats = parseAnnouncementFlats(
    FIXTURE_ANNOUNCEMENT_5056,
    '2026-10-14',
    null,
    'https://zgierz.bip.net.pl/art/1431',
    'https://zgierz-api.bip.net.pl/api/attachments/5056'
  );
  assert.equal(flats.length, 5);

  assert.equal(flats[0].address.key, 'dubois|29|48');
  assert.equal(flats[0].starting_price_pln, 269000);
  assert.equal(flats[0].area_m2, 44.61);
  assert.equal(flats[0].auction_date, '2026-11-16');
  assert.equal(flats[0].round, 2);

  assert.equal(flats[1].address.key, 'dubois|31|21');
  assert.equal(flats[1].starting_price_pln, 278000);
  assert.equal(flats[1].area_m2, 47.67);

  assert.equal(flats[2].address.key, 'jana kilinskiego|7|28');
  assert.equal(flats[2].starting_price_pln, 226000);
  assert.equal(flats[2].area_m2, 40.02);

  assert.equal(flats[3].address.key, '3 maja|34|6');
  assert.equal(flats[3].starting_price_pln, 259000);
  assert.equal(flats[3].area_m2, 45.19);

  assert.equal(flats[4].address.key, 'ks sz rembowskiego|6|7');
  assert.equal(flats[4].starting_price_pln, 87000);
  assert.equal(flats[4].area_m2, 17.8);
});

const FIXTURE_ANNOUNCEMENT_MPGM = `
MIEJSKIE PRZEDSIĘBIORSTWO GOSPODARKI MIESZKANIOWEJ spółka z o.o.
OGŁOSZENIE O PRZETARGU
zawiadamia, że w dniu 03.02.2026 r. o godz. 12:00 w siedzibie Miejskiego Przedsiębiorstwa Gospodarki Mieszkaniowej odbędzie się:
I NIEOGRANICZONY PRZETARG PISEMNY
na zbycie:
- samodzielnego lokalu mieszkalnego nr 9, usytuowanego na II piętrze w budynku mieszkalnym wielorodzinnym, położonym przy ul. Koszarowej nr 9 w Zgierzu
o powierzchni użytkowej 47,80 m²
Cena wywoławcza nieruchomości wynosi 150 000,00 zł.
`;

test('parseAnnouncementFlats parses MPGM single flat notice', () => {
  const flats = parseAnnouncementFlats(
    FIXTURE_ANNOUNCEMENT_MPGM,
    '2026-01-20',
    null,
    'https://zgierz.bip.net.pl/art/1079',
    'https://zgierz-api.bip.net.pl/api/attachments/3612'
  );
  assert.equal(flats.length, 1);
  assert.equal(flats[0].address.key, 'koszarowa|9|9');
  assert.equal(flats[0].starting_price_pln, 150000);
  assert.equal(flats[0].area_m2, 47.8);
  assert.equal(flats[0].auction_date, '2026-02-03');
  assert.equal(flats[0].round, 1);
});

const FIXTURE_LAND_ANNOUNCEMENT_4955 = `
OGŁOSZENIE O PRZETARGU
PREZYDENT MIASTA ZGIERZA
zawiadamia, że w dniu 26 października 2026 roku o godz. 10:00 w siedzibie Urzędu Miasta Zgierza, Plac Jana Pawła II nr 16, sala 110 odbędzie się
III PRZETARG USTNY NIEOGRANICZONY
na sprzedaż prawa własności niezabudowanej nieruchomości gruntowej położonej w Zgierzu przy ul. Wandy Chotomskiej 7
Położenie nieruchomości: Zgierz, ul. Wandy Chotomskiej 7
Obręb ewidencyjny: Zgierz 113, jednostka rejestrowa: G590
Działki numer ewidencyjny: 198/9 o pow. 356 m2, 200/9 o pow. 255 m2, 201/1 o pow. 389 m2
Powierzchnia łączna: 1000 m2
Cena wywoławcza nieruchomości wynosi 309.000,00 zł w tym 23% VAT.
`;

test('parseAnnouncementLand parses active land announcement', () => {
  const land = parseAnnouncementLand(
    FIXTURE_LAND_ANNOUNCEMENT_4955,
    '2026-09-20',
    null,
    'https://zgierz.bip.net.pl/art/1409',
    'https://zgierz-api.bip.net.pl/api/attachments/4955'
  );
  assert.ok(land);
  assert.equal(land.kind, 'grunt');
  assert.equal(land.dzialka_nr, '198/9');
  assert.equal(land.obreb, 'Zgierz 113');
  assert.equal(land.starting_price_pln, 309000);
  assert.equal(land.area_m2, 1000);
  assert.equal(land.auction_date, '2026-10-26');
  assert.equal(land.round, 3);
});

// ── Result notice tests ──────────────────────────────────────────────────────

const FIXTURE_RESULT_SOLD_FLAT_4188 = `
Zgierz, dn. 16 kwietnia 2026 r.
informuję, iż
w dniu 8 kwietnia 2026 r. o godz. 10:30 w siedzibie Urzędu Miasta Zgierza odbył się
I przetarg ustny nieograniczony na sprzedaż nw. lokalu mieszkalnego:

Zgierz, ul. 1 Maja 73 m. 14 – powierzchnia użytk. 37,94 m²
(działka nr 473, pow. 808 m², KW nr LD1G/00020062/6)

Cena wywoławcza lokalu i udziału wynosiła 250 000,00 zł;
Najwyższa osiągnięta w przetargu cena wyniosła 253 000,00 zł;
Nabywcami lokalu zostali Kamila Jędrzejczyk i Damian Dominik Doniak.
`;

test('parseResultDoc parses sold residential flat with final price', () => {
  const recs = parseResultDoc(
    FIXTURE_RESULT_SOLD_FLAT_4188,
    '2026-04-16',
    'https://zgierz-api.bip.net.pl/api/attachments/4188'
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.address.key, '1 maja|73|14');
  assert.equal(r.auction_date, '2026-04-08');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 250000);
  assert.equal(r.final_price_pln, 253000);
  assert.equal(r.area_m2, 37.94);
});

const FIXTURE_RESULT_UNSOLD_FLAT_4965 = `
Zgierz, dn. 29.09.2026 r.
informuję, iż
w dniu 21 września 2026 r. o godz. 11:30 w siedzibie Urzędu Miasta Zgierza odbył się
I przetarg ustny nieograniczony na sprzedaż nw. lokalu mieszkalnego:

Zgierz, pl. Kilińskiego 7 m. 28 – powierzchnia użytk. 40,02 m²
(działka nr 168, pow. 2080 m²)

Cena wywoławcza lokalu wynosiła 231 000,00 zł;
Brak wpłat wadium;
Przetarg zakończył się wynikiem negatywnym.
`;

test('parseResultDoc parses unsold residential flat with no_bids reason', () => {
  const recs = parseResultDoc(
    FIXTURE_RESULT_UNSOLD_FLAT_4965,
    '2026-09-29',
    'https://zgierz-api.bip.net.pl/api/attachments/4965'
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_bids');
  assert.equal(r.address.key, 'jana kilinskiego|7|28');
  assert.equal(r.auction_date, '2026-09-21');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 231000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.area_m2, 40.02);
});

const FIXTURE_RESULT_SOLD_LAND_4895 = `
informuję, iż:
w dniu 07 września 2026 roku o godz. 10:00 w siedzibie Urzędu Miasta Zgierza odbył się I przetarg ustny ograniczony
na sprzedaż prawa własności działki gruntu położonej w 139 obrębie miasta Zgierza przy ul. Jabłoniowa bez numeru, oznaczonej numerem ewidencyjnym działki 347/2, o powierzchni 446 m2.
Cena wywoławcza nieruchomości określona została na kwotę 97.000,00 zł.
Najwyższa osiągnięta w przetargu cena wyniosła 98.000,00 zł.
Nabywcą nieruchomości została osoba prywatna.
`;

test('parseResultDoc parses sold land result', () => {
  const recs = parseResultDoc(
    FIXTURE_RESULT_SOLD_LAND_4895,
    '2026-09-07',
    'https://zgierz-api.bip.net.pl/api/attachments/4895'
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.dzialka_nr, '347/2');
  assert.equal(r.obreb, '139');
  assert.equal(r.auction_date, '2026-09-07');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 97000);
  assert.equal(r.final_price_pln, 98000);
  assert.equal(r.area_m2, 446);
});

const FIXTURE_RESULT_UNSOLD_LAND_4896 = `
informuję, iż:
w dniu 07 września 2026 roku o godz. 10:30 w siedzibie Urzędu Miasta Zgierza odbył się III przetarg ustny nieograniczony
na sprzedaż prawa własności niezabudowanej nieruchomości gruntowej położonej w obrębie ewidencyjnym 0010 Dzierżązna, Ostrów, oznaczonej numerem ewidencyjnym działki 332/4, o powierzchni 936 m2.
Cena wywoławcza ww. nieruchomości określona została na kwotę 90.000,00 zł.
Z uwagi na brak wpłat wadium przetarg zakończył się wynikiem negatywnym.
`;

test('parseResultDoc parses unsold land result', () => {
  const recs = parseResultDoc(
    FIXTURE_RESULT_UNSOLD_LAND_4896,
    '2026-09-07',
    'https://zgierz-api.bip.net.pl/api/attachments/4896'
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_bids');
  assert.equal(r.dzialka_nr, '332/4');
  assert.equal(r.obreb, '0010 Dzierżązna');
  assert.equal(r.auction_date, '2026-09-07');
  assert.equal(r.round, 3);
  assert.equal(r.starting_price_pln, 90000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.area_m2, 936);
});

test('parseResultDoc excludes procurement and pure lease documents', () => {
  const procurementDoc = 'Informacja o wyniku postępowania o udzielenie zamówienia publicznego na budowę drogi';
  assert.deepEqual(parseResultDoc(procurementDoc, '2026-01-01', 'http://test/doc.pdf'), []);

  const leaseDoc = 'Informacja o wyniku przetargu na najem miejskiego lokalu użytkowego przy ul. Długiej';
  assert.deepEqual(parseResultDoc(leaseDoc, '2026-01-01', 'http://test/doc.pdf'), []);
});
