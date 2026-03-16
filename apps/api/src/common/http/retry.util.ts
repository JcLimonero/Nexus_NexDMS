export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  baseDelayMs?: number;
}

export async function fetchWithRetry(
  url: string | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const { maxRetries = 3, baseDelayMs = 500, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      const shouldRetry =
        !response.ok && response.status >= 500 && attempt < maxRetries;
      if (response.ok || !shouldRetry) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }

    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('fetchWithRetry failed');
}
