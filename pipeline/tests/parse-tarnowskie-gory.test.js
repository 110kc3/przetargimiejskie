// Tarnowskie Góry parser tests. Fixtures are condensed-but-faithful copies of
// the REAL `pdftotext -layout` output of live articles (verified 2026-06-17):
//   flat announcement + its sold/unsold result notices — article 101179 (flat
//   Pokoju 10 nr 5), 101732 (sold, round II), 100411 (unsold, round I);
//   building announcement — article 100288 (Rymera 8, nieruchomość zabudowana);
//   land announcement — article 101322 (two parcels, obręb Bobrowniki Śląskie).
// The join key the first real refresh must confirm: the flat announcement and
// both result notices all key on `pokoju|10|5` (round distinguishes the
// attempts), so build-properties folds them into one property's history.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isResultNotice,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/tarnowskie-gory/parse.js';

// ---------------------------------------------------------------- title routing

test('isSkippableTitle: rentals, wykazy, lists, corrections, cancellations, rokowania', () => {
  assert.equal(isSkippableTitle('Burmistrz Miasta ogłasza przetarg ustny (licytację) ograniczony do branży na najem lokali użytkowych', ''), true);
  assert.equal(isSkippableTitle('Wykaz nieruchomości przeznaczonej do sprzedaży - lokal mieszkalny', ''), true);
  assert.equal(isSkippableTitle('Lista osób zakwalifikowanych do uczestnictwa w drugim przetargu', ''), true);
  assert.equal(isSkippableTitle('OGŁOSZENIE BURMISTRZA O ODWOŁANIU PRZETARGÓW NA SPRZEDAŻ', ''), true);
  assert.equal(isSkippableTitle('BURMISTRZ MIASTA ogłasza rokowania na sprzedaż nieruchomości', ''), true);
  // a real sale announcement is NOT skippable
  assert.equal(isSkippableTitle('Burmistrz Miasta Tarnowskie Góry ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego', ''), false);
});

test('isResultTitle: singular + plural "o wyniku/wynikach"', () => {
  assert.equal(isResultTitle('Informacja o wyniku drugiego przetargu ustnego nieograniczonego', ''), true);
  assert.equal(isResultTitle('INFORMACJE o wynikach pierwszych przetargów ustnych ograniczonych', ''), true);
  assert.equal(isResultTitle('Burmistrz Miasta ogłasza pierwszy przetarg na sprzedaż', ''), false);
});

test('isAnnouncementTitle: catches "ogłasza", "Ogłoszenie o", bare ordinal, zbycie, and slug-only signal', () => {
  assert.equal(isAnnouncementTitle('Burmistrz Miasta Tarnowskie Góry ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego', ''), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie o pierwszym przetargu pisemnym nieograniczonym na sprzedaż nieruchomości gruntowej', ''), true);
  assert.equal(isAnnouncementTitle('Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej', ''), true);
  assert.equal(isAnnouncementTitle('Burmistrz Miasta ogłasza I przetarg ... na zbycie lokalu mieszkalnego', ''), true);
  // letter-spaced title with the asset word truncated — the slug carries it:
  assert.equal(
    isAnnouncementTitle(
      'Burmistrz Miasta Tarnowskie Góry o g ł a s z a   II  przetarg ustny nieograniczony (licytacja)',
      'a,90710,burmistrz-miasta-tarnowskie-gory-o-g-l-a-s-z-a-przetarg-ustny-nieograniczony-licytacja-na-sprzedaz-l.html',
    ),
    true,
  );
});

// -------------------------------------------------------------- shared extractors

test('roundFromText: word ordinal qualifying "przetarg"', () => {
  assert.equal(roundFromText('ogłasza drugi przetarg ustny nieograniczony na sprzedaż'), 2);
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('o wyniku trzeciego przetargu ustnego'), 3);
  assert.equal(roundFromText('bez ordynału'), null);
});

