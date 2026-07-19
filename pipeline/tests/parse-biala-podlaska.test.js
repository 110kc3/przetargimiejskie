// Biała Podlaska (ZGL) parser tests. Fixtures below are groundtruthed against
// REAL fetched pages (2026-07-18):
//   - https://www.zglbp.pl/przetargi?filtruj=1&rodzaj=sprzedaz_nieruchomosci
//   - the Kopernika 7 lok. 9 detail page (r4250241)
//   - the Plac Wolności 12 lok. 14 detail page (r6583543, currently "w toku")
//   - the Brzeska 36 detail page (r11552392) — titled "nieruchomości
//     gruntowej" but its OWN body prose reveals two commercial buildings on
//     the parcel, i.e. it is actually 'zabudowana', not 'grunt'.
//   - the Narutowicza 30 detail page (r62137207) — titled "nieruchomości
//     gruntowej", with a sparse/attachment-only body (no inline prose).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseListRows, crawlActive } from '../src/cities/biala-podlaska/crawl.js';
import {
  parsePLN,
  priceFromText,
  areaFromText,
  landAreaFromText,
  dzialkaNrFromText,
  roundFromTitle,
  lokalNrFromTitle,
  streetBuildingFromTitle,
  addressFromTitle,
  kindFromText,
  parseResultDoc,
} from '../src/cities/biala-podlaska/parse.js';

// ---- list page (real markup shape from /przetargi?filtruj=1&rodzaj=sprzedaz_nieruchomosci) ----

const LIST_HTML = `</div><div class="listing"><div class="wiersz">
	<div>1</div>
	<div>2026-06-16 </div>
	<div>2026-06-24 </div>
	<div><a href="/sprzedaz-lokalu-uzytkowego-oznaczonego-nr-14-polozonego-na-parterze-w-budynku-handlowouslugowym-wielolokalowym-przy-ul--plac-wolnosci-12-w-bialej-podlaskiej_-o-powierzchni-uzytkowej-40_9-m_-wraz-z-udzialem-w-nieruchomosci-wspolnej-,r6583543">Sprzedaż lokalu użytkowego oznaczonego nr 14 położonego na parterze w budynku handlowo–usługowym wielolokalowym przy ul. Plac Wolności 12 w Białej Podlaskiej, o powierzchni użytkowej 40,9 m², wraz z udziałem w nieruchomości wspólnej.</a></div>
	<div>w toku </div>
	<div><img src="/grafika/no_pdf.png" alt=""></div>
</div><div class="wiersz">
	<div>2</div>
	<div>2025-08-07 </div>
	<div>2025-08-22 </div>
	<div><a href="/przetarg-ustny-aukcja-w-trybie-kodeksu-cywilnego-na-sprzedaz-lokalu-mieszkalnego-oznaczonego-nr-9-polozonego-na-ii-pietrze-iii-kondygnacji-budynku-wielorodzinnego-przy-ul--kopernika-7-w-bialej-podlaskiej-,r4250241">Przetarg ustny (aukcja) w trybie Kodeksu cywilnego na sprzedaż lokalu mieszkalnego oznaczonego nr 9 położonego na II piętrze (III kondygnacji) budynku wielorodzinnego przy ul. Kopernika 7 w Białej Podlaskiej.</a></div>
	<div>zakończone </div>
	<div><img src="/grafika/no_pdf.png" alt=""></div>
</div></div>`;

test('parseListRows extracts published/auction dates, href, title, status', () => {
  const rows = parseListRows(LIST_HTML);
  assert.equal(rows.length, 2);

  const plac = rows[0];
  assert.equal(plac.published_date, '2026-06-16');
  assert.equal(plac.auction_date, '2026-06-24');
  assert.equal(plac.status, 'w toku');
  assert.match(plac.href, /,r6583543$/);
  assert.match(plac.title, /Plac Wolności 12/);

  const kopernika = rows[1];
  assert.equal(kopernika.published_date, '2025-08-07');
  assert.equal(kopernika.auction_date, '2025-08-22');
  assert.equal(kopernika.status, 'zakończone');
  assert.match(kopernika.title, /Kopernika 7/);
});

test('parseListRows: empty/non-list HTML yields no rows', () => {
  assert.deepEqual(parseListRows('<html><body>nic</body></html>'), []);
});

// ---- title extraction (address / lokal nr / round) ------------------------

