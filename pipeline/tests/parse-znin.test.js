// Żnin parser tests. Fixtures are condensed-but-faithful copies of REAL page
// text fetched live from bip.gminaznin.pl (verified 2026-07-12, from this Pi's
// Polish residential IP — the bot UA 403s, a browser UA returns full server
// HTML). Long non-load-bearing chrome (nav, cookie banner, Opis/Położenie prose,
// the full metadata change-log) is trimmed; every element that feeds a parsed
// field (H1 title, the "Sprzedaż · <kind> · Przeznaczenie" line, the Cena/Wadium
// price card, the Powierzchnia/Obręb/Numer-działki/Księga-wieczysta/Tryb field
// list, the ogłoszenie-PDF attachment link, the "Data publikacji" metadata) is
// reproduced verbatim in the real System Rada / eSesja container shapes.
//
// Two documented Żnin gotchas are baked in as regression fixtures:
//   1. The LAND fixture keeps the "Powiązane przetargi" related-rounds table,
//      whose header cell is literally "Data publikacji</th>" (NO colon) — a
//      loose scan reads it as the publication-date field; extractPublishedDate
//      requires the colon, so it correctly binds to the real
//      "Data publikacji:<br> <strong>06 mar 2024 …" in the metadata block.
//   2. The OCR auction-date fixtures keep the two DECOY dates every ogłoszenie
//      carries ("… upłynął w dniu <D> r." = the art. 34 prior-claims deadline;
//      "Wadium należy wpłacić najpóźniej do dnia <D> r.") alongside the real
//      "Przetarg odbędzie się … w dniu <D> r." — extractAuctionDate anchors on
//      "odbędzie się" so a decoy can never win.
//
// Groundtruth (hand-verified against the live pages / OCR):
//   FLAT  Jadowniki Rycerskie, budynek 27, lokal mieszkalny nr 4, 56 m²:
//     round I  /nieruchomosc/…lokalu-mieszkalnego-nr-4…jadown-1
//              cena wywoławcza 82 000 zł, wadium 10 000 zł, dz. 112,
//              KW BY1Z/00019004/2, published 2026-05-14, auction 2026-06-18
//              (auction date is OCR-only — the inline HTML omits it)
//   LAND  Brzyskorzystew, dz. nr 295/10, 1391 m² (grunt, parcel-keyed):
//     round I  cena 99 700 zł, wadium 9 000 zł, KW BY1Z/00022073/0,
//              published 2024-03-06 — rounds I/II/III all live on the board ⇒
//              rounds I,II are CONFIRMED superseded/unsold
//   COMMERCIAL  Żnin, ul. Gnieźnieńska 18, lokal niemieszkalny nr 13, 20,50 m²:
//     round I  cena 18 000 zł, wadium 1 800 zł, dz. 1154/3, KW BY1Z/00014177/0,
//              published 2025-12-08, auction 2026-01-15 (OCR) — round II live ⇒
//              round I superseded/unsold (address-keyed result path)
//   BUILT  Żnin, ul. Kl. Janickiego, dz. nr 1741/3 (zabudowana, NO building no.):
//     round I  its TITLE never says "zabudowanej" — only the structured
//              "Nieruchomość zabudowana" label resolves the kind; with no
//              building number it yields no address and is intentionally dropped

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  parsePolishDate,
  roundFromTitle,
  extractAddress,
  extractAuctionDate,
  extractPublishedDate,
  ogloszeniePdfUrl,
  isCancelled,
  parseNotice,
  parseResultDoc,
} from '../src/cities/znin/parse.js';

// --------------------------------------------------------------- fixtures

