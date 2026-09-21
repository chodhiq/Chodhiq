# TypeScript Migration Guide - Main Expo App

## Issue

The main Expo app (customer-facing, React Native) is written entirely in JavaScript without any type checking. This creates risk in production code.

**Files Affected:**
- `App.js` - 80 lines, no types
- `src/lib/*.js` - 5+ utility files
- `src/data/*.js` - 10+ repository files
- `src/screens/*.js` - ~20 screen components
- `src/components/*.js` - ~30 UI components
- `src/navigation/*.js` - Navigation setup
- `src/context/*.js` - State management

**Total:** ~150 files to migrate

---

## Migration Strategy

### Option A: Full TypeScript Migration (Recommended)

**Timeline:** 2-3 weeks  
**Complexity:** High  
**Benefit:** Full type safety across the app

**Steps:**
1. Rename files: `*.js` → `*.ts` (components) or `*.tsx` (React components)
2. Add `tsconfig.json` configuration (already exists)
3. Type all exports and imports
4. Update Expo SDK types
5. Run strict type checking

**Command:**
```bash
# Enable strict type checking
npx tsc --strict --noEmit
```

---

### Option B: JSDoc + Strict Mode (Faster Alternative)

**Timeline:** 1-2 weeks  
**Complexity:** Medium  
**Benefit:** Type checking without full migration

**Steps:**
1. Add JSDoc types to all exported functions
2. Update `tsconfig.json` to check JS files
3. Enable `checkJs` and `strictNullChecks`

**Configuration (tsconfig.json):**
```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "declaration": false
  },
  "include": ["src/**/*", "*.js"],
  "exclude": ["node_modules", "dist*"]
}
```

**Example JSDoc migration:**

Before:
```javascript
export async function loadAccount(userId) {
  const result = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
  return result.data;
}
```

After:
```javascript
/**
 * Load user account data from Supabase
 * @param {string} userId - UUID of the user
 * @returns {Promise<import('@supabase/supabase-js').PostgrestResponse>}
 * @throws {Error} If query fails
 */
export async function loadAccount(userId) {
  const result = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
  return result.data;
}
```

---

## Phase 1: Critical Path (1 Week)

Convert files in this order (highest risk first):

1. **Authentication Layer** (lib/supabase.js)
   - Used by every other module
   - Type the Supabase client
   - Type storage and auth callbacks

2. **Data Repositories** (src/data/*.js)
   - Type query responses
   - Type mutations
   - Define interfaces for domain models

3. **Context/State** (src/context/*.js)
   - Type provider values
   - Type reducer actions
   - Type hook return types

4. **Navigation** (src/navigation/*.js)
   - Type route params
   - Type navigation props
   - Define stack types

5. **Shared Utilities** (src/lib/*.js)
   - Type helper functions
   - Type constants
   - Type validation functions

---

## Phase 2: Components (Week 2-3)

### Screen Components (src/screens/*.js)

```typescript
// Before
export default function HomeScreen({ navigation }) {
  const [data, setData] = useState();
  
  useEffect(() => {
    loadData();
  }, []);
  
  return <View>...</View>;
}

// After
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  interface HomeData {
    id: string;
    title: string;
    items: Array<{ id: string; name: string }>;
  }
  
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchHomeData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  return <View>{/* ... */}</View>;
}
```

### Reusable Components (src/components/*.js)

```typescript
// Before
export default function Button({ label, onPress, disabled }) {
  return <TouchableOpacity onPress={onPress} disabled={disabled}>
    <Text>{label}</Text>
  </TouchableOpacity>;
}

