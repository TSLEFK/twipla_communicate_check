// utils/cacheValidator.js
// Pure functions for validating and managing cache

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

/**
 * Check if cache is still valid
 * @param {number} lastUpdated - Unix timestamp in milliseconds
 * @returns {boolean} True if cache is still valid
 */
function isCacheValid(lastUpdated) {
  if (!lastUpdated || typeof lastUpdated !== 'number') {
    return false;
  }
  const now = Date.now();
  const age = now - lastUpdated;
  return age < CACHE_TTL;
}

/**
 * Get the time remaining for cache validity
 * @param {number} lastUpdated - Unix timestamp in milliseconds
 * @returns {number} Milliseconds until cache expires (0 if already expired)
 */
function getCacheTimeRemaining(lastUpdated) {
  if (!isCacheValid(lastUpdated)) {
    return 0;
  }
  return CACHE_TTL - (Date.now() - lastUpdated);
}

/**
 * Create a cache object with current timestamp
 * @param {string[]} members - Array of member usernames
 * @param {string} communityId - Community ID
 * @returns {object} Cache object
 */
function createCacheObject(members, communityId) {
  return {
    community_members: Array.isArray(members) ? members : [],
    lastUpdated: Date.now(),
    communityId: communityId || ''
  };
}

module.exports = {
  isCacheValid,
  getCacheTimeRemaining,
  createCacheObject,
  CACHE_TTL
};
