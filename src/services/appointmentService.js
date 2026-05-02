const APPOINTMENTS_URL =
  "http://localhost:8080/api/admin/appointments";
const APPOINTMENT_STATE_URL =
  "http://localhost:8080/api/admin/appointments/state";

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
