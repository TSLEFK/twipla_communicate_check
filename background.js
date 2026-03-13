// background.js
// Service worker that:
// 1. Relays GraphQL requests to avoid CORS issues
// 2. Automatically detects and stores GraphQL QueryID from x.com requests

const STORAGE_KEY_QUERY_ID = 'graphql_query_id';
const COMMUNITY_MEMBERS_SLICE_PATTERN = /graphql\/([a-zA-Z0-9_-]+)\/CommunityMembersSlice/;
const FALLBACK_QUERY_IDS = [
  'bJL6MePns78FJAY930RqDQ' // As of Mar 2026
];

/**
 * Generate a UUID v4 string for x-client-uuid header
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieve CSRF token from X.com cookies or local storage
 * X.com uses ct0 cookie for CSRF protection
 */
async function getCsrfToken() {
  try {
    // Try to get from cookies
    const cookies = await chrome.cookies.getAll({ domain: '.x.com' });
    const csrfCookie = cookies.find((c) => c.name === 'ct0');
    if (csrfCookie) {
      return csrfCookie.value;
    }
  } catch (err) {
    console.warn('[X Community Checker] Failed to retrieve CSRF from cookies:', err);
  }
  
  // Fallback: generate a placeholder UUID if cookie not available
  return generateUUID();
}

/**
 * Store the detected QueryID in chrome.storage.local
 */
async function storeQueryId(queryId) {
  return chrome.storage.local.set({
    [STORAGE_KEY_QUERY_ID]: {
      queryId: queryId,
      detectedAt: Date.now()
    }
  });
}

/**
 * Retrieve previously detected QueryID from storage
 */
async function getStoredQueryId() {
  const result = await chrome.storage.local.get(STORAGE_KEY_QUERY_ID);
  const data = result[STORAGE_KEY_QUERY_ID];
  return data ? data.queryId : null;
}

/**
 * Get the GraphQL QueryID (stored or fallback)
 */
async function getGraphqlQueryId() {
  try {
    const storedId = await getStoredQueryId();
    if (storedId) {
      return storedId;
    }
  } catch (err) {
    console.error('[X Community Checker] Error retrieving stored QueryID:', err);
  }
  
  console.warn('[X Community Checker] Using fallback QueryID');
  return FALLBACK_QUERY_IDS[0];
}

// Monitor requests to detect QueryID changes
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const match = details.url.match(COMMUNITY_MEMBERS_SLICE_PATTERN);
    if (match && match[1]) {
      const detectedQueryId = match[1];
      storeQueryId(detectedQueryId).catch((err) => {
        console.error('[X Community Checker] Failed to store QueryID:', err);
      });
    }
  },
  { urls: ['https://x.com/*'] }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchGraphQL') {
    handleGraphQLRequest(request)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('GraphQL fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === 'getQueryId') {
    getGraphqlQueryId()
      .then((queryId) => {
        sendResponse({ success: true, queryId });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

/**
 * Handle GraphQL request with proper headers and CORS handling
 */
async function handleGraphQLRequest(request) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(request.url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'user-agent': navigator.userAgent,
      'x-client-uuid': generateUUID(),
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify(request.body)
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Failed to parse response as JSON. Status: ${response.status}, Body: ${text.slice(0, 200)}`
    );
  }
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  
  console.log('GraphQL response:', data);
  return data;
}
