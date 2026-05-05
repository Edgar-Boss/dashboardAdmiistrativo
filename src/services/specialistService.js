// Relative URL so Vite proxy can avoid CORS in dev.
const SPECIALIST_URL = "/api/admin/specialist";

/**
 * Backend may return tuples: [id, name, specialty]
 * @param {unknown} raw
 * @returns {{ id?: unknown, name: string, specialty: string }}
 */
function normalizeSpecialistEntry(raw) {
  if (Array.isArray(raw)) {
    return {
      id: raw[0],
      name: raw[1] != null ? String(raw[1]).trim() : "",
      specialty: raw[2] != null ? String(raw[2]).trim() : "",
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
    };
  }
  return { id: undefined, name: String(raw ?? "").trim(), specialty: "" };
}

/**
 * @returns {Promise<Array<{ id?: unknown, name: string, specialty: string }>>}
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
