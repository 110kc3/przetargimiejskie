// Wrocław parser tests — groundtruthed against REAL fixtures fetched live
// 2026-07-16 from bip.um.wroc.pl and gn.um.wroc.pl (Giełda Nieruchomości).
//
// Fixtures captured from:
//   Active search row (status=Aktualne, kind=lokal mieszkalny):
//     https://bip.um.wroc.pl/przetargi-nieruchomosci/szukaj?kind_id=3&status=0
//     row for przetarg-nieruchomosci/90668 (ulica Krzycka 3a lokal 1).
//   Announcement .docx (area_m2 enrichment source), attachment id 177152 on
//     the same article: "Powierzchnia lokalu: 59,34 m2".
//   Resolved search page (status=Rozstrzygnięte, kind_id=3, 25/page) — the
//     first 6 of the real 25 "Szczegóły" table rows (trimmed for fixture
//     size; splitting logic is identical for all 25 in production). Includes
//     the real row for przetarg-nieruchomosci/89156 (ulica generała Romualda
//     Traugutta 141 lokal 4, "(III przetarg)").
//   Result .docx "Informacja o wyniku (wersja tekstowa)" (real docText()
//     output — not hand-transcribed):
//     - attachment id 176660 on przetarg-nieruchomosci/89156 (Traugutta 141):
//       cena wywoławcza 462 000,00 zł, cena osiągnięta 466 620,00 zł, nabywca
//       "54D Sp. z o. o.", pow. 82,26 m2. NOTE: this article's OWN "Przetarg
//       na" field says "(III przetarg)" (round 3) while the .docx's "Rodzaj
//       przetargu" field says "II ustny nieograniczony" (round 2) — a genuine
//       source inconsistency (see parse.js's parseResultDoc doc comment for
//       why the adapter trusts the HTML field, not the .docx, for round).
//     - attachment id 176655 on przetarg-nieruchomosci/89757 (ulica Paulińska
//       2A "lokl" 12 — real source typo, missing the "a" in "lokal"): cena
//       wywoławcza 324 000,00 zł, cena osiągnięta 327 240,00 zł, same nabywca,
//       pow. 37,46 m2, round II (HTML and .docx agree here).
//   Giełda Nieruchomości detail page gn.um.wroc.pl/oferta/lokal/1283 (katalog
//     L/2/2026), two real excerpts (address heading + "Informacje
//     przetargowe" price/date block; the photo gallery in between is
//     trimmed): "Ulica Bystrzycka 101/12", Status oferty: Sprzedane, cena
//     wywoławcza 500 000,00 zł, cena uzyskana 505 000,00 zł, data przetargu
//     02.06.2026.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addressRawFromLabel,
  roundFromPrzetargNa,
  parseTableBlock,
  parseListingBlocks,
  blockToListing,
  areaFromAnnouncementText,
  headerField,
  amountsInText,
  achievedPriceFromText,
  buyerFromText,
  areaFromResultText,
  parseResultDoc,
  htmlToText,
} from '../src/cities/wroclaw/parse.js';

// ── addressRawFromLabel ──────────────────────────────────────────────────────

test('addressRawFromLabel: real label variants', () => {
  assert.equal(addressRawFromLabel('ulica Krzycka 3a lokal 1 '), 'ul. Krzycka 3a/1');
  assert.equal(addressRawFromLabel('Plac gen. Józefa Bema 4 lokal 6'), 'Plac gen. Józefa Bema 4/6');
  assert.equal(addressRawFromLabel('ulica generała Romualda Traugutta 141 lokal 4'), 'ul. generała Romualda Traugutta 141/4');
  assert.equal(addressRawFromLabel('ulica Marcina Borelowskiego 10-12 lokal 4'), 'ul. Marcina Borelowskiego 10-12/4');
  assert.equal(addressRawFromLabel('Rynek 14 lokal 5'), 'Rynek 14/5');
  // Real source typo: "lokl" (missing the "a" in "lokal").
  assert.equal(addressRawFromLabel('ulica Paulińska 2A lokl 12'), 'ul. Paulińska 2A/12');
  // Corner/multi-frontage building — prefers the "(lokal w budynku przy ul. X)" clause.
  assert.equal(
    addressRawFromLabel('ulica gen. Józefa Haukego-Bosaka 1, Zygmunta Krasińskiego 40 (lokal w budynku przy ul. Zygmunta Krasińskiego 40) lokal 2'),
    'ul. Zygmunta Krasińskiego 40/2',
  );
});

