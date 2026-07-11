// Środa Wielkopolska parser tests.
//
// Fixtures grounded in LIVE data fetched from bip.umsroda.pl on 2026-07-10/11
// (IDcom.pl CMS — bip.gniezno.eu-style markup, verified via curl + node fetch,
// no TLS/bot-block issues). The BIP can't be reached from CI sandboxes, so the
// pure parsers are exercised against captured markup / plain-text notice
// bodies (as produced by extractDetailText()).
//
// The live smoke test (`node src/cities/sroda-wielkopolska/crawl.js`) found
// and fixed FIVE real bugs during the build, all covered here:
//   1. flatAddressFromText fell through to the WADIUM PAYMENT PARAGRAPH'S
//      bank address ("ul. Księdza P. Wawrzyniaka 3 w Śremie", present on
//      every notice) whenever the real street name started with a digit
//      ("ul. 20 Października 42") — see the "digit-led street name" test.
//   2. startingPriceFromText didn't tolerate an en dash ("– 145.000,00 zł")
//      or the "udziału" (share) qualifier between "wywoławcza" and the
//      amount — see the 20 Października and Chocicza tests.
//   3. areaM2FromText preferred a fixed "full phrase before abbreviated"
//      priority that, on two real notices, picked the CELLAR's area (which
//      happened to use the full "powierzchni użytkowej" phrase) over the
//      FLAT's own area (phrased as the abbreviated "o pow.") — see the
//      Daszyńskiego and 20 Października tests.
//   4. parseResultNotice's outcome detection missed a real SOLD result whose
//      notice omits the "wynikiem pozytywnym" boilerplate sentence entirely
//      — see the Sejmikowej round II result test.
//   5. The Wyniki przetargów board itself: the spike guessed struktura node
//      2911/2912; the real sibling board is 2905/dokumenty/14925 (see
//      crawl.js/parse.js file headers — no dedicated test, it's a crawl-time
//      URL fix, not parser logic).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseBoardList,
  isLeaseTitle,
  isProceduralTitle,
  classifyAnnouncementTitle,
  publishedDateFromTitle,
  extractDetailText,
  parseFlatAnnouncement,
  parseLandAnnouncement,
  parseResultNotice,
  parseResultDoc,
} from '../src/cities/sroda-wielkopolska/parse.js';

// ---- title classifiers -------------------------------------------------

test('classifyAnnouncementTitle: flat-sale titles -> mieszkalny', () => {
  assert.equal(
    classifyAnnouncementTitle('Ogłoszenie o drugim przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 13 w Środzie Wielkopolskiej przy ulicy Westerplatte 9 z 29 stycznia 2026 roku'),
    'mieszkalny',
  );
  // Different announcement-title TEMPLATE (no "Ogłoszenie o przetargu…"
  // prefix) — real live fixture, Kilińskiego 20/7's announcement.
  assert.equal(
    classifyAnnouncementTitle('Ogłoszenie Burmistrza Miasta o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 7 znajdującego się przy ul. Kilińskiego 20 w Srodzie Wielkopolskiej.'),
    'mieszkalny',
  );
});

test('classifyAnnouncementTitle: land-sale titles -> grunt', () => {
  assert.equal(
    classifyAnnouncementTitle('Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż nieruchomości niezabudowanej w Środzie Wielkopolskiej przy ulicy Strzeleckiej z 28 maja 2026 roku'),
    'grunt',
  );
  assert.equal(
    classifyAnnouncementTitle('Ogłoszenie o przetargu ustnym ograniczonym na sprzedaż nieruchomości położonej we wsi Chocicza, gmina Środa Wielkopolska, stanowiąca w ewidencji gruntów działkę nr 265, obszaru 0,4400 ha.'),
    'grunt',
  );
});

test('classifyAnnouncementTitle: leases (wynajęcie) are rejected — real live typo preserved', () => {
  // Real source typo: "nieograniczonymna" (missing space) — must not defeat
  // the lease detector, which only needs to see "wynaj".
  assert.equal(
    classifyAnnouncementTitle('Ogłoszenie o przetargu ustnym nieograniczonymna wynajęcie części nieruchomości położonej w Środzie Wielkopolskiej przy ul. 20 Października, oznaczonej nr. geod. 2776 z 5 lipca 2023 roku'),
    null,
  );
  assert.equal(isLeaseTitle('Ogłoszenie o przetargu ustnym nieograniczonym na wynajęcie części nieruchomości w Środzie Wielkopolskiej przy ulicy Plażowej z 8 czerwca 2021 roku'), true);
});

test('classifyAnnouncementTitle: procedural notices (qualification lists, cancellations) are rejected despite land keywords', () => {
  // Real live titles — BOTH contain a land keyword ("niezabudowanej" /
  // "działce") that classifyKind alone would tag 'grunt'; these are
  // procedural notices, not sale announcements, and must be filtered first.
  const qualList = 'Lista osób zakwalifikowanych do publicznego przetargu ustnego ograniczonego na sprzedaż nieruchomości niezabudowanej położonej w Środzie Wielkopolskiej w rejonie ulicy Harcerskiej';
  const cancellation = 'Informacja o odwołaniu przetargu ustnego ograniczonego na sprzedaż działu w nieruchomości położonej na działce nr 3737 przy ulicy Niedziałkowskiego w Środzie Wielkopolskiej z 15 września 2025 roku';
  assert.equal(isProceduralTitle(qualList), true);
  assert.equal(isProceduralTitle(cancellation), true);
  assert.equal(classifyAnnouncementTitle(qualList), null);
  assert.equal(classifyAnnouncementTitle(cancellation), null);
});

