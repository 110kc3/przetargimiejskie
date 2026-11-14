
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isResultDoc,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  kindFromText,
  parsePLN,
} from '../src/cities/lwowek-slaski/parse.js';


const LAND_ANN = {
  title:
    'Ogłoszenie o IV przetargu ustnym nieograniczonym na sprzedaż nieruchomości niezabudowanej, oznaczonej ewidencyjnie nr 35/1 o powierzchni 0,3617 ha, położonej w obrębie 1 miasta Lwówek Śląski.',
  body:
    'OGŁOSZENIE Burmistrz Gminy i Miasta Lwówek Śląski ogłasza: IV przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej, oznaczonej ewidencyjnie nr 35/1 o powierzchni 0,3617 ha, położonej w obrębie 1 miasta Lwówek Śląski. Dla nieruchomości będącej przedmiotem sprzedaży wyznaczone były terminy poprzednich przetargów: I przetarg- 26.01.2026 r., II przetarg- 13.03.2026 r., III przetarg- 15.05.2026 r. Cena wywoławcza nieruchomości wynosi: 225.000,00 zł Przetarg odbędzie się dnia 03.07.2026 r. o godz. 0930 w pokoju nr 3 tut. Urzędu (parter) brama „A”. Warunkiem przystąpienia do przetargu, będzie wpłacenie wadium w wysokości 10 ceny wywoławczej tj. kwoty: 22.500,00 zł w terminie do dnia 29.06.2026 r. (włącznie). Lwówek Śląski Dnia: 19.05.2026 r.',
};

const COMM_ANN = {
  title: 'Ogłoszenie o przetargu_II przetarg ustny nieograniczonylokal użytkowy ul. Krótka 1',
  body:
    'OGŁOSZENIE Burmistrz Gminy i Miasta Lwówek Śląski ogłasza: II przetarg ustny nieograniczony na sprzedaż lokalu niemieszkalnego położonego na parterze budynku mieszkalno- użytkowego przy ul. Krótkiej nr 1 w Lwówku Śląskim o powierzchni użytkowej 45,90 m2, składającego się z sali obsługi klienta, pomieszczenia socjalnego, przedpokoju i Wc. Z przedmiotowym lokalem wiąże się udział w wysokości 598/10000 w częściach wspólnych budynku i działce nr 201/1 o powierzchni 0,0376 ha. Dla nieruchomości będącej przedmiotem sprzedaży wyznaczony był termin poprzedniego przetargu: 12.09.2025 r. Cena wywoławcza nieruchomości wynosi: 140.000,00 zł Przetarg odbędzie się dnia 12.12.2025 r. o godz. 0930 w pokoju nr 3 tut. Urzędu (parter) brama „A”. wadium w wysokości 10 ceny wywoławczej tj. kwoty: 14.000,00 zł Lwówek Śląski Dnia: 03.11.2025 r.',
};

const LAND_RES_SOLD = {
  title: 'Informacja o nabywcy działki nr 718.3 obreb 2.',
  body:
    'GPNŚ.6840.6.6.2026.KB/1 Lwówek Śląski, dnia 25.05.2026 r. INFORMACJĘ O WYNIKU PRZETARGU W dniu 15.05.2026 roku w siedzibie Urzędu Gminy i Miasta Lwówek Śląski Komisja przetargowa powołana Zarządzeniem Burmistrza Gminy i Miasta Lwówek Śląski nr GPNŚ.0050.116.2025 z dnia 13.08.2025 r. przeprowadziła III przetarg ustny nieograniczony na sprzedaż niezabudowanej działki oznaczonej ewidencyjnie nr 718/3, położonej w obrębie 2 miasta Lwówek Śląski. Cena wywoławcza nieruchomości wynosiła: 96.000,00 zł Cena osiągnięta w przetargu: 97.000,00 zł netto. Do ceny nabycia został doliczony podatek VAT w wysokości 23%. Łączna cena nabycia wynosi 119.310,00 zł brutto (słownie: sto dziewiętnaście tysięcy trzysta dziesięć zł 00/100). Nabywcą w/w nieruchomości zostali ustaleni Państwo Natalia Szatkowska i Krzysztof Hammer.',
};

const FLAT_RES_ORZESZKOWEJ = {
  title:
    'Informacja o wyniku przetargu_na sprzedaż lokalu mieszkalnego nr 1 położonego przy ulicy Orzeszkowej 32-36 we Lwówku Śląskim',
  body: '',
};

const FLAT_RES_GASZOW = {
  title:
    'Informacja o wyniku przetargu_na sprzedaż lokalu mieszkalnego nr 3 położonego w miejscowości Gaszów nr 30.',
  body: '',
};

