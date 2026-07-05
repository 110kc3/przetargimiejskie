// Bełchatów parser tests — groundtruthed against REAL fixtures (fetched live
// 2026-07-05 via the belchatow.pl WordPress REST API).
//
// Fixture sources (live-verified):
//
//   ANNOUNCEMENT (news prose, category 215):
//     "Miasto wystawia mieszkanie na sprzedaż. Sprawdź ofertę" (2026-05-27)
//       https://belchatow.pl/miasto-wystawia-mieszkanie-na-sprzedaz-sprawdz-oferte/
//       → os. Dolnośląskim, bloku nr 306 · 52,83 mkw · 276 724,00 zł · 30 czerwca 2026
//     "Miasto wystawiło na sprzedaż mieszkanie" (2025-06-12)
//       https://belchatow.pl/miasto-wystawilo-na-sprzedaz-mieszkanie/
//       → os. Dolnośląskim 225 · 36,72 mkw · 192 340,00 zł · 4 lipca 2025
//
//   The <p> bodies below are copied verbatim from the two live posts'
//   content.rendered (image galleries/scripts trimmed; the parser strips tags
//   so parsed values are identical to the live posts). crawlActive parsed both
//   correctly end-to-end against the live REST API on 2026-07-05.
//
//   RESULT NOTICE: Bełchatów publishes flat result notices only on
//   belchatow.bip.gov.pl (none on belchatow.pl to date), so parseResultDoc is
//   groundtruthed against the standard Polish "Informacja o wyniku …" template.
//   VALIDATE on the first live result.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  parseDateText,
  roundFromText,
  isFlatSaleAnnouncement,
  parseAnnouncementPost,
  parseResultDoc,
} from '../src/cities/belchatow/parse.js';

// ---------------------------------------------------------------------------
// Numeric / date helpers
// ---------------------------------------------------------------------------

test('parsePLN: "276 724,00 zł" → 276724', () => {
  assert.equal(parsePLN('276 724,00'), 276724);
});

test('parsePLN: nbsp-grouped "192 340,00" → 192340', () => {
  assert.equal(parsePLN('192 340,00'), 192340);
});

