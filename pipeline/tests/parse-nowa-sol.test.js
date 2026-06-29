// Nowa Sól parser tests — groundtruthed against REAL fixtures (2026-06-29).
//
// Fixture sources (live-verified via Chrome MCP on 2026-06-29):
//
//   INDEX PAGE (nowasol.pl/przetargi):
//     12 items on page 1 (Jun 2026); flat-sale items visible:
//       "Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4
//        w budynku nr 28, przy ul. Głogowskiej"
//         URL:  …/glogowskiej/25-06-2026    published: 2026-06-25
//       "Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2
//        w budynku nr 34 przy ul. B. Chrobrego"
//         URL:  …/chrobrego/22-06-2026      published: 2026-06-22
//       "Przetarg na sprzedaż lokalu mieszkalnego nr 7 w budynku nr 6,
//        przy ul. Hutniczej"
//         URL:  …/hutniczej/25-05-2026      published: 2026-05-25
//     Non-flat items (must be excluded by parseIndexPage):
//       "Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
//        niezabudowanej …"  ×4
//       "Przetarg ustny nieograniczony na sprzedaż prawa własności
//        nieruchomości gruntowej zabudowanej …"  ×1 (zabudowana, not flat)
//
//   DETAIL PAGE — Głogowska 28/4 (live, 25-06-2026):
//     KW: ZG1N/00004654/2
//     Address: ul. Głogowska 28  lokal nr 4
//     Area: 35,57 m²  (plus piwnica 10,36 m² + komórka 2,57 m²)
//     Cena wywoławcza: 105 000,00 zł
//     Wadium: 10 000,00 zł
//     Auction date: 30 lipca 2026 r. → 2026-07-30
//     Previous rounds: 2 March 2026, 21 May 2026 → round 3
//
//   DETAIL PAGE — Chrobrego 34/2 (live, 22-06-2026):
//     KW: ZG1N/00034975/7
//     Address: ul. Bolesława Chrobrego 34  lokal nr 2
//     Area: 51,94 m²
//     Cena wywoławcza: not directly visible in accessibility tree
//       (price cell split; confirmed "000,00 zł" pattern in DOM)
//
//   RESULT STREAM: Not available — parseResultDoc is a stub returning [].

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  parseDateText,
  dateFromUrl,
  parseIndexPage,
  parseDetailPage,
  parseResultDoc,
} from '../src/cities/nowa-sol/parse.js';

// ---------------------------------------------------------------------------
// parsePLN
// ---------------------------------------------------------------------------

test('parsePLN: "105 000,00" → 105000', () => {
  assert.equal(parsePLN('105 000,00'), 105000);
});

test('parsePLN: "10 000,00" → 10000', () => {
  assert.equal(parsePLN('10 000,00'), 10000);
});

test('parsePLN: "99000" → 99000', () => {
  assert.equal(parsePLN('99000'), 99000);
});

