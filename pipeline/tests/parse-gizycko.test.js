// Tests for pipeline/src/cities/gizycko/parse.js + crawl.js
//
// Fixtures groundtruthed 2026-06-29 against live BIP bip.gizycko.pl:
//
//   ANNOUNCEMENT (flat, round 3) — Obwieszczenie nr 92/2025:
//     URL: https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/845322/obwieszczenie_nr_922025__iii_przetarg_na_sprzedaz_lokalu_dabrows
//     Title: "Obwieszczenie nr 92/2025 - III przetarg na sprzedaz lokalu Dąbrowskiego 6/12B"
//     Body: lokal mieszkalny nr 12B … nr 6 przy ul. Dąbrowskiego, pow. użytkowa 27,00 m²
//     Cena wywoławcza: 200 000 zł; przetarg: 10 grudnia 2025 o godz. 11.00
//     Date (ISO): "Data wytworzenia dokumentu: <span>2025-10-21</span>"
//     No PDF attachments on this page.
//
//   ANNOUNCEMENT (multi-flat, round 1) — Obwieszczenie nr 53/2025:
//     URL: https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/818013/obwieszczenie__nr_532025__i_przetarg_ustny_nieograniczony_na_spr
//     Title: "OBWIESZCZENIE NR 53/2025 - I przetarg ustny nieograniczony na sprzedaż lokali w budynku Dąbrowskiego 6."
//     Body: two flats — nr 12B (27,00 m², 250 000 zł, 18 czerwca 2025)
//                     + nr 9 (68,20 m², 743 000 zł, 16.07.2025)
//     Result PDFs were attached (informacja_o_wyniku_przetargu.pdf) then removed 2025-11-17
//     pdftotext output: empty (scanned Xerox image PDF)
//
//   RESULT PDF (confirmed scanned image) — Obwieszczenie nr 12/2024:
//     URL: https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/735398/files/wyniki.pdf
//     Creator: Xerox WorkCentre 7225; pdftotext output: empty
//     parseResultDoc always returns [].

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  parseResultDoc,
} from '../src/cities/gizycko/parse.js';

import {
  parseListPage,
  publishedDateFromDetail,
  attachmentPdfUrlsFromDetail,
  bodyTextFromDetail,
  roundFromTitle,
  isAnnouncementTitle,
  isResultTitle,
  auctionDateFromBody,
  areaFromBody,
  startingPriceFromBody,
  addressFromBody,
} from '../src/cities/gizycko/crawl.js';

// ----------------------------------------------------------------- parseListPage

describe('parseListPage', () => {
  // Reconstructed from live list HTML (bip.gizycko.pl/wiadomosci/11525/lista/1/przetargi__sprzedaz),
  // confirmed structure 2026-06-29.
  const LIST_HTML = `
<div class="t1 clickable">
  <div class="contener">
    <p class="title"><a href="https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/845322/obwieszczenie_nr_922025__iii_przetarg_na_sprzedaz_lokalu_dabrows">Obwieszczenie nr 92/2025 - III przetarg na sprzedaz lokalu Dąbrowskiego 6/12B</a></p>
  </div>
</div>
<div class="t1 clickable">
  <div class="contener">
    <p class="title"><a href="https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/844725/obwieszczenie_nr_902025__i_przetarg_na_sprzedaz_lokalu_warszawsk">Obwieszczenie nr 90/2025 - I przetarg na sprzedaż lokalu Warszawska 15/9</a></p>
  </div>
</div>
<div class="t1 clickable">
  <div class="contener">
    <p class="title"><a href="https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/818013/obwieszczenie__nr_532025__i_przetarg_ustny_nieograniczony_na_spr">OBWIESZCZENIE  NR 53/2025 - I przetarg ustny nieograniczony na sprzedaż lokali w budynku Dąbrowskiego 6.</a></p>
  </div>
</div>
<div class="t1 clickable">
  <div class="contener">
    <p class="title"><a href="https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/835240/obwieszczenie_nr_782025__ii_przetarg_ustny_ograniczony_na_sprzed">Obwieszczenie nr 78/2025 - II przetarg ustny ograniczony na sprzedaz działki 130/2 ul. Wilanowska</a></p>
  </div>
</div>
`;

  it('finds 4 entries', () => {
    const items = parseListPage(LIST_HTML);
    assert.equal(items.length, 4);
  });

  it('first entry has correct url and title', () => {
    const items = parseListPage(LIST_HTML);
    assert.equal(
      items[0].url,
      'https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/845322/obwieszczenie_nr_922025__iii_przetarg_na_sprzedaz_lokalu_dabrows',
    );
    assert.match(items[0].title, /92\/2025/);
    assert.match(items[0].title, /Dąbrowskiego/);
  });

  it('deduplicates repeated URLs', () => {
    const html = `
      <p class="title"><a href="https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/999/test">Title A</a></p>
      <p class="title"><a href="https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/999/test">Title A dup</a></p>
    `;
    const items = parseListPage(html);
    assert.equal(items.length, 1);
  });

  it('returns [] for empty or null HTML', () => {
    assert.deepEqual(parseListPage(''), []);
    assert.deepEqual(parseListPage(null), []);
  });
});