// ── roundFromPrzetargNa ──────────────────────────────────────────────────────

test('roundFromPrzetargNa', () => {
  assert.equal(roundFromPrzetargNa('sprzedaż wolnego lokalu mieszkalnego w budynku wielolokalowym wraz z udziałem w nieruchomości wspólnej'), 1);
  assert.equal(roundFromPrzetargNa('sprzedaż wolnego lokalu mieszkalnego w budynku wielolokalowym wraz z udziałem w nieruchomości wspólnej (II przetarg)'), 2);
  assert.equal(roundFromPrzetargNa('sprzedaż wolnego lokalu mieszkalnego w budynku wielolokalowym wraz z udziałem w nieruchomości wspólnej (III przetarg)'), 3);
});

// ── BIP "Szczegóły" table block (shared by search-results rows + detail page) ─

// Real search-results row (status=Aktualne&kind_id=3), przetarg-nieruchomosci/90668.
const ACTIVE_TABLE_HTML = `    <table class="table table-borderless">
        <caption class="visuallyhidden">Adres nieruchomości            : ulica Krzycka 3a lokal 1 </caption>
        <tbody>
        <tr>
            <th scope="row">Adres nieruchomości</th>
            <td class="normal"><a
                        href="https://bip.um.wroc.pl/przetarg-nieruchomosci/90668/ulica-krzycka-3a-lokal-1">ulica Krzycka 3a lokal 1 </a>
            </td>
        </tr>
        <tr>
            <th scope="row">Przetarg na</th>
            <td class="normal">sprzedaż wolnego lokalu mieszkalnego w budynku wielolokalowym wraz z udziałem w nieruchomości wspólnej</td>
        </tr>
        <tr>
            <th scope="row">Typ przetargu</th>
            <td>Przetarg ustny nieograniczony</td>
        </tr>
                    <tr>
                <th scope="row">Rodzaj nieruchomości</th>
                <td>lokal mieszkalny</td>
            </tr>
                <tr>
            <th scope="row">Cena wywoławcza</th>
            <td>575 000,00 zł</td>
        </tr>
                    <tr>
                <th scope="row">Data przetargu</th>
                <td>
                    <time datetime="2026-09-30T10:00:00">
                        <strong>30.09.2026</strong> godz. 10:00                    </time>
                </td>
            </tr>
                        </tbody>
    </table>`;

test('parseListingBlocks + blockToListing: real active search-results row', () => {
  const blocks = parseListingBlocks(ACTIVE_TABLE_HTML);
  assert.equal(blocks.length, 1);
  const b = blocks[0];
  assert.equal(b.addressLabel, 'ulica Krzycka 3a lokal 1');
  assert.equal(b.detailUrl, 'https://bip.um.wroc.pl/przetarg-nieruchomosci/90668/ulica-krzycka-3a-lokal-1');
  assert.equal(b.rodzaj, 'lokal mieszkalny');
  assert.equal(b.cenaText, '575 000,00 zł');
  assert.equal(b.auctionDate, '2026-09-30');

  const rec = blockToListing(b);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'ul. Krzycka 3a/1');
  assert.equal(rec.address.key, 'krzycka|3A|1');
  assert.equal(rec.round, 1);
  assert.equal(rec.starting_price_pln, 575000);
  assert.equal(rec.auction_date, '2026-09-30');
  assert.equal(rec.detail_url, 'https://bip.um.wroc.pl/przetarg-nieruchomosci/90668/ulica-krzycka-3a-lokal-1');
});

