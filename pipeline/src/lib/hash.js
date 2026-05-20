// Stable cache keys derived from URLs.

import { createHash } from 'node:crypto';

/**
 * Short content-addressable id for a URL. Prefers the URL's trailing path
 * segment (e.g. PDF filename, or detail-page slug) so cache files are
 * eyeballable in git, with a short hash suffix for collision safety. Strips
 * trailing slashes so detail-page URLs (which end in '/') still yield a
 * sensible cache name rather than collapsing to '.HASH.json'.
 * @param {string} url
 */
export function urlCacheKey(url) {
  const trimmed = url.replace(/\/+$/, '');
  const name = (trimmed.split('/').pop() || 'root').replace(/[^A-Za-z0-9.-]/g, '_');
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
  return `${name}.${hash}`;
}
