import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getBytes } from './fetch.js';
import { ocrPdf } from './ocr-pdf.js';
import { docText } from './doc-text.js';
import { findAuctionDate, parseAreaSqm } from './engine-fields.js';
import { shareFromTitle } from './finn-bip.js';
import { stripTags } from './html-text.js';

const MAX_ATTACHMENTS_PER_NOTICE = 3;
const MIN_TEXT_LAYER_CHARS = 200;
const ANCHOR = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const DOCUMENT_EXTENSION = /\.(?:pdf|docx?)(?:$|[?#])/i;
const ATTACHMENT_ENDPOINT = /plik\.php\?id=|\/api\/attachments\/|get\.html\?id=|\/pobierz/i;
const BOILERPLATE_ATTACHMENT = /\/static\/|instrukcj|deklaracj|dost[ęe]pno[śs]ci|polityk/i;
const PRICE_AFTER_LABEL = /cen[^\s]*\s+wywo[łl]awcz[^\s]*[^0-9]{0,80}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/gi;
const DEPOSIT_AFTER_LABEL = /wadium[^0-9]{0,80}?(\d[\d\s.]*(?:,\d{2})?)\s*z[łl]/i;

export function attachmentUrlsFromHtml(html, pageUrl) {
  const found = [];
  for (const [, href, label] of (html || '').matchAll(ANCHOR)) {
    const text = stripTags(label).trim();
    const isDocument = DOCUMENT_EXTENSION.test(href) || DOCUMENT_EXTENSION.test(text) || ATTACHMENT_ENDPOINT.test(href);
    if (!isDocument || BOILERPLATE_ATTACHMENT.test(href) || BOILERPLATE_ATTACHMENT.test(text)) continue;
    try {
      const url = new URL(href.replace(/&amp;/g, '&'), pageUrl).href;
      if (!found.includes(url)) found.push(url);
    } catch {}
  }
  return found.slice(0, MAX_ATTACHMENTS_PER_NOTICE);
}

export function attachmentUrlsFromMadkom(detail, origin) {
  return (detail?.attachments || [])
    .filter((attachment) => !attachment.deleted && attachment.downloadable && /^(?:pdf|docx?)$/i.test(attachment.extension || ''))
    .map((attachment) => new URL(attachment.link, `${origin}/`).href)
    .slice(0, MAX_ATTACHMENTS_PER_NOTICE);
}

function parseZloty(text) {
  const value = parseFloat(text.replace(/\s+/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export function startingPriceFromText(text) {
  const prices = new Set();
  for (const match of (text || '').matchAll(PRICE_AFTER_LABEL)) {
    const value = parseZloty(match[1]);
    if (value) prices.add(value);
  }
  return prices.size === 1 ? [...prices][0] : null;
}

export function usableAreaFromText(text) {
  const usable = /powierzchni\s+u[żz]ytkowej[^0-9]{0,40}?([\d\s.]*\d(?:,\d+)?)\s*m\s*[2²?”"]/i.exec(text || '');
  if (usable) {
    const value = parseFloat(usable[1].replace(/\s+/g, '').replace(',', '.'));
    if (Number.isFinite(value)) return value;
  }
  return parseAreaSqm(text);
}

const LOT_ROW = /^\s*\d+\.\s+(.*?)\s(\d{1,4}(?:\/\d{1,4})?)\s+(\d+(?:,\d+)?)\s*(ha|m2|m²)\s+(\d[\d.]*,\d{2})\s*(?:z[łl])?\s+(\d[\d.]*,\d{2})/gim;
const PRECINCT = /Obr[ęe]b\s+(.+?)(?:\s{2,}|,|$)/i;

export function landLotsFromTable(text) {
  const lots = [];
  for (const [, location, parcel, areaValue, unit, price, deposit] of (text || '').matchAll(LOT_ROW)) {
    const area = parseFloat(areaValue.replace(',', '.'));
    lots.push({
      dzialka_nr: parcel,
      obreb: PRECINCT.exec(location)?.[1]?.trim() || null,
      area_m2: unit.toLowerCase() === 'ha' ? Math.round(area * 10000) : area,
      starting_price_pln: parseZloty(price),
      deposit_pln: parseZloty(deposit),
    });
  }
  return lots;
}

export function parseNoticeText(text) {
  const deposit = DEPOSIT_AFTER_LABEL.exec(text || '');
  return {
    starting_price_pln: startingPriceFromText(text),
    deposit_pln: deposit ? parseZloty(deposit[1]) : null,
    auction_date: findAuctionDate(text),
    area_m2: usableAreaFromText(text),
    share: shareFromTitle('', text),
  };
}

async function textLayer(bytes) {
  const dir = await mkdtemp(join(tmpdir(), 'engine-attachment-'));
  try {
    const path = join(dir, 'notice.pdf');
    await writeFile(path, bytes);
    return execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function attachmentText(url, options = {}) {
  const bytes = await getBytes(url, options);
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return docText(url, options);
  const layer = (await textLayer(bytes)).replace(/\f/g, ' ').trim();
  return layer.length >= MIN_TEXT_LAYER_CHARS ? layer : ocrPdf(url, options);
}