// Reproduces the real /nieruchomosc/<slug> page skeleton (System Rada / eSesja):
// <h1 class="my-3 my-md-4">, the "Sprzedaż · <kind> · Przeznaczenie" line, an
// optional "Powiązane przetargi" table, the Cena/Wadium price card, the
// list-group field block (Powierzchnia uses <sup>2</sup>), the "Załączniki do
// pobrania" attachment table, and the "Metadane" boundary + "Data publikacji".
function pageHtml(o) {
  return `<!doctype html><html><body><main class="sub-page">
<h1 class="my-3 my-md-4">${o.title}</h1>
<div class="badges"><a class="badge">Sprzedaż</a> <span class="badge badge-primary">${o.kindLabel}</span></div>
<p class="mb-1">Przeznaczenie: ${o.przeznaczenie}</p>
${o.related || ''}
<div class="card border-light">
  <div class="row no-gutters align-items-center">
    <div class="col-sm-6"><div class="card-header bg-white text-center pb-0">
      <p class="text-primary mb-0">Cena wywoławcza</p>
      <span class="d-block my-3"><span class="display-3 font-weight-bold">${o.cena} <span class="align-baseline font-medium">PLN</span></span><br />
      <small class="text-tertiary">cena za metr ${o.perM} zł</small></span>
      <hr />
      <p class="text-primary mb-0">Wadium</p>
      <span class="d-block my-3"><span class="display-4 font-weight-bold">${o.wadium} <span class="align-baseline font-medium">PLN</span></span></span>
    </div></div>
    <div class="col-sm-6"><div class="card-body pb-0">
      <ul class="list-group list-group-flush price-list mb-4">
        <li class="list-group-item p-0"><span class="fas fa-ruler-combined" aria-hidden="true"></span>Powierzchnia: <strong>${o.area} m<sup>2</sup></strong></li>
        <li class="list-group-item p-0"><span class="far fa-draw-polygon" aria-hidden="true"></span>Obręb: <strong>${o.obreb}</strong></li>
        <li class="list-group-item p-0"><span class="fas fa-map" aria-hidden="true"></span>Numer działki: <strong>${o.dzialka}</strong></li>
        <li class="list-group-item p-0"><span class="fas fa-book" aria-hidden="true"></span>Księga wieczysta: <strong>${o.kw}</strong></li>
        <li class="list-group-item p-0"><span class="fas fa-gavel" aria-hidden="true"></span>Tryb przetargu: <strong>${o.tryb || 'Przetarg ustny nieograniczony'}</strong></li>
      </ul>
    </div></div>
  </div>
</div>
<h2 class="h4 my-3 my-md-4">Opis nieruchomości</h2>
<h2 class="h4 my-3 my-md-4">Załączniki do pobrania</h2>
<table class="table"><tbody><tr><td><a href="${o.pdf}">Ogłoszenie</a></td><td>${o.published} 12:44:38</td></tr>
<tr><td><a href="/pliki/umznin/zalaczniki/${o.zid || '9999'}/mapa.png">mapa</a></td><td>${o.published} 12:44:38</td></tr></tbody></table>
<h2 class="h4 my-3 my-md-4">Metadane - wyciąg z rejestru zmian</h2>
<aside class="col-lg-4"><p><span class="fas fa-calendar" aria-hidden="true"></span> Data publikacji:<br /> <strong>${o.pubHuman}</strong></p>
<p><span></span> Data aktualizacji: <br />19 cze 2026, godz. 09:24</p></aside>
</main></body></html>`;
}

const FLAT_TITLE =
  'Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4 położonego w Jadownikach Rycerskich w budynku mieszkalnym nr 27.';
const FLAT_HTML = pageHtml({
  title: FLAT_TITLE,
  kindLabel: 'Lokal mieszkalny',
  przeznaczenie: 'zabudowa mieszkaniowa wielorodzinna',
  cena: '82 000,00', perM: '1 464,29', wadium: '10 000,00',
  area: '56', obreb: 'Jadowniki Rycerskie', dzialka: '112', kw: 'BY1Z/00019004/2',
  pdf: '/pliki/umznin/zalaczniki/10690/ogloszenie-jadowniki-ryc-4-27-1.pdf', zid: '10690',
  published: '2026-05-14', pubHuman: '14 maj 2026, godz. 13:00',
});

// The LAND fixture KEEPS the "Powiązane przetargi" related-rounds table (rounds
// II & III of the same parcel) — a real page has it, and its "Data publikacji"
// column header (no colon) is the disambiguation regression noted at the top.
const LAND_RELATED = `<h2 class="h4">Powiązane przetargi</h2>
<div class="table-responsive-sm"><table class="table table-striped"><thead><tr><th>Tytuł</th><th style="width:200px;">Data publikacji</th></tr></thead><tbody>
<tr><td><a href="/nieruchomosc/trzeci-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-dzialki-nr-295-10-w-brzyskorzyst">Trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości, działki nr 295/10 w Brzyskorzystwi</a></td><td>2024-10-04 11:30:00</td></tr>
<tr><td><a href="/nieruchomosc/drugi-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-dzialki-nr-295-10-w-brzyskorzystw">Drugi przetarg ustny nieograniczony na sprzedaż nieruchomości, działki nr 295/10 w Brzyskorzystwi</a></td><td>2024-05-28 11:00:00</td></tr>
</tbody></table></div>`;
const LAND_TITLE =
  'Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości, działki nr 295/10 w Brzyskorzystwi';
