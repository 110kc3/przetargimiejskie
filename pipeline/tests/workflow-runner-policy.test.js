import test from 'node:test';
import assert from 'node:assert/strict';

import { findRunnerViolations, isGitHubHostedUbuntuRunner, readRunsOnLabel } from '../src/core/workflow-runner-policy.js';

test('GitHub-hosted Ubuntu labels pass, including pinned versions', () => {
  for (const label of ['ubuntu-latest', 'ubuntu-24.04', 'ubuntu-22.04']) {
    assert.equal(isGitHubHostedUbuntuRunner(label), true, label);
  }
});

test('self-hosted, expression and other-OS runners are rejected', () => {
  for (const label of ['self-hosted', '[self-hosted, linux]', '${{ matrix.os }}', 'windows-latest', 'ubuntu-24.04-custom', 'my-ubuntu-latest']) {
    assert.equal(isGitHubHostedUbuntuRunner(label), false, label);
  }
});

test('runs-on labels are read with quotes and trailing comments removed', () => {
  assert.equal(readRunsOnLabel("    runs-on: 'ubuntu-24.04' # Playwright"), 'ubuntu-24.04');
  assert.equal(readRunsOnLabel('    steps:'), null);
});

test('violations name the workflow file and line', () => {
  const result = findRunnerViolations([
    { name: 'a.yml', text: 'jobs:\n  x:\n    runs-on: ubuntu-24.04\n  y:\n    runs-on: self-hosted\n' },
  ]);
  assert.equal(result.runnerKeys, 2);
  assert.deepEqual(result.violations, ['a.yml:5: runs-on: self-hosted']);
});
