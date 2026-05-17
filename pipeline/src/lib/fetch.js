// Polite fetcher: identifies the bot, throttles requests, retries transient failures.
//
// All HTTP traffic to zgm-gliwice.pl flows through here so we have one
// consistent place to enforce rate limits and user-agent.

import { setTimeout as sleep } from 'node:timers/promises';

const USER_AGENT =
  'zgm-gliwice-archive-bot/0.1 (+https://github.com/110kc3/zgm-gliwice)';

const MIN_INTERVAL_MS = 1000; // 1 req/sec, easily under any reasonable threshold
let lastFetchAt = 0;

async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastFetchAt);
  if (wait > 0) await sleep(wait);
  lastFetchAt = Date.now();
}

/**
 * GET a URL with throttling, retry, and a polite UA. Returns the Response.
 * @param {string} url
 * @param {{ retries?: number, accept?: string }} [opts]
 * @returns {Promise<Response>}
 */
export async function politeGet(url, opts = {}) {
  const { retries = 3, accept = '*/*' } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await throttle();
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: accept,
        },
        redirect: 'follow',
      });
      if (res.status >= 500 || res.status === 429) {
        throw new Error(`http ${res.status} on ${url}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      const backoff = 1000 * Math.pow(2, attempt);
      console.error(`  fetch failed (${err.message}); retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/** @param {string} url */
export async function getText(url) {
  const res = await politeGet(url, { accept: 'text/html,application/xhtml+xml' });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  return res.text();
}

/** @param {string} url */
export async function getBytes(url) {
  const res = await politeGet(url, { accept: 'application/pdf,*/*' });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
