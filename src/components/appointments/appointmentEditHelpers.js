import {
  formatAppointmentDate,
  normalizeTimeKey,
  timeToMinutes,
} from "./appointmentHelpers";

/** Each slot represents 30 minutes (e.g. 3 slots = 1 h 30 min). */
export const DEFAULT_SLOT_MINUTES = 30;

/** Default max duration in the edit dropdown (12 slots = 6 hours). */
export const DEFAULT_MAX_SLOT_COUNT = 12;

export function slotCountToMinutes(
  slotCount,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  return slotCount * slotMinutes;
}

export function minutesToSlotCount(
  minutes,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 1;
  return Math.max(1, Math.ceil(minutes / slotMinutes));
}

export function formatDurationLabel(slotCount, slotMinutes = DEFAULT_SLOT_MINUTES) {
  const totalMinutes = slotCount * slotMinutes;
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  if (remainder === 0) {
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }
  const hourPart = hours === 1 ? "1 h" : `${hours} h`;
  return `${hourPart} ${remainder} min`;
}

export function buildDurationOptions(
  maxSlotCount = DEFAULT_MAX_SLOT_COUNT,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  return Array.from({ length: maxSlotCount }, (_, index) => {
    const slotCount = index + 1;
    return {
      label: formatDurationLabel(slotCount, slotMinutes),
      slotCount,
    };
  });
}

export const STATE_OPTIONS = [
  {
    value: "PENDING",
    label: "Pendiente",
    selectClass:
      "border-amber-200 bg-amber-50 text-amber-900 focus:border-amber-300 focus:ring-amber-500/20",
  },
  {
    value: "CONFIRMED",
    label: "Confirmada",
    selectClass:
      "border-emerald-200 bg-emerald-50 text-emerald-900 focus:border-emerald-300 focus:ring-emerald-500/20",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
    selectClass:
      "border-rose-200 bg-rose-50 text-rose-900 focus:border-rose-300 focus:ring-rose-500/20",
  },
];

export function normalizeAppointmentState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

/** Reads slotCount from API/local data without capping (1 slot = 30 min). */
export function resolveSlotCount(appointment) {
  const raw =
    appointment?.slotCount ??
    appointment?.slot_count ??
    appointment?.SLOT_COUNT ??
    appointment?.slots ??
    appointment?.numSlots ??
    null;

  if (raw !== null && raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }

  const durationMinutes =
    appointment?.durationMinutes ??
    appointment?.duration_minutes ??
    appointment?.durationInMinutes ??
    null;
  if (durationMinutes !== null && durationMinutes !== undefined && durationMinutes !== "") {
    const minutes = Number(durationMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      return minutesToSlotCount(minutes);
    }
  }

  return 1;
}

/**
 * Calendar day endpoint may omit slotCount; prefer the catalog row from GET /api/admin/appointments.
 */
export function mergeCalendarAppointment(dayRow, catalogRow) {
  if (!dayRow) return normalizeAppointment(catalogRow ?? {});
  if (!catalogRow) return normalizeAppointment(dayRow);

  const slotCount = resolveSlotCount({
    ...catalogRow,
    ...dayRow,
    slotCount: catalogRow.slotCount ?? dayRow.slotCount,
    slot_count: catalogRow.slot_count ?? dayRow.slot_count,
    slots: catalogRow.slots ?? dayRow.slots,
  });

  return normalizeAppointment({
    ...catalogRow,
    ...dayRow,
    slotCount,
  });
}

export function getAppointmentTimeRaw(appointment) {
  return appointment?.appointmentTime ?? appointment?.appointment_time ?? null;
}