const BUILT_RURAL_ANN = {
  title:
    'Ogłoszenie o II przetargu ustnym nieograniczonym na sprzedaż nieruchomości zabudowanej budynkiem mieszkalno- gospodarczym nr 105, oznaczonej ewidencyjnie nr 506/1 i 506/2 o łącznej powierzchni 0,0812 ha, położonej w obrębie Niwnice.',
  body:
    'OGŁOSZENIE Burmistrz Gminy i Miasta Lwówek Śląski ogłasza: II przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej budynkiem mieszkalno- gospodarczym nr 105, oznaczonej ewidencyjnie nr 506/1 i 506/2 o łącznej powierzchni 0,0812 ha, położonej w obrębie Niwnice. W skład działek wchodzi budynek mieszkalno- gospodarczy, w którym znajdują się cztery lokale mieszkalne o łącznej powierzchni 149,50 m2 oraz dodatkowa zabudowa gospodarcza. Cena wywoławcza nieruchomości wynosi: 146.000,00 zł Przetarg odbędzie się dnia 03.07.2026 r. o godz. 1000 w pokoju nr 3 tut. Urzędu.',
};

const LEASE = {
  title: 'Ogłoszenie o przetargu na oddanie w dzierżawę części nieruchomości gruntowej pod działalność handlową',
  body:
    'Burmistrz Gminy i Miasta Lwówek Śląski ogłasza I przetarg ustny nieograniczony na oddanie w dzierżawę części nieruchomości gruntowej niezabudowanej położonej w obrębie 2 miasta Lwówek Śląski.',
};

const blob = (f) => buildRecordText(f);


test('parsePLN: dot-thousands + comma-grosze (the live Lwówek amount format)', () => {
  assert.equal(parsePLN('225.000,00'), 225000);
  assert.equal(parsePLN('97.000,00'), 97000);
  assert.equal(parsePLN('140.000,00'), 140000);
  assert.equal(parsePLN('96 000'), 96000);
  assert.equal(parsePLN('brak'), null);
});

test('doc-type gates: sale-announcement / result / lease routing', () => {
  assert.equal(isSaleAuction(blob(LAND_ANN)), true);
  assert.equal(isResultDoc(blob(LAND_ANN)), false);
  assert.equal(isResultDoc(blob(LAND_RES_SOLD)), true);
  assert.equal(isResultDoc(blob(FLAT_RES_ORZESZKOWEJ)), true);
  assert.equal(isLease(blob(LEASE)), true);
  assert.equal(isSaleAuction(blob(LEASE)), false);
});

test('kindFromText: TITLE-first classification (never the URL slug), body-trap resistant', () => {
  assert.equal(kindFromText(blob(LAND_ANN)), 'grunt');
  assert.equal(kindFromText(blob(COMM_ANN)), 'uzytkowy');
  assert.equal(kindFromText(blob(LAND_RES_SOLD)), 'grunt');
  assert.equal(kindFromText(blob(FLAT_RES_ORZESZKOWEJ)), 'mieszkalny');
  assert.equal(kindFromText(blob(BUILT_RURAL_ANN)), 'zabudowana');
});

test('roundFromText: "<ROMAN> przetarg ustny", ignoring the bare "I przetarg-" prior-round history', () => {
  assert.equal(roundFromText(blob(LAND_ANN)), 4);
  assert.equal(roundFromText(blob(COMM_ANN)), 2);
  assert.equal(roundFromText(blob(LAND_RES_SOLD)), 3);
});

test('auctionDateFromText: announcement "Przetarg odbędzie się dnia …" vs result "W dniu … roku"; trap-dates excluded', () => {
  assert.equal(auctionDateFromText(blob(LAND_ANN)), '2026-07-03');
  assert.equal(auctionDateFromText(blob(COMM_ANN)), '2025-12-12');
  assert.equal(auctionDateFromText(blob(LAND_RES_SOLD)), '2026-05-15');
  assert.equal(auctionDateFromText(blob(FLAT_RES_ORZESZKOWEJ)), null);
});

test('startingPriceFromText: nominative "Cena wywoławcza …", never the genitive wadium clause', () => {
  assert.equal(startingPriceFromText(blob(LAND_ANN)), 225000);
  assert.equal(startingPriceFromText(blob(COMM_ANN)), 140000);
  assert.equal(startingPriceFromText(blob(LAND_RES_SOLD)), 96000);
});

test('achievedPriceFromText: NET "Cena osiągnięta w przetargu", never the brutto "Łączna cena nabycia"', () => {
  assert.equal(achievedPriceFromText(blob(LAND_RES_SOLD)), 97000);
  assert.equal(achievedPriceFromText(blob(LAND_ANN)), null);
});


