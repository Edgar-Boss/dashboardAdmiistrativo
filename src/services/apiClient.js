import { getAuthorizationHeader, handleUnauthorized } from "./authService";

/**
 * Authenticated fetch wrapper for protected API routes.
 * Adds Authorization: Bearer <token> and handles 401 globally.
 */
export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers ?? {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const authorization = getAuthorizationHeader();
  if (authorization) {
    headers.set("Authorization", authorization);
  }

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
