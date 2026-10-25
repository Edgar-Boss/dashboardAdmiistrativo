const TEMPORAL_KEYS = [
  "slotMinutesAtBooking",
  "startAt",
  "durationMinutes",
  "endAt",
  "temporalStatus",
  "slot_minutes_at_booking",
  "start_at",
  "duration_minutes",
  "end_at",
  "temporal_status",
];

function present(value) {
  return value != null && value !== "";
}

function normalizeState(state) {
  const normalized = typeof state === "string" ? state.toUpperCase() : "";
  return ["PENDING", "CONFIRMED", "CANCELLED"].includes(normalized)
    ? normalized
    : "PENDING";
}

export function enrichDailyAppointment(dayRow, catalogRow) {
  if (!dayRow) return null;
  if (!catalogRow) return { ...dayRow };
  const merged = { ...catalogRow, ...dayRow };
  const dailyIsV2 = present(dayRow.temporalStatus ?? dayRow.temporal_status);
  for (const key of TEMPORAL_KEYS) {
    if (dailyIsV2 && present(dayRow[key])) {
      merged[key] = dayRow[key];
    } else {
      delete merged[key];
    }
  }
  return merged;
}

export function selectCalendarDay({
  dailyRows,
  dailyDate,
  selectedDate,
  dailyError = null,
  catalogById,
  filter = "ALL",
}) {
  if (dailyError) {
    return { status: "error", appointments: [] };
  }
  if (!selectedDate || dailyDate !== selectedDate) {
    return { status: "pending", appointments: [] };
  }
  const rows = Array.isArray(dailyRows) ? dailyRows : [];
  const appointments = rows
    .filter((row) => {
      const state = normalizeState(row?.state);
      if (filter === "ALL") return state !== "CANCELLED";
      return state === filter;
    })
    .map((row) => enrichDailyAppointment(row, catalogById?.get?.(row?.id)));
  return { status: "ready", appointments };
}
