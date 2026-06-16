// Świętochłowice parser tests. The field extractors are the shared finn-bip
// parsers (covered by parse-myslowice.test.js); here we test the
// Świętochłowice-specific Liferay index parsing — link harvesting, the
// announcement/notice filter, address-from-title — plus price/area/date over a
// fixture reproducing the catdoc text of a real .doc announcement. Fixtures match
// the live BIP (June 2026, rendered-DOM spike + parser dry-run): the filter kept
// 21 real announcements and dropped 30 notices across 5 archive pages with no
// unkeyable entries.
//
// Land tests (HL-27): sibling boards /bipkod/003/010/003 (houses + land) and
// /bipkod/42668516 (commercial + garages) are now crawled. isAuctionAnnouncement
// is the generic filter for these boards; classifyKind routes grunt → land[].
// parseLandAnnouncement (from finn-bip.js) is used for body parsing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDocLinks,
  isFlatAnnouncement,
  isAuctionAnnouncement,
  classifyKind,
  parseLandAnnouncement,
  addressFrom,
  roundFromTitle,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  isFlatResultNotice,
  parseResultDoc,
} from '../src/cities/swietochlowice/parse.js';

const ORIGIN = 'https://www.bip.swietochlowice.pl';

test('isFlatAnnouncement keeps auction announcements, drops notices/annexes', () => {
  // real announcement titles (kept)
  assert.equal(isFlatAnnouncement('I przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego przy ul. Powstańców Śl. 8/20'), true);
  assert.equal(isFlatAnnouncement('Ogłoszenie ws III przetargu na sprzedaż lokalu mieszkalnego przy ul. Katowickiej 45a/7'), true);
  assert.equal(isFlatAnnouncement('Ogłoszenie ws II przetargu na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego przy ul. Polaka 7/6'), true);
  // notices / intents / annex (dropped)
  assert.equal(isFlatAnnouncement('Informacja o wyniku z III przetargu na sprzedaż lokalu mieszkalnego przy ul. Polaka 7/6'), false);
  assert.equal(isFlatAnnouncement('Informacja o odwołaniu III przetargu ws sprzedaży lokalu mieszkalnego przy ul. Wiśniowej 15a/5'), false);
  assert.equal(isFlatAnnouncement('Zamiar sprzedaży w drodze przetargu lokalu mieszkalnego przy ul. Katowickiej 20/6'), false);
  assert.equal(isFlatAnnouncement('załącznik I przetarg KW Powstańców Śląskich 8-20.docx'), false);
});

test('parseDocLinks harvests (title,url) pairs for /res/serwisy/pliki/ links', () => {
  const html =
    '<div class="article-title"><a href="/res/serwisy/pliki/43606181?version=1.0">' +
    'I przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego przy ul. Powstańców Śl. 8/20</a></div>' +
    '<div><a href="/res/serwisy/pliki/43606194">załącznik I przetarg KW Powstańców Śląskich 8-20.docx</a></div>' +
    '<a href="/bipkod/29287911">nav</a>';
  const links = parseDocLinks(html, ORIGIN);
  assert.equal(links.length, 2);
  assert.equal(links[0].url, ORIGIN + '/res/serwisy/pliki/43606181');
  assert.match(links[0].title, /^I przetarg ustny/);
  // the announcement passes the flat filter; the KW annex doesn't
  assert.deepEqual(
    links.filter((l) => isFlatAnnouncement(l.title)).map((l) => l.url),
    [ORIGIN + '/res/serwisy/pliki/43606181'],
  );
});

test('addressFrom keys the announcement title (street then bldg/apt)', () => {
  assert.equal(addressFrom('I przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego przy ul. Powstańców Śl. 8/20', '').address.key, 'powstancow sl|8|20');
  assert.equal(addressFrom('Ogłoszenie ws III przetargu na sprzedaż lokalu mieszkalnego przy ul. Katowickiej 45a/7', '').address.key, 'katowickiej|45A|7');
  assert.equal(addressFrom('Ogłoszenie ws II przetargu na sprzedaż lokalu mieszkalnego przy ul. Wyzwolenia 51/5', '').address.key, 'wyzwolenia|51|5');
});

