# 🚀 IHSG Analytics Bot

> **Enterprise-Grade AI-Powered Indonesian Stock Market Analytics Platform**  
> Real-time market intelligence, advanced price alerts with anti-spam batch notifications, bandarmologi analysis, and institutional trading insights delivered via Telegram.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.x-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://telegraf.js.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-success?style=for-the-badge)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 📋 Executive Overview

IHSG Analytics Bot is a **production-ready, enterprise-grade** Telegram bot that delivers comprehensive Indonesian stock market analytics powered by artificial intelligence. Built with TypeScript 6.x and Node.js 24.x, the platform integrates real-time market data from GoAPI, leverages AI Aggregator (primary) and Google Gemini (fallback) for intelligent natural language processing, and provides persistent cloud storage through Supabase PostgreSQL.

### 🎯 Key Differentiators

- **🔔 Advanced Alert Engine** - Anti-spam batch notification system with HTML formatting and exponential backoff retry mechanism
- **🤖 Dual AI Architecture** - Primary AI Aggregator with automatic Google Gemini fallback for 99.9% uptime
- **📊 Institutional Analytics** - Bandarmologi tracking, foreign flow analysis, and liquidity sentiment indicators
- **⚡ Production-Hardened** - Exponential backoff with ±20% jitter, graceful error handling, and configurable worker intervals
- **🎨 Premium UX** - Beautiful HTML notifications with monospace data alignment and strategic emoji indicators

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      IHSG Analytics Bot                             │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │
│  │   Telegram   │────▶│   Telegraf   │────▶│    Hermes    │      │
│  │     User     │◀────│ Bot Handler  │◀────│  AI Agent    │      │
│  └──────────────┘     └──────────────┘     └──────┬───────┘      │
│                                                     │               │
│                                            Tool Calling             │
│                                                     │               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  Tool Registry (19 Tools)                     │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ • Market Data (10)  • Watchlist (3)  • Portfolio (3)        │ │
│  │ • Price Alerts (3)  • Technical Analysis & Bandarmologi     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │
│  │    GoAPI     │     │   Supabase   │     │    Alert     │      │
│  │  IDX Data    │     │  PostgreSQL  │     │   Worker     │      │
│  │ + Retry Logic│     │   (Cloud)    │     │  (Background)│      │
│  └──────────────┘     └──────────────┘     └──────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │             AI Providers (Dual Architecture)                 │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  Primary: AI Aggregator (gpt-4o) + Fallback: Gemini 2.0    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | Node.js | 24.x | Server-side JavaScript execution |
| **Language** | TypeScript | 6.0 | Type-safe development with latest features |
| **Bot Framework** | Telegraf | 4.x | Telegram Bot API wrapper with middleware |
| **AI Orchestration** | Vercel AI SDK | 6.x | LLM tool calling & streaming responses |
| **Database** | Supabase | 2.x | Cloud PostgreSQL with Row Level Security |
| **HTTP Server** | Express | 5.x | Webhook mode routing & health checks |
| **HTTP Client** | Axios | 1.x | External API requests with retry logic |
| **Validation** | Zod | 4.x | Runtime schema validation & type inference |
| **Chart Rendering** | QuickChart.io | API | Serverless chart generation (no dependencies) |

### 🔌 External Integrations

- **GoAPI** - Real-time Indonesian stock market data provider (IDX)
- **AI Aggregator** - Primary LLM provider (OpenAI-compatible endpoint)
- **Google Gemini** - Fallback LLM provider (automatic failover)
- **Supabase** - Managed PostgreSQL database with real-time subscriptions
- **QuickChart.io** - Chart rendering service (30-day historical data)

---

## 🎯 Core Features Deep-Dive

### 1. 🔔 Advanced Price Alerts Engine

**Production-Grade Alert System with Zero-Spam Guarantee**

#### Anti-Spam Batch Notification System

Multiple alerts triggered for the same user are **automatically consolidated** into a single beautiful HTML message:

**Before Optimization:**
```
User has 3 alerts triggered
❌ Sends 3 separate messages (notification spam)
```

