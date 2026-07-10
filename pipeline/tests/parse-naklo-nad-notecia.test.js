// Nakło nad Notecią parser tests. Fixtures are faithful copies of REAL XML
// field values + REAL extracted result-attachment text, fetched live from
// bip.gmina-naklo.pl (verified 2026-07-10). The WYNIK fixtures were captured
// by running the actual core pdfText/docText extractors against the live
// attachment URLs (not paraphrased), so the parsers are groundtruthed against
// production data exactly like parse-chelmno.test.js.
//
//   record 7659  ul. gen. H. Dąbrowskiego 29/15 — PENDING, round III (Trzeci),
//                80 945 zł, przetarg 31.07.2026 (dates/price cross-checked
//                against the spike file)
//   record 7213  ul. gen. H. Dąbrowskiego 44/6  — UNSOLD (wynikiem
//                negatywnym), round I (Pierwszy), 115 625 zł — WYNIK is a
//                .docx (content-type verified: OOXML wordprocessingml)
//   record 7418  ul. Działkowa 8/29, Potulice   — SOLD via II rokowania,
//                176 738 zł wywoławcza → 177 000 zł achieved (rokowania
//                phrasing: "w wysokości X zł", NOT Chełmno's "za cenę X zł")
//                — WYNIK is a text PDF
//   record 1570  Działki 1554/5 i in., obręb Paterek — LAND, SOLD via plain
//                przetarg/licytacja, 2 302 240 zł wywoławcza → 2 326 240 zł
//                achieved (plain-przetarg phrasing: "za cenę X złotych",
//                space-thousands + spelled-out "złotych")
//   record 4401  dz. ewid. nr 317, Lubaszcz — NAJEM (lease) of a garage,
//                "800,00 zł/brutto/rocznie" → skipped, never reaches parse
//   record 7789  dz. ewid. nr 2564/17, ul. Młyńska — LAND, PENDING (przetarg
//                03.09.2026)
//
// Nakło's <tresc> is always empty (verified across every record fetched) —
// the free-text body lives entirely in <przetarg-na>, which opens DIRECTLY
// with the round ordinal (no "ogłasza" preamble, no prior-round-history trap
// like Chełmno's tresc) and does NOT restate "Cena wywoławcza wynosi" inline
// — starting price comes from the structured cena-wywolawcza field instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  hasResolution,
  isLease,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  parsePLN,
} from '../src/cities/naklo-nad-notecia/parse.js';
import { parseBoardPage, resultAttachmentUrl } from '../src/cities/naklo-nad-notecia/crawl.js';

// --------------------------------------------------------------- real fixtures

const DABROWSKIEGO_29_15_PENDING = {
  adres: 'ul. gen. H. Dąbrowskiego 29/15, Nakło nad Notecią',
  rodzaj: 'Lokal mieszkalny',
  cena: '80.945,00 zł',
  data: '31                        .07                        .2026  godz. 10:00',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'Trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 15 położonego przy ulicy Gen. H. Dąbrowskiego 29 w Nakle nad Notecią wraz z udziałem we własności nieruchomości wspólnej wynoszącym 33/1000. Lokal mieszkalny o powierzchni użytkowej 32,58 m2 składa się z dwóch pokoi 10,89 m2 i 3,42 m2; kuchni 8,71 m2; łazienki 2,04 m2; WC 0,78 m2; przedpokoju 2,33 m2 i pomieszczenia gospodarczego 4,41 m2 z przynależną piwnicą o powierzchni 0,80 m2, znajduje się na trzecim piętrze (4 kondygnacji) budynku oficyny. Lokal poddaszowy o wysokości w części poniżej 2,20 m. Wyposażony jest w instalację elektryczną, wodno-kanalizacyjną; ogrzewanie: piec kaflowy.',
  tresc: '',
  // no `wynik` — still pending, no result attachment exists yet
};