test('classifyAnnouncementTitle: empty/null -> null', () => {
  assert.equal(classifyAnnouncementTitle(''), null);
  assert.equal(classifyAnnouncementTitle(null), null);
});

// ---- publishedDateFromTitle ---------------------------------------------

test('publishedDateFromTitle: "z DD MMMM YYYY roku" suffix -> ISO date', () => {
  assert.equal(
    publishedDateFromTitle('Ogłoszenie o drugim przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 13 w Środzie Wielkopolskiej przy ulicy Westerplatte 9 z 29 stycznia 2026 roku'),
    '2026-01-29',
  );
});

test('publishedDateFromTitle: no suffix -> null (real: the round-I announcement carries no date suffix at all)', () => {
  assert.equal(
    publishedDateFromTitle('Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 13 znajdującego się w budynku położonym w Środzie Wielkopolskiej przy ulicy Westerplatte 9.'),
    null,
  );
});

// ---- parseBoardList -------------------------------------------------------

// Trimmed real IDcom.pl markup reconstructed from bip.umsroda.pl/struktura/
// 1/2905/dokumenty/14926/lista/1, fetched live 2026-07-10. Same structure as
// gniezno's board (title + a "tresc" teaser paragraph) but nested under
// struktura/dokumenty rather than wiadomosci — parseBoardList only cares
// about the "/wiadomosc/" URL segment, so it works for both boards
// (announcements 14926 and results 14925) unmodified.
const BOARD_LIST_HTML = `
<div id="Content">
  <div class="contener">
    <p class="title"><a href="https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/wiadomosc/890513/ogloszenie_o_przetargu_ustnym_nieograniczonym_nieruchomosci_niez">Ogłoszenie o przetargu ustnym nieograniczonym nieruchomości niezabudowanych położonych w Środzie Wielkopolskiej w rejonie ulicy Lotniczej.</a></p>
    <p class="tresc">OGŁOSZENIE O PRZETARGACH Na podstawie art. 38 i 40 ust.1 pkt 1...</p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/wiadomosc/864347/ogloszenie_o_drugim_przetargu_ustnym_nieograniczonym_na_sprzedaz">Ogłoszenie o drugim przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 13 w Środzie Wielkopolskiej przy ulicy Westerplatte 9 z 29 stycznia 2026 roku</a></p>
    <p class="tresc">Na podstawie art. 38, 39 i 40 ust.1 pkt 1 ustawy...</p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/wiadomosc/851909/lista_osob_zakwalifikowanych_do_przetargu_ustnego_ograniczonego_">Lista osób zakwalifikowanych do przetargu ustnego ograniczonego na sprzedaż udziału wynoszącego 33/200 w nieruchomości położonej w Środzie Wielkopolskiej przy ulicy Niedziałkowskiego z 20 listopada 2025 roku</a></p>
    <p class="tresc">Na podstawie § 15 ust 2 Rozporządzenia Rady Ministrów...</p>
  </div>
</div>`;

test('parseBoardList: extracts title + detail_url for every entry', () => {
  const items = parseBoardList(BOARD_LIST_HTML);
  assert.equal(items.length, 3);
  assert.match(items[0].title, /Lotniczej/);
  assert.equal(items[1].detail_url, 'https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/wiadomosc/864347/ogloszenie_o_drugim_przetargu_ustnym_nieograniczonym_na_sprzedaz');
});

test('parseBoardList: title-classify the extracted entries end-to-end', () => {
  const items = parseBoardList(BOARD_LIST_HTML);
  const kinds = items.map((i) => classifyAnnouncementTitle(i.title));
  assert.deepEqual(kinds, ['grunt', 'mieszkalny', null]); // land, flat, procedural(skip)
});

test('parseBoardList: empty / non-matching HTML -> []', () => {
  assert.deepEqual(parseBoardList(''), []);
  assert.deepEqual(parseBoardList('<html><body>nic</body></html>'), []);
});

// ---- extractDetailText ----------------------------------------------------

// Real detail-page shell (trimmed) — confirms the "Wiadomości powiązane"
// related-links footer (which repeats OTHER notices' titles/dates) is
// excluded from the extracted body.
const DETAIL_SHELL_HTML = `
<div id="Content">
  <h2 class="header">Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 2 w budynku w Środzie Wielkopolskiej przy ulicy Górki 7 z 1 grudnia 2021 roku</h2>
  <div class="wiadomosc">
    <div class="t1 resetstyle"><div class="contener">
      <div class="tresc"><p>Burmistrz Miasta Środa Wielkopolska ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2. Cena wywoławcza nieruchomości 80&nbsp;000,00 zł.</p></div>
    </div></div>
  </div>
  <h3 class="header">Wiadomości powiązane</h3>
  <div class="t1 clickable"><div class="contener">
    <p><a href="https://bip.umsroda.pl/struktura/1/2905/dokumenty/14925/wiadomosc/610511/x">Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego w Środzie Wielkopolskiej przy ulicy Górki 7 na działce nr 1099 z 24 stycznia 2022 roku</a></p>
  </div></div>
</div>`;

test('extractDetailText: bounds the body to the wiadomosc/tresc div, excluding "Wiadomości powiązane"', () => {
  const text = extractDetailText(DETAIL_SHELL_HTML);
  assert.match(text, /Cena wywoławcza nieruchomości 80 000,00 zł/);
  assert.doesNotMatch(text, /Wiadomości powiązane/);
  assert.doesNotMatch(text, /Informacja o wyniku/); // related-link title must not leak in
});

