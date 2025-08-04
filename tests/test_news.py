import pytest
import json
from app.models import NewsArticle, SavedArticle

class TestNewsRoutes:
    """Test news-related routes"""
    
    def test_get_articles_success(self, client):
        """Test getting articles successfully"""
        response = client.get('/news/articles')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
        assert 'total' in response_data
        assert 'page' in response_data
        assert 'page_size' in response_data
    
    def test_get_articles_with_pagination(self, client):
        """Test getting articles with pagination"""
        response = client.get('/news/articles?page=2&page_size=5')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['page'] == 2
        assert response_data['page_size'] == 5
    
    def test_get_articles_with_search(self, client, sample_article):
        """Test searching articles"""
        response = client.get('/news/articles?q=test')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_get_articles_with_category_filter(self, client, sample_article):
        """Test filtering articles by category"""
        response = client.get('/news/articles?category=business')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_get_articles_with_source_filter(self, client, sample_article):
        """Test filtering articles by source"""
        response = client.get('/news/articles?source=Test Source')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
    
    def test_get_categories(self, client):
        """Test getting available categories"""
        response = client.get('/news/categories')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'categories' in response_data
        assert isinstance(response_data['categories'], list)
        assert 'business' in response_data['categories']
    
    def test_get_sources_empty_db(self, client):
        """Test getting sources when database is empty"""
        response = client.get('/news/sources')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'sources' in response_data
        assert isinstance(response_data['sources'], list)
    
    def test_get_sources_with_data(self, client, sample_article):
        """Test getting sources with data in database"""
        response = client.get('/news/sources')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'sources' in response_data
        assert 'Test Source' in response_data['sources']
    
    def test_get_trending(self, client):
        """Test getting trending topics"""
        response = client.get('/news/trending')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'trending' in response_data
        assert isinstance(response_data['trending'], list)
    
    def test_save_article_success(self, client, auth_headers, sample_article):
        """Test saving an article successfully"""
        data = {
            'article_id': sample_article.id
        }
        
        response = client.post('/news/save',
                             data=json.dumps(data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Article saved successfully'
    
    def test_save_article_already_saved(self, client, auth_headers, sample_article, sample_user):
        """Test saving an article that's already saved"""
        # First save
        saved_article = SavedArticle(user_id=sample_user.id, article_id=sample_article.id)
        from app import db
        db.session.add(saved_article)
        db.session.commit()
        
        data = {
            'article_id': sample_article.id
        }
        
        response = client.post('/news/save',
                             data=json.dumps(data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Article already saved'
    
    def test_save_article_missing_id(self, client, auth_headers):
        """Test saving article without article_id"""
        data = {}
        
        response = client.post('/news/save',
                             data=json.dumps(data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'article_id is required' in response_data['error']
    
    def test_save_article_not_found(self, client, auth_headers):
        """Test saving non-existent article"""
        data = {
            'article_id': 99999
        }
        
        response = client.post('/news/save',
                             data=json.dumps(data),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 404
        response_data = json.loads(response.data)
        assert 'Article not found' in response_data['error']
    
    def test_save_article_without_auth(self, client, sample_article):
        """Test saving article without authentication"""
        data = {
            'article_id': sample_article.id
        }
        
        response = client.post('/news/save',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 401
    
    def test_get_saved_articles_empty(self, client, auth_headers):
        """Test getting saved articles when none exist"""
        response = client.get('/news/saved', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
        assert len(response_data['articles']) == 0
        assert response_data['total'] == 0
    
    def test_get_saved_articles_with_data(self, client, auth_headers, sample_article, sample_user):
        """Test getting saved articles with data"""
        # Save an article first
        saved_article = SavedArticle(user_id=sample_user.id, article_id=sample_article.id)
        from app import db
        db.session.add(saved_article)
        db.session.commit()
        
        response = client.get('/news/saved', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'articles' in response_data
        assert len(response_data['articles']) == 1
        assert response_data['total'] == 1
        assert 'saved_at' in response_data['articles'][0]
    
    def test_get_saved_articles_pagination(self, client, auth_headers, sample_user):
        """Test pagination of saved articles"""
        response = client.get('/news/saved?page=1&page_size=10', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['page'] == 1
        assert response_data['page_size'] == 10
    
    def test_get_saved_articles_without_auth(self, client):
        """Test getting saved articles without authentication"""
        response = client.get('/news/saved')
        
        assert response.status_code == 401
    
    def test_unsave_article_success(self, client, auth_headers, sample_article, sample_user):
        """Test removing article from saved list"""
        # Save an article first
        saved_article = SavedArticle(user_id=sample_user.id, article_id=sample_article.id)
        from app import db
        db.session.add(saved_article)
        db.session.commit()
        
        data = {
            'article_id': sample_article.id
        }
        
        response = client.delete('/news/unsave',
                               data=json.dumps(data),
                               content_type='application/json',
                               headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Article removed from saved list'
    
    def test_unsave_article_not_saved(self, client, auth_headers, sample_article):
        """Test removing article that wasn't saved"""
        data = {
            'article_id': sample_article.id
        }
        
        response = client.delete('/news/unsave',
                               data=json.dumps(data),
                               content_type='application/json',
                               headers=auth_headers)
        
        assert response.status_code == 404
        response_data = json.loads(response.data)
        assert 'Saved article not found' in response_data['error']
    
    def test_unsave_article_missing_id(self, client, auth_headers):
        """Test removing article without article_id"""
        data = {}
        
        response = client.delete('/news/unsave',
                               data=json.dumps(data),
                               content_type='application/json',
                               headers=auth_headers)
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'article_id is required' in response_data['error']
    
    def test_unsave_article_without_auth(self, client, sample_article):
        """Test removing article without authentication"""
        data = {
            'article_id': sample_article.id
        }
        
        response = client.delete('/news/unsave',
                               data=json.dumps(data),
                               content_type='application/json')
        
        assert response.status_code == 401