const DABROWSKIEGO_44_6_UNSOLD = {
  adres: 'ul. gen. H. Dąbrowskiego 44/6, Nakło nad Notecią',
  rodzaj: 'Lokal mieszkalny',
  cena: '115.625,00 zł',
  data: '17                        .03                        .2026  godz. 09:00',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 6 położonego przy ulicy gen. H. Dąbrowskiego 44 w Nakle nad Notecią wraz z udziałem we własności nieruchomości wspólnej wynoszącym 120/1000. Lokal mieszkalny o pow. użytkowej 34,06 m2, składa się z jednego pokoju 20,27 m2, kuchni 6,65 m2, łazienki 7,14 m2, do lokalu przynależy pomieszczenie gospodarcze 9,35 m2 zlokalizowane w budynku gospodarczym położonym na tej samej działce.Lokal znajduje się na pierwszym piętrze-poddasze budynku mieszkalnego (2 kondygnacji). Wyposażony jest w instalację elektryczną, wodno-kanalizacyjną, gaz, ogrzewanie: było etażowe (wymontowany piec i grzejniki); posadzki: płyty wiórowe, płytki ceramiczne, okna PCV; stolarka: drzwi wewnętrznych brak. Lokal jest wolny od obciążeń i zobowiązań.',
  tresc: '',
  // real .docx text, extracted live via core/doc-text.js from
  // attachments/download/15054 ("Informacja o przetargu Dąbrowskiego 44-6.docx")
  wynik:
    'Nakło nad Notecią, dnia 24 marca 2026 roku\n\nINFORMACJA\n\nz planowanego przeprowadzonego pierwszego przetargu ustnego nieograniczonego                     na sprzedaż lokalu mieszkalnego nr 6 zlokalizowanego na pierwszym piętrze budynku mieszkalnego przy ul. gen. H. Dąbrowskiego 44 w Nakle nad Notecią, składającego                                    się z jednego pokoju, kuchni i w.c. o łącznej pow. użytkowej 34,06 m² do lokalu przynależy pomieszczenie gospodarcze o pow. 9,35 m² wraz z udziałem wynoszącym 120/1000                                we własności działki i w częściach wspólnych nieruchomości oznaczonej numerem ewidencyjnym 2198, o pow. 0,0827 ha uregulowanej w księdze wieczystej                                                    nr BY1N/00008217/9 prowadzonej przez Sąd Rejonowy w Nakle nad Notecią IV Wydział Ksiąg Wieczystych.\n W dniu 17 marca 2026 roku planowano przeprowadzić pierwszy przetarg ustny nieograniczony na sprzedaż wyżej wymienionego lokalu mieszkalnego. Komisja przetargowa powołana Zarządzeniem Nr 47/2026 Burmistrza Miasta i Gminy Nakło nad Notecią                                z dnia 13 marca 2026 r., stwierdziła, że nie zostało wpłacone w określonej wysokości                           i terminie wadium na kupno opisanego wyżej lokalu mieszkalnego, a więc przetarg zakończył                           się wynikiem negatywnym. \nWobec powyższego Komisja przetargowa wnioskowała o przeznaczenie przedmiotowej nieruchomości do sprzedaży w drodze II przetargu ustnego nieograniczonego.',
};

