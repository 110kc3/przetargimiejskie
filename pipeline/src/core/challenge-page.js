const VENDOR_RE = [
  /Attention Required!\s*\|\s*Cloudflare/i,
  /cf-browser-verification|cf_chl_|__cf_chl|challenge-platform/i,
  /Checking your browser before accessing/i,
  /DDoS-Guard|ddos-guard\.net/i,
  /Just a moment\.\.\./i,
];

const WAIT_CUE_RE = /prosz[eę]\s*czeka[cć]|please\s+wait|weryfikacja|verifying|sprawdzanie\s+przegl[aą]darki|проверка/i;
const RELOAD_RE = /location\s*\.\s*reload|http-equiv\s*=\s*["']?\s*refresh|setTimeout\s*\([\s\S]{0,200}?(reload|location)/i;

const GENERIC_MAX_BYTES = 64 * 1024;

const CONTENT_ANCHOR_MIN = 10;

function anchorCount(html) {
  const m = html.match(/<a\s/gi);
  return m ? m.length : 0;
}

export function isChallengePage(html) {
  if (!html || typeof html !== 'string') return false;
  if (VENDOR_RE.some((re) => re.test(html))) return true;
  if (html.length > GENERIC_MAX_BYTES) return false;
  return WAIT_CUE_RE.test(html) && RELOAD_RE.test(html) && anchorCount(html) < CONTENT_ANCHOR_MIN;
}

export function challengeSignature(html) {
  if (!html || typeof html !== 'string') return '';
  for (const re of VENDOR_RE) if (re.test(html)) return re.source.split('|')[0].replace(/\\/g, '').slice(0, 40);
  if (html.length <= GENERIC_MAX_BYTES && WAIT_CUE_RE.test(html) && RELOAD_RE.test(html) && anchorCount(html) < CONTENT_ANCHOR_MIN) return 'wait-cue+auto-reload';
  return '';
}
