import test from 'node:test';
import assert from 'node:assert/strict';
import { ownershipFraction } from '../src/core/ownership.js';

test('only an explicit proper ownership fraction adjusts the sanity comparison', () => {
  assert.equal(ownershipFraction('1/8'), 0.125);
  assert.equal(ownershipFraction('4/6'), 4 / 6);
  assert.equal(ownershipFraction('1/1'), 1);
  for (const value of ['640/100', '0/1', '1/0', '-1/2', '1/2 junk', null]) {
    assert.equal(ownershipFraction(value), null);
  }
});
