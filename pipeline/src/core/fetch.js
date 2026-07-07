// Polite fetcher: identifies the bot, throttles requests, retries transient failures.
//
// All HTTP traffic to zgm-gliwice.pl flows through here so we have one
// consistent place to enforce rate limits and user-agent.
//
// FETCH_PROXY_URL (optional): http(s)://[user:pass@]host:port — routes the
// requests made THROUGH THIS MODULE (politeGet / getText / getBytes) through
// that proxy (undici ProxyAgent). Why: some Polish municipal hosts firewall
// GitHub Actions' Azure IP ranges outright — bip2.finn.pl (194.24.181.47, the
// shared FINN server behind www.bipraciborz.pl and bip.swietochlowice.pl)
// silently drops runner connections while answering in under a second from
// Polish IPs. Pointing FETCH_PROXY_URL at a PL/non-Azure exit restores those
// cities in CI. When UNSET the behavior is byte-identical to before (undici is
// not even imported; the plain global fetch is used).
//
// Known UN-proxied paths: the insecureTLS path (getBufferInsecure, node:https);
// any city-local direct fetch() calls that bypass this module (compose with the
// exported proxyFetch instead); and the playwright renderer (core/render.js),
// which drives its own browser network stack.

import { setTimeout as sleep } from 'node:timers/promises';
import https from 'node:https';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isChallengePage, challengeSignature } from './challenge-page.js';

// ---- optional proxy egress (FETCH_PROXY_URL — see header comment) ----------
//
// Uses undici's own fetch with a per-request ProxyAgent dispatcher rather than
// setGlobalDispatcher: mixing an npm-undici dispatcher into Node's built-in
// fetch is version-sensitive, while undici fetch + undici agent always agree.
const PROXY_URL = process.env.FETCH_PROXY_URL || '';
let proxiedFetch = null;
if (PROXY_URL) {
  const { fetch: undiciFetch, ProxyAgent } = await import('undici');
  const proxyDispatcher = new ProxyAgent(PROXY_URL);
  proxiedFetch = (url, opts = {}) => undiciFetch(url, { ...opts, dispatcher: proxyDispatcher });
  console.error(`  fetch: egress via proxy ${PROXY_URL.replace(/\/\/[^@/]*@/, '//***@')}`);
}

/**
 * Proxy-aware fetch handle: the FETCH_PROXY_URL-backed fetch when the proxy is
 * configured, otherwise the plain global fetch. Lets city-local code that must
 * build its own requests (e.g. brzeg's waiting-room retry loop, which needs a
 * Cookie header politeGet can't send) use the same egress as this module.
 */
export function proxyFetch(...args) {
  return (proxiedFetch || fetch)(...args);
}

const USER_AGENT =
  'przetargimiejskie-bot/0.1 (+https://github.com/110kc3/przetargimiejskie)';

// 1 req/sec default, easily under any reasonable threshold. The env override
// (FETCH_MIN_INTERVAL_MS) exists for local one-off runs against hosts already
// verified to tolerate it - CI never sets it.
const MIN_INTERVAL_MS = Number(process.env.FETCH_MIN_INTERVAL_MS) || 1000;
let lastFetchAt = 0;

// ---- failure-snapshot hook (CI triage) -------------------------------------
//
// When DEBUG_FETCH_DIR is set (refresh.yml sets it for every matrix job), each
// fetched body is also written to that dir so a breaking run preserves the
// EXACT bytes the crawler saw — the evidence a layout-change fix needs, without
// re-hitting a flaky municipal server later. Capped to the first 25 fetches /
// ~15 MB: board/index pages come first in every adapter and are what matter;
// the caps keep PDF-heavy cities (Zabrze: ~113 docs) from bloating artifacts.
const SNAPSHOT_DIR = process.env.DEBUG_FETCH_DIR || '';
const SNAPSHOT_MAX_FILES = 25;
const SNAPSHOT_MAX_BYTES = 15 * 1024 * 1024;
let snapshotCount = 0;
let snapshotBytes = 0;

export function snapshot(url, body, isText) {
  if (!SNAPSHOT_DIR) return;
  if (snapshotCount >= SNAPSHOT_MAX_FILES || snapshotBytes >= SNAPSHOT_MAX_BYTES) return;
  try {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    const name = `${String(snapshotCount).padStart(3, '0')}-` +
      url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 150) +
      (isText ? '.html' : '.bin');
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    writeFileSync(join(SNAPSHOT_DIR, name), buf);
    snapshotCount++;
    snapshotBytes += buf.length;
  } catch { /* snapshots are best-effort observability — never fail a crawl */ }
}

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
      if (attempt === retries) break; // out of retries — don't sleep for nothing
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
      const res = await (proxiedFetch || fetch)(url, { headers, redirect: 'follow' });
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
      if (attempt === retries) break; // out of retries — don't sleep for nothing
      const backoff = 1000 * Math.pow(2, attempt);
      console.error(`  fetch failed (${err.message})${detail}; retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

// A fetched-OK anti-bot / challenge / waiting-room interstitial is NOT the real
// page — treat it like an outage. Throwing a "fetch failed: …" error (matches
// triage-report.js NETWORK_RE) makes any city's challenge page classify as
// source-unreachable instead of layout-change, and lets refresh.js preserve
// last-good data. The body is snapshot()ted BEFORE we throw, so the challenge
// bytes are still captured in the DEBUG_FETCH_DIR artifact.
function assertNotChallenge(url, text) {
  if (!isChallengePage(text)) return text;
  const sig = challengeSignature(text) || 'challenge page';
  const msg = `fetch failed: anti-bot/challenge page (${sig}) served on ${url}`;
  console.error(`  ${msg}`);
  const err = new Error(msg);
  err.challengePage = true;
  throw err;
}

/** @param {string} url @param {{ userAgent?: string, insecureTLS?: boolean, retries?: number }} [opts] */
export async function getText(url, opts = {}) {
  if (opts.insecureTLS) {
    const buf = await getBufferInsecure(url, {
      userAgent: opts.userAgent,
      accept: 'text/html,application/xhtml+xml',
      retries: opts.retries,
    });
    const text = buf.toString('utf8');
    snapshot(url, text, true);
    return assertNotChallenge(url, text);
  }
  const res = await politeGet(url, {
    accept: 'text/html,application/xhtml+xml',
    userAgent: opts.userAgent,
    retries: opts.retries,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const text = await res.text();
  snapshot(url, text, true);
  return assertNotChallenge(url, text);
}

/** @param {string} url @param {{ userAgent?: string, insecureTLS?: boolean }} [opts] */
export async function getBytes(url, opts = {}) {
  if (opts.insecureTLS) {
    const buf = await getBufferInsecure(url, {
      userAgent: opts.userAgent,
      accept: 'application/pdf,*/*',
    });
    snapshot(url, buf, false);
    return buf;
  }
  const res = await politeGet(url, {
    accept: 'application/pdf,*/*',
    userAgent: opts.userAgent,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  snapshot(url, buf, false);
  return buf;
}
