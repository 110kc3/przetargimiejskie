// Bochnia parser tests. Fixtures are condensed-but-faithful copies of the REAL
// live bochnia.eu article bodies (verified 2026-07-05):
//   ann Murowianka 1 — flat ANNOUNCEMENT (lokal nr 1, 43,89 m², II przetarg,
//     cena wywoławcza 136 800 zł, przetarg 12.01.2024; body also cites the prior
//     "I przetarg … odbył się 20.10.2023" and the office ul. Kazimierza Wielkiego);
//   wyniki Floris 3 — flat RESULT NEGATIVE (lokal nr 2, 44,84 m² pow. użytkowej +
//     3,15 m² piwnica, II, wywoławcza 180 000, "wynik negatywny — brak oferentów",
//     held 24.06.2024 — after a leading legal-reference "z dnia 14 września 2004");
//   wyniki Smyków — land RESULT SOLD (dz. 1258/42, obręb Bochnia-2, 0,1059 ha, I,
//     wywoławcza 188 000 → wylicytowana 189 900, held 13.04.2026).
// Reuses core/finn-bip.js body helpers; the office "ul. Kazimierza Wielkiego"
// must never be taken as the property street, and the prior-round / legal-ref
// dates must never be taken as the auction date.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isResultTitle,
  isAnnouncementTitle,
  roundFromBody,
  resultDateFromText,
  achievedPriceFromText,
  parcelFromText,
  obrebFromText,
  plotAreaFromText,
  landStreetFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/bochnia/parse.js';

// ---------------------------------------------------------------- title routing

