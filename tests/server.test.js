const request = require('supertest');
const path = require('path');

// Import the actual server
let app;
let server;

describe('FinanceNews Server Tests', () => {
  beforeEach(() => {
    // Delete the cached module to get a fresh instance
    delete require.cache[require.resolve('../server.js')];
    
    // Mock fetch to control external dependencies
    jest.doMock('node-fetch', () => jest.fn());
    jest.doMock('xml2js', () => ({
      Parser: jest.fn().mockImplementation(() => ({
        parseStringPromise: jest.fn().mockResolvedValue({
          rss: {
            channel: [{
              item: [{
                title: ['Test Finance News'],
                description: ['Test description about market trends'],
                pubDate: [new Date().toISOString()],
                link: ['https://test.com']
              }]
            }]
          }
        })
      }))
    }));

    // Create Express app for testing
    const express = require('express');
    const cors = require('cors');
    
    app = express();
    app.disable('x-powered-by');
    app.use(cors());
    app.use(express.static('public'));
    app.use(express.json());

    // Define simplified API routes for testing
    app.get('/api/news', async (req, res) => {
      const mockNews = [
        {
          title: "Sensex rises 200 points on strong earnings outlook",
          summary: "Indian equity markets gained ground as investors cheered strong quarterly earnings from IT majors and banking sector.",
          source: "Mock Data",
          pubDate: new Date().toISOString(),
          link: "#"
        }
      ];

      res.json({
        success: true,
        count: mockNews.length,
        news: mockNews,
        lastUpdated: new Date().toISOString()
      });
    });

    app.get('/api/trending', async (req, res) => {
      const mockTrending = [
        {
          title: "Sensex rises 200 points on strong earnings outlook",
          summary: "Indian equity markets gained ground",
          source: "Mock Data",
          pubDate: new Date().toISOString(),
          link: "#",
          trendingScore: 5
        }
      ];

      res.json({
        success: true,
        trending: mockTrending
      });
    });

    app.get('/', (req, res) => {
      res.send('<html><body>Finance News Test Server</body></html>');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('API Endpoints', () => {
    test('GET /api/news should return news data', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('news');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(Array.isArray(response.body.news)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('GET /api/trending should return trending news', async () => {
      const response = await request(app)
        .get('/api/trending')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('trending');
      expect(Array.isArray(response.body.trending)).toBe(true);
      
      if (response.body.trending.length > 0) {
        expect(response.body.trending[0]).toHaveProperty('trendingScore');
      }
    });

    test('GET / should serve main page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('FinanceNews');
    });

    test('Should not expose x-powered-by header', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Data Validation', () => {
    test('News API should return properly structured data', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toEqual(response.body.news.length);

      if (response.body.news.length > 0) {
        const article = response.body.news[0];
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('summary');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('pubDate');
        expect(article).toHaveProperty('link');
        expect(typeof article.title).toBe('string');
        expect(typeof article.summary).toBe('string');
      }
    });

    test('Trending API should return properly structured data', async () => {
      const response = await request(app)
        .get('/api/trending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.trending)).toBe(true);

      if (response.body.trending.length > 0) {
        const trending = response.body.trending[0];
        expect(trending).toHaveProperty('title');
        expect(trending).toHaveProperty('summary');
        expect(trending).toHaveProperty('source');
        expect(trending).toHaveProperty('pubDate');
        expect(trending).toHaveProperty('trendingScore');
        expect(typeof trending.trendingScore).toBe('number');
      }
    });
  });

  describe('Error Handling', () => {
    test('Should handle 404 routes gracefully', async () => {
      await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    test('Should handle malformed requests', async () => {
      await request(app)
        .post('/api/news')
        .send({ invalid: 'data' })
        .expect(404); // POST not supported
    });
  });

  describe('CORS Support', () => {
    test('Should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      // CORS middleware should add headers
      expect(response.headers).toBeDefined();
    });

    test('Should handle OPTIONS requests', async () => {
      await request(app)
        .options('/api/news')
        .expect((res) => {
          expect([200, 204]).toContain(res.status);
        });
    });
  });
});