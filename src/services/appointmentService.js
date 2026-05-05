// Use relative URLs so Vite proxy can avoid CORS in dev.
const APPOINTMENTS_URL = "/api/admin/appointments";
const APPOINTMENTS_BY_DATE_URL = "/appointments/search";
const APPOINTMENT_STATE_URL = "/api/admin/appointments/state";

/**
 * @returns {Promise<Array<{
 *   id: number,
 *   name: string,
 *   phoneNumber: string,
 *   doctorName: string,
 *   appointmentDate: string,
 *   appointmentTime: string,
 *   state: string
 * }>>}
 */
export async function fetchAppointments() {
  const response = await fetch(APPOINTMENTS_URL, {
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
  return Array.isArray(data) ? data : [];
}

function coerceArray(value) {
  return Array.isArray(value) ? value : [];
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

  // Support both: { appointments, summary } and { o_cursor, o_summary } and plain array.
  if (Array.isArray(data)) {
    return { appointments: data, summary: null };
  }

  const appointments =
    coerceArray(data?.appointments) ||
    coerceArray(data?.rows) ||
    coerceArray(data?.o_cursor) ||
    [];
  const summary = data?.summary ?? data?.o_summary ?? null;
  return { appointments, summary };
}

/**
 * Persists an appointment state change.
 * @param {{ id: number, change: "PENDING"|"CONFIRMED"|"CANCELLED"|string }} payload
 * @returns {Promise<any>}
 */
export async function updateAppointmentState(payload) {
  console.log("[appointments] POST state change ->", {
    url: APPOINTMENT_STATE_URL,
    payload,
  });

  const response = await fetch(APPOINTMENT_STATE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("[appointments] state change response <-", {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok) {
    const message = `Request failed (${response.status} ${response.statusText})`;
    console.error("[appointments] state change failed", { payload, message });
    throw new Error(message);
  }

  // Some backends return empty bodies on success.
  const text = await response.text();
  console.log("[appointments] state change body <-", text || "<empty>");
  return text ? JSON.parse(text) : null;
}
