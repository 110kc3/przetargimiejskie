// Siedlce parser tests. Fixtures are condensed-but-faithful copies of REAL
// live siedlce.pl article bodies (fetched + verified 2026-07-18), covering all
// 3 rounds of BOTH real multi-round properties seen live:
//   ann Sobieskiego 5/58 — flat ANNOUNCEMENT, bare/I przetarg (no ordinal in
//     title), 38,38 m², cena wywoławcza 260 000 zł, przetarg 11.07.2024;
//   ann Piłsudskiego 96/16 — flat ANNOUNCEMENT, II przetarg (ordinal IS in the
//     title), 50,37 m², cena wywoławcza 340 000 zł, przetarg 04.07.2024 — body
//     ALSO cites the prior "I przetarg … odbył się w dniu 24 kwietnia 2024 r."
//     (negative), using the SAME "w dniu <date>" phrasing as the upcoming
//     auction — the auction date must resolve to the future 2024-07-04, never
//     the past 2024-04-24;
//   ann Świętojańska 4, round III — built-property/office ANNOUNCEMENT
//     (zabudowana, not a lokal mieszkalny), 850,71 m², cena wywoławcza
//     3 900 000 zł, przetarg 29.07.2026 — title carries NO ordinal at all
//     ("Przetarg nieograniczony (licytacja) na sprzedaż zabudowanej
//     nieruchomości miejskiej…" — same generic wording for every round); body
//     cites TWO prior negative rounds (2025-12-19, 2026-04-09) via the same
//     "odbył się w dniu" phrasing, positioned AFTER the operative sentence;
//   ann Świętojańska 4, round I — title "Przetarg na sprzedaż nieruchomości
//     miejskiej przy ulicy Świętojańskiej 4" (again no ordinal), cena
//     wywoławcza 4 300 000 zł, przetarg 19.12.2025;
//   ann Świętojańska 4, round II — title "Przetarg na sprzedaż nieruchomości
//     przy ulicy Świętojańskiej 4" (again no ordinal), cena wywoławcza
//     4 300 000 zł, przetarg 09.04.2026.
//
// Reuses core/finn-bip.js body helpers. Siedlce-specific deviations under
// test: the apartment-number merge (detached "oznaczony Nr <n>" phrasing);
// the future-tense auction-date anchor (never let a narrated PRIOR round
// win); and the round detector (a title with NO ordinal must fall through to
// the body's "ogłasza <ordinal> przetarg" sentence — the first live refresh
// silently collapsed all 3 Świętojańska rounds to round 1 before this was
// fixed, because the shared finn-bip roundFromTitle defaults to 1 as soon as
// "przetarg" appears anywhere in the title, so a plain `?? ` fallback chain
// never actually reached the body).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  auctionDateFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/siedlce/parse.js';

// ---------------------------------------------------------------- title routing