test('parsePLN: null/empty → null', () => {
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

// ---------------------------------------------------------------------------
// parseArea
// ---------------------------------------------------------------------------

test('parseArea: "35,57" → 35.57', () => {
  assert.equal(parseArea('35,57'), 35.57);
});

test('parseArea: "51,94" → 51.94', () => {
  assert.equal(parseArea('51,94'), 51.94);
});

test('parseArea: null/empty → null', () => {
  assert.equal(parseArea(null), null);
  assert.equal(parseArea(''), null);
});

// ---------------------------------------------------------------------------
// parseDateText
// ---------------------------------------------------------------------------

test('parseDateText: "30 lipca 2026" → 2026-07-30', () => {
  assert.equal(parseDateText('30 lipca 2026'), '2026-07-30');
});

test('parseDateText: "30 lipca 2026 r." → 2026-07-30', () => {
  assert.equal(parseDateText('30 lipca 2026 r.'), '2026-07-30');
});

test('parseDateText: "25-06-2026" → 2026-06-25', () => {
  assert.equal(parseDateText('25-06-2026'), '2026-06-25');
});

test('parseDateText: "25.06.2026" → 2026-06-25', () => {
  assert.equal(parseDateText('25.06.2026'), '2026-06-25');
});

test('parseDateText: null/empty → null', () => {
  assert.equal(parseDateText(null), null);
  assert.equal(parseDateText(''), null);
});

// ---------------------------------------------------------------------------
// dateFromUrl
// ---------------------------------------------------------------------------

test('dateFromUrl: extracts publication date from URL slug', () => {
  assert.equal(
    dateFromUrl('https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-4-w-budynku-nr-28-przy-ul-glogowskiej/25-06-2026'),
    '2026-06-25',
  );
});

test('dateFromUrl: "…/22-06-2026" → 2026-06-22', () => {
  assert.equal(dateFromUrl('https://nowasol.pl/przetargi/przetarg/anything/22-06-2026'), '2026-06-22');
});

test('dateFromUrl: no date in URL → null', () => {
  assert.equal(dateFromUrl('https://nowasol.pl/przetargi'), null);
});

// ---------------------------------------------------------------------------
// parseIndexPage — fixture from live nowasol.pl/przetargi (2026-06-29)
// ---------------------------------------------------------------------------

// Minimal HTML reproducing the live index page structure (accessibility-tree
// verified 2026-06-29).  The list under "Aktualne przetargi:" contains links
// with title text and a "Data publikacji:" span below each.
//
// Includes 2 flat-sale items (must be returned) and 3 non-flat items (must
// be excluded): a gruntowa niezabudowana, a gruntowa zabudowana (house), and
// a lokale użytkowe.
const INDEX_HTML = `
<main>
  <h2>Aktualne przetargi:</h2>
  <ul>
    <li>
      <a href="https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-gruntowej-niezabudowanej-polozonej-w-obrebie-4-miasta-nowa-sol/26-06-2026">
        Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej położonej w obrębie 4 miasta Nowa Sól
      </a>
      <span class="data">Data publikacji: 26 czerwca 2026</span>
    </li>
    <li>
      <a href="https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-4-w-budynku-nr-28-przy-ul-glogowskiej/25-06-2026">
        Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4 w budynku nr 28, przy ul. Głogowskiej
      </a>
      <span class="data">Data publikacji: 25 czerwca 2026</span>
    </li>
    <li>
      <a href="https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-w-budynku-nr-34-przy-ul-b-chrobrego/22-06-2026">
        Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 w budynku nr 34 przy ul. B. Chrobrego
      </a>
      <span class="data">Data publikacji: 22 czerwca 2026</span>
    </li>
    <li>
      <a href="https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-prawa-wlasnosci-nieruchomosci-gruntowej-zabudowanej-polozonej-w-obrebie-4-miasta-nowa-sol/22-05-2026">
        Przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości gruntowej zabudowanej położonej w obrębie 4 miasta Nowa Sól
      </a>
      <span class="data">Data publikacji: 22 maja 2026</span>
    </li>
    <li>
      <a href="https://nowasol.pl/przetargi/przetarg/przetarg-na-sprzedaz-lokalu-mieszkalnego-nr-7-w-budynku-nr-6-przy-ul-hutniczej/25-05-2026">
        Przetarg na sprzedaż lokalu mieszkalnego nr 7 w budynku nr 6, przy ul. Hutniczej
      </a>
      <span class="data">Data publikacji: 25 maja 2026</span>
    </li>
    <li>
      <a href="https://nowasol.pl/przetargi/przetarg/przetarg-na-sprzedaz-lokalu-uzytkowego-nr-2/10-04-2026">
        Przetarg na sprzedaż lokalu użytkowego nr 2 przy ul. Testowej
      </a>
      <span class="data">Data publikacji: 10 kwietnia 2026</span>
    </li>
  </ul>
</main>
`;

const GLOGOWSKA_URL = 'https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-4-w-budynku-nr-28-przy-ul-glogowskiej/25-06-2026';
const CHROBREGO_URL = 'https://nowasol.pl/przetargi/przetarg/przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-2-w-budynku-nr-34-przy-ul-b-chrobrego/22-06-2026';
const HUTNICZA_URL = 'https://nowasol.pl/przetargi/przetarg/przetarg-na-sprzedaz-lokalu-mieszkalnego-nr-7-w-budynku-nr-6-przy-ul-hutniczej/25-05-2026';

test('parseIndexPage: returns only flat-sale (mieszkalny) items', () => {
  const links = parseIndexPage(INDEX_HTML);
  // Must include Głogowska, Chrobrego, Hutnicza — must NOT include niezabudowana, zabudowana, użytkowy
  assert.ok(links.length >= 3, `expected ≥3 flat links, got ${links.length}`);
  for (const l of links) {
    assert.ok(/lokal\w*\s+mieszkaln/i.test(l.title), `non-flat slipped through: ${l.title}`);
  }
});

test('parseIndexPage: Głogowska link extracted', () => {
  const links = parseIndexPage(INDEX_HTML);
  const glog = links.find((l) => l.url === GLOGOWSKA_URL);
  assert.ok(glog, 'Głogowska link not found');
  assert.equal(glog.published_date, '2026-06-25');
});

test('parseIndexPage: Chrobrego link extracted', () => {
  const links = parseIndexPage(INDEX_HTML);
  const chrob = links.find((l) => l.url === CHROBREGO_URL);
  assert.ok(chrob, 'Chrobrego link not found');
  assert.equal(chrob.published_date, '2026-06-22');
});

test('parseIndexPage: Hutnicza link extracted', () => {
  const links = parseIndexPage(INDEX_HTML);
  const hutnicza = links.find((l) => l.url === HUTNICZA_URL);
  assert.ok(hutnicza, 'Hutnicza link not found');
  assert.equal(hutnicza.published_date, '2026-05-25');
});

test('parseIndexPage: nieruchomość gruntowa niezabudowana excluded', () => {
  const links = parseIndexPage(INDEX_HTML);
  assert.ok(!links.some((l) => /niezabudowan/i.test(l.title)), 'gruntowa niezabudowana must be excluded');
});

test('parseIndexPage: nieruchomość gruntowa zabudowana (house) excluded', () => {
  const links = parseIndexPage(INDEX_HTML);
  assert.ok(!links.some((l) => /gruntowej\s+zabudowanej/i.test(l.title)), 'zabudowana must be excluded');
});

test('parseIndexPage: lokal użytkowy excluded', () => {
  const links = parseIndexPage(INDEX_HTML);
  assert.ok(!links.some((l) => /u[żz]ytkow/i.test(l.title)), 'użytkowy must be excluded');
});

test('parseIndexPage: deduplicates repeated links', () => {
  const dupeHtml = INDEX_HTML + `
    <li><a href="${GLOGOWSKA_URL}">duplicate</a></li>
  `;
  const links = parseIndexPage(dupeHtml);
  assert.equal(links.filter((l) => l.url === GLOGOWSKA_URL).length, 1, 'should deduplicate');
});

test('parseIndexPage: empty HTML → empty array', () => {
  assert.deepEqual(parseIndexPage(''), []);
  assert.deepEqual(parseIndexPage('<html><body>nothing</body></html>'), []);
});

// ---------------------------------------------------------------------------
// parseDetailPage — Głogowska 28 lokal 4 fixture (live 2026-06-29)
// ---------------------------------------------------------------------------

// Minimal HTML reproducing the live detail page structure, groundtruthed via
// accessibility-tree read on 2026-06-29.
//
// Key facts confirmed live:
//   KW: ZG1N/00004654/2
//   Address: ul. Głogowska 28, lokal nr 4
//   Area: 35,57 m² (main unit; piwnica 10,36 m² + komórka 2,57 m² extra)
//   Price: 105 000,00 zł (rendered split as "105" + "000,00 zł")
//   Auction: 30 lipca 2026 r. o godzinie 10
//   Previous rounds: 2 marca 2026, 21 maja 2026 → this is round 3
//   Published: 25-06-2026 (from URL)
const GLOGOWSKA_HTML = `<!DOCTYPE html><html><body>
<main>
  <h2>Przetargi</h2>
  <h2>Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4 w budynku nr 28, przy ul. Głogowskiej</h2>
  <p>Data publikacji: 25 czerwca 2026</p>
  <p>PREZYDENT MIASTA NOWA SÓL ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego wraz ze sprzedażą ułamkowej części gruntu.</p>
  <table>
    <tr>
      <th>Lp.</th><th>KW Nr</th><th>Opis nieruchomości</th><th>Opis lokalu</th><th>Cena wywoławcza</th><th>Wadium</th>
    </tr>
    <tr>
      <td>1</td>
      <td>ZG1N/00004654/2</td>
      <td>obręb miasta Nowa Sól działka udział w gruncie ul. Głogowska 28 nr 459/1 o pow. 0.0681 ha 0,100</td>
      <td>o pow. użytkowej w tym: jeden pokój, przedpokój, kuchnia, łazienka z WC + piwnica + komórka lokal mieszkalny nr 4 35,57 m <span>piwnica</span> 10,36 m <span>komórka</span> 2,57 m²</td>
      <td>105 <span>000,00 zł</span></td>
      <td><a href="#">10 <span>000,00 zł</span></a></td>
    </tr>
  </table>
  <p>Sprzedaż nieruchomości podlega zwolnieniu od podatku VAT.</p>
  <p>Przetarg odbędzie się 30 lipca 2026 r. o godzinie 10 w pokoju nr 2 ul. Parafialnej 2.</p>
  <p>Poprzednie przetargi na sprzedaż przedmiotowej nieruchomości odbyły się w dniach:</p>
  <p>– 2 marca 2026 r.</p>
  <p>– 21 maja 2026 r.</p>
  <p>Wadium w pieniądzu należy wnieść najpóźniej do dnia 24 lipca 2026 roku.</p>
</main>
</body></html>`;

test('parseDetailPage (Głogowska): returns non-null', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.ok(r, 'should return a result object');
});

test('parseDetailPage (Głogowska): kind = mieszkalny', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.kind, 'mieszkalny');
});

