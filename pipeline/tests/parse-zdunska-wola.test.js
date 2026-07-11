// Zduńska Wola parser + crawl-helper tests. Fixtures are faithful copies of
// REAL XML field values (live + Wayback-archived), fetched 2026-07-11.
//
//   id 12995  ul. Karola Szymanowskiego — LAND, PENDING, round I (Pierwszy),
//             108 000 zł, przetarg 08.07.2026. Live: https://bip.zdunskawola.pl/
//             przetarg-nieruchomosci/xml/12995/1 (no <rozstrzygniecie> tag at
//             all while pending — not just empty, entirely OMITTED).
//   id 12972  ul. Torowa — LAND, SOLD, round I (Pierwszy), 320 000 zł
//             wywoławcza → 324 000 zł achieved, buyer "Katarzyna i Paweł
//             małż. Wojciechowscy". Live: .../przetarg-nieruchomosci/xml/12972/1
//             (INLINE <rozstrzygniecie>, no separate result PDF/page). This
//             city's boilerplate never says "nabywca" — it says "Osobami
//             wyłonionymi ... zostali ..., którzy wylicytowali ... za cenę X
//             zł" / "zakończył się wynikiem pozytywnym".
//   id 12666  ul. 1 Maja 10 lokal nr 18 — FLAT, PENDING, round IV (Czwarty),
//             przetarg 20.11.2025. This record has since aged OUT of the live
//             board/XML entirely (both now 404 — confirmed live 2026-07-11)
//             — captured via the Wayback Machine snapshot from 2025-11-04
//             (http://web.archive.org/web/20251104102640/https://
//             bip.zdunskawola.pl/przetarg-nieruchomosci/xml/12666/1, fetched
//             through Wayback's raw "if_" passthrough, i.e. the actual live
//             XML bytes as archived — not a paraphrase). Two real gotchas
//             live in this one record: rodzaj-nieruchomosci reads
//             "Nieruchomość lokalowa" (not "Lokal mieszkalny" — a 5th kind
//             this board's own filter exposes that classifyKind() can't
//             place) and cena-wywolawcza reads the LITERAL STRING "w treści
//             ogłoszenia" ("[stated] in the announcement text") instead of a
//             number — the real 185 000 zł figure (per the spike) lives only
//             in the PDF attachment, which this html-source adapter does not
//             fetch.
//   BONIFIKATA_WYKAZ_TEXT — real prose from a SEPARATE URL namespace
//             (bip.zdunskawola.pl/artykul/406/12899/wykaz-nieruchomosci-
//             lokalowych-przeznaczonych-do-sprzedazy-na-rzecz-najemcow,
//             dated 2026-03-30, captured live via Wayback 2026-07-11) — a
//             tenant-bonifikata sale notice, structurally outside the
//             /przetargi-nieruchomosci/ board this adapter crawls, but used
//             here to groundtruth the defensive isSkippable() guard.
//   BOARD_XML — the real (small) board XML as fetched live 2026-07-11 from
//             https://bip.zdunskawola.pl/przetargi-nieruchomosci/xml/439/1
//             (2 records: both currently-active land plots).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  hasResolution,
  isSkippable,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  buyerFromText,
  isPositiveOutcome,
  isNegativeOutcome,
  kindFromText,
  addressRawFromText,
  plotFromText,
  unitAreaFromText,
  parseAnnouncement,
  parseResultDoc,
  parsePLN,
} from '../src/cities/zdunska-wola/parse.js';
import { parseBoardPage } from '../src/cities/zdunska-wola/crawl.js';

// --------------------------------------------------------------- real fixtures

const SZYMANOWSKIEGO_LAND_PENDING = {
  adres: 'Zduńska Wola, ul. Karola Szymanowskiego',
  rodzaj: 'Nieruchomość niezabudowana',
  cena: '108 000,00 zł w tym podatek VAT według obecnie obowiązującej stawki',
  data: '08                        .07                        .2026  godz. 09:00',
  przetargNa:
    'Pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności nw. nieruchomości niezabudowanej - ul. Karola Szymanowskiego',
  tresc:
    '<p style="text-align: center;">PREZYDENT MIASTA<br />Zduńska Wola</p>\n<p style="text-align: center;">zawiadamia, że w dniu 8 lipca 2026 r. o godz. 9.00 w siedzibie Urzędu Miasta Zduńska Wola <br />ul. Stefana Złotnickiego nr 12 - Gabinet Radnego odbędzie się:</p>\n<p style="text-align: center;">PIERWSZY PRZETARG USTNY NIEOGRANICZONY</p>\n<p style="text-align: center;">na sprzedaż prawa własności nw. nieruchomości niezabudowanej</p>\n<p style="text-align: center;">Adres nieruchomości: ul. Karola Szymanowskiego</p>\n<p style="text-align: left;">Szczegóły w załączniku.</p>',
  rozstrzygniecie: '', // tag entirely absent live — still pending
};

