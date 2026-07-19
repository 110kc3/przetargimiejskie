// Lubin parser tests. Fixtures are condensed-but-faithful copies of REAL
// `pdftotext -layout` output of live bip.um.lubin.pl attachments, fetched and
// verified 2026-07-18 (see parse.js header for full provenance):
//   attachments/9945/download   flat ANNOUNCEMENT, multi-lot batch (4 flats:
//     Drzymały 6/13, Kilińskiego 2/6, Kościuszki 23/24, Szkolna 13/12; II
//     przetarg, dated 2015 — table-driven price/area)
//   attachments/10683/download  land ANNOUNCEMENT, multi-lot batch (11
//     działki 750/51..750/61, one price/wadium per działka; IV przetarg,
//     dated 2018-2019)
//   attachments/10067/download  land ANNOUNCEMENT, single combined lot (2
//     działki 855/246 + 154/5 sold together; I przetarg, dated 2016)
//   attachments/9472/download   WYKAZ package-sale table (13 flats at
//     ul. 1 Maja 11/11A/11B sold together to one investor)
//
// FLAT_ANNOUNCEMENT_SINGLE is a faithful copy of the live 2026-03-09 Szkolna
// 3/8 announcement's text as republished verbatim by the adradar aggregator
// (the original bip.um.lubin.pl attachment for that session had already aged
// off the board by build time — see crawl.js/parse.js headers on the
// short-retention finding).
//
// RESULT_* fixtures are SYNTHETIC, built from the generic Polish
// municipal-auction result-notice phrasing this repo uses elsewhere (and
// confirmed present in Lubin's OWN announcement boilerplate — e.g. "Cena
// zakupu nieruchomości osiągnięta w przetargu podlegać będzie zapłacie
// jednorazowo" in the 10067 fixture) — NOT from a real Lubin result document.
// None was reachable at build time: the results board was empty and no
// "informacja o wyniku przetargu" URL survives in the live sitemap. Flag for
// re-groundtruthing against a real result PDF the moment one is captured.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  romanToInt,
  roundFromText,
  parsePLN,
  isResultNotice,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  negativeOutcomeStated,
  isGenuineSaleWykazTitle,
  parseAnnouncement,
  parseResultDoc,
  wykazRecordsFromText,
} from '../src/cities/lubin/parse.js';

// ---------------------------------------------------------------- unit helpers

test('romanToInt: I, II, IV', () => {
  assert.equal(romanToInt('I'), 1);
  assert.equal(romanToInt('II'), 2);
  assert.equal(romanToInt('IV'), 4);
  assert.equal(romanToInt('bad'), null);
});

test('roundFromText: Lubin word order ("ogłasza <ROUND> nieograniczony przetarg ustny")', () => {
  assert.equal(roundFromText('Prezydent Miasta Lubina ogłasza II nieograniczony przetarg ustny na sprzedaż'), 2);
  assert.equal(roundFromText('ogłasza I nieograniczony przetarg ustny na sprzedaż nieruchomości'), 1);
  assert.equal(roundFromText('ogłasza IV nieograniczony przetarg ustny na sprzedaż nieruchomości'), 4);
});

test('roundFromText: reverse (jelenia-gora-style) word order fallback', () => {
  assert.equal(roundFromText('odbył się drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('odbył się V przetarg ustny nieograniczony'), 5);
});

test('parsePLN: space thousands, comma grosze', () => {
  assert.equal(parsePLN('35 500,00'), 35500);
  assert.equal(parsePLN('1 000 000,00'), 1000000);
  assert.equal(parsePLN('160 000,00'), 160000);
});

test('isResultNotice: result header vs announcement', () => {
  assert.equal(isResultNotice('INFORMACJA O WYNIKU PRZETARGU\nNa podstawie …'), true);
  assert.equal(isResultNotice('Prezydent Miasta Lubina ogłasza II nieograniczony przetarg ustny'), false);
});

test('auctionDateFromText: dot and hyphen numeric dates', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w siedzibie Urzędu Miejskiego w Lubinie, dnia 02-10-2015 roku'),
    '2015-10-02',
  );
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w siedzibie Urzędu Miejskiego w Lubinie, dnia 17.05.2019 roku'),
    '2019-05-17',
  );
  assert.equal(
    auctionDateFromText('P r z e t a r g odbędzie się w siedzibie Urzędu Miejskiego w Lubinie w sali nr 126 dnia 09.03.2026 r.'),
    '2026-03-09',
  );
});

