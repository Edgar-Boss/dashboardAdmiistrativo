/** Civil date-time fields from appointment reads. Clocks come from the text, not from UTC conversion. */

const CIVIL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function parseCivilDateTime(value) {
  const match = CIVIL_DATE_TIME.exec(String(value ?? "").trim());
  if (!match) return null;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  if (minutes < 0 || minutes >= 24 * 60) return null;
  return { date: match[1], minutes };
}

export function formatCivilClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatCivilDateTime(value) {
  const parsed = parseCivilDateTime(value);
  if (!parsed) return null;
  return `${parsed.date} ${formatCivilClock(parsed.minutes)}`;
}

function positiveNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function text(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * V1 responses omit temporalStatus. A present status is the V2 contract,
 * including values this panel does not know how to draw as a timed bar.
 */
export function describeAppointmentTemporal(appointment) {
  const status = text(appointment?.temporalStatus ?? appointment?.temporal_status);
  if (!status) return { kind: "legacy" };

  const normalized = status.toUpperCase();
  const startAt = text(appointment?.startAt ?? appointment?.start_at);
  const endAt = text(appointment?.endAt ?? appointment?.end_at);
  if (normalized === "OK") {
    return {
      kind: "ok",
      status: normalized,
      slotMinutesAtBooking: positiveNumber(
        appointment?.slotMinutesAtBooking ?? appointment?.slot_minutes_at_booking,
      ),
      durationMinutes: positiveNumber(
        appointment?.durationMinutes ?? appointment?.duration_minutes,
      ),
      startAt: parseCivilDateTime(startAt) ? startAt : null,
      endAt: parseCivilDateTime(endAt) ? endAt : null,
    };
  }
  if (normalized === "UNMIGRATED_BOOKING") {
    return { kind: "unmigrated", status: normalized };
  }
  return { kind: "unknown", status: normalized };
}

export function durationChangeLocked(appointment) {
  const temporal = describeAppointmentTemporal(appointment);
  return temporal.kind !== "legacy" && temporal.slotMinutesAtBooking == null;
}

/** Block count times the snapshot stored with the booking. The grid slot size is not an input. */
export function proposedDurationMinutes(slotCount, slotMinutesAtBooking) {
  const slots = Number(slotCount);
  const snapshot = Number(slotMinutesAtBooking);
  if (!Number.isInteger(slots) || slots < 1) return null;
  if (!Number.isFinite(snapshot) || snapshot <= 0) return null;
  return slots * snapshot;
}

function civilOrdinal(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

/**
 * Intersection of a civil interval with one calendar date.
 * The end instant is exclusive, so an end of exactly 00:00 does not enter that date.
 */
export function visibleDaySegment(startAt, endAt, civilDate) {
  const start = parseCivilDateTime(startAt);
  const end = parseCivilDateTime(endAt);
  if (!start || !end || !civilDate) return null;
  const startAbs = civilOrdinal(start.date) * 1440 + start.minutes;
  const endAbs = civilOrdinal(end.date) * 1440 + end.minutes;
  if (endAbs <= startAbs) return null;
  const dayStart = civilOrdinal(civilDate) * 1440;
  const dayEnd = dayStart + 1440;
  const visibleStart = Math.max(startAbs, dayStart);
  const visibleEnd = Math.min(endAbs, dayEnd);
  if (visibleEnd <= visibleStart) return null;
  return {
    startMinute: visibleStart - dayStart,
    endMinute: visibleEnd - dayStart,
    startedPreviousDay: startAbs < dayStart,
    endsNextDay: endAbs > dayEnd,
  };
}
