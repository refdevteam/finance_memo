// @ts-nocheck — Deno Edge Function: URL imports are valid in Supabase's Deno runtime.
// Shared retry helper with exponential backoff for transient failures.

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return true if the error is retryable */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Retry an async operation with exponential backoff.
 *
 * @param fn - The async operation to retry
 * @param label - Label for logging purposes
 * @param options - Retry configuration
 * @returns The result of fn on success
 * @throws The last error if all attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt >= maxAttempts || !shouldRetry(err)) {
        console.error(`[Retry] ${label}: failed after ${attempt} attempt(s):`, err);
        throw err;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      // Add jitter to avoid thundering herd
      const jitter = Math.floor(Math.random() * 200);
      const waitMs = delay + jitter;

      console.warn(
        `[Retry] ${label}: attempt ${attempt}/${maxAttempts} failed, retrying in ${waitMs}ms...`,
        err
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}

/**
 * Retry a fetch call with backoff. Only retries on network errors and 5xx/429 responses.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label = "fetch",
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const res = await fetch(url, init);
      if (!res.ok && res.status >= 500 || res.status === 429) {
        throw new Error(`HTTP ${res.status} from ${url}`);
      }
      return res;
    },
    label,
    {
      ...options,
      shouldRetry: (err) => {
        // Retry on HTTP 5xx/429 or network errors
        const msg = err instanceof Error ? err.message : String(err);
        return msg.includes("HTTP 5") || msg.includes("HTTP 429") || !msg.includes("HTTP");
      },
    }
  );
}
