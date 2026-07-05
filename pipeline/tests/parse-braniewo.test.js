// Braniewo parser tests. Fixtures are condensed-but-faithful copies of the REAL
// `pdftotext -layout` output of live BIP attachments (verified live 2026-07-05):
//   flat announcement (round I) — article 2833 / attachment 4802 (Krasickiego 12/3);
//   result UNSOLD (round I)     — article 2930 / attachment 5023 ("– BRAK");
//   result SOLD (round II)      — article 2795 / attachment 4729 (Plac Wolności 18/8);
//   result SOLD (round III)     — article 2760 / attachment 4681 (Hozjusza 5/9,
//                                 spółdzielcze własnościowe prawo do lokalu).
// The join key the first real refresh must confirm: the Krasickiego announcement
// and its result both key on `krasickiego|12|3` (round distinguishes attempts),
// so build-properties folds them into one property's history.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
  isResultNotice,
  isApplicationForm,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  tablePriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/braniewo/parse.js';

// ---- real extracted-text fixtures (faithful excerpts) ---------------------

const ANN_FLAT = `
                                       OGŁOSZENIE BURMISTRZA MIASTA BRANIEWA
                                                      z dnia 20 kwietnia 2026 r.
                                                               Burmistrz Miasta Braniewa ogłasza
                                                         PIERWSZY PRZETARG USTNY NIEOGRANICZONY
Na sprzedaż lokalu mieszkalnego stanowiącego własność Gminy Miasta Braniewa

Położenie                Powierzchnia  Nr KW            Powierzchnia      Cena                    Wadium (zł) Przeznaczenie
nieruchomości            użytkowa      Nr obrębu        działki           wywoławcza

ul. Krasickiego 12 m. 3  Lokal 48,73   EL1B/00010738/5                    170 000,00              25 000,00  Lokal mieszkalny
                                       6
                                       169/3            0,0410
                                                        30/100
I. INFORMACJE DOTYCZĄCE PRZEDMIOTU PRZETARGU
Sprzedaż lokalu mieszkalnego nr 3 położonego przy ul. Krasickiego 12, składającego się z dwóch pokoi, kuchni, łazienki, wc i przedpokoju
o powierzchni użytkowej 48,73 m² znajdujący się na drugim piętrze.
II. WARUNKI UDZIAŁU W PRZETARGU
    1. Przetarg odbędzie się dnia 12.06.2026 roku o godz. 10ºº w Urzędzie Miasta Braniewa (pokój nr 27).
`;

const ANN_FORM = `
                                  ZGŁOSZENIE UDZIAŁU W PRZETARGU
Ja, ……………………………………………………… numer PESEL …………………………………..
                         (imię i nazwisko)
zamieszkały(a) / adres do korespondencji:
`;

const RES_UNSOLD = `
                                                                                     Braniewo, dnia 19.06.2026 r.
Na podstawie §12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu
i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości podaję do publicznej wiadomości:
                                                     Informację
o wyniku PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO na sprzedaż lokalu
mieszkalnego nr 3 stanowiącego własność Gminy Miasta Braniewa położonego
ul. Krasickiego 12.
który odbył się w dniu 12.06.2026 r.
w Urzędzie Miasta Braniewa
Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3 o powierzchni użytkowej
48,73 m² położony w Braniewie, przy ul. Krasickiego 12, w obrębie nr 6, działka o numerze
ewidencyjnym 169/3, księga wieczysta lokalu EL1B/00010738/5
 cena wywoławcza 170 000,00 zł, wadium 25 000,00 zł
                          najwyższa cena osiągnięta w przetargu - BRAK
                          nabywca nieruchomości - BRAK
`;

