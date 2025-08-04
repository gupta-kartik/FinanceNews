const express = require('express');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// RSS Feed URLs for Indian financial news sources
const RSS_FEEDS = {
  moneycontrol: 'https://www.moneycontrol.com/rss/business.xml',
  economictimes: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
  ndtvprofit: 'https://www.ndtvprofit.com/rss/markets',
  cnbctv18: 'https://www.cnbctv18.com/commonfeeds/v1/eng/rss/markets.xml'
};

// Mock data for fallback
const MOCK_NEWS = [
  {
    title: "Sensex rises 200 points on strong earnings outlook",
    summary: "Indian equity markets gained ground as investors cheered strong quarterly earnings from IT majors and banking sector.",
    source: "Mock Data",
    pubDate: new Date().toISOString(),
    link: "#"
  },
  {
    title: "RBI maintains repo rate at 6.50% in policy review",
    summary: "The Reserve Bank of India kept the benchmark interest rate unchanged, citing stable inflation trends.",
    source: "Mock Data", 
    pubDate: new Date(Date.now() - 3600000).toISOString(),
    link: "#"
  },
  {
    title: "Rupee strengthens against dollar on FII inflows",
    summary: "The Indian rupee gained 15 paise against the US dollar as foreign institutional investors increased buying.",
    source: "Mock Data",
    pubDate: new Date(Date.now() - 7200000).toISOString(),
    link: "#"
  },
  {
    title: "IT stocks surge on strong Q3 guidance from TCS",
    summary: "Technology stocks rallied after Tata Consultancy Services provided optimistic guidance for the next quarter.",
    source: "Mock Data",
    pubDate: new Date(Date.now() - 10800000).toISOString(),
    link: "#"
  },
  {
    title: "Bond yields fall as inflation concerns ease",
    summary: "Government bond yields dropped as latest inflation data showed a cooling trend in consumer prices.",
    source: "Mock Data",
    pubDate: new Date(Date.now() - 14400000).toISOString(),
    link: "#"
  }
];

// Helper function to parse RSS feed
async function parseRSSFeed(url, sourceName) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlData = await response.text();
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);
    
    const items = result.rss?.channel?.[0]?.item || result.feed?.entry || [];
    
    return items.slice(0, 10).map(item => ({
      title: item.title?.[0] || item.title?._ || 'No title',
      summary: item.description?.[0] || item.summary?.[0] || 'No summary available',
      source: sourceName,
      pubDate: item.pubDate?.[0] || item.published?.[0] || new Date().toISOString(),
      link: item.link?.[0] || item.link?.$.href || '#'
    }));
  } catch (error) {
    console.error(`Error fetching ${sourceName} RSS:`, error.message);
    return [];
  }
}

// Filter function to check if news is finance-related
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

// API endpoint to get news
app.get('/api/news', async (req, res) => {
  try {
    const allNews = [];
    
    // Fetch from all RSS feeds
    for (const [source, url] of Object.entries(RSS_FEEDS)) {
      const sourceName = source.charAt(0).toUpperCase() + source.slice(1);
      const news = await parseRSSFeed(url, sourceName);
      allNews.push(...news);
    }
    
    // Filter for finance-related news only
    const financeNews = allNews.filter(item => 
      isFinanceRelated(item.title, item.summary)
    );
    
    // If no news fetched, use mock data
    const newsToReturn = financeNews.length > 0 ? financeNews : MOCK_NEWS;
    
    // Sort by publication date (newest first)
    newsToReturn.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Filter for last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNews = newsToReturn.filter(item => 
      new Date(item.pubDate) > yesterday
    );
    
    // If no recent news, return all available news (fallback)
    const finalNews = recentNews.length > 0 ? recentNews : newsToReturn.slice(0, 20);
    
    res.json({
      success: true,
      count: finalNews.length,
      news: finalNews,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching news:', error);
    res.json({
      success: false,
      count: MOCK_NEWS.length,
      news: MOCK_NEWS,
      lastUpdated: new Date().toISOString(),
      error: 'Using mock data due to feed errors'
    });
  }
});

// API endpoint for trending news (top stories)
app.get('/api/trending', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/news`);
    const data = await response.json();
    
    // Simple trending algorithm: recent + keywords importance
    const trending = data.news
      .slice(0, 15)
      .map(item => {
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
        
        return { ...item, trendingScore: score };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 5);
    
    res.json({
      success: true,
      trending: trending
    });
    
  } catch (error) {
    console.error('Error fetching trending news:', error);
    res.json({
      success: false,
      trending: MOCK_NEWS.slice(0, 5)
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Finance News Aggregator running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the application`);
});