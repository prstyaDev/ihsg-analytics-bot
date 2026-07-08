# 🔧 API Chat Endpoint Fix - Changelog

**Date:** 2026-07-08  
**File Modified:** `src/api/chat.ts`

---

## 🎯 Issues Fixed

### 1. **Frontend Crash - DataStream Protocol Format**
**Problem:**
- Response menggunakan format SSE custom (`data: {...}\n\n`)
- Frontend crash saat melakukan `.split('\n')` karena format tidak sesuai ekspektasi Vercel AI SDK
- Error: "Cannot read properties of undefined (reading 'split')"

**Solution:**
- ✅ Mengubah format response ke **Vercel AI SDK DataStream Protocol**
- ✅ Text chunks: `0:"text content"\n`
- ✅ Finish marker: `d:{"finishReason":"stop"}\n`
- ✅ Error marker: `e:{"error":"ERROR_CODE"}\n`
- ✅ Escape quotes dan backslashes dalam content

**Example Output:**
```
0:"Harga "\n
0:"BBCA "\n
0:"saat ini "\n
0:"adalah Rp 10,500"\n
d:{"finishReason":"stop"}\n
```

---

### 2. **HTTP 403 Error - JWT Middleware Improvements**
**Problem:**
- JWT middleware langsung memblokir request tanpa log detail
- Tidak ada informasi debugging saat token gagal
- Case-sensitive header check (`Authorization` vs `authorization`)
- Type error: `string | string[]` tidak di-handle

**Solution:**
- ✅ **Detailed logging** di setiap tahap verifikasi
- ✅ **Case-insensitive** header check
- ✅ **Type-safe** handling untuk `string | string[]`
- ✅ **Informative error messages** dengan hint untuk debugging
- ✅ **Development mode details** - error message lengkap di NODE_ENV=development

**Logging Example:**
```
[JWT Middleware] Incoming request to: /chat
[JWT Middleware] Authorization header: Present
[JWT Middleware] Token extracted, length: 215
[JWT Middleware] ✅ Token verified successfully for user: webuser123
```

**Error Response Example:**
```json
{
  "error": "Token has expired",
  "hint": "Generate a new token with \"npm run token <userId> <chatId> <duration>\"",
  "details": "jwt expired" // Only in development
}
```

---

## 📝 Technical Changes

### Response Headers
**Before:**
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

**After:**
```typescript
res.setHeader('Content-Type', 'text/plain; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Content-Type-Options', 'nosniff');
```

### Streaming Format
**Before:**
```typescript
res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
```

**After:**
```typescript
const escapedChunk = chunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
res.write(`0:"${escapedChunk}"\n`);
res.write(`d:{"finishReason":"stop"}\n`);
```

### JWT Middleware
**Before:**
```typescript
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Missing or invalid authorization header' });
}
```

**After:**
```typescript
let authHeader = req.headers.authorization || req.headers.Authorization;
if (Array.isArray(authHeader)) {
  authHeader = authHeader[0];
}
if (!authHeader || typeof authHeader !== 'string') {
  console.warn('[JWT Middleware] ❌ No authorization header found');
  return res.status(401).json({ 
    error: 'Missing authorization header',
    hint: 'Include "Authorization: Bearer <token>" in request headers'
  });
}
```

---

## 🧪 Testing

### Test JWT Middleware
```bash
# Valid token
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VALID_TOKEN" \
  -d '{"message":"Berapa harga BBCA?"}'

# Expected: Streaming response dengan format 0:"..." chunks

# Invalid token
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d '{"message":"test"}'

# Expected: 403 dengan error detail dan hint

# Missing token
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# Expected: 401 dengan hint untuk menambahkan Authorization header
```

### Test DataStream Protocol
```javascript
// Frontend parsing example
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ message: 'Harga BBCA?' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.startsWith('0:')) {
      // Text chunk
      const text = JSON.parse(line.substring(2));
      console.log('Received text:', text);
    } else if (line.startsWith('d:')) {
      // Done marker
      const data = JSON.parse(line.substring(2));
      console.log('Stream finished:', data);
    } else if (line.startsWith('e:')) {
      // Error marker
      const error = JSON.parse(line.substring(2));
      console.error('Stream error:', error);
    }
  }
}
```

---

## 🚀 Deployment Checklist

- [x] TypeScript compilation sukses (`npm run build`)
- [x] JWT_SECRET harus ada di `.env` (minimum 32 karakter)
- [x] Frontend harus update parser untuk DataStream Protocol format
- [x] Test dengan token valid dan invalid
- [x] Monitor console logs untuk debugging

---

## 📚 References

- [Vercel AI SDK - Data Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Express.js Response Streaming](https://expressjs.com/en/api.html#res.write)

---

**Status:** ✅ RESOLVED  
**Build Status:** ✅ PASSING  
**TypeScript Errors:** 0
