// Augustow parser tests. Fixtures from live bip.um.augustow.pl 2026-06-29.
// Announcement: …/rynek-zygmunta-augusta-16-lokal-mieszkalny-nr-1-i-nr-3-4.html
//   two flats: lok.1 62.87m2 280700PLN; lok.3 46.05m2 217500PLN; date 2024-09-09
// Result notice: …/wyniki-lok-1.html published 2024-09-17
//   PDF /resource/26697/Infromacja+o+wynikach+-+lokal+Nr+1.pdf
//   heading: "PRZEPROWADZONEGO W DNIU 09.09.2024 R."

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseListPage, isResultNoticeTitle, attachmentUrlFromDetail,
  roundFromText, isResultNotice, auctionDateFromResultText,
  startingPriceFromResultText, achievedPriceFromResultText,
  addressFromResultText, areaFromResultText, parseResultDoc,
  parseAnnouncementDetail, announcementBaseAddress,
  auctionDateFromAnnouncementText,
} from '../src/cities/augustow/parse.js';

// SmartSite Augustow list-item shape (groundtruthed 2026-06-29)
function li(href, title, d) {
  return '<li class="component-item clearfix"><h2>' +
    '<a href="' + href + '" title="' + title + '">' + title + '</a>' +
    '</h2><div class="component-excerpt">' +
    '<div class="component-date-add">' + (d || '2024-08-08 10:00:00') + '</div>' +
    '</div></li>';
}

const T_FLAT1 = 'Burmistrz Miasta Augustowa oglasza pierwszy przetarg ustny nieograniczony na sprzedaz nieruchomosci polozonych w Augustowie, przy Rynku Zygmunta Augusta 16 (lokal mieszkalny Nr 1 i Nr 3)';
const T_FLAT2 = 'Burmistrz Miasta Augustowa oglasza drugi przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego nr 3 przy Rynku Zygmunta Augusta 16 w Augustowie';
const T_LAND  = 'Burmistrz Miasta Augustowa oglasza pierwszy przetarg ustny nieograniczony na sprzedaz niezabudowanej nieruchomosci oznaczonej nr geodez.3798/106';
const T_BLDG  = 'Burmistrz Miasta Augustowa oglasza pierwszy przetarg ustny nieograniczony na sprzedaz zabudowanej nieruchomosci nr geodez.5030 przy ul. Wojska Polskiego 1';
const T_RES1  = 'Informacja o wynikach pierwszego przetargu ustnego nieograniczonego na sprzedaz lokalu mieszkalnego nr 1 przy Rynku Zygmunta Augusta 16 w Augustowie';
const T_RES3  = 'Informacja o wynikach pierwszego przetargu ustnego nieograniczonego na sprzedaz lokalu mieszkalnego nr 3 przy Rynku Zygmunta Augusta 16 w Augustowie';

const BOARD = '<ul>' +
  li('/x/flat1.html', T_FLAT1, '2024-08-08 10:05:00') +
  li('/x/flat2.html', T_FLAT2, '2024-10-01 09:00:00') +
  li('/x/land.html',  T_LAND,  '2026-06-01 11:00:00') +
  li('/x/bldg.html',  T_BLDG,  '2026-06-01 11:00:00') +
  li('/x/res1.html',  T_RES1,  '2024-09-17 13:17:26') +
  li('/x/res3.html',  T_RES3,  '2024-09-17 14:00:00') +
  '</ul>';

// --- parseListPage ---

test('parseListPage: keeps only 2 flat announcements, excludes land/built/results', function() {
  const items = parseListPage(BOARD);
  assert.equal(items.length, 2);
  assert.ok(items.every(function(i) { return i.kind === 'mieszkalny'; }));
});

test('parseListPage: flat1 round=1, published_date=2024-08-08, absolute detail_url', function() {
  const items = parseListPage(BOARD);
  const it = items.find(function(i) { return /nr 1 i nr 3/i.test(i.title); });
  assert.ok(it, 'flat1 must be present');
  assert.equal(it.round, 1);
  assert.equal(it.published_date, '2024-08-08');
  assert.ok(it.detail_url.startsWith('https://bip.um.augustow.pl/'));
});