test('auctionDateFromText: future "będzie DD miesiąc YYYY", not the prior-round line', () => {
  const body =
    'Drugi przetarg ustny nieograniczony będzie w Urzędzie Miejskim w Tarnowskich Górach przy ulicy Sienkiewicza 2, pokój numer 39, 14 kwietnia 2026 r. o godz. 13.00. Pierwszy przetarg odbył się 15 grudnia 2025 r.';
  assert.equal(auctionDateFromText(body), '2026-04-14'); // not 2025-12-15
  assert.equal(auctionDateFromText('Przetarg będzie 13 stycznia 2026 r. o godzinie 12:00'), '2026-01-13');
  assert.equal(auctionDateFromText('Przetarg będzie 21 kwietnia 2026r. o godzinie 12:00'), '2026-04-21'); // "2026r." no space
  // Regression (przetarg pisemny): the open-bids date reads "Część jawna przetargu
  // odbędzie się DD <miesiąc> YYYY". "się" ends in ę (a non-word char), so a \b
  // after the anchor never matched and silently dropped EVERY such date — the
  // anchor must be followed by \s, not \b.
  assert.equal(auctionDateFromText('Część jawna przetargu odbędzie się 9 maja 2025 r. o godzinie 13:00'), '2025-05-09');
  assert.equal(auctionDateFromText('Przetarg odbędzie się 7 kwietnia 2025 r. o godzinie 12:00'), '2025-04-07');
});

test('resultDateFromText: "DD miesiąc YYYY r.[,] [w] Urząd Miejski"', () => {
  assert.equal(resultDateFromText('14 kwietnia 2026 r. Urząd Miejski Tarnowskie Góry ul. Sienkiewicza 2, drugi przetarg'), '2026-04-14');
  assert.equal(resultDateFromText('15 kwietnia 2026 r., Urząd Miejski w Tarnowskich Górach ul. Sienkiewicza 2'), '2026-04-15'); // comma + "w"
  // the rozporządzenie citation must NOT be picked up
  assert.equal(resultDateFromText('na podstawie Rozporządzenia Rady Ministrów z dnia 14 września 2004 roku'), null);
});

// ------------------------------------------------------- flat announcement (real)

const ANN_FLAT = `                               Burmistrz Miasta Tarnowskie Góry

ogłasza drugi przetarg ustny nieograniczony na sprzedaż wyodrębnionego lokalu mieszkalnego
                  nr 5 w budynku przy ulicy Pokoju 10 w Tarnowskich Górach.

    1. Oznaczenie nieruchomości według księgi wieczystej i katastru nieruchomości:
        Nieruchomość gruntowa zabudowana jako działki o numerach ewidencyjnych nr
        5200/49, 5246/50 o łącznej powierzchni 0,5299 ha, obręb Tarnowskie Góry, arkusz
        mapy 1.

    2. Opis nieruchomości lokalowej:
        Lokal mieszkalny nr 5 o powierzchni użytkowej 37,70 m2 wraz z pomieszczeniem
        przynależnym w postaci piwnicy o powierzchni użytkowej 6,20 m2 z udziałem w
        wysokości 152/10000 w częściach wspólnych budynku przy ulicy Pokoju 10.

    3. Cena nieruchomości:
        1) cena wywoławcza za lokal mieszkalny nr 5 położony przy ulicy Pokoju 10 w
            Tarnowskich Górach wynosi 159 000,00 zł ( słownie: sto pięćdziesiąt dziewięć
            tysięcy złotych)
    4. Termin i miejsce przetargu:
        Drugi przetarg ustny nieograniczony będzie w Urzędzie Miejskim w Tarnowskich
        Górach przy ulicy Sienkiewicza 2, pokój numer 39, 14 kwietnia 2026 r. o godz. 13.00.
    Pierwszy przetarg odbył się 15 grudnia 2025 r.`;

test('parseAnnouncement: flat — address/usable area/price/date/round/kind=mieszkalny', () => {
  const r = parseAnnouncement(ANN_FLAT);
  assert.ok(r, 'a record is returned');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'pokoju|10|5'); // ← the result→announcement JOIN KEY
  assert.equal(r.address_raw, 'ul. Pokoju 10/5');
  assert.equal(r.area_m2, 37.7, 'flat usable area, NOT the 6,20 m² cellar');
  assert.equal(r.starting_price_pln, 159000); // spaced thousands "159 000,00"
  assert.equal(r.auction_date, '2026-04-14'); // future date, not the 15.12.2025 prior round
  assert.equal(r.round, 2);
  assert.equal(r.land_area_m2, undefined, 'a flat has a usable area, so no land_area_m2 fallback');
});