test('extractDetailText: no wiadomosc div -> empty string', () => {
  assert.equal(extractDetailText('<div id="Content">nic</div>'), '');
  assert.equal(extractDetailText(''), '');
});

// ---- parseFlatAnnouncement ------------------------------------------------
//
// All fixtures below are extractDetailText() OUTPUT — i.e. already
// tag-stripped/entity-decoded plain text, exactly as crawl.js hands it to
// parseFlatAnnouncement. Captured live 2026-07-10/11.

// FIXTURE: ul. Górki 7/2 — round I (implicit, no ordinal stated).
// https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/wiadomosc/601223/…
const GORKI_TEXT = `Na podstawie art. 38 i 40 ust. 1 pkt 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2021 r. poz., 1899 ze zmianami) § 2, § 13 rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2014 r., poz. 1490 ze zmianami), Burmistrz Miasta Środa Wielkopolska ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 znajdującego się w budynku położonym w Środzie Wielkopolskiej przy ulicy Górki 7. Oznaczenie nieruchomości Lokal mieszkalny nr 2, stanowiący własność gminy Środa Wielkopolska, położony w budynku przy ul. Górki 7 w Środzie Wielkopolskiej, o łącznej powierzchni użytkowej 36,10 m 2 , wraz piwnicą o powierzchni użytkowej 7,0 m 2 oraz pomieszczeniem gospodarczym o powierzchni 9,3 m 2 , do którego przynależy udział wynoszący 161/1000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położonym w Środzie Wielkopolskiej przy ul. Górki 7, na działce oznaczonej nr. geod. 1099, obszaru 0,0691 ha, objętej KW PO1D/00017718/0. Cena wywoławcza nieruchomości 80 000,00 zł. Wysokość postąpienia ustalą uczestnicy przetargu, z tym że postąpienie nie może wynosić mniej niż 1% ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. Termin zapłaty Cena sprzedaży nieruchomości uzyskana w przetargu podlega zapłacie nie później niż do dnia zawarcia umowy przenoszącej własność. Przetarg na sprzedaż nieruchomości odbędzie się w dniu 14 stycznia 2022 r. o godz. 11.00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej, ul. Daszyńskiego 5, salka konferencyjna przy sekretariacie Burmistrza – piętro. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w kwocie 8.000,00 zł.`;

test('parseFlatAnnouncement: Górki 7/2 — round I default, area/price/date (spike-confirmed values)', () => {
  const r = parseFlatAnnouncement(GORKI_TEXT);
  assert.equal(r.address_raw, 'ul. Górki 7/2');
  assert.equal(r.address.key, 'gorki|7|2');
  assert.equal(r.area_m2, 36.1);
  assert.equal(r.starting_price_pln, 80000);
  assert.equal(r.auction_date, '2022-01-14');
  assert.equal(r.round, 1);
  assert.equal(r.kind, 'mieszkalny');
});

// FIXTURE: ul. Westerplatte 9/13 — round I, numeric date.
// https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/wiadomosc/849538/…
const WESTERPLATTE_R1_TEXT = `OGŁOSZENIE O PRZETARGU Na podstawie art. 38 i 40 ust.1 pkt 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz.U. z 2021 r. poz. 1899 ze zmianami) §2, §13 rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz.U. z 2021 r. poz. 2213) Burmistrz Miasta Środa Wielkopolska ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 13 znajdującego się w budynku położonym w Środzie Wielkopolskiej przy ulicy Westerplatte 9. Oznaczenie nieruchomości Lokal mieszkalny nr 13 o powierzchni użytkowej 29,36 m 2 , wraz z piwnicą o powierzchni użytkowej 6,60 m 2 , do którego przynależy udział 341/10000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położnym w Środzie Wielkopolskiej przy ul. Westerplatte 9, na działce oznaczonej nr geod. 1948/7, obszaru 0,0731 ha zapisanej w KW (X). Cena wywoławcza nieruchomości 200 000,00 zł Wysokość postąpienia ustalą uczestnicy przetargu, z tym że postąpienie nie może wynosić mniej niż 1 % ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. Przetarg na sprzedaż przedmiotowej nieruchomości odbędzie się w dniu 19.12.2025 r. o godz. 10 00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej, ul. Daszyńskiego 5, salka konferencyjna nr 107 przy sekretariacie Starostwa Powiatowego – parter. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w kwocie 20 000,00 zł.`;

// FIXTURE: ul. Westerplatte 9/13 — round II. QUIRK (real, live, not a
// transcription error): "odbędzie się w dniu 06.03.2026 marca 2026 r." — a
// duplicated numeric+spelled-out date in the same sentence.
// https://bip.umsroda.pl/struktura/1/2905/dokumenty/14926/wiadomosc/864347/…
const WESTERPLATTE_R2_TEXT = `Na podstawie art. 38, 39 i 40 ust.1 pkt 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz.U. z 2024 poz. 1145 ze zmianami) §2, §13 rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz.U. z 2021 r. poz. 2213) Burmistrz Miasta Środa Wielkopolska ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 13 znajdującego się w budynku położonym w Środzie Wielkopolskiej przy ulicy Westerplatte 9. Oznaczenie nieruchomości: Lokal mieszkalny nr 13 o powierzchni użytkowej 29,36 m 2 , wraz z piwnicą o powierzchni użytkowej 6,60 m 2 , do którego przynależy udział 341/10000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położnym w Środzie Wielkopolskiej przy ul. Westerplatte 9, na działce oznaczonej nr geod. 1948/7, obszaru 0,0731 ha zapisanej w KW (*). Cena wywoławcza nieruchomości: 200.000,00 zł Wysokość postąpienia ustalą uczestnicy przetargu, z tym że postąpienie nie może wynosić mniej niż 1% ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. Przetarg na sprzedaż przedmiotowej nieruchomości odbędzie się w dniu 06.03.2026 marca 2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej, ul. Daszyńskiego 5, salka konferencyjna nr 107 przy sekretariacie Starostwa Powiatowego – parter. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w kwocie 20 000,00 zł.`;

