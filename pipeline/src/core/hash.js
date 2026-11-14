
import { createHash } from 'node:crypto';

export function urlCacheKey(url) {
  const trimmed = url.replace(/\/+$/, '');
  const name = (trimmed.split('/').pop() || 'root').replace(/[^A-Za-z0-9.-]/g, '_');
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
  return `${name}.${hash}`;
}