const LAND_HTML = pageHtml({
  title: LAND_TITLE,
  kindLabel: 'Nieruchomość niezabudowana',
  przeznaczenie: 'zabudowa mieszkaniowa jednorodzinna',
  related: LAND_RELATED,
  cena: '99 700,00', perM: '71,68', wadium: '9 000,00',
  area: '1391', obreb: 'Brzyskorzystew', dzialka: '295/10', kw: 'BY1Z/00022073/0',
  pdf: '/pliki/umznin/zalaczniki/9149/ogloszenie-przetargi-brzyskorzystew.pdf', zid: '9149',
  published: '2024-03-06', pubHuman: '06 mar 2024, godz. 12:00',
});

const COMM_TITLE =
  'Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu niemieszkalnego nr 13, o powierzchni 20,50 m2, położonego w Żninie przy ul. Gnieźnieńskiej 18.';
const COMM_HTML = pageHtml({
  title: COMM_TITLE,
  kindLabel: 'Lokal użytkowy',
  przeznaczenie: 'zabudowa mieszkaniowa wielorodzinna',
  cena: '18 000,00', perM: '877,50', wadium: '1 800,00',
  area: '20.50', obreb: 'Żnin', dzialka: '1154/3', kw: 'BY1Z/00014177/0',
  pdf: '/pliki/umznin/zalaczniki/10455/ogloszenie-i-gnieznienska.pdf', zid: '10455',
  published: '2025-12-08', pubHuman: '08 gru 2025, godz. 13:00',
});

// Built property whose TITLE omits "zabudowanej" — only the structured label
// resolves the kind; no building number ⇒ no address.
const BUILT_TITLE =
  'Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej własność Gminy Żnin, położonej w Żninie przy ul. Kl. Janickiego, oznaczonej geodezyjnie jako działka nr 1741/3';
const BUILT_HTML = pageHtml({
  title: BUILT_TITLE,
  kindLabel: 'Nieruchomość zabudowana',
  przeznaczenie: 'tereny zabudowy usługowej',
  cena: '1 000 000,00', perM: '277,01', wadium: '100 000,00',
  area: '3611', obreb: 'Żnin', dzialka: '1741/3', kw: 'BY1Z/00030000/0',
  pdf: '/pliki/umznin/zalaczniki/8456/ogloszenie-kl-janickiego.pdf', zid: '8456',
  published: '2024-01-10', pubHuman: '10 sty 2024, godz. 10:00',
});

// Condensed-but-verbatim OCR text of the SCANNED ogłoszenie PDFs (pol tesseract,
// this Pi, 2026-07-12) — keeps the auction sentence plus both decoy dates.
const FLAT_OCR = `Burmistrz Żnina ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4, położonego w Jadownikach Rycerskich w budynku nr 27.
Cena wywoławcza wynosi 82 000,00 zł (VAT zwolniony), wadium 10 000,00 zł.
Termin do złożenia wniosku przez osoby, którym przysługuje pierwszeństwo w nabyciu na podstawie art. 34 ust. 1 pkt 1 i 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami upłynął w dniu 24 kwietnia 2026 r.
Przetarg odbędzie się w Auli Urzędu Miejskiego w Żninie (pokój nr 29) przy ul. 700-lecia 39, w dniu 18 czerwca 2026 r. o godz. 09.
Wadium należy wpłacić najpóźniej do dnia 15 czerwca 2026 r.`;

const COMM_OCR = `Burmistrz Żnina ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu niemieszkalnego nr 13, położonego w Żninie przy ul. Gnieźnieńskiej 18.
Cena wywoławcza wynosi 18 000,00 zł (VAT zwolniony), wadium 1 800,00 zł.
Termin do złożenia wniosku przez osoby, którym przysługuje pierwszeństwo, upłynął w dniu 14 listopada 2025 r.
Przetarg odbędzie się w Auli Urzędu Miejskiego w Żninie (pokój nr 29) przy ul. 700-lecia 39, w dniu 15 stycznia 2026 r. o godz. 11.
Wadium należy wpłacić najpóźniej do dnia 12 stycznia 2026 r.`;

// -------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands + PLN/zł tail, and non-numeric → null', () => {
  assert.equal(parsePLN('82 000,00'), 82000);
  assert.equal(parsePLN('99 700,00'), 99700);
  assert.equal(parsePLN('1 000 000,00'), 1000000);
  assert.equal(parsePLN('18000'), 18000);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: comma and dot separators, integer land areas (already m², no ha)', () => {
  assert.equal(parseArea('56'), 56);
  assert.equal(parseArea('51,90'), 51.9);
  assert.equal(parseArea('51.90'), 51.9);
  assert.equal(parseArea('1391'), 1391);
});