// ----------------------------------------------------------------- isAnnouncementTitle

describe('isAnnouncementTitle', () => {
  it('accepts flat III przetarg (Dąbrowskiego)', () => {
    assert.equal(
      isAnnouncementTitle('Obwieszczenie nr 92/2025 - III przetarg na sprzedaz lokalu Dąbrowskiego 6/12B'),
      true,
    );
  });
  it('accepts flat I przetarg (Warszawska)', () => {
    assert.equal(
      isAnnouncementTitle('Obwieszczenie nr 90/2025 - I przetarg na sprzedaż lokalu Warszawska 15/9'),
      true,
    );
  });
  it('accepts multi-flat obwieszczenie (lokali)', () => {
    assert.equal(
      isAnnouncementTitle('OBWIESZCZENIE NR 53/2025 - I przetarg ustny nieograniczony na sprzedaż lokali w budynku Dąbrowskiego 6.'),
      true,
    );
  });
  it('accepts flat II przetarg (Bohaterów Westerplatte)', () => {
    assert.equal(
      isAnnouncementTitle('Obwieszczenie nr 77/2025 - II przetarg na sprzedaż nieruchomości ; lokal mieszkalny Dąbrowskiego 6/12B'),
      true,
    );
  });
  it('rejects działki (land)', () => {
    assert.equal(
      isAnnouncementTitle('Obwieszczenie nr 95/2025 - III przetarg na sprzedaż działki 130/2 (ul. Wilanowska)'),
      false,
    );
  });
  it('rejects ograniczony (restricted auction for land)', () => {
    assert.equal(
      isAnnouncementTitle('Obwieszczenie nr 78/2025 - II przetarg ustny ograniczony na sprzedaz działki 130/2 ul. Wilanowska'),
      false,
    );
  });
  it('rejects result/wynik notice', () => {
    assert.equal(
      isAnnouncementTitle('informacja o wyniku przetargu - lokal mieszkalny'),
      false,
    );
  });
  it('returns false for null/empty', () => {
    assert.equal(isAnnouncementTitle(''), false);
    assert.equal(isAnnouncementTitle(null), false);
  });
});

// ----------------------------------------------------------------- isResultTitle

describe('isResultTitle', () => {
  it('identifies wynik + lokal', () => {
    assert.equal(isResultTitle('informacja o wyniku przetargu lokal mieszkalny Dąbrowskiego 6'), true);
  });
  it('rejects announcement title', () => {
    assert.equal(isResultTitle('III przetarg na sprzedaz lokalu Dąbrowskiego 6/12B'), false);
  });
  it('rejects wynik without lokal', () => {
    assert.equal(isResultTitle('wynik przetargu na działkę'), false);
  });
  it('returns false for empty', () => {
    assert.equal(isResultTitle(''), false);
    assert.equal(isResultTitle(null), false);
  });
});

