import test from 'node:test';
import assert from 'node:assert/strict';

import { stringifyJsonForHtml } from '../../scripts/lib/safe-json.mjs';

test('JSON embedded in HTML cannot terminate its script element', () => {
  const hostile = '</script><img src=x onerror=alert(1)>&\u2028next';
  const encoded = stringifyJsonForHtml({ hostile });

  assert.equal(encoded.includes('</script>'), false);
  assert.equal(encoded.includes('<img'), false);
  assert.deepEqual(JSON.parse(encoded), { hostile });
});