const RES_SOLD_PW = `
                                                                                     Braniewo, dnia 12.03.2026 r.
Na podstawie §12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. podaję do publicznej wiadomości:
                                                     Informację
o wyniku DRUGIEGO PRZETARGU USTNEGO OGRANICZONEGO
na sprzedaż lokalu nr 8, który nie spełnia wymagań samodzielnego lokalu mieszkalnego
położonego przy ul. Plac Wolności 18 stanowiącego własność Gminy Miasta Braniewa
który odbył się w dniu 04.03.2026 r.
w Urzędzie Miasta Braniewa
Przetarg ustny ograniczony na sprzedaż lokalu nr 8, który nie spełnia wymagań samodzielnego
lokalu mieszkalnego o powierzchni użytkowej 16,25 m², przeznaczonego na cele mieszkalne,
położony w Braniewie przy ul. Plac Wolności 18, w obrębie nr 4, udział 4/100 w działce o numerze
ewidencyjnym 202/9, księga wieczysta EL1B/00015928/9
cena wywoławcza 18 000,00 zł, wadium 2 700,00 zł
                     najwyższa cena osiągnięta w przetargu – 18 190,00 zł
                     nabywca nieruchomości – Arkadiusz Matwiejczuk zam. Braniewo
`;

const RES_SOLD_HZ = `
                                                                                     Braniewo, dnia 02.03.2026 r.
Na podstawie §12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. podaję do publicznej wiadomości:
                                                     Informację
o wyniku TRZECIEGO PRZETARGU USTNEGO NIEOGRANICZONEGO
na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 9 stanowiącego
własność Gminy Miasta Braniewa położonego ul. Hozjusza 5.
który odbył się w dniu 20.02.2026 r.
w Urzędzie Miasta Braniewa
Przetarg ustny nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu
mieszkalnego nr 9 o powierzchni użytkowej 46,40 m² wraz z przynależną piwnicą o powierzchni
użytkowej 3,05 m² położony w Braniewie, przy ul. Hozjusza 5, w obrębie nr 4, działka o numerze
ewidencyjnym 220, księga wieczysta lokalu EL1B/00043860/9
cena wywoławcza 138 500,00 zł, wadium 20 000,00 zł
                     najwyższa cena osiągnięta w przetargu – 192 000,00 zł
                     nabywca nieruchomości – Klaudia Steć zam. Wilczęta
`;

// ---- title routing --------------------------------------------------------

test('isSkippableTitle: rentals, wykazy, qualified-person lists', () => {
  assert.equal(isSkippableTitle('Lista zakwalifikowanych do uczestnictwa w przetargu ustnym ograniczonym Plac Wolności 18 m 8', ''), true);
  assert.equal(isSkippableTitle('Wykaz nieruchomości przeznaczonych do sprzedaży', ''), true);
  assert.equal(isSkippableTitle('Wynik I przetargu ustnego nieograniczonego - lokal mieszkalny nr 3 przy ul. Krasickiego 12', ''), false);
});

