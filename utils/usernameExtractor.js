// utils/usernameExtractor.js
// Pure functions for extracting and normalizing usernames
// No side effects, easy to test

/**
 * Extract username from a Twipla participant link element
 * @param {HTMLElement} link - The <a class="card namelist"> element
 * @returns {string|null} The username (lowercase, without @) or null
 */
function extractUsernameFromTwiplaLink(link) {
  if (!link) return null;

  // Try to get from 's' attribute first (safer, direct username)
  let username = link.getAttribute('s');
  if (username) return username.toLowerCase();

  // Fallback: get from title attribute and remove @
  const title = link.getAttribute('title');
  if (title && title.startsWith('@')) {
    return title.substring(1).toLowerCase();
  }

  return null;
}

/**
 * Normalize username (remove @ prefix and convert to lowercase)
 * @param {string} username - Raw username string
 * @returns {string} Normalized username
 */
function normalizeUsername(username) {
  if (!username) return '';
  return username.replace(/^@/, '').toLowerCase();
}

/**
 * Check if a username is in the members list (case-insensitive)
 * @param {string} username - Username to check
 * @param {string[]} members - Array of member usernames
 * @returns {boolean} True if user is a member
 */
function isMember(username, members) {
  if (!username || !Array.isArray(members)) {
    return false;
  }
  const normalized = normalizeUsername(username);
  return members.some((m) => normalizeUsername(m) === normalized);
}

module.exports = {
  extractUsernameFromTwiplaLink,
  normalizeUsername,
  isMember
};
