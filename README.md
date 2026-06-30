# IHSG Analytics Bot

> An AI-powered Telegram bot for Indonesia Stock Exchange (IHSG) analytics, real-time market data, watchlist management, and intelligent price alerts.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-brightgreen)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📋 Overview

IHSG Analytics Bot is a production-ready Telegram bot that delivers comprehensive Indonesian stock market analytics powered by AI. The bot integrates with GoAPI for real-time market data, uses AI Aggregator (primary) and Google Gemini (fallback) for intelligent analysis, and provides persistent storage through Supabase PostgreSQL.

### Key Capabilities

- **Real-time Market Data**: Live stock prices, market trends, top gainers/losers, and fundamental analysis
- **AI-Powered Analysis**: Natural language processing for stock queries and intelligent recommendations
- **Watchlist Management**: Personal stock tracking with cloud synchronization
- **Price Alerts**: Customizable notifications for target prices (ABOVE/BELOW conditions)
- **Chart Visualization**: Serverless chart rendering with 30-day historical data via QuickChart API
- **Portfolio Tracking**: Monitor your holdings with average price and lot calculations

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **TypeScript** | 5.x | Type-safe development |
| **Node.js** | 24.x | Runtime environment |
| **Telegraf** | 4.x | Telegram Bot API framework |
| **Vercel AI SDK** | 6.x | LLM orchestration & tool calling |
| **Supabase** | 2.x | Cloud PostgreSQL database |
| **Express** | 5.x | HTTP server (webhook mode) |
| **Axios** | 1.x | HTTP client for external APIs |
| **Zod** | 4.x | Schema validation |
| **QuickChart.io** | API | Serverless chart rendering |

### AI Providers

- **Primary**: AI Aggregator (via OpenAI-compatible SDK)
- **Fallback**: Google Gemini (when primary hits rate limits)

---

## 📦 Prerequisites

Before getting started, ensure you have:

- **Node.js** ≥ 24.x installed ([Download](https://nodejs.org/))
- **npm** or **pnpm** package manager
- Active accounts and API keys for:
  - [Telegram Bot Token](https://t.me/BotFather) - Create a bot with @BotFather
  - [GoAPI Key](https://goapi.io) - Indonesian stock market data provider
  - [AI Aggregator API Key](https://lite.koboillm.com) - Primary LLM provider
  - [Google AI Studio API Key](https://aistudio.google.com/apikey) - Fallback LLM provider
  - [Supabase Project](https://supabase.com) - Cloud PostgreSQL database

---

## ⚙️ Environment Variables

Create a `.env` file in the project root with the following variables:

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

# Google Gemini (Fallback)
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
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | - | Bot authentication token from @BotFather |
| `GOAPI_KEY` | ✅ | - | API key for GoAPI stock market data |
| `AGGREGATOR_API_KEY` | ✅ | - | AI Aggregator API key (primary provider) |
| `AGGREGATOR_BASE_URL` | ❌ | `https://lite.koboillm.com/v1` | AI Aggregator endpoint URL |
| `AGGREGATOR_MODEL` | ❌ | `openai/gpt-4o` | Model identifier for AI Aggregator |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | - | Google Gemini API key (fallback provider) |
| `SUPABASE_URL` | ✅ | - | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | - | Supabase service role key (backend only) |
| `NODE_ENV` | ❌ | `development` | Application environment mode |
| `PORT` | ❌ | `3000` | HTTP server port (production only) |

---

## 🚀 Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/prstyaDev/ishg-bot.git
cd ishg-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials (see [Environment Variables](#%EF%B8%8F-environment-variables) section).

### 4. Database Setup

The bot uses Supabase PostgreSQL with automatic schema migrations. Tables are created automatically when you connect the repository to your Supabase project via GitHub Integration.

**Required Tables:**

- `watchlist` - Personal stock tracking lists
- `alerts` - Price alert configurations
- `portfolio` - User portfolio holdings

### 5. Run Development Server

```bash
npm run dev
```

The bot will start in **polling mode** (no webhook required for local development).

### 6. Production Build

```bash
npm run build
npm start
```

In production mode (`NODE_ENV=production`), the bot runs in **webhook mode** and requires:
- Public domain with HTTPS
- Accessible port (default: 3000)

---

## 📚 Core Features Guide

### 1. Watchlist Management

Track your favorite stocks with personal watchlists stored in the cloud.

**Commands:**

```
📌 Add to watchlist:
"Tambahkan BBCA ke watchlist"

📋 View watchlist:
"Tampilkan watchlist saya"

🗑️ Remove from watchlist:
"Hapus TLKM dari watchlist"
```

**Technical Details:**
- Stored in Supabase `watchlist` table
- Indexed by `chat_id` for per-user isolation
- Factory pattern injection for automatic user context

### 2. Price Alerts

Set intelligent alerts that notify you when stocks hit target prices.

**Commands:**

```
🔔 Set alert:
"Beri tahu saya jika BBRI di atas 5000"
"Alert jika ASII di bawah 4500"

📊 View alerts:
"Tampilkan semua alert saya"

❌ Remove alert:
"Hapus alert BBCA"
```

**Alert Conditions:**
- `ABOVE` - Notify when price exceeds target
- `BELOW` - Notify when price drops below target

**Technical Details:**
- Stored in Supabase `alerts` table with `is_active` flag
- Background job checks prices against active alerts
- Automatic deactivation after trigger

### 3. Chart Visualization

Generate professional stock price charts with historical data.

**Commands:**

```
📈 Request chart:
"Tampilkan chart BBCA"
"Grafik harga TLKM"
```

**Features:**
- 30-day historical price data
- Serverless rendering via QuickChart.io API
- No native dependencies required
- Automatic caching (60 seconds)

**Technical Implementation:**
```typescript
// Rendered via QuickChart.io API
GET https://quickchart.io/chart
```

### 4. Market Data Analysis

Query real-time market data and get AI-powered insights.

**Available Queries:**

```
💰 Stock price:
"Berapa harga BBCA sekarang?"

📊 Market summary:
"Bagaimana kondisi pasar hari ini?"

🚀 Top movers:
"Saham apa yang naik tertinggi?"

📉 Top losers:
"Saham apa yang turun paling banyak?"

🔍 Compare stocks:
"Bandingkan BBRI dan BBNI"

📈 Historical data:
"Data historis TLKM 30 hari terakhir"

📄 Fundamentals:
"Fundamental ASII"

🏢 Broker summary:
"Bandarmologi BBCA"
```

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Telegram   │────▶│   Telegraf   │────▶│   Hermes     │────▶│ AI Aggregator│
│   User       │◀────│   Bot Handler│◀────│   AI Agent   │◀────│   (Primary)  │
└──────────────┘     └──────────────┘     └──────┬───────┘     └──────────────┘
                                                  │                      │
                                          tool call│               Fallback on
                                                  │               rate limit
                                    ┌─────────────┼─────────────┐        │
                                    ▼             ▼             ▼        ▼
                             ┌───────────┐ ┌───────────┐ ┌──────────────┐
                             │  GoAPI    │ │ Supabase  │ │   Google     │
                             │  IDX Data │ │ PostgreSQL│ │   Gemini     │
                             └───────────┘ └───────────┘ └──────────────┘
```

### Component Layers

| Layer | File | Responsibility |
|-------|------|----------------|
| **Entry Point** | `src/index.ts` | Express server, Telegraf initialization, database connection |
| **Bot Handler** | `src/bot/index.ts` | Message routing, timeout handling, rate limiting |
| **AI Agent** | `src/agent/hermes.ts` | LLM orchestration, tool calling, session management |
| **Tool Registry** | `src/tools/registry.ts` | 11 tools for market data + watchlist operations |
| **Database** | `src/db/index.ts` | Supabase client, data access layer |
| **Chart Utility** | `src/utils/chart.ts` | QuickChart.io integration |
| **Config** | `src/config/env.ts` | Environment validation (Zod schema) |

---

## 🔧 Tool Registry

The bot exposes 11 tools to the AI agent:

### Market Data Tools (8)

| Tool | API Endpoint | Parameters | Description |
|------|--------------|------------|-------------|
| `get_stock_price` | `GET /stock/idx/prices` | `symbol` | Current stock price |
| `get_market_summary` | `GET /stock/idx/trending` | - | IHSG summary & trends |
| `get_top_movers` | `GET /stock/idx/top_gainer` | - | Top 10 gainers & losers |
| `compare_emiten` | `GET /stock/idx/prices` | `symbol1`, `symbol2` | Compare two stocks |
| `get_historical_data` | `GET /stock/idx/{symbol}/historical` | `symbol` | 30-day historical data |
| `get_fundamentals` | `GET /stock/idx/{symbol}/profile` | `symbol` | Financial ratios & profile |
| `get_broker_summary` | `GET /stock/idx/{symbol}/broker_summary` | `symbol`, `date?` | Broker trading activity |
| `request_chart` | Internal | `symbol` | Generate price chart |

### Watchlist Tools (3)

| Tool | Parameters | Description |
|------|------------|-------------|
| `add_to_watchlist` | `symbol` | Add stock to watchlist |
| `get_watchlist` | - | Retrieve user's watchlist |
| `remove_from_watchlist` | `symbol` | Remove stock from watchlist |

> **Note**: Watchlist tools use factory pattern with automatic `chat_id` injection from Telegram context.

---

## 🗄️ Database Schema

### Supabase Tables

#### `watchlist`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `chat_id` | `bigint` | Telegram chat identifier |
| `symbol` | `text` | Stock symbol (e.g., BBCA) |
| `created_at` | `timestamp` | Creation timestamp |

#### `alerts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `chat_id` | `bigint` | Telegram chat identifier |
| `symbol` | `text` | Stock symbol |
| `target_price` | `numeric` | Alert trigger price |
| `condition` | `text` | `ABOVE` or `BELOW` |
| `is_active` | `boolean` | Alert active status |
| `created_at` | `timestamp` | Creation timestamp |

#### `portfolio`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `chat_id` | `bigint` | Telegram chat identifier |
| `symbol` | `text` | Stock symbol |
| `average_price` | `numeric` | Average purchase price |
| `total_lot` | `integer` | Total lots owned |
| `created_at` | `timestamp` | Creation timestamp |

---

## 🛡️ Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| **Request Timeout (>120s)** | Bot sends: "Pengambilan data market sedang padat, coba lagi sebentar" |
| **AI Aggregator Rate Limit** | Automatic fallback to Google Gemini with log: `[System] Menggunakan Fallback Google Gemini...` |
| **Gemini Fallback Failure** | User notification: "⚠️ API Aggregator mencapai limit, dan Google Gemini sebagai fallback juga mengalami error. Silakan coba lagi nanti." |
| **GoAPI Service Error** | Per-tool error handling, AI relays error message to user |
| **Empty Tool Response** | Fallback to Phase 2: AI generates analysis from raw data |
| **Database Connection Lost** | Automatic reconnection with exponential backoff |

---

## 🚢 Deployment

### Development Mode (Polling)

```bash
NODE_ENV=development npm run dev
```

- No public domain required
- Uses Telegram long polling
- Ideal for local testing

### Production Mode (Webhook)

```bash
NODE_ENV=production npm start
```

**Requirements:**
- Public domain with valid SSL certificate
- Open port (default: 3000)
- Webhook URL configured with Telegram

**Webhook Setup:**

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://yourdomain.com/telegram-webhook"
```

### Recommended Platforms

- **Railway** - Zero-config deployment with automatic HTTPS
- **Heroku** - Hobby tier with worker dynos
- **Fly.io** - Global edge deployment
- **VPS** - DigitalOcean, Linode, or AWS EC2 with Nginx reverse proxy

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
│   │   └── env.ts               # Environment validation
│   ├── db/
│   │   └── index.ts             # Database client & queries
│   ├── tools/
│   │   └── registry.ts          # Tool definitions (11 tools)
│   └── utils/
│       └── chart.ts             # Chart generation utility
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/prstyaDev/ishg-bot/issues)
- **Documentation**: [Wiki](https://github.com/prstyaDev/ishg-bot/wiki)
- **Telegram**: [@prstyaDev](https://t.me/prstyaDev)

---

<div align="center">

**Built with ❤️ by [prstyaDev](https://github.com/prstyaDev)**

</div>
