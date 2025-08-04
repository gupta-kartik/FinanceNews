from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.String(20), default='user')  # user, admin
    
    # Relationships
    saved_articles = db.relationship('SavedArticle', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class NewsArticle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    summary = db.Column(db.Text)
    url = db.Column(db.String(500), unique=True, nullable=False)
    source = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), default='general')
    published_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Financial specific fields
    stock_symbols = db.Column(db.String(200))  # comma-separated list
    sentiment_score = db.Column(db.Float)  # -1.0 to 1.0
    
    def __repr__(self):
        return f'<NewsArticle {self.title[:50]}>'

class SavedArticle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('news_article.id'), nullable=False)
    saved_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    article = db.relationship('NewsArticle', backref='saved_by_users')
    
    __table_args__ = (db.UniqueConstraint('user_id', 'article_id'),)

class UserPreference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    categories = db.Column(db.String(200))  # comma-separated preferred categories
    stock_symbols = db.Column(db.String(200))  # comma-separated watched stocks
    notification_enabled = db.Column(db.Boolean, default=True)
    
    user = db.relationship('User', backref=db.backref('preferences', uselist=False))