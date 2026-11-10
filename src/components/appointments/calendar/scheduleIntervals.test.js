import { describe, expect, it } from "vitest";
import {
  buildCalendarConfigFromDoctorSchedules,
  buildCalendarConfigFromSchedule,
} from "./calendarConfig";
import {
  formatShiftRange,
  isWorkingMinute,
  nonWorkingRanges,
  offShiftSlotBlocks,
  shiftsForCivilDate,
} from "./scheduleIntervals";

const TUESDAY = "2026-10-27";

const OVERNIGHT = [
  {
    start: "2026-10-26T19:00:00",
    end: "2026-10-27T07:00:00",
    slotMinutes: 30,
  },
  {
    start: "2026-10-27T19:00:00",
    end: "2026-10-28T07:00:00",
    slotMinutes: 30,
  },
];

describe("technician intervals", () => {
  const shifts = shiftsForCivilDate(OVERNIGHT, TUESDAY);

  it("lists each overnight shift with both dates", () => {
    expect(shifts).toHaveLength(2);
    expect(formatShiftRange(shifts[0])).toBe("26 oct 19:00 – 27 oct 07:00");
    expect(formatShiftRange(shifts[1])).toBe("27 oct 19:00 – 28 oct 07:00");
  });

  it("does not treat the gap between shifts as working time", () => {
    expect(isWorkingMinute(6 * 60, shifts)).toBe(true);
    expect(isWorkingMinute(7 * 60, shifts)).toBe(false);
    expect(isWorkingMinute(12 * 60, shifts)).toBe(false);
    expect(isWorkingMinute(19 * 60, shifts)).toBe(true);
    expect(isWorkingMinute(23 * 60 + 30, shifts)).toBe(true);
    expect(nonWorkingRanges(0, 1440, shifts)).toEqual([
      { start: 7 * 60, end: 19 * 60 },
    ]);
  });

  it("keeps a same-day shift as hours without a second date", () => {
    const [shift] = shiftsForCivilDate(
      [
        {
          start: "2026-10-27T07:00:00",
          end: "2026-10-27T19:00:00",
          slotMinutes: 30,
        },
      ],
      TUESDAY,
    );
    expect(shift.crossesMidnight).toBe(false);
    expect(formatShiftRange(shift)).toBe("07:00–19:00");
    expect(isWorkingMinute(6 * 60, [shift])).toBe(false);
    expect(isWorkingMinute(7 * 60, [shift])).toBe(true);
    expect(isWorkingMinute(18 * 60 + 30, [shift])).toBe(true);
    expect(isWorkingMinute(19 * 60, [shift])).toBe(false);
  });
});

describe("calendar config", () => {
  it("shows a 24 hour business day through the next midnight", () => {
    const schedule = {
      date: TUESDAY,
      open: true,
      startTime: null,
      endTime: null,
      slotMinutes: 30,
      intervals: [
        {
          start: "2026-10-27T00:00:00",
          end: "2026-10-28T00:00:00",
          slotMinutes: 30,
        },
      ],
    };
    const config = buildCalendarConfigFromSchedule(schedule);
    const [shift] = config.sharedShifts;
    expect(config.intervalMode).toBe(true);
    expect(config.dayStartMinutes).toBe(0);
    expect(config.dayEndMinutes).toBe(1440);
    expect(formatShiftRange(shift)).toBe("27 oct 00:00 – 28 oct 00:00");
    expect(isWorkingMinute(0, config.sharedShifts)).toBe(true);
    expect(isWorkingMinute(23 * 60 + 30, config.sharedShifts)).toBe(true);
    expect(nonWorkingRanges(0, 1440, config.sharedShifts)).toEqual([]);
  });

  it("keeps a continuation from the previous day open", () => {
    const config = buildCalendarConfigFromSchedule({
      date: TUESDAY,
      open: true,
      startTime: null,
      endTime: null,
      slotMinutes: 30,
      intervals: [
        {
          start: "2026-10-26T19:00:00",
          end: "2026-10-27T07:00:00",
          slotMinutes: 30,
        },
      ],
    });
    expect(config.dayStartMinutes).toBe(0);
    expect(config.dayEndMinutes).toBe(7 * 60);
    expect(formatShiftRange(config.sharedShifts[0])).toBe(
      "26 oct 19:00 – 27 oct 07:00",
    );
    expect(isWorkingMinute(6 * 60, config.sharedShifts)).toBe(true);
    expect(isWorkingMinute(7 * 60, config.sharedShifts)).toBe(false);
    expect(nonWorkingRanges(0, 7 * 60, config.sharedShifts)).toEqual([]);
  });

  it("treats a closed business day as having no grid", () => {
    expect(
      buildCalendarConfigFromSchedule({
        date: TUESDAY,
        open: false,
        startTime: null,
        endTime: null,
        slotMinutes: 30,
        intervals: null,
      }),
    ).toBeNull();
  });

  it("keeps the scalar business window when intervals are absent", () => {
    const config = buildCalendarConfigFromSchedule({
      open: true,
      startTime: "09:00",
      endTime: "18:00",
      slotMinutes: 30,
      intervals: null,
    });
    expect(config.dayStartMinutes).toBe(9 * 60);
    expect(config.dayEndMinutes).toBe(18 * 60);
    expect(config.intervalMode).toBeUndefined();
  });

  it("builds separate shifts when start and end are null", () => {
    const config = buildCalendarConfigFromDoctorSchedules(
      [
        {
          doctorId: 3,
          date: TUESDAY,
          open: true,
          startTime: null,
          endTime: null,
          slotMinutes: 30,
          intervals: OVERNIGHT,
        },
      ],
      TUESDAY,
    );
    expect(config.intervalMode).toBe(true);
    expect(config.dayStartMinutes).toBe(0);
    expect(config.dayEndMinutes).toBe(1440);
    expect(config.shiftsByDoctor.get("3")).toHaveLength(2);
  });
});