test('parseFlatAnnouncement: Westerplatte 9/13 round I — numeric date, space-thousands price', () => {
  const r = parseFlatAnnouncement(WESTERPLATTE_R1_TEXT);
  assert.equal(r.address_raw, 'ul. Westerplatte 9/13');
  assert.equal(r.address.key, 'westerplatte|9|13');
  assert.equal(r.area_m2, 29.36);
  assert.equal(r.starting_price_pln, 200000);
  assert.equal(r.auction_date, '2025-12-19');
  assert.equal(r.round, 1);
});

test('parseFlatAnnouncement: Westerplatte 9/13 round II — "drugi przetarg"=2, dot-thousands price, duplicated-date quirk resolves to the numeric form', () => {
  const r = parseFlatAnnouncement(WESTERPLATTE_R2_TEXT);
  assert.equal(r.address_raw, 'ul. Westerplatte 9/13');
  assert.equal(r.area_m2, 29.36);
  assert.equal(r.starting_price_pln, 200000);
  assert.equal(r.auction_date, '2026-03-06', 'numeric "06.03.2026" wins over the redundant trailing "marca 2026"');
  assert.equal(r.round, 2);
});

// FIXTURE: ul. Daszyńskiego 20/14 — round I. REAL SOURCE TYPO: the opening
// sentence names the WRONG street ("Harcerskiej" — a copy-paste leftover),
// while "Oznaczenie nieruchomości" correctly says "Daszyńskiego 20"
// throughout. https://bip.umsroda.pl/…/wiadomosc/601200/…
const DASZYNSKIEGO_R1_TEXT = `Na podstawie art. 38 i 40 ust. 1 pkt 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2021 r. poz., 1899 ze zmianami) § 2, § 13 rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2014 r., poz. 1490 ze zmianami), Burmistrz Miasta Środa Wielkopolska ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 14 znajdującego się w budynku położonym w Środzie Wielkopolskiej przy ulicy Harcerskiej. Oznaczenie nieruchomości Lokal mieszkalny nr 14, o pow. 36,80 m 2 znajdujący się na I i II piętrze wraz piwnicą o powierzchni użytkowej 2,1 m 2 oraz udziałem wynoszącym 48/1000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położonym w Środzie Wielkopolskiej przy ul. Daszyńskiego 20, na działce oznaczonej nr. geod. 1315, obszaru 0,0435 ha, objętej KW PO1D/00000018/1. Cena wywoławcza nieruchomości 60 000,00 zł. Przetarg na sprzedaż nieruchomości odbędzie się w dniu 14 stycznia 2022 r. o godz. 12.00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w kwocie 6.000,00 zł.`;

// FIXTURE: ul. Daszyńskiego 20/14 — round III, ordinal "trzeci", spelled-out
// date. https://bip.umsroda.pl/…/wiadomosc/637833/…
const DASZYNSKIEGO_R3_TEXT = `Na podstawie art. 38, 39 i 40 ust. 1 pkt 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2021 r. poz. 1899 ze zmianami) § 2, § 13 rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) Burmistrz Miasta Środa Wielkopolska ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 14 znajdującego się w budynku położonym w Środzie Wielkopolskiej przy ulicy Daszyńskiego 20. Oznaczenie nieruchomości Lokal mieszkalny nr 14, o pow. 36,80 m 2 znajdujący się na I i II piętrze wraz piwnicą o powierzchni użytkowej 2,1 m 2 oraz udziałem wynoszącym 48/1000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położonym w Środzie Wielkopolskiej przy ul. Daszyńskiego 20, na działce oznaczonej nr. geod. 1315, obszaru 0,0435 ha, objętej KW PO1D/00000018/1. Cena wywoławcza nieruchomości 60.000,00 zł Przetarg na sprzedaż przedmiotowej nieruchomości odbędzie się w dniu 8 sierpnia 2022 r. o godz. 10.00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w kwocie 6.000,00 zł.`;

test('parseFlatAnnouncement: Daszyńskiego 20/14 round I — REAL BUG regression: wrong-street intro typo ("Harcerskiej") must NOT poison the address', () => {
  const r = parseFlatAnnouncement(DASZYNSKIEGO_R1_TEXT);
  assert.equal(r.address_raw, 'ul. Daszyńskiego 20/14', 'must resolve to the Oznaczenie section address, not the intro typo');
  assert.equal(r.address.key, 'daszynskiego|20|14');
  assert.doesNotMatch(r.address_raw, /Harcersk/);
  assert.equal(r.area_m2, 36.8, 'flat area 36,80 from "o pow.", not the cellar\'s 2,1');
  assert.equal(r.starting_price_pln, 60000);
  assert.equal(r.auction_date, '2022-01-14');
  assert.equal(r.round, 1);
});

test('parseFlatAnnouncement: Daszyńskiego 20/14 round III — ordinal "trzeci"=3, dot-thousands price, spelled-out date', () => {
  const r = parseFlatAnnouncement(DASZYNSKIEGO_R3_TEXT);
  assert.equal(r.address_raw, 'ul. Daszyńskiego 20/14');
  assert.equal(r.area_m2, 36.8);
  assert.equal(r.starting_price_pln, 60000);
  assert.equal(r.auction_date, '2022-08-08');
  assert.equal(r.round, 3);
});

