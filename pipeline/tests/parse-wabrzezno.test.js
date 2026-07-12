// Wąbrzeźno parser tests. Fixtures are condensed-but-faithful copies of REAL
// notice text fetched live from mst-wabrzezno.rbip.mojregion.info (verified
// 2026-07-12, from this Pi's Polish residential IP): the inline <tresc> for
// notice 1866, and the born-digital PDF/DOCX attachments for 1461 (DOCX), 336
// (PDF), 1287 (PDF result) and 1602 (PDF result). Long non-load-bearing
// boilerplate (the wadium-handling procedure, notarial-cost warnings, cudzoziemcy
// clause, RODO) is trimmed; every sentence that feeds a parsed field (address,
// area, price, date, round, kind, outcome) is kept verbatim.
//
// The adapter builds its parse blob with buildRecordText({title, body}) from the
// feed headline (TITLE) + the extracted notice text (BODY); each test builds the
// SAME blob from the real captured strings, so the parsers are groundtruthed
// against live data.
//
// Groundtruth (hand-verified against the live documents):
//   1866  INLINE flat announce, round I, MULTI-LOKAL:
//           Mickiewicza 19/2    33,25 m²  cena wywoławcza 115 670 zł
//           Niedziałkowskiego 1/68  24,38 m²  cena wywoławcza 89 241 zł
//           przetarg 2026-07-29
//   1461  DOCX flat announce, round II, 3-LOKAL (body self-reports the prior
//         "Pierwszy przetarg odbył się …" — a round/date TRAP):
//           Mickiewicza 19/2    33,25 m²  90 000 zł
//           Niedziałkowskiego 1/74  37,89 m²  95 000 zł
//           Matejki 20A/7       50,70 m²  150 000 zł
//           przetarg 2025-09-09  (NOT the trap 2025-07-15)
//   336   PDF LAND announce, round II — grunt komunalny dz. 392/8, 0,3066 ha,
//         ul. Wspólna, cena wywoławcza 267 300 zł, przetarg 2023-05-09. The URL
//         slug says "…lokalu-mieszkalnego" but the BODY is a GRUNT sale — the
//         adapter classifies on the body, so this is 'grunt'.
//   1287  PDF result, round I, LAND (dz. 555/5,555/26,555/27, ul. Kukułcza,
//         0,0653 ha) — wynik NEGATYWNY, brak wpłaty wadium, cena wywoławcza
//         98 000 zł, przetarg 2025-04-01, no achieved price.
//   1602  PDF result, round II, LAND (6 działek, ul. Gruszkowa/Truskawkowa/
//         Okrężna) — wynikami NEGATYWNYMI, "brak ofert", "Nikt nie został
//         nabywcą", cena wywoławcza (pierwsza) 243 048 zł, przetarg 2026-01-15.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseNum,
  buildRecordText,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isSaleAuction,
  isLease,
  isRokowania,
  isResultDoc,
  isNegativeOutcome,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/wabrzezno/parse.js';

/** Build the parse blob exactly as crawl.js does. */
const blob = (title, body) => buildRecordText({ title, body });

// ---------------------------------------------------------------- fixtures

const F1866_TITLE =
  'Pierwszy nieograniczony przetarg ustny na sprzedaż prawa własności do lokali mieszkalnych';