const TOROWA_LAND_SOLD = {
  adres: 'Zduńska Wola, ul. Torowa',
  rodzaj: 'Nieruchomość niezabudowana',
  cena: '320 000,00 zł w tym podatek VAT według obecnie obowiązującej stawki ',
  data: '24                        .06                        .2026  godz. 09:00',
  przetargNa:
    'Pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności nw. nieruchomości niezabudowanej - ul. Torowa',
  tresc:
    '<p style="text-align: center;">PREZYDENT MIASTA<br />Zduńska Wola</p>\n<p style="text-align: center;">zawiadamia, że w dniu 24 czerwca 2026 r. o godz. 9.00 w siedzibie Urzędu Miasta Zduńska Wola ul. Stefana Złotnickiego nr 12 - Gabinet Radnego odbędzie się:</p>\n<p style="text-align: center;">PIERWSZY PRZETARG USTNY NIEOGRANICZONY</p>\n<p style="text-align: center;">na sprzedaż prawa własności nw. nieruchomości niezabudowanej</p>\n<p style="text-align: center;">Adres nieruchomości: ul. Torowa</p>\n<p>Szczegóły w załączniku.</p>',
  rozstrzygniecie:
    '<p style="text-align: center;"><strong>Informacja o wyniku pierwszego ustnego przetargu nieograniczonego na sprzedaż na własność <br />nieruchomości niezabudowanej położonej w Zduńskiej Woli przy ul. Torowej</strong></p>\n<p>Prezydent Miasta Zduńska Wola informuje, iż w dniu 24.06.2026 r. o godz. 9:00 w Urzędzie Miasta odbył się pierwszy ustny przetarg nieograniczony na sprzedaż nieruchomości niezabudowanej, położonej  w obrębie 2 w Zduńskiej Woli przy ul. Torowej, oznaczonej w ewidencji gruntów numerami działek 185/5, 185/6 i 185/7 o łącznej powierzchni 9232 m2, dla której Sąd Rejonowy w Zduńskiej Woli prowadzi księgę wieczystą nr SR1Z/00020682/9.<br /><br />Osoby dopuszczone do przetargu – <br /><br />2 oferentów.<br /><br />Osoby niedopuszczone do przetargu – brak.<br /><br />Cena wywoławcza nieruchomości – 320 000,00 zł (słownie złotych: trzysta dwadzieścia tysięcy 00/100). <br /><br />Wadium  – 32 000,00 zł.<br /><br />Wpłaty wadium należało dokonać w terminie do dnia 17.06.2026 r. na konto Miasta Zduńska Wola.<br /><br />W wyznaczonym terminie na ww. nieruchomość dokonano wpłaty wadium.<br /><br />Pierwszy przetarg ustny nieograniczony na zbycie nieruchomości położonej przy ul. Torowej zakończył się wynikiem pozytywnym.<br /><br />Osobami wyłonionymi w wyniku przeprowadzonego przetargu zostali Katarzyna i Paweł małż. Wojciechowscy, którzy wylicytowali ww. nieruchomość za cenę 324 000,00 zł (słownie złotych: trzysta dwadzieścia cztery tysiące 00/100).</p>',
};

const MAJA_10_18_FLAT_PENDING = {
  adres: 'Zduńska Wola, ul. 1 Maja 10 lokal nr 18',
  rodzaj: 'Nieruchomość lokalowa',
  cena: 'w treści ogłoszenia',
  data: '20                        .11                        .2025  godz. 09:00',
  przetargNa:
    'Czwarty przetarg ustny nieograniczony na sprzedaż prawa własności nw. nieruchomości lokalowej - ul. 1 Maja 10 lokal nr 18\n',
  tresc:
    '<p style="text-align: center;">PREZYDENT MIASTA <br/>Zduńska Wola</p>\n<p style="text-align: center;">zawiadamia, że w dniu 20 listopada 2025 r. o godz. 9:00 w siedzibie Urzędu Miasta Zduńska Wola<br/>ul. Stefana Złotnickiego nr 12 - Gabinet Radnego odbędzie się:</p>\n<p style="text-align: center;">CZWARTY PRZETARG USTNY NIEOGRANICZONY</p>\n<p style="text-align: center;">na sprzedaż prawa własności nw. nieruchomości lokalowej</p>\n<p style="text-align: center;">Adres nieruchomości: ul. 1 Maja 10 lokal nr 18</p>\n<p style="text-align: left;">Szczegóły w załączniku.</p>',
  rozstrzygniecie: '',
};