test('parseListPage: flat2 round=2, published_date=2024-10-01', function() {
  const items = parseListPage(BOARD);
  const it = items.find(function(i) { return /drugi/.test(i.title); });
  assert.ok(it);
  assert.equal(it.round, 2);
  assert.equal(it.published_date, '2024-10-01');
});

test('parseListPage: result notices excluded', function() {
  const items = parseListPage(BOARD);
  assert.ok(!items.some(function(i) { return /informacja/i.test(i.title); }));
});

test('parseListPage: empty HTML returns []', function() {
  assert.deepEqual(parseListPage('<html><body></body></html>'), []);
});

test('parseListPage: address/area/price null on list items', function() {
  for (const it of parseListPage(BOARD)) {
    assert.ok(it.starting_price_pln == null);
    assert.ok(it.auction_date == null);
    assert.ok(it.area_m2 == null);
    assert.ok(it.address == null);
  }
});

// --- roundFromText ---

test('roundFromText: pierwszy=1, drugi=2, trzeci=3, czwarty=4', function() {
  assert.equal(roundFromText('oglasza pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('oglasza drugi przetarg ustny'), 2);
  assert.equal(roundFromText('oglasza trzeci przetarg ustny'), 3);
  assert.equal(roundFromText('oglasza czwarty przetarg ustny'), 4);
});

test('roundFromText: Roman II przetarg = 2', function() {
  assert.equal(roundFromText('oglasza II przetarg ustny'), 2);
});

test('roundFromText: bare przetarg = 1', function() {
  assert.equal(roundFromText('oglasza przetarg ustny nieograniczony'), 1);
});

test('roundFromText: null on empty / no przetarg', function() {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText('informacja o wynikach'), null);
});

// --- isResultNoticeTitle ---

test('isResultNoticeTitle: detects result notices', function() {
  assert.ok(isResultNoticeTitle(T_RES1));
  assert.ok(isResultNoticeTitle(T_RES3));
  assert.ok(isResultNoticeTitle('Informacja o wynikach przetargu gruntowego'));
});

test('isResultNoticeTitle: does not flag announcements', function() {
  assert.ok(!isResultNoticeTitle(T_FLAT1));
  assert.ok(!isResultNoticeTitle(T_LAND));
});

// --- attachmentUrlFromDetail ---

const DET_PDF = '<div class="component-attachment"><ul class="list-attachment"><li>' +
  '<a href="/resource/26697/Infromacja+o+wynikach+-+lokal+Nr+1.pdf" class="matomo_download">' +
  'Infromacja o wynikach - lokal Nr 1.pdf</a></li></ul></div>';

const DET_ANN = '<div class="component-attachment"><ul class="list-attachment"><li>' +
  '<a href="/resource/26564/Ogloszenie+Rynek+Augusta+16.pdf" class="matomo_download">' +
  'Ogloszenie o przetargu.pdf</a></li></ul></div>';

test('attachmentUrlFromDetail: PDF from result notice (resource/26697)', function() {
  const url = attachmentUrlFromDetail(DET_PDF);
  assert.ok(url);
  assert.ok(url.includes('/resource/26697/'), 'got: ' + url);
  assert.ok(url.endsWith('.pdf'));
  assert.ok(url.startsWith('https://bip.um.augustow.pl'));
});

test('attachmentUrlFromDetail: PDF from announcement (resource/26564)', function() {
  const url = attachmentUrlFromDetail(DET_ANN);
  assert.ok(url);
  assert.ok(url.includes('/resource/26564/'), 'got: ' + url);
  assert.ok(url.startsWith('https://bip.um.augustow.pl'));
});

test('attachmentUrlFromDetail: null when no attachment', function() {
  assert.equal(attachmentUrlFromDetail('<p>brak</p>'), null);
  assert.equal(attachmentUrlFromDetail(null), null);
});

// --- Result PDF text fixtures ---
// ASCII-only so the file never gets a multi-byte encoding glitch on write.

const R1 = 'INFORMACJA O WYNIKACH PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO\n' +
  'OGLOSZONEGO PRZEZ BURMISTRZA MIASTA AUGUSTOWA\n' +
  'PRZEPROWADZONEGO W DNIU 09.09.2024 R.\n' +
  'W URZEDZIE MIEJSKIM W AUGUSTOWIE\n' +
  'NA SPRZEDAZ LOKALU MIESZKALNEGO NR 1\n' +
  'POLOZONEGO PRZY RYNKU ZYGMUNTA AUGUSTA 16\n\n' +
  'Lokal mieszkalny nr 1 o powierzchni uzytkowej 62,87 m kw.\n\n' +
  'Cena wywolawcza:  280 700,00 zl\n' +
  'Najwyzsza cena osiagnieta w przetargu:  295 000,00 zl\n\n' +
  'Nabywca nieruchomosci zostala ustalona: Anna Nowak, ul. Przykladowa 1, 16-300 Augustow';

const R3 = 'INFORMACJA O WYNIKACH PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO\n' +
  'PRZEPROWADZONEGO W DNIU 17.09.2024 R.\n' +
  'NA SPRZEDAZ LOKALU MIESZKALNEGO NR 3\n' +
  'PRZY RYNKU ZYGMUNTA AUGUSTA 16\n\n' +
  'Lokal mieszkalny nr 3 o powierzchni uzytkowej 46,05 m kw.\n\n' +
  'Cena wywolawcza: 217 500,00 zl\n' +
  'Najwyzsza cena osiagnieta w przetargu: 230 000,00 zl\n\n' +
  'Nabywca zostal ustalony: Jan Kowalski';

const RNEG = 'INFORMACJA O WYNIKACH DRUGIEGO PRZETARGU USTNEGO NIEOGRANICZONEGO\n' +
  'PRZEPROWADZONEGO W DNIU 10.10.2024 R.\n' +
  'NA SPRZEDAZ LOKALU MIESZKALNEGO NR 3\n' +
  'PRZY RYNKU ZYGMUNTA AUGUSTA 16\n\n' +
  'Cena wywolawcza: 217 500,00 zl\n\n' +
  'Przetarg zakonczyl sie wynikiem negatywnym.';

const RDIAC = 'INFORMACJA O WYNIKACH PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO\n' +
  'PRZEPROWADZONEGO W DNIU 09.09.2024 R.\n' +
  'NA SPRZEDAZ LOKALU MIESZKALNEGO NR 1\n' +
  'PRZY RYNKU ZYGMUNTA AUGUSTA 16\n\n' +
  'Lokal mieszkalny nr 1 o powierzchni użytkowej 62,87 m².\n\n' +
  'Cena wywoławcza:  280 700,00 zł\n' +
  'Najwyższa cena osiągnięta w przetargu:  295 000,00 zł\n\n' +
  'Nabywcą została ustalona: Anna Nowak';

const SRC = 'https://bip.um.augustow.pl/resource/26697/Infromacja+o+wynikach+-+lokal+Nr+1.pdf';

// --- isResultNotice ---

test('isResultNotice: detects all result fixtures', function() {
  assert.ok(isResultNotice(R1));
  assert.ok(isResultNotice(R3));
  assert.ok(isResultNotice(RNEG));
  assert.ok(!isResultNotice('Ogloszenie o przetargu na sprzedaz lokalu mieszkalnego'));
});

// --- auctionDateFromResultText ---

test('auctionDateFromResultText: 09.09.2024', function() {
  assert.equal(auctionDateFromResultText(R1), '2024-09-09');
});

test('auctionDateFromResultText: 17.09.2024', function() {
  assert.equal(auctionDateFromResultText(R3), '2024-09-17');
});

test('auctionDateFromResultText: 10.10.2024 (negative outcome)', function() {
  assert.equal(auctionDateFromResultText(RNEG), '2024-10-10');
});

test('auctionDateFromResultText: null on empty', function() {
  assert.equal(auctionDateFromResultText(''), null);
});

// --- startingPriceFromResultText ---

test('startingPriceFromResultText: 280700 (ASCII zl)', function() {
  assert.equal(startingPriceFromResultText(R1), 280700);
});

test('startingPriceFromResultText: 217500', function() {
  assert.equal(startingPriceFromResultText(R3), 217500);
});

test('startingPriceFromResultText: with diacritics (zl with ogonek)', function() {
  assert.equal(startingPriceFromResultText(RDIAC), 280700);
});

// --- achievedPriceFromResultText ---

test('achievedPriceFromResultText: 295000 (lok 1)', function() {
  assert.equal(achievedPriceFromResultText(R1), 295000);
});

test('achievedPriceFromResultText: 230000 (lok 3)', function() {
  assert.equal(achievedPriceFromResultText(R3), 230000);
});

test('achievedPriceFromResultText: with diacritics', function() {
  assert.equal(achievedPriceFromResultText(RDIAC), 295000);
});

test('achievedPriceFromResultText: null when absent', function() {
  assert.equal(achievedPriceFromResultText('Cena wywolawcza: 48 000,00 zl'), null);
});

// --- addressFromResultText ---

test('addressFromResultText: Rynek without ul. prefix -- building 16', function() {
  const addr = addressFromResultText(R1);
  assert.ok(addr, 'address must be parsed');
  // street_norm is lowercased+diacritic-stripped: "rynku zygmunta augusta"
  assert.ok(/rynk/i.test(addr.street_norm), 'expected rynk in street_norm, got: ' + addr.street_norm);
  assert.equal(addr.building, '16');
});

test('addressFromResultText: null when no address', function() {
  assert.equal(addressFromResultText('Przetarg zakonczyl sie wynikiem negatywnym.'), null);
});

// --- areaFromResultText ---

test('areaFromResultText: 62.87 m kw (lok 1)', function() {
  assert.equal(areaFromResultText(R1), 62.87);
});

test('areaFromResultText: 46.05 m kw (lok 3)', function() {
  assert.equal(areaFromResultText(R3), 46.05);
});

test('areaFromResultText: null when absent', function() {
  assert.equal(areaFromResultText('Przetarg zakonczyl sie wynikiem negatywnym.'), null);
});

// --- parseResultDoc ---

test('parseResultDoc: lok1 sold -- date/prices/area/address/kind all correct', function() {
  const recs = parseResultDoc(R1, null, SRC);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2024-09-09');
  assert.equal(r.starting_price_pln, 280700);
  assert.equal(r.final_price_pln, 295000);
  assert.equal(r.area_m2, 62.87);
  assert.equal(r.kind, 'mieszkalny');
  assert.ok(r.address);
  assert.ok(/rynk/i.test(r.address.street_norm), 'got: ' + r.address.street_norm);
  assert.equal(r.address.building, '16');
  assert.equal(r.source_pdf, SRC);
});

test('parseResultDoc: lok3 sold', function() {
  const recs = parseResultDoc(R3, null, SRC);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2024-09-17');
  assert.equal(r.starting_price_pln, 217500);
  assert.equal(r.final_price_pln, 230000);
  assert.equal(r.area_m2, 46.05);
});

test('parseResultDoc: negative outcome', function() {
  const recs = parseResultDoc(RNEG, null, SRC);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 217500);
  assert.equal(r.auction_date, '2024-10-10');
});

