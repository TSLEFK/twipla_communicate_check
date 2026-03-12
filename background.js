// background.js
// Service worker that relays GraphQL requests to avoid CORS issues.
// Content scripts can't bypass CORS when calling x.com from twipla.jp,
// but service workers can fetch without CORS restrictions.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchGraphQL') {
    fetch(request.url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/javascript, */*; q=0.01'
      },
      body: JSON.stringify(request.body)
    })
      .then(async (response) => {
        // Always try to parse as JSON, regardless of status code.
        // X's GraphQL API may return JSON errors even for non-2xx responses.
        let data;
        try {
          data = await response.json();
        } catch (e) {
          // If JSON parsing fails, include the raw status and text.
          const text = await response.text();
          throw new Error(
            `Failed to parse response as JSON. Status: ${response.status}, Body: ${text.slice(0, 200)}`
          );
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`);
        }
        return data;
      })
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        console.error('GraphQL fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // keep the channel open for async response
  }
});
