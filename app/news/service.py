import requests
from datetime import datetime, timedelta
from flask import current_app
from app import db
from app.models import NewsArticle

class NewsService:
    """Service for fetching and managing news articles"""
    
    @staticmethod
    def fetch_financial_news(category='business', page=1, page_size=20):
        """Fetch news from external API"""
        try:
            # Mock news data for testing - in production, use real API
            mock_articles = [
                {
                    'title': 'Stock Market Reaches New Heights',
                    'content': 'The stock market has reached unprecedented levels...',
                    'url': 'https://example.com/stock-market-heights',
                    'source': 'Financial Times',
                    'publishedAt': datetime.utcnow().isoformat(),
                    'category': 'markets'
                },
                {
                    'title': 'Federal Reserve Announces Interest Rate Decision',
                    'content': 'The Federal Reserve has announced its latest interest rate decision...',
                    'url': 'https://example.com/fed-rate-decision',
                    'source': 'Reuters',
                    'publishedAt': (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                    'category': 'policy'
                },
                {
                    'title': 'Tech Stocks Show Strong Performance',
                    'content': 'Technology stocks have shown remarkable performance this quarter...',
                    'url': 'https://example.com/tech-stocks-performance',
                    'source': 'Bloomberg',
                    'publishedAt': (datetime.utcnow() - timedelta(hours=4)).isoformat(),
                    'category': 'technology'
                }
            ]
            
            # Simulate pagination
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_articles = mock_articles[start_idx:end_idx]
            
            return {
                'articles': paginated_articles,
                'total': len(mock_articles),
                'page': page,
                'page_size': page_size
            }
            
        except Exception as e:
            current_app.logger.error(f"Error fetching news: {str(e)}")
            return {'articles': [], 'total': 0, 'page': page, 'page_size': page_size}
    
    @staticmethod
    def save_article_to_db(article_data):
        """Save article to database"""
        try:
            # Check if article already exists
            existing = NewsArticle.query.filter_by(url=article_data['url']).first()
            if existing:
                return existing
            
            article = NewsArticle(
                title=article_data['title'],
                content=article_data.get('content', ''),
                url=article_data['url'],
                source=article_data['source'],
                category=article_data.get('category', 'general'),
                published_at=datetime.fromisoformat(article_data['publishedAt'].replace('Z', '+00:00'))
            )
            
            db.session.add(article)
            db.session.commit()
            return article
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error saving article: {str(e)}")
            return None
    
    @staticmethod
    def search_articles(query, category=None, source=None, limit=50):
        """Search articles in database"""
        try:
            query_obj = NewsArticle.query
            
            # Apply filters
            if query:
                query_obj = query_obj.filter(
                    NewsArticle.title.contains(query) | 
                    NewsArticle.content.contains(query)
                )
            
            if category:
                query_obj = query_obj.filter(NewsArticle.category == category)
            
            if source:
                query_obj = query_obj.filter(NewsArticle.source == source)
            
            # Order by published date
            articles = query_obj.order_by(NewsArticle.published_at.desc()).limit(limit).all()
            
            return articles
            
        except Exception as e:
            current_app.logger.error(f"Error searching articles: {str(e)}")
            return []
    
    @staticmethod
    def get_trending_topics():
        """Get trending topics/categories"""
        try:
            # Mock trending data - in production, implement real analytics
            trending = [
                {'topic': 'Federal Reserve', 'count': 15},
                {'topic': 'Stock Market', 'count': 12},
                {'topic': 'Cryptocurrency', 'count': 8},
                {'topic': 'Interest Rates', 'count': 6}
            ]
            return trending
            
        except Exception as e:
            current_app.logger.error(f"Error getting trending topics: {str(e)}")
            return []
    
    @staticmethod
    def analyze_sentiment(text):
        """Analyze sentiment of text (mock implementation)"""
        try:
            # Mock sentiment analysis - in production, use ML service
            positive_words = ['good', 'positive', 'growth', 'profit', 'gain', 'rise', 'up']
            negative_words = ['bad', 'negative', 'loss', 'decline', 'fall', 'down', 'crash']
            
            text_lower = text.lower()
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                return 0.5  # Positive sentiment
            elif negative_count > positive_count:
                return -0.5  # Negative sentiment
            else:
                return 0.0  # Neutral sentiment
                
        except Exception as e:
            current_app.logger.error(f"Error analyzing sentiment: {str(e)}")
            return 0.0