// FIXTURE: ul. 20 Października 42/22 — digit-LEADING street name. REAL BUG
// regression (see file header #1-3): before the fix this mis-keyed to
// "Księdza P. Wawrzyniaka 3/22" (the wadium-payment bank's address), missed
// the price (en-dash separator), and grabbed the cellar's 3,60 m2 instead of
// the flat's 30,00 m2. https://bip.umsroda.pl/…/wiadomosc/643581/…
const PAZDZIERNIKA_TEXT = `Na podstawie art. 38 i 40 ust. 1 pkt 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2021 r. poz. 1899 ze zmianami) § 2., § 13. rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) Burmistrz Miasta Środa Wielkopolska ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 22 znajdującego się w budynku położonym w Środzie Wielkopolskiej przy ulicy 20 Października 42. Oznaczenie nieruchomości Lokal mieszkalny nr 22, o pow. 30,00 m 2 wraz piwnicą o powierzchni użytkowej 3,60 m 2 , dla którego prowadzona jest KW nr PO1D/00059016/5 oraz udziałem wynoszącym 215/10000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położonym w Środzie Wielkopolskiej przy ul. 20 Października 42, na działce oznaczonej nr. geod. 2784, obszaru 0,0718 ha, objętej KW PO1D/00023968/2. Cena wywoławcza nieruchomości – 145.000,00 zł Wysokość postąpienia ustalą uczestnicy przetargu, z tym że postąpienie nie może wynosić mniej niż 1 % ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych. Przetarg na sprzedaż przedmiotowej nieruchomości odbędzie się w dniu 16 września 2022 r. o godz. 10.00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w kwocie 14.500,00 zł. Wadium można wpłacić na konto nr 93 9084 0003 2211 0000 5975 0008 prowadzone przez Spółdzielczy Bank Ludowy im. Księdza P. Wawrzyniaka z siedzibą przy ul. Księdza P. Wawrzyniaka 3 w Śremie.`;

test('parseFlatAnnouncement: 20 Października 42/22 — REAL BUG regression: digit-led street name, en-dash price, cellar-vs-flat area', () => {
  const r = parseFlatAnnouncement(PAZDZIERNIKA_TEXT);
  assert.equal(r.address_raw, 'ul. 20 Października 42/22', 'must NOT fall through to the bank address in the wadium paragraph');
  assert.equal(r.address.street, '20 Października');
  assert.equal(r.address.building, '42');
  assert.equal(r.address.apt, '22');
  assert.doesNotMatch(r.address_raw, /Wawrzyniaka/);
  assert.equal(r.area_m2, 30, 'flat area 30,00 — not the cellar\'s 3,60');
  assert.equal(r.starting_price_pln, 145000, 'en-dash separator ("– 145.000,00 zł") must parse');
  assert.equal(r.auction_date, '2022-09-16');
  assert.equal(r.round, 1);
});

test('parseFlatAnnouncement: empty text returns null, never throws', () => {
  assert.equal(parseFlatAnnouncement(''), null);
  assert.equal(parseFlatAnnouncement(null), null);
  assert.equal(parseFlatAnnouncement('Brak danych.'), null);
});

// ---- parseLandAnnouncement -------------------------------------------------

// FIXTURE: single-parcel land, dz. 953/44, no building number (undeveloped
// plot). https://bip.umsroda.pl/…/wiadomosc/783352/…
const STRZELECKA_TEXT = `Na podstawie art. 38 i 40 ust. 1 pkt 1, ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz.U. z 2024 r. poz. 1145) § 2, § 13 rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz.U. z 2021 r. poz. 2213) Burmistrz Miasta Środa Wielkopolska ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej położonej w Środzie Wielkopolskiej przy ulicy Strzeleckiej. Oznaczenie nieruchomości Nieruchomość niezabudowana położona w Środzie Wielkopolskiej przy ulicy Strzeleckiej, stanowiąca w ewidencji gruntów działkę oznaczoną nr. ewid. 953/44 obszaru 0,0647 ha, objęta KW PO1D/00021387/1. Cena wywoławcza nieruchomości 200 000,00 zł netto. Do ceny uzyskanej w przetargu zostanie doliczony podatek VAT wg obowiązującej stawki. Przetarg na sprzedaż nieruchomości odbędzie się w dniu 29 listopada 2024 r. o godz. 11.00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w wysokości 20 000,00 zł.`;

test('parseLandAnnouncement: Strzelecka dz. 953/44 — single parcel, ha->m2, spelled-out date', () => {
  const recs = parseLandAnnouncement(STRZELECKA_TEXT);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '953/44');
  assert.equal(r.address_raw, 'ul. Strzeleckiej');
  assert.equal(r.area_m2, 647, '0,0647 ha -> 647 m2');
  assert.equal(r.starting_price_pln, 200000);
  assert.equal(r.auction_date, '2024-11-29');
  assert.equal(r.zoning, 'niezabudowana');
  assert.equal(r.round, 1);
});

