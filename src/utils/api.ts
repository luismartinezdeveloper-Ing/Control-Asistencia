/**
 * Centralized API client for communicating with the auth backend.
 * All requests include credentials (cookies) for HttpOnly token transport.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Custom API error with HTTP status code.
 */
export class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Fetch wrapper that:
 * - Prepends the API base URL
 * - Includes credentials (cookies) for HttpOnly token
 * - Sets Content-Type to JSON for POST/PUT/PATCH
 * - Throws ApiError on non-ok responses
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Set JSON content type for requests with body
  if (['POST', 'PUT', 'PATCH'].includes(method) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Send HttpOnly cookies
  });

  if (!res.ok) {
    let errorMessage = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) {
        errorMessage = body.error;
      }
    } catch {
      // Response body was not JSON
    }
    throw new ApiError(res.status, errorMessage);
  }

  // Handle empty responses (e.g. 204 No Content)
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return res.json();
}
