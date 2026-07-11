// Głubczyce parser tests. Fixtures are condensed-but-faithful copies of the REAL
// catdoc / pdftotext TEXT of live attachments fetched from bip.glubczyce.pl
// (verified 2026-07-11 from this Pi). Every sentence that feeds a parsed field
// (address, area, price, date, round, kind, outcome) is kept EXACT; trimmed are
// the long legal/procedural boilerplate AND the short binary-garbage runs that
// catdoc emits for embedded OLE objects. The parser was separately confirmed to
// produce these same values on the FULL un-trimmed catdoc output (garbage and
// all), so trimming the garbage here changes nothing.
//
// TWO real quirks are pinned as regression fixtures:
//   * ANNOUNCEMENTS carry a prior-round RECAP ("… zakończył się wynikiem
//     negatywnym … nikt nie przystąpił do przetargu") — this is the PREVIOUS
//     round's outcome, not this notice; it must not flip the notice to a "result"
//     nor corrupt its round/date. And the standing "zastrzega sobie prawo
//     odwołania przetargu" clause (on every notice) must NOT read as a cancelled
//     auction.
//   * RESULT flat docs OMIT the street (body says only "lokal mieszkalny nr N" +
//     the księga-wieczysta number); the street+building come from the attachment
//     FILENAME slug, the apt from the body. catdoc sometimes eats a result's
//     "cena wywoławcza" number (→ starting price null, but the achieved price is
//     reliable) — pinned by the Chrobrego 10/8 and Dębrzyca fixtures.
//
// Groundtruth (hand-verified against the live documents):
//   ANNOUNCEMENT  /download/attachment/28744  ul. Bolesława Chrobrego 2 lok. 4,
//     flat, II przetarg, 88,87 m², cena 86 838,50 zł, auction 2026-06-30
//   RESULT sold   /download/attachment/27989  B. Chrobrego 10/8, flat, I przetarg,
//     49,70 m², achieved 92 540,50 zł (buyer named), 2026-01-20 — starting garbled
//   RESULT sold   /download/attachment/27990  Gdańska 24/7, flat, I przetarg,
//     42,10 m², wywoławcza 53 906,50 → achieved 106 000 zł, 2026-01-20
//   RESULT neg.   /download/attachment/28452  Braciszów 34, house (zabudowana),
//     I przetarg, 92,13 m², wywoławcza 100 000 zł, "nikt nie przystąpił", 2026-04-21
//   RESULT sold   /download/attachment/28361  Dębrzyca dz. 320/1, land (grunt),
//     II przetarg, achieved 113 000 zł, 2026-03-26 — starting garbled

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  romanToInt,
  roundFromText,
  isResultNotice,
  isSaleAnnouncement,
  startingPriceAnnouncement,
  startingPriceResult,
  achievedPriceFromText,
  outcomeFromText,
  addressFromFilename,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/glubczyce/parse.js';

// ------------------------------------------------------------------- fixtures

const O = 'https://bip.glubczyce.pl/download/attachment/';

// ANNOUNCEMENT — flat, ul. Bolesława Chrobrego 2 lok. 4, II przetarg. The price
// uses a NBSP (U+00A0) thousands separator, exactly as catdoc renders it. Keeps
// the prior-round negative recap and the standing "prawo odwołania" clause as
// traps; the wadium "26 czerwca" date is a trap against the auction "30 czerwca".
const ANN_CHROBREGO = `RPiR.0050.2.12.2026.MWB\t\t\tGłubczyce, dnia 2 czerwca 2026 r.

O G Ł O S Z E N I E

Burmistrz Głubczyc, zgodnie z § 3 ust. 1 Rozporządzenia Rady Ministrów z 14 września 2004 r. oraz Zarządzeniem nr 685/25 Burmistrza Głubczyc z dnia 21 października 2025 r. w sprawie sprzedaży lokalu mieszkalnego wraz z ułamkową częścią gruntu, stanowiącego własność Gminy Głubczyce, ogłasza:

II przetarg ustny nieograniczony

w sprawie zbycia niżej wymienionej nieruchomości:

OP1G/00018779/7\tdziałka nr 274/62 udział w gruncie 2360/10000\t0,0346 ha\tul. Bolesława Chrobrego 2, Głubczyce\tLokal mieszkalny nr 4 położony jest na poddaszu budynku mieszkalnego, wielorodzinnego. Powierzchnia użytkowa lokalu to 88,87 m2. Nabywca lokalu korzystać będzie z pomieszczenia piwnicy o powierzchni16,98 m2. Lokal przeznaczony do kapitalnego remontu.\t86 838,50 zł\t8 500 zł\tsprzedaż w formie przetargu nieograniczonego

I przetarg zakończył się wynikiem negatywnym z uwagi na to, iż nikt nie przystąpił do przetargu.

Przetarg dotyczący zbycia przedmiotowej nieruchomości odbędzie się w dniu 30 czerwca 2026 r. o godzinie 10.00 w siedzibie Urzędu Miejskiego w Głubczycach ul. Niepodległości 14 (pokój nr 22 lub nr 23).

W przetargu mogą brać udział osoby prawne i osoby fizyczne, jeżeli najpóźniej w dniu 26 czerwca 2026 r. wniosą wadium w kwocie 8 500,00 zł na konto tut. Urzędu.

Burmistrz Głubczyc zastrzega sobie prawo odwołania przetargu z ważnych powodów.`;

