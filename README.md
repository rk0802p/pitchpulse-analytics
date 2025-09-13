# ⚽ Football Analytics Platform

A comprehensive web application for analyzing football player statistics and team performance across the top 5 European leagues (Premier League, La Liga, Serie A, Ligue 1, Bundesliga).

## 🚀 Features

### 📊 Player Statistics & Analysis
- **Detailed Player Profiles**: Comprehensive statistics including goals, assists, minutes played, and more
- **Performance Trends**: Visual charts showing player performance over time
- **Interactive Charts**: Radar charts, bar charts, and trend analysis
- **Multi-League Support**: Analyze players from all top 5 European leagues

### ⚖️ Player Comparison Tools
- **Cross-League Comparison**: Compare up to 4 players from different leagues and teams
- **Search Functionality**: Search for players across all leagues
- **Statistical Comparison**: Bar charts and radar charts for easy comparison
- **Multiple Metrics**: Compare goals, assists, matches, minutes, and more

### 🏆 League Leaders
- **Category Leaders**: Top performers in goals, assists, matches, and minutes
- **Interactive Leaderboards**: Sortable tables with player rankings
- **Visual Charts**: Bar charts showing leaderboard data
- **Multiple Categories**: Switch between different statistical categories

### 🏟️ Team & Match Data
- **Team Information**: Browse teams from all 5 leagues
- **Player Rosters**: Complete team player lists with statistics
- **League Selection**: Easy navigation between different leagues

## 🛠️ Technology Stack

### Backend
- **Flask**: Lightweight web framework for building APIs
- **Python 3.9+**: Core programming language
- **Pandas**: Data manipulation and analysis
- **OpenPyXL**: Excel file processing

### Frontend
- **React 18**: Modern JavaScript library for building user interfaces
- **Chart.js & React-Chartjs-2**: Comprehensive charting library for data visualization
- **Axios**: HTTP client for API communication
- **CSS3**: Modern styling with responsive design

## 📊 Data Source

This application uses data from the [All Football Players Stats in Top 5 Leagues 24/25](https://www.kaggle.com/datasets/orkunaktas/all-football-players-stats-in-top-5-leagues-2425) dataset on Kaggle.

The dataset includes comprehensive player statistics from:
- **Premier League** (England)
- **La Liga** (Spain) 
- **Serie A** (Italy)
- **Ligue 1** (France)
- **Bundesliga** (Germany)

## 📦 Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download here](https://www.python.org/downloads/)
- **npm** or **yarn** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/football-analytics.git
   cd football-analytics
   ```

2. **Navigate to backend directory**:
   ```bash
   cd Backend
   ```

3. **Create virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Download data file**:
   - Download `top5-players24-25.xlsx` from the [Kaggle dataset](https://www.kaggle.com/datasets/orkunaktas/all-football-players-stats-in-top-5-leagues-2425)
   - Place it in the `Backend` directory

6. **Run the server**:
   ```bash
   python api.py
   ```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

## 🔌 API Endpoints

### Leagues
- `GET /api/leagues` - Get all available leagues

### Teams
- `GET /api/teams/{league}` - Get teams for a specific league

### Players
- `GET /api/players` - Get all players
- `GET /api/players/{league}/{team}` - Get players for a specific team
- `GET /api/player/{player_id}` - Get detailed player profile
- `POST /api/players/compare` - Compare multiple players

### League Leaders
- `GET /api/league-leaders` - Get top performers by category

## 🎯 Usage

1. **Start the application**:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`

2. **Select League & Team**: Choose a league and team to view players

3. **Player Analysis**: Click on any player to see detailed statistics and charts

4. **Compare Players**: Use the "Compare Players" button to compare up to 4 players from different leagues

5. **League Leaders**: View top performers across different categories

6. **Search Players**: Use the search functionality to find specific players across all leagues

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions using Vercel.

### Quick Vercel Deployment

1. **Deploy Backend**:
   ```bash
   cd Backend
   vercel --prod
   ```

2. **Deploy Frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

## 📈 Features in Detail

### Player Comparison
- **Cross-League Support**: Compare players from different leagues and teams
- **Search Mode**: Search for specific players across all leagues
- **Team Mode**: Browse players by league and team
- **Interactive Charts**: Radar charts and bar charts for comparison
- **Up to 4 Players**: Compare multiple players simultaneously

### League Leaders
- **Top 10 Performers**: View top performers in each category
- **Categories**: Goals, Assists, Matches, Minutes
- **Interactive Charts**: Bar charts and leaderboards
- **Real-time Data**: Updated statistics from the dataset

### Player Profiles
- **Detailed Statistics**: Comprehensive player information
- **Performance Trends**: Visual representation of player performance
- **Interactive Charts**: Radar charts and trend analysis
- **Multi-tab Interface**: Overview, Statistics, and Performance tabs

## 🐛 Troubleshooting

### Common Issues

1. **Data File Missing**:
   - Ensure `top5-players24-25.xlsx` is in the Backend directory
   - Download from the [Kaggle dataset](https://www.kaggle.com/datasets/orkunaktas/all-football-players-stats-in-top-5-leagues-2425)

2. **CORS Errors**:
   - Backend includes CORS headers for localhost:3000
   - For production, update CORS origins in `api.py`

3. **Port Conflicts**:
   - Backend runs on port 5000
   - Frontend runs on port 3000
   - Check if ports are available

4. **Player Comparison Issues**:
   - Use search mode to find players from different leagues
   - Ensure players are selected before comparing

### Getting Help

- Check the [Issues](https://github.com/yourusername/football-analytics/issues) page
- Create a new issue with detailed error information
- Include browser console logs and backend logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Data provided by [Kaggle Dataset](https://www.kaggle.com/datasets/orkunaktas/all-football-players-stats-in-top-5-leagues-2425)
- Built with React, Flask, and Chart.js
- Inspired by modern sports analytics platforms

---

**Note**: This application is for educational and demonstration purposes. The data is sourced from publicly available datasets and is not affiliated with any official football organizations.