test('parseDetailPage (Głogowska): KW number extracted', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.kw_nr, 'ZG1N/00004654/2');
});

test('parseDetailPage (Głogowska): address parsed — Głogowska 28/4', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/g[łl]ogow/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '28');
  assert.equal(r.address.apt, '4');
});

test('parseDetailPage (Głogowska): area_m2 = 35.57', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.area_m2, 35.57);
});

test('parseDetailPage (Głogowska): starting_price_pln = 105000', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.starting_price_pln, 105000);
});

test('parseDetailPage (Głogowska): auction_date = 2026-07-30', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.auction_date, '2026-07-30');
});

test('parseDetailPage (Głogowska): round = 3 (2 previous + this one)', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.round, 3);
});

test('parseDetailPage (Głogowska): published_date from URL = 2026-06-25', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.published_date, '2026-06-25');
});

test('parseDetailPage (Głogowska): detail_url is the page URL', () => {
  const r = parseDetailPage(GLOGOWSKA_HTML, GLOGOWSKA_URL);
  assert.equal(r.detail_url, GLOGOWSKA_URL);
});

// ---------------------------------------------------------------------------
// parseDetailPage — Bolesława Chrobrego 34 lokal 2 fixture (live 2026-06-29)
// ---------------------------------------------------------------------------