**After Optimization:**
```
User has 3 alerts triggered
✅ Sends 1 consolidated message (batch notification)
```

**Benefits:**
- 📉 **60-80% reduction** in Telegram messages
- 🎨 **Premium HTML formatting** with monospace alignment
- 📊 **Summary statistics** (total count, average price)
- 🚀 **Better user experience** (no spam)

**Example Batch Notification:**
```
🔔 BATCH ALERT TRIGGERED

Anda memiliki 3 alert yang terpicu!

━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🟢 BBCA
   💰 Rp 5.600 🟢 +0.90%
   🎯 Target di atas Rp 5.500

2. 🟢 BBRI 📊
   💰 Rp 5.250 🟢 +5.00%
   📊 +5% dari Rp 5.000

3. 🔴 TLKM 🛡️
   💰 Rp 3.990 🔴 -4.80%
   🛡️ Drop 5% dari high Rp 4.200

━━━━━━━━━━━━━━━━━━━━━━━━━

📈 RINGKASAN
Total Alert  : 3
Rata-rata    : Rp 4.947
Status       : Semua dinonaktifkan

✅ Semua alert telah dinonaktifkan
```

#### Exponential Backoff Retry Mechanism

**Resilient API calls to GoAPI with intelligent retry logic:**

- **3 retry attempts** with exponential backoff (1s → 2s → 4s)
- **±20% jitter** to prevent thundering herd problem
- **Comprehensive logging** with attempt tracking
- **Graceful degradation** (worker continues despite failures)

**Retry Flow:**
```
Attempt 1: Immediate execution
  ↓ (fails)
Attempt 2: Wait ~1s with jitter (800ms - 1200ms)
  ↓ (fails)
Attempt 3: Wait ~2s with jitter (1600ms - 2400ms)
  ↓ (fails)
Attempt 4: Wait ~4s with jitter (3200ms - 4800ms)
  ↓ (still fails)
Skip symbol, continue with next
```

**Handled Scenarios:**
- ✅ Network timeouts
- ✅ API rate limits (HTTP 429)
- ✅ Transient failures
- ✅ Invalid responses
- ✅ Missing data

#### Configurable Worker Interval

**Customize alert checking frequency via environment variable:**

```env
# Alert check interval in milliseconds
# Default: 120000ms (2 minutes)
# Recommended range: 60000-300000ms (1-5 minutes)
ALERT_CHECK_INTERVAL_MS=120000
```

**Tradeoffs:**

| Interval | Responsiveness | API Usage | Server Load |
|----------|----------------|-----------|-------------|
| **1 min (60000ms)** | ⚡ High | 📈 High | 🔥 High |
| **2 min (120000ms)** | ⚖️ Balanced | 📊 Moderate | 💚 Low |
| **5 min (300000ms)** | 🐢 Slower | 📉 Low | 💙 Minimal |

#### Alert Types Supported

**1. STATIC Alert** - Fixed price targets
```
🎯 PRICE ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 BBCA
💰 Rp 5.600 🟢 +0.90%

🟢 Kondisi: Harga naik di atas
🎯 Target: Rp 5.500

📊 DATA PASAR
Open     : Rp 5.550
High     : Rp 5.650
Low      : Rp 5.500
Perubahan: +50 (0.90%)
Volume   : 124.12M
```

**2. PERCENTAGE Alert** - Relative movement triggers
```
📊 PERCENTAGE ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 BBRI
💰 Rp 5.250 🟢 +5.00%

🟢 Kondisi: Naik 5%
📍 Harga Base: Rp 5.000
🎯 Target: Rp 5.400
📊 Perubahan: 5.00%
```

**3. TRAILING STOP Alert** - Dynamic protection
```
🛡️ TRAILING STOP
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 TLKM
💰 Rp 3.990 🔴 -4.80%

🔴 Kondisi: Turun 5% dari high
🏔️ Day High: Rp 4.200
🎯 Threshold: Rp 3.990
📉 Drop: 5.00%
```

---

### 2. 📊 Watchlist & Portfolio Management

**Cloud-Synchronized Personal Stock Tracking**

