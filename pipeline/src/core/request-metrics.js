import { appendFileSync } from 'node:fs';

const path = process.env.FETCH_METRICS_PATH || '';

export function recordRequest(url) {
  if (!path) return;
  try {
    const host = new URL(url).hostname.toLowerCase();
    appendFileSync(path, `${host}\n`, 'utf8');
  } catch { /* metrics never affect a crawl */ }
}
