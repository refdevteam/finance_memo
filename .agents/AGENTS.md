# Workspace Rules

## Command Execution & Verification Rules
- ❌ **Forbidden Commands (`npx tsc --noEmit`, `tsc`, `npm run build`, `next build`)**: Never run `npm run build`, `next build`, `npx tsc --noEmit`, or `tsc` type-checking/build commands automatically during code edits or verification phases. It is too slow and unnecessary.
- Only run build or type-checking commands if explicitly requested by the user.

