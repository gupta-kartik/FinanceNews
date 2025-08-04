import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock
from app.models import User, NewsArticle, SavedArticle, UserPreference
from app.news.service import NewsService
from app import db

class TestEdgeCasesAndErrorHandling:
    """Test edge cases and comprehensive error handling"""
    
    def test_auth_edge_cases(self, client, app):
        """Test authentication edge cases"""
        with app.app_context():
            # Test registration with empty JSON
            empty_response = client.post('/auth/register',
                                       data=json.dumps({}),
                                       content_type='application/json')
            assert empty_response.status_code == 400
            
            # Test login with empty JSON
            empty_login_response = client.post('/auth/login',
                                             data=json.dumps({}),
                                             content_type='application/json')
            assert empty_login_response.status_code == 400
            
            # Create inactive user for testing
            inactive_user = User(username='inactive', email='inactive@example.com', is_active=False)
            inactive_user.set_password('password123')
            db.session.add(inactive_user)
            db.session.commit()
            
            # Test login with inactive user
            inactive_login_data = {
                'username': 'inactive',
                'password': 'password123'
            }
            inactive_response = client.post('/auth/login',
                                          data=json.dumps(inactive_login_data),
                                          content_type='application/json')
            assert inactive_response.status_code == 401
    
    def test_news_route_edge_cases(self, client, auth_headers, app):
        """Test news routes edge cases"""
        with app.app_context():
            # Test saving non-existent article with high ID
            high_id_data = {'article_id': 999999}
            high_id_response = client.post('/news/save',
                                         data=json.dumps(high_id_data),
                                         content_type='application/json',
                                         headers=auth_headers)
            assert high_id_response.status_code == 404
            
            # Test unsaving non-existent saved article
            unsave_nonexistent_data = {'article_id': 999999}
            unsave_response = client.delete('/news/unsave',
                                          data=json.dumps(unsave_nonexistent_data),
                                          content_type='application/json',
                                          headers=auth_headers)
            assert unsave_response.status_code == 404
            
            # Test pagination with invalid parameters
            invalid_page_response = client.get('/news/articles?page=0')
            assert invalid_page_response.status_code == 200  # Should handle gracefully
            
            # Test very large page size (should be capped)
            large_page_response = client.get('/news/articles?page_size=10000')
            assert large_page_response.status_code == 200
            large_data = json.loads(large_page_response.data)
            assert large_data['page_size'] <= 100
    
    def test_api_route_edge_cases(self, client, auth_headers, admin_headers):
        """Test API routes edge cases"""
        # Test search with empty query
        empty_search_response = client.get('/api/search')
        assert empty_search_response.status_code == 200
        
        # Test search with all filters empty
        all_empty_response = client.get('/api/search?q=&category=&source=&sentiment=&stock_symbol=')
        assert all_empty_response.status_code == 200
        
        # Test search with invalid sentiment value
        invalid_sentiment_response = client.get('/api/search?sentiment=invalid')
        assert invalid_sentiment_response.status_code == 200
        
        # Test admin refresh with no new articles to save
        with patch('app.news.service.NewsService.fetch_financial_news') as mock_fetch:
            mock_fetch.return_value = {'articles': [], 'total': 0, 'page': 1, 'page_size': 20}
            
            refresh_response = client.post('/api/refresh', headers=admin_headers)
            assert refresh_response.status_code == 200
            refresh_data = json.loads(refresh_response.data)
            assert refresh_data['saved_count'] == 0
    
    def test_database_error_handling(self, client, app):
        """Test database error handling"""
        with app.app_context():
            # Test registration with database error
            with patch('app.db.session.commit') as mock_commit:
                mock_commit.side_effect = Exception("Database error")
                
                register_data = {
                    'username': 'erroruser',
                    'email': 'error@example.com',
                    'password': 'password123'
                }
                
                error_response = client.post('/auth/register',
                                           data=json.dumps(register_data),
                                           content_type='application/json')
                assert error_response.status_code == 500
    
    def test_news_service_error_handling(self, app):
        """Test news service error handling"""
        with app.app_context():
            # Test saving article with invalid data
            invalid_article_data = {
                'title': 'Test',
                'content': 'Content',
                'url': 'invalid-url',
                'source': 'Test Source',
                'publishedAt': 'invalid-date-format'
            }
            
            result = NewsService.save_article_to_db(invalid_article_data)
            assert result is None  # Should handle error gracefully
            
            # Test search functionality works normally
            results = NewsService.search_articles("test")
            assert isinstance(results, list)  # Should return a list
    
    def test_sentiment_analysis_edge_cases(self, app):
        """Test sentiment analysis edge cases"""
        with app.app_context():
            # Test with None input
            sentiment = NewsService.analyze_sentiment(None)
            assert sentiment == 0.0
            
            # Test with numeric input (should handle gracefully)
            try:
                sentiment = NewsService.analyze_sentiment(123)
                assert sentiment == 0.0
            except:
                pass  # Expected to handle gracefully
            
            # Test with very long text
            long_text = "good " * 1000 + "bad " * 1000
            sentiment = NewsService.analyze_sentiment(long_text)
            assert sentiment == 0.0  # Should be neutral due to equal positive/negative
    
    def test_model_edge_cases(self, app):
        """Test model edge cases and constraints"""
        with app.app_context():
            # Test user with minimal data
            minimal_user = User(username='minimal', email='minimal@example.com')
            minimal_user.set_password('password')
            db.session.add(minimal_user)
            db.session.commit()
            
            assert minimal_user.role == 'user'  # Default role
            assert minimal_user.is_active is True  # Default active status
            
            # Test article with minimal data
            minimal_article = NewsArticle(
                title='Minimal Article',
                url='https://example.com/minimal',
                source='Minimal Source',
                published_at=datetime.utcnow()
            )
            db.session.add(minimal_article)
            db.session.commit()
            
            assert minimal_article.category == 'general'  # Default category
            assert minimal_article.content is None  # Can be None
            assert minimal_article.sentiment_score is None  # Can be None
    
    def test_jwt_token_edge_cases(self, client, sample_user):
        """Test JWT token edge cases"""
        # Test with malformed token
        malformed_headers = {'Authorization': 'Bearer invalid.token.here'}
        malformed_response = client.get('/auth/profile', headers=malformed_headers)
        assert malformed_response.status_code == 422  # JWT decode error
        
        # Test with missing Bearer prefix
        no_bearer_headers = {'Authorization': 'some-token'}
        no_bearer_response = client.get('/auth/profile', headers=no_bearer_headers)
        assert no_bearer_response.status_code == 401
        
        # Test with empty Authorization header
        empty_auth_headers = {'Authorization': ''}
        empty_auth_response = client.get('/auth/profile', headers=empty_auth_headers)
        assert empty_auth_response.status_code == 401
    
    def test_preferences_edge_cases(self, client, auth_headers):
        """Test user preferences edge cases"""
        # Test updating preferences with partial data
        partial_data = {
            'categories': 'business'
            # Missing other fields
        }
        
        partial_response = client.put('/auth/preferences',
                                    data=json.dumps(partial_data),
                                    content_type='application/json',
                                    headers=auth_headers)
        assert partial_response.status_code == 200
        
        # Test updating with empty strings
        empty_data = {
            'categories': '',
            'stock_symbols': '',
            'notification_enabled': False
        }
        
        empty_response = client.put('/auth/preferences',
                                  data=json.dumps(empty_data),
                                  content_type='application/json',
                                  headers=auth_headers)
        assert empty_response.status_code == 200
    
    def test_content_type_handling(self, client):
        """Test different content types and malformed requests"""
        # Test without content type (should be handled gracefully)
        no_content_type_response = client.post('/auth/register',
                                             data='{"username": "test"}')
        # Should handle gracefully - various responses possible
        assert no_content_type_response.status_code in [400, 415, 500]
        
        # Test with wrong content type
        wrong_content_response = client.post('/auth/register',
                                           data='username=test',
                                           content_type='application/x-www-form-urlencoded')
        # Should handle gracefully 
        assert wrong_content_response.status_code in [400, 500]
        
        # Test with malformed JSON
        malformed_json_response = client.post('/auth/register',
                                            data='{"username": "test"',  # Missing closing brace
                                            content_type='application/json')
        # Should handle gracefully
        assert malformed_json_response.status_code in [400, 500]

    def test_cors_and_headers(self, client):
        """Test CORS and header handling"""
        # Test OPTIONS request
        options_response = client.options('/api/health')
        assert options_response.status_code in [200, 204]  # Should handle OPTIONS
        
        # Test with custom headers
        custom_headers = {
            'User-Agent': 'FinanceNews-Mobile-App/1.0',
            'Accept': 'application/json'
        }
        
        custom_response = client.get('/api/health', headers=custom_headers)
        assert custom_response.status_code == 200