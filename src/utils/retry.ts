// ────────────────────────────────────────────────────────────────────
// Exponential Backoff Retry Utility
// ────────────────────────────────────────────────────────────────────
// Provides resilient retry mechanism for handling transient failures,
// rate limits, and network issues with exponential backoff and jitter.
// ────────────────────────────────────────────────────────────────────

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Human-readable operation name for logging purposes */
  operationName?: string;
}

/**
 * Apply jitter to delay value to prevent thundering herd problem
 * Adds random variance of ±20% to the delay
 * 
 * @param delay - Base delay in milliseconds
 * @returns Delay with jitter applied
 */
function applyJitter(delay: number): number {
  const jitterRange = 0.2; // ±20% variance
  const jitter = delay * jitterRange * (Math.random() * 2 - 1); // Random value between -20% and +20%
  return Math.round(delay + jitter);
}

/**
 * Calculate exponential backoff delay with jitter
 * Formula: delay = baseDelay × 2^(attempt - 1) with ±20% jitter
 * 
 * @param attempt - Current attempt number (1-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Calculated delay with jitter
 */
function calculateDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  return applyJitter(exponentialDelay);
}

/**
 * Sleep for specified duration
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff and jitter
 * 
 * This utility handles transient failures by automatically retrying operations
 * with increasing delays between attempts. Jitter is applied to prevent
 * multiple clients from retrying simultaneously (thundering herd problem).
 * 
 * **Retry Strategy:**
 * - Attempt 1: Immediate execution
 * - Attempt 2: ~1s delay (1000ms ± 20% jitter)
 * - Attempt 3: ~2s delay (2000ms ± 20% jitter)
 * - Attempt 4: ~4s delay (4000ms ± 20% jitter)
 * 
 * **Example Usage:**
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetchDataFromAPI(),
 *   { maxRetries: 3, baseDelay: 1000, operationName: 'API fetch' }
 * );
 * ```
 * 
 * @template T - Return type of the operation
 * @param operation - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to operation result
 * @throws Last error encountered if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    operationName = 'Operation'
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the operation
      const result = await operation();
      
      // Success - log only if this wasn't the first attempt
      if (attempt > 1) {
        console.log(
          `[Retry] ✅ ${operationName} succeeded on attempt ${attempt}/${maxRetries}`
        );
      }
      
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxRetries) {
        // Final attempt failed - log and throw
        console.error(
          `[Retry] ❌ ${operationName} failed after ${maxRetries} attempts. ` +
          `Last error: ${error?.message || error}`
        );
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateDelay(attempt, baseDelay);
      
      // Log retry attempt
      console.warn(
        `[Retry] ⚠️  ${operationName} failed on attempt ${attempt}/${maxRetries}. ` +
        `Retrying in ${delay}ms... Error: ${error?.message || error}`
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // TypeScript exhaustiveness check - should never reach here
  throw lastError!;
}
