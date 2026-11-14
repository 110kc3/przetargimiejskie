import test from 'node:test';
import assert from 'node:assert/strict';
import { isChallengePage, challengeSignature } from '../src/core/challenge-page.js';

test('real listing content is not a challenge page', () => {
  assert.equal(isChallengePage('<html><body><h1>Wykaz nieruchomości</h1><table><tr><td>ul. 3 Maja 1</td></tr></table></body></html>'), false);
  assert.equal(isChallengePage('<p>Prosimy czekać na decyzję komisji przetargowej.</p>'), false);
  assert.equal(isChallengePage(''), false);
  assert.equal(isChallengePage(null), false);
});

test('brzeg-style waiting room (wait cue + auto-reload) is detected', () => {
  const html = `<html><head><title>Proszę czekać…</title></head>
    <body><script>setTimeout(function(){location.reload();},5000);</script></body></html>`;
  assert.equal(isChallengePage(html), true);
  assert.equal(challengeSignature(html), 'wait-cue+auto-reload');
});

test('brzeg proof-of-work verification page is detected', () => {
  const html = `<html><head><title>Weryfikacja</title></head><body>
    <h2>Potwierdź, że nie jesteś robotem</h2>
    <script>fetch('/__nodea/verify-js', {method:'POST'}).then(() => location.reload())</script>
    </body></html>`;
  assert.equal(isChallengePage(html), true);
  assert.equal(challengeSignature(html), 'wait-cue+auto-reload');
});

test('meta-refresh waiting room is detected', () => {
  const html = `<html><head><meta http-equiv="refresh" content="5"><title>Please wait</title></head><body>Verifying…</body></html>`;
  assert.equal(isChallengePage(html), true);
});

test('Cloudflare interstitials are detected by vendor marker (regardless of size)', () => {
  assert.equal(isChallengePage('<title>Just a moment...</title><div id="challenge-platform"></div>'), true);
  assert.equal(isChallengePage('<h1>Attention Required! | Cloudflare</h1>'), true);
  assert.equal(isChallengePage('<div>Checking your browser before accessing the site.</div>'), true);
  assert.ok(challengeSignature('<title>Just a moment...</title>').length > 0);
});

test('DDoS-Guard interstitial is detected', () => {
  assert.equal(isChallengePage('<html>...<a href="https://ddos-guard.net/">DDoS-Guard</a>...</html>'), true);
});

test('a large real page is not misclassified even if it carries a wait cue', () => {
  const big = '<html><body>' + 'x'.repeat(70 * 1024) + 'proszę czekać<meta http-equiv="refresh"></body></html>';
  assert.equal(isChallengePage(big), false);
  assert.equal(challengeSignature(big), '');
});

test('SISCO content page (benign spinner + noscript refresh + real links) is NOT a challenge page', () => {
  const links = Array.from({ length: 15 }, (_, i) => `<a href="/przetargi,9_2026-6_${400 + i}">Przetarg ${i}</a>`).join('');
  const html = `<html><head><title>Urząd Miasta Opola - Przetargi</title>
    <noscript><meta http-equiv="refresh" content="0; url=http://bip.um.opole.pl/error_js"/></noscript></head>
    <body><div class="eDcmsPopUpTmp"><div id="eDcProgress" class="eDcProgress"><div>Proszę czekać</div></div></div>
    <div id="content">${links}</div></body></html>`;
  assert.equal(isChallengePage(html), false);
  assert.equal(challengeSignature(html), '');
});
