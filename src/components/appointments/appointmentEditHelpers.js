import {
  formatAppointmentDate,
  normalizeTimeKey,
  timeToMinutes,
} from "./appointmentHelpers";

export const DEFAULT_SLOT_MINUTES = 30;
export const DEFAULT_MAX_SLOT_COUNT = 8;

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

export function getSlotCount(
  appointment,
  maxSlotCount = DEFAULT_MAX_SLOT_COUNT,
) {
  const raw =
    appointment?.slot_count ?? appointment?.slotCount ?? appointment?.slots ?? 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), maxSlotCount);
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
  const end = addMinutesToTime(startTimeRaw, slotCount * slotMinutes);
  return {
    start,
    end,
    totalLabel: formatDurationLabel(slotCount, slotMinutes),
  };
}

export function buildUpdatedAppointment(appointment, form) {
  return {
    ...appointment,
    name: form.patientName.trim(),
    slot_count: form.slotCount,
    slotCount: form.slotCount,
    slots: form.slotCount,
    state: normalizeAppointmentState(form.state),
    notes: form.notes.trim() || null,
    reason: form.notes.trim() || null,
  };
}
