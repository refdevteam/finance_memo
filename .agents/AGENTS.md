# Workspace Rules

## Command Execution & Verification Rules
- ❌ **Forbidden Command: `npx tsc --noEmit`**: Never run `npx tsc --noEmit`, `tsc`, or full TypeScript type-checking commands automatically during code edits or verification phases. It is too slow and unnecessary.
- Only run type-checking commands if explicitly requested by the user.
