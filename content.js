// content.js
// Injected into Twipla event pages to check community membership for participants.

(async function () {
  const COMMUNITY_ID = '1508768613662343173';

  /**
   * Extract username from Twipla participant link
   * @param {HTMLElement} link - The <a class="card namelist"> element
   * @returns {string|null} The username (without @) or null
   */
  function extractUsernameFromTwiplaLink(link) {
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
   * Append a community badge next to the user link
   * @param {HTMLElement} link - The <a> element
   */
  function appendBadge(link) {
    const badge = document.createElement('span');
    badge.textContent = '✔';
    badge.className = 'community-badge';
    badge.style.color = '#22c55e';
    badge.style.fontWeight = 'bold';
    badge.style.marginLeft = '4px';
    link.parentNode.insertBefore(badge, link.nextSibling);
  }

  // wait for DOM content to load
  if (document.readyState === 'loading') {
    await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
  }

  try {
    console.log('[X Community Checker] Starting community check for ID:', COMMUNITY_ID);
    const members = await getCommunityMembers(COMMUNITY_ID);
    console.log('[X Community Checker] Fetched members:', members);

    if (!members || members.length === 0) {
      console.log('[X Community Checker] No members found');
      return;
    }

    // Target Twipla participant links: <a class="card namelist">
    const participantLinks = Array.from(document.querySelectorAll('a.card.namelist'));
    console.log('[X Community Checker] Found participant links:', participantLinks.length);

    const processed = new Set();

    for (const link of participantLinks) {
      const username = extractUsernameFromTwiplaLink(link);
      if (!username) {
        console.warn('[X Community Checker] Could not extract username from link:', link);
        continue;
      }

      // Skip if already processed
      if (processed.has(username)) {
        continue;
      }
      processed.add(username);

      // Check membership (case-insensitive)
      const isMember = members.some((m) => m.toLowerCase() === username.toLowerCase());
      if (isMember) {
        console.log('[X Community Checker] Found community member:', username);
        appendBadge(link);
      }
    }

    console.log('[X Community Checker] Processing complete. Total processed:', processed.size);
  } catch (err) {
    console.error('[X Community Checker] Community check failed:', err);
  }
})();
        appendBadge(a);
      }
    }
  } catch (err) {
    console.error('Community check failed', err);
  }
})();
