# ESLint Rules Remediation Guide

## Issue Summary

The following ESLint rules are currently disabled in [admin-dashboard/eslint.config.mjs](../eslint.config.mjs):

```javascript
"@typescript-eslint/no-explicit-any": "off",
"react-hooks/exhaustive-deps": "off",
"react-hooks/set-state-in-effect": "off",
```

These rules hide potential bugs in:
- React hooks with stale closures
- Missing dependency arrays causing infinite loops
- Unsafe TypeScript `any` types

## Files Affected

The rules are disabled for these components (all in admin-dashboard):
- `app/components/admin-shell.tsx`
- `app/components/operations-pages.tsx`
- `app/components/governance-pages.tsx`
- `app/components/report-queue.tsx`
- `app/components/phase2-pages.tsx`
- `app/components/enhanced-list-pages.tsx`
- `app/providers/**/*.tsx`
- `app/verification/page.tsx`
- `supabase/functions/**/*.ts`
- `lib/admin.tsx`
- `lib/admin.ts`

---

## Remediation Steps

### Phase 1: Audit (1-2 days)

1. **Run ESLint with rules enabled** to identify violations:
   ```bash
   cd admin-dashboard
   # Temporarily enable the rules
   npx eslint app --rule "@typescript-eslint/no-explicit-any: error" --rule "react-hooks/exhaustive-deps: warn"
   ```

2. **Document all violations** by file:
   - Count violations per type
   - Group by component/module
   - Identify patterns

### Phase 2: Fix (3-5 days)

#### Rule: `react-hooks/exhaustive-deps`

**What it catches:** Missing dependencies in useEffect, useCallback, useMemo

**Example violation:**
```typescript
// ❌ BAD: query changes but not in deps array
const [results, setResults] = useState<array>();

useEffect(() => {
  if (query.trim().length < 2) {
    setResults([]);
    return;
  }
  // Fetch with query...
}, []); // 🔴 Missing: query
```

**Fix:**
```typescript
// ✅ GOOD: Include query in deps
useEffect(() => {
  if (query.trim().length < 2) {
    setResults([]);
    return;
  }
  // Fetch with query...
}, [query]); // ✅ Correct
```

**Common patterns to fix:**
- Add missing variables to dependency arrays
- Use `useCallback` for stable function references
- Use `useMemo` for computed values
- Extract functions outside effects if possible

#### Rule: `react-hooks/set-state-in-effect`

**What it catches:** setState inside effects without proper cleanup

**Example violation:**
```typescript
// ❌ BAD: setState without cleanup
useEffect(() => {
  setData(computeData());
  // Missing cleanup
}, []);
```

**Fix:**
```typescript
// ✅ GOOD: Properly structured
useEffect(() => {
  setData(computeData());
  
  return () => {
    // Cleanup if needed
  };
}, []);
```

#### Rule: `@typescript-eslint/no-explicit-any`

**What it catches:** Unsafe `any` types

**Example violations:**
```typescript
// ❌ BAD
const [data, setData] = useState<any>(null);
function handleError(error: any) { }
```

**Fixes:**

Option 1: Define proper types
```typescript
// ✅ GOOD: Proper types
interface ApiResponse {
  data: string;
  code: number;
}
const [data, setData] = useState<ApiResponse | null>(null);
function handleError(error: Error) { }
```

Option 2: Use Record pattern
```typescript
// ✅ ACCEPTABLE: Generic but typed
const [data, setData] = useState<Record<string, unknown> | null>(null);
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

### Phase 3: Deploy (1 day)

1. **Re-enable rules** in [admin-dashboard/eslint.config.mjs](../eslint.config.mjs):
   ```javascript
   // Remove from rules:
   "@typescript-eslint/no-explicit-any": "off",  // DELETE THIS
   "react-hooks/exhaustive-deps": "off",         // DELETE THIS
   "react-hooks/set-state-in-effect": "off",     // DELETE THIS
   ```

2. **Run full lint check**:
   ```bash
   npm run lint
   ```

3. **Verify tests pass**:
   ```bash
   npm run verify
   ```

---

## Special Cases

### Deno Functions (supabase/functions/*)

Deno functions have different runtime constraints. Keep rules disabled for:
- `admin-role-control/index.ts`
- `admin-user-control/index.ts`
- Other Deno functions

These will need separate linting configuration once Deno LSP is better integrated.

### Large Components

For components >500 lines, consider splitting into smaller modules first:
- Extract hooks into custom hooks
- Extract components into subcomponents
- This often eliminates dependency issues naturally

---

## Timeline & Effort

| Task | Effort | Blocker? |
|------|--------|----------|
| Audit violations | 4 hours | No |
| Fix exhaustive-deps | 8 hours | No |
| Fix set-state-in-effect | 4 hours | No |
| Fix no-explicit-any | 12 hours | No |
| Testing & validation | 4 hours | Yes |
| **Total** | **~32 hours** | ~2 days |

---

## Prevention Going Forward

1. **Pre-commit hook**: Add ESLint check to prevent violations
   ```bash
   npx husky install
   npx husky add .husky/pre-commit "npx eslint app --max-warnings 0"
   ```

2. **CI/CD integration**: Fail builds if ESLint errors
   ```yaml
   # In CI pipeline
   - run: npm run lint
   ```

3. **Code review checklist**: Reviewers verify no `any` types

4. **Development habits**: Run `npm run lint` frequently during development

---

## Questions?

- See [React Hooks Documentation](https://react.dev/reference/react/useEffect#dependencies)
- See [TypeScript Handbook - Any Type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any)
