import test from 'node:test';
import assert from 'node:assert/strict';

import { cities } from '../src/cities/index.js';
import {
  QUARANTINED, validatePolicyRegistry, validationPolicy,
} from '../scripts/validation-policy.js';

test('national validation enforces every city after source-backed remediation', () => {
  assert.deepEqual(validatePolicyRegistry(cities), {
    enforced: cities.length - QUARANTINED.size,
    quarantined: 0,
  });
  assert.equal(validationPolicy('gliwice').status, 'enforced');
  assert.equal(validationPolicy('brand-new-city').status, 'enforced');
  assert.equal(validationPolicy('wroclaw').status, 'enforced');
  assert.equal(validationPolicy('wroclaw').reason, null);
  assert.equal(validationPolicy('wroclaw').review_due, null);
  assert.equal(validationPolicy('wroclaw').since, '2026-10-19');
});
