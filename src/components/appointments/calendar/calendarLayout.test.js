import { describe, expect, it, vi } from "vitest";
import {
  buildCalendarConfigFromSchedule,
  calendarConfigForRange,
  getDayEndMinutes,
  getDayStartMinutes,
} from "./calendarConfig";
import {
  buildAppointmentBlocks,
  buildVisualTimeSlots,
  getCurrentTimePosition,
} from "./calendarLayout";

function labels(config) {
  return buildVisualTimeSlots(config)
    .map((slot) => slot.label)
    .filter(Boolean);
}

describe("calendar business-hours range", () => {
  it("shows 09:00–18:00 and not hours outside that range", () => {
    const config = calendarConfigForRange("09:00", "18:00");
    const hours = labels(config);

    expect(hours).toContain("09:00");
    expect(hours).toContain("18:00");
    expect(hours).not.toContain("07:00");
    expect(hours).not.toContain("08:00");
    expect(hours).not.toContain("20:00");
    expect(hours).not.toContain("21:00");
    expect(getDayStartMinutes(config)).toBe(9 * 60);
    expect(getDayEndMinutes(config)).toBe(18 * 60);
  });

  it("respects half-hour open and close times", () => {
    const config = calendarConfigForRange("09:30", "18:30");
    const hours = labels(config);

    expect(hours[0]).toBe("09:30");
    expect(hours.at(-1)).toBe("18:30");
    expect(hours).toContain("10:00");
    expect(hours).toContain("18:00");
    expect(hours).not.toContain("09:00");
    expect(hours).not.toContain("19:00");
    expect(getDayStartMinutes(config)).toBe(9 * 60 + 30);
    expect(getDayEndMinutes(config)).toBe(18 * 60 + 30);
  });

  it("builds a different range per date/schedule", () => {
    const monday = buildCalendarConfigFromSchedule({
      open: true,
      startTime: "09:00",
      endTime: "18:00",
      slotMinutes: 30,
    });
    const saturday = buildCalendarConfigFromSchedule({
      open: true,
      startTime: "10:00",
      endTime: "14:00",
      slotMinutes: 30,
    });

    expect(labels(monday)).toContain("09:00");
    expect(labels(monday)).toContain("18:00");

    expect(labels(saturday)[0]).toBe("10:00");
    expect(labels(saturday).at(-1)).toBe("14:00");
    expect(labels(saturday)).not.toContain("09:00");
    expect(labels(saturday)).not.toContain("18:00");
  });
});

describe("getCurrentTimePosition", () => {
  const config = calendarConfigForRange("09:00", "18:00");

  it("hides the now line before opening", () => {
    const now = new Date(2026, 7, 13, 8, 0, 0);
    expect(getCurrentTimePosition(now, config)).toBeNull();
  });

  it("hides the now line after closing", () => {
    const now = new Date(2026, 7, 13, 18, 1, 0);
    expect(getCurrentTimePosition(now, config)).toBeNull();
  });

  it("shows the now line inside business hours", () => {
    const now = new Date(2026, 7, 13, 10, 0, 0);
    const position = getCurrentTimePosition(now, config);
    expect(position).not.toBeNull();
    expect(position.topPx).toBeGreaterThan(0);
    expect(position.label).toBe("10:00");
  });
});

describe("buildAppointmentBlocks outside hours", () => {
  it("does not expand the grid for an out-of-range appointment", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = calendarConfigForRange("09:00", "18:00");
    const blocks = buildAppointmentBlocks(
      [
        {
          id: 1,
          appointmentTime: "07:00",
          slotCount: 1,
          doctorId: 1,
        },
        {
          id: 2,
          appointmentTime: "10:00",
          slotCount: 2,
          doctorId: 1,
        },
      ],
      config,
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].row.id).toBe(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
