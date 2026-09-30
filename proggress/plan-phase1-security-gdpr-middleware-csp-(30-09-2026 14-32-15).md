# Plan: Phase 1 - Critical Security & Data Integrity Fixes

**Project:** Finance Memo  
**Created:** 30-09-2026 14:32:15  
**Priority:** ?? Critical  
**Estimated Effort:** 6-9 hours

---

## Overview
Phase 1 addresses 4 critical issues identified in security audit:
1. GDPR Non-Compliance: Account deletion doesn't remove user from auth.users
2. Middleware Double getUser() Call: 2x network calls per request
3. Receipt Scan: Image URL hardcoded placeholder (no actual storage)
4. Missing CSP Headers: XSS vulnerability via external scripts

---

## Task 1.1: Fix GDPR Account Deletion
**File:** \src/actions/gdpr.ts\, new Edge Function
**Effort:** 2-3 hours

### Steps:
1. Create Supabase Edge Function \delete-user-account\ with Service Role Key
2. Call \supabase.auth.admin.deleteUser(userId)\ in Edge Function
3. Update \src/actions/gdpr.ts\ to invoke Edge Function via \supabase.functions.invoke()\
4. Test: verify user removed from \uth.users\ and all related data

### Files to Modify/Create:
- \supabase/functions/delete-user-account/index.ts\ (NEW)
- \src/actions/gdpr.ts\ (MODIFY)

---

## Task 1.2: Optimize Middleware - Single getUser()
**File:** \src/middleware.ts\, \src/lib/supabase/middleware.ts\
**Effort:** 1 hour

### Steps:
1. Modify \updateSession()\ in \src/lib/supabase/middleware.ts\ to return \{ response, user }\
2. Update \src/middleware.ts\ to use user from response, remove second \getUser()\ call
3. Test: verify auth flow works, monitor latency improvement

### Files to Modify:
- \src/lib/supabase/middleware.ts\
- \src/middleware.ts\

---

## Task 1.3: Implement Receipt Image Upload to Supabase Storage
**File:** \src/app/api/ai/scan-receipt/route.ts\
**Effort:** 2-3 hours

### Steps:
1. Create bucket \eceipts\ in Supabase Storage (private)
2. Update scan-receipt route:
   - Upload file to Storage before calling Gemini
   - Save \image_url\ (signed URL or path) to \eceipts\ table
3. Create RLS policies for receipts bucket
4. Test: upload receipt, verify image stored & accessible

### Files to Modify:
- \src/app/api/ai/scan-receipt/route.ts\
- Supabase Dashboard: Storage bucket + policies

---

## Task 1.4: Add CSP Headers
**File:** \
ext.config.mjs\
**Effort:** 1-2 hours

### Steps:
1. Add \headers()\ async function to \
ext.config.mjs\
2. Define CSP policy:
   \\\
   default-src 'self'; 
   script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com; 
   style-src 'self' 'unsafe-inline'; 
   img-src 'self' data: https:; 
   connect-src 'self' https://*.supabase.co https://*.googleapis.com https://fcm.googleapis.com; 
   frame-src https://accounts.google.com;
   \\\
3. Test: no CSP violations in console, Google login & FCM still work

### Files to Modify:
- \
ext.config.mjs\

---

## Dependencies & Prerequisites
- [ ] Supabase Service Role Key available for Edge Function
- [ ] Supabase Storage enabled on project
- [ ] \FIREBASE_SERVICE_ACCOUNT\, \RESEND_API_KEY\ secrets set in Supabase Dashboard
- [ ] \NEXT_PUBLIC_GOOGLE_CLIENT_ID\ configured

---

## Success Criteria
- [ ] \deleteUserAccount\ removes user from \uth.users\ completely
- [ ] Middleware makes only 1 \getUser()\ call per request
- [ ] Receipt images uploaded to Storage, URL saved in DB
- [ ] CSP headers present, no console violations, all features functional

---

## Next Phase (Phase 2)
- Fix Select in Dialog (Round 3 fix)
- Fix Google One Tap + Anti-Bot (FedCM + honeypot)
