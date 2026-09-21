import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchDuration = new Trend('search_duration');
const quoteDuration = new Trend('quote_duration');
const loginDuration = new Trend('login_duration');
const quotesCreated = new Counter('quotes_created');

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 50 }, // Ramp to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 for 2 minutes
    { duration: '1m', target: 100 }, // Ramp to 100 users
    { duration: '2m', target: 100 }, // Hold at 100
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.01'], // Error rate must be below 1%
    search_duration: ['p(95)<500'], // 95th percentile under 500ms
    quote_duration: ['p(95)<1000'], // 95th percentile under 1s
    http_req_duration: ['p(95)<2000'], // HTTP requests under 2s
  },
};

// Base URL for your app
const BASE_URL = __ENV.BASE_URL || 'https://ljhncdzhzoatonhhofbv.supabase.co';
const ANON_KEY = __ENV.ANON_KEY || '';

// Test data
const CATEGORIES = ['interior-design', 'mechanic', 'catering', 'photography'];
const CITIES = ['Birmingham', 'London', 'Manchester', 'Leeds'];
const USERS = JSON.parse(__ENV.LOAD_TEST_USERS || '[]');

function authenticate(user) {
  const response = http.post(
    `${BASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify(user),
    { headers: { 'Content-Type': 'application/json', apikey: ANON_KEY } },
  );
  if (response.status !== 200) return null;
  const body = response.json();
  return { accessToken: body.access_token, userId: body.user?.id };
}

export function setup() {
  if (!BASE_URL || !ANON_KEY) throw new Error('BASE_URL and ANON_KEY are required');
  if (!Array.isArray(USERS) || USERS.length === 0) {
    throw new Error('LOAD_TEST_USERS must contain dedicated test credentials');
  }
  const sessions = USERS.map(authenticate).filter(
    (session) => session?.accessToken && session?.userId,
  );
  if (sessions.length === 0) {
    throw new Error('No dedicated load-test user could authenticate');
  }
  return { sessions, runId: `k6-${Date.now()}` };
}

// Helper function to get random item
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Scenario 1: Search Providers (Most common user action)
export function testSearchProviders() {
  group('Search Providers', () => {
    const category = randomItem(CATEGORIES);
    const city = randomItem(CITIES);

    const startTime = new Date();
    const response = http.post(
      `${BASE_URL}/rest/v1/rpc/search_providers`,
      JSON.stringify({
        p_category_slug: category,
        p_city: city,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      },
    );
    const duration = new Date() - startTime;

    searchDuration.add(duration);

    check(response, {
      'search returns 200': (r) => r.status === 200,
      'search has results': (r) => r.body.length > 0,
      'search completes in <500ms': (r) => duration < 500,
    }) || errorRate.add(1);
  });

  sleep(1);
}

// Scenario 2: Create Quote Request
export function testCreateQuoteRequest(testData) {
  group('Create Quote Request', () => {
    const session = randomItem(testData.sessions);
    // First fetch a provider
    const searchResponse = http.post(
      `${BASE_URL}/rest/v1/rpc/search_providers`,
      JSON.stringify({
        p_category_slug: randomItem(CATEGORIES),
        p_city: randomItem(CITIES),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
        },
      },
    );

    if (searchResponse.status !== 200) {
      errorRate.add(1);
      return;
    }

    const providers = JSON.parse(searchResponse.body);
    if (providers.length === 0) {
      console.log('No providers found for quote test');
      return;
    }

    const providerId = providers[0].id;
    const startTime = new Date();

    // Create quote request
    const quoteResponse = http.post(
      `${BASE_URL}/rest/v1/quote_requests`,
      JSON.stringify({
        user_id: session.userId,
        provider_id: providerId,
        message: `Load test quote ${testData.runId}`,
        preferred_contact: 'whatsapp',
        status: 'sent',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
          Prefer: 'return=representation',
        },
      },
    );

    const duration = new Date() - startTime;
    quoteDuration.add(duration);

    check(quoteResponse, {
      'quote creation returns 201': (r) => r.status === 201,
      'quote has ID': (r) => JSON.parse(r.body)[0]?.id !== undefined,
      'quote creates in <1s': (r) => duration < 1000,
    }) || errorRate.add(1);

    quotesCreated.add(1);
  });

  sleep(2);
}

// Scenario 3: Simulate User Login & Browse
export function testAuthAndBrowse() {
  group('Auth & Browse', () => {
    const user = randomItem(USERS);

    // Login
    const loginStart = new Date();
    const loginResponse = http.post(
      `${BASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
        },
      },
    );

    const loginDur = new Date() - loginStart;
    loginDuration.add(loginDur);

    const loginSuccess = check(loginResponse, {
      'login returns 200': (r) => r.status === 200 || r.status === 400, // 400 if user doesn't exist yet (expected)
      'login completes in <1s': (r) => loginDur < 1000,
    });

    if (!loginSuccess) errorRate.add(1);

    // Extract session token if login succeeded
    let sessionToken = null;
    if (loginResponse.status === 200) {
      const loginBody = JSON.parse(loginResponse.body);
      sessionToken = loginBody.session?.access_token;
    }

    // Browse categories
    const categoryResponse = http.get(`${BASE_URL}/rest/v1/categories?select=*`, {
      headers: {
        apikey: ANON_KEY,
        ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
      },
    });

    check(categoryResponse, {
      'categories fetch returns 200': (r) => r.status === 200,
      'categories has data': (r) => JSON.parse(r.body).length > 0,
    }) || errorRate.add(1);
  });

  sleep(1);
}

