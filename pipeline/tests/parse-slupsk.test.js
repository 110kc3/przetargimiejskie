// Tests for pipeline/src/cities/slupsk/parse.js
//
// Fixtures are grounded against live data fetched 2026-06-27.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isFlatAuction,
  roundFromTitle,
  parseListingPage,
  hasNextPage,
  parseNoticePage,
  parseResultArchive,
  parseResultDoc,
} from '../src/cities/slupsk/parse.js';

// ---------------------------------------------------------------------------
// isFlatAuction
// ---------------------------------------------------------------------------
describe('isFlatAuction', () => {
  it('accepts flat auction titles including corner-street format', () => {
    assert.ok(isFlatAuction(
      'I przetarg ustny nieograniczony na sprzedaz czesci nieruchomosci (lokalu mieszkalnego) w Slupsku przy ul. Ludwika Solskiego 19',
    ));
    assert.ok(isFlatAuction(
      'II przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego w Slupsku przy ul. Stefana Starzynskiego 1 - Wojska Polskiego 54',
    ));
  });

  it('rejects najem (lease)', () => {
    assert.ok(!isFlatAuction('I przetarg ustny ograniczony na najem pomieszczenia'));
  });

  it('rejects ograniczony without nieograniczony', () => {
    assert.ok(!isFlatAuction('I przetarg ustny ograniczony na sprzedaz nieruchomosci niezabudowanej'));
  });

  it('rejects rokowania', () => {
    assert.ok(!isFlatAuction('I nieograniczone rokowania na sprzedaz nieruchomosci'));
  });

  it('rejects garaz', () => {
    assert.ok(!isFlatAuction('II przetarg ustny nieograniczony na sprzedaz nieruchomosci zabudowanej (garazu)'));
  });

  it('rejects dzialka / land', () => {
    assert.ok(!isFlatAuction('I przetarg ustny ograniczony na sprzedaz nieruchomosci (dzialki nr 174)'));
  });

  it('rejects lokal niemieszkany (commercial)', () => {
    assert.ok(!isFlatAuction('II przetarg ustny nieograniczony na sprzedaz nieruchomosci (lokalu niemieszkalnego)'));
  });

  it('rejects notices with no mieszkalny word', () => {
    assert.ok(!isFlatAuction('II przetarg ustny nieograniczony na sprzedaz nieruchomosci zabudowanej'));
  });
});

// ---------------------------------------------------------------------------
// roundFromTitle
// ---------------------------------------------------------------------------
describe('roundFromTitle', () => {
  it('extracts Roman numeral round', () => {
    assert.equal(roundFromTitle('I przetarg ustny nieograniczony'), 1);
    assert.equal(roundFromTitle('II przetarg ustny nieograniczony'), 2);
    assert.equal(roundFromTitle('III przetarg ustny nieograniczony'), 3);
  });

  it('handles word ordinals', () => {
    assert.equal(roundFromTitle('drugi przetarg'), 2);
    assert.equal(roundFromTitle('trzeci przetarg ustny'), 3);
  });

  it('returns 1 when bare przetarg and no ordinal', () => {
    assert.equal(roundFromTitle('przetarg ustny na sprzedaz'), 1);
  });

  it('returns null when no przetarg at all', () => {
    assert.equal(roundFromTitle(''), null);
    assert.equal(roundFromTitle('rokowania na sprzedaz'), null);
  });
});

