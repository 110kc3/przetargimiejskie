import test from 'node:test';
import assert from 'node:assert/strict';

import { cities } from '../src/cities/index.js';
import {
  QUARANTINED, validatePolicyRegistry, validationPolicy,
} from '../scripts/validation-policy.js';

test('national validation is strict by default with one explicit remediation cohort', () => {
  assert.deepEqual(validatePolicyRegistry(cities), {
    enforced: cities.length - QUARANTINED.size,
    quarantined: 21,
  });
  assert.equal(validationPolicy('gliwice').status, 'enforced');
  assert.equal(validationPolicy('brand-new-city').status, 'enforced');
  assert.equal(validationPolicy('wroclaw').status, 'quarantined');
  assert.match(validationPolicy('wroclaw').reason, /legacy/);
  assert.equal(validationPolicy('wroclaw').review_due, '2026-10-06');
});