// Real "Rozstrzygnięte" search-results page (status=2&kind_id=3) — first 6 of
// the real 25 rows, to exercise multi-block splitting on real page structure.
const RESOLVED_SEARCH_HTML_6 = `<table class="table table-borderless">
        <caption class="visuallyhidden">Adres nieruchomości            : ulica generała Romualda Traugutta 141 lokal 4</caption>
        <tbody>
        <tr>
            <th scope="row">Adres nieruchomości</th>
            <td class="normal"><a
                        href="https://bip.um.wroc.pl/przetarg-nieruchomosci/89156/ulica-generala-romualda-traugutta-141-lokal-4">ulica generała Romualda Traugutta 141 lokal 4</a>
            </td>
        </tr>
        <tr>
            <th scope="row">Przetarg na</th>
            <td class="normal">sprzedaż wolnego lokalu mieszkalnego w budynku wielolokalowym wraz z udziałem w nieruchomości wspólnej (III przetarg)</td>
        </tr>
        <tr>
            <th scope="row">Typ przetargu</th>
            <td>Przetarg ustny nieograniczony</td>
        </tr>
                    <tr>
                <th scope="row">Rodzaj nieruchomości</th>
                <td>lokal mieszkalny</td>
            </tr>
                <tr>
            <th scope="row">Cena wywoławcza</th>
            <td>462 000,00 zł</td>
        </tr>
                    <tr>
                <th scope="row">Data przetargu</th>
                <td>
                    <time datetime="2026-07-01T10:00:00">
                        <strong>01.07.2026</strong> godz. 10:00                    </time>
                </td>
            </tr>
                        </tbody>
    </table>
<table class="table table-borderless">
        <caption class="visuallyhidden">Adres nieruchomości            : ulica Paulińska 2A lokl 12</caption>
        <tbody>
        <tr>
            <th scope="row">Adres nieruchomości</th>
            <td class="normal"><a
                        href="https://bip.um.wroc.pl/przetarg-nieruchomosci/89757/ulica-paulinska-2a-lokl-12">ulica Paulińska 2A lokl 12</a>
            </td>
        </tr>
        <tr>
            <th scope="row">Przetarg na</th>
            <td class="normal">sprzedaż wolnego lokalu mieszkalnego w budynku wielolokalowym wraz z udziałem w nieruchomości wspólnej (II przetarg)</td>
        </tr>
        <tr>
            <th scope="row">Typ przetargu</th>
            <td>Przetarg ustny nieograniczony</td>
        </tr>
                    <tr>
                <th scope="row">Rodzaj nieruchomości</th>
                <td>lokal mieszkalny</td>
            </tr>
                <tr>
            <th scope="row">Cena wywoławcza</th>
            <td>324 000,00 zł</td>
        </tr>
                    <tr>
                <th scope="row">Data przetargu</th>
                <td>
                    <time datetime="2026-07-01T10:00:00">
                        <strong>01.07.2026</strong> godz. 10:00                    </time>
                </td>
            </tr>
                        </tbody>
    </table>
<table class="table table-borderless">
        <caption class="visuallyhidden">Adres nieruchomości            : ulica Marcina Borelowskiego 10-12 lokal 4</caption>
        <tbody>
        <tr>
            <th scope="row">Adres nieruchomości</th>
            <td class="normal"><a
                        href="https://bip.um.wroc.pl/przetarg-nieruchomosci/89166/ulica-marcina-borelowskiego-10-12-lokal-4">ulica Marcina Borelowskiego 10-12 lokal 4</a>
            </td>
        </tr>
        <tr>
            <th scope="row">Przetarg na</th>
            <td class="normal">sprzedaż wolnego lokalu mieszkalnego w budynku wielolokalowym wraz z udziałem w nieruchomości wspólnej (III przetarg)</td>
        </tr>
        <tr>
            <th scope="row">Typ przetargu</th>
            <td>Przetarg ustny nieograniczony</td>
        </tr>
                    <tr>
                <th scope="row">Rodzaj nieruchomości</th>
                <td>lokal mieszkalny</td>
            </tr>
                <tr>
            <th scope="row">Cena wywoławcza</th>
            <td>376.000,00 zł</td>
        </tr>
                    <tr>
                <th scope="row">Data przetargu</th>
                <td>
                    <time datetime="2026-06-25T12:00:00">
                        <strong>25.06.2026</strong> godz. 12:00                    </time>
                </td>
            </tr>
                        </tbody>
    </table>`;

