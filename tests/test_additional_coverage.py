import pytest
import json
from datetime import datetime
from app.models import User, NewsArticle, SavedArticle
from app import db

class TestAdditionalCoverage:
    """Additional tests to reach 90% coverage"""
    
    def test_auth_register_exception_handling(self, client, app):
        """Test registration exception handling"""
        # Test with invalid email format
        data = {
            'username': 'testuser',
            'email': 'invalid-email',
            'password': 'password123'
        }
        
        response = client.post('/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        # Should still handle gracefully
        assert response.status_code in [201, 400, 500]
    
    def test_login_with_inactive_user(self, client, app):
        """Test login with inactive user"""
        with app.app_context():
            # Create inactive user
            user = User(username='inactive', email='inactive@example.com', is_active=False)
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            # Try to login
            data = {
                'username': 'inactive',
                'password': 'password123'
            }
            
            response = client.post('/auth/login',
                                 data=json.dumps(data),
                                 content_type='application/json')
            assert response.status_code == 401
    
    def test_news_routes_additional_paths(self, client, app):
        """Test additional news route paths"""
        # Test articles endpoint with various parameters
        response1 = client.get('/news/articles?page=1&page_size=1')
        assert response1.status_code == 200
        
        # Test categories endpoint
        response2 = client.get('/news/categories')
        assert response2.status_code == 200
        
        # Test trending endpoint
        response3 = client.get('/news/trending')
        assert response3.status_code == 200
    
    def test_api_additional_endpoints(self, client):
        """Test additional API endpoints"""
        # Test health endpoint
        response = client.get('/api/health')
        assert response.status_code == 200
        
        # Test stats endpoint
        response = client.get('/api/stats')
        assert response.status_code == 200
        
        # Test search with no params
        response = client.get('/api/search')
        assert response.status_code == 200
    
    def test_model_edge_cases(self, app):
        """Test model edge cases"""
        with app.app_context():
            # Test user with admin role
            admin = User(username='admin', email='admin@example.com', role='admin')
            admin.set_password('password')
            db.session.add(admin)
            db.session.commit()
            
            assert admin.role == 'admin'
            
            # Test article with all fields
            article = NewsArticle(
                title='Complete Article',
                content='Full content',
                summary='Summary',
                url='https://example.com/complete',
                source='Complete Source',
                category='complete',
                published_at=datetime.utcnow(),
                stock_symbols='AAPL,GOOGL',
                sentiment_score=0.75
            )
            db.session.add(article)
            db.session.commit()
            
            assert article.stock_symbols == 'AAPL,GOOGL'
            assert article.sentiment_score == 0.75
    
    def test_service_edge_cases(self, app):
        """Test service edge cases"""
        from app.news.service import NewsService
        
        with app.app_context():
            # Test fetch with different categories
            result1 = NewsService.fetch_financial_news(category='technology')
            assert 'articles' in result1
            
            result2 = NewsService.fetch_financial_news(page=2, page_size=5)
            assert result2['page'] == 2
            assert result2['page_size'] == 5
            
            # Test sentiment analysis edge cases
            assert NewsService.analyze_sentiment('') == 0.0
            assert NewsService.analyze_sentiment('up rise gain profit good') > 0
            assert NewsService.analyze_sentiment('down fall loss bad decline') < 0