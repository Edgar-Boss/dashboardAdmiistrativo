import { getAuthorizationHeader, handleUnauthorized } from "./authService";

export const NGROK_SKIP_BROWSER_WARNING_HEADER = "ngrok-skip-browser-warning";

/**
 * Default headers for every API request (ngrok tunnel, JSON, auth when present).
 */
export function buildApiRequestHeaders(initialHeaders) {
  const headers = new Headers(initialHeaders ?? {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has(NGROK_SKIP_BROWSER_WARNING_HEADER)) {
    headers.set(NGROK_SKIP_BROWSER_WARNING_HEADER, "true");
  }

  const authorization = getAuthorizationHeader();
  if (authorization && !headers.has("Authorization")) {
    headers.set("Authorization", authorization);
  }

  return headers;
}

/**
 * Authenticated fetch wrapper for protected API routes.
 * Adds default API headers and handles 401 globally.
 */
export async function apiFetch(url, options = {}) {
  const headers = buildApiRequestHeaders(options.headers);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Sesión expirada. Inicia sesión nuevamente.");
  }

  return response;
}