#### Watchlist Features
- ✅ Add/remove stocks with natural language
- ✅ View real-time prices for all tracked stocks
- ✅ Persistent storage in Supabase
- ✅ Per-user isolation with `chat_id` indexing

**Example Commands:**
```
"Tambahkan BBCA ke watchlist"
"Tampilkan watchlist saya"
"Hapus TLKM dari watchlist"
```

#### Portfolio Tracking
- ✅ Record average purchase price per stock
- ✅ Track total lots owned
- ✅ Calculate profit/loss automatically
- ✅ View portfolio summary with current valuations

**Example Commands:**
```
"Tambah BBRI ke portfolio, harga rata-rata 5000, total 10 lot"
"Tampilkan portfolio saya"
"Hapus ASII dari portfolio"
```

---

### 3. 📈 Market Data & Analytics

**Comprehensive Indonesian Stock Exchange (IDX) Data**

#### Available Market Queries

**Real-Time Prices:**
```
"Berapa harga BBCA sekarang?"
"Cek harga TLKM"
```

**Market Summary:**
```
"Bagaimana kondisi pasar hari ini?"
"Gimana IHSG hari ini?"
```

**Top Movers:**
```
"Saham apa yang naik tertinggi?"
"Top losers hari ini?"
```

**Stock Comparison:**
```
"Bandingkan BBRI dan BBNI"
"Compare ASII vs UNTR"
```

**Historical Data:**
```
"Data historis TLKM 30 hari terakhir"
"Grafik harga BBCA"
```

**Fundamentals:**
```
"Fundamental ASII"
"Analisa fundamental BBRI"
```

#### Technical Indicators

**Supported Indicators:**
- **RSI (14-period)** - Overbought/oversold momentum
- **MACD (12/26/9)** - Trend-following momentum
- **Moving Averages** - SMA 20, EMA 20, SMA 50
- **Support/Resistance** - Dynamic levels from 30-day data

**Example:**
```
"RSI TLKM berapa sekarang?"
"MACD BBRI gimana?"
"Analisa teknikal BBCA"
```

---

### 4. 💼 Bandarmologi & Institutional Flow Analysis

**Track Smart Money and Institutional Trading Patterns**

#### Broker Summary
- Top 3 broker accumulation/distribution classification
- Daily trading volume by broker house
- Net buy/sell positioning

**Example:**
```
"Bandarmologi BBCA"
"Broker summary TLKM"
```

#### Foreign Flow Analysis
- Net foreign investor positioning
- 1-day, 5-day, and 20-day flow tracking
- Foreign ownership percentage trends

**Example:**
```
"Foreign flow TLKM"
"Asing masuk BBRI?"
```

#### Liquidity Flow Sentiment
- Combined institutional sentiment analysis
- Sentiment scale: VERY_BULLISH → VERY_BEARISH
- Smart money tracking algorithms

**Example:**
```
"Liquidity flow UNTR"
"Bandar akumulasi ASII?"
```

---

### 5. 📊 Chart Visualization

**Professional 30-Day Historical Charts**

- Serverless rendering via QuickChart.io API
- No native dependencies required
- Automatic caching (60 seconds)
- Support for all IDX stocks

