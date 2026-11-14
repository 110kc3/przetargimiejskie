import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBytes } from './fetch.js';
import { urlCacheKey } from './hash.js';

const CACHE_DIR = fileURLToPath(new URL('../../rtf-text-cache/', import.meta.url));

const CP1250 = {
  0xa3: 'Ł', 0xa5: 'Ą', 0x8c: 'Ś', 0x8f: 'Ź', 0xaf: 'Ż',
  0xb2: '²', 0xb3: 'ł', 0xb9: 'ą', 0xbf: 'ż',
  0xc6: 'Ć', 0xca: 'Ę', 0xd1: 'Ń', 0xd3: 'Ó',
  0xe6: 'ć', 0xea: 'ę', 0xf1: 'ń', 0xf3: 'ó',
  0x9c: 'ś', 0x9f: 'ź', 0xa0: ' ',
};

function stripGroups(s) {
  const re = /\{\\(?:fonttbl|colortbl|stylesheet|info|\*)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index < last) continue;
    out += s.slice(last, m.index);
    let depth = 0;
    let i = m.index;
    for (; i < s.length; i++) {
      const ch = s[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    out += ' ';
    last = i;
    re.lastIndex = i;
  }
  return out + s.slice(last);
}

export function rtfToText(raw) {
  if (!raw) return '';
  let s = stripGroups(
    raw.replace(/[\r\n]+/g, ' '),
  )
    .replace(/\\u(-?\d+)\s?(?:\\'[0-9a-fA-F]{2}|\?)?/g, (_, d) => {
      let n = Number(d);
      if (n < 0) n += 65536;
      return String.fromCharCode(n);
    })
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, h) => {
      const b = parseInt(h, 16);
      return CP1250[b] || (b < 0x80 ? String.fromCharCode(b) : '');
    })
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\line\b/g, ' ')
    .replace(/\\tab\b/g, ' ')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/\\[^a-zA-Z]/g, '')
    .replace(/[{}]/g, '');
  return s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

export async function rtfText(rtfUrl, opts = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, urlCacheKey(rtfUrl) + '.txt');
  if (existsSync(cachePath)) return readFile(cachePath, 'utf8');
  console.error(`  rtf-text: ${rtfUrl}`);
  const bytes = await getBytes(rtfUrl, {
    userAgent: opts.userAgent,
    insecureTLS: opts.insecureTLS,
  });
  const text = rtfToText(Buffer.from(bytes).toString('latin1'));
  await writeFile(cachePath, text, 'utf8');
  return text;
}
