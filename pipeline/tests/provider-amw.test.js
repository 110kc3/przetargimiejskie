import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAmwActivePage, parseAmwResultsPage, parseAmwResultText } from '../src/providers/amw/parse.js';

const ACTIVE = `
<div class="element"><div><h2><a href="/pl/nieruchomosci/przetargi-nieruchomosci/miroslawiec-gorny-ul-lotnictwa-polskiego-29-19-10421">Mirosławiec Górny</a>,<br/>
ul. Lotnictwa Polskiego 29/19,<br/>dz. 50/40</h2>
<p><span>Powierzchnia</span>77,77 m<sup>2</sup></p><p><span>Cena wywoławcza</span>132 000 PLN</p>
<p><strong>Sprzedaż</strong></p><p><span>Data przetargu</span>25.08.2026 10:00</p>
<p>Woj.: zachodniopomorskie</p><p class="col-category__item"><span></span>mieszkaniowe</p></div></div>
<button data-url="/pl/nieruchomosci/przetargi-nieruchomosci/wyniki-wyszukiwania/page,1,limit,10" class="btn btn-show-more-items">Więcej</button>`;

const RESULT = `
<div class="element"><div><h2>Radom,<br/>Sadków 3,<br/>lok. 9</h2>
<p><span>Forma zbycia:</span>Sprzedaż<br><br><span>Powierzchnia</span>20,95 m<sup>2</sup></p>
<p><span>Cena wywoławcza</span>130 000 PLN</p><p><span>Data przetargu</span>11.08.2026 10:00</p>
<p>Woj.: mazowieckie</p><p class="col-category__item"><span></span>mieszkaniowe</p>
<a href="/uploads/publications/result.pdf">Pobierz wynik przetargu</a>
<p class="estate-publication-result-type estate-publication-result-type--positive">Pozytywny</p></div></div>`;

test('AMW parsers keep only residential sales and normalize identity', () => {
  const [active] = parseAmwActivePage(ACTIVE);
  assert.equal(active.external_id, '10421');
  assert.equal(active.city, 'Mirosławiec Górny');
  assert.equal(active.street, 'Lotnictwa Polskiego');
  assert.equal(active.building, '29');
  assert.equal(active.apt, '19');
  assert.equal(active.area_m2, 77.77);
  assert.equal(active.starting_price_pln, 132000);

  const [result] = parseAmwResultsPage(RESULT);
  assert.equal(result.outcome, 'sold');
  assert.equal(result.address_raw, 'Sadków 3/9');
  assert.equal(result.area_m2, 20.95);
  assert.equal(result.detail_url, 'https://amw.com.pl/uploads/publications/result.pdf');
});

test('AMW OCR parser extracts achieved price, bidders, round and mode', () => {
  const parsed = parseAmwResultText(`11.08.2026 r. przeprowadzono pierwszy przetarg ustny.\nLiczba osób dopuszczonych do przetargu — 5.\nNajwyższa cena osiągnięta w przetargu — 154 700,00 zł netto.`);
  assert.deepEqual(parsed, {
    final_price_pln: 154700,
    bidders: 5,
    round: 1,
    auction_mode: 'oral_auction',
  });
});