test('resultDateFromText (synthetic convention, unvalidated live)', () => {
  assert.equal(
    resultDateFromText('informuję, że w dniu 15.04.2026 roku w siedzibie Urzędu Miejskiego w Lubinie odbył się II przetarg'),
    '2026-04-15',
  );
});

test('price extractors', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza: 160 000,00 zł.'), 160000);
  assert.equal(startingPriceFromText('Cena wywoławcza netto: 1 000 000,00 zł'), 1000000);
  assert.equal(achievedPriceFromText('Najwyższa cena osiągnięta w przetargu: 45 200,00 zł'), 45200);
  assert.equal(achievedPriceFromText('brak ceny osiągniętej'), null);
});

test('negativeOutcomeStated', () => {
  assert.equal(negativeOutcomeStated('Przetarg zakończony został wynikiem negatywnym.'), true);
  assert.equal(negativeOutcomeStated('nie wpłacono wadium w terminie'), true);
  assert.equal(negativeOutcomeStated('Osoba ustalona jako Nabywca: Jan Kowalski'), false);
});

test('isGenuineSaleWykazTitle: sale vs lease/exchange (the live board is mostly non-sale)', () => {
  assert.equal(
    isGenuineSaleWykazTitle('Wykaz nieruchomości stanowiącej własność Gminy Miejskiej Lubin, przeznaczonej do dzierżawy jako teren dodatkowy w trybie bezprzetargowym.'),
    false,
  );
  assert.equal(
    isGenuineSaleWykazTitle('Wykaz nieruchomości zabudowanej, stanowiącej własność Gminy Miejskiej Lubin, przeznaczonej do zamiany.'),
    false,
  );
  assert.equal(
    isGenuineSaleWykazTitle('Wykaz lokali mieszkalnych przeznaczonych do sprzedaży w drodze przetargu.'),
    true,
  );
  assert.equal(
    isGenuineSaleWykazTitle('Wykaz nieruchomości niewyodrębnionych lokali przeznaczonych do łącznej sprzedaży.'),
    true,
  );
});

// ------------------------------------------------------------ real fixtures

// attachments/9945/download — flat ANNOUNCEMENT, multi-lot batch (condensed:
// legal boilerplate after the table/lot list trimmed, table + all 4 numbered
// lots kept verbatim).
const FLAT_ANNOUNCEMENT_MULTI = `
              Prezydent Miasta Lubina ogłasza II nieograniczony przetarg ustny na sprzedaż l oka l i mi es zk al n yc h poł ożon yc h w Lubi nie
      prze znac zon yc h do zb yc i a w ra z z odda ni em w uż ytk ow a nie w ie c z ys te prz yna l e żne j do l ok a l i uł a mk ow e j c zę śc i gruntu

  Położenie       Numer KW            działki             działki użytkowa                        lokalu         udziału           razem             Wadium
  Drzymały       LE1U/00015083/7       369/3       4       158       27,10       47/1000       35 109,50 zł      390,50 zł      35 500,00 zł        3 550,00 zł
    6/13

 Kilińskiego     LE1U/00026950/6       374/8       4       191       34,80      738/10000      44 280,00 zł      720,00 zł      45 000,00 zł        4 500,00 zł
      2/6

 Kościuszki      LE1U/00025035/9       212/4       4       265       24,40      270/10000      31 616,00 zł      384,00 zł      32 000,00 zł        3 200,00 zł
   23/24

   Szkolna       LE1U/00010370/1       378/1       4      1 841      26,60      67/10000       39 360,00 zł      640,00 zł      40 000,00 zł        4 000,00 zł
    13/12

Nieruchomości stanowią własność Gminy Miejskiej Lubin, wolne są od długów i obciążeń.

1) Drzymały 6/13 - lokal mieszkalny podlega wydzieleniu z nieruchomości zabudowanej budynkiem wielolokalowym i sprzedany zostanie wraz z udziałem
w nieruchomości wspólnej. Lokal położony jest na IV piętrze, składa się z 1 pokoju, kuchni, łazienki z wc, przedpokoju.

2) Kilińskiego 2/6 - lokal mieszkalny podlega wydzieleniu z nieruchomości zabudowanej budynkiem wielolokalowym i sprzedany zosta nie wraz z udziałem
w nieruchomości wspólnej. Lokal położony jest na I piętrze, składa się z 1 pokoju, kuchni, przedpokoju oraz wc.

3) Kościuszki 23/24 – lokal mieszkalny został wyodrębniony jako nieruchomość lokalowa i ma założoną księgę wieczystą nr LE1U/00026294/9. Lokal sprzedany
zostanie wraz z udziałem w nieruchomości wspólnej. Lokal położony jest na IV piętrze.

4) Szkolna 13/12 - lokal mieszkalny podlega wydzieleniu z nieruchomości zabudowanej budynkiem wielolokalowym i sprzedany zosta nie wraz z udziałem
w nieruchomości wspólnej. Lokal położony jest na II piętrze, składa się z 2 pokoi.

Pierwszy przetarg odbył się w dniu 10 lipca 2015 roku o godzinie 10 00.

Przetarg odbędzie się w siedzibie Urzędu Miejskiego w Lubinie, przy ulicy Jana Kilińskiego 10 w sali nr 126, dnia 02-10-2015 roku o godzinie 1000
`;

