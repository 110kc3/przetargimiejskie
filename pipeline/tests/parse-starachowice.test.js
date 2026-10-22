// Starachowice parser unit tests.
// Fixtures groundtruthed against real announcements and result documents from starachowice.eu
// and bip.um.starachowice.pl:
// - Słoneczna 20/97 (lokal mieszkalny: round 1 & 2 announcements)
// - Majówka 24/17 (lokal mieszkalny: round 1 announcement, round 1 unsold result, round 2 sold result)
// - Wojska Polskiego 12A/65 (lokal mieszkalny: round 1 announcement, round 1 sold result)
// - Radomska 44/2a (lokal mieszkalny: round 1 sold result)
// - Majówka 8/5 (lokal mieszkalny: round 4 sold result)
// - ul. Smugowa (działki nr 2482/3, 2487/3, 2482/7 i 2487/5: round 7 announcement, round 6 unsold result)
// - ul. Tadeusza Kościuszki 13 (działka nr 945: round 2 sold result)
// - ul. Kanałowa (działki nr 1091/17, 1091/18, 1091/19: round 2 announcement)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  isExcludedTitle,
  parseDatePL,
  auctionDateFromText,
  roundFromText,
  wadiumDeadlineToISO,
  unitAreaFromText,
  plotAreaFromText,
  parcelFromText,
  obrebFromText,
  cleanStreetGenitive,
  extractFlatAddress,
  extractLandAddress,
  extractPriceAndWadium,
  extractResultOutcomeAndPrices,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/starachowice/parse.js';

import {
  extractAttachmentUrl,
  extractArticleBody,
  harvestCards,
} from '../src/cities/starachowice/crawl.js';

// ----------------------------------------------------------------- title routing

