import { normalizeAppointment, normalizeAppointments } from "../components/appointments/appointmentEditHelpers";

// Use relative URLs so Vite proxy can avoid CORS in dev.
const APPOINTMENTS_LIST_URL = "/api/admin/appointments";
const APPOINTMENTS_BY_DATE_URL = "/appointments/search";
const APPOINTMENT_UPDATE_URL = "/appointments";
const APPOINTMENT_STATE_URL = "/api/admin/appointments/state";

/**
 * GET /api/admin/appointments
 * @returns {Promise<Array<{
 *   id: number,
 *   phoneNumber: string,
 *   name: string,
 *   reason: string | null,
 *   createdAt: string,
 *   appointmentDate: string,
 *   appointmentTime: string,
 *   state: "PENDING"|"CONFIRMED"|"CANCELLED"|string,
 *   doctorId: number,
 *   doctorName: string,
 *   specialty: string,
 *   slotCount: number
 * }>>}
 */
export async function fetchAppointments() {
  const response = await fetch(APPOINTMENTS_LIST_URL, {
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
  return normalizeAppointments(extractAppointmentsList(data));
}

/** Supports plain array or wrapped API payloads. */
function extractAppointmentsList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.appointments)) return data.appointments;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.o_cursor)) return data.o_cursor;
  return [];
}

/**
 * Fetch day appointments from SP_GET_APPOINTMENTS_BY_DATE wrapper endpoint.
 *
 * Backend example:
 * - /appointments/search?date=2026-05-26
 *
 * Optional params depend on backend support:
 * - doctorId
 * - state
 *
 * Response is normalized to:
 * - { appointments: Array, summary: object|null }
 *
 * @param {{ date: string, doctorId?: number|string|null, state?: string|null }} params
 * @returns {Promise<{appointments: Array<any>, summary: any | null}>}
 */
export async function fetchAppointmentsByDate(params) {
  const date = params?.date ?? "";
  const doctorId = params?.doctorId ?? null;
  const state = params?.state ?? null;

  const qs = new URLSearchParams();
  qs.set("date", date);
  if (doctorId !== null && doctorId !== undefined && doctorId !== "") {
    // Only sent if backend supports it.
    qs.set("doctorId", String(doctorId));
  }
  if (state !== null && state !== undefined && state !== "") {
    // Only sent if backend supports it.
    qs.set("state", String(state));
  }

  const response = await fetch(`${APPOINTMENTS_BY_DATE_URL}?${qs.toString()}`, {
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
  const appointments = normalizeAppointments(extractAppointmentsList(data));
  const summary =
    data && typeof data === "object" && !Array.isArray(data)
      ? data.summary ?? data.o_summary ?? null
      : null;
  return { appointments, summary };
}

const API_STATE_CHANGES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};

/**
 * Maps UI state (PENDING, etc.) to API body value (pending, etc.).
 * @param {string} state
 * @returns {"pending"|"confirmed"|"cancelled"|string}
 */
export function toApiStateChange(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  if (API_STATE_CHANGES[normalized]) {
    return API_STATE_CHANGES[normalized];
  }
  return typeof state === "string" ? state.toLowerCase() : "pending";
}

/**
 * Updates editable appointment fields.
 * PATCH /appointments/:id — body: { name, slotCount, reason }
 * @param {number|string} id
 * @param {{ name: string, slotCount: number, reason?: string|null }} payload
 * @returns {Promise<any>}
 */
export async function updateAppointment(id, payload) {
  const response = await fetch(`${APPOINTMENT_UPDATE_URL}/${id}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = `Request failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return data && typeof data === "object" ? normalizeAppointment(data) : data;
}

/**
 * Persists an appointment state change.
 * PATCH /api/admin/appointments/state — body: { id, change: "pending"|"confirmed"|"cancelled" }
 */
export async function updateAppointmentState(payload) {
  const body = {
    id: payload.id,
    change: toApiStateChange(payload.change),
  };

  const response = await fetch(APPOINTMENT_STATE_URL, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = `Request failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
