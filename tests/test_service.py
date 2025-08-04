import pytest
from datetime import datetime, timedelta
from app.news.service import NewsService
from app.models import NewsArticle
from app import db

class TestNewsService:
    """Test news service functionality"""
    
    def test_fetch_financial_news_default(self, app):
        """Test fetching financial news with default parameters"""
        with app.app_context():
            result = NewsService.fetch_financial_news()
            
            assert 'articles' in result
            assert 'total' in result
            assert 'page' in result
            assert 'page_size' in result
            assert result['page'] == 1
            assert result['page_size'] == 20
            assert isinstance(result['articles'], list)
    
    def test_fetch_financial_news_with_params(self, app):
        """Test fetching financial news with custom parameters"""
        with app.app_context():
            result = NewsService.fetch_financial_news(
                category='technology',
                page=2,
                page_size=10
            )
            
            assert result['page'] == 2
            assert result['page_size'] == 10
    
    def test_fetch_financial_news_pagination(self, app):
        """Test pagination in news fetching"""
        with app.app_context():
            # Test that pagination works (mock data has limited articles)
            result = NewsService.fetch_financial_news(page=5, page_size=10)
            
            assert result['page'] == 5
            assert result['page_size'] == 10
            assert len(result['articles']) == 0  # Should be empty for high page numbers
    
    def test_save_article_to_db_new(self, app):
        """Test saving new article to database"""
        with app.app_context():
            article_data = {
                'title': 'Test Article',
                'content': 'This is test content',
                'url': 'https://example.com/test-new',
                'source': 'Test Source',
                'category': 'business',
                'publishedAt': datetime.utcnow().isoformat()
            }
            
            saved_article = NewsService.save_article_to_db(article_data)
            
            assert saved_article is not None
            assert saved_article.title == 'Test Article'
            assert saved_article.url == 'https://example.com/test-new'
            assert saved_article.source == 'Test Source'
    
    def test_save_article_to_db_duplicate(self, app):
        """Test saving duplicate article to database"""
        with app.app_context():
            # Create existing article
            existing_article = NewsArticle(
                title='Existing Article',
                content='Content',
                url='https://example.com/existing',
                source='Test Source',
                published_at=datetime.utcnow()
            )
            db.session.add(existing_article)
            db.session.commit()
            
            # Try to save same URL
            article_data = {
                'title': 'Different Title',
                'content': 'Different content',
                'url': 'https://example.com/existing',  # Same URL
                'source': 'Different Source',
                'category': 'technology',
                'publishedAt': datetime.utcnow().isoformat()
            }
            
            saved_article = NewsService.save_article_to_db(article_data)
            
            # Should return existing article, not create new one
            assert saved_article.id == existing_article.id
            assert saved_article.title == 'Existing Article'  # Original title preserved
    
    def test_save_article_to_db_invalid_date(self, app):
        """Test saving article with invalid date format"""
        with app.app_context():
            article_data = {
                'title': 'Test Article',
                'content': 'Content',
                'url': 'https://example.com/invalid-date',
                'source': 'Test Source',
                'publishedAt': 'invalid-date-format'
            }
            
            saved_article = NewsService.save_article_to_db(article_data)
            
            # Should handle error gracefully and return None
            assert saved_article is None
    
    def test_search_articles_empty_db(self, app):
        """Test searching articles in empty database"""
        with app.app_context():
            results = NewsService.search_articles('test query')
            
            assert isinstance(results, list)
            assert len(results) == 0
    
    def test_search_articles_with_query(self, app):
        """Test searching articles with text query"""
        with app.app_context():
            # Create test article
            article = NewsArticle(
                title='Test Financial News',
                content='This article contains financial information',
                url='https://example.com/search-test',
                source='Test Source',
                published_at=datetime.utcnow()
            )
            db.session.add(article)
            db.session.commit()
            
            # Search by title
            results = NewsService.search_articles('Financial')
            assert len(results) >= 1
            assert any('Financial' in r.title for r in results)
            
            # Search by content
            results = NewsService.search_articles('financial information')
            assert len(results) >= 1
    
    def test_search_articles_with_category_filter(self, app):
        """Test searching articles with category filter"""
        with app.app_context():
            # Create articles with different categories
            article1 = NewsArticle(
                title='Business News',
                content='Business content',
                url='https://example.com/business',
                source='Test Source',
                category='business',
                published_at=datetime.utcnow()
            )
            article2 = NewsArticle(
                title='Tech News',
                content='Technology content',
                url='https://example.com/tech',
                source='Test Source',
                category='technology',
                published_at=datetime.utcnow()
            )
            db.session.add_all([article1, article2])
            db.session.commit()
            
            # Search by category
            results = NewsService.search_articles(None, category='business')
            assert len(results) >= 1
            assert all(r.category == 'business' for r in results)
    
    def test_search_articles_with_source_filter(self, app):
        """Test searching articles with source filter"""
        with app.app_context():
            # Create articles with different sources
            article1 = NewsArticle(
                title='Reuters Article',
                content='Content',
                url='https://example.com/reuters',
                source='Reuters',
                published_at=datetime.utcnow()
            )
            article2 = NewsArticle(
                title='Bloomberg Article',
                content='Content',
                url='https://example.com/bloomberg',
                source='Bloomberg',
                published_at=datetime.utcnow()
            )
            db.session.add_all([article1, article2])
            db.session.commit()
            
            # Search by source
            results = NewsService.search_articles(None, source='Reuters')
            assert len(results) >= 1
            assert all(r.source == 'Reuters' for r in results)
    
    def test_search_articles_with_limit(self, app):
        """Test searching articles with limit"""
        with app.app_context():
            # Create multiple articles
            articles = []
            for i in range(10):
                article = NewsArticle(
                    title=f'Article {i}',
                    content=f'Content {i}',
                    url=f'https://example.com/article-{i}',
                    source='Test Source',
                    published_at=datetime.utcnow()
                )
                articles.append(article)
            
            db.session.add_all(articles)
            db.session.commit()
            
            # Search with limit
            results = NewsService.search_articles(None, limit=5)
            assert len(results) <= 5
    
    def test_get_trending_topics(self, app):
        """Test getting trending topics"""
        with app.app_context():
            trending = NewsService.get_trending_topics()
            
            assert isinstance(trending, list)
            assert len(trending) > 0
            
            # Check structure of trending data
            for topic in trending:
                assert 'topic' in topic
                assert 'count' in topic
                assert isinstance(topic['count'], int)
    
    def test_analyze_sentiment_positive(self, app):
        """Test sentiment analysis for positive text"""
        with app.app_context():
            positive_text = "This is great news with profit and growth"
            sentiment = NewsService.analyze_sentiment(positive_text)
            
            assert sentiment > 0  # Should be positive
            assert sentiment <= 1.0
    
    def test_analyze_sentiment_negative(self, app):
        """Test sentiment analysis for negative text"""
        with app.app_context():
            negative_text = "Bad news about loss and decline in the market"
            sentiment = NewsService.analyze_sentiment(negative_text)
            
            assert sentiment < 0  # Should be negative
            assert sentiment >= -1.0
    
    def test_analyze_sentiment_neutral(self, app):
        """Test sentiment analysis for neutral text"""
        with app.app_context():
            neutral_text = "This is a regular news article about market conditions"
            sentiment = NewsService.analyze_sentiment(neutral_text)
            
            assert sentiment == 0.0  # Should be neutral
    
    def test_analyze_sentiment_mixed(self, app):
        """Test sentiment analysis for mixed text"""
        with app.app_context():
            mixed_text = "Good profit but bad loss in the same quarter"
            sentiment = NewsService.analyze_sentiment(mixed_text)
            
            # Mixed sentiment should be neutral
            assert sentiment == 0.0
    
    def test_analyze_sentiment_empty_text(self, app):
        """Test sentiment analysis for empty text"""
        with app.app_context():
            sentiment = NewsService.analyze_sentiment("")
            
            assert sentiment == 0.0  # Should be neutral for empty text
    
    def test_analyze_sentiment_case_insensitive(self, app):
        """Test that sentiment analysis is case insensitive"""
        with app.app_context():
            upper_text = "GOOD PROFIT AND GROWTH"
            lower_text = "good profit and growth"
            
            sentiment_upper = NewsService.analyze_sentiment(upper_text)
            sentiment_lower = NewsService.analyze_sentiment(lower_text)
            
            assert sentiment_upper == sentiment_lower
            assert sentiment_upper > 0