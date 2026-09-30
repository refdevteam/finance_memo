# Phase 2 Fix Report: UI/UX Bug Fixes

**Project:** Finance Memo
**Date:** 30-09-2026 11:46:52
**Status:** COMPLETED
**Version:** 1.5.0

---

## Summary

| Task | Status | Notes |
|------|--------|-------|
| 2.1 Select in Dialog (Round 3) | ALREADY FIXED | Verified - no changes needed |
| 2.2 Google One Tap (FedCM) | FIXED | Added use_fedcm_for_prompt: true |

---

## Task 2.1: Select in Dialog (Round 3) - VERIFIED ALREADY FIXED

### Investigation
Reviewed all components that combine Dialog + Select to verify the Round 3 fix was applied:

| File | Uses Base UI Select? | Status |
|------|---------------------|--------|
| src/components/ui/select.tsx | Component definition | container/noPortal props present, alignItemWithTrigger=false |
| src/components/ui/inline-select.tsx | Portal-free alternative | Created specifically for Dialog use |
| src/components/dashboard/WalletForm.tsx | No - uses InlineSelect | Fixed |
| src/components/reminders/RemindersClient.tsx | No - native HTML select | Not affected |
| src/components/settings/SettingsClient.tsx | No - native HTML select | Not affected |
| src/components/onboarding/OnboardingForm.tsx | Yes - but NOT in Dialog | Not affected |

### Conclusion
Round 3 fix (container prop + portal into Dialog DOM) is already applied at the component level.
WalletForm uses InlineSelect (portal-free) instead of Base UI Select.
No other components use Base UI Select inside Dialog.

### Files Checked (no changes needed):
- src/components/ui/select.tsx (lines 67-83, 113-119)
- src/components/ui/inline-select.tsx (full file)
- src/components/dashboard/WalletForm.tsx (line 18, 106)

---

## Task 2.2: Google One Tap - FedCM Fix

### Problem
Google One Tap failed on Chrome due to third-party cookie blocking.
use_fedcm_for_prompt was declared in TypeScript type but NOT passed to initialize().

### Fix Applied
File: src/components/auth/GoogleLoginButton.tsx (line 236)

Before:
`	ypescript
window.google!.accounts.id.initialize({
  client_id: clientId,
  callback: handleCredentialResponse,
  nonce: hashedNonce,
})
`

After:
`	ypescript
window.google!.accounts.id.initialize({
  client_id: clientId,
  callback: handleCredentialResponse,
  nonce: hashedNonce,
  // Aktifkan FedCM agar kompatibel dengan pemblokiran third-party cookie di Chrome terbaru
  use_fedcm_for_prompt: true,
})
`

### Existing Anti-Bot Measures (preserved):
- Cloudflare Turnstile captcha verification
- Nonce generation (SHA-256 hashed for Google, raw for Supabase)
- GSI initialization gated by isVerified state (Turnstile passed)

---

## Verification Results

### TypeScript Type Check
`
npx tsc --noEmit -> No errors found
`

### ESLint
`
11 errors in 5 existing script files (unchanged from Phase 1)
0 new errors in modified files
`

### Next.js Build
`
Compiled successfully
All 18 pages generated
Login page: 8.29 kB (was 8.28 kB - +0.01 kB from FedCM flag)
`

---

## Testing Required

### Google One Tap (FedCM)
- [ ] Open login page on Chrome (latest)
- [ ] Complete Turnstile captcha
- [ ] Verify Google button appears
- [ ] Click Google button - should open account picker
- [ ] Select account - should login successfully
- [ ] Check DevTools console for FedCM-related messages
- [ ] Test on mobile Chrome (FedCM critical path)

### Select in Dialog (regression check)
- [ ] Open Wallet dialog - type select should work
- [ ] Open Transaction form - category select should work
- [ ] Open Settings - any select should work

---

## Phase 1 + Phase 2 Combined Status

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1 | GDPR, Middleware, Receipt Storage, CSP | COMPLETED + DEPLOYED |
| Phase 2 | Select Dialog, Google FedCM | COMPLETED |

---

## Next Phase (Phase 3)

| Priority | Task | Reference |
|----------|------|-----------|
| High | Fix AI Coach Fallback Simulation | src/actions/ai-coach.ts |
| Medium | Harden Wallet Edit Rate Limit | src/actions/wallets.ts |
| Medium | Add Retry Logic to Edge Functions | supabase/functions/*/index.ts |
| Medium | Setup Testing Infrastructure | Vitest + Playwright |
