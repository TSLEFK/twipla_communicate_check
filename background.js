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
      .then((response) => response.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // keep the channel open for async response
  }
});