// ----------------------------------------------------------------- roundFromTitle

describe('roundFromTitle', () => {
  it('extracts III (3)', () => {
    assert.equal(roundFromTitle('Obwieszczenie nr 92/2025 - III przetarg na sprzedaz lokalu Dąbrowskiego 6/12B'), 3);
  });
  it('extracts I (1)', () => {
    assert.equal(roundFromTitle('OBWIESZCZENIE NR 53/2025 - I przetarg ustny nieograniczony na sprzedaż lokali'), 1);
  });
  it('extracts II (2)', () => {
    assert.equal(roundFromTitle('Obwieszczenie nr 77/2025 - II przetarg na sprzedaż nieruchomości'), 2);
  });
  it('extracts V (5)', () => {
    assert.equal(roundFromTitle('Obwieszczenie nr 70/2024 - V przetarg na sprzedaż lokali w budynku Dąbroskiego 6'), 5);
  });
  it('extracts IV (4)', () => {
    assert.equal(roundFromTitle('Obwieszczenie nr 35/2024 - IV przetarg (Pionierska 16A/2)'), 4);
  });
  it('returns null when no ordinal', () => {
    assert.equal(roundFromTitle('Obwieszczenie nr 95/2025'), null);
    assert.equal(roundFromTitle(''), null);
    assert.equal(roundFromTitle(null), null);
  });
});

// ----------------------------------------------------------------- publishedDateFromDetail

describe('publishedDateFromDetail', () => {
  it('parses ISO date form (confirmed live 2026-06-29)', () => {
    const html = `
      <div class="ContentBox2 rejestrZmian">
        Data wytworzenia dokumentu: <span>2025-10-21</span><br />
        Data wprowadzenia dokumentu do BIP: <span>21 października 2025 15:00</span><br />
      </div>`;
    assert.equal(publishedDateFromDetail(html), '2025-10-21');
  });
  it('parses ISO date form for earlier entry', () => {
    const html = `Data wytworzenia dokumentu: <span>2025-04-29</span>`;
    assert.equal(publishedDateFromDetail(html), '2025-04-29');
  });
  it('parses DD-MM-YYYY form (legacy IDcom instances)', () => {
    const html = `Data wytworzenia dokumentu: <span>21-10-2025</span>`;
    assert.equal(publishedDateFromDetail(html), '2025-10-21');
  });
  it('falls back to Polish word-form date', () => {
    const html = `Data wprowadzenia dokumentu do BIP: <span>21 października 2025 15:00</span>`;
    assert.equal(publishedDateFromDetail(html), '2025-10-21');
  });
  it('returns null when no date', () => {
    assert.equal(publishedDateFromDetail('no date here'), null);
    assert.equal(publishedDateFromDetail(''), null);
    assert.equal(publishedDateFromDetail(null), null);
  });
});

// ----------------------------------------------------------------- attachmentPdfUrlsFromDetail

describe('attachmentPdfUrlsFromDetail', () => {
  it('finds result PDF URL (confirmed live on nr 113/2024 page)', () => {
    const html = `
      <div class="t1 attachment">
        <a href="https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/783061/files/informacja_o_wyniku_przetsrgu.pdf"
           target="_blank" title='Otwórz w nowym oknie' class="contener i2">
          informacja o wyniku przetargu
        </a>
      </div>`;
    const urls = attachmentPdfUrlsFromDetail(html);
    assert.equal(urls.length, 1);
    assert.equal(urls[0], 'https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/783061/files/informacja_o_wyniku_przetsrgu.pdf');
  });
  it('finds multiple PDFs (e.g. wyniki.pdf)', () => {
    const html = `
      <a href="https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/735398/files/wyniki.pdf">wyniki</a>
      <a href="https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/735398/files/inny.pdf">inny</a>`;
    const urls = attachmentPdfUrlsFromDetail(html);
    assert.equal(urls.length, 2);
    assert.match(urls[0], /wyniki\.pdf/);
  });
  it('deduplicates repeated URLs', () => {
    const html = `
      <a href="https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/999/files/wynik.pdf">a</a>
      <a href="https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/999/files/wynik.pdf">b</a>`;
    assert.equal(attachmentPdfUrlsFromDetail(html).length, 1);
  });
  it('returns [] when no PDFs', () => {
    const html = `<div class="tresc">No attachments here</div>`;
    assert.deepEqual(attachmentPdfUrlsFromDetail(html), []);
  });
  it('returns [] for empty/null', () => {
    assert.deepEqual(attachmentPdfUrlsFromDetail(''), []);
    assert.deepEqual(attachmentPdfUrlsFromDetail(null), []);
  });
});