// After
import type { GestureResponderEvent } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export default function Button({ 
  label, 
  onPress, 
  disabled = false,
  variant = 'primary'
}: ButtonProps) {
  return <TouchableOpacity onPress={onPress} disabled={disabled}>
    <Text>{label}</Text>
  </TouchableOpacity>;
}
```

---

## Implementation Checklist

### Setup
- [ ] Enable `allowJs: true` in tsconfig.json
- [ ] Enable `checkJs: true` in tsconfig.json
- [ ] Set `noImplicitAny: true`
- [ ] Run `tsc --noEmit` to identify all errors

### Core Libraries
- [ ] Type App.js entry point
- [ ] Type src/lib/supabase.js
- [ ] Type src/lib/sentryUtils.js
- [ ] Type src/lib/validation.js
- [ ] Type src/lib/notificationRuntime.js

### Data Layer
- [ ] Type src/data/accountRepository.js
- [ ] Type src/data/bookingRepository.js
- [ ] Type src/data/localDatabase.js
- [ ] Type other data layer files

### State Management
- [ ] Type src/context/AppStateContext.js
- [ ] Type src/context/ThemeContext.js
- [ ] Type reducers and actions

### Navigation
- [ ] Define RootStackParamList
- [ ] Type all navigation props
- [ ] Type route params

### Screens (20+ files)
- [ ] Type each screen component
- [ ] Add proper prop types
- [ ] Type navigation params

### Components (30+ files)
- [ ] Type component props
- [ ] Type state and callbacks
- [ ] Define shared component types

### Testing
- [ ] Run `npm run typecheck`
- [ ] Fix all errors
- [ ] Run `npm test`
- [ ] Run `npm run verify:release`

---

## Common Type Definitions to Create

```typescript
// types.ts - Domain models

// User/Profile
export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  email: string;
  avatar_url?: string;
}

// Provider business
export interface Provider {
  id: string;
  business_name: string;
  base_city: string;
  cover_image_url?: string;
  base_location?: { lat: number; lng: number };
}

// Quote request
export interface QuoteRequest {
  id: string;
  provider_id: string;
  message: string;
  status: 'pending' | 'responded' | 'rejected';
  responded_at?: string;
}

// Booking
export interface Booking {
  id: string;
  provider_id: string;
  date_start: string;
  duration_hours: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

// Repository results
export type RepositoryResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: Error };
```

---

## Tools & Dependencies

### Already Available
- ✅ TypeScript (^5.0)
- ✅ tsconfig.json (configured)
- ✅ React Native type definitions
- ✅ @supabase/supabase-js (has types)

### Should Add
```bash
npm install --save-dev @types/react-native @types/expo
```

---

## Testing Strategy

1. **Type checking:**
   ```bash
   npx tsc --noEmit
   ```

2. **Runtime tests:**
   ```bash
   npm test
   ```

3. **Integration tests:**
   ```bash
   npm run test:e2e:staging
   ```

4. **Build verification:**
   ```bash
   npx expo export --platform all
   ```

---

## Timeline & Effort Estimate

| Phase | Tasks | Effort | Duration |
|-------|-------|--------|----------|
| **1: Setup** | Config, core libs | 2 days | Mon-Tue |
| **2: Data Layer** | Repos, types | 3 days | Tue-Thu |
| **3: State** | Context, reducers | 2 days | Thu-Fri |
| **4: Navigation** | Route types | 1 day | Fri |
| **5: Components** | ~50 files | 5 days | Week 2 |
| **6: Testing** | Verify, fix errors | 2 days | Week 2 |
| **Total** | | **~15 days** | 2-3 weeks |

---

## Risk Mitigation

1. **Start with JSDoc** if timeline is tight
   - Easier to iterate
   - Can migrate to TS later
   - Provides immediate value

2. **Migrate file by file**
   - Don't require all-or-nothing
   - Mixed JS/TS is supported
   - Build confidence gradually

3. **Use codemods** for bulk changes
   ```bash
   npx jscodeshift --transform codemod.js src/
   ```

4. **Have escape hatch**
   ```typescript
   // If type is too complex:
   const unsafe: unknown = value;
   const typed = unsafe as MyType;
   ```

---

## Success Criteria

- [ ] All files pass `tsc --noEmit` with no errors
- [ ] No `// @ts-ignore` comments
- [ ] No `any` types except in escape cases
- [ ] All tests pass (npm test)
- [ ] Release build succeeds (npm run verify:release)
- [ ] Code review approved

