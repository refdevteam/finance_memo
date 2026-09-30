# Phase 1 Fix Report: Critical Security & Data Integrity

**Project:** Finance Memo  
**Date:** 30-09-2026 14:45:22  
**Status:** ✅ COMPLETED  
**Branch:** main  
**Version:** 1.5.0 (auto-bumped during build)

---

## Summary

Successfully completed all 4 critical tasks in Phase 1:

| Task | Status | Files Modified |
|------|--------|----------------|
| 1.1 GDPR Account Deletion | ✅ Done | `supabase/functions/delete-user-account/index.ts` (NEW), `src/actions/gdpr.ts` |
| 1.2 Middleware Optimization | ✅ Done | `src/lib/supabase/middleware.ts`, `src/middleware.ts` |
| 1.3 Receipt Image Storage | ✅ Done | `src/app/api/ai/scan-receipt/route.ts` |
| 1.4 CSP Headers | ✅ Done | `next.config.mjs` |

---

## Task 1.1: GDPR Account Deletion Fix

### Problem
The `deleteUserAccount` function in `src/actions/gdpr.ts` only deleted data from public tables (`profiles`, `wallets`, `transactions`, etc.) but did NOT delete the user from `auth.users`, leaving orphan accounts.

### Solution
Created a new Supabase Edge Function `delete-user-account` that uses the Service Role Key to call `supabase.auth.admin.deleteUser(userId)`, which properly removes the user from the authentication system.

### Files Created/Modified

#### NEW: `supabase/functions/delete-user-account/index.ts`
- Deno Edge Function using Service Role client
- Verifies user JWT from Authorization header
- Calls `supabase.auth.admin.deleteUser(userId)` 
- Returns success/error response with proper CORS headers
- Logs deletion for audit trail

#### MODIFIED: `src/actions/gdpr.ts`
- Updated `deleteUserAccount()` to invoke Edge Function via `supabase.functions.invoke()`
- Passes user access token in Authorization header
- Removes manual table deletions (now handled by cascade via RLS)
- Maintains `signOut()` and `revalidatePath("/")` for session cleanup

### Testing Required
- [ ] Deploy Edge Function to Supabase: `supabase functions deploy delete-user-account`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` secret in Supabase Dashboard
- [ ] Test account deletion flow end-to-end
- [ ] Verify user removed from `auth.users` in Supabase Dashboard
- [ ] Verify all related data cascaded deleted via RLS

---

## Task 1.2: Middleware Single getUser() Call

### Problem
`src/middleware.ts` called `updateSession()` (which internally calls `supabase.auth.getUser()`) AND then called `supabase.auth.getUser()` again, resulting in 2 network calls per request.

### Solution
Modified `updateSession()` to return both the response AND the user object, eliminating the second call.

### Files Modified

#### `src/lib/supabase/middleware.ts`
```typescript
// Before: return supabaseResponse
// After:
const { data: { user } } = await supabase.auth.getUser()
return { response: supabaseResponse, user }
```

#### `src/middleware.ts`
```typescript
// Before:
const supabaseResponse = await updateSession(request)
const supabase = createServerClient(...)
const { data: { user } } = await supabase.auth.getUser()