// ----------------------------------------------------------------- auctionDateFromBody

describe('auctionDateFromBody', () => {
  it('parses "w dniu 10 grudnia 2025 roku" (nr 92/2025, confirmed live)', () => {
    assert.equal(
      auctionDateFromBody('Przetarg na sprzedaż ww. nieruchomości odbędzie się w dniu 10 grudnia 2025 roku o godz. 11.00 w budynku Urzędu'),
      '2025-12-10',
    );
  });
  it('parses "w dniu 18 czerwca 2025 roku" (nr 53/2025 flat 1)', () => {
    assert.equal(
      auctionDateFromBody('Przetarg na sprzedaż ww. nieruchomości odbędzie się w dniu 18 czerwca 2025 roku o godz. 10.00'),
      '2025-06-18',
    );
  });
  it('parses numeric "w dniu 16.07.2025 roku" (nr 53/2025 flat 2)', () => {
    assert.equal(
      auctionDateFromBody('odbędzie się w dniu 16.07.2025 roku o godz. 10.00 w budynku Urzędu'),
      '2025-07-16',
    );
  });
  it('returns null when no date', () => {
    assert.equal(auctionDateFromBody('brak daty'), null);
    assert.equal(auctionDateFromBody(''), null);
    assert.equal(auctionDateFromBody(null), null);
  });
});

// ----------------------------------------------------------------- areaFromBody

describe('areaFromBody', () => {
  it('parses "pow. użytkowa lokalu 27,00 m2" (nr 92/2025, confirmed live)', () => {
    assert.equal(
      areaFromBody('lokal mieszkalny nr 12B … pow. użytkowa lokalu 27,00 m2'),
      27,
    );
  });
  it('parses "pow. użytkowa lokalu 68,20 m2" (nr 53/2025 flat 2)', () => {
    assert.equal(
      areaFromBody('lokal mieszkalny nr 9 … pow. użytkowa lokalu 68,20 m2'),
      68.2,
    );
  });
  it('parses "pow. uzytkowa lokalu 27,00 m2" (diacritics stripped)', () => {
    assert.equal(
      areaFromBody('pow. uzytkowa lokalu 27,00 m2'),
      27,
    );
  });
  it('returns null when no area', () => {
    assert.equal(areaFromBody('brak powierzchni'), null);
    assert.equal(areaFromBody(''), null);
    assert.equal(areaFromBody(null), null);
  });
});

// ----------------------------------------------------------------- startingPriceFromBody

