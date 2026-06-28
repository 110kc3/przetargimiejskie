// Tests for pipeline/src/cities/swinoujscie/parse.js + crawl.js
//
// Fixtures groundtruthed 2026-06-28 against live BIP bip.um.swinoujscie.pl:
//
//   ANNOUNCEMENT (flat, round 3):
//     https://bip.um.swinoujscie.pl/artykul/1717/39630/ogloszenie-nr-7-2024-s-...
//     Title: "OGŁOSZENIE nr 7/2024/S" (heading on board) + article title from board index:
//       "trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 4
//        wraz z pomieszczeniem przynależnym o łącznej powierzchni 90,73 m2 położonego
//        przy ul. Konstytucji 3 Maja 44 w Świnoujściu"
//     Blurb: "Przetarg odbędzie się dnia 16 października 2024 r. o godzinie 12:00 ..."
//     DOC text (OCR-confirmed): cena wywoławcza 428 825,00 zł
//
//   ANNOUNCEMENT (flat via udział, round 2):
//     https://bip.um.swinoujscie.pl/artykul/1718/40232/ogloszenie-nr-15-2024-s-...
//     Board index title:
//       "Ogłoszenie nr 15/2024/S drugi nieograniczony ustny przetarg na sprzedaż
//        udziału w nieruchomości przy ul. Armii Krajowej 7a w Świnoujściu,
//        w ramach którego przysługuje prawo do wyłącznego korzystania
//        z lokalu mieszkalnego nr 6"
//     Blurb: "Przetarg odbędzie się dnia 13 stycznia 2025 r. o godzinie 12:30 ..."
//
//   ANNOUNCEMENT (house/zabudowana, round 2):
//     https://bip.um.swinoujscie.pl/artykul/1717/43678/ogloszenie-nr-2-2026-s
//     Board index title:
//       "OGŁOSZENIE nr 2/2026/S"
//     Body text of article / DOC text:
//       "drugi, nieograniczony ustny przetarg nieruchomości gruntowej zabudowanej
//        budynkiem mieszkalnym jednorodzinnym, położonej w Świnoujściu przy ul. Miodowej 8"
//     DOC: cena wywoławcza 549 000,00 zł, przetarg 18.06.2026
//
//   NO RESULT NOTICES — parseResultDoc always returns []

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  parsePLN,
  parseArea,
  roundFromTitle,
  areaFromTitle,
  auctionDateFromBlurb,
  addressRawFromTitle,
  startingPriceFromDoc,
  kindFromTitle,
  isSkippableTitle,
  isAnnouncementTitle,
  parseArticle,
  parseResultDoc,
} from '../src/cities/swinoujscie/parse.js';

import { parseArticleList, docAttachmentUrl } from '../src/cities/swinoujscie/crawl.js';

// ----------------------------------------------------------------- parsePLN

describe('parsePLN', () => {
  it('parses space-separated thousands with comma-decimal', () => {
    assert.equal(parsePLN('428 825,00'), 428825);
    assert.equal(parsePLN('504 500,00'), 504500);
    assert.equal(parsePLN('549 000,00'), 549000);
  });
  it('parses plain integer', () => {
    assert.equal(parsePLN('428825'), 428825);
  });
  it('returns null for empty/invalid', () => {
    assert.equal(parsePLN(''), null);
    assert.equal(parsePLN(null), null);
    assert.equal(parsePLN('abc'), null);
  });
});

// ----------------------------------------------------------------- parseArea

describe('parseArea', () => {
  it('parses comma-decimal area', () => {
    assert.equal(parseArea('90,73'), 90.73);
    assert.equal(parseArea('58,33'), 58.33);
    assert.equal(parseArea('30,66'), 30.66);
    assert.equal(parseArea('68,09'), 68.09);
  });
  it('returns null for invalid', () => {
    assert.equal(parseArea(null), null);
    assert.equal(parseArea(''), null);
  });
});

// ----------------------------------------------------------------- roundFromTitle

