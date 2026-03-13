// tests/cacheValidator.test.js

const {
  isCacheValid,
  getCacheTimeRemaining,
  createCacheObject,
  CACHE_TTL
} = require('../utils/cacheValidator');

describe('cacheValidator', () => {
  describe('isCacheValid', () => {
    it('should return true for recently updated cache', () => {
      const now = Date.now();
      const recentTime = now - 1000 * 60; // 1 minute ago
      expect(isCacheValid(recentTime)).toBe(true);
    });

    it('should return false for expired cache', () => {
      const now = Date.now();
      const expiredTime = now - CACHE_TTL - 1000; // 1 second past expiry
      expect(isCacheValid(expiredTime)).toBe(false);
    });

    it('should return false at exactly TTL boundary (slightly after)', () => {
      const now = Date.now();
      const boundaryTime = now - CACHE_TTL - 1;
      expect(isCacheValid(boundaryTime)).toBe(false);
    });

    it('should return true at just before TTL boundary', () => {
      const now = Date.now();
      const almostExpiredTime = now - CACHE_TTL + 1000;
      expect(isCacheValid(almostExpiredTime)).toBe(true);
    });

    it('should return false for null timestamp', () => {
      expect(isCacheValid(null)).toBe(false);
    });

    it('should return false for undefined timestamp', () => {
      expect(isCacheValid(undefined)).toBe(false);
    });

    it('should return false for non-numeric timestamp', () => {
      expect(isCacheValid('not-a-number')).toBe(false);
      expect(isCacheValid({})).toBe(false);
    });

    it('should return false for 0 timestamp', () => {
      // 0 would be Jan 1, 1970 - definitely expired
      expect(isCacheValid(0)).toBe(false);
    });
  });

  describe('getCacheTimeRemaining', () => {
    it('should return remaining time for valid cache', () => {
      const now = Date.now();
      const oneHourAgo = now - 1000 * 60 * 60; // 1 hour ago
      const remaining = getCacheTimeRemaining(oneHourAgo);
      
      // Should be approximately 23 hours remaining
      expect(remaining).toBeGreaterThan(1000 * 60 * 60 * 22);
      expect(remaining).toBeLessThan(1000 * 60 * 60 * 24);
    });

    it('should return 0 for expired cache', () => {
      const now = Date.now();
      const expiredTime = now - CACHE_TTL - 1000;
      expect(getCacheTimeRemaining(expiredTime)).toBe(0);
    });

    it('should return 0 for null timestamp', () => {
      expect(getCacheTimeRemaining(null)).toBe(0);
    });

    it('should return 0 for invalid timestamp', () => {
      expect(getCacheTimeRemaining('invalid')).toBe(0);
    });

    it('should return close to CACHE_TTL for fresh cache', () => {
      const now = Date.now();
      const remaining = getCacheTimeRemaining(now);
      expect(remaining).toBeCloseTo(CACHE_TTL, -3); // Within 1000ms
    });
  });

  describe('createCacheObject', () => {
    it('should create cache object with valid data', () => {
      const members = ['user1', 'user2', 'user3'];
      const communityId = '1508768613662343173';
      const cache = createCacheObject(members, communityId);

      expect(cache.community_members).toEqual(members);
      expect(cache.communityId).toBe(communityId);
      expect(typeof cache.lastUpdated).toBe('number');
      expect(cache.lastUpdated).toBeCloseTo(Date.now(), -2);
    });

    it('should handle empty members array', () => {
      const cache = createCacheObject([], 'communityId');
      expect(cache.community_members).toEqual([]);
    });

    it('should handle null members', () => {
      const cache = createCacheObject(null, 'communityId');
      expect(cache.community_members).toEqual([]);
    });

    it('should handle empty communityId', () => {
      const cache = createCacheObject(['user1'], null);
      expect(cache.communityId).toBe('');
    });

    it('should have current timestamp', () => {
      const before = Date.now();
      const cache = createCacheObject(['user1'], 'id');
      const after = Date.now();

      expect(cache.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(cache.lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('CACHE_TTL', () => {
    it('should be 24 hours in milliseconds', () => {
      const expectedTTL = 1000 * 60 * 60 * 24;
      expect(CACHE_TTL).toBe(expectedTTL);
    });
  });
});
