// Tests for pipeline/src/cities/slupsk/parse.js
//
// Fixtures are grounded against live data fetched 2026-06-27:
//   • Listing page:  https://bip.um.slupsk.pl/przetargi/nieruchomosci/  (page 1)
//   • Detail page:   https://bip.um.slupsk.pl/przetargi/2883.html
//                    (II przetarg, Mochnackiego 14, cena 180 000 zł, 30,32 m²)
//   • Detail page:   https://bip.um.slupsk.pl/przetargi/2928.html
//                    (II przetarg, Kopernika 6, cena 150 000 zł, 57,45 m²)
//   • Result PDF:    https://bip.um.slupsk.pl/file/124692
//                    (wynik II przetargu Sierpinka 2/9 — negative, niemieszkalne)
//   • Result PDF:    https://bip.um.slupsk.pl/file/124693
//                    (wynik I przetargu Filmowa 4/3 — negative, niemieszkalne)

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
  it('accepts I/II/III przetarg ustny nieograniczony … lokalu mieszkalnego', () => {
    assert.ok(isFlatAuction(
      'I przetarg ustny nieograniczony na sprzedaż części nieruchomości (lokalu mieszkalnego) położonej w Słupsku przy ul. Ludwika Solskiego 19 stanowiącego własność Miasta Słupska',
    ));
    assert.ok(isFlatAuction(
      'II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w Słupsku przy ul. Stefana Starzyńskiego 1 - Wojska Polskiego 54 stanowiącego własność Miasta Słupska',
    ));
    assert.ok(isFlatAuction(
      'III przetarg ustny nieograniczony na sprzedaż części nieruchomości (lokalu mieszkalnego) położonej w Słupsku przy ul. Zygmunta Krasińskiego 13 stanowiącej własność Miasta Słupska',
    ));
  });

  it('rejects najem (lease)', () => {
    assert.ok(!isFlatAuction(
      'I przetarg ustny ograniczony na najem pomieszczenia gospodarczego stanowiącego własność Miasta Słupska',
    ));
  });

  it('rejects ograniczony without nieograniczony (restricted auction)', () => {
    assert.ok(!isFlatAuction(
      'I przetarg ustny ograniczony na sprzedaż nieruchomości niezabudowanej',
    ));
  });

  it('rejects rokowania (negotiations)', () => {
    assert.ok(!isFlatAuction(
      'I nieograniczone rokowania na sprzedaż nieruchomości stanowiącej własność miasta Słupska',
    ));
  });

  it('rejects garaż', () => {
    assert.ok(!isFlatAuction(
      'II przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej (garażu) stanowiącej własność Miasta Słupska',
    ));
  });

  it('rejects działka / land', () => {
    assert.ok(!isFlatAuction(
      'I przetarg ustny ograniczony na sprzedaż nieruchomości niezabudowanej (działki nr 174)',
    ));
  });

  it('rejects lokal niemieszkany (commercial)', () => {
    assert.ok(!isFlatAuction(
      'II przetarg ustny nieograniczony na sprzedaż nieruchomości (lokalu niemieszkalnego) położonej w Słupsku przy ul. Gdańskiej 9-10',
    ));
  });

  it('rejects notices with no mieszkalny word', () => {
    assert.ok(!isFlatAuction('II przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej'));
  });
});

// ---------------------------------------------------------------------------
// roundFromTitle
// ---------------------------------------------------------------------------
describe('roundFromTitle', () => {
  it('extracts Roman numeral round', () => {
    assert.equal(roundFromTitle('I przetarg ustny nieograniczony …'), 1);
    assert.equal(roundFromTitle('II przetarg ustny nieograniczony …'), 2);
    assert.equal(roundFromTitle('III przetarg ustny nieograniczony …'), 3);
  });

  it('handles word ordinals', () => {
    assert.equal(roundFromTitle('drugi przetarg'), 2);
    assert.equal(roundFromTitle('trzeci przetarg ustny'), 3);
  });

  it('returns 1 when bare przetarg and no ordinal', () => {
    assert.equal(roundFromTitle('przetarg ustny na sprzedaż'), 1);
  });

  it('returns null when no przetarg at all', () => {
    assert.equal(roundFromTitle(''), null);
    assert.equal(roundFromTitle('rokowania na sprzedaż'), null);
  });
});