const T_KOPERNIKA_BARE =
  'Przetarg ustny (aukcja) w trybie Kodeksu cywilnego na sprzedaż lokalu mieszkalnego oznaczonego nr 9 położonego na II piętrze (III kondygnacji) budynku wielorodzinnego przy ul. Kopernika 7 w Białej Podlaskiej.';
const T_KOPERNIKA_DRUGI =
  'Drugi przetarg ustny (aukcję) w trybie Kodeksu cywilnego na sprzedaż lokalu mieszkalnego oznaczonego nr 9 położonego na II piętrze (III kondygnacji) budynku wielorodzinnego przy ul. Kopernika 7 w Białej Podlaskiej.';
const T_KOLEJOWA_PIATY =
  'Piąty przetarg ustny (aukcję) w trybie Kodeksu cywilnego na sprzedaż lokalu mieszkalnego oznaczonego nr 5 położonego na I piętrze budynku wielorodzinnego przy ul. Kolejowej 30 w Białej Podlaskiej.';
const T_KOLEJOWA_TRZECI_PLAIN =
  'Trzeci przetarg ustny na sprzedaż lokalu mieszkalnego oznaczonego nr 5 położonego na I piętrze budynku wielorodzinnego przy ul. Kolejowej 30 w Białej Podlaskiej.';
const T_PLAC_WOLNOSCI =
  'Sprzedaż lokalu użytkowego oznaczonego nr 14 położonego na parterze w budynku handlowo–usługowym wielolokalowym przy ul. Plac Wolności 12 w Białej Podlaskiej, o powierzchni użytkowej 40,9 m², wraz z udziałem w nieruchomości wspólnej.';
const T_NARUTOWICZA_DRUGI =
  'Drugi przetarg ustny (aukcja) w trybie Kodeksu cywilnego na sprzedaż nieruchomości gruntowej zlokalizowanej przy ul. Narutowicza 30  w Białej Podlaskiej.';
const T_PRZECHODNIA_BARE_NO_PRZETARG =
  'Sprzedaż nieruchomości gruntowej zlokalizowanej przy ul. Przechodniej 2 w Białej Podlaskiej';
const T_PRZECHODNIA_DOUBLE_SPACE =
  'Przetarg na  na sprzedaż nieruchomości gruntowej zlokalizowanej przy ul. Przechodniej 2 w Białej Podlaskiej';

test('streetBuildingFromTitle pulls "<street> <bldg>" across title variants', () => {
  assert.equal(streetBuildingFromTitle(T_KOPERNIKA_BARE), 'Kopernika 7');
  assert.equal(streetBuildingFromTitle(T_PLAC_WOLNOSCI), 'Plac Wolności 12');
  assert.equal(streetBuildingFromTitle(T_NARUTOWICZA_DRUGI), 'Narutowicza 30');
  assert.equal(streetBuildingFromTitle(T_PRZECHODNIA_BARE_NO_PRZETARG), 'Przechodniej 2');
  assert.equal(streetBuildingFromTitle(T_PRZECHODNIA_DOUBLE_SPACE), 'Przechodniej 2');
});

test('lokalNrFromTitle extracts the "oznaczonego/oznaczonym nr N" apartment number', () => {
  assert.equal(lokalNrFromTitle(T_KOPERNIKA_BARE), '9');
  assert.equal(lokalNrFromTitle(T_PLAC_WOLNOSCI), '14');
  assert.equal(lokalNrFromTitle(T_NARUTOWICZA_DRUGI), null); // land — no lokal
});

test('roundFromTitle: ordinal qualifies "przetarg"; bare "przetarg" = 1; no "przetarg" word = null', () => {
  assert.equal(roundFromTitle(T_KOPERNIKA_BARE), 1);
  assert.equal(roundFromTitle(T_KOPERNIKA_DRUGI), 2);
  assert.equal(roundFromTitle(T_KOLEJOWA_PIATY), 5);
  assert.equal(roundFromTitle(T_KOLEJOWA_TRZECI_PLAIN), 3);
  assert.equal(roundFromTitle(T_NARUTOWICZA_DRUGI), 2);
  assert.equal(roundFromTitle(T_PRZECHODNIA_BARE_NO_PRZETARG), null);
  assert.equal(roundFromTitle(T_PRZECHODNIA_DOUBLE_SPACE), 1);
});

test('addressFromTitle builds the address+apt key for a flat', () => {
  const a = addressFromTitle(T_KOPERNIKA_BARE);
  assert.ok(a);
  assert.equal(a.key, 'kopernika|7|9');
});

