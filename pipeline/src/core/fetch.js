
import { setTimeout as sleep } from 'node:timers/promises';
import https from 'node:https';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isChallengePage, challengeSignature } from './challenge-page.js';
import { recordRequest } from './request-metrics.js';
import { getSourceTlsAgent } from './source-tls.js';

export function directFetch(...args) {
  recordRequest(args[0]);
  return fetch(...args);
}

const USER_AGENT =
  'przetargimiejskie-bot/0.1 (+https://github.com/110kc3/przetargimiejskie)';

const MIN_INTERVAL_MS = Number(process.env.FETCH_MIN_INTERVAL_MS) || 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 30000;
let lastFetchAt = 0;

// fetched body is also written to that dir so a breaking run preserves the
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

async function getBufferWithSourceChain(url, opts = {}) {
  const agent = getSourceTlsAgent(url);
  const { userAgent, accept, retries = 3, redirects = 5 } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await throttle();
      recordRequest(url);
      return await new Promise((resolve, reject) => {
        const headers = userAgent
          ? browserHeaders(userAgent, accept)
          : { 'User-Agent': USER_AGENT, Accept: accept || '*/*' };
        const req = https.get(url, { agent, headers, timeout: 30000 }, (res) => {
          const { statusCode = 0, headers: h } = res;
          if (statusCode >= 300 && statusCode < 400 && h.location && redirects > 0) {
            res.resume();
            const next = new URL(h.location, url).toString();
            getBufferWithSourceChain(next, { ...opts, redirects: redirects - 1 }).then(resolve, reject);
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
      if (attempt === retries) break;
      const backoff = 1000 * Math.pow(2, attempt);
      console.error(`  fetch failed (${err.message}) [source-tls]; retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

export async function politeGet(url, opts = {}) {
  const { retries = 3, accept = '*/*', userAgent, timeoutMs } = opts;
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
      recordRequest(url);
      const res = await fetch(url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs || REQUEST_TIMEOUT_MS),
      });
      if (res.status >= 500 || res.status === 429) {
        throw new Error(`http ${res.status} on ${url}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      const cause = err?.cause;
      const detail = cause
        ? ` [cause: ${cause.code || cause.name || ''} ${cause.message || ''}`.trimEnd() + ']'
        : '';
      if (attempt === retries) break;
      const backoff = 1000 * Math.pow(2, attempt);
      console.error(`  fetch failed (${err.message})${detail}; retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

// source-unreachable instead of layout-change, and lets refresh.js preserve
function assertNotChallenge(url, text) {
  if (!isChallengePage(text)) return text;
  const sig = challengeSignature(text) || 'challenge page';
  const msg = `fetch failed: anti-bot/challenge page (${sig}) served on ${url}`;
  console.error(`  ${msg}`);
  const err = new Error(msg);
  err.challengePage = true;
  throw err;
}

export async function getText(url, opts = {}) {
  if (opts.insecureTLS) {
    const buf = await getBufferWithSourceChain(url, {
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
    timeoutMs: opts.timeoutMs,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const text = await res.text();
  snapshot(url, text, true);
  return assertNotChallenge(url, text);
}

export async function getBytes(url, opts = {}) {
  if (opts.insecureTLS) {
    const buf = await getBufferWithSourceChain(url, {
      userAgent: opts.userAgent,
      accept: 'application/pdf,*/*',
      retries: opts.retries,
    });
    snapshot(url, buf, false);
    return buf;
  }
  const res = await politeGet(url, {
    accept: 'application/pdf,*/*',
    retries: opts.retries,
    userAgent: opts.userAgent,
  });
  if (!res.ok) throw new Error(`http ${res.status} on ${url}`);
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  snapshot(url, buf, false);
  return buf;
}
