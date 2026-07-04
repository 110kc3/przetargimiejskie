#!/usr/bin/env node
// Gate wrapper around `web-ext lint` for the Chrome MV3 extension.
//
// web-ext is a Mozilla tool: its linter targets Firefox / addons.mozilla.org
// and emits ERRORS that do not apply to a Chrome-only extension. We allowlist
// exactly those Firefox-only codes and fail the build only on a genuinely new
// error. Warnings are reported by web-ext but never block here (same spirit as
// sanity-check's non-blocking test-tier warnings). This keeps the lint green
// today yet red the moment a real problem (invalid manifest, disallowed API,
// broken structure) is introduced.
//
// Usage:  node scripts/check-extension-lint.mjs <path-to-web-ext-json>
// Produce the JSON with:
//   npx web-ext lint --source-dir extension --output json --self-hosted
//
// Lives in pipeline/scripts (all Node tooling does) but gates ../extension.

import { readFileSync } from 'node:fs';

// Firefox / AMO-only rules that are irrelevant to a Chrome MV3 build.
// Keep each entry documented. Do NOT add a code here just to silence a genuine
// Chrome-relevant error — that would defeat the point of the gate.
const FIREFOX_ONLY_ALLOWLIST = new Set([
  // Wants a background.scripts fallback for Firefox; Chrome MV3 legitimately
  // uses background.service_worker on its own.
  'BACKGROUND_SERVICE_WORKER_NOFALLBACK',
  // Firefox AMO requires browser_specific_settings.gecko.id; Chrome assigns the
  // ID at upload time and does not want it in the manifest.
  'ADDON_ID_REQUIRED',
]);

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('check-extension-lint: missing web-ext JSON path argument');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (err) {
  console.error(`check-extension-lint: could not read/parse ${jsonPath}: ${err.message}`);
  console.error('(web-ext lint may have crashed before emitting JSON — check the lint step log)');
  process.exit(2);
}

const errors = Array.isArray(report.errors) ? report.errors : [];
const warnings = Array.isArray(report.warnings) ? report.warnings : [];

const allowlisted = errors.filter((e) => FIREFOX_ONLY_ALLOWLIST.has(e.code));
const realErrors = errors.filter((e) => !FIREFOX_ONLY_ALLOWLIST.has(e.code));

if (realErrors.length > 0) {
  console.error(`check-extension-lint: FAIL — ${realErrors.length} error(s) not on the Firefox-only allowlist:\n`);
  for (const e of realErrors) {
    const where = e.file ? ` [${e.file}${e.line ? ':' + e.line : ''}]` : '';
    console.error(`  \u2717 ${e.code}${where}`);
    console.error(`    ${e.message}`);
  }
  process.exit(1);
}

console.log(
  `check-extension-lint: OK \u2014 0 real errors ` +
  `(${allowlisted.length} Firefox-only error(s) allowlisted, ${warnings.length} warning(s) ignored).`
);
process.exit(0);
