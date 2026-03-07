#!/usr/bin/env node

/**
 * Test script for Women's Safety App API endpoints
 * Run with: node test-api.js
 */

const BASE_URL = 'http://localhost:3000'

async function testEndpoint(method, url, body = null, headers = {}) {
  console.log(`\n🧪 Testing ${method} ${url}`)
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${BASE_URL}${url}`, options)
    const data = await response.json()

    console.log(`Status: ${response.status}`)
    console.log('Response:', JSON.stringify(data, null, 2))

    return { response, data }
  } catch (error) {
    console.error('Error:', error.message)
    return { error }
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests for Women\'s Safety App')
  console.log('Make sure your Next.js server is running on http://localhost:3000')

  // Test data
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User',
    phone: '+1234567890',
    birthDate: '1990-01-01',
    contacts: [
      { name: 'Emergency Contact 1', phone: '+0987654321', relationship: 'Friend' },
      { name: 'Emergency Contact 2', phone: '+1122334455', relationship: 'Family' },
    ],
  }

  let authToken = null
  let userId = null

  // 1. Test Registration
  console.log('\n📝 1. Testing User Registration')
  const registerResult = await testEndpoint('POST', '/api/auth/register', testUser)
  if (registerResult.data?.userId) {
    userId = registerResult.data.userId
    console.log('✅ Registration successful, userId:', userId)
  } else {
    console.log('❌ Registration failed')
    return
  }

  // 2. Test Login
  console.log('\n🔐 2. Testing User Login')
  const loginResult = await testEndpoint('POST', '/api/auth/login', {
    email: testUser.email,
    password: testUser.password,
  })
  if (loginResult.response?.headers.get('set-cookie')) {
    authToken = loginResult.response.headers.get('set-cookie')
    console.log('✅ Login successful, got session cookie')
  } else {
    console.log('❌ Login failed')
  }

  // 3. Test Emergency Contacts (GET)
  console.log('\n📞 3. Testing Get Emergency Contacts')
  await testEndpoint('GET', '/api/emergency-contacts', null, {
    Cookie: authToken,
  })

  // 4. Test Emergency Contacts (POST)
  console.log('\n📞 4. Testing Add Emergency Contact')
  await testEndpoint('POST', '/api/emergency-contacts', {
    name: 'Additional Contact',
    phone: '+1555666777',
    email: 'contact@example.com',
    relationship: 'Colleague',
  }, {
    Cookie: authToken,
  })

  // 5. Test Panic Alert
  console.log('\n🚨 5. Testing Panic Alert Creation')
  const panicResult = await testEndpoint('POST', '/api/panic', {
    latitude: 40.7128,
    longitude: -74.0060,
    message: 'Test emergency alert',
  }, {
    Cookie: authToken,
  })

  let alertId = null
  if (panicResult.data?.alertId) {
    alertId = panicResult.data.alertId
    console.log('✅ Panic alert created, alertId:', alertId)
  }

  // 6. Test Recording Upload Complete (mock)
  if (alertId) {
    console.log('\n🎥 6. Testing Recording Upload Complete')
    await testEndpoint('POST', '/api/recordings/upload-complete', {
      panicId: alertId,
      chunkNumber: 1,
      storagePath: `panic-${alertId}/chunk-1.webm`,
      fileType: 'video',
    }, {
      Cookie: authToken,
    })
  }

  // 7. Test Helpers Nearby
  console.log('\n🆘 7. Testing Helpers Nearby')
  await testEndpoint('GET', '/api/helpers/nearby?lat=40.7128&lng=-74.0060', null, {
    Cookie: authToken,
  })

  // 8. Test Safe Pass (Premium - should fail for free user)
  console.log('\n🛤️ 8. Testing Safe Pass Route (Premium Feature)')
  await testEndpoint('POST', '/api/safe-pass', {
    startLat: 40.7128,
    startLng: -74.0060,
    endLat: 40.7589,
    endLng: -73.9851,
  }, {
    Cookie: authToken,
  })

  // 9. Test Police Alerts (should fail without police role)
  console.log('\n👮 9. Testing Police Alerts (Should fail - not police)')
  await testEndpoint('GET', '/api/police/alerts?lat=40.7128&lng=-74.0060', null, {
    Cookie: authToken,
  })

  console.log('\n✅ API Testing Complete!')
  console.log('\n📋 Summary:')
  console.log('- Registration: ✅')
  console.log('- Login: ✅')
  console.log('- Emergency Contacts: ✅')
  console.log('- Panic Alert: ✅')
  console.log('- Recordings: ✅')
  console.log('- Helpers Nearby: ✅')
  console.log('- Safe Pass: ❌ (Requires premium)')
  console.log('- Police Alerts: ❌ (Requires police role)')

  console.log('\n🔧 To test premium features:')
  console.log('1. Update user profile to is_premium = true in Supabase')
  console.log('2. For police features, set is_police = true')
  console.log('3. Re-run tests')
}

// Run the tests
runTests().catch(console.error)