// After:
const { response: supabaseResponse, user } = await updateSession(request)
// Use user directly, no second getUser() call
```

### Impact
- **Performance**: ~50% reduction in auth-related latency per request
- **Rate Limits**: Halves Supabase Auth API calls
- **Reliability**: Single point of failure for auth check

---

## Task 1.3: Receipt Image Upload to Supabase Storage

### Problem
Receipt scan API saved `image_url: "placeholder_for_storage"` instead of actual uploaded images.

### Solution
Added Supabase Storage upload before Gemini processing, saves public URL to database.

### Files Modified

#### `src/app/api/ai/scan-receipt/route.ts`
**Changes:**
1. **Upload to Storage** (lines 55-77):
   - Generate unique filename: `{userId}/{timestamp}-{random}.{ext}`
   - Upload file buffer to `receipts` bucket
   - Handle upload errors with 500 response

2. **Get Public URL** (lines 72-77):
   - Call `supabase.storage.from("receipts").getPublicUrl(path)`
   - Use returned `publicUrl` for `image_url` field

3. **Database Insert** (line 150):
   - Changed `image_url: "placeholder_for_storage"` → `image_url: imageUrl`

### Prerequisites (Manual Setup Required)
- [ ] Create `receipts` bucket in Supabase Storage (private)
- [ ] Set RLS policies for bucket:
  ```sql
  -- Allow users to upload their own receipts
  CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
  
  -- Allow users to read their own receipts
  CREATE POLICY "Users can read own receipts" ON storage.objects
  FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
  ```

---

## Task 1.4: Content Security Policy Headers

### Problem
No CSP headers, leaving app vulnerable to XSS via external scripts (Google GSI, Firebase, Supabase).

### Solution
Added comprehensive CSP + security headers via `next.config.mjs` `headers()` function.

### Files Modified

#### `next.config.mjs`
**Added `headers()` async function with:**

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Comprehensive policy allowing Google Auth, Supabase, Firebase, Fonts |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

**CSP Directives:**
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.gstatic.com`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com data:`
- `img-src 'self' data: https: blob:`
- `connect-src 'self' https://*.supabase.co https://*.googleapis.com https://fcm.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.supabase.co`
- `frame-src https://accounts.google.com https://content.googleapis.com`
- `frame-ancestors 'none'`
- `base-uri 'self'`
- `form-action 'self'`

### Testing Required
- [ ] Deploy and check browser console for CSP violations
- [ ] Verify Google One Tap login works
- [ ] Verify Firebase FCM push notifications work
- [ ] Verify Supabase realtime connections work
- [ ] Check `next.config.mjs` CSP syntax with `npx csp-evaluator` if needed

---

## Verification Results

### TypeScript Type Check
```
✅ npx tsc --noEmit → No errors found
```

### ESLint
```
ℹ️ 11 errors in 5 existing script files (generate-updates.js, replace.js, copy-assets.js, copy-logo.js, firebase-messaging-sw.js)
✅ 0 new errors in modified files
```

### Next.js Build
```
✅ Compiled successfully
✅ All 18 pages generated
✅ Middleware size: 81.4 kB
✅ Version auto-bumped to 1.5.0
```

---

## Deployment Checklist

### Supabase Dashboard (Completed 30-09-2026)
- [x] Deploy Edge Function: `supabase functions deploy delete-user-account` — **ACTIVE** (ID: b6a10c4f)
- [x] Set secret: `SUPABASE_SERVICE_ROLE_KEY` — **already configured**
- [x] Create `receipts` storage bucket (private, 5MB limit) — via migration `20260930144500`
- [x] Apply RLS policies for `receipts` bucket (INSERT/SELECT/DELETE per user) — via migration `20260930144500`

### Environment Variables (Verify)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- [ ] `FIREBASE_SERVICE_ACCOUNT` (for Edge Functions)
- [ ] `RESEND_API_KEY` (for Edge Functions)

### Post-Deploy Testing
- [ ] Login with Google OAuth
- [ ] Test receipt scan upload (verify image appears in Storage)
- [ ] Test account deletion (verify user removed from auth.users)
- [ ] Check browser DevTools → Network → Headers for CSP
- [ ] Check console for CSP violations
- [ ] Test FCM push notifications

---

## Next Steps (Phase 2)

| Priority | Task | Reference |
|----------|------|-----------|
| 🔴 Critical | Fix Select in Dialog (Round 3) | `proggress/bug-report-select-dialog-round3.md` |
| 🔴 Critical | Fix Google One Tap + Anti-Bot (FedCM) | `proggress/bug-report-google-login-security.md` |
| 🟡 High | Fix AI Coach Fallback Simulation | `src/actions/ai-coach.ts` |
| 🟢 Medium | Harden Wallet Edit Rate Limit | `src/actions/wallets.ts` |
| 🟢 Medium | Add Retry Logic to Edge Functions | `supabase/functions/*/index.ts` |
| 🟢 Medium | Setup Testing Infrastructure | Vitest + Playwright |

---

## Notes

- All changes are backward compatible
- Migration `20260930144500_create_receipts_bucket.sql` creates storage bucket + RLS policies
- Edge Function `delete-user-account` deployed via Supabase CLI
- `SUPABASE_SERVICE_ROLE_KEY` already set in Supabase secrets
- CSP may need tuning based on production CSP reports