test('parseAnnouncement: LAND (884419) — parcel-keyed grunt, ha→m², obręb, price/date/round', () => {
  const r = parseAnnouncement(blob(LAND_ANN));
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '35/1');
  assert.equal(r.obreb, '1');
  assert.equal(r.area_m2, 3617);
  assert.equal(r.starting_price_pln, 225000);
  assert.equal(r.auction_date, '2026-07-03');
  assert.equal(r.round, 4);
});

test('parseAnnouncement: COMMERCIAL (848589) — address-keyed uzytkowy, "przy ul. Krótkiej nr 1", użytkowa area (not the udział parcel)', () => {
  const r = parseAnnouncement(blob(COMM_ANN));
  assert.equal(r.kind, 'uzytkowy');
  assert.equal(r.address.street, 'Krótkiej');
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, null);
  assert.equal(r.area_m2, 45.9);
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.auction_date, '2025-12-12');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: BUILT rural Niwnice 105 (884410) — classifies zabudowana but is DROPPED (no parseable "przy ul." / "w miejscowości … nr" address)', () => {
  assert.equal(kindFromText(blob(BUILT_RURAL_ANN)), 'zabudowana');
  assert.equal(parseAnnouncement(blob(BUILT_RURAL_ANN)), null);
});

test('parseAnnouncement: a lease slips through to the parser? — grunt/unit gates never see it (crawl skips by title), but a stray still fails isSaleAuction upstream', () => {
  assert.equal(isSaleAuction(blob(LEASE)), false);
});


test('parseResultDoc: LAND SOLD (884607) — parcel-keyed, NET achieved 97 000 over wywoławcza 96 000, buyer named ⇒ sold', () => {
  const [r] = parseResultDoc(blob(LAND_RES_SOLD), '2026-05-25', 'https://bip.lwowekslaski.pl/wiadomosci/3/wiadomosc/884607/x');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '718/3');
  assert.equal(r.obreb, '2');
  assert.equal(r.round, 3);
  assert.equal(r.starting_price_pln, 96000);
  assert.equal(r.final_price_pln, 97000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-05-15');
  assert.equal(r.source_url, 'https://bip.lwowekslaski.pl/wiadomosci/3/wiadomosc/884607/x');
});

test('parseResultDoc: FLAT TITLE-ONLY Orzeszkowej 32-36/1 (841002) — address+kind from title, building RANGE, no price ⇒ unsold + notes, date falls back to publication date', () => {
  const [r] = parseResultDoc(blob(FLAT_RES_ORZESZKOWEJ), '2025-09-22', 'https://bip.lwowekslaski.pl/wiadomosci/3/wiadomosc/841002/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Orzeszkowej');
  assert.equal(r.address.building, '32-36');
  assert.equal(r.address.apt, '1');
  assert.equal(r.address.key, 'orzeszkowej|32-36|1');
  assert.equal(r.starting_price_pln, null);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.auction_date, '2025-09-22');
  assert.ok(r.notes.includes('parse: no achieved price and no explicit negative outcome'));
});

test('parseResultDoc: FLAT TITLE-ONLY rural Gaszów 30/3 (840998) — village+house-number address (no street)', () => {
  const [r] = parseResultDoc(blob(FLAT_RES_GASZOW), '2025-09-22', 'https://bip.lwowekslaski.pl/x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Gaszów');
  assert.equal(r.address.building, '30');
  assert.equal(r.address.apt, '3');
  assert.equal(r.address.key, 'gaszow|30|3');
  assert.equal(r.outcome, 'unsold');
});

test('parseResultDoc: lease result excluded (isLease gate) and announcement-not-result excluded', () => {
  const leaseResult = { title: 'Informacja o wyniku przetargu na oddanie w dzierżawę części nieruchomości', body: 'Komisja przeprowadziła I przetarg ustny nieograniczony na oddanie w dzierżawę części nieruchomości gruntowej.' };
  assert.deepEqual(parseResultDoc(blob(leaseResult), null, 'x'), []);
  assert.deepEqual(parseResultDoc(blob(LAND_ANN), null, 'x'), []);
});

test('parseResultDoc: empty/null input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});

test('isNegativeOutcome: sold notice is not negative; a "wynikiem negatywnym" notice is', () => {
  assert.equal(isNegativeOutcome(blob(LAND_RES_SOLD)), false);
  assert.equal(
    isNegativeOutcome(blob({ body: 'Przetarg zakończył się wynikiem negatywnym, nikt nie przystąpił do przetargu.' })),
    true,
  );
});

test('unitAreaFromText: użytkowa m² for units; null for a land parcel', () => {
  assert.equal(unitAreaFromText(blob(COMM_ANN)), 45.9);
  assert.equal(unitAreaFromText(blob(LAND_ANN)), null);
});
