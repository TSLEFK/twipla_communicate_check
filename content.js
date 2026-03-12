// content.js
// Injected into Twipla pages to check community membership for X/Twitter links.

(async function () {
  const COMMUNITY_ID = '1508768613662343173';

  function extractUsernameFromUrl(href) {
    try {
      const u = new URL(href);
      const host = u.hostname.toLowerCase();
      if (host !== 'x.com' && host !== 'twitter.com') {
        return null;
      }
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length === 0) return null;
      // the first segment should be the username
      return parts[0];
    } catch (e) {
      return null;
    }
  }

  function appendBadge(link) {
    const badge = document.createElement('span');
    badge.textContent = ' ✔ Community';
    badge.style.color = 'green';
    badge.style.fontWeight = 'bold';
    badge.style.marginLeft = '4px';
    link.parentNode.insertBefore(badge, link.nextSibling);
  }

  // wait for DOM content to load
  if (document.readyState === 'loading') {
    await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
  }

  try {
    const members = await getCommunityMembers(COMMUNITY_ID);
    if (!members || members.length === 0) {
      // nothing to check
      return;
    }

    const anchors = Array.from(
      document.querySelectorAll('a[href*="x.com/"], a[href*="twitter.com/"]')
    );
    const seen = new Set();

    for (const a of anchors) {
      const username = extractUsernameFromUrl(a.href);
      if (!username || seen.has(username.toLowerCase())) continue;
      seen.add(username.toLowerCase());
      if (members.includes(username)) {
        appendBadge(a);
      }
    }
  } catch (err) {
    console.error('Community check failed', err);
  }
})();
