import test from 'node:test';
import assert from 'node:assert/strict';

import { getBytes, isApprovedInsecureTlsUrl } from '../src/core/fetch.js';

test('insecure TLS compatibility is limited to audited HTTPS source hosts', () => {
  assert.equal(isApprovedInsecureTlsUrl('https://bip.miastozabrze.pl/doc/1'), true);
  assert.equal(isApprovedInsecureTlsUrl('https://bip.elblag.eu/'), true);
  assert.equal(isApprovedInsecureTlsUrl('http://bip.elblag.eu/'), false);
  assert.equal(isApprovedInsecureTlsUrl('https://bip.elblag.eu.evil.example/'), false);
  assert.equal(isApprovedInsecureTlsUrl('https://user:secret@bip.elblag.eu/'), false);
  assert.equal(isApprovedInsecureTlsUrl('https://bip.elblag.eu:8443/'), false);
  assert.equal(isApprovedInsecureTlsUrl('https://example.com/'), false);
});

test('an unapproved insecureTLS request is rejected before network access', async () => {
  await assert.rejects(
    getBytes('https://example.com/', { insecureTLS: true, retries: 0 }),
    /insecureTLS denied for non-allowlisted URL/,
  );
});
