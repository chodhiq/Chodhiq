# 🚀 Sentry Error Logging - Main App Setup (COMPLETE)

## ✅ COMPLETED

- [x] Installed @sentry/react-native
- [x] Created src/lib/sentryUtils.js
- [x] Updated .env.example with EXPO_PUBLIC_SENTRY_DSN
- [x] Created .env.local (empty DSN - fill this in)
- [x] Configured Sentry in App.js with error boundary
- [x] Integrated error capture in accountRepository.js
- [x] All tests passing (27/27 ✓)

---

## ⚠️ NEXT: Add Your Sentry DSN

### Step 1: Go to Sentry

1. Open https://sentry.io
2. Sign up if you haven't already
3. Create organization: **"ChodhiQ"**

### Step 2: Create Project for Main App

1. Click **Projects** (left sidebar)
2. Click **Create Project**
3. Select Platform: **React Native**
4. Project name: **chodhiq-app**
5. Click **Create Project**

### Step 3: Copy Your DSN

After project creation, you'll see your DSN at the top:

```
https://xxx@yyy.ingest.sentry.io/123456
```

**Copy this entire URL**

### Step 4: Add DSN to .env.local

Open: `C:\Users\ASUS\Documents\Codex\chodhiq\.env.local`

Find this line:
```
EXPO_PUBLIC_SENTRY_DSN=
```

Paste your DSN:
```
EXPO_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/123456
```

**Save the file**

---

## ✅ Testing (After DSN Added)

### Test 1: Trigger an Error in Dev

```bash
# In App.js, temporarily add:
throw new Error('Test Sentry Error');

npm start
# Open app in Expo Go
# You'll see error screen
# Check Sentry dashboard - error might appear (dev mode filters some)
```

### Test 2: Trigger Error in Production Build

```bash
# Create a test error button
# In any screen component:
<Button 
  title="Test Sentry" 
  onPress={() => { throw new Error('Sentry Test'); }} 
/>
```

### Test 3: Check Sentry Dashboard

1. Go to https://sentry.io
2. Click **Projects**
3. Click **chodhiq-app**
4. Look for errors in the Issues list
5. Click an error to see full details (stack trace, breadcrumbs, context)

---

## 📊 What's Being Tracked

✓ **Account loading errors** - If Supabase query fails
✓ **Unhandled exceptions** - App crashes
✓ **Custom errors** - Any error thrown in repositories
✓ **Breadcrumbs** - User actions (search, quote request, etc.)
✓ **Performance** - Transaction timing (10% sampled in prod)

---

## 📋 Files Modified

| File | Changes |
|------|---------|
| `src/lib/sentryUtils.js` | **NEW** - Error capture utilities |
| `.env.example` | Added EXPO_PUBLIC_SENTRY_DSN |
| `.env.local` | Added EXPO_PUBLIC_SENTRY_DSN (empty) |
| `App.js` | Added Sentry.init(), ErrorBoundary, Sentry.wrap() |
| `src/data/accountRepository.js` | Added error tracking to loadAccount, loadNotifications, deleteCurrentAccount |

---

## 🔧 Configuration Details

### Development Mode
- Errors logged to console
- Not sent to Sentry (unless EXPO_PUBLIC_SENTRY_DSN is set)
- `beforeSend()` filters dev events

### Production Mode
- All errors sent to Sentry
- 10% transaction sampling (performance monitoring)
- Stack traces attached
- User context included

---

## 🎯 Next Steps After Testing

1. ✅ Add DSN to .env.local
2. ✅ Test error capture (trigger an error)
3. ✅ Verify error appears in Sentry dashboard
4. ✅ Setup admin-dashboard Sentry (same process)
5. ✅ Setup business-dashboard Sentry (same process)
6. ✅ Configure Sentry alerts (email/Slack)

---

## 📞 Troubleshooting

### Errors not appearing in Sentry?

**Check 1:** Verify DSN is correct
```bash
# In .env.local, DSN should start with:
EXPO_PUBLIC_SENTRY_DSN=https://
```

**Check 2:** In development, errors are filtered
- Set `beforeSend()` to return event (not null) to see dev errors
- Or build production app

**Check 3:** Check Sentry project quota
- Free tier: 5,000 events/month
- View at: https://sentry.io/settings/account/billing/

**Check 4:** Verify error actually occurred
- Add console.log before error
- Check Expo logs for error message

### Too many events?

Reduce sampling:
```javascript
// In App.js:
tracesSampleRate: 0.01, // 1% instead of 10%
```

Or filter in beforeSend():
```javascript
beforeSend(event, hint) {
  if (event.message?.includes('NetworkError')) return null; // Ignore network errors
  return event;
}
```

---

## ✨ Advanced Features (Optional)

### Track User for Error Context
```javascript
import { trackUser, clearUser } from './src/lib/sentryUtils';

// After successful login:
trackUser(userId, userEmail);

// On logout:
clearUser();
```

### Add Custom Breadcrumbs
```javascript
import { addBreadcrumb } from './src/lib/sentryUtils';

// Track user actions:
addBreadcrumb('User searched for plumber', 'user-action', { query: 'plumber' });
addBreadcrumb('Quote request submitted', 'quote', { providerId: 'xyz' });
```

### Report Critical Errors
```javascript
import { reportCriticalError } from './src/lib/sentryUtils';

try {
  // payment processing
} catch (error) {
  reportCriticalError(error, 'payment-failed'); // Marked as critical
}
```

---

## 📈 Monitoring Dashboard

Once live, monitor:

1. **Error Rate** (should be < 1% in production)
2. **Most Common Errors** (top 5 errors to fix)
3. **Affected Users** (% of users experiencing errors)
4. **Error Trends** (spikes indicate new bugs)
5. **Response Time** (performance degradation detection)

---

## 🎉 When You're Done

- [ ] DSN added to .env.local
- [ ] Error triggered and appears in Sentry
- [ ] Sentry project visible in dashboard
- [ ] Ready to setup admin-dashboard

**Status: Main App ✅ Ready**

Next: Setup admin-dashboard and business-dashboard with same process.
