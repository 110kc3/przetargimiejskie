// Generic anti-bot / challenge-page detector.
//
// Some municipal hosts (and their CDNs) answer a bot — typically a GitHub
// Actions Azure IP — with an interstitial "please wait / verifying your
// browser" page carrying HTTP 200 instead of the real content. The crawl then
// "succeeds" and parses zero records, and triage misreads that as a
// layout-change (a parser bug) when the truth is that the source was never
// served.
//
// This is the shared, city-agnostic detector. core/fetch.js runs it on every
// getText() body and THROWS a "fetch failed: …" error when it matches, so ANY
// city's challenge page classifies as source-unreachable via triage's existing
// NETWORK_RE path — no per-city code. (Brzeg's bespoke waiting-room retry loop
// predates this and stays: it forwards a challenge cookie across a retry, which
// this passive detector can't do.)
//
// Signatures are deliberately STRONG — vendor-specific strings, or a
// "please wait" cue co-occurring with a client-side auto-reload — so real
// listing content (which may innocently contain "proszę czekać" in prose) is
// not misclassified. Tuned against fixtures in tests/challenge-page.test.js.

// Vendor-specific markers: presence alone is conclusive (these strings do not
// occur in real municipal listing pages).
const VENDOR_RE = [
  /Attention Required!\s*\|\s*Cloudflare/i,
  /cf-browser-verification|cf_chl_|__cf_chl|challenge-platform/i,
  /Checking your browser before accessing/i,
  /DDoS-Guard|ddos-guard\.net/i,
  /Just a moment\.\.\./i,
];

// Waiting-room shape: a "please wait / verifying" cue AND a client-side
// auto-reload (meta refresh or location.reload) — a holding page, which real
// content never is.
const WAIT_CUE_RE = /prosz[eę]\s*czeka[cć]|please\s+wait|weryfikacja|verifying|sprawdzanie\s+przegl[aą]darki|проверка/i;
const RELOAD_RE = /location\s*\.\s*reload|http-equiv\s*=\s*["']?\s*refresh|setTimeout\s*\([\s\S]{0,200}?(reload|location)/i;

const GENERIC_MAX_BYTES = 64 * 1024; // real listing pages are far larger

// Link-sparseness gate for the GENERIC heuristic. Some CMSes — notably SISCO,
// which many Polish municipal BIPs run (Opole, …) — ship a benign AJAX
// loading-spinner ("Proszę czekać", in a hidden eDcProgress div) plus a
// <noscript> meta-refresh fallback (to /error_js) on EVERY page, including real
// listing/board pages carrying dozens of content links. Both innocently match
// WAIT_CUE_RE + RELOAD_RE, so the generic heuristic must also require the page
// to be link-poor: a genuine waiting room is a bare holding page (≈0 anchors),
// whereas a real page carries site-nav + content links. (Vendor interstitials
// above are matched regardless of link count.)
const CONTENT_ANCHOR_MIN = 10;

function anchorCount(html) {
  const m = html.match(/<a\s/gi);
  return m ? m.length : 0;
}

/**
 * True when `html` looks like an anti-bot / challenge / waiting-room
 * interstitial rather than real page content.
 * @param {string} html
 * @returns {boolean}
 */
export function isChallengePage(html) {
  if (!html || typeof html !== 'string') return false;
  if (VENDOR_RE.some((re) => re.test(html))) return true;
  // The generic wait-cue+reload heuristic is only trusted on a small body — a
  // real (large) listing page that happens to say "proszę czekać" must not trip.
  if (html.length > GENERIC_MAX_BYTES) return false;
  return WAIT_CUE_RE.test(html) && RELOAD_RE.test(html) && anchorCount(html) < CONTENT_ANCHOR_MIN;
}

/** Short label naming which signature matched, for logs. '' when none. */
export function challengeSignature(html) {
  if (!html || typeof html !== 'string') return '';
  for (const re of VENDOR_RE) if (re.test(html)) return re.source.split('|')[0].replace(/\\/g, '').slice(0, 40);
  if (html.length <= GENERIC_MAX_BYTES && WAIT_CUE_RE.test(html) && RELOAD_RE.test(html) && anchorCount(html) < CONTENT_ANCHOR_MIN) return 'wait-cue+auto-reload';
  return '';
}
