// Downloads a PDF, rasterizes pages to PNG at 300 DPI, runs Polish-language
// tesseract, and caches the combined text on disk so we OCR each PDF exactly
// once across the entire history.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { getBytes } from './fetch.js';
import { urlCacheKey } from './hash.js';

const CACHE_DIR = fileURLToPath(new URL('../../ocr-cache/', import.meta.url));

/** Custom TESSDATA_PREFIX support for environments without system tessdata. */
const TESS_ENV = process.env.TESSDATA_PREFIX
  ? { ...process.env, TESSDATA_PREFIX: process.env.TESSDATA_PREFIX }
  : process.env;

/**
 * Returns the OCR text for a result PDF, hitting cache when possible.
 * Cache file lives at pipeline/ocr-cache/<filename>.<hash>.txt and is committed.
 * @param {string} pdfUrl
 * @returns {Promise<string>}
 */
export async function ocrPdf(pdfUrl) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, urlCacheKey(pdfUrl) + '.txt');
  if (existsSync(cachePath)) {
    return await readFile(cachePath, 'utf8');
  }
  console.error(`  OCR: ${pdfUrl}`);
  const text = await ocrPdfFresh(pdfUrl);
  await writeFile(cachePath, text, 'utf8');
  return text;
}

/** Fetch, rasterize, OCR; no cache. @param {string} pdfUrl */
async function ocrPdfFresh(pdfUrl) {
  const bytes = await getBytes(pdfUrl);
  const work = await mkdtemp(join(tmpdir(), 'zgm-ocr-'));
  try {
    const pdfPath = join(work, 'in.pdf');
    await writeFile(pdfPath, bytes);
    // pdftoppm renders pages as <prefix>-1.png, <prefix>-2.png, ...
    const prefix = join(work, 'page');
    execFileSync('pdftoppm', ['-r', '300', pdfPath, prefix, '-png'], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const { readdirSync } = await import('node:fs');
    const pngs = readdirSync(work)
      .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
      .sort();
    const pages = [];
    for (const png of pngs) {
      const out = join(work, png.replace(/\.png$/, ''));
      execFileSync(
        'tesseract',
        [join(work, png), out, '-l', 'pol', '--psm', '3'],
        { stdio: ['ignore', 'ignore', 'pipe'], env: TESS_ENV },
      );
      pages.push(await readFile(out + '.txt', 'utf8'));
    }
    return pages.join('\n\n===PAGE BREAK===\n\n');
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: node src/ocr-pdf.js <pdf-url>');
    process.exit(2);
  }
  const text = await ocrPdf(url);
  process.stdout.write(text);
}
