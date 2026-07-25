export type RetryOptions = { attempts?: number; baseDelayMs?: number; retryWhen?: (error: unknown) => boolean };

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(100, options.baseDelayMs ?? 350);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || (options.retryWhen && !options.retryWhen(error))) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

export function createErrorReference(prefix = "LL") {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${time}-${random}`;
}

export function isTransientNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /network|fetch|timeout|temporar|offline|connection/i.test(message);
}