// RESULT sold flat — Gdańska 24/7. Street ONLY in the filename; body has the apt
// ("lokal mieszkalny nr 7"), the wywoławcza (53 906,50) and the achieved (106 000).
const RES_GDANSKA = `Głubczyce, dnia 26 stycznia 2026 r.

Informacja o wyniku przetargu

Burmistrz Głubczyc stosownie do § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. podaje do publicznej wiadomości wynik przeprowadzonego w dniu 20 stycznia 2026 r. w siedzibie Urzędu Miejskiego w Głubczycach I przetargu ustnego nieograniczonego.

1.\tPrzedmiotem sprzedaży był lokal mieszkalny nr 7 położony jest na I piętrze budynku mieszkalnego, wielorodzinnego. Powierzchnia użytkowa lokalu to 42,10 m2. Do lokalu przynależą pomieszczenia gospodarcze w postaci piwnicy o powierzchni 6,50 m2 oraz jedno pomieszczenie strychowe o powierzchni użytkowej 5,60 m2. Zapisany jest w księdze wieczystej nr OP1G/00023411/8 jako współwłasność Gminy Głubczyce.

#Cena wywoławcza przedmiotowej nieruchomości do I przetargu ustnego nieograniczonego wynosiła 53 906,50 zł (słownie: pięćdziesiąt trzy tysiące dziewięćset sześć złotych pięćdziesiąt groszy) netto.

5.\tNajwyższa cena osiągnięta w przetargu wyniosła 106 000 zł (słownie: sto sześć tysięcy złotych).

6.\tNabywcą przedmiotowej nieruchomości została Anna Mstowska.`;

// RESULT sold flat — B. Chrobrego 10/8. catdoc ATE the "cena wywoławcza" number
// (only the słownie tail survives), so starting price is legitimately null; the
// achieved price (92 540,50) is intact.
const RES_CHROBREGO = `Głubczyce, dnia 26 stycznia 2026 r.

Informacja o wyniku przetargu

Burmistrz Głubczyc stosownie do § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. podaje do publicznej wiadomości wynik przeprowadzonego w dniu 20 stycznia 2026 r. w siedzibie Urzędu Miejskiego w Głubczycach I przetargu ustnego nieograniczonego.

1.\tPrzedmiotem sprzedaży był lokal mieszkalny nr 8 położony jest na II piętrze budynku mieszkalnego, wielorodzinnego. Powierzchnia użytkowa lokalu to 49,70 m2. Do lokalu przynależą pomieszczenia gospodarcze w postaci piwnicy o powierzchni 5,20 m2 oraz dwa pomieszczenia strychowe o powierzchni użytkowej 3,80 m2 i 8,50 m2. Zapisany jest w księdze wieczystej nr OP1G/00038071/0 jako współwłasność Gminy Głubczyce.

' złotych pięćdziesiąt groszy) netto.

5.\tNajwyższa cena osiągnięta w przetargu wyniosła 92 540,50 zł (słownie: dziewięćdziesiąt dwa tysiące pięćset czterdzieści złotych pięćdziesiąt groszy).

6.\tNabywcą przedmiotowej nieruchomości zostali małżonkowie Ewa i Radosław Wysoczańscy.`;

