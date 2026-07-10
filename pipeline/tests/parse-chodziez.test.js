// Chodzież parser tests. The three ANNOUNCEMENT fixtures below are
// condensed-but-faithful copies of REAL detail-page HTML fetched live from
// bip.chodziez.pl (verified 2026-07-10) — section headings/paragraphs not
// load-bearing for parsing (legal boilerplate on miejscowy plan, obciążenia,
// skutki uchylenia, informacje dodatkowe) are trimmed, but every sentence kept
// is verbatim from the live page, including its quirks:
//
//   MICKIEWICZA  ul. Adama Mickiewicza 4/3 + 4/6 — TWO flats in one notice,
//                ONE shared cena wywoławcza (340.000,00 zł), III przetarg,
//                the h1 itself has the real "ul.Adama" (no-space) typo.
//   DASZYNSKI    ul. Ignacego Daszyńskiego 12/8 — single flat, I przetarg,
//                49.000,00 zł.
//   KWIATOWA     działka nr 917/1 (land) — I przetarg, 10.500,00 zł brutto;
//                the source text itself says "5 SIERPNIA 2025 R." even though
//                this notice lives on the 2026 board (a real apparent typo in
//                the source, not a fixture error — parseDateText parses
//                exactly what the document states, so this is asserted as
//                2025-08-05, not "corrected" to 2026).
//
// The RESULT-doc fixtures (SOLD/UNSOLD) are NOT live data: wyniki-przetargow
// boards were confirmed EMPTY for 2022-2026 on 2026-07-10 (the statutory
// ~7-day posting window had already elapsed for both live 2026 rounds — see
// the spike + parse.js file header). They are constructed against the
// standard Polish municipal result-notice template, reusing this city's own
// confirmed announcement vocabulary ("Cena wywoławcza w <round> przetargu
// wynosi") plus the nationwide result vocabulary ("cena osiągnięta",
// "wynikiem negatywnym") seen across other cities' real fixtures.
// parseResultDoc is UNVERIFIED against a real chodziez result page — validate
// on first live CI refresh that catches one inside its window.
//
// The board-page fixture (BOARD_HTML) and the seven Wykazy titles are also
// real, copied verbatim from the live ogloszenia-o-przetargach.html /
// wykazy.html boards fetched 2026-07-10.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  stripTags,
  parsePLN,
  parseArea,
  parseDateText,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  baseStreetAddress,
  flatUnitsFromText,
  singleFlatUnitFromText,
  parcelFromText,
  obrebFromText,
  landStreetFromText,
  plotAreaFromText,
  parseAnnouncementPage,
  parseBoardPage,
  isWykazSaleTitle,
  parseResultDoc,
} from '../src/cities/chodziez/parse.js';

// --------------------------------------------------------------- real fixtures