// attachments/10683/download — land ANNOUNCEMENT, multi-lot batch (condensed:
// descriptive prose after the table trimmed, table + auction-date line kept).
const LAND_ANNOUNCEMENT_BATCH = `
                                                                 Prezydent Miasta Lubina
                       ogłasza IV nieograniczony przetarg ustny na sprzedaż nieruchomości stanowiącej własność Gminy Miejskiej Lubin
 Lp. Położenie nieruchomości         Numer działki             Powierzchnia [m2]                   Cena wywoławcza netto [zł]            Wysokość wadium [zł]

  1.                                    750/51                        734                                  130 000,00                          15 000,00
 2.                                     750/52                        573                                    85 000,00                         10 000,00
 3.    Obręb 8 miasta Lubina            750/53                        572                                    85 000,00                         10 000,00
 4.      woj. dolnośląskie              750/54                        571                                    85 000,00                         10 000,00
 5.       (osiedle Polesie)             750/55                        570                                    85 000,00                         10 000,00
 6.      Księga wieczysta               750/56                        569                                    85 000,00                         10 000,00
 7.      LE1U/00017844/4                750/57                        568                                    85 000,00                         10 000,00
 8.                                     750/58                        567                                    85 000,00                         10 000,00
 9.                                     750/59                        567                                    85 000,00                         10 000,00
10.                                    750/60                        565                                    85 000,00                         10 000,00
11.                                    750/61                        564                                    85 000,00                         10 000,00
7.Działki przeznaczone są do sprzedaży w formie przetargu ustnego nieograniczonego.
9.Przetarg odbędzie się w siedzibie Urzędu Miejskiego w Lubinie, przy ulicy Jana Kilińskiego 10, 59-300 Lubin, I piętro, sala nr 126, dnia 17.05.2019 roku
  o godzinie 10:00.
`;

// attachments/10067/download — land ANNOUNCEMENT, single combined lot
// (condensed: descriptive prose trimmed, table + auction-date line kept).
const LAND_ANNOUNCEMENT_SINGLE = `
                                                             Prezydent Miasta Lubina
                                        ogłasza I nieograniczony przetarg ustny na sprzedaż nieruchomości
                                                     stanowiącej własność Gminy Miejskiej Lubin

Lp.     Nr księgi           Nr            Łączna           Obręb               Położenie                 Cena wywoławcza               Wadium [zł]
        wieczystej        działki    powierzchnia [m2]                                                nieruchomości netto [zł]
  1. LE1U/00017785/2      855/246          5548               8         Lubin,ul. Krzemieniecka             1 000 000,00                200 000,00
     LE1U/00017586/7       154/5                                           woj. dolnośląskie

Niezabudowane działki oznaczone numerami 855/246,154/5 położone w Lubinie przy ulicy Krzemienieckiej, woj. dolnośląskie przeznaczone
są do łącznego zagospodarowania.
Cena zakupu nieruchomości osiągnięta w przetargu podlegać będzie zapłacie jednorazowo, nie później niż do dnia zawarcia umowy notarialnej
przenoszącej własność.
Przetarg odbędzie się w siedzibie Urzędu Miejskiego w Lubinie, przy ulicy Jana Kilińskiego 10 w sali nr 126, dnia 03-06-2016 roku o godzinie 10:00.
`;

