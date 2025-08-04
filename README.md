# FinanceNews - Professional Financial News Aggregator

A Bloomberg-style financial news aggregator that provides real-time updates from major Indian financial news sources.

![Desktop View](https://github.com/user-attachments/assets/24bdac42-2b53-47b7-ab45-e848bf73ca59)

## Features

- **Bloomberg-style Professional UI** - Clean, modern interface optimized for financial news consumption
- **Mobile-first Responsive Design** - Perfect viewing experience on all devices
- **Real-time News Aggregation** - Fetches latest financial news from trusted Indian sources
- **Trending Section** - Highlights the most important stories of the day
- **Financial Market Focus** - Covers equity, bonds, forex, and earnings (no cryptocurrency)
- **Auto-refresh** - Updates every 5 minutes to keep you informed
- **Fallback Support** - Mock data ensures the app works even when RSS feeds are unavailable

![Mobile View](https://github.com/user-attachments/assets/a92c7b87-20e0-4ba4-bede-fd7328a2c809)

## News Sources

- **Moneycontrol** - Leading Indian financial news portal
- **The Economic Times** - Premier business newspaper
- **NDTV Profit** - Business and market news
- **CNBC TV18** - Financial television network

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js with Express
- **RSS Parsing**: xml2js
- **Deployment**: Simple single-server setup

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gupta-kartik/FinanceNews.git
cd FinanceNews
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment

#### Option 1: Simple VPS/Cloud Server
1. Upload the project files to your server
2. Install Node.js on the server
3. Run `npm install --production`
4. Start with `npm start`
5. Use a process manager like PM2 for production:
```bash
npm install -g pm2
pm2 start server.js --name "finance-news"
```

#### Option 2: Heroku
1. Create a Heroku app
2. Push the code to Heroku
3. The app will automatically deploy with the provided package.json

#### Option 3: Netlify/Vercel (Serverless)
The application can be adapted for serverless deployment by converting the Express server to serverless functions.

## API Endpoints

- `GET /` - Main application
- `GET /api/news` - Get all financial news
- `GET /api/trending` - Get trending stories

## Configuration

### RSS Feed URLs
The application fetches news from predefined RSS feeds. You can modify the `RSS_FEEDS` object in `server.js` to add or change news sources.

### Mock Data
If RSS feeds are unavailable, the application falls back to realistic mock data to ensure continuous operation.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Performance Features

- Efficient RSS parsing with caching
- Responsive images and optimized assets
- Progressive loading with graceful fallbacks
- Minimal external dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own financial news applications.

## Support

For issues and questions, please create an issue in the GitHub repository.