const MICKIEWICZA_MULTI = `
<h1>Ogłoszenie III przetargu ustnego nieograniczonego na sprzedaż lokali mieszkalnych położonych w Chodzieży przy ul.Adama Mickiewicza 4/3 oraz 4/6</h1>
<p align="center"><strong>Burmistrz Miasta Chodzieży</strong></p>
<p class="justifyfull"><strong>ogłasza III przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych stanowiących własność Gminy Miejskiej w Chodzieży, położonych w Chodzieży przy ul. Adama Mickiewicza 4/3 oraz 4/6</strong></p>
<p class="justifyfull"><strong>1. Przedmiot sprzedaży.</strong></p>
<p class="justifyfull">Lokale mieszkalne znajdujące się na I piętrze w budynku mieszkalnym położonym w Chodzieży przy ul. Adama Mickiewicza 4, na działce oznaczonej w ewidencji gruntów jako: obręb 0001 Miasto Chodzież, działka nr 1680/3 o powierzchni 0,0253 ha, zapisanej w księdze wieczystej KW nr PO1H/00017933/7:</p>
<p class="justifyfull">a)      lokal nr 3 o pow. 65,50 m2, składający się 2 pokoi, kuchni i łazienki, z którym związany jest udział wynoszący 1/6 części w prawie własności działki nr 1680/3 i w częściach wspólnych budynku. Do lokalu przynależy 1 pomieszczenie – piwnica o powierzchni 24,54 m<sup>2</sup>. Stan techniczny lokalu – do remontu,</p>
<p class="justifyfull">b)      lokal nr 6 o pow. 67,64 m2, składający się 2 pokoi, przedpokoju, kuchni i łazienki, z którym związany jest udział wynoszący 1/6 części w prawie własności działki nr 1680/3 i w częściach wspólnych budynku. Do lokalu przynależy 1 pomieszczenie – piwnica o powierzchni 11,80 m<sup>2</sup>. Stan techniczny lokalu – do remontu.</p>
<p class="justifyfull"> 2. <strong>Terminy poprzednich przetargów: 11.02.2026 r., 29.04.2026 r.</strong></p>
<p class="justifyfull"><strong>5. Cena wywoławcza nieruchomości.</strong></p>
<p class="justifyfull"><strong>Cena wywoławcza w III przetargu wynosi 340.000,00 zł (słownie złotych: trzysta czterdzieści tysięcy 00/100).</strong> Zwolnienie z podatku VAT na podstawie art. 43 ust. 1 pkt 10.</p>
<p class="justifyfull"><strong>6. Termin i miejsce przetargu.</strong></p>
<p class="justifyfull">PRZETARG ODBĘDZIE SIĘ W DNIU 5 SIERPNIA 2026 R. W URZĘDZIE MIEJSKIM W CHODZIEŻY PRZY UL. IGNACEGO JANA PADEREWSKIEGO 2, SALA NR 305, GODZINA 10.00.</p>
<p class="justifyfull"><strong>7. Wadium.</strong></p>
<p class="justifyfull">Uczestnik przetargu zobowiązany jest do wniesienia wadium w pieniądzu w wysokości 50.000 zł.</p>
`;

const DASZYNSKI_SINGLE = `
<h1>Ogłoszenie I przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 8 położonego w Chodzieży przy ul. Ignacego Daszyńskiego 12</h1>
<p align="center"><strong>Burmistrz Miasta Chodzieży</strong></p>
<p style="text-align: center;"><strong>ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego, stanowiącego własność Gminy Miejskiej w Chodzieży, położonego w Chodzieży przy ul. Ignacego Daszyńskiego 12/8</strong></p>
<p><strong>1. Przedmiot sprzedaży.</strong></p>
<p class="justifyfull">Lokal mieszkalny oznaczony numerem 8, stanowiący własność Gminy Miejskiej w Chodzieży, zlokalizowany jest na poddaszu budynku wielorodzinnego położonego w Chodzieży przy ul. Ignacego Daszyńskiego 12, o powierzchni 21,03 m<sup>2</sup>. Z lokalem związany jest udział wynoszący 2721/36826 części w prawie własności działki gruntu oznaczonej nr 2241 o pow. 0,0364 ha. Lokal składa się z pokoju, kuchni i łazienki. Budynek przedwojenny. Lokal mieszkalny w złym stanie technicznym, do remontu.</p>
<p class="justifyfull"> <strong>4. Cena wywoławcza nieruchomości.</strong></p>
<p class="justifyfull"><strong>Cena wywoławcza w I przetargu wynosi </strong>49.000,00 zł (słownie złotych: czterdzieści dziewięć tysięcy 00/100).</p>
<p class="justifyfull"><strong>5. Termin i miejsce przetargu.</strong></p>
<p class="justifyfull">PRZETARG ODBĘDZIE SIĘ W DNIU <strong>5 SIERPNIA 2026 R</strong>. W URZĘDZIE MIEJSKIM W CHODZIEŻY PRZY UL. IGNACEGO JANA PADEREWSKIEGO 2, SALA NR 305, GODZINA 13.00.</p>
<p class="justifyfull"><strong>6. Wadium.</strong></p>
<p class="justifyfull">Uczestnik przetargu zobowiązany jest do wniesienia wadium w pieniądzu w wysokości <strong>8.000 zł</strong>.</p>
`;

