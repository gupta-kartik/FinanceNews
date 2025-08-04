// Simple utility function tests
describe('Utility Functions', () => {
  
  // Test isFinanceRelated function logic
  describe('Finance content filtering', () => {
    function isFinanceRelated(title, summary) {
      const financeKeywords = [
        'market', 'stock', 'share', 'equity', 'bond', 'nse', 'bse', 'sensex', 'nifty',
        'rupee', 'dollar', 'forex', 'rbi', 'interest rate', 'earnings', 'profit',
        'revenue', 'ipo', 'trading', 'investment', 'mutual fund', 'banking', 'finance',
        'economy', 'inflation', 'gdp', 'fiscal', 'monetary', 'corporate', 'dividend'
      ];
      
      const cryptoKeywords = ['bitcoin', 'crypto', 'cryptocurrency', 'blockchain', 'ethereum'];
      
      const text = (title + ' ' + summary).toLowerCase();
      
      // Exclude crypto news
      if (cryptoKeywords.some(keyword => text.includes(keyword))) {
        return false;
      }
      
      // Include finance-related news
      return financeKeywords.some(keyword => text.includes(keyword));
    }

    test('should identify finance-related content', () => {
      expect(isFinanceRelated('Sensex rises 200 points', 'Market gains on strong earnings')).toBe(true);
      expect(isFinanceRelated('RBI policy review', 'Interest rate decision pending')).toBe(true);
      expect(isFinanceRelated('Nifty crosses milestone', 'Stock market at record high')).toBe(true);
      expect(isFinanceRelated('Banking sector growth', 'Profit margins improve')).toBe(true);
    });

    test('should reject non-finance content', () => {
      expect(isFinanceRelated('Weather update', 'Heavy rain expected')).toBe(false);
      expect(isFinanceRelated('Sports news', 'Cricket match result')).toBe(false);
      expect(isFinanceRelated('Tech gadget', 'New smartphone launch')).toBe(false);
    });

    test('should exclude crypto content', () => {
      expect(isFinanceRelated('Bitcoin surges', 'Cryptocurrency market rally')).toBe(false);
      expect(isFinanceRelated('Ethereum trading', 'Blockchain technology advance')).toBe(false);
      expect(isFinanceRelated('Crypto news', 'Digital currency trends')).toBe(false);
    });
  });

  // Test trending score calculation logic
  describe('Trending score calculation', () => {
    function calculateTrendingScore(item) {
      let score = 0;
      const text = (item.title + ' ' + item.summary).toLowerCase();
      
      // Score based on important keywords
      const importantKeywords = ['sensex', 'nifty', 'rbi', 'earnings', 'ipo', 'rupee'];
      importantKeywords.forEach(keyword => {
        if (text.includes(keyword)) score += 2;
      });
      
      // Recent news gets higher score
      const hoursOld = (Date.now() - new Date(item.pubDate)) / (1000 * 60 * 60);
      if (hoursOld < 6) score += 3;
      else if (hoursOld < 12) score += 2;
      else if (hoursOld < 24) score += 1;
      
      return score;
    }

    test('should score recent news higher', () => {
      const recentNews = {
        title: 'Breaking news',
        summary: 'Latest update',
        pubDate: new Date().toISOString() // Now
      };
      
      const oldNews = {
        title: 'Breaking news',
        summary: 'Latest update',
        pubDate: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      };

      expect(calculateTrendingScore(recentNews)).toBeGreaterThan(calculateTrendingScore(oldNews));
    });

    test('should score keyword-rich content higher', () => {
      const keywordRichNews = {
        title: 'Sensex and Nifty surge on RBI policy',
        summary: 'Strong earnings boost rupee',
        pubDate: new Date().toISOString()
      };
      
      const basicNews = {
        title: 'Market news',
        summary: 'Update on trading',
        pubDate: new Date().toISOString()
      };

      expect(calculateTrendingScore(keywordRichNews)).toBeGreaterThan(calculateTrendingScore(basicNews));
    });

    test('should handle edge cases', () => {
      const emptyNews = {
        title: '',
        summary: '',
        pubDate: new Date().toISOString()
      };

      const score = calculateTrendingScore(emptyNews);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // Test text utility functions
  describe('Text utilities', () => {
    function truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    }

    function escapeHtml(text) {
      if (!text) return '';
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    test('should truncate text correctly', () => {
      expect(truncateText('Short text', 20)).toBe('Short text');
      expect(truncateText('This is a very long text that should be truncated', 20)).toBe('This is a very lo...');
      expect(truncateText('', 10)).toBe('');
      expect(truncateText(null, 10)).toBe('');
    });

    test('should escape HTML correctly', () => {
      expect(escapeHtml('<script>alert("test")</script>')).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
      expect(escapeHtml('Safe text')).toBe('Safe text');
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
    });
  });

  // Test time formatting
  describe('Time formatting', () => {
    function getTimeAgo(dateString) {
      try {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        return 'Just now';
      } catch (error) {
        return 'Unknown time';
      }
    }

    test('should format time correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(getTimeAgo(oneHourAgo.toISOString())).toContain('hour');
      expect(getTimeAgo(oneDayAgo.toISOString())).toContain('day');
      expect(getTimeAgo(now.toISOString())).toBe('Just now');
    });

    test('should handle invalid dates', () => {
      expect(getTimeAgo('invalid-date')).toBe('Unknown time');
      expect(getTimeAgo('')).toBe('Unknown time');
      expect(getTimeAgo(null)).toBe('Unknown time');
    });
  });

  // Test data validation
  describe('Data validation', () => {
    function validateNewsItem(item) {
      if (!item || typeof item !== 'object') return false;
      
      const requiredFields = ['title', 'summary', 'source', 'pubDate', 'link'];
      return requiredFields.every(field => 
        item.hasOwnProperty(field) && typeof item[field] === 'string'
      );
    }

    function validateApiResponse(response) {
      if (!response || typeof response !== 'object') return false;
      
      return response.hasOwnProperty('success') &&
             typeof response.success === 'boolean' &&
             response.hasOwnProperty('count') &&
             typeof response.count === 'number' &&
             Array.isArray(response.news);
    }

    test('should validate news items correctly', () => {
      const validItem = {
        title: 'Test Title',
        summary: 'Test Summary',
        source: 'Test Source',
        pubDate: '2024-01-01T00:00:00.000Z',
        link: 'https://test.com'
      };

      const invalidItem = {
        title: 'Test Title',
        // missing required fields
      };

      expect(validateNewsItem(validItem)).toBe(true);
      expect(validateNewsItem(invalidItem)).toBe(false);
      expect(validateNewsItem(null)).toBe(false);
    });

    test('should validate API responses correctly', () => {
      const validResponse = {
        success: true,
        count: 1,
        news: [],
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      const invalidResponse = {
        success: 'true', // should be boolean
        count: '1' // should be number
      };

      expect(validateApiResponse(validResponse)).toBe(true);
      expect(validateApiResponse(invalidResponse)).toBe(false);
      expect(validateApiResponse(null)).toBe(false);
    });
  });
});