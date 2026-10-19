import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LEDGER_REPAIRS } from '../src/core/ledger-repairs-data.js';
import { repairLandLedger, repairPropertyLedger } from '../src/core/ledger-repairs.js';
import { applyDurablePropertyHeals } from '../src/core/verified-heals.js';
import { parseAmwPdfText } from '../src/cities/warszawa/parse.js';
import { parseLandAnnouncement } from '../src/cities/gniezno/parse.js';
import { parseTbsDetail, parseTbsLandDetail } from '../src/cities/stargard/parse.js';
import { splitMultiFlatNotice, parsePriceField } from '../src/cities/torun/parse.js';
const fixture = (name) => readFileSync(new URL('./fixtures/remediation/' + name, import.meta.url), 'utf8');

test('every reviewed migration retains its original row and exact source evidence', () => {
  for (const r of LEDGER_REPAIRS) {
    assert.ok(r.original && r.from_key && r.reason);
    assert.equal(createHash('sha256').update(readFileSync(new URL('../' + r.source_cache, import.meta.url))).digest('hex'), r.source_sha256);
  }
});

test('cross-ledger repairs are idempotent and retain unrelated history', () => {
  for (const city of new Set(LEDGER_REPAIRS.map(r => r.city))) {
    const rules = LEDGER_REPAIRS.filter(r => r.city === city);
    const source = (store) => rules.filter(r => r.from_store === store).map(r => ({key:r.from_key,listings:[structuredClone(r.original)]}));
    const land = repairLandLedger(source('land'), city);
    assert.deepEqual(repairLandLedger(structuredClone(land), city), land, city);
    const properties = repairPropertyLedger(source('properties'), city);
    assert.deepEqual(repairPropertyLedger(structuredClone(properties), city), properties, city);
    const other = { key:'unrelated|99|1',listings:[{date:'1999-01-01',detail_url:'https://example.test/source'}] };
    assert.deepEqual(repairPropertyLedger([other],city).find(p=>p.key===other.key),other);
  }
});

test('AMW unit area beats the cellar, even with OCR unit punctuation', () => {
  const paj = readFileSync(new URL('../ocr-cache/260363.e182ef4b.txt',import.meta.url),'utf8');
  const bal = readFileSync(new URL('../ocr-cache/258398.b8400a3b.txt',import.meta.url),'utf8');
  assert.equal(parseAmwPdfText(paj).area_m2,43.4);
  assert.equal(parseAmwPdfText(paj).round,2);
  assert.equal(parseAmwPdfText(bal).area_m2,14.75);
  assert.equal(parseAmwPdfText(bal).round,2);
});

test('Gniezno case number cannot become a calendar date; parcel stays land', () => {
  const r = LEDGER_REPAIRS.find(r=>r.city==='gniezno'&&r.from_key.startsWith('marii'));
  const p = parseLandAnnouncement(readFileSync(new URL('../'+r.source_cache,import.meta.url),'utf8'),'ul. Marii Konopnickiej - działka nr 3482/6');
  assert.equal(p.auction_date,'2026-05-14');
  assert.equal(p.dzialka_nr,'3482/6');
  assert.equal(p.area_m2,8731);
});

test('Toruń multi-unit notice keeps each area and starting price', () => {
  const rows = splitMultiFlatNotice({address_raw:'ul. Ducha Św. 19 m. nr 12 i nr 13'},fixture('torun-63434.html'));
  assert.deepEqual(rows.map(r=>[r.address_raw,r.area_m2,r.starting_price_pln]),[
    ['ul. Ducha Św. 19/12',19.37,180000],['ul. Ducha Św. 19/13',18.3,170000],
  ]);
  assert.equal(parsePriceField('90.000,00, wadium 9.000,00 zł'),90000);
});

test('TBS land notice cannot borrow a flat from navigation; lots keep their own prices', () => {
  const html = fixture('stargard-9730.html');
  assert.equal(parseTbsDetail('<title>Nieruchomości gruntowe niezabudowane</title>'+html+'<aside>lokal mieszkalny</aside>','https://tbs.stargard.pl/example'),null);
  const rows = parseTbsLandDetail('<title>Nieruchomości gruntowe niezabudowane — obr. 19</title>'+html,'https://tbs.stargard.pl/example');
  assert.deepEqual(rows.map(r=>[r.dzialka_nr,r.starting_price_pln,r.area_m2]),[['61/26, 442/19',272000,1135],['62/28',250000,964]]);
  assert.equal(rows[0].auction_date,'2026-11-10');
});

test('repaired retained corpus remains stable on a second durable-heal pass',()=>{
  for(const city of ['torun','glubczyce','gorzow-wielkopolski','wroclaw']){
    const doc=JSON.parse(readFileSync(new URL('../../data/'+city+'/properties.json',import.meta.url),'utf8'));
    const first=applyDurablePropertyHeals(structuredClone(doc.properties),city);
    assert.deepEqual(applyDurablePropertyHeals(structuredClone(first),city),first,city);
  }
});
