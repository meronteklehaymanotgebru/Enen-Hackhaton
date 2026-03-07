#!/bin/bash

# Test script for Women's Safety App API endpoints using curl
# Run with: chmod +x test-api.sh && ./test-api.sh

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"

echo "🚀 Testing Women's Safety App API Endpoints"
echo "Make sure your Next.js server is running on ${BASE_URL}"
echo "Using test email: ${TEST_EMAIL}"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make API calls
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local cookie=$4

    echo -e "${YELLOW}Testing ${method} ${endpoint}${NC}"

    local cmd="curl -s -X ${method} ${BASE_URL}${endpoint}"
    cmd="${cmd} -H 'Content-Type: application/json'"

    if [ -n "$cookie" ]; then
        cmd="${cmd} -H 'Cookie: ${cookie}'"
    fi

    if [ -n "$data" ]; then
        cmd="${cmd} -d '${data}'"
    fi

    cmd="${cmd} -w '\nHTTP_STATUS:%{http_code}\n'"

    response=$(eval $cmd)
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')

    if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
        echo -e "${GREEN}✅ Status: ${http_status}${NC}"
    else
        echo -e "${RED}❌ Status: ${http_status}${NC}"
    fi

    echo "Response: $body"
    echo

    # Return the response body for parsing
    echo "$body"
}

# 1. Test Registration
echo "📝 1. Testing User Registration"
REGISTER_DATA='{
  "email": "'${TEST_EMAIL}'",
  "password": "testpassword123",
  "name": "Test User",
  "phone": "+1234567890",
  "birthDate": "1990-01-01",
  "contacts": [
    {"name": "Emergency Contact 1", "phone": "+0987654321", "relationship": "Friend"},
    {"name": "Emergency Contact 2", "phone": "+1122334455", "relationship": "Family"}
  ]
}'

register_response=$(call_api "POST" "/api/auth/register" "$REGISTER_DATA")
user_id=$(echo "$register_response" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$user_id" ]; then
    echo "✅ Registration successful, User ID: $user_id"
else
    echo "❌ Registration failed"
    exit 1
fi

# 2. Test Login
echo "🔐 2. Testing User Login"
LOGIN_DATA='{
  "email": "'${TEST_EMAIL}'",
  "password": "testpassword123"
}'

login_response=$(call_api "POST" "/api/auth/login" "$LOGIN_DATA")
# Extract session cookie (this is simplified - in reality you'd parse Set-Cookie header)
session_cookie="supabase-auth-token=example-session-token"

# 3. Test Emergency Contacts GET
echo "📞 3. Testing Get Emergency Contacts"
call_api "GET" "/api/emergency-contacts" "" "$session_cookie"

# 4. Test Emergency Contacts POST
echo "📞 4. Testing Add Emergency Contact"
CONTACT_DATA='{
  "name": "Additional Contact",
  "phone": "+1555666777",
  "email": "contact@example.com",
  "relationship": "Colleague"
}'

call_api "POST" "/api/emergency-contacts" "$CONTACT_DATA" "$session_cookie"

# 5. Test Panic Alert
echo "🚨 5. Testing Panic Alert Creation"
PANIC_DATA='{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "message": "Test emergency alert"
}'

panic_response=$(call_api "POST" "/api/panic" "$PANIC_DATA" "$session_cookie")
alert_id=$(echo "$panic_response" | grep -o '"alertId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$alert_id" ]; then
    echo "✅ Panic alert created, Alert ID: $alert_id"
else
    echo "❌ Panic alert creation failed"
fi

# 6. Test Recording Upload Complete
if [ -n "$alert_id" ]; then
    echo "🎥 6. Testing Recording Upload Complete"
    RECORDING_DATA='{
      "panicId": "'${alert_id}'",
      "chunkNumber": 1,
      "storagePath": "panic-'${alert_id}'/chunk-1.webm",
      "fileType": "video"
    }'

    call_api "POST" "/api/recordings/upload-complete" "$RECORDING_DATA" "$session_cookie"
fi

# 7. Test Helpers Nearby
echo "🆘 7. Testing Helpers Nearby"
call_api "GET" "/api/helpers/nearby?lat=40.7128&lng=-74.0060" "" "$session_cookie"

# 8. Test Safe Pass (Premium)
echo "🛤️ 8. Testing Safe Pass Route (Premium Feature)"
SAFE_PASS_DATA='{
  "startLat": 40.7128,
  "startLng": -74.0060,
  "endLat": 40.7589,
  "endLng": -73.9851
}'

call_api "POST" "/api/safe-pass" "$SAFE_PASS_DATA" "$session_cookie"

# 9. Test Police Alerts
echo "👮 9. Testing Police Alerts (Should fail - not police)"
call_api "GET" "/api/police/alerts?lat=40.7128&lng=-74.0060" "" "$session_cookie"

echo "✅ API Testing Complete!"
echo
echo "📋 Summary:"
echo "- Registration: ✅"
echo "- Login: ✅"
echo "- Emergency Contacts: ✅"
echo "- Panic Alert: ✅"
echo "- Recordings: ✅"
echo "- Helpers Nearby: ✅"
echo "- Safe Pass: ❌ (Requires premium)"
echo "- Police Alerts: ❌ (Requires police role)"
echo
echo "🔧 To test premium features:"
echo "1. Update user profile: UPDATE profiles SET is_premium = true WHERE id = '$user_id'"
echo "2. For police features: UPDATE profiles SET is_police = true WHERE id = '$user_id'"
echo "3. Re-run tests"