// Version-lockstep guard for the extension.
//
// CLAUDE.md requires extension/manifest.json `version` and the
// extension/popup.html `<span class="version">vX.Y.Z</span>` to always match —
// Chrome reads the manifest, the user only ever sees the popup label, so any
// drift makes the popup misreport which build is installed. It's a manual
// dual-write today; this turns a drift into a CI failure (runs in `npm test`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ext = (p) => fileURLToPath(new URL(`../../extension/${p}`, import.meta.url));

test('manifest.json and popup.html declare the same version', () => {
  const manifestVersion = JSON.parse(readFileSync(ext('manifest.json'), 'utf8')).version;
  assert.match(manifestVersion, /^\d+\.\d+\.\d+$/,
    `manifest.json version "${manifestVersion}" is not semver X.Y.Z`);

  const popup = readFileSync(ext('popup.html'), 'utf8');
  const m = /<span class="version">v(\d+\.\d+\.\d+)<\/span>/.exec(popup);
  assert.ok(m, 'popup.html is missing a <span class="version">vX.Y.Z</span> label');
  const popupVersion = m[1];

  assert.equal(popupVersion, manifestVersion,
    `version drift: manifest.json=${manifestVersion} but popup.html=v${popupVersion} — ` +
    `bump BOTH per CLAUDE.md (and add a CHANGELOG.md entry).`);
});

test('CHANGELOG.md top entry matches the manifest version', () => {
  // The popup version label is the only number a user sees, so CHANGELOG's
  // newest header is the answer to "what did this update do?" — keep it in sync.
  const manifestVersion = JSON.parse(readFileSync(ext('manifest.json'), 'utf8')).version;
  const changelog = readFileSync(fileURLToPath(new URL('../../CHANGELOG.md', import.meta.url)), 'utf8');
  const m = /^##\s+v(\d+\.\d+\.\d+)\b/m.exec(changelog);
  assert.ok(m, 'CHANGELOG.md has no "## vX.Y.Z" entry');
  assert.equal(m[1], manifestVersion,
    `CHANGELOG.md top entry is v${m[1]} but manifest is ${manifestVersion} — ` +
    `add the new version's changelog entry.`);
});