test('title routing: sale announcement vs result notice vs noise', () => {
  assert.equal(
    isAnnouncementTitle(
      'Prezydent Miasta Siedlce ogłasza II przetarg nieograniczony(licytację) na sprzedaż lokalu mieszkalnego położonego w Siedlcach przy ulicy Józefa Piłsudskiego 96 oznaczonego Nr 16',
    ),
    true,
  );
  assert.equal(
    isAnnouncementTitle('Przetarg nieograniczony (licytacja) na sprzedaż zabudowanej nieruchomości miejskiej, położonej w Siedlcach przy ulicy Świętojańskiej 4'),
    true,
  );
  assert.equal(isAnnouncementTitle('Przetarg nieograniczony na wydzierżawienie gruntów komunalnych'), false); // dzierżawa, not sprzedaż
  assert.equal(isAnnouncementTitle('Ogłoszenie-przetarg na wynajem powierzchni reklamowych na wiatach przystankowych'), false); // najem
  assert.equal(isAnnouncementTitle('Przetarg na Centrum Przesiadkowe ogłoszony'), false); // no "sprzedaż" — infra procurement noise
  assert.equal(isResultTitle('Informacja o wyniku I przetargu nieograniczonego na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isResultTitle('Prezydent Miasta Siedlce ogłasza przetarg nieograniczony(licytację) na sprzedaż lokalu mieszkalnego'), false);
});

// ------------------------------------------------------------- date deviation

test('auctionDateFromText: future "odbędzie się … w dniu" wins over a narrated prior "odbył się … w dniu" round', () => {
  // Prior round mentioned FIRST (Piłsudskiego shape).
  const before =
    'I przetarg nieograniczony na w/w nieruchomość, który odbył się w dniu 24 kwietnia 2024 r. zakończył się wynikiem negatywnym. ' +
    'Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali 144 w dniu 4 lipca 2024r. o godz. 10.00.';
  assert.equal(auctionDateFromText(before), '2024-07-04');

  // Prior rounds mentioned AFTER the operative sentence (Świętojańska shape) — still correct.
  const after =
    'Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali nr 144, w dniu 29 lipca 2026 r. o godz. 9:00. ' +
    'Pierwszy przetarg nieograniczony na sprzedaż przedmiotowej nieruchomości odbył się w dniu 19 grudnia 2025 r. i zakończył się wynikiem negatywnym, ' +
    'drugi przetarg odbył się w dniu 9 kwietnia 2026 r. i również zakończył się wynikiem negatywnym.';
  assert.equal(auctionDateFromText(after), '2026-07-29');

  // No prior-round narration at all (Sobieskiego shape) — shared fallback still works.
  const plain = 'Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali 144 w dniu 11 lipca 2024 r. o godz. 9.00.';
  assert.equal(auctionDateFromText(plain), '2024-07-11');
});

// ---------------------------------------------------------------------- fixtures

const ANN_SOBIESKIEGO_TITLE =
  'Prezydent Miasta Siedlce ogłasza przetarg nieograniczony(licytację) na sprzedaż lokalu mieszkalnego położonego w Siedlcach przy ulicy Jana III Sobieskiego 5 oznaczonego Nr 58 z udziałem we współwłasności części domu oraz urządzeń, które nie służą do wyłącznego użytku właścicieli poszczególnych lokali oraz ułamkową częścią gruntu służącego do racjonalnego korzystania z budynku';

const ANN_SOBIESKIEGO_BODY = `
<p>Przedmiotem sprzedaży jest lokal mieszkalny, znajdujący się w Siedlcach w budynku przy ulicy Jana III Sobieskiego 5, oznaczony Nr 58, położony na parterze budynku, składający się z 3 izb, o pow. 38,38 m² wraz z udziałem we współwłasności części domu oraz urządzeń, które nie służą do wyłącznego użytku właścicieli poszczególnych lokali odpowiadający 3838/425985 częściom oraz ułamkową częścią gruntu wynoszącą 3838/425985 części udziału w działce Nr 32/25 obręb 36 o pow. 0,1091 ha, służącej do racjonalnego korzystania z budynku.</p>
<p><strong>- cena wywoławcza lokalu 260&nbsp;000,00 zł</strong></p>
<p><strong>- wadium&nbsp;&nbsp;26 000,00 zł,</strong></p>
<p><strong>- minimalne postąpienie&nbsp;&nbsp;2 600,00 zł.</strong></p>
<p><strong>Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali 144 w dniu 11 lipca 2024 r. o godz. 9.00.</strong></p>
<p>Informację dotyczącą lokalu można uzyskać w Siedleckim Towarzystwie Budownictwa Społecznego (tel. 25 644 95 62).</p>
`;

const ANN_PILSUDSKIEGO_TITLE =
  'Prezydent Miasta Siedlce ogłasza II przetarg nieograniczony(licytację) na sprzedaż lokalu mieszkalnego położonego w Siedlcach przy ulicy Józefa Piłsudskiego 96 oznaczonego Nr 16';

const ANN_PILSUDSKIEGO_BODY = `
<p>Przedmiotem sprzedaży jest lokal mieszkalny, położony w Siedlcach w budynku przy ulicy Józefa Piłsudskiego 96, oznaczony Nr 16, położony na III piętrze budynku, składający się z 3 izb, o pow. 50,37 m² wraz z udziałem we współwłasności części domu oraz urządzeń, które nie służą do wyłącznego użytku właścicieli poszczególnych lokali odpowiadający 5037/123077 częściom oraz ułamkową częścią gruntu wynoszącą 5037/123077 części udziału w działce Nr 46/2 obręb 46 o pow. 0,0484 ha, służącej do racjonalnego korzystania z budynku.</p>
<p>I przetarg nieograniczony na w/w nieruchomość, który odbył się w dniu 24 kwietnia 2024 r. zakończył się wynikiem negatywnym. Lokal nie został sprzedany.</p>
<p><strong>- cena wywoławcza lokalu 340&nbsp;000,00 zł</strong></p>
<p><strong>- wadium&nbsp;&nbsp;34 000,00 zł,</strong></p>
<p><strong>- minimalne postąpienie&nbsp;&nbsp;3 400,00 zł.</strong></p>
<p><strong>Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali 144 w dniu 4 lipca 2024r. o godz. 10.00.</strong></p>
`;

// REAL title (search-result/h2 heading) — deliberately carries NO ordinal and
// no "Prezydent Miasta Siedlce ogłasza" prefix, unlike the flat titles above.
// The ordinal ("III") only appears in the body's operative opening sentence.
const ANN_SWIETOJANSKA_TITLE =
  'Przetarg nieograniczony (licytacja) na sprzedaż zabudowanej nieruchomości miejskiej, położonej w Siedlcach przy ulicy Świętojańskiej 4';

const ANN_SWIETOJANSKA_BODY = `
<p><strong>Prezydent Miasta Siedlce ogłasza</strong> III przetarg nieograniczony (licytację) na sprzedaż <strong>zabudowanej nieruchomości miejskiej,</strong> położonej w <strong>Siedlcach</strong> przy ulicy <strong>Świętojańskiej 4</strong>, oznaczonej w ewidencji gruntów jako działka nr <strong>27/3</strong>, obręb nr <strong>48</strong>, o pow. <strong>0,2048 ha</strong>, ujawnionej w księdze wieczystej numer <strong>SI1S/00115618/4</strong>.</p>
<p><strong>- cena wywoławcza za nieruchomość&nbsp;- 3 900 000,00 zł</strong></p>
<p><strong>- wadium - 390 000,00 zł</strong></p>
<p><strong>- minimalne postąpienie - 39 000,00 zł</strong></p>
<p><strong>Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali nr 144, w dniu 29 lipca 2026 r. o godz. 9:00.</strong></p>
<p>Pierwszy przetarg nieograniczony na sprzedaż przedmiotowej nieruchomości odbył się w dniu 19 grudnia 2025 r. i zakończył się wynikiem negatywnym, drugi przetarg odbył się w dniu 9 kwietnia 2026 r. i również zakończył się wynikiem negatywnym.</p>
<p>Nieruchomość zabudowana jest dwukondygnacyjnym budynkiem o funkcji biurowej o powierzchni użytkowej 850,71 m<sup>2</sup>. Budynek wyposażony jest w instalację elektroenergetyczną, wodociągową, gazową, ciepłowniczą, kanalizację sanitarną i deszczową.</p>
`;

// Round I (first-ever notice for this property, published Nov 2025). Same
// generic no-ordinal title shape as round III above.
const ANN_SWIETOJANSKA_R1_TITLE = 'Przetarg na sprzedaż nieruchomości miejskiej przy ulicy Świętojańskiej 4';

const ANN_SWIETOJANSKA_R1_BODY = `
<p><strong>Prezydent Miasta Siedlce ogłasza&nbsp;</strong>I&nbsp;przetarg&nbsp;nieograniczony&nbsp;(licytację) na sprzedaż<strong>&nbsp;zabudowanej nieruchomości miejskiej,&nbsp;</strong>położonej w<strong>&nbsp;Siedlcach&nbsp;</strong>przy ulicy<strong>&nbsp;Świętojańskiej 4,&nbsp;</strong>oznaczonej w ewidencji gruntów jako działka nr&nbsp;<strong>27/3</strong>, obręb nr&nbsp;<strong>48</strong>, o pow.&nbsp;<strong>0,2048 ha</strong>.</p>
<p><strong>- cena wywoławcza za nieruchomość&nbsp;-&nbsp; 4&nbsp;300 000,00 zł</strong></p>
<p><strong>Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali nr 53, w dniu 19 grudnia 2025 r. o godz. 9:00.</strong></p>
`;

// Round II (published Mar 2026). Again a generic no-ordinal title.
const ANN_SWIETOJANSKA_R2_TITLE = 'Przetarg na sprzedaż nieruchomości przy ulicy Świętojańskiej 4';

const ANN_SWIETOJANSKA_R2_BODY = `
<p>Prezydent Miasta Siedlce ogłasza II przetarg nieograniczony (licytację) na sprzedaż <strong>zabudowanej nieruchomości miejskiej, </strong>położonej w<strong> Siedlcach </strong>przy ulicy<strong> Świętojańskiej 4</strong>, oznaczonej w ewidencji gruntów jako działka nr <strong>27/3</strong>, obręb nr <strong>48</strong>, o pow. <strong>0,2048 ha</strong>.</p>
<p><strong>- cena wywoławcza za nieruchomość 4&nbsp;300 000,00 zł</strong></p>
<p><strong>Przetarg odbędzie się w siedzibie Urzędu Miasta Siedlce, Skwer Niepodległości 2 w sali nr 144, w dniu 9 kwietnia 2026 r. o godz. 9:00.</strong></p>
`;

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: flat, bare/I przetarg — address (street+bldg+apt merge), area, price, auction date, round 1', () => {
  const rec = parseAnnouncement(ANN_SOBIESKIEGO_TITLE, ANN_SOBIESKIEGO_BODY, 'https://siedlce.pl/aktualnosci/2024/aktualnosci-06-2024/...-sobieskiego-5-oznaczonego-nr-58...');
  assert.ok(rec, 'a record is returned');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Jana III Sobieskiego 5/58');
  assert.equal(rec.address.street, 'Jana III Sobieskiego');
  assert.equal(rec.address.building, '5');
  assert.equal(rec.address.apt, '58');
  assert.equal(rec.area_m2, 38.38);
  assert.equal(rec.starting_price_pln, 260000);
  assert.equal(rec.auction_date, '2024-07-11');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: flat, II przetarg — apt merge, area, price, auction date NOT the narrated prior round, round 2', () => {
  const rec = parseAnnouncement(ANN_PILSUDSKIEGO_TITLE, ANN_PILSUDSKIEGO_BODY, 'https://siedlce.pl/aktualnosci/2024/aktualnosci-06-2024/...-pilsudskiego-96-oznaczonego-nr-16');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Józefa Piłsudskiego 96/16');
  assert.equal(rec.address.building, '96');
  assert.equal(rec.address.apt, '16');
  assert.equal(rec.area_m2, 50.37);
  assert.equal(rec.starting_price_pln, 340000);
  assert.equal(rec.auction_date, '2024-07-04'); // NOT '2024-04-24' (the prior negative I przetarg)
  assert.equal(rec.round, 2);
});