test('roundFromTitle reads the round from "ws III przetargu" / "I przetarg"', () => {
  assert.equal(roundFromTitle('I przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego'), 1);
  assert.equal(roundFromTitle('Ogłoszenie ws II przetargu na sprzedaż lokalu mieszkalnego'), 2);
  assert.equal(roundFromTitle('Ogłoszenie ws III przetargu na sprzedaż lokalu mieszkalnego'), 3);
});

// catdoc-style plain text of a real .doc announcement body (price/area/date).
const DOC_TEXT =
  'Prezydent Miasta Świętochłowice ogłasza I publiczny przetarg ustny nieograniczony ' +
  'na sprzedaż wolnego lokalu mieszkalnego nr 20 położonego w budynku przy ul. Powstańców Śląskich 8. ' +
  'Lokal o powierzchni użytkowej 38,60 m2 wraz z udziałem w gruncie o pow. 512 m2. ' +
  'Cena wywoławcza nieruchomości lokalowej wynosi 95 000,00 zł. ' +
  'Przetarg odbędzie się w dniu 18 czerwca 2026 r. o godz. 9.00 w sali 114 Urzędu Miejskiego.';

test('doc-body extractors: price / area / date', () => {
  assert.equal(priceFromText(DOC_TEXT), 95000);
  assert.equal(areaFromText(DOC_TEXT), 38.6); // flat area, not the 512 m² plot
  assert.equal(auctionDateFromText(DOC_TEXT), '2026-06-18');
});

// The REAL Świętochłowice operative sentence uses the ACCUSATIVE label
// ("Cenę wywoławczą … ustala się na kwotę …") — across all 106 cached .docs
// the nominative-only regex matched 0 of them (June 2026 fix). Sample below
// condensed from the live "Powstańców Śląskich 8/20" announcement.
test('priceFromText: declined "Cenę wywoławczą … na kwotę" (Świętochłowice .docs)', () => {
  assert.equal(
    priceFromText('Cenę wywoławczą do pierwszego przetargu ustala się na kwotę 195 000,00 zł.'),
    195000,
  );
  assert.equal(
    priceFromText('Cenę wywoławczą sprzedaży nieruchomości lokalowej ustala się na kwotę 141 000,00 zł.'),
    141000,
  );
  // Boilerplate "1% ceny wywoławczej, z zaokrągleniem …" must not produce a price.
  assert.equal(
    priceFromText('postąpienie nie może wynosić mniej niż 1% ceny wywoławczej, z zaokrągleniem w górę do pełnych dziesiątek złotych'),
    null,
  );
});

test('auctionDateFromText: nominative month typo "17 styczeń 2024"', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w dniu 17 styczeń 2024 roku o godzinie 0900 w Urzędzie Miejskim'),
    '2024-01-17',
  );
});

// -------------- result notices ("Informacja o wyniku …" PDFs) --------------
// Real archive titles (June 2026). The body fixture is synthetic in the
// standard vocabulary — validate against real PDFs on the first CI run.

test('isFlatResultNotice keeps flat results, drops cancellations/announcements', () => {
  assert.equal(isFlatResultNotice('Informacja o wyniku z III przetargu na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego przy ul. Polaka 7/6 w Świętochłowicach.'), true);
  assert.equal(isFlatResultNotice('Informacja o wyniku z III przetargu ws sprzedaży lokalu mieszkalnego przy ul. Wiśniowej 15a/5 w Świętochłowicach.'), true);
  assert.equal(isFlatResultNotice('Informacja o odwołaniu III przetargu ws sprzedaży lokalu mieszkalnego przy ul. Wyzwolenia 51/5 w Świętochłowicach'), false);
  assert.equal(isFlatResultNotice('Ogłoszenie ws III przetargu na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego przy ul. Polaka 7/6 w Świętochłowicach.'), false);
  assert.equal(isFlatResultNotice('Zamiar sprzedaży w drodze przetargu lokalu mieszkalnego przy ul. Katowickiej 20/6 w Świętochłowicach.'), false);
});

