import { describe, it, expect } from 'vitest';
import {
  computeBackoffDelay,
  INITIAL_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  BACKOFF_FACTOR,
} from './sse';

describe('api/sse resilience', () => {
  describe('computeBackoffDelay', () => {
    it('scales delay with backoff factor within bounds', () => {
      // With jitterRatio 0, deterministic test
      const nextDelay = computeBackoffDelay(1000, 1000, 30000, 1.5, 0);
      expect(nextDelay).toBe(1500);

      const secondDelay = computeBackoffDelay(nextDelay, 1000, 30000, 1.5, 0);
      expect(secondDelay).toBe(2250);
    });

    it('enforces minDelay constraint', () => {
      const result = computeBackoffDelay(200, 1000, 30000, 1.5, 0);
      expect(result).toBeGreaterThanOrEqual(1000);
    });

    it('caps delay at maxDelay', () => {
      const result = computeBackoffDelay(25000, 1000, 30000, 2.0, 0);
      expect(result).toBe(30000);

      const excessResult = computeBackoffDelay(100000, 1000, 30000, 1.5, 0);
      expect(excessResult).toBe(30000);
    });

    it('applies jitter within specified ratio range', () => {
      const current = 2000;
      const factor = 1.5;
      const jitterRatio = 0.2; // +/- 20%
      const expectedBase = current * factor; // 3000
      const minExpected = expectedBase * (1 - jitterRatio); // 2400
      const maxExpected = expectedBase * (1 + jitterRatio); // 3600

      for (let i = 0; i < 50; i++) {
        const delay = computeBackoffDelay(current, 1000, 30000, factor, jitterRatio);
        expect(delay).toBeGreaterThanOrEqual(minExpected);
        expect(delay).toBeLessThanOrEqual(maxExpected);
      }
    });

    it('uses standard default constants properly', () => {
      const delay = computeBackoffDelay(INITIAL_RETRY_DELAY_MS);
      expect(delay).toBeGreaterThanOrEqual(INITIAL_RETRY_DELAY_MS * (1 - 0.2));
      expect(delay).toBeLessThanOrEqual(MAX_RETRY_DELAY_MS);
    });
  });
});