// Real prose (bip.zdunskawola.pl/artykul/406/12899/..., 2026-03-30) — lives
// OUTSIDE the /przetargi-nieruchomosci/ board namespace (see file header) but
// used to groundtruth the defensive isSkippable() guard.
const BONIFIKATA_WYKAZ_TEXT =
  'OBWIESZCZENIE \nw sprawie podania do publicznej wiadomości wykazu dotyczącego lokali mieszkalnych przeznaczonych \ndo sprzedaży na rzecz najemców wraz z udziałem we własności gruntu oraz w częściach wspólnych budynku\n– w trybie bezprzetargowym.\nNa podstawie art. 34 ust. 1 pkt 1 i 2 oraz art. 35 ust. 1 i 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce  nieruchomościami (tj. Dz. U. z 2024 r. poz. 1145 ze zm.) Prezydent Miasta Zduńska Wola podaje do publicznej wiadomości, iż nw. lokale mieszkalne zostały przeznaczone do sprzedaży na rzecz najemców wraz z udziałem we własności gruntu oraz w częściach wspólnych budynku – w trybie bezprzetargowym. \nSzczegóły w załączniku.';

// The real (small) board XML, fetched live 2026-07-11 from
// https://bip.zdunskawola.pl/przetargi-nieruchomosci/xml/439/1 — 2 records.
const BOARD_XML = `<?phpxml version="1.0" encoding="UTF-8"?><bip.zdunskawola.pl>
    <przetargi-nieruchomosci>
        <strona>1</strona>
        <ilosc-stron>1</ilosc-stron>
        <ilosc-rekordow>2</ilosc-rekordow>
                    <artykuly>
                                    <artykul>
                        <url>https://bip.zdunskawola.pl/przetarg-nieruchomosci/12995/zdunska-wola-ul-karola-szymanowskiego</url>
                        <adres-nieruchomosci>Zduńska Wola, ul. Karola Szymanowskiego</adres-nieruchomosci>
                        <przetarg-na>Pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności nw. nieruchomości niezabudowanej - ul. Karola Szymanowskiego</przetarg-na>
                        <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                                                    <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
                                                <cena-wywolawcza>108 000,00 zł w tym podatek VAT według obecnie obowiązującej stawki</cena-wywolawcza>
                                                    <data-przetargu>08                                .07                                .2026  godz. 09:00</data-przetargu>
                                            </artykul>
                                    <artykul>
                        <url>https://bip.zdunskawola.pl/przetarg-nieruchomosci/12972/zdunska-wola-ul-torowa</url>
                        <adres-nieruchomosci>Zduńska Wola, ul. Torowa</adres-nieruchomosci>
                        <przetarg-na>Pierwszy przetarg ustny nieograniczony na sprzedaż prawa własności nw. nieruchomości niezabudowanej - ul. Torowa</przetarg-na>
                        <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                                                    <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
                                                <cena-wywolawcza>320 000,00 zł w tym podatek VAT według obecnie obowiązującej stawki </cena-wywolawcza>
                                                    <data-przetargu>24                                .06                                .2026  godz. 09:00</data-przetargu>
                                            </artykul>
                            </artykuly>
            </przetargi-nieruchomosci>
</bip.zdunskawola.pl>`;

// ------------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands, grosze tail, VAT-suffixed amounts', () => {
  assert.equal(parsePLN('108 000,00'), 108000);
  assert.equal(parsePLN('320 000,00'), 320000);
  assert.equal(parsePLN('324 000,00'), 324000);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(''), null);
});

test('parseBoardPage: extracts id + canonical url from the real (small) board XML', () => {
  const items = parseBoardPage(BOARD_XML);
  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map((i) => i.id).sort(),
    ['12972', '12995'],
  );
  const torowa = items.find((i) => i.id === '12972');
  assert.equal(torowa.url, 'https://bip.zdunskawola.pl/przetarg-nieruchomosci/12972/zdunska-wola-ul-torowa');
});

test('parseBoardPage: empty/garbage input returns []', () => {
  assert.deepEqual(parseBoardPage(''), []);
  assert.deepEqual(parseBoardPage('<not-xml/>'), []);
});

test('hasResolution: filled ROZSTRZYGNIECIE (Torowa) vs absent tag (Szymanowskiego)', () => {
  assert.equal(hasResolution(buildRecordText(TOROWA_LAND_SOLD)), true);
  assert.equal(hasResolution(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), false);
  assert.equal(hasResolution(buildRecordText(MAJA_10_18_FLAT_PENDING)), false);
});