test('addressFromTitle builds the address+apt key for a commercial unit (Plac)', () => {
  const a = addressFromTitle(T_PLAC_WOLNOSCI);
  assert.ok(a);
  assert.equal(a.key, 'plac wolnosci|12|14');
});

test('addressFromTitle builds a bare street+building key for land (no lokal nr)', () => {
  const a = addressFromTitle(T_NARUTOWICZA_DRUGI);
  assert.ok(a);
  assert.equal(a.key, 'narutowicza|30|');
});

test('addressFromTitle returns null when the title has no "przy ul. ..." clause', () => {
  assert.equal(addressFromTitle('Wykonanie usługi zarządzania siecią e-Miasto'), null);
});

// ---- body-text extraction (price / area / dzialka) -------------------------

// Kopernika 7 lok. 9 detail body (dot-thousands price; usable + plot area).
const BODY_KOPERNIKA =
  'Zarząd Zakładu Gospodarki Lokalowej Spółka z o.o. w Białej Podlaskiej ogłasza przetarg ustny (aukcję) w trybie Kodeksu cywilnego na sprzedaż lokalu mieszkalnego oznaczonego nr 9 położonego na II piętrze (III kondygnacji) budynku wielorodzinnego przy ul. Kopernika 7 w Białej Podlaskiej, usytuowanego na nieruchomości gruntowej stanowiącej działkę nr ewid. 1217/8 o łącznej powierzchni 353 m², składającego się z dwóch pokoi, kuchni, łazienki z wc i przedpokoju o powierzchni 77,80 m² - wraz z udziałem wynoszącym 0,012 w nieruchomości wspólnej. Cena wywoławcza nieruchomości wynosi 330.000,00 złotych netto, słownie: trzysta trzydzieści tysięcy złotych. Warunkiem przystąpienia do przetargu jest wpłacenie wadium w wysokości 16.500,00 złotych.';

// Plac Wolności 12 lok. 14 detail body (space-thousands price; single area).
const BODY_PLAC_WOLNOSCI =
  'Zakład Gospodarki Lokalowej Spółka z o.o. w Białej Podlaskiej ogłasza przetarg ustny (aukcję) w trybie Kodeksu cywilnego na sprzedaż do wyodrębnienia lokalu użytkowego oznaczonego nr 14 położonego na parterze w budynku handlowo–usługowym wielolokalowym przy ul. Plac Wolności 12 w Białej Podlaskiej, o powierzchni użytkowej 40,9 m², wraz z udziałem wynoszącym 0,049 w nieruchomości wspólnej. Cena wywoławcza lokalu wynosi 250 000,00 złotych netto, słownie: dwieście pięćdziesiąt tysięcy złotych. Warunkiem przystąpienia do przetargu jest wpłacenie wadium w wysokości 12.500,00 zł.';

// Brzeska 36 detail body — titled "nieruchomości gruntowej" but actually a
// BUILT parcel (two commercial buildings) per its own prose.
const BODY_BRZESKA =
  'Zarząd Zakładu Gospodarki Lokalowej Spółka z o.o. w Białej Podlaskiej ogłasza przetarg ustny (aukcję) w trybie Kodeksu cywilnego na sprzedaż nieruchomości gruntowej zlokalizowanej przy ul. Brzeskiej 36 w Białej Podlaskiej stanowiącej działkę nr ew. 1650/2, obręb 0001, o powierzchni 395 m², zabudowaną budynkiem handlowo – usługowym niepodpiwniczonym, parterowym z poddaszem nieużytkowym, o konstrukcji drewnianej, o powierzchni zabudowy 154 m² (powierzchnia użytkowa około 123,2 m²) oraz budynkiem handlowo – usługowym, niepodpiwniczonym, parterowym z poddaszem nieużytkowym o konstrukcji mieszanej, o powierzchni zabudowy 178 m² (powierzchnia użytkowa około 142,4 m²), dla której to nieruchomości urządzona jest księga wieczysta o nr LU1B/00079945/1. Cena wywoławcza nieruchomości wynosi 300.000,00 złotych netto, słownie: trzysta tysięcy złotych.';

// Narutowicza 30 detail body — sparse/attachment-only, no inline prose at all.
const BODY_NARUTOWICZA_SPARSE = 'Ogłoszenie o przetargu - - Warunki przetargu ustnego -';

