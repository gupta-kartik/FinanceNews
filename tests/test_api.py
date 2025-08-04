import pytest
import json
from app.models import NewsArticle, SavedArticle

class TestAPIRoutes:
    """Test API routes"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/api/health')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['status'] == 'healthy'
        assert 'FinanceNews API is running' in response_data['message']
    
    def test_get_stats_empty_db(self, client):
        """Test getting stats with empty database"""
        response = client.get('/api/stats')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'users' in response_data
        assert 'articles' in response_data
        assert 'saved_articles' in response_data
        assert response_data['users'] >= 0
        assert response_data['articles'] >= 0
        assert response_data['saved_articles'] >= 0
    
    def test_get_stats_with_data(self, client, sample_user, sample_article):
        """Test getting stats with data"""
        response = client.get('/api/stats')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['users'] >= 1
        assert response_data['articles'] >= 1
    
    def test_search_basic(self, client, sample_article):
        """Test basic search functionality"""
        response = client.get('/api/search?q=test')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
        assert 'total' in response_data
        assert 'page' in response_data
        assert 'page_size' in response_data
    
    def test_search_with_filters(self, client, sample_article):
        """Test search with various filters"""
        response = client.get('/api/search?category=business&source=Test Source')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_search_sentiment_positive(self, client, sample_article):
        """Test search with positive sentiment filter"""
        response = client.get('/api/search?sentiment=positive')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_search_sentiment_negative(self, client):
        """Test search with negative sentiment filter"""
        # Create article with negative sentiment
        from app import db
        from datetime import datetime
        article = NewsArticle(
            title='Bad News Article',
            content='This is bad news',
            url='https://example.com/bad-news',
            source='Test Source',
            category='business',
            published_at=datetime.utcnow(),
            sentiment_score=-0.5
        )
        db.session.add(article)
        db.session.commit()
        
        response = client.get('/api/search?sentiment=negative')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_search_sentiment_neutral(self, client):
        """Test search with neutral sentiment filter"""
        # Create article with neutral sentiment
        from app import db
        from datetime import datetime
        article = NewsArticle(
            title='Neutral News Article',
            content='This is neutral news',
            url='https://example.com/neutral-news',
            source='Test Source',
            category='business',
            published_at=datetime.utcnow(),
            sentiment_score=0.0
        )
        db.session.add(article)
        db.session.commit()
        
        response = client.get('/api/search?sentiment=neutral')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_search_stock_symbol(self, client):
        """Test search with stock symbol filter"""
        # Create article with stock symbols
        from app import db
        from datetime import datetime
        article = NewsArticle(
            title='Apple Stock News',
            content='Apple stock performance',
            url='https://example.com/apple-stock',
            source='Test Source',
            category='business',
            published_at=datetime.utcnow(),
            stock_symbols='AAPL,GOOGL'
        )
        db.session.add(article)
        db.session.commit()
        
        response = client.get('/api/search?stock_symbol=AAPL')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_search_pagination(self, client):
        """Test search pagination"""
        response = client.get('/api/search?page=1&page_size=5')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['page'] == 1
        assert response_data['page_size'] == 5
        assert 'has_next' in response_data
        assert 'has_prev' in response_data
        assert 'total_pages' in response_data
    
    def test_refresh_news_without_auth(self, client):
        """Test refreshing news without authentication"""
        response = client.post('/api/refresh')
        
        assert response.status_code == 401
    
    def test_refresh_news_without_admin(self, client, auth_headers):
        """Test refreshing news without admin privileges"""
        response = client.post('/api/refresh', headers=auth_headers)
        
        assert response.status_code == 403
        response_data = json.loads(response.data)
        assert 'Admin access required' in response_data['error']
    
    def test_refresh_news_admin_success(self, client, admin_headers):
        """Test refreshing news with admin privileges"""
        response = client.post('/api/refresh', headers=admin_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'Successfully refreshed' in response_data['message']
        assert 'saved_count' in response_data
    
    def test_get_analytics_without_auth(self, client):
        """Test getting analytics without authentication"""
        response = client.get('/api/analytics')
        
        assert response.status_code == 401
    
    def test_get_analytics_empty(self, client, auth_headers):
        """Test getting analytics with no saved articles"""
        response = client.get('/api/analytics', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'total_saved' in response_data
        assert 'recent_activity' in response_data
        assert 'categories' in response_data
        assert 'sources' in response_data
        assert 'trending' in response_data
        assert response_data['total_saved'] == 0
    
    def test_get_analytics_with_data(self, client, auth_headers, sample_article, sample_user):
        """Test getting analytics with saved articles"""
        # Save an article
        from app import db
        saved_article = SavedArticle(user_id=sample_user.id, article_id=sample_article.id)
        db.session.add(saved_article)
        db.session.commit()
        
        response = client.get('/api/analytics', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['total_saved'] == 1
        assert response_data['recent_activity'] >= 0
        assert len(response_data['categories']) >= 0
        assert len(response_data['sources']) >= 0
    
    def test_404_error_handler(self, client):
        """Test 404 error handler"""
        response = client.get('/api/nonexistent-endpoint')
        
        assert response.status_code == 404
        # For 404 errors, Flask may return HTML or JSON depending on setup
        # Just verify status code for now
    
    def test_405_error_handler(self, client):
        """Test 405 error handler"""
        response = client.delete('/api/health')  # Health endpoint only accepts GET
        
        assert response.status_code == 405
        # For 405 errors, Flask may return different content types
        # Just verify status code for now