const DZIALKOWA_8_29_SOLD_ROKOWANIA = {
  adres: 'ul. Działkowa 8/29, Potulice',
  rodzaj: 'Lokal mieszkalny',
  cena: '176.738,00 zł',
  data: '15                        .04                        .2026  godz. 10:00',
  typ: 'Rokowania',
  przetargNa:
    'Drugie rokowania po pierwszych rokowaniach zakończonych wynikiem negatywnym na sprzedaż lokalu mieszkalnego nr 29 położonego w miejscowości Potulice przy ul. Działkowej 8 wraz z udziałem we własności wspólnej wynoszącym 327/10000. Lokal mieszkalny o powierzchni użytkowej 67,80 m2, składa się z dwóch pokoi 29,65 m2 i 11,34 m2, kuchni 12,82 m2, łazienki 3,63 m2, WC 1,30 m2 i przedpokoju 9,06 m2; z przynależną piwnicą o powierzchni 3,70 m2, znajduje się na drugim piętrze budynku. Nie posiada balkonu. Wyposażony jest w instalację elektryczną, wodno-kanalizacyjną, ogrzewanie: CO z lokalnej kotłowni, grzejniki konwektorowe; posadzki: wykładzina podłogowa, płytki ceramiczne, okna z PCV.Lokal posiada świadectwa charakterystyki energetycznej. Lokal wolny jest od obciążeń i zobowiązań.',
  tresc: '',
  // real text PDF, extracted live via core/pdf-text.js from
  // attachments/download/15285 ("Informacja o wyniku rokowań")
  wynik:
    'Nakło nad Notecią, dnia 22 kwietnia 2026 roku\n\n\n\n\n                                      Informacja\n                               o wyniku drugich rokowań\n\n\n       Burmistrz Miasta i Gminy Nakło nad Notecią na podstawie art. 39 ust. 2 ustawy\nz dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami (Dz. U. z 2026 r. poz. 399)\noraz § 25 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie\nsposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości\n(Dz. U. z 2021 r. poz. 2213), informuje, że w dniu 15 kwietnia 2026 r. w Urzędzie Miasta\ni Gminy w Nakle nad Notecią przeprowadzone zostały II rokowania, na sprzedaż lokalu\nmieszkalnego nr 29 zlokalizowanego na drugim piętrze budynku mieszkalnego\nprzy ul. Działkowej 8 w Potulicach, składającego się z dwóch pokoi, kuchni łazienki, WC\noraz przedpokoju o łącznej pow. użytkowej 67,80 m² z przynależną piwnicą o pow. 3,70 m²\nwraz z udziałem wynoszącym 327/10000 we własności działki i w częściach wspólnych\nnieruchomości oznaczonej numerem ewidencyjnym 13/56 o pow. 0,3621 ha uregulowanej\nw Księdze Wieczystej nr BY1N/00019912/1 prowadzonej przez Sąd Rejonowy w Nakle\nnad Notecią IV Wydział Ksiąg Wieczystych.\n\nDo rokowań przystąpił 1 oferent.\nOsób niedopuszczonych do uczestnictwa w przetargu nie było.\nCena wywoławcza nieruchomości – 176.738,00 zł.\nW wyniku przeprowadzonych rokowań nabywcą nieruchomości została: Wiktoria Sobiech\nktóra zaproponowała cenę nabycia przedmiotowej nieruchomości w wysokości 177.000,00 zł.\n\n\n\n\n                                                                  Z up. Burmistrza\n                                                                 mgr Angelika Szachta\n                                                                   Dyrektor Wydziału',
};

const PATEREK_LAND_SOLD = {
  adres:
    'Działki nr 1554/5, nr 1554/16, nr 1554/17, nr 1554/6, nr 98/22, nr 98/20, nr 98/11 położone w obrębie Paterek przy ulicy Nadnotecki Park Przemysłowy',
  rodzaj: 'Nieruchomość niezabudowana',
  cena: '2 302 240,00 zł brutto',
  data: '26                        .11                        .2021  godz. 10:00',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'Z zasobu nieruchomości, stanowiących własność Gminy Nakło nad Notecią przeznacza się do sprzedaży niezabudowane nieruchomości gruntowe, położone w obrębie Paterek, przy ulicy Nadnotecki Park Przemysłowy, oznaczone w ewidencji gruntów jako działki nr: 1554/5 o pow. 0,3501 ha, 1554/16 o pow. 0,6500 ha, dla których Sąd Rejonowy w Nakle nad Notecią - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą KW nr BY1N/00033048/7; 1554/17 o pow. 2,3354 ha, dla której Sąd Rejonowy w Nakle nad Notecią- IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą Kw nr BY1N/00014776/0; 1554/6 o pow. 1,0003 ha, dla której Sąd Rejonowy w Nakle nad Notecią - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą nr Kw nr BY1N/00032540/9; 98/22 o pow. 0,5381 ha, 98/20 o pow. 0,0071 ha i 98/11 o pow. 0,0356 ha, dla których Sąd Rejonowy w Nakle nad Notecią - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą Kw nr BY1N/00013360/4. Przetarg obejmuje przedmiotowe nieruchomości jako jeden kompleks.',
  tresc: '',
  // real text PDF, extracted live via core/pdf-text.js from
  // attachments/download/3411 ("Informacja o wyniku przetargu")
  wynik:
    'Nakło nad Notecią, dnia 6 grudnia 2021 roku Informacja o wyniku przetargu ustnego nieograniczonego Burmistrz Miasta i Gminy Nakło nad Notecią stosownie do § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2014 r. poz. 1490) informuje, że w dniu 26 listopada 2021 r. w Urzędzie Miasta i Gminy w Nakle nad Notecią przeprowadzony został pierwszy przetarg ustny nieograniczony, na sprzedaż niezabudowanych nieruchomości gruntowych, oznaczonych w ewidencji gruntów jako działki nr: - 1554/5 o pow. 0,3501 ha, 1554/16 o pow. 0,6500 ha, dla których Sąd Rejonowy w Nakle nad Notecią - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą Kw nr BY1N/00033048/7 - 1554/17 o pow. 2,3354 ha, dla której Sąd Rejonowy w Nakle nad Notecią - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą Kw nr BY1N/00014776/0 - 1554/6 o pow. 1,0003 ha, dla której Sąd Rejonowy w Nakle nad Notecią - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą Kw nr BY1N/00032540/9 - 98/22 o pow. 0,5381 ha , 98/20 o pow. 0,0071 ha i 98/11 o pow. 0,0356 ha, dla których Sąd Rejonowy w Nakle nad Notecią - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą Kw nr BY1N/00013360/4. Do przetargu przystąpił 1 oferent. Osób niedopuszczonych do uczestnictwa w przetargu nie było. Cena wywoławcza nieruchomości – 2 302 240,00 złotych. W wyniku licytacji nabywcą nieruchomości został: Przedsiębiorstwo Handlowo-Produkcyjne Eksport-Import Włodzimierz Kawczyński, za cenę 2 326 240,00 złotych.',
};

