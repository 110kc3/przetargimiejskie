// Polite fetcher: identifies the bot, throttles requests, retries transient failures.
//
// All HTTP traffic to zgm-gliwice.pl flows through here so we have one
// consistent place to enforce rate limits and user-agent.

import { setTimeout as sleep } from 'node:timers/promises';
import https from 'node:https';

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

// Browser-baseline headers, sent when a city opts into "browser mode" (a custom
// User-Agent). Some municipal WAFs reject a browser UA that lacks these.
function browserHeaders(userAgent, accept) {
  return {
    'User-Agent': userAgent,
    Accept: accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
  };
}

// ---- insecure-TLS path (node:https) --------------------------------------
//
// Some Polish municipal servers (e.g. bip.miastozabrze.pl) ship an INCOMPLETE
// certificate chain — they omit the intermediate CA, so Node's fetch fails with
// UNABLE_TO_VERIFY_LEAF_SIGNATURE. Browsers hide this by auto-fetching the
// missing intermediate (AIA); Node does not. The data we read is PUBLIC and
// READ-ONLY and we send no credentials, so for hosts explicitly opted-in via
// `insecureTLS` we relax chain verification rather than fail entirely.
//
// SECURE ALTERNATIVE (preferred if you'd rather not relax TLS): obtain the
// host's missing intermediate CA (download it from the leaf cert's caIssuers /
// AIA URL once) and run the pipeline with
//   NODE_EXTRA_CA_CERTS=path/to/intermediate.pem
// then drop the `insecureTLS` flag in cities/zabrze/crawl.js.
const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false,
});

/**
 * GET a URL over node:https with relaxed chain verification, throttle + retry +
 * redirect-follow. Returns the raw body Buffer.
 * @param {string} url
 * @param {{ userAgent?: string, accept?: string, retries?: number, redirects?: number }} [opts]
 * @returns {Promise<Buffer>}
 */
async function getBufferInsecure(url, opts = {}) {
  const { userAgent, accept, retries = 3, redirects = 5 } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await throttle();
      return await new Promise((resolve, reject) => {
        const headers = userAgent
          ? browserHeaders(userAgent, accept)
          : { 'User-Agent': USER_AGENT, Accept: accept || '*/*' };
        const req = https.get(url, { agent: insecureAgent, headers, timeout: 30000 }, (res) => {
          const { statusCode = 0, headers: h } = res;
          if (statusCode >= 300 && statusCode < 400 && h.location && redirects > 0) {
            res.resume(); // drain
            const next = new URL(h.location, url).toString();
            getBufferInsecure(next, { ...opts, redirects: redirects - 1 }).then(resolve, reject);
            return;
          }
          if (statusCode < 200 || statusCode >= 300) {
            res.resume();
            reject(new Error(`http ${statusCode} on ${url}`));
            return;
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        });
        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
      });
    } catch (err) {
      lastErr = err;
      const backoff = 1000 * Math.pow(2, attempt);
      console.error(`  fetch failed (${err.message}) [insecure-tls]; retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
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

/** @param {string} url @param {{ userAgent?: string, insecureTLS?: boolean }} [opts] */
export async function getText(url, opts = {}) {
  if (opts.insecureTLS) {
    const buf = await getBufferInsecure(url, {
      userAgent: opts.userAgent,
      accept: 'text/html,application/xhtml+xml',
    });
    return buf.toString('utf8');
  }
  const res = await politeGet(url, {
    accept: 'text/html,application/xhtml+xml',
    userAgent: opts.userAgent,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  return res.text();
}

/** @param {string} url @param {{ userAgent?: string, insecureTLS?: boolean }} [opts] */
export async function getBytes(url, opts = {}) {
  if (opts.insecureTLS) {
    return getBufferInsecure(url, {
      userAgent: opts.userAgent,
      accept: 'application/pdf,*/*',
    });
  }
  const res = await politeGet(url, {
    accept: 'application/pdf,*/*',
    userAgent: opts.userAgent,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
