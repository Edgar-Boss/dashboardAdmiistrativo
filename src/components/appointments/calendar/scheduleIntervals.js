const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MINUTES_PER_DAY = 1440;

export function hasIntervalSchedule(schedule) {
  return Array.isArray(schedule?.intervals) && schedule.intervals.length > 0;
}

export function shiftsForCivilDate(intervals, civilDate) {
  if (!Array.isArray(intervals) || !civilDate) return [];
  return intervals
    .map((interval) => shiftOnCivilDate(interval, civilDate))
    .filter(Boolean);
}

export function isWorkingMinute(minute, shifts) {
  return shifts.some(
    (shift) =>
      shift.visibleStart != null &&
      minute >= shift.visibleStart &&
      minute < shift.visibleEnd,
  );
}

export function nonWorkingRanges(dayStart, dayEnd, shifts) {
  const segments = shifts
    .filter((shift) => shift.visibleStart != null && shift.visibleEnd > shift.visibleStart)
    .map((shift) => ({
      start: Math.max(shift.visibleStart, dayStart),
      end: Math.min(shift.visibleEnd, dayEnd),
    }))
    .filter((segment) => segment.end > segment.start)
    .sort((a, b) => a.start - b.start);

  const gaps = [];
  let cursor = dayStart;
  for (const segment of segments) {
    if (segment.start > cursor) {
      gaps.push({ start: cursor, end: segment.start });
    }
    cursor = Math.max(cursor, segment.end);
  }
  if (cursor < dayEnd) {
    gaps.push({ start: cursor, end: dayEnd });
  }
  return gaps;
}

/**
 * Slot-sized blocks that lie entirely inside {@code ranges}.
 * A block that only partly overlaps a range is omitted.
 * Blocks are aligned to {@code dayStart} and step by {@code blockMinutes}.
 */
export function fullBlocksWithinRanges(dayStart, dayEnd, blockMinutes, ranges) {
  if (!Number.isFinite(blockMinutes) || blockMinutes <= 0) return [];
  if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd) || dayEnd <= dayStart) return [];
  const blocks = [];
  for (let start = dayStart; start + blockMinutes <= dayEnd; start += blockMinutes) {
    const end = start + blockMinutes;
    const covered = (ranges ?? []).some((range) => start >= range.start && end <= range.end);
    if (covered) blocks.push({ start, end });
  }
  return blocks;
}

/** Full visual blocks whose entire interval is outside {@code shifts}. */
export function offShiftSlotBlocks(dayStart, dayEnd, blockMinutes, shifts) {
  return fullBlocksWithinRanges(
    dayStart,
    dayEnd,
    blockMinutes,
    nonWorkingRanges(dayStart, dayEnd, shifts),
  );
}

export function formatShiftRange(shift) {
  if (!shift) return "";
  if (!shift.crossesMidnight) {
    return `${shift.startTime}–${shift.endTime}`;
  }
  return `${formatShortDate(shift.startDate)} ${shift.startTime} – ${formatShortDate(shift.endDate)} ${shift.endTime}`;
}

export function sharedSlotMinutes(shifts, fallback) {
  const minutes = shifts
    .map((shift) => Number(shift.slotMinutes))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (minutes.length === 0) return fallback;
  return minutes.every((value) => value === minutes[0]) ? minutes[0] : fallback;
}

function shiftOnCivilDate(interval, civilDate) {
  const start = parseLocalDateTime(interval?.start);
  const end = parseLocalDateTime(interval?.end);
  if (!start || !end) return null;
  const startAbs = epochDay(start.date) * MINUTES_PER_DAY + start.minutes;
  const endAbs = epochDay(end.date) * MINUTES_PER_DAY + end.minutes;
  if (endAbs <= startAbs) return null;
  const dayStart = epochDay(civilDate) * MINUTES_PER_DAY;
  const dayEnd = dayStart + MINUTES_PER_DAY;
  const visibleStartAbs = Math.max(startAbs, dayStart);
  const visibleEndAbs = Math.min(endAbs, dayEnd);
  const visible = visibleEndAbs > visibleStartAbs;
  return {
    startTime: formatClock(start.minutes),
    endTime: formatClock(end.minutes),
    startDate: start.date,
    endDate: end.date,
    crossesMidnight: start.date !== end.date,
    slotMinutes: Number(interval.slotMinutes),
    visibleStart: visible ? visibleStartAbs - dayStart : null,
    visibleEnd: visible ? visibleEndAbs - dayStart : null,
  };
}

function parseLocalDateTime(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return null;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  if (minutes < 0 || minutes >= MINUTES_PER_DAY) return null;
  return { date: match[1], minutes };
}

function epochDay(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function formatClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}
