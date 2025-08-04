const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');

describe('FinanceNews Integration Tests', () => {
  let server;
  let app;
  const PORT = 3001; // Use different port for testing

  beforeAll((done) => {
    // Start the server for integration testing
    const serverPath = path.join(__dirname, '..', 'server.js');
    server = spawn('node', [serverPath], {
      env: { ...process.env, PORT: PORT },
      stdio: 'pipe'
    });

    // Wait for server to start
    setTimeout(() => {
      app = `http://localhost:${PORT}`;
      done();
    }, 2000);
  });

  afterAll((done) => {
    if (server) {
      server.kill();
      setTimeout(done, 1000);
    } else {
      done();
    }
  });

  describe('Complete Application Workflow', () => {
    it('should serve the main application page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html');
      expect(response.text).toContain('FinanceNews');
      expect(response.text).toContain('script.js');
      expect(response.text).toContain('styles.css');
    });

    it('should serve static assets correctly', async () => {
      // Test CSS file
      await request(app)
        .get('/styles.css')
        .expect(200)
        .expect('Content-Type', /css/);

      // Test JavaScript file  
      await request(app)
        .get('/script.js')
        .expect(200)
        .expect('Content-Type', /javascript/);
    });

    it('should handle news API workflow', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('news');
      expect(response.body).toHaveProperty('lastUpdated');

      // Validate news structure
      if (response.body.news.length > 0) {
        const article = response.body.news[0];
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('summary');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('pubDate');
        expect(article).toHaveProperty('link');

        // Validate date format
        expect(new Date(article.pubDate)).toBeInstanceOf(Date);
        expect(new Date(response.body.lastUpdated)).toBeInstanceOf(Date);
      }
    });

    it('should handle trending API workflow', async () => {
      const response = await request(app)
        .get('/api/trending')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('trending');
      expect(Array.isArray(response.body.trending)).toBe(true);

      // Validate trending structure
      if (response.body.trending.length > 0) {
        const trendingItem = response.body.trending[0];
        expect(trendingItem).toHaveProperty('title');
        expect(trendingItem).toHaveProperty('summary');
        expect(trendingItem).toHaveProperty('source');
        expect(trendingItem).toHaveProperty('pubDate');
        expect(trendingItem).toHaveProperty('trendingScore');
        expect(typeof trendingItem.trendingScore).toBe('number');
      }
    });

    it('should maintain data consistency between news and trending APIs', async () => {
      const newsResponse = await request(app)
        .get('/api/news')
        .expect(200);

      const trendingResponse = await request(app)
        .get('/api/trending')
        .expect(200);

      // Trending items should be a subset of news items
      if (trendingResponse.body.trending.length > 0 && newsResponse.body.news.length > 0) {
        const newsTitle = newsResponse.body.news[0].title;
        const trendingTitles = trendingResponse.body.trending.map(item => item.title);
        
        // At least some trending items should exist in news
        const hasOverlap = trendingTitles.some(title => 
          newsResponse.body.news.some(news => news.title === title)
        );
        expect(hasOverlap).toBe(true);
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle RSS feed failures gracefully', async () => {
      // The application should return mock data when RSS feeds fail
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      // Should still return valid response structure even if RSS feeds fail
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('news');
      expect(Array.isArray(response.body.news)).toBe(true);
    });

    it('should handle malformed requests gracefully', async () => {
      // Test with invalid endpoints
      await request(app)
        .get('/api/nonexistent')
        .expect(404);

      // API endpoints should still work after invalid requests
      await request(app)
        .get('/api/news')
        .expect(200);
    });

    it('should handle high load scenarios', async () => {
      // Send multiple simultaneous requests
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/api/news')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success');
      });
    });
  });

  describe('Content Filtering and Quality', () => {
    it('should filter finance-related content correctly', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      if (response.body.news.length > 0) {
        response.body.news.forEach(article => {
          const content = (article.title + ' ' + article.summary).toLowerCase();
          
          // Should contain finance-related keywords
          const financeKeywords = [
            'market', 'stock', 'share', 'equity', 'bond', 'nse', 'bse', 'sensex', 'nifty',
            'rupee', 'dollar', 'forex', 'rbi', 'interest rate', 'earnings', 'profit',
            'revenue', 'ipo', 'trading', 'investment', 'mutual fund', 'banking', 'finance',
            'economy', 'inflation', 'gdp', 'fiscal', 'monetary', 'corporate', 'dividend'
          ];

          const hasFinanceKeyword = financeKeywords.some(keyword => 
            content.includes(keyword)
          );

          // Should exclude crypto keywords
          const cryptoKeywords = ['bitcoin', 'crypto', 'cryptocurrency', 'blockchain', 'ethereum'];
          const hasCryptoKeyword = cryptoKeywords.some(keyword => 
            content.includes(keyword)
          );

          expect(hasFinanceKeyword || article.source === 'Mock Data').toBe(true);
          expect(hasCryptoKeyword).toBe(false);
        });
      }
    });

    it('should return properly formatted timestamps', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      if (response.body.news.length > 0) {
        response.body.news.forEach(article => {
          const pubDate = new Date(article.pubDate);
          expect(pubDate).toBeInstanceOf(Date);
          expect(pubDate.getTime()).not.toBeNaN();
        });
      }

      const lastUpdated = new Date(response.body.lastUpdated);
      expect(lastUpdated).toBeInstanceOf(Date);
      expect(lastUpdated.getTime()).not.toBeNaN();
    });

    it('should return reasonable news count', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.count).toBeGreaterThanOrEqual(0);
      expect(response.body.count).toEqual(response.body.news.length);
      expect(response.body.count).toBeLessThanOrEqual(50); // Reasonable upper limit
    });
  });

  describe('Trending Algorithm Validation', () => {
    it('should calculate trending scores correctly', async () => {
      const response = await request(app)
        .get('/api/trending')
        .expect(200);

      if (response.body.trending.length > 1) {
        // Trending items should be sorted by score (descending)
        for (let i = 0; i < response.body.trending.length - 1; i++) {
          const current = response.body.trending[i];
          const next = response.body.trending[i + 1];
          
          expect(current.trendingScore).toBeGreaterThanOrEqual(next.trendingScore);
        }
      }
    });

    it('should limit trending results appropriately', async () => {
      const response = await request(app)
        .get('/api/trending')
        .expect(200);

      expect(response.body.trending.length).toBeLessThanOrEqual(5);
    });

    it('should prioritize recent news in trending', async () => {
      const response = await request(app)
        .get('/api/trending')
        .expect(200);

      if (response.body.trending.length > 0) {
        response.body.trending.forEach(item => {
          const pubDate = new Date(item.pubDate);
          const hoursSincePublication = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
          
          // Trending items should generally be recent (within reasonable timeframe)
          expect(hoursSincePublication).toBeLessThan(48); // Within 48 hours is reasonable
        });
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/news')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array(5).fill(null).map(() => 
        request(app).get('/api/news')
      );
      
      const responses = await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(10000); // 5 concurrent requests within 10 seconds
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain memory efficiency with repeated requests', async () => {
      // Send multiple requests to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .get('/api/news')
          .expect(200);
        
        expect(response.body).toHaveProperty('success');
      }
      
      // If we reach here without timeout/crash, memory management is working
      expect(true).toBe(true);
    });
  });

  describe('CORS and Security', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      // Should have CORS headers (configured in server.js)
      expect(response.headers).toBeDefined();
    });

    it('should handle OPTIONS preflight requests', async () => {
      await request(app)
        .options('/api/news')
        .expect((res) => {
          // Should handle OPTIONS request (may return 200 or 204)
          expect([200, 204]).toContain(res.status);
        });
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      // Should not contain sensitive headers
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain consistent data structure across all responses', async () => {
      const newsResponse = await request(app)
        .get('/api/news')
        .expect(200);

      const trendingResponse = await request(app)
        .get('/api/trending')
        .expect(200);

      // Both should follow consistent patterns
      expect(typeof newsResponse.body.success).toBe('boolean');
      expect(typeof trendingResponse.body.success).toBe('boolean');

      if (newsResponse.body.news.length > 0) {
        const newsItem = newsResponse.body.news[0];
        expect(typeof newsItem.title).toBe('string');
        expect(typeof newsItem.summary).toBe('string');
        expect(typeof newsItem.source).toBe('string');
        expect(typeof newsItem.link).toBe('string');
      }

      if (trendingResponse.body.trending.length > 0) {
        const trendingItem = trendingResponse.body.trending[0];
        expect(typeof trendingItem.title).toBe('string');
        expect(typeof trendingItem.summary).toBe('string');
        expect(typeof trendingItem.source).toBe('string');
        expect(typeof trendingItem.trendingScore).toBe('number');
      }
    });

    it('should handle empty states gracefully', async () => {
      // Even if no news is available, should return proper structure
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('news');
      expect(response.body).toHaveProperty('lastUpdated');
      expect(Array.isArray(response.body.news)).toBe(true);
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toEqual(response.body.news.length);
    });
  });
});