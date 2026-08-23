import test from 'node:test';
import assert from 'node:assert/strict';

import { parsePkpDetail, parsePkpListPage, pkpAddressFromTitle, pkpMaxPage } from '../src/providers/pkp/parse.js';

const LIST = `
<div class="result"><p><b>Nazwa:</b><a href="/pl/nieruchomosci-menu/?option=com_aukcje2&pkp=&show=31531"><font>lokal nr 5 ul. Prądzyńskiego 23D</font></a></p>
<p><b>Data ogłoszenia przetargu:</b>2026-08-10</p><p><b>Termin składania ofert:</b>2026-09-18</p>
<p><b>Termin wpłaty wadium:</b>2026-09-15</p><p><b>Województwo:</b> mazowieckie</p>
<p><b>Miejscowość:</b> Warszawa</p><p><b>Status:</b><b><font>Ogłoszony</font></b></p>
<p><b>Kategoria:</b> Sprzedaż</p><p><b>Przeznaczenie:</b> lokal mieszkalny</p>
<p><b>Cena wywoławcza:</b>235000 zł</p></div>
<a href="?strona=0"></a><a href="?strona=2"></a>`;

const DETAIL = `
<table><tr><td><font>Pow. budynku / działki [m2]</font></td><td><font>43.40 / 804.00</font></td></tr>
<tr><td>Cena</td><td>173000 PLN</td></tr></table>
<td>Link do oferty:</td><td><a href='/pl/nieruchomosci-menu/?option=com_nieruchomosci&show=31269'>Oferta</a></td>`;

test('PKP list parser produces a residential provider row', () => {
  const [row] = parsePkpListPage(LIST);
  assert.equal(row.external_id, '31531');
  assert.equal(row.outcome, 'active');
  assert.equal(row.auction_date, '2026-09-18');
  assert.equal(row.starting_price_pln, 235000);
  assert.equal(row.street, 'Prądzyńskiego');
  assert.equal(row.building, '23D');
  assert.equal(row.apt, '5');
  assert.equal(row.voivodeship, 'mazowieckie');
  assert.equal(pkpMaxPage(LIST), 2);
});

test('PKP detail parser enriches unit/land areas and offer URL', () => {
  assert.deepEqual(parsePkpDetail(DETAIL), {
    area_m2: 43.4,
    land_area_m2: 804,
    offer_url: 'https://www.pkp.pl/pl/nieruchomosci-menu/?option=com_nieruchomosci&show=31269',
  });
  assert.equal(pkpAddressFromTitle('Tychnowy - lokal mieszkalny nr 3 przy ul. Kwidzyńskiej 18', 'Tychnowy'), 'ul. Kwidzyńskiej 18/3');
  assert.equal(pkpAddressFromTitle('Lokal mieszkalny numer 1 przy ulicy Garszwo 6 w Pionkach', 'Pionki'), 'ul. Garszwo 6/1');
  assert.equal(pkpAddressFromTitle('Przetarg na sprzedaż lokalu mieszkalnego nr 4, przy ul. Wyzwolenia 7 w Oświęcimiu', 'Oświęcim'), 'ul. Wyzwolenia 7/4');
  assert.equal(pkpAddressFromTitle('Sprzedaż lokalu mieszkalnego w miejscowości Skibno 57/3, gmina Sianów', 'Skibno'), 'Skibno 57/3');
  assert.equal(pkpAddressFromTitle('Lokal mieszkalny - Kielce, ul. Przejazd 20, m. 3', 'Kielce'), 'ul. Przejazd 20/3');
  assert.equal(pkpAddressFromTitle('Ścinawka Średnia ul. Kolejowa 5 lok. mieszkalny nr 3', 'Ścinawka Średnia'), 'ul. Kolejowa 5/3');
});