test('parsePolishDate: spelled-out genitive, 3-letter CMS abbreviation, numeric', () => {
  assert.equal(parsePolishDate('18 czerwca 2026'), '2026-06-18');
  assert.equal(parsePolishDate('15 stycznia 2026 r.'), '2026-01-15');
  assert.equal(parsePolishDate('06 mar 2024'), '2024-03-06'); // abbreviated month
  assert.equal(parsePolishDate('18.06.2026'), '2026-06-18');
  assert.equal(parsePolishDate('brak daty'), null);
});

test('roundFromTitle: Polish ordinal words (Pierwszy…Czwarty), null when absent', () => {
  assert.equal(roundFromTitle(FLAT_TITLE), 1);
  assert.equal(roundFromTitle('Drugi przetarg ustny nieograniczony na sprzedaż …'), 2);
  assert.equal(roundFromTitle('Trzeci przetarg ustny nieograniczony …'), 3);
  assert.equal(roundFromTitle('Czwarty przetarg ustny nieograniczony …'), 4);
  assert.equal(roundFromTitle('Ogłoszenie o sprzedaży nieruchomości'), null);
});

test('extractAuctionDate: anchors on "odbędzie się" so the art.34 + wadium decoy dates never win', () => {
  assert.equal(extractAuctionDate(FLAT_OCR), '2026-06-18'); // NOT 24 kwietnia / 15 czerwca
  assert.equal(extractAuctionDate(COMM_OCR), '2026-01-15'); // NOT 14 listopada / 12 stycznia
  assert.equal(extractAuctionDate('brak informacji o terminie'), null);
});

test('extractAddress: village flat (street=obręb, bldg from "budynku nr"), town unit (ul. + no.), and no-building → null', () => {
  const flat = extractAddress(FLAT_TITLE, 'Jadowniki Rycerskie');
  assert.equal(flat.address.street, 'Jadowniki Rycerskie');
  assert.equal(flat.address.building, '27');
  assert.equal(flat.address.apt, '4');
  assert.equal(flat.address.key, 'jadowniki rycerskie|27|4');

  const comm = extractAddress(COMM_TITLE, 'Żnin');
  assert.equal(comm.address.street, 'Gnieźnieńskiej');
  assert.equal(comm.address.building, '18');
  assert.equal(comm.address.apt, '13');

  // "przy ul. Kl. Janickiego … jako działka nr 1741/3" — no building number.
  assert.equal(extractAddress(BUILT_TITLE, 'Żnin').address, null);
});

test('extractPublishedDate: binds to the colon-bearing metadata field, NOT the related-table "Data publikacji</th>" header', () => {
  assert.equal(extractPublishedDate(LAND_HTML), '2024-03-06');
  assert.equal(extractPublishedDate(FLAT_HTML), '2026-05-14');
});

test('ogloszeniePdfUrl: picks the ogłoszenie PDF (absolute), never the map image', () => {
  assert.equal(
    ogloszeniePdfUrl(FLAT_HTML),
    'https://bip.gminaznin.pl/pliki/umznin/zalaczniki/10690/ogloszenie-jadowniki-ryc-4-27-1.pdf',
  );
});

test('isCancelled: only an actual odwołanie/unieważnienie title, not a normal announcement', () => {
  assert.equal(isCancelled(FLAT_TITLE), false);
  assert.equal(isCancelled('Ogłoszenie o odwołaniu przetargu — Żnin ul. Leśna'), true);
  assert.equal(isCancelled('Unieważnienie przetargu na sprzedaż działki nr 15/19'), true);
});

// ------------------------------------------------------------- parseNotice

test('parseNotice: FLAT Jadowniki Rycerskie 27/4 (the lokal mieszkalny) — full field block + title-derived address', () => {
  const n = parseNotice(FLAT_HTML, 'https://bip.gminaznin.pl/nieruchomosc/pierwszy-…-jadown-1');
  assert.equal(n.kind, 'mieszkalny');
  assert.equal(n.round, 1);
  assert.equal(n.cancelled, false);
  assert.equal(n.address.street, 'Jadowniki Rycerskie');
  assert.equal(n.address.building, '27');
  assert.equal(n.address.apt, '4');
  assert.equal(n.address.key, 'jadowniki rycerskie|27|4');
  assert.equal(n.area_m2, 56);
  assert.equal(n.starting_price_pln, 82000);
  assert.equal(n.wadium_pln, 10000);
  assert.equal(n.obreb, 'Jadowniki Rycerskie');
  assert.equal(n.dzialka_nr, '112');
  assert.equal(n.kw, 'BY1Z/00019004/2');
  assert.equal(n.published_date, '2026-05-14');
  assert.equal(n.pdf_url, 'https://bip.gminaznin.pl/pliki/umznin/zalaczniki/10690/ogloszenie-jadowniki-ryc-4-27-1.pdf');
  // The auction date is NOT in the inline HTML (OCR-only) — parseNotice must not invent it.
  assert.ok(!('auction_date' in n) || n.auction_date == null);
});

