export const CALENDAR_CONFIG = {
  dayStartHour: 7,
  dayEndHour: 21,
  slotMinutes: 30,
  /** Tall enough for name/badge + time/phone inside a 30 min slot without clipping */
  rowHeightPx: 60,
  timeColumnWidthPx: 72,
  doctorColumnWidthPx: 300,
  gridLineIntervalMinutes: 60,
  /** Vertical gap between card edge and slot boundary */
  cardVerticalInsetPx: 2,
};

export function getDayStartMinutes(config = CALENDAR_CONFIG) {
  return config.dayStartHour * 60;
}

export function getDayEndMinutes(config = CALENDAR_CONFIG) {
  return config.dayEndHour * 60;
}

export function minutesToTopPx(minutesFromDayStart, config = CALENDAR_CONFIG) {
  return (minutesFromDayStart / config.slotMinutes) * config.rowHeightPx;
}

export function getGridHeightPx(config = CALENDAR_CONFIG) {
  const totalMinutes = getDayEndMinutes(config) - getDayStartMinutes(config);
  return (totalMinutes / config.slotMinutes) * config.rowHeightPx;
}
