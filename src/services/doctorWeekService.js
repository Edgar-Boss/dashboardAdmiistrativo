import { API_BASE_URL } from "../config/api";
import { apiFetch } from "./apiClient";

const WEEK_MODES = new Set(["INHERIT", "CUSTOM"]);

/**
 * Weekly technician schedule.
 * GET/PUT /api/admin/schedule/doctors/{doctorId}/week
 * The tenant comes from the JWT. These calls never send tenantId.
 * Shifts are the raw week rows, not the clipped intervals of GET /api/admin/schedule.
 */

export function isWeekEditorUnavailable(error) {
  return (
    error?.status === 404 &&
    error?.code === "NOT_FOUND" &&
    error?.message === "Not found"
  );
}

export async function fetchDoctorWeek(doctorId) {
  const response = await apiFetch(weekUrl(doctorId), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw await readWeekError(response);
  }

  const data = await response.json();
  return normalizeWeek(data, doctorId);
}

export async function saveDoctorWeek(doctorId, payload) {
  const mode = payload?.mode;
  if (!WEEK_MODES.has(mode)) {
    const error = new Error("mode must be INHERIT or CUSTOM");
    error.status = 400;
    error.code = "INVALID_MODE";
    throw error;
  }

  const response = await apiFetch(weekUrl(doctorId), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(weekBody(payload)),
  });

  if (!response.ok) {
    throw await readWeekError(response);
  }

  const text = await response.text();
  if (!text) return null;
  return normalizeWeek(JSON.parse(text), doctorId);
}

function weekUrl(doctorId) {
  const id = String(doctorId ?? "").trim();
  return `${API_BASE_URL}/api/admin/schedule/doctors/${encodeURIComponent(id)}/week`;
}

function weekBody(payload) {
  const shifts =
    payload.mode === "INHERIT"
      ? []
      : (Array.isArray(payload.shifts) ? payload.shifts : []).map((shift) => ({
          dayOfWeek: shift.dayOfWeek,
          shiftNo: shift.shiftNo,
          startTime: shift.startTime,
          endTime: shift.endTime,
          endDayOffset: shift.endDayOffset,
        }));

  return {
    mode: payload.mode,
    shifts,
  };
}

function normalizeWeek(data, doctorId) {
  const mode = typeof data?.mode === "string" ? data.mode.trim() : "";
  const shifts = Array.isArray(data?.shifts) ? data.shifts.map(normalizeShift) : [];
  const legacySchedule = Array.isArray(data?.legacySchedule)
    ? data.legacySchedule.map(normalizeLegacyDay)
    : null;

  return {
    doctorId: Number(data?.doctorId ?? doctorId),
    mode,
    shifts,
    legacySchedule,
  };
}

function normalizeShift(raw) {
  return {
    dayOfWeek: numberOrNull(raw?.dayOfWeek),
    shiftNo: numberOrNull(raw?.shiftNo),
    startTime: raw?.startTime == null ? "" : String(raw.startTime),
    endTime: raw?.endTime == null ? "" : String(raw.endTime),
    endDayOffset: numberOrNull(raw?.endDayOffset),
  };
}

function normalizeLegacyDay(raw) {
  return {
    dayOfWeek: numberOrNull(raw?.dayOfWeek),
    working: raw?.working === true || raw?.working === 1,
    startTime: raw?.startTime == null ? null : String(raw.startTime),
    endTime: raw?.endTime == null ? null : String(raw.endTime),
  };
}

function numberOrNull(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value);
  return null;
}

async function readWeekError(response) {
  const text = await response.text().catch(() => "");
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  const message =
    parsed && typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : `Request failed (${response.status} ${response.statusText})`;
  const error = new Error(message);
  error.status = response.status;
  error.code = parsed && typeof parsed.error === "string" ? parsed.error : null;
  return error;
}