// --------------------------------------------------- building announcement (real)

const ANN_BUILDING = `                       Burmistrz Miasta Tarnowskie Góry
   ogłasza drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
   zabudowanej położonej w Tarnowskich Górach przy ulicy Józefa Rymera 8 i 8A oraz
                                   Staropolskiej 7A i 7B

1. Oznaczenie nieruchomości według księgi wieczystej i katastru nieruchomości:
   Nieruchomość gruntowa zabudowana stanowiąca działkę numer 98 o powierzchni
   0,0573 ha, obręb Tarnowskie Góry, użytek [B] tereny mieszkaniowe.
2. Cena nieruchomości:
   1) cena wywoławcza wynosi 389 000,00 zł (słownie: trzysta osiemdziesiąt dziewięć tysięcy złotych 00/100),
3. Termin i miejsce przetargu:
   Przetarg będzie 13 stycznia 2026 r. o godzinie 12:00 w Urzędzie Miejskim w Tarnowskich Górach.
    Pierwszy przetarg był 15 października 2025 r.`;

test('parseAnnouncement: building — kind=zabudowana, plot ha→land_area_m2 (no unit area), price/date', () => {
  const r = parseAnnouncement(ANN_BUILDING);
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'jozefa rymera|8|', 'first street+building of a multi-address building');
  assert.equal(r.area_m2, null, 'a building has no usable flat area');
  assert.equal(r.land_area_m2, 573, '0,0573 ha plot → 573 m², kept out of the zł/m² field');
  assert.equal(r.starting_price_pln, 389000);
  assert.equal(r.auction_date, '2026-01-13');
  assert.equal(r.round, 2);
});

// ------------------------------------------------------- land announcement (real)

const ANN_LAND = `                        Burmistrz Miasta Tarnowskie Góry
ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności
nieruchomości gruntowej niezabudowanej położonej w Tarnowskich Górach przy ulicy
Józefa Korola.
1. Oznaczenie nieruchomości według księgi wieczystej i katastru nieruchomości:
  1) działka numer 1118/153 o powierzchni 0,0267 ha, obręb Bobrowniki Śląskie, arkusz mapy 31,
  2) działka numer 3817/153 o powierzchni 0,0419 ha, obręb Bobrowniki Śląskie,
     stanowiące własność Gminy Tarnowskie Góry,
2. Cena wywoławcza nieruchomości:
  1) cena wywoławcza ... za przedmiotową nieruchomość wynosi 123 000,00 złotych netto,
3. Termin i miejsce przetargu:
   Przetarg będzie 21 kwietnia 2026r. o godzinie 12:00 w Urzędzie Miejskim w Tarnowskich Górach.`;

test('parseAnnouncement: land (board 5216) — kind=grunt, both parcels, summed plot area, obręb, price', () => {
  const r = parseAnnouncement(ANN_LAND, { isLandBoard: true });
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1118/153, 3817/153');
  assert.equal(r.area_m2, 686, '0,0267 + 0,0419 ha summed (no łączna line) → 686 m²');
  assert.equal(r.obreb, 'Bobrowniki Śląskie'); // two-word obręb
  assert.equal(r.address_raw, 'ul. Józefa Korola'); // street with no building number
  assert.equal(r.starting_price_pln, 123000);
  assert.equal(r.auction_date, '2026-04-21');
  assert.equal(r.round, 1);
});

// --------------------------------------------------------- result notices (real)

