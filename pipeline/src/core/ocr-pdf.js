// Downloads a PDF, rasterizes pages to PNG at 300 DPI, runs Polish-language
// tesseract, and caches the combined text on disk so we OCR each PDF exactly
// once across the entire history.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
 * @param {{ userAgent?: string, insecureTLS?: boolean, psm?: number }} [opts]
 *        userAgent/insecureTLS: browser-like UA / relaxed TLS for hosts that
 *        gate the bot UA (e.g. bip.swietochlowice.pl) — forwarded to getBytes.
 *        psm: tesseract page-segmentation mode. Default 3 (fully automatic, no
 *        orientation detection). Cities whose scans arrive ROTATED (e.g. Gorzów
 *        EZD prints, OSD reports 270°) must pass 1 (auto + OSD) or the OCR
 *        returns garbage; psm 1 needs osd.traineddata (present in CI's
 *        tesseract-ocr package). Not flipped globally: psm 3 output for the
 *        upright-scan cities is already committed in ocr-cache and revalidating
 *        all of them for a no-op is not worth it.
 * @returns {Promise<string>}
 */
export async function ocrPdf(pdfUrl, opts = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, urlCacheKey(pdfUrl) + '.txt');
  if (existsSync(cachePath)) {
    return await readFile(cachePath, 'utf8');
  }
  console.error(`  OCR: ${pdfUrl}`);
  const text = await ocrPdfFresh(pdfUrl, opts);
  await writeFile(cachePath, text, 'utf8');
  return text;
}

/** Word geometry for source tables whose column association plain OCR loses. */
export async function ocrPdfWords(pdfUrl, opts = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const psm = opts.psm || 3;
  const hash = urlCacheKey(`${pdfUrl}#words-v1-psm${psm}-${JSON.stringify(opts.columns || [])}`).slice(-8);
  const cachePath = join(CACHE_DIR, `table-words.${hash}.txt`);
  if (existsSync(cachePath)) return JSON.parse(await readFile(cachePath, 'utf8'));
  const pages = await ocrPdfFresh(pdfUrl, { ...opts, psm, words: true });
  await writeFile(cachePath, JSON.stringify(pages) + '\n', 'utf8');
  return pages;
}

export function parseTesseractTsv(tsv) {
  const rows = tsv.trim().split(/\r?\n/).slice(1).map((line) => line.split('\t'));
  const page = rows.find((row) => row[0] === '1');
  if (!page) throw new Error('OCR word geometry is missing the page bounds');
  return {
    width: Number(page[8]), height: Number(page[9]),
    words: rows.filter((row) => row[0] === '5' && row[11]?.trim()).map((row) => ({
      left: Number(row[6]), top: Number(row[7]), width: Number(row[8]),
      height: Number(row[9]), text: row.slice(11).join('\t').trim(),
    })),
  };
}

/** Fetch, rasterize, OCR; no cache. @param {string} pdfUrl */
async function ocrPdfFresh(pdfUrl, opts = {}) {
  const bytes = await getBytes(pdfUrl, {
    userAgent: opts.userAgent,
    insecureTLS: opts.insecureTLS,
  });
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
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    const pages = [];
    for (const png of pngs) {
      const out = join(work, png.replace(/\.png$/, ''));
      execFileSync(
        'tesseract',
        [join(work, png), out, '-l', 'pol', '--psm', String(opts.psm || 3),
          ...(opts.words ? ['tsv'] : [])],
        { stdio: ['ignore', 'ignore', 'pipe'], env: TESS_ENV },
      );
      const extracted = await readFile(out + (opts.words ? '.tsv' : '.txt'), 'utf8');
      if (!opts.words) {
        pages.push(extracted);
        continue;
      }
      const geometry = parseTesseractTsv(extracted);
      if (opts.columns) {
        geometry.columns = [];
        const pageNumber = /page-(\d+)\.png$/.exec(png)[1];
        for (const [columnIndex, [left, right]] of opts.columns.entries()) {
          if (!(left >= 0 && right > left && right <= 1)) throw new Error('invalid OCR column bounds');
          const x = Math.ceil(geometry.width * left);
          const width = Math.floor(geometry.width * (right - left));
          const columnOut = join(work, `column-${pageNumber}-${columnIndex}`);
          // Render a source column directly from the PDF. Removing adjacent
          // cells and grid borders improves OCR without changing source bytes.
          execFileSync('pdftoppm', ['-r', '300', '-f', pageNumber, '-l', pageNumber,
            '-singlefile', '-x', String(x), '-W', String(width), pdfPath, columnOut, '-png'],
          { stdio: ['ignore', 'ignore', 'pipe'] });
          execFileSync('tesseract', [columnOut + '.png', columnOut, '-l', 'pol', '--psm', '6', 'tsv'],
            { stdio: ['ignore', 'ignore', 'pipe'], env: TESS_ENV });
          const column = parseTesseractTsv(await readFile(columnOut + '.tsv', 'utf8'));
          geometry.columns.push({ left, right, words: column.words.map((word) => ({
            ...word, left: word.left + x,
          })) });
        }
      }
      pages.push(geometry);
    }
    return opts.words ? pages : pages.join('\n\n===PAGE BREAK===\n\n');
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: node src/ocr-pdf.js <pdf-url>');
    process.exit(2);
  }
  const text = await ocrPdf(url);
  process.stdout.write(text);
}
