# DegenLadder 🏆

<p align="center">
  <img src="frontend/assets/ladder2.png" alt="DegenLadder Logo" width="200"/>
</p>

<p align="center">
  <strong>The Ultimate Solana Trading Leaderboard</strong><br/>
  <em>Track, rank, and compete with the best Solana traders across multiple platforms</em>
</p>

## 🚀 Solana Mobile Hackathon Project

**DegenLadder** is a revolutionary mobile app that transforms how we track and rank Solana traders. Built specifically for the Solana Mobile ecosystem, it provides real-time insights into trading performance across the most popular Solana trading platforms.

### 🎯 The Problem We Solve

In the fast-paced world of Solana trading, success is measured by performance, but there's no unified way to track who's truly winning across different platforms. Traders are scattered across pump.fun, letsbonk.fun, and other emerging platforms with no way to compare their performance or establish a true leaderboard.

**DegenLadder solves this by creating the first comprehensive, cross-platform trading leaderboard for Solana.**

### ✨ Key Features

- 🏆 **Real-time Global Leaderboard** - See where you rank among all Solana traders
- ⚡️ **24h Leaderboard** - Toggle to view the top traders over the last 24 hours (rolling window)
- 👀 **Last Buys from the Top 10** - Dedicated screen showing the most recent buy-ins from the top 10 traders (24h or yearly), sortable and refreshable every 15 minutes
- 📊 **Cross-Platform Analytics** - Track performance across pump.fun, letsbonk.fun, and more
- 🔄 **Live Data Updates** - Automatic refresh of trading data and rankings
- 📱 **Mobile-First Design** - Optimized for Solana Mobile with smooth UX
- 🔍 **Detailed User Profiles** - Deep dive into individual trader statistics
- 🎮 **Competitive Rankings** - Win rate, PNL, and degen score tracking
- 🔒 **Privacy-First** - GDPR compliant with public blockchain data only
- 🌐 **100% Open Source** - Transparent and community-driven

---

## 🆕 Recent Updates

### 24h Leaderboard
- A new toggle lets you view the leaderboard for the last 24 hours (rolling window), in addition to the yearly leaderboard.
- The 24h leaderboard uses a dedicated materialized view and is refreshed with every global or user scan.
- Rank evolution arrows are only shown on the yearly leaderboard for clarity.

### Last Buys from the Top 10
- A new screen displays the most recent "buy in" transactions from the top 10 traders (either 24h or yearly leaderboard).
- Toggle between "Last buys from the top 10 of the 24h leaderboard" and "Last buys from the top 10 of the 2025 leaderboard".
- Data is fetched from a dedicated table (`recent_top10_buys`) and can be refreshed every 15 minutes (with a visible refresh button and last refresh timestamp).
- Sort by most recent or by biggest buy (SOL amount).
- Platform badges (pump.fun, letsbonk) are color-coded and link to the respective sites.
- All dates are displayed as "xhxx ago" for timezone clarity.

### Platforms (07/20/2025)

- pump.fun
- letsbonk.fun
- more coming soon

### 🎮 How It Works

1. **Connect Your Wallet** - Seamless integration with Solana Mobile wallets
2. **View Rankings** - See your position on the global leaderboard
3. **Track Performance** - Monitor your wins, losses, and overall score
4. **Compete & Improve** - Challenge yourself to climb the ranks

## 📱 App Screenshots

<p align="center">
  <img src="frontend/assets/home.png" alt="Home Screen - Global Leaderboard" width="280"/>
  <img src="frontend/assets/details.png" alt="User Details - Performance Analytics" width="280"/>
  <img src="frontend/assets/screenshot1.png" alt="App Screenshot 1" width="280"/>
</p>

## 🛠️ Technical Stack

### Frontend
- **React Native (Expo)** - Cross-platform mobile development
- **React Native Paper** - Material Design components
- **React Query** - Real-time data fetching and caching
- **React Navigation** - Smooth navigation experience

### Backend
- **Node.js** - High-performance API server
- **Supabase** - Real-time database and authentication
- **PostgreSQL** - Robust data storage with materialized views
- **Helius API** - Solana blockchain data integration

### Key Technical Achievements
- **Real-time Leaderboard** - Materialized views for instant rankings
- **Cross-Platform Data Aggregation** - Unified API for multiple trading platforms
- **Mobile-Optimized Performance** - Efficient data loading and caching
- **Scalable Architecture** - Ready for thousands of users

## 🎯 Target Users

- **Solana Traders** - Track their performance and compete with others
- **Trading Communities** - Establish leaderboards and competitions
- **Platform Developers** - Integrate with our API for enhanced user experience
- **Analytics Enthusiasts** - Access comprehensive trading data

## 🚀 Roadmap

- [x] **24h Leaderboard** - Rolling 24h leaderboard with toggle and dedicated materialized view
- [x] **Last Buys from the Top 10** - Dedicated screen, toggle, refresh, and sorting
- [ ] **More Platforms** - Integration with additional Solana trading platforms
- [ ] **Advanced Analytics** - Risk metrics, portfolio tracking, and performance insights
- [ ] **Social Features** - Follow other traders, share achievements
- [ ] **Mobile Notifications** - Real-time alerts for ranking changes

## 📦 Project Structure

```
degenrank/
├── backend/          # Node.js API, worker, scripts, Supabase integration
├── frontend/         # React Native (Expo) app, components, navigation
├── cursor-rules/     # AI context and development roadmap
└── README.md         # This file
```

## 🤝 Partnerships & Contact

**For partnerships and integrations:** degenladderapp-partnerships@gmail.com

**For technical questions:** Open an issue on GitHub

## 📝 License

MIT License - Open source and community-driven development

---

<p align="center">
  <strong>Built with ❤️ for the Solana Mobile ecosystem</strong>
</p> 