const OCTOBER_24 = "2026-10-24";
const BLOCK = 30;

const LUIS_DAY = [
  {
    start: "2026-10-24T07:00:00",
    end: "2026-10-24T19:00:00",
    slotMinutes: 30,
  },
];

const ROLANDO_SPLIT = [
  {
    start: "2026-10-23T19:00:00",
    end: "2026-10-24T07:00:00",
    slotMinutes: 30,
  },
  {
    start: "2026-10-24T19:00:00",
    end: "2026-10-25T07:00:00",
    slotMinutes: 30,
  },
];

function blocksFrom(start, end, step) {
  const blocks = [];
  for (let minute = start; minute < end; minute += step) {
    blocks.push({ start: minute, end: minute + step });
  }
  return blocks;
}

describe("off-shift visual blocks on 24 October", () => {
  const luis = shiftsForCivilDate(LUIS_DAY, OCTOBER_24);
  const rolando = shiftsForCivilDate(ROLANDO_SPLIT, OCTOBER_24);

  it("labels every consecutive block in Rolando's gap and stops at 19:00", () => {
    expect(offShiftSlotBlocks(0, 24 * 60, BLOCK, rolando)).toEqual(
      blocksFrom(7 * 60, 19 * 60, BLOCK),
    );
    expect(isWorkingMinute(18 * 60 + 30, rolando)).toBe(false);
    expect(isWorkingMinute(19 * 60, rolando)).toBe(true);
  });

  it("keeps Luis working through 18:30 and labels from the 19:00 block", () => {
    expect(offShiftSlotBlocks(0, 24 * 60, BLOCK, luis)).toEqual([
      ...blocksFrom(0, 7 * 60, BLOCK),
      ...blocksFrom(19 * 60, 24 * 60, BLOCK),
    ]);
    expect(isWorkingMinute(18 * 60, luis)).toBe(true);
    expect(isWorkingMinute(18 * 60 + 30, luis)).toBe(true);
    expect(isWorkingMinute(19 * 60, luis)).toBe(false);
  });

  it("labels every full block when the specialist has no shift", () => {
    const blocks = offShiftSlotBlocks(0, 24 * 60, BLOCK, []);
    expect(blocks).toEqual(blocksFrom(0, 24 * 60, BLOCK));
    expect(blocks).toHaveLength(48);
  });

  it("skips a block that is only partly outside the shift", () => {
    const [shift] = shiftsForCivilDate(
      [
        {
          start: "2026-10-24T07:00:00",
          end: "2026-10-24T19:15:00",
          slotMinutes: 30,
        },
      ],
      OCTOBER_24,
    );
    const starts = offShiftSlotBlocks(0, 24 * 60, BLOCK, [shift]).map(
      (block) => block.start,
    );
    expect(starts).not.toContain(19 * 60);
    expect(starts).toContain(19 * 60 + 30);
  });
});
