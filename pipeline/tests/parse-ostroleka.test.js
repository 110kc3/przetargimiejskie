// Ostrołęka parser test. OCR city (scanned PDFs): the RESULT notices OCR into
// clean prose and are the authoritative per-flat records. Each BODY below is the
// REAL OCR text of a live result PDF (verified 2026-07-05), condensed to the
// load-bearing sentences but preserving the exact OCR phrasings/quirks
// (e.g. "m?"/"m*"/"m”", "Wdhniu", "Najwyższa cena …"):
//   28040 Żeromskiego 29/4 — I przetarg, UNSOLD (Nikt nie wpłacił wadium)
//   28374 Żeromskiego 29/4 — II przetarg, UNSOLD
//   28668 Żeromskiego 29/4 — SOLD (Najwyższa cena 122 500, Nabywcą … Opęchowscy)
//   28147 Warszawska 25B/2 — SOLD (Najwyższa cena 64 400, Nabywca Michał Pawełczyk)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseResultDoc,
  parseMetaTable,
  parseAttachments,
  isResultAttachment,
  isAnnouncementAttachment,
  titleToAddressRaw,
  buildActiveListing,
  parsePLN,
} from '../src/cities/ostroleka/parse.js';

const RESULT_28040_UNSOLD = `Ostrołęka, dnia 23 października 2025 r.
GN.6840.1.9.2025
Prezydent Miasta Ostrołęki
na podstawie $ 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. informuje o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiącej własność Miasta Ostrołęki.
1. W dniu 15 października 2025 r. w Urzędzie Miasta Ostrołęki pl. gen. J. Bema 1 został przeprowadzony przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej położonej w Ostrołęce w budynku mieszkalnym przy ul. Stefana Żeromskiego 29, oznaczonej numerem 4 o powierzchni użytkowej 54,60 m? wraz z pomieszczeniem przynależnym o powierzchni użytkowej 28,20 m” , usytuowanej na działce oznaczonej w ewidencji gruntów numerem geodezyjnym 61869/4 o powierzchni 2238 m2 wraz z udziałem wynoszącym 8280/39770 w nieruchomości wspólnej.
4. Cena wywoławcza nieruchomości wyniosła 125 400,00 zł netto = brutto.
5. Nikt nie wpłacił wadium.
6. Nie ustalono nabywcy nieruchomości.`;

const RESULT_28374_UNSOLD_R2 = `Ostrołęka, dnia 11 grudnia 2025 r.
GN.6840.1.9.2025
Prezydent Miasta Ostrołęki informuje o wyniku drugiego przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiącej własność Miasta Ostrołęki.
1. W dniu 3 grudnia 2025 r. w Urzędzie Miasta Ostrołęki pl. gen. J. Bema 1 został przeprowadzony drugi przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej położonej w Ostrołęce w budynku mieszkalnym przy ul. Stefana Żeromskiego 29, oznaczonej numerem 4 o powierzchni użytkowej 54,60 m* wraz z pomieszczeniem przynależnym o powierzchni użytkowej 28,20 m” , usytuowanej na działce oznaczonej w ewidencji gruntów numerem geodezyjnym 61869/4 o powierzchni 2238 m2.
4. Cena wywoławcza nieruchomości wyniosła 125 400,00 zł netto = brutto.
5. Nikt nie wpłacił wadium.
6. Nie ustalono nabywcy nieruchomości.`;

const RESULT_28668_SOLD_R3 = `URZĄD MIASTA OSTROŁĘKI
GN.6840.1.9.2025
Ostrołęka, dnia 19 lutego 2026 roku
Prezydent Miasta Ostrołęki informuje o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiącej własność Miasta Ostrołęki.
1. Wdhniu 11 lutego 2026 r. w Urzędzie Miasta Ostrołęki pl. gen. J. Bema 1 został przeprowadzony przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej oznaczonej Nr 4 o powierzchni użytkowej 54,60 m” wraz z pomieszczeniem przynależnym o powierzchni użytkowej 28,20 m”, zlokalizowanej na działce oznaczonej w ewidencji gruntów numerem geodezyjnym 61869/4 o powierzchni 2238 m2 wraz z udziałem wynoszącym 8280/39770 w nieruchomości wspólnej, położonej przy ul. Stefana Żeromskiego 29 w Ostrołęce, stanowiącej własność miasta Ostrołęki.
3. Cena wywoławcza nieruchomości wyniosła 102 600,00 zł netto = brutto.
4. Najwyższa cena nieruchomości wyniosła 122 500,00 zł netto = brutto.
5. Nabywcą nieruchomości zostali Paulina i Marcin małż. Opęchowscy.`;

const RESULT_28147_SOLD = `Ostrołęka, dnia 6 listopada 2025 roku
GN.6840.1.10.2025
Prezydent Miasta Ostrołęki informuje o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości stanowiącej własność Miasta Ostrołęki.
W dniu 29 października 2025 r. w Urzędzie Miasta Ostrołęki pl. gen. J. Bema 1 został przeprowadzony przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej oznaczonej Nr 2 o pow. użytkowej 35,70 m*, zlokalizowanej na działkach oznaczonych w ewidencji gruntów numerami geodezyjnymi 10672/14, 10672/15, 10683, 10684 o powierzchni łącznej 1180 m2, wraz z udziałem w nieruchomości wspólnej w wysokości 451/1000, położonej w Ostrołęce przy ul. Warszawskiej 25B w Ostrołęce (róg ulicy Grabowej i Wiązowej).
Cena wywoławcza nieruchomości wyniosła 63 800,00 zł netto = brutto.
Najwyższa cena nieruchomości wyniosła 64 400,00 zł netto = brutto.
Nabywcą nieruchomości został Michał Pawełczyk.`;

