// Build the city list that can safely run on GitHub-hosted Azure runners.
//
// Adapters marked needsResidentialEgress remain registered and published, but
// are deliberately held out of hosted automation. They are refreshed by an
// operator on suitable egress and covered by a short-lived, stale-only health
// exemption so this policy cannot become a silent permanent blind spot.

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { cities } from '../src/cities/index.js';

export function buildRefreshMatrix(registry, onlyCity = '') {
  const selected = registry.filter((city) => !onlyCity || city.id === onlyCity);
  if (onlyCity && selected.length === 0) {
    throw new Error(`unknown city id: ${onlyCity}`);
  }

  const egressCities = selected.filter((city) => city.needsResidentialEgress);
  if (onlyCity && egressCities.length > 0) {
    throw new Error(
      `${onlyCity} requires operator-managed residential egress and cannot run in GitHub Actions`,
    );
  }

  const hosted = selected.filter((city) => !city.needsResidentialEgress);
  return {
    cities: hosted.map((city) => city.id),
    render_cities: hosted.filter((city) => city.needsRender).map((city) => city.id),
    blocked_cities: egressCities.map((city) => city.id),
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
    console.log(`Operator-managed residential-egress cities excluded: ${matrix.blocked_cities.join(', ')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
