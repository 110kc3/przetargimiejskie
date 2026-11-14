import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PUBLICATION_COMMIT_PATTERN = '^data: refresh cities';
const MS_PER_DAY = 86_400_000;

export function evaluatePublicationFreshness({ newestPublicationIso, now, maxAgeDays }) {
  const publishedAt = Date.parse(newestPublicationIso || '');
  if (Number.isNaN(publishedAt)) {
    return {
      ok: false,
      ageDays: Infinity,
      summary: `Municipal publication stalled: no "data: refresh cities" commit found in the available history`,
    };
  }
  const ageDays = (now - publishedAt) / MS_PER_DAY;
  const ok = ageDays <= maxAgeDays;
  const summary = ok
    ? `Municipal publication fresh: newest "data: refresh cities" commit is ${ageDays.toFixed(1)} days old (limit ${maxAgeDays})`
    : `Municipal publication stalled: newest "data: refresh cities" commit is ${ageDays.toFixed(1)} days old (limit ${maxAgeDays}), published ${newestPublicationIso}`;
  return { ok, ageDays, summary };
}

export function newestPublicationCommitDate(git = execFileSync) {
  const output = git('git', [
    'log', '-1', '--format=%cI', `--grep=${PUBLICATION_COMMIT_PATTERN}`,
  ], { encoding: 'utf8' });
  return output.trim();
}

function main() {
  const maxAgeDays = Number(process.env.PUBLICATION_MAX_AGE_DAYS || 2);
  const result = evaluatePublicationFreshness({
    newestPublicationIso: newestPublicationCommitDate(),
    now: Date.now(),
    maxAgeDays,
  });
  console.error(result.summary);
  if (process.env.PUBLICATION_SUMMARY_OUT) writeFileSync(process.env.PUBLICATION_SUMMARY_OUT, `${result.summary}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
