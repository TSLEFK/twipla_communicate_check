// tests/usernameExtractor.test.js

const {
  extractUsernameFromTwiplaLink,
  normalizeUsername,
  isMember
} = require('../utils/usernameExtractor');

describe('usernameExtractor', () => {
  describe('extractUsernameFromTwiplaLink', () => {
    it('should extract username from s attribute', () => {
      const mockLink = {
        getAttribute: (attr) => {
          if (attr === 's') return 'okojo417';
          return null;
        }
      };
      expect(extractUsernameFromTwiplaLink(mockLink)).toBe('okojo417');
    });

    it('should extract username from title attribute and remove @', () => {
      const mockLink = {
        getAttribute: (attr) => {
          if (attr === 's') return null;
          if (attr === 'title') return '@kakaro_tto';
          return null;
        }
      };
      expect(extractUsernameFromTwiplaLink(mockLink)).toBe('kakaro_tto');
    });

    it('should convert username to lowercase', () => {
      const mockLink = {
        getAttribute: (attr) => {
          if (attr === 's') return 'OkOjo417';
          return null;
        }
      };
      expect(extractUsernameFromTwiplaLink(mockLink)).toBe('okojo417');
    });

    it('should return null if link is null', () => {
      expect(extractUsernameFromTwiplaLink(null)).toBe(null);
    });

    it('should return null if no attributes found', () => {
      const mockLink = {
        getAttribute: () => null
      };
      expect(extractUsernameFromTwiplaLink(mockLink)).toBe(null);
    });

    it('should normalize title with various formats', () => {
      const mockLink = {
        getAttribute: (attr) => {
          if (attr === 's') return null;
          if (attr === 'title') return '@UserName123';
          return null;
        }
      };
      expect(extractUsernameFromTwiplaLink(mockLink)).toBe('username123');
    });
  });

  describe('normalizeUsername', () => {
    it('should remove @ prefix', () => {
      expect(normalizeUsername('@okojo417')).toBe('okojo417');
    });

    it('should convert to lowercase', () => {
      expect(normalizeUsername('OKoJo417')).toBe('okojo417');
    });

    it('should handle @Username format', () => {
      expect(normalizeUsername('@KaKaRo_TTo')).toBe('kakaro_tto');
    });

    it('should return empty string for null/undefined', () => {
      expect(normalizeUsername(null)).toBe('');
      expect(normalizeUsername(undefined)).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(normalizeUsername('')).toBe('');
    });
  });

  describe('isMember', () => {
    const members = ['okojo417', 'kakaro_tto', 'user_three'];

    it('should return true if username is in members list', () => {
      expect(isMember('okojo417', members)).toBe(true);
    });

    it('should return true for case-insensitive match', () => {
      expect(isMember('OKOJO417', members)).toBe(true);
      expect(isMember('KaKaRo_TTo', members)).toBe(true);
    });

    it('should return true for username with @ prefix', () => {
      expect(isMember('@okojo417', members)).toBe(true);
    });

    it('should return false if username not in members list', () => {
      expect(isMember('nonexistent_user', members)).toBe(false);
    });

    it('should return false for null username', () => {
      expect(isMember(null, members)).toBe(false);
    });

    it('should return false for null members array', () => {
      expect(isMember('okojo417', null)).toBe(false);
    });

    it('should return false for empty members array', () => {
      expect(isMember('okojo417', [])).toBe(false);
    });

    it('should return false for non-array members', () => {
      expect(isMember('okojo417', 'not-an-array')).toBe(false);
    });
  });
});