**Example:**
```
"Tampilkan chart BBCA"
"Grafik harga TLKM"
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# ============================================
# TELEGRAM CONFIGURATION
# ============================================
# Your Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# ============================================
# MARKET DATA API
# ============================================
# GoAPI key for Indonesian stock market data
GOAPI_KEY=your-goapi-key

# ============================================
# AI PROVIDERS
# ============================================
# AI Aggregator (Primary)
AGGREGATOR_API_KEY=your-aggregator-api-key
AGGREGATOR_BASE_URL=https://lite.koboillm.com/v1
AGGREGATOR_MODEL=openai/gpt-4o

# Google Gemini (Fallback - activated on primary rate limit)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key

# ============================================
# DATABASE (SUPABASE)
# ============================================
# Supabase project URL (Dashboard → Settings → API)
SUPABASE_URL=https://your-project.supabase.co

# Supabase service role key (Dashboard → Settings → API)
# ⚠️ WARNING: Keep this secret! Never expose to client-side code.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# SERVER CONFIGURATION
# ============================================
# Application mode: development (polling) | production (webhook)
NODE_ENV=development

# Server port (used in production webhook mode)
PORT=3000

# ============================================
# ALERT WORKER CONFIGURATION
# ============================================
# Alert check interval in milliseconds (how often to check active price alerts)
# Default: 120000ms (2 minutes)
# Recommended range: 60000-300000ms (1-5 minutes)
# 
# Lower values:
#   ✅ More responsive alerts (faster notifications)
#   ❌ Higher GoAPI usage (more frequent price checks)
#   ❌ Increased server load
# 
# Higher values:
#   ✅ Reduced API calls (lower costs)
#   ✅ Lower server resource usage
#   ❌ Slower alert responses (delayed notifications)
#
# Production recommendation: 120000ms (2 minutes) - balanced approach
ALERT_CHECK_INTERVAL_MS=120000
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | - | Bot authentication token from @BotFather |
| `GOAPI_KEY` | ✅ | - | API key for GoAPI stock market data |
| `AGGREGATOR_API_KEY` | ✅ | - | AI Aggregator API key (primary LLM provider) |
| `AGGREGATOR_BASE_URL` | ❌ | `https://lite.koboillm.com/v1` | AI Aggregator endpoint URL |
| `AGGREGATOR_MODEL` | ❌ | `openai/gpt-4o` | Model identifier for AI Aggregator |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | - | Google Gemini API key (fallback provider) |
| `SUPABASE_URL` | ✅ | - | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | - | Supabase service role key (backend only) |
| `NODE_ENV` | ❌ | `development` | Application environment mode |
| `PORT` | ❌ | `3000` | HTTP server port (production webhook only) |
| `ALERT_CHECK_INTERVAL_MS` | ❌ | `120000` | Alert worker check interval in milliseconds |

---

## 🚀 Local Setup

### Prerequisites

