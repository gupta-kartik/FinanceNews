/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Mock fetch globally
global.fetch = jest.fn();

// Read the script.js file content
const scriptPath = path.join(__dirname, '..', 'public', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

describe('Frontend Script Coverage Tests', () => {
  let FinanceNewsApp;

  beforeAll(() => {
    // Execute the script to define the FinanceNewsApp class
    eval(scriptContent);
    FinanceNewsApp = global.FinanceNewsApp;
  });

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="newsGrid"></div>
      <div id="trendingContainer"></div>
      <div id="loading" style="display: none;"></div>
      <div id="errorMessage" style="display: none;"><p></p></div>
      <div id="lastUpdated"></div>
      <div id="newsCount"></div>
      <button id="refreshBtn"></button>
      <div id="trendingSection"></div>
    `;

    // Clear fetch mock
    fetch.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('FinanceNewsApp Class', () => {
    test('should initialize with correct properties', () => {
      const app = new FinanceNewsApp();
      
      expect(app.newsContainer).toBe(document.getElementById('newsGrid'));
      expect(app.trendingContainer).toBe(document.getElementById('trendingContainer'));
      expect(app.loadingElement).toBe(document.getElementById('loading'));
      expect(app.errorElement).toBe(document.getElementById('errorMessage'));
      expect(app.lastUpdatedElement).toBe(document.getElementById('lastUpdated'));
      expect(app.newsCountElement).toBe(document.getElementById('newsCount'));
      expect(app.refreshButton).toBe(document.getElementById('refreshBtn'));
      expect(app.trendingSection).toBe(document.getElementById('trendingSection'));
      expect(app.isLoading).toBe(false);
    });

    test('should bind events correctly', () => {
      const app = new FinanceNewsApp();
      const clickSpy = jest.spyOn(app, 'refresh');
      
      // Test refresh button click
      app.refreshButton.click();
      expect(clickSpy).toHaveBeenCalled();

      // Test keyboard shortcut
      const keyEvent = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true });
      document.dispatchEvent(keyEvent);
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });

    test('should load news successfully', async () => {
      const mockNewsData = {
        success: true,
        count: 2,
        news: [
          {
            title: 'Test News 1',
            summary: 'Test summary 1',
            source: 'Test Source',
            pubDate: new Date().toISOString(),
            link: 'https://test.com'
          },
          {
            title: 'Test News 2',
            summary: 'Test summary 2',
            source: 'Test Source',
            pubDate: new Date().toISOString(),
            link: 'https://test2.com'
          }
        ],
        lastUpdated: new Date().toISOString()
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNewsData)
      });

      const app = new FinanceNewsApp();
      await app.loadNews();

      expect(fetch).toHaveBeenCalledWith('/api/news');
      expect(app.newsContainer.innerHTML).toContain('Test News 1');
      expect(app.newsContainer.innerHTML).toContain('Test News 2');
    });

    test('should handle news loading errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const app = new FinanceNewsApp();
      const showErrorSpy = jest.spyOn(app, 'showError');
      
      await app.loadNews();

      expect(showErrorSpy).toHaveBeenCalledWith('Failed to load news. Please try again.');
    });

    test('should display no news message when empty', async () => {
      const mockEmptyData = {
        success: true,
        count: 0,
        news: [],
        lastUpdated: new Date().toISOString()
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmptyData)
      });

      const app = new FinanceNewsApp();
      await app.loadNews();

      expect(app.newsContainer.innerHTML).toContain('No financial news available');
    });

    test('should load trending news successfully', async () => {
      const mockTrendingData = {
        success: true,
        trending: [
          {
            title: 'Trending News 1',
            summary: 'Trending summary 1',
            source: 'Trending Source',
            pubDate: new Date().toISOString(),
            link: 'https://trending.com',
            trendingScore: 5
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrendingData)
      });

      const app = new FinanceNewsApp();
      await app.loadTrending();

      expect(fetch).toHaveBeenCalledWith('/api/trending');
      expect(app.trendingContainer.innerHTML).toContain('Trending News 1');
      expect(app.trendingSection.style.display).toBe('block');
    });

    test('should handle trending loading errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Trending API error'));

      const app = new FinanceNewsApp();
      await app.loadTrending();

      expect(app.trendingSection.style.display).toBe('none');
    });

    test('should hide trending section when no trending news', async () => {
      const mockEmptyTrending = {
        success: true,
        trending: []
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmptyTrending)
      });

      const app = new FinanceNewsApp();
      await app.loadTrending();

      expect(app.trendingSection.style.display).toBe('none');
    });

    test('should create news card with correct structure', () => {
      const app = new FinanceNewsApp();
      const article = {
        title: 'Test Article',
        summary: 'Test summary for the article',
        source: 'Test Source',
        pubDate: new Date().toISOString(),
        link: 'https://test.com'
      };

      const card = app.createNewsCard(article);

      expect(card).toContain('news-card');
      expect(card).toContain('Test Article');
      expect(card).toContain('Test summary for the article');
      expect(card).toContain('Test Source');
      expect(card).toContain('https://test.com');
    });

    test('should create trending card with correct structure', () => {
      const app = new FinanceNewsApp();
      const article = {
        title: 'Trending Article',
        summary: 'Trending summary',
        source: 'Trending Source',
        pubDate: new Date().toISOString(),
        link: 'https://trending.com'
      };

      const card = app.createTrendingCard(article);

      expect(card).toContain('trending-card');
      expect(card).toContain('Trending Article');
      expect(card).toContain('Trending summary');
    });

    test('should handle missing article data gracefully', () => {
      const app = new FinanceNewsApp();
      const incompleteArticle = {
        title: 'Test',
        // Missing other fields
      };

      const card = app.createNewsCard(incompleteArticle);

      expect(card).toContain('news-card');
      expect(card).toContain('Test');
    });

    test('should manage loading state correctly', () => {
      const app = new FinanceNewsApp();
      
      app.setLoading(true);
      expect(app.loadingElement.style.display).toBe('block');
      expect(app.isLoading).toBe(true);

      app.setLoading(false);
      expect(app.loadingElement.style.display).toBe('none');
      expect(app.isLoading).toBe(false);
    });

    test('should manage error messages', () => {
      const app = new FinanceNewsApp();
      const errorMessage = 'Test error message';
      
      app.showError(errorMessage);
      expect(app.errorElement.style.display).toBe('block');
      expect(app.errorElement.querySelector('p').textContent).toBe(errorMessage);

      app.hideError();
      expect(app.errorElement.style.display).toBe('none');
    });

    test('should update last updated timestamp', () => {
      const app = new FinanceNewsApp();
      const timestamp = new Date().toISOString();
      
      app.updateLastUpdated(timestamp);
      expect(app.lastUpdatedElement.textContent).toContain('Last updated');
    });

    test('should update news count', () => {
      const app = new FinanceNewsApp();
      const count = 15;
      
      app.updateNewsCount(count);
      expect(app.newsCountElement.textContent).toBe(`${count} articles`);
    });

    test('should truncate text correctly', () => {
      const app = new FinanceNewsApp();
      
      expect(app.truncateText('Short text', 20)).toBe('Short text');
      expect(app.truncateText('This is a very long text that should be truncated', 20)).toBe('This is a very lo...');
      expect(app.truncateText('', 10)).toBe('');
      expect(app.truncateText(null, 10)).toBe('');
    });

    test('should escape HTML correctly', () => {
      const app = new FinanceNewsApp();
      
      expect(app.escapeHtml('<script>alert("test")</script>')).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
      expect(app.escapeHtml('Safe text')).toBe('Safe text');
      expect(app.escapeHtml('')).toBe('');
      expect(app.escapeHtml(null)).toBe('');
    });

    test('should format time ago correctly', () => {
      const app = new FinanceNewsApp();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(app.getTimeAgo(oneHourAgo.toISOString())).toContain('hour');
      expect(app.getTimeAgo(oneDayAgo.toISOString())).toContain('day');
    });

    test('should handle invalid dates in time formatting', () => {
      const app = new FinanceNewsApp();
      
      const result = app.getTimeAgo('invalid-date');
      expect(typeof result).toBe('string');
    });

    test('should prevent multiple simultaneous refreshes', async () => {
      const app = new FinanceNewsApp();
      app.isLoading = true;
      
      const loadNewsSpy = jest.spyOn(app, 'loadNews');
      
      await app.refresh();
      
      expect(loadNewsSpy).not.toHaveBeenCalled();
    });

    test('should trigger refresh animation', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, news: [], trending: [] })
      });

      const app = new FinanceNewsApp();
      app.isLoading = false;
      
      await app.refresh();
      
      // Should have applied rotation transform
      expect(app.refreshButton.style.transform).toBe('rotate(0deg)');
    });

    test('should load both news and trending on refresh', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, news: [], trending: [] })
      });

      const app = new FinanceNewsApp();
      const loadNewsSpy = jest.spyOn(app, 'loadNews');
      const loadTrendingSpy = jest.spyOn(app, 'loadTrending');
      
      app.isLoading = false;
      await app.refresh();
      
      expect(loadNewsSpy).toHaveBeenCalled();
      expect(loadTrendingSpy).toHaveBeenCalled();
    });

    test('should set up auto-refresh interval', () => {
      const app = new FinanceNewsApp();
      const loadNewsSpy = jest.spyOn(app, 'loadNews');
      const loadTrendingSpy = jest.spyOn(app, 'loadTrending');
      
      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      expect(loadNewsSpy).toHaveBeenCalled();
      expect(loadTrendingSpy).toHaveBeenCalled();
    });

    test('should handle keyboard navigation with Meta key (Mac)', () => {
      const app = new FinanceNewsApp();
      const refreshSpy = jest.spyOn(app, 'refresh');
      
      const keyEvent = new KeyboardEvent('keydown', { key: 'r', metaKey: true });
      keyEvent.preventDefault = jest.fn();
      
      document.dispatchEvent(keyEvent);
      
      expect(keyEvent.preventDefault).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
    });

    test('should add fade-in animations to news cards', async () => {
      const mockNewsData = {
        success: true,
        count: 2,
        news: [
          {
            title: 'Test News 1',
            summary: 'Test summary 1',
            source: 'Test Source',
            pubDate: new Date().toISOString(),
            link: 'https://test.com'
          },
          {
            title: 'Test News 2',
            summary: 'Test summary 2',
            source: 'Test Source',
            pubDate: new Date().toISOString(),
            link: 'https://test2.com'
          }
        ],
        lastUpdated: new Date().toISOString()
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNewsData)
      });

      const app = new FinanceNewsApp();
      await app.loadNews();

      const newsCards = app.newsContainer.querySelectorAll('.news-card');
      expect(newsCards.length).toBe(2);
      
      newsCards.forEach((card, index) => {
        expect(card.classList.contains('fade-in')).toBe(true);
        expect(card.style.animationDelay).toBe(`${index * 50}ms`);
      });
    });

    test('should add fade-in animations to trending cards', async () => {
      const mockTrendingData = {
        success: true,
        trending: [
          {
            title: 'Trending News 1',
            summary: 'Trending summary 1',
            source: 'Trending Source',
            pubDate: new Date().toISOString(),
            link: 'https://trending.com'
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrendingData)
      });

      const app = new FinanceNewsApp();
      await app.loadTrending();

      const trendingCards = app.trendingContainer.querySelectorAll('.trending-card');
      expect(trendingCards.length).toBe(1);
      
      trendingCards.forEach((card, index) => {
        expect(card.classList.contains('fade-in')).toBe(true);
        expect(card.style.animationDelay).toBe(`${index * 100}ms`);
      });
    });
  });

  describe('DOM Event Listeners', () => {
    test('should initialize app when DOM is loaded', () => {
      // Test that the script sets up DOM event listener
      expect(scriptContent).toContain("document.addEventListener('DOMContentLoaded'");
    });

    test('should register service worker if available', () => {
      // Mock navigator.serviceWorker
      const mockServiceWorker = {
        register: jest.fn(() => Promise.resolve({ scope: '/' }))
      };
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true
      });

      // Execute service worker registration code
      const swCode = scriptContent.match(/if \('serviceWorker' in navigator\) \{[\s\S]*?\}\s*\}/);
      if (swCode) {
        eval(swCode[0]);
        
        // Trigger window load event
        window.dispatchEvent(new Event('load'));
        
        // Should attempt to register service worker
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      }
    });
  });
});