// FIXTURE: restricted (ograniczony) udział/share sale, village location (no
// "ulicy" phrase — "we wsi Chocicza, gmina …"), en-dash + "udziału" price
// qualifier. https://bip.umsroda.pl/…/wiadomosc/849551/…
const CHOCICZA_TEXT = `OGŁOSZENIE O PRZETARGU Na podstawie art. 38 i 40 ust. 1 pkt 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz.U. z 2024 r. poz. 1145 ze zmianami) §2, §15 rozporządzenia Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz.U. z 2021 r. poz. 2213) Burmistrz Miasta Środa Wielkopolska ogłasza przetarg ustny ograniczony na sprzedaż nieruchomości położonej we wsi Chocicza, gmina Środa Wielkopolska, stanowiąca w ewidencji gruntów działkę nr 265, obszaru 0,4400 ha, objętą księgą wieczystą nr (X). Oznaczenie nieruchomości: Nieruchomość niezabudowana położona we wsi Chocicza, gmina Środa Wielkopolska, stanowiąca w ewidencji gruntów działkę nr 265, obszaru 0,4400 ha, objętą księgą wieczystą nr (X). Cena wywoławcza nieruchomości: 10.000,00 zł netto. Przetarg na sprzedaż udziału przedmiotowej nieruchomości odbędzie się w dniu 19.12. 2025 r. o godz. 11 00 w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej. Warunkiem przystąpienia do przetargu jest wniesienie wadium w pieniądzu w kwocie 11 000,00 zł.`;

test('parseLandAnnouncement: Chocicza dz. 265 — village location (no "ulicy"), restricted auction, spaced-year date quirk', () => {
  const recs = parseLandAnnouncement(CHOCICZA_TEXT);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.dzialka_nr, '265');
  assert.equal(r.address_raw, 'wieś Chocicza');
  assert.equal(r.street, null);
  assert.equal(r.area_m2, 4400, '0,4400 ha -> 4400 m2');
  assert.equal(r.starting_price_pln, 10000);
  assert.equal(r.auction_date, '2025-12-19', 'tolerates the space before the year: "19.12. 2025"');
  assert.equal(r.zoning, 'niezabudowana');
});

// FIXTURE: multi-parcel notice — 17 separately-priced działki in ONE
// document (real live fixture, id 784220). Each parcel has its own "PARCEL
// obszaru AREA ha" line and "PARCEL cena wywoławcza – PRICE zł, wadium W zł"
// line; the shared auction date applies to all (different TIMES per parcel,
// not parsed — not part of the schema).
const LOTNICZA_MULTI_TEXT = `Ogłoszenie o przetargach Na podstawie art. 38 i 40 ust.1 pkt 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2024 r. poz. 1145) § 2, § 13 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213). Oznaczenie nieruchomości Nieruchomości niezabudowane położone w Środzie Wielkopolskiej w rejonie ulicy Lotniczej, zapisane w KW PO1D/00013376/2, stanowiące w ewidencji gruntów niżej wymienione działki: 3688/11 obszaru 0,0692 ha, 3688/14 obszaru 0,0391 ha 3688/15 obszaru 0,0392 ha, 3688/16 obszaru 0,0391 ha, 3688/17 obszaru 0,0392 ha, 3688/18 obszaru 0,0391 ha, 3688/19 obszaru 0,0574 ha, 3688/23 obszaru 0,0567 ha, 3688/26 obszaru 0,0569 ha, 3688/27 obszaru 0,0570 ha, 3688/28 obszaru 0,0571 ha, 3688/29 obszaru 0,1123 ha, 3689/43 obszaru 0,0496 ha, 3689/44 obszaru 0,0449 ha, 3689/83 obszaru 0,0343 ha, 3689/93 obszaru 0,0346 ha, 3689/99 obszaru 0,0461 ha. Cena wywoławcza netto dla poszczególnych nieruchomości 3688/11 cena wywoławcza – 124 560,00 zł, wadium 12 000,00 zł, 3688/14 cena wywoławcza – 70 380,00 zł, wadium 7 000,00 zł, 3688/15 cena wywoławcza – 70 560,00 zł, wadium 7 000,00 zł, 3688/16 cena wywoławcza – 70 380,00 zł, wadium 7 000,00 zł, 3688/17 cena wywoławcza – 70 560,00 zł, wadium 7 000,00 zł, 3688/18 cena wywoławcza – 70 380,00 zł, wadium 7 000,00 zł, 3688/19 cena wywoławcza – 103 320,00 zł, wadium 10 000,00 zł, 3688/23 cena wywoławcza – 102 060,00 zł, wadium 10 000,00 zł, 3688/26 cena wywoławcza – 102 420,00 zł, wadium 10 000,00 zł, 3688/27 cena wywoławcza – 102 600,00 zł, wadium 10 000,00 zł, 3688/28 cena wywoławcza – 102 780,00 zł, wadium 10 000,00 zł, 3688/29 cena wywoławcza – 202 140,00 zł, wadium 20 000,00 zł, 3689/43 cena wywoławcza – 89 280,00 zł, wadium 9 000,00 zł, 3689/44 cena wywoławcza – 80 820,00 zł, wadium 8 000,00 zł, 3689/83 cena wywoławcza – 61 740,00 zł, wadium 6 000,00 zł, 3689/93 cena wywoławcza – 62 280,00 zł, wadium 6 000,00 zł, 3689/99 cena wywoławcza – 82 980,00 zł, wadium 8 000,00 zł. Do ceny uzyskanej w przetargu zostanie doliczony podatek VAT zgodnie z obowiązującą stawką. Przetargi na sprzedaż przedmiotowych nieruchomości odbędą się w dniu 06 grudnia 2024 r. w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej w następujących godzinach. 3688/11 godz. 10.00, 3688/14 godz. 10.15.`;

