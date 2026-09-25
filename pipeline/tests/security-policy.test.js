import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { rootCertificates } from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { getBytes } from '../src/core/fetch.js';
import { getSourceTlsAgent, isApprovedSourceTlsUrl } from '../src/core/source-tls.js';

test('TLS chain compatibility is limited to audited HTTPS source hosts', () => {
  assert.equal(isApprovedSourceTlsUrl('https://bip.miastozabrze.pl/doc/1'), true);
  assert.equal(isApprovedSourceTlsUrl('https://bip.elblag.eu/'), true);
  assert.equal(isApprovedSourceTlsUrl('http://bip.elblag.eu/'), false);
  assert.equal(isApprovedSourceTlsUrl('https://bip.elblag.eu.evil.example/'), false);
  assert.equal(isApprovedSourceTlsUrl('https://user:secret@bip.elblag.eu/'), false);
  assert.equal(isApprovedSourceTlsUrl('https://bip.elblag.eu:8443/'), false);
  assert.equal(isApprovedSourceTlsUrl('https://example.com/'), false);
});

test('an unapproved insecureTLS request is rejected before network access', async () => {
  await assert.rejects(
    getBytes('https://example.com/', { insecureTLS: true, retries: 0 }),
    /source TLS compatibility denied for non-allowlisted URL/,
  );
});

test('bundled intermediates authenticate to Node public roots without adding trust anchors', () => {
  const roots = rootCertificates.map((pem) => new X509Certificate(pem));
  const directory = new URL('../src/core/certificates/', import.meta.url);
  const intermediates = readdirSync(directory).filter((name) => name.endsWith('.pem'))
    .map((name) => new X509Certificate(readFileSync(new URL(name, directory))));
  const trusted = new Set(roots.map((cert) => cert.fingerprint256));
  function anchored(cert, seen = new Set()) {
    if (trusted.has(cert.fingerprint256)) return true;
    if (seen.has(cert.fingerprint256)) return false;
    seen.add(cert.fingerprint256);
    return [...roots, ...intermediates].some((issuer) =>
      cert.checkIssued(issuer) && cert.verify(issuer.publicKey) && anchored(issuer, new Set(seen)));
  }
  for (const cert of intermediates) {
    assert.equal(cert.ca, true, cert.subject);
    assert.notEqual(cert.subject, cert.issuer, 'no self-signed trust anchor may be bundled');
    assert.ok(anchored(cert), cert.subject);
  }
});

test('TLS compatibility rejects untrusted, wrong-host and expired certificates', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'source-tls-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  const expiredPath = join(dir, 'expired.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
    '-subj', '/CN=bip.elblag.eu', '-addext', 'subjectAltName=DNS:bip.elblag.eu',
    '-keyout', keyPath, '-out', certPath], { stdio: 'ignore' });
  execFileSync('openssl', ['x509', '-in', certPath, '-signkey', keyPath, '-days', '-1',
    '-out', expiredPath], { stdio: 'ignore' });
  const key = readFileSync(keyPath);
  const cert = readFileSync(certPath);
  const productionAgent = getSourceTlsAgent('https://bip.elblag.eu/');
  assert.equal(productionAgent.options.rejectUnauthorized, true);
  assert.equal(productionAgent.options.allowPartialTrustChain, false);

  async function start(certificate) {
    const server = https.createServer({ key, cert: certificate }, (_req, res) => res.end('ok'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    return server;
  }
  function request(server, agent, servername = 'bip.elblag.eu') {
    return new Promise((resolve, reject) => {
      const req = https.get({ hostname: '127.0.0.1', port: server.address().port, servername, agent }, (res) => {
        res.resume(); res.on('end', resolve);
      });
      req.on('error', reject);
    });
  }
  const server = await start(cert);
  await assert.rejects(request(server, productionAgent), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' });
  // Trust the ephemeral test CA only inside this test, keeping production's
  // verification options unchanged so hostname/expiry checks can be exercised.
  const testAgent = new https.Agent({ ...productionAgent.options, ca: [...productionAgent.options.ca, cert] });
  t.after(() => testAgent.destroy());
  await request(server, testAgent);
  await assert.rejects(request(server, testAgent, 'wrong.example'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
  const expired = readFileSync(expiredPath);
  const expiredAgent = new https.Agent({ ...productionAgent.options, ca: [...productionAgent.options.ca, expired] });
  t.after(() => expiredAgent.destroy());
  await assert.rejects(request(await start(expired), expiredAgent), { code: 'CERT_HAS_EXPIRED' });
});

test('TLS compatibility rechecks redirects before a second request', async (t) => {
  let calls = 0;
  t.mock.method(https, 'get', (_url, _opts, callback) => {
    calls++;
    const req = new EventEmitter();
    process.nextTick(() => callback({ statusCode: 302, headers: { location: 'https://example.com/' }, resume() {} }));
    return req;
  });
  await assert.rejects(getBytes('https://bip.elblag.eu/', { insecureTLS: true, retries: 0 }), /non-allowlisted URL/);
  assert.equal(calls, 1);
});