// Scenario 4: View Provider Details
export function testViewProviderDetail() {
  group('View Provider Detail', () => {
    // Search for a provider
    const searchResponse = http.post(
      `${BASE_URL}/rest/v1/rpc/search_providers`,
      JSON.stringify({
        p_category_slug: randomItem(CATEGORIES),
        p_city: randomItem(CITIES),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
        },
      },
    );

    if (searchResponse.status !== 200) {
      errorRate.add(1);
      return;
    }

    const providers = JSON.parse(searchResponse.body);
    if (providers.length === 0) return;

    const providerId = providers[0].id;

    // Fetch full provider details
    const detailResponse = http.get(`${BASE_URL}/rest/v1/providers?id=eq.${providerId}&select=*`, {
      headers: {
        apikey: ANON_KEY,
      },
    });

    check(detailResponse, {
      'provider detail returns 200': (r) => r.status === 200,
      'provider has details': (r) => JSON.parse(r.body).length > 0,
    }) || errorRate.add(1);

    // Fetch provider reviews
    const reviewsResponse = http.get(
      `${BASE_URL}/rest/v1/reviews?provider_id=eq.${providerId}&select=*`,
      {
        headers: {
          apikey: ANON_KEY,
        },
      },
    );

    check(reviewsResponse, {
      'reviews fetch returns 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(1);
}

// Scenario 5: Concurrent Searches (Stress Test)
export function testConcurrentSearches() {
  group('Concurrent Searches', () => {
    const requests = [
      {
        method: 'POST',
        url: `${BASE_URL}/rest/v1/rpc/search_providers`,
        body: JSON.stringify({
          p_category_slug: 'interior-design',
          p_city: 'Birmingham',
        }),
        params: {
          headers: {
            'Content-Type': 'application/json',
            apikey: ANON_KEY,
          },
        },
      },
      {
        method: 'POST',
        url: `${BASE_URL}/rest/v1/rpc/search_providers`,
        body: JSON.stringify({
          p_category_slug: 'mechanic',
          p_city: 'London',
        }),
        params: {
          headers: {
            'Content-Type': 'application/json',
            apikey: ANON_KEY,
          },
        },
      },
      {
        method: 'POST',
        url: `${BASE_URL}/rest/v1/rpc/search_providers`,
        body: JSON.stringify({
          p_category_slug: 'photography',
          p_city: 'Manchester',
        }),
        params: {
          headers: {
            'Content-Type': 'application/json',
            apikey: ANON_KEY,
          },
        },
      },
    ];

    const responses = http.batch(requests);

    responses.forEach((response) => {
      check(response, {
        'concurrent search returns 200': (r) => r.status === 200,
      }) || errorRate.add(1);
    });
  });

  sleep(0.5);
}

// Main test execution
export default function (testData) {
  // Distribute load across different scenarios
  const testType = Math.random();

  if (testType < 0.5) {
    testSearchProviders();
  } else if (testType < 0.7) {
    testCreateQuoteRequest(testData);
  } else if (testType < 0.85) {
    testViewProviderDetail();
  } else if (testType < 0.95) {
    testAuthAndBrowse();
  } else {
    testConcurrentSearches();
  }
}

export function teardown(testData) {
  testData.sessions.forEach((session) => {
    http.del(
      `${BASE_URL}/rest/v1/quote_requests?user_id=eq.${session.userId}&message=eq.${encodeURIComponent(`Load test quote ${testData.runId}`)}`,
      null,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );
  });
}

// Custom summary function
export function handleSummary(data) {
  console.log('Load Test Summary:');
  console.log('=====================================');
  console.log(`Total VUs: ${data.metrics.vus_max?.value || 'N/A'}`);
  console.log(`Error Rate: ${data.metrics.errors?.value?.toFixed(2)}%`);
  console.log(`Search Duration (p95): ${data.metrics.search_duration?.values?.p95?.toFixed(0)}ms`);
  console.log(`Quote Duration (p95): ${data.metrics.quote_duration?.values?.p95?.toFixed(0)}ms`);
  console.log(`Login Duration (p95): ${data.metrics.login_duration?.values?.p95?.toFixed(0)}ms`);
  console.log(`Total Quotes Created: ${data.metrics.quotes_created?.value || 0}`);
  console.log('=====================================');

  return {
    stdout: JSON.stringify(data, null, 2),
  };
}