test('parseAnnouncement: built/office property (zabudowana, not mieszkalny), round III — title has NO ordinal, round must come from the body', () => {
  const rec = parseAnnouncement(ANN_SWIETOJANSKA_TITLE, ANN_SWIETOJANSKA_BODY, 'https://siedlce.pl/aktualnosci/2026/05-2026/...-swietojanskiej-4');
  assert.ok(rec);
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.street, 'Świętojańskiej');
  assert.equal(rec.address.building, '4');
  assert.equal(rec.address.apt, null);
  assert.equal(rec.area_m2, 850.71);
  assert.equal(rec.starting_price_pln, 3900000);
  assert.equal(rec.auction_date, '2026-07-29'); // NOT either narrated-negative prior round
  assert.equal(rec.round, 3); // NOT 1 — regression check for the title-has-no-ordinal bug
});

test('parseAnnouncement: same property, round I — no-ordinal title, no prior-round narration in body', () => {
  const rec = parseAnnouncement(ANN_SWIETOJANSKA_R1_TITLE, ANN_SWIETOJANSKA_R1_BODY, 'https://siedlce.pl/aktualnosci/2025/aktulnosci-11-2025/...-swietojanskiej-4');
  assert.ok(rec);
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.starting_price_pln, 4300000);
  assert.equal(rec.auction_date, '2025-12-19');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: same property, round II — no-ordinal title, round read from "ogłasza II przetarg"', () => {
  const rec = parseAnnouncement(ANN_SWIETOJANSKA_R2_TITLE, ANN_SWIETOJANSKA_R2_BODY, 'https://siedlce.pl/aktualnosci/2026/03-2026/...-swietojanskiej-4');
  assert.ok(rec);
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.starting_price_pln, 4300000);
  assert.equal(rec.auction_date, '2026-04-09');
  assert.equal(rec.round, 2); // NOT 1 — this is exactly the bug the first live refresh hit
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: no online achieved-price stream — always returns []', () => {
  assert.deepEqual(parseResultDoc('anything', null, 'https://siedlce.pl/x'), []);
});