describe('startingPriceFromBody', () => {
  it('parses "Cena wywoławcza lokalu … 200 000 zł" (nr 92/2025, confirmed live)', () => {
    assert.equal(
      startingPriceFromBody('Cena wywoławcza lokalu wraz z udziałem w gruncie: 200 000 zł (zgodnie z art. 68'),
      200000,
    );
  });
  it('parses "250 000 zł" (nr 53/2025 flat 1)', () => {
    assert.equal(
      startingPriceFromBody('Cena wywoławcza lokalu wraz z udziałem w gruncie: 250 000 zł (zgodnie'),
      250000,
    );
  });
  it('parses "743 000 zł" (nr 53/2025 flat 2)', () => {
    assert.equal(
      startingPriceFromBody('Cena wywoławcza lokalu wraz z udziałem w gruncie: 743 000 zł (zgodnie'),
      743000,
    );
  });
  it('parses dot-separated price "250.000 zł"', () => {
    assert.equal(
      startingPriceFromBody('Cena wywoławcza: 250.000 zł.'),
      250000,
    );
  });
  it('returns null when no price', () => {
    assert.equal(startingPriceFromBody('brak ceny'), null);
    assert.equal(startingPriceFromBody(''), null);
    assert.equal(startingPriceFromBody(null), null);
  });
});

// ----------------------------------------------------------------- addressFromBody

describe('addressFromBody', () => {
  // Fixture text from nr 92/2025 detail page (confirmed live 2026-06-29).
  // Body text (tags stripped):
  //   "lokal mieszkalny nr 12B położony w budynku mieszkalnym wielorodzinnym
  //    nr 6 przy ul. Dąbrowskiego w Giżycku, pow. użytkowa lokalu 27,00 m2"
  const BODY_92 =
    'lokal mieszkalny nr 12B położony w budynku mieszkalnym wielorodzinnym nr 6 przy ul. Dąbrowskiego w Giżycku, pow. użytkowa lokalu 27,00 m2';
  const TITLE_92 = 'Obwieszczenie nr 92/2025 - III przetarg na sprzedaz lokalu Dąbrowskiego 6/12B';

  it('parses Dąbrowskiego 6/12B from body (pattern A)', () => {
    const addr = addressFromBody(BODY_92, TITLE_92);
    assert.ok(addr, 'address must be non-null');
    assert.match(addr.street_norm, /dabrowskiego/i);
    assert.equal(addr.building, '6');
    assert.equal(addr.apt, '12B');
  });

  it('parses Dąbrowskiego 6/9 from title (pattern C fallback)', () => {
    const title = 'Obwieszczenie nr 92/2025 - III przetarg na sprzedaz lokalu Dąbrowskiego 6/9';
    const addr = addressFromBody('', title);
    assert.ok(addr, 'address must be non-null');
    assert.match(addr.street_norm, /dabrowskiego/i);
    assert.equal(addr.building, '6');
    assert.equal(addr.apt, '9');
  });

  it('parses Warszawska 15/9 from title (pattern C)', () => {
    const title = 'Obwieszczenie nr 90/2025 - I przetarg na sprzedaż lokalu Warszawska 15/9';
    const addr = addressFromBody('', title);
    assert.ok(addr, 'address must be non-null');
    assert.match(addr.street_norm, /warszaw/i);
    assert.equal(addr.building, '15');
    assert.equal(addr.apt, '9');
  });

  it('parses Bohaterów Westerplatte 11/5 from title (pattern C)', () => {
    const title = 'Obwieszczenie nr 111/2024 - Bohaterów Westerplatte 11/5';
    const addr = addressFromBody('', title);
    assert.ok(addr, 'address must be non-null');
    assert.match(addr.street_norm, /bohaterow/i);
    assert.equal(addr.building, '11');
    assert.equal(addr.apt, '5');
  });

  it('returns null for title with no address', () => {
    assert.equal(addressFromBody('', 'Obwieszczenie nr 95/2025'), null);
    assert.equal(addressFromBody('', ''), null);
    assert.equal(addressFromBody(null, null), null);
  });
});

// ----------------------------------------------------------------- bodyTextFromDetail

describe('bodyTextFromDetail', () => {
  it('extracts text from <div class="tresc"> and strips tags', () => {
    const html = `
      <div class="tresc">
        <p><strong>5. Cena wywoławcza nieruchomości:</strong></p>
        <p>Cena wywoławcza lokalu wraz z udziałem w gruncie: 200 000 zł</p>
      </div>`;
    const text = bodyTextFromDetail(html);
    assert.match(text, /200 000 z[lł]/i);
    assert.ok(!text.includes('<p>'), 'should not contain HTML tags');
  });
  it('returns empty string for null/empty', () => {
    assert.equal(bodyTextFromDetail(''), '');
    assert.equal(bodyTextFromDetail(null), '');
  });
});