describe('roundFromTitle', () => {
  it('extracts trzeci (3)', () => {
    assert.equal(roundFromTitle(
      'trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 4',
    ), 3);
  });
  it('extracts drugi (2)', () => {
    assert.equal(roundFromTitle(
      'Ogłoszenie nr 15/2024/S drugi nieograniczony ustny przetarg na sprzedaż udziału',
    ), 2);
  });
  it('extracts pierwszy (1)', () => {
    assert.equal(roundFromTitle(
      'Ogłoszenie nr 1/2024 - pierwszy, nieograniczony ustny przetarg na sprzedaż lokalu',
    ), 1);
  });
  it('extracts piąty (5)', () => {
    assert.equal(roundFromTitle(
      'Ogłoszenie nr 3/2025/S piąty nieograniczony ustny przetarg na sprzedaż udziału',
    ), 5);
  });
  it('extracts szósty (6)', () => {
    assert.equal(roundFromTitle(
      'Ogłoszenie nr 12/2024/S – szósty nieograniczony ustny przetarg na sprzedaż',
    ), 6);
  });
  it('returns null when no ordinal', () => {
    assert.equal(roundFromTitle('Ogłoszenie nr 7/2024/S'), null);
    assert.equal(roundFromTitle(''), null);
  });
});

// ----------------------------------------------------------------- areaFromTitle

describe('areaFromTitle', () => {
  it('extracts area from "powierzchni 90,73 m2"', () => {
    assert.equal(areaFromTitle(
      'trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 4 wraz z pomieszczeniem przynależnym o łącznej powierzchni 90,73 m2 położonego',
    ), 90.73);
  });
  it('extracts area from "pow. 58,33 m2"', () => {
    assert.equal(areaFromTitle(
      'pierwszy, nieograniczony ustny przetarg na sprzedaż udziału w nieruchomości przy ul. Paderewskiego 13, lokal mieszkalny nr 8 o pow. 58,33 m2',
    ), 58.33);
  });
  it('extracts area from "pow. 68,09 m2"', () => {
    assert.equal(areaFromTitle(
      'piąty nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 11 o pow. 68,09 m2',
    ), 68.09);
  });
  it('returns null when no area in title', () => {
    assert.equal(areaFromTitle('OGŁOSZENIE nr 2/2026/S'), null);
  });
});

// ----------------------------------------------------------------- auctionDateFromBlurb

describe('auctionDateFromBlurb', () => {
  it('parses Polish word-form date', () => {
    assert.equal(
      auctionDateFromBlurb('Przetarg odbędzie się dnia 16 października 2024 r. o godzinie 12:00 - w sali szkoleniowej'),
      '2024-10-16',
    );
  });
  it('parses January word-form date', () => {
    assert.equal(
      auctionDateFromBlurb('Przetarg odbędzie się dnia 13 stycznia 2025 r. o godzinie 12:30'),
      '2025-01-13',
    );
  });
  it('parses numeric date form DD.MM.YYYY', () => {
    assert.equal(
      auctionDateFromBlurb('Przetarg odbędzie się dnia 13.01.2025 r.'),
      '2025-01-13',
    );
  });
  it('parses April word-form date', () => {
    assert.equal(
      auctionDateFromBlurb('Przetarg odbędzie się dnia 16 kwietnia 2025 roku o godz. 12.30'),
      '2025-04-16',
    );
  });
  it('returns null when no date', () => {
    assert.equal(auctionDateFromBlurb('brak daty'), null);
    assert.equal(auctionDateFromBlurb(''), null);
    assert.equal(auctionDateFromBlurb(null), null);
  });
});

// ----------------------------------------------------------------- addressRawFromTitle

