import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ONBOARDING_COHORT } from './cities/onboarding-cohort.js';

const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

export function hasPublishedData(cityId, dataDir = DEFAULT_DATA_DIR) {
  return existsSync(join(dataDir, cityId, 'meta.json'));
}

export function isInRefreshCohort(cityId, { dataDir = DEFAULT_DATA_DIR, onboarding = ONBOARDING_COHORT } = {}) {
  return onboarding.has(cityId) || hasPublishedData(cityId, dataDir);
}

export function selectRefreshCohort(registry, options = {}) {
  return registry.filter((city) => isInRefreshCohort(city.id, options));
}
