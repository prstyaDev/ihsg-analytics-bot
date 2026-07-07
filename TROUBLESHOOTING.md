# Troubleshooting: POST /api/chat 404 Error

## Problem

Web Vercel frontend menembak ke backend via Cloudflare tunnel dan mendapat error **404 Not Found** pada endpoint `POST /api/chat`.

## Root Cause

Server Express hanya memiliki routing untuk:
- Telegram webhook (`/webhook/<secret>`) 
- Tidak ada endpoint `/api/chat` untuk web client

## Solution Implemented

### 1. Added REST API Router (`src/api/chat.ts`)

**Features:**
- ✅ JWT authentication middleware
- ✅ POST /api/chat endpoint with streaming (SSE)
- ✅ GET /api/health endpoint
- ✅ Integration with Hermes AI agent
- ✅ Automatic fallback (Aggregator → Gemini)
- ✅ Proper error handling

### 2. Updated Main Server (`src/index.ts`)

**Changes:**
- Added CORS middleware for cross-origin requests
- Mounted API router at `/api/*` namespace
- Added root endpoint `/` for service info
- Express now serves both Telegram webhook + REST API

### 3. Added JWT Authentication

**Environment:**
```env
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

**Generate Secret:**
```bash
openssl rand -hex 32
```

**Token Generation:**
```bash
npm run token <userId> <chatId> [expiresIn]
```

### 4. Updated Dependencies

```bash
npm install jsonwebtoken cors
npm install --save-dev @types/jsonwebtoken @types/cors
```

## Verification Steps

### Step 1: Build Project

```bash
npm run build
```

**Expected:** No TypeScript errors

### Step 2: Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
[System] Database connected and ready.
[System] Alert worker started...
Sistem aktif dalam mode Polling
```

### Step 3: Test Endpoints

**A. Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-07T12:00:00.000Z",
  "service": "IHSG Analytics Bot API"
}
```

**B. Root Endpoint:**
```bash
curl http://localhost:3000/
```

**Expected Response:**
```json
{
  "service": "IHSG Analytics Bot",
  "status": "running",
  "version": "2.0.0",
  "endpoints": {
    "chat": "POST /api/chat",
    "health": "GET /api/health"
  }
}
```

**C. Unauthorized Request (should fail):**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

**Expected Response:**
```json
{
  "error": "Missing or invalid authorization header"
}
```

**Status Code:** 401

**D. Generate JWT Token:**
```bash
npm run token testuser123 testchat456 7d
```

**Expected Output:**
```
🔐 JWT Token Generated:

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

📋 Usage in API request:

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

✅ Token valid for: 7d
```

**E. Authenticated Request:**
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"message":"Halo Hermes!"}'
```

**Expected Response (streaming):**
```
data: {"type":"text","content":"Halo"}
data: {"type":"text","content":"! "}
data: {"type":"text","content":"Ada yang"}
data: {"type":"text","content":" bisa"}
...
data: {"type":"done"}
```

### Step 4: Run Automated Tests

```bash
./test-api.sh
```

**Expected:** All 5 test steps pass with green checkmarks

## Cloudflare Tunnel Setup

### Start Tunnel

```bash
# Install cloudflared (if not installed)
brew install cloudflare/cloudflare/cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

**Expected Output:**
```
Your quick Tunnel has been created! Visit it at:
https://xxx-yyy-zzz.trycloudflare.com
```

### Update Frontend

Update your Vercel frontend API base URL to:
```
https://xxx-yyy-zzz.trycloudflare.com
```

### Test from Frontend

**JavaScript Fetch:**
```javascript
const response = await fetch('https://xxx-yyy-zzz.trycloudflare.com/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
  },
  body: JSON.stringify({
    message: 'Berapa harga BBCA?',
    messages: [],
  }),
});

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process SSE events
  console.log(chunk);
}
```

## Common Issues & Solutions

### Issue 1: "Cannot GET /api/chat"

**Problem:** Using GET instead of POST

**Solution:** Use POST method with Content-Type: application/json

### Issue 2: 401 Unauthorized

**Problem:** Missing or invalid JWT token

**Solutions:**
- Generate new token: `npm run token <userId> <chatId> 7d`
- Verify Authorization header format: `Bearer <token>`
- Check JWT_SECRET matches between token generation and server

### Issue 3: 403 Forbidden

**Problem:** Expired or invalid JWT token

**Solutions:**
- Generate fresh token
- Check server logs for JWT verification errors
- Verify JWT_SECRET is set in .env

### Issue 4: CORS Error in Browser

**Problem:** Cross-origin request blocked

**Solutions:**
- Ensure CORS middleware is enabled in `src/index.ts`
- For production, add your frontend domain to allowed origins:
  ```typescript
  app.use(cors({
    origin: ['https://your-frontend.vercel.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  ```

### Issue 5: Streaming Not Working

**Problem:** Response buffering or connection closed prematurely

**Solutions:**
- Use `-N` flag with curl to disable buffering
- Check that client supports Server-Sent Events (SSE)
- Verify response headers include `Content-Type: text/event-stream`
- For Nginx reverse proxy, disable buffering:
  ```nginx
  proxy_buffering off;
  proxy_cache off;
  ```

### Issue 6: "AI Provider Error"

**Problem:** Both Aggregator and Gemini failing

**Solutions:**
- Check API keys in .env:
  - `AGGREGATOR_API_KEY`
  - `GOOGLE_GENERATIVE_AI_API_KEY`
- Verify API quotas not exceeded
- Check server logs for specific error messages

### Issue 7: Missing Environment Variable

**Problem:** Server crashes on startup with Zod validation error

**Solution:** Ensure all required env vars are set:
```env
TELEGRAM_BOT_TOKEN=xxx
GOAPI_KEY=xxx
AGGREGATOR_API_KEY=xxx
GOOGLE_GENERATIVE_AI_API_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx (minimum 32 chars)
```

## Production Checklist

Before deploying to production:

- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Configure CORS with specific frontend domain
- [ ] Set NODE_ENV=production
- [ ] Configure HTTPS (via Cloudflare, Nginx, or load balancer)
- [ ] Test all endpoints with production credentials
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting (optional but recommended)
- [ ] Set up reverse proxy with proper buffering settings
- [ ] Test streaming with production infrastructure
- [ ] Document production URLs for team

## Monitoring

**Check Server Logs:**
```bash
# Development
npm run dev

# Production with PM2
pm2 logs ihsg-bot
```

**Key Log Messages:**
- `[API /chat] User: xxx, ChatId: xxx, Message: xxx` - Incoming request
- `[JWT Error]: ...` - Authentication issues
- `[Aggregator Stream Error]: ...` - Primary AI provider issues
- `[System] Switching to Gemini fallback...` - Automatic failover
- `[Gemini Fallback Error]: ...` - Fallback provider issues

## Support

For additional help:
- Full documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- GitHub Issues: https://github.com/prstyaDev/ihsg-analytics-bot/issues
- Telegram: @prstyaDev

## Summary

**Problem:** 404 on POST /api/chat  
**Root Cause:** Missing REST API endpoints  
**Solution:** Added complete REST API with JWT auth + streaming  
**Status:** ✅ Fixed and tested  
**Next Steps:** Deploy with Cloudflare tunnel → Update frontend URL → Test end-to-end