// ---------------------------------------------------------------------------
// parseListingPage
// ---------------------------------------------------------------------------
describe('parseListingPage', () => {
  const LISTING_HTML = [
    '<div class="mx-list">',
    '<div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3167.html">',
    '<h3>I przetarg ustny nieograniczony na sprzedaz czesci nieruchomosci (lokalu mieszkalnego) w Slupsku przy ul. Ludwika Solskiego 19</h3>',
    '<div class="mx-lead">przetarg ustny<br />data przetargu: 2.09.2026 12:00<br />status: aktualne</div>',
    '</a></div>',
    '<div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3157.html">',
    '<h3>III przetarg ustny nieograniczony na sprzedaz czesci nieruchomosci (lokalu mieszkalnego) w Slupsku przy ul. Kraszynskiego 13</h3>',
    '<div class="mx-lead">przetarg ustny<br />data przetargu: 9.07.2026 12:30<br />status: aktualne</div>',
    '</a></div>',
    '<div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3160.html">',
    '<h3>II przetarg ustny nieograniczony na sprzedaz nieruchomosci zabudowanej (garazu)</h3>',
    '<div class="mx-lead">przetarg ustny<br />data przetargu: 21.07.2026 10:00<br />status: aktualne</div>',
    '</a></div>',
    '<div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3152.html">',
    '<h3>I przetarg ustny ograniczony na sprzedaz nieruchomosci niezabudowanej (dzialki nr 174)</h3>',
    '<div class="mx-lead">przetarg ustny<br />data przetargu: 8.07.2026 12:00<br />status: aktualne</div>',
    '</a></div>',
    '<div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3154.html">',
    '<h3>II przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego w Slupsku przy ul. Stefana Starzynskiego 1 - Wojska Polskiego 54</h3>',
    '<div class="mx-lead">przetarg ustny<br />data przetargu: 9.07.2026 11:00<br />status: aktualne</div>',
    '</a></div>',
    '</div>',
    '<div class="mx-paginator"><a class="mx-selected">1</a>',
    '<a href="/przetargi/nieruchomosci/?pix=1" class="mx-next">2</a></div>',
  ].join('');

  it('extracts only flat auction items (3 of 5 in fixture)', () => {
    const items = parseListingPage(LISTING_HTML);
    assert.equal(items.length, 3);
  });

  it('extracts correct detail_url (resolves relative href)', () => {
    const items = parseListingPage(LISTING_HTML);
    assert.ok(items[0].detail_url.startsWith('https://bip.um.slupsk.pl/'));
    assert.ok(items[0].detail_url.endsWith('3167.html'));
  });

  it('extracts auction_date from lead', () => {
    const items = parseListingPage(LISTING_HTML);
    assert.equal(items[0].auction_date, '2026-09-02');
    assert.equal(items[1].auction_date, '2026-07-09');
  });

  it('extracts round from title', () => {
    const items = parseListingPage(LISTING_HTML);
    assert.equal(items[0].round, 1);
    assert.equal(items[1].round, 3);
    assert.equal(items[2].round, 2);
  });

  it('extracts status', () => {
    const items = parseListingPage(LISTING_HTML);
    assert.equal(items[0].status, 'aktualne');
  });

  it('detects hasNextPage when mx-next present', () => {
    assert.ok(hasNextPage(LISTING_HTML));
  });

  it('detects no next page when mx-next absent', () => {
    const lastPage = LISTING_HTML.replace('class="mx-next"', 'class="mx-selected"');
    assert.ok(!hasNextPage(lastPage));
  });
});