// Faithful copy of the live 2026-03-09 announcement text (Szkolna 3/8),
// republished verbatim by adradar — see file header.
const FLAT_ANNOUNCEMENT_SINGLE = `
Prezydent Miasta Lubina ogłasza I nieograniczony przetarg ustny na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego
Adres lokalu: ul. Szkolna 3/8, Lubin, powiat lubiński, województwo dolnośląskie; Powierzchnia użytkowa lokalu: 27,47 m2; Pomieszczenia: pokój, kuchnia, łazienka z WC, przedpokój;
Kondygnacja : II; Księga wieczysta prowadzona dla prawa: LE1U/00042507/4; Uwagi: pokój przedzielony łatwo rozbieraną ścianką;
Cena wywoławcza: 160 000,00 zł. Lokal niewyodrębniony, znajduje się w zasobach Spółdzielni Mieszkaniowej im. St. Staszica w Lubinie.
P r z e t a r g odbędzie się w siedzibie Urzędu Miejskiego w Lubinie, przy ul. J. Kilińskiego 10 w Lubinie w sali nr 126 dnia 09.03.2026 r. o godzinie 11:00
`;

// attachments/9472/download — WYKAZ package-sale table (condensed to 4 of the
// 13 rows; title/header kept verbatim).
const WYKAZ_PACKAGE = `
                                    WYKAZ NIERUCHOMOŚCI
                 niewyodrębnionych lokali przeznaczonych do łącznej sprzedaży
      wraz z oddaniem w użytkowanie wieczyste przynależnej do lokali ułamkowej części gruntu,
             lokali położonych w Lubinie przy ul. 1 Maja 11, 11A i 11B (woj. dolnośląskie)
Lp.            Adres lokalu                  Położenie w budynku             Powierzchnia użytkowa
 1          1 Maja 11/1                              parter                           56,90 m2
 2          1 Maja 11/4                             I piętro                          85,21 m2
 3          1 Maja 11A/1                            I piętro                          38,93 m2
 4          1 Maja 11A/2                            I piętro                          41,23 m2
`;

test('parseAnnouncement: multi-lot flat batch — address from prose header, area/price from table, shared round + date', () => {
  const recs = parseAnnouncement(FLAT_ANNOUNCEMENT_MULTI);
  assert.equal(recs.length, 4);

  assert.equal(recs[0].address.key, 'drzymaly|6|13');
  assert.equal(recs[0].area_m2, 27.1);
  assert.equal(recs[0].starting_price_pln, 35500);

  assert.equal(recs[1].address.key, 'kilinskiego|2|6');
  assert.equal(recs[1].area_m2, 34.8);
  assert.equal(recs[1].starting_price_pln, 45000);

  assert.equal(recs[2].address.key, 'kosciuszki|23|24');
  assert.equal(recs[2].area_m2, 24.4);
  assert.equal(recs[2].starting_price_pln, 32000);

  assert.equal(recs[3].address.key, 'szkolna|13|12');
  assert.equal(recs[3].area_m2, 26.6);
  assert.equal(recs[3].starting_price_pln, 40000);

  for (const rec of recs) {
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.round, 2);
    assert.equal(rec.auction_date, '2015-10-02');
  }
});

test('parseAnnouncement: single-lot flat — labelled "Adres lokalu:" shape', () => {
  const [rec] = parseAnnouncement(FLAT_ANNOUNCEMENT_SINGLE);
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'szkolna|3|8');
  assert.equal(rec.area_m2, 27.47);
  assert.equal(rec.starting_price_pln, 160000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-03-09');
});

