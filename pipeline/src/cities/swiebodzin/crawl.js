// Świebodzin crawler (bip.swiebodzin.eu - SystemDoBIP CMS).

import { pathToFileURL } from 'node:url';
import { getText } from '../../core/fetch.js';
import {
  parseRow,
} from './parse.js';

const ORIGIN = 'https://bip.swiebodzin.eu';
const BOARD_URL = `${ORIGIN}/przetargi/361/status/0/`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_OPTS = { userAgent: UA };

export async function crawlActive() {
  const html = await getText(BOARD_URL, FETCH_OPTS);
  if (!html) return [];

  const results = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    if (rowHtml.includes('td-title-1')) {
      const parsed = parseRow(rowHtml);
      if (parsed) {
        results.push(parsed);
      }
    }
  }

  return results;
}

export async function crawlResults() {
  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = await crawlActive();
  console.log(`Crawled ${items.length} items from Świebodzin:`);
  console.log(JSON.stringify(items.slice(0, 3), null, 2));
}
