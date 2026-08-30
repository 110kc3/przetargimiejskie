// Build the city list that can safely run on GitHub-hosted Azure runners.
//
// Adapters marked needsResidentialEgress remain registered and published, but
// are held out of the hosted crawl until the restricted proxy documented in
// PL-EGRESS-PLAN.md is deployed. Their committed data is still covered by the
// health check's short-lived, stale-only exemption.

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { cities } from '../src/cities/index.js';

export function buildRefreshMatrix(registry, onlyCity = '') {
  const selected = registry.filter((city) => !onlyCity || city.id === onlyCity);
  if (onlyCity && selected.length === 0) {
    throw new Error(`unknown city id: ${onlyCity}`);
  }

  const blocked = selected.filter((city) => city.needsResidentialEgress);
  if (onlyCity && blocked.length > 0) {
    throw new Error(
      `${onlyCity} requires residential egress; deploy the restricted proxy before dispatching it in GitHub Actions`,
    );
  }

  const hosted = selected.filter((city) => !city.needsResidentialEgress);
  return {
    cities: hosted.map((city) => city.id),
    render_cities: hosted.filter((city) => city.needsRender).map((city) => city.id),
    blocked_cities: blocked.map((city) => city.id),
  };
}

function main() {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) throw new Error('GITHUB_OUTPUT is required');

  const matrix = buildRefreshMatrix(cities, process.env.ONLY_CITY || '');
  for (const [name, value] of Object.entries(matrix)) {
    appendFileSync(outputPath, `${name}=${JSON.stringify(value)}\n`, 'utf8');
  }

  console.log(`Hosted refresh matrix: ${matrix.cities.length} cities`);
  if (matrix.blocked_cities.length > 0) {
    console.log(`Deferred pending restricted egress: ${matrix.blocked_cities.join(', ')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