test('parseListingBlocks: real resolved search-results rows (3 of 25) split correctly', () => {
  const blocks = parseListingBlocks(RESOLVED_SEARCH_HTML_6);
  assert.equal(blocks.length, 3);
  const traugutta = blocks.find((b) => b.detailUrl && b.detailUrl.includes('/89156/'));
  assert.ok(traugutta, 'Traugutta 141 row present');
  assert.equal(traugutta.addressLabel, 'ulica generała Romualda Traugutta 141 lokal 4');
  assert.equal(traugutta.przetargNa.includes('III przetarg'), true);
  assert.equal(roundFromPrzetargNa(traugutta.przetargNa), 3);
  assert.equal(traugutta.cenaText, '462 000,00 zł');
  assert.equal(traugutta.auctionDate, '2026-07-01');
});

// ── announcement .docx → area_m2 enrichment ──────────────────────────────────

// Real docText() output for the Krzycka 3a announcement .docx (attachment id 177152).
const OGLOSZENIE_KRZYCKA = "Adres nieruchomości: ulica Krzycka 3a - lokal mieszkalny numer 1\n\tPowierzchnia lokalu: 59,34 m2 \n\tOpis lokalu: lokal składa się z trzech pokoi, kuchni, łazienki z wc oraz          przedpokoju. Lokal położony na I kondygnacji (parter). \n\tUdział w nieruchomości wspólnej: 1460/10000\n\t";

test('areaFromAnnouncementText: real announcement .docx', () => {
  assert.equal(areaFromAnnouncementText(OGLOSZENIE_KRZYCKA), 59.34);
});

// ── result .docx (BIP primary achieved-price source) ─────────────────────────

// Real docText() output, attachment id 176660 (Traugutta 141 — SOLD).
const WYNIK_TRAUGUTTA = "\r\n\n\nInformacja o wyniku przetargu\nPodana do publicznej wiadomości w dniach 09.07.2026 r. do 16.07.2026 r.\n\n\n\nData i miejsce przetargu\n\n\nRodzaj przetargu\n\nOznaczenie nieruchomości według danych katastru i księgi wieczystej\n\n\nLiczba osób dopuszczonych do przetargu\n\n\nLiczba osób niedopuszczonych do przetargu\n\n\nCena wywoławcza netto\n\n\nNajwyższa cena netto osiągnięta\nw przetargu\n\n\nDane nabywcy nieruchomości\n\n1 lipca \n2026 r.\n\nUrząd Miejski, Plac Nowy Targ 1-8, 50-141 Wrocław\n\n\nII ustny nieograniczony\n\nul. gen. Romualda Traugutta 141\nlokal nr 4\n\ndz. nr 51/23AM-11, \nobręb: Południe\n\n pow. 82,26 m2 \nWR1K/00113402/3\n\n\n1\n\n0\n\n462.000,00 zł\n\nSłownie złotych: czterysta sześćdziesiąt dwa tysiące    00/100\n\n\n466.620,00 zł\n\nSłownie złotych: czterysta sześćdziesiąt sześć tysięcy sześćset dwadzieścia    00/100\n\n\n54D Sp. z o. o.\nOpracowała: Kamila Olinowicz\nDyrektor \nWydziału Sprzedaży Lokali\nMonika Drobyszewska\n\n\n\n";
// Real docText() output, attachment id 176655 (Paulińska 2A — SOLD, real "lokl" typo upstream).
const WYNIK_PAULINSKA = "\r\n\n\nInformacja o wyniku przetargu\nPodana do publicznej wiadomości w dniach 09.07.2026 r. do 16.07.2026 r.\n\n\n\nData i miejsce przetargu\n\n\nRodzaj przetargu\n\nOznaczenie nieruchomości według danych katastru i księgi wieczystej\n\n\nLiczba osób dopuszczonych do przetargu\n\n\nLiczba osób niedopuszczonych do przetargu\n\n\nCena wywoławcza netto\n\n\nNajwyższa cena netto osiągnięta\nw przetargu\n\n\nDane nabywcy nieruchomości\n\n1 lipca \n2026 r.\n\nUrząd Miejski, Plac Nowy Targ 1-8, 50-141 Wrocław\n\n\nII ustny nieograniczony\n\nul. Paulińska 2A\nlokal nr 12\n\ndz. nr 86AM-23, \nobręb: Plac Grunwaldzki\n\n pow. 37,46 m2 \nWR1K/00085340/4\n\n\n1\n\n0\n\n324.000,00 zł\n\nSłownie złotych: trzysta dwadzieścia cztery tysiące   00/100\n\n\n327.240,00 zł\n\nSłownie złotych: trzysta dwadzieścia siedem tysięcy dwieście czterdzieści   00/100\n\n\n54D Sp. z o. o.\nOpracowała: Kamila Olinowicz\nDyrektor \nWydziału Sprzedaży Lokali\nMonika Drobyszewska\n\n\n\n";