const MLYNSKA_LAND_PENDING = {
  adres: 'dz. ewid. nr 2564/17, ul. Młyńska, Nakło nad Notecią',
  rodzaj: 'Nieruchomość niezabudowana',
  cena: '731.800,00 zł brutto',
  data: '03                                .09                                .2026  godz. 09:00',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej położonej w obrębie Nakło nad Notecią, przy ulicy Młyńskiej, oznaczonej w ewidencji gruntów jako działka nr 2564/17, o powierzchni 0,7683 ha, dla której Sąd Rejonowy - IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą KW BY1N/00011241/0. Zgodnie z ustaleniami MPZP oraz ustaleniami Studium uwarunkowań i kierunków zagospodarowania przestrzennego miasta i gminy Nakło nad Notecią część nieruchomości znajduje się w jednostce o symbolu B 8 UR, S: prawo zabudowy usług rzemieślniczych, składów, magazynów, drobnych zakładów produkcyjnych oraz w studium: strefie A - strefie miejskiej wielofunkcyjnego i intensywnego rozwoju, w podstrefie 5 wielofunkcyjnej dalszego rozwoju. Działka posiada dostęp do sieci energetycznej, wodno-kanalizacyjnej. W sąsiedztwie znajduje się zabudowa przemysłowa, tory kolejowe. Teren płaski, zakrzaczony. Działka posiada dostęp do drogi publicznej.',
  tresc: '',
};

const LUBASZCZ_GARAGE_LEASE = {
  adres: 'dz. ewid. nr 317, Lubaszcz',
  rodzaj: 'Nieruchomość zabudowana',
  cena: '800,00 zł/brutto/rocznie',
  data: '26                        .02                        .2024  godz. 09:00',
  typ: 'Przetarg ustny nieograniczony',
  przetargNa:
    'Pierwszy przetarg ustny nieograniczony na najem w m. Lubaszcz garażu zlokalizowanego na działce nr 317 o powierzchni 0,0034 ha, dla której Sąd Rejonowy w Nakle nad Notecią IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą BY1N/00011958/9 - część działki, na której zlokalizowany jest murowany garaż o powierzchni 19,00 m2. Okres dzierżawy 3 lata',
  tresc: '',
};

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, space-thousands, grosze tail', () => {
  assert.equal(parsePLN('80.945,00'), 80945);
  assert.equal(parsePLN('176.738,00'), 176738);
  assert.equal(parsePLN('2 302 240,00'), 2302240);
  assert.equal(parsePLN('2 326 240,00'), 2326240);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: ordinal anchored at the START of przetarg-na (no "ogłasza" preamble)', () => {
  assert.equal(roundFromText(buildRecordText(DABROWSKIEGO_29_15_PENDING)), 3); // Trzeci
  assert.equal(roundFromText(buildRecordText(DABROWSKIEGO_44_6_UNSOLD)), 1); // Pierwszy
  assert.equal(roundFromText(buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA)), 2); // Drugie rokowania
  assert.equal(roundFromText(buildRecordText(MLYNSKA_LAND_PENDING)), 1); // Pierwszy
});

test('auctionDateFromText: the spaced-dot data-przetargu field, cross-checked against the spike', () => {
  // spike: "Dąbrowskiego 29/15 ... przetarg 31.07.2026"
  assert.equal(auctionDateFromText(buildRecordText(DABROWSKIEGO_29_15_PENDING)), '2026-07-31');
  assert.equal(auctionDateFromText(buildRecordText(DABROWSKIEGO_44_6_UNSOLD)), '2026-03-17');
  // spike: "Działkowa 8/29, Potulice — rokowania, 176 738 zł, 15.04.2026"
  assert.equal(auctionDateFromText(buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA)), '2026-04-15');
  assert.equal(auctionDateFromText(buildRecordText(PATEREK_LAND_SOLD)), '2021-11-26');
});