test('parseResultDoc: fallbackDate used when no date in text', function() {
  const noDate = R1.replace(/PRZEPROWADZONEGO W DNIU[^\n]+\n/, '');
  const recs = parseResultDoc(noDate, '2024-09-09', SRC);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2024-09-09');
});

test('parseResultDoc: non-result text returns []', function() {
  assert.deepEqual(
    parseResultDoc('Ogloszenie o przetargu na sprzedaz lokalu mieszkalnego', null, SRC),
    []
  );
});

// --- announcement detail-page parser (multi-flat expansion) ------------------
// Detail body carries address/area/price/date the list title lacks. Groundtruthed
// on live fixtures 2026-07-09: Rynek Zygmunta Augusta 16 → lokal 1 (62.87m2,
// 280700) + lokal 3 (46.05m2, 217500), auction 2024-09-09. The piwnica line
// ("piwnicą Nr 1 o pow. 3,87 m kw") must NOT be captured as a flat.
const DETAIL_2FLAT =
  '<html><head><script>var x=1;</script></head><body>' +
  '<h1>Ogłoszenie</h1>' +
  '<div class="content"><p>BURMISTRZ MIASTA AUGUSTOWA ogłasza pierwszy przetarg ustny ' +
  'nieograniczony na sprzedaż nieruchomości położonych w Augustowie, przy Rynku Zygmunta Augusta 16:</p>' +
  '<p>1) lokal mieszkalny Nr 1 o 62,87 m kw, położony na I piętrze, wraz z przynależnym ' +
  'do tego lokalu pomieszczeniem – piwnicą Nr 1 o pow. 3,87 m kw, wraz z udziałem. ' +
  'Cena wywoławcza 280 700,00 zł. Wadium 30 000,00 zł.</p>' +
  '<p>2) lokal mieszkalny Nr 3 o pow. 46,05 m kw, położony na II piętrze, wraz z przynależnym ' +
  'do tego lokalu pomieszczeniem – piwnicą Nr 3 o pow. 4,70 m kw. ' +
  'Cena wywoławcza 217 500,00 zł. Wadium 20 000,00 zł.</p>' +
  '<p>Przetarg odbędzie się dnia 09 września 2024 r. o godz. 10:00.</p></div></body></html>';

