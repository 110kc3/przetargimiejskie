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

test('garage on a bare parcel re-keys via the rejon convention (Mastalerza, działka 233/1)', () => {
  const text = [
    'INFORMACJA O WYNIKACH POSTĘPOWANIA',
    '',
    'w dniu 08.09.2025 r. odbył się I ustny przetarg nieograniczony na sprzedaż części',
    'nieruchomości gruntowej zabudowanej garażem położonej w Gliwicach',
    'przy ul. Mastalerza na działce nr 233/1 o powierzchni wynoszącej 126 m”, obręb Zatorze,',
    'KW GL1G/00032798/0.',
    'Cena wywoławcza nieruchomości wynosiła 102.400,00 zł',
    'Cena nieruchomości osiągnięta w przetargu wyniosła 111.030,00 zł',
  ].join('\n');
  const recs = parseResultPdf(text, '2025-09-08', 'sample://parcel-garage');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'mastalerza|0|garaz-233');
  assert.equal(r.address.street, 'Mastalerza');
  assert.equal(r.kind, 'garaz');
  assert.equal(r.starting_price_pln, 102400);
  assert.equal(r.final_price_pln, 111030);
});

test('unsold rows accept ASCII, en, em, minus, and composite OCR dashes after a mixed-case Al. prefix', () => {
  for (const [index, dash] of ['-', '–', '—', '−', '—-'].entries()) {
    const text = [
      'INFORMACJA O WYNIKACH POSTĘPOWAŃ DOTYCZĄCYCH PRZETARGÓW',
      `Al. Przyjaźni ${index + 1} ${dash} sprzedaż lokalu mieszkalnego`,
      'Cena wywoławcza nieruchomości wynosiła 100.000,00 zł',
      'Komisja przetargowa stwierdziła, że nie odnotowano wpłat wadium.',
    ].join('\n');
    const recs = parseResultPdf(text, '2026-01-01', `sample://dash-${index}`);
    assert.equal(recs.length, 1, `separator ${dash} should produce one record`);
    assert.equal(recs[0].address_raw, `Przyjaźni ${index + 1}`);
    assert.equal(recs[0].address.street, 'Przyjaźni');
  }
});

test('sold address prefixes are case-insensitive, including Al.', () => {
  const text = [
    'INFORMACJA O WYNIKU POSTĘPOWANIA',
    'w dniu 16.02.2026 r. odbył się I ustny przetarg na sprzedaż lokalu',
    'mieszkalnego położonego w Gliwicach przy Al. Przyjaźni 1/2.',
    'Cena wywoławcza nieruchomości: 100.000,00 zł.',
    'Cena osiągnięta w przetargu: 110.000,00 zł.',
  ].join('\n');
  const recs = parseResultPdf(text, '2026-02-16', 'sample://sold-al-prefix');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].address_raw, 'Przyjaźni 1/2');
  assert.equal(recs[0].address.key, 'przyjazni|1|2');
});

test('real Bednarska two-row shape keeps units 7 and 8 with their distinct prices', () => {
  const text = [
    'INFORMACJA O WYNIKACH POSTĘPOWAŃ DOTYCZĄCYCH PRZETARGÓW',
    'ul. Bednarska 2B - sprzedaż lokalu mieszkalnego nr 7 wraz ze sprzedażą ułamkowej',
    'części gruntu (działka nr 882 o powierzchni 581 m2, obręb Stare Miasto).',
    'Cena wywoławcza nieruchomości wynosiła 109.700,00 zł',
    'ul. Bednarska 2B - sprzedaż lokalu mieszkalnego nr 8 wraz ze sprzedażą ułamkowej',
    'części gruntu (działka nr 882 o powierzchni 581 m2, obręb Stare Miasto).',
    'Cena wywoławcza nieruchomości wynosiła 112.600,00 zł',
    'Komisja przetargowa stwierdziła, że odnotowano wpłatę po 1 wadium.',
    'Oferenci nie stawili się na licytacji.',
  ].join('\n');
  const recs = parseResultPdf(text, '2024-03-11', 'sample://bednarska-real-shape');
  assert.deepEqual(recs.map((r) => ({
    raw: r.address_raw,
    key: r.address.key,
    price: r.starting_price_pln,
    reason: r.unsold_reason,
  })), [
    { raw: 'Bednarska 2B/7', key: 'bednarska|2B|7', price: 109700, reason: 'bidder_noshow' },
    { raw: 'Bednarska 2B/8', key: 'bednarska|2B|8', price: 112600, reason: 'bidder_noshow' },
  ]);
});

test('an ambiguous residential unit slash pair is not expanded into two auctions', () => {
  const text = [
    'INFORMACJA O WYNIKACH POSTĘPOWAŃ DOTYCZĄCYCH PRZETARGÓW',
    'ul. Wspólna 2 - sprzedaż lokalu mieszkalnego nr 7/8',
    'Cena wywoławcza nieruchomości wynosiła 100.000,00 zł',
    'Komisja przetargowa stwierdziła, że nie odnotowano wpłat wadium.',
  ].join('\n');
  const recs = parseResultPdf(text, '2026-01-01', 'sample://ambiguous-unit-pair');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].address_raw, 'Wspólna 2');
  assert.equal(recs[0].address.key, 'wspolna|2|');
});

test('a non-unit 7/8 share is not expanded into duplicate results', () => {
  const text = [
    'INFORMACJA O WYNIKACH POSTĘPOWAŃ DOTYCZĄCYCH PRZETARGÓW',
    'ul. Wspólna 2 - sprzedaż lokalu mieszkalnego wraz z udziałem nr 7/8 w gruncie',
    'Cena wywoławcza nieruchomości wynosiła 100.000,00 zł',
    'Komisja przetargowa stwierdziła, że nie odnotowano wpłat wadium.',
  ].join('\n');
  const recs = parseResultPdf(text, '2026-01-01', 'sample://land-share');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].address_raw, 'Wspólna 2');
  assert.equal(recs[0].address.apt, null);
});

test('plural "Oferenci nie stawili się" maps to bidder_noshow', () => {
  const text = [
    'INFORMACJA O WYNIKACH POSTĘPOWAŃ DOTYCZĄCYCH PRZETARGÓW',
    'ul. Bednarska 2B - sprzedaż lokalu mieszkalnego nr 7',
    'Cena wywoławcza nieruchomości wynosiła 109.700,00 zł',
    'Komisja przetargowa stwierdziła, że Oferenci nie stawili się na licytacji.',
  ].join('\n');
  const recs = parseResultPdf(text, '2024-03-11', 'sample://plural-noshow');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].unsold_reason, 'bidder_noshow');
});