test('title routing: sale announcements vs result notices vs excluded noise', () => {
  // Flat sale announcements
  assert.equal(
    isAnnouncementTitle('Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 97 położonego w Starachowicach przy ul. Słonecznej 20'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 17 położonego w Starachowicach przy ul. Majówka 24'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('Czwarty przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 położonego w Starachowicach przy ul. Majówka 8'),
    true,
  );

  // Land / built property sale announcements
  assert.equal(
    isAnnouncementTitle('VII przetarg na sprzedaż nieruchomości gruntowej przy ul. Smugowej w Starachowicach'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('II przetarg na sprzedaż nieruchomości gruntowej zabudowanej przy ul. Tadeusza Kościuszki 13 w Starachowicach'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie II przetargu ustnego ograniczonego na sprzedaż nieruchomości gruntowej.'),
    true,
  );

  // Result notices
  const res1 = 'Informacja o wyniku II przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 17 przy ul. Majówka 24';
  const res2 = 'Informacja o wyniku I przetargu ustnego nieograniczonego na lokal mieszkalny nr 2a ul. Radomska 44';
  const res3 = 'Informacja o wyniku II przetargu na sprzedaż działki przy ul. Tadeusza Kościuszki';
  const res4 = 'Informacja o wyniku VI przetargu na sprzedaż działek przy ul. Smugowej w Starachowicach';

  assert.equal(isResultTitle(res1), true);
  assert.equal(isAnnouncementTitle(res1), false);
  assert.equal(isResultTitle(res2), true);
  assert.equal(isAnnouncementTitle(res2), false);
  assert.equal(isResultTitle(res3), true);
  assert.equal(isAnnouncementTitle(res3), false);
  assert.equal(isResultTitle(res4), true);
  assert.equal(isAnnouncementTitle(res4), false);

  // Excluded lease / rental / cemetery noise
  const excl1 = 'Pierwszy przetarg ustny nieograniczony na wydzierzawienie nieruchomosci przy cmentarzu przy ul. Radomskiej w Starachowicach';
  const excl2 = 'Pierwszy przetarg ustny ograniczony na wydzierżawienie części nieruchomości gminnej położonej w Starachowicach przy ul. Nowej z przeznaczeniem na ogródek przydomowy';
  const excl3 = 'I przetarg ustny nieograniczony na miejsca pod urządzenia automatyczne służące do sprzedaży zniczy, położone pod cmentarzami przy ul. Radomskiej, Zgodnej i Polnej.';
  const excl4 = 'Pierwszy przetarg ustny nieograniczony na wydzierżawienie stanowisk handlowych przy cmentarzach przeznaczonych pod handel zniczami i kwiatami.';
  const excl5 = 'Informacja o wykazie nieruchomości gruntowej, stanowiącej własność Gminy Starachowice, przeznaczonej do wydzierżawienia w drodze przetargu ustnego nieograniczonego';

  assert.equal(isExcludedTitle(excl1), true);
  assert.equal(isAnnouncementTitle(excl1), false);
  assert.equal(isExcludedTitle(excl2), true);
  assert.equal(isAnnouncementTitle(excl2), false);
  assert.equal(isExcludedTitle(excl3), true);
  assert.equal(isAnnouncementTitle(excl3), false);
  assert.equal(isExcludedTitle(excl4), true);
  assert.equal(isAnnouncementTitle(excl4), false);
  assert.equal(isExcludedTitle(excl5), true);
  assert.equal(isAnnouncementTitle(excl5), false);
});

// --------------------------------------------------------------- unit extractors

test('date extraction and parsing', () => {
  assert.equal(parseDatePL('17.09.2026 r.'), '2026-09-17');
  assert.equal(parseDatePL('25.03.2026 r.'), '2026-03-25');
  assert.equal(parseDatePL('10 lutego 2026'), '2026-02-10');
  assert.equal(parseDatePL('24 września 2026'), '2026-09-24');
  assert.equal(parseDatePL('12 sierpnia 2026'), '2026-08-12');

  assert.equal(
    auctionDateFromText('Przetarg zostanie przeprowadzony w sali 125, dnia 27.10.2026 r., o godz. 10.00.'),
    '2026-10-27',
  );
  assert.equal(
    auctionDateFromText('W dniu 18.02.2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Starachowicach odbył się I przetarg'),
    '2026-02-18',
  );
  assert.equal(
    auctionDateFromText('który odbył się w dniu 29.07.2025 r. o godz. 10.00'),
    '2025-07-29',
  );
});

test('round extraction from text and title', () => {
  assert.equal(roundFromText('Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu', ''), 1);
  assert.equal(roundFromText('Drugi przetarg ustny nieograniczony', ''), 2);
  assert.equal(roundFromText('Czwarty przetarg ustny nieograniczony', ''), 4);
  assert.equal(roundFromText('VII przetarg na sprzedaż nieruchomości', ''), 7);
  assert.equal(roundFromText('', 'INFORMACJA O WYNIKU PIERWSZEGO PRZETARGU USTNEGO'), 1);
  assert.equal(roundFromText('', 'INFORMACJA O WYNIKU DRUGIEGO PRZETARGU USTNEGO'), 2);
  assert.equal(roundFromText('', 'INFORMACJA O WYNIKU CZWARTEGO PRZETARGU USTNEGO'), 4);
  assert.equal(roundFromText('', 'odbył się VI przetarg ustny nieograniczony'), 6);
});

test('wadium deadline extraction', () => {
  const t1 = 'Warunkiem wzięcia udziału w przetargu jest wpłacenie wadium w kwocie: 29 000,00 zł. Wadium przetargowe należy wnieść najpóźniej do dnia 20.10.2026 r., przelewem';
  assert.equal(wadiumDeadlineToISO(t1), '2026-10-20');

  const t2 = 'Do wyznaczonego terminu na dzień 03.02.2026 r. nie wpłynęło ani jedno wadium przetargowe';
  assert.equal(wadiumDeadlineToISO(t2), '2026-02-03');
});

test('area extraction for flats and land', () => {
  assert.equal(
    unitAreaFromText('na sprzedaż lokalu mieszkalnego nr 97 o powierzchni użytkowej 58,90 m2 mieszczącego się'),
    58.90,
  );
  assert.equal(
    unitAreaFromText('na sprzedaż lokal u mieszkaln ego nr 17 o powierzchni użytkowej 46 ,00 m 2 mieszcząc ego się'),
    46.00,
  );
  assert.equal(
    unitAreaFromText('lokalu mieszkalnego nr 2a o powierzchni użytkowej 32,59 m 2 mieszczącego się'),
    32.59,
  );
  assert.equal(
    unitAreaFromText('lokalu mieszkalnego nr 5 o powierzchni użytkowej 30,00 m2'),
    30.00,
  );

  // Plot areas
  assert.equal(
    plotAreaFromText('działk i numer 248 2/ 3 , 2487/3, 2482/7 i 2487/5 o ł ącznej powierzchni 0, 1437 ha'),
    1437,
  );
  assert.equal(
    plotAreaFromText('działka numer 945 o powierzchni 0, 1100 ha'),
    1100,
  );
});

test('parcel and obreb extraction', () => {
  assert.equal(parcelFromText('działka numer 945 o powierzchni 0, 1100 ha'), '945');
  assert.equal(parcelFromText('działki nr 2482/3, 2487/3, 2482/7 i 2487/5 o łącznej powierzchni'), '2482/3, 2487/3, 2482/7 i 2487/5');
  assert.equal(parcelFromText('ul. Leśna dz. nr 1/5 i 4/131 o pow'), '1/5 i 4/131');
  assert.equal(obrebFromText('działka nr 945 (obręb 0005)'), '0005');
  assert.equal(obrebFromText('działka nr 1266 (obręb 0002) o powierzchni 0,0816 ha'), '0002');
});

test('street genitive cleaning', () => {
  assert.equal(cleanStreetGenitive('Słonecznej'), 'Słoneczna');
  assert.equal(cleanStreetGenitive('Radomskiej'), 'Radomska');
  assert.equal(cleanStreetGenitive('Smugowej'), 'Smugowa');
  assert.equal(cleanStreetGenitive('Leśnej'), 'Leśna');
  assert.equal(cleanStreetGenitive('Majówka'), 'Majówka');
  assert.equal(cleanStreetGenitive('Wojska Polskiego'), 'Wojska Polskiego');
  assert.equal(cleanStreetGenitive('Tadeusza Kościuszki'), 'Tadeusza Kościuszki');
});

test('address extraction for flats', () => {
  const t1 = 'na sprzedaż lokalu mieszkalnego nr 97 o powierzchni użytkowej 58,90 m2 mieszczącego się w budynku mieszkalnym wielorodzinnym nr 20 przy ul. Słonecznej';
  const a1 = extractFlatAddress(t1);
  assert.ok(a1);
  assert.equal(a1.address_raw, 'ul. Słoneczna 20/97');
  assert.equal(a1.address.street, 'Słoneczna');
  assert.equal(a1.address.building, '20');
  assert.equal(a1.address.apt, '97');
  assert.equal(a1.address.key, 'sloneczna|20|97');

  const t2 = 'Informacja o wyniku II przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 17 przy ul. Majówka 24';
  const a2 = extractFlatAddress('', t2);
  assert.ok(a2);
  assert.equal(a2.address_raw, 'ul. Majówka 24/17');
  assert.equal(a2.address.key, 'majowka|24|17');

  const t3 = 'Informacja o wyniku I przetargu ustnego nieograniczonego na lokal mieszkalny nr 2a ul. Radomska 44';
  const a3 = extractFlatAddress('', t3);
  assert.ok(a3);
  assert.equal(a3.address_raw, 'ul. Radomska 44/2a');
  assert.equal(a3.address.key, 'radomska|44|2A');

  const t4 = 'Informacja o wyniku I przetargu na sprzedaż lokalu mieszkalnego nr 65 przy ul. Wojska Polskiego 12A w Starachowicach';
  const a4 = extractFlatAddress('', t4);
  assert.ok(a4);
  assert.equal(a4.address_raw, 'ul. Wojska Polskiego 12A/65');
  assert.equal(a4.address.key, 'wojska polskiego|12A|65');
});

// ------------------------------------------------------- parseAnnouncement tests

test('parseAnnouncement: flat auction at ul. Słoneczna 20/97 (Round 2)', () => {
  const title = 'Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 97 położonego w Starachowicach przy ul. Słonecznej 20';
  const body = `Prezydent Miasta Starachowice ogłasza drugi przetarg ustny nieograniczony, na sprzedaż lokalu mieszkalnego nr 97 o powierzchni użytkowej 58,90 m2 mieszczącego się w budynku mieszkalnym wielorodzinnym nr 20 przy ul. Słonecznej, usytuowanym na nieruchomości oznaczonej w ewidencji gruntów i budynków miasta Starachowice jako działka nr 545/1 (obręb 0005) o powierzchni 0,2101 ha, dla której Sąd Rejonowy w Starachowicach prowadzi księgę wieczystą nr KI1H/00017135/0.
Cena wywoławcza brutto do pierwszego przetargu wynosi 290 000,00 zł.
Przetarg zostanie przeprowadzony w siedzibie Urzędu Miejskiego w Starachowicach, ul. Radomska 45, w sali 125, dnia 27.10.2026 r., o godz. 10.00.
Warunkiem wzięcia udziału w przetargu jest wpłacenie wadium w kwocie: 29 000,00 zł.
Wadium przetargowe należy wnieść najpóźniej do dnia 20.10.2026 r., przelewem bankowym środków pieniężnych na konto Gminy Starachowice.`;
  const url = 'https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/drugi-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-97-polozonego-w-starachowicach-przy-ul-slonecznej-20.html';
  const docUrl = 'https://bip.um.starachowice.pl/bip/54_umstarachowice/fckeditor/file/Aga%20M%20przetargi/2026//Zarz%C4%85dzenie%20PM%20Nr%20393-2026%20II%20przetarg%20S%C5%82oneczna%2020%20m%2097.pdf';

  const res = parseAnnouncement(title, body, url, docUrl);
  assert.equal(res.length, 1);
  const rec = res[0];
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Słoneczna 20/97');
  assert.equal(rec.address.key, 'sloneczna|20|97');
  assert.equal(rec.area_m2, 58.90);
  assert.equal(rec.starting_price_pln, 290000);
  assert.equal(rec.wadium_pln, 29000);
  assert.equal(rec.auction_date, '2026-10-27');
  assert.equal(rec.wadium_deadline, '2026-10-20');
  assert.equal(rec.round, 2);
  assert.equal(rec.detail_url, url);
  assert.equal(rec.source_url, docUrl);
});

test('parseAnnouncement: land auction at ul. Smugowa (Round 7)', () => {
  const title = 'VII przetarg na sprzedaż nieruchomości gruntowej przy ul. Smugowej w Starachowicach';
  const body = `Prezydent Miasta Starachowice ogłasza siódmy przetarg ustny nieograniczony, na sprzedaż część nieruchomości gruntowej Gminy Starachowice, położonej w Starachowicach przy ul. Smugowej oznaczonej w ewidencji gruntów i budynków miasta Starachowice obrębu 0004 jako działki numer 2482/3, 2487/3, 2482/7 i 2487/5 o łącznej powierzchni 0,1437 ha, dla których Wydział Ksiąg Wieczystych Sądu Rejonowego w Starachowicach prowadzi księgi wieczyste nr KI1H/00016217/2 i KI1H/000141163/2.
Cena wywoławcza brutto do siódmego przetargu wynosi 123 000,00 zł.
Przetarg zostanie przeprowadzony w siedzibie Urzędu Miejskiego w Starachowicach, ul. Radomska 45, w sali 125, dnia 28.10.2026 r., o godz. 10.00.
Warunkiem wzięcia udziału w przetargu jest wpłacenie wadium w kwocie: 12 300,00 zł.`;
  const url = 'https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/vii-przetarg-na-sprzedaz-nieruchomosci-gruntowej-przy-ul-smugowej-w-starachowicach.html';

  const res = parseAnnouncement(title, body, url, null);
  assert.equal(res.length, 1);
  const rec = res[0];
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.address_raw, 'ul. Smugowa');
  assert.equal(rec.dzialka_nr, '2482/3, 2487/3, 2482/7 i 2487/5');
  assert.equal(rec.obreb, '0004');
  assert.equal(rec.area_m2, 1437);
  assert.equal(rec.starting_price_pln, 123000);
  assert.equal(rec.wadium_pln, 12300);
  assert.equal(rec.auction_date, '2026-10-28');
  assert.equal(rec.round, 7);
});

test('parseAnnouncement: land auction at ul. Kanałowa (Round 2, multi-parcel, ignores Urząd Miejski address)', () => {
  const title = 'Ogłoszenie II przetargu ustnego ograniczonego na sprzedaż nieruchomości gruntowej.';
  const body = `Prezydent Miasta Starachowice ogłasza drugi przetarg ustny ograniczony na sprzedaż nieruchomości gruntowej, położon ej w Starachowicach przy ul. Kanałowej , oznaczon ej w ewidencji gruntów i budynków miasta Starachowice (obręb 0005) jako działki: nr 1091/17 o powierzchni 0,0031 ha, nr 1091/18 o powierzchni 0,0018 ha oraz nr 1091/19 o powierzchni 0,0318 ha, dla której Sąd Rejonowy w Starachowicach prowadzi księgę wieczystą nr KI1H/00027063/7 .
Cena wywoławcza brutto do drugiego przetargu wynosi: 71 340,00 zł.
Przetarg zostanie przeprowadzony w siedzibie Urzędu Miejskiego w Starachowicach, ul. Radomska 45, w sali 130, dnia 17.11.2026 r., o godz. 10.00.
Warunkiem wzięcia udziału w przetargu jest wpłacenie wadium w kwocie: 7 000,00 zł.`;
  const url = 'https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/ogloszenie-ii-przetargu-ustnego-ograniczonego-na-sprzedaz-nieruchomosci-gruntowej-108.html';

  const res = parseAnnouncement(title, body, url, null);
  assert.equal(res.length, 1);
  const rec = res[0];
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.address_raw, 'ul. Kanałowa');
  assert.equal(rec.address, null); // unnumbered land
  assert.equal(rec.dzialka_nr, '1091/17, 1091/18, 1091/19');
  assert.equal(rec.obreb, '0005');
  assert.equal(rec.starting_price_pln, 71340);
  assert.equal(rec.wadium_pln, 7000);
  assert.equal(rec.auction_date, '2026-11-17');
  assert.equal(rec.round, 2);
});

// --------------------------------------------------------- parseResultDoc tests

test('parseResultDoc: sold flat at Majówka 24/17 (Round 2)', () => {
  const text = `Informacja o wyniku II przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 17 przy ul. Majówka 24

W dniu 25.03.2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Starachowicach odbył się II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 17 o powierzchni użytkowej 46,00 m2 mieszczącego się w budynku mieszkalnym wielorodzinnym nr 24 przy ul. Majówka, usytuowanym na nieruchomości oznaczonej w ewidencji gruntów i budynków miasta Starachowice jako działka nr 1266 (obręb 0002) o powierzchni 0,0816 ha. Przetarg ten zakończył się wynikiem pozytywnym.

Starachowice, dnia 01.04.2026 r.
INFORMACJA O WYNIKU DRUGIEGO PRZETARGU USTNEGO NIEOGRANICZONEGO
który odbył się w dniu 25.03.2026 r. o godz. 10.00
Oznaczenie wg katastru oraz księgi wieczystej:
miasto Starachowice ul. Majówka 24 lokal mieszkalny nr 17
Cena brutto do II przetargu w zł: 210 000,00 zł
Najwyższa cena brutto osiągnięta w przetargu: 212 100,00 zł
Wynik przetargu: Wynik pozytywny wyłoniono nabywcę
Nabywca: Małgorzata Wójcik`;

  const recs = parseResultDoc(text, '2026-03-25', 'https://bip.um.starachowice.pl/.../Majowka_24_m_17.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Majówka 24/17');
  assert.equal(r.address.key, 'majowka|24|17');
  assert.equal(r.area_m2, 46.00);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 210000);
  assert.equal(r.final_price_pln, 212100);
  assert.equal(r.auction_date, '2026-03-25');
  assert.equal(r.round, 2);
});

