from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import NewsArticle, SavedArticle, User
from app.news.service import NewsService

news_bp = Blueprint('news', __name__)

@news_bp.route('/articles', methods=['GET'])
def get_articles():
    """Get news articles with filtering and pagination"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 20, type=int)
        category = request.args.get('category')
        source = request.args.get('source')
        search_query = request.args.get('q')
        
        # Limit page size
        page_size = min(page_size, 100)
        
        if search_query or category or source:
            # Search in database
            articles = NewsService.search_articles(
                query=search_query,
                category=category,
                source=source,
                limit=page_size
            )
            
            return jsonify({
                'articles': [{
                    'id': article.id,
                    'title': article.title,
                    'content': article.content,
                    'summary': article.summary,
                    'url': article.url,
                    'source': article.source,
                    'category': article.category,
                    'published_at': article.published_at.isoformat(),
                    'sentiment_score': article.sentiment_score,
                    'stock_symbols': article.stock_symbols
                } for article in articles],
                'total': len(articles),
                'page': page,
                'page_size': page_size
            }), 200
        else:
            # Fetch fresh articles from external API
            news_data = NewsService.fetch_financial_news(
                category=category or 'business',
                page=page,
                page_size=page_size
            )
            
            return jsonify(news_data), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@news_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get available news categories"""
    categories = [
        'general', 'business', 'technology', 'markets', 'policy',
        'cryptocurrency', 'real-estate', 'banking', 'insurance'
    ]
    return jsonify({'categories': categories}), 200

@news_bp.route('/sources', methods=['GET'])
def get_sources():
    """Get available news sources"""
    try:
        sources = db.session.query(NewsArticle.source).distinct().all()
        source_list = [source[0] for source in sources]
        
        # Add default sources if database is empty
        if not source_list:
            source_list = ['Reuters', 'Bloomberg', 'Financial Times', 'CNBC', 'MarketWatch']
        
        return jsonify({'sources': source_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@news_bp.route('/trending', methods=['GET'])
def get_trending():
    """Get trending topics"""
    try:
        trending = NewsService.get_trending_topics()
        return jsonify({'trending': trending}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@news_bp.route('/save', methods=['POST'])
@jwt_required()
def save_article():
    """Save article for user"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        article_id = data.get('article_id')
        if not article_id:
            return jsonify({'error': 'article_id is required'}), 400
        
        # Check if article exists
        article = NewsArticle.query.get(article_id)
        if not article:
            return jsonify({'error': 'Article not found'}), 404
        
        # Check if already saved
        existing = SavedArticle.query.filter_by(
            user_id=user_id,
            article_id=article_id
        ).first()
        
        if existing:
            return jsonify({'message': 'Article already saved'}), 200
        
        # Save article
        saved_article = SavedArticle(user_id=user_id, article_id=article_id)
        db.session.add(saved_article)
        db.session.commit()
        
        return jsonify({'message': 'Article saved successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@news_bp.route('/saved', methods=['GET'])
@jwt_required()
def get_saved_articles():
    """Get user's saved articles"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        page_size = min(request.args.get('page_size', 20, type=int), 100)
        
        saved_articles = db.session.query(SavedArticle, NewsArticle).join(
            NewsArticle, SavedArticle.article_id == NewsArticle.id
        ).filter(SavedArticle.user_id == user_id).order_by(
            SavedArticle.saved_at.desc()
        ).paginate(
            page=page, 
            per_page=page_size, 
            error_out=False
        )
        
        articles = [{
            'id': article.id,
            'title': article.title,
            'content': article.content,
            'summary': article.summary,
            'url': article.url,
            'source': article.source,
            'category': article.category,
            'published_at': article.published_at.isoformat(),
            'saved_at': saved.saved_at.isoformat(),
            'sentiment_score': article.sentiment_score,
            'stock_symbols': article.stock_symbols
        } for saved, article in saved_articles.items]
        
        return jsonify({
            'articles': articles,
            'total': saved_articles.total,
            'page': page,
            'page_size': page_size,
            'has_next': saved_articles.has_next,
            'has_prev': saved_articles.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@news_bp.route('/unsave', methods=['DELETE'])
@jwt_required()
def unsave_article():
    """Remove article from user's saved list"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        article_id = data.get('article_id')
        if not article_id:
            return jsonify({'error': 'article_id is required'}), 400
        
        saved_article = SavedArticle.query.filter_by(
            user_id=user_id,
            article_id=article_id
        ).first()
        
        if not saved_article:
            return jsonify({'error': 'Saved article not found'}), 404
        
        db.session.delete(saved_article)
        db.session.commit()
        
        return jsonify({'message': 'Article removed from saved list'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500