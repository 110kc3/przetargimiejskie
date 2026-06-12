import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseResultPdf } from '../src/cities/gliwice/parse-result.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(__dirname, '..', '..', 'spike', 'ocr_samples');

function load(name) {
  const p1 = readFileSync(join(SAMPLES, `${name}_p-1.txt`), 'utf8');
  const p2 = readFileSync(join(SAMPLES, `${name}_p-2.txt`), 'utf8');
  return p1 + '\n\n===PAGE BREAK===\n\n' + p2;
}

function byAddr(records, raw) {
  return records.find((r) => r.address_raw === raw);
}

test('old sample (2024-02-12): 2 sold + 1 unsold with OCR slash quirk', () => {
  const recs = parseResultPdf(load('old'), '2024-02-12', 'sample://old');
  assert.equal(recs.length, 3);
  const wolow = byAddr(recs, 'Dolnych Wałów 27/11');
  assert.ok(wolow, 'Dolnych Wałów 27/11 missing');
  assert.equal(wolow.outcome, 'sold');
  assert.equal(wolow.round, 3);
  assert.equal(wolow.starting_price_pln, 206400);
  assert.equal(wolow.final_price_pln, 208470);
  const skow = byAddr(recs, 'Skowrońskiego 18/1I');
  assert.ok(skow, 'Skowrońskiego unsold record missing');
  assert.equal(skow.outcome, 'unsold');
  assert.equal(skow.unsold_reason, 'no_deposits');
  assert.equal(skow.address.apt, '1', 'OCR 1I should normalize to 1');
});

test('mid sample (2025-06-16): garage parsed with no apt', () => {
  const recs = parseResultPdf(load('mid'), '2025-06-16', 'sample://mid');
  const garage = byAddr(recs, 'Kurpiowska 16');
  assert.ok(garage, 'Kurpiowska 16 garage missing');
  assert.equal(garage.kind, 'garaz');
  assert.equal(garage.address.apt, null, 'garage should have no apt');
  assert.equal(garage.outcome, 'unsold');
  assert.equal(garage.starting_price_pln, 42800);
});

test('mid sample: shared "no_deposits" reason applies to all preceding items', () => {
  const recs = parseResultPdf(load('mid'), '2025-06-16', 'sample://mid');
  const unsold = recs.filter((r) => r.outcome === 'unsold');
  assert.equal(unsold.length, 3, 'expected 3 unsold');
  for (const r of unsold) {
    assert.equal(r.unsold_reason, 'no_deposits', `${r.address_raw} should be no_deposits`);
  }
});

test('new sample (2026-04-27): all three unsold reasons present', () => {
  const recs = parseResultPdf(load('new'), '2026-04-27', 'sample://new');
  const krol55 = byAddr(recs, 'Królewskiej Tamy 55/2');
  const krol53 = byAddr(recs, 'Królewskiej Tamy 53/2');
  const zw45 = byAddr(recs, 'Zwycięstwa 45/7');
  assert.equal(krol55.unsold_reason, 'bidder_withdrew');
  assert.equal(krol53.unsold_reason, 'bidder_noshow');
  assert.equal(zw45.unsold_reason, 'no_deposits');
});

test('new sample: OCR colon-as-dot in price is recovered (105:400,00 → 105400)', () => {
  const recs = parseResultPdf(load('new'), '2026-04-27', 'sample://new');
  const krol53 = byAddr(recs, 'Królewskiej Tamy 53/2');
  assert.equal(krol53.starting_price_pln, 105400);
});

test('round numerals are extracted correctly across all samples', () => {
  const old = parseResultPdf(load('old'), '2024-02-12', 'sample://old');
  const mid = parseResultPdf(load('mid'), '2025-06-16', 'sample://mid');
  const nw = parseResultPdf(load('new'), '2026-04-27', 'sample://new');
  const rounds = [...old, ...mid, ...nw]
    .filter((r) => r.outcome === 'sold')
    .map((r) => `${r.address_raw}=${r.round}`);
  assert.deepEqual(rounds, [
    'Dolnych Wałów 27/11=3',
    'Daszyńskiego 27/8=2',
    'Pszczyńskiej 7A/14=4',
    'Matejki 6/4=1',
    'Białej Bramy 5/15=2',
    'Harcerskiej 13/3=3',
    'Malinowskiego 10/8=3',
    'Zabrskiej 30/2=2',
  ]);
});

test('every record has either a starting price or a parse note explaining why', () => {
  for (const name of ['old', 'mid', 'new']) {
    const recs = parseResultPdf(load(name), '2024-01-01', 'sample://' + name);
    for (const r of recs) {
      const hasPrice = r.starting_price_pln !== null;
      const hasNote = r.notes.some((n) => /missing starting price/.test(n));
      assert.ok(hasPrice || hasNote, `${name}: ${r.address_raw} has neither price nor note`);
    }
  }
});

test('OCR ";j" street noise is stripped from the captured address (Jagiellońskiej;j 1/24)', () => {
  const text = [
    'INFORMACJA O WYNIKACH POSTĘPOWANIA',
    '',
    'w dniu 16.02.2026 r. odbył się I ustny przetarg nieograniczony na sprzedaż lokalu',
    'mieszkalnego położonego w Gliwicach przy ul. Jagiellońskiej;j 1/24 wraz',
    'ze sprzedażą udziału w działce. Cena wywoławcza nieruchomości: 203.900,00 zł.',
    'Cena osiągnięta w przetargu: 212.060,00 zł.',
  ].join('\n');
  const recs = parseResultPdf(text, '2026-02-16', 'sample://noise');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].address_raw, 'Jagiellońskiej 1/24');
  assert.equal(recs[0].address.key, 'jagiellonskiej|1|24');
  assert.equal(recs[0].address.apt, '24');
});