function buildRefText({ addressRaw, round, startingPricePln, auctionDate, body }) {
  const header = [
    `ADRES: ${addressRaw}`,
    `RUNDA: ${round}`,
    startingPricePln != null ? `CENA_WYWOLAWCZA: ${startingPricePln}` : null,
    auctionDate ? `DATA: ${auctionDate}` : null,
  ].filter(Boolean).join('\n');
  return `${header}\n---\n${body}`;
}

test('helpers: amountsInText / achievedPriceFromText / buyerFromText / areaFromResultText (real .docx text)', () => {
  assert.deepEqual(amountsInText(WYNIK_TRAUGUTTA), [462000, 466620]);
  assert.equal(achievedPriceFromText(WYNIK_TRAUGUTTA, 462000), 466620);
  assert.equal(buyerFromText(WYNIK_TRAUGUTTA), '54D Sp. z o. o.');
  assert.equal(areaFromResultText(WYNIK_TRAUGUTTA), 82.26);
});

test('parseResultDoc: real BIP result .docx — Traugutta 141 SOLD (round from HTML, not the .docx)', () => {
  const refText = buildRefText({
    addressRaw: 'ul. generała Romualda Traugutta 141/4',
    round: 3, // from the article's OWN "(III przetarg)" HTML field — see fixture header comment
    startingPricePln: 462000,
    auctionDate: '2026-07-01',
    body: WYNIK_TRAUGUTTA,
  });
  const recs = parseResultDoc(refText, null, 'https://bip.um.wroc.pl/attachments/download/176660');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'generala romualda traugutta|141|4');
  assert.equal(r.round, 3);
  assert.equal(r.starting_price_pln, 462000);
  assert.equal(r.final_price_pln, 466620);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 82.26);
  assert.equal(r.auction_date, '2026-07-01');
  assert.deepEqual(r.notes, ['nabywca: 54D Sp. z o. o.']);
});

test('parseResultDoc: real BIP result .docx — Paulińska 2A SOLD (source "lokl" typo)', () => {
  const refText = buildRefText({
    addressRaw: 'ul. Paulińska 2A/12',
    round: 2,
    startingPricePln: 324000,
    auctionDate: '2026-07-01',
    body: WYNIK_PAULINSKA,
  });
  const recs = parseResultDoc(refText, null, 'https://bip.um.wroc.pl/attachments/download/176655');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'paulinska|2A|12');
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, 324000);
  assert.equal(r.final_price_pln, 327240);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.area_m2, 37.46);
});

