import { API_BASE_URL } from "../config/api";
import { apiFetch } from "./apiClient";

const SPECIALIST_URL = `${API_BASE_URL}/api/admin/specialist`;
const SPECIALIST_UPDATE_URL = `${SPECIALIST_URL}/update`;
const SPECIALIST_CREATE_URL = `${SPECIALIST_URL}/create`;

function normalizeWhatsappPhone(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeNotificationsEnabled(value) {
  return String(value ?? "").trim().toUpperCase() === "Y";
}

/**
 * Backend may return tuples:
 * [id, name, specialty, activeFlag]
 * or
 * [id, name, specialty, activeFlag, whatsappPhone, notificationsEnabled]
 * @param {unknown} raw
 * @returns {{
 *   id?: unknown,
 *   name: string,
 *   specialty: string,
 *   activeFlag?: string|null,
 *   whatsappPhone: string,
 *   notificationsEnabled: boolean
 * }}
 */
export function normalizeSpecialistEntry(raw) {
  if (Array.isArray(raw)) {
    return {
      id: raw[0],
      name: raw[1] != null ? String(raw[1]).trim() : "",
      specialty: raw[2] != null ? String(raw[2]).trim() : "",
      activeFlag: raw[3] != null ? String(raw[3]).trim() : null,
      whatsappPhone: normalizeWhatsappPhone(raw[4]),
      notificationsEnabled: normalizeNotificationsEnabled(raw[5]),
    };
  }
  if (raw != null && typeof raw === "object") {
    return {
      id: raw.id ?? raw.specialistId,
      name: String(
        raw.name ?? raw.fullName ?? raw.doctorName ?? ""
      ).trim(),
      specialty: String(
        raw.specialty ?? raw.speciality ?? raw.doctorSpecialty ?? ""
      ).trim(),
      activeFlag:
        raw.activeFlag ??
        raw.active_flag ??
        raw.active ??
        raw.isActive ??
        raw.enabled ??
        null,
      whatsappPhone: normalizeWhatsappPhone(
        raw.whatsappPhone ?? raw.whatsapp_phone ?? null
      ),
      notificationsEnabled: normalizeNotificationsEnabled(
        raw.notificationsEnabled ?? raw.notifications_enabled ?? null
      ),
    };
  }
  return {
    id: undefined,
    name: String(raw ?? "").trim(),
    specialty: "",
    activeFlag: null,
    whatsappPhone: "",
    notificationsEnabled: false,
  };
}

/**
 * Active when the active flag is exactly "Y" (case-insensitive).
 * Arrays: only index 3. Objects: normalized activeFlag.
 * @param {unknown} raw
 */
export function isSpecialistActiveEntry(raw) {
  if (Array.isArray(raw)) {
    return String(raw[3] ?? "").trim().toUpperCase() === "Y";
  }
  const normalized = normalizeSpecialistEntry(raw);
  return String(normalized.activeFlag ?? "").trim().toUpperCase() === "Y";
}

/**
 * Build create/update body fields for WhatsApp without omitting false.
 * @param {Record<string, unknown>} body
 * @param {{ whatsappPhone?: unknown, notificationsEnabled?: unknown }} payload
 */
function applyWhatsappPayloadFields(body, payload) {
  if (payload != null && Object.prototype.hasOwnProperty.call(payload, "whatsappPhone")) {
    body.whatsappPhone = String(payload.whatsappPhone ?? "");
  }
  if (
    payload != null &&
    Object.prototype.hasOwnProperty.call(payload, "notificationsEnabled")
  ) {
    body.notificationsEnabled = Boolean(payload.notificationsEnabled);
  }
}

/**
 * GET /api/admin/specialist — only entries with active flag "Y".
 * @returns {Promise<Array<{ id?: unknown, name: string, specialty: string, activeFlag?: string|null, whatsappPhone: string, notificationsEnabled: boolean }>>}
 */
export async function fetchActiveSpecialists() {
  const response = await apiFetch(SPECIALIST_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = `Request failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data
    .filter(isSpecialistActiveEntry)
    .map(normalizeSpecialistEntry)
    .filter((s) => s.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * @returns {Promise<Array<{ id?: unknown, name: string, specialty: string, activeFlag?: string|null, whatsappPhone: string, notificationsEnabled: boolean }>>}
 */
export async function fetchSpecialists() {
  const response = await apiFetch(SPECIALIST_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = `Request failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data
    .map(normalizeSpecialistEntry)
    .filter((s) => s.name.length > 0);
}

/**
 * PATCH /api/admin/specialist/update
 * @param {{ doctorId: number, name: string, specialty: string, active: "Y"|"N", whatsappPhone?: string, notificationsEnabled?: boolean }} payload
 * @returns {Promise<unknown>}
 */
export async function updateSpecialist(payload) {
  const body = {
    doctorId: payload?.doctorId,
    name: String(payload?.name ?? "").trim(),
    specialty: String(payload?.specialty ?? "").trim(),
  };
  if (payload?.active === "Y" || payload?.active === "N") {
    body.active = payload.active;
  }
  applyWhatsappPayloadFields(body, payload);

  const response = await apiFetch(SPECIALIST_UPDATE_URL, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const details = text ? ` - ${text}` : "";
    throw new Error(
      `Request failed (${response.status} ${response.statusText})${details}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await response.json();
  return await response.text();
}

/**
 * POST /api/admin/specialist/create
 * @param {{ name: string, specialty?: string, active?: "Y"|"N", whatsappPhone?: string, notificationsEnabled?: boolean }} payload
 * @returns {Promise<{ ok?: boolean, doctorId?: number }>}
 */
export async function createSpecialist(payload) {
  const body = {
    name: String(payload?.name ?? "").trim(),
    specialty: String(payload?.specialty ?? "").trim(),
  };
  if (payload?.active === "Y" || payload?.active === "N") {
    body.active = payload.active;
  }
  applyWhatsappPayloadFields(body, payload);

  const response = await apiFetch(SPECIALIST_CREATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed (${response.status} ${response.statusText})`;
    const text = await response.text().catch(() => "");
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.message === "string" && parsed.message.trim()) {
          message = parsed.message.trim();
        } else {
          message = `${message} - ${text}`;
        }
      } catch {
        message = `${message} - ${text}`;
      }
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await response.json();
  return await response.text();
}
