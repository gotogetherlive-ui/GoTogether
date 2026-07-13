import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CancellationPolicyEngine } from '../cancellation-policy-engine';

const amount = 10000;

function tripDate(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

describe('CancellationPolicyEngine platform refund windows', () => {
  test('refunds 100% when cancelled 72 or more hours before trip start', () => {
    const result = CancellationPolicyEngine.calculateRefund(
      { amount, trip_date: tripDate(73) }
    );

    assert.equal(result.allowed, true);
    assert.equal(result.refundPercentage, 100);
    assert.equal(result.refundAmount, amount);
    assert.equal(result.cancellationFee, 0);
  });

  test('refunds 50% when cancelled from 24 hours up to 72 hours before trip start', () => {
    const result = CancellationPolicyEngine.calculateRefund(
      { amount, trip_date: tripDate(48) }
    );

    assert.equal(result.allowed, true);
    assert.equal(result.refundPercentage, 50);
    assert.equal(result.refundAmount, 5000);
    assert.equal(result.cancellationFee, 5000);
  });

  test('allows cancellation with no refund under 24 hours before trip start', () => {
    const result = CancellationPolicyEngine.calculateRefund(
      { amount, trip_date: tripDate(12) }
    );

    assert.equal(result.allowed, true);
    assert.equal(result.refundPercentage, 0);
    assert.equal(result.refundAmount, 0);
    assert.equal(result.cancellationFee, amount);
  });

  test('blocks cancellation after the trip has started', () => {
    const result = CancellationPolicyEngine.calculateRefund(
      { amount, trip_date: tripDate(-1) }
    );

    assert.equal(result.allowed, false);
    assert.equal(result.refundPercentage, 0);
    assert.equal(result.refundAmount, 0);
    assert.equal(result.cancellationFee, amount);
  });
});