test('parsePLN: null/empty → null', () => {
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

test('parseArea: "52,83" → 52.83', () => {
  assert.equal(parseArea('52,83'), 52.83);
});

test('parseArea: "36.72" → 36.72', () => {
  assert.equal(parseArea('36.72'), 36.72);
});

test('parseDateText: "30 czerwca 2026" → 2026-06-30', () => {
  assert.equal(parseDateText('30 czerwca 2026'), '2026-06-30');
});

test('parseDateText: "04.07.2025" → 2025-07-04', () => {
  assert.equal(parseDateText('04.07.2025'), '2025-07-04');
});

// ---------------------------------------------------------------------------
// roundFromText — "drugim piętrze" (2nd FLOOR) must NOT be read as round 2
// ---------------------------------------------------------------------------

test('roundFromText: bare announcement → 1', () => {
  assert.equal(roundFromText('Przetarg odbędzie się 30 czerwca.'), 1);
});

test('roundFromText: "na drugim piętrze" → 1 (floor, not round)', () => {
  assert.equal(roundFromText('mieszkanie na drugim piętrze, ładny widok'), 1);
});

test('roundFromText: "drugi ustny przetarg" → 2', () => {
  assert.equal(roundFromText('ogłoszenie o drugim ustnym przetargu nieograniczonym'), 2);
});

test('roundFromText: "II przetarg" → 2', () => {
  assert.equal(roundFromText('II przetarg nieograniczony na sprzedaż lokalu'), 2);
});

// ---------------------------------------------------------------------------
// isFlatSaleAnnouncement — predicate that filters the WordPress search noise
// ---------------------------------------------------------------------------

test('isFlatSaleAnnouncement: real flat announcement → true', () => {
  assert.equal(
    isFlatSaleAnnouncement(
      'Miasto wystawia mieszkanie na sprzedaż',
      'Miasto wycenia mieszkanie na 276 724,00 zł. Taka właśnie jest cena wywoławcza.',
    ),
    true,
  );
});

test('isFlatSaleAnnouncement: wykup komunalny z bonifikatą → false', () => {
  assert.equal(
    isFlatSaleAnnouncement(
      'Wykup mieszkanie komunalne ze sporą bonifikatą',
      'Skorzystaj z bonifikaty na wykup lokalu komunalnego.',
    ),
    false,
  );
});

test('isFlatSaleAnnouncement: najem lokalu użytkowego → false', () => {
  assert.equal(
    isFlatSaleAnnouncement(
      'Ogłoszenie o przetargu na najem lokalu użytkowego',
      'Przetarg na najem. Cena wywoławcza czynszu ...',
    ),
    false,
  );
});

test('isFlatSaleAnnouncement: działka na sprzedaż → false', () => {
  assert.equal(
    isFlatSaleAnnouncement(
      'Działka na sprzedaż – sprawdź miejską ofertę',
      'Przetarg na sprzedaż działki. Cena wywoławcza 45 000,00 zł.',
    ),
    false,
  );
});

// ---------------------------------------------------------------------------
// parseAnnouncementPost — REAL fixture #1 (2026-05-27, os. Dolnośląskim 306)
// ---------------------------------------------------------------------------

const POST_2026 = {
  title: 'Miasto wystawia mieszkanie na sprzedaż. Sprawdź ofertę',
  date: '2026-05-27T11:23:53',
  link: 'https://belchatow.pl/miasto-wystawia-mieszkanie-na-sprzedaz-sprawdz-oferte/',
  content: `
<p class="wp-block-paragraph">Licytacja będzie dotyczyć mieszkania o powierzchni prawie 53 mkw.</p>
<p class="wp-block-paragraph">Miasto wystawiło właśnie na sprzedaż mieszkanie na os. Dolnośląskim w świetnej lokalizacji i atrakcyjnej cenie. Licytacja rozpocznie się bowiem od niecałych 277 tys. zł.</p>
<p class="wp-block-paragraph">Mieszkanie, które chce sprzedać miasto, znajduje się na os. Dolnośląskim w bloku nr 306 na drugim piętrze. Lokalizacja jest bardzo atrakcyjna. W pobliży znajdują się bowiem szkoła podstawowa, liceum ogólnokształcące, przedszkole i park. Zaletą jest także bliskość do kilku marketów oraz przystanków autobusowych.</p>
<p class="wp-block-paragraph">Lokal ma dokładnie 52,83 mkw. Składa się z trzech pokoi, kuchni, łazienki, wc i przedpokoju, dodatkowo przynależy do niego komórka. Mieszkanie nadaje się do odświeżenia. Będzie to możliwe we wtorek 16 czerwca w godz. 16:00 – 17:30.</p>
<p class="wp-block-paragraph">Miasto wycenia mieszkanie na 276&nbsp;724,00 zł. Taka właśnie jest cena wywoławcza. Przetarg odbędzie się 30 czerwca w siedzibie Urzędu Miasta Bełchatowa (ul. Kościuszki 1, sala 316). Żeby wziąć w nim udział, należy wpłacić wadium, które wynosi 10 proc. ceny wywoławczej nieruchomości.</p>
<p class="wp-block-paragraph">Więcej informacji można znaleźć w ogłoszeniu o przetargu, które znajduje się w BIP-ie&nbsp;<a href="https://belchatow.bip.gov.pl/przetargi/ogloszenie-o-ustnym-przetargu-nieograniczonym-na-zbycie-lokalu-mieszkalnego-wraz-z-ulamkowa-czescia-gruntu-stanowiacej-wlasnosc-miasta-belchatowa.html">TUTAJ</a>. Pod numerem telefonu: 44&nbsp;733 51 78.</p>
`,
};

test('parseAnnouncementPost #2026: returns a record', () => {
  const r = parseAnnouncementPost(POST_2026);
  assert.ok(r, 'should return a listing record');
  assert.equal(r.kind, 'mieszkalny');
});

test('parseAnnouncementPost #2026: address os. Dolnośląskie 306', () => {
  const r = parseAnnouncementPost(POST_2026);
  assert.ok(/dolnoslask/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '306');
  assert.equal(r.address.apt, null);
});

test('parseAnnouncementPost #2026: area_m2 52.83', () => {
  assert.equal(parseAnnouncementPost(POST_2026).area_m2, 52.83);
});

test('parseAnnouncementPost #2026: starting_price_pln 276724', () => {
  assert.equal(parseAnnouncementPost(POST_2026).starting_price_pln, 276724);
});

test('parseAnnouncementPost #2026: auction_date 2026-06-30', () => {
  assert.equal(parseAnnouncementPost(POST_2026).auction_date, '2026-06-30');
});

test('parseAnnouncementPost #2026: round 1', () => {
  assert.equal(parseAnnouncementPost(POST_2026).round, 1);
});

test('parseAnnouncementPost #2026: final_price_pln null (announcement)', () => {
  assert.equal(parseAnnouncementPost(POST_2026).final_price_pln, null);
});

test('parseAnnouncementPost #2026: BIP deep-link captured', () => {
  const r = parseAnnouncementPost(POST_2026);
  assert.ok(r.bip_url?.includes('belchatow.bip.gov.pl/przetargi/'), `bip_url: ${r.bip_url}`);
});

// ---------------------------------------------------------------------------
// parseAnnouncementPost — REAL fixture #2 (2025-06-12, os. Dolnośląskim 225)
// ---------------------------------------------------------------------------

const POST_2025 = {
  title: 'Miasto wystawiło na sprzedaż mieszkanie',
  date: '2025-06-12T11:52:18',
  link: 'https://belchatow.pl/miasto-wystawilo-na-sprzedaz-mieszkanie/',
  content: `
<p class="wp-block-paragraph">Licytacja będzie dotyczyć mieszkania o powierzchni blisko 37 mkw</p>
<p class="wp-block-paragraph">Miasto wystawiło właśnie na sprzedaż mieszkanie na os. Dolnośląskim w świetnej lokalizacji i atrakcyjnej cenie. Licytacja rozpocznie się bowiem od nieco ponad 192 tys. zł.</p>
<p class="wp-block-paragraph">Mieszkanie, które chce sprzedać miasto, znajduje się na os. Dolnośląskim 225, na drugim piętrze. Lokal ma dokładnie 36,72 mkw. Składa się z dwóch pokoi, otwartej kuchni, przedpokoju oraz łazienki z wc. Będzie to możliwe we wtorek 24 czerwca w godz. 16:00 &#8211; 17:00.</p>
<p class="wp-block-paragraph">Miasto wyceniło lokal na 192&nbsp;340,00 zł. Taka właśnie jest cena wywoławcza. Przetarg odbędzie się 4 lipca w o godz. 9:30 w siedzibie Urzędu Miasta Bełchatowa (ul. Kościuszki 1, sala 316). Więcej informacji można znaleźć w ogłoszeniu o przetargu, które znajduje się w BIP-ie <a href="https://belchatow.bip.gov.pl/przetargi/ogloszenie-o-ustnym-przetargu-nieograniczonym-na-zbycie-lokalu-mieszkalnego-wraz-z-ulamkowa-czescia-gruntu-stanowiacego-wlasnosc-miasta-belchatowa.html">TUTAJ</a>. Pod numerem telefonu: 44&nbsp;733 51 78.</p>
`,
};

test('parseAnnouncementPost #2025: address os. Dolnośląskie 225', () => {
  const r = parseAnnouncementPost(POST_2025);
  assert.ok(r, 'should return a listing record');
  assert.ok(/dolnoslask/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '225');
  assert.equal(r.address.apt, null);
});

test('parseAnnouncementPost #2025: area_m2 36.72', () => {
  assert.equal(parseAnnouncementPost(POST_2025).area_m2, 36.72);
});

test('parseAnnouncementPost #2025: starting_price_pln 192340', () => {
  assert.equal(parseAnnouncementPost(POST_2025).starting_price_pln, 192340);
});

test('parseAnnouncementPost #2025: auction_date 2025-07-04 (year from post date)', () => {
  assert.equal(parseAnnouncementPost(POST_2025).auction_date, '2025-07-04');
});

test('parseAnnouncementPost #2025: round 1 (despite "drugim piętrze")', () => {
  assert.equal(parseAnnouncementPost(POST_2025).round, 1);
});

test('parseAnnouncementPost: non-flat post (wykup bonifikata) → null', () => {
  const r = parseAnnouncementPost({
    title: 'Wykup mieszkanie komunalne ze sporą bonifikatą',
    date: '2026-03-06T10:00:00',
    link: 'https://belchatow.pl/x/',
    content: '<p>Skorzystaj z bonifikaty na wykup lokalu komunalnego. Cena wywoławcza nie dotyczy.</p>',
  });
  assert.equal(r, null);
});

test('parseAnnouncementPost: null input → null', () => {
  assert.equal(parseAnnouncementPost(null), null);
});

// ---------------------------------------------------------------------------
// parseResultDoc — synthetic fixture (standard Polish result template).
// NOT yet validated against a live Bełchatów result — validate on first run.
// ---------------------------------------------------------------------------

const RESULT_TEXT_SOLD = `
Informacja o wyniku ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego.
Prezydent Miasta Bełchatowa informuje, że w dniu 4 lipca 2025 roku o godz. 9.30
w siedzibie Urzędu Miasta Bełchatowa odbył się I ustny przetarg nieograniczony
na sprzedaż lokalu mieszkalnego nr 58 położonego na os. Dolnośląskim 225.
Cena wywoławcza: 192 340,00 zł
Cena osiągnięta (najwyższa oferta): 201 000,00 zł
Nabywca: ustalono nabywcę lokalu.
`;

const RESULT_URL = 'https://belchatow.bip.gov.pl/przetargi/informacja-o-wyniku.html';

test('parseResultDoc (sold): exactly 1 record, kind mieszkalny', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2025-07-04', RESULT_URL);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'mieszkalny');
});

test('parseResultDoc (sold): address os. Dolnośląskie 225/58', () => {
  const r = parseResultDoc(RESULT_TEXT_SOLD, '2025-07-04', RESULT_URL)[0];
  assert.ok(/dolnoslask/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '225');
  assert.equal(r.address.apt, '58');
});

test('parseResultDoc (sold): starting_price_pln 192340', () => {
  assert.equal(parseResultDoc(RESULT_TEXT_SOLD, null, RESULT_URL)[0].starting_price_pln, 192340);
});

test('parseResultDoc (sold): final_price_pln 201000 (cena osiągnięta)', () => {
  assert.equal(parseResultDoc(RESULT_TEXT_SOLD, null, RESULT_URL)[0].final_price_pln, 201000);
});

test('parseResultDoc (sold): outcome sold, auction_date from text', () => {
  const r = parseResultDoc(RESULT_TEXT_SOLD, null, RESULT_URL)[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2025-07-04');
});

const RESULT_TEXT_UNSOLD = `
Informacja o wyniku ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego.
Prezydent Miasta Bełchatowa informuje, że w dniu 30.06.2026 roku odbył się
I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 12
położonego na os. Dolnośląskim 306.
Cena wywoławcza: 276 724,00 zł
Przetarg zakończył się wynikiem negatywnym — nikt nie przystąpił do przetargu.
`;

test('parseResultDoc (unsold): outcome unsold, final null', () => {
  const r = parseResultDoc(RESULT_TEXT_UNSOLD, '2026-06-30', RESULT_URL)[0];
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 276724);
  assert.equal(r.auction_date, '2026-06-30');
});

test('parseResultDoc: dzierżawa result (lease) → empty array', () => {
  const lease = `Informacja o wyniku ustnego przetargu nieograniczonego na wydzierżawienie nieruchomości. Cena osiągnięta: 500,00 zł`;
  assert.deepEqual(parseResultDoc(lease, null, RESULT_URL), []);
});

test('parseResultDoc: non-result text → empty array', () => {
  assert.deepEqual(parseResultDoc('To jest zwykłe ogłoszenie o sprzedaży lokalu mieszkalnego.', null, RESULT_URL), []);
});

test('parseResultDoc: empty/null → empty array', () => {
  assert.deepEqual(parseResultDoc('', null, RESULT_URL), []);
  assert.deepEqual(parseResultDoc(null, null, RESULT_URL), []);
});