// ----------------------------------------------------------------- parseResultDoc

describe('parseResultDoc', () => {
  it('always returns [] (scanned image PDFs — no text extractable)', () => {
    assert.deepEqual(parseResultDoc('', null, 'https://bip-v1-files.idcom-jst.pl/sites/3080/wiadomosci/735398/files/wyniki.pdf'), []);
  });
  it('returns [] even for non-empty text input (defensive)', () => {
    assert.deepEqual(parseResultDoc('INFORMACJA O WYNIKU PRZETARGU', null, 'https://example.com'), []);
  });
  it('returns [] for null text', () => {
    assert.deepEqual(parseResultDoc(null, null, ''), []);
  });
  it('returns [] with fallback date provided', () => {
    assert.deepEqual(parseResultDoc('', '2025-10-21', 'https://example.com'), []);
  });
});

// ----------------------------------------------------------------- integration: full announcement parse

describe('integration — nr 92/2025 announcement (confirmed live 2026-06-29)', () => {
  // Synthetic detail HTML reproducing the exact structure from the live page.
  // Body text confirmed by curl on 2026-06-29:
  //   - lokal mieszkalny nr 12B … nr 6 przy ul. Dąbrowskiego w Giżycku
  //   - pow. użytkowa lokalu 27,00 m2
  //   - Cena wywoławcza lokalu wraz z udziałem w gruncie: 200 000 zł
  //   - odbędzie się w dniu 10 grudnia 2025 roku o godz. 11.00
  //   - Data wytworzenia dokumentu: 2025-10-21
  const DETAIL_HTML = `
<div class="tresc">
  <p>lokal mieszkalny nr 12B położony w budynku mieszkalnym wielorodzinnym nr 6 przy ul. Dąbrowskiego w Giżycku, pow. użytkowa lokalu 27,00 m<sup>2</sup></p>
  <p><strong>5. Cena wywoławcza nieruchomości:</strong></p>
  <p><strong>Cena wywoławcza lokalu wraz z udziałem w gruncie</strong>: 200 000 zł (zgodnie z art. 68 ust. 3 …)</p>
  <p><strong>8. Termin przetargu:</strong></p>
  <p>Przetarg na sprzedaż ww. nieruchomości odbędzie się <strong>w dniu</strong> <strong>10 grudnia 2025 roku o godz. 11.00</strong> w budynku Urzędu Miejskiego w Giżycku, w pokoju 121.</p>
</div>
<div class="ContentBox2 rejestrZmian">
    Data wytworzenia dokumentu: <span>2025-10-21</span><br />
    Data wprowadzenia dokumentu do BIP: <span>21 października 2025 15:00</span><br />
</div>
`;
  const TITLE = 'Obwieszczenie nr 92/2025 - III przetarg na sprzedaz lokalu Dąbrowskiego 6/12B';
  const URL = 'https://bip.gizycko.pl/wiadomosci/11525/wiadomosc/845322/obwieszczenie_nr_922025__iii_przetarg_na_sprzedaz_lokalu_dabrows';

  it('publishedDateFromDetail returns 2025-10-21', () => {
    assert.equal(publishedDateFromDetail(DETAIL_HTML), '2025-10-21');
  });

  it('bodyTextFromDetail extracts price text', () => {
    const text = bodyTextFromDetail(DETAIL_HTML);
    assert.match(text, /200 000/);
    assert.match(text, /Dąbrowskiego/);
  });

  it('roundFromTitle returns 3', () => {
    assert.equal(roundFromTitle(TITLE), 3);
  });

  it('areaFromBody returns 27', () => {
    const text = bodyTextFromDetail(DETAIL_HTML);
    assert.equal(areaFromBody(text), 27);
  });

  it('startingPriceFromBody returns 200000', () => {
    const text = bodyTextFromDetail(DETAIL_HTML);
    assert.equal(startingPriceFromBody(text), 200000);
  });

  it('auctionDateFromBody returns 2025-12-10', () => {
    const text = bodyTextFromDetail(DETAIL_HTML);
    assert.equal(auctionDateFromBody(text), '2025-12-10');
  });

  it('addressFromBody returns Dąbrowskiego 6/12B', () => {
    const text = bodyTextFromDetail(DETAIL_HTML);
    const addr = addressFromBody(text, TITLE);
    assert.ok(addr, 'address must be non-null');
    assert.match(addr.street_norm, /dabrowskiego/i);
    assert.equal(addr.building, '6');
    assert.equal(addr.apt, '12B');
    assert.equal(addr.key, 'dabrowskiego|6|12B');
  });

  it('attachmentPdfUrlsFromDetail returns [] (no PDFs on nr 92/2025)', () => {
    assert.deepEqual(attachmentPdfUrlsFromDetail(DETAIL_HTML), []);
  });

  it('isAnnouncementTitle accepts this title', () => {
    assert.equal(isAnnouncementTitle(TITLE), true);
  });
});

