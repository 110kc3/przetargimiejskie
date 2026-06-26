// Trzebinia parser tests. Fixtures are condensed-but-faithful copies of the REAL
// live article bodies (verified 2026-06-26):
//   art. 11856 — land ANNOUNCEMENT (dz. 3620, Góry Luszowskie, I przetarg,
//     137.000,00 zł in a TABLE, termin przetargu 20.01.2026);
//   art. 9562  — land RESULT (dz. Lgota 1080/34, I, wywoławcza 7.000 → osiągnięta
//     7.100, nabywca Pan Sylwester Piasny, held 06.09.2022).
// Reuses core/finn-bip.js body helpers; the office "ul. Narutowicza 10" must
// never be taken as the property street.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isResultTitle,
  isAnnouncementTitle,
  roundFromText,
  startingPriceFromText,
  achievedPriceFromText,
  tableDateFromText,
  parcelFromText,
  obrebFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/trzebinia/parse.js';

// ---------------------------------------------------------------- title routing

test('title routing: sale announcement vs result notice vs noise', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie Burmistrza Miasta Trzebini z dnia 26.11.2025 r. przetarg ustny nieograniczony na sprzedaż niezabudowanej działki'), true);
  assert.equal(isResultTitle('Informacja Burmistrza Miasta Trzebini o wynikach przetargu - działka w Lgocie 1080/34'), true);
  assert.equal(isAnnouncementTitle('Informacja Burmistrza Miasta Trzebini o wynikach przetargu'), false);
  assert.equal(isAnnouncementTitle('Ogłoszenie o przetargu na najem lokalu użytkowego'), false);
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości przeznaczonych do dzierżawy'), false);
});

test('unit extractors', () => {
  assert.equal(roundFromText('Burmistrz ogłasza: I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('odbył się II przetarg ustny nieograniczony'), 2);
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości wynosiła: 7.000,00 zł'), 7000);
  assert.equal(achievedPriceFromText('najwyższa cena osiągnięta w przetargu wyniosła: 7.100,00 zł'), 7100);
  assert.equal(tableDateFromText('Termin przetargu 20.01.2026 r. godzina 09:00'), '2026-01-20');
  assert.equal(parcelFromText('numerem geodezyjnym 1080/34 o powierzchni'), '1080/34');
  assert.equal(obrebFromText('obręb ewidencyjny Góry Luszowskie'), 'Góry Luszowskie');
});

// ---------------------------------------------------------------------- fixtures

const LAND_ANNOUNCEMENT_TITLE =
  'Ogłoszenie Burmistrza Miasta Trzebini z dnia 26.11.2025 r. przetarg ustny nieograniczony na sprzedaż niezabudowanej działki położonej przy ulicy Robotniczej w Trzebini.';

const LAND_ANNOUNCEMENT_BODY = `Ogłoszenie Burmistrza Miasta Trzebini z dnia 26.11.2025 r.
Burmistrz Miasta Trzebini ogłasza: I przetarg ustny nieograniczony na sprzedaż niezabudowanej działki położonej przy ulicy Robotniczej w Trzebini – jednostka ewidencyjna Trzebinia – miasto, obręb ewidencyjny Góry Luszowskie.
Tabela nr 1: Oznaczenie działki będącej przedmiotem przetargu.
Lp. Oznaczenie działki wg ewidencji gruntów Cena wywoławcza wraz z 23 % podatkiem Vat Wadium z opisem Termin wniesienia wadium Termin przetargu
1. Działka numer 3620 o powierzchni 0,1418 ha – jednostka ewidencyjna Trzebinia – miasto, obręb ewidencyjny Góry Luszowskie 137.000,00 zł 10.000,00 zł „przetarg działka numer 3620” 15.01.2026 r. 20.01.2026 r. godzina 09:00.
Działka oznaczona w operacie ewidencji gruntów obrębu Góry Luszowskie numerem geodezyjnym 3620 o powierzchni 0,1418 ha obręb Góry Luszowskie, dla której Sąd Rejonowy w Chrzanowie prowadzi księgę wieczystą numer KR1C/00046961/0, stanowi własność Gminy Trzebinia.
Przedmiotowa nieruchomość położona jest przy ulicy Robotniczej w Trzebini.
1. Przetarg odbędzie się w siedzibie Urzędu Miasta w Trzebini – ulica Narutowicza 10, III piętro, pokój nr 30.`;

const LAND_RESULT_BODY = `Informacja Burmistrza Miasta Trzebini o wynikach przetargu - działka w Lgocie 1080/34
W dniu 06.09.2022 roku w siedzibie Urzędu Miasta w Trzebini przy ulicy Narutowicza 10 odbył się I przetarg ustny nieograniczony na sprzedaż niezabudowanej nieruchomości składającej się z działki oznaczonej w operacie ewidencji gruntów obrębu Lgota numerem geodezyjnym 1080/34 o powierzchni 0,0665 ha.
Cena wywoławcza nieruchomości wynosiła: 7.000,00 zł, a najwyższa cena osiągnięta w przetargu wyniosła: 7.100,00 zł. Przedmiotowa sprzedaż jest zwolniona z podatku Vat.
Nabywcą prawa własności przedmiotowej nieruchomości został Pan Sylwester Piasny.`;

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: land — parcel, obręb, ha→m², table price + table date, street (not office)', () => {
  const rec = parseAnnouncement(LAND_ANNOUNCEMENT_TITLE, LAND_ANNOUNCEMENT_BODY, 'https://trzebinia.pl/.../11856-...');
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '3620');
  assert.equal(rec.obreb, 'Góry Luszowskie');
  assert.equal(rec.area_m2, 1418); // 0,1418 ha
  assert.equal(rec.address_raw, 'ul. Robotniczej'); // NOT ul. Narutowicza (office)
  assert.equal(rec.starting_price_pln, 137000); // from the table cell
  assert.equal(rec.auction_date, '2026-01-20'); // Termin przetargu, not Termin wadium (15.01)
  assert.equal(rec.round, 1);
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: land sold — parcel, achieved price + buyer, numeric date', () => {
  const [rec] = parseResultDoc(LAND_RESULT_BODY, null, 'https://trzebinia.pl/.../9562-...');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1080/34');
  assert.equal(rec.obreb, 'Lgota');
  assert.equal(rec.area_m2, 665); // 0,0665 ha
  assert.equal(rec.round, 1);
  assert.equal(rec.starting_price_pln, 7000);
  assert.equal(rec.final_price_pln, 7100);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2022-09-06');
});
