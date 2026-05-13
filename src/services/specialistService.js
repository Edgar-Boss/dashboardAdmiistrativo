// Relative URL so Vite proxy can avoid CORS in dev.
const SPECIALIST_URL = "/api/admin/specialist";
const SPECIALIST_UPDATE_URL = `${SPECIALIST_URL}/update`;
const SPECIALIST_CREATE_URL = `${SPECIALIST_URL}/create`;

/**
 * Backend may return tuples: [id, name, specialty, activeFlag]
 * @param {unknown} raw
 * @returns {{ id?: unknown, name: string, specialty: string, activeFlag?: string|null }}
 */
function normalizeSpecialistEntry(raw) {
  if (Array.isArray(raw)) {
    return {
      id: raw[0],
      name: raw[1] != null ? String(raw[1]).trim() : "",
      specialty: raw[2] != null ? String(raw[2]).trim() : "",
      activeFlag: raw[3] != null ? String(raw[3]).trim() : null,
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
    };
  }
  return {
    id: undefined,
    name: String(raw ?? "").trim(),
    specialty: "",
    activeFlag: null,
  };
}

/**
 * @returns {Promise<Array<{ id?: unknown, name: string, specialty: string, activeFlag?: string|null }>>}
 */
export async function fetchSpecialists() {
  const response = await fetch(SPECIALIST_URL, {
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
 * @param {{ doctorId: number, name: string, specialty: string, active: "Y"|"N" }} payload
 * @returns {Promise<unknown>}
 */
export async function updateSpecialist(payload) {
  const response = await fetch(SPECIALIST_UPDATE_URL, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
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
 * @param {{ name: string, specialty?: string, active?: "Y"|"N" }} payload
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

  const response = await fetch(SPECIALIST_CREATE_URL, {
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