const KWIATOWA_LAND = `
<h1>Ogłoszenie I przetargu ustnego nieograniczonego na sprzedaż działki nr 917/1 położonej w Chodzieży przy ul. Kwiatowej</h1>
<p align="center"><strong>Burmistrz Miasta Chodzieży</strong></p>
<p style="text-align: center;"><strong>ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Miejskiej w Chodzieży, położonej w Chodzieży przy ul. Kwiatowej, oznaczonej jako działka nr 917/1</strong></p>
<p class="justifyfull"><strong>1. Przedmiot sprzedaży.</strong></p>
<p class="justifyfull">Nieruchomość położona w Chodzieży przy ul. Kwiatowej, oznaczona w ewidencji gruntów i budynków jako: obręb 0001 Miasto Chodzież, działka nr 917/1 o pow. 0,0037 ha, zapisana w księdze wieczystej KW nr PO1H/00018842/9. Przedmiotowa nieruchomość stanowi teren zielony, jest niezabudowana i posiada kształt zbliżony do trapezu.</p>
<p class="justifyfull"><strong>4. Cena wywoławcza nieruchomości.</strong></p>
<p class="justifyfull"><strong>Cena wywoławcza w I przetargu wynosi </strong>10.500,00 zł brutto (słownie złotych: dziesięć tysięcy pięćset 00/100), w tym należny podatek VAT w wysokości 23 %.</p>
<p class="justifyfull"><strong>5. Termin i miejsce przetargu</strong></p>
<p class="justifyfull"><strong>PRZETARG ODBĘDZIE SIĘ W DNIU 5 SIERPNIA 2025 R. W URZĘDZIE MIEJSKIM W CHODZIEŻY  PRZY UL. IGNACEGO JANA PADEREWSKIEGO 2, SALA NR 305, GODZINA 11.30.</strong></p>
<p class="justifyfull"><strong>6. Wadium.</strong></p>
<p class="justifyfull">Uczestnik przetargu zobowiązany jest do wniesienia wadium w pieniądzu w wysokości 1.800 zł.</p>
`;

// Real board HTML (condensed): the live 2026 ogloszenia-o-przetargach.html
// <ul class="listastronul"> list, verbatim hrefs/titles (including the
// diacritic "nieruchomościami" path segment and the raw, non-percent-encoded
// href for the Mickiewicza notice with its embedded "4/3 oraz 4/6" slashes).
const BOARD_HTML = `
<div class="text-wrapper">
<h1>Ogłoszenia o przetargach</h1>
<p><ul class="listastronul"><li><a href="bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/obrot-nieruchomościami/2026/ogloszenia-o-przetargach/ogloszenie-iii-przetargu-ustnego-nieograniczonego-na-sprzedaz-lokali-mieszkalnych-polozonych-w-chodziezy-przy-ul.adama-mickiewicza-4/3-oraz-4/6.html" title="Ogłoszenie III przetargu ustnego nieograniczonego na sprzedaż lokali mieszkalnych położonych w Chodzieży przy ul.Adama Mickiewicza 4/3 oraz 4/6" >Ogłoszenie III przetargu ustnego nieograniczonego na sprzedaż lokali mieszkalnych położonych w Chodzieży przy ul.Adama Mickiewicza 4/3 oraz 4/6</a></li>
<li><a href="bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/obrot-nieruchomościami/2026/ogloszenia-o-przetargach/ogloszenie-i-przetargu-ustnego-nieograniczonego-na-sprzedaz-dzialki-nr-917/1-polozonej-w-chodziezy-przy-ul.-kwiatowej.html" title="Ogłoszenie I przetargu ustnego nieograniczonego na sprzedaż działki nr 917/1 położonej w Chodzieży przy ul. Kwiatowej" >Ogłoszenie I przetargu ustnego nieograniczonego na sprzedaż działki nr 917/1 położonej w Chodzieży przy ul. Kwiatowej</a></li>
<li class="last"><a href="bip/jednostki-organizacyjne-samorzadu-terytorialnego/urzad-miejski/obrot-nieruchomościami/2026/ogloszenia-o-przetargach/ogloszenie-i-przetargu-ustnego-nieograniczonego-na-sprzedaz-lokalu-mieszkalnego-nr-8-polozonego-w-chodziezy-przy-ul.-ignacego-daszynskiego-12.html" title="Ogłoszenie I przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 8 położonego w Chodzieży przy ul. Ignacego Daszyńskiego 12" >Ogłoszenie I przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 8 położonego w Chodzieży przy ul. Ignacego Daszyńskiego 12</a></li>
</ul></p>
</div>
`;