// RESULT negative house — Braciszów 34 (zabudowana). Body carries the location
// ("położona w Braciszowie nr 34") and the wywoławcza; outcome is negative.
const RES_BRACISZOW = `Głubczyce, dnia 21 kwietnia 2026 r.

Informacja o wyniku przetargu

Burmistrz Głubczyc stosownie do § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. podaje do publicznej wiadomości wynik przeprowadzonego w dniu 21 kwietnia 2026 r. w siedzibie Urzędu Miejskiego w Głubczycach I przetargu ustnego nieograniczonego.

1.\tPrzedmiotem sprzedaży była nieruchomość zabudowana położona w Braciszowie nr 34, obejmująca działkę nr 225/1 o powierzchni 0,0291 ha. Budynek mieszkalny jednorodzinny wolnostojący, dwukondygnacyjny z poddaszem. Powierzchnia użytkowa 92,13 m2.

2.\tCena wywoławcza przedmiotowej nieruchomości do I przetargu ustnego nieograniczonego wynosiła 100 000 zł (słownie: sto tysięcy złotych).

4.\tPrzetarg zakończył się wynikiem negatywnym z uwagi na to, iż nikt nie przystąpił do przetargu.`;

// RESULT sold land — Dębrzyca dz. 320/1 (grunt). Body has street ("przy ul.
// Zielonej 32") + parcel; catdoc ate the wywoławcza (starting null); achieved 113 000.
const RES_DEBRZYCA = `Głubczyce, dnia 7 kwietnia 2026 r.

Informacja o wyniku przetargu

Burmistrz Głubczyc stosownie do § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. podaje do publicznej wiadomości wynik przeprowadzonego w dniu 26 marca 2026 r. w siedzibie Urzędu Miejskiego w Głubczycach II przetargu ustnego nieograniczonego.

1.\tPrzedmiotem sprzedaży była nieruchomość położona w Debrzycy przy ul. Zielonej 32, obejmująca działkę nr 320/1 o powierzchni 0,2800 ha. Nieruchomość obejmująca działkę nr 320/1 położona jest w centralnej strefie miejscowości Debrzyca.

*(słownie: pięćdziesiąt siedem tysięcy osiemset dwadzieścia pięć złotych jedenaście groszy).

5.\tNajwyższa cena osiągnięta w przetargu wyniosła 113 000 zł (słownie: sto trzynaście tysięcy złotych).

6.\tNabywcą przedmiotowej nieruchomości zostali małżonkowie Maciej i Anna Konik.`;

// --------------------------------------------------------------- unit helpers

test('romanToInt: additive + subtractive numerals', () => {
  assert.equal(romanToInt('I'), 1);
  assert.equal(romanToInt('II'), 2);
  assert.equal(romanToInt('IV'), 4);
  assert.equal(romanToInt('VI'), 6);
  assert.equal(romanToInt('XIV'), 14);
  assert.equal(romanToInt('foo'), null);
});

test('roundFromText: Roman qualifier of "przetarg … ustn…" in both notice styles', () => {
  assert.equal(roundFromText('ogłasza:\nII przetarg ustny nieograniczony'), 2); // announcement
  assert.equal(roundFromText('wynik … I przetargu ustnego nieograniczonego.'), 1); // result (genitive)
  // The conjunction "i" (lower-case) must never be read as Roman 1.
  assert.equal(roundFromText('sprzedaży i oddania w … III przetarg ustny'), 3);
});

test('isResultNotice: header decides — an announcement reciting "wynikiem negatywnym" is NOT a result', () => {
  assert.equal(isResultNotice(RES_GDANSKA), true);
  assert.equal(isResultNotice(ANN_CHROBREGO), false); // has "wynikiem negatywnym" recap, but no result header
});

test('isSaleAnnouncement: keeps the sale notice; the standing "prawo odwołania" clause is not a cancellation', () => {
  assert.equal(isSaleAnnouncement(ANN_CHROBREGO), true);
  assert.equal(isSaleAnnouncement('Ogłoszenie o odwołaniu przetargu na sprzedaż nieruchomości'), false);
  assert.equal(isSaleAnnouncement('Wykaz nieruchomości przeznaczonych do oddania w dzierżawę'), false);
});

test('prices: NBSP + space thousands, grosze dropped to integer PLN', () => {
  assert.equal(startingPriceAnnouncement(ANN_CHROBREGO), 86838); // "86 838,50 zł" (not the 8 500 wadium)
  assert.equal(startingPriceResult(RES_GDANSKA), 53906);         // "wynosiła 53 906,50 zł"
  assert.equal(startingPriceResult(RES_BRACISZOW), 100000);      // "wynosiła 100 000 zł"
  assert.equal(achievedPriceFromText(RES_GDANSKA), 106000);      // "wyniosła 106 000 zł"
  // catdoc ate the wywoławcza number → null, and MUST NOT fall through to the achieved price.
  assert.equal(startingPriceResult(RES_CHROBREGO), null);
  assert.equal(startingPriceResult(RES_DEBRZYCA), null);
});

