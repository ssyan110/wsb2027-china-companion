import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('fast-check integration', () => {
  it('should run property-based tests', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(typeof s).toBe('string');
      }),
    );
  });
});