test('isSkippable: real bonifikata tenant-sale wykaz text (board 406/12899)', () => {
  assert.equal(isSkippable(BONIFIKATA_WYKAZ_TEXT), true);
});

test('isSkippable: najem / dzierżawa / TBS signals', () => {
  assert.equal(isSkippable('Burmistrz ogłasza przetarg na najem lokalu użytkowego'), true);
  assert.equal(isSkippable('Przetarg na dzierżawę gruntu rolnego'), true);
  assert.equal(isSkippable('TBS "ZŁOTNICKI" sp. z o.o. ogłasza nabór wniosków'), true);
});

test('isSkippable: regression — the meeting-venue address "ul. Stefana Złotnickiego 12" (present in EVERY record\'s TRESC) must NOT trip the guard', () => {
  assert.equal(isSkippable(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), false);
  assert.equal(isSkippable(buildRecordText(TOROWA_LAND_SOLD)), false);
  assert.equal(isSkippable(buildRecordText(MAJA_10_18_FLAT_PENDING)), false);
});

test('roundFromText: leading ordinal in PRZETARGNA (no "ogłasza" preamble)', () => {
  assert.equal(roundFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), 1); // Pierwszy
  assert.equal(roundFromText(buildRecordText(TOROWA_LAND_SOLD)), 1); // Pierwszy
  assert.equal(roundFromText(buildRecordText(MAJA_10_18_FLAT_PENDING)), 4); // Czwarty
});

test('auctionDateFromText: spaced-dot DATA field -> ISO', () => {
  assert.equal(auctionDateFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), '2026-07-08');
  assert.equal(auctionDateFromText(buildRecordText(TOROWA_LAND_SOLD)), '2026-06-24');
  assert.equal(auctionDateFromText(buildRecordText(MAJA_10_18_FLAT_PENDING)), '2025-11-20');
});

test('startingPriceFromText: numeric CENA field parses; non-numeric "w treści ogłoszenia" -> null', () => {
  assert.equal(startingPriceFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), 108000);
  assert.equal(startingPriceFromText(buildRecordText(TOROWA_LAND_SOLD)), 320000);
  assert.equal(startingPriceFromText(buildRecordText(MAJA_10_18_FLAT_PENDING)), null);
});

test('achievedPriceFromText: "za cenę X zł" in ROZSTRZYGNIECIE; null while pending', () => {
  assert.equal(achievedPriceFromText(buildRecordText(TOROWA_LAND_SOLD)), 324000);
  assert.equal(achievedPriceFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), null);
});

test('buyerFromText: "Osobami wyłonionymi ... zostali <NAMES>, którzy wylicytowali ..."', () => {
  assert.equal(buyerFromText(buildRecordText(TOROWA_LAND_SOLD)), 'Katarzyna i Paweł małż. Wojciechowscy');
  assert.equal(buyerFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), null);
});

test('isPositiveOutcome / isNegativeOutcome: "wynikiem pozytywnym" (real); negative is best-effort (synthetic, not groundtruthed live)', () => {
  assert.equal(isPositiveOutcome(buildRecordText(TOROWA_LAND_SOLD)), true);
  assert.equal(isNegativeOutcome(buildRecordText(TOROWA_LAND_SOLD)), false);
  const synthenticUnsold = buildRecordText({
    ...SZYMANOWSKIEGO_LAND_PENDING,
    rozstrzygniecie: 'Pierwszy przetarg ustny nieograniczony na zbycie nieruchomości zakończył się wynikiem negatywnym.',
  });
  assert.equal(isNegativeOutcome(synthenticUnsold), true);
  assert.equal(achievedPriceFromText(synthenticUnsold), null);
});

test('kindFromText: "Nieruchomość niezabudowana" -> grunt; "Nieruchomość lokalowa" (no explicit lokal mieszkalny tag) -> mieszkalny default', () => {
  assert.equal(kindFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), 'grunt');
  assert.equal(kindFromText(buildRecordText(TOROWA_LAND_SOLD)), 'grunt');
  assert.equal(kindFromText(buildRecordText(MAJA_10_18_FLAT_PENDING)), 'mieszkalny');
});

test('kindFromText: "Nieruchomość lokalowa" + użytkowy signal in free text -> uzytkowy', () => {
  const t = buildRecordText({
    ...MAJA_10_18_FLAT_PENDING,
    przetargNa: 'Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu użytkowego nr 3',
  });
  assert.equal(kindFromText(t), 'uzytkowy');
});

