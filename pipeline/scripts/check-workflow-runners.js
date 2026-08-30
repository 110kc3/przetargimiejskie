#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const workflowsDir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url));
const workflowFiles = readdirSync(workflowsDir)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort();

const violations = [];
let runnerKeys = 0;

for (const file of workflowFiles) {
  const lines = readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    const match = /^\s*runs-on\s*:\s*(.*?)\s*(?:#.*)?$/.exec(line);
    if (!match) return;

    runnerKeys += 1;
    const runner = match[1].replace(/^(['"])(.*)\1$/, '$2');
    if (runner !== 'ubuntu-latest') {
      violations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (runnerKeys === 0) {
  console.error('Hosted-runner policy failed: no runs-on keys found.');
  process.exit(1);
}

if (violations.length > 0) {
  console.error('Hosted-runner policy failed. Every workflow job must use ubuntu-latest:');
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(`Hosted-runner policy passed: ${runnerKeys} jobs across ${workflowFiles.length} workflows.`);
