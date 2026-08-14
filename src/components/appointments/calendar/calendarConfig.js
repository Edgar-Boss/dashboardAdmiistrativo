import { timeToMinutes } from "../appointmentHelpers";

/** Visual/structural calendar defaults. Day range comes from the tenant schedule. */
export const CALENDAR_CONFIG = {
  slotMinutes: 30,
  /** Tall enough for name/badge + time/phone inside a 30 min slot without clipping */
  rowHeightPx: 60,
  timeColumnWidthPx: 72,
  doctorColumnWidthPx: 300,
  gridLineIntervalMinutes: 60,
  /** Vertical gap between card edge and slot boundary */
  cardVerticalInsetPx: 2,
};

export function parseTimeToMinutes(time) {
  if (time == null || time === "") return null;
  const minutes = timeToMinutes(time);
  return Number.isFinite(minutes) ? minutes : null;
}

export function formatMinutesAsTime(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return null;
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Derived per-date config. Does not mutate {@link CALENDAR_CONFIG}.
 * Prefer {@code dayStartMinutes}/{@code dayEndMinutes}; hour fields are a fallback.
 */
export function buildCalendarConfigFromSchedule(schedule, base = CALENDAR_CONFIG) {
  if (!schedule?.open) return null;
  const dayStartMinutes = parseTimeToMinutes(schedule.startTime);
  const dayEndMinutes = parseTimeToMinutes(schedule.endTime);
  if (dayStartMinutes == null || dayEndMinutes == null) return null;
  if (dayEndMinutes <= dayStartMinutes) return null;

  const slotMinutes = Number(schedule.slotMinutes);
  return {
    ...base,
    slotMinutes:
      Number.isFinite(slotMinutes) && slotMinutes > 0
        ? slotMinutes
        : base.slotMinutes,
    dayStartMinutes,
    dayEndMinutes,
  };
}

export function calendarConfigForRange(
  startTime,
  endTime,
  extra = {},
  base = CALENDAR_CONFIG,
) {
  return buildCalendarConfigFromSchedule(
    {
      open: true,
      startTime,
      endTime,
      slotMinutes: extra.slotMinutes ?? base.slotMinutes,
    },
    { ...base, ...extra },
  );
}

export function getDayStartMinutes(config = CALENDAR_CONFIG) {
  if (Number.isFinite(config?.dayStartMinutes)) return config.dayStartMinutes;
  if (Number.isFinite(config?.dayStartHour)) return config.dayStartHour * 60;
  return 0;
}

export function getDayEndMinutes(config = CALENDAR_CONFIG) {
  if (Number.isFinite(config?.dayEndMinutes)) return config.dayEndMinutes;
  if (Number.isFinite(config?.dayEndHour)) return config.dayEndHour * 60;
  return 0;
}

export function minutesToTopPx(minutesFromDayStart, config = CALENDAR_CONFIG) {
  return (minutesFromDayStart / config.slotMinutes) * config.rowHeightPx;
}

export function getGridHeightPx(config = CALENDAR_CONFIG) {
  const totalMinutes = getDayEndMinutes(config) - getDayStartMinutes(config);
  if (totalMinutes <= 0) return 0;
  return (totalMinutes / config.slotMinutes) * config.rowHeightPx;
}
