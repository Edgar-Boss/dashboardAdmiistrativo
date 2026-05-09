// Relative URL so Vite proxy can avoid CORS in dev.
const SPECIALIST_URL = "/api/admin/specialist";
const SPECIALIST_UPDATE_URL = `${SPECIALIST_URL}/update`;

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
