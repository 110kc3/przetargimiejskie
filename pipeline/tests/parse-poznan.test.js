
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAuctionAnnouncement,
  normalizePrice,
  priceFromNotice,
  landSegmentsFromText,
  totalAreaFromText,
  landAreaDescFromText,
  builtAddressFromText,
  parseAnnouncementNotice,
  resultDateFromText,
  achievedPriceFromText,
  isNegativeOutcome,
  parseResultDoc,
  htmlToText,
} from '../src/cities/poznan/parse.js';

const ZEGRZE_TEASER_HTML = `<p>Prezydent Miasta Poznania ogłasza drugi przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Miasta Poznania, położonej w Poznaniu:</p><p><strong>rejon ulic Obodrzyckiej i Garaszewo</strong></p><p>obręb Zegrze arkusz 18 <strong>działka 13/5</strong> (dr) pow. 3009 m<sup>2</sup> KW PO2P/00137392/4</p><p>obręb Zegrze arkusz 19 <strong>działka 15/6</strong> (RIVa) pow. 8192 m<sup>2</sup> KW PO2P/00124053/2</p><p>obręb Zegrze arkusz 20 <strong>działka 11/8</strong> (RIIIb, RIVa) pow. 36 815 m<sup>2</sup> KW PO2P/00124053/2</p><p>powierzchnia łączna: 48 016 m<sup>2</sup></p><p>Wadium należy wpłacić na wskazany rachunek bankowy <strong>do 12 sierpnia 2026 r.</strong></p><p><strong>Przetarg odbędzie się</strong> <strong>19 sierpnia 2026 r. o godz. 10.00</strong> w siedzibie Urzędu Miasta Poznania, Pl. Kolegiacki 17, <strong>Sala Sesyjna S2</strong>.</p><p>Pełna treść ogłoszenia oraz mapa informacyjna w <a href="x">załącznikach.</a></p>`;
const ZEGRZE_PDF_EXCERPT = `Cena wywoławcza: 18 500 000,– zł (w tym 23% podatku VAT), tj.:
cena działki 13/5: 1 161 800,− zł
cena działek 15/6 i 11/8: 17 338 200,− zł
Wadium: 1 850 000,– zł`;

const KRZYZOWNIKI_TEASER_HTML = `<p>Prezydent Miasta Poznania ogłasza czwarty przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Miasta Poznania, położonej w Poznaniu:</p><p><strong>rejon ulic: Jana Henryka Dąbrowskiego i Zygmunta Żuraszka</strong></p><p>obręb Krzyżowniki arkusz 16 działka 99/30 (RVI) pow. 3362 m<sup>2</sup> KW PO1P/00115875/7</p><p>Wadium należy wpłacić na wskazany rachunek bankowy <strong>do 20 sierpnia 2026 r.</strong></p><p><strong>Przetarg odbędzie się</strong> <strong>27 sierpnia 2026 r. o godz. 10.00</strong> w siedzibie Urzędu Miasta Poznania, Pl. Kolegiacki 17, <strong>Sala Sesyjna S2</strong>.</p><p>Pełna treść ogłoszenia oraz mapa informacyjna w <a href="x">załącznikach</a>.</p>`;

const GRODZISKA_TEASER_HTML = `<p>PREZYDENT MIASTA POZNANIA ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego stanowiącego własność Miasta Poznania, wraz z równoczesną sprzedażą udziału w nieruchomości wspólnej położonego w Poznaniu w budynku przy:</p><p><a href="x"><strong>ul. Grodziskiej 32 lokal mieszkalny nr 2</strong></a> - obręb Łazarz arkusz 6 działka 65/2 (B) pow. 998 m<sup>2</sup> KW PO1P/00101006/4.</p><p><strong>Nieruchomość można oglądać: 9 stycznia 2025 r. w godz.&#160;</strong><strong>10.00 - 11.00</strong> <strong>oraz 6 lutego 2025 r. w godz. 13.30 - 14.30.</strong></p><p>Wadium należy wpłacić na wskazany rachunek bankowy, nie później niż do dnia 20 lutego 2025 r.</p><p>Przetarg odbędzie się <strong>27 lutego 2025 r. o godz. 10.00</strong> w siedzibie Urzędu Miasta Poznania, pl. Kolegiacki 17, <strong>Sala Sesyjna nr S2</strong>.</p>`;

const ZARZADZENIE_HTML = `<p>Prezydent Miasta Poznania przeznaczył do sprzedaży w trybie przetargu ustnego nieograniczonego nieruchomość stanowiącą własność Miasta Poznania, położoną w Poznaniu przy <strong>ul. Kaczeńcowej 46</strong> - Zarządzenie Nr <a href="x">526/2026/P</a> Prezydenta Miasta Poznania z dnia 29 czerwca 2026 r.</p>`;
const WYKAZ_WYNAJEM_HTML = `<p>Prezydent Miasta Poznania informuje, że dnia 10.07.2026 r. został ogłoszony do&#160;publicznej wiadomości na okres 21 dni w siedzibie Urzędu Miasta Poznania pl. Kolegiacki 17 oraz na stronach internetowych Urzędu Miasta Poznania wykaz nieruchomości Skarbu Państwa nr 1.7/2026 przeznaczonych do wynajęcia pod budowę i&#160;lokalizację urządzeń przesyłowych na&#160;terenie miasta Poznania.</p>`;

