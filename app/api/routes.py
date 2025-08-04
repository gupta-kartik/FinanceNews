from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, NewsArticle, SavedArticle
from app.news.service import NewsService

api_bp = Blueprint('api', __name__)

@api_bp.route('/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'FinanceNews API is running'
    }), 200

@api_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get application statistics"""
    try:
        user_count = User.query.count()
        article_count = NewsArticle.query.count()
        saved_count = SavedArticle.query.count()
        
        return jsonify({
            'users': user_count,
            'articles': article_count,
            'saved_articles': saved_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/search', methods=['GET'])
def search():
    """Advanced search endpoint"""
    try:
        query = request.args.get('q', '')
        category = request.args.get('category')
        source = request.args.get('source')
        sentiment = request.args.get('sentiment')  # positive, negative, neutral
        stock_symbol = request.args.get('stock_symbol')
        page = request.args.get('page', 1, type=int)
        page_size = min(request.args.get('page_size', 20, type=int), 100)
        
        # Build query
        query_obj = NewsArticle.query
        
        if query:
            query_obj = query_obj.filter(
                NewsArticle.title.contains(query) | 
                NewsArticle.content.contains(query)
            )
        
        if category:
            query_obj = query_obj.filter(NewsArticle.category == category)
        
        if source:
            query_obj = query_obj.filter(NewsArticle.source == source)
        
        if sentiment:
            if sentiment == 'positive':
                query_obj = query_obj.filter(NewsArticle.sentiment_score > 0)
            elif sentiment == 'negative':
                query_obj = query_obj.filter(NewsArticle.sentiment_score < 0)
            elif sentiment == 'neutral':
                query_obj = query_obj.filter(NewsArticle.sentiment_score == 0)
        
        if stock_symbol:
            query_obj = query_obj.filter(NewsArticle.stock_symbols.contains(stock_symbol))
        
        # Execute query with pagination
        paginated_articles = query_obj.order_by(
            NewsArticle.published_at.desc()
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
            'sentiment_score': article.sentiment_score,
            'stock_symbols': article.stock_symbols
        } for article in paginated_articles.items]
        
        return jsonify({
            'articles': articles,
            'total': paginated_articles.total,
            'page': page,
            'page_size': page_size,
            'has_next': paginated_articles.has_next,
            'has_prev': paginated_articles.has_prev,
            'total_pages': paginated_articles.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/refresh', methods=['POST'])
@jwt_required()
def refresh_news():
    """Manually refresh news from external sources"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Check if user has admin role
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Fetch fresh news
        news_data = NewsService.fetch_financial_news(page_size=50)
        
        saved_count = 0
        for article_data in news_data.get('articles', []):
            # Analyze sentiment
            sentiment = NewsService.analyze_sentiment(
                article_data.get('content', '') + ' ' + article_data.get('title', '')
            )
            article_data['sentiment_score'] = sentiment
            
            # Save to database
            saved_article = NewsService.save_article_to_db(article_data)
            if saved_article:
                saved_count += 1
        
        return jsonify({
            'message': f'Successfully refreshed {saved_count} articles',
            'saved_count': saved_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    """Get analytics data for dashboard"""
    try:
        user_id = get_jwt_identity()
        
        # Get user's reading patterns
        saved_articles = SavedArticle.query.filter_by(user_id=user_id).all()
        
        # Category distribution
        categories = {}
        for saved in saved_articles:
            category = saved.article.category
            categories[category] = categories.get(category, 0) + 1
        
        # Source distribution
        sources = {}
        for saved in saved_articles:
            source = saved.article.source
            sources[source] = sources.get(source, 0) + 1
        
        # Recent activity (last 7 days)
        from datetime import datetime, timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_saved = SavedArticle.query.filter(
            SavedArticle.user_id == user_id,
            SavedArticle.saved_at >= week_ago
        ).count()
        
        return jsonify({
            'total_saved': len(saved_articles),
            'recent_activity': recent_saved,
            'categories': categories,
            'sources': sources,
            'trending': NewsService.get_trending_topics()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.app_errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    if '/api/' in str(error.original_exception if hasattr(error, 'original_exception') else ''):
        return jsonify({'error': 'Endpoint not found'}), 404
    return error

@api_bp.app_errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    if '/api/' in str(error.original_exception if hasattr(error, 'original_exception') else ''):
        return jsonify({'error': 'Method not allowed'}), 405
    return error

@api_bp.app_errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    if '/api/' in str(error.original_exception if hasattr(error, 'original_exception') else ''):
        return jsonify({'error': 'Internal server error'}), 500
    return error