test('startingPriceFromText: from the structured cena-wywolawcza field', () => {
  // spike: "Dąbrowskiego 29/15 ... cena wywoławcza 80 945 zł"
  assert.equal(startingPriceFromText(buildRecordText(DABROWSKIEGO_29_15_PENDING)), 80945);
  assert.equal(startingPriceFromText(buildRecordText(DABROWSKIEGO_44_6_UNSOLD)), 115625);
  assert.equal(startingPriceFromText(buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA)), 176738);
  assert.equal(startingPriceFromText(buildRecordText(PATEREK_LAND_SOLD)), 2302240);
  assert.equal(startingPriceFromText(buildRecordText(MLYNSKA_LAND_PENDING)), 731800);
});

test('achievedPriceFromText: two phrasings — plain-przetarg "za cenę X złotych" and rokowania "w wysokości X zł"', () => {
  // rokowania phrasing: "... zaproponowała cenę nabycia ... w wysokości 177.000,00 zł."
  assert.equal(achievedPriceFromText(buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA)), 177000);
  // plain-przetarg phrasing: "... za cenę 2 326 240,00 złotych."
  assert.equal(achievedPriceFromText(buildRecordText(PATEREK_LAND_SOLD)), 2326240);
  // unsold: no buyer named ⇒ no achieved price
  assert.equal(achievedPriceFromText(buildRecordText(DABROWSKIEGO_44_6_UNSOLD)), null);
});

test('unitAreaFromText: usable area from przetarg-na, not the room breakdown', () => {
  assert.equal(unitAreaFromText(buildRecordText(DABROWSKIEGO_29_15_PENDING)), 32.58);
  assert.equal(unitAreaFromText(buildRecordText(DABROWSKIEGO_44_6_UNSOLD)), 34.06);
  assert.equal(unitAreaFromText(buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA)), 67.80);
});

test('gates: hasResolution, isLease, isNegativeOutcome', () => {
  assert.equal(hasResolution(buildRecordText(DABROWSKIEGO_29_15_PENDING)), false);
  assert.equal(hasResolution(buildRecordText(DABROWSKIEGO_44_6_UNSOLD)), true);
  assert.equal(hasResolution(buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA)), true);
  assert.equal(isLease(buildRecordText(LUBASZCZ_GARAGE_LEASE)), true);
  assert.equal(isLease(buildRecordText(DABROWSKIEGO_29_15_PENDING)), false);
  assert.equal(isNegativeOutcome(buildRecordText(DABROWSKIEGO_44_6_UNSOLD)), true);
  assert.equal(isNegativeOutcome(buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA)), false);
});

// ------------------------------------------------------------- active listings

test('parseAnnouncement: PENDING flat (real fixture, Dąbrowskiego 29/15) → active listing', () => {
  const rec = parseAnnouncement(buildRecordText(DABROWSKIEGO_29_15_PENDING));
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'gen h dabrowskiego|29|15');
  assert.equal(rec.address.street, 'gen. H. Dąbrowskiego');
  assert.equal(rec.address.building, '29');
  assert.equal(rec.address.apt, '15');
  assert.equal(rec.area_m2, 32.58);
  assert.equal(rec.starting_price_pln, 80945);
  assert.equal(rec.auction_date, '2026-07-31');
  assert.equal(rec.round, 3);
});

test('parseAnnouncement: land (niezabudowana, real fixture Młyńska) → kind grunt with parcel', () => {
  const rec = parseAnnouncement(buildRecordText(MLYNSKA_LAND_PENDING));
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '2564/17');
  assert.equal(rec.area_m2, 7683);
  assert.equal(rec.starting_price_pln, 731800);
  assert.equal(rec.auction_date, '2026-09-03');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: lease (najem, Lubaszcz garage) never reaches an active listing', () => {
  // crawl.js's isLease() gate skips these before parseAnnouncement is ever
  // called on them — asserted directly against the real fixture here.
  assert.equal(isLease(buildRecordText(LUBASZCZ_GARAGE_LEASE)), true);
});

// ----------------------------------------------------------------- result records