const RES_TITLE = 'Informacja o wyniku z III przetargu ws sprzedaży lokalu mieszkalnego przy ul. Wiśniowej 15a/5 w Świętochłowicach.';

test('parseResultDoc: sold record (title key + round, body date + prices)', () => {
  const recs = parseResultDoc(
    `${RES_TITLE}\nPrezydent Miasta Świętochłowice informuje, że w dniu 16.04.2026 r. odbył się trzeci przetarg ustny nieograniczony. Cenę wywoławczą ustalono na kwotę 95 000,00 zł. W przetargu osiągnięto najwyższą cenę w wysokości 101 000,00 zł. Nabywcą została osoba fizyczna.`,
    null, 'u/43281345',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'wisniowej|15A|5');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-04-16');
  assert.equal(r.starting_price_pln, 95000);
  assert.equal(r.final_price_pln, 101000);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: negative result / undeterminable body', () => {
  const neg = parseResultDoc(
    RES_TITLE + '\nw dniu 16.04.2026 r. przetarg zakonczyl sie wynikiem negatywnym. Cena 95 000,00 zl.',
    null, 'u',
  )[0];
  assert.equal(neg.outcome, 'unsold');
  assert.equal(neg.final_price_pln, null);
  assert.deepEqual(parseResultDoc(RES_TITLE + '\ntresc bez wyniku', null, 'u'), []);
});

// ---- Sibling board: isAuctionAnnouncement + land (HL-27) ----

test('isAuctionAnnouncement: keeps przetarg/sprzedaz, drops notices/intents/wykaz', () => {
  assert.equal(isAuctionAnnouncement('I przetarg na sprzedaz niezabudowanej ul. Bytomska'), true);
  assert.equal(isAuctionAnnouncement('II przetarg na sprzedaz nieruchomosci zabudowanej'), true);
  assert.equal(isAuctionAnnouncement('I przetarg na sprzedaz lokalu uzytkowego nr 1'), true);
  assert.equal(isAuctionAnnouncement('Informacja o wyniku przetargu nieruchomosci'), false);
  assert.equal(isAuctionAnnouncement('Zamiar sprzedazy nieruchomosci ul. Bytomska'), false);
  assert.equal(isAuctionAnnouncement('Wykaz nieruchomosci przeznaczonych do sprzedazy'), false);
  assert.equal(isAuctionAnnouncement('zalacznik I przetarg KW nieruchomosc.docx'), false);
});

test('classifyKind: routes sibling-board titles correctly', () => {
  assert.equal(classifyKind('I przetarg na sprzedaz niezabudowanej ul. Bytomska'), 'grunt');
  assert.equal(classifyKind('II przetarg na sprzedaz nieruchomosci zabudowanej ul. Polaka'), 'zabudowana');
  assert.equal(classifyKind('I przetarg na sprzedaz lokalu uzytkowego nr 1'), 'uzytkowy');
  assert.equal(classifyKind('I przetarg na sprzedaz lokalu mieszkalnego nr 20'), 'mieszkalny');
});

const LAND_TITLE_SW = 'I przetarg na sprzedaz nieruchomosci niezabudowanej ul. Bytomska.';
const LAND_BODY_SW =
  'Oglasza przetarg na sprzedaz dzialki nr 624/5 o powierzchni 820 m2, ' +
  'obreb Centrum, ul. Bytomska w Swietochlowicach. ' +
  'Cena wywolawcza nieruchomosci wynosi 185 000,00 zl. ' +
  'Przetarg odbedzie sie w dniu 10 wrzesnia 2026 r.';
const LAND_URL_SW = 'https://www.bip.swietochlowice.pl/res/serwisy/pliki/44001234';

