#!/bin/bash

# IHSG Analytics Bot - API Test Script
# Tests POST /api/chat endpoint with streaming response

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 IHSG Analytics Bot API Test${NC}\n"

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
USER_ID="${USER_ID:-testuser123}"
CHAT_ID="${CHAT_ID:-testchat456}"

echo -e "${YELLOW}📡 Base URL:${NC} $BASE_URL"
echo -e "${YELLOW}👤 User ID:${NC} $USER_ID"
echo -e "${YELLOW}💬 Chat ID:${NC} $CHAT_ID\n"

# Step 1: Generate JWT Token
echo -e "${YELLOW}Step 1: Generating JWT Token...${NC}"
TOKEN_OUTPUT=$(npm run token "$USER_ID" "$CHAT_ID" 7d 2>/dev/null | tail -n 1)
TOKEN=$(echo "$TOKEN_OUTPUT" | awk '{print $3}')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to generate JWT token${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Token generated successfully${NC}"
echo -e "Token: ${TOKEN:0:50}...\n"

# Step 2: Test Health Endpoint
echo -e "${YELLOW}Step 2: Testing Health Endpoint (GET /api/health)...${NC}"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo -e "Response: $HEALTH_RESPONSE\n"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo -e "Response: $HEALTH_RESPONSE\n"
    exit 1
fi

# Step 3: Test Chat Endpoint without Authentication
echo -e "${YELLOW}Step 3: Testing Chat without Authentication (should fail)...${NC}"
UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}')

if [ "$UNAUTH_STATUS" = "401" ]; then
    echo -e "${GREEN}✅ Correctly rejected unauthorized request (401)${NC}\n"
else
    echo -e "${RED}❌ Expected 401 but got $UNAUTH_STATUS${NC}\n"
fi

# Step 4: Test Chat Endpoint with Valid Token (Simple Message)
echo -e "${YELLOW}Step 4: Testing Chat with Authentication (Simple Message)...${NC}"
echo -e "Message: ${YELLOW}Halo Hermes!${NC}\n"
echo -e "${YELLOW}Response:${NC}"

curl -N -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"Halo Hermes!"}' \
    2>/dev/null | while IFS= read -r line; do
        if [[ $line =~ ^data:\ (.*)$ ]]; then
            DATA="${BASH_REMATCH[1]}"
            TYPE=$(echo "$DATA" | jq -r '.type' 2>/dev/null || echo "unknown")
            
            if [ "$TYPE" = "text" ]; then
                CONTENT=$(echo "$DATA" | jq -r '.content' 2>/dev/null || echo "")
                echo -n "$CONTENT"
            elif [ "$TYPE" = "done" ]; then
                echo -e "\n"
                echo -e "${GREEN}✅ Stream completed successfully${NC}\n"
            elif [ "$TYPE" = "error" ]; then
                CONTENT=$(echo "$DATA" | jq -r '.content' 2>/dev/null || echo "Unknown error")
                echo -e "\n${RED}❌ Error: $CONTENT${NC}\n"
            fi
        fi
    done

# Step 5: Test Chat Endpoint with Market Query
echo -e "${YELLOW}Step 5: Testing Chat with Market Query...${NC}"
echo -e "Message: ${YELLOW}Berapa harga BBCA sekarang?${NC}\n"
echo -e "${YELLOW}Response:${NC}"

curl -N -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"Berapa harga BBCA sekarang?"}' \
    2>/dev/null | while IFS= read -r line; do
        if [[ $line =~ ^data:\ (.*)$ ]]; then
            DATA="${BASH_REMATCH[1]}"
            TYPE=$(echo "$DATA" | jq -r '.type' 2>/dev/null || echo "unknown")
            
            if [ "$TYPE" = "text" ]; then
                CONTENT=$(echo "$DATA" | jq -r '.content' 2>/dev/null || echo "")
                echo -n "$CONTENT"
            elif [ "$TYPE" = "done" ]; then
                echo -e "\n"
                FALLBACK=$(echo "$DATA" | jq -r '.fallback' 2>/dev/null)
                if [ "$FALLBACK" = "true" ]; then
                    echo -e "${YELLOW}⚠️  Used Gemini fallback${NC}\n"
                else
                    echo -e "${GREEN}✅ Stream completed successfully${NC}\n"
                fi
            elif [ "$TYPE" = "error" ]; then
                CONTENT=$(echo "$DATA" | jq -r '.content' 2>/dev/null || echo "Unknown error")
                echo -e "\n${RED}❌ Error: $CONTENT${NC}\n"
            fi
        fi
    done

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📝 Your JWT token for manual testing:"
echo -e "${YELLOW}$TOKEN${NC}"
echo ""
echo -e "💡 Use this token for Cloudflare tunnel testing with your web frontend"
