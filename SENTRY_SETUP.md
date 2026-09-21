# Sentry Error Logging Configuration

## 1. Quick Start (5 minutes)

### Step 1: Create Sentry Account & Project
1. Go to https://sentry.io/signup/
2. Sign up and create a new organization
3. Create 3 projects:
   - `chodhiq-app` (React Native/Expo)
   - `chodhiq-admin-dashboard` (Next.js)
   - `chodhiq-business-dashboard` (Next.js)

### Step 2: Get Your DSN
For each project, copy the DSN (looks like `https://xxx@yyy.ingest.sentry.io/123456`)

---

## 2. Main App (Expo) Configuration

### Install Sentry
```bash
cd C:\Users\ASUS\Documents\Codex\chodhiq
npm install @sentry/react-native
```

### Update `App.js`
```javascript
import * as Sentry from '@sentry/react-native';
import { useAppState } from './src/context/AppStateContext';

// Initialize at the very top of your app
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.1, // 10% of transactions in production
  enableAutoPerformanceMonitoring: true,
  attachStacktrace: true,
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (__DEV__) return null;
    return event;
  },
});

// Wrap your app component
const App = () => (
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    {/* Your app code */}
  </Sentry.ErrorBoundary>
);

export default Sentry.wrap(App);
```

### Update `.env.example`
```bash
EXPO_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/123456
```

### Add to `.env.local`
```bash
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
```

### Create `src/lib/sentryUtils.js`
```javascript
import * as Sentry from '@sentry/react-native';

export const captureError = (error, context = {}) => {
  Sentry.captureException(error, {
    contexts: { app: context },
  });
};

export const captureMessage = (message, level = 'info') => {
  Sentry.captureMessage(message, level);
};

export const trackUser = (userId, email) => {
  Sentry.setUser({ id: userId, email });
};

export const clearUser = () => {
  Sentry.setUser(null);
};

export const startTransaction = (name) => {
  return Sentry.startTransaction({ name, op: 'http.request' });
};
```

### Update `src/data/accountRepository.js`
```javascript
import { captureError, startTransaction } from '../lib/sentryUtils';

export const loadAccount = async (userId) => {
  const txn = startTransaction('loadAccount');
  try {
    // ... existing code
  } catch (error) {
    captureError(error, { userId, operation: 'loadAccount' });
    throw error;
  } finally {
    txn?.finish();
  }
};
```

---

## 3. Admin Dashboard (Next.js) Configuration

### Install Sentry
```bash
cd C:\Users\ASUS\Documents\Codex\chodhiq\admin-dashboard
npm install @sentry/nextjs
```

### Create `sentry.client.config.js`
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaySessionSampleRate: 0.1,
  replayOnErrorSampleRate: 1.0,
});
```

### Create `sentry.server.config.js`
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Db(),
    new Sentry.Integrations.Http(),
  ],
});
```

### Update `next.config.ts`
```typescript
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // ... existing config
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: 'your-org-name',
  project: 'chodhiq-admin-dashboard',
});
```

### Update `.env.example`
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/admin-123
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/admin-123
SENTRY_AUTH_TOKEN=<your-token>
```

### Update `app/layout.tsx`
```typescript
import * as Sentry from '@sentry/nextjs';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Sentry.ErrorBoundary fallback={<p>An error occurred</p>}>
          {children}
        </Sentry.ErrorBoundary>
      </body>
    </html>
  );
}
```

---

## 4. Business Dashboard (Next.js) Configuration

### Repeat steps from Admin Dashboard
```bash
cd C:\Users\ASUS\Documents\Codex\chodhiq\business-dashboard
npm install @sentry/nextjs
# Copy the same configuration files and update environment variables
```

### Update `.env.example`
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/business-123
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/business-123
SENTRY_AUTH_TOKEN=<your-token>
```

---

## 5. Sentry Alerts Configuration

### In Sentry Dashboard:
1. **Go to Alerts** → Create Alert Rule
2. **Condition:** Every event where `level is error`
3. **Action:** Send to Slack / Email
4. **Set thresholds:**
   - Alert if >10 errors/min
   - Alert if >50 errors/hour
   - Alert if error rate >1%

### Alert Destinations:
- Slack: `#chodhiq-errors-prod`
- Email: dev-team@chodhiq.co.uk
- Disable dev alerts (only production)

---

## 6. Error Capture Best Practices

### In repositories:
```javascript
try {
  const { data, error } = await supabase...
  if (error) {
    captureError(error, {
      operation: 'fetchProviders',
      filters: { category, city },
    });
    throw error;
  }
} catch (err) {
  captureError(err, { userAction: 'search' });
}
```

### On auth failures:
```javascript
const { error } = await supabase.auth.signUp({ email, password });
if (error) {
  captureError(error, { 
    stage: 'signup',
    email,
    errorCode: error.code,
  });
}
```

### On RLS violations:
```javascript
// Sentry will automatically catch 401/403 errors with context
if (error?.message.includes('new row violates')) {
  captureError(error, {
    severity: 'critical',
    type: 'rls_violation',
  });
}
```

---

## 7. Sentry Dashboard KPIs

Monitor these metrics:
- **Error Rate:** Target <0.5% in production
- **P95 Response Time:** Target <500ms
- **Unresolved Issues:** Triage daily
- **User Sessions Affected:** Track % of users impacted by errors
- **Most Common Errors:** Weekly review and fix top 3

---

## 8. Deployment

### Production Deployment:
```bash
# Add to GitHub Actions or your CI/CD
export SENTRY_AUTH_TOKEN=<your-token>
npx sentry-cli releases create chodhiq@$(git rev-parse --short HEAD)
npx sentry-cli releases files upload-sourcemaps .
```

### Staging Deployment:
Use the same config but filter out non-critical alerts

---

## 9. Troubleshooting

### Events not appearing in Sentry?
1. Check DSN is correct in `.env.local`
2. Verify `beforeSend()` isn't filtering events
3. Check Sentry project quota (free tier = 5,000 events/month)
4. In dev, ensure `__DEV__` is false to send events

### Too many events?
1. Reduce `tracesSampleRate` to 0.01 (1%)
2. Add more aggressive `beforeSend()` filters
3. Set `replaySessionSampleRate` to 0 if not needed

---

## Next: Run RLS Audit
Once configured, move to RLS verification to ensure data isolation.