// ---------------------------------------------------------------------------
// parseListingPage  (fixture: live page 1, 2026-06-27)
// ---------------------------------------------------------------------------
describe('parseListingPage', () => {
  // Minimal HTML snippet representing the live page structure.
  // Includes 2 flat auctions and 2 non-flat items (garaż, działka).
  const LISTING_HTML = `
<div class="mx-list"><div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3167.html"><h3>I przetarg ustny nieograniczony na sprzedaż części nieruchomości (lokalu mieszkalnego) położonej w Słupsku przy ul. Ludwika Solskiego 19 stanowiącego własność  Miasta Słupska</h3><div class="mx-lead">przetarg ustny<br />data przetargu: 2.09.2026 12:00<br />status: aktualne</div></a></div><div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3157.html"><h3>III przetarg ustny nieograniczony na sprzedaż części nieruchomości (lokalu mieszkalnego) położonej w Słupsku przy ul. Zygmunta Krasińskiego 13 stanowiącej własność  Miasta Słupska</h3><div class="mx-lead">przetarg ustny<br />data przetargu: 9.07.2026 12:30<br />status: aktualne</div></a></div><div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3160.html"><h3>II przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej (garażu) stanowiącej własność Miasta Słupska, położonej przy ul. ks. J. Poniatowskiego w obrębie nr 0006 miasta Słupska</h3><div class="mx-lead">przetarg ustny<br />data przetargu: 21.07.2026 10:00<br />status: aktualne</div></a></div><div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3152.html"><h3>I przetarg ustny ograniczony na sprzedaż nieruchomości niezabudowanej (działki nr 174),  położonej w obrębie nr 0022 miasta Słupska,  stanowiącej własność Miasta Słupsk</h3><div class="mx-lead">przetarg ustny<br />data przetargu: 8.07.2026 12:00<br />status: aktualne</div></a></div><div class="mx-list-item"><a href="/przetargi/nieruchomosci/../3154.html"><h3>II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w Słupsku przy ul. Stefana Starzyńskiego 1 - Wojska Polskiego 54 stanowiącego własność Miasta Słupska</h3><div class="mx-lead">przetarg ustny<br />data przetargu: 9.07.2026 11:00<br />status: aktualne</div></a></div></div><div class="mx-paginator"><a class="mx-selected"><span class="mx-hidden">strona </span>1</a><span class="mx-hidden"> | </span><a href="/przetargi/nieruchomosci/?pix=1"><span class="mx-hidden">strona </span>2</a><span class="mx-hidden"> | </span><a href="/przetargi/nieruchomosci/?pix=1" class="mx-next"><span class="mx-hidden">strona 2</span></a></div>
`;

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
    assert.equal(items[0].round, 1); // I przetarg
    assert.equal(items[1].round, 3); // III przetarg
    assert.equal(items[2].round, 2); // II przetarg
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
// parseNoticePage  (fixture: https://bip.um.slupsk.pl/przetargi/2883.html)
// Mochnackiego 14/8 — II przetarg, cena 180 000 zł, 30,32 m²
// ---------------------------------------------------------------------------
describe('parseNoticePage — Mochnackiego 14/8', () => {
  // Condensed real HTML from 2883.html (boilerplate stripped, key fields kept).
  const NOTICE_HTML_MOCHNACKI = `
<div class="mx-article">
<h2>II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w Słupsku przy    ul. M. Mochnackiego 14 stanowiącego własność  Miasta Słupska.</h2>
<div class="mx-lead">rozpoczęcie przetargu: 12.05.2025 12:00&nbsp;&bull; Urząd Miejski w Słupsku sala 212</div>
<div class="mx-html">
<p>Lokal mieszkalny nr 8 położony na II piętrze w budynku przy ul. M. Mochnackiego 14 w Słupsku o powierzchni użytkowej 30,32 m<sup>2 </sup>składający się z 1 pokoju, kuchni, łazienki z wc i przedpokoju (KW nr SL1S/00131838/9) wraz z udziałem 27/10000 we własności części wspólnych budynku i w prawie własności działki gruntu oznaczonej nr 375/4 o powierzchni 13 487 m² w obrębie nr 0007 Miasta Słupska.</p>
<p>cena wywoławcza nieruchomości wynosi<b>: </b><b>180</b><b> 000,00 zł </b> </p>
<p>wadium: <b>18</b><b> 000,00 </b><b>zł</b></p>
<p><b>Przetarg odbędzie się </b><b>12</b><b>.0</b><b>5</b><b>.202</b><b>5</b><b>r. o godz. 1</b><b>2</b><sup><b>00</b></sup></p>
</div>
<div class="mx-files">
<div class="mx-files-item jpg"><a href="file/115968">1 (jpg,&nbsp;269.29&nbsp;KB)</a></div>
</div>
</div>
`;

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
    assert.ok(r.address.apt === '8', `expected apt=8, got ${r.address.apt}`);
  });

  it('returns null for non-flat page', () => {
    const garazHtml = `
<div class="mx-article">
<h2>II przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej (garażu)</h2>
<div class="mx-lead">rozpoczęcie przetargu: 21.07.2026 10:00</div>
<div class="mx-html"><p>cena wywoławcza nieruchomości wynosi: 50 000,00 zł</p></div>
</div>
`;
    const r = parseNoticePage(garazHtml, 'https://bip.um.slupsk.pl/przetargi/3160.html');
    assert.equal(r, null);
  });
});

