import axios from 'axios';

/**
 * Pool of realistic User-Agent strings representing different browser families.
 * Used for stealth rotation to avoid detection and rate-limiting.
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

/**
 * Tracks the last User-Agent index used per endpoint URL.
 * Ensures same UA is reused on retries and different UA on new endpoints.
 */
const endpointUAMap = new Map();

/** Index of the last User-Agent selected globally (for rotation across endpoints). */
let lastUAIndex = -1;

/**
 * Request timeout in milliseconds (30 seconds).
 */
const REQUEST_TIMEOUT = 30_000;

/**
 * Maximum number of retry attempts for retryable errors.
 */
const MAX_RETRIES = 3;

/**
 * Exponential backoff delays in milliseconds between retry attempts.
 */
const BACKOFF_DELAYS = [2000, 4000, 8000];

/**
 * Selects a User-Agent for the given endpoint URL.
 * - If the endpoint was seen before, reuses the same UA (for retries).
 * - If it's a new endpoint, rotates to a different UA from the pool.
 *
 * @param {string} url - The endpoint URL
 * @returns {string} The selected User-Agent string
 */
function selectUserAgent(url) {
  if (endpointUAMap.has(url)) {
    return USER_AGENTS[endpointUAMap.get(url)];
  }

  // Pick a different UA than the last one used globally
  let nextIndex = (lastUAIndex + 1) % USER_AGENTS.length;
  endpointUAMap.set(url, nextIndex);
  lastUAIndex = nextIndex;

  return USER_AGENTS[nextIndex];
}

/**
 * Determines if an error is retryable (timeout, 5xx, 429, or connection error).
 *
 * @param {Error} error - The axios error object
 * @returns {boolean} True if the request should be retried
 */
function isRetryable(error) {
  // Network/connection errors (no response received)
  if (!error.response) {
    const retryableCodes = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNABORTED'];
    return retryableCodes.includes(error.code) || error.code === 'ERR_NETWORK';
  }

  // Timeout via axios
  if (error.code === 'ECONNABORTED') {
    return true;
  }

  // 5xx or 429 status codes
  const status = error.response.status;
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Sleeps for the specified duration.
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sends a GET request to the given URL with stealth headers, timeout, and retry logic.
 * Never throws — always returns a result object.
 *
 * @param {string} url - The URL to fetch
 * @param {object} [options] - Optional configuration
 * @param {object} [options.headers] - Additional headers to include
 * @param {number} [options.timeout] - Override default timeout (ms)
 * @returns {Promise<{data: any, status: number|null, error: string|null}>}
 */
export async function fetchJSON(url, options = {}) {
  const userAgent = selectUserAgent(url);
  const timeout = options.timeout || REQUEST_TIMEOUT;

  const headers = {
    'User-Agent': userAgent,
    'Accept': 'application/json',
    ...options.headers,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const response = await axios.get(url, { headers, timeout });

      return {
        data: response.data,
        status: response.status,
        error: null,
      };
    } catch (error) {
      const isLastAttempt = attempt > MAX_RETRIES;

      if (!isLastAttempt && isRetryable(error)) {
        const delay = BACKOFF_DELAYS[attempt - 1];
        console.log(`[httpClient] Retry ${attempt}/${MAX_RETRIES} for ${url} (waiting ${delay / 1000}s)`);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or exhausted retries
      const status = error.response?.status || null;
      const errorMessage = error.response
        ? `HTTP ${status}: ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`
        : `${error.code || 'UNKNOWN'}: ${error.message}`;

      if (isLastAttempt && isRetryable(error)) {
        console.log(`[httpClient] All ${MAX_RETRIES} retries exhausted for ${url}`);
      }

      return {
        data: null,
        status,
        error: errorMessage,
      };
    }
  }
}

/**
 * Resets internal state (useful for testing).
 */
export function _resetState() {
  endpointUAMap.clear();
  lastUAIndex = -1;
}

// Expose for testing
export { USER_AGENTS, endpointUAMap, BACKOFF_DELAYS, MAX_RETRIES, REQUEST_TIMEOUT };
