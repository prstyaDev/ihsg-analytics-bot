#!/bin/bash

# ============================================================================
# API Chat Endpoint Test Script
# ============================================================================
# 
# Script ini akan menguji endpoint /api/chat dengan berbagai skenario:
# 1. Missing Authorization header
# 2. Invalid Authorization format
# 3. Empty token
# 4. Invalid token
# 5. Valid token (requires actual token)
#
# Usage: ./test-api-chat.sh [BASE_URL]
# Example: ./test-api-chat.sh http://localhost:3000
# ============================================================================

BASE_URL="${1:-http://localhost:3000}"
ENDPOINT="$BASE_URL/api/chat"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "  Testing API Chat Endpoint: $ENDPOINT"
echo "============================================================================"
echo ""

# Test 1: Missing Authorization header
echo -e "${BLUE}[Test 1]${NC} Missing Authorization header"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Got expected 401 status"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Invalid Authorization format (no Bearer prefix)
echo -e "${BLUE}[Test 2]${NC} Invalid Authorization format (no Bearer prefix)"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: InvalidToken123" \
  -d '{"message":"test"}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Got expected 401 status"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 3: Empty token after Bearer
echo -e "${BLUE}[Test 3]${NC} Empty token after Bearer prefix"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer " \
  -d '{"message":"test"}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Got expected 401 status"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 4: Invalid JWT token
echo -e "${BLUE}[Test 4]${NC} Invalid JWT token"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid.jwt.token" \
  -d '{"message":"test"}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "403" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Got expected 403 status"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 403, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 5: Valid token (if provided)
echo -e "${BLUE}[Test 5]${NC} Valid JWT token test"
echo "-------------------------------------------"

if [ -z "$VALID_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  SKIP${NC} - No valid token provided"
  echo "To test with valid token, run:"
  echo "  VALID_TOKEN='your-token-here' $0 $BASE_URL"
else
  echo "Testing with provided token..."
  
  # Use timeout to prevent hanging on stream
  RESPONSE=$(timeout 5s curl -s -N -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $VALID_TOKEN" \
    -d '{"message":"Halo"}' | head -c 200)
  
  if [ $? -eq 124 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Connection established (streaming started)"
    echo "First 200 bytes of stream: $RESPONSE"
  else
    echo -e "${RED}❌ FAIL${NC} - Connection failed or returned immediately"
    echo "Response: $RESPONSE"
  fi
fi
echo ""

# Test 6: Health check endpoint
echo -e "${BLUE}[Test 6]${NC} Health check endpoint"
echo "-------------------------------------------"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
echo "Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  echo -e "${GREEN}✅ PASS${NC} - Health check OK"
else
  echo -e "${RED}❌ FAIL${NC} - Health check failed"
fi
echo ""

# Test 7: Case-insensitive header test
echo -e "${BLUE}[Test 7]${NC} Case-insensitive header (lowercase 'authorization')"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer invalid.jwt.token" \
  -d '{"message":"test"}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "403" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Case-insensitive header working (got 403 for invalid token)"
  echo "Response: $BODY"
else
  echo -e "${RED}❌ FAIL${NC} - Expected 403, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

echo "============================================================================"
echo "  Test Summary"
echo "============================================================================"
echo ""
echo "All JWT middleware tests completed!"
echo ""
echo -e "${YELLOW}To generate a valid JWT token for testing:${NC}"
echo "  npm run token webuser123 websession456 7d"
echo ""
echo -e "${YELLOW}Then test with valid token:${NC}"
echo "  VALID_TOKEN='<generated-token>' $0 $BASE_URL"
echo ""