// ---------------------------------------------------------------------------
// parseNoticePage  (fixture: https://bip.um.slupsk.pl/przetargi/2928.html)
// Kopernika 6/4 — II przetarg, cena 150 000 zł, 57,45 m²
// ---------------------------------------------------------------------------
describe('parseNoticePage — Kopernika 6/4', () => {
  const NOTICE_HTML_KOPERNIKA = `
<div class="mx-article">
<h2>II przetarg ustny nieograniczony na sprzedaż części nieruchomości (lokalu mieszkalnego) położonej w Słupsku przy ul. Mikołaja Kopernika 6 stanowiącej własność Miasta Słupska.</h2>
<div class="mx-lead">rozpoczęcie przetargu: 24.07.2025 11:00&nbsp;&bull; Urząd Miejski w Słupsku sala 212</div>
<div class="mx-html">
<p>Lokal mieszkalny nr 4 położony na poddaszu (IV kondygnacja) w budynku przy ul. Mikołaja Kopernika 6 w Słupsku o powierzchni użytkowej 57,45 m 2 składający się z 2 pokoi, kuchni i łazienki wraz z pomieszczeniem przynależnym (piwnica) o powierzchni 6,90 m 2 wraz z udziałem 922/10000 we własności części wspólnych budynku i w prawie własności działek gruntu oznaczonych nr 660/3 i nr 1702/1 o łącznej powierzchni 395 m² w obrębie nr 0006 Miasta Słupska. Dla przedmiotowej nieruchomości Sąd Rejonowy w Słupsku prowadzi KW nr SL1S/00049174/4.</p>
<p>cena wywoławcza nieruchomości wynosi : 15 0 000,00 zł</p>
<p>wadium: 15 0 0 0,00 zł</p>
</div>
<div class="mx-files">
<div class="mx-files-item jpg"><a href="file/120000">rzut (jpg)</a></div>
</div>
</div>
`;

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
// parseResultArchive  (fixture: live 846.html, 2026-06-27)
// ---------------------------------------------------------------------------
describe('parseResultArchive', () => {
  const ARCHIVE_HTML = `
<div class="mx-files"><div class="mx-files-item pdf"><a href="file/124692">wynik II przetargu Sierpinka 2/9 (pdf,&nbsp;32.64&nbsp;KB)</a></div><div class="mx-files-item pdf"><a href="file/124693">wynik I przetargu Filmowa 4/3 (pdf,&nbsp;33.17&nbsp;KB)</a></div></div>
`;

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
// parseResultDoc — negative outcome (fixture: file/124692 Sierpinka 2/9)
// Verified against live PDF text 2026-06-27.
// ---------------------------------------------------------------------------
describe('parseResultDoc — negative (Sierpinka 2/9)', () => {
  // Exact pdftotext -layout output from file/124692 (whitespace normalised for fixture clarity)
  const SIERPINKA_TEXT = `
Słupsk, dnia 25.06.2026r.

Prezydent Miasta Słupska informuje o rozstrzygniętym w dniu 23.06.2026 roku
w Urzędzie Miejskim w Słupsku II nieograniczonym przetargu ustnym dotyczącym
sprzedaży części nieruchomości (lokalu niemieszkalnego), położonego w Słupsku przy
ul. Sierpinka 2 stanowiącego własność Miasta Słupska:
– lokal niemieszkany nr 9 przy ul. Sierpinka 2, KW nr SL1S/00034419/6
– liczba osób dopuszczonych do uczestniczenia w przetargu: 0
– liczba osób niedopuszczonych do uczestniczenia w przetargu: 0
– cena wywoławcza nieruchomości: 75 000,00 zł
– najwyższa cena osiągnięta w przetargu: 0
– ustalony nabywca nieruchomości: przetarg zakończył się wynikiem negatywnym z uwagi
  na brak oferentów.
`;

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
    assert.ok(r.address.building === '2', `expected building=2, got ${r.address.building}`);
    assert.ok(r.address.apt === '9', `expected apt=9, got ${r.address.apt}`);
  });
});

// ---------------------------------------------------------------------------
// parseResultDoc — negative outcome (fixture: file/124693 Filmowa 4/3)
// ---------------------------------------------------------------------------
describe('parseResultDoc — negative (Filmowa 4/3)', () => {
  const FILMOWA_TEXT = `
Słupsk, dnia 25.06.2026r.

Prezydent Miasta Słupska informuje o rozstrzygniętym w dniu 23.06.2026 roku
w Urzędzie Miejskim w Słupsku I nieograniczonym przetargu ustnym dotyczącym
sprzedaży części nieruchomości (lokalu niemieszkalnego), położonego w Słupsku przy
ul. Filmowej 4 stanowiącego własność Miasta Słupska:
– lokal niemieszkany nr 3 przy ul. Filmowej 4, KW nr SL1S/00031495/1
– liczba osób dopuszczonych do uczestniczenia w przetargu: 0
– liczba osób niedopuszczonych do uczestniczenia w przetargu: 0
– cena wywoławcza nieruchomości: 135 000,00 zł
– najwyższa cena osiągnięta w przetargu: 0
– ustalony nabywca nieruchomości: przetarg zakończył się wynikiem negatywnym z uwagi
  na brak oferentów.
`;

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
// parseResultDoc — positive (sold) outcome — synthetic fixture
// Format inferred from the consistent Słupsk result-PDF template.
// VALIDATE this against a real sold-outcome PDF on first live CI run.
// ---------------------------------------------------------------------------
describe('parseResultDoc — positive sold outcome (synthetic)', () => {
  const SOLD_TEXT = `
Słupsk, dnia 15.04.2025r.

Prezydent Miasta Słupska informuje o rozstrzygniętym w dniu 10.04.2025 roku
w Urzędzie Miejskim w Słupsku I nieograniczonym przetargu ustnym dotyczącym
sprzedaży lokalu mieszkalnego, położonego w Słupsku przy
ul. Mochnackiego 14 stanowiącego własność Miasta Słupska:
– lokal mieszkalny nr 8 przy ul. Mochnackiego 14, KW nr SL1S/00131838/9
– liczba osób dopuszczonych do uczestniczenia w przetargu: 2
– liczba osób niedopuszczonych do uczestniczenia w przetargu: 0
– cena wywoławcza nieruchomości: 210 000,00 zł
– najwyższa cena osiągnięta w przetargu: 215 000,00 zł
– ustalony nabywca nieruchomości: Jan Kowalski
`;

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
      /informuje o rozstrzygni[ęe]tym w dniu [^\n]+\n/,
      'informuje o rozstrzygniętym przetargu\n',
    );
    const [r] = parseResultDoc(noDate, '2025-04-10', 'https://bip.um.slupsk.pl/file/99999');
    assert.equal(r.auction_date, '2025-04-10');
  });
});

// ---------------------------------------------------------------------------
// parseResultDoc — edge cases
// ---------------------------------------------------------------------------
describe('parseResultDoc — edge cases', () => {
  it('returns [] on empty text', () => {
    assert.deepEqual(parseResultDoc('', null, 'http://x'), []);
  });

  it('returns [] on unrelated text (not a Słupsk result notice)', () => {
    assert.deepEqual(
      parseResultDoc('Biuletyn Informacji Publicznej Miasta Słupska', null, 'http://x'),
      [],
    );
  });

  it('uses fallbackDate when no date in text', () => {
    const text = `
Prezydent Miasta Słupska informuje o rozstrzygniętym przetargu ustnym
w Urzędzie Miejskim w Słupsku I nieograniczonym przetargu ustnym dotyczącym
sprzedaży lokalu mieszkalnego przy ul. Testowej 5:
– lokal mieszkalny nr 1 przy ul. Testowej 5, KW nr SL1S/00000001/1
– cena wywoławcza nieruchomości: 100 000,00 zł
– najwyższa cena osiągnięta w przetargu: 0
– ustalony nabywca nieruchomości: przetarg zakończył się wynikiem negatywnym.
`;
    const [r] = parseResultDoc(text, '2025-01-15', 'http://x');
    assert.equal(r.auction_date, '2025-01-15');
  });
});