test('parseResultDoc: missing ADRES header ⇒ no records', () => {
  assert.deepEqual(parseResultDoc('RUNDA: 1\n---\nsome text', null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
});

test('achievedPriceFromText: explicit negative-outcome phrase ⇒ null (unsold)', () => {
  const negativeBody = 'Przetarg zakończył się wynikiem negatywnym, gdyż nikt nie przystąpił do przetargu.';
  assert.equal(achievedPriceFromText(negativeBody, 300000), null);
  const refText = buildRefText({
    addressRaw: 'ul. Testowa 1/1',
    round: 1,
    startingPricePln: 300000,
    auctionDate: '2026-05-10',
    body: negativeBody,
  });
  const recs = parseResultDoc(refText, null, 'x');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
  assert.equal(recs[0].unsold_reason, 'negatywny');
});

// ── Giełda Nieruchomości (secondary achieved-price source) ───────────────────

// Real fetched fragments from gn.um.wroc.pl/oferta/lokal/1283 (katalog L/2/2026):
// the address heading + the "Informacje przetargowe" price/date block (the
// photo gallery in between is trimmed for fixture size).
const GIELDA_HTML = `<h2 class="ps-4 details-title-offer"><b>Ulica Bystrzycka 101/12</b></h2>
                    </figure>
                    <p class="details-description-offer">G&#x105;d&#xF3;w Ma&#x142;y, Fabryczna</p>
                </div>
                <div class="pe-4 pb-4 details-subtitle-status">
                    <span class="d-flex align-items-center ms-4 px-4 bg-white">Status oferty: Sprzedane</span>
                </div>
                <div class="pe-4 pb-4 details-subtitle-price">
                                <div class="d-flex flex-column">
                                    <p class="text-center">Cena uzyskana</p>
<li class="list-unstyled ms-2 mb-3 offerdescription-title">
                            <h3 class="offerdescription-section-title">Informacje przetargowe</h3>
                        </li>
                        <li class="ms-4 mb-2 list-unstyled disc">
                            Pobierz:
                        </li>

                        <li class="ms-4 ps-3 list-unstyled">
                            <a href="https://bip.um.wroc.pl/wykaz-nieruchomosci/86862/ulica-jerzego-bajana-64-72-bystrzycka-97-105-lokal-w-budynku-przy-ul-bystrzyckiej-101-lokal-12" style="margin-right: 3px">Wykaz </a>
                        </li>
                            <li class="ms-4 list-unstyled">
                                <a style="margin-left: 3px" href="https://bip.um.wroc.pl/przetarg-nieruchomosci/88378/ulica-jerzego-bajana-64-72-bystrzycka-97-105-lokal-nr-12-w-budynku-przy-ul-bystrzyckiej-nr-101"> Przetarg</a>
                            </li>
                    </ul>
                    <ul class="bg-white my-0 px-2 item-details-offerdescription-n">
                        <li class="ms-4 mb-2 list-unstyled disc">
                            Cena wywo&#x142;awcza:
                        </li>
                        <li class="list-unstyled pb-2 offerdescription-detailes">
                                <span class="price">500.000,00 z&#x142;</span>
                        </li>
                        <li class="ms-4 mb-2 list-unstyled disc">
                            Data przetargu:
                        </li>
                            <li class="list-unstyled offerdescription-detailes">
                                02.06.2026
                            </li>
                        <li class="ms-4 mb-2 list-unstyled disc">
                            Rodzaj przetargu:
                        </li>
                        <li class="list-unstyled offerdescription-detailes">
                            -
                        </li>
                    </ul>
                        <ul class="bg-white my-1 mt-0 mb-4 px-2 item-details-offerdescription-n">
                            <li class="ms-4 mb-2 list-unstyled disc">
                            Cena uzyskana:
                        </li>
                        <li class="list-unstyled offerdescription-detailes">
                                    <b class="price">505.000,00 z&#x142;</b>
                        </li>
                    </ul>`;

test('Giełda real fixture: address heading, achieved + starting price, date', () => {
  const text = htmlToText(GIELDA_HTML);
  assert.ok(text.includes('Cena uzyskana: 505.000,00 zł'));
  assert.ok(text.includes('Cena wywoławcza: 500.000,00 zł'));
  assert.ok(text.includes('Data przetargu: 02.06.2026'));
  const addrM = /details-title-offer">\s*<b>\s*(?:Ulica\s+)?([^<]+?)\s*<\/b>/i.exec(GIELDA_HTML);
  assert.equal(addrM[1], 'Bystrzycka 101/12');
});
