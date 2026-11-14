
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { getBytes } from './fetch.js';
import { urlCacheKey } from './hash.js';

const CACHE_DIR = fileURLToPath(new URL('../../doc-text-cache/', import.meta.url));

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