test('parseAnnouncement: land batch — one record per działka, shared round + date', () => {
  const recs = parseAnnouncement(LAND_ANNOUNCEMENT_BATCH);
  assert.equal(recs.length, 11);
  assert.equal(recs[0].kind, 'grunt');
  assert.equal(recs[0].dzialka_nr, '750/51');
  assert.equal(recs[0].area_m2, 734);
  assert.equal(recs[0].starting_price_pln, 130000);
  assert.equal(recs[10].dzialka_nr, '750/61');
  assert.equal(recs[10].area_m2, 564);
  assert.equal(recs[10].starting_price_pln, 85000);
  for (const rec of recs) {
    assert.equal(rec.round, 4);
    assert.equal(rec.auction_date, '2019-05-17');
  }
});

test('parseAnnouncement: land single combined lot — parcel, area, price, date, round', () => {
  const [rec] = parseAnnouncement(LAND_ANNOUNCEMENT_SINGLE);
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '855/246');
  assert.equal(rec.area_m2, 5548);
  assert.equal(rec.obreb, '8');
  assert.equal(rec.starting_price_pln, 1000000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2016-06-03');
});

test('wykazRecordsFromText: package-sale table — one record per flat, no price/date', () => {
  const recs = wykazRecordsFromText(WYKAZ_PACKAGE, 'https://bip.um.lubin.pl/attachments/9472/download');
  assert.equal(recs.length, 4);
  assert.equal(recs[0].kind, 'mieszkalny');
  assert.equal(recs[0].address.key, '1 maja|11|1');
  assert.equal(recs[0].area_m2, 56.9);
  assert.equal(recs[1].address.key, '1 maja|11|4');
  assert.equal(recs[2].address.key, '1 maja|11A|1');
  assert.equal(recs[3].address.key, '1 maja|11A|2');
});

// ------------------------------------------------------------------ result parse
// SYNTHETIC fixtures — see file header. Exercises the code path; does not
// prove the real Lubin result-notice template matches this shape.

const RESULT_SOLD_SYNTHETIC = `
INFORMACJA O WYNIKU PRZETARGU

Prezydent Miasta Lubina informuję, że w dniu 15.04.2026 roku w siedzibie Urzędu Miejskiego w Lubinie
odbył się II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego.

Adres lokalu: ul. Szkolna 3/8, Lubin, powiat lubiński, województwo dolnośląskie; Powierzchnia użytkowa lokalu: 27,47 m2;

Cena wywoławcza: 160 000,00 zł.
Najwyższa cena osiągnięta w przetargu: 172 500,00 zł.

Osoba ustalona jako nabywca nieruchomości: Jan Kowalski.
`;

const RESULT_UNSOLD_SYNTHETIC = `
INFORMACJA O WYNIKU PRZETARGU

Prezydent Miasta Lubina informuję, że w dniu 20.05.2019 roku w siedzibie Urzędu Miejskiego w Lubinie
odbył się IV przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej.

Nr działki: 750/51, Obręb 8 miasta Lubina, powierzchnia 734 m2.
Cena wywoławcza netto: 130 000,00 zł.

Przetarg zakończony został wynikiem negatywnym.
`;

test('parseResultDoc: sold flat (synthetic) — address key, achieved price, round, outcome', () => {
  const [rec] = parseResultDoc(RESULT_SOLD_SYNTHETIC, null, 'https://bip.um.lubin.pl/attachments/99999/download');
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'szkolna|3|8');
  assert.equal(rec.round, 2);
  assert.equal(rec.auction_date, '2026-04-15');
  assert.equal(rec.starting_price_pln, 160000);
  assert.equal(rec.final_price_pln, 172500);
  assert.equal(rec.outcome, 'sold');
});

test('parseResultDoc: unsold land (synthetic) — parcel key, no achieved price, explicit negative outcome', () => {
  const [rec] = parseResultDoc(RESULT_UNSOLD_SYNTHETIC, null, 'https://bip.um.lubin.pl/attachments/99998/download');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '750/51');
  assert.equal(rec.round, 4);
  assert.equal(rec.auction_date, '2019-05-20');
  assert.equal(rec.starting_price_pln, 130000);
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
});

test('parseAnnouncement: a result notice mis-filed on the announcement board is skipped', () => {
  assert.deepEqual(parseAnnouncement(RESULT_SOLD_SYNTHETIC), []);
});
