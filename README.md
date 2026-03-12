# X Community Checker Chrome Extension

This repository implements a simple Google Chrome extension that inspects Twipla event pages and determines whether listed X (formerly Twitter) accounts belong to a specific X community. It was built according to the specification in `docs/specification.md`.

## Features

* Scrapes Twipla pages for `x.com` or `twitter.com` profile links.
* Fetches and caches members of a hard‑coded community using X's internal GraphQL API.
* Displays a green **✔ Community** badge next to links of members.
* Caches the member list in `chrome.storage.local` for one hour to minimize API calls.

## Installation (for development)

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable *Developer mode* (toggle in the top right).
3. Click **Load unpacked** and select this project's root directory (`x-community-checker/`).
4. Visit a Twipla event page (`https://twipla.jp/events/...`) while logged into X and verify badges appear.

## File structure

```
manifest.json      # MV3 manifest with permissions and content script declarations
storage.js         # Promise wrapper around chrome.storage.local
communityApi.js    # GraphQL fetcher + caching logic
content.js         # DOM manipulation on Twipla pages
```

## Configuration


* The community ID is currently hard‑coded in `content.js` as `1861234567890123456`.
* The GraphQL query ID used by the unofficial API lives in `communityApi.js` as `QUERY_ID`.  This value can change over time; update it if requests start failing.

## Notes

* This extension only operates when a Twipla page is open.
* Since the GraphQL API is private, it may break unexpectedly.  Updates to the extension will be required in that case.

## Future enhancements (not implemented)

Refer to the original specification for planned features such as multiple communities, blacklist badges, and participation analytics.