const RESULT_TEASER = `Informacja Prezydenta Miasta Poznania o wynikach przetargów przeprowadzonych 24.06.2026 r. na sprzedaż nieruchomości położonych w Poznaniu, przy ul. Olgi Sławskiej-Lipczyńskiej.`;

test('isAuctionAnnouncement: gates real open-auction notices vs real non-auction ones', () => {
  assert.equal(isAuctionAnnouncement(htmlToText(ZEGRZE_TEASER_HTML)), true);
  assert.equal(isAuctionAnnouncement(htmlToText(KRZYZOWNIKI_TEASER_HTML)), true);
  assert.equal(isAuctionAnnouncement(htmlToText(GRODZISKA_TEASER_HTML)), true);
  assert.equal(isAuctionAnnouncement(htmlToText(ZARZADZENIE_HTML)), false);
  assert.equal(isAuctionAnnouncement(htmlToText(WYKAZ_WYNAJEM_HTML)), false);
});

test('price: Poznań PDF en-dash grosze placeholder normalizes to the shared parser\'s ",00 zł" form', () => {
  assert.equal(normalizePrice('18 500 000,– zł'), '18 500 000,00 zł');
  assert.equal(priceFromNotice(ZEGRZE_PDF_EXCERPT), 18500000);
});

test('landSegmentsFromText + totalAreaFromText: real 3-plot Żegrze notice', () => {
  const t = htmlToText(ZEGRZE_TEASER_HTML);
  const segs = landSegmentsFromText(t);
  assert.equal(segs.length, 3);
  assert.deepEqual(segs.map((s) => s.dzialka), ['13/5', '15/6', '11/8']);
  assert.equal(segs[0].obreb, 'Zegrze');
  assert.equal(segs[0].area_m2, 3009);
  assert.equal(segs[2].area_m2, 36815);
  assert.equal(totalAreaFromText(t), 48016);
  assert.equal(landAreaDescFromText(t), 'Obodrzyckiej i Garaszewo');
});

test('builtAddressFromText: real Grodziska flat notice', () => {
  const addr = builtAddressFromText(htmlToText(GRODZISKA_TEASER_HTML));
  assert.ok(addr);
  assert.equal(addr.address.key, 'grodziskiej|32|2');
  assert.equal(addr.address_raw, 'ul. Grodziskiej 32/2');
});

test('parseAnnouncementNotice: Żegrze multi-plot land (teaser + real PDF excerpt)', () => {
  const rec = parseAnnouncementNotice(htmlToText(ZEGRZE_TEASER_HTML), ZEGRZE_PDF_EXCERPT, { url: 'https://bip.poznan.pl/x' });
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '13/5, 15/6, 11/8');
  assert.equal(rec.obreb, 'Zegrze');
  assert.equal(rec.area_m2, 48016);
  assert.equal(rec.round, 2);
  assert.equal(rec.starting_price_pln, 18500000);
  assert.equal(rec.auction_date, '2026-08-19');
});

test('parseAnnouncementNotice: Krzyżowniki single-plot land (teaser only, no PDF fetched)', () => {
  const rec = parseAnnouncementNotice(htmlToText(KRZYZOWNIKI_TEASER_HTML), '', { url: 'https://bip.poznan.pl/y' });
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '99/30');
  assert.equal(rec.obreb, 'Krzyżowniki');
  assert.equal(rec.area_m2, 3362);
  assert.equal(rec.round, 4);
  assert.equal(rec.auction_date, '2026-08-27');
  assert.equal(rec.starting_price_pln, null);
});

test('parseAnnouncementNotice: Grodziska flat (teaser only — no PDF fixture obtainable, page 404s live)', () => {
  const rec = parseAnnouncementNotice(htmlToText(GRODZISKA_TEASER_HTML), '', { url: 'https://bip.poznan.pl/z' });
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'grodziskiej|32|2');
  assert.equal(rec.round, 2);
  assert.equal(rec.auction_date, '2025-02-27');
  assert.equal(rec.area_m2, null);
  assert.equal(rec.starting_price_pln, null);
});

test('non-auction notices are not parsed as announcements', () => {
  assert.equal(parseAnnouncementNotice(htmlToText(ZARZADZENIE_HTML), ''), null);
  assert.equal(parseAnnouncementNotice(htmlToText(WYKAZ_WYNAJEM_HTML), ''), null);
});

test('resultDateFromText: real category-8800 result teaser (Wayback 2026-07-12 capture)', () => {
  assert.equal(resultDateFromText(RESULT_TEASER), '2026-06-24');
});

test('parseResultDoc: real result teaser alone yields no record (price/address live only in the PDF attachment, which is unobtainable — see config.js)', () => {
  const recs = parseResultDoc(RESULT_TEASER, null, 'https://bip.poznan.pl/result-x');
  assert.deepEqual(recs, []);
});

test('achievedPriceFromText / isNegativeOutcome: documented cross-city idiom conformance (ADAPTER-GUIDE.md §5.3) — NOT a Poznań fixture, no real result PDF was obtainable during this build', () => {
  assert.equal(
    achievedPriceFromText('W wyniku przeprowadzonego przetargu cena nieruchomości została ustalona na kwotę 130 000,00 zł.'),
    130000,
  );
  assert.equal(
    isNegativeOutcome('Przetarg zakończył się wynikiem negatywnym, gdyż w wyznaczonym terminie nikt nie wpłacił wadium.'),
    true,
  );
});
