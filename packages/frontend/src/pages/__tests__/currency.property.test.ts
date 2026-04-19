/**
 * @vitest-environment node
 *
 * Property 24: Currency conversion round-trip
 * **Validates: Requirements 11.1, 11.2**
 *
 * For any amount A and rate R, converting A from CNY to USD and back
 * should yield approximately A (within floating point tolerance).
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { convertCurrency } from '../CurrencyConverter';

describe('Property 24: Currency conversion round-trip', () => {
  it('converting CNY→USD→CNY should yield approximately the original amount', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (amount, rate) => {
          const usd = convertCurrency(amount, rate, 'cny-to-usd');
          const backToCny = convertCurrency(usd, rate, 'usd-to-cny');
          const tolerance = Math.max(Math.abs(amount) * 1e-10, 1e-10);
          expect(Math.abs(backToCny - amount)).toBeLessThanOrEqual(tolerance);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('converting USD→CNY→USD should yield approximately the original amount', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (amount, rate) => {
          const cny = convertCurrency(amount, rate, 'usd-to-cny');
          const backToUsd = convertCurrency(cny, rate, 'cny-to-usd');
          const tolerance = Math.max(Math.abs(amount) * 1e-10, 1e-10);
          expect(Math.abs(backToUsd - amount)).toBeLessThanOrEqual(tolerance);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('converting 0 in either direction should return 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }),
        (rate) => {
          expect(convertCurrency(0, rate, 'cny-to-usd')).toBe(0);
          expect(convertCurrency(0, rate, 'usd-to-cny')).toBe(0);
        },
      ),
      { numRuns: 50 },
    );
  });
});
