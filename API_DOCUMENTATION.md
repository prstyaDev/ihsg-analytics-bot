# API Documentation - IHSG Analytics Bot

## Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication

All `/api/chat` requests require JWT authentication via Bearer token.

### Generate JWT Token

```bash
npm run token <userId> <chatId> [expiresIn]
```

**Example:**
```bash
npm run token user123 chat456 7d
```

**Output:**
```
🔐 JWT Token Generated:

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMTIzIiwiY2hhdElkIjoiY2hhdDQ1NiIsImlhdCI6MTcwNzM5MjQwMCwiZXhwIjoxNzA3OTk3MjAwfQ.xxx

📋 Usage in API request:

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

✅ Token valid for: 7d
```

## Endpoints

### 1. Health Check

Check if the API is running.

**Endpoint:** `GET /api/health`

**Authentication:** None

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-07T12:00:00.000Z",
  "service": "IHSG Analytics Bot API"
}
```

---

### 2. Chat with AI Agent (Streaming)

Send a message to the Hermes AI agent and receive streaming responses.

**Endpoint:** `POST /api/chat`

**Authentication:** Bearer Token (JWT)

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

**Request Body:**
```json
{
  "message": "Berapa harga BBCA sekarang?",
  "messages": [
    {
      "role": "user",
      "content": "Halo"
    },
    {
      "role": "assistant",
      "content": "Halo! Ada yang bisa saya bantu tentang pasar saham hari ini?"
    }
  ]
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ Yes | User's current message |
| `messages` | array | ❌ Optional | Conversation history for context |

**Messages Array Format:**
```typescript
{
  role: "user" | "assistant",
  content: string
}
```

**Response:** Server-Sent Events (SSE) Stream

The response is sent as `text/event-stream` with multiple events:

#### Event Types:

**1. Text Chunk (AI response streaming):**
```
data: {"type":"text","content":"Harga BBCA saat ini adalah "}
```

**2. Done (streaming completed):**
```
data: {"type":"done"}
```

**3. Done with Fallback (used Gemini instead of Aggregator):**
```
data: {"type":"done","fallback":true}
```

**4. Error:**
```
data: {"type":"error","content":"⚠️ Layanan AI sedang mengalami gangguan."}
```

---

## Full Example

### cURL Example

```bash
# Generate token first
npm run token webuser123 websession456

# Use token in request
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "message": "Berapa harga BBCA sekarang?",
    "messages": []
  }'
```

### JavaScript Fetch Example

```javascript
const token = 'YOUR_JWT_TOKEN_HERE';
const apiUrl = 'http://localhost:3000/api/chat';

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    message: 'Berapa harga BBCA sekarang?',
    messages: [], // Optional conversation history
  }),
});

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      
      if (data.type === 'text') {
        console.log(data.content); // Stream text chunk
      } else if (data.type === 'done') {
        console.log('Stream completed');
      } else if (data.type === 'error') {
        console.error('Error:', data.content);
      }
    }
  }
}
```

### TypeScript React Example

```typescript
import { useState } from 'react';

function ChatComponent() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message: string) => {
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
        },
        body: JSON.stringify({ message, messages: [] }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            
            if (data.type === 'text') {
              setResponse(prev => prev + data.content);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => sendMessage('Berapa harga BBCA?')}>
        Send
      </button>
      <div>{response}</div>
    </div>
  );
}
```

---

## Error Responses

### 401 Unauthorized
Missing or invalid authorization header.

```json
{
  "error": "Missing or invalid authorization header"
}
```

### 403 Forbidden
Invalid or expired JWT token.

```json
{
  "error": "Invalid or expired token"
}
```

### 400 Bad Request
Invalid request body (missing message field).

```json
{
  "error": "Message is required and must be a string"
}
```

### 500 Internal Server Error
Server error during processing.

```json
{
  "error": "Internal server error",
  "message": "Error details here"
}
```

---

## Rate Limiting

Currently, there is **no rate limiting** implemented. Consider adding rate limiting middleware in production:

```bash
npm install express-rate-limit
```

---

## CORS Configuration

Default CORS settings allow all origins (`*`). For production, configure specific allowed origins in `src/index.ts`:

```typescript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## Cloudflare Tunnel Setup

If you're using Cloudflare Tunnel to expose your local server:

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

This will give you a public URL like `https://xxx.trycloudflare.com` that proxies to your local server.

**Web Vercel Frontend:**
Update your API base URL to:
```
https://xxx.trycloudflare.com/api/chat
```

---

## Testing

### Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

### Test Chat Endpoint
```bash
# Generate token
npm run token testuser testchat 1h

# Test with token
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"message":"Halo Hermes!"}'
```

The `-N` flag disables buffering to see streaming output in real-time.

---

## Environment Variables

Make sure these are set in your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
AGGREGATOR_API_KEY=your-aggregator-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
GOAPI_KEY=your-goapi-key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
NODE_ENV=development
```

---

## Security Considerations

1. **JWT Secret:** Use a strong, randomly generated secret (minimum 32 characters)
   ```bash
   openssl rand -hex 32
   ```

2. **CORS:** Configure specific allowed origins in production

3. **HTTPS:** Always use HTTPS in production (Cloudflare Tunnel provides this automatically)

4. **Token Expiration:** Set appropriate expiration times for JWT tokens (default: 7 days)

5. **Rate Limiting:** Add rate limiting to prevent abuse

6. **Input Validation:** All user inputs are validated, but consider additional sanitization for production

---

## Troubleshooting

### "Missing or invalid authorization header"
- Make sure you're sending the `Authorization` header
- Format must be: `Bearer <token>`
- Token must not have expired

### "Invalid or expired token"
- Generate a new token using `npm run token`
- Check that JWT_SECRET in `.env` matches the one used to generate the token

### Connection refused / Cannot connect
- Make sure the server is running: `npm run dev`
- Check the PORT in `.env` matches your request URL
- For Cloudflare Tunnel, make sure `cloudflared` is running

### Streaming not working
- Make sure your client supports Server-Sent Events (SSE)
- Check that `Content-Type: text/event-stream` is in the response headers
- Use `-N` flag with cURL to disable buffering

---

## Deployment

### Deploy to Production Server

1. **Build:**
   ```bash
   npm run build
   ```

2. **Set Production Environment:**
   ```env
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=<strong-secret-here>
   ```

3. **Start:**
   ```bash
   npm start
   ```

4. **Use Process Manager (PM2):**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name ihsg-bot
   pm2 save
   pm2 startup
   ```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Important for SSE streaming
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/prstyaDev/ihsg-analytics-bot/issues
- Telegram: @prstyaDev
