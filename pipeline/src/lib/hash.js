// Stable cache keys derived from URLs. Used for OCR cache filenames so each
// source PDF maps deterministically to one cache file, forever.

import { createHash } from 'node:crypto';

/**
 * Short content-addressable id for a URL. Prefers the PDF filename so cache
 * files are eyeballable in git, with a short hash suffix for collision safety.
 * @param {string} url
 */
export function urlCacheKey(url) {
  const name = (url.split('/').pop() || '').replace(/[^A-Za-z0-9.-]/g, '_');
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
  return `${name}.${hash}`;
}