test('parseResultDoc: unsold flat at Majówka 24/17 (Round 1 - brak wadium)', () => {
  const text = `Informacja o wyniku I przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 17 przy ul. Majówka 24

W dniu 10.02.2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Starachowicach odbył się I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 17 o powierzchni użytkowej 46,00 m2 mieszczącego się w budynku mieszkalnym wielorodzinnym nr 24 przy ul. Majówka. Przetarg ten zakończył się wynikiem negatywnym.

Starachowice, dnia 12.02.2026 r.
INFORMACJA O WYNIKU PRZETARGU
w dniu 10.02.2026 r. o godz. 10.00 odbył się pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 17 przy ul. Majówka 24.
Cena wywoławcza brutto do I przetargu: 260 000,00 zł
Wysokość wadium: 26 000,00 zł
Komisja Przetargowa ustaliła, że:
Do wyznaczonego terminu na dzień 03.02.2026 r. nie wpłynęło ani jedno wadium przetargowe, w związku z powyższym przetarg zakończył się wynikiem negatywnym.`;

  const recs = parseResultDoc(text, '2026-02-10', 'https://bip.um.starachowice.pl/.../Majowka_24_m_17_I.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Majówka 24/17');
  assert.equal(r.address.key, 'majowka|24|17');
  assert.equal(r.area_m2, 46.00);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak wadium');
  assert.equal(r.starting_price_pln, 260000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.auction_date, '2026-02-10');
  assert.equal(r.round, 1);
});

