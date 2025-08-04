import pytest
from datetime import datetime
from app.models import User, NewsArticle, SavedArticle, UserPreference
from app import db

class TestModels:
    """Test database models"""
    
    def test_user_creation(self, app):
        """Test user model creation"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            
            db.session.add(user)
            db.session.commit()
            
            assert user.id is not None
            assert user.username == 'testuser'
            assert user.email == 'test@example.com'
            assert user.is_active is True
            assert user.role == 'user'
            assert user.created_at is not None
    
    def test_user_password_hashing(self, app):
        """Test password hashing and verification"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            
            # Password should be hashed
            assert user.password_hash != 'password123'
            
            # Should verify correct password
            assert user.check_password('password123') is True
            
            # Should reject incorrect password
            assert user.check_password('wrongpassword') is False
    
    def test_user_representation(self, app):
        """Test user string representation"""
        with app.app_context():
            user = User(username='testuser', email='test@example.com')
            assert str(user) == '<User testuser>'
    
    def test_news_article_creation(self, app):
        """Test news article model creation"""
        with app.app_context():
            article = NewsArticle(
                title='Test Article',
                content='This is test content',
                url='https://example.com/test',
                source='Test Source',
                category='business',
                published_at=datetime.utcnow(),
                sentiment_score=0.5,
                stock_symbols='AAPL,GOOGL'
            )
            
            db.session.add(article)
            db.session.commit()
            
            assert article.id is not None
            assert article.title == 'Test Article'
            assert article.content == 'This is test content'
            assert article.url == 'https://example.com/test'
            assert article.source == 'Test Source'
            assert article.category == 'business'
            assert article.sentiment_score == 0.5
            assert article.stock_symbols == 'AAPL,GOOGL'
            assert article.created_at is not None
    
    def test_news_article_representation(self, app):
        """Test news article string representation"""
        with app.app_context():
            article = NewsArticle(
                title='This is a very long title that should be truncated in representation',
                content='Content',
                url='https://example.com/test',
                source='Test Source',
                published_at=datetime.utcnow()
            )
            
            representation = str(article)
            assert 'NewsArticle' in representation
            assert len(representation) < 100  # Should be truncated
    
    def test_saved_article_creation(self, app):
        """Test saved article model creation"""
        with app.app_context():
            # Create user and article first
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            article = NewsArticle(
                title='Test Article',
                content='Content',
                url='https://example.com/test',
                source='Test Source',
                published_at=datetime.utcnow()
            )
            db.session.add(article)
            db.session.commit()
            
            # Create saved article relationship
            saved = SavedArticle(user_id=user.id, article_id=article.id)
            db.session.add(saved)
            db.session.commit()
            
            assert saved.id is not None
            assert saved.user_id == user.id
            assert saved.article_id == article.id
            assert saved.saved_at is not None
            assert saved.article == article
            assert saved.user == user
    
    def test_saved_article_unique_constraint(self, app):
        """Test unique constraint on user-article combination"""
        with app.app_context():
            # Create user and article
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            article = NewsArticle(
                title='Test Article',
                content='Content',
                url='https://example.com/test',
                source='Test Source',
                published_at=datetime.utcnow()
            )
            db.session.add(article)
            db.session.commit()
            
            # Create first saved article
            saved1 = SavedArticle(user_id=user.id, article_id=article.id)
            db.session.add(saved1)
            db.session.commit()
            
            # Try to create duplicate - should raise exception
            saved2 = SavedArticle(user_id=user.id, article_id=article.id)
            db.session.add(saved2)
            
            with pytest.raises(Exception):  # Should violate unique constraint
                db.session.commit()
    
    def test_user_preferences_creation(self, app):
        """Test user preferences model creation"""
        with app.app_context():
            # Create user first
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            # Create preferences
            preferences = UserPreference(
                user_id=user.id,
                categories='business,technology',
                stock_symbols='AAPL,GOOGL',
                notification_enabled=False
            )
            db.session.add(preferences)
            db.session.commit()
            
            assert preferences.id is not None
            assert preferences.user_id == user.id
            assert preferences.categories == 'business,technology'
            assert preferences.stock_symbols == 'AAPL,GOOGL'
            assert preferences.notification_enabled is False
            assert preferences.user == user
    
    def test_user_preferences_relationship(self, app):
        """Test user-preferences relationship"""
        with app.app_context():
            # Create user with preferences
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            preferences = UserPreference(
                user_id=user.id,
                categories='business',
                notification_enabled=True
            )
            db.session.add(preferences)
            db.session.commit()
            
            # Test relationship access
            assert user.preferences == preferences
            assert preferences.user == user
    
    def test_user_saved_articles_relationship(self, app):
        """Test user saved articles relationship"""
        with app.app_context():
            # Create user and article
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            article = NewsArticle(
                title='Test Article',
                content='Content',
                url='https://example.com/test',
                source='Test Source',
                published_at=datetime.utcnow()
            )
            db.session.add(article)
            db.session.commit()
            
            # Save article
            saved = SavedArticle(user_id=user.id, article_id=article.id)
            db.session.add(saved)
            db.session.commit()
            
            # Test relationship
            assert saved in user.saved_articles
            assert saved in article.saved_by_users