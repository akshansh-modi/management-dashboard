/**
 * Shared error-handling utilities for the management dashboard.
 *
 * Rule:
 *  - 4xx with a known, user-facing `message` → show it (it's user-actionable).
 *  - 5xx, network error, or unrecognizable payload → show a generic safe message.
 *  - Always console.error the real error for debugging.
 */

/**
 * Converts any caught API/network error into a string safe to display to the
 * end user. Never surfaces raw 5xx messages, stack traces, or internal details.
 */
export function toUserMessage(error: unknown): string {
  console.error('[API Error]', error);

  if (!error || typeof error !== 'object') {
    return 'Something went wrong. Please try again.';
  }

  const err = error as Record<string, unknown>;

  // Axios-style errors have a `response` property
  const response = err['response'] as Record<string, unknown> | undefined;
  if (response) {
    const status = response['status'] as number | undefined;
    const data = response['data'] as Record<string, unknown> | undefined;

    // 4xx: user-actionable — surface the server message if available
    if (status && status >= 400 && status < 500) {
      const msg = data?.['message'] as string | undefined;
      if (msg && typeof msg === 'string' && msg.trim().length > 0) {
        return msg.trim();
      }
      if (status === 401) return 'Your session has expired. Please log in again.';
      if (status === 403) return 'You do not have permission to perform this action.';
      if (status === 404) return 'The requested resource was not found.';
      return 'Invalid request. Please check your input and try again.';
    }

    // 5xx: never surface internal details
    if (status && status >= 500) {
      return 'Something went wrong on our end. Please try again.';
    }
  }

  // Network error (no response at all)
  if (err['code'] === 'ERR_NETWORK' || err['message'] === 'Network Error') {
    return 'Unable to reach the server. Please check your connection.';
  }

  return 'Something went wrong. Please try again.';
}