test('title routing: sale announcement vs result notice vs noise', () => {
  assert.equal(isAnnouncementTitle('II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 przy ul. Murowianka 1 w Bochni'), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż niezabudowanej nieruchomości gruntowej położonej w Bochni w rejonie ul. Gazowej'), true);
  assert.equal(isResultTitle('Wyniki II przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2 przy ul. Floris 3'), true);
  assert.equal(isResultTitle('Informacja o wyniku I przetargu ustnego nieograniczonego na sprzedaż niezabudowanej nieruchomości gruntowej'), true);
  assert.equal(isAnnouncementTitle('Wyniki II przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2 przy ul. Floris 3'), false);
  assert.equal(isAnnouncementTitle('Ogłoszenie I przetargu na oddanie w dzierżawę części działki nr 3077/2 przy ul. Legionów Polskich'), false);
  assert.equal(isAnnouncementTitle('Wykaz obejmujący nieruchomości gruntowe przeznaczone do wydzierżawienia w trybie bezprzetargowym'), false);
});

test('unit extractors', () => {
  assert.equal(roundFromBody('podaję informację o wyniku II przetargu ustnego nieograniczonego'), 2);
  // The leading legal-reference "z dnia 14 września 2004 r. w sprawie …" must NOT win
  // over the operative "… z dnia <date> r. przeprowadzonego" auction date.
  assert.equal(resultDateFromText('Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu podaję informację o wyniku I przetargu ustnego nieograniczonego z dnia 13 kwietnia 2026 r. przeprowadzonego w budynku'), '2026-04-13');
  assert.equal(achievedPriceFromText('Wylicytowana cena ww. nieruchomości wyniosła 189 900,00 zł netto.'), 189900);
  assert.equal(parcelFromText('oznaczonej w ewidencji gruntów jako działka nr 1258/42 o pow. 0,1059 ha'), '1258/42');
  assert.equal(obrebFromText('położonej w Bochni przy ul. Smyków, obręb Bochnia-2, oznaczonej'), 'Bochnia-2');
  assert.equal(plotAreaFromText('jako działka nr 1258/42 o pow. 0,1059 ha, obj. KW'), 1059);
  assert.equal(landStreetFromText('w budynku Urzędu Miasta Bochnia, ul. Kazimierza Wielkiego 2, położonej w Bochni przy ul. Smyków, obręb Bochnia-2'), 'Smyków');
});

// ---------------------------------------------------------------------- fixtures

const ANN_MUROWIANKA_TITLE =
  'II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 przy ul. Murowianka 1 w Bochni';

const ANN_MUROWIANKA_BODY = `Burmistrz Miasta Bochnia na podstawie art. 39 ust. 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami oraz Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. o g ł a s z a drugi przetarg ustny nieograniczony. Przedmiotem przetargu jest sprzedaż lokalu mieszkalnego nr 1 o pow. 43,89 m2 w domu wielolokalowym przy ul. Murowianka 1 w Bochni. Sprzedaż lokalu mieszkalnego nastąpi wraz ze sprzedażą udziału we współwłasności nieruchomości wspólnej wynoszącym 4389/16701 części w działce nr 6256/5 o pow. 0,0334 ha. I przetarg ustny nieograniczony odbył się 20.10.2023 r. i zakończył się wynikiem negatywnym z uwagi na brak oferentów. Ustala się cenę wywoławczą nieruchomości w wysokości 136 800,00 zł oraz wymagane wadium w wysokości 14 000,00 zł. Sprzedaż korzysta ze zwolnienia od podatku VAT. Przetarg odbędzie się w dniu 12 stycznia 2024 r. o godz. 1100 w Urzędzie Miasta Bochnia przy ul. Kazimierza Wielkiego 2, 32-700 Bochnia, pok. nr.100.`;

const RES_FLORIS_TEXT =
  'Wyniki II przetargu ustnego nieograniczonego na sprzedaż lokalu nr 2 przy ul. Floris 3. ' +
  'Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów (t.j. Dz. U. z 2021r., poz. 2213) podaję informację o wyniku II przetargu ustnego nieograniczonego z dnia 24 czerwca 2024 r. przeprowadzonego w budynku Urzędu Miasta Bochnia. ' +
  '1. Przedmiotem przetargu była sprzedaż lokalu mieszkalnego nr 2 o pow. użytkowej mieszkania 44,84 m2 położonego w Bochni przy ul. Floris 3 w budynku wielolokalowym, mieszkalno – usługowym, położonym na działce ewidencyjnej nr 6253 o pow. 0,0850 ha. Do lokalu mieszkalnego przynależy pomieszczenie piwniczne o pow. 3,15 m2. ' +
  '2. Cena wywoławcza – 180 000,00 zł. Sprzedaż korzysta ze zwolnienia od podatku VAT. ' +
  '3. Przetarg zakończył się wynikiem negatywnym z uwagi na brak oferentów.';

const RES_SMYKOW_TEXT =
  'Informacja o wyniku I przetargu ustnego nieograniczonego na sprzedaż niezabudowanej nieruchomości gruntowej, położonej w Bochni przy ul. Smyków. ' +
  'Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów (t.j. Dz. U. z 2021r., poz. 2213) podaję informację o wyniku I przetargu ustnego nieograniczonego z dnia 13 kwietnia 2026 r. przeprowadzonego w budynku Urzędu Miasta Bochnia, ul. Kazimierza Wielkiego 2, 32-700 Bochnia. ' +
  '1. Przedmiotem przetargu była sprzedaż niezabudowanej nieruchomości gruntowej, położonej w Bochni przy ul. Smyków, obręb Bochnia-2, oznaczonej w ewidencji gruntów i budynków jako działka nr 1258/42 o pow. 0,1059 ha, obj. KW Nr TR1O/00111894/6. ' +
  '2. Cena wywoławcza nieruchomości: 188 000,00 zł netto (sto osiemdziesiąt osiem tysięcy złotych 00/100) + 23% podatku VAT. ' +
  '3. Do przetargu dopuszczono 2 oferentów. ' +
  '4. Wylicytowana cena ww. nieruchomości wyniosła 189 900,00 zł netto. Podatek VAT w wysokości 23% wynosi 43 677,00 zł. Łączna cena sprzedaży ustalona została na kwotę 233 577,00 zł brutto. ' +
  '5. Nabywcą nieruchomości zostali: Pani Katarzyna Warchoł i Pan Kamil Warchoł.';

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: flat — address (flat nr), usable area, price, auction date (not prior round / office), round', () => {
  const rec = parseAnnouncement(ANN_MUROWIANKA_TITLE, ANN_MUROWIANKA_BODY, 'https://bochnia.eu/ii-przetarg-...-murowianka-1/');
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Murowianka 1/1'); // NOT ul. Kazimierza Wielkiego (office)
  assert.equal(rec.address.street, 'Murowianka');
  assert.equal(rec.area_m2, 43.89);
  assert.equal(rec.starting_price_pln, 136800);
  assert.equal(rec.auction_date, '2024-01-12'); // "odbędzie się", not the prior "20.10.2023"
  assert.equal(rec.round, 2);
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: flat UNSOLD (negative) — address, usable area (not piwnica), starting price, no final price', () => {
  const [rec] = parseResultDoc(RES_FLORIS_TEXT, null, 'https://bochnia.eu/wyniki-ii-przetargu-...-floris-3/');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Floris 3/2');
  assert.equal(rec.area_m2, 44.84); // pow. użytkowej, not the 3,15 m² piwnica
  assert.equal(rec.starting_price_pln, 180000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.auction_date, '2024-06-24'); // "z dnia 24 czerwca 2024", not the 2004 legal ref
  assert.equal(rec.round, 2);
  assert.deepEqual(rec.notes, []); // negative outcome is explicit → no parse warnings
});

test('parseResultDoc: land SOLD — parcel, obręb, ha→m², starting + achieved price, buyer, date, street (not office)', () => {
  const [rec] = parseResultDoc(RES_SMYKOW_TEXT, null, 'https://bochnia.eu/informacja-o-wyniku-i-przetargu-...-smykow-2/');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1258/42');
  assert.equal(rec.obreb, 'Bochnia-2');
  assert.equal(rec.area_m2, 1059); // 0,1059 ha
  assert.equal(rec.address_raw, 'ul. Smyków'); // NOT ul. Kazimierza Wielkiego (office)
  assert.equal(rec.starting_price_pln, 188000);
  assert.equal(rec.final_price_pln, 189900); // Wylicytowana cena … wyniosła
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2026-04-13');
  assert.equal(rec.round, 1);
});
