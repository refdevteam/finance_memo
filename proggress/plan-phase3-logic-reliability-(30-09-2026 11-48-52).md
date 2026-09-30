# Plan: Phase 3 - Logic Consistency & Reliability

**Project:** Finance Memo
**Created:** 30-09-2026 11:48:52
**Priority:** High/Medium
**Estimated Effort:** 4-6 hours

---

## Overview
Phase 3 addresses logic consistency and reliability improvements:
1. AI Coach fallback simulation inconsistent with prompt rules
2. Wallet edit rate limit based on cookies (bypassable)
3. Edge Functions lack retry logic for FCM/Resend failures

---

## Task 3.1: Fix AI Coach Fallback Simulation
**File:** src/actions/ai-coach.ts
**Effort:** 1-2 hours

### Problem:
Fallback simulation scores don't match prompt rules:
- Daily fallback: score=85 when expense>0, but prompt says score<55 if expense>20% of income30Days
- Weekly fallback: score=75 when expense>0, but prompt says score<50 if expense>30% of income30Days
- No reference to income30Days in fallback calculations

### Fix:
Align fallback scoring logic with prompt rules:
- Use income30Days as reference for daily/weekly scores
- Score=0 if income=0 AND expense=0 (already correct)
- Apply proportional scoring based on expense/income30Days ratio
- Daily: max 5% of income30Days = healthy (score 80+), >20% = warning (score <55)
- Weekly: max 20-25% of income30Days = healthy (score 80+), >30% = warning (score <50)

### Files to Modify:
- src/actions/ai-coach.ts (lines 277-356)

---

## Task 3.2: Harden Wallet Edit Rate Limit
**File:** src/actions/wallets.ts
**Effort:** 1-2 hours

### Problem:
Rate limit uses cookies (wallet_edit_count_{userId}_{date}), which are:
- Bypassable by clearing cookies
- Not server-side enforced
- Shared across devices (same cookie)

### Fix Options (Choose one):
A. Database-based: Add rate_limit column to profiles table
B. Keep cookies but add server-side validation via Supabase RPC
C. Use Supabase pg_advisory_lock for distributed rate limiting

### Recommended: Option A (Database-based)
- Add wallet_edit_count and wallet_edit_date columns to profiles
- Validate and increment in transaction

### Files to Modify:
- src/actions/wallets.ts (lines 59-81)
- supabase/migrations/ (new migration for profiles columns)

---

## Task 3.3: Add Retry Logic to Edge Functions
**Files:** supabase/functions/_shared/retry.ts (NEW), all Edge Functions
**Effort:** 1-2 hours

### Problem:
- FCM push: single attempt, fails permanently on transient errors
- Resend email: single attempt, fails permanently on rate limits
- No exponential backoff

### Fix:
Create shared retry wrapper with exponential backoff:
- maxAttempts: 3
- backoff: 1s, 2s, 4s
- Apply to: sendFcmPush, fetch to Resend, RPC calls

### Files to Create/Modify:
- supabase/functions/_shared/retry.ts (NEW)
- supabase/functions/send-reminder/index.ts (MODIFY)
- supabase/functions/send-fcm-notification/index.ts (MODIFY)
- supabase/functions/budget-alert/index.ts (MODIFY)
- supabase/functions/process-recurring/index.ts (MODIFY)

---

## Success Criteria
- [ ] AI Coach fallback scores match prompt rules
- [ ] Wallet rate limit enforced server-side (database)
- [ ] Edge Functions retry transient failures with backoff
- [ ] All existing functionality preserved
