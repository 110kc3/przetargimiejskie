// Parity guard between the TWO hand-maintained address normalizers:
//   pipeline/src/core/normalize.js  (ESM, runs under Node)
//   extension/normalize.js          (IIFE → window.ZGM_NORMALIZE, runs in a
//                                     content script)
//
// They are deliberately NOT one file (different module systems, no build step
// in the extension) and each carries a function the other doesn't
// (nominativeStreetDisplay is pipeline-only; addressFromSlug is extension-only).
// But the join-key-producing core — parseAddress — MUST stay byte-identical:
// every drift between them has silently hidden auction history in production
// (v1.14.0 join-key bugs, v1.14.2 E1–E4). This test makes that drift a CI
// failure instead of a field report. Fixtures are the real shapes from the
// bug history; add the offending address here whenever a new join bug is found.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { parseAddress as pipelineParse } from '../src/core/normalize.js';

// Load the extension IIFE in a sandbox and pull out its parseAddress.
const extPath = fileURLToPath(new URL('../../extension/normalize.js', import.meta.url));
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(extPath, 'utf8'), sandbox, { filename: extPath });
const extApi = sandbox.window.ZGM_NORMALIZE;

const FIXTURES = [
  // canonical street/bldg/apt
  'ul. Zygmunta Starego 29/4',
  'Słowackiego 12/3',
  'Pszczyńskiej 7A/14',
  'al. Wojska Polskiego 5/2',
  'pl. Inwalidów 3',
  // OCR quirks the parser corrects + warns on
  'Skowrońskiego 18/1I',   // slash eaten by OCR → apt 1
  'Chorzowska 40/TII',     // T misread for I → apt III
  // Roman-numeral commercial apartments (preserved)
  'Barlickiego 12/I',
  'Na Piasku 3/II',
  // lowercase apt letter + building letter
  'Zwycięstwa 34/9a',
  // "m. N" mieszkanie form → "/N"
  'Zwycięstwa 34 m. 9',
  'Krakowska 7 m 12',
  // garages: with building, and bare "rejon" garage (synthesised building 0)
  'Kozielska 13 garaż nr 3',
  'Reymonta garaż nr 5',
  // building range
  'Kozielska 10-12/4',
  // genitive display name — key MUST match even though display differs
  'Sportowej 6/2',
  // no apt (whole-building / garage)
  'Kurpiowska 16',
  // edge / empty
  '',
  '   ',
];

test('extension exposes window.ZGM_NORMALIZE.parseAddress', () => {
  assert.ok(extApi && typeof extApi.parseAddress === 'function',
    'extension/normalize.js must expose window.ZGM_NORMALIZE.parseAddress');
});

// Compare both normalizers on one input. JSON round-trip strips the node:vm
// realm's distinct Object.prototype so assert/strict compares values, not which
// realm created the object.
function assertParity(raw) {
  const a = JSON.parse(JSON.stringify(pipelineParse(raw) ?? null));
  const b = JSON.parse(JSON.stringify(extApi.parseAddress(raw) ?? null));
  assert.deepEqual(b, a,
    `normalizers diverged on ${JSON.stringify(raw)} — fix extension/normalize.js ` +
    `or pipeline/src/core/normalize.js so their parseAddress output matches.`);
}

for (const raw of FIXTURES) {
  test(`parseAddress parity: ${JSON.stringify(raw)}`, () => assertParity(raw));
}

// Live sweep: the curated FIXTURES are the *known* bug shapes, but a real drift
// could hide in any of the hundreds of actual street names in the published
// data. Rebuild a natural address string from every property in every city's
// properties.json and assert both normalizers still agree — so a regression is
// caught even on an address nobody thought to add as a fixture.
function liveAddressStrings() {
  const dataRoot = fileURLToPath(new URL('../../data', import.meta.url));
  const out = [];
  if (!existsSync(dataRoot)) return out;
  for (const entry of readdirSync(dataRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const propsPath = `${dataRoot}/${entry.name}/properties.json`;
    if (!existsSync(propsPath)) continue;
    const parsed = JSON.parse(readFileSync(propsPath, 'utf8'));
    const props = Array.isArray(parsed) ? parsed : parsed.properties || [];
    for (const p of props) {
      if (!p.street || !p.building) continue;
      out.push(`${p.street} ${p.building}${p.apt ? `/${p.apt}` : ''}`);
    }
  }
  return out;
}

test('parseAddress parity across every live property address', () => {
  const strings = liveAddressStrings();
  assert.ok(strings.length > 0, 'no live property addresses found under data/*/properties.json');
  for (const raw of strings) assertParity(raw);
});