test('parseAnnouncementDetail: expands a 2-flat announcement into 2 keyed records', function() {
  const recs = parseAnnouncementDetail(DETAIL_2FLAT, {
    detail_url: 'https://bip.um.augustow.pl/x/flat.html',
    published_date: '2024-08-08',
    round: 1,
  });
  assert.equal(recs.length, 2);
  const byApt = Object.fromEntries(recs.map((r) => [r.address.apt, r]));

  assert.equal(byApt['1'].address.key, 'rynek zygmunta augusta|16|1');
  assert.equal(byApt['1'].area_m2, 62.87);
  assert.equal(byApt['1'].starting_price_pln, 280700);
  assert.equal(byApt['1'].auction_date, '2024-09-09');
  assert.equal(byApt['1'].round, 1);
  assert.equal(byApt['1'].published_date, '2024-08-08');
  assert.equal(byApt['1'].detail_url, 'https://bip.um.augustow.pl/x/flat.html');

  assert.equal(byApt['3'].address.key, 'rynek zygmunta augusta|16|3');
  assert.equal(byApt['3'].area_m2, 46.05);        // NOT the 4.70 piwnica area
  assert.equal(byApt['3'].starting_price_pln, 217500);
});

test('parseAnnouncementDetail: no address in body → []', function() {
  assert.deepEqual(parseAnnouncementDetail('<p>Brak treści ogłoszenia.</p>', {}), []);
});

test('announcementBaseAddress: normalizes "przy Rynku …" to nominative Rynek', function() {
  const b = announcementBaseAddress('… przy Rynku Zygmunta Augusta 16: 1) lokal');
  assert.equal(b.streetPrefix, 'Rynek Zygmunta Augusta');
  assert.equal(b.building, '16');
});

test('auctionDateFromAnnouncementText: spelled-out and numeric', function() {
  assert.equal(auctionDateFromAnnouncementText('Przetarg odbędzie się dnia 09 września 2024 r.'), '2024-09-09');
  assert.equal(auctionDateFromAnnouncementText('Przetarg odbędzie się w dniu 12.09.2017 r.'), '2017-09-12');
});