// ---------------------------------------------------------------------------
// parseNoticePage -- Mochnackiego 14/8
// Uses the exact HTML structure from live page 2883.html (2026-06-27)
// ---------------------------------------------------------------------------
describe('parseNoticePage -- Mochnackiego 14/8', () => {
  const NOTICE_HTML_MOCHNACKI = [
    '<div class="mx-article">',
    '<h2>II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w Słupsku przy    ul. M. Mochnackiego 14 stanowiącego własność  Miasta Słupska.</h2>',
    '<div class="mx-lead">rozpoczęcie przetargu: 12.05.2025 12:00&nbsp;&bull; Urząd Miejski w Słupsku sala 212</div>',
    '<div class="mx-html">',
    '<p>Lokal mieszkalny nr 8 położony na II piętrze w budynku przy ul. M. Mochnackiego 14 w Słupsku o powierzchni użytkowej 30,32 m<sup>2 </sup>(KW nr SL1S/00131838/9).</p>',
    '<p>cena wywoławcza nieruchomości wynosi<b>: </b><b>180</b><b> 000,00 zł </b></p>',
    '</div>',
    '<div class="mx-files"><div class="mx-files-item jpg"><a href="file/115968">1 (jpg)</a></div></div>',
    '</div>',
  ].join('\n');

  it('returns kind mieszkalny', () => {
    const r = parseNoticePage(NOTICE_HTML_MOCHNACKI, 'https://bip.um.slupsk.pl/przetargi/2883.html');
    assert.ok(r);
    assert.equal(r.kind, 'mieszkalny');
  });

  it('extracts round 2', () => {
    const r = parseNoticePage(NOTICE_HTML_MOCHNACKI, 'https://bip.um.slupsk.pl/przetargi/2883.html');
    assert.equal(r.round, 2);
  });

  it('extracts auction_date from lead', () => {
    const r = parseNoticePage(NOTICE_HTML_MOCHNACKI, 'https://bip.um.slupsk.pl/przetargi/2883.html');
    assert.equal(r.auction_date, '2025-05-12');
  });

  it('extracts area_m2 30.32', () => {
    const r = parseNoticePage(NOTICE_HTML_MOCHNACKI, 'https://bip.um.slupsk.pl/przetargi/2883.html');
    assert.equal(r.area_m2, 30.32);
  });

  it('extracts starting_price_pln 180000', () => {
    const r = parseNoticePage(NOTICE_HTML_MOCHNACKI, 'https://bip.um.slupsk.pl/przetargi/2883.html');
    assert.equal(r.starting_price_pln, 180000);
  });

  it('extracts KW number', () => {
    const r = parseNoticePage(NOTICE_HTML_MOCHNACKI, 'https://bip.um.slupsk.pl/przetargi/2883.html');
    assert.ok(r.kw && r.kw.includes('00131838'));
  });

  it('extracts address with apt /8', () => {
    const r = parseNoticePage(NOTICE_HTML_MOCHNACKI, 'https://bip.um.slupsk.pl/przetargi/2883.html');
    assert.ok(r.address, 'address should not be null');
    assert.equal(r.address.apt, '8');
  });

  it('returns null for non-flat page', () => {
    const garazHtml = [
      '<div class="mx-article">',
      '<h2>II przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej (garażu)</h2>',
      '<div class="mx-lead">21.07.2026</div>',
      '<div class="mx-html"><p>cena wywoławcza nieruchomości wynosi: 50 000,00 zł</p></div>',
      '</div>',
    ].join('\n');
    const r = parseNoticePage(garazHtml, 'https://bip.um.slupsk.pl/przetargi/3160.html');
    assert.equal(r, null);
  });
});

// ---------------------------------------------------------------------------
// parseNoticePage -- Kopernika 6/4
// ---------------------------------------------------------------------------
describe('parseNoticePage -- Kopernika 6/4', () => {
  const NOTICE_HTML_KOPERNIKA = [
    '<div class="mx-article">',
    '<h2>II przetarg ustny nieograniczony na sprzedaż części nieruchomości (lokalu mieszkalnego) położonej w Słupsku przy ul. Mikołaja Kopernika 6 stanowiącej własność Miasta Słupska.</h2>',
    '<div class="mx-lead">rozpoczęcie przetargu: 24.07.2025 11:00</div>',
    '<div class="mx-html">',
    '<p>Lokal mieszkalny nr 4 na poddaszu w budynku przy ul. Mikołaja Kopernika 6 o powierzchni użytkowej 57,45 m 2. KW nr SL1S/00049174/4.</p>',
    '<p>cena wywoławcza nieruchomości wynosi : 15 0 000,00 zł</p>',
    '</div>',
    '<div class="mx-files"></div>',
    '</div>',
  ].join('\n');

  it('extracts area_m2 57.45', () => {
    const r = parseNoticePage(NOTICE_HTML_KOPERNIKA, 'https://bip.um.slupsk.pl/przetargi/2928.html');
    assert.ok(r);
    assert.equal(r.area_m2, 57.45);
  });

  it('extracts round 2', () => {
    const r = parseNoticePage(NOTICE_HTML_KOPERNIKA, 'https://bip.um.slupsk.pl/przetargi/2928.html');
    assert.equal(r.round, 2);
  });

  it('extracts KW', () => {
    const r = parseNoticePage(NOTICE_HTML_KOPERNIKA, 'https://bip.um.slupsk.pl/przetargi/2928.html');
    assert.ok(r.kw && r.kw.includes('00049174'));
  });

  it('extracts apt /4 from body', () => {
    const r = parseNoticePage(NOTICE_HTML_KOPERNIKA, 'https://bip.um.slupsk.pl/przetargi/2928.html');
    assert.ok(r.address);
    assert.equal(r.address.apt, '4');
  });
});

