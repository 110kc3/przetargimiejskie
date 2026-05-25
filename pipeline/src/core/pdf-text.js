// Downloads a text-based PDF and extracts its text with `pdftotext -layout`,
// caching the result so each PDF is fetched + extracted exactly once. Used for
// cities whose result documents are text PDFs (no OCR needed) — e.g. Katowice.

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { getBytes } from './fetch.js';
import { urlCacheKey } from './hash.js';

const CACHE_DIR = fileURLToPath(new URL('../../pdf-text-cache/', import.meta.url));

/**
 * @param {string} pdfUrl
 * @returns {Promise<string>} extracted text (pdftotext -layout)
 */
export async function pdfText(pdfUrl) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, urlCacheKey(pdfUrl) + '.txt');
  if (existsSync(cachePath)) return readFile(cachePath, 'utf8');
  console.error(`  pdf-text: ${pdfUrl}`);
  const bytes = await getBytes(pdfUrl);
  const tmpPdf = join(tmpdir(), `pdftext-${urlCacheKey(pdfUrl)}.pdf`);
  await writeFile(tmpPdf, bytes);
  let text;
  try {
    text = execFileSync('pdftotext', ['-layout', tmpPdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } finally {
    await rm(tmpPdf, { force: true });
  }
  await writeFile(cachePath, text, 'utf8');
  return text;
}
