// Downloads an RTF and extracts plain text with a small pure-JS decoder (no
// external binary — `unrtf`/`pandoc` aren't dependable on the CI runner, and
// pandoc 2.x can't even read RTF). Caching mirrors pdf-text.js / doc-text.js.
// Used by cities whose auction announcements are RTF attachments — e.g. Rybnik
// (ZGM publishes each "OGŁOSZENIE …" as an RTF). The committed cache
// (pipeline/rtf-text-cache/) also doubles as a retention store.
//
// These are simple Word-generated RTFs (\ansicpg1250). The decoder: drops the
// font/stylesheet/info groups and any \*-prefixed destination, decodes \'xx
// (cp1250) and \uN (Unicode) characters, turns \par/\line into breaks, strips
// the remaining control words and braces. Validated against a real ZGM
// announcement (price/area/date extracted cleanly).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBytes } from './fetch.js';
import { urlCacheKey } from './hash.js';

const CACHE_DIR = fileURLToPath(new URL('../../rtf-text-cache/', import.meta.url));

// cp1250 high-byte → Unicode for the Polish letters (+ superscript ²) that
// appear in these announcements.
const CP1250 = {
  0xa3: 'Ł', 0xa5: 'Ą', 0x8c: 'Ś', 0x8f: 'Ź', 0xaf: 'Ż',
  0xb2: '²', 0xb3: 'ł', 0xb9: 'ą', 0xbf: 'ż',
  0xc6: 'Ć', 0xca: 'Ę', 0xd1: 'Ń', 0xd3: 'Ó',
  0xe6: 'ć', 0xea: 'ę', 0xf1: 'ń', 0xf3: 'ó',
  0x9c: 'ś', 0x9f: 'ź', 0xa0: ' ', // nbsp (thousands separator)
};

// Brace-aware removal of `{\fonttbl …}`-style groups. Word-generated tables
// NEST groups (`{\fonttbl{\f0 …Calibri;}{\f1 …;}}`) — a lazy `[\s\S]*?\}`
// stopped at the first inner `}` and leaked font names into the text.
function stripGroups(s) {
  const re = /\{\\(?:fonttbl|colortbl|stylesheet|info|\*)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index < last) continue; // opener inside a group we already removed
    out += s.slice(last, m.index);
    let depth = 0;
    let i = m.index;
    for (; i < s.length; i++) {
      const ch = s[i];
      if (ch === '\\') { i++; continue; } // skip escaped char (incl. \{ \})
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

/** Decode an RTF string (read as latin1) to plain text. */
export function rtfToText(raw) {
  if (!raw) return '';
  let s = stripGroups(
    // raw CR/LF in an RTF file are insignificant formatting (a value like
    // "180\r\n 000,00" must read as "180 000,00"); real breaks come from \par.
    raw.replace(/[\r\n]+/g, ' '),
  )
    // \uN first, CONSUMING its fallback — either "?" or a \'xx byte. Decoding
    // \'xx before \uN turned a "\uN\'xx" pair into a doubled character.
    .replace(/\\u(-?\d+)\s?(?:\\'[0-9a-fA-F]{2}|\?)?/g, (_, d) => {
      let n = Number(d);
      if (n < 0) n += 65536;
      return String.fromCharCode(n);
    })
    // \'xx → cp1250 char
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, h) => {
      const b = parseInt(h, 16);
      return CP1250[b] || (b < 0x80 ? String.fromCharCode(b) : '');
    })
    // paragraph / line breaks
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\line\b/g, ' ')
    .replace(/\\tab\b/g, ' ')
    // remaining control words / symbols
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/\\[^a-zA-Z]/g, '')
    .replace(/[{}]/g, '');
  return s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

/**
 * Download an RTF and return its extracted text, cached on disk.
 * @param {string} rtfUrl
 * @param {{ userAgent?: string, insecureTLS?: boolean }} [opts]
 * @returns {Promise<string>}
 */
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