/** "2026-05-27 00:00:00" → "2026-05-27" */
export function normalizeAppointmentDateValue(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

/**
 * Maps GET /appointments rows to UI shape.
 * slotCount from API = duration in 30-minute slots.
 */
export function normalizeAppointment(appointment) {
  if (!appointment || typeof appointment !== "object") return appointment;

  const slotCount = resolveSlotCount(appointment);
  const timeRaw = getAppointmentTimeRaw(appointment);
  const normalizedTime = normalizeTimeKey(timeRaw);
  const dateRaw =
    appointment.appointmentDate ?? appointment.appointment_date ?? null;

  return {
    ...appointment,
    appointmentDate: normalizeAppointmentDateValue(dateRaw) ?? dateRaw,
    appointmentTime: normalizedTime !== "—" ? normalizedTime : timeRaw,
    state: normalizeAppointmentState(appointment.state),
    slotCount,
    reason:
      appointment.reason ??
      appointment.notes ??
      appointment.motivo ??
      null,
  };
}

export function normalizeAppointments(appointments) {
  if (!Array.isArray(appointments)) return [];
  return appointments.map((item) => normalizeAppointment(item));
}

/** Human duration label from slotCount (e.g. "1 h 30 min"). */
export function formatAppointmentDuration(
  appointment,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  return formatDurationLabel(resolveSlotCount(appointment), slotMinutes);
}

/** Start–end time range from appointment time + slotCount. */
export function formatAppointmentTimeRange(
  appointment,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  const summary = getDurationSummary(
    getAppointmentTimeRaw(appointment),
    resolveSlotCount(appointment),
    slotMinutes,
  );
  if (summary.start === "—") return "—";
  return `${summary.start} – ${summary.end}`;
}

/** Max options in the duration select (includes the appointment's current value). */
export function getEditDurationMaxSlots(currentSlotCount) {
  const n = Number(currentSlotCount);
  const safe = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  return Math.max(DEFAULT_MAX_SLOT_COUNT, safe);
}

/** @deprecated Prefer resolveSlotCount — kept for callers that pass a max cap. */
export function getSlotCount(
  appointment,
  maxSlotCount = DEFAULT_MAX_SLOT_COUNT,
) {
  return Math.min(resolveSlotCount(appointment), maxSlotCount);
}

export function getPatientName(appointment) {
  return appointment?.name ?? appointment?.patientName ?? "";
}

export function getNotes(appointment) {
  return (
    appointment?.notes ??
    appointment?.reason ??
    appointment?.motivo ??
    appointment?.description ??
    ""
  );
}

export function getAppointmentDateRaw(appointment) {
  return (
    appointment?.appointmentDate ??
    appointment?.appointment_date ??
    appointment?.date ??
    null
  );
}

export function formatAppointmentDateLong(date) {
  if (date == null || date === "") return "—";

  const s = String(date).trim();
  const cal = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (cal) {
    const y = Number(cal[1]);
    const mo = Number(cal[2]);
    const d = Number(cal[3]);
    const local = new Date(y, mo - 1, d);
    if (!Number.isNaN(local.getTime())) {
      return local.toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  const short = formatAppointmentDate(date);
  return short || "—";
}

export function addMinutesToTime(timeRaw, minutesToAdd) {
  const key = normalizeTimeKey(timeRaw);
  if (key === "—") return "—";
  const total = timeToMinutes(key) + minutesToAdd;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getDurationSummary(
  startTimeRaw,
  slotCount,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  const start = normalizeTimeKey(startTimeRaw);
  const end = addMinutesToTime(
    startTimeRaw,
    slotCountToMinutes(slotCount, slotMinutes),
  );
  return {
    start,
    end,
    totalLabel: formatDurationLabel(slotCount, slotMinutes),
  };
}

export function buildUpdateAppointmentPayload(form) {
  const reason = form.notes.trim();
  return {
    name: form.patientName.trim(),
    slotCount: form.slotCount,
    reason: reason || null,
  };
}

export function buildUpdatedAppointment(appointment, form) {
  return normalizeAppointment({
    ...appointment,
    name: form.patientName.trim(),
    slotCount: form.slotCount,
    state: normalizeAppointmentState(form.state),
    notes: form.notes.trim() || null,
    reason: form.notes.trim() || null,
  });
}
