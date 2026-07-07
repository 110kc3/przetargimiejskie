// Brzeg anti-DDoS waiting-room detector tests.
//
// Since 2026-07-07 the brzeg.pl WordPress host serves GH-runner (Azure) IPs
// an ~12 KB challenge page — <title>Proszę czekać…</title> plus a
// setTimeout(() => location.reload(), 5000) script — instead of the real
// ~726 KB listing page (evidence: triage-brzeg artifact snapshot
// 024-brzeg.pl_gminne-nieruchomosci-do-sprzedazy_.html, run 2026-07-07).
// isWaitingRoom() is the detector crawl.js uses to retry the fetch and,
// failing that, throw a network-style error so triage classifies the run
// source-unreachable instead of layout-change.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isWaitingRoom } from '../src/cities/brzeg/crawl.js';

// Synthetic minimal waiting-room page: the two signals the detector requires
// (challenge title + self-reload script), shaped like the CI snapshot.
const WAITING_ROOM_HTML = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>Proszę czekać…</title>
<style>.spinner{width:40px;height:40px}</style>
</head>
<body>
<div class="spinner"></div>
<p>Trwa sprawdzanie przeglądarki…</p>
<script>setTimeout(() => window.location.reload(), 5000);</script>
</body>
</html>`;

// Real-page negative case: skeleton of the actual WordPress listing page
// (entry-content block, groundtruthed fields from parse-brzeg.test.js).
const REAL_PAGE_HTML = `<!DOCTYPE html>
<html lang="pl-PL">
<head><title>Gminne nieruchomości do sprzedaży – Urząd Miasta w Brzegu</title></head>
<body>
<div class="entry-content">
<p><strong>Lokal mieszkalny nr 1 przy ulicy 3 Maja 1</strong></p>
<p>Cena: 97 000,00 zł</p>
<p>Tryb sprzedaży: I przetarg</p>
<p>Termin przetargu: 18.09. 2024 r., godz. 9.00</p>
<p>Pokaż pełne ogłoszenie: https://bip.brzeg.pl/przetargi,9_1-2024-7_72</p>
</div>
</body>
</html>`;

test('isWaitingRoom: detects the Proszę czekać… challenge page', () => {
  assert.equal(isWaitingRoom(WAITING_ROOM_HTML), true);
});

test('isWaitingRoom: real listing page is not a waiting room', () => {
  assert.equal(isWaitingRoom(REAL_PAGE_HTML), false);
});

test('isWaitingRoom: challenge title WITHOUT the reload script is not enough', () => {
  const html =
    '<html><head><title>Proszę czekać…</title></head><body>Przerwa techniczna</body></html>';
  assert.equal(isWaitingRoom(html), false);
});

test('isWaitingRoom: reload script WITHOUT the challenge title is not enough', () => {
  const html =
    '<html><head><title>Aktualności</title></head>' +
    '<body><script>setTimeout(() => location.reload(), 5000)</script></body></html>';
  assert.equal(isWaitingRoom(html), false);
});

test('isWaitingRoom: tolerates the legacy-function reload variant', () => {
  const html =
    '<html><head><title>Proszę czekać…</title></head>' +
    '<body><script>setTimeout(function(){ window.location.reload(); }, 5000);</script></body></html>';
  assert.equal(isWaitingRoom(html), true);
});

test('isWaitingRoom: empty / missing input', () => {
  assert.equal(isWaitingRoom(''), false);
  assert.equal(isWaitingRoom(undefined), false);
  assert.equal(isWaitingRoom(null), false);
});