test('parseLandAnnouncement: Lotnicza multi-parcel notice explodes into one record per priced działka', () => {
  const recs = parseLandAnnouncement(LOTNICZA_MULTI_TEXT);
  assert.equal(recs.length, 17, 'all 17 działki, each separately priced');

  const byParcel = Object.fromEntries(recs.map((r) => [r.dzialka_nr, r]));
  assert.equal(byParcel['3688/11'].area_m2, 692, '0,0692 ha -> 692 m2');
  assert.equal(byParcel['3688/11'].starting_price_pln, 124560);
  assert.equal(byParcel['3688/29'].area_m2, 1123, '0,1123 ha -> 1123 m2 (largest plot)');
  assert.equal(byParcel['3688/29'].starting_price_pln, 202140);
  assert.equal(byParcel['3689/99'].starting_price_pln, 82980);

  // Shared fields (date/round/location) apply identically to every parcel.
  for (const r of recs) {
    assert.equal(r.auction_date, '2024-12-06');
    assert.equal(r.address_raw, 'rejon ul. Lotniczej');
    assert.equal(r.zoning, 'niezabudowana');
    assert.equal(r.kind, 'grunt');
  }
});

test('parseLandAnnouncement: a notice with no parcel number is dropped (not merged under a generic location key)', () => {
  // REAL scope decision (see file header): some older multi-parcel notices
  // list "niżej wymienione działki: X obszaru…" (no "nr" before the number)
  // with a price list that never repeats "cena wywoławcza" per parcel — not
  // matched by either extraction path. Emitting a location-only record here
  // would let build-land.js's landKey() collapse several DISTINCT parcels
  // into one fake plot (its fallback key is the generic address_raw when
  // dzialka_nr is null) — so this must come back empty, not a bad record.
  const text = 'Burmistrz Miasta Środa Wielkopolska ogłasza przetargi ustne nieograniczone na sprzedaż nieruchomości niezabudowanych w rejonie ulicy Lotniczej. Oznaczenie nieruchomości Nieruchomości niezabudowane, stanowiące w ewidencji gruntów niżej wymienione działki: 3689/39 obszaru 0,0370 ha, 3689/43 obszaru 0,0496 ha. Cena wywoławcza netto dla poszczególnych nieruchomości: 3689/39 62 900,00 zł, 3689/43 84 320,00 zł.';
  assert.deepEqual(parseLandAnnouncement(text), []);
});

test('parseLandAnnouncement: empty text -> []', () => {
  assert.deepEqual(parseLandAnnouncement(''), []);
  assert.deepEqual(parseLandAnnouncement(null), []);
});

// ---- parseResultNotice / parseResultDoc (achieved price) ------------------

// FIXTURE: SOLD — ul. Kilińskiego 20/7. crawl.js prepends "TITLE. " ahead of
// the body; reproduced here since round-extraction reads whatever text it's
// given (this particular result has no explicit round in either).
// https://bip.umsroda.pl/struktura/1/2905/dokumenty/14925/wiadomosc/775181/…
const KILINSKIEGO_RESULT_TITLE = 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 7 w Środzie Wielkopolskiej przy ulicy Kilińskiego 20 na działce nr 1332/1 z 2 września 2024 roku.';
const KILINSKIEGO_RESULT_BODY = `Środa Wielkopolska, dnia 02.09.2024 roku Informacja o wyniku przetargu Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021, poz. 2213) uprzejmie informuję, że przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 7, o pow. 26,62 m 2 do którego przynależy pomieszczenie gospodarcze o powierzchni 6,43 m 2 oraz udział w korytarzu 3,82 m 2 do którego przynależy udział 54/1000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położonym w Środzie Wielkopolskiej przy ul. Kilińskiego 20, na działce oznaczonej nr. geod. 1332/1, obszaru 0,1514 ha zapisanej w KW (*) odbył się w dniu 23.08.2024 roku w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej ul. Daszyńskiego 5. Liczba osób dopuszczonych w przetargu – 1. Liczba osób niedopuszczonych w przetargu – 0. Cena wywoławcza wynosiła 100.000,00 zł. Minimalne postąpienie ustalono na kwotę 1000,00 zł. Przetarg zakończył się wynikiem pozytywnym. Najwyższa cena osiągnięta w przetargu – 101.000,00 zł. Nabywca nieruchomości – Pan Roman Stachowiak.`;
const KILINSKIEGO_URL = 'https://bip.umsroda.pl/struktura/1/2905/dokumenty/14925/wiadomosc/775181/informacja_o_wyniku_przetargu_ustnego_nieograniczonego_na_sprzed';

test('parseResultNotice: Kilińskiego 20/7 — sold, explicit "wynikiem pozytywnym", area/prices/date', () => {
  const recs = parseResultNotice(`${KILINSKIEGO_RESULT_TITLE} ${KILINSKIEGO_RESULT_BODY}`, KILINSKIEGO_URL);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Kilińskiego 20/7');
  assert.equal(r.address.key, 'kilinskiego|20|7');
  assert.equal(r.area_m2, 26.62, 'flat area, not the pomieszczenie gospodarcze (6,43) or korytarz (3,82) shares');
  assert.equal(r.auction_date, '2024-08-23', 'past-tense "odbył się w dniu" anchor');
  assert.equal(r.starting_price_pln, 100000);
  assert.equal(r.final_price_pln, 101000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, KILINSKIEGO_URL);
});

