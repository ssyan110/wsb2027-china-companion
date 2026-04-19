import { describe, it, expect } from 'vitest';

describe('shared package', () => {
  it('should be importable', async () => {
    const mod = await import('./index');
    expect(mod).toBeDefined();
  });
});
