// Świętochłowice parser tests. The field extractors are the shared finn-bip
// parsers (covered by parse-myslowice.test.js); here we test the
// Świętochłowice-specific Liferay index parsing — link harvesting, the
// announcement/notice filter, address-from-title — plus price/area/date over a
// fixture reproducing the catdoc text of a real .doc announcement. Fixtures match
// the live BIP (June 2026, rendered-DOM spike + parser dry-run): the filter kept
// 21 real announcements and dropped 30 notices across 5 archive pages with no
// unkeyable entries.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDocLinks,
  isFlatAnnouncement,
  addressFrom,
  roundFromTitle,
  priceFromText,
  areaFromText,
  auctionDateFromText,
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
