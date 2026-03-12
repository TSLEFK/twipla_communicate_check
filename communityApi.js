// communityApi.js
// Functions for fetching community members from X internal GraphQL API and handling caching.

// NOTE: this relies on an internal, undocumented API and the queryId may change.
// update QUERY_ID when necessary.
const GRAPHQL_BASE = 'https://x.com/i/api/graphql';
const QUERY_ID = 'bJL6MePns78FJAY930RqDQ';
const QUERY_ENDPOINT = 'CommunityMembersSlice';
const PAGE_SIZE = 20;
const CACHE_KEY = 'community_members';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// fetchCommunityPage fetches GraphQL data from X.com through the service worker
// to avoid CORS errors when called from Twipla pages.
async function fetchCommunityPage(communityId, cursor) {
  const url = `${GRAPHQL_BASE}/${QUERY_ID}/${QUERY_ENDPOINT}`;
  const variables = {
    community_rest_id: communityId,
    count: PAGE_SIZE
  };
  if (cursor) variables.cursor = cursor;

  // Relay the request through the service worker rather than calling fetch directly.
  // This avoids CORS restrictions that would apply when fetching from twipla.jp to x.com.
  const response = await chrome.runtime.sendMessage({
    action: 'fetchGraphQL',
    url,
    body: { variables }
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

  do {
    const data = await fetchCommunityPage(communityId, cursor);
    const slice = data?.data?.community_by_rest_id?.members_slice;
    if (!slice || !Array.isArray(slice.items)) break;

    for (const item of slice.items) {
      const screenName = item?.result?.community_relationship?.user_results?.result?.legacy?.screen_name;
      if (screenName) members.push(screenName);
    }
    cursor = slice.continuation || slice.cursor || slice.next_cursor;
  } while (cursor);

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
 * @param {string|number} communityId
 * @returns {Promise<string[]>}
 */
async function getCommunityMembers(communityId) {
  let members = await getCachedMembers();
  if (members && members.length) {
    return members;
  }
  members = await fetchCommunityMembers(communityId);
  await setCachedMembers(members);
  return members;
}
