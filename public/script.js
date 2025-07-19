// Finance News Aggregator JavaScript
class FinanceNewsApp {
    constructor() {
        this.newsContainer = document.getElementById('newsGrid');
        this.trendingContainer = document.getElementById('trendingContainer');
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('errorMessage');
        this.lastUpdatedElement = document.getElementById('lastUpdated');
        this.newsCountElement = document.getElementById('newsCount');
        this.refreshButton = document.getElementById('refreshBtn');
        this.trendingSection = document.getElementById('trendingSection');
        
        this.isLoading = false;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadNews();
        this.loadTrending();
        
        // Auto-refresh every 5 minutes
        setInterval(() => {
            this.loadNews();
            this.loadTrending();
        }, 5 * 60 * 1000);
    }
    
    bindEvents() {
        this.refreshButton.addEventListener('click', () => {
            this.refresh();
        });
        
        // Keyboard navigation support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.refresh();
            }
        });
    }
    
    async refresh() {
        if (this.isLoading) return;
        
        this.refreshButton.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            this.refreshButton.style.transform = 'rotate(0deg)';
        }, 500);
        
        await Promise.all([
            this.loadNews(),
            this.loadTrending()
        ]);
    }
    
    async loadNews() {
        try {
            this.setLoading(true);
            this.hideError();
            
            const response = await fetch('/api/news');
            const data = await response.json();
            
            if (data.success) {
                this.renderNews(data.news);
                this.updateLastUpdated(data.lastUpdated);
                this.updateNewsCount(data.count);
            } else {
                this.showError(data.error || 'Failed to load news');
                this.renderNews(data.news || []);
            }
            
        } catch (error) {
            console.error('Error loading news:', error);
            this.showError('Network error. Please check your connection.');
        } finally {
            this.setLoading(false);
        }
    }
    
    async loadTrending() {
        try {
            const response = await fetch('/api/trending');
            const data = await response.json();
            
            if (data.success && data.trending.length > 0) {
                this.renderTrending(data.trending);
                this.trendingSection.style.display = 'block';
            } else {
                this.trendingSection.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error loading trending news:', error);
            this.trendingSection.style.display = 'none';
        }
    }
    
    renderNews(articles) {
        if (!articles || articles.length === 0) {
            this.newsContainer.innerHTML = `
                <div class="no-news">
                    <p>No financial news available at the moment.</p>
                </div>
            `;
            return;
        }
        
        this.newsContainer.innerHTML = articles.map(article => this.createNewsCard(article)).join('');
        
        // Add fade-in animation
        this.newsContainer.querySelectorAll('.news-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 50}ms`;
            card.classList.add('fade-in');
        });
    }
    
    renderTrending(articles) {
        if (!articles || articles.length === 0) {
            this.trendingContainer.innerHTML = '';
            return;
        }
        
        this.trendingContainer.innerHTML = articles.map(article => this.createTrendingCard(article)).join('');
        
        // Add fade-in animation
        this.trendingContainer.querySelectorAll('.trending-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 100}ms`;
            card.classList.add('fade-in');
        });
    }
    
    createNewsCard(article) {
        const timeAgo = this.getTimeAgo(article.pubDate);
        const summary = this.truncateText(article.summary, 150);
        
        return `
            <article class="news-card" tabindex="0" onclick="this.style.opacity='0.7'; setTimeout(() => this.style.opacity='1', 200); window.open('${article.link}', '_blank');">
                <h3>${this.escapeHtml(article.title)}</h3>
                <p>${this.escapeHtml(summary)}</p>
                <div class="news-meta">
                    <span class="news-source">${this.escapeHtml(article.source)}</span>
                    <span class="news-time">${timeAgo}</span>
                </div>
            </article>
        `;
    }
    
    createTrendingCard(article) {
        const timeAgo = this.getTimeAgo(article.pubDate);
        const summary = this.truncateText(article.summary, 100);
        
        return `
            <article class="trending-card" tabindex="0" onclick="this.style.opacity='0.7'; setTimeout(() => this.style.opacity='1', 200); window.open('${article.link}', '_blank');">
                <h3>${this.escapeHtml(article.title)}</h3>
                <p>${this.escapeHtml(summary)}</p>
                <div class="trending-meta">
                    <span class="news-source">${this.escapeHtml(article.source)}</span>
                    <span class="news-time">${timeAgo}</span>
                </div>
            </article>
        `;
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.loadingElement.style.display = loading ? 'flex' : 'none';
        this.refreshButton.disabled = loading;
    }
    
    showError(message) {
        this.errorElement.style.display = 'block';
        this.errorElement.querySelector('p').textContent = message;
    }
    
    hideError() {
        this.errorElement.style.display = 'none';
    }
    
    updateLastUpdated(timestamp) {
        const date = new Date(timestamp);
        const timeString = date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        this.lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
    
    updateNewsCount(count) {
        this.newsCountElement.textContent = `${count} articles`;
    }
    
    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
    
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength).trim() + '...';
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FinanceNewsApp();
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}