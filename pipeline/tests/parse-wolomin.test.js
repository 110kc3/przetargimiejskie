import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanText,
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/wolomin/parse.js';

test('wolomin: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Nr 35/2026 w sprawie ogłoszenia pierwszego ustnego przetargu nieograniczonego na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Nr 116/2011 w sprawie powołania komisji przetargowej'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
});

test('wolomin: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('11 marca 2026 r.'), '2026-03-11');
  assert.equal(parsePlDate('30.01.2026'), '2026-01-30');
  assert.equal(parsePrice('420 000,00 zł'), 420000);
  assert.equal(parsePrice('40 000 zł'), 40000);
});

test('wolomin: parseAnnouncement extracts 4-flat residential package notice', () => {
  const item = {
    id: '27064-31123',
    title: 'Nr 35/2026 w sprawie ogłoszenia pierwszego ustnego przetargu nieograniczonego na sprzedaż nieruchomości stanowiących własność Gminy Wołomin.',
    url: 'https://wolomin.bip.net.pl/?p=document&action=save&id=31123&bar_id=27064',
  };
  const docText = `
    BURMISTRZ WOŁOMINA ogłasza PIERWSZY PRZETARG USTNY NIEOGRANICZONY
    na sprzedaż czterech lokali mieszkalnych stanowiących własność Gminy Wołomin, położonych w budynku przy ul. Chopina 1 w Wołominie.
    Nieruchomość oznaczona jako działka ewidencyjna nr 86 o powierzchni 0,0349 ha, obręb 28 (143412_4.0028), położona w Wołominie przy ul. Chopina 1, uregulowana w księdze wieczystej nr WA1W/00002233/08.
    Cena wywoławcza lokali nr 1, 2, 3 i 8 wynosi 420 000,00 zł netto.
    Wadium wynosi 40 000 zł.
    Przetarg odbędzie się dnia 11 marca 2026 r. w Urzędzie Miejskim w Wołominie przy ul. Ogrodowej 4 w Wołominie, na sali nr 106 o godz. 11.00.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'wolomin-27064-31123');
  assert.equal(res.auction_date, '2026-03-11');
  assert.equal(res.price, 420000);
  assert.equal(res.deposit, 40000);
  assert.equal(res.parcel, '86');
  assert.equal(res.area, 349);
  assert.equal(res.land_registry, 'WA1W/00002233/08');
  assert.equal(res.type, 'announcement');
  assert.equal(res.property_type, 'mieszkalny');
});

test('wolomin: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '27065-31124',
    title: 'Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości',
    url: 'https://wolomin.bip.net.pl/?p=document&action=save&id=31124',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego
    W dniu 11 marca 2026 r. odbył się przetarg na sprzedaż lokali mieszkalnych w Wołominie przy ul. Chopina 1 na działce ewidencyjnej nr 86.
    Cena wywoławcza: 420 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 450 000,00 zł.
    Ustalona jako nabywca nieruchomości: Anna Nowak
    Osoby dopuszczone do uczestniczenia: 2.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'wolomin-result-27065-31124');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 450000);
  assert.equal(res.buyer, 'Anna Nowak');
  assert.equal(res.parcel, '86');
  assert.equal(res.type, 'result');
});