const F1866_BODY =
  `IG.6840.1-2.2026 JG OGŁASZAM pierwszy nieograniczony przetarg ustny na sprzedaż prawa własności :
1) do lokalu mieszkalnego nr 2 o powierzchni użytkowej 33,25 m², składającego się z jednego pokoju,
kuchni, przedpokoju, łazienki z wc, zlokalizowanego na parterze budynku położonego w obrębie 1 miasta
Wąbrzeźna przy ulicy Mickiewicza nr 19, na nieruchomości określonej działką ewidencyjną nr 70 o
powierzchni 575 m² i zapisanej w księdze wieczystej KW nr TO1W/00030526/4 wraz z udziałem w wysokości
4133/76645 części wspólnych budynku. Do lokalu przynależy piwnica o powierzchni 8,08 m². Cena
wywoławcza wynosi 115.670,00 zł (słownie: sto piętnaście tysięcy sześćset siedemdziesiąt złotych)
Wadium ustalono na kwotę 11.567,00 zł Postąpienie ustalono w kwocie nie niższej niż 1.160,00 zł.
2) do lokalu mieszkalnego nr 68 o powierzchni użytkowej 24,38 m², składającego się z jednego pokoju z
aneksem kuchennym, przedpokoju, łazienki z wc, zlokalizowanego na III piętrze budynku położonego w
obrębie 1 miasta Wąbrzeźna przy ulicy Niedziałkowskiego nr 1, na nieruchomości określonej działkami
ewidencyjnymi o nr nr: 508/17 i 512/4 o łącznej powierzchni 813 m² i zapisanej w księdze wieczystej KW
nr TO1W/00023438/8 wraz z udziałem w wysokości 7/813 części wspólnych budynku. Do lokalu przynależy
piwnica o powierzchni 1,80 m². Cena wywoławcza wynosi 89.241,00 zł Wadium ustalono na kwotę 8.924,00 zł
Postąpienie ustalono w kwocie nie niższej niż 892,00 zł. Nieruchomości zabudowane budynkami
mieszkalnymi, w których zlokalizowane są powyższe lokale. Przetarg odbędzie się dnia 29 lipca 2026 roku
o godzinie 10.00 (lokal mieszkalny Mickiewicza 19/2), o godzinie 11.00 (lokal mieszkalny
Niedziałkowskiego 1/68) w siedzibie Urzędu Miasta Wąbrzeźno (ul. Wolności nr 18 – sala nr 19).
Wąbrzeźno, dnia 18.06.2026 r.`;
const F1866 = blob(F1866_TITLE, F1866_BODY);

// DOCX attachment; feed headline carries no round word — the round comes from
// the body. Body self-reports the prior "Pierwszy przetarg odbył się …" round.
const F1461_TITLE = 'Przetarg Mickiewicza 19, Niedziałkowskiego 1, Matejki 20A';
const F1461_BODY =
  `OGŁASZAM drugi nieograniczony przetarg ustny na sprzedaż prawa własności :
do lokalu mieszkalnego nr 2 o powierzchni użytkowej 33,25 m², zlokalizowanego na parterze budynku
położonego w obrębie 1 miasta Wąbrzeźna przy ulicy Mickiewicza nr 19, na nieruchomości określonej
działką ewidencyjną nr 70 o powierzchni 575 m². Cena wywoławcza wynosi 90.000,00 zł Wadium ustalono na
kwotę 9.000,00 zł do lokalu mieszkalnego nr 74 o powierzchni użytkowej 37,89 m², zlokalizowanego na IV
piętrze budynku położonego w obrębie 1 miasta Wąbrzeźna przy ulicy Niedziałkowskiego nr 1, na
nieruchomości określonej działkami ewidencyjnymi o nr nr: 508/17 i 512/4 o łącznej powierzchni 813 m².
Cena wywoławcza wynosi 95.000,00 zł Wadium ustalono na kwotę 9.500,00 zł do lokalu mieszkalnego nr 7 o
powierzchni użytkowej 50,70 m², zlokalizowanego na parterze budynku położonego w obrębie 1 miasta
Wąbrzeźna przy ulicy Matejki nr 20A, na nieruchomości określonej działką ewidencyjną nr 483/21 o
powierzchni 570 m². Cena wywoławcza wynosi 150.000,00 zł Wadium ustalono na kwotę 15.000,00 zł
Nieruchomości zabudowane budynkami mieszkalnymi, w których zlokalizowane są powyższe lokale. Pierwszy
przetarg odbył się 15.07.2025 r. Przetarg odbędzie się dnia 9 września 2025 roku o godzinie 10.00 (lokal
mieszkalny Mickiewicza 19/2), o godzinie 11.00 (lokal mieszkalny Niedziałkowskiego 1/74), o godzinie
12.00 (lokal mieszkalny Matejki 20A/7), w siedzibie Urzędu Miasta Wąbrzeźno (ul. Wolności nr 18 – sala
nr 19).`;
const F1461 = blob(F1461_TITLE, F1461_BODY);