// ---------------------------------------------------------------------------
// parseNoticePage -- corner address regression test
// Bug: "ul. Stefana Starzyńskiego 1 - Wojska Polskiego 54" was stored with
// both streets jammed into the STREET field, failing the junk-street gate.
// Fix: strip the " - <second street>" corner tail before parseAddress.
// ---------------------------------------------------------------------------
describe('parseNoticePage -- corner address Starzyńskiego 1 / Wojska Polskiego 54', () => {
  const CORNER_HTML = [
    '<div class="mx-article">',
    '<h2>II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w Słupsku przy ul. Stefana Starzyńskiego 1 - Wojska Polskiego 54 stanowiącego własność Miasta Słupska</h2>',
    '<div class="mx-lead">rozpoczęcie przetargu: 9.07.2026 11:00</div>',
    '<div class="mx-html">',
    '<p>Lokal mieszkalny nr 5 przy ul. Stefana Starzyńskiego 1 w Słupsku o powierzchni użytkowej 42,00 m<sup>2</sup> (KW nr SL1S/00099999/1).</p>',
    '<p>cena wywoławcza nieruchomości wynosi: 200 000,00 zł</p>',
    '</div>',
    '<div class="mx-files"></div>',
    '</div>',
  ].join('\n');

  it('returns a non-null result', () => {
    const r = parseNoticePage(CORNER_HTML, 'https://bip.um.slupsk.pl/przetargi/3154.html');
    assert.ok(r, 'parseNoticePage should not return null for a corner-address flat notice');
  });

  it('street is primary street only -- no digits or second-street name', () => {
    const r = parseNoticePage(CORNER_HTML, 'https://bip.um.slupsk.pl/przetargi/3154.html');
    assert.ok(r && r.address, 'address should not be null');
    assert.equal(r.address.street, 'Stefana Starzyńskiego',
      'street should be primary name only');
  });

  it('building is 1 (primary building number)', () => {
    const r = parseNoticePage(CORNER_HTML, 'https://bip.um.slupsk.pl/przetargi/3154.html');
    assert.ok(r && r.address, 'address should not be null');
    assert.equal(r.address.building, '1');
  });

  it('apt is 5 (from body)', () => {
    const r = parseNoticePage(CORNER_HTML, 'https://bip.um.slupsk.pl/przetargi/3154.html');
    assert.ok(r && r.address, 'address should not be null');
    assert.equal(r.address.apt, '5');
  });

  it('street contains no digits (sanity-check junk-street gate)', () => {
    const r = parseNoticePage(CORNER_HTML, 'https://bip.um.slupsk.pl/przetargi/3154.html');
    assert.ok(r && r.address, 'address should not be null');
    assert.ok(!/\d/.test(r.address.street),
      `street '\${r.address.street}' must contain no digits`);
  });
});

