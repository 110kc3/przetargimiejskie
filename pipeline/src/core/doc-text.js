// Downloads a legacy Word `.doc` (binary, NOT .docx) and extracts its text with
// `catdoc`, caching the result so each attachment is fetched + converted exactly
// once. Mirrors pdf-text.js. Used by cities whose auction announcements are .doc
// attachments — e.g. Bytom (the BIP per-property pages link a .doc that carries
// the price / area / auction-date the i-BIIP catalog drops once an auction ends).
// OOXML .docx attachments are detected by magic and unpacked directly (catdoc
// can't read them) — see the PK branch below.
//
// The committed cache (pipeline/doc-text-cache/) doubles as a retention store:
// once an announcement is converted and committed, its parsed text survives even
// if Bytom later removes the .doc upstream.
//
// catdoc is installed on the CI runner (see .github/workflows/refresh.yml). It is
// purpose-built for legacy .doc and far lighter than LibreOffice; pandoc cannot
// read legacy .doc at all. `-a` emits dumb ASCII quotes; `-d utf-8` forces UTF-8
// output so Polish diacritics survive.

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { getBytes } from './fetch.js';
import { urlCacheKey } from './hash.js';

const CACHE_DIR = fileURLToPath(new URL('../../doc-text-cache/', import.meta.url));

/**
 * Download a .doc and return its extracted text (catdoc), cached on disk.
 * @param {string} docUrl
 * @param {{ userAgent?: string, insecureTLS?: boolean }} [opts]  browser-like UA
 *        for hosts that gate the bot UA (bytom.pl serves an empty body to it).
 * @returns {Promise<string>} extracted text
 */
export async function docText(docUrl, opts = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, urlCacheKey(docUrl) + '.txt');
  if (existsSync(cachePath)) return readFile(cachePath, 'utf8');
  console.error(`  doc-text: ${docUrl}`);
  const bytes = await getBytes(docUrl, {
    userAgent: opts.userAgent,
    insecureTLS: opts.insecureTLS,
  });
  const tmpDoc = join(tmpdir(), `doctext-${urlCacheKey(docUrl)}.doc`);
  await writeFile(tmpDoc, bytes);
  let text;
  try {
    if (bytes.subarray(0, 2).toString('latin1') === 'PK') {
      // OOXML .docx (a zip — catdoc reads only legacy OLE .doc). Some boards
      // mix both under the same attachment path (e.g. Swietochlowice's
      // /res/serwisy/pliki/<id>). The body is word/document.xml: end each
      // paragraph with a newline, strip the remaining tags, unescape entities.
      const xml = execFileSync('unzip', ['-p', tmpDoc, 'word/document.xml'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      text = xml
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:tab\b[^>]*\/>/g, '\t')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;|&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
        .replace(/&amp;/g, '&');
    } else {
      text = execFileSync('catdoc', ['-a', '-d', 'utf-8', tmpDoc], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
    }
  } finally {
    await rm(tmpDoc, { force: true });
  }
  await writeFile(cachePath, text, 'utf8');
  return text;
}
