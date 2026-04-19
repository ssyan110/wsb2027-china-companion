import { describe, it, expect } from 'vitest';
import { app } from './index';

describe('backend health endpoint', () => {
  it('should have the express app defined', () => {
    expect(app).toBeDefined();
  });
});