test('isResultTitle / isAnnouncementTitle route the two streams', () => {
  assert.equal(isResultTitle('Wynik III przetargu ustnego nieograniczonego - spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 9 ul. Hozjusza 5', ''), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na lokal mieszkalny nr 3 przy ul. Krasickiego 12', ''), true);
  assert.equal(isAnnouncementTitle('Wynik I przetargu ustnego nieograniczonego lokal nr 3', ''), true); // result title also mentions przetarg+lokal; body gate disambiguates
});

test('isApplicationForm skips the blank ZGŁOSZENIE form but not the ogłoszenie', () => {
  assert.equal(isApplicationForm(ANN_FORM), true);
  assert.equal(isApplicationForm(ANN_FLAT), false);
  assert.equal(isApplicationForm(RES_SOLD_PW), false);
});

test('isResultNotice: body header is authoritative', () => {
  assert.equal(isResultNotice(RES_UNSOLD), true);
  assert.equal(isResultNotice(RES_SOLD_HZ), true);
  assert.equal(isResultNotice(ANN_FLAT), false);
});

// ---- field extraction -----------------------------------------------------

test('roundFromText: word ordinals, nominative (announcement) + genitive (result)', () => {
  assert.equal(roundFromText(ANN_FLAT), 1); // "PIERWSZY PRZETARG"
  assert.equal(roundFromText(RES_UNSOLD), 1); // "PIERWSZEGO PRZETARGU"
  assert.equal(roundFromText(RES_SOLD_PW), 2); // "DRUGIEGO PRZETARGU"
  assert.equal(roundFromText(RES_SOLD_HZ), 3); // "TRZECIEGO PRZETARGU"
});

test('dates: announcement "odbędzie się dnia" vs result "odbył się w dniu"', () => {
  assert.equal(auctionDateFromText(ANN_FLAT), '2026-06-12');
  assert.equal(resultDateFromText(RES_UNSOLD), '2026-06-12');
  assert.equal(resultDateFromText(RES_SOLD_PW), '2026-03-04');
  assert.equal(resultDateFromText(RES_SOLD_HZ), '2026-02-20');
});

test('unitAreaFromText: flat area, first match (cellar excluded)', () => {
  assert.equal(unitAreaFromText(ANN_FLAT), 48.73);
  assert.equal(unitAreaFromText(RES_SOLD_PW), 16.25);
  assert.equal(unitAreaFromText(RES_SOLD_HZ), 46.4); // not the 3,05 m² piwnica
});

test('prices: prose cena wywoławcza, table cena wywoławcza, achieved / BRAK', () => {
  assert.equal(startingPriceFromText(RES_SOLD_PW), 18000);
  assert.equal(startingPriceFromText(RES_SOLD_HZ), 138500);
  assert.equal(tablePriceFromText(ANN_FLAT), 170000); // table row; 48,73 area not mistaken for price
  assert.equal(achievedPriceFromText(RES_SOLD_PW), 18190);
  assert.equal(achievedPriceFromText(RES_SOLD_HZ), 192000);
  assert.equal(achievedPriceFromText(RES_UNSOLD), null); // "– BRAK"
});

// ---- full-record parses ---------------------------------------------------

test('parseAnnouncement: Krasickiego 12/3 flat (round I)', () => {
  const rec = parseAnnouncement(ANN_FLAT);
  assert.ok(rec, 'record parsed');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Krasickiego 12/3');
  assert.equal(rec.address.key, 'krasickiego|12|3');
  assert.equal(rec.area_m2, 48.73);
  assert.equal(rec.starting_price_pln, 170000);
  assert.equal(rec.auction_date, '2026-06-12');
  assert.equal(rec.round, 1);
});

test('parseResultDoc: Krasickiego 12/3 UNSOLD (round I, "– BRAK")', () => {
  const [rec] = parseResultDoc(RES_UNSOLD, null, 'http://bip.braniewo.pl/attachments/download/5023');
  assert.ok(rec, 'record parsed');
  assert.equal(rec.address.key, 'krasickiego|12|3');
  assert.equal(rec.area_m2, 48.73);
  assert.equal(rec.starting_price_pln, 170000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.auction_date, '2026-06-12');
  assert.equal(rec.round, 1);
  assert.equal(rec.source_pdf, 'http://bip.braniewo.pl/attachments/download/5023');
});

test('parseResultDoc: Plac Wolności 18/8 SOLD (round II)', () => {
  const [rec] = parseResultDoc(RES_SOLD_PW, null, 'x');
  assert.equal(rec.address_raw, 'ul. Plac Wolności 18/8');
  assert.equal(rec.address.key, 'plac wolnosci|18|8');
  assert.equal(rec.area_m2, 16.25);
  assert.equal(rec.starting_price_pln, 18000);
  assert.equal(rec.final_price_pln, 18190);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2026-03-04');
  assert.equal(rec.round, 2);
});

test('parseResultDoc: Hozjusza 5/9 SOLD (round III, spółdzielcze wł. prawo)', () => {
  const [rec] = parseResultDoc(RES_SOLD_HZ, null, 'x');
  assert.equal(rec.address_raw, 'ul. Hozjusza 5/9');
  assert.equal(rec.address.key, 'hozjusza|5|9');
  assert.equal(rec.area_m2, 46.4);
  assert.equal(rec.starting_price_pln, 138500);
  assert.equal(rec.final_price_pln, 192000);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2026-02-20');
  assert.equal(rec.round, 3);
});