test('parseResultDoc: Żeromskiego 29/4 — I przetarg UNSOLD (address+unit, area, starting price)', () => {
  const [r] = parseResultDoc(RESULT_28040_UNSOLD, '2025-10-15', 'https://bip.um.ostroleka.pl/attachments/download/28040');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'stefana zeromskiego|29|4'); // address incl. unit
  assert.equal(r.area_m2, 54.6);                             // usable, NOT the 28,20 cellar
  assert.equal(r.starting_price_pln, 125400);
  assert.equal(r.auction_date, '2025-10-15');
  assert.equal(r.round, null);                               // first round, no ordinal stated
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.unsold_reason, 'brak wadium');
});

test('parseResultDoc: Żeromskiego 29/4 — II przetarg UNSOLD (round=2)', () => {
  const [r] = parseResultDoc(RESULT_28374_UNSOLD_R2, '2025-12-03', 'x');
  assert.equal(r.address.key, 'stefana zeromskiego|29|4');
  assert.equal(r.area_m2, 54.6);
  assert.equal(r.starting_price_pln, 125400);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2025-12-03');
  assert.equal(r.outcome, 'unsold');
});

test('parseResultDoc: Żeromskiego 29/4 — SOLD (final_price from a sold result)', () => {
  const [r] = parseResultDoc(RESULT_28668_SOLD_R3, '2026-02-11', 'x');
  assert.equal(r.address.key, 'stefana zeromskiego|29|4');
  assert.equal(r.area_m2, 54.6);
  assert.equal(r.starting_price_pln, 102600);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 122500);   // "Najwyższa cena … 122 500,00"
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-02-11');
});

test('parseResultDoc: Warszawska 25B/2 — SOLD (second address, achieved price)', () => {
  const [r] = parseResultDoc(RESULT_28147_SOLD, '2025-10-29', 'x');
  assert.equal(r.address.key, 'warszawskiej|25B|2');
  assert.equal(r.area_m2, 35.7);
  assert.equal(r.starting_price_pln, 63800);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 64400);
  assert.equal(r.auction_date, '2025-10-29');
});

test('parseResultDoc: ignores non-result OCR text', () => {
  assert.deepEqual(parseResultDoc('PREZYDENT MIASTA OSTROŁĘKI OGŁASZA PRZETARG USTNY NIEOGRANICZONY', null, 'x'), []);
});

// ---- HTML metadata + attachment routing (the active-listing path) -----------

const DETAIL_HTML = `
  <table class="table table-borderless">
    <tbody>
      <tr><th scope="row">Adres nieruchomości</th><td class="normal"><a
        href="https://bip.um.ostroleka.pl/przetarg-nieruchomosci/2200/x">Ostrołęka ul. Żeromskiego 29/4</a></td></tr>
      <tr><th scope="row">Przetarg na</th><td class="normal">Sprzedaż nieruchomości lokalowej</td></tr>
      <tr><th scope="row">Typ przetargu</th><td>Przetarg ustny nieograniczony</td></tr>
      <tr><th scope="row">Rodzaj nieruchomości</th><td>lokal mieszkalny</td></tr>
      <tr><th scope="row">Cena wywoławcza</th><td>69.300,00 zł</td></tr>
      <tr><th scope="row">Data przetargu</th><td><time datetime="2026-08-28T10:00:00"><strong>28.08.2026</strong> godz. 10:00</time></td></tr>
    </tbody>
  </table>
  <a href="https://bip.um.ostroleka.pl/attachments/download/2504">Ogłoszenie</a>`;

test('parseMetaTable + parseAttachments: reads the HTML metadata table', () => {
  const meta = parseMetaTable(DETAIL_HTML);
  assert.equal(meta.title, 'Ostrołęka ul. Żeromskiego 29/4');
  assert.equal(meta.rodzaj, 'lokal mieszkalny');
  assert.equal(meta.cena, '69.300,00 zł');
  assert.equal(meta.auction_date, '2026-08-28');
  const atts = parseAttachments(DETAIL_HTML);
  assert.equal(atts.length, 1);
  assert.equal(atts[0].url, 'https://bip.um.ostroleka.pl/attachments/download/2504');
  assert.ok(isAnnouncementAttachment('Ogłoszenie o drugim przetargu'));
  assert.ok(isResultAttachment('Informacja o wyniku przetargu'));
  assert.ok(isResultAttachment('Wyniki przetargu Żeromskiego 29'));
  assert.ok(!isResultAttachment('Ogłoszenie'));
});

test('titleToAddressRaw: strips city + normalizes "ulica"', () => {
  assert.equal(titleToAddressRaw('Ostrołęka ul. Żeromskiego 29/4'), 'ul. Żeromskiego 29/4');
  assert.equal(titleToAddressRaw('Ostrołęka, ul. Żeromskiego 29/4'), 'ul. Żeromskiego 29/4');
  assert.equal(titleToAddressRaw('Ostrołęka ulica Warszawska 25B'), 'ul. Warszawska 25B');
});

test('buildActiveListing: HTML-derived active row (address+unit, price, kind, round from label)', () => {
  const meta = parseMetaTable(DETAIL_HTML);
  const rec = buildActiveListing(meta, { label: 'Ogłoszenie o drugim przetargu', ocrText: '', detailUrl: 'u' });
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'zeromskiego|29|4');
  assert.equal(rec.starting_price_pln, 69300);
  assert.equal(rec.auction_date, '2026-08-28');
  assert.equal(rec.round, 2);
});

test('parsePLN: spaced + dotted thousands', () => {
  assert.equal(parsePLN('125 400,00 zł netto= brutto'), 125400);
  assert.equal(parsePLN('69.300,00 zł'), 69300);
  assert.equal(parsePLN('87.923,00'), 87923);
});