test('parseResultDoc: sold flat at Radomska 44/2a (Round 1)', () => {
  const text = `Informacja o wyniku I przetargu ustnego nieograniczonego na lokal mieszkalny nr 2a ul. Radomska 44

W dniu 18.02.2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Starachowicach odbył się I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2a o powierzchni użytkowej 32,59 m2 mieszczącego się w budynku mieszkalnym wielorodzinnym nr 44 przy ul. Radomskiej. Przetarg ten zakończył się wynikiem pozytywnym.

Starachowice, dnia 26.02.2026 r.
INFORMACJA O WYNIKU PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO
który odbył się w dniu 18.02.2026 r. o godz. 10.00
miasto Starachowice ul. Radomska 44 lokal mieszkalny nr 2a
Cena brutto do I przetargu w zł: 120 000,00 zł
Najwyższa cena brutto osiągnięta w przetargu: 121 200,00 zł
Wynik przetargu: Wynik pozytywny wyłoniono nabywcę
Nabywca: Piotr Salski`;

  const recs = parseResultDoc(text, '2026-02-18', 'https://bip.um.starachowice.pl/.../Radomska.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Radomska 44/2a');
  assert.equal(r.address.key, 'radomska|44|2A');
  assert.equal(r.area_m2, 32.59);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 120000);
  assert.equal(r.final_price_pln, 121200);
  assert.equal(r.auction_date, '2026-02-18');
  assert.equal(r.round, 1);
});

