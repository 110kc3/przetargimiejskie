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
//   RESULT NOTICE: validated live 2026-07-10 — belchatow.pl publishes result
//   notices as STUBS (RESULT_TEXT_STUB below is the verbatim live text): the
//   post carries the property description but the achieved price + outcome live
//   in an attachment behind the belchatow.bip.gov.pl "Pobierz" link. So a stub
//   with no price/outcome must yield [] (never a misleading price-less "open"
//   record). Full sold/unsold templates still parse (groundtruthed synthetics).

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

// Crash-prevention contract: every emitted result record must carry a `notes`
// array. refresh.js accumulates `r.notes.length` across records; a record
// missing the field crashed the whole city refresh on belchatow's first live
// result (2026-07-08). Guard the field here and defensively in refresh.js.
test('parseResultDoc (sold): record carries notes: [] (crash-prevention contract)', () => {
  const r = parseResultDoc(RESULT_TEXT_SOLD, '2025-07-04', RESULT_URL)[0];
  assert.deepEqual(r.notes, []);
});

// Real live stub (verbatim from belchatow.pl 2026-07-10): "informacja o wyniku"
// framing + flat + address, but NO achieved price and NO negative outcome —
// the actual result is in the belchatow.bip.gov.pl attachment. Must yield []
// rather than a price-less "open" record misrepresenting a concluded auction.
const RESULT_TEXT_STUB = `Informacja o wyniku przetargu W dniu 30.06.2026 r. w gmachu Urzędu Miasta w Bełchatowie przy ul. Kościuszki 1 został przeprowadzony ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego wraz z ułamkową częścią gruntu, położonego w Bełchatowie: lokal mieszkalny nr 55 położony w budynku na os. Dolnośląskim 306 o powierzchni użytkowej 52,83 m 2 wraz z pomieszczeniem przynależnym o powierzchni 3,52 m 2 oraz zabudową kuchenną i meblami, usytuowanym na działce nr 435/2 o pow. 1,0407 ha.`;

test('parseResultDoc: live belchatow.pl stub (no price/outcome) → empty array', () => {
  assert.deepEqual(parseResultDoc(RESULT_TEXT_STUB, '2026-07-08', RESULT_URL), []);
});

// --- BIP attachment-follow helpers (crawl.js) --------------------------------
// Markup verbatim from live pages fetched 2026-07-18: a belchatow.pl stub body
// linking its belchatow.bip.gov.pl article, and that article's attachment list
// (/fobjects/download/…-doc.html "dostępna cyfrowo" + …-pdf.html).

const { bipArticleLinks, pickBipAttachment } = await import('../src/cities/belchatow/crawl.js');

const STUB_BODY_HTML = `<p>Szczegóły w Biuletynie Informacji Publicznej:
<a href="https://belchatow.bip.gov.pl/ogloszenia/1265382_informacja-o-wyniku-ustnego-przetargu-nieograniczonego-na-wydzierzawienie-nieruchomosci.html">Informacja o wyniku</a></p>
<a href="https://belchatow.pl/kontakt/">Kontakt</a>`;

test('bipArticleLinks: extracts only belchatow.bip.gov.pl/ogloszenia links', () => {
  assert.deepEqual(bipArticleLinks(STUB_BODY_HTML), [
    'https://belchatow.bip.gov.pl/ogloszenia/1265382_informacja-o-wyniku-ustnego-przetargu-nieograniczonego-na-wydzierzawienie-nieruchomosci.html',
  ]);
  assert.deepEqual(bipArticleLinks(''), []);
});

const BIP_ARTICLE_HTML = `<a href="/fobjects/download/2169221/informacja-o-wyniku-przetargu-dostepna-cyfrowo-doc.html">Informacja o wyniku przetargu - dostępna cyfrowo.doc (34,5 KB)</a>
<a href="/fobjects/details/2169221/informacja-o-wyniku-przetargu-dostepna-cyfrowo-doc.html">szczegóły</a>
<a href="/fobjects/download/2169222/informacja-o-wyniku-przetargu-pdf.html">Informacja o wyniku przetargu.pdf (321,12 KB)</a>`;

test('pickBipAttachment: prefers the "dostępna cyfrowo" .doc over the PDF', () => {
  assert.deepEqual(pickBipAttachment(BIP_ARTICLE_HTML), {
    url: 'https://belchatow.bip.gov.pl/fobjects/download/2169221/informacja-o-wyniku-przetargu-dostepna-cyfrowo-doc.html',
    kind: 'doc',
  });
});

test('pickBipAttachment: falls back to the PDF when no .doc attachment exists', () => {
  const pdfOnly = BIP_ARTICLE_HTML.split('\n').slice(2).join('\n');
  assert.deepEqual(pickBipAttachment(pdfOnly), {
    url: 'https://belchatow.bip.gov.pl/fobjects/download/2169222/informacja-o-wyniku-przetargu-pdf.html',
    kind: 'pdf',
  });
  assert.equal(pickBipAttachment('<p>no attachments</p>'), null);
});
