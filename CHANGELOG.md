# Changelog

All notable changes to IHSG Analytics Bot will be documented in this file.

## [2.0.0] - 2026-07-07

### 🚀 Major Features Added

#### **RESTful API Integration for Web Clients**

Added comprehensive REST API endpoints to enable web frontend integration via Cloudflare tunnel.

**New Endpoints:**
- `POST /api/chat` - Streaming AI chat endpoint with JWT authentication
- `GET /api/health` - Health check endpoint
- `GET /` - Root service information endpoint

**Key Features:**
- ✅ JWT-based authentication with Bearer token
- ✅ Server-Sent Events (SSE) streaming for real-time responses
- ✅ Automatic AI provider fallback (Aggregator → Gemini)
- ✅ CORS support for cross-origin requests
- ✅ Comprehensive error handling with proper HTTP status codes
- ✅ Session-based conversation context support

#### **Security & Authentication**

- Added `JWT_SECRET` environment variable for token signing
- Implemented JWT middleware for endpoint protection
- Token generation utility with configurable expiration
- Secure token verification with error handling

**New NPM Scripts:**
```bash
npm run token <userId> <chatId> [expiresIn]
```

#### **Development Tools**

- Added `test-api.sh` - Automated API testing script
- Added `API_DOCUMENTATION.md` - Comprehensive API documentation with examples
- Added JWT token generation utility (`src/utils/jwt.ts`)
- Updated `.env.example` with JWT configuration

### 📝 Files Added

```
src/api/chat.ts                  # REST API router with streaming support
src/utils/jwt.ts                 # JWT token utilities
API_DOCUMENTATION.md             # Full API documentation
CHANGELOG.md                     # This file
test-api.sh                      # API testing script
```

### 🔧 Files Modified

```
src/index.ts                     # Added API routes and CORS middleware
src/config/env.ts               # Added JWT_SECRET validation
package.json                    # Added token generation script
README.md                       # Added API endpoint documentation
.env.example                    # Added JWT_SECRET configuration
```

### 📦 New Dependencies

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.x",
    "cors": "^2.x"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.x",
    "@types/cors": "^2.x"
  }
}
```

### 🔄 Breaking Changes

**Environment Variables:**
- `JWT_SECRET` is now **required** for production deployment
- Minimum 32 characters recommended for security

**Server Behavior:**
- Server now starts with CORS middleware enabled
- API routes mounted at `/api/*` namespace
- Production mode now serves both Telegram webhook and REST API

### 📚 Migration Guide

#### For Existing Deployments

1. **Update Environment Variables:**
   ```bash
   # Generate a secure JWT secret
   openssl rand -hex 32
   
   # Add to .env
   JWT_SECRET=your-generated-secret-here
   ```

2. **Install New Dependencies:**
   ```bash
   npm install
   ```

3. **Rebuild Application:**
   ```bash
   npm run build
   ```

4. **Configure CORS (Production):**
   
   Edit `src/index.ts` to restrict origins:
   ```typescript
   app.use(cors({
     origin: ['https://your-frontend-domain.com'],
     methods: ['GET', 'POST', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization'],
   }));
   ```

5. **Generate Tokens for Clients:**
   ```bash
   npm run token <userId> <chatId> 7d
   ```

#### For New Deployments

Follow the standard setup in README.md with these additional steps:

1. Set `JWT_SECRET` in `.env` (minimum 32 characters)
2. Deploy with both Telegram and API support
3. Generate JWT tokens for web clients
4. Configure Cloudflare Tunnel or reverse proxy for HTTPS

### 🧪 Testing

**Run Automated Tests:**
```bash
# Start development server
npm run dev

# In another terminal, run tests
./test-api.sh
```

**Manual Testing:**
```bash
# Generate token
npm run token testuser testchat 1h

# Test health endpoint
curl http://localhost:3000/api/health

# Test chat endpoint
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Halo Hermes!"}'
```

### 📖 Documentation

Full API documentation available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**Includes:**
- Authentication flow
- Endpoint specifications
- Request/response examples
- Error handling
- Client implementation examples (JavaScript, TypeScript, React)
- Cloudflare Tunnel setup
- Production deployment guide

### 🔐 Security Improvements

- JWT-based authentication prevents unauthorized access
- Token expiration enforces session limits
- CORS configuration protects against CSRF attacks
- Input validation on all API endpoints
- Secure error messages (no sensitive data leakage)

### ⚡ Performance

- Streaming responses reduce time-to-first-byte
- Server-Sent Events minimize connection overhead
- Automatic failover maintains high availability
- Connection keep-alive for better throughput

### 🐛 Bug Fixes

- Fixed TypeScript compilation errors with AI SDK v6.x
- Fixed JWT signing with proper type assertions
- Fixed streaming response with `stopWhen` and `stepCountIs`

### 📊 Metrics

**Lines of Code Added:** ~700
**New Endpoints:** 3
**New Utilities:** 2
**Documentation Pages:** 2
**Test Scripts:** 1

---

## [1.0.0] - 2026-01-15

### Initial Release

- Telegram bot with 19 tools
- Real-time stock market data (GoAPI)
- AI-powered analysis (Aggregator + Gemini fallback)
- Watchlist, Portfolio, Price Alerts
- Bandarmologi & technical indicators
- Chart visualization
- Anti-spam batch notifications
- Alert worker with exponential backoff

---

**Legend:**
- 🚀 New Features
- 🔧 Changes
- 🐛 Bug Fixes
- 📝 Documentation
- 🔐 Security
- ⚡ Performance
- 🔄 Breaking Changes