describe('addressRawFromTitle', () => {
  it('extracts Konstytucji 3 Maja 4/4 with flat apt from lokal nr 4', () => {
    // Direct address pattern: "przy ul. Konstytucji 3 Maja 4/4"
    const raw = addressRawFromTitle(
      'trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 4 wraz z pomieszczeniem przynależnym o łącznej powierzchni 90,73 m2 położonego przy ul. Konstytucji 3 Maja 4/4 w Świnoujściu',
    );
    assert.ok(raw, 'addressRaw must be non-null');
    assert.match(raw, /Konstytucji/i);
    assert.match(raw, /4/);
  });

  it('extracts Armii Krajowej 7a with lokal nr 6 appended', () => {
    const raw = addressRawFromTitle(
      'Ogłoszenie nr 15/2024/S drugi nieograniczony ustny przetarg na sprzedaż udziału w nieruchomości przy ul. Armii Krajowej 7a w Świnoujściu, w ramach którego przysługuje prawo do wyłącznego korzystania z lokalu mieszkalnego nr 6',
    );
    assert.ok(raw, 'addressRaw must be non-null');
    assert.match(raw, /Armii Krajowej/i);
    assert.match(raw, /7[aA]/i);
    // Apt 6 is appended
    assert.match(raw, /6/);
  });

  it('extracts Miodowej 8', () => {
    const raw = addressRawFromTitle(
      'Ogłoszenie nr 2/2026/S drugi, nieograniczony ustny przetarg nieruchomości gruntowej zabudowanej budynkiem mieszkalnym jednorodzinnym, położonej w Świnoujściu przy ul. Miodowej 8',
    );
    assert.ok(raw, 'addressRaw must be non-null');
    assert.match(raw, /Miodowej/i);
    assert.match(raw, /8/);
  });

  it('returns null for title with no address', () => {
    assert.equal(addressRawFromTitle('OGŁOSZENIE nr 2/2026/S'), null);
    assert.equal(addressRawFromTitle(''), null);
  });
});

// ----------------------------------------------------------------- startingPriceFromDoc

describe('startingPriceFromDoc', () => {
  it('parses from OCR-extracted announcement text', () => {
    const docText = `
Cena wywoławcza: 428 825,00 zł (słownie: czterysta dwadzieścia osiem tysięcy osiemset
dwadzieścia pięć złotych),
Wysokość postąpienia: 4 500,00 zł
Wadium przetargowe: 42 882,50 zł
    `;
    assert.equal(startingPriceFromDoc(docText), 428825);
  });

  it('parses from DOC text (2026/S house announcement)', () => {
    const docText = `
Cena wywoławcza: 549 000,00 zł (słownie: pięćset czterdzieści dziewięć tysięcy złotych).
Wysokość postąpienia: 5 000,00 zł
    `;
    assert.equal(startingPriceFromDoc(docText), 549000);
  });

  it('returns null when not present', () => {
    assert.equal(startingPriceFromDoc('brak ceny'), null);
    assert.equal(startingPriceFromDoc(''), null);
    assert.equal(startingPriceFromDoc(null), null);
  });
});

// ----------------------------------------------------------------- kindFromTitle

describe('kindFromTitle', () => {
  it('mieszkalny for lokal mieszkalny', () => {
    assert.equal(kindFromTitle('trzeci przetarg na sprzedaż lokalu mieszkalnego nr 4'), 'mieszkalny');
  });
  it('mieszkalny for udział lokal mieszkalny', () => {
    assert.equal(kindFromTitle('przetarg na sprzedaż udziału ... prawo do korzystania z lokalu mieszkalnego nr 6'), 'mieszkalny');
  });
  it('zabudowana for nieruchomość zabudowana budynkiem jednorodzinnym', () => {
    assert.equal(kindFromTitle('przetarg nieruchomości gruntowej zabudowanej budynkiem mieszkalnym jednorodzinnym przy ul. Miodowej 8'), 'zabudowana');
  });
  it('grunt for nieruchomość gruntowa niezabudowana', () => {
    assert.equal(kindFromTitle('przetarg na sprzedaż nieruchomości gruntowej niezabudowanej będącej działką ewidencyjną nr 602'), 'grunt');
  });
  it('uzytkowy for lokal użytkowy', () => {
    assert.equal(kindFromTitle('przetarg na sprzedaż lokalu użytkowego o pow. 69,76 m2'), 'uzytkowy');
  });
});

// ----------------------------------------------------------------- isSkippableTitle

describe('isSkippableTitle', () => {
  it('skips najem announcements', () => {
    assert.equal(isSkippableTitle('pierwszy nieograniczony pisemny przetarg na najem 7 garaży', ''), true);
    assert.equal(isSkippableTitle('lokale użytkowe do wynajęcia', ''), true);
  });
  it('skips cancellation notices', () => {
    assert.equal(isSkippableTitle('ZAWIADOMIENIE o odwołaniu postępowania przetargowego', ''), true);
    assert.equal(isSkippableTitle('Unieważnienie przetargu', ''), true);
  });
  it('does NOT skip sale announcements', () => {
    assert.equal(isSkippableTitle('trzeci przetarg na sprzedaż lokalu mieszkalnego nr 4', ''), false);
    assert.equal(isSkippableTitle('Ogłoszenie nr 2/2026/S', ''), false);
  });
});

