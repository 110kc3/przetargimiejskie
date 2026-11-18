#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { findRunnerViolations } from '../src/core/workflow-runner-policy.js';

const workflowsDir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url));
const workflowFiles = readdirSync(workflowsDir)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort()
  .map((name) => ({ name, text: readFileSync(new URL(name, `file://${workflowsDir}`), 'utf8') }));

const { runnerKeys, violations } = findRunnerViolations(workflowFiles);

if (runnerKeys === 0) {
  console.error('Hosted-runner policy failed: no runs-on keys found.');
  process.exit(1);
}

if (violations.length > 0) {
  console.error('Hosted-runner policy failed. Every workflow job must use a GitHub-hosted Ubuntu label (ubuntu-latest or ubuntu-YY.MM):');
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log(`Hosted-runner policy passed: ${runnerKeys} jobs across ${workflowFiles.length} workflows.`);