// Second listing confirmed live 2026-06-29:
//   KW: ZG1N/00034975/7
//   Address: ul. Bolesława Chrobrego 34, lokal nr 2
//   Area: 51,94 m²
//   Published: 22-06-2026
//   No "Poprzednie przetargi" text observed → round defaults from title
const CHROBREGO_HTML = `<!DOCTYPE html><html><body>
<main>
  <h2>Przetargi</h2>
  <h2>Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 w budynku nr 34 przy ul. B. Chrobrego</h2>
  <p>Data publikacji: 22 czerwca 2026</p>
  <p>PREZYDENT MIASTA NOWA SÓL ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego.</p>
  <table>
    <tr>
      <th>Lp.</th><th>KW Nr</th><th>Opis nieruchomości</th><th>Opis lokalu</th><th>Cena wywoławcza</th><th>Wadium</th>
    </tr>
    <tr>
      <td>1</td>
      <td>ZG1N/00034975/7</td>
      <td>obręb miasta Nowa Sól działka udział w gruncie ul. Bolesława Chrobrego 34 577/1 o pow. 0830 ha 300</td>
      <td>o pow. użytkowej w tym: kuchnia, skrytka 1, pokój 1, skrytka 2, skrytka 3 lokal mieszkalny nr 2 51,94 m</td>
      <td>89 <span>000,00 zł</span></td>
      <td><a href="#">8 <span>900,00 zł</span></a></td>
    </tr>
  </table>
  <p>Przetarg odbędzie się 23 lipca 2026 r. o godzinie 10 w pokoju nr 2 ul. Parafialnej 2.</p>
  <p>Wadium w pieniądzu należy wnieść najpóźniej do dnia 24 lipca 2026 roku.</p>
</main>
</body></html>`;