// ----------------------------------------------------------------- isAnnouncementTitle

describe('isAnnouncementTitle', () => {
  it('identifies flat sale przetarg', () => {
    assert.equal(isAnnouncementTitle('trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego', ''), true);
  });
  it('identifies udział sprzedaż przetarg', () => {
    assert.equal(isAnnouncementTitle('drugi przetarg na sprzedaż udziału w nieruchomości', ''), true);
  });
  it('rejects najem (already skippable)', () => {
    assert.equal(isAnnouncementTitle('przetarg na najem lokalu', ''), false);
  });
  it('rejects title without przetarg keyword', () => {
    assert.equal(isAnnouncementTitle('Wykaz nieruchomości do zbycia', ''), false);
  });
});

// ----------------------------------------------------------------- parseArticle

describe('parseArticle', () => {
  it('parses Konstytucji 3 Maja 4/4 flat announcement', () => {
    const art = {
      id: '39630',
      title: 'trzeci nieograniczony ustny przetarg na sprzedaż lokalu mieszkalnego nr 4 wraz z pomieszczeniem przynależnym o łącznej powierzchni 90,73 m2 położonego przy ul. Konstytucji 3 Maja 4/4 w Świnoujściu',
      blurb: 'Przetarg odbędzie się dnia 16 października 2024 r. o godzinie 12:00 - w sali szkoleniowej w siedzibie TBS Lokum sp. z o.o. przy ul. Wyspiańskiego 35c.',
      detail_url: 'https://bip.um.swinoujscie.pl/artykul/1717/39630/ogloszenie-nr-7-2024-s',
      board: 1717,
    };
    const rec = parseArticle(art);
    assert.ok(rec, 'record must be non-null');
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.area_m2, 90.73);
    assert.equal(rec.auction_date, '2024-10-16');
    assert.equal(rec.round, 3);
    assert.ok(rec.address, 'address must be parsed');
    assert.match(rec.address.street_norm, /konstytucji/i);
    assert.equal(rec.detail_url, art.detail_url);
    assert.equal(rec.starting_price_pln, null); // null until DOC enrichment
  });

  it('parses Armii Krajowej 7a with lokal nr 6 (udział pattern)', () => {
    const art = {
      id: '40232',
      title: 'Ogłoszenie nr 15/2024/S drugi nieograniczony ustny przetarg na sprzedaż udziału w nieruchomości przy ul. Armii Krajowej 7a w Świnoujściu, w ramach którego przysługuje prawo do wyłącznego korzystania z lokalu mieszkalnego nr 6',
      blurb: 'Przetarg odbędzie się dnia 13 stycznia 2025 r. o godzinie 12:30 - w sali szkoleniowej w siedzibie TBS Lokum sp. z o.o. przy ul. Wyspiańskiego 35c.',
      detail_url: 'https://bip.um.swinoujscie.pl/artykul/1718/40232/ogloszenie-nr-15-2024-s',
      board: 1718,
    };
    const rec = parseArticle(art);
    assert.ok(rec, 'record must be non-null');
    assert.equal(rec.kind, 'mieszkalny');
    assert.equal(rec.auction_date, '2025-01-13');
    assert.equal(rec.round, 2);
    assert.ok(rec.address, 'address must be parsed');
    assert.match(rec.address.street_norm, /armii/i);
  });

  it('parses Miodowa 8 house (zabudowana)', () => {
    const art = {
      id: '43678',
      title: 'OGŁOSZENIE nr 2/2026/S drugi, nieograniczony ustny przetarg nieruchomości gruntowej zabudowanej budynkiem mieszkalnym jednorodzinnym, położonej w Świnoujściu przy ul. Miodowej 8, stanowiącej działkę ewidencyjną nr 330/56.',
      blurb: 'Przetarg odbędzie się dnia 18.06.2026 r. roku o godzinie 12:00 - w sali szkoleniowej w siedzibie TBS Lokum sp. z o.o. przy ul. Wyspiańskiego 35 C.',
      detail_url: 'https://bip.um.swinoujscie.pl/artykul/1717/43678/ogloszenie-nr-2-2026-s',
      board: 1717,
    };
    const rec = parseArticle(art);
    assert.ok(rec, 'record must be non-null');
    assert.equal(rec.kind, 'zabudowana');
    assert.equal(rec.auction_date, '2026-06-18');
    assert.equal(rec.round, 2);
    assert.ok(rec.address, 'address must be parsed');
    assert.match(rec.address.street_norm, /miodow/i);
    assert.equal(rec.address.building, '8');
  });

  it('returns null for title with no parseable address', () => {
    const rec = parseArticle({
      id: '99999',
      title: 'OGŁOSZENIE nr 2/2026/S',
      blurb: '',
      detail_url: 'https://example.com',
      board: 1717,
    });
    assert.equal(rec, null);
  });
});

