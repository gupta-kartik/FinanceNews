import pytest
import json
from app import create_app, db
from app.models import User, NewsArticle, SavedArticle, UserPreference
from config import TestConfig

@pytest.fixture
def app():
    """Create application for the tests."""
    app = create_app(TestConfig)
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()

@pytest.fixture
def sample_user(app):
    """Create a sample user for testing."""
    with app.app_context():
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
        user_id = user.id
        db.session.expunge(user)  # Detach from session
        
        # Return a fresh query to avoid detached instance issues
        return db.session.get(User, user_id)

@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        user = User(username='admin', email='admin@example.com', role='admin')
        user.set_password('adminpass')
        db.session.add(user)
        db.session.commit()
        user_id = user.id
        db.session.expunge(user)  # Detach from session
        
        # Return a fresh query to avoid detached instance issues
        return db.session.get(User, user_id)

@pytest.fixture
def sample_article(app):
    """Create a sample news article for testing."""
    with app.app_context():
        from datetime import datetime
        article = NewsArticle(
            title='Test Article',
            content='This is a test article content',
            url='https://example.com/test-article',
            source='Test Source',
            category='business',
            published_at=datetime.utcnow(),
            sentiment_score=0.5
        )
        db.session.add(article)
        db.session.commit()
        article_id = article.id
        db.session.expunge(article)  # Detach from session
        
        # Return a fresh query to avoid detached instance issues
        return db.session.get(NewsArticle, article_id)

@pytest.fixture
def auth_headers(client, sample_user):
    """Get authorization headers for authenticated requests."""
    login_data = {
        'username': 'testuser',
        'password': 'password123'
    }
    response = client.post('/auth/login', 
                          data=json.dumps(login_data),
                          content_type='application/json')
    
    token = json.loads(response.data)['access_token']
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def admin_headers(client, admin_user):
    """Get authorization headers for admin requests."""
    login_data = {
        'username': 'admin',
        'password': 'adminpass'
    }
    response = client.post('/auth/login', 
                          data=json.dumps(login_data),
                          content_type='application/json')
    
    token = json.loads(response.data)['access_token']
    return {'Authorization': f'Bearer {token}'}