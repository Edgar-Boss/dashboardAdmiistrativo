export const WEEK_DAYS = [
  { dayOfWeek: 1, name: "lunes", title: "Lunes" },
  { dayOfWeek: 2, name: "martes", title: "Martes" },
  { dayOfWeek: 3, name: "miércoles", title: "Miércoles" },
  { dayOfWeek: 4, name: "jueves", title: "Jueves" },
  { dayOfWeek: 5, name: "viernes", title: "Viernes" },
  { dayOfWeek: 6, name: "sábado", title: "Sábado" },
  { dayOfWeek: 7, name: "domingo", title: "Domingo" },
];

const CLOCK = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const MAX_SHIFTS_PER_DAY = 99;

let draftSequence = 0;

export function createDraftId() {
  draftSequence += 1;
  return `shift-${draftSequence}`;
}

export function dayByNumber(dayOfWeek) {
  return WEEK_DAYS.find((day) => day.dayOfWeek === dayOfWeek) ?? null;
}

export function nextDayOfWeek(dayOfWeek) {
  return dayOfWeek === 7 ? 1 : dayOfWeek + 1;
}

export function formatShiftSpan(shift) {
  if (!CLOCK.test(shift?.startTime ?? "") || !CLOCK.test(shift?.endTime ?? "")) {
    return "Horario incompleto";
  }
  const startDay = dayByNumber(shift.dayOfWeek);
  const endDay = dayByNumber(
    shift.endDayOffset === 1 ? nextDayOfWeek(shift.dayOfWeek) : shift.dayOfWeek,
  );
  if (!startDay || !endDay) return "Horario incompleto";
  return `${startDay.name} ${shift.startTime} → ${endDay.name} ${shift.endTime}`;
}

export function legacyDayLabel(day) {
  const meta = dayByNumber(day?.dayOfWeek);
  const name = meta?.title ?? "Día";
  if (day?.working !== true) return `${name}: Descanso`;
  const start = day.startTime || "—";
  const end = day.endTime || "—";
  return `${name}: ${start}–${end}`;
}

export function draftsFromRawShifts(shifts) {
  return [...(shifts ?? [])]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.shiftNo - b.shiftNo)
    .map((shift) => ({
      id: createDraftId(),
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime ?? "",
      endTime: shift.endTime ?? "",
      endDayOffset: shift.endDayOffset === 1 ? 1 : 0,
    }));
}

export function draftsFromLegacy(legacySchedule) {
  return [...(legacySchedule ?? [])]
    .filter((day) => day?.working === true && Number.isInteger(day.dayOfWeek))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((day) => ({
      id: createDraftId(),
      dayOfWeek: day.dayOfWeek,
      startTime: day.startTime ?? "",
      endTime: day.endTime ?? "",
      endDayOffset: 0,
    }));
}

export function buildWeekPayload(mode, drafts) {
  if (mode === "INHERIT") {
    return { payload: { mode: "INHERIT", shifts: [] } };
  }
  if (mode !== "CUSTOM") {
    return { error: "Elige heredar el horario de la clínica o uno personalizado." };
  }
  const error = validateDrafts(drafts);
  if (error) return { error };

  const shifts = [];
  for (const day of WEEK_DAYS) {
    const rows = (drafts ?? []).filter((draft) => draft.dayOfWeek === day.dayOfWeek);
    rows.forEach((row, index) => {
      shifts.push({
        dayOfWeek: day.dayOfWeek,
        shiftNo: index + 1,
        startTime: row.startTime,
        endTime: row.endTime,
        endDayOffset: row.endDayOffset === 1 ? 1 : 0,
      });
    });
  }
  return { payload: { mode: "CUSTOM", shifts } };
}

export function validateDrafts(drafts) {
  if (!Array.isArray(drafts)) return "Los turnos no son válidos.";
  const counts = new Map();

  for (const draft of drafts) {
    const day = draft?.dayOfWeek;
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return "Cada turno debe pertenecer a un día de lunes a domingo.";
    }
    const count = (counts.get(day) ?? 0) + 1;
    counts.set(day, count);
    if (count > MAX_SHIFTS_PER_DAY) {
      return `Hay más de 99 turnos el ${dayByNumber(day)?.name ?? "día"}.`;
    }
    if (!CLOCK.test(draft.startTime ?? "") || !CLOCK.test(draft.endTime ?? "")) {
      return "Usa horas en formato HH:mm, por ejemplo 09:00.";
    }
    if (draft.endDayOffset !== 0 && draft.endDayOffset !== 1) {
      return "Indica si el turno termina el mismo día o al siguiente.";
    }
    const start = clockMinutes(draft.startTime);
    const end = clockMinutes(draft.endTime);
    if (draft.endDayOffset === 0 && start >= end) {
      return "La hora de fin debe ser posterior a la de inicio, o marca que termina al día siguiente.";
    }
    if (draft.endDayOffset === 1 && start < end) {
      return "Un turno que termina al día siguiente debe empezar a una hora igual o posterior a la de fin.";
    }
  }

  if (hasObviousOverlap(drafts)) {
    return "Hay turnos que se solapan, incluido el cruce de domingo a lunes.";
  }
  return null;
}

export function weekSaveErrorMessage(error) {
  if (error?.code === "SHIFT_OVERLAP") {
    return "Los turnos se solapan. Ajusta los horarios; la validación definitiva sigue en el servidor.";
  }
  if (error?.code === "EXISTING_BOOKING_CONFLICT") {
    return "Una cita futura impide este cambio. El horario no se guardó.";
  }
  if (error?.code === "UNMIGRATED_BOOKING") {
    return "Hay una cita sin duración guardada y eso impide guardar este horario.";
  }
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return "No se pudo guardar el horario.";
}

function hasObviousOverlap(drafts) {
  const ranges = drafts.map((draft) => shiftRanges(draft));
  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      for (const left of ranges[i]) {
        for (const right of ranges[j]) {
          if (left[0] < right[1] && right[0] < left[1]) return true;
        }
      }
    }
  }
  return false;
}

function shiftRanges(draft) {
  const startMinute = clockMinutes(draft.startTime);
  const endMinute = clockMinutes(draft.endTime);
  const start = (draft.dayOfWeek - 1) * MINUTES_PER_DAY + startMinute;
  const duration =
    draft.endDayOffset === 1
      ? MINUTES_PER_DAY - startMinute + endMinute
      : endMinute - startMinute;
  const end = start + duration;
  const ranges = [];
  const visibleEnd = Math.min(end, MINUTES_PER_WEEK);
  if (start < visibleEnd) ranges.push([start, visibleEnd]);
  if (end > MINUTES_PER_WEEK) ranges.push([0, end - MINUTES_PER_WEEK]);
  return ranges;
}

function clockMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