// FIXTURE: SOLD — ul. Sejmikowej 2/5, round II. REAL BUG regression: this
// notice names a buyer and states a numeric final price but OMITS the
// "Przetarg zakończył się wynikiem pozytywnym" sentence entirely — outcome
// must still resolve to 'sold', inferred from the stated final price.
// Title carries the round ("wyniku DRUGIEGO przetargu"); crawl.js prepends
// it exactly like this. https://bip.umsroda.pl/…/wiadomosc/672257/…
const SEJMIKOWA_R2_RESULT = `Informacja o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 5 przy ulicy Sejmikowej 2 w Środzie Wielkopolskiej na działce nr 1824/1 z 3 lutego 2023 roku. Środa Wielkopolska, dnia 03.02.2023 roku Informacja o wyniku przetargu Na podstawie § 12. rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) uprzejmie informuję, że drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5, o pow. 28,35 m 2 wraz piwnicą o powierzchni użytkowej 4,90 m 2 oraz udziału w WC znajdującym się na tym samym piętrze co lokal mieszkalny, do którego przynależy udział 374/10000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położnym w Środzie Wielkopolskiej przy ul. Sejmikowej 2, na działce oznaczonej nr geod. 1824/1 obszaru 0,0261 ha zapisanej w KW PO1D/00017719/7, odbył się w dniu 27 stycznia 2023 roku w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej ul. Daszyńskiego 5. Liczba osób dopuszczonych w przetargu – 1. Liczba osób niedopuszczonych w przetargu – 0. Cena wywoławcza wynosiła 108 000,00 zł. Minimalne postąpienie ustalono na kwotę 1 080,00 zł. Najwyższa cena osiągnięta w przetargu – 109 080,00 zł. Nabywca nieruchomości – Pan Adam Skrobosiński.`;

test('parseResultNotice: Sejmikowej 2/5 round II — REAL BUG regression: sold, INFERRED from stated final price (notice omits "wynikiem pozytywnym")', () => {
  const recs = parseResultNotice(SEJMIKOWA_R2_RESULT, 'https://bip.umsroda.pl/struktura/1/2905/dokumenty/14925/wiadomosc/672257/x');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.doesNotMatch(SEJMIKOWA_R2_RESULT, /wynikiem pozytywnym/, 'sanity: the fixture genuinely omits this sentence');
  assert.equal(r.address_raw, 'ul. Sejmikowej 2/5');
  assert.equal(r.round, 2, 'from the title\'s "wyniku drugiego przetargu"');
  assert.equal(r.area_m2, 28.35);
  assert.equal(r.auction_date, '2023-01-27');
  assert.equal(r.starting_price_pln, 108000);
  assert.equal(r.final_price_pln, 109080);
  assert.equal(r.outcome, 'sold');
  assert.ok(r.notes.includes('parse: outcome inferred from stated final price'));
});

// FIXTURE: UNSOLD — ul. Sejmikowej 2/5, round I. "brak uczestników" (no
// bidders). https://bip.umsroda.pl/…/wiadomosc/653123/…
const SEJMIKOWA_R1_RESULT = `Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 5 przy ulicy Sejmikowej 2 w Środzie Wielkopolskiej na działce nr 1824/1 z 14 października 2022 roku. Środa Wielkopolska, dnia 14.10.2022 roku Informacja o wyniku przetargu Na podstawie § 12. rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213) uprzejmie informuję, że przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5, o pow. 28,35 m 2 wraz piwnicą o powierzchni użytkowej 4,90 m 2 oraz udziału w WC znajdującym się na tym samym piętrze co lokal mieszkalny, do którego przynależy udział 374/10000 we współwłasności nieruchomości, stanowiący własność gminy, znajdujący się w budynku położnym w Środzie Wielkopolskiej przy ul. Sejmikowej 2, na działce oznaczonej nr. geod. 1824/1 obszaru 0,0261 ha zapisanej w KW PO1D/00017719/7, odbył się w dniu 7 października 2022 roku w siedzibie Urzędu Miejskiego w Środzie Wielkopolskiej ul. Daszyńskiego 5. Liczba osób dopuszczonych w przetargu – 0. Liczba osób niedopuszczonych w przetargu – 0. Cena wywoławcza wynosiła 108.000,00 zł. Najwyższa cena osiągnięta w przetargu – brak. Nabywca nieruchomości – brak. Z uwagi na brak uczestników przetarg zakończył się wynikiem negatywnym.`;

test('parseResultNotice: Sejmikowej 2/5 round I — unsold, "brak uczestników", literal "brak" final price stays null', () => {
  const recs = parseResultNotice(SEJMIKOWA_R1_RESULT, 'https://bip.umsroda.pl/struktura/1/2905/dokumenty/14925/wiadomosc/653123/x');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address_raw, 'ul. Sejmikowej 2/5');
  assert.equal(r.auction_date, '2022-10-07');
  assert.equal(r.starting_price_pln, 108000);
  assert.equal(r.final_price_pln, null, '"Najwyższa cena osiągnięta w przetargu – brak" has no digit to capture');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak_uczestnikow');
});

test('parseResultNotice: empty/garbled text returns []', () => {
  assert.deepEqual(parseResultNotice('', KILINSKIEGO_URL), []);
  assert.deepEqual(parseResultNotice('Brak danych.', KILINSKIEGO_URL), []);
});

// parseResultDoc is the contract wrapper for parseResultNotice.
test('parseResultDoc delegates to parseResultNotice (same results)', () => {
  const text = `${KILINSKIEGO_RESULT_TITLE} ${KILINSKIEGO_RESULT_BODY}`;
  const fromNotice = parseResultNotice(text, KILINSKIEGO_URL);
  const fromDoc = parseResultDoc(text, null, KILINSKIEGO_URL);
  assert.deepEqual(fromDoc, fromNotice);
});