// ---------------------------------------------------------------------------
// parseResultArchive
// ---------------------------------------------------------------------------
describe('parseResultArchive', () => {
  const ARCHIVE_HTML = [
    '<div class="mx-files">',
    '<div class="mx-files-item pdf"><a href="file/124692">wynik II przetargu Sierpinka 2/9 (pdf,&nbsp;32.64&nbsp;KB)</a></div>',
    '<div class="mx-files-item pdf"><a href="file/124693">wynik I przetargu Filmowa 4/3 (pdf,&nbsp;33.17&nbsp;KB)</a></div>',
    '</div>',
  ].join('');

  it('returns 2 PDF refs', () => {
    const refs = parseResultArchive(ARCHIVE_HTML);
    assert.equal(refs.length, 2);
  });

  it('builds absolute pdf_url', () => {
    const refs = parseResultArchive(ARCHIVE_HTML);
    assert.equal(refs[0].pdf_url, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(refs[1].pdf_url, 'https://bip.um.slupsk.pl/file/124693');
  });

  it('strips size suffix from name', () => {
    const refs = parseResultArchive(ARCHIVE_HTML);
    assert.equal(refs[0].name, 'wynik II przetargu Sierpinka 2/9');
    assert.equal(refs[1].name, 'wynik I przetargu Filmowa 4/3');
  });

  it('returns empty array on empty html', () => {
    assert.deepEqual(parseResultArchive(''), []);
  });
});

// ---------------------------------------------------------------------------
// parseResultDoc -- negative outcome (Sierpinka 2/9)
// ---------------------------------------------------------------------------
describe('parseResultDoc -- negative (Sierpinka 2/9)', () => {
  const SIERPINKA_TEXT = [
    'Słupsk, dnia 25.06.2026r.',
    '',
    'Prezydent Miasta Słupska informuje o rozstrzygniętym w dniu 23.06.2026 roku',
    'w Urzędzie Miejskim w Słupsku II nieograniczonym przetargu ustnym dotyczącym',
    'sprzedaży części nieruchomości (lokalu niemieszkalnego), położonego w Słupsku przy',
    'ul. Sierpinka 2 stanowiącego własność Miasta Słupska:',
    '- lokal niemieszkany nr 9 przy ul. Sierpinka 2, KW nr SL1S/00034419/6',
    '- liczba osób dopuszczonych do uczestniczenia w przetargu: 0',
    '- liczba osób niedopuszczonych do uczestniczenia w przetargu: 0',
    '- cena wywoławcza nieruchomości: 75 000,00 zł',
    '- najwyższa cena osiągnięta w przetargu: 0',
    '- ustalony nabywca nieruchomości: przetarg zakończył się wynikiem negatywnym z uwagi',
    '  na brak oferentów.',
  ].join('\n');

  it('returns exactly 1 record', () => {
    const recs = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(recs.length, 1);
  });

  it('outcome is unsold', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(r.outcome, 'unsold');
  });

  it('final_price_pln is null for negative result', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(r.final_price_pln, null);
  });

  it('extracts starting_price_pln 75000', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(r.starting_price_pln, 75000);
  });

  it('extracts auction_date 2026-06-23', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(r.auction_date, '2026-06-23');
  });

  it('extracts round 2', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(r.round, 2);
  });

  it('sets source_pdf', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(r.source_pdf, 'https://bip.um.slupsk.pl/file/124692');
  });

  it('kind is uzytkowy (niemieszkalne)', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.equal(r.kind, 'uzytkowy');
  });

  it('extracts address Sierpinka 2/9', () => {
    const [r] = parseResultDoc(SIERPINKA_TEXT, null, 'https://bip.um.slupsk.pl/file/124692');
    assert.ok(r.address, 'address should not be null');
    assert.ok(r.address_raw.includes('Sierpinka'));
    assert.equal(r.address.building, '2');
    assert.equal(r.address.apt, '9');
  });
});

// ---------------------------------------------------------------------------
// parseResultDoc -- negative outcome (Filmowa 4/3)
// ---------------------------------------------------------------------------
describe('parseResultDoc -- negative (Filmowa 4/3)', () => {
  const FILMOWA_TEXT = [
    'Słupsk, dnia 25.06.2026r.',
    '',
    'Prezydent Miasta Słupska informuje o rozstrzygniętym w dniu 23.06.2026 roku',
    'w Urzędzie Miejskim w Słupsku I nieograniczonym przetargu ustnym dotyczącym',
    'sprzedaży części nieruchomości (lokalu niemieszkalnego), położonego w Słupsku przy',
    'ul. Filmowej 4 stanowiącego własność Miasta Słupska:',
    '- lokal niemieszkany nr 3 przy ul. Filmowej 4, KW nr SL1S/00031495/1',
    '- liczba osób dopuszczonych do uczestniczenia w przetargu: 0',
    '- liczba osób niedopuszczonych do uczestniczenia w przetargu: 0',
    '- cena wywoławcza nieruchomości: 135 000,00 zł',
    '- najwyższa cena osiągnięta w przetargu: 0',
    '- ustalony nabywca nieruchomości: przetarg zakończył się wynikiem negatywnym z uwagi',
    '  na brak oferentów.',
  ].join('\n');

  it('returns 1 record, outcome unsold', () => {
    const recs = parseResultDoc(FILMOWA_TEXT, null, 'https://bip.um.slupsk.pl/file/124693');
    assert.equal(recs.length, 1);
    assert.equal(recs[0].outcome, 'unsold');
  });

  it('extracts starting_price 135000', () => {
    const [r] = parseResultDoc(FILMOWA_TEXT, null, 'https://bip.um.slupsk.pl/file/124693');
    assert.equal(r.starting_price_pln, 135000);
  });

  it('round is 1', () => {
    const [r] = parseResultDoc(FILMOWA_TEXT, null, 'https://bip.um.slupsk.pl/file/124693');
    assert.equal(r.round, 1);
  });
});