test('parseResultDoc: sold land at Kościuszki 13 (Round 2)', () => {
  const text = `Informacja o wyniku II przetargu na sprzedaż działki przy ul. Tadeusza Kościuszki

W dniu 26.08.2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Starachowicach odbył się II przetarg ustny nieograniczony na sprzedaż zabudowanej nieruchomości gruntowej, stanowiącej własność Gminy Starachowice, położonej w Starachowicach przy ul. Tadeusza Kościuszki 13, oznaczonej w ewidencji gruntów i budynków miasta Starachowice (obręb 0005) jako działka nr 945 o powierzchni 0,1100 ha. Przetarg ten zakończył się wynikiem pozytywnym.

Starachowice, dnia 02.09.2026 r.
INFORMACJA O WYNIKU DRUGIEGO PRZETARGU USTNEGO NIEOGRANICZONEGO
który odbył się w dniu 26.08.2026 r. o godz. 10.00
działka nr 945 o łącznej pow. 0,1100 ha obręb 0005 ul. Tadeusza Kościuszki 13
Cena brutto do II przetargu w zł: 240.000,00 zł
Najwyższa cena brutto osiągnięta w przetargu: 242.400,00 zł
Wynik przetargu: Wynik pozytywny wyłoniono nabywcę
Nabywca: Olga Pijanowska`;

  const recs = parseResultDoc(text, '2026-08-26', 'https://bip.um.starachowice.pl/.../Kosciuszki.pdf');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address_raw, 'ul. Tadeusza Kościuszki 13');
  assert.equal(r.address.key, 'tadeusza kosciuszki|13|');
  assert.equal(r.area_m2, 1100);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 240000);
  assert.equal(r.final_price_pln, 242400);
  assert.equal(r.auction_date, '2026-08-26');
  assert.equal(r.round, 2);
});

