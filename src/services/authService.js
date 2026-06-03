import { API_BASE_URL } from "../config/api";
import { buildApiRequestHeaders } from "./apiClient";

const TOKEN_KEY = "panel_auth_token";
const USER_KEY = "panel_auth_user";

const LOGIN_URL = `${API_BASE_URL}/auth/login`;

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler ?? null;
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

function saveSession({ token, username, role, tokenType }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      username: username ?? null,
      role: role ?? null,
      tokenType: tokenType ?? "Bearer",
    }),
  );
}

export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export function handleUnauthorized() {
  logout();
  unauthorizedHandler?.();
}

export function getAuthorizationHeader() {
  const token = getToken();
  if (!token) return null;
  return `Bearer ${token}`;
}

async function parseLoginError(response) {
  const text = await response.text().catch(() => "");
  if (!text) return "Credenciales inválidas.";

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    /* use fallback */
  }

  return "Credenciales inválidas.";
}

/**
 * POST /auth/login
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ token: string, tokenType: string, username: string, role: string }>}
 */
export async function login(username, password) {
  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: buildApiRequestHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      username: String(username ?? "").trim(),
      password: String(password ?? ""),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseLoginError(response));
  }

  const data = await response.json();
  if (!data?.token) {
    throw new Error("Respuesta de autenticación inválida.");
  }

  saveSession(data);
  return data;
}
