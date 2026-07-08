# 🚀 Quick Reference: API Chat Integration

**Updated:** 2026-07-08  
**API Version:** v1.0 (DataStream Protocol)

---

## 📌 Endpoint

```
POST /api/chat
```

---

## 🔐 Authentication

**Required Header:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Generate Token:**
```bash
npm run token <userId> <chatId> <duration>

# Example:
npm run token webuser123 websession456 7d
```

---

## 📤 Request Format

### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

### Body
```json
{
  "message": "Berapa harga BBCA?",
  "messages": [
    { "role": "user", "content": "Halo" },
    { "role": "assistant", "content": "Halo! Ada yang bisa saya bantu?" }
  ]
}
```

**Fields:**
- `message` (required): Current user message
- `messages` (optional): Conversation history for context

---

## 📥 Response Format (DataStream Protocol)

### Content-Type
```
text/plain; charset=utf-8
```

### Stream Chunks

#### Text Chunk (text delta)
```
0:"Harga "
0:"BBCA "
0:"saat ini "
0:"adalah Rp 10,500"
```

**Format:** `0:"<escaped_text>"\n`

#### Done Marker (stream complete)
```
d:{"finishReason":"stop"}
```

**Format:** `d:<json_object>\n`

**Fields:**
- `finishReason`: "stop" | "length" | "content-filter"
- `fallback` (optional): `true` if fallback AI provider was used

#### Error Marker (stream error)
```
e:{"error":"AI_SERVICE_UNAVAILABLE"}
```

**Format:** `e:<json_object>\n`

---

## 🔧 Parsing Example

### JavaScript/TypeScript
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ message: 'Harga BBCA?' }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let fullText = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('0:')) {
      // Text chunk
      const text = JSON.parse(line.substring(2));
      fullText += text;
      console.log(text); // Display incrementally
    } else if (line.startsWith('d:')) {
      // Done
      const data = JSON.parse(line.substring(2));
      console.log('Finished:', data.finishReason);
    } else if (line.startsWith('e:')) {
      // Error
      const error = JSON.parse(line.substring(2));
      throw new Error(error.error);
    }
  }
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| **200** | Success | Parse stream |
| **400** | Bad request | Check message format |
| **401** | Unauthorized | Missing/invalid Authorization header |
| **403** | Forbidden | Invalid/expired JWT token - generate new one |
| **500** | Server error | Retry with exponential backoff |

### Error Response Format (Non-streaming)
```json
{
  "error": "Token has expired",
  "hint": "Generate a new token with \"npm run token <userId> <chatId> <duration>\"",
  "details": "jwt expired"  // Only in development mode
}
```

### Common Errors

#### 401 - Missing Authorization
```json
{
  "error": "Missing authorization header",
  "hint": "Include \"Authorization: Bearer <token>\" in request headers"
}
```

**Fix:** Add Authorization header

#### 401 - Invalid Format
```json
{
  "error": "Invalid authorization header format",
  "hint": "Header must start with \"Bearer \" followed by token"
}
```

**Fix:** Use format `Bearer <token>`

#### 403 - Invalid Token
```json
{
  "error": "Malformed token",
  "hint": "Ensure token is properly formatted JWT"
}
```

**Fix:** Generate new token with `npm run token`

#### 403 - Expired Token
```json
{
  "error": "Token has expired",
  "hint": "Generate a new token with \"npm run token <userId> <chatId> <duration>\""
}
```

**Fix:** Generate new token with longer duration

---

## 🧪 Testing with cURL

### Valid Request (with token)
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Berapa harga BBCA?"}'
```

**Expected output:**
```
0:"Harga "
0:"BBCA "
0:"saat ini "
0:"adalah Rp 10,500"
d:{"finishReason":"stop"}
```

### Test Missing Token
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

**Expected:** 401 with error message

### Test Invalid Token
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid.token" \
  -d '{"message":"test"}'
```

**Expected:** 403 with error message

---

## 💡 Best Practices

### 1. Token Management
```typescript
// Store token securely
localStorage.setItem('jwt_token', token);

// Add to all requests
const token = localStorage.getItem('jwt_token');
headers: { 'Authorization': `Bearer ${token}` }

// Handle 403 errors (token expired)
if (response.status === 403) {
  // Clear old token
  localStorage.removeItem('jwt_token');
  // Redirect to token generation or login
}
```

### 2. Stream Processing
```typescript
// Process chunks incrementally for better UX
let buffer = '';
for await (const chunk of stream) {
  buffer += chunk;
  // Update UI immediately
  updateMessageDisplay(buffer);
}
```

### 3. Error Recovery
```typescript
try {
  await sendMessage(text);
} catch (error) {
  if (error.message.includes('403')) {
    // Token expired - get new token
    await refreshToken();
    // Retry request
    await sendMessage(text);
  } else if (error.message.includes('Network')) {
    // Network error - retry with backoff
    await retryWithBackoff(() => sendMessage(text));
  } else {
    // Other errors
    showErrorMessage(error.message);
  }
}
```

### 4. Loading States
```typescript
const [isStreaming, setIsStreaming] = useState(false);

const send = async (message: string) => {
  setIsStreaming(true);
  try {
    await streamMessage(message);
  } finally {
    setIsStreaming(false);
  }
};
```

---

## 📚 Full Examples

See complete implementation examples in:
```
docs/frontend-datastream-example.ts
```

**Includes:**
- ✅ Basic fetch with manual parsing
- ✅ React hook with real-time updates
- ✅ Complete error handling
- ✅ TypeScript type definitions
- ✅ Conversation history management

---

## 🐛 Debugging

### Enable Console Logging

**Backend (server-side):**
```bash
# All JWT middleware logs are enabled by default
# Look for these patterns in terminal:
[JWT Middleware] Incoming request to: /chat
[JWT Middleware] Authorization header: Present
[JWT Middleware] Token extracted, length: 215
[JWT Middleware] ✅ Token verified successfully for user: webuser123
```

**Frontend (browser console):**
```typescript
// Log all chunks
for (const line of lines) {
  console.log('Received line:', line);
  // ... parsing logic
}
```

### Common Issues

**Issue:** Frontend crashes with `.split()` error  
**Cause:** Incorrect parsing of DataStream Protocol  
**Fix:** Use format `0:"text"\n`, not SSE format

**Issue:** Token rejected with 403  
**Cause:** Token expired or invalid JWT_SECRET  
**Fix:** Generate new token with correct JWT_SECRET

**Issue:** CORS error  
**Cause:** Missing CORS headers  
**Fix:** Add CORS middleware to Express server

---

## 🔗 Quick Links

- [Main Documentation](../API_DOCUMENTATION.md)
- [Frontend Examples](./frontend-datastream-example.ts)
- [Changelog](../CHANGELOG_API_FIX.md)
- [Test Script](../test-api-chat.sh)

---

**Need help?** Check server console logs for detailed error messages!