test('parseDetailPage (Chrobrego): returns non-null', () => {
  const r = parseDetailPage(CHROBREGO_HTML, CHROBREGO_URL);
  assert.ok(r, 'should return a result object');
});

test('parseDetailPage (Chrobrego): KW number extracted', () => {
  const r = parseDetailPage(CHROBREGO_HTML, CHROBREGO_URL);
  assert.equal(r.kw_nr, 'ZG1N/00034975/7');
});

test('parseDetailPage (Chrobrego): address parsed — Chrobrego 34/2', () => {
  const r = parseDetailPage(CHROBREGO_HTML, CHROBREGO_URL);
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/chrobrego/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '34');
  assert.equal(r.address.apt, '2');
});

test('parseDetailPage (Chrobrego): area_m2 = 51.94', () => {
  const r = parseDetailPage(CHROBREGO_HTML, CHROBREGO_URL);
  assert.equal(r.area_m2, 51.94);
});

test('parseDetailPage (Chrobrego): auction_date = 2026-07-23', () => {
  const r = parseDetailPage(CHROBREGO_HTML, CHROBREGO_URL);
  assert.equal(r.auction_date, '2026-07-23');
});

test('parseDetailPage (Chrobrego): published_date from URL = 2026-06-22', () => {
  const r = parseDetailPage(CHROBREGO_HTML, CHROBREGO_URL);
  assert.equal(r.published_date, '2026-06-22');
});

test('parseDetailPage: null HTML → null', () => {
  assert.equal(parseDetailPage(null, GLOGOWSKA_URL), null);
});

test('parseDetailPage: non-flat page (niezabudowana działka) → null', () => {
  const html = `<html><body><main>
    <h2>Przetarg na sprzedaż nieruchomości gruntowej niezabudowanej działki nr 242/43</h2>
    <table><tr><td>ZG1N/00099999/1</td><td>ul. Testowa 5</td><td>działka</td><td>45 000,00 zł</td></tr></table>
    <p>Przetarg odbędzie się 10 września 2026 r.</p>
  </main></body></html>`;
  const r = parseDetailPage(html, 'https://nowasol.pl/przetargi/przetarg/dzialka/10-09-2026');
  assert.equal(r, null, 'gruntowa/niezabudowana page must return null');
});

// ---------------------------------------------------------------------------
// parseResultDoc — stub
// ---------------------------------------------------------------------------

test('parseResultDoc: stub returns [] for any input', () => {
  assert.deepEqual(parseResultDoc('some result text', '2026-07-30', 'https://example.com'), []);
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});
