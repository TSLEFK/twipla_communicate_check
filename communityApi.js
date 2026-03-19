// communityApi.js
// Functions for fetching community members from X internal GraphQL API and handling caching.

const GRAPHQL_BASE = 'https://x.com/i/api/graphql';
// Updated endpoint - X API uses membersSliceTimeline_Query for community members
const QUERY_ENDPOINT = 'membersSliceTimeline_Query';
const PAGE_SIZE = 100; // Increased from 20 to 100 to reduce number of API calls
const CACHE_KEY = 'community_members';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

let cachedQueryId = null;

/**
 * Retrieve the GraphQL QueryID from the service worker.
 * Queries are automatically detected from x.com requests and cached.
 * If detection fails, falls back to a known QueryID list.
 */
async function getQueryId() {
  if (cachedQueryId) {
    return cachedQueryId;
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: 'getQueryId' });
    if (response.success) {
      cachedQueryId = response.queryId;
      return cachedQueryId;
    }
  } catch (err) {
    console.error('[X Community Checker] Error fetching QueryID:', err);
  }

  // Default fallback if message fails
  cachedQueryId = 'bJL6MePns78FJAY930RqDQ';
  console.warn('[X Community Checker] Using fallback QueryID:', cachedQueryId);
  return cachedQueryId;
}

// fetchCommunityPage fetches GraphQL data from X.com through the service worker
// Uses the new membersSliceTimeline_Query endpoint
async function fetchCommunityPage(communityId, cursor) {
  const queryId = await getQueryId();
  const url = `${GRAPHQL_BASE}/${queryId}/${QUERY_ENDPOINT}`;
  const variables = {
    communityId: communityId, // Note: uses 'communityId' not 'community_rest_id' for new endpoint
    count: PAGE_SIZE
  };
  if (cursor) variables.cursor = cursor;

  // GraphQL request body
  const body = {
    variables,
    extensions: {
      persistedQueryId: queryId
    }
  };

  // Relay the request through the service worker rather than calling fetch directly.
  // This avoids CORS restrictions that would apply when fetching from twipla.jp to x.com.
  const response = await chrome.runtime.sendMessage({
    action: 'fetchGraphQL',
    url,
    body
  });

  if (!response.success) {
    throw new Error(`GraphQL request failed: ${response.error}`);
  }

  return response.data;
}

/**
 * Retrieves all usernames in the given community by paginating through results.
 * @param {string|number} communityId
 * @returns {Promise<string[]>}
 */
async function fetchCommunityMembers(communityId) {
  let members = [];
  let cursor = null;
  let pageCount = 0;

  do {
    pageCount++;
    const data = await fetchCommunityPage(communityId, cursor);

    // New endpoint structure: membersSliceTimeline_Query
    const slice = data?.data?.communityResults?.result?.members_slice;
    if (!slice || !Array.isArray(slice.items_results)) {
      console.log('[X Community Checker] No items_results found in response');
      break;
    }

    for (const item of slice.items_results) {
      // New structure: item.result.core.screen_name
      const screenName = item?.result?.core?.screen_name;
      if (screenName) {
        members.push(screenName);
      }
    }

    // Get cursor for next page pagination
    // The cursor is nested in slice_info object
    cursor = slice.slice_info?.next_cursor || null;
    if (cursor) {
      // console.log('[X Community Checker] Next cursor found, will fetch page', pageCount + 1);
    }
  } while (cursor);

  console.log('[X Community Checker] finished fetching.');

  // remove duplicates just in case
  return Array.from(new Set(members));
}

/**
 * Returns cached members if they exist and are still fresh.
 */
async function getCachedMembers() {
  const cache = await storage.get(CACHE_KEY);
  if (!cache) return null;
  if (Date.now() - cache.lastUpdated > CACHE_TTL) {
    return null;
  }
  return cache.community_members || [];
}

/**
 * Store members list in local storage with timestamp.
 * @param {string[]} members
 */
async function setCachedMembers(members) {
  await storage.set({
    [CACHE_KEY]: {
      community_members: members,
      lastUpdated: Date.now()
    }
  });
}

/**
 * Public helper which returns the members list either from cache or from the API.
 * Optimized for speed: returns cache immediately, updates in background if expired.
 * @param {string|number} communityId
 * @returns {Promise<string[]>}
 */
async function getCommunityMembers(communityId) {
  let members = await getCachedMembers();

  // If cache exists and is fresh, return immediately
  if (members && members.length > 0) {
    // Update in background (don't await - return to user immediately)
    refreshCommunityMembersInBackground(communityId);
    return members;
  }

  // Cache is empty or expired - fetch fresh data
  console.log('[X Community Checker] Cache miss or expired, fetching fresh data...');
  members = await fetchCommunityMembers(communityId);
  await setCachedMembers(members);
  return members;
}

/**
 * Update cache in the background without blocking the response
 */
async function refreshCommunityMembersInBackground(communityId) {
  try {
    const freshMembers = await fetchCommunityMembers(communityId);
    await setCachedMembers(freshMembers);
  } catch (err) {
    console.warn('[X Community Checker] Background refresh failed:', err.message);
    // Silently fail - we already have cached data
  }
}