test('parseResultDoc: Dąbrowskiego 44/6 UNSOLD (round I, wynikiem negatywnym)', () => {
  const [r] = parseResultDoc(
    buildRecordText(DABROWSKIEGO_44_6_UNSOLD),
    '2026-03-17',
    'https://bip.gmina-naklo.pl/przetarg-nieruchomosci/7213/ul-gen-h-dabrowskiego',
  );
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'gen h dabrowskiego|44|6');
  assert.equal(r.area_m2, 34.06);
  assert.equal(r.starting_price_pln, 115625);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-03-17');
});

test('parseResultDoc: Działkowa 8/29 SOLD via II rokowania (176 738 → 177 000 zł)', () => {
  const [r] = parseResultDoc(
    buildRecordText(DZIALKOWA_8_29_SOLD_ROKOWANIA),
    '2026-04-15',
    'https://bip.gmina-naklo.pl/przetarg-nieruchomosci/7418/ul-dzialkowa-8-29-potulice',
  );
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'dzialkowa|8|29');
  assert.equal(r.area_m2, 67.80);
  assert.equal(r.starting_price_pln, 176738);
  assert.equal(r.final_price_pln, 177000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-04-15');
});

test('parseResultDoc: Paterek land SOLD via plain przetarg/licytacja (2 302 240 → 2 326 240 zł)', () => {
  const [r] = parseResultDoc(buildRecordText(PATEREK_LAND_SOLD), '2021-11-26', 'https://bip.gmina-naklo.pl/x');
  assert.equal(r.kind, 'grunt');
  assert.ok(r.dzialka_nr.includes('1554/5'), `dzialka_nr=${r.dzialka_nr}`);
  assert.equal(r.starting_price_pln, 2302240);
  assert.equal(r.final_price_pln, 2326240);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2021-11-26');
});

test('parseResultDoc: returns [] for a pending (no result attachment) record', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(DABROWSKIEGO_29_15_PENDING), null, 'x'), []);
});

// ----------------------------------------------------------- board + attachment XML

test('parseBoardPage: extracts record ids + urls from real board XML shape', () => {
  const xml = `
    <artykul><url>https://bip.gmina-naklo.pl/przetarg-nieruchomosci/7659/ul-gen-h-dabrowskiego-29-15-naklo-nad-notecia</url></artykul>
    <artykul><url>https://bip.gmina-naklo.pl/przetarg-nieruchomosci/7418/ul-dzialkowa-8-29-potulice</url></artykul>
    <artykul><url>https://bip.gmina-naklo.pl/przetarg-nieruchomosci/7659/dup</url></artykul>`;
  const refs = parseBoardPage(xml);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].id, '7659');
  assert.equal(refs[1].id, '7418');
});

test('resultAttachmentUrl: picks the "Informacja o wyniku ..." attachment, ignores others', () => {
  // shape mirrors record 7213's real <zalaczniki> (2 non-result + 1 result)
  const xml = `
    <zalacznik><url>https://bip.gmina-naklo.pl/attachments/download/14659</url><nazwa>Ogłoszenie Burmistrza Miasta i Gminy Nakło nad Notecią, z dnia 7 stycznia 2026 r.</nazwa></zalacznik>
    <zalacznik><url>https://bip.gmina-naklo.pl/attachments/download/14660</url><nazwa>Regulamin i Warunki Pierwszego przetargu ustnego nieograniczonego</nazwa></zalacznik>
    <zalacznik><url>https://bip.gmina-naklo.pl/attachments/download/15054</url><nazwa>Informacja o wyniku przetargu</nazwa></zalacznik>`;
  assert.equal(resultAttachmentUrl(xml), 'https://bip.gmina-naklo.pl/attachments/download/15054');
});

test('resultAttachmentUrl: returns null when no result attachment exists yet (still pending)', () => {
  // shape mirrors record 7659's real <zalaczniki> (announcement + regulamin only)
  const xml = `
    <zalacznik><url>https://bip.gmina-naklo.pl/attachments/download/15509</url><nazwa>Ogłoszenie Burmistrza Miasta i Gminy Nakło nad Notecią, z dnia 11 maja 2026 r.</nazwa></zalacznik>
    <zalacznik><url>https://bip.gmina-naklo.pl/attachments/download/15510</url><nazwa>Regulamin i Warunki Trzeciego Przetragu Nieograniczonego</nazwa></zalacznik>`;
  assert.equal(resultAttachmentUrl(xml), null);
});
