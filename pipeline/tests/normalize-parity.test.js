import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { parseAddress as pipelineParse } from '../src/core/normalize.js';

const extPath = fileURLToPath(new URL('../../extension/normalize.js', import.meta.url));
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(extPath, 'utf8'), sandbox, { filename: extPath });
const extApi = sandbox.window.ZGM_NORMALIZE;

const FIXTURES = [
  'Miernicza 9/12-14',
  'Tadeusza Kościuszki 142/3A, 3B',
  'Zdrowa 7, 9, 11, 13/5',
  'Kozielska 13 g. 1',
  'Księcia Ziemowita 6 garaż 2',
  'Księcia Ziemowita 6 g nr 2',
  'ul. Zygmunta Starego 29/4',
  'Słowackiego 12/3',
  'Pszczyńskiej 7A/14',
  'al. Wojska Polskiego 5/2',
  'pl. Inwalidów 3',
  'Skowrońskiego 18/1I',
  'Chorzowska 40/TII',
  'Barlickiego 12/I',
  'Na Piasku 3/II',
  'Zwycięstwa 34/9a',
  'Zwycięstwa 34 m. 9',
  'Krakowska 7 m 12',
  'Kozielska 13 garaż nr 3',
  'Reymonta garaż nr 5',
  'Kozielska 10-12/4',
  'Sportowej 6/2',
  'Kurpiowska 16',
  '',
  '   ',
];

test('extension exposes window.ZGM_NORMALIZE.parseAddress', () => {
  assert.ok(extApi && typeof extApi.parseAddress === 'function',
    'extension/normalize.js must expose window.ZGM_NORMALIZE.parseAddress');
});

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
