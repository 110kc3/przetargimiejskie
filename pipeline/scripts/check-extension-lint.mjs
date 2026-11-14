#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const FIREFOX_ONLY_ALLOWLIST = new Set([
  'BACKGROUND_SERVICE_WORKER_NOFALLBACK',
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