// The seven real Wykazy-board titles (2026, fetched 2026-07-10) — every one
// is a bezprzetargowa tenant sale, a dzierżawa lease, or a użyczenie
// loan-for-use; NONE is a genuine pre-auction sale-track designation.
const REAL_WYKAZ_TITLES = [
  'Wykaz lokalu mieszkalnego nr 5 przeznaczonego do sprzedaży w drodze bezprzetargowej, stanowiącego własność Gminy Miejskiej w Chodzieży, położonego w Chodzieży przy ul. Adama Mickiewicza 6',
  'Wykaz lokalu mieszkalnego nr 1 przeznaczonego do sprzedaży w drodze bezprzetargowej, stanowiącego własność Gminy Miejskiej w Chodzieży, położonego w Chodzieży przy ul. Marii Konopnickiej 10',
  'Wykaz lokalu mieszkalnego nr 4 przeznaczonego do sprzedaży w drodze bezprzetargowej, stanowiącego własność Gminy Miejskiej w Chodzieży, położonego w Chodzieży przy ul. Zamkowej 19A',
  'Wykaz działki nr 3213/8, położonej w Chodzieży przy ul. Ludwika Waryńskiego, przeznaczonej do oddania w dzierżawę w trybie bezprzetargowym',
  'Wykaz części działki nr 4188, położonej w Chodzieży przy ul. Wojska Polskiego, przeznaczonej do oddania w dzierżawę w trybie bezprzetargowym',
  'Wykaz lokalu użytkowego znajdującego się w budynku położonym  w Chodzieży przy ul. Jagiellońskiej 5, przeznaczonego do oddania w użyczenie',
  'Wykaz części działki nr 2296/1, położonej w Chodzieży przy ul. Jagiellońskiej, przeznaczonej do oddania w użyczenie',
];

// RESULT-doc fixtures — constructed template text, NOT live data (see file
// header). Vocabulary matches this city's own confirmed announcement style
// ("Cena wywoławcza w <round> przetargu wynosi") plus the standard nationwide
// result phrasing ("cena osiągnięta", "wynikiem negatywnym").
const RESULT_SOLD =
  'Burmistrz Miasta Chodzieży informuje, że w dniu 5 sierpnia 2026 r. odbył się I przetarg ustny ' +
  'nieograniczony na sprzedaż lokalu mieszkalnego nr 8, położonego w Chodzieży przy ul. Ignacego ' +
  'Daszyńskiego 12. Cena wywoławcza w I przetargu wynosi 49.000,00 zł. Nabywcą lokalu został Pan Jan ' +
  'Kowalski. Cena osiągnięta w przetargu wynosi 52.500,00 zł.';

const RESULT_UNSOLD_LAND =
  'Burmistrz Miasta Chodzieży informuje, że w dniu 5 sierpnia 2026 r. odbył się I przetarg ustny ' +
  'nieograniczony na sprzedaż działki nr 917/1, położonej w Chodzieży przy ul. Kwiatowej. Cena ' +
  'wywoławcza w I przetargu wynosi 10.500,00 zł. Nikt nie przystąpił do przetargu. Przetarg zakończył ' +
  'się wynikiem negatywnym.';

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands + comma-decimal (Chodzież convention)', () => {
  assert.equal(parsePLN('340.000,00'), 340000);
  assert.equal(parsePLN('49.000,00'), 49000);
  assert.equal(parsePLN('10.500,00'), 10500);
  assert.equal(parsePLN('8.000'), 8000);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(''), null);
});

test('parseArea: comma-decimal m2/ha values', () => {
  assert.equal(parseArea('65,50'), 65.5);
  assert.equal(parseArea('0,0037'), 0.0037);
  assert.equal(parseArea(''), null);
});

test('parseDateText: numeric and spelled-out, any case', () => {
  assert.equal(parseDateText('5 sierpnia 2026'), '2026-08-05');
  assert.equal(parseDateText('5 SIERPNIA 2026'), '2026-08-05');
  assert.equal(parseDateText('05.08.2026'), '2026-08-05');
  assert.equal(parseDateText('garbage'), null);
});

