# FinanceNews - Financial News Aggregator

![CI/CD Status](https://github.com/gupta-kartik/FinanceNews/workflows/FinanceNews%20CI/CD/badge.svg)
![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)
![Python](https://img.shields.io/badge/python-3.9%20%7C%203.10%20%7C%203.11-blue)

A comprehensive financial news aggregation platform with advanced filtering, user management, and analytics capabilities. Built with Flask and designed for high reliability with 90% test coverage.

## 🚀 Features

### Core Functionality
- **News Aggregation**: Automated fetching and categorization of financial news
- **Advanced Search**: Multi-criteria filtering by category, source, sentiment, and stock symbols
- **User Management**: Secure authentication with JWT tokens and role-based access
- **Personal Dashboard**: Save articles, track preferences, and view analytics
- **Sentiment Analysis**: AI-powered sentiment scoring for market insights
- **Mobile-Responsive API**: Optimized endpoints for mobile applications

### Technical Features
- **90% Test Coverage**: Comprehensive test suite ensuring reliability
- **CI/CD Pipeline**: Automated testing, linting, and deployment
- **Security Hardened**: Input validation, SQL injection prevention, secure headers
- **Scalable Architecture**: Modular design supporting horizontal scaling
- **Performance Optimized**: Efficient pagination, caching, and database queries

## 📋 Quick Start

### Prerequisites
- Python 3.9+ 
- pip package manager
- SQLite (for development) or PostgreSQL (for production)

### Installation

```bash
# Clone the repository
git clone https://github.com/gupta-kartik/FinanceNews.git
cd FinanceNews

# Install dependencies
pip install -r requirements.txt

# Run the application
python run.py
```

The application will be available at `http://localhost:5000`

### Development Setup

```bash
# Install development dependencies
pip install -r requirements.txt

# Run tests with coverage
pytest --cov=app --cov-report=html

# Format code
black app tests

# Lint code
flake8 app tests

# Run security checks
bandit -r app/
safety check
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests with coverage report
pytest --cov=app --cov-report=term-missing --cov-report=html

# Run specific test categories
pytest tests/test_auth.py      # Authentication tests
pytest tests/test_news.py      # News functionality tests
pytest tests/test_api.py       # API endpoint tests
pytest tests/test_integration.py  # End-to-end workflow tests

# Run with coverage enforcement
pytest --cov=app --cov-fail-under=90
```

### Test Coverage
Current coverage: **90%** (meets BRD requirements)

View detailed coverage report: `htmlcov/index.html` after running tests

### Test Categories
- **Unit Tests**: Model validation, service functions
- **Integration Tests**: API endpoints, user workflows  
- **Functional Tests**: End-to-end user scenarios
- **Edge Case Tests**: Error handling, boundary conditions

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
    "username": "newuser",
    "email": "user@example.com", 
    "password": "securepassword"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
    "username": "newuser",
    "password": "securepassword"
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

### News Endpoints

#### Get Articles
```http
GET /news/articles?page=1&page_size=20&category=business&q=search_term
```

#### Save Article
```http
POST /news/save
Authorization: Bearer <token>
Content-Type: application/json

{
    "article_id": 123
}
```

#### Get Saved Articles
```http
GET /news/saved?page=1&page_size=20
Authorization: Bearer <token>
```

### Advanced Search
```http
GET /api/search?q=market&category=business&sentiment=positive&stock_symbol=AAPL
```

### Analytics
```http
GET /api/analytics
Authorization: Bearer <token>
```

## 🏗️ Architecture

### Project Structure
```
FinanceNews/
├── app/
│   ├── __init__.py          # Application factory
│   ├── models/              # Database models
│   ├── auth/                # Authentication module
│   ├── news/                # News aggregation module
│   └── api/                 # API endpoints
├── tests/                   # Comprehensive test suite
├── config.py                # Configuration management
├── requirements.txt         # Dependencies
└── run.py                   # Application entry point
```

### Technology Stack
- **Backend**: Python Flask, SQLAlchemy ORM
- **Database**: SQLite (dev), PostgreSQL (prod)
- **Authentication**: JWT tokens, bcrypt password hashing
- **Testing**: pytest, coverage.py, Flask-Testing
- **CI/CD**: GitHub Actions, automated testing
- **Code Quality**: black, flake8, bandit, safety

### Database Schema
- **Users**: Authentication and profile management
- **NewsArticles**: Financial news content with metadata
- **SavedArticles**: User-article relationships
- **UserPreferences**: Personalization settings

## 🔧 Configuration

### Environment Variables
```bash
# Required for production
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost/financenews
JWT_SECRET_KEY=your-jwt-secret-here

# Optional API keys
NEWS_API_KEY=your-news-api-key
FINANCIAL_API_KEY=your-financial-api-key
```

### Configuration Classes
- `Config`: Base configuration
- `TestConfig`: Testing environment with in-memory database

## 🚀 Deployment

### Production Deployment

```bash
# Set environment variables
export FLASK_ENV=production
export DATABASE_URL=postgresql://...
export SECRET_KEY=...

# Install production dependencies
pip install -r requirements.txt

# Initialize database
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"

# Run with production server
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

### Docker Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "run:app"]
```

### CI/CD Pipeline
- **Automated Testing**: Multi-Python version testing (3.9, 3.10, 3.11)
- **Code Quality**: Linting, formatting, security scanning  
- **Coverage Enforcement**: 90% threshold with failure on drop
- **Artifact Generation**: Test results and coverage reports
- **Security**: Dependency vulnerability scanning

## 📊 Monitoring & Analytics

### Application Metrics
- User registration and engagement
- Article consumption patterns
- Search and filtering usage
- API performance metrics

### Test Metrics
- Code coverage percentage
- Test execution time
- Failure rates and trends
- Security scan results

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes with tests
4. Ensure tests pass: `pytest --cov=app --cov-fail-under=90`
5. Run linting: `black app tests && flake8 app tests`
6. Commit changes: `git commit -m "Add new feature"`
7. Push branch: `git push origin feature/new-feature`
8. Create Pull Request

### Code Standards
- **Test Coverage**: Maintain 90% minimum coverage
- **Code Formatting**: Use black for consistent formatting
- **Linting**: Follow flake8 guidelines
- **Security**: No security vulnerabilities allowed
- **Documentation**: Update docs for new features

### Pull Request Requirements
- ✅ All tests pass
- ✅ Coverage maintains 90%
- ✅ Code is formatted and linted
- ✅ Security scans pass
- ✅ Documentation updated

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Documentation
- [Test Documentation](TEST_DOCUMENTATION.md) - Comprehensive testing guide
- [API Reference](API_REFERENCE.md) - Detailed API documentation
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions

### Getting Help
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Feature requests and questions via GitHub Discussions
- **Security**: Report security issues privately

### Project Status
- ✅ **Core Features**: Complete and tested
- ✅ **Test Coverage**: 90% achieved
- ✅ **CI/CD Pipeline**: Fully operational
- ✅ **Documentation**: Comprehensive
- 🚀 **Production Ready**: Yes

---

**Built with ❤️ for the financial community** 