// ----------------------------------------------------------------- integration: nr 53/2025 multi-flat (I przetarg)

describe('integration — nr 53/2025 multi-flat announcement (confirmed live 2026-06-29)', () => {
  // Two flats: 12B (27 m², 250 000 zł, 18.06.2025) and 9 (68,20 m², 743 000 zł, 16.07.2025)
  // Parser extracts FIRST flat's data.
  const BODY_53 = [
    'lokal mieszkalny nr 12B położony w budynku mieszkalnym wielorodzinnym nr 6 przy ul. Dąbrowskiego w Giżycku,',
    'pow. użytkowa lokalu 27,00 m2.',
    'Cena wywoławcza lokalu wraz z udziałem w gruncie: 250 000 zł (zgodnie z art. 68',
    'Przetarg na sprzedaż ww. nieruchomości odbędzie się w dniu 18 czerwca 2025 roku o godz. 10.00',
    'lokal mieszkalny nr 9 położony w budynku mieszkalnym wielorodzinnym nr 6 przy ul. Dąbrowskiego w Giżycku,',
    'pow. użytkowa lokalu 68,20 m2.',
    'Cena wywoławcza lokalu wraz z udziałem w gruncie: 743 000 zł (zgodnie z art. 68',
    'Przetarg na sprzedaż ww. nieruchomości odbędzie się w dniu 16.07.2025 roku o godz. 10.00',
  ].join(' ');
  const TITLE_53 = 'OBWIESZCZENIE NR 53/2025 - I przetarg ustny nieograniczony na sprzedaż lokali w budynku Dąbrowskiego 6.';

  it('roundFromTitle returns 1', () => {
    assert.equal(roundFromTitle(TITLE_53), 1);
  });
  it('areaFromBody returns 27 (first flat)', () => {
    assert.equal(areaFromBody(BODY_53), 27);
  });
  it('startingPriceFromBody returns 250000 (first flat)', () => {
    assert.equal(startingPriceFromBody(BODY_53), 250000);
  });
  it('auctionDateFromBody returns 2025-06-18 (first flat)', () => {
    assert.equal(auctionDateFromBody(BODY_53), '2025-06-18');
  });
  it('addressFromBody falls back to title → body gives 12B (first lokal)', () => {
    const addr = addressFromBody(BODY_53, TITLE_53);
    assert.ok(addr, 'address must be non-null');
    assert.match(addr.street_norm, /dabrowskiego/i);
    assert.equal(addr.building, '6');
    // First flat is 12B from body pattern A
    assert.equal(addr.apt, '12B');
  });
  it('isAnnouncementTitle accepts this title', () => {
    assert.equal(isAnnouncementTitle(TITLE_53), true);
  });
});