test('parseNotice: LAND Brzyskorzystew dz. 295/10 — parcel-keyed grunt, related table does not corrupt fields', () => {
  const n = parseNotice(LAND_HTML, 'https://bip.gminaznin.pl/nieruchomosc/pierwszy-…-295-10-w-brzyskorzy');
  assert.equal(n.kind, 'grunt');
  assert.equal(n.address, null);          // land is parcel-keyed, never address-keyed
  assert.equal(n.dzialka_nr, '295/10');
  assert.equal(n.obreb, 'Brzyskorzystew');
  assert.equal(n.area_m2, 1391);          // stated directly in m² (no ha conversion)
  assert.equal(n.starting_price_pln, 99700);
  assert.equal(n.wadium_pln, 9000);
  assert.equal(n.kw, 'BY1Z/00022073/0');
  assert.equal(n.round, 1);
  assert.equal(n.published_date, '2024-03-06');
});

test('parseNotice: COMMERCIAL ul. Gnieźnieńska 18/13 (lokal niemieszkalny) → uzytkowy, address-keyed', () => {
  const n = parseNotice(COMM_HTML, 'https://bip.gminaznin.pl/nieruchomosc/pierwszy-…-niemieszkalnego-nr-13');
  assert.equal(n.kind, 'uzytkowy');
  assert.equal(n.address.street, 'Gnieźnieńskiej');
  assert.equal(n.address.building, '18');
  assert.equal(n.address.apt, '13');
  assert.equal(n.area_m2, 20.5);
  assert.equal(n.starting_price_pln, 18000);
  assert.equal(n.wadium_pln, 1800);
  assert.equal(n.obreb, 'Żnin');
  assert.equal(n.dzialka_nr, '1154/3');
  assert.equal(n.round, 1);
});

test('parseNotice: BUILT Kl. Janickiego — classified "zabudowana" from the structured LABEL (title lacks "zabudowanej"), no building ⇒ address null', () => {
  const n = parseNotice(BUILT_HTML, 'https://bip.gminaznin.pl/nieruchomosc/pierwszy-…-kl-janickiego');
  assert.equal(n.kind, 'zabudowana');     // NOT 'grunt' — the label carries the kind
  assert.equal(n.address, null);          // no building number in the title
  assert.equal(n.dzialka_nr, '1741/3');
  assert.equal(n.starting_price_pln, 1000000);
});

// ----------------------------------------------------------- parseResultDoc

test('parseResultDoc: LAND Brzyskorzystew 295/10 round I forwarded as CONFIRMED-superseded — real parcel/price, unsold, no fabricated hammer price', () => {
  const [r] = parseResultDoc(LAND_HTML, '2024-04-16', 'https://bip.gminaznin.pl/nieruchomosc/pierwszy-…-295-10-w-brzyskorzy');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '295/10');
  assert.equal(r.obreb, 'Brzyskorzystew');
  assert.equal(r.area_m2, 1391);
  assert.equal(r.starting_price_pln, 99700);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'superseded_by_next_round');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2024-04-16'); // fallbackDate (OCR) — HTML has none
  assert.equal(r.source_url, 'https://bip.gminaznin.pl/nieruchomosc/pierwszy-…-295-10-w-brzyskorzy');
});

test('parseResultDoc: COMMERCIAL Gnieźnieńska 18/13 round I superseded — address-keyed unsold record', () => {
  const [r] = parseResultDoc(COMM_HTML, '2026-01-15', 'https://bip.gminaznin.pl/nieruchomosc/pierwszy-…-niemieszkalnego-nr-13');
  assert.equal(r.kind, 'uzytkowy');
  assert.equal(r.address.key, 'gnieznienskiej|18|13');
  assert.equal(r.starting_price_pln, 18000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-01-15');
});

test('parseResultDoc: empty/null and non-HTML text return [] (defensive backstops)', () => {
  assert.deepEqual(parseResultDoc('', '2026-01-01', 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
  assert.deepEqual(parseResultDoc('plain result text, no markup', null, 'x'), []);
});