const F336_TITLE =
  'Drugi nieograniczony przetarg ustny na sprzedaż prawa własności do gruntu komunalnego';
const F336_BODY =
  `IG.6840.2.2022.JG OGŁASZAM drugi nieograniczony przetarg ustny na sprzedaż prawa własności do gruntu
komunalnego o powierzchni 0,3066 ha określonego działką ewidencyjną nr 392/8, zapisanego w księdze
wieczystej KW nr TO1W/00028108/1, położonego w obrębie 2 miasta Wąbrzeźno przy ulicy Wspólnej i
przeznaczonego w planie zagospodarowania miasta w funkcji podstawowej pod usługi. Cena wywoławcza
wynosi 267.300,00 zł brutto Wadium ustalono na kwotę 15.000,00 złotych. Przetarg odbędzie się dnia 9
maja 2023 roku o godzinie 11.00 w siedzibie Urzędu Miasta Wąbrzeźno przy ulicy Wolności nr 18.`;
const F336 = blob(F336_TITLE, F336_BODY);

const R1287_TITLE =
  'Informacja dotycząca pierwszego nieograniczonego przetargu ustnego na sprzedaż niezabudowanej działki ewidencyjnej';
const R1287_BODY =
  `IG.6840.11.2024.DW INFORMUJĘ iż przeprowadzony w dniu 01.04.2025 r. w siedzibie Urzędu Miasta
Wąbrzeźno przy ulicy Wolności nr 18 pierwszy nieograniczony przetarg ustny na sprzedaż niezabudowanej
nieruchomości komunalnej o łącznej powierzchni 0,0653 ha określonej działkami ewidencyjnymi o nr :
555/5, 555/26, 555/27, położonej w obrębie 2 miasta Wąbrzeźno przy ulicy Kukułczej i zapisanej w księdze
wieczystej nr KW TO1W/00016822/5 zakończył się wynikiem negatywnym. Nikt nie wpłacił wadium. Cena
wywoławcza nieruchomości wynosiła 98.000,00 zł, w przetargu nie wziął udziału żaden oferent, nikt nie
wpłacił wymaganego wadium w wysokości 9.800,00 zł w terminie do dnia 26.03.2025 r. Wywieszono dnia
08.04.2025 r.`;
const R1287 = blob(R1287_TITLE, R1287_BODY);

const R1602_TITLE =
  'Informacja o wynikach przetargów nieograniczonych na sprzedaż niezabudowanych nieruchomości komunalnych';
const R1602_BODY =
  `IG.6840.6,7,10,11,12,13.2025.DW INFORMUJĘ iż ogłoszone na dzień 15.01.2026 r. w siedzibie Urzędu Miasta
Wąbrzeźno przy ulicy Wolności nr 18, drugie nieograniczone przetargi ustne na sprzedaż niezabudowanych
nieruchomości komunalnych tj. : 1. Działka nr 725 o pow. 0,1604 ha, zapisana w księdze wieczystej KW nr
TO1W/00029646/1, przy ulicy Gruszkowej; 2. Działka nr 726 o pow. 0,1486 ha, przy ulicy Gruszkowej; 3.
Działka nr 727/2 o pow.0,1021 ha, przy ul. Truskawkowej; 4. Działka nr 727/3 o pow.0,1021 ha, przy ul.
Truskawkowej; 5. Działka nr 727/4 o pow. 0,1024 ha, przy ul. Truskawkowej; 6. Działka nr 52/4 o pow.
0,3226 ha, położoną w obrębie 5 miasta Wąbrzeźno, przy ul. Okrężnej; zakończyły się wynikami
negatywnymi: Cena wywoławcza nieruchomości : 1.- 243.048,00 złotych brutto; 2.- 226.320,00 złotych
brutto; 3.- 148.584,00 złote brutto; 4.- 148.584,00 złote brutto; 5.- 148.978,00 złotych brutto; 6.-
231.732,00 złote brutto. Najwyższa cena osiągnięta w przetargach – brak ofert. Nikt nie został nabywcą
nieruchomości. Wywieszono dnia 23.01.2026 r.`;
const R1602 = blob(R1602_TITLE, R1602_BODY);