test('addressRawFromText: land with no building number', () => {
  assert.equal(addressRawFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING)), 'ul. Karola Szymanowskiego');
  assert.equal(addressRawFromText(buildRecordText(TOROWA_LAND_SOLD)), 'ul. Torowa');
});

test('addressRawFromText: numeric street name "1 Maja" + building + "lokal nr" apt suffix', () => {
  assert.equal(addressRawFromText(buildRecordText(MAJA_10_18_FLAT_PENDING)), 'ul. 1 Maja 10/18');
});

test('plotFromText: multi-parcel list + BARE-m2 total (no ha conversion) from ROZSTRZYGNIECIE', () => {
  const plot = plotFromText(buildRecordText(TOROWA_LAND_SOLD));
  assert.equal(plot.dzialka_nr, '185/5, 185/6, 185/7');
  assert.equal(plot.area_m2, 9232);
});

test('plotFromText: pending land record has no inline parcel/area detail (PDF-only until resolved) -> both null', () => {
  const plot = plotFromText(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING));
  assert.equal(plot.dzialka_nr, null);
  assert.equal(plot.area_m2, null);
});

test('unitAreaFromText: pending flat has no inline area (PDF-only) -> null', () => {
  assert.equal(unitAreaFromText(buildRecordText(MAJA_10_18_FLAT_PENDING)), null);
});

// ============================================================ parseAnnouncement

test('parseAnnouncement: LAND pending (Szymanowskiego) — full record', () => {
  const rec = parseAnnouncement(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING));
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.address_raw, 'ul. Karola Szymanowskiego');
  assert.equal(rec.starting_price_pln, 108000);
  assert.equal(rec.auction_date, '2026-07-08');
  assert.equal(rec.round, 1);
  assert.equal(rec.dzialka_nr, null); // PDF-only while pending
});

test('parseAnnouncement: FLAT pending (1 Maja 10/18), round IV, non-numeric price', () => {
  const rec = parseAnnouncement(buildRecordText(MAJA_10_18_FLAT_PENDING));
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. 1 Maja 10/18');
  assert.equal(rec.address.key, '1 maja|10|18');
  assert.equal(rec.address.building, '10');
  assert.equal(rec.address.apt, '18');
  assert.equal(rec.starting_price_pln, null); // "w treści ogłoszenia" — PDF-only
  assert.equal(rec.auction_date, '2025-11-20');
  assert.equal(rec.round, 4);
});

test('parseAnnouncement: a resolved record (non-empty ROZSTRZYGNIECIE) is not re-announced', () => {
  // crawl.js routes on hasResolution() before calling parseAnnouncement, but
  // parseAnnouncement itself has no such gate — verify the caller contract
  // instead: Torowa's blob should be routed via parseResultDoc, not this.
  assert.equal(hasResolution(buildRecordText(TOROWA_LAND_SOLD)), true);
});

// ============================================================== parseResultDoc

test('parseResultDoc: LAND SOLD (Torowa) — achieved price, buyer, parcels, bare-m2 area', () => {
  const recs = parseResultDoc(
    buildRecordText(TOROWA_LAND_SOLD),
    null,
    'https://bip.zdunskawola.pl/przetarg-nieruchomosci/12972/zdunska-wola-ul-torowa',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 320000);
  assert.equal(r.final_price_pln, 324000);
  assert.equal(r.auction_date, '2026-06-24');
  assert.equal(r.round, 1);
  assert.equal(r.dzialka_nr, '185/5, 185/6, 185/7');
  assert.equal(r.area_m2, 9232);
  assert.equal(r.address_raw, 'ul. Torowa');
  assert.equal(r.buyer, 'Katarzyna i Paweł małż. Wojciechowscy');
  assert.equal(r.unsold_reason, null);
  assert.equal(
    r.source_pdf,
    'https://bip.zdunskawola.pl/przetarg-nieruchomosci/12972/zdunska-wola-ul-torowa',
  );
});

test('parseResultDoc: pending record (no ROZSTRZYGNIECIE) returns []', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(SZYMANOWSKIEGO_LAND_PENDING), null, 'u'), []);
  assert.deepEqual(parseResultDoc(buildRecordText(MAJA_10_18_FLAT_PENDING), null, 'u'), []);
});

test('parseResultDoc: empty/garbage text returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'u'), []);
  assert.deepEqual(parseResultDoc('ADRES: x\nROZSTRZYGNIECIE: \n', null, 'u'), []);
});

test('parseResultDoc: fallback date used when DATA is unparsable', () => {
  const noDate = buildRecordText({ ...TOROWA_LAND_SOLD, data: '' });
  const recs = parseResultDoc(noDate, '2026-06-24', 'u');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2026-06-24');
});
