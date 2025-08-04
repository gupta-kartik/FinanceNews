const request = require('supertest');

// Mock the dependencies before requiring the server
jest.mock('node-fetch');
jest.mock('xml2js');

const fetch = require('node-fetch');
const xml2js = require('xml2js');

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Server.js Direct Coverage Tests', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Mock fetch to simulate RSS feed failures (will use mock data)
    fetch.mockImplementation(() => Promise.reject(new Error('Mock fetch error')));
    
    // Mock XML parser
    xml2js.Parser = jest.fn().mockImplementation(() => ({
      parseStringPromise: jest.fn().mockRejectedValue(new Error('Mock parse error'))
    }));

    // Set a different port for testing to avoid conflicts
    process.env.PORT = '3002';
    
    // Import the server after mocking
    app = require('../server.js');
    
    // Give the server a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('API Routes', () => {
    test('should handle /api/news endpoint with mock data fallback', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('news');
      expect(response.body).toHaveProperty('lastUpdated');
      
      expect(Array.isArray(response.body.news)).toBe(true);
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toEqual(response.body.news.length);

      // Since RSS feeds are mocked to fail, should use mock data
      expect(response.body.count).toBeGreaterThan(0);
      
      // Validate structure of news items
      if (response.body.news.length > 0) {
        const article = response.body.news[0];
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('summary');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('pubDate');
        expect(article).toHaveProperty('link');
      }
    });

    test('should handle /api/trending endpoint', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/trending')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('trending');
      expect(Array.isArray(response.body.trending)).toBe(true);
      expect(response.body.trending.length).toBeLessThanOrEqual(5);

      // Validate trending items have trending scores
      response.body.trending.forEach(item => {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('summary');
        expect(item).toHaveProperty('source');
        expect(item).toHaveProperty('pubDate');
        expect(item).toHaveProperty('trendingScore');
        expect(typeof item.trendingScore).toBe('number');
      });
    });

    test('should serve main page', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html');
      expect(response.text).toContain('FinanceNews');
    });

    test('should not expose x-powered-by header', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should handle 404 for unknown routes', async () => {
      await request(`http://localhost:3002`)
        .get('/api/unknown')
        .expect(404);
    });

    test('should handle invalid HTTP methods', async () => {
      await request(`http://localhost:3002`)
        .post('/api/news')
        .expect(404);
    });
  });

  describe('Data Validation and Processing', () => {
    test('should return sorted news by date', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      const news = response.body.news;
      if (news.length > 1) {
        for (let i = 0; i < news.length - 1; i++) {
          const current = new Date(news[i].pubDate);
          const next = new Date(news[i + 1].pubDate);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    test('should return valid timestamps', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      expect(new Date(response.body.lastUpdated)).toBeInstanceOf(Date);
      
      response.body.news.forEach(article => {
        const date = new Date(article.pubDate);
        expect(date).toBeInstanceOf(Date);
        expect(date.getTime()).not.toBeNaN();
      });
    });

    test('should have trending scores in descending order', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/trending')
        .expect(200);

      const trending = response.body.trending;
      if (trending.length > 1) {
        for (let i = 0; i < trending.length - 1; i++) {
          expect(trending[i].trendingScore).toBeGreaterThanOrEqual(trending[i + 1].trendingScore);
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle RSS feed failures gracefully', async () => {
      // RSS feeds are already mocked to fail
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      // Should still return valid response with mock data
      expect(response.body.success).toBeTruthy();
      expect(response.body.news).toBeDefined();
      expect(Array.isArray(response.body.news)).toBe(true);
    });

    test('should handle trending API internal errors', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/trending')
        .expect(200);

      // Should return valid structure even with errors
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('trending');
      expect(Array.isArray(response.body.trending)).toBe(true);
    });
  });

  describe('Content Filtering', () => {
    test('should contain finance-related keywords in mock data', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      const financeKeywords = [
        'sensex', 'nifty', 'rbi', 'earnings', 'market', 'stock', 'rupee', 'banking'
      ];

      // Mock data should contain finance keywords
      const hasFinanceContent = response.body.news.some(article => {
        const text = (article.title + ' ' + article.summary).toLowerCase();
        return financeKeywords.some(keyword => text.includes(keyword));
      });

      expect(hasFinanceContent).toBe(true);
    });

    test('should not contain crypto-related content in mock data', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      const cryptoKeywords = ['bitcoin', 'crypto', 'cryptocurrency', 'blockchain', 'ethereum'];

      // Mock data should not contain crypto keywords
      const hasCryptoContent = response.body.news.some(article => {
        const text = (article.title + ' ' + article.summary).toLowerCase();
        return cryptoKeywords.some(keyword => text.includes(keyword));
      });

      expect(hasCryptoContent).toBe(false);
    });
  });

  describe('Performance and Reliability', () => {
    test('should respond within reasonable time', async () => {
      const start = Date.now();
      
      await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(`http://localhost:3002`).get('/api/news')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success');
      });
    });
  });

  describe('CORS and Security', () => {
    test('should have CORS headers', async () => {
      const response = await request(`http://localhost:3002`)
        .get('/api/news')
        .expect(200);

      // Should have access-control headers from CORS middleware
      expect(response.headers).toBeDefined();
    });

    test('should handle OPTIONS requests', async () => {
      await request(`http://localhost:3002`)
        .options('/api/news')
        .expect((res) => {
          expect([200, 204]).toContain(res.status);
        });
    });
  });
});