// A pure lease and a rokowania notice, for the gates.
const LEASE = blob(
  'Pierwszy nieograniczony przetarg ustny na dzierżawę pod drobne uprawy',
  'OGŁASZAM pierwszy nieograniczony przetarg ustny na dzierżawę gruntu pod drobne uprawy rolne. Czynsz dzierżawny płatny miesięcznie.',
);
const ROKOWANIA_TITLE = 'Ogłoszenie rokowania Chełmińska';

// ------------------------------------------------------------- unit funcs

test('parsePLN: dot/space thousands with grosze tail', () => {
  assert.equal(parsePLN('115.670,00'), 115670);
  assert.equal(parsePLN('267.300,00'), 267300);
  assert.equal(parsePLN('98.000,00'), 98000);
  assert.equal(parsePLN('243.048,00'), 243048);
  assert.equal(parsePLN('1 500 000,00'), 1500000);
  assert.equal(parsePLN('brak'), null);
});

test('parseNum: comma and dot decimals', () => {
  assert.equal(parseNum('33,25'), 33.25);
  assert.equal(parseNum('0,3066'), 0.3066);
  assert.equal(parseNum('575'), 575);
});

test('roundFromText: word ordinal (body) beats the prior-round history trap; Roman title fallback', () => {
  assert.equal(roundFromText(F1866), 1); // "pierwszy nieograniczony przetarg"
  assert.equal(roundFromText(F1461), 2); // "drugi …" wins over "Pierwszy przetarg odbył się"
  assert.equal(roundFromText(F336), 2);
  assert.equal(roundFromText(R1287), 1);
  assert.equal(roundFromText(R1602), 2); // "drugie nieograniczone przetargi"
  assert.equal(roundFromText(blob('IV przetarg nieograniczony na zbycie nieruchomości', 'Działka nr 12')), 4);
});

test('auctionDateFromText: word-month announce, numeric result, "ogłoszone na dzień"; posting date never wins', () => {
  assert.equal(auctionDateFromText(F1866), '2026-07-29');
  assert.equal(auctionDateFromText(F1461), '2025-09-09'); // NOT the trap 2025-07-15
  assert.equal(auctionDateFromText(F336), '2023-05-09');
  assert.equal(auctionDateFromText(R1287), '2025-04-01'); // "przeprowadzony w dniu"
  assert.equal(auctionDateFromText(R1602), '2026-01-15'); // "ogłoszone na dzień", not "Wywieszono dnia 23.01.2026"
});

test('startingPriceFromText: "cena wywoławcza wynosi/nieruchomości :" — never the wadium/postąpienie', () => {
  assert.equal(startingPriceFromText(F336), 267300);
  assert.equal(startingPriceFromText(R1287), 98000);
  assert.equal(startingPriceFromText(R1602), 243048); // first parcel, past the "1.-" list index
});

test('achievedPriceFromText: null when "Nikt … został nabywcą" / no buyer named', () => {
  assert.equal(achievedPriceFromText(R1602), null);
  assert.equal(achievedPriceFromText(R1287), null);
});

// ------------------------------------------------------------------- gates

test('gates: isSaleAuction / isLease / isRokowania / isResultDoc / isNegativeOutcome', () => {
  assert.equal(isSaleAuction(F1866), true);
  assert.equal(isSaleAuction(F336), true); // land "na sprzedaż"/"zbycie"
  assert.equal(isSaleAuction(LEASE), false); // przetarg but no sprzedaż/zbycie

  assert.equal(isLease(LEASE), true);
  assert.equal(isLease(F1866), false);

  assert.equal(isRokowania(ROKOWANIA_TITLE), true);
  assert.equal(isRokowania(F1866_TITLE), false);

  assert.equal(isResultDoc(R1287), true);
  assert.equal(isResultDoc(R1602), true);
  assert.equal(isResultDoc(F1866), false); // announcement ("OGŁASZAM"), not a result

  assert.equal(isNegativeOutcome(R1287), true);
  assert.equal(isNegativeOutcome(R1602), true);
  assert.equal(isNegativeOutcome(F1866), false);
});

// ------------------------------------------------- parseAnnouncement (flats)

