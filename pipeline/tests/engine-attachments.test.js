import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { enrichFromAttachments, canonicalizeEngineRecords } from '../src/core/engine-records.js';
import {
  attachmentUrlsFromHtml, attachmentUrlsFromMadkom, landLotsFromTable, parseNoticeText, startingPriceFromText,
} from '../src/core/engine-attachments.js';
import { buildCityData } from '../src/core/build-properties.js';
import { buildLand } from '../src/core/build-land.js';
import { parseBipInfoDoc } from '../src/core/bipinfo-bip.js';
import { parseMadkomAnnouncement } from '../src/core/madkom-bip.js';

const FIXTURE_CAPTURE_DATE = '2026-11-14';

function fixture(name) {
  return readFileSync(new URL(`./fixtures/engines/${name}`, import.meta.url), 'utf8');
}

const RUDA_ATTACHMENT = 'https://rudaslaska.bip.info.pl/plik.php?id=1066478&wer=1';
const ALEKSANDROW_ATTACHMENT = 'https://bip.aleksandrow-lodzki.pl/e,pobierz,get.html?id=12006';

test('the notice attachment link is found on a BIP.INFO page and boilerplate PDFs are ignored', () => {
  const html = fixture('bipinfo-ruda-slaska-91444-auction-flat.html');
  const urls = attachmentUrlsFromHtml(html, 'https://rudaslaska.bip.info.pl/dokument.php?iddok=91444&idmp=4479&r=r');
  assert.deepEqual(urls, [RUDA_ATTACHMENT]);
});

test('MADKOM attachment links come from the article JSON', () => {
  const detail = JSON.parse(fixture('madkom-aleksandrow-lodzki-15476-auction-land.json'));
  assert.deepEqual(attachmentUrlsFromMadkom(detail, 'https://bip.aleksandrow-lodzki.pl'), [ALEKSANDROW_ATTACHMENT]);
});

test('scanned-notice OCR text yields price, deposit, announced date, usable area and share', () => {
  const fields = parseNoticeText(fixture('bipinfo-ruda-slaska-91444-attachment-ocr.txt'));
  assert.deepEqual(fields, {
    starting_price_pln: 58000, deposit_pln: 2900, auction_date: '2026-12-08', area_m2: 43.7, share: '1/3',
  });
});

test('an ambiguous price is left unknown rather than guessed', () => {
  assert.equal(startingPriceFromText('cena wywoławcza 100.000,00 zł; cena wywoławcza 120.000,00 zł'), null);
  assert.equal(startingPriceFromText('cena wywoławcza 100.000,00 zł; cena wywoławcza 100.000,00 zł'), 100000);
});

test('a multi-lot land table yields one lot per row with parcel, precinct, area and price', () => {
  const lots = landLotsFromTable(fixture('madkom-aleksandrow-lodzki-15476-attachment.txt'));
  assert.equal(lots.length, 7);
  assert.deepEqual(lots[0], {
    dzialka_nr: '43/71', obreb: 'Brużyczka', area_m2: 1200, starting_price_pln: 141000, deposit_pln: 27000,
  });
  assert.equal(lots[3].area_m2, 1335);
});

test('BIP.INFO: an enriched flat notice becomes a priced, dated, addressed property', async () => {
  const raw = parseBipInfoDoc(fixture('bipinfo-ruda-slaska-91444-auction-flat.html'),
    'https://rudaslaska.bip.info.pl/dokument.php?iddok=91444&idmp=4479&r=r', { id: 'ruda-slaska', label: 'Ruda Śląska' });
  const enriched = await enrichFromAttachments([raw], {
    fetchText: async () => fixture('bipinfo-ruda-slaska-91444-attachment-ocr.txt'),
  });
  const { listings } = canonicalizeEngineRecords(enriched, { today: FIXTURE_CAPTURE_DATE });
  const { properties } = buildCityData({ allRecords: [], active: listings, wykaz: [], detailAreas: new Map() });

  assert.equal(properties.length, 1);
  const [property] = properties;
  assert.equal(property.key, 'ryszarda siekiela|23|6');
  assert.equal(property.kind, 'mieszkalny');
  const [listing] = property.listings;
  assert.equal(listing.starting_price_pln, 58000);
  assert.equal(listing.date, '2026-12-08');
  assert.equal(listing.area_m2, 43.7);
  assert.equal(listing.share, '1/3');
  assert.equal(listing.round, 1);
});

test('MADKOM: an enriched land notice becomes one priced, dated plot per parcel', async () => {
  const detail = JSON.parse(fixture('madkom-aleksandrow-lodzki-15476-auction-land.json'));
  const raw = {
    ...parseMadkomAnnouncement({ id: '15476', title: detail.title, link: detail.link }, detail.content,
      { id: 'aleksandrow-lodzki', label: 'Aleksandrów Łódzki', origin: 'https://bip.aleksandrow-lodzki.pl' }),
    attachments: [ALEKSANDROW_ATTACHMENT],
  };
  const enriched = await enrichFromAttachments([raw], {
    fetchText: async () => fixture('madkom-aleksandrow-lodzki-15476-attachment.txt'),
  });
  const { land } = canonicalizeEngineRecords(enriched, { today: FIXTURE_CAPTURE_DATE });
  const { plots } = buildLand(land, 'aleksandrow-lodzki');

  assert.equal(plots.length, 7);
  const plot = plots.find((candidate) => candidate.dzialka_nr === '43/71');
  assert.equal(plot.obreb, 'Brużyczka');
  assert.equal(plot.listings[0].starting_price_pln, 141000);
  assert.equal(plot.listings[0].date, '2027-01-12');
  assert.equal(plot.listings[0].area_m2, 1200);
});

test('a failed attachment download leaves the headline record unchanged', async () => {
  const raw = { id: 'x-1', title: 'Ogłoszenie o przetargu na sprzedaż lokalu', type: 'announcement', attachments: ['https://example.pl/a.pdf'] };
  const [enriched] = await enrichFromAttachments([raw], { fetchText: async () => { throw new Error('down'); } });
  assert.equal(enriched.price ?? null, null);
});

test('attachment downloads are capped per crawl', async () => {
  const records = Array.from({ length: 5 }, (_, index) => ({
    id: `x-${index}`, title: 'Ogłoszenie o przetargu na sprzedaż lokalu', type: 'announcement', attachments: ['https://example.pl/a.pdf'],
  }));
  let calls = 0;
  await enrichFromAttachments(records, { fetchText: async () => { calls += 1; return ''; }, limit: 2 });
  assert.equal(calls, 2);
});