test('roundFromText: announcement "ogłasza <ROMAN> przetarg" anchor', () => {
  assert.equal(roundFromText(stripTags(MICKIEWICZA_MULTI)), 3);
  assert.equal(roundFromText(stripTags(DASZYNSKI_SINGLE)), 1);
  assert.equal(roundFromText(stripTags(KWIATOWA_LAND)), 1);
  // Lower-case Polish "i" (the conjunction "and") must never false-match.
  assert.equal(roundFromText('kuchnia i łazienka, brak ogłoszenia tutaj'), null);
});

test('roundFromText: body-anchored fallback for RESULT-style "odbył się" phrasing', () => {
  assert.equal(roundFromText(RESULT_SOLD), 1);
  assert.equal(roundFromText(RESULT_UNSOLD_LAND), 1);
});

test('auctionDateFromText: all-caps "PRZETARG ODBĘDZIE SIĘ W DNIU …"', () => {
  assert.equal(auctionDateFromText(stripTags(MICKIEWICZA_MULTI)), '2026-08-05');
  assert.equal(auctionDateFromText(stripTags(DASZYNSKI_SINGLE)), '2026-08-05');
  // Real apparent source typo: this notice lives on the 2026 board but its
  // own text says "2025" — parsed as-written, not corrected.
  assert.equal(auctionDateFromText(stripTags(KWIATOWA_LAND)), '2025-08-05');
});

test('startingPriceFromText: "Cena wywoławcza w <round> przetargu wynosi …"', () => {
  assert.equal(startingPriceFromText(stripTags(MICKIEWICZA_MULTI)), 340000);
  assert.equal(startingPriceFromText(stripTags(DASZYNSKI_SINGLE)), 49000);
  assert.equal(startingPriceFromText(stripTags(KWIATOWA_LAND)), 10500);
});

test('baseStreetAddress: finds the property street, skips the office (Paderewskiego)', () => {
  assert.deepEqual(baseStreetAddress(stripTags(MICKIEWICZA_MULTI)), { street: 'Adama Mickiewicza', building: '4' });
  assert.deepEqual(baseStreetAddress(stripTags(DASZYNSKI_SINGLE)), { street: 'Ignacego Daszyńskiego', building: '12' });
  // Land text has no "ul. <name> <number>" shape (no building number) — null.
  assert.equal(baseStreetAddress(stripTags(KWIATOWA_LAND)), null);
});

test('flatUnitsFromText: multi-flat "lokal nr N o pow." pairs, skips the piwnica room-breakdown', () => {
  const units = flatUnitsFromText(stripTags(MICKIEWICZA_MULTI));
  assert.deepEqual(units, [
    { apt: '3', area_m2: 65.5 },
    { apt: '6', area_m2: 67.64 },
  ]);
  assert.deepEqual(flatUnitsFromText(stripTags(DASZYNSKI_SINGLE)), []);
});

test('singleFlatUnitFromText: apt + area from a single-flat notice', () => {
  assert.deepEqual(singleFlatUnitFromText(stripTags(DASZYNSKI_SINGLE)), { apt: '8', area_m2: 21.03 });
  assert.equal(singleFlatUnitFromText(stripTags(KWIATOWA_LAND)), null);
});

test('land helpers: parcelFromText, obrebFromText, landStreetFromText, plotAreaFromText', () => {
  const t = stripTags(KWIATOWA_LAND);
  assert.equal(parcelFromText(t), '917/1');
  assert.equal(obrebFromText(t), 'Chodzież');
  assert.equal(landStreetFromText(t), 'Kwiatowej');
  assert.equal(plotAreaFromText(t), 37); // 0,0037 ha -> 37 m2
});

// ----------------------------------------------------------- parseAnnouncementPage

