import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { getText, getBytes } from '../../core/fetch.js';
import { pdfText } from '../../core/pdf-text.js';
import { ocrPdf } from '../../core/ocr-pdf.js';
import { urlCacheKey } from '../../core/hash.js';
import { loadKnownSourceUrls } from '../../core/known-urls.js';
import {
  parseAnnouncement,
  isAnnouncementTitle,
  isResultTitle,
} from './parse.js';

export const ORIGIN = 'https://bip.srodaslaska.pl';
export const BOARD_URL = `${ORIGIN}/index.php?id=173`;

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const FETCH_OPTS = { userAgent: BROWSER_UA };

const CACHE_DIR = fileURLToPath(new URL('../../../ocr-cache/', import.meta.url));

export function resolveUrl(href) {
  try {
    return new URL(String(href || '').replace(/&amp;/g, '&'), ORIGIN).toString();
  } catch {
    return null;
  }
}

export async function ocrImage(imgUrl) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, urlCacheKey(imgUrl) + '.txt');
  if (existsSync(cachePath)) {
    return await readFile(cachePath, 'utf8');
  }

  const bytes = await getBytes(imgUrl, FETCH_OPTS);
  const work = await mkdtemp(join(tmpdir(), 'sroda-img-ocr-'));
  try {
    const ext = imgUrl.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
    const inPath = join(work, `image${ext}`);
    const outBase = join(work, 'ocr_out');
    await writeFile(inPath, bytes);
    execFileSync('tesseract', [inPath, outBase, '-l', 'pol', '--psm', '3'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const text = await readFile(`${outBase}.txt`, 'utf8');
    await writeFile(cachePath, text, 'utf8');
    return text;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export async function extractAttachmentText(fileUrl) {
  if (!fileUrl) return '';
  const lower = fileUrl.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
    try {
      const text = await ocrImage(fileUrl);
      if (text && text.trim().length > 20) return text;
    } catch {
    }
  } else if (lower.endsWith('.pdf')) {
    try {
      const text = await pdfText(fileUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch {
    }
    try {
      const text = await ocrPdf(fileUrl, FETCH_OPTS);
      if (text && text.trim().length > 30) return text;
    } catch {
    }
  }
  return '';
}

export async function fetchDataTableRecords(length = 100) {
  const url = `${ORIGIN}/index.php?id=173&akcja=pobierz_dokumenty_ajax&chwila=1&sEcho=1&iDisplayStart=0&iDisplayLength=${length}&iColumns=13`;
  try {
    const jsonStr = await getText(url, FETCH_OPTS);
    const data = JSON.parse(jsonStr);
    return data.aaData || [];
  } catch (err) {
    console.error(`sroda-slaska: failed to fetch DataTables JSON: ${err.message}`);
    return [];
  }
}

export async function extractDetailAttachment(detailUrl) {
  try {
    const html = await getText(detailUrl, FETCH_OPTS);
    const m = html.match(/href="([^"]*upload\/pliki\/[^"]*)"/i);
    return m ? resolveUrl(m[1]) : null;
  } catch {
    return null;
  }
}

export async function crawlActive() {
  const started = Date.now();
  const known = await loadKnownSourceUrls('sroda-slaska');
  const listings = [];
  const land = [];
  const wykaz = [];

  const rows = await fetchDataTableRecords(120);

  for (const row of rows) {
    const title = row[2] || '';
    const date_published = row[5] || null;
    const p2 = row[9];
    if (!p2) continue;

    const noticeUrl = `${ORIGIN}/index.php?id=173&p1=szczegoly&p2=${p2}`;

    if (/wykaz/i.test(title)) {
      wykaz.push({
        source_url: noticeUrl,
        title,
        date_published,
      });
      continue;
    }

    if (isAnnouncementTitle(title)) {
      const fileUrl = await extractDetailAttachment(noticeUrl);
      let text = '';
      if (fileUrl) {
        text = await extractAttachmentText(fileUrl);
      }

      const parsed = parseAnnouncement(text, title, noticeUrl);
      parsed.date_published = date_published;

      if (parsed.kind === 'grunt') {
        land.push(parsed);
      } else {
        listings.push(parsed);
      }
    }
  }

  return {
    listings,
    wykaz,
    land,
    valid_empty: listings.length === 0,
    valid_empty_land: land.length === 0,
  };
}

export async function crawlResultDocs() {
  const results = [];
  const rows = await fetchDataTableRecords(120);

  for (const row of rows) {
    const title = row[2] || '';
    const date_published = row[5] || null;
    const p2 = row[9];
    if (!p2) continue;

    if (!isResultTitle(title)) continue;

    const noticeUrl = `${ORIGIN}/index.php?id=173&p1=szczegoly&p2=${p2}`;
    const fileUrl = await extractDetailAttachment(noticeUrl);
    let text = '';
    if (fileUrl) {
      text = await extractAttachmentText(fileUrl);
    }

    results.push({
      source_url: fileUrl || noticeUrl,
      title,
      text,
      date: date_published,
    });
  }

  return results;
}