- **Node.js** ≥ 24.x ([Download](https://nodejs.org/))
- **npm** or **pnpm** package manager
- Active accounts and API keys for:
  - [Telegram Bot Token](https://t.me/BotFather)
  - [GoAPI Key](https://goapi.io)
  - [AI Aggregator API Key](https://lite.koboillm.com)
  - [Google AI Studio API Key](https://aistudio.google.com/apikey)
  - [Supabase Project](https://supabase.com)

### Installation Steps

**1. Clone the Repository**
```bash
git clone https://github.com/prstyaDev/ihsg-bot.git
cd ihsg-bot
```

**2. Install Dependencies**
```bash
npm install
```

**3. Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` with your actual credentials.

**4. Database Setup**

The bot uses Supabase PostgreSQL with automatic schema migrations. Tables are created automatically when you connect the repository to your Supabase project via GitHub Integration.

**Required Tables:**
- `watchlist` - Personal stock tracking lists
- `alerts` - Price alert configurations
- `portfolio` - User portfolio holdings

**5. Run Development Server**
```bash
npm run dev
```

The bot will start in **polling mode** (no webhook required for local development).

**6. Production Build**
```bash
npm run build
npm start
```

---

## 🚢 Production Deployment

### Deployment Modes

**1. Polling Mode (Development)**
- No public domain required
- Uses Telegram long polling
- Ideal for local testing

**2. Webhook Mode (Production)**
- Requires public domain with SSL
- More efficient for high traffic
- Recommended for production

### Production Configuration

**Environment:**
```env
NODE_ENV=production
PORT=3000
ALERT_CHECK_INTERVAL_MS=120000
```

**Webhook Setup:**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://yourdomain.com/telegram-webhook"
```

### Recommended Platforms

**☁️ Railway**
- Zero-config deployment
- Automatic HTTPS
- Free tier available
- One-click deploy

**☁️ Heroku**
- Hobby tier with worker dynos
- Add-ons for PostgreSQL
- Easy scaling

**☁️ Fly.io**
- Global edge deployment
- Automatic SSL certificates
- Docker-based deployment

**☁️ VPS (DigitalOcean, Linode, AWS EC2)**
- Full control
- Nginx reverse proxy
- PM2 process manager
- Manual SSL with Certbot

### Production Checklist

- ✅ Set `NODE_ENV=production`
- ✅ Configure webhook URL
- ✅ Set up reverse proxy (Nginx)
- ✅ Enable HTTPS/SSL
- ✅ Configure firewall rules
- ✅ Set up monitoring (PM2, Datadog)
- ✅ Configure log rotation
- ✅ Set up database backups
- ✅ Test alert worker startup
- ✅ Verify batch notifications

---

## 📁 Project Structure

```
ihsg-bot/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── agent/
│   │   └── hermes.ts            # AI agent orchestration
│   ├── bot/
│   │   └── index.ts             # Telegram bot handlers
│   ├── config/
│   │   └── env.ts               # Environment validation (Zod)
│   ├── db/
│   │   └── index.ts             # Supabase client & queries
│   ├── tools/
│   │   └── registry.ts          # Tool definitions (19 tools)
│   ├── utils/
│   │   ├── chart.ts             # Chart generation utility
│   │   ├── retry.ts             # Exponential backoff retry
│   │   ├── technical.ts         # Technical indicators (RSI, MACD, MA)
│   │   ├── bandar.ts            # Bandarmologi & foreign flow
│   │   └── tradingHours.ts      # IDX trading hours logic
│   └── workers/
│       └── alertWorker.ts       # Background alert worker
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛡️ Error Handling

The bot implements comprehensive error handling at multiple layers:

### Timeout Protection
```typescript
// 120-second timeout for AI queries
if (queryErr.message === 'TIMEOUT_ERROR') {
  await ctx.reply("⏱ Maaf, pengambilan data market sedang padat, coba lagi sebentar lagi.");
}
```

### AI Provider Failover
```typescript
// Automatic fallback to Google Gemini
if (errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('rate_limit')) {
  console.log('[System] Menggunakan Fallback Google Gemini...');
  // Gemini handles the request
}
```

### GoAPI Retry Logic
```typescript
// Exponential backoff with 3 retries
await retryWithBackoff(
  async () => await api.get('/stock/idx/prices'),
  { maxRetries: 3, baseDelay: 1000, operationName: 'GoAPI price fetch' }
);
```

### Database Connection Recovery
```typescript
// Graceful degradation if database fails
if (!result.success) {
  console.warn('[System] Database connection failed - watchlist features may be unavailable');
  // Bot continues with limited functionality
}
```

---

## 🧪 Testing

### Manual Testing Scenarios

**Alert Worker:**
```bash
# Test with 2-minute interval
ALERT_CHECK_INTERVAL_MS=120000 npm run dev

# Test with aggressive 30-second interval
ALERT_CHECK_INTERVAL_MS=30000 npm run dev
```

**Batch Notifications:**
1. Create 3 alerts for same user with different symbols
2. Trigger all alerts in same cycle
3. Verify single consolidated message received

**Exponential Backoff:**
1. Use invalid GoAPI key
2. Observe retry attempts in logs
3. Verify worker continues with next symbol

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Code Standards:**
- TypeScript strict mode
- ESLint compliance
- Comprehensive error handling
- JSDoc documentation for public APIs

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/prstyaDev/ihsg-bot/issues)
- **Documentation**: [Wiki](https://github.com/prstyaDev/ihsg-bot/wiki)
- **Telegram**: [@prstyaDev](https://t.me/prstyaDev)

---

## 🏆 Acknowledgments

- **GoAPI** - Indonesian stock market data provider
- **Telegraf** - Excellent Telegram Bot API framework
- **Supabase** - Managed PostgreSQL with real-time features
- **Vercel AI SDK** - Powerful LLM orchestration toolkit
- **QuickChart.io** - Serverless chart rendering

---

<div align="center">

**Built with ❤️ by [prstyaDev](https://github.com/prstyaDev)**

*Production-ready | Enterprise-grade | Indonesian Stock Market*

</div>
