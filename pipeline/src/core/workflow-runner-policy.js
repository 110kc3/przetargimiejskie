const GITHUB_HOSTED_UBUNTU_LABEL = /^ubuntu-(?:latest|\d{2}\.\d{2})$/;

export function isGitHubHostedUbuntuRunner(label) {
  return GITHUB_HOSTED_UBUNTU_LABEL.test(label);
}

export function readRunsOnLabel(line) {
  const match = /^\s*runs-on\s*:\s*(.*?)\s*(?:#.*)?$/.exec(line);
  if (!match) return null;
  return match[1].replace(/^(['"])(.*)\1$/, '$2');
}

export function findRunnerViolations(workflowFiles) {
  const violations = [];
  let runnerKeys = 0;
  for (const { name, text } of workflowFiles) {
    text.split(/\r?\n/).forEach((line, index) => {
      const label = readRunsOnLabel(line);
      if (label === null) return;
      runnerKeys += 1;
      if (!isGitHubHostedUbuntuRunner(label)) violations.push(`${name}:${index + 1}: ${line.trim()}`);
    });
  }
  return { runnerKeys, violations };
}