test('parseLandAnnouncement: Swietochlowice land body (catdoc text in <p>)', () => {
  const r = parseLandAnnouncement(LAND_TITLE_SW, '<p>' + LAND_BODY_SW + '</p>', LAND_URL_SW);
  assert.ok(r, 'should return a land record');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '624/5');
  assert.ok(r.obreb && /centrum/i.test(r.obreb), 'obreb: ' + r.obreb);
  assert.equal(r.area_m2, 820);
  assert.equal(r.starting_price_pln, 185000);
  assert.equal(r.auction_date, '2026-09-10');
  assert.equal(r.round, 1);
  assert.equal(r.detail_url, LAND_URL_SW);
});

test('parseLandAnnouncement: null when unkeyable', () => {
  assert.equal(parseLandAnnouncement(
    'Przetarg na sprzedaz gruntu.',
    '<p>Tresc bez dzialki i bez ulicy.</p>',
    'https://www.bip.swietochlowice.pl/res/serwisy/pliki/99',
  ), null);
});

test('isFlatAnnouncement: no regression (HL-27)', () => {
  assert.equal(isFlatAnnouncement('I przetarg na sprzedaz lokalu mieszkalnego ul. Powstancow 8/20'), true);
  assert.equal(isFlatAnnouncement(LAND_TITLE_SW), false);
});

// ---- Terse land title → unknown-by-title → body re-classify (coverage fix) ----
// The city titles most land sales tersely ("…na sprzedaż nieruchomości – ul. X"),
// with no niezabudowanej/działka word. classifyKind(title) → 'unknown', and the
// sibling-board loop previously had no branch for 'unknown', so the auction was
// dropped and land.json stayed empty despite live land (e.g. ul. Lotnicza
// 11,98 ha). crawl.js now fetches the body and re-classifies on title + body,
// then routes resolved grunt → parseLandAnnouncement. These tests cover that
// title-only-vs-title+body decision and the land body parse.

const TERSE_LAND_TITLE_SW =
  'I przetarg ustny nieograniczony na sprzedaż nieruchomości – ul. Lotnicza';
const TERSE_LAND_BODY_SW =
  'Prezydent Miasta Świętochłowice ogłasza I przetarg ustny nieograniczony na ' +
  'sprzedaż nieruchomości niezabudowanej, oznaczonej jako działka nr 1234/56 ' +
  'o powierzchni 11,98 ha, obręb 0005 Lipiny, położonej przy ul. Lotniczej w ' +
  'Świętochłowicach. Cenę wywoławczą ustala się na kwotę 3 200 000,00 zł. ' +
  'Przetarg odbędzie się w dniu 15 września 2026 r. o godz. 10.00.';
const TERSE_LAND_URL_SW = 'https://www.bip.swietochlowice.pl/res/serwisy/pliki/44009999';

test('terse land: title alone is unknown, title+body resolves grunt', () => {
  // The auction gate still passes (przetarg + sprzedaż, not a notice/intent).
  assert.equal(isAuctionAnnouncement(TERSE_LAND_TITLE_SW), true);
  // Title alone can't classify the kind …
  assert.equal(classifyKind(TERSE_LAND_TITLE_SW), 'unknown');
  // … but the body carries "niezabudowanej"/"działka", so title+body → grunt
  // (this is exactly the re-classify crawl.js performs before routing).
  assert.equal(classifyKind(`${TERSE_LAND_TITLE_SW} ${TERSE_LAND_BODY_SW}`), 'grunt');
});

test('terse land: parseLandAnnouncement extracts parcel/area(ha)/price/date', () => {
  const r = parseLandAnnouncement(TERSE_LAND_TITLE_SW, `<p>${TERSE_LAND_BODY_SW}</p>`, TERSE_LAND_URL_SW);
  assert.ok(r, 'terse land must produce a keyable land record');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1234/56');
  assert.equal(r.area_m2, 119800); // 11,98 ha → 119800 m²
  assert.equal(r.starting_price_pln, 3200000);
  assert.equal(r.auction_date, '2026-09-15');
  assert.equal(r.round, 1);
  assert.equal(r.detail_url, TERSE_LAND_URL_SW);
});