// ----------------------------------------------------------------- parseResultDoc

describe('parseResultDoc', () => {
  it('always returns [] (no result notices on BIP)', () => {
    assert.deepEqual(parseResultDoc('any text', null, 'https://example.com'), []);
    assert.deepEqual(parseResultDoc('INFORMACJA o wyniku', '2025-01-13', 'https://example.com'), []);
    assert.deepEqual(parseResultDoc('', null, ''), []);
  });
});

// ----------------------------------------------------------------- parseArticleList (crawl)

describe('parseArticleList', () => {
  // Reconstructed from live board HTML (bip.um.swinoujscie.pl/artykuly/1717)
  const BOARD_HTML = `
<div id="main-content">
<h1>Przetargi na sprzedaż nieruchomości</h1>

<h2><a href="/artykul/1717/43678/ogloszenie-nr-2-2026-s">OGŁOSZENIE nr 2/2026/S</a></h2>

<h2><a href="/artykul/1717/43508/ogloszenie-nr-1-2026-s">Ogłoszenie nr 1/2026/S</a></h2>
<p>Pierwszy, nieograniczony przetarg nieruchomości gruntowej zabudowanej budynkiem mieszkalnym jednorodzinnym, położonej w Świnoujściu przy ul. Miodowej 8, stanowiącej działkę ewidencyjną nr 330/56.</p>

</div>
`;

  it('finds 2 articles on board 1717', () => {
    const arts = parseArticleList(BOARD_HTML, 1717);
    assert.equal(arts.length, 2);
  });

  it('first article has correct id and detail_url', () => {
    const arts = parseArticleList(BOARD_HTML, 1717);
    assert.equal(arts[0].id, '43678');
    assert.equal(arts[0].detail_url, 'https://bip.um.swinoujscie.pl/artykul/1717/43678/ogloszenie-nr-2-2026-s');
    assert.equal(arts[0].title, 'OGŁOSZENIE nr 2/2026/S');
  });

  it('second article blurb is captured', () => {
    const arts = parseArticleList(BOARD_HTML, 1717);
    assert.match(arts[1].blurb, /Miodowej 8/);
  });

  it('returns [] for empty HTML', () => {
    assert.deepEqual(parseArticleList('', 1717), []);
  });
});

// ----------------------------------------------------------------- docAttachmentUrl (crawl)

describe('docAttachmentUrl', () => {
  it('finds .doc attachment URL from article HTML', () => {
    const html = `
<section id="attachments" class="attachments">
  <h2>Załączniki</h2>
  <div class="header">
    <span><a id="attachments-title" title="Plik do pobrania"
             href="https://bip.um.swinoujscie.pl/attachments/download/109117">
            Drugi przetarg Ogloszenie Miodowa 8</a></span>
    <span class="files textPDF">doc, 83 kB</span>
  </div>
</section>`;
    const url = docAttachmentUrl(html);
    assert.equal(url, 'https://bip.um.swinoujscie.pl/attachments/download/109117');
  });

  it('returns null when no doc attachment', () => {
    const html = `
<section id="attachments">
  <a href="https://bip.um.swinoujscie.pl/attachments/download/99999">
    zdjęcie</a>
  <span class="files textPDF">jpg, 287 kB</span>
</section>`;
    assert.equal(docAttachmentUrl(html), null);
  });

  it('returns null for empty HTML', () => {
    assert.equal(docAttachmentUrl(''), null);
    assert.equal(docAttachmentUrl(null), null);
  });
});
