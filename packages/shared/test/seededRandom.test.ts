import { describe, it, expect } from 'bun:test';
import { SeededRNG } from '../src/utils/seededRandom';

describe('SeededRNG', () => {
  describe('deterministic behavior', () => {
    it('should produce same sequence with same seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(67890);

      const val1 = rng1.next();
      const val2 = rng2.next();

      expect(val1).not.toBe(val2);
    });
  });

  describe('next', () => {
    it('should return values between 0 and 1', () => {
      const rng = new SeededRNG(12345);

      for (let i = 0; i < 100; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('nextInt', () => {
    it('should return integers in range', () => {
      const rng = new SeededRNG(12345);

      for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(0, 10);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(10);
      }
    });

    it('should handle single value range', () => {
      const rng = new SeededRNG(12345);
      const val = rng.nextInt(5, 6);
      expect(val).toBe(5);
    });
  });

  describe('shuffle', () => {
    it('should shuffle array deterministically', () => {
      const arr = [1, 2, 3, 4, 5];
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      const shuffled1 = rng1.shuffle(arr);
      const shuffled2 = rng2.shuffle(arr);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('should preserve all elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const rng = new SeededRNG(12345);
      const shuffled = rng.shuffle(arr);

      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should not modify original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      const rng = new SeededRNG(12345);
      rng.shuffle(arr);

      expect(arr).toEqual(original);
    });
  });

  describe('choice', () => {
    it('should select from array', () => {
      const arr = ['a', 'b', 'c'];
      const rng = new SeededRNG(12345);
      const choice = rng.choice(arr);

      expect(arr).toContain(choice);
    });

    it('should be deterministic', () => {
      const arr = ['a', 'b', 'c'];
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      expect(rng1.choice(arr)).toBe(rng2.choice(arr));
    });

    it('should throw on empty array', () => {
      const rng = new SeededRNG(12345);
      expect(() => rng.choice([])).toThrow();
    });
  });

  describe('sample', () => {
    it('should sample N elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const rng = new SeededRNG(12345);
      const sample = rng.sample(arr, 3);

      expect(sample).toHaveLength(3);
      expect(new Set(sample).size).toBe(3); // All unique
    });

    it('should be deterministic', () => {
      const arr = [1, 2, 3, 4, 5];
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);

      expect(rng1.sample(arr, 3)).toEqual(rng2.sample(arr, 3));
    });

    it('should throw if N > array length', () => {
      const arr = [1, 2, 3];
      const rng = new SeededRNG(12345);
      expect(() => rng.sample(arr, 5)).toThrow();
    });
  });
});

