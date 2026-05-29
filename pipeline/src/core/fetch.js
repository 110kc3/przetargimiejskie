// Polite fetcher: identifies the bot, throttles requests, retries transient failures.
//
// All HTTP traffic to zgm-gliwice.pl flows through here so we have one
// consistent place to enforce rate limits and user-agent.

import { setTimeout as sleep } from 'node:timers/promises';

const USER_AGENT =
  'przetargimiejskie-bot/0.1 (+https://github.com/110kc3/przetargimiejskie)';

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
  const { retries = 3, accept = '*/*', userAgent } = opts;
  // When a city overrides the UA (browser mode), send the rest of a browser's
  // baseline headers too — some municipal WAFs (e.g. bip.miastozabrze.pl) reject
  // requests that present a browser UA but lack Accept-Language / Sec-Fetch-*.
  const browserMode = Boolean(userAgent);
  const headers = {
    'User-Agent': userAgent || USER_AGENT,
    Accept: browserMode
      ? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8'
      : accept,
    ...(browserMode
      ? {
          'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
        }
      : {}),
  };
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await throttle();
      const res = await fetch(url, { headers, redirect: 'follow' });
      if (res.status >= 500 || res.status === 429) {
        throw new Error(`http ${res.status} on ${url}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      // `fetch failed` hides the real reason on its `.cause` — surface it so
      // connection failures (DNS / TLS / refused / timeout / IP-block) are
      // diagnosable from the CI log instead of an opaque "fetch failed".
      const cause = err?.cause;
      const detail = cause
        ? ` [cause: ${cause.code || cause.name || ''} ${cause.message || ''}`.trimEnd() + ']'
        : '';
      const backoff = 1000 * Math.pow(2, attempt);
      console.error(`  fetch failed (${err.message})${detail}; retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/** @param {string} url @param {{ userAgent?: string }} [opts] */
export async function getText(url, opts = {}) {
  const res = await politeGet(url, {
    accept: 'text/html,application/xhtml+xml',
    userAgent: opts.userAgent,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  return res.text();
}

/** @param {string} url @param {{ userAgent?: string }} [opts] */
export async function getBytes(url, opts = {}) {
  const res = await politeGet(url, {
    accept: 'application/pdf,*/*',
    userAgent: opts.userAgent,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
