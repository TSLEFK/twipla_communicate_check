// background.js
// Service worker that:
// 1. Relays GraphQL requests to avoid CORS issues
// 2. Automatically detects and stores GraphQL QueryID from x.com requests
// 3. Caches GraphQL responses for 24 hours to reduce API calls

const STORAGE_KEY_QUERY_ID = 'graphql_query_id';
const CACHE_TTL_MS = 60 * 60 * 24 * 1000; // 24時間

const COMMUNITY_MEMBERS_SLICE_PATTERN = /graphql\/([a-zA-Z0-9_-]+)\/(CommunityMembersSlice|membersSliceTimeline_Query)/;
const FALLBACK_QUERY_IDS = [
  'WSbJGJjZaVasSj9bnqSZSA', // membersSliceTimeline_Query (Mar 2026)
  'bJL6MePns78FJAY930RqDQ'   // CommunityMembersSlice (older, fallback)
];

// =====================
// キャッシュユーティリティ
// =====================

function buildCacheKey(url, variables) {
  const variablesStr = JSON.stringify(variables ?? {});
  return `gql_cache__${url}__${variablesStr}`;
}

async function getCachedResponse(cacheKey) {
  const result = await chrome.storage.local.get(cacheKey);
  const entry = result[cacheKey];
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    console.log('[X Community Checker] Cache expired, removing:', cacheKey);
    chrome.storage.local.remove(cacheKey);
    return null;
  }

  return entry.data;
}

async function setCachedResponse(cacheKey, data) {
  await chrome.storage.local.set({
    [cacheKey]: { data, timestamp: Date.now() }
  });
  console.log('[X Community Checker] Cache stored:', cacheKey);
}

async function clearGraphQLCache() {
  const allData = await chrome.storage.local.get(null);
  const graphqlKeys = Object.keys(allData).filter((k) => k.startsWith('gql_cache__'));
  if (graphqlKeys.length > 0) {
    await chrome.storage.local.remove(graphqlKeys);
    console.log(`[X Community Checker] Cleared ${graphqlKeys.length} cache entries`);
  }
}

// =====================
// UUID生成
// =====================

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =====================
// Cookie取得
// =====================

async function getCsrfToken() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: '.x.com' });
    const csrfCookie = cookies.find((c) => c.name === 'ct0');
    if (csrfCookie) {
      console.log('[X Community Checker] ct0 CSRF token found');
      return csrfCookie.value;
    }
  } catch (err) {
    console.warn('[X Community Checker] Failed to retrieve ct0 cookie:', err.message);
  }
  return null;
}

async function getAuthToken() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: '.x.com' });
    const authCookie = cookies.find((c) => c.name === 'auth_token');
    if (authCookie) {
      console.log('[X Community Checker] auth_token found');
      return authCookie.value;
    }
  } catch (err) {
    console.warn('[X Community Checker] Failed to retrieve auth_token:', err.message);
  }
  return null;
}

// =====================
// QueryID管理（TTLなし・検出時に即上書き）
// =====================

async function storeQueryId(queryId) {
  return chrome.storage.local.set({
    [STORAGE_KEY_QUERY_ID]: {
      queryId,
      detectedAt: Date.now()
    }
  });
}

async function getStoredQueryId() {
  const result = await chrome.storage.local.get(STORAGE_KEY_QUERY_ID);
  const data = result[STORAGE_KEY_QUERY_ID];
  return data ? data.queryId : null;
}

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

// =====================
// WebRequest監視（QueryID自動検出）
// =====================

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

// =====================
// メッセージハンドラ
// =====================

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

  } else if (request.action === 'clearGraphQLCache') {
    clearGraphQLCache()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// =====================
// GraphQLリクエスト
// =====================

async function handleGraphQLRequest(request) {
  // キャッシュチェック
  const cacheKey = buildCacheKey(request.url, request.body?.variables);
  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    console.log('[X Community Checker] ✓ Cache HIT:', cacheKey);
    return cached;
  }
  console.log('[X Community Checker] Cache MISS → fetching API');

  const csrfToken = await getCsrfToken();
  const authToken = await getAuthToken();

  const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const requestBody = request.body;
  console.log('[X Community Checker] === GraphQL Request Debug ===');
  console.log('[X Community Checker] URL:', request.url);
  console.log('[X Community Checker] Variables:', JSON.stringify(requestBody.variables));
  console.log('[X Community Checker] Auth token present:', !!authToken);
  console.log('[X Community Checker] CSRF token present:', !!csrfToken);

  const headers = {
    'content-type': 'application/json',
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'user-agent': USER_AGENT,
    'x-client-uuid': generateUUID(),
    'x-client-transaction-id': generateUUID(),
    'x-twitter-client-language': 'ja'
  };

  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  if (authToken) {
    headers['authorization'] = `Bearer ${authToken}`;
    console.log('[X Community Checker] Added Bearer authorization header');
  }

  console.log('[X Community Checker] Headers:', Object.keys(headers).join(', '));

  const response = await fetch(request.url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(requestBody)
  });

  console.log('[X Community Checker] === GraphQL Response ===');
  console.log('[X Community Checker] Status:', response.status);

  const text = await response.text();
  console.log('[X Community Checker] Response length:', text.length);

  if (text) {
    console.log('[X Community Checker] Response preview:', text.slice(0, 500));
  } else {
    console.log('[X Community Checker] Response body is empty');
  }

  if (response.status === 403) {
    console.error('[X Community Checker] ❌ 403 Forbidden');
    console.error('[X Community Checker] This usually means the API credentials or community ID is invalid.');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('[X Community Checker] JSON parse error:', e.message);
    throw new Error(
      `Failed to parse response as JSON. Status: ${response.status}, Body: ${text}`
    );
  }

  if (!response.ok) {
    console.error('[X Community Checker] ❌ GraphQL error:', data);
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // 成功時のみキャッシュ保存
  await setCachedResponse(cacheKey, data);

  console.log('[X Community Checker] ✓ GraphQL request successful');
  return data;
}