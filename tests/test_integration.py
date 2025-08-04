import pytest
import json
from datetime import datetime, timedelta
from app.models import User, NewsArticle, SavedArticle, UserPreference
from app import db

class TestIntegrationWorkflows:
    """Integration tests for complete user workflows"""
    
    def test_complete_user_registration_and_login_workflow(self, client):
        """Test complete user registration and login workflow"""
        # Register a new user
        register_data = {
            'username': 'integration_user',
            'email': 'integration@example.com',
            'password': 'securepassword123'
        }
        
        register_response = client.post('/auth/register',
                                      data=json.dumps(register_data),
                                      content_type='application/json')
        
        assert register_response.status_code == 201
        
        # Login with the new user
        login_data = {
            'username': 'integration_user',
            'password': 'securepassword123'
        }
        
        login_response = client.post('/auth/login',
                                   data=json.dumps(login_data),
                                   content_type='application/json')
        
        assert login_response.status_code == 200
        login_result = json.loads(login_response.data)
        access_token = login_result['access_token']
        
        # Get user profile
        headers = {'Authorization': f'Bearer {access_token}'}
        profile_response = client.get('/auth/profile', headers=headers)
        
        assert profile_response.status_code == 200
        profile_data = json.loads(profile_response.data)
        assert profile_data['user']['username'] == 'integration_user'
        
        # Update preferences
        preferences_data = {
            'categories': 'business,technology',
            'stock_symbols': 'AAPL,MSFT',
            'notification_enabled': True
        }
        
        prefs_response = client.put('/auth/preferences',
                                  data=json.dumps(preferences_data),
                                  content_type='application/json',
                                  headers=headers)
        
        assert prefs_response.status_code == 200
        
        # Verify preferences were updated
        profile_response2 = client.get('/auth/profile', headers=headers)
        profile_data2 = json.loads(profile_response2.data)
        assert profile_data2['user']['preferences']['categories'] == 'business,technology'
        assert profile_data2['user']['preferences']['stock_symbols'] == 'AAPL,MSFT'
    
    def test_news_aggregation_and_management_workflow(self, client, auth_headers, app):
        """Test complete news aggregation and management workflow"""
        with app.app_context():
            # Create some test articles
            articles = []
            for i in range(5):
                article = NewsArticle(
                    title=f'Financial News Article {i}',
                    content=f'Content for article {i} with financial information',
                    url=f'https://example.com/article-{i}',
                    source='Financial Times',
                    category='business',
                    published_at=datetime.utcnow() - timedelta(hours=i),
                    sentiment_score=0.1 * i,
                    stock_symbols='AAPL,GOOGL' if i % 2 == 0 else 'MSFT,TSLA'
                )
                articles.append(article)
            
            db.session.add_all(articles)
            db.session.commit()
            
            # Get all articles
            articles_response = client.get('/news/articles')
            assert articles_response.status_code == 200
            
            # Search for specific articles
            search_response = client.get('/news/articles?q=Financial')
            assert search_response.status_code == 200
            search_data = json.loads(search_response.data)
            assert len(search_data['articles']) >= 1
            
            # Filter by category
            category_response = client.get('/news/articles?category=business')
            assert category_response.status_code == 200
            
            # Save an article
            first_article_id = articles[0].id
            save_data = {'article_id': first_article_id}
            save_response = client.post('/news/save',
                                      data=json.dumps(save_data),
                                      content_type='application/json',
                                      headers=auth_headers)
            assert save_response.status_code == 201
            
            # Get saved articles
            saved_response = client.get('/news/saved', headers=auth_headers)
            assert saved_response.status_code == 200
            saved_data = json.loads(saved_response.data)
            assert len(saved_data['articles']) == 1
            
            # Unsave the article
            unsave_data = {'article_id': first_article_id}
            unsave_response = client.delete('/news/unsave',
                                          data=json.dumps(unsave_data),
                                          content_type='application/json',
                                          headers=auth_headers)
            assert unsave_response.status_code == 200
    
    def test_advanced_search_and_analytics_workflow(self, client, auth_headers, app):
        """Test advanced search and analytics workflow"""
        with app.app_context():
            # Create test articles with different characteristics
            test_articles = [
                {
                    'title': 'Apple Stock Soars',
                    'content': 'Apple stock shows excellent growth and profit',
                    'category': 'technology',
                    'source': 'TechCrunch',
                    'sentiment': 0.8,
                    'symbols': 'AAPL'
                },
                {
                    'title': 'Market Crash Warning',
                    'content': 'Analysts warn of potential market decline and losses',
                    'category': 'markets',
                    'source': 'Bloomberg',
                    'sentiment': -0.6,
                    'symbols': 'SPY'
                },
                {
                    'title': 'Neutral Banking Update',
                    'content': 'Banks report steady performance this quarter',
                    'category': 'banking',
                    'source': 'Reuters',
                    'sentiment': 0.0,
                    'symbols': 'JPM,BAC'
                }
            ]
            
            created_articles = []
            for article_data in test_articles:
                article = NewsArticle(
                    title=article_data['title'],
                    content=article_data['content'],
                    url=f"https://example.com/{article_data['title'].lower().replace(' ', '-')}",
                    source=article_data['source'],
                    category=article_data['category'],
                    published_at=datetime.utcnow(),
                    sentiment_score=article_data['sentiment'],
                    stock_symbols=article_data['symbols']
                )
                created_articles.append(article)
            
            db.session.add_all(created_articles)
            db.session.commit()
            
            # Test advanced search with sentiment filter
            positive_search = client.get('/api/search?sentiment=positive')
            assert positive_search.status_code == 200
            positive_data = json.loads(positive_search.data)
            assert len(positive_data['articles']) >= 1
            
            # Test search with stock symbol filter
            apple_search = client.get('/api/search?stock_symbol=AAPL')
            assert apple_search.status_code == 200
            apple_data = json.loads(apple_search.data)
            assert len(apple_data['articles']) >= 1
            
            # Test search with multiple filters
            tech_positive_search = client.get('/api/search?category=technology&sentiment=positive')
            assert tech_positive_search.status_code == 200
            
            # Save articles for analytics
            for article in created_articles:
                save_data = {'article_id': article.id}
                client.post('/news/save',
                          data=json.dumps(save_data),
                          content_type='application/json',
                          headers=auth_headers)
            
            # Get analytics
            analytics_response = client.get('/api/analytics', headers=auth_headers)
            assert analytics_response.status_code == 200
            analytics_data = json.loads(analytics_response.data)
            assert analytics_data['total_saved'] >= 3
            assert len(analytics_data['categories']) >= 3
            assert len(analytics_data['sources']) >= 3
    
    def test_error_handling_and_edge_cases(self, client, auth_headers):
        """Test comprehensive error handling and edge cases"""
        # Test authentication errors
        no_auth_response = client.get('/auth/profile')
        assert no_auth_response.status_code == 401
        
        # Test invalid JSON
        invalid_json_response = client.post('/auth/register',
                                          data='invalid json',
                                          content_type='application/json')
        assert invalid_json_response.status_code == 400
        
        # Test pagination edge cases
        high_page_response = client.get('/news/articles?page=9999&page_size=100')
        assert high_page_response.status_code == 200
        
        # Test page size limits
        large_page_size_response = client.get('/news/articles?page_size=1000')
        assert large_page_size_response.status_code == 200
        page_data = json.loads(large_page_size_response.data)
        assert page_data['page_size'] <= 100  # Should be capped at 100
        
        # Test empty search
        empty_search_response = client.get('/api/search?q=nonexistentcontent12345')
        assert empty_search_response.status_code == 200
        empty_data = json.loads(empty_search_response.data)
        assert len(empty_data['articles']) == 0
        
        # Test invalid category
        invalid_category_response = client.get('/news/articles?category=invalidcategory')
        assert invalid_category_response.status_code == 200
        
        # Test invalid source
        invalid_source_response = client.get('/news/articles?source=invalidsource')
        assert invalid_source_response.status_code == 200
    
    def test_mobile_responsive_api_features(self, client, auth_headers):
        """Test API features that support mobile-responsive interactions"""
        # Test compact pagination for mobile
        mobile_response = client.get('/news/articles?page=1&page_size=10')
        assert mobile_response.status_code == 200
        mobile_data = json.loads(mobile_response.data)
        assert mobile_data['page_size'] == 10
        
        # Test trending topics for mobile dashboard
        trending_response = client.get('/news/trending')
        assert trending_response.status_code == 200
        trending_data = json.loads(trending_response.data)
        assert 'trending' in trending_data
        assert isinstance(trending_data['trending'], list)
        
        # Test categories for mobile filtering
        categories_response = client.get('/news/categories')
        assert categories_response.status_code == 200
        categories_data = json.loads(categories_response.data)
        assert 'categories' in categories_data
        assert len(categories_data['categories']) > 0
        
        # Test sources for mobile filtering
        sources_response = client.get('/news/sources')
        assert sources_response.status_code == 200
        sources_data = json.loads(sources_response.data)
        assert 'sources' in sources_data
        
        # Test health check for mobile app status
        health_response = client.get('/api/health')
        assert health_response.status_code == 200
        health_data = json.loads(health_response.data)
        assert health_data['status'] == 'healthy'