const RESULT_SOLD = `                                        INFORMACJA

             o wyniku drugiego przetargu ustnego nieograniczonego ( licytacji )
                              na sprzedaż wyodrębnionego
                 lokalu mieszkalnego nr 5 w budynku przy ulicy Pokoju 10
                                 w Tarnowskich Górach.

1. Data, miejsce oraz rodzaj przeprowadzonego przetargu:
   14 kwietnia 2026 r. Urząd Miejski Tarnowskie Góry ul. Sienkiewicza 2, drugi przetarg ustny
   nieograniczony.
2. Oznaczenie nieruchomości według katastru i księgi wieczystej:
   Nieruchomość gruntowa zabudowana jako działki o numerach ewidencyjnych nr 5200/49 i
   5246/50 o łącznej powierzchni 0,5299 ha, obręb Tarnowskie Góry, arkusz mapy 1.
3. Opis nieruchomości:
   Lokal mieszkalny nr 5 o powierzchni użytkowej 37,70 m2, wraz z piwnicą o powierzchni
   użytkowej 6,20 m2 przy ulicy Pokoju 10 w Tarnowskich Górach.
5. Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
   Cena wywoławcza: 176 900,00 złotych ( słownie: sto siedemdziesiąt sześć tysięcy dziewięćset złotych).
   Cena osiągnięta w przetargu: 178 000,00 złotych ( słownie: sto siedemdziesiąt osiem tysięcy złotych)
6. Nabywca nieruchomości:
   Państwo Magdalena i Remigiusz Szczepanik`;

test('parseResultDoc: SOLD — achieved price, sold flag, and the join key match the announcement', () => {
  assert.equal(isResultNotice(RESULT_SOLD), true);
  const recs = parseResultDoc(RESULT_SOLD, null, 'https://bip.tarnowskiegory.pl/e,pobierz,get.html?id=122941');
  assert.equal(recs.length, 1);
  const s = recs[0];
  assert.equal(s.address.key, 'pokoju|10|5', 'same key as ANN_FLAT — they JOIN');
  assert.equal(s.round, 2, 'same round as the announcement — the join discriminator');
  assert.equal(s.kind, 'mieszkalny');
  assert.equal(s.area_m2, 37.7);
  assert.equal(s.starting_price_pln, 176900);
  assert.equal(s.final_price_pln, 178000); // "Cena osiągnięta w przetargu"
  assert.equal(s.outcome, 'sold');
  assert.equal(s.unsold_reason, null);
  assert.equal(s.source_pdf, 'https://bip.tarnowskiegory.pl/e,pobierz,get.html?id=122941');
});

const RESULT_UNSOLD = `                                         INFORMACJA

           o wyniku pierwszego przetargu ustnego nieograniczonego ( licytacji )
           na sprzedaż lokalu mieszkalnego nr 5 w budynku przy ulicy Pokoju 10
                                 w Tarnowskich Górach.

1. Data, miejsce oraz rodzaj przeprowadzonego przetargu:
   15 grudnia 2025 r. Urząd Miejski Tarnowskie Góry ul. Sienkiewicza 2, pierwszy przetarg ustny
   nieograniczony.
3. Opis nieruchomości:
   Lokal mieszkalny nr 5 o powierzchni użytkowej 37,70 m2 przy ulicy Pokoju 10 w Tarnowskich Górach.
5. Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
   Cena wywoławcza: 176 900,00 złotych ( słownie: sto siedemdziesiąt sześć tysięcy dziewięćset złotych).
6. Nabywca nieruchomości:
   przetarg zakończył się wynikiem negatywnym z uwagi na brak uczestników przetargu.`;

test('parseResultDoc: UNSOLD — no achieved price → unsold, same property key as the sold round', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, null, 'u/100411');
  assert.equal(recs.length, 1);
  const u = recs[0];
  assert.equal(u.address.key, 'pokoju|10|5', 'same flat as the later sold round → one property, two attempts');
  assert.equal(u.round, 1);
  assert.equal(u.starting_price_pln, 176900);
  assert.equal(u.final_price_pln, null);
  assert.equal(u.outcome, 'unsold');
  assert.equal(u.auction_date, '2025-12-15');
});

test('parseResultDoc / isResultNotice: an announcement is not a result notice', () => {
  assert.equal(isResultNotice(ANN_FLAT), false);
  assert.deepEqual(parseResultDoc(ANN_FLAT, null, 'u'), []);
});