// ----------------------------------------------------------- crawler helpers tests

test('crawler helpers: extractAttachmentUrl, extractArticleBody, harvestCards', () => {
  const sampleArticleHtml = `
    <article class="main-article" id="main-content">
      <time datetime="2026-09-24 09:52:47">24 września 2026</time>
      <h1>Test title</h1>
      <p>Przetarg zostanie przeprowadzony.</p>
      <a href="https://bip.um.starachowice.pl/bip/54_umstarachowice/fckeditor/file/Aga%20M%20przetargi/2026//Zarz%C4%85dzenie%20PM%20Nr%20393-2026.pdf">kliknij treść zarządzenia</a>
      <a href="/pl/przetargi/artykul.html?format=pdf">Pobierz PDF</a>
      <div class="more-news">Więcej aktualności</div>
    </article>
  `;

  assert.equal(
    extractAttachmentUrl(sampleArticleHtml),
    'https://bip.um.starachowice.pl/bip/54_umstarachowice/fckeditor/file/Aga%20M%20przetargi/2026//Zarz%C4%85dzenie%20PM%20Nr%20393-2026.pdf',
  );

  const body = extractArticleBody(sampleArticleHtml);
  assert.ok(body.includes('Przetarg zostanie przeprowadzony'));
  assert.ok(!body.includes('Więcej aktualności'));

  const sampleListingHtml = `
    <div class="col-12 col-md-8">
      <time datetime="2026-09-24 09:52:47">24 września 2026</time>
      <h2>VII przetarg na sprzedaż nieruchomości gruntowej</h2>
      <p class="description"></p>
    </div>
    <div class="col-12 col-md-1">
      <a href="/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/vii-przetarg.html" class="btn btn-more stretched-link">Więcej...</a>
    </div>
  `;

  const cards = harvestCards(sampleListingHtml);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].pubDate, '2026-09-24 09:52:47');
  assert.equal(cards[0].title, 'VII przetarg na sprzedaż nieruchomości gruntowej');
  assert.equal(cards[0].url, 'https://starachowice.eu/pl/dla-mieszkanca/nieruchomosci/przetargi/artykuly/vii-przetarg.html');
});