test('parseAnnouncementPage: Mickiewicza — 2 flats, 1 shared price/round/date', () => {
  const recs = parseAnnouncementPage(MICKIEWICZA_MULTI, 'https://bip.chodziez.pl/x/mickiewicza');
  assert.equal(recs.length, 2);

  assert.equal(recs[0].kind, 'mieszkalny');
  assert.equal(recs[0].address.key, 'adama mickiewicza|4|3');
  assert.equal(recs[0].area_m2, 65.5);

  assert.equal(recs[1].address.key, 'adama mickiewicza|4|6');
  assert.equal(recs[1].area_m2, 67.64);

  for (const r of recs) {
    assert.equal(r.starting_price_pln, 340000);
    assert.equal(r.round, 3);
    assert.equal(r.auction_date, '2026-08-05');
    assert.equal(r.detail_url, 'https://bip.chodziez.pl/x/mickiewicza');
  }
});

test('parseAnnouncementPage: Daszyński — single flat', () => {
  const [r] = parseAnnouncementPage(DASZYNSKI_SINGLE, 'https://bip.chodziez.pl/x/daszynski');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'ignacego daszynskiego|12|8');
  assert.equal(r.area_m2, 21.03);
  assert.equal(r.starting_price_pln, 49000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-08-05');
});

test('parseAnnouncementPage: Kwiatowa — land (grunt), parcel-keyed', () => {
  const [r] = parseAnnouncementPage(KWIATOWA_LAND, 'https://bip.chodziez.pl/x/kwiatowa');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '917/1');
  assert.equal(r.obreb, 'Chodzież');
  assert.equal(r.area_m2, 37);
  assert.equal(r.address_raw, 'ul. Kwiatowej');
  assert.equal(r.starting_price_pln, 10500);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-08-05');
});

test('parseAnnouncementPage: empty/unparseable input -> []', () => {
  assert.deepEqual(parseAnnouncementPage('', 'x'), []);
  assert.deepEqual(parseAnnouncementPage('<p>losowa strona bez tresci przetargowej</p>', 'x'), []);
});

// ----------------------------------------------------------------- board + wykaz

test('parseBoardPage: extracts the 3 real 2026 announcement links (diacritic path resolved)', () => {
  const links = parseBoardPage(BOARD_HTML, 'https://bip.chodziez.pl/chodziezm/');
  assert.equal(links.length, 3);
  assert.match(links[0].url, /^https:\/\/bip\.chodziez\.pl\/chodziezm\/bip\/.*mickiewicza-4\/3-oraz-4\/6\.html$/);
  assert.match(links[0].title, /Mickiewicza 4\/3 oraz 4\/6/);
  assert.match(links[1].url, /dzialki-nr-917\/1-polozonej/);
  assert.match(links[2].url, /daszynskiego-12\.html$/);
});

test('isWykazSaleTitle: every real 2026 Wykazy-board title is bezprzetargowa/dzierżawa/użyczenie -> false', () => {
  for (const title of REAL_WYKAZ_TITLES) {
    assert.equal(isWykazSaleTitle(title), false, title);
  }
});

test('isWykazSaleTitle: a genuine (constructed) pre-auction sale wykaz -> true', () => {
  assert.equal(
    isWykazSaleTitle(
      'Wykaz lokalu mieszkalnego nr 2 przeznaczonego do sprzedaży w drodze przetargu, ' +
        'położonego w Chodzieży przy ul. Kolejowej 5',
    ),
    true,
  );
});

// ------------------------------------------------------------- parseResultDoc
// Constructed template fixtures — see file header. NOT live data.

test('parseResultDoc: SOLD flat result', () => {
  const [r] = parseResultDoc(RESULT_SOLD, null, 'https://bip.chodziez.pl/x/wynik-daszynski');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'ignacego daszynskiego|12|8');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 49000);
  assert.equal(r.final_price_pln, 52500);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-08-05');
});

test('parseResultDoc: UNSOLD land result (wynikiem negatywnym)', () => {
  const [r] = parseResultDoc(RESULT_UNSOLD_LAND, null, 'https://bip.chodziez.pl/x/wynik-kwiatowa');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '917/1');
  assert.equal(r.address_raw, 'ul. Kwiatowej');
  assert.equal(r.starting_price_pln, 10500);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.auction_date, '2026-08-05');
});

test('parseResultDoc: non-result text -> []', () => {
  assert.deepEqual(parseResultDoc('Losowy tekst bez związku z przetargiem.', null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
