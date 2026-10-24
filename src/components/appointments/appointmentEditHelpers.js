import {
  formatAppointmentDate,
  normalizeTimeKey,
  timeToMinutes,
} from "./appointmentHelpers";
import {
  describeAppointmentTemporal,
  durationChangeLocked,
  formatCivilClock,
  parseCivilDateTime,
} from "./appointmentTemporal";

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
      "border-brand-accent/40 bg-brand-warning-soft text-brand-warning focus:border-brand-accent focus:ring-brand-warning/20",
  },
  {
    value: "CONFIRMED",
    label: "Confirmada",
    selectClass:
      "border-brand-success/30 bg-brand-success-soft text-brand-success focus:border-brand-success focus:ring-brand-success/20",
  },
  {
    value: "CANCELLED",
    label: "Cancelada",
    selectClass:
      "border-brand-danger/30 bg-brand-danger-soft text-brand-danger focus:border-brand-danger focus:ring-brand-danger/20",
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

const DURATION_UNAVAILABLE = "Duración no disponible";

/**
 * Stored V2 interval. Clocks and dates come from the civil text.
 * A missing or inverted end is not replaced with slotCount × grid minutes.
 */
function formatStoredCivilRange(startAt, endAt) {
  const start = parseCivilDateTime(startAt);
  const end = parseCivilDateTime(endAt);
  if (!start || !end) return "—";
  const endsBeforeStart =
    end.date < start.date ||
    (end.date === start.date && end.minutes <= start.minutes);
  if (endsBeforeStart) return "—";
  const startClock = formatCivilClock(start.minutes);
  const endClock = formatCivilClock(end.minutes);
  if (start.date === end.date) return `${startClock} – ${endClock}`;
  return `${start.date} ${startClock} – ${end.date} ${endClock}`;
}

/**
 * V2 rows with temporalStatus OK use durationMinutes.
 * UNMIGRATED_BOOKING, an unknown status, or an incomplete OK row do not invent a length.
 * A row that omits temporalStatus keeps the V1 slotCount × grid calculation.
 */
export function formatAppointmentDuration(
  appointment,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  const temporal = describeAppointmentTemporal(appointment);
  if (temporal.kind === "legacy") {
    return formatDurationLabel(resolveSlotCount(appointment), slotMinutes);
  }
  if (temporal.kind === "ok" && temporal.durationMinutes != null) {
    return formatDurationLabel(temporal.durationMinutes, 1);
  }
  return DURATION_UNAVAILABLE;
}

/**
 * V2 rows with temporalStatus OK use startAt and endAt.
 * Midnight crossings keep both civil dates. Legacy rows keep the slot grid.
 */
export function formatAppointmentTimeRange(
  appointment,
  slotMinutes = DEFAULT_SLOT_MINUTES,
) {
  const temporal = describeAppointmentTemporal(appointment);
  if (temporal.kind === "legacy") {
    const summary = getDurationSummary(
      getAppointmentTimeRaw(appointment),
      resolveSlotCount(appointment),
      slotMinutes,
    );
    if (summary.start === "—") return "—";
    return `${summary.start} – ${summary.end}`;
  }
  if (temporal.kind === "ok") {
    return formatStoredCivilRange(temporal.startAt, temporal.endAt);
  }
  return "—";
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

/** True when editable drawer fields differ from the persisted appointment. */
export function isAppointmentEditFormDirty(appointment, form) {
  if (!appointment) return false;
  const persistedName = String(getPatientName(appointment)).trim();
  const persistedNotes = String(getNotes(appointment)).trim();
  const persistedSlots = resolveSlotCount(appointment);
  const persistedState = normalizeAppointmentState(appointment?.state);
  const slotsChanged = durationChangeLocked(appointment)
    ? false
    : Number(form?.slotCount) !== persistedSlots;
  return (
    String(form?.patientName ?? "").trim() !== persistedName ||
    slotsChanged ||
    normalizeAppointmentState(form?.state) !== persistedState ||
    String(form?.notes ?? "").trim() !== persistedNotes
  );
}

export function buildUpdateAppointmentPayload(form, appointment) {
  const reason = form.notes.trim();
  return {
    name: form.patientName.trim(),
    slotCount: durationChangeLocked(appointment) ? null : form.slotCount,
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