test('outcomeFromText: sold when achieved present; "nikt nie przystąpił" → unsold', () => {
  assert.deepEqual(outcomeFromText(RES_GDANSKA, 106000), { outcome: 'sold', unsold_reason: null });
  assert.deepEqual(outcomeFromText(RES_BRACISZOW, null), { outcome: 'unsold', unsold_reason: 'no_participants' });
});

test('addressFromFilename: recovers street+building from the result slug, apt from the body', () => {
  const a = addressFromFilename(`${O}27990/gdanska-24_7-1p-2026-01-28.doc`, '7');
  assert.equal(a.address.street, 'Gdanska');
  assert.equal(a.address.building, '24');
  assert.equal(a.address.apt, '7');
  assert.equal(a.address.key, 'gdanska|24|7');
});

// --------------------------------------------------------- parseAnnouncement

test('parseAnnouncement: Chrobrego 2/4 flat — address/area/price/date/round from the body table; recap + wadium-date traps ignored', () => {
  const r = parseAnnouncement(ANN_CHROBREGO, `${O}28744/12-bchrobrego-2_4.doc`);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Bolesława Chrobrego');
  assert.equal(r.address.building, '2');
  assert.equal(r.address.apt, '4');
  assert.equal(r.address.key, 'boleslawa chrobrego|2|4');
  assert.equal(r.area_m2, 88.87);        // the flat's użytkowa, NOT the 16,98 piwnica
  assert.equal(r.starting_price_pln, 86838);
  assert.equal(r.auction_date, '2026-06-30'); // "odbędzie się", not the 26 czerwca wadium date
  assert.equal(r.round, 2);
});

test('parseAnnouncement: a result notice is not parsed as an announcement (header gate)', () => {
  // The result header is not a sale-announcement; parseAnnouncement must decline.
  assert.equal(parseAnnouncement(RES_GDANSKA, `${O}27990/x.doc`), null);
});

// ----------------------------------------------------------- parseResultDoc

test('parseResultDoc: Gdańska 24/7 SOLD flat — street from filename, apt/area/prices from body', () => {
  const [r] = parseResultDoc(RES_GDANSKA, null, `${O}27990/gdanska-24_7-1p-2026-01-28.doc`);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'gdanska|24|7');
  assert.equal(r.area_m2, 42.1);         // flat's użytkowa, not the 6,50 piwnica / 5,60 strych
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 53906);
  assert.equal(r.final_price_pln, 106000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2026-01-20'); // "przeprowadzonego w dniu", not the publication date
  assert.equal(r.source_pdf, `${O}27990/gdanska-24_7-1p-2026-01-28.doc`);
});

test('parseResultDoc: B. Chrobrego 10/8 SOLD flat — garbled wywoławcza → starting null (never the achieved price), key joins its announcement', () => {
  const [r] = parseResultDoc(RES_CHROBREGO, null, `${O}27989/boleslawa-chrobrego-10_8-1p-2026-01-28.doc`);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'boleslawa chrobrego|10|8'); // normalises to match the announcement body's key
  assert.equal(r.area_m2, 49.7);
  assert.equal(r.starting_price_pln, null);
  assert.equal(r.final_price_pln, 92540);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-01-20');
  assert.ok(r.notes.includes('parse: missing/garbled starting price'));
});

test('parseResultDoc: Braciszów 34 NEGATIVE house (zabudowana) — body location + area, no achieved price, "nikt nie przystąpił"', () => {
  const [r] = parseResultDoc(RES_BRACISZOW, null, `${O}28452/braciszow-225_1-1p-2026-04-21.doc`);
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.building, '34'); // from body "położona w Braciszowie nr 34", NOT the parcel 225/1
  assert.equal(r.area_m2, 92.13);
  assert.equal(r.starting_price_pln, 100000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_participants');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-04-21');
});

test('parseResultDoc: Dębrzyca dz. 320/1 SOLD land (grunt) — parcel-keyed, achieved price, garbled starting', () => {
  const [r] = parseResultDoc(RES_DEBRZYCA, null, `${O}28361/debrzyca-320_1-2p.doc`);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '320/1');
  assert.equal(r.area_m2, 2800);         // 0,2800 ha × 10000
  assert.equal(r.starting_price_pln, null);
  assert.equal(r.final_price_pln, 113000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-03-26');
});

test('parseResultDoc: empty / non-result input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(ANN_CHROBREGO, null, `${O}28744/x.doc`), []); // announcement, not a result
});