test('parsePLN handles both dot- and space-grouped thousands', () => {
  assert.equal(parsePLN('330.000,00'), 330000);
  assert.equal(parsePLN('250 000,00'), 250000);
  assert.equal(parsePLN('16.500,00'), 16500);
  assert.equal(parsePLN(''), null);
  assert.equal(parsePLN(null), null);
});

test('priceFromText reads "cena wywoławcza ... wynosi ... zł", not the wadium clause', () => {
  assert.equal(priceFromText(BODY_KOPERNIKA), 330000);
  assert.equal(priceFromText(BODY_PLAC_WOLNOSCI), 250000);
  assert.equal(priceFromText(BODY_BRZESKA), 300000);
  assert.equal(priceFromText(BODY_NARUTOWICZA_SPARSE), null);
});

test('areaFromText reads the labelled "powierzchni użytkowej" figure', () => {
  assert.equal(areaFromText(BODY_KOPERNIKA), 77.8);
  assert.equal(areaFromText(BODY_PLAC_WOLNOSCI), 40.9);
  // Brzeska has TWO usable-area phrases (one per building) — first wins.
  assert.equal(areaFromText(BODY_BRZESKA), 123.2);
  assert.equal(areaFromText(BODY_NARUTOWICZA_SPARSE), null);
});

test('landAreaFromText reads the parcel-level (not unit-level) area', () => {
  assert.equal(landAreaFromText(BODY_BRZESKA), 395);
  // Kopernika 7/9 is a FLAT, but its boilerplate still names the building's
  // underlying parcel ("stanowiącej działkę ... o łącznej powierzchni 353
  // m²") — landAreaFromText is a pure text primitive and correctly returns it;
  // it's crawl.js's job to only attach this as land_area_m2 for 'grunt'/
  // 'zabudowana' (whole-property) records, never for a single flat/unit.
  assert.equal(landAreaFromText(BODY_KOPERNIKA), 353);
  // A commercial-unit announcement with no działka clause at all -> null.
  assert.equal(landAreaFromText(BODY_PLAC_WOLNOSCI), null);
});

test('dzialkaNrFromText extracts the cadastral parcel number', () => {
  assert.equal(dzialkaNrFromText(BODY_KOPERNIKA), '1217/8');
  assert.equal(dzialkaNrFromText(BODY_BRZESKA), '1650/2');
  assert.equal(dzialkaNrFromText(BODY_PLAC_WOLNOSCI), null);
});

// ---- kind classification (title vs. title+body) ----------------------------

test('kindFromText: title-only "grunt" flips to zabudowana once the body reveals buildings', () => {
  const titleOnly = kindFromText(
    'Przetarg ustny (aukcja) w trybie Kodeksu Cywilnego na sprzedaż nieruchomości gruntowej zlokalizowanej przy ul. Brzeskiej 36 w Białej Podlaskiej stanowiącej działkę nr ew. 1650/2.',
    '',
  );
  assert.equal(titleOnly, 'grunt', 'title alone reads as land');
  const withBody = kindFromText(
    'Przetarg ustny (aukcja) w trybie Kodeksu Cywilnego na sprzedaż nieruchomości gruntowej zlokalizowanej przy ul. Brzeskiej 36 w Białej Podlaskiej stanowiącej działkę nr ew. 1650/2.',
    BODY_BRZESKA,
  );
  assert.equal(withBody, 'zabudowana', 'body prose reveals two buildings on the parcel');
});

test('kindFromText: a sparse/attachment-only body falls back to the title-only classification', () => {
  assert.equal(kindFromText(T_NARUTOWICZA_DRUGI, BODY_NARUTOWICZA_SPARSE), 'grunt');
});

test('kindFromText: a flat title classifies as mieszkalny regardless of body', () => {
  assert.equal(kindFromText(T_KOPERNIKA_BARE, BODY_KOPERNIKA), 'mieszkalny');
});

test('kindFromText: a commercial-unit title classifies as uzytkowy', () => {
  assert.equal(kindFromText(T_PLAC_WOLNOSCI, BODY_PLAC_WOLNOSCI), 'uzytkowy');
});

// ---- contract stubs ---------------------------------------------------------

test('parseResultDoc is a stub — always returns []', () => {
  assert.deepEqual(parseResultDoc('anything', '2026-01-01', 'https://www.zglbp.pl/x'), []);
});

test('crawlActive and parseListRows are exported functions (contract shape)', () => {
  assert.equal(typeof crawlActive, 'function');
  assert.equal(typeof parseListRows, 'function');
});
