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
import { visibleDaySegment } from "../appointmentTemporal";
import { proposedDurationMinutes } from "../appointmentTemporal";

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

  it("keeps a V1 appointment on slot count times the grid slot", () => {
    const config = calendarConfigForRange("09:00", "18:00", { slotMinutes: 30 });
    const blocks = buildAppointmentBlocks(
      [{ id: 4, appointmentTime: "10:00", slotCount: 2, doctorId: 1 }],
      config,
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].presentation).toBe("card");
    expect(blocks[0].durationMinutes).toBe(60);
  });
});

describe("V2 civil appointment segments", () => {
  const fullDay = calendarConfigForRange("00:00", "24:00", { slotMinutes: 60 });
  const overnight = {
    id: 77,
    doctorId: 3,
    name: "Nocturna",
    appointmentTime: "23:00",
    slotCount: 2,
    slotMinutesAtBooking: 30,
    durationMinutes: 120,
    startAt: "2026-10-27T23:00:00",
    endAt: "2026-10-28T01:00:00",
    temporalStatus: "OK",
  };

  it("draws the same appointment on both civil days", () => {
    const first = buildAppointmentBlocks([overnight], fullDay, "2026-10-27");
    const second = buildAppointmentBlocks([overnight], fullDay, "2026-10-28");

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0].row.id).toBe(77);
    expect(second[0].row.id).toBe(77);
    expect(first[0].startMin).toBe(23 * 60);
    expect(first[0].endMin).toBe(24 * 60);
    expect(second[0].startMin).toBe(0);
    expect(second[0].endMin).toBe(60);
    expect(first[0].continuationLabel).toContain("Termina el día siguiente");
    expect(second[0].continuationLabel).toContain("Comenzó el día anterior");
    expect(first[0].timeLabel).toBe("23:00 – 01:00");
    expect(first[0].durationMinutes).toBe(120);
  });

  it("does not give the next day a segment that ends at midnight", () => {
    const row = {
      ...overnight,
      id: 78,
      startAt: "2026-10-27T22:00:00",
      endAt: "2026-10-28T00:00:00",
      durationMinutes: 120,
    };
    expect(visibleDaySegment(row.startAt, row.endAt, "2026-10-28")).toBeNull();
    expect(buildAppointmentBlocks([row], fullDay, "2026-10-28")).toEqual([]);
    expect(buildAppointmentBlocks([row], fullDay, "2026-10-27")).toHaveLength(1);
  });

  it("uses the historical duration instead of the grid slot", () => {
    const grid60 = calendarConfigForRange("09:00", "18:00", { slotMinutes: 60 });
    expect(proposedDurationMinutes(2, 30)).toBe(60);
    expect(proposedDurationMinutes(2, 60)).toBe(120);

    const halfHour = buildAppointmentBlocks(
      [
        {
          id: 1,
          doctorId: 1,
          appointmentTime: "10:00",
          slotCount: 2,
          slotMinutesAtBooking: 30,
          durationMinutes: 60,
          startAt: "2026-10-27T10:00:00",
          endAt: "2026-10-27T11:00:00",
          temporalStatus: "OK",
        },
      ],
      grid60,
      "2026-10-27",
    );
    const hour = buildAppointmentBlocks(
      [
        {
          id: 2,
          doctorId: 1,
          appointmentTime: "12:00",
          slotCount: 2,
          slotMinutesAtBooking: 60,
          durationMinutes: 120,
          startAt: "2026-10-27T12:00:00",
          endAt: "2026-10-27T14:00:00",
          temporalStatus: "OK",
        },
      ],
      grid60,
      "2026-10-27",
    );

    expect(halfHour[0].durationMinutes).toBe(60);
    expect(halfHour[0].heightPx).toBeLessThan(70);
    expect(hour[0].durationMinutes).toBe(120);
    expect(hour[0].heightPx).toBeGreaterThan(100);
  });

  it("keeps an unknown temporal status off the legacy bar", () => {
    const config = calendarConfigForRange("09:00", "18:00");
    const blocks = buildAppointmentBlocks(
      [
        {
          id: 9,
          doctorId: 1,
          appointmentTime: "10:00",
          slotCount: 4,
          temporalStatus: "WHATEVER",
        },
      ],
      config,
      "2026-10-27",
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].presentation).toBe("list");
    expect(blocks[0].durationLabel).toBe("Duración no disponible");
    expect(blocks[0].heightPx).toBeUndefined();
  });
});
