export const CALENDAR_CONFIG = {
  dayStartHour: 7,
  dayEndHour: 21,
  slotMinutes: 30,
  rowHeightPx: 48,
  timeColumnWidthPx: 72,
  doctorColumnWidthPx: 280,
  gridLineIntervalMinutes: 60,
  /** Vertical gap between card edge and slot boundary */
  cardVerticalInsetPx: 2,
  /** Min inner content area for 30 min cards (name + badge + time) */
  compactMinHeightPx: 52,
  /** Min height for 60 min cards */
  normalMinHeightPx: 56,
  /** Min height for long appointments */
  largeMinHeightPx: 72,
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
