// communityApi.js
// Functions for fetching community members from X internal GraphQL API and handling caching.

// NOTE: this relies on an internal, undocumented API and the queryId may change.
// update QUERY_ID when necessary.
const GRAPHQL_BASE = 'https://x.com/i/api/graphql';
const QUERY_ID = 'CommunityMembers'; // placeholder, may need real value
const PAGE_SIZE = 1000;
const CACHE_KEY = 'community_members';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchCommunityPage(communityId, cursor) {
  const url = new URL(`${GRAPHQL_BASE}/${QUERY_ID}/CommunityMembers`);
  url.searchParams.set('communityId', communityId);
  url.searchParams.set('count', PAGE_SIZE);
  if (cursor) url.searchParams.set('cursor', cursor);

  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      'accept': 'application/json, text/javascript, */*; q=0.01'
    }
  });
  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }
  return response.json();
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
    const slice = data?.data?.communityMembersSlice;
    if (!slice || !Array.isArray(slice.items)) break;

    for (const item of slice.items) {
      const name = item?.user_results?.result?.legacy?.screen_name;
      if (name) members.push(name);
    }
    cursor = slice.cursor || slice.next_cursor;
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