test('parseAnnouncement: 1866 INLINE round I — splits the MULTI-LOKAL notice into two flat records', () => {
  const recs = parseAnnouncement(F1866);
  assert.equal(recs.length, 2);

  const [a, b] = recs;
  assert.equal(a.kind, 'mieszkalny');
  assert.equal(a.address.street, 'Mickiewicza');
  assert.equal(a.address.building, '19');
  assert.equal(a.address.apt, '2');
  assert.equal(a.address.key, 'mickiewicza|19|2');
  assert.equal(a.area_m2, 33.25);
  assert.equal(a.starting_price_pln, 115670);
  assert.equal(a.auction_date, '2026-07-29');
  assert.equal(a.round, 1);

  assert.equal(b.kind, 'mieszkalny');
  assert.equal(b.address.street, 'Niedziałkowskiego');
  assert.equal(b.address.building, '1');
  assert.equal(b.address.apt, '68');
  assert.equal(b.address.key, 'niedzialkowskiego|1|68');
  assert.equal(b.area_m2, 24.38);
  assert.equal(b.starting_price_pln, 89241);
  assert.equal(b.auction_date, '2026-07-29');
  assert.equal(b.round, 1);
});

test('parseAnnouncement: 1461 DOCX round II — three flats, each its own price; round/date resist the "Pierwszy przetarg odbył się" trap', () => {
  const recs = parseAnnouncement(F1461);
  assert.equal(recs.length, 3);
  assert.deepEqual(
    recs.map((r) => [r.address.key, r.area_m2, r.starting_price_pln]),
    [
      ['mickiewicza|19|2', 33.25, 90000],
      ['niedzialkowskiego|1|74', 37.89, 95000],
      ['matejki|20A|7', 50.7, 150000],
    ],
  );
  for (const r of recs) {
    assert.equal(r.kind, 'mieszkalny');
    assert.equal(r.round, 2);
    assert.equal(r.auction_date, '2025-09-09');
  }
});

// -------------------------------------------------- parseAnnouncement (land)

test('parseAnnouncement: 336 PDF — grunt (classified on BODY, not the "lokalu-mieszkalnego" slug), parcel-keyed, ha→m²', () => {
  const recs = parseAnnouncement(F336);
  assert.equal(recs.length, 1);
  const [r] = recs;
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '392/8');
  assert.equal(r.area_m2, 3066); // 0,3066 ha × 10000
  assert.equal(r.address_raw, 'Wspólnej');
  assert.equal(r.starting_price_pln, 267300);
  assert.equal(r.auction_date, '2023-05-09');
  assert.equal(r.round, 2);
  assert.equal(r.address, undefined); // land records are parcel-keyed, no parsed address
});

// ----------------------------------------------------------- parseResultDoc

test('parseResultDoc: 1287 round I LAND — negative outcome, real parcels/price/date, no fabricated final price', () => {
  const out = parseResultDoc(R1287, null, 'https://mst-wabrzezno.rbip.mojregion.info/1287/x.html');
  assert.equal(out.length, 1);
  const [r] = out;
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '555/5, 555/26, 555/27');
  assert.equal(r.area_m2, 653); // 0,0653 ha × 10000
  assert.equal(r.address_raw, 'Kukułczej');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 98000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2025-04-01');
  assert.equal(r.source_url, 'https://mst-wabrzezno.rbip.mojregion.info/1287/x.html');
  assert.deepEqual(r.notes, []); // negative outcome + price present ⇒ no parse notes
});

test('parseResultDoc: 1602 round II multi-parcel LAND — negative ("brak ofert"), parcels joined, first cena wywoławcza, auction date from "ogłoszone na dzień"', () => {
  const out = parseResultDoc(R1602, null, 'https://mst-wabrzezno.rbip.mojregion.info/1602/x.html');
  assert.equal(out.length, 1);
  const [r] = out;
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '725, 726, 727/2, 727/3, 727/4, 52/4');
  assert.equal(r.area_m2, 1604); // first parcel 0,1604 ha
  assert.equal(r.address_raw, 'Gruszkowej');
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, 243048);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2026-01-15');
});

test('parseResultDoc: an announcement blob (not a result) returns []', () => {
  assert.deepEqual(parseResultDoc(F1866, null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