// ---------------------------------------------------------------------------
// parseResultDoc -- positive sold outcome (synthetic)
// ---------------------------------------------------------------------------
describe('parseResultDoc -- positive sold outcome (synthetic)', () => {
  const SOLD_TEXT = [
    'Słupsk, dnia 15.04.2025r.',
    '',
    'Prezydent Miasta Słupska informuje o rozstrzygniętym w dniu 10.04.2025 roku',
    'w Urzędzie Miejskim w Słupsku I nieograniczonym przetargu ustnym dotyczącym',
    'sprzedaży lokalu mieszkalnego, położonego w Słupsku przy',
    'ul. Mochnackiego 14 stanowiącego własność Miasta Słupska:',
    '- lokal mieszkalny nr 8 przy ul. Mochnackiego 14, KW nr SL1S/00131838/9',
    '- liczba osób dopuszczonych do uczestniczenia w przetargu: 2',
    '- liczba osób niedopuszczonych do uczestniczenia w przetargu: 0',
    '- cena wywoławcza nieruchomości: 210 000,00 zł',
    '- najwyższa cena osiągnięta w przetargu: 215 000,00 zł',
    '- ustalony nabywca nieruchomości: Jan Kowalski',
  ].join('\n');

  it('returns 1 record, outcome sold', () => {
    const recs = parseResultDoc(SOLD_TEXT, null, 'https://bip.um.slupsk.pl/file/99999');
    assert.equal(recs.length, 1);
    assert.equal(recs[0].outcome, 'sold');
  });

  it('extracts final_price_pln 215000', () => {
    const [r] = parseResultDoc(SOLD_TEXT, null, 'https://bip.um.slupsk.pl/file/99999');
    assert.equal(r.final_price_pln, 215000);
  });

  it('extracts starting_price_pln 210000', () => {
    const [r] = parseResultDoc(SOLD_TEXT, null, 'https://bip.um.slupsk.pl/file/99999');
    assert.equal(r.starting_price_pln, 210000);
  });

  it('kind is mieszkalny', () => {
    const [r] = parseResultDoc(SOLD_TEXT, null, 'https://bip.um.slupsk.pl/file/99999');
    assert.equal(r.kind, 'mieszkalny');
  });

  it('extracts auction_date 2025-04-10', () => {
    const [r] = parseResultDoc(SOLD_TEXT, null, 'https://bip.um.slupsk.pl/file/99999');
    assert.equal(r.auction_date, '2025-04-10');
  });

  it('uses fallbackDate when text has no date', () => {
    const noDate = SOLD_TEXT.replace(
      /informuje o rozstrzygni[\u0119e]tym w dniu [^\n]+\n/,
      'informuje o rozstrzygniętym przetargu\n',
    );
    const [r] = parseResultDoc(noDate, '2025-04-10', 'https://bip.um.slupsk.pl/file/99999');
    assert.equal(r.auction_date, '2025-04-10');
  });
});

// ---------------------------------------------------------------------------
// parseResultDoc -- edge cases
// ---------------------------------------------------------------------------
describe('parseResultDoc -- edge cases', () => {
  it('returns [] on empty text', () => {
    assert.deepEqual(parseResultDoc('', null, 'http://x'), []);
  });

  it('returns [] on unrelated text', () => {
    assert.deepEqual(
      parseResultDoc('Biuletyn Informacji Publicznej Miasta Słupska', null, 'http://x'),
      [],
    );
  });

  it('uses fallbackDate when no date in text', () => {
    const text = [
      'Prezydent Miasta Słupska informuje o rozstrzygniętym przetargu ustnym',
      'w Urzędzie Miejskim w Słupsku I nieograniczonym przetargu ustnym dotyczącym',
      'sprzedaży lokalu mieszkalnego przy ul. Testowej 5:',
      '- lokal mieszkalny nr 1 przy ul. Testowej 5, KW nr SL1S/00000001/1',
      '- cena wywoławcza nieruchomości: 100 000,00 zł',
      '- najwyższa cena osiągnięta w przetargu: 0',
      '- ustalony nabywca nieruchomości: przetarg zakończył się wynikiem negatywnym.',
    ].join('\n');
    const [r] = parseResultDoc(text, '2025-01-15', 'http://x');
    assert.equal(r.auction_date, '2025-01-15');
  });
});
